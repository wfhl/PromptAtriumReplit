# Schema Reconciliation — Deferred TODO

## Overview

The live databases (dev and production) have drifted from `schema.ts` in both directions. This document records what needs to be reconciled and the safe approach to do it.

**Important:** Do NOT run `pnpm --filter @workspace/db run push` until schema.ts is fully reconciled — it will prompt to drop tables and columns that contain real data.

---

## Tables added in Task 28 (now in schema.ts + dev DB)

These tables were added via raw SQL and are reflected in `schema.ts`:

| Table | Description |
|---|---|
| `feature_types` | Classification of prompt feature slots (lite_featured, lite_preview, marketplace_featured, trending, sponsored) |
| `prompt_features` | Join table linking prompts to feature_type slots with sort_order + expires_at |

New columns on `prompts`:
- `is_lite_featured boolean DEFAULT false` — prompt appears on PromptAtriumLite Discover screen
- `is_lite_preview boolean DEFAULT false` — prompt appears as a teaser/upsell on PromptAtriumLite

New rows in `prompt_types`: skill, rule, agent, plugin (all `type='global'`).

**Production:** These will be applied automatically when the user next publishes (Replit Publish computes the diff from dev → prod and applies it).

---

## Tables in dev + production that are NOT in schema.ts

These exist in the live databases but are absent from `schema.ts`. They need to be added to the schema before a safe db:push can happen.

| Table | Rows in prod | Notes |
|---|---|---|
| `agent_profiles` | **5 rows** | Has real data — must NOT be dropped |
| `prompt_generator_components` | 0 | Safe to drop or document |
| `workflow_missions` | 0 | Agent execution runtime log |
| `workflow_steps` | 0 | Agent execution runtime log |
| `prompt_generation_history` | 0 | Legacy — likely safe to drop |
| `user_prompt_presets` | 0 | Legacy — likely safe to drop |

### Workflow tables structure (for when we add them to schema.ts)

`workflow_missions`: id, name, status, trigger_source, user_id, context_data (jsonb), created_at, updated_at

`workflow_steps`: id, mission_id (FK → workflow_missions), agent_id, parent_step_id, step_type, status, input_context (jsonb), output_result (jsonb), error_log, started_at, completed_at

Note: these are **agent execution logs**, not prompt chains. If prompt sequencing/chaining is needed in future, that is a separate design.

---

## Columns in the live databases that are NOT in schema.ts

The `prompts` table has 50 columns in production; `schema.ts` defines ~38. The extra columns need to be discovered and either added to schema.ts or confirmed as droppable.

Run this to see the full list of columns not yet in schema.ts:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'prompts'
ORDER BY ordinal_position;
```

Other tables with likely extra columns: `users` (28 cols in prod), `aesthetics` (20 cols in prod), `transaction_ledger` (23 cols in prod).

---

## Legacy / duplicate columns in schema.ts to clean up

These exist in schema.ts but represent redundant or poorly-named legacy design:

| Column(s) | Table | Issue | Recommendation |
|---|---|---|---|
| `prompt_type varchar` AND `prompt_types text[]` | `prompts` | One was added first, then an array version added later | Decide on one; migrate data; drop the other |
| `category varchar` AND `categories text[]` | `prompts` | Same pattern | Same approach |
| `prompt_style varchar` AND `prompt_styles text[]` | `prompts` | Same pattern | Same approach |
| `intended_generator varchar` AND `intended_generators text[]` | `prompts` | Same pattern | Same approach |
| `collection_id varchar` AND `collection_ids text[]` | `prompts` | Same pattern | Same approach |

---

## Safe reconciliation approach

1. **Read all extra columns** from the live DB via `information_schema.columns` for each table
2. **Add missing tables** (`agent_profiles`, `workflow_missions`, `workflow_steps`) to schema.ts with accurate column definitions — verify against the live DB, not guesses
3. **Add missing columns** to existing table definitions in schema.ts
4. **Decide on legacy duplicates** — check which column variant is actually used in routes/queries, then migrate + drop the unused one via raw `ALTER TABLE ... DROP COLUMN`
5. **Verify** with `pnpm --filter @workspace/db run push --dry-run` (if supported) or a careful diff
6. **Only then** run `db:push` — with all extra tables/columns in schema.ts, the migration will be purely additive

---

## Related

- `replit.md` Gotchas section — "Never confirm the destructive push"
- Memory: `dev DB schema drift vs schema.ts`
- The deployment migration dialogs are caused by this drift — resolving it eliminates them
