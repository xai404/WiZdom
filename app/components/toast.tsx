import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';

type ToastProps = {
  message: string | null;
  onHide: () => void;
  duration?: number;
  tone?: 'error' | 'success';
};

export function Toast({ message, onHide, duration = 3200, tone = 'error' }: ToastProps) {
  const translateY = useRef(new Animated.Value(24)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!message) return;

    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 260, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 260, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 24, duration: 200, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(onHide);
    }, duration);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  if (!message) return null;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: 20,
        right: 20,
        bottom: 28,
        opacity,
        transform: [{ translateY }],
        pointerEvents: 'none',
      }}>
      <View
        className="flex-row items-center gap-3 rounded-[20px] px-5 py-4"
        style={{
          backgroundColor: '#0f172a',
          borderWidth: 1,
          borderColor: 'rgba(148,163,184,0.18)',
          shadowColor: '#000',
          shadowOpacity: 0.3,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 12 },
          elevation: 10,
        }}>
        <Ionicons
          name={tone === 'success' ? 'checkmark-circle' : 'alert-circle'}
          size={20}
          color={tone === 'success' ? '#4ade80' : '#f87171'}
        />
        <Text className="flex-1 text-sm font-medium text-white">{message}</Text>
      </View>
    </Animated.View>
  );
}
