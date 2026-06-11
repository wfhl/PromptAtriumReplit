---
name: Expo native-only APIs crash the web preview
description: Why native-only Expo module calls (e.g. expo-notifications) must be Platform-guarded or they redbox the entire web dev-preview verification surface.
---

# Native-only Expo APIs crash the web preview

Calling a native-only Expo API at module scope or in a top-level effect throws an
uncaught error on web (`expo-notifications` `getLastNotificationResponseAsync()` is the
known offender — "The method or property ExpoNotifications.X is not available on web").
On web that uncaught error redboxes the **entire** app, so nothing renders.

**Why this matters:** the PromptAtrium mobile app is native-first, but the only
self-serve way to visually verify screens during a session is the **web** dev preview
(app_preview screenshots / the preview pane). A single unguarded native API in a shared
file like `app/_layout.tsx` blocks verification of every screen, not just the feature
that uses it.

**How to apply:**
- Guard native-only calls with `if (Platform.OS === "web") return;` (effects) or a
  `Platform.OS !== "web"` branch. Native deep-linking / notifications keep working; web
  just skips them.
- When a web-preview screenshot shows a redbox, read the error's source file/line — it
  is often pre-existing native code unrelated to your feature, not your new screen.
- Distinct from the documented WebGL/Three.js preview note (that one is a non-fatal
  GPU warning; this one is a fatal crash that must be guarded).
