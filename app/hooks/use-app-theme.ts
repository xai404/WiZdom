import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorScheme as nativewindColorScheme, useColorScheme } from 'nativewind';
import { useEffect } from 'react';

const THEME_STORAGE_KEY = 'wizdom.colorScheme';

/**
 * Loads the persisted color scheme once at app start. NativeWind defaults to
 * "light" until this resolves, so the flash is at most one frame.
 */
export function useHydrateAppTheme() {
  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark') {
        nativewindColorScheme.set(stored);
      }
    });
  }, []);
}

export function useAppTheme() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark';
    setColorScheme(next);
    AsyncStorage.setItem(THEME_STORAGE_KEY, next);
  };

  return { colorScheme, isDark, toggleTheme };
}
