import { Ionicons } from '@expo/vector-icons';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useNavigation } from 'expo-router';
import { useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

export function TopBar({ title }: { title?: string }) {
  const navigation = useNavigation<DrawerNavigationProp<Record<string, object | undefined>>>();
  const { isDark, toggleTheme } = useAppTheme();
  const spin = useRef(new Animated.Value(isDark ? 1 : 0)).current;

  const handleToggleTheme = () => {
    Animated.spring(spin, {
      toValue: isDark ? 0 : 1,
      useNativeDriver: true,
      speed: 14,
      bounciness: 10,
    }).start();
    toggleTheme();
  };

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    <View className="flex-row items-center justify-between px-5 py-3">
      <Pressable
        onPress={() => navigation.toggleDrawer()}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Open menu"
        className="h-11 w-11 items-center justify-center rounded-full active:bg-slate-100 dark:active:bg-slate-800">
        <Ionicons name="menu-outline" size={26} color={isDark ? '#f1f5f9' : '#0f172a'} />
      </Pressable>

      {title ? (
        <Text className="text-base font-semibold text-slate-900 dark:text-white">{title}</Text>
      ) : (
        <View />
      )}

      <Pressable
        onPress={handleToggleTheme}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Toggle dark mode"
        className="h-11 w-11 items-center justify-center rounded-full active:bg-slate-100 dark:active:bg-slate-800">
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons name={isDark ? 'moon' : 'sunny'} size={22} color={isDark ? '#8bb4fd' : '#f59e0b'} />
        </Animated.View>
      </Pressable>
    </View>
  );
}
