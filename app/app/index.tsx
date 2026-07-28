import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';

const SPLASH_DURATION_MS = 2600;

// Fixed, deterministic layout (not Math.random) so server-rendered and
// client-hydrated markup match exactly on web — a real hydration bug bit
// us before when this kind of thing used random values.
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
            duration: 3200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(twinkle, { toValue: 1, duration: 1600, useNativeDriver: true }),
            Animated.timing(twinkle, { toValue: 0.15, duration: 1600, useNativeDriver: true }),
          ]),
        ]),
        Animated.timing(drift, {
          toValue: 0,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
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
          Animated.timing(dot, { toValue: 1, duration: 380, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 380, useNativeDriver: true }),
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
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: '#ffffff',
            opacity: dot,
          }}
        />
      ))}
    </View>
  );
}

export default function SplashScreen() {
  const router = useRouter();

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoTranslateY = useRef(new Animated.Value(28)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(0.6)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(10)).current;
  const loaderOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(glowScale, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 650,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 8,
          bounciness: 6,
        }),
        Animated.timing(logoTranslateY, {
          toValue: 0,
          duration: 700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(loaderOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      router.replace('/login');
    }, SPLASH_DURATION_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={['#00132e', '#001f4d', '#0049B7']}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {PARTICLES.map((particle, i) => (
        <Particle key={i} {...particle} />
      ))}

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View
            style={{
              position: 'absolute',
              width: 220,
              height: 220,
              borderRadius: 110,
              backgroundColor: '#3B82F6',
              opacity: Animated.multiply(glowOpacity, 0.35),
              transform: [{ scale: glowScale }],
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
              style={{ width: 108, height: 108 }}
              resizeMode="contain"
            />
          </Animated.View>
        </View>

        <Animated.Text
          style={{
            marginTop: 22,
            opacity: textOpacity,
            transform: [{ translateY: textTranslateY }],
            fontSize: 28,
            fontWeight: '700',
            letterSpacing: 1.5,
            color: '#ffffff',
          }}>
          WiZdom
        </Animated.Text>

        <Animated.View style={{ marginTop: 36, opacity: loaderOpacity }}>
          <LoadingDots />
        </Animated.View>
      </View>
    </View>
  );
}
