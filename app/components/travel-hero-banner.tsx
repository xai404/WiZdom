import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/context/auth-context';

// Fixed, deterministic layout (not Math.random) — same reasoning as the
// splash screen's particle field: stable across re-renders, identical on
// web's server/client render.
const STARS = [
  { left: '8%', top: '14%', size: 2, delay: 0 },
  { left: '22%', top: '8%', size: 2, delay: 260 },
  { left: '38%', top: '18%', size: 2, delay: 480 },
  { left: '58%', top: '10%', size: 2, delay: 140 },
  { left: '72%', top: '20%', size: 2, delay: 600 },
  { left: '88%', top: '12%', size: 2, delay: 320 },
  { left: '15%', top: '28%', size: 2, delay: 420 },
  { left: '48%', top: '26%', size: 2, delay: 200 },
] as const;

const SKYLINE = [
  { widthPct: 8, height: 34, left: '2%' },
  { widthPct: 6, height: 52, left: '11%' },
  { widthPct: 9, height: 40, left: '18%' },
  { widthPct: 5, height: 64, left: '28%' },
  { widthPct: 7, height: 46, left: '34%' },
  { widthPct: 10, height: 58, left: '42%' },
  { widthPct: 6, height: 38, left: '53%' },
  { widthPct: 8, height: 50, left: '60%' },
  { widthPct: 5, height: 66, left: '69%' },
  { widthPct: 9, height: 42, left: '75%' },
  { widthPct: 7, height: 56, left: '85%' },
  { widthPct: 6, height: 36, left: '93%' },
] as const;

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function Star({ left, top, size, delay }: (typeof STARS)[number]) {
  const twinkle = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(twinkle, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(twinkle, { toValue: 0.2, duration: 1400, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [twinkle, delay]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left,
        top,
        width: size,
        height: size,
        borderRadius: size,
        backgroundColor: '#ffffff',
        opacity: twinkle,
      }}
    />
  );
}

interface TravelHeroBannerProps {
  // When set, replaces the "Good Evening, name / Your dream is closer…"
  // greeting with this single line (used by the Progress screen to show a
  // rotating motivational quote instead) and shrinks the banner to fit it.
  quote?: string;
}

// Purely decorative — a "cool" animated travel-themed banner sitting above
// the Dashboard's journey content. No functional icons live here (those
// stay on AppHeader above it) so this never touches notification/profile/
// call behavior.
export function TravelHeroBanner({ quote }: TravelHeroBannerProps) {
  const { user } = useAuth();
  const firstName = user?.name?.trim().split(/\s+/)[0] || 'Explorer';

  const balloonBob = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();

    const balloonLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(balloonBob, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(balloonBob, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    balloonLoop.start();

    return () => {
      balloonLoop.stop();
    };
  }, [fade, balloonBob]);

  const balloonTranslateY = balloonBob.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });

  return (
    <Animated.View
      style={{
        opacity: fade,
        marginHorizontal: 20,
        marginTop: 12,
        borderRadius: 28,
        shadowColor: '#001B47',
        shadowOpacity: 0.22,
        shadowRadius: 22,
        shadowOffset: { width: 0, height: 12 },
        elevation: 8,
      }}>
      <LinearGradient
        colors={['#00132e', '#0049B7', '#3B82F6']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.95, y: 1 }}
        style={{ height: quote ? 96 : 168, paddingHorizontal: 20, paddingTop: 18, borderRadius: 28, overflow: 'hidden' }}>
        {STARS.map((star, i) => (
          <Star key={i} {...star} />
        ))}

        {/* City skyline silhouette anchored to the bottom edge — rendered
            first so the plane/balloon/dashed path fly in front of it, not
            behind it. */}
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          {SKYLINE.map((b, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                bottom: 0,
                left: b.left,
                width: `${b.widthPct}%`,
                height: b.height,
                backgroundColor: 'rgba(10,10,25,0.4)',
                borderTopLeftRadius: 3,
                borderTopRightRadius: 3,
              }}
            />
          ))}
        </View>

        <Animated.View
          pointerEvents="none"
          style={{ position: 'absolute', right: 26, top: 20, transform: [{ translateY: balloonTranslateY }] }}>
          <Ionicons name="balloon-outline" size={26} color="rgba(255,255,255,0.85)" />
        </Animated.View>

        <View style={{ position: 'absolute', left: 20, right: 20, bottom: 18 }}>
          {quote ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="compass" size={16} color="rgba(255,255,255,0.9)" />
              <Text style={{ flex: 1, fontSize: 13.5, fontWeight: '600', color: '#ffffff' }}>{quote}</Text>
            </View>
          ) : (
            <>
              <Text style={{ fontSize: 19, fontWeight: '800', color: '#ffffff' }}>
                {getGreeting()}, {firstName} 👋
              </Text>
              <Text style={{ marginTop: 2, fontSize: 12.5, color: 'rgba(255,255,255,0.85)' }}>
                Your dream is closer than you think.
              </Text>
            </>
          )}
        </View>
      </LinearGradient>
    </Animated.View>
  );
}
