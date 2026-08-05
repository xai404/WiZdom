import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/context/auth-context';
import { fetchMyChat, markChatRead, postChatReply, type ChatMessage } from '@/lib/chat-api';

type ChatContextValue = {
  messages: ChatMessage[] | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
  unreadCount: number;
  sendReply: (text: string, stage?: string | null, replyTo?: string | null) => Promise<void>;
  markRead: () => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { token, isLoading: authLoading } = useAuth();
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
      setMessages(null);
      setLoading(false);
      setError('Your session has expired. Please log in again.');
      return;
    }
    setLoading(true);
    setError(null);
    fetchMyChat(token)
      .then(setMessages)
      .catch((err) => setError(err instanceof Error ? err.message : 'Something went wrong.'))
      .finally(() => setLoading(false));
  }, [token, authLoading]);

  useEffect(() => {
    reload();
  }, [reload]);

  const unreadCount = useMemo(
    () => messages?.filter((message) => message.sender === 'admin' && !message.readByStudent).length ?? 0,
    [messages]
  );

  const sendReply = useCallback(
    async (text: string, stage?: string | null, replyTo?: string | null) => {
      const trimmed = text.trim();
      if (!trimmed || !token) return;

      const optimistic: ChatMessage = {
        _id: `local-${Date.now()}`,
        sender: 'student',
        senderName: 'You',
        senderRole: null,
        text: trimmed,
        stage: stage ?? null,
        readByStudent: true,
        readByAdmin: false,
        fullyRead: false,
        pinned: false,
        deleted: false,
        replyTo: replyTo ?? null,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...(prev ?? []), optimistic]);

      try {
        const saved = await postChatReply(token, { text: trimmed, stage, replyTo });
        setMessages((prev) => (prev ?? []).map((message) => (message._id === optimistic._id ? saved : message)));
      } catch {
        // Keep the optimistic message visible rather than yanking it away —
        // the student already saw it "sent"; a silent background retry
        // isn't worth the complexity for this feature.
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
    () => ({ messages, loading, error, reload, unreadCount, sendReply, markRead }),
    [messages, loading, error, reload, unreadCount, sendReply, markRead]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within a ChatProvider');
  return context;
}
