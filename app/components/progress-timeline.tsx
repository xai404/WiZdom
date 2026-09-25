import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { JourneyHeroCard } from '@/components/journey-hero-card';
import { LottieLoader } from '@/components/lottie-loader';
import { getStageMetaByTitle, STATUS_META } from '@/constants/journey-meta';
import { useJourney } from '@/context/journey-context';
import { useAppTheme } from '@/hooks/use-app-theme';
import { formatRelativeShort } from '@/lib/format-date';
import type { JourneyStage, JourneyStageStatus } from '@/lib/journey-api';

const PRIMARY = '#0049B7';
const AMBER = '#eab308';
const GREEN = '#22c55e';

// Shared by both the Dashboard and Progress screens so they render
// identically. All status/remark logic here is read straight from
// useJourney()/STATUS_META, unchanged — this file only decides how to
// *display* it.

type FilterKey = 'all' | JourneyStageStatus;
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'completed', label: 'Completed' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'pending', label: 'Pending' },
];

export function ProgressTimeline() {
  const { journey, loading, error, reload } = useJourney();
  const { isDark } = useAppTheme();
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>('all');

  const isInitialLoading = loading && !journey;
  const isRefreshing = loading && !!journey;

  const completed = journey?.filter((s) => s.status === 'completed').length ?? 0;
  const inProgress = journey?.filter((s) => s.status === 'in_progress').length ?? 0;
  const pending = journey?.filter((s) => s.status === 'pending').length ?? 0;
  const rejected = journey?.filter((s) => s.status === 'rejected').length ?? 0;
  const total = journey?.length ?? 0;

  const counts: Record<FilterKey, number> = { all: total, completed, in_progress: inProgress, pending, rejected };

  const filteredJourney = useMemo(() => {
    if (!journey) return journey;
    if (filter === 'all') return journey;
    return journey.filter((s) => s.status === filter);
  }, [journey, filter]);

  if (isInitialLoading) {
    return <LottieLoader label="Loading your progress…" />;
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center px-10">
        <Ionicons name="cloud-offline-outline" size={32} color="#94a3b8" />
        <Text className="mt-3 text-center text-sm text-slate-500 dark:text-slate-400">{error}</Text>
        <Pressable onPress={reload} className="mt-5 rounded-full bg-brand-600 px-5 py-2.5 active:bg-brand-700">
          <Text className="text-sm font-semibold text-white">Try Again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
      className="px-5"
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={reload} tintColor={isDark ? '#8bb4fd' : '#0049B7'} />}>
      <View className="w-full max-w-2xl self-center pt-3">
        <Text className="mb-4 text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">Your Progress</Text>

        <JourneyHeroCard />

        {/* Student Information Form entry point — always available from
            Journey Tracking, reuses the existing /sif screen. */}
        <Pressable
          onPress={() => router.push('/sif' as never)}
          accessibilityRole="button"
          accessibilityLabel="Open your Student Information Form"
          className="mb-4 flex-row items-center gap-3 rounded-2xl border border-brand-100 bg-white px-4 py-3.5 active:opacity-80 dark:border-slate-800 dark:bg-card-dark">
          <View
            style={{ width: 38, height: 38, borderRadius: 12 }}
            className="items-center justify-center bg-brand-50 dark:bg-brand-950">
            <Ionicons name="clipboard-outline" size={18} color={isDark ? '#8bb4fd' : PRIMARY} />
          </View>
          <View className="flex-1">
            <Text className="text-[14.5px] font-semibold text-slate-900 dark:text-white">
              Student Information Form
            </Text>
            <Text className="mt-0.5 text-[11.5px] text-slate-400 dark:text-slate-500">
              Fill in your SIF — personal details, academics, LOR & SOP
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={isDark ? '#64748b' : '#94a3b8'} />
        </Pressable>

        {journey && journey.length > 0 ? (
          <FilterPills active={filter} onChange={setFilter} isDark={isDark} />
        ) : null}

        {journey && journey.length === 0 ? (
          <EmptyState
            icon="compass-outline"
            title="Your journey will appear here"
            description="Once your counsellor sets up your study abroad plan, every stage will show up here."
          />
        ) : filteredJourney && filteredJourney.length === 0 ? (
          <EmptyState
            icon="filter-outline"
            title="No stages here"
            description="Nothing matches this filter yet — try a different one."
          />
        ) : (
          (() => {
            const firstPendingIndex = journey?.findIndex((s) => s.status === 'pending') ?? -1;
            return filteredJourney?.map((stage) => {
              const index = journey!.findIndex((s) => s.title === stage.title);
              return (
                <TimelineRow
                  key={stage.title}
                  stage={stage}
                  index={index}
                  isLast={index === journey!.length - 1}
                  isReached={!(stage.status === 'pending' && firstPendingIndex !== -1 && index > firstPendingIndex)}
                  prevCompleted={index > 0 && journey![index - 1].status === 'completed'}
                />
              );
            });
          })()
        )}
      </View>
    </ScrollView>
  );
}

function FilterPills({ active, onChange, isDark }: { active: FilterKey; onChange: (key: FilterKey) => void; isDark: boolean }) {
  return (
    <View
      className="mb-4 flex-row rounded-2xl p-1"
      style={{ backgroundColor: isDark ? '#0f172a' : '#eef2f7' }}>
      {FILTERS.map((f) => {
        const isActive = active === f.key;
        return (
          <Pressable
            key={f.key}
            onPress={() => onChange(f.key)}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 8,
              borderRadius: 14,
              backgroundColor: isActive ? (isDark ? '#1c2740' : '#ffffff') : 'transparent',
              shadowColor: '#0f172a',
              shadowOpacity: isActive && !isDark ? 0.08 : 0,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: isActive && !isDark ? 2 : 0,
            }}>
            <Text
              numberOfLines={1}
              className="text-[11.5px] font-semibold"
              style={{ color: isActive ? (isDark ? '#8bb4fd' : PRIMARY) : isDark ? '#64748b' : '#94a3b8' }}>
              {f.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function TimelineRow({
  stage,
  index,
  isLast,
  isReached,
  prevCompleted,
}: {
  stage: JourneyStage;
  index: number;
  isLast: boolean;
  isReached: boolean;
  prevCompleted: boolean;
}) {
  const { isDark } = useAppTheme();
  const router = useRouter();

  // A future stage the student hasn't reached yet — grey, locked, no
  // interaction. The stage right after the last completed one ("up next")
  // is still `status: 'pending'` but IS reached, so it stays open/neutral
  // rather than locked. This mirrors the exact isReached math the old
  // Dashboard/Progress timeline already used — no status logic changed.
  const locked = stage.status === 'pending' && !isReached;
  const meta = STATUS_META[stage.status];
  const stageMeta = getStageMetaByTitle(stage.title);

  const fade = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;
  const badgePop = useRef(new Animated.Value(0.4)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delay = Math.min(index * 40, 640);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 380, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 380, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    if (stage.status === 'completed') {
      // Smooth "just completed" pop for the checkmark node.
      Animated.sequence([
        Animated.delay(delay + 120),
        Animated.spring(badgePop, { toValue: 1, useNativeDriver: true, speed: 10, bounciness: 14 }),
      ]).start();
    } else {
      badgePop.setValue(1);
    }

    if (stage.status === 'in_progress') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowPulse, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(glowPulse, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage.status, index]);

  const handleOpenChat = () => {
    if (locked) return;
    router.push({ pathname: '/group-chat', params: { stage: stageMeta.slug } } as never);
  };

  // Node/icon colors per status — completed/in_progress/pending come from
  // STATUS_META unchanged; "locked" is a purely presentational bucket
  // layered on top of the existing pending status, never a new status value.
  const nodeColor = locked ? (isDark ? '#1e293b' : '#e2e8f0') : stage.status === 'completed' ? GREEN : stage.status === 'in_progress' ? AMBER : isDark ? '#1e293b' : '#e2e8f0';
  const iconTint = locked
    ? { bg: isDark ? '#0f172a' : '#f1f5f9', color: isDark ? '#475569' : '#94a3b8' }
    : stage.status === 'completed'
      ? { bg: isDark ? 'rgba(34,197,94,0.12)' : '#f0fdf4', color: GREEN }
      : stage.status === 'in_progress'
        ? { bg: isDark ? 'rgba(234,179,8,0.14)' : '#fefce8', color: AMBER }
        : { bg: isDark ? '#111c33' : '#f8fafc', color: isDark ? '#94a3b8' : '#64748b' };

  const trackColor = isDark ? '#1e293b' : '#e2e8f0';
  const connectorAboveColor = prevCompleted ? GREEN : trackColor;
  const connectorBelowColor = stage.status === 'completed' ? GREEN : trackColor;

  const glowOpacity = glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.45] });
  const glowScale = glowPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });

  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY }] }}>
      <View className="flex-row">
        <View style={{ width: 22, alignItems: 'center' }}>
          {index !== 0 ? <View style={{ width: 2, flex: 1, backgroundColor: connectorAboveColor }} /> : <View style={{ flex: 1 }} />}

          <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center', marginVertical: 4 }}>
            {stage.status === 'in_progress' ? (
              <Animated.View
                style={{
                  position: 'absolute',
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: AMBER,
                  opacity: glowOpacity,
                  transform: [{ scale: glowScale }],
                }}
              />
            ) : null}
            <Animated.View
              style={{
                transform: [{ scale: stage.status === 'completed' ? badgePop : 1 }],
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: nodeColor,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              {locked ? (
                <Ionicons name="lock-closed" size={10} color={isDark ? '#475569' : '#94a3b8'} />
              ) : stage.status === 'completed' ? (
                <Ionicons name="checkmark" size={13} color="#ffffff" />
              ) : (
                <Text className="text-[11px] font-bold" style={{ color: stage.status === 'in_progress' ? '#ffffff' : isDark ? '#64748b' : '#94a3b8' }}>
                  {index + 1}
                </Text>
              )}
            </Animated.View>
          </View>

          {!isLast ? <View style={{ width: 2, flex: 1, backgroundColor: connectorBelowColor }} /> : <View style={{ flex: 1 }} />}
        </View>

        <View className="mb-4 ml-2.5 flex-1">
          <View
            style={{
              borderRadius: 16,
              overflow: 'hidden',
              backgroundColor: locked ? (isDark ? '#0b1220' : '#f8fafc') : isDark ? '#111c33' : '#ffffff',
              borderWidth: 1,
              borderColor: locked ? (isDark ? '#1e293b' : '#e2e8f0') : stage.status === 'in_progress' ? (isDark ? 'rgba(234,179,8,0.35)' : '#fde68a') : stage.status === 'completed' ? (isDark ? 'rgba(34,197,94,0.25)' : '#bbf7d0') : isDark ? '#1e293b' : '#e2e8f0',
              opacity: locked ? 0.7 : 1,
              shadowColor: '#0f172a',
              shadowOpacity: isDark ? 0 : 0.04,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 3 },
              elevation: isDark ? 0 : 1,
            }}>
            <View className="flex-row items-center gap-3 px-3 py-3">
              <View style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: iconTint.bg }}>
                <Ionicons name={locked ? 'lock-closed-outline' : stageMeta.icon} size={17} color={iconTint.color} />
              </View>

              <View className="flex-1">
                <Text
                  className="text-[14.5px] font-semibold"
                  style={{ color: locked ? (isDark ? '#64748b' : '#94a3b8') : isDark ? '#ffffff' : '#0f172a' }}>
                  {stage.title}
                </Text>
              </View>

              <View className="items-end">
                {locked ? (
                  <Text className="text-[11px] font-medium" style={{ color: isDark ? '#475569' : '#94a3b8' }}>
                    Locked
                  </Text>
                ) : (
                  <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: meta.badgeBg }}>
                    <Text className="text-[10.5px] font-semibold" style={{ color: meta.badgeText }}>
                      {meta.label}
                    </Text>
                  </View>
                )}
                {!locked && stage.updatedAt ? (
                  <Text className="mt-1 text-[10px]" style={{ color: isDark ? '#475569' : '#94a3b8' }}>
                    {formatRelativeShort(stage.updatedAt)}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Remark preview lives inside the same card, right under the
                header, separated only by a hairline divider — not a
                separate floating box below it. Tap opens the full
                conversation in Group Chat; locked stages get a disabled,
                divider-only row since there's nothing to discuss yet. */}
            <Pressable
              onPress={handleOpenChat}
              disabled={locked}
              className="flex-row items-center justify-between gap-2 border-t px-3 py-2.5"
              style={{
                minHeight: 44,
                borderColor: isDark ? 'rgba(148,163,184,0.12)' : '#f1f5f9',
                backgroundColor: locked ? 'transparent' : isDark ? 'rgba(148,163,184,0.04)' : 'rgba(248,250,252,0.7)',
              }}>
              {locked ? (
                <Text className="flex-1 text-[13px]" style={{ color: isDark ? '#475569' : '#94a3b8' }}>
                  Remark locked until this stage starts
                </Text>
              ) : stage.latestRemark ? (
                <Text className="flex-1 text-[13px] text-slate-600 dark:text-slate-300">{stage.latestRemark}</Text>
              ) : (
                <Text className="flex-1 text-[13px]" style={{ color: isDark ? '#475569' : '#94a3b8' }}>
                  No remark yet
                </Text>
              )}
              <Ionicons name={locked ? 'lock-closed-outline' : 'chevron-forward'} size={14} color={isDark ? '#64748b' : '#94a3b8'} />
            </Pressable>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}
