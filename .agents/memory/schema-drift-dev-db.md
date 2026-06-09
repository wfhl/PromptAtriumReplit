---
name: dev DB schema drift vs schema.ts
description: The dev DB drifted far from shared/schema.ts in BOTH directions; db:push is unsafe and would destroy data.
---

The dev Postgres database is materially out of sync with `shared/schema.ts`, in
two opposite directions:

1. **DB missing declared objects** (schema ahead of DB): many `.unique()` /
   `unique(...)` constraints and `index(...)` indexes declared in schema.ts were
   never applied. This silently breaks `onConflictDoUpdate` upserts (Postgres needs
   a real unique constraint, not just an index, to match an ON CONFLICT target).
   These were reconciled by adding the constraints/indexes with Drizzle's exact
   naming convention (`{table}_{col}_unique`, `{table}_{c1}_{c2}_unique`, or the
   literal name for `unique("name")`) so a future push sees them as matching.

2. **DB ahead of schema** (schema behind DB): the live DB has extra tables
   (`agent_profiles`, `prompt_generator_components` ~2k rows, `workflow_missions`,
   `workflow_steps`), extra columns (e.g. `prompts.fork_of/source_intel/input_schema/
   output_schema/is_template`, `codex_categories.slug/parent_id`, `codex_terms.*`),
   and column-type drift (text vs varchar) that `shared/schema.ts` does not declare.

**Why this matters / how to apply:**
- **Do NOT run `npm run db:push` / `drizzle-kit push` on this project.** Because of
  direction (2), push proposes DROP TABLE / DROP COLUMN / TRUNCATE and will destroy
  real data. Default-decline its prompts.
- To fix missing constraints/indexes (direction 1), apply them by hand with raw SQL
  (`ALTER TABLE ... ADD CONSTRAINT ...` / `CREATE INDEX IF NOT EXISTS ...`) after
  checking for duplicate rows that would block a unique constraint.
- Closing direction (2) requires deciding per-object whether schema.ts should adopt
  the DB's extra tables/columns or the DB should drop them — a separate, deliberate
  task, never an unattended push.
