-- Reconcile database schema drift with shared/schema.ts
--
-- Idempotent, auditable remediation for UNIQUE constraints and indexes that are
-- declared in shared/schema.ts but were never applied to the live database. This
-- drift silently breaks `onConflictDoUpdate` upserts (Postgres requires a real
-- UNIQUE constraint, not just an index, to match an ON CONFLICT target) and leaves
-- declared indexes missing.
--
-- Safe to run repeatedly: UNIQUE constraints are guarded with pg_constraint checks
-- (Postgres has no `ADD CONSTRAINT IF NOT EXISTS`) and indexes use
-- `CREATE INDEX IF NOT EXISTS`. Constraint names match drizzle-kit's naming
-- convention so a future `drizzle-kit push` recognizes them as already-present.
--
-- This script ONLY adds missing objects. It deliberately does NOT drop or alter
-- any table/column. The DB also contains extra tables/columns not declared in
-- shared/schema.ts; reconciling that direction is a separate, tracked task and must
-- NOT be done with `drizzle-kit push` (push would DROP/TRUNCATE real data).
--
-- Run with: npx tsx scripts/reconcile-schema-drift.ts

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Missing UNIQUE constraints (15)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  c text[];
  constraints CONSTANT text[][] := ARRAY[
    ['sub_community_invites', 'sub_community_invites_code_unique', '(code)'],
    ['codex_categories',      'codex_categories_name_unique',      '(name)'],
    ['prompt_likes',          'prompt_likes_user_id_prompt_id_unique',     '(user_id, prompt_id)'],
    ['prompt_favorites',      'prompt_favorites_user_id_prompt_id_unique', '(user_id, prompt_id)'],
    ['user_credits',          'user_credits_user_id_unique',       '(user_id)'],
    ['daily_rewards',         'unique_user_daily_rewards',         '(user_id)'],
    ['achievements',          'achievements_code_unique',          '(code)'],
    ['user_achievements',     'unique_user_achievement',           '(user_id, achievement_id)'],
    ['seller_profiles',       'seller_profiles_user_id_unique',    '(user_id)'],
    ['marketplace_listings',  'unique_prompt_listing',             '(prompt_id)'],
    ['marketplace_orders',    'marketplace_orders_order_number_unique', '(order_number)'],
    ['marketplace_reviews',   'unique_user_listing_review',        '(reviewer_id, listing_id)'],
    ['payout_batches',        'payout_batches_batch_number_unique','(batch_number)'],
    ['platform_settings',     'platform_settings_key_unique',      '(key)'],
    ['user_prompt_memory',    'user_prompt_memory_user_id_unique', '(user_id)']
  ];
BEGIN
  FOREACH c SLICE 1 IN ARRAY constraints LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = c[2]
    ) THEN
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I UNIQUE %s', c[1], c[2], c[3]);
      RAISE NOTICE 'Added unique constraint % on %', c[2], c[1];
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Missing indexes (41)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_sub_community_invites_code ON sub_community_invites (code);
CREATE INDEX IF NOT EXISTS idx_sub_community_invites_active ON sub_community_invites (is_active);
CREATE INDEX IF NOT EXISTS idx_prompt_community_sharing_prompt ON prompt_community_sharing (prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompt_community_sharing_community ON prompt_community_sharing (community_id);
CREATE INDEX IF NOT EXISTS idx_prompt_community_sharing_user ON prompt_community_sharing (shared_by);
CREATE INDEX IF NOT EXISTS idx_collection_community_sharing_collection ON collection_community_sharing (collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_community_sharing_community ON collection_community_sharing (community_id);
CREATE INDEX IF NOT EXISTS idx_collection_community_sharing_user ON collection_community_sharing (shared_by);
CREATE INDEX IF NOT EXISTS idx_prompts_public_created ON prompts (is_public, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_user_credits_user ON user_credits (user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_created ON credit_transactions (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions (type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_source ON credit_transactions (source);
CREATE INDEX IF NOT EXISTS idx_daily_rewards_user ON daily_rewards (user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_category ON achievements (category);
CREATE INDEX IF NOT EXISTS idx_achievements_active ON achievements (is_active);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements (user_id);
CREATE INDEX IF NOT EXISTS idx_seller_profiles_user ON seller_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_seller_profiles_status ON seller_profiles (onboarding_status);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_prompt ON marketplace_listings (prompt_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_seller ON marketplace_listings (seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_category ON marketplace_listings (category);
CREATE INDEX IF NOT EXISTS idx_digital_licenses_order ON digital_licenses (order_id);
CREATE INDEX IF NOT EXISTS idx_digital_licenses_buyer ON digital_licenses (buyer_id);
CREATE INDEX IF NOT EXISTS idx_digital_licenses_prompt ON digital_licenses (prompt_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_listing ON marketplace_reviews (listing_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_order ON marketplace_reviews (order_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_reviewer ON marketplace_reviews (reviewer_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_rating ON marketplace_reviews (rating);
CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_created ON marketplace_reviews (created_at);
CREATE INDEX IF NOT EXISTS idx_marketplace_disputes_order ON marketplace_disputes (order_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_disputes_initiator ON marketplace_disputes (initiator_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_disputes_respondent ON marketplace_disputes (respondent_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_disputes_status ON marketplace_disputes (status);
CREATE INDEX IF NOT EXISTS idx_marketplace_disputes_escalated ON marketplace_disputes (escalated_at);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_dispute ON dispute_messages (dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_sender ON dispute_messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_admin ON dispute_messages (is_admin_message);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_created ON dispute_messages (created_at);

COMMIT;
