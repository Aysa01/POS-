import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

let knownPreference = false;

export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => Platform.OS === 'web' && typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : knownPreference);
  useEffect(() => {
    let mounted = true;
    const update = (value: boolean) => { knownPreference = value; if (mounted) setReduced(value); };
    void AccessibilityInfo.isReduceMotionEnabled().then(update);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', update);
    return () => { mounted = false; subscription.remove(); };
  }, []);
  return reduced;
}
