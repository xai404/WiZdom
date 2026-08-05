import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/context/auth-context';
import { fetchMyJourney, type JourneyStage } from '@/lib/journey-api';

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
  const { token, isLoading: authLoading } = useAuth();
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

  const value = useMemo(() => ({ journey, loading, error, reload }), [journey, loading, error, reload]);

  return <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>;
}

export function useJourney() {
  const context = useContext(JourneyContext);
  if (!context) throw new Error('useJourney must be used within a JourneyProvider');
  return context;
}
