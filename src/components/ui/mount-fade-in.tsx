import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, StyleProp, ViewStyle } from 'react-native';

type MountFadeInProps = {
  children: ReactNode;
  distance?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
};

export function MountFadeIn({ children, distance = 8, duration = 240, style }: MountFadeInProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(distance)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY, duration]);

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
}
