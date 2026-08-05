import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

// Fixed, deterministic layout (not Math.random) — same reasoning used
// elsewhere in the app (splash particles, login travel icons): stable
// across re-renders, identical on web's server/client render.
const ICONS = [
  { name: 'airplane-outline', left: '6%', top: '8%', size: 28, delay: 0, float: 18 },
  { name: 'earth-outline', left: '76%', top: '6%', size: 32, delay: 300, float: 14 },
  { name: 'school-outline', left: '12%', top: '32%', size: 24, delay: 600, float: 16 },
  { name: 'document-text-outline', left: '84%', top: '30%', size: 22, delay: 150, float: 18 },
  { name: 'compass-outline', left: '4%', top: '56%', size: 22, delay: 900, float: 14 },
  { name: 'map-outline', left: '8%', top: '76%', size: 26, delay: 450, float: 16 },
  { name: 'ribbon-outline', left: '80%', top: '58%', size: 22, delay: 1050, float: 12 },
  { name: 'airplane-outline', left: '85%', top: '78%', size: 20, delay: 750, float: 14 },
] as const;

function FloatingIcon({ name, left, top, size, delay, float, color }: (typeof ICONS)[number] & { color: string }) {
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(drift, { toValue: 1, duration: 6500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 6500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [drift, delay]);

  const translateY = drift.interpolate({ inputRange: [0, 1], outputRange: [0, -float] });
  const rotate = drift.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '7deg'] });

  return (
    <Animated.View style={{ position: 'absolute', left, top, transform: [{ translateY }, { rotate }] }}>
      <Ionicons name={name as keyof typeof Ionicons.glyphMap} size={size} color={color} />
    </Animated.View>
  );
}

// A soft, non-interactive backdrop for the chat screen — a layered blue
// wash with a gentle glow behind the header and a fuller (but still
// low-opacity) set of travel/education outline icons drifting slowly.
// Kept subtle enough to never compete with the conversation on top of it.
export function ChatBackground() {
  const { isDark } = useAppTheme();
  const iconColor = isDark ? 'rgba(148,163,184,0.12)' : 'rgba(0,73,183,0.09)';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={isDark ? ['#0a0f1e', '#0d1428', '#0a1220'] : ['#eef4ff', '#f6f9ff', '#eaf1fd']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Soft glow bloom behind the header for a bit of premium depth. */}
      <View
        style={{
          position: 'absolute',
          top: -140,
          alignSelf: 'center',
          width: 340,
          height: 340,
          borderRadius: 170,
          backgroundColor: isDark ? 'rgba(59,130,246,0.14)' : 'rgba(59,130,246,0.12)',
        }}
      />

      {ICONS.map((icon, i) => (
        <FloatingIcon key={i} {...icon} color={iconColor} />
      ))}
    </View>
  );
}
