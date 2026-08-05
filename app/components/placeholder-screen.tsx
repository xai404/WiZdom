import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TopBar } from '@/components/top-bar';
import { useAppTheme } from '@/hooks/use-app-theme';

type PlaceholderScreenProps = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
};

export function PlaceholderScreen({ title, icon, description }: PlaceholderScreenProps) {
  const { isDark } = useAppTheme();
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.94)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 10, bounciness: 6 }),
    ]).start();
  }, [fade, scale]);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-surface dark:bg-surface-dark">
      <TopBar title={title} />
      <View className="flex-1 items-center justify-center px-10">
        <Animated.View style={{ opacity: fade, transform: [{ scale }], alignItems: 'center' }}>
          <View
            className="mb-5 h-20 w-20 items-center justify-center rounded-3xl bg-brand-50 dark:bg-card-dark"
            style={{
              shadowColor: '#0049B7',
              shadowOpacity: isDark ? 0 : 0.12,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: isDark ? 0 : 2,
            }}>
            <Ionicons name={icon} size={32} color={isDark ? '#8bb4fd' : '#0049B7'} />
          </View>
          <Text className="text-xl font-bold text-slate-900 dark:text-white">{title}</Text>
          <Text className="mt-2 max-w-xs text-center text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            {description}
          </Text>
          <View className="mt-5 flex-row items-center gap-1.5 rounded-full bg-brand-50 px-3.5 py-1.5 dark:bg-card-dark">
            <Ionicons name="sparkles-outline" size={13} color={isDark ? '#8bb4fd' : '#0049B7'} />
            <Text className="text-xs font-semibold text-brand-600 dark:text-brand-300">Coming soon</Text>
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
