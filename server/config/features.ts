// Server-side feature flags. Mirrors client/src/config/features.ts.
//
// MARKETPLACE_ENABLED controls all marketplace-related server behavior
// (buying, selling, credits, payouts, listings, disputes, reviews).
// When `false`, marketplace API routes are blocked at the server with a
// clear "feature unavailable" response so the feature is fully off, not
// just hidden in the UI. Stripe/PayPal webhooks and existing data are
// left intact. Set to `true` to re-enable the marketplace everywhere.
//
// Keep this in sync with the client flag of the same name.
export const MARKETPLACE_ENABLED = false;

import type { Request, Response, NextFunction } from "express";

// Express middleware that short-circuits marketplace requests while the
// marketplace is disabled. Mounted on marketplace route prefixes.
export function marketplaceGuard(_req: Request, res: Response, next: NextFunction) {
  if (MARKETPLACE_ENABLED) {
    return next();
  }
  return res.status(503).json({
    error: "marketplace_unavailable",
    message: "The marketplace is currently unavailable.",
  });
}
