import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';

type ToastProps = {
  message: string | null;
  onHide: () => void;
  duration?: number;
};

export function Toast({ message, onHide, duration = 3200 }: ToastProps) {
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
        className="flex-row items-center gap-3 rounded-2xl bg-slate-900 px-5 py-4"
        style={{
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
        }}>
        <Ionicons name="alert-circle" size={20} color="#f87171" />
        <Text className="flex-1 text-sm font-medium text-white">{message}</Text>
      </View>
    </Animated.View>
  );
}
