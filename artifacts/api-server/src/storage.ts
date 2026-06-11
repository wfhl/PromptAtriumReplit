import {
  users,
  prompts,
  projects,
  collections,
  categories,
  promptTypes,
  promptStyles,
  promptStyleRuleTemplates,
  intendedGenerators,
  recommendedModels,
  communities,
  userCommunities,
  communityAdmins,
  promptCommunitySharing,
  subCommunityAdmins,
  communityInvites,
  subCommunityInvites,
  promptLikes,
  promptFavorites,
  promptRatings,
  follows,
  activities,
  notifications,
  prompt_components,
  aesthetics,
  promptHistory,
  promptImageContributions,
  userCredits,
  creditTransactions,
  dailyRewards,
  achievements,
  userAchievements,
  sellerProfiles,
  marketplaceListings,
  collectionCommunitySharing,
  type User,
  type UpsertUser,
  type Prompt,
  type InsertPrompt,
  type Project,
  type InsertProject,
  type Collection,
  type InsertCollection,
  type Category,
  type InsertCategory,
  type PromptType,
  type InsertPromptType,
  type PromptStyle,
  type InsertPromptStyle,
  type PromptStyleRuleTemplate,
  type InsertPromptStyleRuleTemplate,
  type IntendedGenerator,
  type InsertIntendedGenerator,
  type RecommendedModel,
  type InsertRecommendedModel,
  type Community,
  type InsertCommunity,
  type UserCommunity,
  type InsertUserCommunity,
  type CommunityAdmin,
  type InsertCommunityAdmin,
  type SubCommunityAdmin,
  type InsertSubCommunityAdmin,
  type CommunityInvite,
  type InsertCommunityInvite,
  type SubCommunityInvite,
  type InsertSubCommunityInvite,
  type PromptRating,
  type InsertPromptRating,
  type PromptLike,
  type PromptFavorite,
  type Follow,
  type InsertFollow,
  type Activity,
  type InsertActivity,
  type Notification,
  type InsertNotification,
  type PromptHistory,
  type InsertPromptHistory,
  type UserRole,
  type CommunityRole,
  type UserCredits,
  type InsertUserCredits,
  type CreditTransaction,
  type InsertCreditTransaction,
  type DailyReward,
  type InsertDailyReward,
  type Achievement,
  type InsertAchievement,
  type UserAchievement,
  type InsertUserAchievement,
  codexCategories,
  codexTerms,
  codexUserLists,
  codexUserTerms,
  codexTermImages,
  codexContributions,
  codexAssembledStrings,
  type CodexCategory,
  type InsertCodexCategory,
  type CodexTerm,
  type InsertCodexTerm,
  type CodexUserList,
  type InsertCodexUserList,
  type CodexUserTerm,
  type InsertCodexUserTerm,
  type CodexTermImage,
  type InsertCodexTermImage,
  type CodexContribution,
  type InsertCodexContribution,
  type CodexAssembledString,
  type InsertCodexAssembledString,
  type PromptImageContribution,
  type InsertPromptImageContribution,
  characterPresets,
  type CharacterPreset,
  type InsertCharacterPreset,
  type SellerProfile,
  type InsertSellerProfile,
  type MarketplaceListing,
  type InsertMarketplaceListing,
  marketplaceOrders,
  type MarketplaceOrder,
  type InsertMarketplaceOrder,
  digitalLicenses,
  type DigitalLicense,
  type InsertDigitalLicense,
  marketplaceReviews,
  type MarketplaceReview,
  type InsertMarketplaceReview,
  marketplaceDisputes,
  type MarketplaceDispute,
  type InsertMarketplaceDispute,
  disputeMessages,
  type DisputeMessage,
  type InsertDisputeMessage,
  transactionLedger,
  payoutBatches,
  platformSettings,
  promptRefinementConversations,
  promptRefinementMessages,
  userPromptMemory,
  type PromptRefinementConversation,
  type InsertPromptRefinementConversation,
  type PromptRefinementMessage,
  type InsertPromptRefinementMessage,
  type UserPromptMemory,
  type InsertUserPromptMemory,
} from "@workspace/db";
import { db } from "./db";
import { eq, desc, and, or, sql, ilike, inArray, isNull, isNotNull, gte, lte, count } from "drizzle-orm";
import { randomBytes } from "crypto";

// Interface for storage operations
export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, userData: Partial<User>): Promise<User>;
  
  // Prompt operations
  getPrompts(options?: {
    userId?: string;
    isPublic?: boolean;
    isFeatured?: boolean;
    isLiteFeatured?: boolean;
    isLitePreview?: boolean;
    isHidden?: boolean;
    category?: string;
    tags?: string[];
    search?: string;
    limit?: number;
    offset?: number;
    promptIds?: string[];
    recommendedModels?: string[];
    subCommunityId?: string;
    authenticatedUserId?: string;
  }): Promise<Prompt[]>;
  getPrompt(id: string): Promise<Prompt | undefined>;
  getPromptWithUser(id: string, authenticatedUserId?: string): Promise<any>;
  createPrompt(prompt: InsertPrompt): Promise<Prompt>;
  updatePrompt(id: string, prompt: Partial<InsertPrompt>): Promise<Prompt>;
  deletePrompt(id: string): Promise<void>;
  getPromptRelatedData(id: string): Promise<{
    likesCount: number;
    favoritesCount: number;
    ratingsCount: number;
  }>;
  branchPrompt(promptId: string, userId: string): Promise<Prompt>;
  contributeImagesToPrompt(promptId: string, imageUrls: string[], contributorId: string): Promise<Prompt>;
  
  // Project operations
  getProjects(userId: string): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: string): Promise<void>;
  
  // Collection operations
  getCollections(options?: { userId?: string; communityId?: string; type?: string; isPublic?: boolean; search?: string; limit?: number; offset?: number; }): Promise<Collection[]>;
  getCollection(id: string): Promise<Collection | undefined>;
  createCollection(collection: InsertCollection): Promise<Collection>;
  updateCollection(id: string, collection: Partial<InsertCollection>): Promise<Collection>;
  deleteCollection(id: string): Promise<void>;
  
  // Community operations
  getCommunities(): Promise<Community[]>;
  getManagedCommunities(userId: string): Promise<Community[]>;
  getGlobalCommunity(): Promise<Community | undefined>;
  getUserPrivateCommunities(userId: string): Promise<Community[]>;
  getAllPrivateCommunities(): Promise<Community[]>;
  getCommunity(id: string): Promise<Community | undefined>;
  getCommunityBySlug(slug: string): Promise<Community | undefined>;
  createCommunity(community: InsertCommunity): Promise<Community>;
  updateCommunity(id: string, community: Partial<InsertCommunity>): Promise<Community>;
  deleteCommunity(id: string): Promise<void>;
  
  // Community membership operations
  joinCommunity(userId: string, communityId: string, role?: CommunityRole): Promise<UserCommunity>;
  leaveCommunity(userId: string, communityId: string): Promise<void>;
  getUserCommunities(userId: string): Promise<UserCommunity[]>;
  getCommunityMembers(communityId: string): Promise<UserCommunity[]>;
  updateCommunityMemberRole(userId: string, communityId: string, role: CommunityRole): Promise<UserCommunity>;
  isCommunityMember(userId: string, communityId: string): Promise<boolean>;
  isCommunityAdmin(userId: string, communityId: string): Promise<boolean>;
  
  // User role operations
  updateUserRole(userId: string, role: UserRole): Promise<User>;
  
  // Social operations
  toggleLike(userId: string, promptId: string): Promise<boolean>;
  toggleFavorite(userId: string, promptId: string): Promise<boolean>;
  removeAllFavorites(promptId: string): Promise<void>;
  checkIfLiked(userId: string, promptId: string): Promise<boolean>;
  checkIfFavorited(userId: string, promptId: string): Promise<boolean>;
  cleanupDuplicateLikes(): Promise<{ duplicatesRemoved: number; promptsFixed: number }>;
  ratePrompt(rating: InsertPromptRating): Promise<PromptRating>;
  getUserFavorites(userId: string): Promise<PromptFavorite[]>;
  getUserLikes(userId: string): Promise<PromptLike[]>;
  
  // Stats
  getUserStats(userId: string): Promise<{
    totalPrompts: number;
    totalLikes: number;
    collections: number;
    branchesCreated: number;
  }>;
  
  // Follow operations
  followUser(followerId: string, followingId: string): Promise<Follow>;
  unfollowUser(followerId: string, followingId: string): Promise<void>;
  isFollowing(followerId: string, followingId: string): Promise<boolean>;
  getFollowers(userId: string, limit?: number, offset?: number): Promise<User[]>;
  getFollowing(userId: string, limit?: number, offset?: number): Promise<User[]>;
  getFollowerCount(userId: string): Promise<number>;
  getFollowingCount(userId: string): Promise<number>;
  getFollowedUsersPrompts(userId: string, limit?: number, offset?: number): Promise<Prompt[]>;
  
  // Activity operations
  createActivity(activity: Omit<InsertActivity, 'actionType'> & { actionType: string }): Promise<Activity>;
  getActivities(options?: {
    userId?: string;
    actionType?: string;
    limit?: number;
    offset?: number;
  }): Promise<Activity[]>;
  getRecentActivities(limit?: number): Promise<any[]>;
  getUserActivities(userId: string, limit?: number, offset?: number): Promise<any[]>;
  getFollowedUsersActivities(userId: string, limit?: number, offset?: number): Promise<Activity[]>;

  // Notification operations
  createNotification(notification: Omit<InsertNotification, 'type'> & { type: string }): Promise<Notification>;
  getNotifications(userId: string, limit?: number, offset?: number): Promise<Notification[]>;
  getNotification(id: string): Promise<Notification | undefined>;
  markNotificationRead(notificationId: string, userId: string): Promise<Notification>;
  markAllNotificationsRead(userId: string): Promise<void>;
  getUnreadCount(userId: string): Promise<number>;
  deleteNotification(id: string): Promise<void>;

  // User management operations (for Super Admin)
  getAllUsers(options?: {
    search?: string;
    role?: UserRole;
    communityId?: string;
    limit?: number;
    offset?: number;
  }): Promise<User[]>;
  searchUsers(query: string, limit?: number): Promise<User[]>;

  // Community admin operations
  assignCommunityAdmin(data: InsertCommunityAdmin): Promise<CommunityAdmin>;
  removeCommunityAdmin(userId: string, communityId: string): Promise<void>;
  getCommunityAdmins(communityId: string): Promise<CommunityAdmin[]>;
  getUserCommunityAdminRoles(userId: string): Promise<CommunityAdmin[]>;

  // Sub-community admin operations
  assignSubCommunityAdmin(data: InsertSubCommunityAdmin): Promise<SubCommunityAdmin>;
  removeSubCommunityAdmin(userId: string, subCommunityId: string): Promise<void>;
  getSubCommunityAdmins(subCommunityId: string): Promise<SubCommunityAdmin[]>;
  getUserSubCommunityAdminRoles(userId: string): Promise<SubCommunityAdmin[]>;
  isSubCommunityAdmin(userId: string, subCommunityId: string): Promise<boolean>;

  // Invite system operations
  createInvite(invite: InsertCommunityInvite): Promise<CommunityInvite>;
  getInviteByCode(code: string): Promise<CommunityInvite | undefined>;
  useInvite(code: string): Promise<CommunityInvite>;
  getActiveInvites(communityId: string): Promise<CommunityInvite[]>;
  getAllInvites(options?: {
    communityId?: string;
    createdBy?: string;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<CommunityInvite[]>;
  deactivateInvite(id: string): Promise<void>;

  // Sub-community invite operations
  createSubCommunityInvite(data: InsertSubCommunityInvite): Promise<SubCommunityInvite>;
  getSubCommunityInvite(code: string): Promise<SubCommunityInvite | undefined>;
  getSubCommunityInvites(subCommunityId: string, options?: { active?: boolean }): Promise<SubCommunityInvite[]>;
  useSubCommunityInvite(code: string, userId: string): Promise<{ success: boolean; message: string; community?: Community }>;
  deactivateSubCommunityInvite(inviteId: string): Promise<void>;
  getSubCommunityInviteStats(subCommunityId: string): Promise<{ 
    total: number; 
    active: number; 
    used: number; 
    expired: number; 
  }>;

  // Sub-community CRUD operations
  createSubCommunity(parentId: string, subCommunity: InsertCommunity): Promise<Community>;
  getSubCommunities(parentId: string): Promise<Community[]>;
  getAllSubCommunities(parentId: string): Promise<Community[]>;
  getSubCommunityBySlug(slug: string): Promise<Community | undefined>;
  updateSubCommunity(id: string, data: Partial<InsertCommunity>): Promise<Community>;
  deleteSubCommunity(id: string): Promise<void>;

  // Sub-community membership operations
  joinSubCommunity(userId: string, subCommunityId: string): Promise<UserCommunity>;
  leaveSubCommunity(userId: string, subCommunityId: string): Promise<void>;
  getSubCommunityMembers(subCommunityId: string): Promise<UserCommunity[]>;
  isSubCommunityMember(userId: string, subCommunityId: string): Promise<boolean>;
  getUserSubCommunities(userId: string): Promise<Community[]>;

  // Sub-community prompt operations
  getSubCommunityPrompts(subCommunityId: string, options?: {
    limit?: number;
    offset?: number;
    isPublic?: boolean;
    search?: string;
  }): Promise<Prompt[]>;
  sharePromptToSubCommunity(promptId: string, subCommunityId: string, visibility?: "private" | "parent_community" | "public"): Promise<Prompt>;
  removePromptFromSubCommunity(promptId: string, subCommunityId: string): Promise<void>;
  getPromptsForSubCommunity(subCommunityId: string, options?: {
    userId?: string;
    limit?: number;
    offset?: number;
    search?: string;
  }): Promise<Prompt[]>;
  canUserAccessPromptInSubCommunity(userId: string, promptId: string, subCommunityId: string): Promise<boolean>;
  updatePromptSubCommunityVisibility(promptId: string, visibility: "private" | "parent_community" | "public", userId: string): Promise<Prompt>;

  // Sub-community hierarchy operations
  getSubCommunityPath(communityId: string): Promise<string>;
  getParentCommunity(subCommunityId: string): Promise<Community | undefined>;
  getSubCommunityLevel(communityId: string): Promise<number>;

  // Category operations
  getCategories(options?: { userId?: string; type?: string; isActive?: boolean }): Promise<Category[]>;
  getCategory(id: string): Promise<Category | undefined>;
  getCategoryByName(name: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: string): Promise<void>;

  // Prompt type operations
  getPromptTypes(options?: { userId?: string; type?: string; isActive?: boolean }): Promise<PromptType[]>;
  getPromptType(id: string): Promise<PromptType | undefined>;
  getPromptTypeByName(name: string): Promise<PromptType | undefined>;
  createPromptType(promptType: InsertPromptType): Promise<PromptType>;
  updatePromptType(id: string, promptType: Partial<InsertPromptType>): Promise<PromptType>;
  deletePromptType(id: string): Promise<void>;

  // Prompt style operations
  getPromptStyles(options?: { userId?: string; type?: string; isActive?: boolean }): Promise<PromptStyle[]>;
  getPromptStyle(id: string): Promise<PromptStyle | undefined>;
  getPromptStyleByName(name: string): Promise<PromptStyle | undefined>;
  createPromptStyle(promptStyle: InsertPromptStyle): Promise<PromptStyle>;
  updatePromptStyle(id: string, promptStyle: Partial<InsertPromptStyle>): Promise<PromptStyle>;
  deletePromptStyle(id: string): Promise<void>;
  
  getPromptStyleRuleTemplates(options?: { userId?: string; category?: string; isDefault?: boolean }): Promise<PromptStyleRuleTemplate[]>;
  getPromptStyleRuleTemplate(id: string): Promise<PromptStyleRuleTemplate | undefined>;
  getPromptStyleRuleTemplateByName(name: string): Promise<PromptStyleRuleTemplate | undefined>;
  createPromptStyleRuleTemplate(promptStyleRuleTemplate: InsertPromptStyleRuleTemplate): Promise<PromptStyleRuleTemplate>;
  updatePromptStyleRuleTemplate(id: string, promptStyleRuleTemplate: Partial<InsertPromptStyleRuleTemplate>): Promise<PromptStyleRuleTemplate>;
  deletePromptStyleRuleTemplate(id: string): Promise<void>;

  // Intended generator operations
  getIntendedGenerators(options?: { userId?: string; type?: string; isActive?: boolean }): Promise<IntendedGenerator[]>;
  getIntendedGenerator(id: string): Promise<IntendedGenerator | undefined>;
  getIntendedGeneratorByName(name: string): Promise<IntendedGenerator | undefined>;
  createIntendedGenerator(generator: InsertIntendedGenerator): Promise<IntendedGenerator>;
  updateIntendedGenerator(id: string, generator: Partial<InsertIntendedGenerator>): Promise<IntendedGenerator>;
  deleteIntendedGenerator(id: string): Promise<void>;

  // Recommended model operations
  getRecommendedModels(options?: { userId?: string; type?: string; isActive?: boolean }): Promise<RecommendedModel[]>;
  getRecommendedModel(id: string): Promise<RecommendedModel | undefined>;
  getRecommendedModelByName(name: string): Promise<RecommendedModel | undefined>;
  createRecommendedModel(model: InsertRecommendedModel): Promise<RecommendedModel>;
  updateRecommendedModel(id: string, model: Partial<InsertRecommendedModel>): Promise<RecommendedModel>;
  deleteRecommendedModel(id: string): Promise<void>;

  // Prompt history operations
  savePromptToHistory(history: InsertPromptHistory): Promise<PromptHistory>;
  getPromptHistory(userId: string, options?: { limit?: number; offset?: number }): Promise<PromptHistory[]>;
  getRecentPromptHistory(userId: string, limit?: number): Promise<PromptHistory[]>;
  deletePromptHistory(id: string, userId: string): Promise<void>;
  clearPromptHistory(userId: string): Promise<void>;
  markPromptAsSaved(historyId: string, userId: string): Promise<void>;

  // Wordsmith Codex operations - Using prompt_components and aesthetics tables
  getWordsmithCategories(): Promise<{ id: string; name: string; termCount: number; anatomyGroup?: string; subcategories?: string[] }[]>;
  getPromptComponents(options?: {
    category?: string;
    search?: string;
    limit?: number;
    offset?: number;
    userId?: string; // To check user's NSFW preference
  }): Promise<any[]>;
  getAesthetics(options?: {
    category?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]>;
  getWordsmithTerms(options?: {
    category?: string;
    search?: string;
    limit?: number;
    offset?: number;
    excludeAesthetics?: boolean;
    userId?: string; // To check user's NSFW preference
  }): Promise<any[]>;

  // Codex Assembled String operations (keep for string assembly feature)
  getCodexAssembledStrings(userId: string, type?: "preset" | "wildcard"): Promise<CodexAssembledString[]>;
  getCodexAssembledString(id: string): Promise<CodexAssembledString | undefined>;
  createCodexAssembledString(assembledString: InsertCodexAssembledString): Promise<CodexAssembledString>;
  updateCodexAssembledString(id: string, updates: Partial<InsertCodexAssembledString>): Promise<CodexAssembledString>;
  deleteCodexAssembledString(id: string): Promise<void>;

  // Character preset operations
  getCharacterPresets(options?: { userId?: string; isGlobal?: boolean }): Promise<CharacterPreset[]>;
  getCharacterPreset(id: string): Promise<CharacterPreset | undefined>;
  createCharacterPreset(preset: InsertCharacterPreset): Promise<CharacterPreset>;
  updateCharacterPreset(id: string, preset: Partial<InsertCharacterPreset>): Promise<CharacterPreset>;
  deleteCharacterPreset(id: string, userId: string): Promise<void>;
  toggleCharacterPresetFavorite(id: string, userId: string): Promise<CharacterPreset>;

  // Credit system operations
  getUserCredits(userId: string): Promise<UserCredits>;
  getCreditBalance(userId: string): Promise<number>;
  addCredits(userId: string, amount: number, source: string, description?: string, referenceId?: string, referenceType?: string): Promise<CreditTransaction>;
  spendCredits(userId: string, amount: number, source: string, description?: string, referenceId?: string, referenceType?: string): Promise<CreditTransaction>;
  getCreditTransactionHistory(userId: string, options?: { limit?: number; offset?: number }): Promise<CreditTransaction[]>;
  getDailyReward(userId: string): Promise<DailyReward | undefined>;
  claimDailyReward(userId: string): Promise<{ reward: number; streak: number; streakBonus?: number }>;
  checkFirstPromptBonus(userId: string): Promise<boolean>;
  checkProfileCompletionBonus(userId: string): Promise<boolean>;
  initializeUserCredits(userId: string): Promise<UserCredits>;
  
  // Achievement operations
  getAchievements(): Promise<Achievement[]>;
  getAchievement(id: string): Promise<Achievement | undefined>;
  createAchievement(achievement: InsertAchievement): Promise<Achievement>;
  getUserAchievements(userId: string): Promise<UserAchievement[]>;
  getUserAchievement(userId: string, achievementId: string): Promise<UserAchievement | undefined>;
  checkAchievementProgress(userId: string, achievementCode: string): Promise<UserAchievement>;
  updateAchievementProgress(userId: string, achievementCode: string, increment?: number): Promise<UserAchievement>;
  markAchievementClaimed(userId: string, achievementId: string): Promise<void>;
  seedInitialAchievements(): Promise<void>;
  
  // Marketplace operations - Seller profiles
  getSellerProfile(userId: string): Promise<SellerProfile | undefined>;
  createSellerProfile(profile: InsertSellerProfile): Promise<SellerProfile>;
  updateSellerProfile(userId: string, profile: Partial<InsertSellerProfile>): Promise<SellerProfile>;
  completeSellerOnboarding(userId: string, data: {
    businessType: 'individual' | 'business';
    taxInfo: {
      taxId?: string;
      vatNumber?: string;
      businessName?: string;
      businessAddress?: string;
    };
    payoutMethod: 'stripe' | 'manual';
  }): Promise<SellerProfile>;
  
  // Marketplace operations - Listings
  createListing(listing: InsertMarketplaceListing): Promise<MarketplaceListing>;
  updateListing(id: string, listing: Partial<InsertMarketplaceListing>, userId: string): Promise<MarketplaceListing>;
  getListingById(id: string): Promise<MarketplaceListing | undefined>;
  getListingWithDetails(id: string): Promise<any>;
  getListingsByUser(userId: string, options?: { status?: string; limit?: number; offset?: number }): Promise<MarketplaceListing[]>;
  getActiveListings(options?: { category?: string; search?: string; limit?: number; offset?: number }): Promise<MarketplaceListing[]>;
  getMarketplaceListings(options?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    minPriceCents?: number;
    maxPriceCents?: number;
    minCredits?: number;
    maxCredits?: number;
    sortBy?: 'newest' | 'price_low_high' | 'price_high_low' | 'most_popular';
    acceptsMoney?: boolean;
    acceptsCredits?: boolean;
  }): Promise<{ listings: any[]; total: number }>;
  getFeaturedListings(limit?: number): Promise<any[]>;
  getMarketplaceCategories(): Promise<{ category: string; count: number }[]>;
  getSimilarListings(listingId: string, limit?: number): Promise<any[]>;
  getListingPreview(promptId: string, previewPercentage: number): Promise<string>;
  deleteListing(id: string, userId: string): Promise<void>;
  
  // Marketplace operations - Orders
  createOrder(order: InsertMarketplaceOrder): Promise<MarketplaceOrder>;
  completeOrder(orderId: string, deliveredAt?: Date): Promise<MarketplaceOrder>;
  failOrder(orderId: string): Promise<MarketplaceOrder>;
  refundOrder(orderId: string): Promise<MarketplaceOrder>;
  getOrderById(id: string): Promise<MarketplaceOrder | undefined>;
  getOrderByStripePaymentIntent(paymentIntentId: string): Promise<MarketplaceOrder | undefined>;
  getUserPurchases(userId: string, options?: { limit?: number; offset?: number }): Promise<MarketplaceOrder[]>;
  getSellerOrders(sellerId: string, options?: { limit?: number; offset?: number; status?: string }): Promise<MarketplaceOrder[]>;
  checkUserPurchasedListing(userId: string, listingId: string): Promise<boolean>;
  generateOrderNumber(): string;
  
  // Marketplace operations - Digital Licenses  
  createDigitalLicense(license: InsertDigitalLicense): Promise<DigitalLicense>;
  generateLicenseKey(): string;
  getUserLicense(userId: string, promptId: string): Promise<DigitalLicense | undefined>;
  getUserLicenses(userId: string, options?: { limit?: number; offset?: number }): Promise<DigitalLicense[]>;
  
  // Marketplace operations - Reviews
  createReview(review: InsertMarketplaceReview): Promise<MarketplaceReview>;
  getListingReviews(listingId: string, options?: { 
    limit?: number; 
    offset?: number; 
    sortBy?: 'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful';
  }): Promise<MarketplaceReview[]>;
  canUserReview(userId: string, listingId: string): Promise<boolean>;
  getUserHasReviewed(userId: string, listingId: string): Promise<boolean>;
  updateListingRating(listingId: string): Promise<void>;
  markReviewHelpful(reviewId: string, userId: string): Promise<void>;
  addSellerResponse(reviewId: string, sellerId: string, response: string): Promise<MarketplaceReview>;
  getReviewByOrderId(orderId: string): Promise<MarketplaceReview | undefined>;
  getSellerReviews(sellerId: string, options?: { limit?: number; offset?: number }): Promise<MarketplaceReview[]>;
  
  // Dispute operations
  createDispute(dispute: InsertMarketplaceDispute): Promise<MarketplaceDispute>;
  getDisputeById(id: string): Promise<MarketplaceDispute | undefined>;
  getDisputeByOrderId(orderId: string): Promise<MarketplaceDispute | undefined>;
  getUserDisputes(userId: string, options?: { 
    role?: 'initiator' | 'respondent' | 'all';
    status?: string;
    limit?: number; 
    offset?: number;
  }): Promise<MarketplaceDispute[]>;
  getAdminDisputes(options?: {
    status?: string;
    escalatedOnly?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<MarketplaceDispute[]>;
  updateDispute(id: string, updates: Partial<MarketplaceDispute>): Promise<MarketplaceDispute>;
  resolveDispute(id: string, resolution: {
    resolution: string;
    refundAmountCents?: number;
    creditRefundAmount?: number;
  }): Promise<MarketplaceDispute>;
  closeDispute(id: string): Promise<MarketplaceDispute>;
  canCreateDispute(orderId: string, userId: string): Promise<{ canCreate: boolean; reason?: string }>;
  escalateDisputeIfNeeded(disputeId: string): Promise<MarketplaceDispute | undefined>;
  
  // Dispute message operations
  createDisputeMessage(message: InsertDisputeMessage): Promise<DisputeMessage>;
  getDisputeMessages(disputeId: string, options?: { limit?: number; offset?: number }): Promise<DisputeMessage[]>;
  canSendDisputeMessage(disputeId: string, userId: string): Promise<boolean>;
  
  // Refund operations
  processRefund(orderId: string, refund: {
    amountCents?: number;
    creditAmount?: number;
    reason?: string;
  }): Promise<{ success: boolean; message: string }>;
  
  // Platform settings operations
  getPlatformSettings(keys: string[]): Promise<Record<string, string>>;
  updatePlatformSettings(settings: Record<string, string>): Promise<void>;
  
  // Prompt Refinement operations
  createRefinementConversation(data: InsertPromptRefinementConversation): Promise<PromptRefinementConversation>;
  getRefinementConversation(id: string): Promise<PromptRefinementConversation | undefined>;
  getUserRefinementConversations(userId: string, options?: { limit?: number; offset?: number; activeOnly?: boolean }): Promise<PromptRefinementConversation[]>;
  updateRefinementConversation(id: string, data: Partial<PromptRefinementConversation>): Promise<PromptRefinementConversation>;
  deleteRefinementConversation(id: string): Promise<void>;
  
  // Refinement message operations
  createRefinementMessage(data: InsertPromptRefinementMessage): Promise<PromptRefinementMessage>;
  getConversationMessages(conversationId: string): Promise<PromptRefinementMessage[]>;
  
  // User prompt memory operations
  getUserPromptMemory(userId: string): Promise<UserPromptMemory | undefined>;
  upsertUserPromptMemory(userId: string, data: Partial<UserPromptMemory>): Promise<UserPromptMemory>;
  updateUserPromptMemory(userId: string, updates: Partial<UserPromptMemory>): Promise<UserPromptMemory>;
}

function generatePromptId(): string {
  return randomBytes(5).toString('hex');
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Check if user exists before upserting
    const existingUser = userData.id ? await this.getUser(userData.id) : null;
    const isNewUser = !existingUser;

    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          // Only update fields that should come from auth provider
          // Don't overwrite user-customized fields like firstName and lastName
          email: userData.email,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();

    // Auto-join new users to the PromptAtrium General community
    if (isNewUser) {
      try {
        const generalCommunity = await this.getCommunityBySlug("general");
        if (generalCommunity) {
          await this.joinCommunity(user.id, generalCommunity.id, "member");
        }
      } catch (error) {
        console.error("Failed to auto-join user to general community:", error);
        // Don't throw error - user creation should still succeed even if community join fails
      }
    }

    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...userData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }

  // Prompt operations
  async getPrompts(options: {
    userId?: string;
    isPublic?: boolean;
    isFeatured?: boolean;
    isLiteFeatured?: boolean;
    isLitePreview?: boolean;
    isHidden?: boolean;
    category?: string;
    status?: string;
    statusNotEqual?: string;
    tags?: string[];
    categories?: string[];
    promptTypes?: string[];
    promptStyles?: string[];
    intendedGenerators?: string[];
    collectionIds?: string[];
    collectionId?: string;
    communityId?: string; // For filtering by shared community
    search?: string;
    limit?: number;
    offset?: number;
    promptIds?: string[];
    showNsfw?: boolean;
    recommendedModels?: string[];
    subCommunityId?: string;
    authenticatedUserId?: string;
  } = {}): Promise<any[]> {
    // Build conditions first
    const conditions = [];
    
    if (options.userId) {
      conditions.push(eq(prompts.userId, options.userId));
    }
    
    if (options.isPublic !== undefined) {
      conditions.push(eq(prompts.isPublic, options.isPublic));
    }
    
    if (options.isFeatured) {
      conditions.push(eq(prompts.isFeatured, true));
    }

    if (options.isLiteFeatured) {
      conditions.push(eq(prompts.isLiteFeatured, true));
    }

    if (options.isLitePreview) {
      conditions.push(eq(prompts.isLitePreview, true));
    }

    if (options.isHidden !== undefined) {
      conditions.push(eq(prompts.isHidden, options.isHidden));
    }
    
    if (options.category) {
      conditions.push(eq(prompts.category, options.category));
    }
    
    if (options.status) {
      conditions.push(eq(prompts.status, options.status as any));
    }
    
    if (options.statusNotEqual) {
      conditions.push(sql`${prompts.status} != ${options.statusNotEqual}`);
    }
    
    if (options.tags && options.tags.length > 0) {
      conditions.push(sql`${prompts.tags} && ARRAY[${sql.raw(options.tags.map(t => `'${t.replace(/'/g, "''")}'`).join(','))}]::text[]`);
    }
    
    // Add filtering for new array fields
    if (options.categories && options.categories.length > 0) {
      // Check both the array field and the singular field for backward compatibility
      conditions.push(
        or(
          // Check if the categories array contains any of the requested categories
          sql`${prompts.categories} && ARRAY[${sql.raw(options.categories.map(c => `'${c.replace(/'/g, "''")}'`).join(','))}]::text[]`,
          // Also check the singular category field for backward compatibility
          inArray(prompts.category, options.categories)
        )
      );
    }
    
    if (options.promptTypes && options.promptTypes.length > 0) {
      // Check both the array field and the singular field for backward compatibility
      conditions.push(
        or(
          // Check if the promptTypes array contains any of the requested types
          sql`${prompts.promptTypes} && ARRAY[${sql.raw(options.promptTypes.map(t => `'${t.replace(/'/g, "''")}'`).join(','))}]::text[]`,
          // Also check the singular promptType field for backward compatibility
          inArray(prompts.promptType, options.promptTypes)
        )
      );
    }
    
    if (options.promptStyles && options.promptStyles.length > 0) {
      // Check both the array field and the singular field for backward compatibility
      conditions.push(
        or(
          // Check if the promptStyles array contains any of the requested styles
          sql`${prompts.promptStyles} && ARRAY[${sql.raw(options.promptStyles.map(s => `'${s.replace(/'/g, "''")}'`).join(','))}]::text[]`,
          // Also check the singular promptStyle field for backward compatibility
          inArray(prompts.promptStyle, options.promptStyles)
        )
      );
    }
    
    if (options.intendedGenerators && options.intendedGenerators.length > 0) {
      // Check both the array field and the singular field for backward compatibility
      conditions.push(
        or(
          // Check if the intendedGenerators array contains any of the requested generators
          sql`${prompts.intendedGenerators} && ARRAY[${sql.raw(options.intendedGenerators.map(g => `'${g.replace(/'/g, "''")}'`).join(','))}]::text[]`,
          // Also check the singular intendedGenerator field for backward compatibility
          inArray(prompts.intendedGenerator, options.intendedGenerators)
        )
      );
    }
    
    if (options.collectionIds && options.collectionIds.length > 0) {
      conditions.push(sql`${prompts.collectionIds} && ARRAY[${sql.raw(options.collectionIds.map(id => `'${id.replace(/'/g, "''")}'`).join(','))}]::text[]`);
    }
    
    if (options.recommendedModels && options.recommendedModels.length > 0) {
      conditions.push(sql`${prompts.recommendedModels} && ARRAY[${sql.raw(options.recommendedModels.map(m => `'${m.replace(/'/g, "''")}'`).join(','))}]::text[]`);
    }
    
    // Filter by single collectionId field
    if (options.collectionId) {
      conditions.push(eq(prompts.collectionId, options.collectionId));
    }
    
    // Filter by shared community through junction table
    if (options.communityId) {
      // Need to join with promptCommunitySharing to filter by shared communities
      // We'll handle this in the query builder below since it requires a join
    }
    
    if (options.search) {
      conditions.push(
        or(
          ilike(prompts.name, `%${options.search}%`),
          ilike(prompts.description, `%${options.search}%`),
          ilike(prompts.promptContent, `%${options.search}%`)
        )
      );
    }
    
    if (options.promptIds && options.promptIds.length > 0) {
      conditions.push(inArray(prompts.id, options.promptIds));
    }
    
    // Filter by sub-community if specified
    if (options.subCommunityId) {
      conditions.push(eq(prompts.subCommunityId, options.subCommunityId));
      // When filtering by specific sub-community, still need to check access
      // but this is handled below
    }
    
    // Access control for private community prompts
    // Apply this logic unless we're filtering by a specific subCommunityId
    // (when filtering by specific subCommunityId, access control should be handled separately)
    if (!options.subCommunityId) {
      if (options.authenticatedUserId) {
        // Get the authenticated user to check their role
        const authenticatedUser = await this.getUser(options.authenticatedUserId);
        const isPrivilegedUser = authenticatedUser && 
          ['super_admin', 'global_admin', 'developer'].includes(authenticatedUser.role || '');
        
        if (!isPrivilegedUser) {
          // For non-privileged users, filter prompts based on community membership
          // Get all sub-communities the user is a member of
          const userCommunityMemberships = await db
            .select({ subCommunityId: userCommunities.subCommunityId })
            .from(userCommunities)
            .where(eq(userCommunities.userId, options.authenticatedUserId));
          
          const memberSubCommunityIds = userCommunityMemberships
            .filter(m => m.subCommunityId !== null)
            .map(m => m.subCommunityId as string);
          
          // Add condition: show prompts that either:
          // 1. Have no subCommunityId (global community prompts)
          // 2. Belong to a sub-community the user is a member of
          conditions.push(
            or(
              isNull(prompts.subCommunityId),
              memberSubCommunityIds.length > 0 
                ? inArray(prompts.subCommunityId, memberSubCommunityIds)
                : sql`false` // If user is not member of any sub-community, don't show any sub-community prompts
            )
          );
        }
        // If user is privileged (super_admin, global_admin, developer), no filtering needed - they see all prompts
      } else {
        // No authenticated user, only show global community prompts (no subCommunityId)
        conditions.push(isNull(prompts.subCommunityId));
      }
    }
    
    // Filter NSFW content based on user preference
    if (options.showNsfw === false) {
      conditions.push(eq(prompts.isNsfw, false));
    }

    // Build query step by step to avoid TypeScript issues
    // Build base query differently depending on whether we're filtering by community
    let queryBuilder;
    
    if (options.communityId) {
      // When filtering by community, we need to join with promptCommunitySharing
      // and build the query with the join from the start
      queryBuilder = db.select({
        id: prompts.id,
        name: prompts.name,
        description: prompts.description,
        category: prompts.category,
        promptType: prompts.promptType,
        promptStyle: prompts.promptStyle,
        categories: prompts.categories,
        promptTypes: prompts.promptTypes,
        promptStyles: prompts.promptStyles,
        tags: prompts.tags,
        tagsNormalized: prompts.tagsNormalized,
        isPublic: prompts.isPublic,
        isFeatured: prompts.isFeatured,
        isNsfw: prompts.isNsfw,
        status: prompts.status,
        exampleImagesUrl: prompts.exampleImagesUrl,
        notes: prompts.notes,
        author: prompts.author,
        sourceUrl: prompts.sourceUrl,
        version: prompts.version,
        branchOf: prompts.branchOf,
        usageCount: prompts.usageCount,
        likes: prompts.likes,
        qualityScore: prompts.qualityScore,
        intendedGenerator: prompts.intendedGenerator,
        intendedGenerators: prompts.intendedGenerators,
        recommendedModels: prompts.recommendedModels,
        technicalParams: prompts.technicalParams,
        variables: prompts.variables,
        projectId: prompts.projectId,
        collectionId: prompts.collectionId,
        collectionIds: prompts.collectionIds,
        relatedPrompts: prompts.relatedPrompts,
        license: prompts.license,
        lastUsedAt: prompts.lastUsedAt,
        userId: prompts.userId,
        subCommunityId: prompts.subCommunityId,
        subCommunityVisibility: prompts.subCommunityVisibility,
        createdAt: prompts.createdAt,
        updatedAt: prompts.updatedAt,
        promptContent: prompts.promptContent,
        negativePrompt: prompts.negativePrompt,
        isLiteFeatured: prompts.isLiteFeatured,
        isLitePreview: prompts.isLitePreview,
        user: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          username: users.username,
          profileImageUrl: users.profileImageUrl,
        }
      })
      .from(prompts)
      .leftJoin(users, eq(prompts.userId, users.id))
      .innerJoin(promptCommunitySharing, eq(prompts.id, promptCommunitySharing.promptId))
      .where(and(
        eq(promptCommunitySharing.communityId, options.communityId),
        ...(conditions.length > 0 ? conditions : [])
      ));
    } else {
      // Normal query without community filtering
      queryBuilder = db.select({
        id: prompts.id,
        name: prompts.name,
        description: prompts.description,
        category: prompts.category,
        promptType: prompts.promptType,
        promptStyle: prompts.promptStyle,
        categories: prompts.categories,
        promptTypes: prompts.promptTypes,
        promptStyles: prompts.promptStyles,
        tags: prompts.tags,
        tagsNormalized: prompts.tagsNormalized,
        isPublic: prompts.isPublic,
        isFeatured: prompts.isFeatured,
        isNsfw: prompts.isNsfw,
        status: prompts.status,
        exampleImagesUrl: prompts.exampleImagesUrl,
        notes: prompts.notes,
        author: prompts.author,
        sourceUrl: prompts.sourceUrl,
        version: prompts.version,
        branchOf: prompts.branchOf,
        usageCount: prompts.usageCount,
        likes: prompts.likes,
        qualityScore: prompts.qualityScore,
        intendedGenerator: prompts.intendedGenerator,
        intendedGenerators: prompts.intendedGenerators,
        recommendedModels: prompts.recommendedModels,
        technicalParams: prompts.technicalParams,
        variables: prompts.variables,
        projectId: prompts.projectId,
        collectionId: prompts.collectionId,
        collectionIds: prompts.collectionIds,
        relatedPrompts: prompts.relatedPrompts,
        license: prompts.license,
        lastUsedAt: prompts.lastUsedAt,
        userId: prompts.userId,
        subCommunityId: prompts.subCommunityId,
        subCommunityVisibility: prompts.subCommunityVisibility,
        createdAt: prompts.createdAt,
        updatedAt: prompts.updatedAt,
        promptContent: prompts.promptContent,
        negativePrompt: prompts.negativePrompt,
        isLiteFeatured: prompts.isLiteFeatured,
        isLitePreview: prompts.isLitePreview,
        user: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          username: users.username,
          profileImageUrl: users.profileImageUrl,
        }
      })
      .from(prompts)
      .leftJoin(users, eq(prompts.userId, users.id));
      
      // Apply conditions normally if not filtering by community
      if (conditions.length > 0) {
        queryBuilder = queryBuilder.where(and(...conditions));
      }
    }
    
    queryBuilder = queryBuilder.$dynamic();
    
    // Apply ordering
    queryBuilder = queryBuilder.orderBy(desc(prompts.updatedAt));
    
    // Apply limit if specified
    if (options.limit) {
      queryBuilder = queryBuilder.limit(options.limit);
    }
    
    // Apply offset if specified
    if (options.offset) {
      queryBuilder = queryBuilder.offset(options.offset);
    }
    
    return await queryBuilder;
  }

  async getPrompt(id: string): Promise<Prompt | undefined> {
    const [prompt] = await db.select().from(prompts).where(eq(prompts.id, id));
    return prompt;
  }

  async getPromptWithUser(id: string, authenticatedUserId?: string): Promise<any> {
    const [result] = await db
      .select({
        id: prompts.id,
        name: prompts.name,
        description: prompts.description,
        category: prompts.category,
        promptType: prompts.promptType,
        promptStyle: prompts.promptStyle,
        categories: prompts.categories,
        promptTypes: prompts.promptTypes,
        promptStyles: prompts.promptStyles,
        tags: prompts.tags,
        tagsNormalized: prompts.tagsNormalized,
        isPublic: prompts.isPublic,
        isFeatured: prompts.isFeatured,
        isNsfw: prompts.isNsfw,
        status: prompts.status,
        exampleImagesUrl: prompts.exampleImagesUrl,
        notes: prompts.notes,
        author: prompts.author,
        sourceUrl: prompts.sourceUrl,
        version: prompts.version,
        branchOf: prompts.branchOf,
        usageCount: prompts.usageCount,
        likes: prompts.likes,
        qualityScore: prompts.qualityScore,
        intendedGenerator: prompts.intendedGenerator,
        intendedGenerators: prompts.intendedGenerators,
        recommendedModels: prompts.recommendedModels,
        technicalParams: prompts.technicalParams,
        variables: prompts.variables,
        projectId: prompts.projectId,
        collectionId: prompts.collectionId,
        collectionIds: prompts.collectionIds,
        relatedPrompts: prompts.relatedPrompts,
        license: prompts.license,
        lastUsedAt: prompts.lastUsedAt,
        userId: prompts.userId,
        subCommunityId: prompts.subCommunityId,
        subCommunityVisibility: prompts.subCommunityVisibility,
        createdAt: prompts.createdAt,
        updatedAt: prompts.updatedAt,
        promptContent: prompts.promptContent,
        negativePrompt: prompts.negativePrompt,
        user: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          username: users.username,
          profileImageUrl: users.profileImageUrl,
        }
      })
      .from(prompts)
      .leftJoin(users, eq(prompts.userId, users.id))
      .where(eq(prompts.id, id));
    
    if (!result) {
      return null;
    }

    // If the prompt is in a private community (has subCommunityId), check if user has access
    if (result.subCommunityId && authenticatedUserId) {
      // Check if user is a member of the community
      const isMember = await this.isCommunityMember(authenticatedUserId, result.subCommunityId);
      if (!isMember) {
        // User doesn't have access to this prompt
        return null;
      }
    } else if (result.subCommunityId && !authenticatedUserId) {
      // Prompt is in a private community but user is not authenticated
      return null;
    }
    
    return result;
  }

  async createPrompt(prompt: InsertPrompt & { sharedCommunityIds?: string[] }): Promise<Prompt> {
    const id = generatePromptId();
    const { sharedCommunityIds, ...promptData } = prompt;
    
    const [newPrompt] = await db
      .insert(prompts)
      .values({ ...promptData, id })
      .returning();
    
    // Handle community sharing if specified
    if (sharedCommunityIds && sharedCommunityIds.length > 0) {
      await this.updatePromptCommunitySharing(newPrompt.id, sharedCommunityIds, promptData.userId);
    }
    
    return newPrompt;
  }

  async updatePrompt(id: string, prompt: Partial<InsertPrompt> & { sharedCommunityIds?: string[] }): Promise<Prompt> {
    const { sharedCommunityIds, ...promptData } = prompt;
    
    const [updatedPrompt] = await db
      .update(prompts)
      .set({ ...promptData, updatedAt: new Date() })
      .where(eq(prompts.id, id))
      .returning();
    
    // Handle community sharing if specified
    if (sharedCommunityIds !== undefined) {
      await this.updatePromptCommunitySharing(id, sharedCommunityIds, updatedPrompt.userId);
    }
    
    return updatedPrompt;
  }

  async deletePrompt(id: string): Promise<void> {
    // First delete all related records to avoid foreign key constraint violations
    // Delete all likes for this prompt
    await db.delete(promptLikes).where(eq(promptLikes.promptId, id));
    
    // Delete all favorites for this prompt
    await db.delete(promptFavorites).where(eq(promptFavorites.promptId, id));
    
    // Delete all ratings for this prompt
    await db.delete(promptRatings).where(eq(promptRatings.promptId, id));
    
    // Delete all community sharing entries for this prompt
    await db.delete(promptCommunitySharing).where(eq(promptCommunitySharing.promptId, id));
    
    // Delete all activities related to this prompt
    await db.delete(activities).where(
      and(
        eq(activities.targetId, id),
        eq(activities.targetType, "prompt")
      )
    );
    
    // Now delete the prompt itself
    await db.delete(prompts).where(eq(prompts.id, id));
  }

  // Method to update prompt community sharing
  async updatePromptCommunitySharing(promptId: string, communityIds: string[], sharedBy: string): Promise<void> {
    // First, delete existing sharing entries for this prompt
    await db.delete(promptCommunitySharing).where(eq(promptCommunitySharing.promptId, promptId));
    
    // Then, insert new sharing entries
    if (communityIds.length > 0) {
      const sharingEntries = communityIds.map(communityId => ({
        promptId,
        communityId,
        sharedBy,
      }));
      
      await db.insert(promptCommunitySharing).values(sharingEntries);
    }
  }

  // Method to get community IDs a prompt is shared with
  async getPromptSharedCommunities(promptId: string): Promise<string[]> {
    const result = await db
      .select({ communityId: promptCommunitySharing.communityId })
      .from(promptCommunitySharing)
      .where(eq(promptCommunitySharing.promptId, promptId));
    
    return result.map(r => r.communityId);
  }

  async getPromptRelatedData(id: string): Promise<{
    likesCount: number;
    favoritesCount: number;
    ratingsCount: number;
  }> {
    // Count likes for this prompt
    const likesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(promptLikes)
      .where(eq(promptLikes.promptId, id));
    
    // Count favorites for this prompt
    const favoritesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(promptFavorites)
      .where(eq(promptFavorites.promptId, id));
    
    // Count ratings for this prompt
    const ratingsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(promptRatings)
      .where(eq(promptRatings.promptId, id));
    
    return {
      likesCount: Number(likesResult[0]?.count || 0),
      favoritesCount: Number(favoritesResult[0]?.count || 0),
      ratingsCount: Number(ratingsResult[0]?.count || 0),
    };
  }

  async branchPrompt(promptId: string, userId: string): Promise<Prompt> {
    const [originalPrompt] = await db.select().from(prompts).where(eq(prompts.id, promptId));
    if (!originalPrompt) {
      throw new Error("Prompt not found");
    }

    const branchedPrompt: InsertPrompt = {
      name: `${originalPrompt.name} (Branch)`,
      description: originalPrompt.description,
      category: originalPrompt.category,
      promptContent: originalPrompt.promptContent,
      negativePrompt: originalPrompt.negativePrompt,
      promptType: originalPrompt.promptType,
      promptStyle: originalPrompt.promptStyle,
      tags: originalPrompt.tags || [],
      tagsNormalized: originalPrompt.tagsNormalized || [],
      isPublic: false,
      isFeatured: false,
      status: "draft" as const,
      exampleImagesUrl: originalPrompt.exampleImagesUrl || [],
      notes: originalPrompt.notes,
      author: originalPrompt.author,
      sourceUrl: originalPrompt.sourceUrl,
      version: 1,
      branchOf: originalPrompt.id,
      intendedGenerator: originalPrompt.intendedGenerator,
      recommendedModels: originalPrompt.recommendedModels || [],
      technicalParams: originalPrompt.technicalParams as any,
      variables: originalPrompt.variables as any,
      projectId: originalPrompt.projectId,
      collectionId: null,
      relatedPrompts: originalPrompt.relatedPrompts || [],
      license: originalPrompt.license,
      userId,
    };

    const newPrompt = await this.createPrompt(branchedPrompt);
    
    // Create notification when someone branches a prompt (if the original has an owner)
    if (originalPrompt.userId && originalPrompt.userId !== userId) {
      const [brancher] = await db.select().from(users).where(eq(users.id, userId));
      if (brancher) {
        await this.createNotification({
          userId: originalPrompt.userId,
          type: "branch",
          message: `${brancher.username || brancher.firstName || 'Someone'} branched your prompt "${originalPrompt.name}"`,
          relatedUserId: userId,
          relatedPromptId: newPrompt.id,
          relatedListId: null,
          isRead: false,
          metadata: { 
            originalPromptId: originalPrompt.id,
            originalPromptName: originalPrompt.name,
            branchedPromptId: newPrompt.id
          }
        });
      }
    }

    return newPrompt;
  }

  async contributeImagesToPrompt(promptId: string, imageUrls: string[], contributorId: string): Promise<Prompt> {
    // Get the prompt to check if it exists and is public
    const [prompt] = await db.select().from(prompts).where(eq(prompts.id, promptId));
    if (!prompt) {
      throw new Error("Prompt not found");
    }
    if (!prompt.isPublic) {
      throw new Error("Cannot contribute images to private prompts");
    }
    // Don't allow users to contribute to their own prompts through this endpoint
    if (prompt.userId === contributorId) {
      throw new Error("Use the edit prompt endpoint to add images to your own prompts");
    }

    // Get contributor details
    const [contributor] = await db.select().from(users).where(eq(users.id, contributorId));
    if (!contributor) {
      throw new Error("Contributor not found");
    }

    // Merge the new images with existing ones
    const existingImages = prompt.exampleImagesUrl || [];
    const updatedImages = [...existingImages, ...imageUrls];
    
    // Limit total images per prompt to prevent abuse
    const maxImages = 30;
    if (updatedImages.length > maxImages) {
      throw new Error(`Prompt cannot have more than ${maxImages} example images`);
    }

    // Store each contribution in the contributions table
    const contributionPromises = imageUrls.map(imageUrl => 
      db.insert(promptImageContributions).values({
        promptId: promptId,
        imageUrl: imageUrl,
        contributorId: contributorId,
        isApproved: true, // Auto-approve for now
      })
    );
    await Promise.all(contributionPromises);

    // Update the prompt with new images
    const [updatedPrompt] = await db
      .update(prompts)
      .set({ 
        exampleImagesUrl: updatedImages,
        updatedAt: new Date() 
      })
      .where(eq(prompts.id, promptId))
      .returning();

    // Create a notification for the prompt owner
    if (prompt.userId) {
      const contributorUsername = contributor.username || contributor.email || 'Someone';
      // Use the createNotification method which properly generates the ID
      await this.createNotification({
        userId: prompt.userId,
        type: 'image_contribution',
        message: `${contributorUsername} added ${imageUrls.length} example image${imageUrls.length > 1 ? 's' : ''} to your prompt "${prompt.name}"`,
        relatedUserId: contributorId,
        relatedPromptId: promptId,
        relatedListId: null,
        relatedImageId: imageUrls[0], // Use the first image URL as reference
        isRead: false,
        metadata: {
          imageCount: imageUrls.length,
          imageUrls: imageUrls,
          contributorUsername: contributorUsername,
          promptName: prompt.name
        }
      });
    }

    // Log the contribution as an activity
    await db.insert(activities).values({
      userId: contributorId,
      actionType: "shared_prompt",
      targetId: promptId,
      targetType: "prompt",
      metadata: { 
        action: "contributed_images",
        imageCount: imageUrls.length 
      },
    });

    return updatedPrompt;
  }

  // Project operations
  async getProjects(userId: string): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.ownerId, userId)).orderBy(desc(projects.updatedAt));
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async updateProject(id: string, project: Partial<InsertProject>): Promise<Project> {
    const [updatedProject] = await db
      .update(projects)
      .set({ ...project, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updatedProject;
  }

  async deleteProject(id: string): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Collection operations
  async getCollections(options: { userId?: string; communityId?: string; type?: string; isPublic?: boolean; search?: string; limit?: number; offset?: number; } = {}): Promise<(Collection & { promptCount?: number })[]> {
    let query = db.select().from(collections).$dynamic();
    
    const conditions = [];
    
    if (options.userId) {
      conditions.push(eq(collections.userId, options.userId));
    }
    
    if (options.communityId) {
      conditions.push(eq(collections.communityId, options.communityId));
    }
    
    if (options.type) {
      conditions.push(eq(collections.type, options.type as any));
    }
    
    if (options.isPublic !== undefined) {
      conditions.push(eq(collections.isPublic, options.isPublic));
    }
    
    if (options.search) {
      conditions.push(
        or(
          ilike(collections.name, `%${options.search}%`),
          ilike(collections.description, `%${options.search}%`)
        )
      );
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    let collectionsQuery = query.orderBy(desc(collections.updatedAt));
    
    if (options.limit) {
      collectionsQuery = collectionsQuery.limit(options.limit);
    }
    
    if (options.offset) {
      collectionsQuery = collectionsQuery.offset(options.offset);
    }
    
    const collectionsData = await collectionsQuery;
    
    // Add prompt count for each collection
    const collectionsWithCount = await Promise.all(
      collectionsData.map(async (collection) => {
        const promptCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(prompts)
          .where(eq(prompts.collectionId, collection.id))
          .then(result => result[0]?.count || 0);
        
        return {
          ...collection,
          promptCount
        };
      })
    );
    
    return collectionsWithCount;
  }

  async getCollection(id: string): Promise<Collection | undefined> {
    const [collection] = await db.select().from(collections).where(eq(collections.id, id));
    return collection;
  }

  async createCollection(collection: InsertCollection & { sharedCommunityIds?: string[] }): Promise<Collection> {
    const { sharedCommunityIds, ...collectionData } = collection;
    
    const [newCollection] = await db.insert(collections).values(collectionData).returning();
    
    // Handle community sharing if specified
    if (sharedCommunityIds && sharedCommunityIds.length > 0) {
      await this.updateCollectionCommunitySharing(newCollection.id, sharedCommunityIds);
    }
    
    return newCollection;
  }

  async updateCollection(id: string, collection: Partial<InsertCollection> & { sharedCommunityIds?: string[] }): Promise<Collection> {
    const { sharedCommunityIds, ...collectionData } = collection;
    
    const [updatedCollection] = await db
      .update(collections)
      .set({ ...collectionData, updatedAt: new Date() })
      .where(eq(collections.id, id))
      .returning();
    
    // Handle community sharing if specified
    if (sharedCommunityIds !== undefined) {
      await this.updateCollectionCommunitySharing(id, sharedCommunityIds);
    }
    
    return updatedCollection;
  }

  async deleteCollection(id: string): Promise<void> {
    // Delete community sharing entries first
    await db.delete(collectionCommunitySharing).where(eq(collectionCommunitySharing.collectionId, id));
    // Then delete the collection
    await db.delete(collections).where(eq(collections.id, id));
  }

  // Method to update collection community sharing
  async updateCollectionCommunitySharing(collectionId: string, communityIds: string[]): Promise<void> {
    // First, delete existing sharing entries for this collection
    await db.delete(collectionCommunitySharing).where(eq(collectionCommunitySharing.collectionId, collectionId));
    
    // Then, insert new sharing entries
    if (communityIds.length > 0) {
      const sharingEntries = communityIds.map(communityId => ({
        collectionId,
        subCommunityId: communityId,
      }));
      
      await db.insert(collectionCommunitySharing).values(sharingEntries as any);
    }
  }

  // Method to get community IDs a collection is shared with
  async getCollectionSharedCommunities(collectionId: string): Promise<string[]> {
    const result = await db
      .select({ subCommunityId: (collectionCommunitySharing as any).subCommunityId })
      .from(collectionCommunitySharing)
      .where(eq(collectionCommunitySharing.collectionId, collectionId));
    
    return result.map((r: any) => r.subCommunityId);
  }

  // Community operations - returns only global community to non-members
  async getCommunities(): Promise<Community[]> {
    return await db.select().from(communities)
      .where(eq(communities.isActive, true))
      .orderBy(desc(communities.createdAt));
  }

  // Get only the global community (accessible to everyone)
  // The global community is specifically identified by slug "global" or "general"
  async getGlobalCommunity(): Promise<Community | undefined> {
    const [community] = await db.select().from(communities)
      .where(and(
        eq(communities.isActive, true), 
        or(
          eq(communities.slug, 'global'),
          eq(communities.slug, 'general')
        )
      ));
    return community;
  }

  // Get private communities that a user has access to
  async getUserPrivateCommunities(userId: string): Promise<Community[]> {
    console.log(`[getUserPrivateCommunities] Fetching private communities for user: ${userId}`);
    try {
      // Try query with status column first (new schema)
      const results = await db
        .select()
        .from(communities)
        .innerJoin(userCommunities, eq(communities.id, userCommunities.communityId))
        .where(
          and(
            eq(userCommunities.userId, userId),
            eq(communities.isActive, true),
            // Include communities where user has accepted membership or no status (backward compatibility)
            or(
              eq(userCommunities.status, 'accepted'),
              isNull(userCommunities.status)
            )
          )
        )
        .orderBy(desc(communities.createdAt));
      
      // Extract just the community data from the joined result
      const communityData = results.map(r => r.communities);
      console.log(`[getUserPrivateCommunities] Found ${communityData.length} private communities for user ${userId}:`, communityData.map(c => ({ id: c.id, name: c.name, slug: c.slug })));
      return communityData;
    } catch (error) {
      console.error("Error fetching user communities with status column:", error);
      // Fallback: Query without status column (for backward compatibility)
      try {
        const fallbackResults = await db
          .select()
          .from(communities)
          .innerJoin(userCommunities, eq(communities.id, userCommunities.communityId))
          .where(
            and(
              eq(userCommunities.userId, userId),
              eq(communities.isActive, true)
            )
          )
          .orderBy(desc(communities.createdAt));
        
        // Extract just the community data from the joined result
        const communityData = fallbackResults.map(r => r.communities);
        console.log(`[getUserPrivateCommunities] Fallback found ${communityData.length} private communities for user ${userId}:`, communityData.map(c => ({ id: c.id, name: c.name, slug: c.slug })));
        return communityData;
      } catch (fallbackError) {
        console.error("Fallback also failed:", fallbackError);
        // Last resort: return empty array
        return [];
      }
    }
  }

  // Get all non-global communities (for super_admin and global_admin)
  async getAllPrivateCommunities(): Promise<Community[]> {
    // All communities are private except for the ones with slug 'global' or 'general'
    return await db.select().from(communities)
      .where(and(
        eq(communities.isActive, true),
        and(
          sql`${communities.slug} != 'global'`,
          sql`${communities.slug} != 'general'`
        )
      ))
      .orderBy(desc(communities.createdAt));
  }

  async getManagedCommunities(userId: string): Promise<Community[]> {
    // Get the user to check their global role
    const user = await this.getUser(userId);
    
    if (user && (user.role === "super_admin" || user.role === "global_admin" || user.role === "developer" || user.role === "community_admin")) {
      // If user has global admin role, get communities from communityAdmins table (legacy)
      const legacyAdminCommunities = await db
        .select({
          id: communities.id,
          name: communities.name,
          description: communities.description,
          slug: communities.slug,
          imageUrl: communities.imageUrl,
          isActive: communities.isActive,
          createdAt: communities.createdAt,
          updatedAt: communities.updatedAt,
        })
        .from(communities)
        .innerJoin(communityAdmins, eq(communities.id, communityAdmins.communityId))
        .where(and(eq(communityAdmins.userId, userId), eq(communities.isActive, true)))
        .orderBy(desc(communities.createdAt));
        
      if (legacyAdminCommunities.length > 0) {
        return legacyAdminCommunities as Community[];
      }
    }
    
    // Also get communities where user is admin through userCommunities table
    const adminCommunities = await db
      .select({
        id: communities.id,
        name: communities.name,
        description: communities.description,
        slug: communities.slug,
        imageUrl: communities.imageUrl,
        isActive: communities.isActive,
        createdAt: communities.createdAt,
        updatedAt: communities.updatedAt,
      })
      .from(communities)
      .innerJoin(userCommunities, eq(communities.id, userCommunities.communityId))
      .where(
        and(
          eq(userCommunities.userId, userId),
          eq(userCommunities.role, "admin"),
          eq(userCommunities.status, "accepted"),
          eq(communities.isActive, true)
        )
      )
      .orderBy(desc(communities.createdAt));
      
    return adminCommunities as Community[];
  }

  async getCommunity(id: string): Promise<Community | undefined> {
    const [community] = await db.select().from(communities).where(eq(communities.id, id));
    return community;
  }

  async getCommunityBySlug(slug: string): Promise<Community | undefined> {
    const [community] = await db.select().from(communities).where(eq(communities.slug, slug));
    return community;
  }

  async createCommunity(community: InsertCommunity): Promise<Community> {
    const [newCommunity] = await db.insert(communities).values(community).returning();
    return newCommunity;
  }

  async updateCommunity(id: string, community: Partial<InsertCommunity>): Promise<Community> {
    const [updatedCommunity] = await db
      .update(communities)
      .set({ ...community, updatedAt: new Date() })
      .where(eq(communities.id, id))
      .returning();
    return updatedCommunity;
  }

  async deleteCommunity(id: string): Promise<void> {
    await db.update(communities).set({ isActive: false }).where(eq(communities.id, id));
  }

  // Community membership operations
  async joinCommunity(userId: string, communityId: string, role: CommunityRole = "member"): Promise<UserCommunity> {
    const [membership] = await db.insert(userCommunities).values({
      userId,
      communityId,
      role,
    }).returning();
    
    // Get community details for notification
    const community = await this.getCommunity(communityId);
    if (community) {
      // Don't send notifications for the global/general community (it's public)
      if (community.slug !== 'global' && community.slug !== 'general') {
        // Create notification for the user being added to the private community
        const roleText = role === 'admin' ? 'an admin' : 'a member';
        await this.createNotification({
          userId,
          type: 'community_join',
          message: `You have been added to the community "${community.name}" as ${roleText}`,
          relatedUserId: null,
          relatedPromptId: null,
          relatedListId: null,
          isRead: false,
          metadata: { 
            communityId,
            communityName: community.name,
            role
          }
        });
      }
    }
    
    return membership;
  }

  async leaveCommunity(userId: string, communityId: string): Promise<void> {
    await db.delete(userCommunities).where(
      and(eq(userCommunities.userId, userId), eq(userCommunities.communityId, communityId))
    );
  }

  async getUserCommunities(userId: string): Promise<UserCommunity[]> {
    console.log(`[getUserCommunities] Fetching communities for user: ${userId}`);
    try {
      // Only return accepted memberships (or null/undefined for backward compatibility)
      const results = await db.select().from(userCommunities).where(
        and(
          eq(userCommunities.userId, userId),
          or(
            eq(userCommunities.status, 'accepted'),
            isNull(userCommunities.status) // For backward compatibility with existing members
          )
        )
      );
      console.log(`[getUserCommunities] Found ${results.length} communities for user ${userId}:`, results);
      return results;
    } catch (error) {
      console.error("Error fetching user communities with full schema:", error);
      // Fallback: try selecting only the columns that exist
      try {
        const results = await db.select({
          id: userCommunities.id,
          userId: userCommunities.userId,
          communityId: userCommunities.communityId,
          role: userCommunities.role,
          joinedAt: userCommunities.joinedAt,
        }).from(userCommunities).where(eq(userCommunities.userId, userId));
        
        console.log(`[getUserCommunities] Fallback found ${results.length} communities for user ${userId}:`, results);
        // Add default status for backward compatibility - these are all accepted since they're old records
        return results.map(r => ({ ...r, status: 'accepted' as any, invitedBy: null, subCommunityId: null, respondedAt: null }));
      } catch (fallbackError) {
        console.error("Fallback also failed:", fallbackError);
        throw fallbackError;
      }
    }
  }

  async getCommunityMembers(communityId: string): Promise<any[]> {
    try {
      // Try with status column first
      return await db
        .select({
          id: userCommunities.id,
          userId: userCommunities.userId,
          communityId: userCommunities.communityId,
          role: userCommunities.role,
          status: userCommunities.status,
          joinedAt: userCommunities.joinedAt,
          user: {
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            username: users.username,
            profileImageUrl: users.profileImageUrl,
          }
        })
        .from(userCommunities)
        .leftJoin(users, eq(userCommunities.userId, users.id))
        .where(
          and(
            eq(userCommunities.communityId, communityId),
            or(
              eq(userCommunities.status, 'accepted'),
              isNull(userCommunities.status) // For existing members without status field
            )
          )
        );
    } catch (error) {
      console.error("Error fetching community members with status:", error);
      // Fallback without status column
      const results = await db
        .select({
          id: userCommunities.id,
          userId: userCommunities.userId,
          communityId: userCommunities.communityId,
          role: userCommunities.role,
          joinedAt: userCommunities.joinedAt,
          user: {
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            username: users.username,
            profileImageUrl: users.profileImageUrl,
          }
        })
        .from(userCommunities)
        .leftJoin(users, eq(userCommunities.userId, users.id))
        .where(eq(userCommunities.communityId, communityId));
      
      // Add default status for backward compatibility
      return results.map(r => ({ ...r, status: 'accepted' }));
    }
  }

  async updateCommunityMemberRole(userId: string, communityId: string, role: CommunityRole): Promise<UserCommunity> {
    const [updatedMembership] = await db
      .update(userCommunities)
      .set({ role })
      .where(and(eq(userCommunities.userId, userId), eq(userCommunities.communityId, communityId)))
      .returning();
    return updatedMembership;
  }

  async isCommunityMember(userId: string, communityId: string): Promise<boolean> {
    const [membership] = await db
      .select()
      .from(userCommunities)
      .where(and(eq(userCommunities.userId, userId), eq(userCommunities.communityId, communityId)));
    return !!membership;
  }

  async isCommunityAdmin(userId: string, communityId: string): Promise<boolean> {
    const [membership] = await db
      .select()
      .from(userCommunities)
      .where(
        and(
          eq(userCommunities.userId, userId),
          eq(userCommunities.communityId, communityId),
          eq(userCommunities.role, "admin")
        )
      );
    return !!membership;
  }

  // User role operations
  async updateUserRole(userId: string, role: UserRole): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  // Social operations
  async toggleLike(userId: string, promptId: string): Promise<boolean> {
    // Input validation
    if (!userId || !promptId) {
      throw new Error("User ID and Prompt ID are required");
    }

    // Use a transaction to ensure data consistency
    return await db.transaction(async (tx) => {
      // First, verify the prompt exists
      const [promptExists] = await tx
        .select({ id: prompts.id })
        .from(prompts)
        .where(eq(prompts.id, promptId));
      
      if (!promptExists) {
        throw new Error("Prompt not found");
      }

      // Check for existing like
      const existingLikes = await tx
        .select()
        .from(promptLikes)
        .where(and(eq(promptLikes.userId, userId), eq(promptLikes.promptId, promptId)));

      let isLiked: boolean;

      if (existingLikes.length > 0) {
        // Unlike: Remove ALL duplicate likes (in case there are any)
        await tx.delete(promptLikes)
          .where(and(eq(promptLikes.userId, userId), eq(promptLikes.promptId, promptId)));
        
        isLiked = false;
      } else {
        // Like: Add a new like (the unique constraint will prevent duplicates)
        try {
          await tx.insert(promptLikes).values({ 
            userId, 
            promptId,
            createdAt: new Date()
          });
          isLiked = true;
        } catch (error: any) {
          // If we get a unique constraint violation, the like already exists
          // This can happen in a race condition - treat it as already liked
          if (error.code === '23505' || error.constraint === 'prompt_likes_user_id_prompt_id_key') { 
            // PostgreSQL unique violation
            console.log(`Like already exists for user ${userId} on prompt ${promptId} - removing it instead`);
            // Try to remove the like since it exists
            await tx.delete(promptLikes)
              .where(and(eq(promptLikes.userId, userId), eq(promptLikes.promptId, promptId)));
            isLiked = false;
          } else {
            throw error;
          }
        }
      }
      
      // Always recalculate the actual count from source of truth
      const [actualCount] = await tx
        .select({ count: sql<number>`count(*)` })
        .from(promptLikes)
        .where(eq(promptLikes.promptId, promptId));
      
      // Update the prompt with the correct count (single source of truth)
      await tx.update(prompts)
        .set({ 
          likes: actualCount.count || 0,
          updatedAt: new Date()
        })
        .where(eq(prompts.id, promptId));
      
      // Create notification when someone likes a prompt (not when unliking)
      if (isLiked) {
        const [prompt] = await tx.select().from(prompts).where(eq(prompts.id, promptId));
        if (prompt && prompt.userId && prompt.userId !== userId) {
          const [liker] = await tx.select().from(users).where(eq(users.id, userId));
          if (liker) {
            await this.createNotification({
              userId: prompt.userId,
              type: "like",
              message: `${liker.username || liker.firstName || 'Someone'} liked your prompt "${prompt.name}"`,
              relatedUserId: userId,
              relatedPromptId: promptId,
              relatedListId: null,
              isRead: false,
              metadata: { promptName: prompt.name }
            });
          }
        }
      }
      
      return isLiked;
    }).catch((error: any) => {
      console.error("Error toggling like - Full error:", error);
      
      // Provide more specific error messages
      if (error.message === "Prompt not found") {
        throw error;
      }
      
      if (error.code === '40001' || error.code === '40P01') {
        // Serialization failure - suggest retry
        throw new Error("Operation failed due to concurrent update. Please try again.");
      }
      
      if (error.code === '23505' || error.constraint?.includes('unique')) {
        // Unique constraint violation
        throw new Error("Like operation conflict. Please refresh and try again.");
      }
      
      // Log the actual error for debugging
      console.error("Unexpected error in toggleLike:", {
        code: error.code,
        message: error.message,
        constraint: error.constraint,
        detail: error.detail
      });
      
      // Generic error for unexpected issues
      throw new Error(`Failed to toggle like: ${error.message || 'Unknown error'}`);
    });
  }

  async toggleFavorite(userId: string, promptId: string): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(promptFavorites)
      .where(and(eq(promptFavorites.userId, userId), eq(promptFavorites.promptId, promptId)));

    if (existing) {
      await db.delete(promptFavorites).where(eq(promptFavorites.id, existing.id));
      return false;
    } else {
      await db.insert(promptFavorites).values({ userId, promptId });
      return true;
    }
  }

  async removeAllFavorites(promptId: string): Promise<void> {
    // Remove all bookmarks/favorites for this prompt
    await db.delete(promptFavorites).where(eq(promptFavorites.promptId, promptId));
  }

  async checkIfLiked(userId: string, promptId: string): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(promptLikes)
      .where(and(eq(promptLikes.userId, userId), eq(promptLikes.promptId, promptId)));
    return !!existing;
  }
  
  // Cleanup function to remove duplicate likes and fix counts
  async cleanupDuplicateLikes(): Promise<{ duplicatesRemoved: number; promptsFixed: number }> {
    return await db.transaction(async (tx) => {
      // Find all unique user-prompt combinations that have duplicates
      const duplicates = await tx.execute(sql`
        SELECT user_id, prompt_id, COUNT(*) as count
        FROM prompt_likes
        GROUP BY user_id, prompt_id
        HAVING COUNT(*) > 1
      `);
      
      let duplicatesRemoved = 0;
      const promptsToFix = new Set<string>();
      
      // Remove duplicates, keeping only one like per user-prompt combination
      for (const dup of duplicates.rows as any[]) {
        // Get all likes for this combination
        const likes = await tx
          .select()
          .from(promptLikes)
          .where(and(
            eq(promptLikes.userId, dup.user_id),
            eq(promptLikes.promptId, dup.prompt_id)
          ));
        
        // Keep the first like, delete the rest
        if (likes.length > 1) {
          const toDelete = likes.slice(1);
          for (const like of toDelete) {
            await tx.delete(promptLikes).where(eq(promptLikes.id, like.id));
            duplicatesRemoved++;
          }
          promptsToFix.add(dup.prompt_id);
        }
      }
      
      // Fix the like counts for all affected prompts
      for (const promptId of promptsToFix) {
        const [actualCount] = await tx
          .select({ count: sql<number>`count(*)` })
          .from(promptLikes)
          .where(eq(promptLikes.promptId, promptId));
        
        await tx.update(prompts)
          .set({ likes: actualCount.count })
          .where(eq(prompts.id, promptId));
      }
      
      // Also fix any prompts with incorrect like counts (even without duplicates)
      const allPrompts = await tx.select({ id: prompts.id }).from(prompts);
      let additionalFixed = 0;
      
      for (const prompt of allPrompts) {
        const [actualCount] = await tx
          .select({ count: sql<number>`count(*)` })
          .from(promptLikes)
          .where(eq(promptLikes.promptId, prompt.id));
        
        const [currentPrompt] = await tx
          .select({ likes: prompts.likes })
          .from(prompts)
          .where(eq(prompts.id, prompt.id));
        
        if (currentPrompt.likes !== actualCount.count) {
          await tx.update(prompts)
            .set({ likes: actualCount.count })
            .where(eq(prompts.id, prompt.id));
          additionalFixed++;
        }
      }
      
      return { 
        duplicatesRemoved, 
        promptsFixed: promptsToFix.size + additionalFixed 
      };
    });
  }

  async checkIfFavorited(userId: string, promptId: string): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(promptFavorites)
      .where(and(eq(promptFavorites.userId, userId), eq(promptFavorites.promptId, promptId)));
    return !!existing;
  }

  async ratePrompt(rating: InsertPromptRating): Promise<PromptRating> {
    const [existingRating] = await db
      .select()
      .from(promptRatings)
      .where(and(eq(promptRatings.userId, rating.userId), eq(promptRatings.promptId, rating.promptId)));

    if (existingRating) {
      const [updatedRating] = await db
        .update(promptRatings)
        .set({ ...rating, updatedAt: new Date() })
        .where(eq(promptRatings.id, existingRating.id))
        .returning();
      return updatedRating;
    } else {
      const [newRating] = await db.insert(promptRatings).values(rating).returning();
      return newRating;
    }
  }

  async getUserFavorites(userId: string): Promise<PromptFavorite[]> {
    return await db.select().from(promptFavorites).where(eq(promptFavorites.userId, userId));
  }

  async getUserLikes(userId: string): Promise<PromptLike[]> {
    return await db.select().from(promptLikes).where(eq(promptLikes.userId, userId));
  }

  // Stats
  async getUserStats(userId: string): Promise<{
    totalPrompts: number;
    totalLikes: number;
    collections: number;
    branchesCreated: number;
  }> {
    const [userPrompts] = await db
      .select({ count: sql<number>`count(*)` })
      .from(prompts)
      .where(eq(prompts.userId, userId));

    const [userLikes] = await db
      .select({ sum: sql<number>`sum(${prompts.likes})` })
      .from(prompts)
      .where(eq(prompts.userId, userId));

    const [userCollections] = await db
      .select({ count: sql<number>`count(*)` })
      .from(collections)
      .where(eq(collections.userId, userId));

    const [userBranches] = await db
      .select({ count: sql<number>`count(*)` })
      .from(prompts)
      .where(and(eq(prompts.userId, userId), sql`${prompts.branchOf} IS NOT NULL`));

    return {
      totalPrompts: userPrompts?.count || 0,
      totalLikes: userLikes?.sum || 0,
      collections: userCollections?.count || 0,
      branchesCreated: userBranches?.count || 0,
    };
  }

  // Follow operations
  async followUser(followerId: string, followingId: string): Promise<Follow> {
    // Check if already following
    const existingFollow = await db
      .select()
      .from(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)))
      .limit(1);
    
    if (existingFollow.length > 0) {
      return existingFollow[0];
    }

    const [follow] = await db
      .insert(follows)
      .values({ followerId, followingId })
      .returning();
    
    // Create activity for follow
    await this.createActivity({
      userId: followerId,
      actionType: "followed_user",
      targetId: followingId,
      targetType: "user",
    });
    
    // Create notification when someone follows a user
    const [follower] = await db.select().from(users).where(eq(users.id, followerId));
    if (follower) {
      await this.createNotification({
        userId: followingId,
        type: "follow",
        message: `${follower.username || follower.firstName || 'Someone'} started following you`,
        relatedUserId: followerId,
        relatedPromptId: null,
        relatedListId: null,
        isRead: false,
        metadata: { followerUsername: follower.username }
      });
    }
    
    return follow;
  }

  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    await db
      .delete(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)));
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const [follow] = await db
      .select()
      .from(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)))
      .limit(1);
    
    return !!follow;
  }

  async getFollowers(userId: string, limit: number = 50, offset: number = 0): Promise<User[]> {
    const followersResult = await db
      .select({ user: users })
      .from(follows)
      .innerJoin(users, eq(follows.followerId, users.id))
      .where(eq(follows.followingId, userId))
      .orderBy(desc(follows.createdAt))
      .limit(limit)
      .offset(offset);
    
    return followersResult.map(r => r.user);
  }

  async getFollowing(userId: string, limit: number = 50, offset: number = 0): Promise<User[]> {
    const followingResult = await db
      .select({ user: users })
      .from(follows)
      .innerJoin(users, eq(follows.followingId, users.id))
      .where(eq(follows.followerId, userId))
      .orderBy(desc(follows.createdAt))
      .limit(limit)
      .offset(offset);
    
    return followingResult.map(r => r.user);
  }

  async getFollowerCount(userId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(follows)
      .where(eq(follows.followingId, userId));
    
    return result?.count || 0;
  }

  async getFollowingCount(userId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(follows)
      .where(eq(follows.followerId, userId));
    
    return result?.count || 0;
  }

  async getFollowedUsersPrompts(userId: string, limit: number = 50, offset: number = 0): Promise<Prompt[]> {
    // Get the IDs of users that the current user follows
    const followingIds = await db
      .select({ followingId: follows.followingId })
      .from(follows)
      .where(eq(follows.followerId, userId));
    
    if (followingIds.length === 0) {
      return [];
    }
    
    const followingUserIds = followingIds.map(f => f.followingId);
    
    // Get public prompts from followed users, ordered by creation date
    const followedPrompts = await db
      .select({
        prompt: prompts,
        creator: users,
      })
      .from(prompts)
      .innerJoin(users, eq(prompts.userId, users.id))
      .where(and(
        inArray(prompts.userId, followingUserIds),
        eq(prompts.isPublic, true)
      ))
      .orderBy(desc(prompts.createdAt))
      .limit(limit)
      .offset(offset);
    
    return followedPrompts.map(r => ({
      ...r.prompt,
      user: r.creator
    } as Prompt & { user: User }));
  }

  // Activity operations
  async createActivity(activity: Omit<InsertActivity, 'actionType'> & { actionType: string }): Promise<Activity> {
    const [newActivity] = await db
      .insert(activities)
      .values(activity as any)
      .returning();
    
    return newActivity;
  }

  async getActivities(options: {
    userId?: string;
    actionType?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<Activity[]> {
    const conditions: any[] = [];
    
    if (options.userId) {
      conditions.push(eq(activities.userId, options.userId));
    }
    
    if (options.actionType) {
      conditions.push(sql`${activities.actionType} = ${options.actionType}`);
    }
    
    let query = db.select().from(activities).$dynamic();
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    query = query.orderBy(desc(activities.createdAt)) as any;
    
    if (options.limit) {
      query = query.limit(options.limit) as any;
    }
    
    if (options.offset) {
      query = query.offset(options.offset) as any;
    }
    
    return await query;
  }

  async getRecentActivities(limit: number = 20): Promise<any[]> {
    const recentActivities = await db
      .select({
        activity: activities,
        user: users,
      })
      .from(activities)
      .innerJoin(users, eq(activities.userId, users.id))
      .orderBy(desc(activities.createdAt))
      .limit(limit);
    
    // Fetch related entities for each activity
    const enrichedActivities = await Promise.all(
      recentActivities.map(async (r) => {
        const activity = { ...r.activity, user: r.user } as any;
        
        // Fetch target entity based on targetType
        if (activity.targetId && activity.targetType) {
          try {
            switch (activity.targetType) {
              case 'prompt':
                const prompt = await this.getPrompt(activity.targetId);
                if (prompt) {
                  activity.targetEntity = {
                    id: prompt.id,
                    name: prompt.name || 'Untitled Prompt',
                    isPublic: prompt.isPublic
                  };
                }
                break;
              
              case 'user':
                const targetUser = await this.getUser(activity.targetId);
                if (targetUser) {
                  activity.targetEntity = {
                    id: targetUser.id,
                    username: targetUser.username,
                    firstName: targetUser.firstName,
                    lastName: targetUser.lastName
                  };
                }
                break;
              
              case 'collection':
                const collection = await this.getCollection(activity.targetId);
                if (collection) {
                  activity.targetEntity = {
                    id: collection.id,
                    name: collection.name,
                    isPublic: collection.isPublic
                  };
                }
                break;
              
              case 'community':
                const community = await this.getCommunity(activity.targetId);
                if (community) {
                  activity.targetEntity = {
                    id: community.id,
                    name: community.name,
                    slug: community.slug
                  };
                }
                break;
            }
          } catch (error) {
            console.error(`Failed to fetch ${activity.targetType} ${activity.targetId}:`, error);
            // Entity might be deleted, continue without it
          }
        }
        
        return activity;
      })
    );
    
    return enrichedActivities;
  }

  async getUserActivities(userId: string, limit: number = 20, offset: number = 0): Promise<any[]> {
    const userActivities = await db
      .select({
        activity: activities,
        user: users,
      })
      .from(activities)
      .innerJoin(users, eq(activities.userId, users.id))
      .where(eq(activities.userId, userId))
      .orderBy(desc(activities.createdAt))
      .limit(limit)
      .offset(offset);
    
    // Fetch related entities for each activity
    const enrichedActivities = await Promise.all(
      userActivities.map(async (r) => {
        const activity = { ...r.activity, user: r.user } as any;
        
        // Fetch target entity based on targetType
        if (activity.targetId && activity.targetType) {
          try {
            switch (activity.targetType) {
              case 'prompt':
                const prompt = await this.getPrompt(activity.targetId);
                if (prompt) {
                  activity.targetEntity = {
                    id: prompt.id,
                    name: prompt.name || 'Untitled Prompt',
                    isPublic: prompt.isPublic
                  };
                }
                break;
              
              case 'user':
                const targetUser = await this.getUser(activity.targetId);
                if (targetUser) {
                  activity.targetEntity = {
                    id: targetUser.id,
                    username: targetUser.username,
                    firstName: targetUser.firstName,
                    lastName: targetUser.lastName
                  };
                }
                break;
              
              case 'collection':
                const collection = await this.getCollection(activity.targetId);
                if (collection) {
                  activity.targetEntity = {
                    id: collection.id,
                    name: collection.name,
                    isPublic: collection.isPublic
                  };
                }
                break;
              
              case 'community':
                const community = await this.getCommunity(activity.targetId);
                if (community) {
                  activity.targetEntity = {
                    id: community.id,
                    name: community.name,
                    slug: community.slug
                  };
                }
                break;
            }
          } catch (error) {
            console.error(`Failed to fetch ${activity.targetType} ${activity.targetId}:`, error);
            // Entity might be deleted, continue without it
          }
        }
        
        return activity;
      })
    );
    
    return enrichedActivities;
  }

  async getFollowedUsersActivities(userId: string, limit: number = 50, offset: number = 0): Promise<Activity[]> {
    // Get the IDs of users that the current user follows
    const followingIds = await db
      .select({ followingId: follows.followingId })
      .from(follows)
      .where(eq(follows.followerId, userId));
    
    if (followingIds.length === 0) {
      return [];
    }
    
    const followingUserIds = followingIds.map(f => f.followingId);
    
    // Get activities from followed users
    const followedActivities = await db
      .select({
        activity: activities,
        user: users,
      })
      .from(activities)
      .innerJoin(users, eq(activities.userId, users.id))
      .where(inArray(activities.userId, followingUserIds))
      .orderBy(desc(activities.createdAt))
      .limit(limit)
      .offset(offset);
    
    return followedActivities.map(r => ({
      ...r.activity,
      user: r.user
    } as Activity & { user: User }));
  }

  // Notification operations
  async createNotification(notification: Omit<InsertNotification, 'type'> & { type: string }): Promise<Notification> {
    // Use a transaction to prevent race conditions when checking for duplicates
    return await db.transaction(async (tx) => {
      // Check for duplicate notifications within the last 5 seconds
      // This prevents double-clicks and race conditions from creating duplicate notifications
      const fiveSecondsAgo = new Date(Date.now() - 5000);
      
      const recentDuplicate = await tx
        .select()
        .from(notifications)
        .where(and(
          eq(notifications.userId, notification.userId),
          eq(notifications.type, notification.type as any),
          eq(notifications.message, notification.message),
          notification.relatedPromptId ? eq(notifications.relatedPromptId, notification.relatedPromptId) : isNull(notifications.relatedPromptId),
          notification.relatedUserId ? eq(notifications.relatedUserId, notification.relatedUserId) : isNull(notifications.relatedUserId),
          gte(notifications.createdAt, fiveSecondsAgo)
        ))
        .limit(1);
      
      // If we found a recent duplicate, return it instead of creating a new one
      if (recentDuplicate.length > 0) {
        console.log(`Skipping duplicate notification: ${notification.type} for user ${notification.userId}`);
        return recentDuplicate[0];
      }
      
      // Generate a short ID similar to prompt IDs (10 chars hex)
      const id = randomBytes(5).toString('hex');
      const [newNotification] = await tx
        .insert(notifications)
        .values({ ...notification, id } as any)
        .returning();
      
      return newNotification;
    });
  }

  async getNotifications(userId: string, limit: number = 50, offset: number = 0): Promise<Notification[]> {
    const results = await db
      .select({
        notification: notifications,
        relatedUser: users,
        relatedPrompt: prompts,
      })
      .from(notifications)
      .leftJoin(users, eq(notifications.relatedUserId, users.id))
      .leftJoin(prompts, eq(notifications.relatedPromptId, prompts.id))
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);
    
    return results.map(r => ({
      ...r.notification,
      relatedUser: r.relatedUser,
      relatedPrompt: r.relatedPrompt,
    }) as any);
  }

  async getNotification(id: string): Promise<Notification | undefined> {
    const result = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, id))
      .limit(1);
    
    return result[0];
  }

  async markNotificationRead(notificationId: string, userId: string): Promise<Notification> {
    const [updated] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId)
      ))
      .returning();
    
    return updated;
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));
  }

  async getUnreadCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));
    
    return Number(result[0]?.count || 0);
  }

  async deleteNotification(id: string): Promise<void> {
    await db
      .delete(notifications)
      .where(eq(notifications.id, id));
  }

  // User management operations (for Super Admin)
  async getAllUsers(options: {
    search?: string;
    role?: UserRole;
    communityId?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<User[]> {
    // Explicitly select user columns to ensure consistent return type
    let query = db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      profileImageUrl: users.profileImageUrl,
      role: users.role,
      username: users.username,
      bio: users.bio,
      birthday: users.birthday,
      website: users.website,
      twitterHandle: users.twitterHandle,
      githubHandle: users.githubHandle,
      linkedinHandle: users.linkedinHandle,
      instagramHandle: users.instagramHandle,
      deviantartHandle: users.deviantartHandle,
      blueskyHandle: users.blueskyHandle,
      tiktokHandle: users.tiktokHandle,
      redditHandle: users.redditHandle,
      patreonHandle: users.patreonHandle,
      customSocials: users.customSocials,
      profileVisibility: users.profileVisibility,
      emailVisibility: users.emailVisibility,
      showStats: users.showStats,
      showBirthday: users.showBirthday,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    }).from(users).$dynamic();

    const conditions: any[] = [];
    
    if (options.search) {
      conditions.push(
        or(
          ilike(users.email, `%${options.search}%`),
          ilike(users.firstName, `%${options.search}%`),
          ilike(users.lastName, `%${options.search}%`)
        )
      );
    }

    if (options.role) {
      conditions.push(eq(users.role, options.role));
    }

    if (options.communityId) {
      // If filtering by community, join with userCommunities but only select user columns
      query = query.innerJoin(userCommunities, eq(users.id, userCommunities.userId));
      conditions.push(eq(userCommunities.communityId, options.communityId));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    query = query.orderBy(desc(users.createdAt));

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.offset(options.offset);
    }

    return await query as User[];
  }

  async searchUsers(query: string, limit: number = 20): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(
        or(
          ilike(users.email, `%${query}%`),
          ilike(users.firstName, `%${query}%`),
          ilike(users.lastName, `%${query}%`)
        )
      )
      .limit(limit);
  }

  // Community admin operations
  async assignCommunityAdmin(data: InsertCommunityAdmin): Promise<CommunityAdmin> {
    const [admin] = await db
      .insert(communityAdmins)
      .values(data)
      .returning();
    return admin;
  }

  async removeCommunityAdmin(userId: string, communityId: string): Promise<void> {
    await db
      .delete(communityAdmins)
      .where(
        and(
          eq(communityAdmins.userId, userId),
          eq(communityAdmins.communityId, communityId)
        )
      );
  }

  async getCommunityAdmins(communityId: string): Promise<CommunityAdmin[]> {
    return await db
      .select()
      .from(communityAdmins)
      .where(eq(communityAdmins.communityId, communityId));
  }

  async getUserCommunityAdminRoles(userId: string): Promise<CommunityAdmin[]> {
    return await db
      .select()
      .from(communityAdmins)
      .where(eq(communityAdmins.userId, userId));
  }

  // Sub-community admin operations
  async assignSubCommunityAdmin(data: InsertSubCommunityAdmin): Promise<SubCommunityAdmin> {
    const [admin] = await db
      .insert(subCommunityAdmins)
      .values(data)
      .returning();
    return admin;
  }

  async removeSubCommunityAdmin(userId: string, subCommunityId: string): Promise<void> {
    await db
      .delete(subCommunityAdmins)
      .where(
        and(
          eq(subCommunityAdmins.userId, userId),
          eq(subCommunityAdmins.subCommunityId, subCommunityId)
        )
      );
  }

  async getSubCommunityAdmins(subCommunityId: string): Promise<SubCommunityAdmin[]> {
    return await db
      .select()
      .from(subCommunityAdmins)
      .where(eq(subCommunityAdmins.subCommunityId, subCommunityId));
  }

  async getUserSubCommunityAdminRoles(userId: string): Promise<SubCommunityAdmin[]> {
    return await db
      .select()
      .from(subCommunityAdmins)
      .where(eq(subCommunityAdmins.userId, userId));
  }

  async isSubCommunityAdmin(userId: string, subCommunityId: string): Promise<boolean> {
    const adminRecord = await db
      .select()
      .from(subCommunityAdmins)
      .where(
        and(
          eq(subCommunityAdmins.userId, userId),
          eq(subCommunityAdmins.subCommunityId, subCommunityId)
        )
      )
      .limit(1);
    
    return adminRecord.length > 0;
  }

  // Invite system operations
  async createInvite(invite: InsertCommunityInvite): Promise<CommunityInvite> {
    const [newInvite] = await db
      .insert(communityInvites)
      .values(invite)
      .returning();
    return newInvite;
  }

  async getInviteByCode(code: string): Promise<CommunityInvite | undefined> {
    const [invite] = await db
      .select()
      .from(communityInvites)
      .where(eq(communityInvites.code, code));
    return invite;
  }

  async useInvite(code: string): Promise<CommunityInvite> {
    const [invite] = await db
      .update(communityInvites)
      .set({
        currentUses: sql`current_uses + 1`,
        updatedAt: new Date(),
      })
      .where(eq(communityInvites.code, code))
      .returning();
    return invite;
  }

  async getActiveInvites(communityId: string): Promise<CommunityInvite[]> {
    return await db
      .select()
      .from(communityInvites)
      .where(
        and(
          eq(communityInvites.communityId, communityId),
          eq(communityInvites.isActive, true),
          or(
            sql`expires_at IS NULL`,
            sql`expires_at > NOW()`
          )
        )
      )
      .orderBy(desc(communityInvites.createdAt));
  }

  // Alias for backwards compatibility
  async getCommunityInvites(communityId: string): Promise<CommunityInvite[]> {
    return this.getAllInvites({ communityId, isActive: true });
  }

  // Get community member count
  async getCommunityMemberCount(communityId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userCommunities)
      .where(eq(userCommunities.communityId, communityId));
    return result[0]?.count || 0;
  }

  // Get user's community membership
  async getCommunityMembership(userId: string, communityId: string): Promise<UserCommunity | undefined> {
    const [membership] = await db
      .select()
      .from(userCommunities)
      .where(
        and(
          eq(userCommunities.userId, userId),
          eq(userCommunities.communityId, communityId)
        )
      );
    return membership;
  }

  // Use community invite and join the user to the community
  async useCommunityInvite(code: string, userId: string): Promise<{ success: boolean; message: string; community?: Community }> {
    const invite = await this.getInviteByCode(code);
    
    if (!invite) {
      return { success: false, message: "Invalid invite code" };
    }
    
    if (!invite.isActive) {
      return { success: false, message: "This invite has been deactivated" };
    }
    
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      return { success: false, message: "This invite has expired" };
    }
    
    if (invite.maxUses && invite.currentUses! >= invite.maxUses) {
      return { success: false, message: "This invite has reached its maximum number of uses" };
    }
    
    // Check if user is already a member
    const existingMembership = await db
      .select()
      .from(userCommunities)
      .where(
        and(
          eq(userCommunities.userId, userId),
          eq(userCommunities.communityId, invite.communityId)
        )
      );
    
    if (existingMembership.length > 0) {
      return { success: false, message: "You are already a member of this community" };
    }
    
    // Get community details
    const community = await this.getCommunity(invite.communityId);
    if (!community) {
      return { success: false, message: "Community not found" };
    }
    
    // Transaction to update invite usage and add user to community
    await db.transaction(async (tx) => {
      // Update invite usage
      await tx
        .update(communityInvites)
        .set({
          currentUses: sql`${communityInvites.currentUses} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(communityInvites.code, code));
      
      // Add user to community with member role
      await tx.insert(userCommunities).values({
        userId,
        communityId: invite.communityId,
        role: "member",
        joinedAt: new Date(),
      });
    });
    
    // Create notification for joining private community via invite
    // Don't send notifications for the global/general community (it's public)
    if (community.slug !== 'global' && community.slug !== 'general') {
      await this.createNotification({
        userId,
        type: 'community_join',
        message: `You have successfully joined the community "${community.name}" as a member using an invite link`,
        relatedUserId: null,
        relatedPromptId: null,
        relatedListId: null,
        isRead: false,
        metadata: { 
          communityId: community.id,
          communityName: community.name,
          role: 'member',
          joinMethod: 'invite'
        }
      });
    }
    
    return { 
      success: true, 
      message: `Successfully joined ${community.name}`,
      community 
    };
  }

  async getAllInvites(options: {
    communityId?: string;
    createdBy?: string;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<CommunityInvite[]> {
    let query = db.select().from(communityInvites).$dynamic();

    const conditions: any[] = [];
    
    if (options.communityId) {
      conditions.push(eq(communityInvites.communityId, options.communityId));
    }

    if (options.createdBy) {
      conditions.push(eq(communityInvites.createdBy, options.createdBy));
    }

    if (options.isActive !== undefined) {
      conditions.push(eq(communityInvites.isActive, options.isActive));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    query = query.orderBy(desc(communityInvites.createdAt));

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.offset(options.offset);
    }

    return await query;
  }

  // Invite user to community (creates pending invitation)
  async inviteUserToCommunity(userId: string, communityId: string, invitedBy: string, role: string = 'member'): Promise<void> {
    await db.insert(userCommunities).values({
      userId,
      communityId,
      role: role as 'member' | 'admin',
      status: 'pending',
      invitedBy,
      joinedAt: new Date(),
    });
    
    // Create notification for the invited user
    const community = await this.getCommunity(communityId);
    const inviter = await this.getUser(invitedBy);
    
    await this.createNotification({
      userId,
      type: 'community_invite',
      message: `${inviter?.username || 'Someone'} has invited you to join the community "${community?.name}"`,
      relatedUserId: invitedBy,
      relatedPromptId: null,
      relatedListId: null,
      isRead: false,
      metadata: {
        communityId,
        communityName: community?.name,
        invitedBy,
        inviterName: inviter?.username
      }
    });
  }
  
  // Remove user from community
  async removeUserFromCommunity(userId: string, communityId: string): Promise<void> {
    await db
      .delete(userCommunities)
      .where(
        and(
          eq(userCommunities.userId, userId),
          eq(userCommunities.communityId, communityId)
        )
      );
  }
  
  // Respond to community invitation
  async respondToInvitation(userId: string, communityId: string, status: 'accepted' | 'rejected'): Promise<void> {
    await db
      .update(userCommunities)
      .set({
        status,
        respondedAt: new Date(),
      })
      .where(
        and(
          eq(userCommunities.userId, userId),
          eq(userCommunities.communityId, communityId)
        )
      );
    
    // Create notification for response
    const community = await this.getCommunity(communityId);
    
    if (status === 'accepted') {
      await this.createNotification({
        userId,
        type: 'community_join',
        message: `You have successfully joined the community "${community?.name}"`,
        relatedUserId: null,
        relatedPromptId: null,
        relatedListId: null,
        isRead: false,
        metadata: {
          communityId,
          communityName: community?.name,
          status: 'accepted'
        }
      });
    }
  }
  
  // Get user's pending invitations
  async getUserInvitations(userId: string): Promise<any[]> {
    try {
      // Try with all columns first
      const invitations = await db
        .select({
          id: userCommunities.id,
          communityId: userCommunities.communityId,
          role: userCommunities.role,
          status: userCommunities.status,
          invitedBy: userCommunities.invitedBy,
          joinedAt: userCommunities.joinedAt,
          community: communities,
          inviter: users,
        })
        .from(userCommunities)
        .leftJoin(communities, eq(userCommunities.communityId, communities.id))
        .leftJoin(users, eq(userCommunities.invitedBy, users.id))
        .where(
          and(
            eq(userCommunities.userId, userId),
            eq(userCommunities.status, 'pending')
          )
        );
      
      return invitations.map(inv => ({
        id: inv.id,
        communityId: inv.communityId,
        role: inv.role,
        status: inv.status,
        invitedBy: inv.invitedBy,
        joinedAt: inv.joinedAt,
        community: inv.community,
        inviter: inv.inviter ? {
          id: inv.inviter.id,
          username: inv.inviter.username,
          firstName: inv.inviter.firstName,
          lastName: inv.inviter.lastName,
          profileImageUrl: inv.inviter.profileImageUrl,
        } : null,
      }));
    } catch (error) {
      console.error("Error fetching user invitations:", error);
      // For now, return empty array if columns don't exist
      // Since invitations require the status column which doesn't exist in the database
      return [];
    }
  }

  async deactivateInvite(id: string): Promise<void> {
    await db
      .update(communityInvites)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(communityInvites.id, id));
  }

  // Sub-community invite operations
  async createSubCommunityInvite(data: InsertSubCommunityInvite): Promise<SubCommunityInvite> {
    // Generate a unique invite code
    const code = randomBytes(8).toString('hex').toUpperCase();
    
    const [newInvite] = await db
      .insert(subCommunityInvites)
      .values({
        ...data,
        code,
      })
      .returning();
    return newInvite;
  }

  async getSubCommunityInvite(code: string): Promise<SubCommunityInvite | undefined> {
    const [invite] = await db
      .select()
      .from(subCommunityInvites)
      .where(eq(subCommunityInvites.code, code));
    return invite;
  }

  async getSubCommunityInvites(subCommunityId: string, options?: { active?: boolean }): Promise<SubCommunityInvite[]> {
    let query = db.select().from(subCommunityInvites).$dynamic();
    
    const conditions: any[] = [
      eq(subCommunityInvites.subCommunityId, subCommunityId)
    ];
    
    if (options?.active !== undefined) {
      conditions.push(eq(subCommunityInvites.isActive, options.active));
      
      // If looking for active invites, also check expiry
      if (options.active) {
        conditions.push(
          or(
            sql`${subCommunityInvites.expiresAt} IS NULL`,
            sql`${subCommunityInvites.expiresAt} > NOW()`
          )
        );
      }
    }
    
    query = query.where(and(...conditions));
    
    return await query.orderBy(desc(subCommunityInvites.createdAt));
  }

  async useSubCommunityInvite(code: string, userId: string): Promise<{ success: boolean; message: string; community?: Community }> {
    // Start a transaction to ensure atomicity
    return await db.transaction(async (tx) => {
      // Get the invite
      const [invite] = await tx
        .select()
        .from(subCommunityInvites)
        .where(eq(subCommunityInvites.code, code));
      
      if (!invite) {
        return { success: false, message: 'Invalid invite code' };
      }
      
      // Check if invite is active
      if (!invite.isActive) {
        return { success: false, message: 'This invite is no longer active' };
      }
      
      // Check if invite has expired
      if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
        return { success: false, message: 'This invite has expired' };
      }
      
      // Check if max uses reached
      if (invite.maxUses && invite.currentUses! >= invite.maxUses) {
        return { success: false, message: 'This invite has reached its maximum uses' };
      }
      
      // Check if user is already a member
      const [existingMembership] = await tx
        .select()
        .from(userCommunities)
        .where(
          and(
            eq(userCommunities.userId, userId),
            eq(userCommunities.subCommunityId, invite.subCommunityId)
          )
        );
      
      if (existingMembership) {
        return { success: false, message: 'You are already a member of this sub-community' };
      }
      
      // Get the sub-community
      const [subCommunity] = await tx
        .select()
        .from(communities)
        .where(eq(communities.id, invite.subCommunityId));
      
      if (!subCommunity) {
        return { success: false, message: 'Sub-community not found' };
      }
      
      // Get the parent community ID
      const parentCommunityId = subCommunity.parentCommunityId;
      if (!parentCommunityId) {
        return { success: false, message: 'Invalid sub-community structure' };
      }
      
      // Add user to the sub-community with the specified role
      await tx
        .insert(userCommunities)
        .values({
          userId,
          communityId: parentCommunityId,
          subCommunityId: invite.subCommunityId,
          role: invite.role || 'member',
        })
        .onConflictDoNothing();
      
      // If role is admin, also add to sub-community admins table
      if (invite.role === 'admin') {
        await tx
          .insert(subCommunityAdmins)
          .values({
            userId,
            subCommunityId: invite.subCommunityId,
            assignedBy: invite.createdBy,
            permissions: {},
          })
          .onConflictDoNothing();
      }
      
      // Increment the current uses
      await tx
        .update(subCommunityInvites)
        .set({
          currentUses: sql`${subCommunityInvites.currentUses} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(subCommunityInvites.code, code));
      
      // Deactivate invite if it reached max uses
      if (invite.maxUses && invite.currentUses! + 1 >= invite.maxUses) {
        await tx
          .update(subCommunityInvites)
          .set({
            isActive: false,
            updatedAt: new Date(),
          })
          .where(eq(subCommunityInvites.code, code));
      }
      
      return { 
        success: true, 
        message: 'Successfully joined the sub-community',
        community: subCommunity
      };
    });
  }

  async deactivateSubCommunityInvite(inviteId: string): Promise<void> {
    await db
      .update(subCommunityInvites)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(subCommunityInvites.id, inviteId));
  }

  async getSubCommunityInviteStats(subCommunityId: string): Promise<{ 
    total: number; 
    active: number; 
    used: number; 
    expired: number; 
  }> {
    // Get all invites for the sub-community
    const invites = await db
      .select()
      .from(subCommunityInvites)
      .where(eq(subCommunityInvites.subCommunityId, subCommunityId));
    
    const now = new Date();
    
    const stats = {
      total: invites.length,
      active: 0,
      used: 0,
      expired: 0,
    };
    
    for (const invite of invites) {
      // Count active invites
      if (invite.isActive && (!invite.expiresAt || new Date(invite.expiresAt) > now)) {
        stats.active++;
      }
      
      // Count fully used invites
      if (invite.maxUses && invite.currentUses! >= invite.maxUses) {
        stats.used++;
      }
      
      // Count expired invites
      if (invite.expiresAt && new Date(invite.expiresAt) <= now) {
        stats.expired++;
      }
    }
    
    return stats;
  }

  // Sub-community CRUD operations
  async createSubCommunity(parentId: string, subCommunity: InsertCommunity): Promise<Community> {
    // Get parent community to build path and level
    const parent = await this.getCommunity(parentId);
    if (!parent) {
      throw new Error('Parent community not found');
    }

    // Generate ID for new sub-community
    const subCommunityId = sql`gen_random_uuid()`;
    
    // Build path: parent path + "/" + new sub-community id
    const parentPath = parent.path || parent.id;
    const newPath = `${parentPath}/${subCommunityId}`;
    const newLevel = (parent.level || 0) + 1;

    const [newSubCommunity] = await db
      .insert(communities)
      .values({
        ...subCommunity,
        parentCommunityId: parentId,
        path: newPath,
        level: newLevel,
      })
      .returning();

    // Update the path with the actual ID
    const [updated] = await db
      .update(communities)
      .set({ path: `${parentPath}/${newSubCommunity.id}` })
      .where(eq(communities.id, newSubCommunity.id))
      .returning();

    return updated;
  }

  async getSubCommunities(parentId: string): Promise<Community[]> {
    return await db
      .select()
      .from(communities)
      .where(eq(communities.parentCommunityId, parentId))
      .orderBy(communities.name);
  }

  async getAllSubCommunities(parentId: string): Promise<Community[]> {
    // Get parent community path
    const parent = await this.getCommunity(parentId);
    if (!parent) {
      return [];
    }

    const parentPath = parent.path || parent.id;

    // Get all communities whose path starts with parent path
    return await db
      .select()
      .from(communities)
      .where(sql`${communities.path} LIKE ${parentPath + '/%'}`)
      .orderBy(communities.level, communities.name);
  }

  async getSubCommunityBySlug(slug: string): Promise<Community | undefined> {
    const [community] = await db
      .select()
      .from(communities)
      .where(and(
        eq(communities.slug, slug),
        sql`${communities.parentCommunityId} IS NOT NULL`
      ));
    return community;
  }

  async updateSubCommunity(id: string, data: Partial<InsertCommunity>): Promise<Community> {
    const [updated] = await db
      .update(communities)
      .set({ 
        ...data, 
        updatedAt: new Date() 
      })
      .where(eq(communities.id, id))
      .returning();
    
    if (!updated) {
      throw new Error('Sub-community not found');
    }

    return updated;
  }

  async deleteSubCommunity(id: string): Promise<void> {
    // Get all sub-communities under this one (recursive)
    const subCommunities = await this.getAllSubCommunities(id);
    const subCommunityIds = subCommunities.map(sc => sc.id);
    const allIds = [id, ...subCommunityIds];

    // Delete in transaction to ensure consistency
    await db.transaction(async (tx) => {
      // Delete all user memberships
      await tx
        .delete(userCommunities)
        .where(inArray(userCommunities.communityId, allIds));

      // Delete all admin roles
      await tx
        .delete(communityAdmins)
        .where(inArray(communityAdmins.communityId, allIds));

      await tx
        .delete(subCommunityAdmins)
        .where(inArray(subCommunityAdmins.subCommunityId, allIds));

      // Delete all invites
      await tx
        .delete(communityInvites)
        .where(inArray(communityInvites.communityId, allIds));

      // Delete all collections
      await tx
        .delete(collections)
        .where(inArray(collections.communityId, allIds));

      // Update prompts to remove community association
      await tx
        .update(prompts)
        .set({ communityId: null } as any)
        .where(inArray((prompts as any).communityId, allIds));

      // Finally, delete all communities (children first due to foreign key)
      if (subCommunityIds.length > 0) {
        await tx
          .delete(communities)
          .where(inArray(communities.id, subCommunityIds));
      }

      await tx
        .delete(communities)
        .where(eq(communities.id, id));
    });
  }

  // Sub-community membership operations
  async joinSubCommunity(userId: string, subCommunityId: string): Promise<UserCommunity> {
    // Verify sub-community exists and get its parent
    const subCommunity = await this.getCommunity(subCommunityId);
    if (!subCommunity || !subCommunity.parentCommunityId) {
      throw new Error('Sub-community not found');
    }

    // Check if user is already a member
    const existingMembership = await db
      .select()
      .from(userCommunities)
      .where(and(
        eq(userCommunities.userId, userId),
        eq(userCommunities.subCommunityId, subCommunityId)
      ))
      .limit(1);

    if (existingMembership.length > 0) {
      return existingMembership[0];
    }

    // Add user to sub-community
    const [membership] = await db
      .insert(userCommunities)
      .values({
        userId,
        communityId: subCommunity.parentCommunityId,
        subCommunityId,
        role: 'member' as CommunityRole,
      })
      .returning();

    return membership;
  }

  async leaveSubCommunity(userId: string, subCommunityId: string): Promise<void> {
    await db
      .delete(userCommunities)
      .where(and(
        eq(userCommunities.userId, userId),
        eq(userCommunities.subCommunityId, subCommunityId)
      ));

    // Also remove any admin roles
    await db
      .delete(subCommunityAdmins)
      .where(and(
        eq(subCommunityAdmins.userId, userId),
        eq(subCommunityAdmins.subCommunityId, subCommunityId)
      ));
  }

  async getSubCommunityMembers(subCommunityId: string): Promise<UserCommunity[]> {
    return await db
      .select()
      .from(userCommunities)
      .where(eq(userCommunities.subCommunityId, subCommunityId))
      .orderBy(userCommunities.joinedAt);
  }

  async isSubCommunityMember(userId: string, subCommunityId: string): Promise<boolean> {
    const membership = await db
      .select()
      .from(userCommunities)
      .where(and(
        eq(userCommunities.userId, userId),
        eq(userCommunities.subCommunityId, subCommunityId)
      ))
      .limit(1);

    return membership.length > 0;
  }

  async getUserSubCommunities(userId: string): Promise<Community[]> {
    // Get all sub-community IDs the user is a member of
    const memberships = await db
      .select({ subCommunityId: userCommunities.subCommunityId })
      .from(userCommunities)
      .where(and(
        eq(userCommunities.userId, userId),
        sql`${userCommunities.subCommunityId} IS NOT NULL`
      ));

    if (memberships.length === 0) {
      return [];
    }

    const subCommunityIds = memberships
      .map(m => m.subCommunityId)
      .filter((id): id is string => id !== null);

    if (subCommunityIds.length === 0) {
      return [];
    }

    // Get the communities
    return await db
      .select()
      .from(communities)
      .where(inArray(communities.id, subCommunityIds))
      .orderBy(communities.name);
  }

  // Sub-community prompt operations
  async getSubCommunityPrompts(subCommunityId: string, options: {
    limit?: number;
    offset?: number;
    isPublic?: boolean;
    search?: string;
  } = {}): Promise<Prompt[]> {
    let query = db.select().from(prompts).$dynamic();

    const conditions: any[] = [eq(prompts.subCommunityId, subCommunityId)];

    if (options.isPublic !== undefined) {
      conditions.push(eq(prompts.isPublic, options.isPublic));
    }

    if (options.search) {
      conditions.push(
        or(
          ilike(prompts.name, `%${options.search}%`),
          ilike(prompts.description, `%${options.search}%`),
          sql`EXISTS (SELECT 1 FROM unnest(${prompts.tags}) AS tag WHERE tag ILIKE ${`%${options.search}%`})`
        )
      );
    }

    query = query.where(and(...conditions));
    query = query.orderBy(desc(prompts.createdAt));

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.offset(options.offset);
    }

    return await query;
  }

  async sharePromptToSubCommunity(promptId: string, subCommunityId: string, visibility: "private" | "parent_community" | "public" = "private"): Promise<Prompt> {
    // Verify sub-community exists
    const subCommunity = await this.getCommunity(subCommunityId);
    if (!subCommunity || !subCommunity.parentCommunityId) {
      throw new Error('Sub-community not found');
    }

    // Update prompt to associate with sub-community and set visibility
    const [updated] = await db
      .update(prompts)
      .set({ 
        subCommunityId: subCommunityId,
        subCommunityVisibility: visibility,
        updatedAt: new Date() 
      })
      .where(eq(prompts.id, promptId))
      .returning();

    if (!updated) {
      throw new Error('Prompt not found');
    }

    return updated;
  }

  async removePromptFromSubCommunity(promptId: string, subCommunityId: string): Promise<void> {
    await db
      .update(prompts)
      .set({ 
        subCommunityId: null,
        subCommunityVisibility: null,
        updatedAt: new Date() 
      })
      .where(and(
        eq(prompts.id, promptId),
        eq(prompts.subCommunityId, subCommunityId)
      ));
  }

  async getPromptsForSubCommunity(subCommunityId: string, options: {
    userId?: string;
    limit?: number;
    offset?: number;
    search?: string;
  } = {}): Promise<Prompt[]> {
    // Get sub-community and parent community info
    const subCommunity = await this.getCommunity(subCommunityId);
    if (!subCommunity || !subCommunity.parentCommunityId) {
      throw new Error('Sub-community not found');
    }

    let query = db.select().from(prompts).$dynamic();
    const conditions: any[] = [eq(prompts.subCommunityId, subCommunityId)];

    // Apply visibility filters based on user membership
    if (options.userId) {
      const user = await this.getUser(options.userId);
      const isSubCommunityMember = await this.isSubCommunityMember(options.userId, subCommunityId);
      const isParentCommunityMember = await this.isCommunityMember(options.userId, subCommunity.parentCommunityId);
      const isSubCommunityAdmin = await this.isSubCommunityAdmin(options.userId, subCommunityId);
      const isParentCommunityAdmin = await this.isCommunityAdmin(options.userId, subCommunity.parentCommunityId);
      const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'developer';

      // Build visibility conditions
      const visibilityConditions = [];

      // Always show public prompts
      visibilityConditions.push(eq(prompts.subCommunityVisibility, 'public'));
      
      // Show user's own prompts
      visibilityConditions.push(eq(prompts.userId, options.userId));

      // If user is admin or member, show all prompts accordingly
      if (isSuperAdmin || isSubCommunityAdmin || isParentCommunityAdmin) {
        // Admins can see all prompts
        // No additional condition needed
      } else if (isSubCommunityMember) {
        // Sub-community members can see private and parent_community prompts
        visibilityConditions.push(eq(prompts.subCommunityVisibility, 'private'));
        visibilityConditions.push(eq(prompts.subCommunityVisibility, 'parent_community'));
      } else if (isParentCommunityMember) {
        // Parent community members can only see parent_community and public prompts
        visibilityConditions.push(eq(prompts.subCommunityVisibility, 'parent_community'));
      }

      // Apply visibility conditions
      if (!isSuperAdmin && !isSubCommunityAdmin && !isParentCommunityAdmin) {
        conditions.push(or(...visibilityConditions));
      }
    } else {
      // No user specified, only show public prompts
      conditions.push(eq(prompts.subCommunityVisibility, 'public'));
    }

    // Apply search filter
    if (options.search) {
      conditions.push(
        or(
          ilike(prompts.name, `%${options.search}%`),
          ilike(prompts.description, `%${options.search}%`)
        )
      );
    }

    query = query.where(and(...conditions));
    query = query.orderBy(desc(prompts.createdAt));

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.offset(options.offset);
    }

    return await query;
  }

  async canUserAccessPromptInSubCommunity(userId: string, promptId: string, subCommunityId: string): Promise<boolean> {
    // Get the prompt
    const [prompt] = await db.select().from(prompts).where(eq(prompts.id, promptId));
    if (!prompt || prompt.subCommunityId !== subCommunityId) {
      return false;
    }

    // If prompt owner, always has access
    if (prompt.userId === userId) {
      return true;
    }

    // Get user role
    const user = await this.getUser(userId);
    if (user?.role === 'super_admin' || user?.role === 'developer') {
      return true;
    }

    // Get sub-community info
    const subCommunity = await this.getCommunity(subCommunityId);
    if (!subCommunity || !subCommunity.parentCommunityId) {
      return false;
    }

    // Check admin status
    const isSubCommunityAdmin = await this.isSubCommunityAdmin(userId, subCommunityId);
    const isParentCommunityAdmin = await this.isCommunityAdmin(userId, subCommunity.parentCommunityId);
    if (isSubCommunityAdmin || isParentCommunityAdmin) {
      return true;
    }

    // Check visibility rules
    const visibility = prompt.subCommunityVisibility || 'private';

    switch (visibility) {
      case 'public':
        return true;
      case 'parent_community':
        const isParentMember = await this.isCommunityMember(userId, subCommunity.parentCommunityId);
        const isSubMember = await this.isSubCommunityMember(userId, subCommunityId);
        return isParentMember || isSubMember;
      case 'private':
        return await this.isSubCommunityMember(userId, subCommunityId);
      default:
        return false;
    }
  }

  async updatePromptSubCommunityVisibility(promptId: string, visibility: "private" | "parent_community" | "public", userId: string): Promise<Prompt> {
    // Get the prompt
    const [prompt] = await db.select().from(prompts).where(eq(prompts.id, promptId));
    if (!prompt) {
      throw new Error('Prompt not found');
    }

    if (!prompt.subCommunityId) {
      throw new Error('Prompt is not associated with a sub-community');
    }

    // Check permissions
    const user = await this.getUser(userId);
    const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'developer';
    const isOwner = prompt.userId === userId;
    const isSubCommunityAdmin = await this.isSubCommunityAdmin(userId, prompt.subCommunityId);
    
    // Get parent community to check parent admin status
    const subCommunity = await this.getCommunity(prompt.subCommunityId);
    const isParentCommunityAdmin = subCommunity?.parentCommunityId ? 
      await this.isCommunityAdmin(userId, subCommunity.parentCommunityId) : false;

    if (!isSuperAdmin && !isOwner && !isSubCommunityAdmin && !isParentCommunityAdmin) {
      throw new Error('Insufficient permissions to change prompt visibility');
    }

    // Update visibility
    const [updated] = await db
      .update(prompts)
      .set({
        subCommunityVisibility: visibility,
        updatedAt: new Date()
      })
      .where(eq(prompts.id, promptId))
      .returning();

    return updated;
  }
  
  async updateSubCommunityMemberRole(userId: string, subCommunityId: string, role: CommunityRole): Promise<UserCommunity> {
    // Use a transaction to ensure both tables are updated atomically
    return await db.transaction(async (tx) => {
      // Update the role in userCommunities
      const [updated] = await tx
        .update(userCommunities)
        .set({ role })
        .where(and(
          eq(userCommunities.userId, userId),
          eq(userCommunities.subCommunityId, subCommunityId)
        ))
        .returning();

      if (!updated) {
        throw new Error('User is not a member of this sub-community');
      }

      // If promoting to admin, add to subCommunityAdmins table
      if (role === 'admin') {
        await tx
          .insert(subCommunityAdmins)
          .values({
            userId,
            subCommunityId,
            assignedBy: userId, // For now, using same user as assignedBy
            permissions: {},
          })
          .onConflictDoNothing(); // In case they're already in the table
      } 
      // If demoting from admin, remove from subCommunityAdmins table
      else if (role === 'member') {
        await tx
          .delete(subCommunityAdmins)
          .where(and(
            eq(subCommunityAdmins.userId, userId),
            eq(subCommunityAdmins.subCommunityId, subCommunityId)
          ));
      }

      return updated;
    });
  }

  // Sub-community hierarchy operations
  async getSubCommunityPath(communityId: string): Promise<string> {
    const community = await this.getCommunity(communityId);
    if (!community) {
      throw new Error('Community not found');
    }
    return community.path || community.id;
  }

  async getParentCommunity(subCommunityId: string): Promise<Community | undefined> {
    const subCommunity = await this.getCommunity(subCommunityId);
    if (!subCommunity || !subCommunity.parentCommunityId) {
      return undefined;
    }
    return await this.getCommunity(subCommunity.parentCommunityId);
  }

  async getSubCommunityLevel(communityId: string): Promise<number> {
    const community = await this.getCommunity(communityId);
    if (!community) {
      throw new Error('Community not found');
    }
    return community.level || 0;
  }

  // Category operations
  async getCategories(options: { userId?: string; type?: string; isActive?: boolean } = {}): Promise<Category[]> {
    let query = db.select().from(categories).$dynamic();
    
    const conditions = [];
    
    if (options.userId) {
      conditions.push(eq(categories.userId, options.userId));
    }
    
    if (options.type) {
      conditions.push(eq(categories.type, options.type as any));
    }
    
    if (options.isActive !== undefined) {
      conditions.push(eq(categories.isActive, options.isActive));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(categories.name);
  }

  async getCategory(id: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async getCategoryByName(name: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.name, name));
    return category;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  async updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category> {
    const [updatedCategory] = await db
      .update(categories)
      .set({ ...category, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();
    return updatedCategory;
  }

  async deleteCategory(id: string): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  // Prompt type operations
  async getPromptTypes(options: { userId?: string; type?: string; isActive?: boolean } = {}): Promise<PromptType[]> {
    let query = db.select().from(promptTypes).$dynamic();
    
    const conditions = [];
    
    if (options.userId) {
      conditions.push(eq(promptTypes.userId, options.userId));
    }
    
    if (options.type) {
      conditions.push(eq(promptTypes.type, options.type as any));
    }
    
    if (options.isActive !== undefined) {
      conditions.push(eq(promptTypes.isActive, options.isActive));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(promptTypes.name);
  }

  async getPromptType(id: string): Promise<PromptType | undefined> {
    const [promptType] = await db.select().from(promptTypes).where(eq(promptTypes.id, id));
    return promptType;
  }

  async getPromptTypeByName(name: string): Promise<PromptType | undefined> {
    const [promptType] = await db.select().from(promptTypes).where(eq(promptTypes.name, name));
    return promptType;
  }

  async createPromptType(promptType: InsertPromptType): Promise<PromptType> {
    const [newPromptType] = await db.insert(promptTypes).values(promptType).returning();
    return newPromptType;
  }

  async updatePromptType(id: string, promptType: Partial<InsertPromptType>): Promise<PromptType> {
    const [updatedPromptType] = await db
      .update(promptTypes)
      .set({ ...promptType, updatedAt: new Date() })
      .where(eq(promptTypes.id, id))
      .returning();
    return updatedPromptType;
  }

  async deletePromptType(id: string): Promise<void> {
    await db.delete(promptTypes).where(eq(promptTypes.id, id));
  }

  // Prompt style operations
  async getPromptStyles(options: { userId?: string; type?: string; isActive?: boolean } = {}): Promise<PromptStyle[]> {
    let query = db.select().from(promptStyles).$dynamic();
    
    const conditions = [];
    
    if (options.userId) {
      conditions.push(eq(promptStyles.userId, options.userId));
    }
    
    if (options.type) {
      conditions.push(eq(promptStyles.type, options.type as any));
    }
    
    if (options.isActive !== undefined) {
      conditions.push(eq(promptStyles.isActive, options.isActive));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(promptStyles.name);
  }

  async getPromptStyle(id: string): Promise<PromptStyle | undefined> {
    const [promptStyle] = await db.select().from(promptStyles).where(eq(promptStyles.id, id));
    return promptStyle;
  }

  async getPromptStyleByName(name: string): Promise<PromptStyle | undefined> {
    const [promptStyle] = await db.select().from(promptStyles).where(eq(promptStyles.name, name));
    return promptStyle;
  }

  async createPromptStyle(promptStyle: InsertPromptStyle): Promise<PromptStyle> {
    const [newPromptStyle] = await db.insert(promptStyles).values(promptStyle).returning();
    return newPromptStyle;
  }

  async updatePromptStyle(id: string, promptStyle: Partial<InsertPromptStyle>): Promise<PromptStyle> {
    const [updatedPromptStyle] = await db
      .update(promptStyles)
      .set({ ...promptStyle, updatedAt: new Date() })
      .where(eq(promptStyles.id, id))
      .returning();
    return updatedPromptStyle;
  }

  async deletePromptStyle(id: string): Promise<void> {
    await db.delete(promptStyles).where(eq(promptStyles.id, id));
  }
  
  async getPromptStyleRuleTemplates(options: { userId?: string; category?: string; isDefault?: boolean } = {}): Promise<PromptStyleRuleTemplate[]> {
    let query = db.select().from(promptStyleRuleTemplates).$dynamic();
    
    const conditions = [];
    
    if (options.userId) {
      conditions.push(eq(promptStyleRuleTemplates.userId, options.userId));
    }
    
    if (options.category) {
      conditions.push(eq(promptStyleRuleTemplates.category, options.category));
    }
    
    if (options.isDefault !== undefined) {
      conditions.push(eq(promptStyleRuleTemplates.isDefault, options.isDefault));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(promptStyleRuleTemplates.name);
  }
  
  async getPromptStyleRuleTemplate(id: string): Promise<PromptStyleRuleTemplate | undefined> {
    const [promptStyleRuleTemplate] = await db.select().from(promptStyleRuleTemplates).where(eq(promptStyleRuleTemplates.id, id));
    return promptStyleRuleTemplate;
  }
  
  async getPromptStyleRuleTemplateByName(name: string): Promise<PromptStyleRuleTemplate | undefined> {
    const [promptStyleRuleTemplate] = await db.select().from(promptStyleRuleTemplates).where(eq(promptStyleRuleTemplates.name, name));
    return promptStyleRuleTemplate;
  }
  
  async createPromptStyleRuleTemplate(promptStyleRuleTemplate: InsertPromptStyleRuleTemplate): Promise<PromptStyleRuleTemplate> {
    const [newPromptStyleRuleTemplate] = await db.insert(promptStyleRuleTemplates).values(promptStyleRuleTemplate as any).returning();
    return newPromptStyleRuleTemplate;
  }
  
  async updatePromptStyleRuleTemplate(id: string, promptStyleRuleTemplate: Partial<InsertPromptStyleRuleTemplate>): Promise<PromptStyleRuleTemplate> {
    const [updatedPromptStyleRuleTemplate] = await db
      .update(promptStyleRuleTemplates)
      .set(promptStyleRuleTemplate)
      .where(eq(promptStyleRuleTemplates.id, id))
      .returning();
    return updatedPromptStyleRuleTemplate;
  }
  
  async deletePromptStyleRuleTemplate(id: string): Promise<void> {
    await db.delete(promptStyleRuleTemplates).where(eq(promptStyleRuleTemplates.id, id));
  }

  // Intended generator operations
  async getIntendedGenerators(options: { userId?: string; type?: string; isActive?: boolean } = {}): Promise<IntendedGenerator[]> {
    let query = db.select().from(intendedGenerators).$dynamic();
    
    const conditions = [];
    
    if (options.userId) {
      conditions.push(eq(intendedGenerators.userId, options.userId));
    }
    
    if (options.type) {
      conditions.push(eq(intendedGenerators.type, options.type as any));
    }
    
    if (options.isActive !== undefined) {
      conditions.push(eq(intendedGenerators.isActive, options.isActive));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(intendedGenerators.name);
  }

  async getIntendedGenerator(id: string): Promise<IntendedGenerator | undefined> {
    const [generator] = await db.select().from(intendedGenerators).where(eq(intendedGenerators.id, id));
    return generator;
  }

  async getIntendedGeneratorByName(name: string): Promise<IntendedGenerator | undefined> {
    const [generator] = await db.select().from(intendedGenerators).where(eq(intendedGenerators.name, name));
    return generator;
  }

  async createIntendedGenerator(generator: InsertIntendedGenerator): Promise<IntendedGenerator> {
    const [newGenerator] = await db.insert(intendedGenerators).values(generator).returning();
    return newGenerator;
  }

  async updateIntendedGenerator(id: string, generator: Partial<InsertIntendedGenerator>): Promise<IntendedGenerator> {
    const [updatedGenerator] = await db
      .update(intendedGenerators)
      .set({ ...generator, updatedAt: new Date() })
      .where(eq(intendedGenerators.id, id))
      .returning();
    return updatedGenerator;
  }

  async deleteIntendedGenerator(id: string): Promise<void> {
    await db.delete(intendedGenerators).where(eq(intendedGenerators.id, id));
  }

  // Recommended model operations
  async getRecommendedModels(options: { userId?: string; type?: string; isActive?: boolean } = {}): Promise<RecommendedModel[]> {
    let query = db.select().from(recommendedModels).$dynamic();
    
    const conditions = [];
    
    if (options.userId) {
      conditions.push(eq(recommendedModels.userId, options.userId));
    }
    
    if (options.type) {
      conditions.push(eq(recommendedModels.type, options.type as any));
    }
    
    if (options.isActive !== undefined) {
      conditions.push(eq(recommendedModels.isActive, options.isActive));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(recommendedModels.name);
  }

  async getRecommendedModel(id: string): Promise<RecommendedModel | undefined> {
    const [model] = await db.select().from(recommendedModels).where(eq(recommendedModels.id, id));
    return model;
  }

  async getRecommendedModelByName(name: string): Promise<RecommendedModel | undefined> {
    const [model] = await db.select().from(recommendedModels).where(eq(recommendedModels.name, name));
    return model;
  }

  async createRecommendedModel(model: InsertRecommendedModel): Promise<RecommendedModel> {
    const [newModel] = await db.insert(recommendedModels).values(model).returning();
    return newModel;
  }

  async updateRecommendedModel(id: string, model: Partial<InsertRecommendedModel>): Promise<RecommendedModel> {
    const [updatedModel] = await db
      .update(recommendedModels)
      .set({ ...model, updatedAt: new Date() })
      .where(eq(recommendedModels.id, id))
      .returning();
    return updatedModel;
  }

  async deleteRecommendedModel(id: string): Promise<void> {
    await db.delete(recommendedModels).where(eq(recommendedModels.id, id));
  }

  // Prompt history operations
  async savePromptToHistory(history: InsertPromptHistory): Promise<PromptHistory> {
    const [saved] = await db.insert(promptHistory).values(history).returning();
    return saved;
  }

  async getPromptHistory(userId: string, options?: { limit?: number; offset?: number }): Promise<PromptHistory[]> {
    const limit = options?.limit || 100;
    const offset = options?.offset || 0;
    
    return await db
      .select()
      .from(promptHistory)
      .where(eq(promptHistory.userId, userId))
      .orderBy(sql`${promptHistory.createdAt} DESC`)
      .limit(limit)
      .offset(offset);
  }

  async getRecentPromptHistory(userId: string, limit: number = 10): Promise<PromptHistory[]> {
    return await db
      .select()
      .from(promptHistory)
      .where(eq(promptHistory.userId, userId))
      .orderBy(sql`${promptHistory.createdAt} DESC`)
      .limit(limit);
  }

  async deletePromptHistory(id: string, userId: string): Promise<void> {
    await db
      .delete(promptHistory)
      .where(and(
        eq(promptHistory.id, id),
        eq(promptHistory.userId, userId)
      ));
  }

  async clearPromptHistory(userId: string): Promise<void> {
    await db
      .delete(promptHistory)
      .where(eq(promptHistory.userId, userId));
  }

  async markPromptAsSaved(historyId: string, userId: string): Promise<void> {
    await db
      .update(promptHistory)
      .set({ isSaved: true })
      .where(and(
        eq(promptHistory.id, historyId),
        eq(promptHistory.userId, userId)
      ));
  }

  // Wordsmith Codex operations - Using prompt_components and aesthetics tables
  async getWordsmithCategories(): Promise<{ id: string; name: string; termCount: number; anatomyGroup?: string; subcategories?: string[] }[]> {
    // Use optimized query that includes anatomy_group from the database
    const promptComponentCounts = await db
      .select({
        category: prompt_components.category,
        anatomy_group: prompt_components.anatomy_group,
        count: sql<string>`COUNT(*)::int`
      })
      .from(prompt_components)
      .where(sql`${prompt_components.category} IS NOT NULL`)
      .groupBy(prompt_components.category, prompt_components.anatomy_group);

    // Count all aesthetics once (they all go under "aesthetics" category now)
    const [aestheticsCount] = await db
      .select({ count: sql<string>`COUNT(*)::int` })
      .from(aesthetics);
    
    // Get unique aesthetic categories/subcategories
    const aestheticsCategoriesResult = await db
      .selectDistinct({ categories: aesthetics.categories })
      .from(aesthetics)
      .where(sql`${aesthetics.categories} IS NOT NULL`);
    
    // Extract unique subcategories from aesthetics
    const aestheticSubcategories = new Set<string>();
    for (const row of aestheticsCategoriesResult) {
      if (row.categories) {
        // Split by comma and clean up
        const cats = row.categories.split(',').map(c => c.trim()).filter(c => c);
        cats.forEach(cat => aestheticSubcategories.add(cat));
      }
    }
    
    // Build category list
    const categories: { id: string; name: string; termCount: number; anatomyGroup?: string; subcategories?: string[] }[] = [];
    
    // Add Aesthetics as a special category with subcategories
    categories.push({
      id: 'aesthetics',
      name: 'Aesthetics',
      termCount: Number(aestheticsCount?.count || 0),
      subcategories: Array.from(aestheticSubcategories).sort()
    });
    
    // Add prompt component categories with anatomy groups from the database
    for (const row of promptComponentCounts) {
      if (row.category) {
        const categoryId = row.category.toLowerCase().replace(/\s+/g, '-');
        
        categories.push({
          id: categoryId,
          name: row.category,
          termCount: Number(row.count),
          anatomyGroup: row.anatomy_group || undefined  // Use the database value directly
        });
      }
    }
    
    // Sort alphabetically, but keep Aesthetics first
    return categories.sort((a, b) => {
      if (a.id === 'aesthetics') return -1;
      if (b.id === 'aesthetics') return 1;
      return a.name.localeCompare(b.name);
    });
  }

  async getPromptComponents(options: {
    category?: string;
    search?: string;
    limit?: number;
    offset?: number;
    userId?: string;
  } = {}): Promise<any[]> {
    const conditions: any[] = [];
    
    // Check user's NSFW preference
    if (options.userId) {
      const user = await this.getUser(options.userId);
      // If user has show_nsfw set to false, filter out NSFW content
      if (user && user.showNsfw === false) {
        conditions.push(or(eq(prompt_components.is_nsfw, false), isNull(prompt_components.is_nsfw)));
      }
    } else {
      // If no user is provided, default to hiding NSFW content
      conditions.push(or(eq(prompt_components.is_nsfw, false), isNull(prompt_components.is_nsfw)));
    }
    
    if (options.category) {
      // Compare normalized values: convert both the database category and the input to the same format
      // This handles categories with existing hyphens (e.g., "Sci-Fi Concepts")
      conditions.push(
        sql`LOWER(REPLACE(${prompt_components.category}, ' ', '-')) = ${options.category.toLowerCase()}`
      );
    }
    if (options.search) {
      conditions.push(
        or(
          ilike(prompt_components.value, `%${options.search}%`),
          ilike(prompt_components.description, `%${options.search}%`)
        )
      );
    }
    
    const query = db.select().from(prompt_components);
    if (conditions.length > 0) {
      query.where(and(...conditions));
    }
    
    if (options.limit) {
      query.limit(options.limit);
    }
    if (options.offset) {
      query.offset(options.offset);
    }
    
    const results = await query;
    
    // Transform to match expected format
    return results.map(item => ({
      id: item.id,
      term: item.value,
      description: item.description,
      category: item.category,
      subcategory: item.subcategory,
      isNsfw: item.is_nsfw,
      type: 'prompt_component'
    }));
  }

  async getAesthetics(options: {
    category?: string;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<any[]> {
    const conditions: any[] = [];
    
    if (options.category) {
      conditions.push(ilike(aesthetics.categories, `%${options.category}%`));
    }
    if (options.search) {
      conditions.push(
        or(
          ilike(aesthetics.name, `%${options.search}%`),
          ilike(aesthetics.description, `%${options.search}%`),
          ilike(aesthetics.tags, `%${options.search}%`)
        )
      );
    }
    
    const query = db.select().from(aesthetics);
    if (conditions.length > 0) {
      query.where(and(...conditions));
    }
    
    if (options.limit) {
      query.limit(options.limit);
    }
    if (options.offset) {
      query.offset(options.offset);
    }
    
    const results = await query;
    
    // Transform to match expected format
    return results.map(item => ({
      id: item.id,
      term: item.name,
      description: item.description,
      category: 'Aesthetics',
      subcategory: item.era,
      tags: item.tags,
      type: 'aesthetic'
    }));
  }

  async getWordsmithTerms(options: {
    category?: string;
    search?: string;
    limit?: number;
    offset?: number;
    excludeAesthetics?: boolean;
    userId?: string;
  } = {}): Promise<any[]> {
    const limit = options.limit || 10000; // Return up to 10000 results by default (essentially unlimited)
    const offset = options.offset || 0;
    
    // If aesthetics category is selected, only return aesthetics
    if (options.category === 'aesthetics') {
      return await this.getAesthetics({ 
        ...options, 
        category: undefined, // Don't filter by category for aesthetics 
        limit, 
        offset 
      });
    }
    
    // Handle aesthetic subcategories (aesthetics:<subcategory>)
    if (options.category?.startsWith('aesthetics:')) {
      const subcategory = options.category.replace('aesthetics:', '');
      return await this.getAesthetics({ 
        ...options, 
        category: subcategory, // Pass the subcategory to filter by
        limit, 
        offset 
      });
    }
    
    // If a specific category is selected, only return prompt components from that category
    if (options.category) {
      return await this.getPromptComponents({ ...options, limit, offset, userId: options.userId });
    }
    
    // If no category selected and excludeAesthetics is true, only return prompt components
    if (options.excludeAesthetics) {
      return await this.getPromptComponents({ ...options, limit, offset, userId: options.userId });
    }
    
    // If no category selected and excludeAesthetics is false/undefined, get both prompt components and aesthetics
    const [promptComponents, aestheticsData] = await Promise.all([
      this.getPromptComponents({ ...options, limit: limit / 2, offset: offset / 2, userId: options.userId }),
      this.getAesthetics({ ...options, limit: limit / 2, offset: offset / 2 })
    ]);
    
    // Combine and return
    return [...promptComponents, ...aestheticsData];
  }


  // Codex Assembled String operations
  async getCodexAssembledStrings(userId: string, type?: "preset" | "wildcard"): Promise<CodexAssembledString[]> {
    const conditions = [eq(codexAssembledStrings.userId, userId)];
    if (type) {
      conditions.push(eq(codexAssembledStrings.type, type));
    }
    
    return await db
      .select()
      .from(codexAssembledStrings)
      .where(and(...conditions))
      .orderBy(desc(codexAssembledStrings.createdAt));
  }

  async getCodexAssembledString(id: string): Promise<CodexAssembledString | undefined> {
    const [assembledString] = await db.select().from(codexAssembledStrings).where(eq(codexAssembledStrings.id, id));
    return assembledString;
  }

  async createCodexAssembledString(assembledString: InsertCodexAssembledString): Promise<CodexAssembledString> {
    // Ensure we have the correct column names
    const dataToInsert: any = {
      ...assembledString,
      content: assembledString.content || (assembledString as any).stringContent, // Handle both property names
      metadata: assembledString.metadata || { termsUsed: (assembledString as any).termsUsed || [] }
    };
    // Remove the old property names if they exist
    delete dataToInsert.stringContent;
    delete dataToInsert.termsUsed;
    
    const [newAssembledString] = await db.insert(codexAssembledStrings).values(dataToInsert).returning();
    return newAssembledString;
  }

  async updateCodexAssembledString(id: string, updates: Partial<InsertCodexAssembledString>): Promise<CodexAssembledString> {
    const [updatedAssembledString] = await db
      .update(codexAssembledStrings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(codexAssembledStrings.id, id))
      .returning();
    return updatedAssembledString;
  }

  async deleteCodexAssembledString(id: string): Promise<void> {
    await db.delete(codexAssembledStrings).where(eq(codexAssembledStrings.id, id));
  }

  // Character preset operations
  async getCharacterPresets(options: { userId?: string; isGlobal?: boolean } = {}): Promise<CharacterPreset[]> {
    const conditions = [];
    
    if (options.userId) {
      // Get user's own presets and global presets
      conditions.push(
        or(
          eq(characterPresets.userId, options.userId),
          eq(characterPresets.isGlobal, true)
        )
      );
    } else if (options.isGlobal !== undefined) {
      conditions.push(eq(characterPresets.isGlobal, options.isGlobal));
    }
    
    const query = conditions.length > 0
      ? db.select().from(characterPresets).where(and(...conditions))
      : db.select().from(characterPresets);
    
    return await query.orderBy(
      desc(characterPresets.isFavorite),
      characterPresets.name
    );
  }

  async getCharacterPreset(id: string): Promise<CharacterPreset | undefined> {
    const [preset] = await db
      .select()
      .from(characterPresets)
      .where(eq(characterPresets.id, id));
    return preset;
  }

  async createCharacterPreset(preset: InsertCharacterPreset): Promise<CharacterPreset> {
    const [newPreset] = await db
      .insert(characterPresets)
      .values(preset)
      .returning();
    return newPreset;
  }

  async updateCharacterPreset(id: string, preset: Partial<InsertCharacterPreset>): Promise<CharacterPreset> {
    const [updatedPreset] = await db
      .update(characterPresets)
      .set({
        ...preset,
        updatedAt: new Date()
      })
      .where(eq(characterPresets.id, id))
      .returning();
    
    if (!updatedPreset) {
      throw new Error("Character preset not found");
    }
    
    return updatedPreset;
  }

  async deleteCharacterPreset(id: string, userId: string): Promise<void> {
    // Only allow users to delete their own presets
    await db
      .delete(characterPresets)
      .where(
        and(
          eq(characterPresets.id, id),
          eq(characterPresets.userId, userId)
        )
      );
  }

  async toggleCharacterPresetFavorite(id: string, userId: string): Promise<CharacterPreset> {
    // First get the preset to check ownership
    const preset = await this.getCharacterPreset(id);
    
    if (!preset) {
      throw new Error("Character preset not found");
    }
    
    // Only allow toggling favorites on user's own presets or global ones
    if (preset.userId !== userId && !preset.isGlobal) {
      throw new Error("Unauthorized to toggle favorite on this preset");
    }
    
    const [updatedPreset] = await db
      .update(characterPresets)
      .set({
        isFavorite: !preset.isFavorite,
        updatedAt: new Date()
      })
      .where(eq(characterPresets.id, id))
      .returning();
    
    return updatedPreset;
  }

  // Credit System Operations
  async initializeUserCredits(userId: string): Promise<UserCredits> {
    const [existingCredits] = await db.select().from(userCredits).where(eq(userCredits.userId, userId));
    
    if (existingCredits) {
      return existingCredits;
    }
    
    const [newCredits] = await db.insert(userCredits)
      .values({
        userId,
        balance: 0,
        lifetimeEarned: 0,
        lifetimeSpent: 0,
        lastActivity: new Date(),
      })
      .returning();
    
    return newCredits;
  }

  async getUserCredits(userId: string): Promise<UserCredits> {
    const [credits] = await db.select().from(userCredits).where(eq(userCredits.userId, userId));
    
    if (!credits) {
      // Initialize credits for user if not found
      return await this.initializeUserCredits(userId);
    }
    
    return credits;
  }

  async getCreditBalance(userId: string): Promise<number> {
    const credits = await this.getUserCredits(userId);
    return credits.balance;
  }

  async addCredits(
    userId: string,
    amount: number,
    source: string,
    description?: string,
    referenceId?: string,
    referenceType?: string
  ): Promise<CreditTransaction> {
    return await db.transaction(async (tx) => {
      // Get current balance
      const [currentCredits] = await tx.select().from(userCredits).where(eq(userCredits.userId, userId));
      
      let balanceBefore = 0;
      if (!currentCredits) {
        // Initialize credits if not exists
        await tx.insert(userCredits).values({
          userId,
          balance: 0,
          lifetimeEarned: 0,
          lifetimeSpent: 0,
        });
      } else {
        balanceBefore = currentCredits.balance;
      }
      
      const balanceAfter = balanceBefore + amount;
      
      // Update user credits
      await tx.update(userCredits)
        .set({
          balance: balanceAfter,
          lifetimeEarned: sql`${userCredits.lifetimeEarned} + ${amount}`,
          lastActivity: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(userCredits.userId, userId));
      
      // Create transaction record
      const [transaction] = await tx.insert(creditTransactions)
        .values({
          userId,
          type: amount > 0 ? "earn" : "adjustment",
          amount,
          balanceBefore,
          balanceAfter,
          source: source as any,
          referenceId,
          referenceType,
          description,
        })
        .returning();
      
      return transaction;
    });
  }

  async spendCredits(
    userId: string,
    amount: number,
    source: string,
    description?: string,
    referenceId?: string,
    referenceType?: string
  ): Promise<CreditTransaction> {
    return await db.transaction(async (tx) => {
      // Get current balance
      const [currentCredits] = await tx.select().from(userCredits).where(eq(userCredits.userId, userId));
      
      if (!currentCredits || currentCredits.balance < amount) {
        throw new Error("Insufficient credits");
      }
      
      const balanceBefore = currentCredits.balance;
      const balanceAfter = balanceBefore - amount;
      
      // Update user credits
      await tx.update(userCredits)
        .set({
          balance: balanceAfter,
          lifetimeSpent: sql`${userCredits.lifetimeSpent} + ${amount}`,
          lastActivity: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(userCredits.userId, userId));
      
      // Create transaction record
      const [transaction] = await tx.insert(creditTransactions)
        .values({
          userId,
          type: "spend",
          amount: -amount, // Store as negative for spending
          balanceBefore,
          balanceAfter,
          source: source as any,
          referenceId,
          referenceType,
          description,
        })
        .returning();
      
      return transaction;
    });
  }

  async getCreditTransactionHistory(userId: string, options?: { limit?: number; offset?: number }): Promise<CreditTransaction[]> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    
    return await db.select()
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, userId))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getDailyReward(userId: string): Promise<DailyReward | undefined> {
    const [reward] = await db.select()
      .from(dailyRewards)
      .where(eq(dailyRewards.userId, userId));
    
    return reward;
  }

  async claimDailyReward(userId: string): Promise<{ reward: number; streak: number; streakBonus?: number }> {
    return await db.transaction(async (tx) => {
      const [existingReward] = await tx.select()
        .from(dailyRewards)
        .where(eq(dailyRewards.userId, userId));
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      let currentStreak = 1;
      let baseReward = 10;
      let streakBonus = 0;
      
      if (existingReward) {
        const lastClaim = new Date(existingReward.lastClaimDate);
        const lastClaimDay = new Date(lastClaim.getFullYear(), lastClaim.getMonth(), lastClaim.getDate());
        const daysSinceLastClaim = Math.floor((today.getTime() - lastClaimDay.getTime()) / (1000 * 60 * 60 * 24));
        
        // Check if already claimed today
        if (daysSinceLastClaim === 0) {
          throw new Error("Daily reward already claimed");
        }
        
        // Continue streak if claimed yesterday
        if (daysSinceLastClaim === 1) {
          currentStreak = existingReward.currentStreak + 1;
        } else {
          currentStreak = 1; // Reset streak
        }
        
        // Update existing reward
        const longestStreak = Math.max(currentStreak, existingReward.longestStreak);
        
        await tx.update(dailyRewards)
          .set({
            lastClaimDate: now,
            currentStreak,
            longestStreak,
            totalDaysClaimed: existingReward.totalDaysClaimed + 1,
            updatedAt: now,
          })
          .where(eq(dailyRewards.userId, userId));
      } else {
        // Create new reward entry
        await tx.insert(dailyRewards)
          .values({
            userId,
            lastClaimDate: now,
            currentStreak: 1,
            longestStreak: 1,
            totalDaysClaimed: 1,
          });
      }
      
      // Calculate streak bonuses
      if (currentStreak >= 30) {
        streakBonus = 500;
      } else if (currentStreak >= 7) {
        streakBonus = 100;
      }
      
      const totalReward = baseReward + streakBonus;
      
      // Add credits with the daily reward
      await this.addCredits(
        userId,
        totalReward,
        "daily_login",
        `Daily login reward (Day ${currentStreak} streak)`,
        undefined,
        undefined
      );
      
      return {
        reward: totalReward,
        streak: currentStreak,
        streakBonus: streakBonus > 0 ? streakBonus : undefined,
      };
    });
  }

  async checkFirstPromptBonus(userId: string): Promise<boolean> {
    // Check if user has already received first prompt bonus
    const [existingBonus] = await db.select()
      .from(creditTransactions)
      .where(and(
        eq(creditTransactions.userId, userId),
        eq(creditTransactions.source, "first_prompt")
      ));
    
    if (existingBonus) {
      return false; // Already received bonus
    }
    
    // Check if user has any public prompts
    const [firstPublicPrompt] = await db.select()
      .from(prompts)
      .where(and(
        eq(prompts.userId, userId),
        eq(prompts.isPublic, true)
      ))
      .limit(1);
    
    if (!firstPublicPrompt) {
      return false; // No public prompts yet
    }
    
    // Award first prompt bonus
    await this.addCredits(
      userId,
      500,
      "first_prompt",
      "First public prompt bonus",
      firstPublicPrompt.id,
      "prompt"
    );
    
    return true;
  }

  async checkProfileCompletionBonus(userId: string): Promise<boolean> {
    // Check if user has already received profile completion bonus
    const [existingBonus] = await db.select()
      .from(creditTransactions)
      .where(and(
        eq(creditTransactions.userId, userId),
        eq(creditTransactions.source, "profile_completion")
      ));
    
    if (existingBonus) {
      return false; // Already received bonus
    }
    
    // Check if profile is complete
    const user = await this.getUser(userId);
    if (!user) {
      return false;
    }
    
    // Profile is considered complete if they have username, bio, and at least one social handle
    const isComplete = !!(
      user.username &&
      user.bio &&
      (user.twitterHandle || user.githubHandle || user.linkedinHandle || 
       user.instagramHandle || user.deviantartHandle || user.blueskyHandle ||
       user.tiktokHandle || user.redditHandle || user.patreonHandle ||
       (user.customSocials && Array.isArray(user.customSocials) && user.customSocials.length > 0))
    );
    
    if (!isComplete) {
      return false;
    }
    
    // Award profile completion bonus
    await this.addCredits(
      userId,
      100,
      "profile_completion",
      "Profile completion bonus"
    );
    
    return true;
  }
  
  // Achievement operations
  async getAchievements(): Promise<Achievement[]> {
    const allAchievements = await db.select()
      .from(achievements)
      .where(eq(achievements.isActive, true))
      .orderBy(achievements.category, achievements.creditReward);
    return allAchievements;
  }

  async getAchievement(id: string): Promise<Achievement | undefined> {
    const [achievement] = await db.select()
      .from(achievements)
      .where(eq(achievements.id, id));
    return achievement;
  }

  async createAchievement(achievement: InsertAchievement): Promise<Achievement> {
    const [newAchievement] = await db.insert(achievements)
      .values(achievement)
      .returning();
    return newAchievement;
  }

  async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    const userAchievementList = await db.select()
      .from(userAchievements)
      .where(eq(userAchievements.userId, userId));
    return userAchievementList;
  }

  async getUserAchievement(userId: string, achievementId: string): Promise<UserAchievement | undefined> {
    const [userAchievement] = await db.select()
      .from(userAchievements)
      .where(and(
        eq(userAchievements.userId, userId),
        eq(userAchievements.achievementId, achievementId)
      ));
    return userAchievement;
  }

  async checkAchievementProgress(userId: string, achievementCode: string): Promise<UserAchievement> {
    // Get achievement by code
    const [achievement] = await db.select()
      .from(achievements)
      .where(eq(achievements.code, achievementCode));
    
    if (!achievement) {
      throw new Error(`Achievement with code ${achievementCode} not found`);
    }

    // Get or create user achievement progress
    let [userAchievement] = await db.select()
      .from(userAchievements)
      .where(and(
        eq(userAchievements.userId, userId),
        eq(userAchievements.achievementId, achievement.id)
      ));

    if (!userAchievement) {
      // Create new progress record
      [userAchievement] = await db.insert(userAchievements)
        .values({
          userId,
          achievementId: achievement.id,
          progress: 0,
          isCompleted: false,
          creditsClaimed: false,
        })
        .returning();
    }

    // Auto-check progress based on achievement code
    let currentProgress = userAchievement.progress;
    
    switch (achievementCode) {
      case 'first_steps':
        // Check if user has shared at least 1 public prompt
        const publicPrompts = await db.select({ count: sql<number>`count(*)` })
          .from(prompts)
          .where(and(
            eq(prompts.userId, userId),
            eq(prompts.isPublic, true)
          ));
        currentProgress = Number(publicPrompts[0]?.count || 0);
        break;
        
      case 'contributor':
        // Check if user has shared at least 5 public prompts
        const contributorPrompts = await db.select({ count: sql<number>`count(*)` })
          .from(prompts)
          .where(and(
            eq(prompts.userId, userId),
            eq(prompts.isPublic, true)
          ));
        currentProgress = Number(contributorPrompts[0]?.count || 0);
        break;
        
      case 'expert':
        // Check if user has shared at least 20 public prompts
        const expertPrompts = await db.select({ count: sql<number>`count(*)` })
          .from(prompts)
          .where(and(
            eq(prompts.userId, userId),
            eq(prompts.isPublic, true)
          ));
        currentProgress = Number(expertPrompts[0]?.count || 0);
        break;
        
      case 'reviewer':
        // Check if user has written at least 5 reviews
        const reviews = await db.select({ count: sql<number>`count(*)` })
          .from(marketplaceReviews)
          .where(eq(marketplaceReviews.reviewerId, userId));
        currentProgress = Number(reviews[0]?.count || 0);
        break;
        
      case 'seller_star':
        // Check if user has made at least 10 sales
        const sellerProfile = await this.getSellerProfile(userId);
        currentProgress = sellerProfile?.totalSales || 0;
        break;
        
      case 'community_builder':
        // Check if user has at least 50 followers
        const followerCount = await this.getFollowerCount(userId);
        currentProgress = followerCount;
        break;
        
      case 'helper':
        // Check total helpful votes on user's reviews
        const helpfulVotes = await db.select({ 
          total: sql<number>`COALESCE(SUM(helpful_count), 0)` 
        })
          .from(marketplaceReviews)
          .where(eq(marketplaceReviews.reviewerId, userId));
        currentProgress = Number(helpfulVotes[0]?.total || 0);
        break;
    }

    // Update progress if changed
    if (currentProgress !== userAchievement.progress) {
      const isCompleted = currentProgress >= achievement.requiredCount;
      
      [userAchievement] = await db.update(userAchievements)
        .set({
          progress: currentProgress,
          isCompleted,
          completedAt: isCompleted && !userAchievement.isCompleted ? new Date() : userAchievement.completedAt,
          updatedAt: new Date(),
        })
        .where(and(
          eq(userAchievements.userId, userId),
          eq(userAchievements.achievementId, achievement.id)
        ))
        .returning();
    }

    return userAchievement;
  }

  async updateAchievementProgress(userId: string, achievementCode: string, increment: number = 1): Promise<UserAchievement> {
    // Get achievement by code
    const [achievement] = await db.select()
      .from(achievements)
      .where(eq(achievements.code, achievementCode));
    
    if (!achievement) {
      throw new Error(`Achievement with code ${achievementCode} not found`);
    }

    // Get or create user achievement progress
    let [userAchievement] = await db.select()
      .from(userAchievements)
      .where(and(
        eq(userAchievements.userId, userId),
        eq(userAchievements.achievementId, achievement.id)
      ));

    if (!userAchievement) {
      // Create new progress record
      [userAchievement] = await db.insert(userAchievements)
        .values({
          userId,
          achievementId: achievement.id,
          progress: increment,
          isCompleted: increment >= achievement.requiredCount,
          creditsClaimed: false,
          completedAt: increment >= achievement.requiredCount ? new Date() : null,
        })
        .returning();
    } else {
      // Update existing progress
      const newProgress = userAchievement.progress + increment;
      const isCompleted = newProgress >= achievement.requiredCount;
      
      [userAchievement] = await db.update(userAchievements)
        .set({
          progress: newProgress,
          isCompleted,
          completedAt: isCompleted && !userAchievement.isCompleted ? new Date() : userAchievement.completedAt,
          updatedAt: new Date(),
        })
        .where(and(
          eq(userAchievements.userId, userId),
          eq(userAchievements.achievementId, achievement.id)
        ))
        .returning();
    }

    return userAchievement;
  }

  async markAchievementClaimed(userId: string, achievementId: string): Promise<void> {
    await db.update(userAchievements)
      .set({
        creditsClaimed: true,
        claimedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(userAchievements.userId, userId),
        eq(userAchievements.achievementId, achievementId)
      ));
  }

  async seedInitialAchievements(): Promise<void> {
    const initialAchievements = [
      {
        code: 'first_steps',
        name: 'First Steps',
        description: 'Share your first prompt publicly',
        creditReward: 100,
        iconName: 'rocket',
        category: 'content' as const,
        requiredCount: 1,
        isActive: true,
      },
      {
        code: 'contributor',
        name: 'Contributor',
        description: 'Share 5 prompts publicly',
        creditReward: 250,
        iconName: 'star',
        category: 'content' as const,
        requiredCount: 5,
        isActive: true,
      },
      {
        code: 'expert',
        name: 'Expert',
        description: 'Share 20 prompts publicly',
        creditReward: 500,
        iconName: 'trophy',
        category: 'content' as const,
        requiredCount: 20,
        isActive: true,
      },
      {
        code: 'reviewer',
        name: 'Reviewer',
        description: 'Write 5 product reviews',
        creditReward: 150,
        iconName: 'message-square',
        category: 'commerce' as const,
        requiredCount: 5,
        isActive: true,
      },
      {
        code: 'helper',
        name: 'Helper',
        description: 'Get 10 helpful votes on your reviews',
        creditReward: 200,
        iconName: 'thumbs-up',
        category: 'social' as const,
        requiredCount: 10,
        isActive: true,
      },
      {
        code: 'seller_star',
        name: 'Seller Star',
        description: 'Make 10 sales in the marketplace',
        creditReward: 500,
        iconName: 'shopping-bag',
        category: 'commerce' as const,
        requiredCount: 10,
        isActive: true,
      },
      {
        code: 'community_builder',
        name: 'Community Builder',
        description: 'Get 50 followers',
        creditReward: 300,
        iconName: 'users',
        category: 'social' as const,
        requiredCount: 50,
        isActive: true,
      },
    ];

    for (const achievement of initialAchievements) {
      // Check if achievement already exists
      const existing = await db.select()
        .from(achievements)
        .where(eq(achievements.code, achievement.code));
      
      if (existing.length === 0) {
        await db.insert(achievements).values(achievement);
      }
    }
  }
  
  // Marketplace operations - Seller profiles
  async getSellerProfile(userId: string): Promise<SellerProfile | undefined> {
    const [profile] = await db.select()
      .from(sellerProfiles)
      .where(eq(sellerProfiles.userId, userId));
    return profile;
  }

  async createSellerProfile(profile: InsertSellerProfile): Promise<SellerProfile> {
    const [newProfile] = await db.insert(sellerProfiles)
      .values(profile as any)
      .returning();
    return newProfile;
  }

  async updateSellerProfile(userId: string, profile: Partial<InsertSellerProfile>): Promise<SellerProfile> {
    const [updatedProfile] = await db.update(sellerProfiles)
      .set({
        ...profile,
        updatedAt: new Date(),
      } as any)
      .where(eq(sellerProfiles.userId, userId))
      .returning();
    
    if (!updatedProfile) {
      throw new Error("Seller profile not found");
    }
    
    return updatedProfile;
  }

  async completeSellerOnboarding(userId: string, data: {
    businessType: 'individual' | 'business';
    taxInfo: {
      taxId?: string;
      vatNumber?: string;
      businessName?: string;
      businessAddress?: string;
    };
    payoutMethod: 'stripe' | 'manual';
  }): Promise<SellerProfile> {
    // Validate that all required fields are present
    if (!data.businessType || !data.payoutMethod) {
      throw new Error("Business type and payout method are required");
    }

    // Validate that at least one tax info field is provided
    if (!data.taxInfo || (!data.taxInfo.taxId && !data.taxInfo.vatNumber && 
        !data.taxInfo.businessName && !data.taxInfo.businessAddress)) {
      throw new Error("At least one tax information field is required");
    }

    // Update the seller profile with validated data and mark as completed
    const [updatedProfile] = await db.update(sellerProfiles)
      .set({
        businessType: data.businessType,
        taxInfo: data.taxInfo,
        payoutMethod: data.payoutMethod,
        onboardingStatus: 'completed',
        updatedAt: new Date(),
      } as any)
      .where(eq(sellerProfiles.userId, userId))
      .returning();
    
    if (!updatedProfile) {
      throw new Error("Seller profile not found");
    }
    
    return updatedProfile;
  }

  // Marketplace operations - Listings
  async createListing(listing: InsertMarketplaceListing): Promise<MarketplaceListing> {
    return await db.transaction(async (tx) => {
      // Validate that the user owns the prompt
      const [prompt] = await tx.select()
        .from(prompts)
        .where(eq(prompts.id, listing.promptId));
      
      if (!prompt) {
        throw new Error("Prompt not found");
      }
      
      if (prompt.userId !== listing.sellerId) {
        throw new Error("You can only list your own prompts");
      }
      
      // Check if listing already exists for this prompt
      const [existingListing] = await tx.select()
        .from(marketplaceListings)
        .where(eq(marketplaceListings.promptId, listing.promptId));
      
      if (existingListing) {
        throw new Error("This prompt is already listed");
      }
      
      // Validate pricing
      if (!listing.acceptsMoney && !listing.acceptsCredits) {
        throw new Error("Listing must accept either money or credits");
      }
      
      if (listing.acceptsMoney && (!listing.priceCents || listing.priceCents < 100)) {
        throw new Error("Minimum price is $1.00");
      }
      
      if (listing.acceptsCredits && (!listing.creditPrice || listing.creditPrice < 100)) {
        throw new Error("Minimum credit price is 100 credits");
      }
      
      // Create the listing
      const [newListing] = await tx.insert(marketplaceListings)
        .values(listing as any)
        .returning();
      
      return newListing;
    });
  }

  async updateListing(id: string, listing: Partial<InsertMarketplaceListing>, userId: string): Promise<MarketplaceListing> {
    return await db.transaction(async (tx) => {
      // Verify ownership
      const [existingListing] = await tx.select()
        .from(marketplaceListings)
        .where(eq(marketplaceListings.id, id));
      
      if (!existingListing) {
        throw new Error("Listing not found");
      }
      
      if (existingListing.sellerId !== userId) {
        throw new Error("You can only update your own listings");
      }
      
      // Validate pricing if being updated
      if (listing.acceptsMoney !== undefined || listing.acceptsCredits !== undefined) {
        const acceptsMoney = listing.acceptsMoney ?? existingListing.acceptsMoney;
        const acceptsCredits = listing.acceptsCredits ?? existingListing.acceptsCredits;
        
        if (!acceptsMoney && !acceptsCredits) {
          throw new Error("Listing must accept either money or credits");
        }
      }
      
      if (listing.priceCents !== undefined && listing.priceCents! < 100) {
        throw new Error("Minimum price is $1.00");
      }
      
      if (listing.creditPrice !== undefined && listing.creditPrice! < 100) {
        throw new Error("Minimum credit price is 100 credits");
      }
      
      // Update the listing
      const [updatedListing] = await tx.update(marketplaceListings)
        .set({
          ...listing,
          updatedAt: new Date(),
        })
        .where(eq(marketplaceListings.id, id))
        .returning();
      
      return updatedListing;
    });
  }

  async getListingById(id: string): Promise<MarketplaceListing | undefined> {
    const [listing] = await db.select()
      .from(marketplaceListings)
      .where(eq(marketplaceListings.id, id));
    return listing;
  }

  async getListingsByUser(userId: string, options?: { status?: string; limit?: number; offset?: number }): Promise<MarketplaceListing[]> {
    let query = db.select()
      .from(marketplaceListings)
      .where(eq(marketplaceListings.sellerId, userId))
      .$dynamic();
    
    if (options?.status) {
      query = query.where(and(
        eq(marketplaceListings.sellerId, userId),
        eq(marketplaceListings.status, options.status as any)
      ));
    }
    
    query = query.orderBy(desc(marketplaceListings.createdAt));
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    if (options?.offset) {
      query = query.offset(options.offset);
    }
    
    const listings = await query;
    return listings;
  }

  async getActiveListings(options?: { category?: string; search?: string; limit?: number; offset?: number }): Promise<MarketplaceListing[]> {
    const conditions = [eq(marketplaceListings.status, "active")];
    
    if (options?.category) {
      conditions.push(eq(marketplaceListings.category, options.category));
    }
    
    if (options?.search) {
      conditions.push(
        or(
          ilike(marketplaceListings.title, `%${options.search}%`),
          ilike(marketplaceListings.description, `%${options.search}%`)
        ) || sql`true`
      );
    }
    
    let query = db.select()
      .from(marketplaceListings)
      .where(and(...conditions))
      .orderBy(desc(marketplaceListings.createdAt))
      .$dynamic();
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    if (options?.offset) {
      query = query.offset(options.offset);
    }
    
    const listings = await query;
    return listings;
  }

  async deleteListing(id: string, userId: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Verify ownership
      const [existingListing] = await tx.select()
        .from(marketplaceListings)
        .where(eq(marketplaceListings.id, id));
      
      if (!existingListing) {
        throw new Error("Listing not found");
      }
      
      if (existingListing.sellerId !== userId) {
        throw new Error("You can only delete your own listings");
      }
      
      // Soft delete by setting status to paused
      await tx.update(marketplaceListings)
        .set({
          status: "paused",
          updatedAt: new Date(),
        })
        .where(eq(marketplaceListings.id, id));
    });
  }

  // Enhanced marketplace discovery methods
  async getMarketplaceListings(options?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    minPriceCents?: number;
    maxPriceCents?: number;
    minCredits?: number;
    maxCredits?: number;
    sortBy?: 'newest' | 'price_low_high' | 'price_high_low' | 'most_popular';
    acceptsMoney?: boolean;
    acceptsCredits?: boolean;
  }): Promise<{ listings: any[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const offset = (page - 1) * limit;
    
    const conditions = [eq(marketplaceListings.status, "active")];
    
    // Add category filter
    if (options?.category) {
      conditions.push(eq(marketplaceListings.category, options.category));
    }
    
    // Add search filter
    if (options?.search) {
      conditions.push(
        or(
          ilike(marketplaceListings.title, `%${options.search}%`),
          ilike(marketplaceListings.description, `%${options.search}%`)
        ) || sql`true`
      );
    }
    
    // Add price filters for USD
    if (options?.minPriceCents !== undefined) {
      conditions.push(gte(marketplaceListings.priceCents, options.minPriceCents));
    }
    if (options?.maxPriceCents !== undefined) {
      conditions.push(sql`${marketplaceListings.priceCents} <= ${options.maxPriceCents}`);
    }
    
    // Add price filters for credits
    if (options?.minCredits !== undefined) {
      conditions.push(gte(marketplaceListings.creditPrice, options.minCredits));
    }
    if (options?.maxCredits !== undefined) {
      conditions.push(sql`${marketplaceListings.creditPrice} <= ${options.maxCredits}`);
    }
    
    // Add payment type filters
    if (options?.acceptsMoney !== undefined) {
      conditions.push(eq(marketplaceListings.acceptsMoney, options.acceptsMoney));
    }
    if (options?.acceptsCredits !== undefined) {
      conditions.push(eq(marketplaceListings.acceptsCredits, options.acceptsCredits));
    }
    
    // Build query
    let query = db.select({
      listing: marketplaceListings,
      prompt: prompts,
      seller: users,
    })
      .from(marketplaceListings)
      .innerJoin(prompts, eq(marketplaceListings.promptId, prompts.id))
      .innerJoin(users, eq(marketplaceListings.sellerId, users.id))
      .where(and(...conditions))
      .$dynamic();
    
    // Apply sorting
    if (options?.sortBy === 'price_low_high') {
      query = query.orderBy(sql`COALESCE(${marketplaceListings.priceCents}, ${marketplaceListings.creditPrice} * 100, 999999)`);
    } else if (options?.sortBy === 'price_high_low') {
      query = query.orderBy(desc(sql`COALESCE(${marketplaceListings.priceCents}, ${marketplaceListings.creditPrice} * 100, 0)`));
    } else if (options?.sortBy === 'most_popular') {
      query = query.orderBy(desc(marketplaceListings.salesCount));
    } else {
      // Default to newest
      query = query.orderBy(desc(marketplaceListings.createdAt));
    }
    
    // Get total count
    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(marketplaceListings)
      .where(and(...conditions));
    const total = Number(countResult[0]?.count || 0);
    
    // Apply pagination
    const results = await query.limit(limit).offset(offset);
    
    // Format results
    const listings = results.map(row => ({
      ...row.listing,
      prompt: {
        id: row.prompt.id,
        name: row.prompt.name,
        description: row.prompt.description,
        tags: row.prompt.tags,
        imageUrl: (row.prompt as any).imageUrl,
      },
      seller: {
        id: row.seller.id,
        username: row.seller.username,
        firstName: row.seller.firstName,
        lastName: row.seller.lastName,
        profileImageUrl: row.seller.profileImageUrl,
      }
    }));
    
    return { listings, total };
  }

  async getFeaturedListings(limit: number = 6): Promise<any[]> {
    const now = new Date();
    
    const results = await db.select({
      listing: marketplaceListings,
      prompt: prompts,
      seller: users,
    })
      .from(marketplaceListings)
      .innerJoin(prompts, eq(marketplaceListings.promptId, prompts.id))
      .innerJoin(users, eq(marketplaceListings.sellerId, users.id))
      .where(
        and(
          eq(marketplaceListings.status, "active"),
          // Featured listings logic - could be based on sales, rating, or admin selection
          // For now, we'll return the most popular active listings
          sql`1=1`
        )
      )
      .orderBy(desc(marketplaceListings.salesCount), desc(marketplaceListings.averageRating))
      .limit(limit);
    
    return results.map(row => ({
      ...row.listing,
      prompt: {
        id: row.prompt.id,
        name: row.prompt.name,
        description: row.prompt.description,
        tags: row.prompt.tags,
        imageUrl: (row.prompt as any).imageUrl,
      },
      seller: {
        id: row.seller.id,
        username: row.seller.username,
        firstName: row.seller.firstName,
        lastName: row.seller.lastName,
        profileImageUrl: row.seller.profileImageUrl,
      }
    }));
  }

  async getListingWithDetails(id: string): Promise<any> {
    const results = await db.select({
      listing: marketplaceListings,
      prompt: prompts,
      seller: users,
      sellerProfile: sellerProfiles,
    })
      .from(marketplaceListings)
      .innerJoin(prompts, eq(marketplaceListings.promptId, prompts.id))
      .innerJoin(users, eq(marketplaceListings.sellerId, users.id))
      .leftJoin(sellerProfiles, eq(sellerProfiles.userId, users.id))
      .where(eq(marketplaceListings.id, id));
    
    if (!results[0]) {
      return undefined;
    }
    
    const row = results[0];
    return {
      ...row.listing,
      prompt: row.prompt,
      seller: {
        id: row.seller.id,
        username: row.seller.username,
        firstName: row.seller.firstName,
        lastName: row.seller.lastName,
        profileImageUrl: row.seller.profileImageUrl,
        bio: row.seller.bio,
      },
      sellerProfile: row.sellerProfile,
    };
  }

  async getSimilarListings(listingId: string, limit: number = 4): Promise<any[]> {
    // First get the current listing to find its category
    const currentListing = await this.getListingById(listingId);
    if (!currentListing) {
      return [];
    }
    
    const results = await db.select({
      listing: marketplaceListings,
      prompt: prompts,
      seller: users,
    })
      .from(marketplaceListings)
      .innerJoin(prompts, eq(marketplaceListings.promptId, prompts.id))
      .innerJoin(users, eq(marketplaceListings.sellerId, users.id))
      .where(
        and(
          eq(marketplaceListings.status, "active"),
          eq(marketplaceListings.category, currentListing.category || ""),
          sql`${marketplaceListings.id} != ${listingId}`
        )
      )
      .orderBy(desc(marketplaceListings.salesCount))
      .limit(limit);
    
    return results.map(row => ({
      ...row.listing,
      prompt: {
        id: row.prompt.id,
        name: row.prompt.name,
        description: row.prompt.description,
        tags: row.prompt.tags,
        imageUrl: (row.prompt as any).imageUrl,
      },
      seller: {
        id: row.seller.id,
        username: row.seller.username,
        firstName: row.seller.firstName,
        lastName: row.seller.lastName,
        profileImageUrl: row.seller.profileImageUrl,
      }
    }));
  }

  async getListingPreview(promptId: string, previewPercentage: number): Promise<string> {
    const [prompt] = await db.select()
      .from(prompts)
      .where(eq(prompts.id, promptId));
    
    if (!prompt || !(prompt as any).content) {
      return "";
    }
    
    // Calculate preview length
    const fullContent = (prompt as any).content;
    const previewLength = Math.floor(fullContent.length * (previewPercentage / 100));
    
    // Create preview, trying to end at a natural break
    let preview = fullContent.substring(0, previewLength);
    
    // Try to end at a sentence or word boundary
    const lastPeriod = preview.lastIndexOf('.');
    const lastComma = preview.lastIndexOf(',');
    const lastSpace = preview.lastIndexOf(' ');
    
    if (lastPeriod > previewLength * 0.8) {
      preview = preview.substring(0, lastPeriod + 1);
    } else if (lastComma > previewLength * 0.8) {
      preview = preview.substring(0, lastComma + 1);
    } else if (lastSpace > previewLength * 0.8) {
      preview = preview.substring(0, lastSpace);
    }
    
    return preview;
  }

  // Marketplace operations - Orders implementation
  async createOrder(order: InsertMarketplaceOrder): Promise<MarketplaceOrder> {
    const [newOrder] = await db.insert(marketplaceOrders)
      .values(order)
      .returning();
    return newOrder;
  }

  async completeOrder(orderId: string, deliveredAt?: Date): Promise<MarketplaceOrder> {
    const [updatedOrder] = await db.update(marketplaceOrders)
      .set({
        status: "completed",
        deliveredAt: deliveredAt || new Date(),
      })
      .where(eq(marketplaceOrders.id, orderId))
      .returning();
    
    if (!updatedOrder) {
      throw new Error("Order not found");
    }
    
    return updatedOrder;
  }

  async failOrder(orderId: string): Promise<MarketplaceOrder> {
    const [updatedOrder] = await db.update(marketplaceOrders)
      .set({
        status: "failed",
      })
      .where(eq(marketplaceOrders.id, orderId))
      .returning();
    
    if (!updatedOrder) {
      throw new Error("Order not found");
    }
    
    return updatedOrder;
  }

  async refundOrder(orderId: string): Promise<MarketplaceOrder> {
    const [updatedOrder] = await db.update(marketplaceOrders)
      .set({
        status: "refunded",
      })
      .where(eq(marketplaceOrders.id, orderId))
      .returning();
    
    if (!updatedOrder) {
      throw new Error("Order not found");
    }
    
    return updatedOrder;
  }

  async getOrderById(id: string): Promise<MarketplaceOrder | undefined> {
    const [order] = await db.select()
      .from(marketplaceOrders)
      .where(eq(marketplaceOrders.id, id));
    return order;
  }

  async getOrderByStripePaymentIntent(paymentIntentId: string): Promise<MarketplaceOrder | undefined> {
    const [order] = await db.select()
      .from(marketplaceOrders)
      .where(eq(marketplaceOrders.stripePaymentIntentId, paymentIntentId));
    return order;
  }

  async getUserPurchases(userId: string, options?: { limit?: number; offset?: number }): Promise<MarketplaceOrder[]> {
    let query = db.select()
      .from(marketplaceOrders)
      .where(eq(marketplaceOrders.buyerId, userId))
      .orderBy(desc(marketplaceOrders.createdAt))
      .$dynamic();
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    if (options?.offset) {
      query = query.offset(options.offset);
    }
    
    const orders = await query;
    return orders;
  }

  async getSellerOrders(sellerId: string, options?: { limit?: number; offset?: number; status?: string }): Promise<MarketplaceOrder[]> {
    let conditions = [eq(marketplaceOrders.sellerId, sellerId)];
    
    if (options?.status) {
      conditions.push(eq(marketplaceOrders.status, options.status as any));
    }
    
    let query = db.select()
      .from(marketplaceOrders)
      .where(and(...conditions))
      .orderBy(desc(marketplaceOrders.createdAt))
      .$dynamic();
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    if (options?.offset) {
      query = query.offset(options.offset);
    }
    
    const orders = await query;
    return orders;
  }

  async checkUserPurchasedListing(userId: string, listingId: string): Promise<boolean> {
    const [order] = await db.select()
      .from(marketplaceOrders)
      .where(
        and(
          eq(marketplaceOrders.buyerId, userId),
          eq(marketplaceOrders.listingId, listingId),
          eq(marketplaceOrders.status, "completed")
        )
      );
    
    return !!order;
  }

  generateOrderNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = randomBytes(3).toString('hex').toUpperCase();
    return `ORD-${timestamp}-${random}`;
  }

  // Marketplace operations - Digital Licenses implementation
  async createDigitalLicense(license: InsertDigitalLicense): Promise<DigitalLicense> {
    const [newLicense] = await db.insert(digitalLicenses)
      .values(license)
      .returning();
    return newLicense;
  }

  generateLicenseKey(): string {
    const prefix = 'LIC';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = randomBytes(8).toString('hex').toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  async getUserLicense(userId: string, promptId: string): Promise<DigitalLicense | undefined> {
    const [license] = await db.select()
      .from(digitalLicenses)
      .where(
        and(
          eq(digitalLicenses.buyerId, userId),
          eq(digitalLicenses.promptId, promptId)
        )
      );
    return license;
  }

  async getUserLicenses(userId: string, options?: { limit?: number; offset?: number }): Promise<DigitalLicense[]> {
    let query = db.select()
      .from(digitalLicenses)
      .where(eq(digitalLicenses.buyerId, userId))
      .orderBy(desc(digitalLicenses.createdAt))
      .$dynamic();
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    if (options?.offset) {
      query = query.offset(options.offset);
    }
    
    const licenses = await query;
    return licenses;
  }

  // Marketplace operations - Reviews implementation
  async createReview(review: InsertMarketplaceReview): Promise<MarketplaceReview> {
    // Start a transaction to create review and award credits
    const result = await db.transaction(async (tx) => {
      // Create the review
      const [newReview] = await tx.insert(marketplaceReviews)
        .values({
          ...review,
          verifiedPurchase: true,
          creditsAwarded: true,
        })
        .returning();
      
      // Award 10 credits to the reviewer
      const creditReward = 10;
      await tx.update(userCredits)
        .set({
          balance: sql`${userCredits.balance} + ${creditReward}`,
          totalEarned: sql`${(userCredits as any).totalEarned} + ${creditReward}`,
          updatedAt: new Date(),
        } as any)
        .where(eq(userCredits.userId, review.reviewerId));
      
      // Create credit transaction for the reward
      await tx.insert(creditTransactions)
        .values({
          userId: review.reviewerId,
          type: 'reward' as const,
          amount: creditReward,
          description: 'Review submission reward',
          metadata: { reviewId: newReview.id, listingId: review.listingId },
        } as any);
      
      // Update the listing's average rating and review count
      await this.updateListingRating(review.listingId);
      
      return newReview;
    });
    
    return result;
  }

  async getListingReviews(
    listingId: string, 
    options?: { 
      limit?: number; 
      offset?: number; 
      sortBy?: 'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful';
    }
  ): Promise<MarketplaceReview[]> {
    let query = db.select()
      .from(marketplaceReviews)
      .where(eq(marketplaceReviews.listingId, listingId))
      .$dynamic();
    
    // Apply sorting
    switch (options?.sortBy) {
      case 'oldest':
        query = query.orderBy(marketplaceReviews.createdAt);
        break;
      case 'highest':
        query = query.orderBy(desc(marketplaceReviews.rating), desc(marketplaceReviews.createdAt));
        break;
      case 'lowest':
        query = query.orderBy(marketplaceReviews.rating, desc(marketplaceReviews.createdAt));
        break;
      case 'helpful':
        query = query.orderBy(desc(marketplaceReviews.helpfulCount), desc(marketplaceReviews.createdAt));
        break;
      case 'newest':
      default:
        query = query.orderBy(desc(marketplaceReviews.createdAt));
        break;
    }
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    if (options?.offset) {
      query = query.offset(options.offset);
    }
    
    const reviews = await query;
    return reviews;
  }

  async canUserReview(userId: string, listingId: string): Promise<boolean> {
    // Check if user has purchased this listing
    const hasPurchased = await this.checkUserPurchasedListing(userId, listingId);
    if (!hasPurchased) {
      return false;
    }
    
    // Check if user has already reviewed this listing
    const hasReviewed = await this.getUserHasReviewed(userId, listingId);
    return !hasReviewed;
  }

  async getUserHasReviewed(userId: string, listingId: string): Promise<boolean> {
    const [review] = await db.select()
      .from(marketplaceReviews)
      .where(
        and(
          eq(marketplaceReviews.reviewerId, userId),
          eq(marketplaceReviews.listingId, listingId)
        )
      );
    
    return !!review;
  }

  async updateListingRating(listingId: string): Promise<void> {
    // Calculate average rating and review count
    const result = await db.select({
      avgRating: sql<string>`COALESCE(AVG(${marketplaceReviews.rating}), 0)`,
      reviewCount: sql<number>`COUNT(*)`,
    })
    .from(marketplaceReviews)
    .where(eq(marketplaceReviews.listingId, listingId));
    
    const { avgRating, reviewCount } = result[0] || { avgRating: '0', reviewCount: 0 };
    
    // Update the listing with new rating stats
    await db.update(marketplaceListings)
      .set({
        averageRating: avgRating,
        reviewCount: reviewCount,
        updatedAt: new Date(),
      })
      .where(eq(marketplaceListings.id, listingId));
  }

  async markReviewHelpful(reviewId: string, userId: string): Promise<void> {
    // For simplicity, we'll just increment the helpful count
    // In a real app, you might track who marked it helpful to prevent duplicates
    await db.update(marketplaceReviews)
      .set({
        helpfulCount: sql`${marketplaceReviews.helpfulCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(marketplaceReviews.id, reviewId));
  }

  async addSellerResponse(reviewId: string, sellerId: string, response: string): Promise<MarketplaceReview> {
    // First check if the seller owns the listing for this review
    const [review] = await db.select({
      review: marketplaceReviews,
      listing: marketplaceListings,
    })
    .from(marketplaceReviews)
    .innerJoin(marketplaceListings, eq(marketplaceReviews.listingId, marketplaceListings.id))
    .where(eq(marketplaceReviews.id, reviewId));
    
    if (!review || review.listing.sellerId !== sellerId) {
      throw new Error("Unauthorized: You can only respond to reviews on your own listings");
    }
    
    if (review.review.sellerResponse) {
      throw new Error("You have already responded to this review");
    }
    
    // Add the seller response
    const [updatedReview] = await db.update(marketplaceReviews)
      .set({
        sellerResponse: response,
        sellerRespondedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(marketplaceReviews.id, reviewId))
      .returning();
    
    return updatedReview;
  }

  async getReviewByOrderId(orderId: string): Promise<MarketplaceReview | undefined> {
    const [review] = await db.select()
      .from(marketplaceReviews)
      .where(eq(marketplaceReviews.orderId, orderId));
    
    return review;
  }

  async getSellerReviews(sellerId: string, options?: { limit?: number; offset?: number }): Promise<MarketplaceReview[]> {
    let query = db.select({
      review: marketplaceReviews,
    })
    .from(marketplaceReviews)
    .innerJoin(marketplaceListings, eq(marketplaceReviews.listingId, marketplaceListings.id))
    .where(eq(marketplaceListings.sellerId, sellerId))
    .orderBy(desc(marketplaceReviews.createdAt))
    .$dynamic();
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    if (options?.offset) {
      query = query.offset(options.offset);
    }
    
    const results = await query;
    return results.map(r => r.review);
  }
  
  // Dispute operations
  async createDispute(dispute: InsertMarketplaceDispute): Promise<MarketplaceDispute> {
    const [newDispute] = await db
      .insert(marketplaceDisputes)
      .values(dispute)
      .returning();
    
    // Create notification for respondent
    const order = await this.getOrderById(dispute.orderId);
    if (order) {
      const respondentId = dispute.initiatedBy === 'buyer' ? order.sellerId : order.buyerId;
      await this.createNotification({
        userId: respondentId,
        type: 'marketplace_dispute',
        title: 'New Dispute Created',
        message: `A dispute has been opened for order #${order.orderNumber}`,
        relatedUserId: dispute.initiatorId,
        metadata: { disputeId: newDispute.id, orderId: dispute.orderId },
      } as any);
    }
    
    return newDispute;
  }
  
  async getDisputeById(id: string): Promise<MarketplaceDispute | undefined> {
    const [dispute] = await db.select()
      .from(marketplaceDisputes)
      .where(eq(marketplaceDisputes.id, id));
    return dispute;
  }
  
  async getDisputeByOrderId(orderId: string): Promise<MarketplaceDispute | undefined> {
    const [dispute] = await db.select()
      .from(marketplaceDisputes)
      .where(eq(marketplaceDisputes.orderId, orderId));
    return dispute;
  }
  
  async getUserDisputes(userId: string, options?: {
    role?: 'initiator' | 'respondent' | 'all';
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<MarketplaceDispute[]> {
    let conditions = [];
    
    if (!options?.role || options.role === 'all') {
      conditions.push(or(
        eq(marketplaceDisputes.initiatorId, userId),
        eq(marketplaceDisputes.respondentId, userId)
      ));
    } else if (options.role === 'initiator') {
      conditions.push(eq(marketplaceDisputes.initiatorId, userId));
    } else if (options.role === 'respondent') {
      conditions.push(eq(marketplaceDisputes.respondentId, userId));
    }
    
    if (options?.status) {
      conditions.push(eq(marketplaceDisputes.status, options.status as any));
    }
    
    let query = db.select()
      .from(marketplaceDisputes)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(marketplaceDisputes.createdAt))
      .$dynamic();
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    if (options?.offset) {
      query = query.offset(options.offset);
    }
    
    return await query;
  }
  
  async getAdminDisputes(options?: {
    status?: string;
    escalatedOnly?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<MarketplaceDispute[]> {
    let conditions = [];
    
    if (options?.status) {
      conditions.push(eq(marketplaceDisputes.status, options.status as any));
    }
    
    if (options?.escalatedOnly) {
      conditions.push(sql`${marketplaceDisputes.escalatedAt} IS NOT NULL`);
    }
    
    let query = db.select()
      .from(marketplaceDisputes)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(marketplaceDisputes.createdAt))
      .$dynamic();
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    if (options?.offset) {
      query = query.offset(options.offset);
    }
    
    return await query;
  }
  
  async updateDispute(id: string, updates: Partial<MarketplaceDispute>): Promise<MarketplaceDispute> {
    const [updated] = await db
      .update(marketplaceDisputes)
      .set({
        ...updates,
        updatedAt: new Date(),
        lastRespondedAt: updates.lastRespondedAt || new Date(),
      })
      .where(eq(marketplaceDisputes.id, id))
      .returning();
    
    if (!updated) {
      throw new Error('Dispute not found');
    }
    
    return updated;
  }
  
  async resolveDispute(id: string, resolution: {
    resolution: string;
    refundAmountCents?: number;
    creditRefundAmount?: number;
  }): Promise<MarketplaceDispute> {
    const [resolved] = await db
      .update(marketplaceDisputes)
      .set({
        status: 'resolved',
        resolution: resolution.resolution,
        refundAmountCents: resolution.refundAmountCents,
        creditRefundAmount: resolution.creditRefundAmount,
        resolvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(marketplaceDisputes.id, id))
      .returning();
    
    if (!resolved) {
      throw new Error('Dispute not found');
    }
    
    // Notify both parties
    await this.createNotification({
      userId: resolved.initiatorId,
      type: 'marketplace_dispute',
      title: 'Dispute Resolved',
      message: 'Your dispute has been resolved',
      metadata: { disputeId: id },
    } as any);
    
    await this.createNotification({
      userId: resolved.respondentId,
      type: 'marketplace_dispute',
      title: 'Dispute Resolved',
      message: 'A dispute involving you has been resolved',
      metadata: { disputeId: id },
    } as any);
    
    return resolved;
  }
  
  async closeDispute(id: string): Promise<MarketplaceDispute> {
    const [closed] = await db
      .update(marketplaceDisputes)
      .set({
        status: 'closed',
        updatedAt: new Date(),
      })
      .where(eq(marketplaceDisputes.id, id))
      .returning();
    
    if (!closed) {
      throw new Error('Dispute not found');
    }
    
    return closed;
  }
  
  async canCreateDispute(orderId: string, userId: string): Promise<{ canCreate: boolean; reason?: string }> {
    // Check if order exists
    const order = await this.getOrderById(orderId);
    if (!order) {
      return { canCreate: false, reason: 'Order not found' };
    }
    
    // Check if user is involved in the order
    if (order.buyerId !== userId && order.sellerId !== userId) {
      return { canCreate: false, reason: 'You are not involved in this order' };
    }
    
    // Check if order is within 30 days
    const orderDate = new Date(order.createdAt as any);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    if (orderDate < thirtyDaysAgo) {
      return { canCreate: false, reason: 'Dispute window has expired (30 days)' };
    }
    
    // Check if dispute already exists
    const existingDispute = await this.getDisputeByOrderId(orderId);
    if (existingDispute) {
      return { canCreate: false, reason: 'A dispute already exists for this order' };
    }
    
    // Check if order is completed
    if (order.status !== 'completed') {
      return { canCreate: false, reason: 'Can only dispute completed orders' };
    }
    
    return { canCreate: true };
  }
  
  async escalateDisputeIfNeeded(disputeId: string): Promise<MarketplaceDispute | undefined> {
    const dispute = await this.getDisputeById(disputeId);
    if (!dispute) return undefined;
    
    // Check if already escalated
    if (dispute.escalatedAt) {
      return dispute;
    }
    
    // Check if 72 hours have passed since creation
    const createdAt = new Date(dispute.createdAt as any);
    const now = new Date();
    const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceCreation >= 72) {
      const [escalated] = await db
        .update(marketplaceDisputes)
        .set({
          escalatedAt: new Date(),
          status: 'in_progress',
          updatedAt: new Date(),
        })
        .where(eq(marketplaceDisputes.id, disputeId))
        .returning();
      
      // Notify admin
      // In a real system, we'd notify all admins
      await this.createNotification({
        userId: 'admin', // You'd need to get actual admin IDs
        type: 'marketplace_dispute',
        title: 'Dispute Escalated',
        message: `Dispute #${disputeId} has been escalated for admin review`,
        metadata: { disputeId },
      } as any);
      
      return escalated;
    }
    
    // Check if seller hasn't responded in 48 hours (for buyer-initiated disputes)
    if (dispute.initiatedBy === 'buyer' && !dispute.lastRespondedAt) {
      const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceCreation >= 48) {
        const [escalated] = await db
          .update(marketplaceDisputes)
          .set({
            escalatedAt: new Date(),
            status: 'in_progress',
            updatedAt: new Date(),
          })
          .where(eq(marketplaceDisputes.id, disputeId))
          .returning();
        
        return escalated;
      }
    }
    
    return dispute;
  }
  
  // Dispute message operations
  async createDisputeMessage(message: InsertDisputeMessage): Promise<DisputeMessage> {
    const [newMessage] = await db
      .insert(disputeMessages)
      .values(message as any)
      .returning();
    
    // Update dispute's lastRespondedAt
    await db
      .update(marketplaceDisputes)
      .set({
        lastRespondedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(marketplaceDisputes.id, message.disputeId));
    
    // Notify the other party
    const dispute = await this.getDisputeById(message.disputeId);
    if (dispute) {
      const recipientId = message.senderId === dispute.initiatorId 
        ? dispute.respondentId 
        : dispute.initiatorId;
      
      await this.createNotification({
        userId: recipientId,
        type: 'marketplace_dispute',
        title: 'New Dispute Message',
        message: 'You have a new message in your dispute',
        relatedUserId: message.senderId,
        metadata: { disputeId: message.disputeId },
      } as any);
    }
    
    return newMessage;
  }
  
  async getDisputeMessages(disputeId: string, options?: { limit?: number; offset?: number }): Promise<DisputeMessage[]> {
    let query = db.select()
      .from(disputeMessages)
      .where(eq(disputeMessages.disputeId, disputeId))
      .orderBy(desc(disputeMessages.createdAt))
      .$dynamic();
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    if (options?.offset) {
      query = query.offset(options.offset);
    }
    
    return await query;
  }
  
  async canSendDisputeMessage(disputeId: string, userId: string): Promise<boolean> {
    const dispute = await this.getDisputeById(disputeId);
    if (!dispute) return false;
    
    // Check if user is part of dispute or is admin
    const user = await this.getUser(userId);
    if (!user) return false;
    
    const isParticipant = userId === dispute.initiatorId || userId === dispute.respondentId;
    const isAdmin = user.role === 'super_admin' || user.role === 'community_admin';
    
    // Can send if participant or admin, and dispute is not closed
    return (isParticipant || isAdmin) && dispute.status !== 'closed';
  }
  
  // Refund operations
  async processRefund(orderId: string, refund: {
    amountCents?: number;
    creditAmount?: number;
    reason?: string;
  }): Promise<{ success: boolean; message: string }> {
    const order = await this.getOrderById(orderId);
    if (!order) {
      return { success: false, message: 'Order not found' };
    }
    
    if (order.status === 'refunded') {
      return { success: false, message: 'Order already refunded' };
    }
    
    try {
      // Process credit refund if applicable
      if (refund.creditAmount && refund.creditAmount > 0) {
        await this.addCredits(
          order.buyerId,
          refund.creditAmount,
          'marketplace_refund',
          `Refund for order #${order.orderNumber}`,
          orderId,
          'order'
        );
        
        // Deduct from seller's earned credits
        const sellerProfile = await this.getSellerProfile(order.sellerId);
        if (sellerProfile) {
          await db
            .update(sellerProfiles)
            .set({
              totalCreditsEarned: sql`${sellerProfiles.totalCreditsEarned} - ${refund.creditAmount}`,
              updatedAt: new Date(),
            })
            .where(eq(sellerProfiles.userId, order.sellerId));
        }
      }
      
      // Process USD refund if applicable (Stripe refund would go here)
      if (refund.amountCents && refund.amountCents > 0 && order.stripePaymentIntentId) {
        // In a real system, you'd process Stripe refund here
        // For now, we'll just update the seller's revenue
        const sellerProfile = await this.getSellerProfile(order.sellerId);
        if (sellerProfile) {
          await db
            .update(sellerProfiles)
            .set({
              totalRevenueCents: sql`${sellerProfiles.totalRevenueCents} - ${refund.amountCents}`,
              updatedAt: new Date(),
            })
            .where(eq(sellerProfiles.userId, order.sellerId));
        }
      }
      
      // Update order status
      await db
        .update(marketplaceOrders)
        .set({
          status: 'refunded',
        })
        .where(eq(marketplaceOrders.id, orderId));
      
      // Update listing sales count
      await db
        .update(marketplaceListings)
        .set({
          salesCount: sql`${marketplaceListings.salesCount} - 1`,
        })
        .where(eq(marketplaceListings.id, order.listingId));
      
      // Notify buyer
      await this.createNotification({
        userId: order.buyerId,
        type: 'marketplace_order',
        title: 'Order Refunded',
        message: `Your order #${order.orderNumber} has been refunded`,
        metadata: { orderId, refundAmount: refund.amountCents || refund.creditAmount },
      } as any);
      
      // Notify seller
      await this.createNotification({
        userId: order.sellerId,
        type: 'marketplace_order',
        title: 'Order Refunded',
        message: `Order #${order.orderNumber} has been refunded`,
        metadata: { orderId, refundAmount: refund.amountCents || refund.creditAmount },
      } as any);
      
      return { success: true, message: 'Refund processed successfully' };
    } catch (error: any) {
      console.error('Refund processing error:', error);
      return { success: false, message: error.message || 'Failed to process refund' };
    }
  }

  // Seller Analytics Methods
  async getSellerAnalytics(sellerId: string, dateRange?: { start: Date; end: Date }) {
    // Get orders for this seller
    const ordersQuery = db.select({
      id: marketplaceOrders.id,
      buyerId: marketplaceOrders.buyerId,
      listingId: marketplaceOrders.listingId,
      paymentType: (marketplaceOrders as any).paymentType,
      priceCents: (marketplaceOrders as any).priceCents,
      creditPrice: (marketplaceOrders as any).creditPrice,
      status: marketplaceOrders.status,
      createdAt: marketplaceOrders.createdAt,
      listing: marketplaceListings,
    })
    .from(marketplaceOrders)
    .innerJoin(marketplaceListings, eq(marketplaceOrders.listingId, marketplaceListings.id))
    .where(
      and(
        eq(marketplaceListings.sellerId, sellerId),
        eq(marketplaceOrders.status, 'completed'),
        dateRange ? and(
          gte(marketplaceOrders.createdAt, dateRange.start),
          sql`${marketplaceOrders.createdAt} <= ${dateRange.end}`
        ) : undefined
      )
    );
    
    const orders = await ordersQuery;
    
    // Calculate metrics
    let totalSales = 0;
    let totalRevenueUSD = 0;
    let totalCreditsEarned = 0;
    const uniqueBuyers = new Set<string>();
    const salesByDate = new Map<string, { revenue: number; sales: number }>();
    
    for (const order of orders) {
      totalSales++;
      uniqueBuyers.add(order.buyerId);
      
      if (order.paymentType === 'money' && order.priceCents) {
        totalRevenueUSD += order.priceCents / 100;
      } else if (order.paymentType === 'credits' && order.creditPrice) {
        totalCreditsEarned += order.creditPrice;
        // Convert credits to USD for combined revenue (1 credit = $0.01)
        totalRevenueUSD += order.creditPrice * 0.01;
      }
      
      // Group by date for chart data
      const dateKey = new Date(order.createdAt as any).toISOString().split('T')[0];
      const existing = salesByDate.get(dateKey) || { revenue: 0, sales: 0 };
      existing.sales++;
      if (order.paymentType === 'money' && order.priceCents) {
        existing.revenue += order.priceCents / 100;
      } else if (order.paymentType === 'credits' && order.creditPrice) {
        existing.revenue += order.creditPrice * 0.01;
      }
      salesByDate.set(dateKey, existing);
    }
    
    // Get seller's listings for views data
    const listings = await db.select({
      id: marketplaceListings.id,
      views: (marketplaceListings as any).views,
    })
    .from(marketplaceListings)
    .where(eq(marketplaceListings.sellerId, sellerId));
    
    const totalViews = listings.reduce((sum, listing) => sum + (listing.views || 0), 0);
    const conversionRate = totalViews > 0 ? (totalSales / totalViews) * 100 : 0;
    
    // Get average rating from reviews
    const reviews = await db.select({
      rating: marketplaceReviews.rating,
    })
    .from(marketplaceReviews)
    .innerJoin(marketplaceListings, eq(marketplaceReviews.listingId, marketplaceListings.id))
    .where(eq(marketplaceListings.sellerId, sellerId));
    
    const averageRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;
    
    // Calculate growth (compare to previous period)
    let growthPercentage = 0;
    if (dateRange) {
      const periodLength = dateRange.end.getTime() - dateRange.start.getTime();
      const previousStart = new Date(dateRange.start.getTime() - periodLength);
      const previousEnd = dateRange.start;
      
      const previousOrders = await db.select({
        paymentType: (marketplaceOrders as any).paymentType,
        priceCents: (marketplaceOrders as any).priceCents,
        creditPrice: (marketplaceOrders as any).creditPrice,
      })
      .from(marketplaceOrders)
      .innerJoin(marketplaceListings, eq(marketplaceOrders.listingId, marketplaceListings.id))
      .where(
        and(
          eq(marketplaceListings.sellerId, sellerId),
          eq(marketplaceOrders.status, 'completed'),
          gte(marketplaceOrders.createdAt, previousStart),
          sql`${marketplaceOrders.createdAt} < ${previousEnd}`
        )
      );
      
      let previousRevenue = 0;
      for (const order of previousOrders) {
        if (order.paymentType === 'money' && order.priceCents) {
          previousRevenue += order.priceCents / 100;
        } else if (order.paymentType === 'credits' && order.creditPrice) {
          previousRevenue += order.creditPrice * 0.01;
        }
      }
      
      if (previousRevenue > 0) {
        growthPercentage = ((totalRevenueUSD - previousRevenue) / previousRevenue) * 100;
      } else if (totalRevenueUSD > 0) {
        growthPercentage = 100;
      }
    }
    
    return {
      totalSales,
      totalRevenueUSD,
      totalCreditsEarned,
      averageOrderValue: totalSales > 0 ? totalRevenueUSD / totalSales : 0,
      uniqueCustomers: uniqueBuyers.size,
      conversionRate,
      averageRating,
      growthPercentage,
      repeatCustomerRate: totalSales > 0 ? ((totalSales - uniqueBuyers.size) / totalSales) * 100 : 0,
      totalViews,
    };
  }

  async getTopListings(sellerId: string, limit: number = 5) {
    const result = await db.select({
      listing: marketplaceListings,
      orderCount: sql<number>`COUNT(DISTINCT ${marketplaceOrders.id})`,
      totalRevenue: sql<number>`
        SUM(CASE 
          WHEN ${(marketplaceOrders as any).paymentType} = 'money' THEN ${(marketplaceOrders as any).priceCents} / 100.0
          WHEN ${(marketplaceOrders as any).paymentType} = 'credits' THEN ${(marketplaceOrders as any).creditPrice} * 0.01
          ELSE 0
        END)
      `,
    })
    .from(marketplaceListings)
    .leftJoin(
      marketplaceOrders,
      and(
        eq(marketplaceOrders.listingId, marketplaceListings.id),
        eq(marketplaceOrders.status, 'completed')
      )
    )
    .where(eq(marketplaceListings.sellerId, sellerId))
    .groupBy(marketplaceListings.id)
    .orderBy(desc(sql`COUNT(DISTINCT ${marketplaceOrders.id})`))
    .limit(limit);
    
    return result.map(r => ({
      ...r.listing,
      salesCount: r.orderCount,
      revenue: r.totalRevenue || 0,
      conversionRate: (r.listing as any).views > 0 ? (r.orderCount / (r.listing as any).views) * 100 : 0,
    }));
  }

  async getSalesChartData(sellerId: string, period: 'day' | 'week' | 'month', dateRange?: { start: Date; end: Date }) {
    const orders = await db.select({
      createdAt: marketplaceOrders.createdAt,
      paymentType: (marketplaceOrders as any).paymentType,
      priceCents: (marketplaceOrders as any).priceCents,
      creditPrice: (marketplaceOrders as any).creditPrice,
    })
    .from(marketplaceOrders)
    .innerJoin(marketplaceListings, eq(marketplaceOrders.listingId, marketplaceListings.id))
    .where(
      and(
        eq(marketplaceListings.sellerId, sellerId),
        eq(marketplaceOrders.status, 'completed'),
        dateRange ? and(
          gte(marketplaceOrders.createdAt, dateRange.start),
          sql`${marketplaceOrders.createdAt} <= ${dateRange.end}`
        ) : undefined
      )
    )
    .orderBy(marketplaceOrders.createdAt);
    
    const chartData: { date: string; revenue: number; sales: number; usdRevenue: number; creditRevenue: number }[] = [];
    const dataMap = new Map<string, { revenue: number; sales: number; usdRevenue: number; creditRevenue: number }>();
    
    for (const order of orders) {
      let dateKey: string;
      const date = new Date(order.createdAt as any);
      
      switch (period) {
        case 'day':
          dateKey = date.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          dateKey = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
      }
      
      const existing = dataMap.get(dateKey) || { revenue: 0, sales: 0, usdRevenue: 0, creditRevenue: 0 };
      existing.sales++;
      
      if (order.paymentType === 'money' && order.priceCents) {
        const usdAmount = order.priceCents / 100;
        existing.usdRevenue += usdAmount;
        existing.revenue += usdAmount;
      } else if (order.paymentType === 'credits' && order.creditPrice) {
        const creditAmount = order.creditPrice * 0.01;
        existing.creditRevenue += creditAmount;
        existing.revenue += creditAmount;
      }
      
      dataMap.set(dateKey, existing);
    }
    
    // Convert map to sorted array
    const sortedDates = Array.from(dataMap.keys()).sort();
    for (const date of sortedDates) {
      const data = dataMap.get(date)!;
      chartData.push({
        date,
        revenue: Math.round(data.revenue * 100) / 100,
        sales: data.sales,
        usdRevenue: Math.round(data.usdRevenue * 100) / 100,
        creditRevenue: Math.round(data.creditRevenue * 100) / 100,
      });
    }
    
    return chartData;
  }

  async getMarketplaceCategories() {
    const result = await db.select({
      category: marketplaceListings.category,
      count: sql<number>`COUNT(*)`,
    })
    .from(marketplaceListings)
    .where(eq(marketplaceListings.status, 'active'))
    .groupBy(marketplaceListings.category);
    
    return result.map(r => ({
      category: r.category as string,
      count: r.count,
    }));
  }

  // Migration functions for sub-community hierarchy
  async migrateCommunitiesToHierarchy(): Promise<{
    success: boolean;
    communitiesUpdated: number;
    errors: Array<{ id: string; name: string; error: string }>;
  }> {
    const errors: Array<{ id: string; name: string; error: string }> = [];
    let communitiesUpdated = 0;

    try {
      // Get all communities that need migration (no path or level set)
      const communitiesToMigrate = await db
        .select()
        .from(communities)
        .where(
          or(
            isNull(communities.level),
            isNull(communities.path),
            eq(communities.path, "")
          )
        );

      // Migrate each community to be a top-level community
      for (const community of communitiesToMigrate) {
        try {
          await db
            .update(communities)
            .set({
              level: 0,
              path: `/${community.id}/`,
              parentCommunityId: null,
              updatedAt: new Date(),
            })
            .where(eq(communities.id, community.id));
          
          communitiesUpdated++;
        } catch (error) {
          errors.push({
            id: community.id,
            name: community.name,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      return {
        success: errors.length === 0,
        communitiesUpdated,
        errors,
      };
    } catch (error) {
      return {
        success: false,
        communitiesUpdated: 0,
        errors: [{
          id: "migration",
          name: "Migration Process",
          error: error instanceof Error ? error.message : String(error),
        }],
      };
    }
  }

  async validateMigration(): Promise<{
    isValid: boolean;
    invalidCommunities: Array<{ id: string; name: string; issues: string[] }>;
    statistics: {
      totalCommunities: number;
      topLevelCommunities: number;
      subCommunities: number;
      communitiesWithoutPath: number;
      communitiesWithoutLevel: number;
    };
  }> {
    const invalidCommunities: Array<{ id: string; name: string; issues: string[] }> = [];

    // Get all communities
    const allCommunities = await db.select().from(communities);
    
    // Check for communities with invalid fields
    const communitiesWithoutPath = await db
      .select()
      .from(communities)
      .where(or(isNull(communities.path), eq(communities.path, "")));
    
    const communitiesWithoutLevel = await db
      .select()
      .from(communities)
      .where(isNull(communities.level));
    
    // Count top-level and sub-communities
    const topLevelCommunities = await db
      .select({ count: sql<number>`count(*)` })
      .from(communities)
      .where(and(eq(communities.level, 0), isNull(communities.parentCommunityId)));
    
    const subCommunities = await db
      .select({ count: sql<number>`count(*)` })
      .from(communities)
      .where(sql`${communities.level} > 0`);

    // Identify specific issues
    for (const community of allCommunities) {
      const issues: string[] = [];
      
      if (!community.level && community.level !== 0) {
        issues.push("Missing level field");
      }
      
      if (!community.path) {
        issues.push("Missing path field");
      }
      
      // Check consistency: level 0 should have no parent, level > 0 should have parent
      if (community.level === 0 && community.parentCommunityId) {
        issues.push("Top-level community has parent ID");
      }
      
      if (community.level && community.level > 0 && !community.parentCommunityId) {
        issues.push("Sub-community missing parent ID");
      }
      
      if (issues.length > 0) {
        invalidCommunities.push({
          id: community.id,
          name: community.name,
          issues,
        });
      }
    }

    return {
      isValid: invalidCommunities.length === 0,
      invalidCommunities,
      statistics: {
        totalCommunities: allCommunities.length,
        topLevelCommunities: Number(topLevelCommunities[0]?.count || 0),
        subCommunities: Number(subCommunities[0]?.count || 0),
        communitiesWithoutPath: communitiesWithoutPath.length,
        communitiesWithoutLevel: communitiesWithoutLevel.length,
      },
    };
  }

  async generateMigrationReport(): Promise<{
    timestamp: string;
    preCheck: {
      communitiesNeedingMigration: number;
      promptsWithoutSubCommunity: number;
      existingMemberships: number;
      existingAdmins: number;
    };
    results: {
      communitiesUpdated: number;
      errors: number;
      preservedMemberships: number;
      preservedAdmins: number;
    };
    validation: {
      allFieldsValid: boolean;
      dataIntegrityMaintained: boolean;
    };
  }> {
    // Pre-migration check
    const needsMigration = await db
      .select({ count: sql<number>`count(*)` })
      .from(communities)
      .where(
        or(
          isNull(communities.level),
          isNull(communities.path),
          eq(communities.path, "")
        )
      );
    
    const promptsWithoutSub = await db
      .select({ count: sql<number>`count(*)` })
      .from(prompts)
      .where(isNull(prompts.subCommunityId));
    
    const memberships = await db
      .select({ count: sql<number>`count(*)` })
      .from(userCommunities);
    
    const admins = await db
      .select({ count: sql<number>`count(*)` })
      .from(communityAdmins);

    // Run migration
    const migrationResult = await this.migrateCommunitiesToHierarchy();
    
    // Post-migration check
    const postMemberships = await db
      .select({ count: sql<number>`count(*)` })
      .from(userCommunities);
    
    const postAdmins = await db
      .select({ count: sql<number>`count(*)` })
      .from(communityAdmins);
    
    // Validate migration
    const validation = await this.validateMigration();

    return {
      timestamp: new Date().toISOString(),
      preCheck: {
        communitiesNeedingMigration: Number(needsMigration[0]?.count || 0),
        promptsWithoutSubCommunity: Number(promptsWithoutSub[0]?.count || 0),
        existingMemberships: Number(memberships[0]?.count || 0),
        existingAdmins: Number(admins[0]?.count || 0),
      },
      results: {
        communitiesUpdated: migrationResult.communitiesUpdated,
        errors: migrationResult.errors.length,
        preservedMemberships: Number(postMemberships[0]?.count || 0),
        preservedAdmins: Number(postAdmins[0]?.count || 0),
      },
      validation: {
        allFieldsValid: validation.isValid,
        dataIntegrityMaintained: 
          Number(memberships[0]?.count || 0) === Number(postMemberships[0]?.count || 0) &&
          Number(admins[0]?.count || 0) === Number(postAdmins[0]?.count || 0),
      },
    };
  }
  
  // Platform settings operations
  async getPlatformSettings(keys: string[]): Promise<Record<string, string>> {
    const settings = await db
      .select()
      .from(platformSettings)
      .where(inArray(platformSettings.key, keys));
    
    const result: Record<string, string> = {};
    for (const setting of settings) {
      result[setting.key] = setting.value as string;
    }
    return result;
  }
  
  async updatePlatformSettings(settings: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(settings)) {
      await db
        .insert(platformSettings)
        .values({
          key,
          value,
          category: key.startsWith('paypal.') ? 'paypal' : 'general',
          description: '',
          isEditable: true,
          updatedAt: new Date(),
        } as any)
        .onConflictDoUpdate({
          target: platformSettings.key,
          set: {
            value,
            updatedAt: new Date(),
          },
        });
    }
  }

  // Get platform transaction summary for admin dashboard
  async getPlatformTransactionSummary(filters?: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    totalRevenue: number;
    totalCommission: number;
    totalPayouts: number;
    pendingPayouts: number;
    totalOrders: number;
    averageOrderValue: number;
    topSellers: Array<{
      userId: string;
      username: string;
      totalSales: number;
      totalRevenue: number;
    }>;
    recentTransactions: Array<{
      id: string;
      type: string;
      amount: number;
      status: string;
      userId: string;
      username: string;
      createdAt: string;
      orderId?: string;
      description?: string;
    }>;
  }> {
    let conditions = [];
    
    if (filters?.startDate) {
      conditions.push(gte(transactionLedger.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(transactionLedger.createdAt, filters.endDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const transactions = await db
      .select()
      .from(transactionLedger)
      .where(whereClause);
    
    // Calculate summary metrics
    const totalRevenue = transactions
      .filter(t => t.type === 'purchase' && t.status === 'completed')
      .reduce((sum, t) => sum + (t.amountCents || 0), 0) / 100;
    
    const totalCommission = transactions
      .filter(t => t.type === 'commission' && t.status === 'completed')
      .reduce((sum, t) => sum + (t.amountCents || 0), 0) / 100;
    
    const totalPayouts = transactions
      .filter(t => t.type === 'payout' && t.status === 'completed')
      .reduce((sum, t) => sum + (t.amountCents || 0), 0) / 100;
    
    const pendingPayouts = transactions
      .filter(t => t.type === 'payout' && t.status === 'pending')
      .reduce((sum, t) => sum + (t.amountCents || 0), 0) / 100;

    const orders = await db
      .select()
      .from(marketplaceOrders)
      .where(eq(marketplaceOrders.status, 'completed'));
    
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 
      ? orders.reduce((sum, o) => sum + (o.amountCents || 0), 0) / totalOrders / 100
      : 0;

    // Get top sellers
    const sellers = await db
      .select({
        userId: sellerProfiles.userId,
        totalSales: sellerProfiles.totalSales,
        totalRevenue: sellerProfiles.totalRevenueCents,
      })
      .from(sellerProfiles)
      .orderBy(desc(sellerProfiles.totalRevenueCents))
      .limit(5);

    const topSellers = await Promise.all(
      sellers.map(async (seller) => {
        const user = await this.getUser(seller.userId);
        return {
          userId: seller.userId,
          username: user?.username || 'Unknown',
          totalSales: seller.totalSales || 0,
          totalRevenue: (seller.totalRevenue || 0) / 100,
        };
      })
    );

    // Get recent transactions
    const recentTxns = await db
      .select()
      .from(transactionLedger)
      .orderBy(desc(transactionLedger.createdAt))
      .limit(10);

    const recentTransactions = await Promise.all(
      recentTxns.map(async (txn) => {
        const userId = txn.toUserId || txn.fromUserId || '';
        const user = userId ? await this.getUser(userId) : null;
        return {
          id: txn.id,
          type: txn.type,
          amount: (txn.amountCents || 0) / 100,
          status: txn.status,
          userId,
          username: user?.username || 'Unknown',
          createdAt: txn.createdAt?.toISOString() || '',
          orderId: txn.orderId || undefined,
          description: txn.description || undefined,
        };
      })
    );

    return {
      totalRevenue,
      totalCommission,
      totalPayouts,
      pendingPayouts,
      totalOrders,
      averageOrderValue,
      topSellers,
      recentTransactions,
    };
  }

  // Get all transactions with filtering
  async getAllTransactions(filters?: {
    type?: string;
    status?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<{
    data: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const offset = (page - 1) * limit;

    let conditions = [];

    // Apply filters
    if (filters?.type) {
      conditions.push(eq(transactionLedger.type, filters.type as any));
    }
    if (filters?.status) {
      conditions.push(eq(transactionLedger.status, filters.status as any));
    }
    if (filters?.userId) {
      conditions.push(
        or(
          eq(transactionLedger.fromUserId, filters.userId),
          eq(transactionLedger.toUserId, filters.userId)
        )
      );
    }
    if (filters?.startDate) {
      conditions.push(gte(transactionLedger.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(transactionLedger.createdAt, filters.endDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [{ count: total }] = await db
      .select({ count: count() })
      .from(transactionLedger)
      .where(whereClause);

    // Get paginated data
    const data = await db
      .select()
      .from(transactionLedger)
      .where(whereClause)
      .orderBy(desc(transactionLedger.createdAt))
      .limit(limit)
      .offset(offset);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      totalPages,
    };
  }

  // Convert transactions to CSV format
  convertTransactionsToCSV(transactions: any[]): string {
    const headers = [
      'ID',
      'Date',
      'Type',
      'Status',
      'From User',
      'To User',
      'Amount',
      'Commission',
      'Net Amount',
      'Payment Method',
      'Description',
    ];

    const rows = transactions.map((t) => [
      t.id,
      t.createdAt ? new Date(t.createdAt).toISOString() : '',
      t.type,
      t.status,
      t.fromUserId || '',
      t.toUserId || '',
      t.amountCents ? (t.amountCents / 100).toFixed(2) : '0.00',
      t.commissionCents ? (t.commissionCents / 100).toFixed(2) : '0.00',
      t.netAmountCents ? (t.netAmountCents / 100).toFixed(2) : '0.00',
      t.paymentMethod || '',
      t.description || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    return csvContent;
  }

  // Get payout batches
  async getPayoutBatches(filters?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const offset = (page - 1) * limit;

    let conditions = [];

    if (filters?.status) {
      conditions.push(eq(payoutBatches.status, filters.status as any));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ count: total }] = await db
      .select({ count: count() })
      .from(payoutBatches)
      .where(whereClause);

    const data = await db
      .select()
      .from(payoutBatches)
      .where(whereClause)
      .orderBy(desc(payoutBatches.createdAt))
      .limit(limit)
      .offset(offset);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      totalPages,
    };
  }

  // Prompt Refinement Conversation operations
  async createRefinementConversation(data: InsertPromptRefinementConversation): Promise<PromptRefinementConversation> {
    const [conversation] = await db
      .insert(promptRefinementConversations)
      .values(data)
      .returning();
    
    // Update user memory stats
    await this.updateUserPromptMemoryStats(data.userId, 'conversation');
    
    return conversation;
  }

  async getRefinementConversation(id: string): Promise<PromptRefinementConversation | undefined> {
    const [conversation] = await db
      .select()
      .from(promptRefinementConversations)
      .where(eq(promptRefinementConversations.id, id));
    return conversation;
  }

  async getUserRefinementConversations(
    userId: string, 
    options?: { limit?: number; offset?: number; activeOnly?: boolean }
  ): Promise<PromptRefinementConversation[]> {
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;
    
    let conditions = [eq(promptRefinementConversations.userId, userId)];
    
    if (options?.activeOnly) {
      conditions.push(eq(promptRefinementConversations.isActive, true));
    }
    
    return await db
      .select()
      .from(promptRefinementConversations)
      .where(and(...conditions))
      .orderBy(desc(promptRefinementConversations.updatedAt))
      .limit(limit)
      .offset(offset);
  }

  async updateRefinementConversation(
    id: string, 
    data: Partial<PromptRefinementConversation>
  ): Promise<PromptRefinementConversation> {
    const [conversation] = await db
      .update(promptRefinementConversations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(promptRefinementConversations.id, id))
      .returning();
    return conversation;
  }

  async deleteRefinementConversation(id: string): Promise<void> {
    await db
      .delete(promptRefinementConversations)
      .where(eq(promptRefinementConversations.id, id));
  }

  // Refinement message operations
  async createRefinementMessage(data: InsertPromptRefinementMessage): Promise<PromptRefinementMessage> {
    const [message] = await db
      .insert(promptRefinementMessages)
      .values(data)
      .returning();
    
    // Update conversation's updatedAt timestamp
    await db
      .update(promptRefinementConversations)
      .set({ updatedAt: new Date() })
      .where(eq(promptRefinementConversations.id, data.conversationId));
    
    return message;
  }

  async getConversationMessages(conversationId: string): Promise<PromptRefinementMessage[]> {
    return await db
      .select()
      .from(promptRefinementMessages)
      .where(eq(promptRefinementMessages.conversationId, conversationId))
      .orderBy(promptRefinementMessages.createdAt);
  }

  // User prompt memory operations
  async getUserPromptMemory(userId: string): Promise<UserPromptMemory | undefined> {
    const [memory] = await db
      .select()
      .from(userPromptMemory)
      .where(eq(userPromptMemory.userId, userId));
    return memory;
  }

  async upsertUserPromptMemory(userId: string, data: Partial<UserPromptMemory>): Promise<UserPromptMemory> {
    const existing = await this.getUserPromptMemory(userId);
    
    if (existing) {
      return await this.updateUserPromptMemory(userId, data);
    }
    
    const [memory] = await db
      .insert(userPromptMemory)
      .values({
        userId,
        preferredStyles: data.preferredStyles || [],
        preferredThemes: data.preferredThemes || [],
        preferredModifiers: data.preferredModifiers || [],
        avoidedTerms: data.avoidedTerms || [],
        customInstructions: data.customInstructions || null,
        totalConversations: data.totalConversations || 0,
        totalRefinements: data.totalRefinements || 0,
      })
      .returning();
    
    return memory;
  }

  async updateUserPromptMemory(userId: string, updates: Partial<UserPromptMemory>): Promise<UserPromptMemory> {
    const [memory] = await db
      .update(userPromptMemory)
      .set({ ...updates, updatedAt: new Date(), lastActiveAt: new Date() })
      .where(eq(userPromptMemory.userId, userId))
      .returning();
    return memory;
  }

  // Helper method to update user memory stats
  private async updateUserPromptMemoryStats(userId: string, type: 'conversation' | 'refinement'): Promise<void> {
    const existing = await this.getUserPromptMemory(userId);
    
    if (existing) {
      const updates: Partial<UserPromptMemory> = {
        lastActiveAt: new Date(),
      };
      
      if (type === 'conversation') {
        updates.totalConversations = (existing.totalConversations || 0) + 1;
      } else if (type === 'refinement') {
        updates.totalRefinements = (existing.totalRefinements || 0) + 1;
      }
      
      await this.updateUserPromptMemory(userId, updates);
    } else {
      await this.upsertUserPromptMemory(userId, {
        totalConversations: type === 'conversation' ? 1 : 0,
        totalRefinements: type === 'refinement' ? 1 : 0,
      });
    }
  }
}

export const storage = new DatabaseStorage();
