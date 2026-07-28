import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProgressRing } from '@/components/progress-ring';
import { TopBar } from '@/components/top-bar';
import { useAuth } from '@/context/auth-context';
import { useAppTheme } from '@/hooks/use-app-theme';
import { formatShortDate } from '@/lib/format-date';
import { fetchMyJourney, type JourneyStage, type JourneyStageStatus } from '@/lib/journey-api';

const STATUS_META: Record<
  JourneyStageStatus,
  { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string; badgeBg: string; badgeText: string; label: string }
> = {
  completed: {
    icon: 'checkmark-circle',
    color: '#22c55e',
    bg: '#dcfce7',
    badgeBg: '#dcfce7',
    badgeText: '#16a34a',
    label: 'Completed',
  },
  in_progress: {
    icon: 'time',
    color: '#f59e0b',
    bg: '#fef3c7',
    badgeBg: '#fef3c7',
    badgeText: '#b45309',
    label: 'In Progress',
  },
  pending: {
    icon: 'ellipse-outline',
    color: '#f43f5e',
    bg: '#ffe4e6',
    badgeBg: '#ffe4e6',
    badgeText: '#e11d48',
    label: 'Pending',
  },
};

export default function MyJourneyScreen() {
  const { token } = useAuth();
  const { isDark } = useAppTheme();
  const [journey, setJourney] = useState<JourneyStage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const headerFade = useRef(new Animated.Value(0)).current;

  const load = useCallback(() => {
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
    load();
  }, [load]);

  useEffect(() => {
    if (journey) {
      Animated.timing(headerFade, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [journey, headerFade]);

  const completedCount = journey?.filter((stage) => stage.status === 'completed').length ?? 0;
  const total = journey?.length ?? 0;
  const progress = total > 0 ? completedCount / total : 0;

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark">
      <TopBar title="My Journey" />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={isDark ? '#8bb4fd' : '#0049B7'} />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-10">
          <Ionicons name="cloud-offline-outline" size={32} color="#94a3b8" />
          <Text className="mt-3 text-center text-sm text-slate-500 dark:text-slate-400">{error}</Text>
          <Pressable onPress={load} className="mt-5 rounded-full bg-brand-600 px-5 py-2.5 active:bg-brand-700">
            <Text className="text-sm font-semibold text-white">Try Again</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false} className="px-5">
          <Animated.View
            style={{
              opacity: headerFade,
              transform: [{ translateY: headerFade.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
            }}
            className="w-full max-w-2xl self-center">
            <LinearGradient
              colors={isDark ? ['#0049B7', '#001f4d'] : ['#3B82F6', '#0049B7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 28,
                padding: 22,
                marginTop: 16,
                flexDirection: 'row',
                alignItems: 'center',
                shadowColor: '#0049B7',
                shadowOpacity: 0.28,
                shadowRadius: 22,
                shadowOffset: { width: 0, height: 12 },
                elevation: 8,
              }}>
              <View className="flex-1 pr-4">
                <Text className="text-sm font-medium text-white/70">Overall Progress</Text>
                <Text className="mt-1 text-xl font-bold text-white">
                  {completedCount} of {total} stages
                </Text>
                <Text className="mt-0.5 text-sm text-white/70">completed</Text>
              </View>
              <ProgressRing progress={progress} size={88} strokeWidth={8} label={`${Math.round(progress * 100)}%`} />
            </LinearGradient>

            <View className="mt-8">
              {journey?.map((stage, index) => (
                <TimelineRow key={stage.title} stage={stage} isLast={index === journey.length - 1} index={index} />
              ))}
            </View>
          </Animated.View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function TimelineRow({ stage, isLast, index }: { stage: JourneyStage; isLast: boolean; index: number }) {
  const meta = STATUS_META[stage.status];
  const fade = useRef(new Animated.Value(0)).current;
  const isActive = stage.status === 'in_progress';

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 420,
      delay: Math.min(index * 45, 700),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [fade, index]);

  return (
    <Animated.View
      style={{
        flexDirection: 'row',
        opacity: fade,
        transform: [{ translateX: fade.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }],
      }}>
      <View className="items-center" style={{ width: 40 }}>
        <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: meta.bg }}>
          <Ionicons name={meta.icon} size={18} color={meta.color} />
        </View>
        {!isLast ? <View className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-800" style={{ minHeight: 12 }} /> : null}
      </View>

      <View
        className="mb-4 flex-1 rounded-2xl bg-card px-4 py-3.5 dark:bg-card-dark"
        style={
          isActive
            ? {
                borderWidth: 1.5,
                borderColor: '#3B82F6',
                shadowColor: '#0049B7',
                shadowOpacity: 0.14,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 6 },
                elevation: 3,
              }
            : undefined
        }>
        <Text
          className={`text-[15px] ${
            stage.status === 'pending'
              ? 'text-slate-500 dark:text-slate-400'
              : 'font-semibold text-slate-900 dark:text-white'
          }`}>
          {stage.title}
        </Text>
        <View className="mt-2 flex-row items-center gap-2">
          <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: meta.badgeBg }}>
            <Text className="text-xs font-semibold" style={{ color: meta.badgeText }}>
              {meta.label}
            </Text>
          </View>
          {stage.updatedAt ? (
            <Text className="text-xs text-slate-400 dark:text-slate-500">
              Updated {formatShortDate(stage.updatedAt)}
            </Text>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}
