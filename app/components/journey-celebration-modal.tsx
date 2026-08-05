import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import confettiAnimation from '@/assets/lottie/confetti-burst.json';
import { useAuth } from '@/context/auth-context';
import { useJourney } from '@/context/journey-context';

const PRIMARY = '#0049B7';
const ACCENT = '#3B82F6';
const GOLD = '#f59e0b';

// Fires once per student, the first time every journey stage reaches
// "completed" — a one-time send-off, not a recurring banner. Shared by the
// Dashboard and Progress screens (both render ProgressTimeline), so it's
// self-contained here rather than lifted into either screen.
export function JourneyCelebrationModal() {
  const { user } = useAuth();
  const { journey } = useJourney();
  const [visible, setVisible] = useState(false);

  const bgOpacity = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.85)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;
  const trophyScale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (!user || !journey || journey.length === 0) return;
    const allCompleted = journey.every((stage) => stage.status === 'completed');
    if (!allCompleted) return;

    const storageKey = `wizdom.journeyCelebrationShown.${user.id}`;
    let cancelled = false;

    AsyncStorage.getItem(storageKey).then((shown) => {
      if (cancelled || shown === 'true') return;
      setVisible(true);
      AsyncStorage.setItem(storageKey, 'true').catch(() => {});
    });

    return () => {
      cancelled = true;
    };
  }, [user, journey]);

  useEffect(() => {
    if (!visible) return;

    Animated.sequence([
      Animated.timing(bgOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(cardOpacity, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(cardScale, { toValue: 1, useNativeDriver: true, speed: 8, bounciness: 9 }),
        Animated.timing(glowOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(trophyScale, { toValue: 1, useNativeDriver: true, speed: 6, bounciness: 14 }),
      ]),
    ]).start(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowPulse, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(glowPulse, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ).start();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleClose = () => setVisible(false);

  const firstName = user?.name?.trim().split(/\s+/)[0] || 'there';
  const breathingScale = glowPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(3,10,26,0.72)', opacity: bgOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        {visible ? (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <LottieView source={confettiAnimation} autoPlay loop={false} resizeMode="cover" style={StyleSheet.absoluteFill} />
          </View>
        ) : null}

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Animated.View
            style={{
              opacity: cardOpacity,
              transform: [{ scale: cardScale }],
              width: '100%',
              maxWidth: 360,
              borderRadius: 32,
              overflow: 'hidden',
              shadowColor: '#000',
              shadowOpacity: 0.4,
              shadowRadius: 30,
              shadowOffset: { width: 0, height: 18 },
              elevation: 14,
            }}>
            <LinearGradient
              colors={['#001233', PRIMARY, ACCENT]}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={{ paddingTop: 40, paddingBottom: 28, paddingHorizontal: 26, alignItems: 'center' }}>
              <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                <Animated.View
                  style={{
                    position: 'absolute',
                    width: 120,
                    height: 120,
                    borderRadius: 60,
                    backgroundColor: GOLD,
                    opacity: Animated.multiply(glowOpacity, 0.35),
                    transform: [{ scale: breathingScale }],
                  }}
                />
                <Animated.View
                  style={{
                    transform: [{ scale: trophyScale }],
                    width: 84,
                    height: 84,
                    borderRadius: 42,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(255,255,255,0.14)',
                    borderWidth: 1.5,
                    borderColor: 'rgba(255,255,255,0.3)',
                  }}>
                  <Ionicons name="trophy" size={40} color={GOLD} />
                </Animated.View>
              </View>

              <Text
                style={{
                  fontSize: 11.5,
                  fontWeight: '700',
                  letterSpacing: 2.2,
                  textTransform: 'uppercase',
                  color: '#bfd6ff',
                  marginBottom: 8,
                }}>
                Journey Complete
              </Text>

              <Text
                style={{
                  fontSize: 24,
                  fontWeight: '800',
                  color: '#ffffff',
                  textAlign: 'center',
                  letterSpacing: 0.2,
                }}>
                Congratulations, {firstName}!
              </Text>

              <Text
                style={{
                  marginTop: 10,
                  fontSize: 14,
                  lineHeight: 20,
                  color: 'rgba(255,255,255,0.85)',
                  textAlign: 'center',
                }}>
                You've completed every stage of your study abroad journey. All the best for your journey ahead —
                safe travels, and congratulations on this milestone!
              </Text>

              <Pressable onPress={handleClose} style={{ marginTop: 26, width: '100%' }}>
                <View
                  style={{
                    borderRadius: 18,
                    paddingVertical: 15,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(255,255,255,0.95)',
                  }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: PRIMARY, letterSpacing: 0.3 }}>Continue</Text>
                </View>
              </Pressable>
            </LinearGradient>
          </Animated.View>
        </View>
      </Animated.View>
    </Modal>
  );
}
