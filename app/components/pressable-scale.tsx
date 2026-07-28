import { useRef } from 'react';
import { Animated, Pressable, type GestureResponderEvent, type PressableProps } from 'react-native';

type PressableScaleProps = PressableProps & {
  scaleTo?: number;
  children: React.ReactNode;
};

export function PressableScale({ scaleTo = 0.96, children, onPressIn, onPressOut, ...rest }: PressableScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = (event: GestureResponderEvent) => {
    Animated.spring(scale, { toValue: scaleTo, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
    onPressIn?.(event);
  };
  const handlePressOut = (event: GestureResponderEvent) => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
    onPressOut?.(event);
  };

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} {...rest}>
      <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>
    </Pressable>
  );
}
