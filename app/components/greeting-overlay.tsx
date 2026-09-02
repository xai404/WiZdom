import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text } from 'react-native';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';
const PRIMARY = '#0049B7';
const ACCENT = '#3B82F6';
const GOLD = '#f59e0b';
const VISIBLE_DURATION = 2400;

// Deterministic burst field (not Math.random) — same reasoning as
// TravelHeroBanner's stars: stable across re-renders and identical between
// web's server/client render. Twelve sparks fan out evenly from the icon.
const SPARKS = [
  { angle: -90, dist: 96, size: 9, color: GOLD, delay: 0 },
  { angle: -60, dist: 72, size: 6, color: '#ffffff', delay: 40 },
  { angle: -30, dist: 104, size: 8, color: '#8bb4fd', delay: 90 },
  { angle: 0, dist: 80, size: 6, color: GOLD, delay: 30 },
  { angle: 30, dist: 100, size: 9, color: '#ffffff', delay: 70 },
  { angle: 60, dist: 70, size: 6, color: '#8bb4fd', delay: 20 },
  { angle: 90, dist: 92, size: 8, color: GOLD, delay: 60 },
  { angle: 120, dist: 74, size: 6, color: '#ffffff', delay: 100 },
  { angle: 150, dist: 102, size: 9, color: '#8bb4fd', delay: 45 },
  { angle: 180, dist: 78, size: 6, color: GOLD, delay: 15 },
  { angle: 210, dist: 98, size: 8, color: '#ffffff', delay: 85 },
  { angle: 240, dist: 72, size: 6, color: '#8bb4fd', delay: 55 },
] as const;

type GreetingOverlayProps = {
  name?: string;
  visible: boolean;
  onDone: () => void;
};

// Time-of-day greeting shown on the splash. Kept in sync with
// TravelHeroBanner's getGreeting() buckets so the popup and the banner
// underneath never contradict each other.
function greetingFor(date: Date) {
  const h = date.getHours();
  if (h >= 5 && h < 12) {
    return { line: 'Good Morning', emoji: '☀️', sub: 'A fresh day for your journey ahead.', halo: 'rgba(245,158,11,0.5)' };
  }
  if (h >= 12 && h < 17) {
    return { line: 'Good Afternoon', emoji: '🌤️', sub: "Hope your day's going well.", halo: 'rgba(245,158,11,0.45)' };
  }
  if (h >= 17 && h < 21) {
    return { line: 'Good Evening', emoji: '🌆', sub: "Winding down — let's check your progress.", halo: 'rgba(249,115,22,0.5)' };
  }
  return { line: 'Good Night', emoji: '🌙', sub: "Late one tonight? We're right here with you.", halo: 'rgba(139,180,253,0.5)' };
}

function Spark({ angle, dist, size, color, delay, burst }: (typeof SPARKS)[number] & { burst: Animated.Value }) {
  const rad = (angle * Math.PI) / 180;
  const tx = Math.cos(rad) * dist;
  const ty = Math.sin(rad) * dist;

  const progress = burst.interpolate({
    inputRange: [0, Math.max(0.001, delay / 400), 1],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size,
        backgroundColor: color,
        opacity: progress.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 1, 0] }),
        transform: [
          { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, tx] }) },
          { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, ty] }) },
          { scale: progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.2, 1, 0.3] }) },
        ],
      }}
    />
  );
}

// One-shot welcome splash shown right after a fresh login (dashboard.tsx only
// renders it when it lands via login.tsx's `justLoggedIn` param) — never on
// a restored session, and it self-dismisses so it never lingers. Shows a
// time-of-day greeting ("Good Morning, {name}") using the same hour buckets
// as TravelHeroBanner's getGreeting() so the splash and the banner it fades
// into always agree.
export function GreetingOverlay({ name, visible, onDone }: GreetingOverlayProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.86)).current;
  const waveScale = useRef(new Animated.Value(0)).current;
  const waveRot = useRef(new Animated.Value(0)).current;
  const textShift = useRef(new Animated.Value(12)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    opacity.setValue(0);
    scale.setValue(0.86);
    waveScale.setValue(0);
    waveRot.setValue(0);
    textShift.setValue(12);
    burst.setValue(0);
    glow.setValue(0);

    if (USE_NATIVE_DRIVER) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(glow, { toValue: 0, duration: 0, useNativeDriver: USE_NATIVE_DRIVER }),
      ])
    );
    glowLoop.start();

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: USE_NATIVE_DRIVER, speed: 13, bounciness: 9 }),
      Animated.sequence([
        Animated.delay(140),
        Animated.parallel([
          Animated.spring(waveScale, { toValue: 1, useNativeDriver: USE_NATIVE_DRIVER, speed: 11, bounciness: 18 }),
          Animated.sequence([
            Animated.timing(waveRot, { toValue: 1, duration: 180, useNativeDriver: USE_NATIVE_DRIVER }),
            Animated.timing(waveRot, { toValue: -1, duration: 200, useNativeDriver: USE_NATIVE_DRIVER }),
            Animated.timing(waveRot, { toValue: 0.5, duration: 160, useNativeDriver: USE_NATIVE_DRIVER }),
            Animated.timing(waveRot, { toValue: 0, duration: 140, useNativeDriver: USE_NATIVE_DRIVER }),
          ]),
          Animated.timing(burst, { toValue: 1, duration: 1200, easing: Easing.out(Easing.cubic), useNativeDriver: USE_NATIVE_DRIVER }),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(220),
        Animated.timing(textShift, { toValue: 0, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: USE_NATIVE_DRIVER }),
      ]),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: USE_NATIVE_DRIVER }).start(() => {
        glowLoop.stop();
        onDone();
      });
    }, VISIBLE_DURATION);

    return () => {
      clearTimeout(timer);
      glowLoop.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!visible) return null;

  const firstName = name?.trim().split(/\s+/)[0] || 'there';
  const greeting = greetingFor(new Date());
  const rotate = waveRot.interpolate({ inputRange: [-1, 1], outputRange: ['-18deg', '18deg'] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFillObject, { zIndex: 100, alignItems: 'center', justifyContent: 'center', opacity }]}>
      <BlurView
        intensity={Platform.OS === 'android' ? 60 : 32}
        tint="dark"
        style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,12,32,0.55)' }]}
      />

      <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
        <LinearGradient
          colors={['#001a44', PRIMARY, ACCENT]}
          start={{ x: 0.05, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            alignItems: 'center',
            paddingVertical: 34,
            paddingHorizontal: 46,
            borderRadius: 32,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: 'rgba(255,255,255,0.28)',
            shadowColor: PRIMARY,
            shadowOpacity: 0.5,
            shadowRadius: 30,
            shadowOffset: { width: 0, height: 16 },
            elevation: 16,
          }}>
          {/* Pulsing halo behind the wave */}
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 30,
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: greeting.halo,
              opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
              transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.6, 2.2] }) }],
            }}
          />

          {SPARKS.map((s, i) => (
            <Spark key={i} {...s} burst={burst} />
          ))}

          <Animated.Text
            style={{ fontSize: 44, marginBottom: 14, transform: [{ scale: waveScale }, { rotate }] }}>
            {greeting.emoji}
          </Animated.Text>

          <Animated.View style={{ alignItems: 'center', opacity: textShift.interpolate({ inputRange: [0, 12], outputRange: [1, 0] }), transform: [{ translateY: textShift }] }}>
            <Text style={{ fontSize: 23, fontWeight: '800', color: '#ffffff', textAlign: 'center', letterSpacing: 0.2 }}>
              {greeting.line}, {firstName}!
            </Text>
            <Text style={{ marginTop: 7, fontSize: 13.5, color: 'rgba(255,255,255,0.85)', textAlign: 'center' }}>
              {greeting.sub}
            </Text>
          </Animated.View>
        </LinearGradient>
      </Animated.View>
    </Animated.View>
  );
}
