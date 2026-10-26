import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TopBar } from '@/components/top-bar';
import { PRIVACY_POLICY_URL } from '@/constants/config';
import { useAuth } from '@/context/auth-context';
import { useAppTheme } from '@/hooks/use-app-theme';
import { formatShortDate } from '@/lib/format-date';
import { changeMyPassword } from '@/lib/auth-api';

function getInitials(name?: string) {
  if (!name) return 'S';
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'S';
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Active: { bg: '#dcfce7', text: '#16a34a' },
  Inactive: { bg: '#f1f5f9', text: '#64748b' },
  Converted: { bg: '#dcf2e3', text: '#15803d' },
  Lead: { bg: '#fef9c3', text: '#a16207' },
  'Follow Up': { bg: '#ede9fe', text: '#6d28d9' },
  Closed: { bg: '#fee2e2', text: '#b91c1c' },
};

// Read-only by design — a student's profile is managed by their counsellor
// / admin via the Admin Panel, not self-editable in the app. Resetting
// their own password is the one exception (see ChangePasswordModal).

export default function ProfileScreen() {
  const { user, token, logout } = useAuth();
  const { isDark } = useAppTheme();
  const router = useRouter();
  const fade = useRef(new Animated.Value(0)).current;
  // Alert.alert isn't reliably supported on React Native Web (this app's
  // other flows avoid it too — see the Toast component) — a real Modal
  // works consistently everywhere, so the change-password form lives in one.
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [fade]);

  const statusColors = STATUS_COLORS[user?.status ?? 'Active'] ?? STATUS_COLORS.Active;

  const handleLogout = () => {
    logout();
    router.replace('/login');
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
              colors={['#2563eb', '#1d4ed8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 96,
                height: 96,
                borderRadius: 48,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#1d4ed8',
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
                  <Ionicons name="calendar-outline" size={17} color={isDark ? '#93c5fd' : '#1d4ed8'} />
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
              onPress={() => setChangePasswordOpen(true)}
              icon="key-outline"
              label="Reset Password"
              color={isDark ? '#93c5fd' : '#1d4ed8'}
              backgroundColor={isDark ? 'rgba(134,201,155,0.1)' : '#eef2ff'}
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

      <ChangePasswordModal visible={changePasswordOpen} token={token} onClose={() => setChangePasswordOpen(false)} />
    </SafeAreaView>
  );
}

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

function ChangePasswordModal({ visible, token, onClose }: { visible: boolean; token: string | null; onClose: () => void }) {
  const { isDark } = useAppTheme();
  const accent = isDark ? '#93c5fd' : '#1d4ed8';
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fresh form every time it opens.
  useEffect(() => {
    if (!visible) return;
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccess(false);
    setLoading(false);
  }, [visible]);

  const handleSubmit = async () => {
    if (!token) return;
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all the password fields.');
      return;
    }
    if (!PASSWORD_RULE.test(newPassword)) {
      setError('Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('New password must be different from your current password.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await changeMyPassword(token, currentPassword, newPassword, confirmPassword);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(2,14,8,0.55)' }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={loading ? undefined : onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}
          pointerEvents="box-none">
          <View
            className="w-full max-w-sm overflow-hidden rounded-3xl bg-card p-6 dark:bg-card-dark"
            style={{
              shadowColor: '#000',
              shadowOpacity: 0.3,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 12 },
              elevation: 12,
            }}>
            {success ? (
              <>
                <View className="mb-4 h-11 w-11 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950">
                  <Ionicons name="checkmark-circle-outline" size={22} color="#10b981" />
                </View>
                <Text className="text-lg font-bold text-slate-900 dark:text-white">Password Changed</Text>
                <Text className="mt-2 text-sm leading-5 text-slate-500 dark:text-slate-400">
                  Use your new password the next time you log in.
                </Text>
                <Pressable onPress={onClose} className="mt-5 items-center justify-center rounded-2xl bg-brand-600 py-3 active:opacity-90">
                  <Text className="text-[15px] font-semibold text-white">Done</Text>
                </Pressable>
              </>
            ) : (
              <>
                <View className="mb-4 h-11 w-11 items-center justify-center rounded-full bg-brand-50 dark:bg-slate-900/40">
                  <Ionicons name="key-outline" size={20} color={accent} />
                </View>
                <Text className="text-lg font-bold text-slate-900 dark:text-white">Reset Password</Text>
                <Text className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
                  Enter your current password, then choose a new one.
                </Text>

                <View className="mt-5 gap-3">
                  <PasswordField placeholder="Old password" value={currentPassword} onChangeText={setCurrentPassword} autoComplete="current-password" />
                  <PasswordField placeholder="New password" value={newPassword} onChangeText={setNewPassword} autoComplete="new-password" />
                  <PasswordField placeholder="Confirm new password" value={confirmPassword} onChangeText={setConfirmPassword} autoComplete="new-password" />
                </View>

                <Text className="mt-2.5 text-xs leading-4 text-slate-400 dark:text-slate-500">
                  At least 8 characters with uppercase, lowercase, a number and a special character.
                </Text>

                {error ? <Text className="mt-3 text-sm text-red-500">{error}</Text> : null}

                <View className="mt-6 flex-row gap-3">
                  <Pressable
                    onPress={onClose}
                    disabled={loading}
                    className="flex-1 items-center justify-center rounded-2xl bg-slate-100 py-3 active:bg-slate-200 dark:bg-slate-800 dark:active:bg-slate-700">
                    <Text className="text-[15px] font-semibold text-slate-600 dark:text-slate-300">Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSubmit}
                    disabled={loading}
                    className="flex-1 items-center justify-center rounded-2xl bg-brand-600 py-3 active:opacity-90">
                    {loading ? <ActivityIndicator color="#ffffff" /> : <Text className="text-[15px] font-semibold text-white">Update</Text>}
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function PasswordField({
  placeholder,
  value,
  onChangeText,
  autoComplete,
}: {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  autoComplete: 'current-password' | 'new-password';
}) {
  const { isDark } = useAppTheme();
  const [visible, setVisible] = useState(false);
  return (
    <View className="flex-row items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 dark:border-slate-700 dark:bg-slate-800">
      <Ionicons name="lock-closed-outline" size={17} color={isDark ? '#64748b' : '#94a3b8'} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete={autoComplete}
        className="ml-2.5 flex-1 py-3 text-[15px] text-slate-900 dark:text-white"
      />
      <Pressable onPress={() => setVisible((v) => !v)} hitSlop={10} accessibilityLabel={visible ? 'Hide password' : 'Show password'}>
        <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={18} color={isDark ? '#64748b' : '#94a3b8'} />
      </Pressable>
    </View>
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
        <Ionicons name={icon} size={17} color={isDark ? '#93c5fd' : '#1d4ed8'} />
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
