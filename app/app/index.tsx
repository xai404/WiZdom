import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, StyleSheet, View } from 'react-native';

import sparkleAnimation from '@/assets/lottie/sparkle-glow.json';
import { useAuth } from '@/context/auth-context';

const SPLASH_DURATION_MS = 3000;
// Web has no native animated driver (RN Web falls back to JS animation and
// logs a warning if this is left `true`); native platforms keep the
// perf benefit.
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

// Fixed, deterministic layout (not Math.random) so the particle field is
// stable across re-renders and identical on server-rendered vs
// client-hydrated markup on web.
const PARTICLES = [
  { left: '12%', top: '18%', size: 3, delay: 0, float: 22 },
  { left: '82%', top: '14%', size: 2, delay: 180, float: 16 },
  { left: '22%', top: '78%', size: 2, delay: 340, float: 18 },
  { left: '76%', top: '72%', size: 3, delay: 120, float: 24 },
  { left: '50%', top: '10%', size: 2, delay: 460, float: 14 },
  { left: '90%', top: '46%', size: 2, delay: 260, float: 20 },
  { left: '8%', top: '48%', size: 3, delay: 560, float: 18 },
  { left: '64%', top: '86%', size: 2, delay: 80, float: 16 },
  { left: '35%', top: '30%', size: 2, delay: 620, float: 20 },
  { left: '58%', top: '58%', size: 2, delay: 380, float: 14 },
  { left: '18%', top: '62%', size: 2, delay: 500, float: 18 },
  { left: '70%', top: '28%', size: 2, delay: 220, float: 16 },
] as const;

function Particle({ left, top, size, delay, float }: (typeof PARTICLES)[number]) {
  const drift = useRef(new Animated.Value(0)).current;
  const twinkle = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(drift, {
            toValue: 1,
            duration: 3400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.sequence([
            Animated.timing(twinkle, { toValue: 1, duration: 1700, useNativeDriver: USE_NATIVE_DRIVER }),
            Animated.timing(twinkle, { toValue: 0.15, duration: 1700, useNativeDriver: USE_NATIVE_DRIVER }),
          ]),
        ]),
        Animated.timing(drift, {
          toValue: 0,
          duration: 3400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [drift, twinkle, delay]);

  const translateY = drift.interpolate({ inputRange: [0, 1], outputRange: [0, -float] });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left,
        top,
        width: size,
        height: size,
        borderRadius: size,
        backgroundColor: '#bfd6ff',
        opacity: twinkle,
        transform: [{ translateY }],
      }}
    />
  );
}

function LoadingDots() {
  const dots = [useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current];

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(dot, { toValue: 1, duration: 380, useNativeDriver: USE_NATIVE_DRIVER }),
          Animated.timing(dot, { toValue: 0.3, duration: 380, useNativeDriver: USE_NATIVE_DRIVER }),
          Animated.delay((2 - i) * 160),
        ])
      )
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#ffffff', opacity: dot }}
        />
      ))}
    </View>
  );
}

export default function SplashScreen() {
  const router = useRouter();
  const { user, token, isLoading: authLoading } = useAuth();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  const bgOpacity = useRef(new Animated.Value(0)).current;
  const kickerOpacity = useRef(new Animated.Value(0)).current;
  const kickerTranslateY = useRef(new Animated.Value(10)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const logoTranslateY = useRef(new Animated.Value(24)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.85)).current;
  const loaderOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // Darkness, then a soft blue light slowly rises.
      Animated.timing(bgOpacity, { toValue: 1, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: USE_NATIVE_DRIVER }),
      // "Powered by" leads the sequence, as a small classy caption.
      Animated.parallel([
        Animated.timing(kickerOpacity, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(kickerTranslateY, { toValue: 0, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: USE_NATIVE_DRIVER }),
      ]),
      // The WiZdomEd logo makes its cinematic entrance: glow blooms first,
      // then the mark fades in, scales up with a gentle overshoot, and
      // settles upward into place.
      Animated.parallel([
        Animated.timing(glowOpacity, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(glowScale, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(ringOpacity, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.spring(ringScale, { toValue: 1, useNativeDriver: USE_NATIVE_DRIVER, speed: 6, bounciness: 8 }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 750, easing: Easing.out(Easing.cubic), useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.spring(logoScale, { toValue: 1, useNativeDriver: USE_NATIVE_DRIVER, speed: 6, bounciness: 7 }),
        Animated.timing(logoTranslateY, { toValue: 0, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: USE_NATIVE_DRIVER }),
      ]),
      Animated.timing(loaderOpacity, { toValue: 1, duration: 350, useNativeDriver: USE_NATIVE_DRIVER }),
    ]).start();

    const timer = setTimeout(() => setMinTimeElapsed(true), SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Navigate only once the splash animation has had its full run *and* the
  // persisted session has finished loading from SecureStore — a restored
  // session skips straight to the dashboard instead of forcing a fresh
  // login every time the app opens.
  useEffect(() => {
    if (!minTimeElapsed || authLoading) return;
    router.replace(user && token ? '/dashboard' : '/login');
  }, [minTimeElapsed, authLoading, user, token, router]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: bgOpacity, backgroundColor: '#00050f' }]}>
      <LinearGradient
        colors={['#00050f', '#00132e', '#001f4d', '#0049B7']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {PARTICLES.map((particle, i) => (
        <Particle key={i} {...particle} />
      ))}

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.Text
          style={{
            opacity: kickerOpacity,
            transform: [{ translateY: kickerTranslateY }],
            fontSize: 12.5,
            fontWeight: '600',
            letterSpacing: 4,
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.6)',
          }}>
          Powered by
        </Animated.Text>

        <View style={{ marginTop: 22, alignItems: 'center', justifyContent: 'center' }}>
          {/* Outer glow halo — the intro's fade/scale reveal stays on this
              Animated.View; the continuous "breathing" idle loop itself is
              now a Lottie animation instead of a hand-tweened value. */}
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: 260,
              height: 260,
              opacity: glowOpacity,
              transform: [{ scale: glowScale }],
            }}>
            <LottieView source={sparkleAnimation} autoPlay loop style={{ width: 260, height: 260 }} />
          </Animated.View>
          {/* Thin defining ring around the mark */}
          <Animated.View
            style={{
              position: 'absolute',
              width: 210,
              height: 210,
              borderRadius: 105,
              borderWidth: 1.5,
              borderColor: 'rgba(255,255,255,0.35)',
              opacity: ringOpacity,
              transform: [{ scale: ringScale }],
            }}
          />

          <Animated.View
            style={{
              opacity: logoOpacity,
              transform: [{ scale: logoScale }, { translateY: logoTranslateY }],
              alignItems: 'center',
            }}>
            <Image
              source={require('@/assets/images/wizdom_logo.png')}
              style={{ width: 184, height: 184 }}
              resizeMode="contain"
            />
          </Animated.View>
        </View>

        <Animated.View style={{ marginTop: 40, opacity: loaderOpacity }}>
          <LoadingDots />
        </Animated.View>
      </View>
    </Animated.View>
  );
}
