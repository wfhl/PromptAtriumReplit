---
name: Marketplace runtime on/off flag
description: How the marketplace enabled/disabled switch is stored, read, and cached across server and client.
---

The marketplace is toggled at runtime (no redeploy) via a DB-backed flag, not a
code constant anymore.

- **Storage:** `platform_settings` row, key `marketplace_enabled`, value `"true"`/`"false"`. Absent row = OFF (the default).
- **Server:** `server/config/features.ts` exposes `isMarketplaceEnabled()` (10s in-memory cache), `marketplaceGuard` (503s marketplace routes when off), and `invalidateMarketplaceCache()`. The admin settings PUT calls the invalidator so changes take effect immediately.
- **Client:** `useMarketplaceEnabled()` (in `client/src/config/features.ts`) reads the public `/api/features` endpoint. Components call the hook and keep using a local `MARKETPLACE_ENABLED` boolean.
- **Admin control:** super admin flips it from the admin dashboard → Marketplace tab → Settings (master "Marketplace Status" switch). That tab is intentionally always visible to super admins (even when off) so it can be turned back on.

**Why:** business needs to pause/resume the marketplace without a developer or
redeploy.
