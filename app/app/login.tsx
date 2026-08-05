import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { type ComponentProps, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Toast } from '@/components/toast';
import { useAuth } from '@/context/auth-context';
import { loginRequest } from '@/lib/auth-api';
import { fetchHelplineContact } from '@/lib/support-contacts-api';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PRIMARY = '#0049B7';
const ACCENT = '#3B82F6';
const SKY = '#8AB4FF';
// Web has no native animated driver (RN Web falls back to JS animation and
// logs a warning if this is left `true`); native platforms keep the
// perf benefit.
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

// Fixed, deterministic layout (not Math.random) so the background is stable
// across re-renders and identical on server-rendered vs client-hydrated
// markup on web.
const TRAVEL_ICONS = [
  { name: 'airplane-outline', left: '10%', top: '8%', size: 24, delay: 0, float: 16, rotate: 14 },
  { name: 'book-outline', left: '84%', top: '10%', size: 20, delay: 260, float: 14, rotate: -10 },
  { name: 'globe-outline', left: '88%', top: '38%', size: 24, delay: 120, float: 20, rotate: -12 },
  { name: 'library-outline', left: '8%', top: '68%', size: 20, delay: 620, float: 16, rotate: 10 },
  { name: 'compass-outline', left: '48%', top: '6%', size: 18, delay: 560, float: 14, rotate: 12 },
  { name: 'school-outline', left: '6%', top: '90%', size: 18, delay: 80, float: 12, rotate: -14 },
] as const;

function FloatingIcon({ name, left, top, size, delay, float, rotate }: (typeof TRAVEL_ICONS)[number]) {
  const drift = useRef(new Animated.Value(0)).current;
  const twinkle = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(drift, {
            toValue: 1,
            duration: 4200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.sequence([
            Animated.timing(twinkle, { toValue: 0.75, duration: 2100, useNativeDriver: USE_NATIVE_DRIVER }),
            Animated.timing(twinkle, { toValue: 0.3, duration: 2100, useNativeDriver: USE_NATIVE_DRIVER }),
          ]),
        ]),
        Animated.timing(drift, {
          toValue: 0,
          duration: 4200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [drift, twinkle, delay]);

  const translateY = drift.interpolate({ inputRange: [0, 1], outputRange: [0, -float] });
  const rotateDeg = drift.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${rotate}deg`] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left,
        top,
        opacity: twinkle,
        transform: [{ translateY }, { rotate: rotateDeg }],
      }}>
      <Ionicons name={name as ComponentProps<typeof Ionicons>['name']} size={size} color="rgba(255,255,255,0.32)" />
    </Animated.View>
  );
}

function AbstractShapes() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View
        style={{
          position: 'absolute',
          top: -90,
          left: -70,
          width: 260,
          height: 260,
          borderRadius: 130,
          backgroundColor: 'rgba(59,130,246,0.10)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: '22%',
          right: -110,
          width: 240,
          height: 240,
          borderTopLeftRadius: 120,
          borderTopRightRadius: 60,
          borderBottomLeftRadius: 60,
          borderBottomRightRadius: 120,
          backgroundColor: 'rgba(138,180,255,0.07)',
          transform: [{ rotate: '18deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: -120,
          left: -60,
          width: 280,
          height: 280,
          borderRadius: 140,
          backgroundColor: 'rgba(0,73,183,0.16)',
        }}
      />
    </View>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const logoFade = useRef(new Animated.Value(0)).current;
  const cardFade = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(logoFade, {
      toValue: 1,
      duration: 550,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
    Animated.timing(glowOpacity, {
      toValue: 1,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
    Animated.timing(cardFade, {
      toValue: 1,
      duration: 600,
      delay: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  }, [logoFade, cardFade, glowOpacity]);

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
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={['#020617', '#0A1B3D', '#123262', PRIMARY]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.95, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <AbstractShapes />

      {TRAVEL_ICONS.map((icon, i) => (
        <FloatingIcon key={i} {...icon} />
      ))}

      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: '8%',
          alignSelf: 'center',
          width: 260,
          height: 260,
          borderRadius: 130,
          backgroundColor: 'rgba(255,255,255,0.08)',
          opacity: glowOpacity,
        }}
      />

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 22, paddingBottom: 28 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={{ width: '100%', maxWidth: 420, alignSelf: 'center', flex: 1, justifyContent: 'center' }}>
              <Animated.View
                style={{
                  opacity: logoFade,
                  transform: [{ translateY: logoFade.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }],
                  alignItems: 'center',
                  marginBottom: 30,
                }}>
                <Image
                  source={require('@/assets/images/wizdom_logo.png')}
                  style={{ width: 96, height: 96 }}
                  resizeMode="contain"
                />
              </Animated.View>

              <Animated.View
                style={{
                  opacity: cardFade,
                  transform: [{ translateY: cardFade.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
                  borderRadius: 28,
                  shadowColor: '#000',
                  shadowOpacity: 0.35,
                  shadowRadius: 30,
                  shadowOffset: { width: 0, height: 16 },
                  elevation: 12,
                }}>
                <View
                  style={{
                    borderRadius: 28,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.22)',
                  }}>
                  <BlurView intensity={55} tint="dark" style={StyleSheet.absoluteFill} />
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}>
                    <View style={{ padding: 26 }}>
                      <Text
                        style={{
                          fontSize: 11.5,
                          fontWeight: '700',
                          letterSpacing: 2.4,
                          textTransform: 'uppercase',
                          color: SKY,
                          textAlign: 'center',
                        }}>
                        Study Abroad Portal
                      </Text>
                      <Text
                        style={{
                          marginTop: 8,
                          fontSize: 27,
                          fontWeight: '800',
                          letterSpacing: 0.2,
                          color: '#ffffff',
                          textAlign: 'center',
                        }}>
                        Welcome Back
                      </Text>
                      <Text
                        style={{
                          marginTop: 6,
                          fontSize: 13.5,
                          color: 'rgba(255,255,255,0.7)',
                          textAlign: 'center',
                        }}>
                        Continue your study abroad journey.
                      </Text>

                      <View style={{ marginTop: 26, gap: 14 }}>
                        <FieldRow
                          icon="mail-outline"
                          placeholder="Email"
                          value={email}
                          onChangeText={setEmail}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoComplete="email"
                          textContentType="emailAddress"
                        />

                        <FieldRow
                          icon="lock-closed-outline"
                          placeholder="Password"
                          value={password}
                          onChangeText={setPassword}
                          secureTextEntry={!showPassword}
                          autoCapitalize="none"
                          autoComplete="current-password"
                          textContentType="password"
                          rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                          onRightIconPress={() => setShowPassword((prev) => !prev)}
                        />
                      </View>

                      <LoginButton loading={loading} onPress={handleLogin} />
                    </View>
                  </View>
                </View>
              </Animated.View>

              <View style={{ marginTop: 26, alignItems: 'center' }}>
                <Text style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.75)', textAlign: 'center' }}>
                  Don&apos;t have an account? Please contact your counsellor.
                </Text>
                <CallHelplineButton />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <Toast message={toastMessage} onHide={() => setToastMessage(null)} />
    </View>
  );
}

function CallHelplineButton() {
  const scale = useRef(new Animated.Value(1)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const [contact, setContact] = useState<{ phone: string; name?: string } | null>(null);

  useEffect(() => {
    fetchHelplineContact()
      .then(setContact)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1200, easing: Easing.out(Easing.ease), useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.delay(700),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const confirmAndDial = (target: { phone: string; name?: string }) => {
    Alert.alert(`Call ${target.name ?? 'Super Admin'}?`, target.phone, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Call', onPress: () => Linking.openURL(`tel:${target.phone}`) },
    ]);
  };

  const handlePress = async () => {
    if (contact) {
      confirmAndDial(contact);
      return;
    }
    try {
      confirmAndDial(await fetchHelplineContact());
    } catch {
      Alert.alert('Could not load helpline number', 'Check your connection and try again.');
    }
  };

  const pressIn = () => {
    Animated.spring(scale, { toValue: 0.95, useNativeDriver: USE_NATIVE_DRIVER, speed: 40, bounciness: 6 }).start();
  };
  const pressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: USE_NATIVE_DRIVER, speed: 40, bounciness: 6 }).start();
  };

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      hitSlop={8}
      style={{ marginTop: 14 }}>
      <Animated.View
        style={{
          transform: [{ scale }],
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 22,
          paddingVertical: 12,
          borderRadius: 999,
          backgroundColor: 'rgba(255,255,255,0.16)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.3)',
        }}>
        <View style={{ width: 16, height: 16, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View
            style={{
              position: 'absolute',
              width: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: '#ffffff',
              opacity: ringOpacity,
              transform: [{ scale: ringScale }],
            }}
          />
          <Ionicons name="call" size={16} color="#ffffff" />
        </View>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#ffffff' }}>Call Helpline</Text>
      </Animated.View>
    </Pressable>
  );
}

function LoginButton({ loading, onPress }: { loading: boolean; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: USE_NATIVE_DRIVER, speed: 40, bounciness: 6 }).start();
  };
  const pressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: USE_NATIVE_DRIVER, speed: 40, bounciness: 6 }).start();
  };

  return (
    <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} disabled={loading} style={{ marginTop: 22 }}>
      <Animated.View
        style={{
          transform: [{ scale }],
          borderRadius: 18,
          overflow: 'hidden',
          opacity: loading ? 0.85 : 1,
          shadowColor: '#000',
          shadowOpacity: 0.3,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 10 },
          elevation: 6,
        }}>
        <LinearGradient
          colors={[ACCENT, PRIMARY]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingVertical: 17, alignItems: 'center', justifyContent: 'center', borderRadius: 18 }}>
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={{ fontSize: 16, fontWeight: '700', letterSpacing: 0.3, color: '#ffffff' }}>Login</Text>
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
} & ComponentProps<typeof TextInput>;

function FieldRow({ icon, rightIcon, onRightIconPress, ...inputProps }: FieldRowProps) {
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

  const borderColor = focusAnim.interpolate({ inputRange: [0, 1], outputRange: ['rgba(255,255,255,0.2)', SKY] });
  const backgroundColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.12)'],
  });

  return (
    <Animated.View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        paddingHorizontal: 16,
        borderWidth: 1.5,
        borderColor,
        backgroundColor,
      }}>
      <Ionicons name={icon} size={19} color={focused ? SKY : 'rgba(255,255,255,0.6)'} />
      <TextInput
        {...inputProps}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholderTextColor="rgba(255,255,255,0.45)"
        style={{ marginLeft: 12, flex: 1, paddingVertical: 14, fontSize: 15, color: '#ffffff' }}
      />
      {rightIcon ? (
        <Pressable
          onPress={onRightIconPress}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={rightIcon === 'eye-outline' ? 'Show password' : 'Hide password'}
          testID="toggle-password-visibility">
          <Ionicons name={rightIcon} size={19} color="rgba(255,255,255,0.6)" />
        </Pressable>
      ) : null}
    </Animated.View>
  );
}
