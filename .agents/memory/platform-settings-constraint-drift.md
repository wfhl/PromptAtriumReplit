---
name: platform_settings unique-key drift
description: platform_settings.key was declared .unique() in schema but the dev DB lacked the constraint, silently breaking onConflictDoUpdate upserts.
---

`shared/schema.ts` declares `platformSettings.key` as `.unique()`, but the dev
database had drifted and only had a plain (non-unique) index on `key`, no unique
constraint. `storage.updatePlatformSettings` upserts with
`onConflictDoUpdate({ target: platformSettings.key })`, which Postgres rejects
with "there is no unique or exclusion constraint matching the ON CONFLICT
specification" when the constraint is missing.

**Why it stayed hidden:** the only callers (marketplace/PayPal settings PUTs)
were gated behind the disabled marketplace, so the broken write path was never
exercised.

**How it was fixed:** added the constraint the schema already declared, named to
match Drizzle's convention so a future push won't conflict:
`ALTER TABLE platform_settings ADD CONSTRAINT platform_settings_key_unique UNIQUE (key);`

**How to apply:** before relying on any `onConflictDoUpdate` upsert, confirm the
target column actually has a unique constraint in the live DB (`pg_constraint`
contype='u'), not just an index. A `.unique()` in schema.ts is not proof it was
ever pushed.
