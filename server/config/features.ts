// Server-side marketplace feature flag.
//
// The marketplace on/off state is stored in the `platform_settings` table
// (key: `marketplace_enabled`) so a super admin can pause or resume the
// marketplace from the admin dashboard without a code change or redeploy.
//
// When disabled, marketplace API routes are blocked at the server with a
// clear "feature unavailable" response so the feature is fully off, not
// just hidden in the UI. Stripe/PayPal webhooks and existing data are left
// intact. The flag defaults to OFF when no setting row exists.
//
// Keep this in sync with the client hook `useMarketplaceEnabled`.

import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

// Key under which the marketplace on/off flag is stored in platform_settings.
export const MARKETPLACE_ENABLED_KEY = "marketplace_enabled";

// Marketplace defaults to OFF when no platform setting exists.
const DEFAULT_MARKETPLACE_ENABLED = false;

// Small in-memory cache so the guard doesn't hit the database on every
// marketplace request. Invalidated immediately when the setting is updated.
const CACHE_TTL_MS = 10_000;
let cachedEnabled: boolean | null = null;
let cacheExpiresAt = 0;

// Clear the cached value so the next read reflects an updated setting.
export function invalidateMarketplaceCache(): void {
  cachedEnabled = null;
  cacheExpiresAt = 0;
}

// Read the current marketplace on/off state from platform settings (cached).
export async function isMarketplaceEnabled(): Promise<boolean> {
  const now = Date.now();
  if (cachedEnabled !== null && now < cacheExpiresAt) {
    return cachedEnabled;
  }

  let enabled = DEFAULT_MARKETPLACE_ENABLED;
  try {
    const settings = await storage.getPlatformSettings([MARKETPLACE_ENABLED_KEY]);
    const raw = settings[MARKETPLACE_ENABLED_KEY];
    if (raw !== undefined && raw !== null) {
      enabled = raw === true || raw === "true";
    }
  } catch (error) {
    console.error("Failed to read marketplace_enabled platform setting:", error);
    enabled = DEFAULT_MARKETPLACE_ENABLED;
  }

  cachedEnabled = enabled;
  cacheExpiresAt = now + CACHE_TTL_MS;
  return enabled;
}

// Express middleware that short-circuits marketplace requests while the
// marketplace is disabled. Mounted on marketplace route prefixes.
export async function marketplaceGuard(_req: Request, res: Response, next: NextFunction): Promise<void> {
  if (await isMarketplaceEnabled()) {
    return next();
  }
  res.status(503).json({
    error: "marketplace_unavailable",
    message: "The marketplace is currently unavailable.",
  });
}
