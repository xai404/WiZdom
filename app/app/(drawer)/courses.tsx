import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TopBar } from '@/components/top-bar';
import { useAppTheme } from '@/hooks/use-app-theme';

const UNIVERSITY_COURSES_URL = 'https://studyx.cc';

// This route only exists so the "Courses" tab has something to register in
// the Tabs navigator — in normal use, (drawer)/_layout.tsx's tabPress
// listener intercepts the tap and opens the external site directly, so this
// screen never actually renders. It's a fallback for the rare case that
// gets reached anyway (e.g. a direct /courses deep link on web).
export default function CoursesScreen() {
  const { isDark } = useAppTheme();

  useEffect(() => {
    Linking.openURL(UNIVERSITY_COURSES_URL);
    if (router.canGoBack()) router.back();
  }, []);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-surface dark:bg-surface-dark">
      <TopBar title="University Courses" />
      <View className="flex-1 items-center justify-center px-10">
        <View
          className="mb-5 h-20 w-20 items-center justify-center rounded-3xl bg-brand-50 dark:bg-card-dark"
          style={{
            shadowColor: '#0049B7',
            shadowOpacity: isDark ? 0 : 0.12,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 8 },
            elevation: isDark ? 0 : 2,
          }}>
          <Ionicons name="school-outline" size={32} color={isDark ? '#8bb4fd' : '#0049B7'} />
        </View>
        <Text className="text-xl font-bold text-slate-900 dark:text-white">University Courses</Text>
        <Text className="mt-2 max-w-xs text-center text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          Opening studyx.cc to browse universities and courses…
        </Text>
        <Pressable
          onPress={() => Linking.openURL(UNIVERSITY_COURSES_URL)}
          className="mt-6 flex-row items-center gap-2 rounded-full bg-brand-600 px-5 py-3 active:bg-brand-700">
          <Text className="text-sm font-semibold text-white">Open studyx.cc</Text>
          <Ionicons name="open-outline" size={16} color="#ffffff" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
