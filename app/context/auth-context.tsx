import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

import { AuthSessionInvalidError, fetchMe, type AuthUser } from '@/lib/auth-api';
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
  const router = useRouter();
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
          let restoredUser = JSON.parse(storedUser) as AuthUser;

          // Re-validate against the server before trusting a restored
          // session — catches an account that was closed/deactivated while
          // this app instance was shut down (the real-time socket path in
          // the effect below only helps while the app was already open).
          try {
            const fresh = await fetchMe(storedToken);
            if (fresh.isActive === false) {
              await Promise.all([storage.deleteItem(TOKEN_KEY), storage.deleteItem(USER_KEY)]);
              if (!cancelled) setIsLoading(false);
              return;
            }
            restoredUser = fresh;
            storage.setItem(USER_KEY, JSON.stringify(fresh)).catch(() => {});
          } catch (err) {
            if (err instanceof AuthSessionInvalidError) {
              await Promise.all([storage.deleteItem(TOKEN_KEY), storage.deleteItem(USER_KEY)]);
              if (!cancelled) setIsLoading(false);
              return;
            }
            // Couldn't reach the server (offline) — fall back to the
            // cached session rather than locking the user out.
          }

          if (cancelled) return;
          connectSocket(storedToken);
          setToken(storedToken);
          setUser(restoredUser);
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

  // Real-time profile sync: when an admin edits this student's record
  // (name, contact info, payment status, pipeline status, etc.), the
  // backend emits the fresh safe-user object to this student's own socket
  // room (see backend/socket.js's emitStudentProfileUpdated, called from
  // studentsController.updateStudent) — apply it immediately instead of
  // waiting for the next login/getMe. Reuses the same shared socket
  // connection chat-context/journey-context attach their own listeners to.
  useEffect(() => {
    if (isLoading || !token) return;

    const socket = connectSocket(token);

    const handleProfileUpdated = (incoming: AuthUser) => {
      // An admin closing this student's account flips isActive false — the
      // JWT itself stays cryptographically valid for its full expiry, so
      // without this the app would keep working normally until some request
      // happened to 401. Force out immediately instead of applying the
      // update.
      if (incoming.isActive === false) {
        disconnectSocket();
        setUser(null);
        setToken(null);
        storage.deleteItem(TOKEN_KEY).catch(() => {});
        storage.deleteItem(USER_KEY).catch(() => {});
        Alert.alert('Account closed', 'Your account has been closed. Please contact your counsellor for more information.');
        router.replace('/login');
        return;
      }

      setUser((prev) => {
        if (prev && incoming.id !== prev.id) return prev;
        storage.setItem(USER_KEY, JSON.stringify(incoming)).catch(() => {});
        return incoming;
      });
    };

    socket.on('student:profile-updated', handleProfileUpdated);
    return () => {
      socket.off('student:profile-updated', handleProfileUpdated);
    };
  }, [token, isLoading]);

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
