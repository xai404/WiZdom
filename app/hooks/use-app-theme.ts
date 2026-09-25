import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorScheme as nativewindColorScheme } from 'nativewind';
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { Appearance } from 'react-native';

const THEME_STORAGE_KEY = 'wizdom.colorScheme';

type Mode = 'light' | 'dark';

// The user's explicit choice, or null to follow the phone's system theme.
//
// This is tracked here (not only inside NativeWind) because NativeWind v4's
// manual `colorScheme.set()` relies on an Appearance change-event round-trip
// that isn't reliable on a cold start when the phone is already in Dark Mode
// (`systemColorScheme` initialises to a "light" fallback before the native
// Appearance module is ready and is only ever corrected by a *change*
// event). The visible symptom was the Moon/Sun toggle appearing stuck when
// the system theme was dark. Driving an explicit value ourselves makes
// `isDark` deterministic regardless of that race; NativeWind is still told
// about every change so `dark:` utility classes keep flipping.
let override: Mode | null = null;

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

const systemMode = (): Mode => (Appearance.getColorScheme() === 'dark' ? 'dark' : 'light');
const resolvedMode = (): Mode => override ?? systemMode();

// When there is NO explicit override, keep NativeWind's `dark:` classes
// aligned with the real system theme — needed only to repair the cold-start
// race described above. A plain `set(sys)` is a no-op on Android when the
// value already matches the OS night mode, so when NativeWind still
// disagrees, flip through the opposite value first to force it to re-read.
const applySystemToNativeWind = () => {
  const sys = systemMode();
  if (nativewindColorScheme.get() === sys) return;
  nativewindColorScheme.set(sys === 'dark' ? 'light' : 'dark');
  nativewindColorScheme.set('system');
};

let subscribedToSystem = false;
const ensureSystemSubscription = () => {
  if (subscribedToSystem) return;
  subscribedToSystem = true;
  Appearance.addChangeListener(() => {
    // A system theme change only matters while the user hasn't pinned an
    // explicit mode — an explicit choice must win in both directions.
    if (override == null) {
      applySystemToNativeWind();
      notify();
    }
  });
};

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  ensureSystemSubscription();
  return () => {
    listeners.delete(fn);
  };
};

/**
 * Loads the persisted color scheme once at app start and applies it. A
 * stored choice always overrides the phone's system theme.
 */
export function useHydrateAppTheme() {
  useEffect(() => {
    ensureSystemSubscription();
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((stored) => {
        if (stored === 'light' || stored === 'dark') {
          override = stored;
          // Unguarded on purpose: this makes the override "stick" at the
          // Appearance layer so a later AppState re-read stays aligned.
          nativewindColorScheme.set(stored);
        } else {
          override = null;
          applySystemToNativeWind();
        }
      })
      .catch(() => {})
      .finally(notify);
  }, []);
}

export function useAppTheme() {
  const colorScheme = useSyncExternalStore(subscribe, resolvedMode, resolvedMode);
  const isDark = colorScheme === 'dark';

  const toggleTheme = useCallback(() => {
    // Always the opposite of what's on screen right now, so the underlying
    // Appearance change is always a real transition (never an Android no-op).
    const next: Mode = resolvedMode() === 'dark' ? 'light' : 'dark';
    override = next;
    nativewindColorScheme.set(next);
    notify();
    AsyncStorage.setItem(THEME_STORAGE_KEY, next).catch(() => {});
  }, []);

  return { colorScheme, isDark, toggleTheme };
}
