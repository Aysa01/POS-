import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { CheckCircle2, AlertCircle, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePOS } from '../store/usePOS';
import { useDialogs, type Dialog } from '../utils/dialogController';
import { useReducedMotion } from '../utils/useReducedMotion';
import { Button, C, S, Sheet } from './ui';

export function ConfirmationHost() {
  const dialog = useDialogs(state => state.queue[0]);
  // Mount a fresh modal above whichever screen/editor requested confirmation.
  return dialog ? <ActiveConfirmation key={dialog.id} dialog={dialog} /> : null;
}

function ActiveConfirmation({ dialog }: { dialog: Dialog }) {
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(true);
  const closing = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const select = (index: number) => {
    if (closing.current) return;
    closing.current = true;
    setVisible(false);
    timer.current = setTimeout(() => {
      useDialogs.getState().close(dialog.id);
      dialog.buttons[index]?.onPress?.();
    }, reduced ? 0 : 300);
  };
  return <Sheet title={dialog.title} visible={visible} onClose={() => {
    const cancel = dialog.buttons.findIndex(button => button.style === 'cancel');
    // A close action must release any pending payment guard, just like Cancel.
    if (cancel >= 0) select(cancel);
    else if (dialog.buttons.length === 1) select(0);
  }}>
    <Text style={S.text}>{dialog.message}</Text>
    <View style={[S.wrap, { justifyContent: 'flex-end' }]}>
      {dialog.buttons.map((button, index) => <Button key={index} label={button.text ?? 'OK'} tone={button.style === 'cancel' ? 'secondary' : button.style === 'destructive' ? 'danger' : 'primary'} onPress={() => select(index)} />)}
    </View>
  </Sheet>;
}

export function Toast() {
  const notice = usePOS(state => state.toast);
  const reduced = useReducedMotion();
  const { width } = useWindowDimensions();
  const { bottom } = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!notice) return;
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: reduced ? 0 : 180, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(progress, { toValue: 0, duration: reduced ? 0 : 180, useNativeDriver: true }).start(({ finished }) => {
        if (finished && usePOS.getState().toast?.id === notice.id) usePOS.getState().notify('');
      });
    }, 4200);
    return () => { clearTimeout(timer); progress.stopAnimation(); };
  }, [notice?.id, reduced, progress]);
  if (!notice) return null;
  const error = notice.tone === 'error';
  const Icon = error ? AlertCircle : CheckCircle2;
  return <Animated.View pointerEvents="box-none" style={{ position: 'absolute', right: 16, bottom: bottom + 16, width: Math.min(380, width - 32), zIndex: 1000, elevation: 20, opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [reduced ? 0 : 18, 0] }) }] }}>
    <View pointerEvents="box-none" accessibilityRole={error ? 'alert' : undefined} accessibilityLiveRegion="polite" style={{ backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.line, padding: 16, flexDirection: 'row', gap: 12, boxShadow: '0px 6px 24px #1C2B3920' }}>
      <View pointerEvents="none"><Icon size={24} color={error ? C.danger : '#21845F'} /></View>
      <View pointerEvents="none" style={{ flex: 1, gap: 5 }}><Text style={{ color: C.ink, fontWeight: '700', fontSize: 14 }}>{notice.title}</Text>{!!notice.message && <Text style={{ color: C.muted, fontSize: 13, lineHeight: 20 }}>{notice.message}</Text>}</View>
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss notification" onPress={() => usePOS.getState().notify('')} style={{ width: 44, height: 44, margin: -8, alignItems: 'center', justifyContent: 'center' }}><X size={17} color={C.muted} /></Pressable>
    </View>
  </Animated.View>;
}
