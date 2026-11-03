import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import { Alert } from '../utils/dialogs';
import { X, Search, AlertCircle, type LucideIcon } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePOS } from '../store/usePOS';
import { useReducedMotion } from '../utils/useReducedMotion';

export const C = {
  bg: "#F7F9FA",
  surface: "#FFFFFF",
  ink: "#1C2B39",
  muted: "#687580",
  accent: "#1C2B39",
  pale: "#F0F3F5",
  line: "#E3E7EA",
  danger: "#A12D36",
  warning: "#86530D",
  dark: "#1C2B39",
};
export const S = StyleSheet.create({
  page: { padding: 24, gap: 24, paddingBottom: 48 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  panel: { backgroundColor: C.surface, borderRadius: 10, padding: 20, gap: 16, borderWidth: 1, borderColor: C.line },
  title: { color: C.ink, fontSize: 28, fontWeight: "700", letterSpacing: -0.6 },
  h2: { color: C.ink, fontSize: 20, fontWeight: "700" },
  text: { color: C.ink, fontSize: 16, lineHeight: 23 },
  muted: { color: C.muted, fontSize: 14, lineHeight: 21 },
  amount: {
    color: C.ink,
    fontSize: 28,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  line: { height: 1, backgroundColor: C.line },
  flex: { flex: 1, minWidth: 0 },
});
export function Heading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <View
      style={[
        S.wrap,
        { alignItems: "center", justifyContent: "space-between" },
      ]}
    >
      <View style={{ flexShrink: 1, gap: 6 }}>
        <Text accessibilityRole="header" style={S.title}>
          {title}
        </Text>
        <Text style={S.muted}>{subtitle}</Text>
      </View>
      {action}
    </View>
  );
}
export function Button({
  label,
  onPress,
  icon: Icon,
  tone = "primary",
  disabled,
  busy,
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: LucideIcon;
  tone?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const color =
    tone === "primary" ? "#FFFFFF" : tone === "danger" ? C.danger : C.accent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 46,
          paddingHorizontal: 16,
          paddingVertical: 11,
          borderRadius: 10,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          backgroundColor:
            tone === "primary"
              ? C.accent
              : tone === "secondary"
                ? C.pale
                : "transparent",
          opacity: disabled || busy ? 0.5 : pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={color} />
      ) : Icon ? (
        <Icon size={18} color={color} strokeWidth={1.8} />
      ) : null}
      <Text style={{ color, fontSize: 14, fontWeight: "700", flexShrink: 1 }}>
        {busy ? `${label}…` : label}
      </Text>
    </Pressable>
  );
}
export function IconButton({
  label,
  icon: Icon,
  onPress,
  disabled,
}: {
  label: string;
  icon: LucideIcon;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: pressed ? C.line : C.pale,
        opacity: disabled ? 0.4 : 1,
      })}
    >
      <Icon color={C.ink} size={19} strokeWidth={1.8} />
    </Pressable>
  );
}
export function Field({
  label,
  error,
  style,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6, flexShrink: 1 }}>
      <Text style={{ color: C.ink, fontSize: 14, fontWeight: "600" }}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={C.muted}
        {...props}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        style={[
          {
            minHeight: 48,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: error ? C.danger : focused ? C.accent : C.line,
            backgroundColor: "#FAFCFA",
            color: C.ink,
            padding: 12,
            fontSize: 16,
            textAlignVertical: props.multiline ? "top" : "center",
          },
          style,
        ]}
      />
      {error && (
        <Text
          accessibilityRole="alert"
          style={{ color: C.danger, fontSize: 13 }}
        >
          {error}
        </Text>
      )}
    </View>
  );
}
export function Empty({
  icon: Icon = Search,
  title,
  detail,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  detail: string;
  action?: React.ReactNode;
}) {
  return (
    <View
      style={{
        alignItems: "center",
        paddingVertical: 36,
        paddingHorizontal: 16,
        gap: 12,
      }}
    >
      <View style={{ backgroundColor: C.pale, padding: 18, borderRadius: 40 }}>
        <Icon size={28} color={C.accent} strokeWidth={1.5} />
      </View>
      <Text style={[S.h2, { textAlign: "center" }]}>{title}</Text>
      <Text style={[S.muted, { textAlign: "center", maxWidth: 340 }]}>
        {detail}
      </Text>
      {action}
    </View>
  );
}
export function Sheet({
  title,
  visible,
  onClose,
  children,
}: {
  title: string;
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  return (
    <Modal
      visible={visible}
      animationType={reduced ? 'none' : 'fade'}
      transparent
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "#0E2A2399",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{
            maxHeight: "95%",
            width: "100%",
            maxWidth: 640,
            alignSelf: "center",
            backgroundColor: C.surface,
            borderRadius: 20,
          }}
        >
          <View
            style={[S.row, { padding: 20, justifyContent: "space-between" }]}
          >
            <Text style={[S.h2, S.flex]}>{title}</Text>
            <IconButton label="Close dialog" icon={X} onPress={onClose} />
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 20, paddingTop: 0, gap: 16 }}
          >
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
export function ErrorMessage({ message }: { message: string }) {
  return message ? (
    <View
      accessibilityRole="alert"
      style={[
        S.row,
        { backgroundColor: "#FCECEE", padding: 12, borderRadius: 10 },
      ]}
    >
      <AlertCircle size={20} color={C.danger} />
      <Text style={{ color: C.danger, fontSize: 14, flex: 1 }}>{message}</Text>
    </View>
  ) : null;
}
export const errorText = (error: unknown) =>
  error instanceof Error
    ? error.name === "ZodError"
      ? "This backup contains invalid or unsupported data. Choose a valid Rositrus backup file."
      : /SQLITE_FULL|disk.*full/i.test(error.message)
      ? "Device storage is full. Free some space and retry. Your existing data is retained."
      : error.message
    : "The action could not finish. Please try again.";
export const showError = (error: unknown) =>
  usePOS.getState().notify({ title: 'Action could not finish', message: errorText(error), tone: 'error' });
