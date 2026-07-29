import { Ionicons } from '@expo/vector-icons';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { JourneyCardSkeleton } from '@/components/skeleton';
import { STATUS_META } from '@/constants/journey-meta';
import { useAuth } from '@/context/auth-context';
import { useChat } from '@/context/chat-context';
import { useJourney } from '@/context/journey-context';
import { useAppTheme } from '@/hooks/use-app-theme';
import { formatFullDate, formatRelativeShort } from '@/lib/format-date';
import type { JourneyStage } from '@/lib/journey-api';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function getInitials(name?: string) {
  if (!name) return 'S';
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'S';
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const { journey, loading, error, reload } = useJourney();
  const { unreadCount } = useChat();
  const { isDark } = useAppTheme();
  const router = useRouter();
  const navigation = useNavigation<DrawerNavigationProp<Record<string, object | undefined>>>();

  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [fade]);

  const firstName = user?.name?.trim().split(/\s+/)[0] ?? 'Student';
  const today = useMemo(() => formatFullDate(), []);

  const isInitialLoading = loading && !journey;
  const isRefreshing = loading && !!journey;

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark">
      <View className="flex-row items-center justify-between px-5 pb-3 pt-2">
        <View className="flex-1 pr-3">
          <Text className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white" numberOfLines={1}>
            {getGreeting()}, {firstName} 👋
          </Text>
          <Text className="mt-1 text-sm text-slate-500 dark:text-slate-400">{today}</Text>
        </View>

        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.push('/group-chat' as never)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Open Group Chat"
            className="h-11 w-11 items-center justify-center rounded-full active:bg-slate-100 dark:active:bg-slate-800">
            <Ionicons name="notifications-outline" size={22} color={isDark ? '#f1f5f9' : '#0f172a'} />
            {unreadCount > 0 ? (
              <View className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-surface bg-brand-600 dark:border-surface-dark" />
            ) : null}
          </Pressable>

          <Pressable
            onPress={() => navigation.toggleDrawer()}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Open menu">
            <LinearGradient
              colors={['#3B82F6', '#0049B7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}>
              <Text className="text-sm font-bold text-white">{getInitials(user?.name)}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>

      {isInitialLoading ? (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} className="px-5">
          <View className="w-full max-w-2xl self-center pt-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <JourneyCardSkeleton key={i} />
            ))}
          </View>
        </ScrollView>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-10">
          <Ionicons name="cloud-offline-outline" size={32} color="#94a3b8" />
          <Text className="mt-3 text-center text-sm text-slate-500 dark:text-slate-400">{error}</Text>
          <Pressable onPress={reload} className="mt-5 rounded-full bg-brand-600 px-5 py-2.5 active:bg-brand-700">
            <Text className="text-sm font-semibold text-white">Try Again</Text>
          </Pressable>
        </View>
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            className="px-5"
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={reload} tintColor={isDark ? '#8bb4fd' : '#0049B7'} />}>
            <Animated.View
              style={{
                opacity: fade,
                transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
              }}
              className="w-full max-w-2xl self-center pt-1">
              <Text className="mb-3 text-lg font-bold text-slate-900 dark:text-white">My Journey</Text>

              {journey && journey.length === 0 ? (
                <EmptyState
                  icon="compass-outline"
                  title="Your journey will appear here"
                  description="Once your counsellor sets up your study abroad plan, every stage will show up here."
                />
              ) : (
                journey?.map((stage, index) => <StageCard key={stage.title} stage={stage} index={index} />)
              )}
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

function StageCard({ stage, index }: { stage: JourneyStage; index: number }) {
  const meta = STATUS_META[stage.status];
  const { isDark } = useAppTheme();
  const { sendReply } = useChat();
  const { applyOptimisticRemark } = useJourney();
  const fade = useRef(new Animated.Value(0)).current;
  const [draft, setDraft] = useState('');

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 380,
      delay: Math.min(index * 40, 640),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [fade, index]);

  const handleSend = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    sendReply(trimmed, stage.title);
    applyOptimisticRemark(stage.title, trimmed);
    setDraft('');
    Keyboard.dismiss();
  };

  return (
    <Animated.View
      style={{
        opacity: fade,
        transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
      }}>
      <View
        className="mb-3 rounded-3xl bg-card px-4 py-4 dark:bg-card-dark"
        style={{
          shadowColor: '#0f172a',
          shadowOpacity: isDark ? 0 : 0.05,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 5 },
          elevation: isDark ? 0 : 1,
        }}>
        <View className="flex-row items-center justify-between gap-3">
          <Text className="flex-1 text-[15px] font-semibold text-slate-900 dark:text-white" numberOfLines={1}>
            {stage.title}
          </Text>
          <View className="flex-row items-center gap-1.5 rounded-full px-2.5 py-1" style={{ backgroundColor: meta.badgeBg }}>
            <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
            <Text className="text-xs font-semibold" style={{ color: meta.badgeText }}>
              {meta.label}
            </Text>
          </View>
        </View>

        <Text className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          {stage.updatedAt ? `Updated ${formatRelativeShort(stage.updatedAt)}` : 'Not started yet'}
        </Text>

        <View className="mt-2.5">
          <Text className="text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Remark
          </Text>
          <View
            className="mt-1 justify-center rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/40"
            style={{ minHeight: 52 }}>
            {stage.latestRemark ? (
              <Text className="text-sm text-slate-600 dark:text-slate-300">{stage.latestRemark}</Text>
            ) : null}
          </View>
        </View>

        <View className="mt-2 flex-row items-center gap-2">
          <View className="flex-1 rounded-full border border-slate-100 bg-surface px-3.5 py-2 dark:border-slate-800 dark:bg-slate-900">
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Type your reply..."
              placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              className="text-sm text-slate-900 dark:text-white"
            />
          </View>
          <Pressable
            onPress={handleSend}
            disabled={!draft.trim()}
            hitSlop={6}
            className="h-9 w-9 items-center justify-center rounded-full"
            style={{ backgroundColor: draft.trim() ? '#0049B7' : isDark ? '#1e293b' : '#e2e8f0' }}>
            <Ionicons name="send" size={15} color={draft.trim() ? '#ffffff' : isDark ? '#64748b' : '#94a3b8'} />
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}
