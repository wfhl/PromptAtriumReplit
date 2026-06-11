-- Migration 001: PromptAtrium Lite feature columns, tables, and seed data
-- Applied via raw SQL (never db:push) to avoid destructive migration prompts.
-- Run against dev DB manually; production is updated via Replit Publish flow.

-- 1. Lite feature flag columns on prompts
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS is_lite_featured boolean DEFAULT false;
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS is_lite_preview boolean DEFAULT false;

-- Partial indexes for efficient Lite-screen queries
CREATE INDEX IF NOT EXISTS idx_prompts_lite_featured ON prompts (created_at DESC) WHERE is_lite_featured = true;
CREATE INDEX IF NOT EXISTS idx_prompts_lite_preview ON prompts (created_at DESC) WHERE is_lite_preview = true;

-- 2. Feature type registry
CREATE TABLE IF NOT EXISTS feature_types (
  id serial PRIMARY KEY,
  name varchar(100) NOT NULL UNIQUE,
  display_name varchar(200) NOT NULL,
  description text,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL
);

INSERT INTO feature_types (name, display_name, description) VALUES
  ('lite_featured',       'Lite Featured',        'Prompts featured on the PromptAtriumLite discover screen'),
  ('lite_preview',        'Lite Preview',          'Prompts shown as teasers/previews on PromptAtriumLite'),
  ('marketplace_featured','Marketplace Featured',  'Prompts featured in the marketplace'),
  ('trending',            'Trending',              'Prompts currently trending across the platform'),
  ('sponsored',           'Sponsored',             'Sponsored prompts displayed with attribution')
ON CONFLICT (name) DO NOTHING;

-- 3. Prompt–feature join table
CREATE TABLE IF NOT EXISTS prompt_features (
  id serial PRIMARY KEY,
  prompt_id char(10) NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  feature_type_id integer NOT NULL REFERENCES feature_types(id) ON DELETE CASCADE,
  sort_order integer DEFAULT 0 NOT NULL,
  expires_at timestamp,
  created_at timestamp DEFAULT now() NOT NULL,
  CONSTRAINT uq_prompt_feature UNIQUE (prompt_id, feature_type_id)
);

CREATE INDEX IF NOT EXISTS idx_prompt_features_prompt_id ON prompt_features (prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompt_features_feature_type_id ON prompt_features (feature_type_id);

-- 4. New global prompt type values
INSERT INTO prompt_types (name, description, type, is_active)
VALUES
  ('skill',  'A reusable skill or capability definition for AI agents', 'global', true),
  ('rule',   'A rule or constraint to guide AI behavior',               'global', true),
  ('agent',  'A full agent persona or configuration prompt',            'global', true),
  ('plugin', 'A plugin or tool instruction set for AI systems',         'global', true)
ON CONFLICT (name) DO NOTHING;

-- 5. Seed: flag 15 existing public prompts as lite_featured
UPDATE prompts SET is_lite_featured = true
WHERE id IN (
  'ba340376e0','e36f7c8d4a','673889cdef','73efcbc24e','49a14a9a05',
  'a7d838daa3','7e36b5cdc5','18def8c230','1b139715ad','f19e5adba1',
  '3144083d5a','62f55f1371','877d0a7983','4fefb08d74','bd503a3d16'
);

-- 6. Seed: flag 7 existing public prompts as lite_preview
UPDATE prompts SET is_lite_preview = true
WHERE id IN (
  '811ff22dc9','cab844e1b6','1cb575dcb3','16e7fc7fca',
  '46f4c2d02e','0ed653a576','ffe1d65f99'
);
