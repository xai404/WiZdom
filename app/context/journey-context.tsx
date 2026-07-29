import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/context/auth-context';
import { fetchMyJourney, type JourneyStage } from '@/lib/journey-api';

type JourneyContextValue = {
  journey: JourneyStage[] | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
  applyOptimisticRemark: (title: string, text: string) => void;
};

const JourneyContext = createContext<JourneyContextValue | null>(null);

export function JourneyProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [journey, setJourney] = useState<JourneyStage[] | null>(null);
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
    fetchMyJourney(token)
      .then(setJourney)
      .catch((err) => setError(err instanceof Error ? err.message : 'Something went wrong.'))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    reload();
  }, [reload]);

  const applyOptimisticRemark = useCallback((title: string, text: string) => {
    setJourney((prev) =>
      prev?.map((stage) =>
        stage.title === title ? { ...stage, latestRemark: text, updatedAt: new Date().toISOString() } : stage
      ) ?? prev
    );
  }, []);

  const value = useMemo(
    () => ({ journey, loading, error, reload, applyOptimisticRemark }),
    [journey, loading, error, reload, applyOptimisticRemark]
  );

  return <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>;
}

export function useJourney() {
  const context = useContext(JourneyContext);
  if (!context) throw new Error('useJourney must be used within a JourneyProvider');
  return context;
}
