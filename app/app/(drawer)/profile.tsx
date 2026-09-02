import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TopBar } from '@/components/top-bar';
import { PRIVACY_POLICY_URL } from '@/constants/config';
import { useAuth } from '@/context/auth-context';
import { useAppTheme } from '@/hooks/use-app-theme';
import { formatShortDate } from '@/lib/format-date';
import { resetMyPassword } from '@/lib/auth-api';

function getInitials(name?: string) {
  if (!name) return 'S';
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'S';
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Active: { bg: '#dcfce7', text: '#16a34a' },
  Inactive: { bg: '#f1f5f9', text: '#64748b' },
  Converted: { bg: '#dbeafe', text: '#1d4ed8' },
  Lead: { bg: '#fef9c3', text: '#a16207' },
  'Follow Up': { bg: '#ede9fe', text: '#6d28d9' },
  Closed: { bg: '#fee2e2', text: '#b91c1c' },
};

// Read-only by design — a student's profile is managed by their counsellor
// / admin via the Admin Panel, not self-editable in the app. Resetting
// their own password is the one exception (see handleResetPassword).
type ResetStep = 'confirm' | 'loading' | 'result' | 'error';

export default function ProfileScreen() {
  const { user, token, logout } = useAuth();
  const { isDark } = useAppTheme();
  const router = useRouter();
  const fade = useRef(new Animated.Value(0)).current;
  // Alert.alert isn't reliably supported on React Native Web (this app's
  // other flows avoid it too — see the Toast component) — a real Modal
  // works consistently everywhere, so the whole confirm/result flow lives
  // in one here instead.
  const [resetModal, setResetModal] = useState<{ step: ResetStep; password?: string; error?: string } | null>(null);

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [fade]);

  const statusColors = STATUS_COLORS[user?.status ?? 'Active'] ?? STATUS_COLORS.Active;

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const openResetModal = () => setResetModal({ step: 'confirm' });
  const closeResetModal = () => setResetModal(null);

  const confirmReset = async () => {
    if (!token) return;
    setResetModal({ step: 'loading' });
    try {
      const newPassword = await resetMyPassword(token);
      setResetModal({ step: 'result', password: newPassword });
    } catch (err) {
      setResetModal({ step: 'error', error: err instanceof Error ? err.message : 'Please try again.' });
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-surface dark:bg-surface-dark">
      <TopBar title="My Profile" />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={{ opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}
          className="items-center px-6 pt-6">
          {user?.profilePicture ? (
            <Image
              source={{ uri: user.profilePicture }}
              style={{ width: 96, height: 96, borderRadius: 48 }}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={['#3B82F6', '#0049B7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 96,
                height: 96,
                borderRadius: 48,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#0049B7',
                shadowOpacity: 0.35,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 8 },
                elevation: 6,
              }}>
              <Text className="text-3xl font-bold text-white">{getInitials(user?.name)}</Text>
            </LinearGradient>
          )}

          <Text className="mt-5 text-xl font-bold text-slate-900 dark:text-white">{user?.name ?? 'Student'}</Text>
          <Text className="mt-1 text-sm text-slate-500 dark:text-slate-400">{user?.email ?? 'student@wizdom.app'}</Text>
          <View className="mt-2.5 rounded-full px-3 py-1" style={{ backgroundColor: statusColors.bg }}>
            <Text className="text-xs font-semibold" style={{ color: statusColors.text }}>
              {user?.status ?? 'Active'}
            </Text>
          </View>

          <View className="mt-7 w-full max-w-sm">
            <DetailCard>
              <DetailRow icon="call-outline" label="Phone Number" value={user?.phone || '—'} />
              <Divider />
              <DetailRow icon="globe-outline" label="Country Chosen" value={user?.countryInterested?.length ? user.countryInterested.join(', ') : '—'} />
              <Divider />
              <View className="flex-row items-center gap-3 px-4 py-3.5">
                <View className="h-9 w-9 items-center justify-center rounded-full bg-brand-50 dark:bg-slate-900/40">
                  <Ionicons name="calendar-outline" size={17} color={isDark ? '#8bb4fd' : '#0049B7'} />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-slate-400 dark:text-slate-500">Joined</Text>
                  <Text className="mt-0.5 text-sm font-medium text-slate-800 dark:text-white" numberOfLines={1}>
                    {user?.createdAt ? formatShortDate(user.createdAt) : '—'}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-xs text-slate-400 dark:text-slate-500">Added by</Text>
                  <Text className="mt-0.5 text-sm font-medium text-slate-800 dark:text-white" numberOfLines={1}>
                    {user?.createdBy?.name || '—'}
                  </Text>
                </View>
              </View>
            </DetailCard>

            <AnimatedActionButton
              onPress={openResetModal}
              icon="key-outline"
              label="Reset Password"
              color={isDark ? '#8bb4fd' : '#0049B7'}
              backgroundColor={isDark ? 'rgba(139,180,253,0.1)' : '#eef2ff'}
              style={{ marginTop: 20 }}
            />

            <AnimatedActionButton
              onPress={handleLogout}
              icon="log-out-outline"
              label="Logout"
              color="#ef4444"
              style={{ marginTop: 12 }}
            />

            <Pressable
              onPress={() => {
                WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL).catch(() => {});
              }}
              hitSlop={8}
              className="mt-5 flex-row items-center justify-center gap-1.5 py-1 active:opacity-70">
              <Ionicons name="shield-checkmark-outline" size={13} color={isDark ? '#64748b' : '#94a3b8'} />
              <Text className="text-[12.5px] font-medium text-slate-400 dark:text-slate-500">Privacy Policy</Text>
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>

      <ResetPasswordModal state={resetModal} onCancel={closeResetModal} onConfirm={confirmReset} onDone={closeResetModal} />
    </SafeAreaView>
  );
}

function ResetPasswordModal({
  state,
  onCancel,
  onConfirm,
  onDone,
}: {
  state: { step: ResetStep; password?: string; error?: string } | null;
  onCancel: () => void;
  onConfirm: () => void;
  onDone: () => void;
}) {
  const { isDark } = useAppTheme();
  const accent = isDark ? '#8bb4fd' : '#0049B7';
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (state?.step !== 'result') setCopied(false);
  }, [state?.step]);

  const handleCopy = async () => {
    if (!state?.password) return;
    await Clipboard.setStringAsync(state.password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal visible={!!state} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(3,10,26,0.55)' }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={state?.step === 'confirm' || state?.step === 'error' ? onCancel : undefined} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <View
            className="w-full max-w-sm overflow-hidden rounded-3xl bg-card p-6 dark:bg-card-dark"
            style={{
              shadowColor: '#000',
              shadowOpacity: 0.3,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 12 },
              elevation: 12,
            }}>
            {state?.step === 'confirm' && (
              <>
                <View className="mb-4 h-11 w-11 items-center justify-center rounded-full bg-brand-50 dark:bg-slate-900/40">
                  <Ionicons name="key-outline" size={20} color={accent} />
                </View>
                <Text className="text-lg font-bold text-slate-900 dark:text-white">Reset Password</Text>
                <Text className="mt-2 text-sm leading-5 text-slate-500 dark:text-slate-400">
                  This generates a brand new password for your account and emails it to you. Continue?
                </Text>
                <View className="mt-6 flex-row gap-3">
                  <Pressable onPress={onCancel} className="flex-1 items-center justify-center rounded-2xl bg-slate-100 py-3 active:bg-slate-200 dark:bg-slate-800 dark:active:bg-slate-700">
                    <Text className="text-[15px] font-semibold text-slate-600 dark:text-slate-300">Cancel</Text>
                  </Pressable>
                  <Pressable onPress={onConfirm} className="flex-1 items-center justify-center rounded-2xl bg-brand-600 py-3 active:opacity-90">
                    <Text className="text-[15px] font-semibold text-white">Reset</Text>
                  </Pressable>
                </View>
              </>
            )}

            {state?.step === 'loading' && (
              <View className="items-center py-4">
                <ActivityIndicator size="large" color={accent} />
                <Text className="mt-4 text-sm text-slate-500 dark:text-slate-400">Resetting your password…</Text>
              </View>
            )}

            {state?.step === 'result' && (
              <>
                <View className="mb-4 h-11 w-11 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950">
                  <Ionicons name="checkmark-circle-outline" size={22} color="#10b981" />
                </View>
                <Text className="text-lg font-bold text-slate-900 dark:text-white">Password Reset</Text>
                <Text className="mt-2 text-sm leading-5 text-slate-500 dark:text-slate-400">
                  Your new password (also emailed to you):
                </Text>
                <View className="mt-3 flex-row items-center gap-2 rounded-2xl bg-slate-100 py-3.5 pl-4 pr-3 dark:bg-slate-800">
                  <Text selectable className="flex-1 text-center text-base font-bold tracking-wide text-slate-900 dark:text-white">
                    {state.password}
                  </Text>
                  <Pressable
                    onPress={handleCopy}
                    hitSlop={8}
                    className="h-9 w-9 items-center justify-center rounded-full active:bg-slate-200 dark:active:bg-slate-700">
                    <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color={copied ? '#10b981' : accent} />
                  </Pressable>
                </View>
                <Text className="mt-3 text-xs text-slate-400 dark:text-slate-500">
                  {copied ? 'Copied to clipboard!' : 'Use this the next time you log in.'}
                </Text>
                <Pressable onPress={onDone} className="mt-5 items-center justify-center rounded-2xl bg-brand-600 py-3 active:opacity-90">
                  <Text className="text-[15px] font-semibold text-white">Done</Text>
                </Pressable>
              </>
            )}

            {state?.step === 'error' && (
              <>
                <View className="mb-4 h-11 w-11 items-center justify-center rounded-full bg-red-50 dark:bg-red-950">
                  <Ionicons name="alert-circle-outline" size={22} color="#ef4444" />
                </View>
                <Text className="text-lg font-bold text-slate-900 dark:text-white">Could Not Reset Password</Text>
                <Text className="mt-2 text-sm leading-5 text-slate-500 dark:text-slate-400">{state.error}</Text>
                <Pressable onPress={onCancel} className="mt-5 items-center justify-center rounded-2xl bg-slate-100 py-3 active:bg-slate-200 dark:bg-slate-800 dark:active:bg-slate-700">
                  <Text className="text-[15px] font-semibold text-slate-600 dark:text-slate-300">Close</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function AnimatedActionButton({
  onPress,
  icon,
  label,
  color,
  backgroundColor,
  style,
}: {
  onPress: () => void;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  backgroundColor?: string;
  style?: object;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  };
  const pressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  };

  return (
    <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} style={style}>
      <Animated.View
        style={[
          { transform: [{ scale }], borderRadius: 16, paddingVertical: 14 },
          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor },
        ]}>
        <Ionicons name={icon} size={18} color={color} />
        <Text className="text-[15px] font-semibold" style={{ color }}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function DetailCard({ children }: { children: React.ReactNode }) {
  const { isDark } = useAppTheme();
  return (
    <View
      className="overflow-hidden rounded-3xl bg-card dark:bg-card-dark"
      style={{
        shadowColor: '#0f172a',
        shadowOpacity: isDark ? 0 : 0.05,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 5 },
        elevation: isDark ? 0 : 1,
      }}>
      {children}
    </View>
  );
}

function Divider() {
  return <View className="h-px bg-slate-100 dark:bg-slate-800" />;
}

function DetailRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  const { isDark } = useAppTheme();
  return (
    <View className="flex-row items-center gap-3 px-4 py-3.5">
      <View className="h-9 w-9 items-center justify-center rounded-full bg-brand-50 dark:bg-slate-900/40">
        <Ionicons name={icon} size={17} color={isDark ? '#8bb4fd' : '#0049B7'} />
      </View>
      <View className="flex-1">
        <Text className="text-xs text-slate-400 dark:text-slate-500">{label}</Text>
        <Text className="mt-0.5 text-sm font-medium text-slate-800 dark:text-white" numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}
