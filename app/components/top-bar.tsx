import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

const PRIMARY = '#0049B7';
const ACCENT = '#3B82F6';

// Matches ChatHeader's gradient/shadow/rounded-corner treatment exactly —
// used by Courses/Notifications/Profile/Settings so every screen in the
// app shares the same header identity instead of this one being the old
// plain white bar ChatHeader's own comment calls out.
export function TopBar({ title }: { title?: string }) {
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
    <LinearGradient
      colors={isDark ? ['#00132e', '#0B1E45', PRIMARY] : ['#00132e', PRIMARY, ACCENT]}
      start={{ x: 0.05, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        paddingTop: 14,
        paddingBottom: 18,
        paddingHorizontal: 12,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        shadowColor: '#001B47',
        shadowOpacity: 0.26,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 12 },
        elevation: 10,
      }}>
      <View className="flex-row items-center justify-between">
        {router.canGoBack() ? (
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="h-10 w-10 items-center justify-center rounded-full active:bg-white/10">
            <Ionicons name="chevron-back" size={22} color="#ffffff" />
          </Pressable>
        ) : (
          <View className="h-10 w-10" />
        )}

        {title ? (
          <Text className="text-[15.5px] font-bold tracking-tight text-white">{title}</Text>
        ) : (
          <View />
        )}

        <Pressable
          onPress={handleToggleTheme}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Toggle dark mode"
          className="h-10 w-10 items-center justify-center rounded-full active:bg-white/10">
          <Animated.View style={{ transform: [{ rotate }] }}>
            <Ionicons name={isDark ? 'moon' : 'sunny'} size={19} color={isDark ? '#c7d8ff' : '#ffd166'} />
          </Animated.View>
        </Pressable>
      </View>
    </LinearGradient>
  );
}
