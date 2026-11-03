import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Alert } from './src/utils/dialogs';
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  NavigationContainer,
  createNavigationContainerRef,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Coffee,
  History,
  LogOut,
  Menu as MenuIcon,
  RefreshCw,
  Settings2,
  ShieldCheck,
  X,
} from "lucide-react-native";
import {
  Button,
  C,
  ErrorMessage,
  IconButton,
  S,
  errorText,
  showError,
} from "./src/components/ui";
import { Toast, ConfirmationHost } from "./src/components/Feedback";
import { Settings } from "./src/components/Settings";
import { initialize, logEvent } from "./src/database/db";

import { usePOS } from "./src/store/usePOS";
import { WelcomeScreen } from "./src/screens/WelcomeScreen";

import { MenuScreen } from "./src/screens/MenuScreen";
import { OrdersScreen } from "./src/screens/OrdersScreen";
import { HistoryScreen } from "./src/screens/HistoryScreen";
import { AuditScreen } from "./src/screens/AuditScreen";
import { AnalyticsScreen } from "./src/screens/AnalyticsScreen";
import type { Routes } from "./src/navigation/types";

const Stack = createNativeStackNavigator<Routes>();
const navigation = createNavigationContainerRef<Routes>();
const routes = [
  { name: "Menu", icon: Coffee },
  { name: "Orders", icon: ClipboardList },
  { name: "Order History", icon: History },
  { name: "Audit Logs", icon: ShieldCheck },
  { name: "Analytics", icon: BarChart3 },
] as const;
function Workspace() {
  const { width } = useWindowDimensions(),
    phone = width < 720;
  const [expanded, setExpanded] = useState(width >= 1000),
    [drawer, setDrawer] = useState(false),
    [active, setActive] = useState<keyof Routes>("Menu"),
    [settings, setSettings] = useState(false),
    [refreshing, setRefreshing] = useState(false),
    [loadError, setLoadError] = useState(""),
    [reducedMotion, setReducedMotion] = useState(false);
  const username = usePOS((s) => s.account);
  const sidebarWidth = useRef(new Animated.Value(expanded ? 196 : 80)).current;
  const drawerProgress = useRef(new Animated.Value(0)).current;
  const refresh = async () => {
    setRefreshing(true);
    setLoadError("");
    try {
      await usePOS.getState().refresh();
    } catch (e) {
      setLoadError(errorText(e));
    } finally {
      setRefreshing(false);
    }
  };
  useEffect(() => {
    void refresh();
    void AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReducedMotion,
    );
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    Animated.timing(sidebarWidth, {
      toValue: expanded ? 196 : 80,
      duration: reducedMotion ? 0 : 200,
      useNativeDriver: false,
    }).start();
  }, [expanded, reducedMotion, sidebarWidth]);
  useEffect(() => {
    Animated.timing(drawerProgress, {
      toValue: drawer ? 1 : 0,
      duration: reducedMotion ? 0 : 220,
      useNativeDriver: true,
    }).start();
  }, [drawer, reducedMotion, drawerProgress]);
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (drawer) {
        setDrawer(false);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [drawer]);
  const signOut = async () => {
    try {
      await logEvent(username!, "Counter closed");
    } catch (e) {
      showError(
        new Error(
          `Counter closed, but the audit event could not be saved: ${errorText(e)}`,
        ),
      );
    } finally {
      usePOS.getState().setAccount(null);
    }
  };
  const logout = () => {
    if (usePOS.getState().cart.length)
      Alert.alert(
        "Return to welcome and clear this draft?",
        "The unsaved checkout will be cleared. Saved orders stay on this device.",
        [
          { text: "Keep working", style: "cancel" },
          { text: "Return to welcome", onPress: () => void signOut() },
        ],
      );
    else void signOut();
  };
  const showLabels = phone || expanded;
  const side = (
    <View
      style={{
        flex: 1,
        backgroundColor: C.surface,
        borderRightWidth: 1,
        borderRightColor: C.line,
        paddingVertical: 24,
        paddingHorizontal: 12,
        gap: 28,
      }}
    >
      <View
        style={[
          S.row,
          { paddingHorizontal: 8, justifyContent: "space-between" },
        ]}
      >
        {showLabels ? (
          <Text
            style={{
              color: C.dark,
              fontSize: 28,
              fontWeight: "800",
              letterSpacing: -1,
            }}
          >
            rositrus
          </Text>
        ) : (
          <Coffee size={28} color={C.ink} />
        )}
        {phone && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close navigation"
            onPress={() => setDrawer(false)}
            style={{ padding: 10 }}
          >
            <X color={C.ink} size={22} />
          </Pressable>
        )}
      </View>
      <View style={{ gap: 6, flex: 1 }}>
        {routes.map(({ name, icon: Icon }) => (
          <Pressable
            key={name}
            accessibilityRole="button"
            accessibilityLabel={name}
            accessibilityState={{ selected: name === active }}
            onPress={() => {
              if (navigation.isReady()) navigation.navigate(name);
              setDrawer(false);
            }}
            style={({ pressed }) => ({
              minHeight: 50,
              flexDirection: "row",
              alignItems: "center",
              gap: 13,
              borderRadius: 10,
              paddingHorizontal: 16,
              backgroundColor:
                active === name
                  ? C.dark
                  : pressed
                    ? C.pale
                    : "transparent",
            })}
          >
            <Icon
              size={21}
              color={active === name ? "#FFFFFF" : C.ink}
              strokeWidth={1.8}
            />
            {showLabels && (
              <Text
                numberOfLines={1}
                style={{
                  color: active === name ? "#FFFFFF" : C.ink,
                  fontWeight: active === name ? "700" : "500",
                  fontSize: 14,
                }}
              >
                {name}
              </Text>
            )}
          </Pressable>
        ))}
      </View>
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: showLabels ? "row" : "column", gap: 8, paddingHorizontal: 4 }}>
          <IconButton label="Refresh workspace" icon={RefreshCw} disabled={refreshing} onPress={() => void refresh()} />
          <IconButton label="Device settings and backup" icon={Settings2} onPress={() => { setDrawer(false); setSettings(true); }} />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Welcome screen"
          onPress={logout}
          style={{
            minHeight: 48,
            flexDirection: "row",
            alignItems: "center",
            gap: 13,
            paddingHorizontal: 16,
          }}
        >
          <LogOut size={21} color={C.muted} />
          {showLabels && (
            <Text style={{ color: C.muted, fontSize: 14 }}>Welcome screen</Text>
          )}
        </Pressable>
        {!phone && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              expanded ? "Collapse sidebar" : "Expand sidebar"
            }
            onPress={() => setExpanded(!expanded)}
            style={{
              minHeight: 48,
              flexDirection: "row",
              alignItems: "center",
              gap: 13,
              paddingHorizontal: 16,
            }}
          >
            {expanded ? (
              <ChevronLeft size={21} color={C.muted} />
            ) : (
              <ChevronRight size={21} color={C.muted} />
            )}
            {showLabels && (
              <Text style={{ color: C.muted, fontSize: 14 }}>
                Collapse sidebar
              </Text>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
  return (
    <NavigationContainer
      ref={navigation}
      onStateChange={() =>
        setActive(
          (navigation.getCurrentRoute()?.name as keyof Routes) ?? "Menu",
        )
      }
    >
      <View style={{ flex: 1, flexDirection: "row", backgroundColor: C.bg }}>
        {!phone && (
          <Animated.View style={{ width: sidebarWidth, overflow: "hidden" }}>
            {side}
          </Animated.View>
        )}
        <View style={S.flex}>
          {!!loadError && (
            <View style={{ padding: 16, gap: 10 }}>
              <ErrorMessage message={loadError} />
              <Button
                label="Retry loading data"
                onPress={() => void refresh()}
              />
            </View>
          )}
          {refreshing && (
            <View
              style={[S.row, { paddingHorizontal: 24, paddingVertical: 8 }]}
            >
              <ActivityIndicator size="small" color={C.accent} />
              <Text style={S.muted}>Reading local data…</Text>
            </View>
          )}
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: C.bg },
              animation: reducedMotion ? "none" : "fade",
              animationDuration: 140,
            }}
          >
            <Stack.Screen name="Menu" component={MenuScreen} />
            <Stack.Screen name="Orders" component={OrdersScreen} />
            <Stack.Screen name="Order History" component={HistoryScreen} />
            <Stack.Screen name="Audit Logs" component={AuditScreen} />
            <Stack.Screen name="Analytics" component={AnalyticsScreen} />
          </Stack.Navigator>
          {phone && (
            <View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: C.surface, borderTopWidth: 1, borderColor: C.line }}>
              <Button label="Open navigation" icon={MenuIcon} tone="secondary" onPress={() => setDrawer(true)} />
            </View>
          )}
        </View>
        {phone && (
          <View
            pointerEvents={drawer ? "auto" : "none"}
            style={StyleSheet.absoluteFill}
          >
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: "#0C241E88", opacity: drawerProgress },
              ]}
            >
              <Pressable
                style={{ flex: 1 }}
                accessibilityLabel="Close navigation"
                onPress={() => setDrawer(false)}
              />
            </Animated.View>
            <Animated.View
              accessibilityViewIsModal={drawer}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: 270,
                transform: [
                  {
                    translateX: drawerProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-270, 0],
                    }),
                  },
                ],
              }}
            >
              {side}
            </Animated.View>
          </View>
        )}
        <Settings visible={settings} onClose={() => setSettings(false)} />
      </View>
    </NavigationContainer>
  );
}
function Root() {
  const [ready, setReady] = useState(false),
    [error, setError] = useState("");
  const username = usePOS((s) => s.account);
  const boot = async () => {
    setError("");
    setReady(false);
    try {
      await initialize();
      setReady(true);
    } catch (e) {
      setError(errorText(e));
    }
  };
  useEffect(() => {
    void boot();
  }, []);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style="dark" />
      {!ready ? (
        <View style={[S.page, { flex: 1, justifyContent: "center" }]}>
          <Coffee size={40} color={C.accent} />
          <Text style={S.title}>
            {error ? "Your counter needs attention" : "Opening your counter"}
          </Text>
          {error ? (
            <>
              <ErrorMessage message={error} />
              <Button
                label="Retry database setup"
                onPress={() => void boot()}
              />
            </>
          ) : (
            <>
              <Text style={S.muted}>
                Preparing private storage on this device…
              </Text>
              <View
                style={{
                  height: 100,
                  backgroundColor: C.pale,
                  borderRadius: 16,
                }}
              />
              <View
                style={{
                  height: 100,
                  backgroundColor: C.pale,
                  borderRadius: 16,
                }}
              />
            </>
          )}
        </View>
      ) : username ? (
        <Workspace key={username} />
      ) : (
        <WelcomeScreen onOpen={() => {
          usePOS.getState().setAccount("Local counter");
          void logEvent("Local counter", "Counter opened").catch(showError);
        }} />
      )}
      <ConfirmationHost />
      <Toast />
    </SafeAreaView>
  );
}
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: string }
> {
  state = { error: "" };
  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }
  render() {
    return this.state.error ? (
      <View
        style={{
          flex: 1,
          padding: 28,
          justifyContent: "center",
          backgroundColor: C.bg,
          gap: 18,
        }}
      >
        <Text style={S.title}>Please reopen Rositrus</Text>
        <Text style={S.text}>
          The interface could not continue. Saved transactions remain in local
          storage. Close and reopen the app to try again.
        </Text>
        <Text selectable style={S.muted}>
          {this.state.error}
        </Text>
      </View>
    ) : (
      this.props.children
    );
  }
}
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <Root />
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
