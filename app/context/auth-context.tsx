import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import type { AuthUser } from '@/lib/auth-api';
import { connectSocket, disconnectSocket } from '@/lib/socket';

const TOKEN_KEY = 'wizdom_student_token';
const USER_KEY = 'wizdom_student_user';

// expo-secure-store is native-only (iOS/Android) — it's a no-op/throws on
// web. This app also ships a web build (see app.json), so fall back to
// localStorage there rather than silently failing to persist a session.
const storage = {
  getItem: (key: string): Promise<string | null> =>
    Platform.OS === 'web'
      ? Promise.resolve(typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null)
      : SecureStore.getItemAsync(key),
  setItem: (key: string, value: string): Promise<void> =>
    Platform.OS === 'web'
      ? Promise.resolve(typeof localStorage !== 'undefined' ? localStorage.setItem(key, value) : undefined)
      : SecureStore.setItemAsync(key, value),
  deleteItem: (key: string): Promise<void> =>
    Platform.OS === 'web'
      ? Promise.resolve(typeof localStorage !== 'undefined' ? localStorage.removeItem(key) : undefined)
      : SecureStore.deleteItemAsync(key),
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  // True only during the initial read from storage on app launch — lets
  // screens/contexts tell "still restoring a real session" apart from
  // "genuinely logged out," so they don't flash a false "session expired"
  // state before the persisted token has had a chance to load.
  isLoading: boolean;
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
  updateUser: (user: AuthUser) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([storage.getItem(TOKEN_KEY), storage.getItem(USER_KEY)]);
        if (cancelled) return;
        if (storedToken && storedUser) {
          connectSocket(storedToken);
          setToken(storedToken);
          setUser(JSON.parse(storedUser) as AuthUser);
        }
      } catch {
        // Corrupt/inaccessible storage — treat as logged out rather than
        // crashing the app on launch.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      login: (nextUser: AuthUser, nextToken: string) => {
        connectSocket(nextToken);
        setUser(nextUser);
        setToken(nextToken);
        storage.setItem(TOKEN_KEY, nextToken).catch(() => {});
        storage.setItem(USER_KEY, JSON.stringify(nextUser)).catch(() => {});
      },
      logout: () => {
        disconnectSocket();
        setUser(null);
        setToken(null);
        storage.deleteItem(TOKEN_KEY).catch(() => {});
        storage.deleteItem(USER_KEY).catch(() => {});
      },
      updateUser: (nextUser: AuthUser) => {
        setUser(nextUser);
        storage.setItem(USER_KEY, JSON.stringify(nextUser)).catch(() => {});
      },
    }),
    [user, token, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
