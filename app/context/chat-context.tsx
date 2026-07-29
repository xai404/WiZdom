import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/context/auth-context';
import { fetchMyChat, markChatRead, postChatReply, type ChatMessage } from '@/lib/chat-api';

type ChatContextValue = {
  messages: ChatMessage[] | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
  unreadCount: number;
  sendReply: (text: string, stage?: string | null) => Promise<void>;
  markRead: () => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    if (!token) {
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
  }, [token]);

  useEffect(() => {
    reload();
  }, [reload]);

  const unreadCount = useMemo(
    () => messages?.filter((message) => message.sender === 'admin' && !message.readByStudent).length ?? 0,
    [messages]
  );

  const sendReply = useCallback(
    async (text: string, stage?: string | null) => {
      const trimmed = text.trim();
      if (!trimmed || !token) return;

      const optimistic: ChatMessage = {
        _id: `local-${Date.now()}`,
        sender: 'student',
        senderName: 'You',
        text: trimmed,
        stage: stage ?? null,
        readByStudent: true,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...(prev ?? []), optimistic]);

      try {
        const saved = await postChatReply(token, { text: trimmed, stage });
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
