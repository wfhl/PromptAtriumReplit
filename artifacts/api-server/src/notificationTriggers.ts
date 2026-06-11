import { broadcastPush, type PushMessageData } from "./push";
import { logger } from "./lib/logger";

/**
 * Semantic notification triggers: map a product event ("a prompt was featured")
 * to the push message it should produce, and dispatch it.
 *
 * This layer sits on top of `push.ts` (the transport — "how to send") and is the
 * single place where notification copy and deep-link targets live. Routes/jobs
 * should call these functions rather than building messages or calling
 * `broadcastPush` directly, so new triggers are added here, not scattered through
 * the route file.
 *
 * Every trigger is fire-and-forget: it catches its own errors so a notification
 * failure can never block or fail the request that caused the event.
 */

/** A prompt shape with just the fields triggers need. */
interface TriggerPrompt {
  id: string;
  name: string;
  isPublic?: boolean | null;
  isNsfw?: boolean | null;
}

function fireAndForget(
  label: string,
  payload: { title: string; body: string; data?: PushMessageData },
): void {
  broadcastPush(payload)
    .then((result) => logger.info({ result, trigger: label }, "Push trigger sent"))
    .catch((err) => logger.error({ err, trigger: label }, "Push trigger failed"));
}

/**
 * A prompt was featured by an admin. Notify all devices and deep-link to it.
 * No-op for private or NSFW prompts (they shouldn't be promoted broadly).
 */
export function notifyPromptFeatured(prompt: TriggerPrompt): void {
  if (!prompt.isPublic || prompt.isNsfw) return;
  fireAndForget("prompt_featured", {
    title: "New featured prompt ✨",
    body: prompt.name,
    data: { promptId: prompt.id, url: `/prompt/${prompt.id}` },
  });
}

/**
 * Admin-authored broadcast (e.g. "new trending prompts this week"). Optionally
 * deep-links to a specific prompt or in-app path.
 */
export function notifyAdminBroadcast(input: {
  title: string;
  body: string;
  promptId?: string;
  url?: string;
}): Promise<{ sent: number; failed: number }> {
  const { title, body, promptId, url } = input;
  return broadcastPush({
    title,
    body,
    data: {
      promptId,
      url: url ?? (promptId ? `/prompt/${promptId}` : undefined),
    },
  });
}
