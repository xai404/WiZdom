import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/context/auth-context';
import {
  fetchMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '@/lib/notifications-api';

type NotificationsContextValue = {
  notifications: AppNotification[] | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { token, isLoading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[] | null>(null);
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
      setNotifications(null);
      setLoading(false);
      setError('Your session has expired. Please log in again.');
      return;
    }
    setLoading(true);
    setError(null);
    fetchMyNotifications(token)
      .then(setNotifications)
      .catch((err) => setError(err instanceof Error ? err.message : 'Something went wrong.'))
      .finally(() => setLoading(false));
  }, [token, authLoading]);

  useEffect(() => {
    reload();
  }, [reload]);

  const unreadCount = useMemo(() => notifications?.filter((n) => !n.read).length ?? 0, [notifications]);

  const markRead = useCallback(
    (id: string) => {
      if (!token) return;
      setNotifications((prev) => prev?.map((n) => (n._id === id ? { ...n, read: true } : n)) ?? prev);
      markNotificationRead(token, id);
    },
    [token]
  );

  const markAllRead = useCallback(() => {
    if (!token) return;
    setNotifications((prev) => prev?.map((n) => ({ ...n, read: true })) ?? prev);
    markAllNotificationsRead(token);
  }, [token]);

  const value = useMemo(
    () => ({ notifications, loading, error, reload, unreadCount, markRead, markAllRead }),
    [notifications, loading, error, reload, unreadCount, markRead, markAllRead]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error('useNotifications must be used within a NotificationsProvider');
  return context;
}
