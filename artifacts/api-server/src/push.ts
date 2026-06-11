import { db } from "./db";
import { pushTokens, type PushToken } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "./lib/logger";

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";

export interface PushMessageData {
  /** Deep-link target inside the mobile app. */
  url?: string;
  /** Convenience target a prompt detail screen. */
  promptId?: string;
  [key: string]: unknown;
}

export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: PushMessageData;
  sound?: "default" | null;
}

/** Expo push tokens look like `ExponentPushToken[xxxxxxxx]` (or FCM/APNs raw). */
export function isExpoPushToken(token: unknown): token is string {
  return (
    typeof token === "string" &&
    (token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken["))
  );
}

/** Store (or refresh) a device push token. Idempotent on the token value. */
export async function upsertPushToken(input: {
  token: string;
  userId?: string | null;
  platform?: string | null;
}): Promise<PushToken> {
  const [row] = await db
    .insert(pushTokens)
    .values({
      token: input.token,
      userId: input.userId ?? null,
      platform: input.platform ?? null,
      enabled: true,
    })
    .onConflictDoUpdate({
      target: pushTokens.token,
      set: {
        userId: input.userId ?? null,
        platform: input.platform ?? null,
        enabled: true,
        updatedAt: new Date(),
      },
    })
    .returning();
  return row;
}

/** Disable a token (e.g. user opted out, or Expo reported it as unregistered). */
export async function disablePushToken(token: string): Promise<void> {
  await db
    .update(pushTokens)
    .set({ enabled: false, updatedAt: new Date() })
    .where(eq(pushTokens.token, token));
}

export async function getEnabledPushTokens(): Promise<string[]> {
  const rows = await db
    .select({ token: pushTokens.token })
    .from(pushTokens)
    .where(eq(pushTokens.enabled, true));
  return rows.map((r) => r.token).filter(isExpoPushToken);
}

/**
 * Send a notification to a set of devices via the Expo push service.
 * Returns the number of messages accepted by Expo. Tokens Expo reports as
 * `DeviceNotRegistered` are disabled so we stop sending to dead devices.
 */
export async function sendExpoPush(
  tokens: string[],
  payload: { title: string; body: string; data?: PushMessageData },
): Promise<{ sent: number; failed: number }> {
  const recipients = tokens.filter(isExpoPushToken);
  if (recipients.length === 0) return { sent: 0, failed: 0 };

  const messages: ExpoPushMessage[] = recipients.map((to) => ({
    to,
    title: payload.title,
    body: payload.body,
    data: payload.data,
    sound: "default",
  }));

  let sent = 0;
  let failed = 0;

  // Expo recommends batches of <=100 messages per request.
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    try {
      const res = await fetch(EXPO_PUSH_ENDPOINT, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(batch),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        logger.error({ status: res.status, text }, "Expo push request failed");
        failed += batch.length;
        continue;
      }
      const json = (await res.json()) as {
        data?: Array<{ status: string; message?: string; details?: { error?: string } }>;
      };
      const tickets = json.data ?? [];
      for (let t = 0; t < tickets.length; t++) {
        const ticket = tickets[t];
        if (ticket.status === "ok") {
          sent++;
        } else {
          failed++;
          if (ticket.details?.error === "DeviceNotRegistered") {
            await disablePushToken(batch[t].to).catch(() => {});
          }
        }
      }
    } catch (err) {
      logger.error({ err }, "Failed to send Expo push batch");
      failed += batch.length;
    }
  }

  return { sent, failed };
}

/** Broadcast a notification to every enabled device. */
export async function broadcastPush(payload: {
  title: string;
  body: string;
  data?: PushMessageData;
}): Promise<{ sent: number; failed: number }> {
  const tokens = await getEnabledPushTokens();
  return sendExpoPush(tokens, payload);
}
