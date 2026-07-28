import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { TopBar } from '@/components/top-bar';
import { useAuth } from '@/context/auth-context';
import { useAppTheme } from '@/hooks/use-app-theme';
import { fetchMyJourney, type JourneyStage, type JourneyStageStatus } from '@/lib/journey-api';

const QUICK_ACTIONS: { icon: keyof typeof Ionicons.glyphMap; label: string; route: string }[] = [
  { icon: 'compass-outline', label: 'My Journey', route: '/my-journey' },
  { icon: 'document-text-outline', label: 'Documents', route: '/documents' },
  { icon: 'chatbubble-ellipses-outline', label: 'Messages', route: '/messages' },
  { icon: 'headset-outline', label: 'Support', route: '/support' },
];

const PREVIEW_ICON: Record<JourneyStageStatus, keyof typeof Ionicons.glyphMap> = {
  completed: 'checkmark-circle',
  in_progress: 'time',
  pending: 'ellipse-outline',
};

const PREVIEW_COLOR: Record<JourneyStageStatus, string> = {
  completed: '#22c55e',
  in_progress: '#f59e0b',
  pending: '#f43f5e',
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function DashboardScreen() {
  const { user, token } = useAuth();
  const { isDark } = useAppTheme();
  const router = useRouter();

  const [journey, setJourney] = useState<JourneyStage[] | null>(null);
  const [journeyError, setJourneyError] = useState<string | null>(null);

  const fade = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const loadJourney = useCallback(() => {
    if (!token) {
      setJourneyError('Your session has expired. Please log in again.');
      return;
    }
    setJourneyError(null);
    fetchMyJourney(token)
      .then(setJourney)
      .catch((err) => setJourneyError(err instanceof Error ? err.message : 'Unable to load your journey.'));
  }, [token]);

  useEffect(() => {
    loadJourney();
  }, [loadJourney]);

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [fade]);

  const completedCount = journey?.filter((stage) => stage.status === 'completed').length ?? 0;
  const total = journey?.length ?? 0;
  const progress = total > 0 ? completedCount / total : 0;
  const currentStage =
    journey?.find((stage) => stage.status === 'in_progress') ??
    journey?.find((stage) => stage.status === 'pending');
  const currentStageTitle = currentStage?.title ?? (journey ? 'Process Complete' : '');
  const previewStages = journey?.slice(0, 4) ?? [];

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 900,
      delay: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const firstName = user?.name?.trim().split(/\s+/)[0] ?? 'Student';

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark">
      <TopBar />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        className="px-5">
        <Animated.View
          style={{ opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}
          className="w-full max-w-2xl self-center">
          <Text className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {getGreeting()}, {firstName} 👋
          </Text>

          {!journey && !journeyError ? (
            <View className="mt-6 items-center justify-center rounded-[28px] bg-card py-12 dark:bg-card-dark">
              <ActivityIndicator color={isDark ? '#8bb4fd' : '#0049B7'} />
            </View>
          ) : journeyError ? (
            <View className="mt-6 rounded-[28px] bg-card p-6 dark:bg-card-dark">
              <Text className="text-sm text-slate-500 dark:text-slate-400">{journeyError}</Text>
              <Pressable onPress={loadJourney} className="mt-3 self-start">
                <Text className="text-sm font-semibold text-brand-600 dark:text-brand-300">Try Again</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <LinearGradient
                colors={isDark ? ['#0049B7', '#001f4d'] : ['#3B82F6', '#0049B7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ borderRadius: 28, padding: 22, marginTop: 20 }}>
                <Text className="text-sm font-medium text-white/70">Current Stage</Text>
                <Text className="mt-1 text-2xl font-bold text-white">{currentStageTitle}</Text>

                <View className="mt-5 h-2.5 overflow-hidden rounded-full bg-white/20">
                  <Animated.View
                    style={{
                      width: progressWidth,
                      height: '100%',
                      borderRadius: 999,
                      backgroundColor: '#ffffff',
                    }}
                  />
                </View>
                <Text className="mt-2 text-sm font-semibold text-white/90">
                  {Math.round(progress * 100)}% complete
                </Text>
              </LinearGradient>

              <View className="mt-8 flex-row items-center justify-between">
                <Text className="text-lg font-bold text-slate-900 dark:text-white">Journey Timeline</Text>
              </View>

              <View className="mt-4 rounded-3xl bg-card p-5 dark:bg-card-dark">
                {previewStages.map((stage, index) => (
                  <View
                    key={stage.title}
                    className={`flex-row items-center gap-3 ${
                      index === previewStages.length - 1 ? '' : 'mb-4'
                    }`}>
                    <Ionicons name={PREVIEW_ICON[stage.status]} size={22} color={PREVIEW_COLOR[stage.status]} />
                    <Text
                      className={`text-[15px] ${
                        stage.status === 'completed'
                          ? 'text-slate-500 dark:text-slate-400'
                          : 'font-semibold text-slate-900 dark:text-white'
                      }`}>
                      {stage.title}
                    </Text>
                  </View>
                ))}

                <Pressable
                  onPress={() => router.push('/my-journey')}
                  className="mt-3 self-start rounded-full bg-brand-50 px-4 py-2 active:bg-brand-100 dark:bg-slate-800 dark:active:bg-slate-700">
                  <Text className="text-sm font-semibold text-brand-600 dark:text-brand-300">
                    View Complete Journey
                  </Text>
                </Pressable>
              </View>
            </>
          )}

          <Text className="mt-8 text-lg font-bold text-slate-900 dark:text-white">Quick Actions</Text>
          <View className="mt-4 flex-row flex-wrap justify-between gap-y-4">
            {QUICK_ACTIONS.map((action) => (
              <PressableScale key={action.route} onPress={() => router.push(action.route as never)} style={{ width: '48%' }}>
                <View
                  className="items-start rounded-3xl bg-card p-5 dark:bg-card-dark"
                  style={{
                    shadowColor: '#0f172a',
                    shadowOpacity: isDark ? 0 : 0.05,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: isDark ? 0 : 1,
                  }}>
                  <View className="h-11 w-11 items-center justify-center rounded-2xl bg-brand-100 dark:bg-slate-800">
                    <Ionicons name={action.icon} size={20} color={isDark ? '#8bb4fd' : '#0049B7'} />
                  </View>
                  <Text className="mt-3 text-[15px] font-semibold text-slate-800 dark:text-slate-100">
                    {action.label}
                  </Text>
                </View>
              </PressableScale>
            ))}
          </View>

          <Text className="mt-10 text-center text-sm italic text-slate-400 dark:text-slate-500">
            Every step brings you closer to your dream university.
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
