import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useAuth } from '@/context/auth-context';
import {
  deleteMyMessage,
  editMyMessage,
  fetchMyChat,
  markChatRead,
  postChatReply,
  type ChatMessage,
} from '@/lib/chat-api';
import { connectSocket, getSocket } from '@/lib/socket';

type ChatContextValue = {
  messages: ChatMessage[] | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
  unreadCount: number;
  sendReply: (text: string, stage?: string | null, replyTo?: string | null, department?: string | null) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  editMessage: (messageId: string, text: string) => Promise<void>;
  markRead: () => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user, token, isLoading: authLoading } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    // Auth is still restoring the persisted session from SecureStore —
    // wait, don't judge "no token yet" as "session expired".
    if (authLoading) return;
    if (!token) {
      // Clear any previous student's data on logout — otherwise it lingers
      // in memory and can flash briefly when a different student logs in
      // on the same device before their own fetch resolves.
      // No "session expired" banner here — logout (including the forced
      // one when an account is closed, see auth-context.tsx) already
      // navigates straight to /login, so this screen won't stay mounted
      // long enough for a message to matter; showing one anyway would
      // needlessly flash on top of that redirect.
      setMessages(null);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    fetchMyChat(token)
      .then((fresh) => {
        // A poll/focus refetch can land while an optimistic sendReply is
        // still in flight (not yet confirmed by the server) — a blind
        // overwrite here would wipe that bubble off the screen before the
        // POST even resolves. Carry any still-pending (`local-` id)
        // message forward; sendReply's own resolution replaces it with the
        // real saved message once the POST completes.
        setMessages((prev) => {
          const pending = (prev ?? []).filter((m) => m._id.startsWith('local-'));
          return pending.length ? [...fresh, ...pending] : fresh;
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Something went wrong.'))
      .finally(() => setLoading(false));
  }, [token, authLoading]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Merges a message that arrived over the socket (or is being confirmed
  // after an optimistic send) into state without ever producing a
  // duplicate bubble:
  //  - already present by real _id (e.g. a second delivery after a
  //    reconnect, or this same message already landed via the REST
  //    response) -> no-op.
  //  - matches a still-pending `local-` optimistic placeholder (same
  //    sender + text) -> replace the placeholder with the real message.
  //  - otherwise -> append.
  const applyIncomingMessage = useCallback((incoming: ChatMessage) => {
    setMessages((prev) => {
      const list = prev ?? [];
      if (list.some((m) => m._id === incoming._id)) return list;

      const localIndex = list.findIndex(
        (m) => m._id.startsWith('local-') && m.sender === incoming.sender && m.text === incoming.text
      );
      if (localIndex !== -1) {
        const next = [...list];
        next[localIndex] = incoming;
        return next;
      }

      return [...list, incoming];
    });
  }, []);

  // Real-time delivery. The socket connection itself is owned by
  // auth-context (connected on login/session-restore, torn down on
  // logout); this effect only attaches/detaches the 'chat:new-message'
  // listener, and re-asserts the connection defensively in case this
  // effect mounts before auth-context's did. The 6.5s poll in
  // group-chat.tsx stays in place as a fallback/reconciliation mechanism.
  useEffect(() => {
    if (authLoading || !token) return;

    const socket = connectSocket(token);

    const handleNewMessage = (incoming: ChatMessage & { studentId: string }) => {
      // Belt-and-suspenders: the backend already scopes this event to the
      // student's own room, but only act on it if it's actually for the
      // signed-in student.
      if (user && incoming.studentId !== user.id) return;
      applyIncomingMessage(incoming);
    };

    // An existing message changed in place — an edit (new text + `edited`),
    // a soft-delete, or a pin toggle. Replace it by _id; never append.
    const handleUpdatedMessage = (incoming: ChatMessage & { studentId: string }) => {
      if (user && incoming.studentId !== user.id) return;
      setMessages((prev) => prev?.map((m) => (m._id === incoming._id ? { ...m, ...incoming } : m)) ?? prev);
    };

    // An admin hard-cleared the whole thread.
    const handleThreadCleared = (payload: { studentId: string }) => {
      if (user && payload.studentId !== user.id) return;
      setMessages([]);
    };

    socket.on('chat:new-message', handleNewMessage);
    socket.on('chat:message-updated', handleUpdatedMessage);
    socket.on('chat:thread-cleared', handleThreadCleared);
    return () => {
      socket.off('chat:new-message', handleNewMessage);
      socket.off('chat:message-updated', handleUpdatedMessage);
      socket.off('chat:thread-cleared', handleThreadCleared);
    };
  }, [token, authLoading, user, applyIncomingMessage]);

  // App-background/foreground handling: RN can suspend the socket's
  // underlying connection while backgrounded. On returning to the
  // foreground, nudge it to reconnect if needed and reconcile via the
  // normal REST fetch, rather than waiting for the next poll tick.
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState !== 'active') return;
      const socket = getSocket();
      if (socket && !socket.connected) socket.connect();
      reload();
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [reload]);

  // App-wide fallback poll, independent of which screen (if any) is
  // focused. group-chat.tsx already polls every 6.5s while it's actually
  // open, which is redundant with this while Chat is on screen — that's
  // fine, reload() is idempotent. The reason this exists is the *unread
  // badge*: it's computed from this same `messages` state, but unlike an
  // open Chat screen there's no other reconciliation path for it while the
  // student is elsewhere in the app (e.g. Dashboard) — it would otherwise
  // depend entirely on the socket connection (and, incidentally, on a push
  // notification being received) to ever update. A longer interval than
  // group-chat.tsx's, since this now runs continuously app-wide rather
  // than only while one screen is open.
  useEffect(() => {
    if (authLoading || !token) return;
    const interval = setInterval(reload, 20000);
    return () => clearInterval(interval);
  }, [token, authLoading, reload]);

  const unreadCount = useMemo(
    () => messages?.filter((message) => message.sender === 'admin' && !message.readByStudent).length ?? 0,
    [messages]
  );

  const sendReply = useCallback(
    async (text: string, stage?: string | null, replyTo?: string | null, department?: string | null) => {
      const trimmed = text.trim();
      if (!trimmed || !token) return;

      const optimistic: ChatMessage = {
        _id: `local-${Date.now()}`,
        sender: 'student',
        senderName: 'You',
        senderRole: null,
        text: trimmed,
        stage: stage ?? null,
        department: department ?? null,
        readByStudent: true,
        readByAdmin: false,
        fullyRead: false,
        pinned: false,
        deleted: false,
        edited: false,
        replyTo: replyTo ?? null,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...(prev ?? []), optimistic]);

      try {
        const saved = await postChatReply(token, { text: trimmed, stage, replyTo, department });
        setMessages((prev) => (prev ?? []).map((message) => (message._id === optimistic._id ? saved : message)));
      } catch {
        // Keep the optimistic message visible rather than yanking it away —
        // the student already saw it "sent"; a silent background retry
        // isn't worth the complexity for this feature.
      }
    },
    [token]
  );

  // Optimistic like sendReply: flip the tombstone immediately so the bubble
  // updates without waiting on the round trip, then reconcile with the
  // server copy once it resolves. On failure, revert — unlike a failed
  // send there's nothing worth leaving half-applied for a delete.
  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!token) return;

      setMessages((prev) => prev?.map((message) => (message._id === messageId ? { ...message, deleted: true } : message)) ?? prev);

      try {
        const updated = await deleteMyMessage(token, messageId);
        setMessages((prev) => prev?.map((message) => (message._id === messageId ? updated : message)) ?? prev);
      } catch {
        setMessages((prev) => prev?.map((message) => (message._id === messageId ? { ...message, deleted: false } : message)) ?? prev);
      }
    },
    [token]
  );

  // Optimistic like deleteMessage: apply the new text (and the "edited"
  // flag) immediately, then reconcile with the server copy. Revert on
  // failure — there's nothing worth leaving half-applied.
  const editMessage = useCallback(
    async (messageId: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !token) return;

      let previous: ChatMessage | undefined;
      setMessages(
        (prev) =>
          prev?.map((message) => {
            if (message._id !== messageId) return message;
            previous = message;
            return { ...message, text: trimmed, edited: true };
          }) ?? prev
      );

      try {
        const updated = await editMyMessage(token, messageId, trimmed);
        setMessages((prev) => prev?.map((message) => (message._id === messageId ? updated : message)) ?? prev);
      } catch {
        setMessages(
          (prev) => prev?.map((message) => (message._id === messageId && previous ? previous : message)) ?? prev
        );
      }
    },
    [token]
  );

  const markRead = useCallback(() => {
    if (!token) return;
    setMessages((prev) => prev?.map((message) => (message.sender === 'admin' ? { ...message, readByStudent: true } : message)) ?? prev);
    markChatRead(token);
  }, [token]);

  const value = useMemo(
    () => ({ messages, loading, error, reload, unreadCount, sendReply, deleteMessage, editMessage, markRead }),
    [messages, loading, error, reload, unreadCount, sendReply, deleteMessage, editMessage, markRead]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within a ChatProvider');
  return context;
}
