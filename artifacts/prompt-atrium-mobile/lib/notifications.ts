import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { registerPushToken } from "@/lib/api";

// Foreground behavior: show an alert banner + play sound when a notification
// arrives while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function platformTag(): "ios" | "android" | "web" {
  if (Platform.OS === "ios") return "ios";
  if (Platform.OS === "android") return "android";
  return "web";
}

/**
 * Request permission, obtain the Expo push token, and upload it to the backend.
 * Safe to call on every launch — token registration is idempotent server-side.
 * Returns the token, or null if unavailable (simulator, web, denied perms, or
 * no EAS projectId in this build).
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Push tokens are only issued on physical devices.
  if (!Device.isDevice) return null;

  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== "granted") {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== "granted") return null;

    // EAS projectId is required to mint an Expo push token. It is present in
    // EAS/dev-client builds; in bare Expo Go dev it may be absent.
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;

    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const token = tokenResponse.data;
    if (!token) return null;

    await registerPushToken(token, platformTag());
    return token;
  } catch (err) {
    // Never let push setup crash the app — it is an optional enhancement.
    console.warn("Push registration skipped:", err);
    return null;
  }
}
