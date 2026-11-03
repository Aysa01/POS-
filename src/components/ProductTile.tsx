import React, { useEffect, useRef } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from '../utils/useReducedMotion';

export function ProductTile({ children, style, selected, testID }: { children: React.ReactNode; style: StyleProp<ViewStyle>; selected: boolean; testID: string }) {
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const animate = (toValue: number) => Animated.timing(scale, { toValue: reduced ? 1 : toValue, duration: 140, useNativeDriver: true }).start();
  useEffect(() => {
    if (!selected || reduced) return;
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.012, duration: 100, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 140, useNativeDriver: true }),
    ]).start();
    return () => scale.stopAnimation();
  }, [selected, reduced, scale]);
  return <Animated.View testID={testID} onPointerEnter={() => animate(1.012)} onPointerLeave={() => animate(1)} style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>;
}
