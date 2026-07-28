import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { type ComponentProps, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Toast } from '@/components/toast';
import { useAuth } from '@/context/auth-context';
import { useAppTheme } from '@/hooks/use-app-theme';
import { loginRequest } from '@/lib/auth-api';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PRIMARY = '#0049B7';
const ACCENT = '#3B82F6';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { isDark } = useAppTheme();
  const { height } = useWindowDimensions();
  const heroHeight = Math.max(height * 0.42, 260);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const cardFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(cardFade, {
      toValue: 1,
      duration: 600,
      delay: 150,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [cardFade]);

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setToastMessage('Please enter your email and password.');
      return;
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setToastMessage('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const response = await loginRequest(trimmedEmail, password);
      login(response.user, response.token);
      router.replace('/dashboard');
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-surface dark:bg-surface-dark">
      <View style={{ height: heroHeight, borderBottomLeftRadius: 44, borderBottomRightRadius: 44, overflow: 'hidden' }}>
        <LinearGradient
          colors={['#00132e', '#001f4d', PRIMARY, ACCENT]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={{ flex: 1 }}>
          <View
            style={{
              position: 'absolute',
              width: 200,
              height: 200,
              borderRadius: 100,
              backgroundColor: 'rgba(255,255,255,0.08)',
              top: -50,
              right: -40,
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: 130,
              height: 130,
              borderRadius: 65,
              backgroundColor: 'rgba(255,255,255,0.10)',
              bottom: 10,
              left: -35,
            }}
          />
          <Ionicons
            name="airplane-outline"
            size={44}
            color="rgba(255,255,255,0.20)"
            style={{ position: 'absolute', top: '20%', left: '14%', transform: [{ rotate: '-20deg' }] }}
          />
          <Ionicons
            name="globe-outline"
            size={60}
            color="rgba(255,255,255,0.14)"
            style={{ position: 'absolute', bottom: '16%', right: '10%' }}
          />
          <Ionicons
            name="school-outline"
            size={38}
            color="rgba(255,255,255,0.18)"
            style={{ position: 'absolute', top: '32%', right: '20%' }}
          />

          <SafeAreaView edges={['top']} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 24 }}>
            <View
              style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                backgroundColor: 'rgba(255,255,255,0.14)',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Image
                source={require('@/assets/images/wizdom_logo.png')}
                style={{ width: 68, height: 68 }}
                resizeMode="contain"
              />
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View className="w-full max-w-sm self-center">
            <View className="mt-7 items-center">
              <Text className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Welcome Back</Text>
              <Text className="mt-2 text-center text-base text-slate-500 dark:text-slate-400">
                Continue your study abroad journey.
              </Text>
            </View>

            <Animated.View
              style={{
                marginTop: 26,
                opacity: cardFade,
                transform: [{ translateY: cardFade.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
                borderRadius: 28,
                shadowColor: PRIMARY,
                shadowOpacity: 0.18,
                shadowRadius: 26,
                shadowOffset: { width: 0, height: 14 },
                elevation: 10,
              }}>
              <View
                style={{
                  borderRadius: 28,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.6)',
                }}>
                <BlurView intensity={50} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                <View
                  style={[
                    StyleSheet.absoluteFill,
                    { backgroundColor: isDark ? 'rgba(17,28,51,0.6)' : 'rgba(255,255,255,0.62)' },
                  ]}
                />

                <View style={{ padding: 22 }}>
                  <View className="gap-4">
                    <FieldRow
                      icon="mail-outline"
                      placeholder="Email"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      textContentType="emailAddress"
                      isDark={isDark}
                    />

                    <FieldRow
                      icon="lock-closed-outline"
                      placeholder="Password"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoComplete="password"
                      textContentType="password"
                      rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      onRightIconPress={() => setShowPassword((prev) => !prev)}
                      isDark={isDark}
                    />
                  </View>

                  <Pressable className="mt-3 self-end" hitSlop={8}>
                    <Text className="text-sm font-medium text-brand-600 dark:text-brand-300">Forgot Password?</Text>
                  </Pressable>

                  <LoginButton loading={loading} onPress={handleLogin} />
                </View>
              </View>
            </Animated.View>

            <View className="mt-8 flex-row items-center justify-center gap-1.5">
              <Text className="text-sm text-slate-500 dark:text-slate-400">Need help?</Text>
              <Text className="text-sm font-semibold text-brand-600 dark:text-brand-300">Contact your counsellor</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Toast message={toastMessage} onHide={() => setToastMessage(null)} />
    </View>
  );
}

function LoginButton({ loading, onPress }: { loading: boolean; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  };
  const pressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  };

  return (
    <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} disabled={loading} className="mt-6">
      <Animated.View
        style={{
          transform: [{ scale }],
          borderRadius: 20,
          overflow: 'hidden',
          opacity: loading ? 0.85 : 1,
          shadowColor: PRIMARY,
          shadowOpacity: 0.3,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 10 },
          elevation: 6,
        }}>
        <LinearGradient
          colors={[ACCENT, PRIMARY]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingVertical: 18, alignItems: 'center', justifyContent: 'center', borderRadius: 20 }}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-base font-semibold tracking-wide text-white">Log In</Text>
          )}
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

type FieldRowProps = {
  icon: ComponentProps<typeof Ionicons>['name'];
  rightIcon?: ComponentProps<typeof Ionicons>['name'];
  onRightIconPress?: () => void;
  isDark: boolean;
} & ComponentProps<typeof TextInput>;

function FieldRow({ icon, rightIcon, onRightIconPress, isDark, ...inputProps }: FieldRowProps) {
  const [focused, setFocused] = useState(false);
  const focusAnim = useRef(new Animated.Value(0)).current;

  const animateFocus = (toValue: number) => {
    Animated.timing(focusAnim, { toValue, duration: 180, useNativeDriver: false }).start();
  };

  const handleFocus = () => {
    setFocused(true);
    animateFocus(1);
  };
  const handleBlur = () => {
    setFocused(false);
    animateFocus(0);
  };

  const unfocusedBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.55)';
  const focusedBg = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.9)';
  const unfocusedBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.7)';

  const borderColor = focusAnim.interpolate({ inputRange: [0, 1], outputRange: [unfocusedBorder, ACCENT] });
  const backgroundColor = focusAnim.interpolate({ inputRange: [0, 1], outputRange: [unfocusedBg, focusedBg] });

  return (
    <Animated.View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 18,
        paddingHorizontal: 16,
        borderWidth: 1.5,
        borderColor,
        backgroundColor,
      }}>
      <Ionicons name={icon} size={20} color={focused ? ACCENT : isDark ? '#94a3b8' : '#64748b'} />
      <TextInput
        {...inputProps}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
        style={{ marginLeft: 12, flex: 1, paddingVertical: 14, fontSize: 16, color: isDark ? '#ffffff' : '#0f172a' }}
      />
      {rightIcon ? (
        <Pressable
          onPress={onRightIconPress}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={rightIcon === 'eye-outline' ? 'Show password' : 'Hide password'}
          testID="toggle-password-visibility">
          <Ionicons name={rightIcon} size={20} color={isDark ? '#94a3b8' : '#64748b'} />
        </Pressable>
      ) : null}
    </Animated.View>
  );
}
