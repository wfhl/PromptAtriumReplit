import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  boolean,
  integer,
  decimal,
  char,
  serial,
  unique,
  primaryKey,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { enum: ["user", "community_admin", "sub_community_admin", "super_admin", "global_admin", "developer"] }).default("user"),
  
  // Extended profile fields
  username: varchar("username").unique(),
  bio: text("bio"),
  birthday: timestamp("birthday"),
  website: varchar("website"),
  
  // Preset social media handles
  twitterHandle: varchar("twitter_handle"),
  githubHandle: varchar("github_handle"),
  linkedinHandle: varchar("linkedin_handle"),
  instagramHandle: varchar("instagram_handle"),
  deviantartHandle: varchar("deviantart_handle"),
  blueskyHandle: varchar("bluesky_handle"),
  tiktokHandle: varchar("tiktok_handle"),
  redditHandle: varchar("reddit_handle"),
  patreonHandle: varchar("patreon_handle"),
  
  // Custom social links - array of {platform: string, url: string, handle?: string}
  customSocials: jsonb("custom_socials").default([]),
  
  // Privacy settings
  profileVisibility: varchar("profile_visibility", { 
    enum: ["public", "private"] 
  }).default("public"),
  emailVisibility: boolean("email_visibility").default(false),
  showStats: boolean("show_stats").default(true),
  showBirthday: boolean("show_birthday").default(false),
  showNsfw: boolean("show_nsfw").default(true),

  // Preferences
  defaultLandingPage: varchar("default_landing_page", {
    enum: ["dashboard", "my-prompts"]
  }).default("dashboard"),
  
  // Onboarding tracking
  hasCompletedIntro: boolean("has_completed_intro").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Projects table
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Communities table
export const communities = pgTable("communities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  slug: varchar("slug").notNull().unique(),
  imageUrl: varchar("image_url"),
  isActive: boolean("is_active").default(true),
  // Hierarchy fields - parentCommunityId = null means global community, otherwise it's a private community
  parentCommunityId: varchar("parent_community_id").references((): AnyPgColumn => communities.id),
  level: integer("level").default(0),
  path: text("path"),
  // Creator tracking
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Index for sub-communities lookup
  index("idx_communities_parent").on(table.parentCommunityId),
  // Index for efficient path-based queries
  index("idx_communities_path").on(table.path),
  // Index for level-based queries
  index("idx_communities_level").on(table.level),
]);

// Communities types
export const insertCommunitySchema = createInsertSchema(communities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCommunity = z.infer<typeof insertCommunitySchema>;
export type Community = typeof communities.$inferSelect;

// User communities membership table
export const userCommunities = pgTable("user_communities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  communityId: varchar("community_id").notNull().references(() => communities.id),
  subCommunityId: varchar("sub_community_id").references(() => communities.id),
  role: varchar("role", { enum: ["member", "admin"] }).default("member"),
  status: varchar("status", { enum: ["pending", "accepted", "rejected"] }).default("pending"),
  invitedBy: varchar("invited_by").references(() => users.id),
  joinedAt: timestamp("joined_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
}, (table) => [
  // Foreign key indexes
  index("idx_user_communities_user_id").on(table.userId),
  index("idx_user_communities_community_id").on(table.communityId),
  index("idx_user_communities_sub_community_id").on(table.subCommunityId),
]);

// User communities types
export const insertUserCommunitySchema = createInsertSchema(userCommunities).omit({
  id: true,
  joinedAt: true,
});

export type InsertUserCommunity = z.infer<typeof insertUserCommunitySchema>;
export type UserCommunity = typeof userCommunities.$inferSelect;

// Prompt history table - tracks all generated prompts by users
export const promptHistory = pgTable("prompt_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  promptText: text("prompt_text").notNull(),
  templateUsed: varchar("template_used"),
  settings: jsonb("settings").default({}), // Stores tone, style, and other generator settings
  metadata: jsonb("metadata").default({}), // Stores character presets, scenarios, etc.
  isSaved: boolean("is_saved").default(false), // Track if already saved to library
  createdAt: timestamp("created_at").defaultNow(),
});

// Community admins table - tracks which users are admins of which communities
export const communityAdmins = pgTable("community_admins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  communityId: varchar("community_id").notNull().references(() => communities.id),
  assignedBy: varchar("assigned_by").notNull().references(() => users.id),
  assignedAt: timestamp("assigned_at").defaultNow(),
});

// Sub-community admins table - tracks admin permissions for sub-communities
export const subCommunityAdmins = pgTable("sub_community_admins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  subCommunityId: varchar("sub_community_id").notNull().references(() => communities.id),
  assignedBy: varchar("assigned_by").notNull().references(() => users.id),
  permissions: jsonb("permissions").default({}),
  assignedAt: timestamp("assigned_at").defaultNow(),
}, (table) => [
  // Index for user lookups
  index("idx_sub_community_admins_user").on(table.userId),
  // Index for sub-community lookups
  index("idx_sub_community_admins_sub_community").on(table.subCommunityId),
  // Composite index for unique constraint
  index("idx_sub_community_admins_user_sub_community").on(table.userId, table.subCommunityId),
]);

// Sub-community admins types
export const insertSubCommunityAdminSchema = createInsertSchema(subCommunityAdmins).omit({
  id: true,
  assignedAt: true,
});

export type InsertSubCommunityAdmin = z.infer<typeof insertSubCommunityAdminSchema>;
export type SubCommunityAdmin = typeof subCommunityAdmins.$inferSelect;

// Community invites table - tracks invite codes and their usage
export const communityInvites = pgTable("community_invites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code").notNull().unique(),
  communityId: varchar("community_id").notNull().references(() => communities.id),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  maxUses: integer("max_uses").default(1),
  currentUses: integer("current_uses").default(0),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sub-community invites table - tracks invite codes for sub-communities
export const subCommunityInvites = pgTable("sub_community_invites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code").notNull().unique(),
  subCommunityId: varchar("sub_community_id").notNull().references(() => communities.id),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  maxUses: integer("max_uses").default(1),
  currentUses: integer("current_uses").default(0),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  role: varchar("role", { enum: ["member", "admin"] }).default("member"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Index for sub-community lookups
  index("idx_sub_community_invites_sub_community").on(table.subCommunityId),
  // Index for code lookups
  index("idx_sub_community_invites_code").on(table.code),
  // Index for active invites
  index("idx_sub_community_invites_active").on(table.isActive),
  // Index for creator lookups
  index("idx_sub_community_invites_created_by").on(table.createdBy),
]);

// Sub-community invites types
export const insertSubCommunityInviteSchema = createInsertSchema(subCommunityInvites).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSubCommunityInvite = z.infer<typeof insertSubCommunityInviteSchema>;
export type SubCommunityInvite = typeof subCommunityInvites.$inferSelect;

// Collections table
export const collections = pgTable("collections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  userId: varchar("user_id").references(() => users.id),
  communityId: varchar("community_id").references(() => communities.id),
  type: varchar("type", { enum: ["user", "community", "global"] }).notNull().default("user"),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Foreign key index
  index("idx_collections_user_id").on(table.userId),
]);

// Prompt community sharing table - tracks which communities a prompt is shared with
export const promptCommunitySharing = pgTable("prompt_community_sharing", {
  promptId: char("prompt_id", { length: 10 }).notNull().references(() => prompts.id, { onDelete: "cascade" }),
  communityId: varchar("community_id").notNull().references(() => communities.id, { onDelete: "cascade" }),
  sharedBy: varchar("shared_by").notNull().references(() => users.id),
  sharedAt: timestamp("shared_at").defaultNow(),
}, (table) => [
  // Composite primary key on promptId and communityId
  primaryKey({ columns: [table.promptId, table.communityId] }),
  // Indexes for efficient queries
  index("idx_prompt_community_sharing_prompt").on(table.promptId),
  index("idx_prompt_community_sharing_community").on(table.communityId),
  index("idx_prompt_community_sharing_user").on(table.sharedBy),
]);

// Collection community sharing table - tracks which communities a collection is shared with  
export const collectionCommunitySharing = pgTable("collection_community_sharing", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  collectionId: varchar("collection_id").notNull().references(() => collections.id, { onDelete: "cascade" }),
  communityId: varchar("community_id").notNull().references(() => communities.id, { onDelete: "cascade" }),
  sharedBy: varchar("shared_by").notNull().references(() => users.id),
  sharedAt: timestamp("shared_at").defaultNow(),
}, (table) => [
  // Composite unique constraint
  unique().on(table.collectionId, table.communityId),
  // Indexes for efficient queries
  index("idx_collection_community_sharing_collection").on(table.collectionId),
  index("idx_collection_community_sharing_community").on(table.communityId),
  index("idx_collection_community_sharing_user").on(table.sharedBy),
]);

// Categories table
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  description: text("description"),
  userId: varchar("user_id").references(() => users.id),
  type: varchar("type", { enum: ["user", "global"] }).notNull().default("user"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Prompt types table
export const promptTypes = pgTable("prompt_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  description: text("description"),
  userId: varchar("user_id").references(() => users.id),
  type: varchar("type", { enum: ["user", "global"] }).notNull().default("user"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Prompt styles table
export const promptStyles = pgTable("prompt_styles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  description: text("description"),
  userId: varchar("user_id").references(() => users.id),
  type: varchar("type", { enum: ["user", "global"] }).notNull().default("user"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Prompt style rule templates table (renamed from prompt_templates)
export const promptStyleRuleTemplates = pgTable("prompt_stylerule_templates", {
  id: varchar("id").primaryKey(),
  templateId: varchar("template_id"),
  name: varchar("name"),
  template: text("template"),
  description: text("description"),
  category: varchar("category"),
  isCustom: boolean("is_custom"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at"),
  templateType: varchar("template_type"),
  isDefault: boolean("is_default"),
  userId: varchar("user_id").references(() => users.id),
  systemPrompt: text("system_prompt"), // Renamed from master_prompt
  llmProvider: varchar("llm_provider"),
  llmModel: varchar("llm_model"),
  useHappyTalk: boolean("use_happy_talk"),
  compressPrompt: boolean("compress_prompt"),
  compressionLevel: integer("compression_level"),
});

// Character presets table for Quick Prompt
export const characterPresets = pgTable("character_presets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  gender: varchar("gender"),
  role: varchar("role"),
  description: text("description"),
  isFavorite: boolean("is_favorite").default(false),
  userId: varchar("user_id").references(() => users.id),
  isGlobal: boolean("is_global").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Character preset types
export const insertCharacterPresetSchema = createInsertSchema(characterPresets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCharacterPreset = z.infer<typeof insertCharacterPresetSchema>;
export type CharacterPreset = typeof characterPresets.$inferSelect;

// Prompt templates table for Quick Prompt
export const promptTemplates = pgTable("prompt_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id"),
  name: varchar("name").notNull(),
  description: text("description"),
  template: text("template"),
  templateType: varchar("template_type"),
  masterPrompt: text("master_prompt"),
  llmProvider: varchar("llm_provider").default("openai"),
  llmModel: varchar("llm_model").default("gpt-4o"),
  useHappyTalk: boolean("use_happy_talk").default(false),
  compressPrompt: boolean("compress_prompt").default(false),
  compressionLevel: varchar("compression_level").default("medium"),
  userId: varchar("user_id").references(() => users.id),
  isGlobal: boolean("is_global").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Intended generators table
export const intendedGenerators = pgTable("intended_generators", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  description: text("description"),
  userId: varchar("user_id").references(() => users.id),
  type: varchar("type", { enum: ["user", "global"] }).notNull().default("user"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Recommended models table
export const recommendedModels = pgTable("recommended_models", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  description: text("description"),
  userId: varchar("user_id").references(() => users.id),
  type: varchar("type", { enum: ["user", "global"] }).notNull().default("user"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Legacy tables - preserved to prevent data loss during migration
// These tables exist in the database but are not actively used in the current application
export const aesthetics = pgTable("aesthetics", {
  id: varchar("id").primaryKey(),
  original_id: integer("original_id"),
  name: varchar("name"), // Keep as is without length restriction
  description: text("description"),
  era: varchar("era"), // Keep as is without length restriction
  categories: text("categories"), // Keep as text, not array
  tags: text("tags"), // Keep as text, not array
  visual_elements: text("visual_elements"), // Keep as text, not array
  color_palette: text("color_palette"), // Keep as text, not array
  mood_keywords: text("mood_keywords"), // Keep as text, not array
  related_aesthetics: text("related_aesthetics"), // Keep as text, not array
  media_examples: text("media_examples"),
  reference_images: text("reference_images"), // Keep as text, not array
  origin: text("origin"),
  category: varchar("category"),
  usage_count: integer("usage_count"),
  popularity: decimal("popularity", { precision: 5, scale: 2 }), // Match existing precision
  imported_at: timestamp("imported_at"),
  created_at: timestamp("created_at"),
  updated_at: timestamp("updated_at"),
});

export const prompt_components = pgTable("prompt_components", {
  id: varchar("id").primaryKey(),
  original_id: integer("original_id"),
  category: varchar("category"), // Keep without length restriction
  value: text("value"),
  description: text("description"),
  subcategory: varchar("subcategory"),
  anatomy_group: varchar("anatomy_group"), // Group for organized display (Subject, Style, Environment, etc.)
  is_nsfw: boolean("is_nsfw").default(false), // Flag for NSFW content
  usage_count: integer("usage_count"),
  order_index: integer("order_index"),
  is_default: boolean("is_default"),
  imported_at: timestamp("imported_at"),
  created_at: timestamp("created_at"),
  updated_at: timestamp("updated_at"),
});

// Main prompts table
export const prompts = pgTable("prompts", {
  id: char("id", { length: 10 }).primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  category: varchar("category"),
  promptType: varchar("prompt_type"),
  promptStyle: varchar("prompt_style"),
  categories: text("categories").array(),
  promptTypes: text("prompt_types").array(),
  promptStyles: text("prompt_styles").array(),
  tags: text("tags").array(),
  tagsNormalized: text("tags_normalized").array(),
  isPublic: boolean("is_public").default(true),
  isFeatured: boolean("is_featured").default(false),
  isHidden: boolean("is_hidden").default(false),
  isNsfw: boolean("is_nsfw").default(false),
  status: varchar("status", { enum: ["draft", "published", "archived"] }).default("draft"),
  exampleImagesUrl: text("example_images_url").array(),
  notes: text("notes"),
  author: varchar("author"),
  sourceUrl: varchar("source_url"),
  version: integer("version").default(1),
  branchOf: char("branch_of", { length: 10 }),
  usageCount: integer("usage_count").default(0),
  likes: integer("likes").default(0),
  qualityScore: decimal("quality_score", { precision: 3, scale: 2 }).default("0.00"),
  intendedGenerator: varchar("intended_generator"),
  intendedGenerators: text("intended_generators").array(),
  recommendedModels: text("recommended_models").array(),
  technicalParams: jsonb("technical_params"),
  variables: jsonb("variables"),
  // Extended metadata fields for comprehensive import support
  intendedRecipient: varchar("intended_recipient"),
  specificService: varchar("specific_service"),
  styleKeywords: text("style_keywords"),
  difficultyLevel: varchar("difficulty_level"),
  useCase: text("use_case"),
  additionalMetadata: jsonb("additional_metadata"), // For any unmapped fields
  projectId: varchar("project_id").references(() => projects.id),
  collectionId: varchar("collection_id").references(() => collections.id),
  collectionIds: text("collection_ids").array(),
  relatedPrompts: text("related_prompts").array(),
  license: varchar("license"),
  lastUsedAt: timestamp("last_used_at"),
  userId: varchar("user_id").notNull().references(() => users.id),
  subCommunityId: varchar("sub_community_id").references(() => communities.id),
  subCommunityVisibility: varchar("sub_community_visibility", {
    enum: ["private", "parent_community", "public"]
  }).default("private"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  promptContent: text("prompt_content").notNull(),
  negativePrompt: text("negative_prompt"),
}, (table) => [
  // Foreign key indexes
  index("idx_prompts_user_id").on(table.userId),
  index("idx_prompts_collection_id").on(table.collectionId),
  index("idx_prompts_sub_community_id").on(table.subCommunityId),
  // Query optimization indexes
  index("idx_prompts_public_created").on(table.isPublic, table.createdAt),
  // Partial index for featured prompts
  index("idx_prompts_featured").on(table.isFeatured).where(sql`${table.isFeatured} = true`),
]);

// Prompt likes table - tracks individual likes/hearts
export const promptLikes = pgTable("prompt_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  promptId: char("prompt_id", { length: 10 }).notNull().references(() => prompts.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    uniqueLike: unique().on(table.userId, table.promptId),
  };
});

// Prompt favorites table - tracks user bookmarks/favorites
export const promptFavorites = pgTable("prompt_favorites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  promptId: char("prompt_id", { length: 10 }).notNull().references(() => prompts.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    uniqueFavorite: unique().on(table.userId, table.promptId),
  };
});

// Prompt ratings table
export const promptRatings = pgTable("prompt_ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  promptId: char("prompt_id", { length: 10 }).notNull().references(() => prompts.id),
  rating: integer("rating").notNull(),
  review: text("review"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Follows table - tracks who follows whom
export const follows = pgTable("follows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  followerId: varchar("follower_id").notNull().references(() => users.id),
  followingId: varchar("following_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  // Composite index for fast lookups of who follows whom
  index("idx_follows_follower_following").on(table.followerId, table.followingId),
  // Index for finding all followers of a user
  index("idx_follows_following").on(table.followingId),
  // Index for finding all users someone follows
  index("idx_follows_follower").on(table.followerId),
]);

// Activities table - tracks user activities for the feed
export const activities = pgTable("activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  actionType: varchar("action_type", { 
    enum: ["created_prompt", "shared_prompt", "liked_prompt", "favorited_prompt", 
           "followed_user", "joined_community", "created_collection"] 
  }).notNull(),
  targetId: varchar("target_id"), // ID of the prompt, user, collection, etc.
  targetType: varchar("target_type", { 
    enum: ["prompt", "user", "collection", "community"] 
  }),
  metadata: jsonb("metadata"), // Additional data about the activity
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  // Index for user's activity timeline
  index("idx_activities_user_created").on(table.userId, table.createdAt),
  // Index for fetching recent activities
  index("idx_activities_created").on(table.createdAt),
  // Index for filtering by action type
  index("idx_activities_action_type").on(table.actionType),
]);

// Notifications table - tracks notifications for user actions
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id), // Who receives the notification
  type: varchar("type", { 
    enum: ["follow", "like", "branch", "approval", "contribution_approved", "comment", "mention", "image_contribution"] 
  }).notNull(),
  message: text("message").notNull(),
  relatedUserId: varchar("related_user_id").references(() => users.id), // Who triggered the notification
  relatedPromptId: char("related_prompt_id", { length: 10 }).references(() => prompts.id), // Related prompt if applicable
  relatedListId: varchar("related_list_id").references(() => codexUserLists.id), // For codex list approvals
  relatedImageId: varchar("related_image_id"), // For image contribution notifications
  isRead: boolean("is_read").default(false),
  metadata: jsonb("metadata"), // Additional notification-specific data
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  // Index for fetching user's notifications
  index("idx_notifications_user_created").on(table.userId, table.createdAt),
  // Index for unread notifications count
  index("idx_notifications_user_unread").on(table.userId, table.isRead),
]);

// Expo push notification device tokens. The mobile companion is browse-only and
// unauthenticated, so a token is the device identity (userId is optional and
// only set if a logged-in session ever registers one).
export const pushTokens = pgTable("push_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: text("token").notNull().unique(), // Expo push token (ExponentPushToken[...])
  userId: varchar("user_id").references(() => users.id), // Optional owner if authenticated
  platform: varchar("platform"), // "ios" | "android" | "web"
  enabled: boolean("enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_push_tokens_enabled").on(table.enabled),
]);

// Wordsmith Codex Tables

// Categories for organizing terms (e.g., "Styles", "Lighting", "Aesthetics", etc.)
export const codexCategories = pgTable("codex_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  description: text("description"),
  icon: varchar("icon"), // Icon name for UI display (e.g., "palette", "camera", "sun")
  color: varchar("color"), // Color for UI display (e.g., "blue", "green", "purple")
  orderIndex: integer("order_index").default(0),
  isActive: boolean("is_active").default(true),
  parentCategoryId: varchar("parent_category_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Individual terms/wildcards within categories
export const codexTerms = pgTable("codex_terms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").notNull().references(() => codexCategories.id),
  term: varchar("term").notNull(),
  description: text("description"),
  examples: text("examples"), // Example usage of the term
  relatedTerms: jsonb("related_terms").default([]), // Array of related term IDs
  metadata: jsonb("metadata").default({}), // Additional metadata for the term
  createdBy: varchar("created_by").references(() => users.id),
  isOfficial: boolean("is_official").default(false), // Whether this is an official term vs user-contributed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User-curated wildcard lists
export const codexUserLists = pgTable("codex_user_lists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: varchar("name").notNull(),
  description: text("description"),
  categoryId: varchar("category_id").references(() => codexCategories.id), // Optional category association
  isPublic: boolean("is_public").default(false),
  downloadCount: integer("download_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Terms in user lists (many-to-many relationship)
export const codexUserTerms = pgTable("codex_user_terms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userListId: varchar("user_list_id").notNull().references(() => codexUserLists.id, { onDelete: 'cascade' }),
  termId: varchar("term_id").references(() => codexTerms.id), // Can be null for custom terms
  customTerm: varchar("custom_term"), // User's custom term if not from official list
  customDescription: text("custom_description"),
  orderIndex: integer("order_index").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Example images for terms (for future implementation)
export const codexTermImages = pgTable("codex_term_images", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  termId: varchar("term_id").notNull().references(() => codexTerms.id),
  imageUrl: varchar("image_url").notNull(),
  caption: text("caption"),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  isApproved: boolean("is_approved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// User contributions for new terms
export const codexContributions = pgTable("codex_contributions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  term: varchar("term").notNull(),
  categoryId: varchar("category_id").notNull().references(() => codexCategories.id),
  description: text("description"),
  examples: text("examples"),
  submittedBy: varchar("submitted_by").notNull().references(() => users.id),
  status: varchar("status", { enum: ["pending", "approved", "rejected"] }).default("pending"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewNotes: text("review_notes"),
  approvedTermId: varchar("approved_term_id").references(() => codexTerms.id), // If approved, links to created term
  createdAt: timestamp("created_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
});

// User's assembled strings (both presets and wildcards)
export const codexAssembledStrings = pgTable("codex_assembled_strings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: varchar("name").notNull(),
  type: varchar("type", { enum: ["preset", "wildcard"] }).notNull().default("preset"), // Distinguish between presets and wildcards
  content: text("content").notNull(), // Changed from stringContent to match database
  metadata: jsonb("metadata").default({}), // Stores termsUsed and other metadata
  isPublic: boolean("is_public").default(false), // For future sharing functionality
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Prompt image contributions table - tracks images added by other users
export const promptImageContributions = pgTable("prompt_image_contributions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  promptId: char("prompt_id", { length: 10 }).notNull().references(() => prompts.id),
  imageUrl: varchar("image_url").notNull(),
  contributorId: varchar("contributor_id").notNull().references(() => users.id),
  caption: text("caption"),
  isApproved: boolean("is_approved").default(true), // Auto-approve for now, can add moderation later
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  // Index for fetching images for a prompt
  index("idx_prompt_contributions_prompt").on(table.promptId),
  // Index for fetching user's contributions
  index("idx_prompt_contributions_contributor").on(table.contributorId),
]);

// Credits System Tables

// User credits table - tracks user credit balances
export const userCredits = pgTable("user_credits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id),
  balance: integer("balance").notNull().default(0),
  lifetimeEarned: integer("lifetime_earned").notNull().default(0),
  lifetimeSpent: integer("lifetime_spent").notNull().default(0),
  lastActivity: timestamp("last_activity").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Index for quick user lookups
  index("idx_user_credits_user").on(table.userId),
]);

// Credit transactions table - logs all credit movements
export const creditTransactions = pgTable("credit_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: varchar("type", { 
    enum: ["earn", "spend", "bonus", "refund", "adjustment"] 
  }).notNull(),
  amount: integer("amount").notNull(), // Positive for earn, negative for spend
  balanceBefore: integer("balance_before").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  source: varchar("source", {
    enum: ["daily_login", "streak_bonus", "prompt_share", "profile_completion", "first_prompt", "purchase", "admin_adjustment", "refund", "review", "achievement", "helpful_vote", "public_prompt", "other"]
  }).notNull(),
  referenceId: varchar("reference_id"), // ID of related entity (prompt, order, etc.)
  referenceType: varchar("reference_type"), // Type of related entity
  description: text("description"),
  metadata: jsonb("metadata").default({}), // Additional transaction data
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  // Index for user transaction history
  index("idx_credit_transactions_user_created").on(table.userId, table.createdAt),
  // Index for transaction type queries
  index("idx_credit_transactions_type").on(table.type),
  // Index for source tracking
  index("idx_credit_transactions_source").on(table.source),
]);

// Daily rewards table - tracks daily login streaks
export const dailyRewards = pgTable("daily_rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  lastClaimDate: timestamp("last_claim_date").notNull(),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  totalDaysClaimed: integer("total_days_claimed").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Unique constraint to ensure one record per user
  unique("unique_user_daily_rewards").on(table.userId),
  // Index for quick user lookups
  index("idx_daily_rewards_user").on(table.userId),
]);

// Achievement definitions table
export const achievements = pgTable("achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code").notNull().unique(), // Unique code for achievement (e.g., "first_steps")
  name: varchar("name").notNull(),
  description: text("description").notNull(),
  creditReward: integer("credit_reward").notNull(),
  iconName: varchar("icon_name"), // Icon identifier for UI
  category: varchar("category", { 
    enum: ["content", "social", "commerce", "community", "special"] 
  }).notNull(),
  requiredCount: integer("required_count").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Index for category queries
  index("idx_achievements_category").on(table.category),
  // Index for active achievements
  index("idx_achievements_active").on(table.isActive),
]);

// User achievement progress table
export const userAchievements = pgTable("user_achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  achievementId: varchar("achievement_id").notNull().references(() => achievements.id),
  progress: integer("progress").notNull().default(0),
  isCompleted: boolean("is_completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  creditsClaimed: boolean("credits_claimed").notNull().default(false),
  claimedAt: timestamp("claimed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Unique constraint - one record per user per achievement
  unique("unique_user_achievement").on(table.userId, table.achievementId),
  // Index for user's achievements
  index("idx_user_achievements_user").on(table.userId),
  // Index for completed achievements
  index("idx_user_achievements_completed").on(table.isCompleted),
]);

// Marketplace Tables

// Seller profiles table - tracks seller information and stats
export const sellerProfiles = pgTable("seller_profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique().references(() => users.id),
  stripeAccountId: varchar("stripe_account_id"),
  onboardingStatus: varchar("onboarding_status", { 
    enum: ["not_started", "pending", "completed", "rejected"] 
  }).notNull().default("not_started"),
  businessType: varchar("business_type", { 
    enum: ["individual", "business"] 
  }).default("individual"),
  taxInfo: jsonb("tax_info").$type<{
    taxId?: string;
    vatNumber?: string;
    businessName?: string;
    businessAddress?: string;
  }>(),
  payoutMethod: varchar("payout_method", {
    enum: ["stripe", "paypal"]
  }).notNull().default("stripe"),
  paypalEmail: varchar("paypal_email"),
  totalSales: integer("total_sales").notNull().default(0),
  totalRevenueCents: integer("total_revenue_cents").notNull().default(0),
  totalCreditsEarned: integer("total_credits_earned").notNull().default(0),
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }).default("0"),
  commissionRate: integer("commission_rate").notNull().default(15), // Percentage as integer (15 = 15%)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Index for quick user lookups
  index("idx_seller_profiles_user").on(table.userId),
  // Index for onboarding status queries
  index("idx_seller_profiles_status").on(table.onboardingStatus),
]);

// Marketplace listings table - tracks prompts listed for sale
export const marketplaceListings = pgTable("marketplace_listings", {
  id: text("id").primaryKey(),
  promptId: char("prompt_id", { length: 10 }).notNull().references(() => prompts.id),
  sellerId: varchar("seller_id").notNull().references(() => users.id),
  title: varchar("title").notNull(),
  description: text("description"),
  priceCents: integer("price_cents"), // Price in cents (null if not accepting money)
  creditPrice: integer("credit_price"), // Price in credits (null if not accepting credits)
  acceptsMoney: boolean("accepts_money").notNull().default(true),
  acceptsCredits: boolean("accepts_credits").notNull().default(true),
  previewPercentage: integer("preview_percentage").notNull().default(20), // % of prompt shown as preview
  tags: text().array().default([]),
  category: varchar("category"),
  status: varchar("status", { 
    enum: ["draft", "active", "paused", "sold_out"] 
  }).notNull().default("draft"),
  salesCount: integer("sales_count").notNull().default(0),
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }).default("0"),
  reviewCount: integer("review_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Index for prompt lookups
  index("idx_marketplace_listings_prompt").on(table.promptId),
  // Index for seller's listings
  index("idx_marketplace_listings_seller").on(table.sellerId),
  // Index for active listings queries
  index("idx_marketplace_listings_status").on(table.status),
  // Index for category queries
  index("idx_marketplace_listings_category").on(table.category),
  // Unique constraint - one listing per prompt
  unique("unique_prompt_listing").on(table.promptId),
]);

// Marketplace orders table - tracks all purchases in the marketplace
export const marketplaceOrders = pgTable("marketplace_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderNumber: varchar("order_number").notNull().unique(), // Human-readable order ID
  buyerId: varchar("buyer_id").notNull().references(() => users.id),
  sellerId: varchar("seller_id").notNull().references(() => users.id),
  listingId: text("listing_id").notNull().references(() => marketplaceListings.id),
  paymentMethod: varchar("payment_method", { 
    enum: ["stripe", "credits"] 
  }).notNull(),
  stripePaymentIntentId: varchar("stripe_payment_intent_id"), // For Stripe payments
  amountCents: integer("amount_cents"), // Total amount in cents (for money transactions)
  creditAmount: integer("credit_amount"), // Total amount in credits (for credit transactions)
  platformFeeCents: integer("platform_fee_cents"), // Platform fee in cents
  platformFeeCredits: integer("platform_fee_credits"), // Platform fee in credits
  sellerPayoutCents: integer("seller_payout_cents"), // Amount seller receives in cents
  sellerPayoutCredits: integer("seller_payout_credits"), // Amount seller receives in credits
  status: varchar("status", { 
    enum: ["pending", "completed", "failed", "refunded"] 
  }).notNull().default("pending"),
  deliveredAt: timestamp("delivered_at"), // When the content was delivered
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  // Index for buyer's orders
  index("idx_marketplace_orders_buyer").on(table.buyerId),
  // Index for seller's orders
  index("idx_marketplace_orders_seller").on(table.sellerId),
  // Index for listing orders
  index("idx_marketplace_orders_listing").on(table.listingId),
  // Index for order status
  index("idx_marketplace_orders_status").on(table.status),
  // Index for Stripe payment intent lookups
  index("idx_marketplace_orders_stripe").on(table.stripePaymentIntentId),
]);

// Digital licenses table - stores licenses for purchased digital content
export const digitalLicenses = pgTable("digital_licenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => marketplaceOrders.id),
  promptId: char("prompt_id", { length: 10 }).notNull().references(() => prompts.id),
  buyerId: varchar("buyer_id").notNull().references(() => users.id),
  licenseKey: varchar("license_key").notNull().unique(), // Unique license identifier
  usageRights: jsonb("usage_rights").$type<{
    personal: boolean;
    commercial: boolean;
    resale: boolean;
    modification: boolean;
    attribution: boolean;
  }>().default({
    personal: true,
    commercial: true,
    resale: false,
    modification: true,
    attribution: false,
  }),
  commercialUse: boolean("commercial_use").notNull().default(true), // Simplified flag
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  // Index for order lookups
  index("idx_digital_licenses_order").on(table.orderId),
  // Index for buyer's licenses
  index("idx_digital_licenses_buyer").on(table.buyerId),
  // Index for prompt licenses
  index("idx_digital_licenses_prompt").on(table.promptId),
]);

// Marketplace reviews table - tracks reviews for marketplace listings
export const marketplaceReviews = pgTable("marketplace_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => marketplaceOrders.id),
  listingId: varchar("listing_id").notNull().references(() => marketplaceListings.id),
  reviewerId: varchar("reviewer_id").notNull().references(() => users.id),
  rating: integer("rating").notNull(), // 1-5 stars
  title: varchar("title"),
  comment: text("comment").notNull(),
  verifiedPurchase: boolean("verified_purchase").notNull().default(true),
  helpfulCount: integer("helpful_count").notNull().default(0),
  sellerResponse: text("seller_response"),
  sellerRespondedAt: timestamp("seller_responded_at"),
  editedAt: timestamp("edited_at"), // Track when review was edited
  creditsAwarded: boolean("credits_awarded").notNull().default(false), // Track if review credits were given
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Index for listing reviews
  index("idx_marketplace_reviews_listing").on(table.listingId),
  // Index for order reviews
  index("idx_marketplace_reviews_order").on(table.orderId),
  // Index for reviewer's reviews
  index("idx_marketplace_reviews_reviewer").on(table.reviewerId),
  // Index for rating queries
  index("idx_marketplace_reviews_rating").on(table.rating),
  // Index for creation date ordering
  index("idx_marketplace_reviews_created").on(table.createdAt),
  // Unique constraint - one review per order
  unique("unique_order_review").on(table.orderId),
  // Composite unique constraint - one review per user per listing
  unique("unique_user_listing_review").on(table.reviewerId, table.listingId),
]);

// Marketplace disputes table - tracks disputes between buyers and sellers
export const marketplaceDisputes = pgTable("marketplace_disputes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => marketplaceOrders.id),
  initiatedBy: varchar("initiated_by", {
    enum: ["buyer", "seller"]
  }).notNull(),
  initiatorId: varchar("initiator_id").notNull().references(() => users.id),
  respondentId: varchar("respondent_id").notNull().references(() => users.id),
  status: varchar("status", {
    enum: ["open", "in_progress", "resolved", "closed"]
  }).notNull().default("open"),
  reason: varchar("reason", {
    enum: ["item_not_as_described", "quality_issue", "not_received", "other"]
  }).notNull(),
  description: text("description").notNull(),
  resolution: text("resolution"),
  refundAmountCents: integer("refund_amount_cents"),
  creditRefundAmount: integer("credit_refund_amount"),
  escalatedAt: timestamp("escalated_at"),
  lastRespondedAt: timestamp("last_responded_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
}, (table) => [
  // Index for order disputes
  index("idx_marketplace_disputes_order").on(table.orderId),
  // Index for initiator's disputes
  index("idx_marketplace_disputes_initiator").on(table.initiatorId),
  // Index for respondent's disputes
  index("idx_marketplace_disputes_respondent").on(table.respondentId),
  // Index for status queries
  index("idx_marketplace_disputes_status").on(table.status),
  // Index for escalation checks
  index("idx_marketplace_disputes_escalated").on(table.escalatedAt),
  // Unique constraint - one dispute per order
  unique("unique_order_dispute").on(table.orderId),
]);

// Dispute messages table - tracks communication within disputes
export const disputeMessages = pgTable("dispute_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  disputeId: varchar("dispute_id").notNull().references(() => marketplaceDisputes.id),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  message: text("message").notNull(),
  isAdminMessage: boolean("is_admin_message").notNull().default(false),
  attachments: jsonb("attachments").$type<{
    url: string;
    type: string;
    name: string;
  }[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  // Index for dispute messages
  index("idx_dispute_messages_dispute").on(table.disputeId),
  // Index for sender's messages
  index("idx_dispute_messages_sender").on(table.senderId),
  // Index for admin messages
  index("idx_dispute_messages_admin").on(table.isAdminMessage),
  // Index for creation date ordering
  index("idx_dispute_messages_created").on(table.createdAt),
]);

// Transaction ledger table - comprehensive tracking of all financial movements
export const transactionLedger = pgTable("transaction_ledger", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => marketplaceOrders.id),
  type: varchar("type", {
    enum: ["purchase", "commission", "payout", "refund", "adjustment", "withdrawal_request"]
  }).notNull(),
  status: varchar("status", {
    enum: ["pending", "processing", "completed", "failed", "cancelled"]
  }).notNull().default("pending"),
  
  // Actors
  fromUserId: varchar("from_user_id").references(() => users.id), // Buyer for purchases, platform for commissions
  toUserId: varchar("to_user_id").references(() => users.id), // Seller for payouts, platform for commissions
  
  // Amounts (all stored in cents to avoid floating point issues)
  amountCents: integer("amount_cents").notNull(), // Transaction amount
  commissionCents: integer("commission_cents"), // Commission amount if applicable
  netAmountCents: integer("net_amount_cents"), // Net amount after commission
  currencyCode: varchar("currency_code").default("USD"),
  
  // Payment method details
  paymentMethod: varchar("payment_method", {
    enum: ["stripe", "paypal", "credits", "bank_transfer"]
  }),
  
  // External payment references
  stripePaymentIntentId: varchar("stripe_payment_intent_id"),
  stripeTransferId: varchar("stripe_transfer_id"),
  stripePayoutId: varchar("stripe_payout_id"),
  paypalTransactionId: varchar("paypal_transaction_id"),
  paypalBatchId: varchar("paypal_batch_id"),
  
  // Additional metadata
  description: text("description"),
  metadata: jsonb("metadata").default({}), // Store additional details
  failureReason: text("failure_reason"), // If status is failed
  
  // Timestamps
  processedAt: timestamp("processed_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_transaction_ledger_order").on(table.orderId),
  index("idx_transaction_ledger_from_user").on(table.fromUserId),
  index("idx_transaction_ledger_to_user").on(table.toUserId),
  index("idx_transaction_ledger_type").on(table.type),
  index("idx_transaction_ledger_status").on(table.status),
  index("idx_transaction_ledger_created").on(table.createdAt),
  index("idx_transaction_ledger_stripe_payout").on(table.stripePayoutId),
]);

// Payout batches table - groups payouts for processing
export const payoutBatches = pgTable("payout_batches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  batchNumber: varchar("batch_number").notNull().unique(), // Human-readable batch ID
  payoutMethod: varchar("payout_method", {
    enum: ["stripe", "paypal"]
  }).notNull(),
  status: varchar("status", {
    enum: ["pending", "processing", "completed", "failed", "partial"]
  }).notNull().default("pending"),
  
  // Batch totals (in cents)
  totalAmountCents: integer("total_amount_cents").notNull(),
  totalPayouts: integer("total_payouts").notNull(),
  successfulPayouts: integer("successful_payouts").default(0),
  failedPayouts: integer("failed_payouts").default(0),
  
  // External references
  stripePayoutBatchId: varchar("stripe_payout_batch_id"),
  paypalBatchId: varchar("paypal_batch_id"),
  
  // Processing details
  processedBy: varchar("processed_by").references(() => users.id), // Admin who initiated
  scheduledFor: timestamp("scheduled_for"),
  processedAt: timestamp("processed_at"),
  completedAt: timestamp("completed_at"),
  
  metadata: jsonb("metadata").default({}),
  errorLog: jsonb("error_log").default([]),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_payout_batches_status").on(table.status),
  index("idx_payout_batches_method").on(table.payoutMethod),
  index("idx_payout_batches_scheduled").on(table.scheduledFor),
  index("idx_payout_batches_created").on(table.createdAt),
]);

// Platform settings table - stores configurable marketplace settings
export const platformSettings = pgTable("platform_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key").notNull().unique(),
  value: jsonb("value").notNull(),
  category: varchar("category", {
    enum: ["commission", "payout", "general", "features", "limits"]
  }).notNull(),
  description: text("description"),
  isEditable: boolean("is_editable").default(true), // Some settings may be system-only
  validationRules: jsonb("validation_rules"), // JSON schema for validation
  lastModifiedBy: varchar("last_modified_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_platform_settings_key").on(table.key),
  index("idx_platform_settings_category").on(table.category),
]);

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  prompts: many(prompts),
  projects: many(projects),
  collections: many(collections),
  favorites: many(promptFavorites),
  ratings: many(promptRatings),
  communityMemberships: many(userCommunities),
  communityAdminRoles: many(communityAdmins),
  createdInvites: many(communityInvites),
  followers: many(follows, { relationName: "following" }),
  following: many(follows, { relationName: "follower" }),
  activities: many(activities),
  notifications: many(notifications, { relationName: "recipient" }),
  triggeredNotifications: many(notifications, { relationName: "trigger" }),
  credits: one(userCredits, { fields: [users.id], references: [userCredits.userId] }),
  creditTransactions: many(creditTransactions),
  dailyRewards: one(dailyRewards, { fields: [users.id], references: [dailyRewards.userId] }),
  sellerProfile: one(sellerProfiles, { fields: [users.id], references: [sellerProfiles.userId] }),
  marketplaceListings: many(marketplaceListings),
}));

export const communitiesRelations = relations(communities, ({ many }) => ({
  members: many(userCommunities),
  collections: many(collections),
  admins: many(communityAdmins),
  invites: many(communityInvites),
}));

export const userCommunitiesRelations = relations(userCommunities, ({ one }) => ({
  user: one(users, { fields: [userCommunities.userId], references: [users.id] }),
  community: one(communities, { fields: [userCommunities.communityId], references: [communities.id] }),
}));

export const promptsRelations = relations(prompts, ({ one, many }) => ({
  user: one(users, { fields: [prompts.userId], references: [users.id] }),
  project: one(projects, { fields: [prompts.projectId], references: [projects.id] }),
  collection: one(collections, { fields: [prompts.collectionId], references: [collections.id] }),
  parentPrompt: one(prompts, { fields: [prompts.branchOf], references: [prompts.id], relationName: "promptBranches" }),
  childPrompts: many(prompts, { relationName: "promptBranches" }),
  favorites: many(promptFavorites),
  ratings: many(promptRatings),
  likes: many(promptLikes),
  marketplaceListing: one(marketplaceListings, { fields: [prompts.id], references: [marketplaceListings.promptId] }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, { fields: [projects.ownerId], references: [users.id] }),
  prompts: many(prompts),
}));

export const collectionsRelations = relations(collections, ({ one, many }) => ({
  user: one(users, { fields: [collections.userId], references: [users.id] }),
  community: one(communities, { fields: [collections.communityId], references: [communities.id] }),
  prompts: many(prompts),
}));

export const promptFavoritesRelations = relations(promptFavorites, ({ one }) => ({
  user: one(users, { fields: [promptFavorites.userId], references: [users.id] }),
  prompt: one(prompts, { fields: [promptFavorites.promptId], references: [prompts.id] }),
}));

export const promptRatingsRelations = relations(promptRatings, ({ one }) => ({
  user: one(users, { fields: [promptRatings.userId], references: [users.id] }),
  prompt: one(prompts, { fields: [promptRatings.promptId], references: [prompts.id] }),
}));

export const followsRelations = relations(follows, ({ one }) => ({
  follower: one(users, { fields: [follows.followerId], references: [users.id], relationName: "follower" }),
  following: one(users, { fields: [follows.followingId], references: [users.id], relationName: "following" }),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  user: one(users, { fields: [activities.userId], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id], relationName: "recipient" }),
  relatedUser: one(users, { fields: [notifications.relatedUserId], references: [users.id], relationName: "trigger" }),
  relatedPrompt: one(prompts, { fields: [notifications.relatedPromptId], references: [prompts.id] }),
  relatedList: one(codexUserLists, { fields: [notifications.relatedListId], references: [codexUserLists.id] }),
}));

export const communityAdminsRelations = relations(communityAdmins, ({ one }) => ({
  user: one(users, { fields: [communityAdmins.userId], references: [users.id] }),
  community: one(communities, { fields: [communityAdmins.communityId], references: [communities.id] }),
  assignedByUser: one(users, { fields: [communityAdmins.assignedBy], references: [users.id] }),
}));

export const communityInvitesRelations = relations(communityInvites, ({ one }) => ({
  community: one(communities, { fields: [communityInvites.communityId], references: [communities.id] }),
  createdByUser: one(users, { fields: [communityInvites.createdBy], references: [users.id] }),
}));

// Credit system relations
export const userCreditsRelations = relations(userCredits, ({ one }) => ({
  user: one(users, { fields: [userCredits.userId], references: [users.id] }),
}));

export const creditTransactionsRelations = relations(creditTransactions, ({ one }) => ({
  user: one(users, { fields: [creditTransactions.userId], references: [users.id] }),
}));

export const dailyRewardsRelations = relations(dailyRewards, ({ one }) => ({
  user: one(users, { fields: [dailyRewards.userId], references: [users.id] }),
}));

// Marketplace relations
export const sellerProfilesRelations = relations(sellerProfiles, ({ one, many }) => ({
  user: one(users, { fields: [sellerProfiles.userId], references: [users.id] }),
  listings: many(marketplaceListings),
}));

export const marketplaceListingsRelations = relations(marketplaceListings, ({ one, many }) => ({
  prompt: one(prompts, { fields: [marketplaceListings.promptId], references: [prompts.id] }),
  seller: one(users, { fields: [marketplaceListings.sellerId], references: [users.id] }),
  sellerProfile: one(sellerProfiles, { 
    fields: [marketplaceListings.sellerId], 
    references: [sellerProfiles.userId] 
  }),
  reviews: many(marketplaceReviews),
}));

export const marketplaceOrdersRelations = relations(marketplaceOrders, ({ one }) => ({
  buyer: one(users, { fields: [marketplaceOrders.buyerId], references: [users.id] }),
  seller: one(users, { fields: [marketplaceOrders.sellerId], references: [users.id] }),
  listing: one(marketplaceListings, { fields: [marketplaceOrders.listingId], references: [marketplaceListings.id] }),
  review: one(marketplaceReviews, { fields: [marketplaceOrders.id], references: [marketplaceReviews.orderId] }),
}));

export const marketplaceReviewsRelations = relations(marketplaceReviews, ({ one }) => ({
  order: one(marketplaceOrders, { fields: [marketplaceReviews.orderId], references: [marketplaceOrders.id] }),
  listing: one(marketplaceListings, { fields: [marketplaceReviews.listingId], references: [marketplaceListings.id] }),
  reviewer: one(users, { fields: [marketplaceReviews.reviewerId], references: [users.id] }),
}));

// Dispute relations
export const marketplaceDisputesRelations = relations(marketplaceDisputes, ({ one, many }) => ({
  order: one(marketplaceOrders, { fields: [marketplaceDisputes.orderId], references: [marketplaceOrders.id] }),
  initiator: one(users, { fields: [marketplaceDisputes.initiatorId], references: [users.id] }),
  respondent: one(users, { fields: [marketplaceDisputes.respondentId], references: [users.id] }),
  messages: many(disputeMessages),
}));

export const disputeMessagesRelations = relations(disputeMessages, ({ one }) => ({
  dispute: one(marketplaceDisputes, { fields: [disputeMessages.disputeId], references: [marketplaceDisputes.id] }),
  sender: one(users, { fields: [disputeMessages.senderId], references: [users.id] }),
}));

// Insert schemas
export const insertPromptSchema = createInsertSchema(prompts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  usageCount: true,
  likes: true,
  qualityScore: true,
  lastUsedAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCollectionSchema = createInsertSchema(collections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPromptTypeSchema = createInsertSchema(promptTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPromptStyleSchema = createInsertSchema(promptStyles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPromptStyleRuleTemplateSchema = createInsertSchema(promptStyleRuleTemplates).omit({
  id: true,
  createdAt: true,
});

export const insertIntendedGeneratorSchema = createInsertSchema(intendedGenerators).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRecommendedModelSchema = createInsertSchema(recommendedModels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPromptHistorySchema = createInsertSchema(promptHistory).omit({
  id: true,
  createdAt: true,
});

export const insertCommunityAdminSchema = createInsertSchema(communityAdmins).omit({
  id: true,
  assignedAt: true,
});

export const insertCommunityInviteSchema = createInsertSchema(communityInvites).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  currentUses: true,
});

export const insertPromptCommunitySharingSchema = createInsertSchema(promptCommunitySharing).omit({
  sharedAt: true,
});

export const insertCollectionCommunitySharingSchema = createInsertSchema(collectionCommunitySharing).omit({
  id: true,
  sharedAt: true,
});

export const insertPromptRatingSchema = createInsertSchema(promptRatings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFollowSchema = createInsertSchema(follows).omit({
  id: true,
  createdAt: true,
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertPushTokenSchema = createInsertSchema(pushTokens).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Codex insert schemas
export const insertCodexCategorySchema = createInsertSchema(codexCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCodexTermSchema = createInsertSchema(codexTerms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCodexUserListSchema = createInsertSchema(codexUserLists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCodexUserTermSchema = createInsertSchema(codexUserTerms).omit({
  id: true,
  createdAt: true,
});

export const insertCodexTermImageSchema = createInsertSchema(codexTermImages).omit({
  id: true,
  createdAt: true,
});

export const insertCodexContributionSchema = createInsertSchema(codexContributions).omit({
  id: true,
  createdAt: true,
  reviewedAt: true,
  approvedTermId: true,
});

export const insertCodexAssembledStringSchema = createInsertSchema(codexAssembledStrings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPromptImageContributionSchema = createInsertSchema(promptImageContributions).omit({
  id: true,
  createdAt: true,
});

// Credit system insert schemas
export const insertUserCreditsSchema = createInsertSchema(userCredits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCreditTransactionSchema = createInsertSchema(creditTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertDailyRewardSchema = createInsertSchema(dailyRewards).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Achievement insert schemas
export const insertAchievementSchema = createInsertSchema(achievements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserAchievementSchema = createInsertSchema(userAchievements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
  claimedAt: true,
});

// Marketplace insert schemas
export const insertSellerProfileSchema = createInsertSchema(sellerProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  totalSales: true,
  totalRevenueCents: true,
  totalCreditsEarned: true,
  averageRating: true,
});

export const insertMarketplaceListingSchema = createInsertSchema(marketplaceListings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  salesCount: true,
  averageRating: true,
});

// Marketplace order insert schemas
export const insertMarketplaceOrderSchema = createInsertSchema(marketplaceOrders).omit({
  id: true,
  createdAt: true,
  deliveredAt: true,
});

// Digital license insert schemas
export const insertDigitalLicenseSchema = createInsertSchema(digitalLicenses).omit({
  id: true,
  createdAt: true,
});

// Marketplace review insert schemas
export const insertMarketplaceReviewSchema = createInsertSchema(marketplaceReviews).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  editedAt: true,
  sellerRespondedAt: true,
  verifiedPurchase: true,
  helpfulCount: true,
  creditsAwarded: true,
});

// Dispute insert schemas
export const insertMarketplaceDisputeSchema = createInsertSchema(marketplaceDisputes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
  escalatedAt: true,
  lastRespondedAt: true,
});

export const insertDisputeMessageSchema = createInsertSchema(disputeMessages).omit({
  id: true,
  createdAt: true,
});

// Transaction ledger insert schemas
export const insertTransactionLedgerSchema = createInsertSchema(transactionLedger).omit({
  id: true,
  processedAt: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
});

// Payout batch insert schemas
export const insertPayoutBatchSchema = createInsertSchema(payoutBatches).omit({
  id: true,
  successfulPayouts: true,
  failedPayouts: true,
  processedAt: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
});

// Platform settings insert schemas
export const insertPlatformSettingSchema = createInsertSchema(platformSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Prompt Refinement Conversations table - stores chat history for prompt refinement
export const promptRefinementConversations = pgTable("prompt_refinement_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar("title"),
  originalPrompt: text("original_prompt"),
  refinedPrompt: text("refined_prompt"),
  templateUsed: varchar("template_used"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Prompt Refinement Messages table - individual messages in a conversation
export const promptRefinementMessages = pgTable("prompt_refinement_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => promptRefinementConversations.id, { onDelete: 'cascade' }),
  role: varchar("role", { enum: ["user", "assistant", "system"] }).notNull(),
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User Prompt Memory table - stores learned preferences and patterns per user
export const userPromptMemory = pgTable("user_prompt_memory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  preferredStyles: jsonb("preferred_styles").default([]),
  preferredThemes: jsonb("preferred_themes").default([]),
  preferredModifiers: jsonb("preferred_modifiers").default([]),
  avoidedTerms: jsonb("avoided_terms").default([]),
  customInstructions: text("custom_instructions"),
  totalConversations: integer("total_conversations").default(0),
  totalRefinements: integer("total_refinements").default(0),
  lastActiveAt: timestamp("last_active_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas for refinement system
export const insertPromptRefinementConversationSchema = createInsertSchema(promptRefinementConversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPromptRefinementMessageSchema = createInsertSchema(promptRefinementMessages).omit({
  id: true,
  createdAt: true,
});

export const insertUserPromptMemorySchema = createInsertSchema(userPromptMemory).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Bulk edit schemas - only fields that can be bulk edited
export const bulkEditPromptSchema = z.object({
  // Fields that can be bulk edited
  categories: z.array(z.string()).optional(),
  promptTypes: z.array(z.string()).optional(),
  promptStyles: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  collectionIds: z.array(z.string()).optional(),
  license: z.string().optional(),
  intendedGenerators: z.array(z.string()).optional(),
  recommendedModels: z.array(z.string()).optional(),
  // Fields that will be auto-updated
  updatedAt: z.date().optional(),
});

export const bulkOperationSchema = z.object({
  promptIds: z.array(z.string()).min(1, "At least one prompt must be selected"),
  operation: z.enum([
    "update",
    "delete", 
    "archive",
    "unarchive",
    "publish",
    "draft",
    "makePublic",
    "makePrivate",
    "like",
    "unlike",
    "favorite",
    "unfavorite",
    "export"
  ]),
  updateData: bulkEditPromptSchema.optional(),
});

export const bulkOperationResultSchema = z.object({
  total: z.number(),
  success: z.number(),
  failed: z.number(),
  errors: z.array(z.object({
    promptId: z.string(),
    error: z.string(),
  })),
  results: z.array(z.object({
    promptId: z.string(),
    success: z.boolean(),
    error: z.string().optional(),
  })),
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertPrompt = z.infer<typeof insertPromptSchema>;
export type Prompt = typeof prompts.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertCollection = z.infer<typeof insertCollectionSchema>;
export type Collection = typeof collections.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;
export type InsertPromptType = z.infer<typeof insertPromptTypeSchema>;
export type PromptType = typeof promptTypes.$inferSelect;
export type InsertPromptStyle = z.infer<typeof insertPromptStyleSchema>;
export type PromptStyle = typeof promptStyles.$inferSelect;
export type InsertPromptStyleRuleTemplate = z.infer<typeof insertPromptStyleRuleTemplateSchema>;
export type PromptStyleRuleTemplate = typeof promptStyleRuleTemplates.$inferSelect;
export type InsertIntendedGenerator = z.infer<typeof insertIntendedGeneratorSchema>;
export type IntendedGenerator = typeof intendedGenerators.$inferSelect;
export type InsertRecommendedModel = z.infer<typeof insertRecommendedModelSchema>;
export type RecommendedModel = typeof recommendedModels.$inferSelect;
export type InsertPromptHistory = z.infer<typeof insertPromptHistorySchema>;
export type PromptHistory = typeof promptHistory.$inferSelect;
export type InsertCommunityAdmin = z.infer<typeof insertCommunityAdminSchema>;
export type CommunityAdmin = typeof communityAdmins.$inferSelect;
export type InsertCommunityInvite = z.infer<typeof insertCommunityInviteSchema>;
export type CommunityInvite = typeof communityInvites.$inferSelect;
export type InsertPromptCommunitySharing = z.infer<typeof insertPromptCommunitySharingSchema>;
export type PromptCommunitySharing = typeof promptCommunitySharing.$inferSelect;
export type InsertCollectionCommunitySharing = z.infer<typeof insertCollectionCommunitySharingSchema>;
export type CollectionCommunitySharing = typeof collectionCommunitySharing.$inferSelect;
export type InsertPromptRating = z.infer<typeof insertPromptRatingSchema>;
export type PromptRating = typeof promptRatings.$inferSelect;
export type PromptLike = typeof promptLikes.$inferSelect;
export type PromptFavorite = typeof promptFavorites.$inferSelect;
export type InsertFollow = z.infer<typeof insertFollowSchema>;
export type Follow = typeof follows.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertPushToken = z.infer<typeof insertPushTokenSchema>;
export type PushToken = typeof pushTokens.$inferSelect;

// Codex types
export type InsertCodexCategory = z.infer<typeof insertCodexCategorySchema>;
export type CodexCategory = typeof codexCategories.$inferSelect;
export type InsertCodexTerm = z.infer<typeof insertCodexTermSchema>;
export type CodexTerm = typeof codexTerms.$inferSelect;
export type InsertCodexUserList = z.infer<typeof insertCodexUserListSchema>;
export type CodexUserList = typeof codexUserLists.$inferSelect;
export type InsertCodexUserTerm = z.infer<typeof insertCodexUserTermSchema>;
export type CodexUserTerm = typeof codexUserTerms.$inferSelect;
export type InsertCodexTermImage = z.infer<typeof insertCodexTermImageSchema>;
export type CodexTermImage = typeof codexTermImages.$inferSelect;
export type InsertCodexContribution = z.infer<typeof insertCodexContributionSchema>;
export type CodexContribution = typeof codexContributions.$inferSelect;
export type InsertCodexAssembledString = z.infer<typeof insertCodexAssembledStringSchema>;
export type CodexAssembledString = typeof codexAssembledStrings.$inferSelect;

// Image contribution types
export type PromptImageContribution = typeof promptImageContributions.$inferSelect;
export type InsertPromptImageContribution = z.infer<typeof insertPromptImageContributionSchema>;

// Credit system types
export type UserCredits = typeof userCredits.$inferSelect;
export type InsertUserCredits = z.infer<typeof insertUserCreditsSchema>;
export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type InsertCreditTransaction = z.infer<typeof insertCreditTransactionSchema>;
export type DailyReward = typeof dailyRewards.$inferSelect;
export type InsertDailyReward = z.infer<typeof insertDailyRewardSchema>;
export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type InsertUserAchievement = z.infer<typeof insertUserAchievementSchema>;

// Marketplace types
export type SellerProfile = typeof sellerProfiles.$inferSelect;
export type InsertSellerProfile = z.infer<typeof insertSellerProfileSchema>;
export type MarketplaceListing = typeof marketplaceListings.$inferSelect;
export type InsertMarketplaceListing = z.infer<typeof insertMarketplaceListingSchema>;
export type MarketplaceOrder = typeof marketplaceOrders.$inferSelect;
export type InsertMarketplaceOrder = z.infer<typeof insertMarketplaceOrderSchema>;
export type DigitalLicense = typeof digitalLicenses.$inferSelect;
export type InsertDigitalLicense = z.infer<typeof insertDigitalLicenseSchema>;
export type MarketplaceReview = typeof marketplaceReviews.$inferSelect;
export type InsertMarketplaceReview = z.infer<typeof insertMarketplaceReviewSchema>;
export type MarketplaceDispute = typeof marketplaceDisputes.$inferSelect;
export type InsertMarketplaceDispute = z.infer<typeof insertMarketplaceDisputeSchema>;
export type DisputeMessage = typeof disputeMessages.$inferSelect;
export type InsertDisputeMessage = z.infer<typeof insertDisputeMessageSchema>;

// Transaction and payout types
export type TransactionLedger = typeof transactionLedger.$inferSelect;
export type InsertTransactionLedger = z.infer<typeof insertTransactionLedgerSchema>;
export type PayoutBatch = typeof payoutBatches.$inferSelect;
export type InsertPayoutBatch = z.infer<typeof insertPayoutBatchSchema>;
export type PlatformSetting = typeof platformSettings.$inferSelect;
export type InsertPlatformSetting = z.infer<typeof insertPlatformSettingSchema>;

// Prompt Refinement types
export type PromptRefinementConversation = typeof promptRefinementConversations.$inferSelect;
export type InsertPromptRefinementConversation = z.infer<typeof insertPromptRefinementConversationSchema>;
export type PromptRefinementMessage = typeof promptRefinementMessages.$inferSelect;
export type InsertPromptRefinementMessage = z.infer<typeof insertPromptRefinementMessageSchema>;
export type UserPromptMemory = typeof userPromptMemory.$inferSelect;
export type InsertUserPromptMemory = z.infer<typeof insertUserPromptMemorySchema>;

// Bulk operation types
export type BulkEditPrompt = z.infer<typeof bulkEditPromptSchema>;
export type BulkOperation = z.infer<typeof bulkOperationSchema>;
export type BulkOperationResult = z.infer<typeof bulkOperationResultSchema>;
export type BulkOperationType = BulkOperation["operation"];

// User role types
export type UserRole = "user" | "community_admin" | "sub_community_admin" | "super_admin" | "global_admin" | "developer";
export type CommunityRole = "member" | "admin";
export type CollectionType = "user" | "community" | "global";
