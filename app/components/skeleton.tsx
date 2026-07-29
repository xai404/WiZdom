import { useEffect, useRef } from 'react';
import { Animated, Easing, View, type ViewStyle } from 'react-native';

type SkeletonBlockProps = {
  height?: number;
  width?: number | `${number}%`;
  borderRadius?: number;
  style?: ViewStyle;
};

export function SkeletonBlock({ height = 16, width = '100%', borderRadius = 8, style }: SkeletonBlockProps) {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      className="bg-slate-200 dark:bg-slate-700"
      style={[{ height, width, borderRadius, opacity: pulse }, style]}
    />
  );
}

export function JourneyCardSkeleton() {
  return (
    <View className="mb-3 rounded-3xl bg-card px-4 py-4 dark:bg-card-dark">
      <View className="flex-row items-center justify-between">
        <SkeletonBlock height={14} width="50%" />
        <SkeletonBlock height={20} width={80} borderRadius={999} />
      </View>
      <View style={{ marginTop: 12 }}>
        <SkeletonBlock height={11} width={60} />
        <View style={{ marginTop: 6 }}>
          <SkeletonBlock height={13} width="85%" />
        </View>
      </View>
      <View style={{ marginTop: 12 }}>
        <SkeletonBlock height={11} width={90} />
      </View>
    </View>
  );
}

export function ChatBubbleSkeleton({ align = 'left' }: { align?: 'left' | 'right' }) {
  return (
    <View className={`mb-3 flex-row ${align === 'left' ? 'justify-start' : 'justify-end'}`}>
      <SkeletonBlock height={44} width="60%" borderRadius={18} />
    </View>
  );
}
