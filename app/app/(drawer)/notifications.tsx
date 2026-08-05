import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { LottieLoader } from '@/components/lottie-loader';
import { TopBar } from '@/components/top-bar';
import { getStageMetaByTitle } from '@/constants/journey-meta';
import { useNotifications } from '@/context/notifications-context';
import { useAppTheme } from '@/hooks/use-app-theme';
import { formatRelativeShort } from '@/lib/format-date';
import type { AppNotification, NotificationType } from '@/lib/notifications-api';

const DEFAULT_META = { icon: 'notifications-outline' as const, bg: '#f1f5f9', color: '#64748b' };
const DEFAULT_META_DARK = { bg: '#1e293b', color: '#94a3b8' };

// Server-side (studentNotificationController.getMyNotifications) already
// excludes the staff-only 'department_tag' type from this feed, but this
// lookup falls back to a neutral default for anything unrecognized rather
// than crashing the screen — the API response is out of this file's
// control and notification types can grow independently of the app build.
const TYPE_META: Partial<Record<NotificationType, { icon: keyof typeof Ionicons.glyphMap; bg: string; color: string }>> = {
  stage_status: { icon: 'flag-outline', bg: '#eef5ff', color: '#0049B7' },
  remark: { icon: 'chatbubble-ellipses-outline', bg: '#ffedd5', color: '#c2410c' },
  message: { icon: 'mail-outline', bg: '#dcfce7', color: '#16a34a' },
};

const TYPE_META_DARK: Partial<Record<NotificationType, { bg: string; color: string }>> = {
  stage_status: { bg: '#0f1f3d', color: '#8bb4fd' },
  remark: { bg: '#2a1608', color: '#fb923c' },
  message: { bg: '#0f2417', color: '#4ade80' },
};

export default function NotificationsScreen() {
  const { notifications, loading, error, reload, unreadCount, markRead, markAllRead } = useNotifications();
  const { isDark } = useAppTheme();
  const router = useRouter();

  const isInitialLoading = loading && !notifications;
  const isRefreshing = loading && !!notifications;

  const handlePress = (notification: AppNotification) => {
    if (!notification.read) markRead(notification._id);
    // Stage-tagged notifications (remarks) deep-link straight to that
    // stage's thread; general messages still open Group Chat, just without
    // a stage filter, rather than doing nothing on tap.
    const meta = notification.stage ? getStageMetaByTitle(notification.stage) : null;
    router.push((meta ? { pathname: '/group-chat', params: { stage: meta.slug } } : '/group-chat') as never);
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-surface dark:bg-surface-dark">
      <TopBar title="Notifications" />

      {unreadCount > 0 ? (
        <View className="flex-row items-center justify-between px-5 pb-3 pt-3">
          <View className="flex-row items-center gap-1.5">
            <View className="h-1.5 w-1.5 rounded-full bg-brand-600" />
            <Text className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {unreadCount} unread
            </Text>
          </View>
          <Pressable onPress={markAllRead} hitSlop={8}>
            <Text className="text-xs font-semibold text-brand-600 dark:text-brand-300">Mark all as read</Text>
          </Pressable>
        </View>
      ) : null}

      {isInitialLoading ? (
        <LottieLoader label="Loading notifications…" />
      ) : error ? (
        <View className="flex-1 items-center justify-center px-10">
          <Ionicons name="cloud-offline-outline" size={32} color="#94a3b8" />
          <Text className="mt-3 text-center text-sm text-slate-500 dark:text-slate-400">{error}</Text>
          <Pressable onPress={reload} className="mt-5 rounded-full bg-brand-600 px-5 py-2.5 active:bg-brand-700">
            <Text className="text-sm font-semibold text-white">Try Again</Text>
          </Pressable>
        </View>
      ) : notifications && notifications.length === 0 ? (
        <EmptyState
          icon="notifications-outline"
          title="You're all caught up"
          description="Updates about your journey, remarks and messages from your counsellor will show up here."
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          className="px-5"
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={reload} tintColor={isDark ? '#8bb4fd' : '#0049B7'} />}>
          <View className="pt-2">
            {notifications?.map((notification, index) => (
              <NotificationRow
                key={notification._id}
                notification={notification}
                index={index}
                onPress={() => handlePress(notification)}
              />
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function NotificationRow({
  notification,
  index,
  onPress,
}: {
  notification: AppNotification;
  index: number;
  onPress: () => void;
}) {
  const { isDark } = useAppTheme();
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const meta = TYPE_META[notification.type] ?? DEFAULT_META;
  const darkMeta = TYPE_META_DARK[notification.type] ?? DEFAULT_META_DARK;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 340,
      delay: Math.min(index * 35, 560),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [fade, index]);

  const pressIn = () => {
    Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  };
  const pressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  };

  return (
    <Animated.View
      style={{
        opacity: fade,
        transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }, { scale }],
      }}>
      <Pressable
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        className="mb-2.5 flex-row items-start gap-3 rounded-2xl px-4 py-3.5"
        style={{
          backgroundColor: notification.read ? 'transparent' : isDark ? 'rgba(139,180,253,0.06)' : '#f5f8ff',
          borderLeftWidth: 3,
          borderLeftColor: notification.read ? 'transparent' : isDark ? '#8bb4fd' : '#0049B7',
        }}>
        <View
          className="h-9 w-9 items-center justify-center rounded-full"
          style={{ backgroundColor: isDark ? darkMeta.bg : meta.bg, opacity: notification.read ? 0.7 : 1 }}>
          <Ionicons name={meta.icon} size={17} color={isDark ? darkMeta.color : meta.color} />
        </View>

        <View className="flex-1">
          <Text
            className="text-sm text-slate-900 dark:text-white"
            style={{ fontWeight: notification.read ? '500' : '700' }}
            numberOfLines={1}>
            {notification.title}
          </Text>
          <Text className="mt-0.5 text-sm text-slate-500 dark:text-slate-400" numberOfLines={2}>
            {notification.body}
          </Text>
          <Text className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
            {formatRelativeShort(notification.createdAt)}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}
