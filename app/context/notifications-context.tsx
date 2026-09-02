import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useAuth } from '@/context/auth-context';
import {
  fetchMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '@/lib/notifications-api';
import { connectSocket } from '@/lib/socket';

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
  const { user, token, isLoading: authLoading } = useAuth();
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
      // No "session expired" banner here — logout (including the forced
      // one when an account is closed, see auth-context.tsx) already
      // navigates straight to /login, so this screen won't stay mounted
      // long enough for a message to matter; showing one anyway would
      // needlessly flash on top of that redirect.
      setNotifications(null);
      setLoading(false);
      setError(null);
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

  // Real-time delivery, reusing the same socket connection Chat/Journey use
  // (owned by auth-context; connectSocket is idempotent so this never opens
  // a second connection) — this effect only attaches/detaches the
  // 'notification:new' listener. Until this existed the app depended
  // entirely on an Expo push arriving, which silently fails under Expo Go,
  // OS battery optimization, or denied permissions. Payload is a minimal
  // ping; re-fetch so the server stays the source of truth for the list
  // and unread count (same approach as the admin bell).
  useEffect(() => {
    if (authLoading || !token) return;

    const socket = connectSocket(token);
    const handleNew = (payload: { studentId?: string }) => {
      console.log('[socket] notification:new received', payload);
      // Belt-and-suspenders: the backend already scopes this to the
      // student's own room, but only act on it if it's for this student.
      if (user && payload?.studentId && payload.studentId !== user.id) return;
      reload();
    };

    console.log('[socket] notifications-context attaching notification:new listener (connected:', socket.connected, ')');
    socket.on('notification:new', handleNew);
    return () => {
      socket.off('notification:new', handleNew);
    };
  }, [token, authLoading, user, reload]);

  // App-background/foreground fallback, mirroring chat/journey contexts —
  // reconcile via the normal REST fetch on return to foreground rather than
  // waiting for a socket event that may have been missed while suspended.
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') reload();
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
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
