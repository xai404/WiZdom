import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { CallButton } from '@/components/call-button';
import { useAuth } from '@/context/auth-context';
import { useNotifications } from '@/context/notifications-context';
import { useAppTheme } from '@/hooks/use-app-theme';
import { formatFullDate } from '@/lib/format-date';

const PRIMARY = '#0049B7';
const ACCENT = '#3B82F6';

function getInitials(name?: string) {
  if (!name) return 'S';
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'S';
}

// Shared top header — student's full name + date, dark-mode/call/notification/
// profile actions. Used identically by the Dashboard and My Progress screens
// so both present the exact same top bar. Matches ChatHeader's
// gradient/shadow/rounded-corner treatment, same as TopBar, so every screen
// in the app now shares one consistent header identity.
export function AppHeader() {
  const { user } = useAuth();
  const { unreadCount: unreadNotifications } = useNotifications();
  const { isDark, toggleTheme } = useAppTheme();
  const router = useRouter();

  const fullName = user?.name?.trim() || 'Student';
  const today = formatFullDate();

  return (
    <LinearGradient
      colors={isDark ? ['#00132e', '#0B1E45', PRIMARY] : ['#00132e', PRIMARY, ACCENT]}
      start={{ x: 0.05, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        paddingTop: 14,
        paddingBottom: 20,
        paddingHorizontal: 16,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        shadowColor: '#001B47',
        shadowOpacity: 0.26,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 12 },
        elevation: 10,
      }}>
      <View className="w-full max-w-2xl flex-row items-center justify-between self-center">
        <View className="flex-1">
          <Text className="text-lg font-bold tracking-tight text-white" numberOfLines={1}>
            {fullName}
          </Text>
          <Text className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
            {today}
          </Text>
        </View>

        <View className="flex-row items-center gap-1">
          <Pressable
            onPress={toggleTheme}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Toggle dark mode"
            className="h-11 w-11 items-center justify-center rounded-full active:bg-white/10">
            <Ionicons name={isDark ? 'moon' : 'sunny'} size={20} color={isDark ? '#c7d8ff' : '#ffd166'} />
          </Pressable>

          <CallButton color="#ffffff" />

          <Pressable
            onPress={() => router.push('/notifications' as never)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Open Notifications"
            className="h-11 w-11 items-center justify-center rounded-full active:bg-white/10">
            <Ionicons name="notifications-outline" size={22} color="#ffffff" />
            {unreadNotifications > 0 ? (
              <View
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  height: 10,
                  width: 10,
                  borderRadius: 5,
                  backgroundColor: '#f87171',
                  borderWidth: 2,
                  borderColor: '#00132e',
                }}
              />
            ) : null}
          </Pressable>

          <Pressable
            onPress={() => router.push('/profile' as never)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Open profile">
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255,255,255,0.18)',
                borderWidth: 1.5,
                borderColor: 'rgba(255,255,255,0.45)',
                shadowColor: '#000',
                shadowOpacity: 0.18,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 4 },
                elevation: 4,
              }}>
              <Text className="text-sm font-bold text-white">{getInitials(user?.name)}</Text>
            </View>
          </Pressable>
        </View>
      </View>
    </LinearGradient>
  );
}
