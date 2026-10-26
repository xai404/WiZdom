import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { type ComponentProps, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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
import { requestPasswordResetOtp, verifyPasswordResetOtp } from '@/lib/auth-api';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PRIMARY = '#1d4ed8';
const ACCENT = '#2563eb';
const SKY = '#93c5fd';
const RESEND_COOLDOWN_SECONDS = 30;

type Step = 'email' | 'otp' | 'done';

// Two-step flow: (1) email must match an existing account → server emails a
// 6-digit code; (2) code is verified → server generates a new password,
// emails it, and returns it once so it can be shown here too.
export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const sendOtp = async () => {
    const trimmedEmail = email.trim();
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setToastMessage('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      const message = await requestPasswordResetOtp(trimmedEmail);
      setToastMessage(message);
      setStep('otp');
      setOtp('');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!/^\d{6}$/.test(otp)) {
      setToastMessage('Enter the 6-digit code from your email.');
      return;
    }
    setLoading(true);
    try {
      const password = await verifyPasswordResetOtp(email.trim(), otp);
      setNewPassword(password);
      setStep('done');
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(newPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const goBack = () => {
    if (step === 'otp') {
      setStep('email');
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/login');
  };

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={['#020617', '#0a1d42', '#163063', PRIMARY]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.95, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }}>
        {step !== 'done' && (
          <Pressable
            onPress={goBack}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={{ marginLeft: 16, marginTop: 8, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </Pressable>
        )}

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 22, paddingBottom: 28 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={{ width: '100%', maxWidth: 420, alignSelf: 'center', flex: 1, justifyContent: 'center' }}>
              <View style={styles.card}>
                <View style={styles.iconBadge}>
                  <Ionicons
                    name={step === 'email' ? 'lock-open-outline' : step === 'otp' ? 'mail-unread-outline' : 'checkmark-circle-outline'}
                    size={26}
                    color={SKY}
                  />
                </View>

                {step === 'email' && (
                  <>
                    <Text style={styles.title}>Forgot Password</Text>
                    <Text style={styles.subtitle}>
                      Enter the email linked to your WiZdom account. We&apos;ll send you a verification code.
                    </Text>
                    <View style={{ marginTop: 24 }}>
                      <Field
                        icon="mail-outline"
                        placeholder="Email"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                        textContentType="emailAddress"
                      />
                    </View>
                    <PrimaryButton label="Send Code" loading={loading} onPress={sendOtp} />
                  </>
                )}

                {step === 'otp' && (
                  <>
                    <Text style={styles.title}>Enter Verification Code</Text>
                    <Text style={styles.subtitle}>
                      We sent a 6-digit code to <Text style={{ color: '#ffffff', fontWeight: '700' }}>{email.trim()}</Text>.
                      It expires in 10 minutes.
                    </Text>
                    <View style={{ marginTop: 24 }}>
                      <Field
                        icon="keypad-outline"
                        placeholder="6-digit code"
                        value={otp}
                        onChangeText={(text) => setOtp(text.replace(/\D/g, '').slice(0, 6))}
                        keyboardType="number-pad"
                        autoComplete="one-time-code"
                        textContentType="oneTimeCode"
                        maxLength={6}
                        style={{ letterSpacing: 6, fontSize: 18, fontWeight: '700' }}
                      />
                    </View>
                    <PrimaryButton label="Verify & Reset Password" loading={loading} onPress={verifyOtp} />
                    <Pressable
                      onPress={sendOtp}
                      disabled={cooldown > 0 || loading}
                      hitSlop={8}
                      style={{ marginTop: 16, alignItems: 'center' }}>
                      <Text style={{ fontSize: 13.5, fontWeight: '600', color: cooldown > 0 ? 'rgba(255,255,255,0.45)' : SKY }}>
                        {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                      </Text>
                    </Pressable>
                  </>
                )}

                {step === 'done' && (
                  <>
                    <Text style={styles.title}>Password Reset</Text>
                    <Text style={styles.subtitle}>
                      Your new password has been emailed to you. You can also copy it below.
                    </Text>
                    <View style={styles.passwordBox}>
                      <Text selectable style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: '#ffffff', letterSpacing: 0.5 }}>
                        {newPassword}
                      </Text>
                      <Pressable onPress={handleCopy} hitSlop={8} accessibilityLabel="Copy password">
                        <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={19} color={copied ? '#4ade80' : SKY} />
                      </Pressable>
                    </View>
                    <Text style={{ marginTop: 10, fontSize: 12, color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>
                      {copied ? 'Copied to clipboard!' : 'You can change it later from your Profile.'}
                    </Text>
                    <PrimaryButton label="Back to Login" loading={false} onPress={() => router.replace('/login')} />
                  </>
                )}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <Toast message={toastMessage} onHide={() => setToastMessage(null)} />
    </View>
  );
}

function Field({ icon, style, ...inputProps }: { icon: ComponentProps<typeof Ionicons>['name'] } & ComponentProps<typeof TextInput>) {
  const [focused, setFocused] = useState(false);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        paddingHorizontal: 16,
        borderWidth: 1.5,
        borderColor: focused ? SKY : 'rgba(255,255,255,0.2)',
        backgroundColor: focused ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)',
      }}>
      <Ionicons name={icon} size={19} color={focused ? SKY : 'rgba(255,255,255,0.6)'} />
      <TextInput
        {...inputProps}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholderTextColor="rgba(255,255,255,0.45)"
        style={[{ marginLeft: 12, flex: 1, paddingVertical: 14, fontSize: 15, color: '#ffffff' }, style]}
      />
    </View>
  );
}

function PrimaryButton({ label, loading, onPress }: { label: string; loading: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={loading} style={({ pressed }) => ({ marginTop: 22, opacity: pressed || loading ? 0.85 : 1 })}>
      <LinearGradient
        colors={[ACCENT, PRIMARY]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingVertical: 17, alignItems: 'center', justifyContent: 'center', borderRadius: 18 }}>
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={{ fontSize: 16, fontWeight: '700', letterSpacing: 0.3, color: '#ffffff' }}>{label}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    padding: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  iconBadge: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(134,201,155,0.15)',
    marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: '800', color: '#ffffff', textAlign: 'center' },
  subtitle: { marginTop: 8, fontSize: 14, lineHeight: 20, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },
  passwordBox: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    paddingVertical: 14,
    paddingLeft: 16,
    paddingRight: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
});
