import React, { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { Coffee, Eye, EyeOff, LockKeyhole } from "lucide-react-native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Button,
  C,
  ErrorMessage,
  Field,
  IconButton,
  S,
  errorText,
} from "../components/ui";
import { account, login, setup } from "../services/auth";
import { usePOS } from "../store/usePOS";

const validation = z.object({
  username: z.string().trim().min(1, "Enter your username.").max(40),
  password: z.string().min(1, "Enter your password.").max(128),
  confirm: z.string(),
});
type Values = z.infer<typeof validation>;
export function LoginScreen({
  initialSetup,
  onConfigured,
}: {
  initialSetup: boolean;
  onConfigured: () => void;
}) {
  const [show, setShow] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const submitting = useRef(false);
  const {
    control,
    handleSubmit,
    setError: fieldError,
  } = useForm<Values>({
    resolver: zodResolver(validation),
    defaultValues: { username: "", password: "", confirm: "" },
  });
  const submit = handleSubmit(async (values) => {
    if (submitting.current) return;
    if (initialSetup && values.password !== values.confirm) {
      fieldError("confirm", { message: "The passwords must match." });
      return;
    }
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      if (initialSetup) {
        await setup(values.username, values.password);
        onConfigured();
        usePOS
          .getState()
          .notify("Account created. Sign in with your new credentials.");
      } else {
        const username = await login(values.username, values.password);
        usePOS.getState().setAccount(username);
      }
    } catch (e) {
      if (initialSetup && (await account().catch(() => null))) {
        onConfigured();
        usePOS
          .getState()
          .notify(`Account saved. Sign in to continue. ${errorText(e)}`);
      } else setError(errorText(e));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  });
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: 24,
        }}
      >
        <View
          style={{ width: "100%", maxWidth: 460, alignSelf: "center", gap: 28 }}
        >
          <View style={S.row}>
            <View
              style={{ backgroundColor: C.dark, borderRadius: 16, padding: 14 }}
            >
              <Coffee size={32} color="white" />
            </View>
            <View>
              <Text
                style={{
                  color: C.ink,
                  fontSize: 36,
                  fontWeight: "800",
                  letterSpacing: -1,
                }}
              >
                rositrus
              </Text>
              <Text style={S.muted}>Your counter, in order.</Text>
            </View>
          </View>
          <View style={S.panel}>
            <Text style={S.title}>
              {initialSetup ? "Set up your counter" : "Welcome back"}
            </Text>
            <Text style={S.muted}>
              {initialSetup
                ? "Create the single owner account for this device. Choose a unique passphrase of at least 12 characters."
                : "Sign in to your local workspace. Everything works offline."}
            </Text>
            <ErrorMessage message={error} />
            <Controller
              control={control}
              name="username"
              render={({ field, fieldState }) => (
                <Field
                  label="Username"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={fieldState.error?.message}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="username"
                  maxLength={40}
                  editable={!busy}
                />
              )}
            />
            <View>
              <Controller
                control={control}
                name="password"
                render={({ field, fieldState }) => (
                  <Field
                    label="Password"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={fieldState.error?.message}
                    secureTextEntry={!show}
                    autoComplete={
                      initialSetup ? "new-password" : "current-password"
                    }
                    maxLength={128}
                    editable={!busy}
                    style={{ paddingRight: 56 }}
                  />
                )}
              />
              <View style={{ position: "absolute", right: 4, top: 26 }}>
                <IconButton
                  label={show ? "Hide password" : "Show password"}
                  icon={show ? EyeOff : Eye}
                  onPress={() => setShow(!show)}
                />
              </View>
            </View>
            {initialSetup && (
              <Controller
                control={control}
                name="confirm"
                render={({ field, fieldState }) => (
                  <Field
                    label="Confirm password"
                    value={field.value}
                    onChangeText={field.onChange}
                    error={fieldState.error?.message}
                    secureTextEntry={!show}
                    autoComplete="new-password"
                    maxLength={128}
                    editable={!busy}
                  />
                )}
              />
            )}
            <Button
              label={initialSetup ? "Create device account" : "Sign in"}
              icon={LockKeyhole}
              busy={busy}
              onPress={submit}
            />
          </View>
          <Text style={[S.muted, { textAlign: "center" }]}>
            {Platform.OS === 'web' ? 'Stored in this browser profile only. Clearing site data removes your account and orders. Keep an encrypted backup. Browser and Android accounts are separate.' : 'Stored on this device only. Uninstalling Rositrus or clearing its storage removes your data. Keep a manual encrypted backup.'}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
