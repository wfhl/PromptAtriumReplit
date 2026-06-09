import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

neonConfig.webSocketConstructor = ws;

// Reconcile DB schema drift: applies scripts/reconcile-schema-drift.sql (idempotent)
// then verifies every UNIQUE constraint / index declared in shared/schema.ts exists.
//
// Run against dev:  npx tsx scripts/reconcile-schema-drift.ts
// The reconciliation itself is idempotent and safe to re-run.

console.log('Reconcile Schema Drift');
console.log('======================\n');

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable not set');
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));

// Expected UNIQUE constraints declared in shared/schema.ts (drizzle naming convention).
const EXPECTED_UNIQUE_CONSTRAINTS = [
  'users_email_unique',
  'users_username_unique',
  'communities_slug_unique',
  'community_invites_code_unique',
  'sub_community_invites_code_unique',
  'collection_community_sharing_collection_id_community_id_unique',
  'categories_name_unique',
  'prompt_types_name_unique',
  'prompt_styles_name_unique',
  'intended_generators_name_unique',
  'recommended_models_name_unique',
  'codex_categories_name_unique',
  'prompt_likes_user_id_prompt_id_unique',
  'prompt_favorites_user_id_prompt_id_unique',
  'user_credits_user_id_unique',
  'unique_user_daily_rewards',
  'achievements_code_unique',
  'unique_user_achievement',
  'seller_profiles_user_id_unique',
  'unique_prompt_listing',
  'marketplace_orders_order_number_unique',
  'digital_licenses_license_key_unique',
  'unique_order_review',
  'unique_user_listing_review',
  'unique_order_dispute',
  'payout_batches_batch_number_unique',
  'platform_settings_key_unique',
  'user_prompt_memory_user_id_unique',
];

// Expected non-unique indexes declared in shared/schema.ts.
const EXPECTED_INDEXES = [
  'IDX_session_expire',
  'idx_communities_parent',
  'idx_communities_path',
  'idx_communities_level',
  'idx_user_communities_user_id',
  'idx_user_communities_community_id',
  'idx_user_communities_sub_community_id',
  'idx_sub_community_admins_user',
  'idx_sub_community_admins_sub_community',
  'idx_sub_community_admins_user_sub_community',
  'idx_sub_community_invites_sub_community',
  'idx_sub_community_invites_code',
  'idx_sub_community_invites_active',
  'idx_sub_community_invites_created_by',
  'idx_collections_user_id',
  'idx_prompt_community_sharing_prompt',
  'idx_prompt_community_sharing_community',
  'idx_prompt_community_sharing_user',
  'idx_collection_community_sharing_collection',
  'idx_collection_community_sharing_community',
  'idx_collection_community_sharing_user',
  'idx_prompts_user_id',
  'idx_prompts_collection_id',
  'idx_prompts_sub_community_id',
  'idx_prompts_public_created',
  'idx_prompts_featured',
  'idx_follows_follower_following',
  'idx_follows_following',
  'idx_follows_follower',
  'idx_activities_user_created',
  'idx_activities_created',
  'idx_activities_action_type',
  'idx_notifications_user_created',
  'idx_notifications_user_unread',
  'idx_prompt_contributions_prompt',
  'idx_prompt_contributions_contributor',
  'idx_user_credits_user',
  'idx_credit_transactions_user_created',
  'idx_credit_transactions_type',
  'idx_credit_transactions_source',
  'idx_daily_rewards_user',
  'idx_achievements_category',
  'idx_achievements_active',
  'idx_user_achievements_user',
  'idx_user_achievements_completed',
  'idx_seller_profiles_user',
  'idx_seller_profiles_status',
  'idx_marketplace_listings_prompt',
  'idx_marketplace_listings_seller',
  'idx_marketplace_listings_status',
  'idx_marketplace_listings_category',
  'idx_marketplace_orders_buyer',
  'idx_marketplace_orders_seller',
  'idx_marketplace_orders_listing',
  'idx_marketplace_orders_status',
  'idx_marketplace_orders_stripe',
  'idx_digital_licenses_order',
  'idx_digital_licenses_buyer',
  'idx_digital_licenses_prompt',
  'idx_marketplace_reviews_listing',
  'idx_marketplace_reviews_order',
  'idx_marketplace_reviews_reviewer',
  'idx_marketplace_reviews_rating',
  'idx_marketplace_reviews_created',
  'idx_marketplace_disputes_order',
  'idx_marketplace_disputes_initiator',
  'idx_marketplace_disputes_respondent',
  'idx_marketplace_disputes_status',
  'idx_marketplace_disputes_escalated',
  'idx_dispute_messages_dispute',
  'idx_dispute_messages_sender',
  'idx_dispute_messages_admin',
  'idx_dispute_messages_created',
  'idx_transaction_ledger_order',
  'idx_transaction_ledger_from_user',
  'idx_transaction_ledger_to_user',
  'idx_transaction_ledger_type',
  'idx_transaction_ledger_status',
  'idx_transaction_ledger_created',
  'idx_transaction_ledger_stripe_payout',
  'idx_payout_batches_status',
  'idx_payout_batches_method',
  'idx_payout_batches_scheduled',
  'idx_payout_batches_created',
  'idx_platform_settings_key',
  'idx_platform_settings_category',
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const sql = readFileSync(join(__dirname, 'reconcile-schema-drift.sql'), 'utf8');

    console.log('Applying reconcile-schema-drift.sql (idempotent)...');
    await pool.query(sql);
    console.log('  -> applied.\n');

    console.log('Verifying declared UNIQUE constraints...');
    const { rows: cRows } = await pool.query(
      `SELECT conname FROM pg_constraint WHERE contype = 'u'`
    );
    const haveConstraints = new Set(cRows.map((r) => r.conname));
    const missingConstraints = EXPECTED_UNIQUE_CONSTRAINTS.filter(
      (n) => !haveConstraints.has(n)
    );

    console.log('Verifying declared indexes...');
    const { rows: iRows } = await pool.query(
      `SELECT indexname FROM pg_indexes WHERE schemaname = 'public'`
    );
    const haveIndexes = new Set(iRows.map((r) => r.indexname));
    const missingIndexes = EXPECTED_INDEXES.filter((n) => !haveIndexes.has(n));

    console.log('\nResults');
    console.log('-------');
    console.log(
      `UNIQUE constraints: ${EXPECTED_UNIQUE_CONSTRAINTS.length - missingConstraints.length}/${EXPECTED_UNIQUE_CONSTRAINTS.length} present`
    );
    console.log(
      `Indexes:            ${EXPECTED_INDEXES.length - missingIndexes.length}/${EXPECTED_INDEXES.length} present`
    );

    if (missingConstraints.length || missingIndexes.length) {
      if (missingConstraints.length) {
        console.error('\nMISSING UNIQUE constraints:', missingConstraints);
      }
      if (missingIndexes.length) {
        console.error('\nMISSING indexes:', missingIndexes);
      }
      console.error('\nFAILED: schema drift remains.');
      process.exitCode = 1;
    } else {
      console.log('\nOK: all declared UNIQUE constraints and indexes are present.');
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Error reconciling schema drift:', err);
  process.exit(1);
});
