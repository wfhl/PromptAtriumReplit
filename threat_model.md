# Threat Model

## Project Overview

PromptAtrium is a public-facing prompt management and marketplace platform with a React frontend and an Express backend backed by PostgreSQL via Drizzle ORM. Production-relevant security surfaces include Replit OIDC session auth, REST API endpoints under `/api`, community and admin RBAC, marketplace checkout and webhook flows, Google Drive/OAuth integrations, AI-processing endpoints, and object storage for prompt and profile images.

The production deployment is public (`https://promptatrium.app`). Per deployment assumptions, TLS is handled by the platform and development-only helpers should be ignored unless a production-reachable route depends on them.

## Assets

- **User accounts and sessions** — Replit-authenticated sessions, role assignments, and linked profile state. Compromise enables account takeover and privilege abuse.
- **Private prompt content and collections** — user-owned prompts, saved prompts, history, collaborative/community content, and prompt-refinement conversations. Exposure leaks user-created intellectual property and private data.
- **Marketplace data and payment state** — listings, orders, licenses, disputes, refunds, payouts, transaction ledger entries, and seller onboarding status. Tampering can create fraudulent purchases, refunds, or payout manipulation.
- **Third-party OAuth tokens and API credentials** — Google Drive OAuth tokens, Stripe/PayPal secrets, object-storage credentials, and database/session secrets. Exposure enables external account abuse or backend compromise.
- **Uploaded media and stored objects** — profile images, prompt images, and private object-storage content. Access control failures here can leak private user data.
- **Administrative capabilities** — moderation, audit log access, marketplace controls, payout processing, role assignment, and migration endpoints. Misuse has platform-wide impact.

## Trust Boundaries

- **Browser to API** — all client input is untrusted, including authenticated users. The server must enforce validation, authorization, and ownership checks.
- **Unauthenticated to authenticated to admin** — public content browsing is allowed, but prompt ownership, private/community content, marketplace actions, and admin tooling require server-side checks.
- **API to PostgreSQL** — the API can read and mutate all application state. Injection or broken authorization at the API layer can expose or corrupt sensitive records.
- **API to third parties** — the server talks to Replit OIDC, Stripe, PayPal, Google APIs, and Google Cloud Storage. Callback and webhook authenticity must be verified before state changes.
- **Public object access to private object access** — some media is public while other stored objects are private. Object-serving routes must preserve ACL decisions in production.
- **Production vs development helpers** — dev upload/storage helpers exist, but only production-reachable paths matter for findings. Do not report issues confined to `NODE_ENV=development` code.

## Scan Anchors

- **Production entry points:** `server/index.ts`, `server/routes.ts`, `server/routes/*.ts`, `server/replitAuth.ts`, `server/webhooks/*.ts`.
 - **Highest-risk code areas:** marketplace checkout/refund/webhook flows in `server/routes.ts` and `server/webhooks/*`; RBAC in `server/rbac.ts`; Google OAuth/Drive in `server/googleDrive.ts`; object storage in `server/objectStorage.ts` and object-serving routes; public AI-processing routes in `server/routes/aiAnalyzer.ts`, `server/routes/caption.ts`, and `server/routes/enhance-prompt.ts`.
 - **Public surfaces:** prompt browsing, profile lookup, invite lookup, some codex/system-data/AI endpoints, webhooks, object-serving routes, and several unauthenticated AI-analysis/caption/enhancement endpoints that can trigger paid external model usage.
- **Authenticated surfaces:** most prompt CRUD, collections, prompt history, purchases, disputes, Google Drive actions, prompt refinement.
- **Admin surfaces:** `/api/admin*`, role-management routes, marketplace admin and payout routes, migration endpoints.
- **Usually dev-only / low-priority:** `server/devStorage.ts`, development upload endpoints, Vite/dev tooling.

## Threat Categories

### Spoofing

Authentication relies on Replit OIDC sessions. Protected endpoints must require a valid authenticated session, refresh logic must not silently trust attacker-controlled state, and OAuth/webhook callbacks from Google, Stripe, and PayPal must be bound to trusted origins or verified signatures before granting access or mutating records.

### Tampering

Users can create prompts, manage communities, upload media, and buy or sell marketplace listings. The server must derive sensitive state transitions from trusted server-side records rather than client-provided identifiers or status claims. Payment completion, refunds, moderation actions, and role changes must be authorized and tied to the correct principal and resource.

### Information Disclosure

The platform stores private prompts, profile fields, messages, refinement history, and third-party OAuth tokens. API responses, logs, object-serving endpoints, and popup/OAuth flows must not expose private records, secrets, or tokens to unauthorized users or untrusted origins.

### Denial of Service

The application exposes public and authenticated endpoints that accept large prompt content, image payloads, AI-analysis requests, and webhook traffic. Production endpoints must apply meaningful rate limits and size constraints where expensive processing or external API calls can be triggered by attackers.

### Elevation of Privilege

Community, sub-community, seller, and admin operations create multiple authorization tiers. Every mutation route must enforce server-side ownership or role checks, and object access must remain scoped after crossing route, storage, or community boundaries. Missing checks on admin, marketplace, or deletion endpoints can lead to tenant-wide compromise.
