import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useAuth } from '@/context/auth-context';
import { fetchMyJourney, type JourneyStage, type JourneyStageStatus } from '@/lib/journey-api';
import { connectSocket } from '@/lib/socket';

// Read-only for the Student App by design — stage status and remarks are
// only ever written by admin/employee accounts (see the Admin Panel's
// Journey tab). This context just fetches and holds the current snapshot.
type JourneyContextValue = {
  journey: JourneyStage[] | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

const JourneyContext = createContext<JourneyContextValue | null>(null);

export function JourneyProvider({ children }: { children: ReactNode }) {
  const { user, token, isLoading: authLoading } = useAuth();
  const [journey, setJourney] = useState<JourneyStage[] | null>(null);
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
      setJourney(null);
      setLoading(false);
      setError('Your session has expired. Please log in again.');
      return;
    }
    setLoading(true);
    setError(null);
    fetchMyJourney(token)
      .then(setJourney)
      .catch((err) => setError(err instanceof Error ? err.message : 'Something went wrong.'))
      .finally(() => setLoading(false));
  }, [token, authLoading]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Real-time delivery, reusing the exact same socket connection Chat
  // uses (owned/connected by auth-context; connectSocket is idempotent, so
  // this never opens a second connection) — this effect only
  // attaches/detaches the 'student:progress-updated' listener.
  useEffect(() => {
    if (authLoading || !token) return;

    const socket = connectSocket(token);

    const handleProgressUpdate = (payload: {
      studentId: string;
      title: string;
      status: JourneyStageStatus;
      updatedAt: string;
    }) => {
      // Belt-and-suspenders: the backend already scopes this event to the
      // student's own room, but only act on it if it's actually for the
      // signed-in student.
      if (user && payload.studentId !== user.id) return;
      setJourney((prev) =>
        prev
          ? prev.map((stage) =>
              stage.title === payload.title ? { ...stage, status: payload.status, updatedAt: payload.updatedAt } : stage
            )
          : prev
      );
    };

    socket.on('student:progress-updated', handleProgressUpdate);
    return () => {
      socket.off('student:progress-updated', handleProgressUpdate);
    };
  }, [token, authLoading, user]);

  // App-background/foreground fallback, mirroring chat-context's — the
  // socket connection itself is reconnected by chat-context's own
  // AppState handler (same shared singleton); this just reconciles this
  // context's own state via the normal REST fetch on return to foreground.
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState !== 'active') return;
      reload();
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [reload]);

  const value = useMemo(() => ({ journey, loading, error, reload }), [journey, loading, error, reload]);

  return <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>;
}

export function useJourney() {
  const context = useContext(JourneyContext);
  if (!context) throw new Error('useJourney must be used within a JourneyProvider');
  return context;
}
