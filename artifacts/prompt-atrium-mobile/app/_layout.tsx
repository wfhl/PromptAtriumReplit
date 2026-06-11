import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import React, { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import colors from "@/constants/colors";
import { deepLinkTarget } from "@/lib/api";
import { registerForPushNotifications } from "@/lib/notifications";
import { AuthProvider } from "@/lib/authContext";
import { SavedProvider } from "@/lib/saved";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();
const theme = colors.dark;

function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.card },
        headerTintColor: theme.foreground,
        headerTitleStyle: { fontFamily: "Inter_600SemiBold" },
        headerShadowVisible: false,
        headerBackTitle: "Back",
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="prompt/[id]" options={{ title: "Prompt", headerBackTitle: "Back" }} />
      <Stack.Screen name="my-prompts/create" options={{ title: "New Prompt", headerBackTitle: "Back" }} />
      <Stack.Screen name="my-prompts/edit/[id]" options={{ title: "Edit Prompt", headerBackTitle: "Back" }} />
      <Stack.Screen name="tools/aspect-ratio" options={{ title: "Aspect Ratio" }} />
      <Stack.Screen name="tools/prompting-guides" options={{ title: "Prompting Guides" }} />
      <Stack.Screen name="tools/metadata-analyzer" options={{ title: "Image Metadata" }} />
      <Stack.Screen name="tools/generate-prompt" options={{ title: "Generate Prompt" }} />
      <Stack.Screen name="tools/prompt-miner" options={{ title: "PromptMiner" }} />
      <Stack.Screen name="tools/import-prompts" options={{ title: "Import Prompts" }} />
      <Stack.Screen name="codex" options={{ title: "Codex" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const handledInitialResponse = useRef(false);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.background).catch(() => {});
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Register this device for push notifications on launch.
  useEffect(() => {
    registerForPushNotifications();
  }, []);

  // Deep-link when a notification is tapped, whether the app was already open
  // or launched from a cold start by the tap.
  useEffect(() => {
    if (Platform.OS === "web") return;

    function navigateFromData(data: Record<string, unknown> | undefined) {
      const target = deepLinkTarget(data);
      if (target) router.push(target as never);
    }

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response && !handledInitialResponse.current) {
        handledInitialResponse.current = true;
        navigateFromData(
          response.notification.request.content.data as Record<string, unknown>,
        );
      }
    });

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      navigateFromData(
        response.notification.request.content.data as Record<string, unknown>,
      );
    });

    return () => sub.remove();
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <SavedProvider>
              <GestureHandlerRootView>
                <KeyboardProvider>
                  <StatusBar style="light" />
                  <RootLayoutNav />
                </KeyboardProvider>
              </GestureHandlerRootView>
            </SavedProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
