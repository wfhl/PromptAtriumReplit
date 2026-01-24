import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertPromptSchema, insertProjectSchema, insertCollectionSchema, insertPromptRatingSchema, insertCommunitySchema, insertUserCommunitySchema, insertUserSchema, bulkOperationSchema, bulkOperationResultSchema, insertCategorySchema, insertPromptTypeSchema, insertPromptStyleSchema, insertPromptStyleRuleTemplateSchema, insertIntendedGeneratorSchema, insertRecommendedModelSchema, insertMarketplaceListingSchema, insertSellerProfileSchema, insertMarketplaceOrderSchema, insertDigitalLicenseSchema, marketplaceOrders, digitalLicenses, marketplaceListings, insertMarketplaceDisputeSchema, insertDisputeMessageSchema } from "@shared/schema";
import Stripe from "stripe";
import { eq, sql } from "drizzle-orm";
import { db } from "./db";
import { 
  requireSuperAdmin, 
  requireGlobalAdmin,
  requirePrivateCommunityCreator,
  requireCommunityAdmin, 
  requireCommunityManager,
  requireCommunityAdminRole, 
  requireCommunityMember,
  requireSubCommunityAdmin,
  requireSubCommunityMember
} from "./rbac";
import { ObjectStorageService, ObjectNotFoundError, objectStorageClient, parseObjectPath } from "./objectStorage";
import { ObjectPermission, getObjectAclPolicy } from "./objectAcl";
import { File } from "@google-cloud/storage";
import express, { NextFunction, Response } from "express";
import { z } from "zod";
import { getAuthUrl, getTokens, saveToGoogleDrive, refreshAccessToken } from "./googleDrive";
import { devStorage } from "./devStorage";
import aiAnalyzerRouter from "./routes/aiAnalyzer";
import captionRouter from "./routes/caption";
import enhancePromptRouter from "./routes/enhance-prompt";
import promptMinerRouter from "./routes/prompt-miner";
import systemDataRouter from "./routes/system-data";
import adminRouter from "./routes/admin";
import promptRefinementRouter from "./routes/prompt-refinement";
import promptExtractionRouter from "./routes/prompt-extraction";
import { 
  authLimiter, 
  apiLimiter, 
  strictApiLimiter, 
  imageUploadLimiter, 
  promptCreationLimiter,
  searchLimiter,
  dataExportLimiter 
} from "./rateLimit";

// Initialize Stripe if key is available
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16",
  });
} else {
  console.warn("STRIPE_SECRET_KEY not set - Stripe payments will be disabled");
}

// Seller onboarding validation schema
const sellerOnboardingSchema = z.object({
  businessType: z.enum(["individual", "business"]),
  taxInfo: z.object({
    taxId: z.string().optional(),
    vatNumber: z.string().optional(),
    businessName: z.string().optional(),
    businessAddress: z.string().optional(),
  }).refine(
    (data) => {
      // At least one tax field should be provided
      return data.taxId || data.vatNumber || data.businessName || data.businessAddress;
    },
    { message: "At least one tax information field is required" }
  ),
  payoutMethod: z.enum(["stripe", "paypal"]),
  paypalEmail: z.string().email("Invalid email address").optional(),
}).refine((data) => {
  // If PayPal is selected, email is required
  if (data.payoutMethod === "paypal" && !data.paypalEmail) {
    return false;
  }
  return true;
}, {
  message: "PayPal email is required for PayPal payouts",
  path: ["paypalEmail"],
});

// Helper function to resolve public image URLs for development
// ONLY affects development mode - production URLs pass through unchanged
function resolvePublicImageUrl(url: string | null | undefined): string | null | undefined {
  if (!url) return url;
  
  // ONLY transform URLs in development mode
  if (process.env.NODE_ENV === 'development') {
    return devStorage.getPublicURL(url);
  }
  
  // In production, return URL unchanged
  return url;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Seed default prompt styles on startup if none exist
  try {
    const existingGlobalStyles = await storage.getPromptStyles({ type: 'global' });
    if (existingGlobalStyles.length === 0) {
      console.log("Seeding default prompt styles...");
      const defaultStyles = [
        { name: "Photography", description: "Professional photography, {character}, {subject}, high quality, detailed", type: "global" as const },
        { name: "Artistic", description: "Artistic render of {character}, {subject}, creative composition, masterpiece", type: "global" as const },
        { name: "Cinematic", description: "Cinematic shot, {character}, {subject}, dramatic lighting, movie quality", type: "global" as const },
        { name: "Portrait", description: "Portrait photography, {character}, {subject}, professional headshot", type: "global" as const },
        { name: "Lifestyle", description: "Lifestyle photography, {character}, {subject}, natural setting", type: "global" as const },
      ];
      
      for (const style of defaultStyles) {
        try {
          await storage.createPromptStyle(style);
        } catch (err) {
          console.log(`Failed to create style ${style.name}:`, err);
        }
      }
      console.log(`Seeded ${defaultStyles.length} default prompt styles`);
    } else {
      console.log(`Found ${existingGlobalStyles.length} existing global prompt styles`);
    }
  } catch (error) {
    console.error("Error checking/seeding prompt styles:", error);
  }
  
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const user = await storage.getUser(userId);
      
      // In development only, normalize the profile image URL for display
      if (process.env.NODE_ENV === 'development' && user) {
        user.profileImageUrl = resolvePublicImageUrl(user.profileImageUrl);
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Google Drive OAuth routes
  app.get('/api/auth/google', (req, res) => {
    const state = req.query.returnUrl || '/';
    const authUrl = getAuthUrl(state as string);
    res.redirect(authUrl);
  });

  app.get('/api/auth/google/callback', async (req, res) => {
    const { code, state } = req.query;
    
    if (!code) {
      return res.redirect('/?error=google_auth_failed');
    }
    
    try {
      const tokens = await getTokens(code as string);
      
      // Store tokens in session
      (req.session as any).googleTokens = tokens;
      
      // Redirect to the return URL or close the popup
      const returnUrl = state || '/';
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'google-auth-success', tokens: ${JSON.stringify(tokens)} }, '*');
                window.close();
              } else {
                window.location.href = '${returnUrl}';
              }
            </script>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      res.redirect('/?error=google_auth_failed');
    }
  });

  // Google Drive API routes
  app.post('/api/google-drive/save', isAuthenticated, async (req: any, res) => {
    try {
      const { fileName, fileContent, mimeType, accessToken } = req.body;
      
      if (!accessToken) {
        return res.status(401).json({ message: "Google Drive not connected" });
      }
      
      const result = await saveToGoogleDrive(
        accessToken,
        fileName,
        fileContent,
        mimeType || 'application/json'
      );
      
      res.json(result);
    } catch (error: any) {
      console.error('Error saving to Google Drive:', error);
      
      // Check if it's a token expiry error
      if (error.code === 401 || error.message?.includes('invalid_grant')) {
        return res.status(401).json({ message: "Google Drive authentication expired", needsReauth: true });
      }
      
      res.status(500).json({ message: "Failed to save to Google Drive" });
    }
  });

  app.post('/api/google-drive/refresh-token', isAuthenticated, async (req: any, res) => {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({ message: "Refresh token required" });
      }
      
      const accessToken = await refreshAccessToken(refreshToken);
      res.json({ accessToken });
    } catch (error) {
      console.error('Error refreshing token:', error);
      res.status(401).json({ message: "Failed to refresh token", needsReauth: true });
    }
  });

  // Profile routes
  app.put('/api/profile', isAuthenticated, apiLimiter, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      
      // Pre-process birthday field: convert string to Date if present
      const processedBody = { ...req.body };
      if (processedBody.birthday) {
        // Convert birthday string to Date object
        processedBody.birthday = new Date(processedBody.birthday);
        // Check if the date is valid
        if (isNaN(processedBody.birthday.getTime())) {
          return res.status(400).json({ message: "Invalid birthday format" });
        }
      } else if (processedBody.birthday === null || processedBody.birthday === '') {
        // Handle null or empty string as undefined (remove birthday)
        processedBody.birthday = null;
      }
      
      // Validate request body
      const validatedData = insertUserSchema.partial().parse(processedBody);
      
      // Check username uniqueness if username is being updated
      if (validatedData.username) {
        const existingUser = await storage.getUserByUsername(validatedData.username);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ message: "Username already taken" });
        }
      }
      
      const updatedUser = await storage.updateUser(userId, validatedData);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid profile data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Username availability check endpoint
  app.get('/api/check-username/:username', async (req, res) => {
    try {
      const { username } = req.params;
      const currentUserId = (req.user as any)?.claims?.sub;
      
      // Validate username format
      const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
      if (!usernameRegex.test(username)) {
        return res.json({ 
          available: false, 
          message: "Username must be 3-30 characters and contain only letters, numbers, hyphens, and underscores" 
        });
      }
      
      const existingUser = await storage.getUserByUsername(username);
      
      // Username is available if no user exists or it's the current user's username
      const available = !existingUser || (currentUserId && existingUser.id === currentUserId);
      
      res.json({ 
        available,
        message: available ? "Username is available" : "Username is already taken"
      });
    } catch (error) {
      console.error("Error checking username:", error);
      res.status(500).json({ message: "Failed to check username availability" });
    }
  });

  app.get('/api/profile/:username', async (req, res) => {
    try {
      const { username } = req.params;
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Return public profile data only
      const publicProfile = {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        bio: user.bio,
        profileImageUrl: user.profileImageUrl,
        website: user.website,
        twitterHandle: user.twitterHandle,
        githubHandle: user.githubHandle,
        linkedinHandle: user.linkedinHandle,
        instagramHandle: user.instagramHandle,
        deviantartHandle: user.deviantartHandle,
        blueskyHandle: user.blueskyHandle,
        tiktokHandle: user.tiktokHandle,
        redditHandle: user.redditHandle,
        patreonHandle: user.patreonHandle,
        customSocials: user.customSocials,
        createdAt: user.createdAt,
        // Respect privacy settings
        email: user.emailVisibility ? user.email : null,
        birthday: user.showBirthday ? user.birthday : null,
      };

      // Only return profile if it's public or user is viewing their own profile
      const currentUserId = (req.user as any)?.claims?.sub;
      if (user.profileVisibility === 'private' && currentUserId !== user.id) {
        return res.status(403).json({ message: "Profile is private" });
      }

      res.json(publicProfile);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.get('/api/profile/check-username/:username', async (req, res) => {
    try {
      const { username } = req.params;
      
      // Basic username validation
      if (username.length < 3 || username.length > 30) {
        return res.json({ available: false, reason: "Username must be 3-30 characters" });
      }
      
      if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        return res.json({ available: false, reason: "Username can only contain letters, numbers, hyphens, and underscores" });
      }

      const existingUser = await storage.getUserByUsername(username);
      res.json({ available: !existingUser });
    } catch (error) {
      console.error("Error checking username:", error);
      res.status(500).json({ message: "Failed to check username availability" });
    }
  });

  // Object Storage routes
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req, res) => {
    // Gets the authenticated user id.
    const userId = (req.user as any)?.claims?.sub;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    try {
      // Use development storage in development mode
      if (process.env.NODE_ENV === 'development') {
        const { uploadURL, objectId } = await devStorage.getDevUploadURL('generic');
        // Also return the canonical path for dev mode
        res.json({ 
          uploadURL,
          objectPath: `/objects/uploads/${objectId}`,
          publicURL: `/api/dev-storage/uploads/${objectId}`
        });
      } else {
        const objectStorageService = new ObjectStorageService();
        const uploadURL = await objectStorageService.getObjectEntityUploadURL();
        res.json({ uploadURL });
      }
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // Development-only upload endpoints
  if (process.env.NODE_ENV === 'development') {
    // Generic development upload handler
    app.put("/api/dev-upload/:type/:objectId", express.raw({ type: '*/*', limit: '50mb' }), async (req, res) => {
      const { objectId, type } = req.params;
      const userId = (req.user as any)?.claims?.sub;
      
      try {
        const validTypes = ['profile', 'prompt', 'generic'];
        if (!validTypes.includes(type)) {
          return res.status(400).json({ error: "Invalid upload type" });
        }
        
        const publicPath = await devStorage.saveFile(
          objectId, 
          req.body as Buffer, 
          type as 'profile' | 'prompt' | 'generic',
          {
            contentType: req.headers['content-type'] || 'application/octet-stream',
            userId
          }
        );
        
        // Return both the canonical path and public URL
        const fileId = objectId;
        res.json({
          path: publicPath,
          objectPath: `/objects/uploads/${fileId}`,
          publicURL: publicPath,
          message: "Development upload successful"
        });
      } catch (error) {
        console.error("Error in development upload:", error);
        res.status(500).json({ error: "Failed to upload file" });
      }
    });
    
    // Development storage serving endpoint
    app.get("/api/dev-storage/:type/:objectId", async (req, res) => {
      const { type, objectId } = req.params;
      
      try {
        const { data, metadata } = await devStorage.getFile(type, objectId);
        
        // Determine appropriate content type
        let contentType = metadata?.contentType || 'application/octet-stream';
        
        // If no content type stored, try to determine from file extension
        if (contentType === 'application/octet-stream') {
          const ext = objectId.split('.').pop()?.toLowerCase();
          const mimeTypes: { [key: string]: string } = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'svg': 'image/svg+xml'
          };
          contentType = mimeTypes[ext || ''] || contentType;
        }
        
        res.set({
          'Content-Type': contentType,
          'Content-Length': data.length.toString(),
          'Cache-Control': 'public, max-age=3600'
        });
        
        res.send(data);
      } catch (error) {
        console.error("Error serving development file:", error);
        res.status(404).json({ error: "File not found" });
      }
    });
    
    // Fallback for old upload-direct endpoint
    app.put("/api/objects/upload-direct/:objectId", express.raw({ type: '*/*', limit: '50mb' }), async (req, res) => {
      const { objectId } = req.params;
      const userId = (req.user as any)?.claims?.sub;
      
      try {
        const publicPath = await devStorage.saveFile(
          objectId, 
          req.body as Buffer, 
          'generic',
          {
            contentType: req.headers['content-type'] || 'application/octet-stream',
            userId
          }
        );
        
        // Return both the canonical path and public URL
        res.json({
          path: publicPath,
          objectPath: `/objects/uploads/${objectId}`,
          publicURL: publicPath,
          message: "Development upload successful",
          success: true
        });
      } catch (error) {
        console.error("Error in direct upload:", error);
        res.status(500).json({ error: "Failed to upload file" });
      }
    });
    
    console.log("Development storage endpoints registered");
  }

  // Public image serving endpoint with production fallback
  app.get("/api/objects/serve/:path(*)", async (req, res) => {
    try {
      const objectPath = decodeURIComponent(req.params.path);
      
      // Handle different path formats
      let normalizedPath = objectPath;
      
      // If it's already a full URL or /objects/ path, extract the relevant part
      if (objectPath.startsWith('/objects/')) {
        normalizedPath = objectPath;
      } else if (!objectPath.startsWith('/')) {
        normalizedPath = `/objects/${objectPath}`;
      }
      
      const objectStorageService = new ObjectStorageService();
      
      try {
        // Try to get the file using the object entity file method
        const objectFile = await objectStorageService.getObjectEntityFile(normalizedPath);
        
        // Check if the file is public (no auth required for public files)
        const aclPolicy = await getObjectAclPolicy(objectFile);
        const isPublic = aclPolicy?.visibility === "public";
        
        if (!isPublic) {
          // For private files, check authentication
          const userId = (req.user as any)?.claims?.sub;
          const canAccess = await objectStorageService.canAccessObjectEntity({
            objectFile,
            userId: userId,
            requestedPermission: ObjectPermission.READ,
          });
          
          if (!canAccess) {
            return res.sendStatus(401);
          }
        }
        
        // Stream the file to the response
        await objectStorageService.downloadObject(objectFile, res);
      } catch (error) {
        // Fallback for production environment when sidecar isn't available
        if (process.env.NODE_ENV === 'production' || error instanceof ObjectNotFoundError) {
          console.log("Falling back to direct bucket access for:", normalizedPath);
          
          // Try direct bucket access for public images
          const privateObjectDir = process.env.PRIVATE_OBJECT_DIR;
          if (!privateObjectDir) {
            console.error("Object storage not configured");
            return res.sendStatus(404);
          }
          
          let fullPath = normalizedPath;
          if (normalizedPath.startsWith('/objects/')) {
            const entityId = normalizedPath.slice('/objects/'.length);
            fullPath = `${privateObjectDir}/${entityId}`;
          }
          
          const { bucketName, objectName } = parseObjectPath(fullPath);
          const bucket = objectStorageClient.bucket(bucketName);
          const file = bucket.file(objectName);
          
          const [exists] = await file.exists();
          if (!exists) {
            return res.sendStatus(404);
          }
          
          // For production fallback, only serve public files without auth
          const aclPolicy = await getObjectAclPolicy(file);
          if (aclPolicy?.visibility !== "public") {
            // Private file, requires authentication which we can't verify without sidecar
            console.error("Cannot verify access for private file without sidecar:", normalizedPath);
            return res.sendStatus(401);
          }
          
          // Stream the public file
          await objectStorageService.downloadObject(file, res);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.put("/api/profile-picture", isAuthenticated, imageUploadLimiter, async (req, res) => {
    if (!req.body.profileImageUrl) {
      return res.status(400).json({ error: "profileImageUrl is required" });
    }

    // Gets the authenticated user id.
    const userId = (req.user as any)?.claims?.sub;

    try {
      let objectPath = req.body.profileImageUrl;
      
      // In development mode, handle local storage paths
      if (process.env.NODE_ENV === 'development') {
        // Store the canonical path for persistence
        const fileId = req.body.profileImageUrl.split('/').pop();
        objectPath = `/objects/uploads/${fileId}`;
      } else {
        const objectStorageService = new ObjectStorageService();
        objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
          req.body.profileImageUrl,
          {
            owner: userId,
            // Profile images should be public as they can be accessed by other users
            visibility: "public",
          },
        );
      }

      // Update user profile with the new image path
      const updatedUser = await storage.updateUser(userId, {
        profileImageUrl: objectPath,
      });

      // In development, also return the public URL for immediate display
      const response: any = {
        objectPath: objectPath,
        user: updatedUser,
      };
      
      if (process.env.NODE_ENV === 'development') {
        response.publicURL = resolvePublicImageUrl(objectPath);
        // Also update the user object's profileImageUrl for immediate display
        if (response.user) {
          response.user.profileImageUrl = response.publicURL;
        }
      }
      
      res.status(200).json(response);
    } catch (error) {
      console.error("Error setting profile picture:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/prompt-images", isAuthenticated, imageUploadLimiter, async (req, res) => {
    if (!req.body.imageUrl) {
      return res.status(400).json({ error: "imageUrl is required" });
    }

    // Gets the authenticated user id.
    const userId = (req.user as any)?.claims?.sub;

    try {
      let objectPath = req.body.imageUrl;
      
      // In development mode, handle local storage paths
      if (process.env.NODE_ENV === 'development') {
        // Store the canonical path for persistence
        const fileId = req.body.imageUrl.split('/').pop();
        objectPath = `/objects/uploads/${fileId}`;
      } else {
        const objectStorageService = new ObjectStorageService();
        objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
          req.body.imageUrl,
          {
            owner: userId,
            // Prompt images should be public so they can be viewed by other users
            visibility: "public",
          },
        );
      }

      // In development, also return the public URL for immediate display
      const response: any = {
        objectPath: objectPath,
      };
      
      if (process.env.NODE_ENV === 'development') {
        response.publicURL = resolvePublicImageUrl(objectPath);
      }
      
      res.status(200).json(response);
    } catch (error) {
      console.error("Error setting prompt image ACL:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Prompt routes
  // Get unique tags and models for dropdowns
  app.get('/api/prompts/options', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const currentUser = await storage.getUser(userId);
      const showNsfw = currentUser?.showNsfw ?? true;
      
      const allPrompts = await storage.getPrompts({ showNsfw });
      
      // Extract unique values for all array and single fields
      const tagsSet = new Set<string>();
      const modelsSet = new Set<string>();
      const categoriesSet = new Set<string>();
      const promptTypesSet = new Set<string>();
      const promptStylesSet = new Set<string>();
      const intendedGeneratorsSet = new Set<string>();
      
      allPrompts.forEach((prompt: any) => {
        // Handle existing tags and models arrays
        if (prompt.tags) {
          prompt.tags.forEach((tag: string) => tagsSet.add(tag));
        }
        if (prompt.recommendedModels) {
          prompt.recommendedModels.forEach((model: string) => modelsSet.add(model));
        }
        
        // Handle existing single fields (for backward compatibility)
        if (prompt.category) categoriesSet.add(prompt.category);
        if (prompt.promptType) promptTypesSet.add(prompt.promptType);
        if (prompt.promptStyle) promptStylesSet.add(prompt.promptStyle);
        if (prompt.intendedGenerator) intendedGeneratorsSet.add(prompt.intendedGenerator);
        
        // Handle new array fields (when they exist)
        if (prompt.categories) {
          prompt.categories.forEach((category: string) => categoriesSet.add(category));
        }
        if (prompt.promptTypes) {
          prompt.promptTypes.forEach((type: string) => promptTypesSet.add(type));
        }
        if (prompt.promptStyles) {
          prompt.promptStyles.forEach((style: string) => promptStylesSet.add(style));
        }
        if (prompt.intendedGenerators) {
          prompt.intendedGenerators.forEach((generator: string) => intendedGeneratorsSet.add(generator));
        }
      });
      
      // Also fetch collections for the dropdown
      const collections = await storage.getCollections({ 
        userId: userId,
        isPublic: true 
      });
      
      const tags = Array.from(tagsSet).sort();
      const models = Array.from(modelsSet).sort();
      const categories = Array.from(categoriesSet).sort();
      const promptTypes = Array.from(promptTypesSet).sort();
      const promptStyles = Array.from(promptStylesSet).sort();
      const intendedGenerators = Array.from(intendedGeneratorsSet).sort();
      
      res.json({ 
        tags, 
        models, 
        categories, 
        promptTypes, 
        promptStyles, 
        intendedGenerators,
        collections: collections.map(c => ({ id: c.id, name: c.name })) 
      });
    } catch (error) {
      console.error('Error fetching prompt options:', error);
      res.status(500).json({ message: 'Failed to fetch options' });
    }
  });

  app.get('/api/prompts', searchLimiter, async (req: any, res) => {
    try {
      const {
        userId,
        isPublic,
        isFeatured,
        category,
        type,
        style,
        generator,
        model,
        collection,
        status,
        statusNotEqual,
        tags,
        search,
        sortBy,
        limit,
        offset = "0",
        subCommunityId,
        communityId
      } = req.query;

      // Get the current user's NSFW preference if authenticated
      let showNsfw = true; // Default to showing all content
      if (req.user?.claims?.sub) {
        const currentUser = await storage.getUser(req.user.claims.sub);
        showNsfw = currentUser?.showNsfw ?? true;
      }

      const options: any = {
        userId: userId as string,
        isPublic: isPublic === "true" ? true : isPublic === "false" ? false : undefined,
        isFeatured: isFeatured === "true",
        status: status as string,
        statusNotEqual: statusNotEqual as string,
        tags: tags ? (tags as string).split(",") : undefined,
        search: search as string,
        sortBy: sortBy as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: parseInt(offset as string),
        showNsfw: showNsfw,
        subCommunityId: subCommunityId as string,
        communityId: communityId as string, // For filtering by shared community
        authenticatedUserId: req.user?.claims?.sub, // Pass the authenticated user's ID for access control
      };
      
      // Handle multi-select filters (arrays)
      if (category) {
        options.categories = (category as string).split(",");
      }
      if (type) {
        options.promptTypes = (type as string).split(",");
      }
      if (style) {
        options.promptStyles = (style as string).split(",");
      }
      if (generator) {
        options.intendedGenerators = (generator as string).split(",");
      }
      if (model) {
        options.recommendedModels = (model as string).split(",");
      }
      if (collection) {
        options.collectionIds = (collection as string).split(",");
      }

      const prompts = await storage.getPrompts(options);
      
      // In development, normalize image URLs for display
      if (process.env.NODE_ENV === 'development' && prompts) {
        const normalizedPrompts = prompts.map(prompt => ({
          ...prompt,
          imageUrls: prompt.imageUrls?.map(url => resolvePublicImageUrl(url))
        }));
        res.json(normalizedPrompts);
      } else {
        res.json(prompts);
      }
    } catch (error) {
      console.error("Error fetching prompts:", error);
      res.status(500).json({ message: "Failed to fetch prompts" });
    }
  });

  app.get('/api/prompts/:id', async (req, res) => {
    try {
      const prompt = await storage.getPromptWithUser(req.params.id, req.user?.id);
      if (!prompt) {
        return res.status(404).json({ message: "Prompt not found" });
      }
      
      // Add compatibility fields for frontend components that expect different field names
      const compatiblePrompt = {
        ...prompt,
        // Add fields expected by PromptSaveDialog and other components
        positive_prompt: prompt.promptContent,
        negative_prompt: prompt.negativePrompt,
        folder_id: prompt.collectionId,
        visibility: prompt.isPublic ? 'public' : 'private',
        is_favorite: false,
        template_used: prompt.promptStyle,
        example_images: prompt.exampleImagesUrl,
        category_id: prompt.category
      };
      
      // In development, normalize image URLs for display
      if (process.env.NODE_ENV === 'development') {
        compatiblePrompt.imageUrls = prompt.imageUrls?.map(url => resolvePublicImageUrl(url));
        compatiblePrompt.exampleImagesUrl = prompt.exampleImagesUrl?.map(url => resolvePublicImageUrl(url));
        compatiblePrompt.example_images = compatiblePrompt.exampleImagesUrl;
      }
      
      res.json(compatiblePrompt);
    } catch (error) {
      console.error("Error fetching prompt:", error);
      res.status(500).json({ message: "Failed to fetch prompt" });
    }
  });

  app.post('/api/prompts', isAuthenticated, promptCreationLimiter, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      
      // Handle empty collectionId by converting to null
      const requestBody = { ...req.body, userId };
      if (requestBody.collectionId === "" || requestBody.collectionId === undefined) {
        requestBody.collectionId = null;
      }
      
      // Handle sub-community and visibility
      if (requestBody.subCommunityId) {
        // Check if this is a regular community (not a sub-community)
        const community = await storage.getCommunity(requestBody.subCommunityId);
        if (!community) {
          return res.status(404).json({ message: "Community not found" });
        }
        
        // If it's not the global community (parentCommunityId = null means global)
        // then it's a private community and user must be a member
        if (community.parentCommunityId !== null) {
          // For private communities, check if user is a member
          const isMember = await storage.isCommunityMember(userId, requestBody.subCommunityId);
          const isAdmin = await storage.isSubCommunityAdmin(userId, requestBody.subCommunityId);
          const user = await storage.getUser(userId);
          const isPrivileged = user?.role === 'super_admin' || user?.role === 'global_admin' || user?.role === 'developer';
          
          if (!isMember && !isAdmin && !isPrivileged) {
            return res.status(403).json({ message: "Must be a member of the community to create prompts for it" });
          }
        }
        
        // Set default visibility for sub-community prompts
        if (!requestBody.subCommunityVisibility) {
          requestBody.subCommunityVisibility = 'private';
        }
        
        // Validate visibility value
        if (!['private', 'parent_community', 'public'].includes(requestBody.subCommunityVisibility)) {
          return res.status(400).json({ message: "Invalid visibility setting" });
        }
      }
      
      // Extract sharedCommunityIds before parsing
      const { sharedCommunityIds, ...promptDataToValidate } = requestBody;
      
      const promptData = insertPromptSchema.parse(promptDataToValidate);
      const prompt = await storage.createPrompt({ ...promptData, sharedCommunityIds });
      
      // Create activity for prompt creation
      if (prompt.isPublic) {
        await storage.createActivity({
          userId,
          actionType: "created_prompt",
          targetId: prompt.id,
          targetType: "prompt",
          metadata: { promptName: prompt.name }
        });
      }
      
      res.status(201).json(prompt);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid prompt data", errors: error.errors });
      }
      console.error("Error creating prompt:", error);
      res.status(500).json({ message: "Failed to create prompt" });
    }
  });

  // Compatibility endpoint to get saved prompts for the user
  app.get('/api/saved-prompts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const prompts = await storage.getPrompts({ userId });
      
      // Map to frontend expected format
      const mappedPrompts = prompts.map(prompt => ({
        ...prompt,
        positive_prompt: prompt.promptContent,
        negative_prompt: prompt.negativePrompt,
        folder_id: prompt.collectionId,
        visibility: prompt.isPublic ? 'public' : 'private',
        is_favorite: false,
        template_used: prompt.promptStyle,
        example_images: prompt.exampleImagesUrl
      }));
      
      res.json(mappedPrompts);
    } catch (error) {
      console.error("Error fetching saved prompts:", error);
      res.status(500).json({ message: "Failed to fetch saved prompts" });
    }
  });

  // Compatibility endpoint for saved-prompts (maps to prompts table)
  app.post('/api/saved-prompts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      
      // Map frontend field names to database schema
      const mappedData = {
        name: req.body.name,
        description: req.body.description,
        promptContent: req.body.positive_prompt || req.body.promptContent,
        negativePrompt: req.body.negative_prompt || req.body.negativePrompt,
        tags: req.body.tags || [],
        collectionId: req.body.folder_id || req.body.collectionId || null,
        isPublic: req.body.visibility === 'public' || req.body.isPublic || false,
        status: 'published',
        userId,
        category: req.body.category || req.body.category_id?.toString(),
        promptStyle: req.body.template_used || req.body.promptStyle,
        exampleImagesUrl: req.body.example_images || req.body.exampleImagesUrl || [],
        technicalParams: req.body.metadata || req.body.technicalParams || {}
      };
      
      const promptData = insertPromptSchema.parse(mappedData);
      const prompt = await storage.createPrompt(promptData);
      
      // Map response back to frontend expected format
      const response = {
        ...prompt,
        positive_prompt: prompt.promptContent,
        negative_prompt: prompt.negativePrompt,
        folder_id: prompt.collectionId,
        visibility: prompt.isPublic ? 'public' : 'private',
        is_favorite: false,
        template_used: prompt.promptStyle,
        example_images: prompt.exampleImagesUrl
      };
      
      res.status(201).json(response);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.errors);
        return res.status(400).json({ message: "Invalid prompt data", errors: error.errors });
      }
      console.error("Error creating saved prompt:", error);
      res.status(500).json({ message: "Failed to save prompt" });
    }
  });

  // Compatibility endpoint for updating saved prompts
  app.put('/api/prompts/user/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const promptId = req.params.id;
      
      const prompt = await storage.getPrompt(promptId);
      if (!prompt) {
        return res.status(404).json({ message: "Prompt not found" });
      }
      
      if (prompt.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to edit this prompt" });
      }
      
      // Map frontend field names to database schema
      const mappedData = {
        name: req.body.name,
        description: req.body.description,
        promptContent: req.body.positive_prompt || req.body.promptContent,
        negativePrompt: req.body.negative_prompt || req.body.negativePrompt,
        tags: req.body.tags || [],
        collectionId: req.body.folder_id || req.body.collectionId || null,
        isPublic: req.body.visibility === 'public' || req.body.isPublic || false,
        category: req.body.category || req.body.category_id?.toString(),
        promptStyle: req.body.template_used || req.body.promptStyle,
        exampleImagesUrl: req.body.example_images || req.body.exampleImagesUrl || [],
        technicalParams: req.body.metadata || req.body.technicalParams || {}
      };
      
      const promptData = insertPromptSchema.partial().parse(mappedData);
      const updatedPrompt = await storage.updatePrompt(promptId, promptData);
      
      // Map response back to frontend expected format
      const response = {
        ...updatedPrompt,
        positive_prompt: updatedPrompt.promptContent,
        negative_prompt: updatedPrompt.negativePrompt,
        folder_id: updatedPrompt.collectionId,
        visibility: updatedPrompt.isPublic ? 'public' : 'private',
        is_favorite: false,
        template_used: updatedPrompt.promptStyle,
        example_images: updatedPrompt.exampleImagesUrl
      };
      
      res.json(response);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.errors);
        return res.status(400).json({ message: "Invalid prompt data", errors: error.errors });
      }
      console.error("Error updating prompt:", error);
      res.status(500).json({ message: "Failed to update prompt" });
    }
  });

  app.put('/api/prompts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const prompt = await storage.getPrompt(req.params.id);
      
      if (!prompt) {
        return res.status(404).json({ message: "Prompt not found" });
      }
      
      if (prompt.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to edit this prompt" });
      }

      // Handle empty collectionId by converting to null
      const requestBody = { ...req.body };
      if (requestBody.collectionId === "" || requestBody.collectionId === undefined) {
        requestBody.collectionId = null;
      }

      // Extract sharedCommunityIds before parsing
      const { sharedCommunityIds, ...promptDataToValidate } = requestBody;

      const promptData = insertPromptSchema.partial().parse(promptDataToValidate);
      const updatedPrompt = await storage.updatePrompt(req.params.id, { ...promptData, sharedCommunityIds });
      res.json(updatedPrompt);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid prompt data", errors: error.errors });
      }
      console.error("Error updating prompt:", error);
      res.status(500).json({ message: "Failed to update prompt" });
    }
  });

  // Get related data counts for a prompt (likes, favorites, ratings)
  app.get('/api/prompts/:id/related-data', isAuthenticated, async (req: any, res) => {
    try {
      const relatedData = await storage.getPromptRelatedData(req.params.id);
      res.json(relatedData);
    } catch (error) {
      console.error("Error getting prompt related data:", error);
      res.status(500).json({ message: "Failed to get prompt related data" });
    }
  });

  app.delete('/api/prompts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const promptId = req.params.id;
      
      console.log("Delete prompt request:", { promptId, userId });
      
      const prompt = await storage.getPrompt(promptId);
      
      if (!prompt) {
        console.error("Delete failed - prompt not found:", promptId);
        return res.status(404).json({ message: "Prompt not found" });
      }
      
      console.log("Found prompt to delete:", { promptId: prompt.id, ownerId: prompt.userId, requesterId: userId });
      
      if (prompt.userId !== userId) {
        console.error("Delete failed - unauthorized:", { promptOwner: prompt.userId, requester: userId });
        return res.status(403).json({ message: "Not authorized to delete this prompt" });
      }

      await storage.deletePrompt(promptId);
      console.log("Prompt deleted successfully:", promptId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting prompt - full error:", error);
      console.error("Error details:", { 
        message: (error as any)?.message, 
        stack: (error as any)?.stack,
        promptId: req.params.id,
        userId: (req.user as any)?.claims?.sub 
      });
      res.status(500).json({ message: "Failed to delete prompt" });
    }
  });

  app.post('/api/prompts/:id/branch', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const branchedPrompt = await storage.branchPrompt(req.params.id, userId);
      
      // Get the original prompt to find the owner
      const originalPrompt = await storage.getPrompt(req.params.id);
      if (originalPrompt && originalPrompt.userId !== userId) {
        const brancher = await storage.getUser(userId);
        if (brancher) {
          await storage.createNotification({
            userId: originalPrompt.userId,
            type: "branch",
            message: `${brancher.username || brancher.firstName || 'Someone'} branched your prompt "${originalPrompt.name}"`,
            relatedUserId: userId,
            relatedPromptId: req.params.id,
            relatedListId: null,
            isRead: false,
            metadata: { promptName: originalPrompt.name, branchedPromptId: branchedPrompt.id }
          });
        }
      }
      
      res.status(201).json(branchedPrompt);
    } catch (error) {
      console.error("Error branching prompt:", error);
      res.status(500).json({ message: "Failed to branch prompt" });
    }
  });

  // Prompt History operations
  app.post('/api/prompt-history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const historyData = {
        ...req.body,
        userId
      };
      
      const saved = await storage.savePromptToHistory(historyData);
      res.json(saved);
    } catch (error) {
      console.error("Error saving prompt to history:", error);
      res.status(500).json({ message: "Failed to save prompt to history" });
    }
  });

  app.get('/api/prompt-history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const history = await storage.getPromptHistory(userId, { limit, offset });
      res.json(history);
    } catch (error) {
      console.error("Error fetching prompt history:", error);
      res.status(500).json({ message: "Failed to fetch prompt history" });
    }
  });

  app.get('/api/prompt-history/recent', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const history = await storage.getRecentPromptHistory(userId, limit);
      res.json(history);
    } catch (error) {
      console.error("Error fetching recent prompt history:", error);
      res.status(500).json({ message: "Failed to fetch recent prompt history" });
    }
  });

  app.delete('/api/prompt-history/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      await storage.deletePromptHistory(req.params.id, userId);
      res.json({ message: "Prompt history entry deleted" });
    } catch (error) {
      console.error("Error deleting prompt history:", error);
      res.status(500).json({ message: "Failed to delete prompt history entry" });
    }
  });

  app.delete('/api/prompt-history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      await storage.clearPromptHistory(userId);
      res.json({ message: "Prompt history cleared" });
    } catch (error) {
      console.error("Error clearing prompt history:", error);
      res.status(500).json({ message: "Failed to clear prompt history" });
    }
  });

  app.patch('/api/prompt-history/:id/mark-saved', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      await storage.markPromptAsSaved(req.params.id, userId);
      res.json({ message: "Prompt marked as saved" });
    } catch (error) {
      console.error("Error marking prompt as saved:", error);
      res.status(500).json({ message: "Failed to mark prompt as saved" });
    }
  });

  app.post('/api/prompts/bulk-import', isAuthenticated, strictApiLimiter, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const { prompts } = req.body;

      if (!Array.isArray(prompts) || prompts.length === 0) {
        return res.status(400).json({ message: "Invalid prompts array" });
      }

      const results = {
        total: prompts.length,
        success: 0,
        failed: 0,
        errors: [] as Array<{ row: number; error: string; data: any }>
      };

      // Process prompts in batches to avoid overwhelming the database
      const batchSize = 50;
      for (let i = 0; i < prompts.length; i += batchSize) {
        const batch = prompts.slice(i, i + batchSize);
        
        for (let j = 0; j < batch.length; j++) {
          const rowIndex = i + j + 1;
          const promptData = batch[j];
          
          try {
            // Validate prompt data
            const validatedPrompt = insertPromptSchema.parse({
              ...promptData,
              userId,
              tags: Array.isArray(promptData.tags) ? promptData.tags : [],
              tagsNormalized: Array.isArray(promptData.tags) 
                ? promptData.tags.map((tag: string) => tag.toLowerCase().trim())
                : [],
              // Handle new array fields
              categories: Array.isArray(promptData.categories) ? promptData.categories : [],
              promptTypes: Array.isArray(promptData.promptTypes) ? promptData.promptTypes : [],
              promptStyles: Array.isArray(promptData.promptStyles) ? promptData.promptStyles : [],
              intendedGenerators: Array.isArray(promptData.intendedGenerators) ? promptData.intendedGenerators : [],
              collectionIds: Array.isArray(promptData.collectionIds) ? promptData.collectionIds : [],
              // Handle images - map to exampleImagesUrl field
              exampleImagesUrl: Array.isArray(promptData.images) 
                ? promptData.images.filter((img: any) => typeof img === 'string' && img.trim())
                : [],
              status: promptData.status || "draft",
              isPublic: promptData.isPublic ?? false,
              version: 1,
            });

            // Create the prompt
            await storage.createPrompt(validatedPrompt);
            results.success++;
          } catch (error) {
            results.failed++;
            const errorMessage = error instanceof z.ZodError 
              ? error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
              : error instanceof Error 
                ? error.message 
                : "Unknown error";
            
            results.errors.push({
              row: rowIndex,
              error: errorMessage,
              data: promptData
            });
          }
        }
      }

      res.json(results);
    } catch (error) {
      console.error("Error during bulk import:", error);
      res.status(500).json({ message: "Failed to process bulk import" });
    }
  });

  // Google Docs/Sheets import endpoint
  app.post('/api/prompts/google-import', isAuthenticated, async (req: any, res) => {
    try {
      const { url, type } = req.body;
      
      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }

      // Extract document/spreadsheet ID from the URL
      let docId: string | null = null;
      let exportUrl: string = "";

      if (type === "docs" || url.includes("docs.google.com/document")) {
        // Extract Google Docs ID
        const docMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (!docMatch) {
          return res.status(400).json({ message: "Invalid Google Docs URL" });
        }
        docId = docMatch[1];
        // Export as plain text
        exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
      } else if (type === "sheets" || url.includes("docs.google.com/spreadsheets")) {
        // Extract Google Sheets ID
        const sheetMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (!sheetMatch) {
          return res.status(400).json({ message: "Invalid Google Sheets URL" });
        }
        docId = sheetMatch[1];
        // Export as CSV
        exportUrl = `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv`;
      } else {
        return res.status(400).json({ message: "Unsupported Google document type" });
      }

      // Fetch the document content
      const response = await fetch(exportUrl);
      
      if (!response.ok) {
        if (response.status === 404) {
          return res.status(404).json({ message: "Document not found. Make sure the document is publicly accessible." });
        }
        return res.status(500).json({ message: "Failed to fetch document content" });
      }

      const content = await response.text();
      
      // Return the content for client-side parsing
      res.json({ 
        content,
        type: type === "sheets" || url.includes("spreadsheets") ? "csv" : "txt",
        docId 
      });
      
    } catch (error) {
      console.error("Error importing from Google:", error);
      res.status(500).json({ message: "Failed to import from Google document" });
    }
  });

  // Bulk operations endpoint
  app.post('/api/prompts/bulk-operations', isAuthenticated, strictApiLimiter, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      
      // Validate request body
      const validatedData = bulkOperationSchema.parse(req.body);
      const { promptIds, operation, updateData } = validatedData;

      // Initialize result tracking
      const result = {
        total: promptIds.length,
        success: 0,
        failed: 0,
        errors: [] as Array<{ promptId: string; error: string }>,
        results: [] as Array<{ promptId: string; success: boolean; error?: string }>
      };

      // Verify user owns all prompts before making any changes
      const ownedPrompts = await storage.getPrompts({ userId, promptIds });
      const ownedPromptIds = new Set(ownedPrompts.map((p: any) => p.id));
      
      const unauthorizedPrompts = promptIds.filter(id => !ownedPromptIds.has(id));
      if (unauthorizedPrompts.length > 0) {
        return res.status(403).json({ 
          message: "Not authorized to modify some prompts",
          unauthorizedPrompts 
        });
      }

      // Process each prompt
      for (const promptId of promptIds) {
        try {
          let success = false;
          
          switch (operation) {
            case "update":
              if (updateData) {
                await storage.updatePrompt(promptId, updateData);
                success = true;
              }
              break;
              
            case "delete":
              await storage.deletePrompt(promptId);
              success = true;
              break;
              
            case "archive":
              await storage.updatePrompt(promptId, { status: "archived" });
              success = true;
              break;
              
            case "unarchive":
              await storage.updatePrompt(promptId, { status: "published" });
              success = true;
              break;
              
            case "publish":
              await storage.updatePrompt(promptId, { status: "published" });
              success = true;
              break;
              
            case "draft":
              await storage.updatePrompt(promptId, { status: "draft" });
              success = true;
              break;
              
            case "makePublic":
              await storage.updatePrompt(promptId, { isPublic: true });
              success = true;
              break;
              
            case "makePrivate":
              await storage.updatePrompt(promptId, { isPublic: false });
              success = true;
              break;
              
            case "like":
              await storage.toggleLike(userId, promptId);
              success = true;
              break;
              
            case "unlike":
              // Force unlike by checking current state
              const isCurrentlyLiked = await storage.checkIfLiked(userId, promptId);
              if (isCurrentlyLiked) {
                await storage.toggleLike(userId, promptId);
              }
              success = true;
              break;
              
            case "favorite":
              await storage.toggleFavorite(userId, promptId);
              success = true;
              break;
              
            case "unfavorite":
              // Force unfavorite by checking current state
              const isCurrentlyFavorited = await storage.checkIfFavorited(userId, promptId);
              if (isCurrentlyFavorited) {
                await storage.toggleFavorite(userId, promptId);
              }
              success = true;
              break;
              
            case "export":
              // Export is handled client-side, just mark as success
              success = true;
              break;
              
            default:
              throw new Error(`Unsupported operation: ${operation}`);
          }
          
          if (success) {
            result.success++;
            result.results.push({ promptId, success: true });
          }
          
        } catch (error) {
          result.failed++;
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          result.errors.push({ promptId, error: errorMessage });
          result.results.push({ promptId, success: false, error: errorMessage });
        }
      }

      res.json(result);
    } catch (error) {
      console.error("Error during bulk operation:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid bulk operation data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to process bulk operation" });
    }
  });

  // Bulk add prompts to collection endpoint
  app.post('/api/prompts/bulk-add-to-collection', isAuthenticated, strictApiLimiter, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const { promptIds, collectionId } = req.body;
      
      if (!Array.isArray(promptIds) || promptIds.length === 0) {
        return res.status(400).json({ message: "promptIds must be a non-empty array" });
      }
      
      if (!collectionId) {
        return res.status(400).json({ message: "collectionId is required" });
      }
      
      // Verify user owns the collection
      const collection = await storage.getCollection(collectionId);
      if (!collection) {
        return res.status(404).json({ message: "Collection not found" });
      }
      if (collection.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to modify this collection" });
      }
      
      // Verify user owns all prompts
      const ownedPrompts = await storage.getPrompts({ userId, promptIds });
      const ownedPromptIds = new Set(ownedPrompts.map((p: any) => p.id));
      
      const unauthorizedPrompts = promptIds.filter((id: string) => !ownedPromptIds.has(id));
      if (unauthorizedPrompts.length > 0) {
        return res.status(403).json({ 
          message: "Not authorized to modify some prompts",
          unauthorizedPrompts 
        });
      }
      
      // Add each prompt to the collection
      let successCount = 0;
      for (const promptId of promptIds) {
        try {
          await storage.updatePrompt(promptId, { collectionId });
          successCount++;
        } catch (error) {
          console.error(`Error adding prompt ${promptId} to collection:`, error);
        }
      }
      
      res.json({ 
        message: `Successfully added ${successCount} prompts to collection`,
        success: successCount,
        total: promptIds.length
      });
    } catch (error) {
      console.error("Error in bulk add to collection:", error);
      res.status(500).json({ message: "Failed to add prompts to collection" });
    }
  });

  // Community routes
  app.post('/api/prompts/:id/like', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims?.sub || (req.user as any).id;
      const promptId = req.params.id;
      
      // Validate input
      if (!userId) {
        return res.status(401).json({ 
          error: "UNAUTHORIZED",
          message: "Authentication required" 
        });
      }
      
      if (!promptId || promptId.length !== 10) {
        return res.status(400).json({ 
          error: "INVALID_PROMPT_ID",
          message: "Invalid prompt ID format" 
        });
      }
      
      console.log("Like endpoint called - userId:", userId, "promptId:", promptId);
      
      // Toggle the like
      const isLiked = await storage.toggleLike(userId, promptId);
      console.log("Like toggle result:", isLiked);
      
      // Create activity for liking (only when liking, not unliking)
      // Do this synchronously but with error handling to not fail the like
      if (isLiked) {
        try {
          const prompt = await storage.getPrompt(promptId);
          if (prompt && prompt.isPublic) {
            // Create activity
            await storage.createActivity({
              userId,
              actionType: "liked_prompt",
              targetId: promptId,
              targetType: "prompt",
              metadata: { promptName: prompt.name }
            });
            
            // Create notification for prompt owner (if not liking own prompt)
            if (prompt.userId && prompt.userId !== userId) {
              const liker = await storage.getUser(userId);
              if (liker) {
                try {
                  const notification = await storage.createNotification({
                    userId: prompt.userId,
                    type: "like",
                    message: `${liker.username || liker.firstName || 'Someone'} liked your prompt "${prompt.name}"`,
                    relatedUserId: userId,
                    relatedPromptId: promptId,
                    relatedListId: null,
                    isRead: false,
                    metadata: { promptName: prompt.name }
                  });
                  console.log("Created like notification:", notification.id);
                } catch (notifError) {
                  console.error("Error creating like notification:", notifError);
                  console.error("Notification data:", {
                    userId: prompt.userId,
                    type: "like",
                    relatedUserId: userId,
                    relatedPromptId: promptId
                  });
                }
              }
            }
          }
        } catch (activityError) {
          // Log but don't fail the like operation
          console.error("Error creating activity:", activityError);
        }
      }
      
      // Return success immediately
      res.json({ 
        liked: isLiked,
        promptId: promptId 
      });
      
    } catch (error: any) {
      console.error("Error in like endpoint:", error);
      
      // Handle specific error cases
      if (error.message === "Prompt not found") {
        return res.status(404).json({ 
          error: "PROMPT_NOT_FOUND",
          message: "The prompt you're trying to like doesn't exist" 
        });
      }
      
      if (error.message?.includes("concurrent update")) {
        return res.status(409).json({ 
          error: "CONCURRENT_UPDATE",
          message: "Another operation is in progress. Please try again.",
          retryable: true 
        });
      }
      
      if (error.message?.includes("conflict")) {
        return res.status(409).json({ 
          error: "LIKE_CONFLICT",
          message: "Like operation conflict. Please refresh and try again.",
          retryable: true 
        });
      }
      
      // Database connection errors
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        return res.status(503).json({ 
          error: "SERVICE_UNAVAILABLE",
          message: "Database temporarily unavailable. Please try again later.",
          retryable: true 
        });
      }
      
      // Generic server error
      res.status(500).json({ 
        error: "INTERNAL_ERROR",
        message: "Failed to process like operation. Please try again.",
        retryable: true,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  app.post('/api/prompts/:id/favorite', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const promptId = req.params.id;
      const isFavorited = await storage.toggleFavorite(userId, promptId);
      
      // Create activity and notification for favoriting (only when favoriting, not unfavoriting)
      if (isFavorited) {
        try {
          const prompt = await storage.getPrompt(promptId);
          if (prompt && prompt.isPublic) {
            // Create activity
            await storage.createActivity({
              userId,
              actionType: "favorited_prompt",
              targetId: promptId,
              targetType: "prompt",
              metadata: { promptName: prompt.name }
            });
            
            // Create notification for prompt owner (if not bookmarking own prompt)
            if (prompt.userId && prompt.userId !== userId) {
              const bookmarker = await storage.getUser(userId);
              if (bookmarker) {
                try {
                  const notification = await storage.createNotification({
                    userId: prompt.userId,
                    type: "bookmark",
                    message: `${bookmarker.username || bookmarker.firstName || 'Someone'} bookmarked your prompt "${prompt.name}"`,
                    relatedUserId: userId,
                    relatedPromptId: promptId,
                    relatedListId: null,
                    isRead: false,
                    metadata: { promptName: prompt.name }
                  });
                  console.log("Created bookmark notification:", notification.id);
                } catch (notifError) {
                  console.error("Error creating bookmark notification:", notifError);
                  console.error("Notification data:", {
                    userId: prompt.userId,
                    type: "bookmark",
                    relatedUserId: userId,
                    relatedPromptId: promptId
                  });
                }
              }
            }
          }
        } catch (error) {
          console.error("Error creating bookmark activity:", error);
        }
      }
      
      res.json({ favorited: isFavorited });
    } catch (error) {
      console.error("Error toggling favorite:", error);
      res.status(500).json({ message: "Failed to toggle favorite" });
    }
  });

  // Admin route to cleanup duplicate likes (super admin only)
  app.post('/api/admin/cleanup-likes', requireSuperAdmin, async (req: any, res) => {
    try {
      const result = await storage.cleanupDuplicateLikes();
      res.json({
        message: `Cleanup completed successfully`,
        duplicatesRemoved: result.duplicatesRemoved,
        promptsFixed: result.promptsFixed
      });
    } catch (error) {
      console.error("Error cleaning up likes:", error);
      res.status(500).json({ message: "Failed to cleanup likes" });
    }
  });

  // Toggle featured status (super admin only)
  app.post('/api/prompts/:id/featured', requireSuperAdmin, async (req: any, res) => {
    try {
      const prompt = await storage.getPrompt(req.params.id);
      if (!prompt) {
        return res.status(404).json({ message: "Prompt not found" });
      }
      
      const newFeaturedStatus = !prompt.isFeatured;
      await storage.updatePrompt(req.params.id, { isFeatured: newFeaturedStatus });
      
      // Create notification when prompt is featured (not when unfeatured)
      if (newFeaturedStatus && prompt.userId) {
        try {
          const adminUserId = (req.user as any).claims.sub;
          const notification = await storage.createNotification({
            userId: prompt.userId,
            type: "approval", // Using 'approval' type for featured since there's no 'featured' type
            message: `Congratulations! Your prompt "${prompt.name}" has been featured!`,
            relatedUserId: adminUserId,
            relatedPromptId: req.params.id,
            relatedListId: null,
            isRead: false,
            metadata: { promptName: prompt.name, actionType: 'featured' }
          });
          console.log("Created featured notification:", notification.id);
        } catch (notifError) {
          console.error("Error creating featured notification:", notifError);
          console.error("Notification data:", {
            userId: prompt.userId,
            type: "approval",
            relatedUserId: adminUserId,
            relatedPromptId: req.params.id
          });
        }
      }
      
      res.json({ featured: newFeaturedStatus });
    } catch (error) {
      console.error("Error toggling featured status:", error);
      res.status(500).json({ message: "Failed to toggle featured status" });
    }
  });

  // Toggle hidden status (super admin only)
  app.post('/api/prompts/:id/hidden', requireSuperAdmin, async (req: any, res) => {
    try {
      const prompt = await storage.getPrompt(req.params.id);
      if (!prompt) {
        return res.status(404).json({ message: "Prompt not found" });
      }
      
      const newHiddenStatus = !prompt.isHidden;
      await storage.updatePrompt(req.params.id, { isHidden: newHiddenStatus });
      res.json({ hidden: newHiddenStatus });
    } catch (error) {
      console.error("Error toggling hidden status:", error);
      res.status(500).json({ message: "Failed to toggle hidden status" });
    }
  });

  app.get('/api/user/favorites', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const favorites = await storage.getUserFavorites(userId);
      
      // Get the full prompt details for each favorite
      const favoritePrompts = await Promise.all(
        favorites.map(async (favorite) => {
          const prompt = await storage.getPrompt(favorite.promptId);
          return prompt;
        })
      );
      
      // Filter out any null prompts (in case prompts were deleted)
      res.json(favoritePrompts.filter(prompt => prompt !== undefined));
    } catch (error) {
      console.error("Error fetching user favorites:", error);
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });

  app.get('/api/user/likes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const likes = await storage.getUserLikes(userId);
      
      // Get the full prompt details for each liked prompt
      const likedPrompts = await Promise.all(
        likes.map(async (like) => {
          const prompt = await storage.getPrompt(like.promptId);
          return prompt;
        })
      );
      
      // Filter out any null prompts (in case prompts were deleted)
      res.json(likedPrompts.filter(prompt => prompt !== undefined));
    } catch (error) {
      console.error("Error fetching user likes:", error);
      res.status(500).json({ message: "Failed to fetch likes" });
    }
  });

  app.get('/api/prompts/branched', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      
      // Get the current user's NSFW preference
      const currentUser = await storage.getUser(userId);
      const showNsfw = currentUser?.showNsfw ?? true;
      
      // Get all prompts where branchOf is not null and userId matches
      const branchedPrompts = await storage.getPrompts({
        userId: userId,
        showNsfw: showNsfw,
      });
      
      // Filter to only include prompts that have a branchOf value
      const actualBranchedPrompts = branchedPrompts.filter(prompt => prompt.branchOf !== null);
      
      res.json(actualBranchedPrompts);
    } catch (error) {
      console.error("Error fetching branched prompts:", error);
      res.status(500).json({ message: "Failed to fetch branched prompts" });
    }
  });

  app.post('/api/prompts/:id/rate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const ratingData = insertPromptRatingSchema.parse({
        ...req.body,
        userId,
        promptId: req.params.id,
      });
      const rating = await storage.ratePrompt(ratingData);
      res.json(rating);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid rating data", errors: error.errors });
      }
      console.error("Error rating prompt:", error);
      res.status(500).json({ message: "Failed to rate prompt" });
    }
  });

  // Archive/unarchive prompt
  app.post('/api/prompts/:id/archive', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const prompt = await storage.getPrompt(req.params.id);
      
      if (!prompt || prompt.userId !== userId) {
        return res.status(404).json({ message: "Prompt not found or not authorized" });
      }

      if (prompt.status === 'archived') {
        // Unarchiving: restore to published status (keeping it private)
        const updatedPrompt = await storage.updatePrompt(req.params.id, { status: 'published' });
        res.json({ archived: false, status: 'published' });
      } else {
        // Archiving: set to archived, make private, and remove all bookmarks
        // First remove all bookmarks/favorites for this prompt
        await storage.removeAllFavorites(req.params.id);
        
        // Then update the prompt to be archived and private
        const updatedPrompt = await storage.updatePrompt(req.params.id, { 
          status: 'archived',
          isPublic: false 
        });
        
        res.json({ 
          archived: true, 
          status: 'archived',
          madePrivate: prompt.isPublic === true,
          removedBookmarks: true
        });
      }
    } catch (error) {
      console.error("Error toggling archive:", error);
      res.status(500).json({ message: "Failed to toggle archive" });
    }
  });

  // Toggle public/private status with community selection
  app.post('/api/prompts/:id/visibility', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const { communities = [] } = req.body; // Array of community IDs, 'global' means public
      const prompt = await storage.getPrompt(req.params.id);
      
      if (!prompt || prompt.userId !== userId) {
        return res.status(404).json({ message: "Prompt not found or not authorized" });
      }

      // Check if 'global' is in the communities array (meaning public)
      const isPublic = communities.includes('global');
      
      // Filter out 'global' to get actual community IDs
      const communityIds = communities.filter((id: string) => id !== 'global');
      
      // Update prompt visibility
      const updatedPrompt = await storage.updatePrompt(req.params.id, { isPublic });
      
      // Update community sharing
      await storage.updatePromptCommunitySharing(req.params.id, communityIds, userId);
      
      res.json({ isPublic, communities });
    } catch (error) {
      console.error("Error toggling visibility:", error);
      res.status(500).json({ message: "Failed to toggle visibility" });
    }
  });
  
  // Get communities a prompt is shared with
  app.get('/api/prompts/:id/communities', async (req: any, res) => {
    try {
      const communityIds = await storage.getPromptSharedCommunities(req.params.id);
      res.json(communityIds);
    } catch (error) {
      console.error("Error fetching prompt communities:", error);
      res.status(500).json({ message: "Failed to fetch prompt communities" });
    }
  });

  // Contribute images to a prompt (community contribution feature)
  app.post('/api/prompts/:id/contribute-images', isAuthenticated, async (req: any, res) => {
    const contributorId = (req.user as any).claims.sub;
    
    try {
      const { imageUrls } = req.body;
      
      // Validate imageUrls
      if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
        return res.status(400).json({ message: "No images provided" });
      }
      
      if (imageUrls.length > 5) {
        return res.status(400).json({ message: "Cannot contribute more than 5 images at once" });
      }
      
      // Contribute images to the prompt
      const updatedPrompt = await storage.contributeImagesToPrompt(
        req.params.id, 
        imageUrls, 
        contributorId
      );
      
      res.json({ 
        success: true, 
        prompt: updatedPrompt,
        message: `Successfully contributed ${imageUrls.length} image(s)`
      });
    } catch (error) {
      console.error("Error contributing images:", error);
      console.error("Error details:", {
        promptId: req.params.id,
        imageUrls: req.body.imageUrls,
        contributorId: contributorId,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined
      });
      
      if (error instanceof Error) {
        // Handle specific error messages from storage
        if (error.message.includes("not found")) {
          return res.status(404).json({ message: error.message });
        }
        if (error.message.includes("private") || error.message.includes("own prompts")) {
          return res.status(403).json({ message: error.message });
        }
        if (error.message.includes("more than")) {
          return res.status(400).json({ message: error.message });
        }
        // Return the actual error message for better debugging
        return res.status(500).json({ message: error.message });
      }
      
      res.status(500).json({ message: "Failed to contribute images" });
    }
  });

  // Project routes
  app.get('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const projects = await storage.getProjects(userId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.post('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const projectData = insertProjectSchema.parse({ ...req.body, ownerId: userId });
      const project = await storage.createProject(projectData);
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  // Collection routes
  app.get('/api/collections', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const { communityId, type, isPublic, search, limit, offset } = req.query;
      
      const options: any = {};
      if (isPublic === 'true') {
        // For public collections, don't filter by userId
        options.isPublic = true;
      } else if (!communityId && !type) {
        // Default: get user's personal collections
        options.userId = userId;
      }
      if (communityId) options.communityId = communityId as string;
      if (type) options.type = type as string;
      if (search) options.search = search as string;
      if (limit) options.limit = parseInt(limit as string, 10);
      if (offset) options.offset = parseInt(offset as string, 10);
      
      const collections = await storage.getCollections(options);
      
      // Add prompt count and user info to each collection
      const collectionsWithCounts = await Promise.all(
        collections.map(async (collection) => {
          // Get user's NSFW preference for accurate count
          let showNsfw = true;
          if (req.user?.claims?.sub) {
            const currentUser = await storage.getUser(req.user.claims.sub);
            showNsfw = currentUser?.showNsfw ?? true;
          }
          const prompts = await storage.getPrompts({ collectionId: collection.id, showNsfw });
          
          // Extract example images from prompts (max 4 images)
          const exampleImages: string[] = [];
          for (const prompt of prompts.slice(0, 10)) { // Check first 10 prompts
            if (prompt.exampleImagesUrl && Array.isArray(prompt.exampleImagesUrl)) {
              exampleImages.push(...prompt.exampleImagesUrl);
              if (exampleImages.length >= 4) break;
            }
          }
          
          // Get user info if this is a public collection
          let user = null;
          if (collection.userId) {
            user = await storage.getUser(collection.userId);
          }
          
          return {
            ...collection,
            promptCount: prompts.length,
            exampleImages: exampleImages.slice(0, 4), // Ensure max 4 images
            user: user ? {
              id: user.id,
              username: user.username,
              firstName: user.firstName,
              lastName: user.lastName,
              profileImageUrl: user.profileImageUrl
            } : null
          };
        })
      );
      
      res.json(collectionsWithCounts);
    } catch (error) {
      console.error("Error fetching collections:", error);
      res.status(500).json({ message: "Failed to fetch collections" });
    }
  });

  // Get a single collection by ID
  app.get('/api/collections/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const collection = await storage.getCollection(req.params.id);
      
      if (!collection) {
        return res.status(404).json({ message: "Collection not found" });
      }
      
      // Check if user has access to this collection
      const isOwner = collection.userId === userId;
      const isPublic = collection.isPublic;
      
      if (!isOwner && !isPublic) {
        return res.status(403).json({ message: "Not authorized to view this collection" });
      }
      
      res.json(collection);
    } catch (error) {
      console.error("Error fetching collection:", error);
      res.status(500).json({ message: "Failed to fetch collection" });
    }
  });

  // Get all prompts in a collection
  app.get('/api/collections/:id/prompts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const collectionId = req.params.id;
      
      // First check if collection exists and user has access
      const collection = await storage.getCollection(collectionId);
      
      if (!collection) {
        return res.status(404).json({ message: "Collection not found" });
      }
      
      // Check if user has access to this collection
      const isOwner = collection.userId === userId;
      const isPublic = collection.isPublic;
      
      if (!isOwner && !isPublic) {
        return res.status(403).json({ message: "Not authorized to view this collection" });
      }
      
      // Get the current user's NSFW preference if authenticated
      let showNsfw = true;
      if (req.user?.claims?.sub) {
        const currentUser = await storage.getUser(req.user.claims.sub);
        showNsfw = currentUser?.showNsfw ?? true;
      }
      
      // Fetch prompts with the collectionId filter
      const prompts = await storage.getPrompts({ collectionId, showNsfw });
      res.json(prompts);
    } catch (error) {
      console.error("Error fetching collection prompts:", error);
      res.status(500).json({ message: "Failed to fetch collection prompts" });
    }
  });

  app.post('/api/collections', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const { sharedCommunityIds, ...collectionDataToValidate } = req.body;
      const collectionData = insertCollectionSchema.parse({ ...collectionDataToValidate, userId });
      const collection = await storage.createCollection({ ...collectionData, sharedCommunityIds });
      
      // Create activity for collection creation
      await storage.createActivity({
        userId,
        actionType: "created_collection",
        targetId: collection.id,
        targetType: "collection",
        metadata: { collectionName: collection.name }
      });
      
      res.status(201).json(collection);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid collection data", errors: error.errors });
      }
      console.error("Error creating collection:", error);
      res.status(500).json({ message: "Failed to create collection" });
    }
  });

  app.put('/api/collections/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const { updatePrompts } = req.query;
      const collection = await storage.getCollection(req.params.id);
      
      if (!collection) {
        return res.status(404).json({ message: "Collection not found" });
      }
      
      // Check permissions
      const isSuperAdmin = (req.user as any).role === "super_admin";
      const isCommunityAdmin = (req.user as any).role === "community_admin";
      
      if (!isSuperAdmin && collection.userId !== userId && 
          !(isCommunityAdmin && collection.type === "community")) {
        return res.status(403).json({ message: "Not authorized to edit this collection" });
      }

      const { sharedCommunityIds, ...collectionDataToValidate } = req.body;
      const collectionData = insertCollectionSchema.partial().parse(collectionDataToValidate);
      
      // If updatePrompts is true and privacy is changing, update all prompts in the collection
      if (updatePrompts === 'true' && collectionData.isPublic !== undefined && collectionData.isPublic !== collection.isPublic) {
        const promptsInCollection = await storage.getPrompts({ collectionId: req.params.id });
        
        // Update each prompt's privacy to match the collection
        for (const prompt of promptsInCollection) {
          await storage.updatePrompt(prompt.id, { ...prompt, isPublic: collectionData.isPublic });
        }
      }
      
      const updatedCollection = await storage.updateCollection(req.params.id, { ...collectionData, sharedCommunityIds });
      res.json(updatedCollection);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid collection data", errors: error.errors });
      }
      console.error("Error updating collection:", error);
      res.status(500).json({ message: "Failed to update collection" });
    }
  });

  app.delete('/api/collections/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const { deletePrompts } = req.query;
      const collection = await storage.getCollection(req.params.id);
      
      if (!collection) {
        return res.status(404).json({ message: "Collection not found" });
      }
      
      // Check permissions
      const isSuperAdmin = (req.user as any).role === "super_admin";
      const isCommunityAdmin = (req.user as any).role === "community_admin";
      
      if (!isSuperAdmin && collection.userId !== userId && 
          !(isCommunityAdmin && collection.type === "community")) {
        return res.status(403).json({ message: "Not authorized to delete this collection" });
      }

      // Get prompts in this collection
      const promptsInCollection = await storage.getPrompts({ collectionId: req.params.id });
      
      if (deletePrompts === 'true') {
        // Delete all prompts in the collection first
        for (const prompt of promptsInCollection) {
          await storage.deletePrompt(prompt.id);
        }
      } else {
        // Remove collection reference from prompts (set collectionId to null)
        for (const prompt of promptsInCollection) {
          await storage.updatePrompt(prompt.id, { ...prompt, collectionId: null });
        }
      }

      await storage.deleteCollection(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting collection:", error);
      res.status(500).json({ message: "Failed to delete collection" });
    }
  });

  // Category routes
  app.get('/api/categories', async (req, res) => {
    try {
      const { userId, type, isActive } = req.query;
      const options: any = {};
      
      if (userId) options.userId = userId as string;
      if (type) options.type = type as string;
      if (isActive !== undefined) options.isActive = isActive === 'true';
      
      const categories = await storage.getCategories(options);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post('/api/categories', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const categoryData = insertCategorySchema.parse({ ...req.body, userId, type: 'user' });
      const category = await storage.createCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid category data", errors: error.errors });
      }
      console.error("Error creating category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  // Prompt type routes
  app.get('/api/prompt-types', async (req, res) => {
    try {
      const { userId, type, isActive } = req.query;
      const options: any = {};
      
      if (userId) options.userId = userId as string;
      if (type) options.type = type as string;
      if (isActive !== undefined) options.isActive = isActive === 'true';
      
      const promptTypes = await storage.getPromptTypes(options);
      res.json(promptTypes);
    } catch (error) {
      console.error("Error fetching prompt types:", error);
      res.status(500).json({ message: "Failed to fetch prompt types" });
    }
  });

  app.post('/api/prompt-types', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const promptTypeData = insertPromptTypeSchema.parse({ ...req.body, userId, type: 'user' });
      const promptType = await storage.createPromptType(promptTypeData);
      res.status(201).json(promptType);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid prompt type data", errors: error.errors });
      }
      console.error("Error creating prompt type:", error);
      res.status(500).json({ message: "Failed to create prompt type" });
    }
  });

  // Prompt style rule template routes (actual prompt templates from prompt_templates table)
  app.get('/api/prompt-stylerule-templates', async (req, res) => {
    try {
      const { userId, category, isDefault } = req.query;
      const options: any = {};
      
      if (userId) options.userId = userId as string;
      if (category) options.category = category as string;
      if (isDefault !== undefined) options.isDefault = isDefault === 'true';
      
      const templates = await storage.getPromptStyleRuleTemplates(options);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching prompt style rule templates:", error);
      res.status(500).json({ message: "Failed to fetch prompt style rule templates" });
    }
  });

  app.post('/api/prompt-stylerule-templates', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const templateData = insertPromptStyleRuleTemplateSchema.parse({ ...req.body, userId });
      const template = await storage.createPromptStyleRuleTemplate(templateData);
      res.status(201).json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid template data", errors: error.errors });
      }
      console.error("Error creating prompt style rule template:", error);
      res.status(500).json({ message: "Failed to create prompt style rule template" });
    }
  });

  // Prompt style routes
  app.get('/api/prompt-styles', async (req, res) => {
    try {
      const { userId, type, isActive } = req.query;
      const options: any = {};
      
      if (userId) options.userId = userId as string;
      if (type) options.type = type as string;
      if (isActive !== undefined) options.isActive = isActive === 'true';
      
      const promptStyles = await storage.getPromptStyles(options);
      res.json(promptStyles);
    } catch (error) {
      console.error("Error fetching prompt styles:", error);
      res.status(500).json({ message: "Failed to fetch prompt styles" });
    }
  });

  app.post('/api/prompt-styles', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const promptStyleData = insertPromptStyleSchema.parse({ ...req.body, userId, type: 'user' });
      const promptStyle = await storage.createPromptStyle(promptStyleData);
      res.status(201).json(promptStyle);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid prompt style data", errors: error.errors });
      }
      console.error("Error creating prompt style:", error);
      res.status(500).json({ message: "Failed to create prompt style" });
    }
  });

  // Intended generator routes
  app.get('/api/intended-generators', async (req, res) => {
    try {
      const { userId, type, isActive } = req.query;
      const options: any = {};
      
      if (userId) options.userId = userId as string;
      if (type) options.type = type as string;
      if (isActive !== undefined) options.isActive = isActive === 'true';
      
      const generators = await storage.getIntendedGenerators(options);
      res.json(generators);
    } catch (error) {
      console.error("Error fetching intended generators:", error);
      res.status(500).json({ message: "Failed to fetch intended generators" });
    }
  });

  app.post('/api/intended-generators', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const generatorData = insertIntendedGeneratorSchema.parse({ ...req.body, userId, type: 'user' });
      const generator = await storage.createIntendedGenerator(generatorData);
      res.status(201).json(generator);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid intended generator data", errors: error.errors });
      }
      console.error("Error creating intended generator:", error);
      res.status(500).json({ message: "Failed to create intended generator" });
    }
  });

  // Recommended model routes
  app.get('/api/recommended-models', async (req, res) => {
    try {
      const { userId, type, isActive } = req.query;
      const options: any = {};
      
      if (userId) options.userId = userId as string;
      if (type) options.type = type as string;
      if (isActive !== undefined) options.isActive = isActive === 'true';
      
      const models = await storage.getRecommendedModels(options);
      res.json(models);
    } catch (error) {
      console.error("Error fetching recommended models:", error);
      res.status(500).json({ message: "Failed to fetch recommended models" });
    }
  });

  app.post('/api/recommended-models', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const modelData = insertRecommendedModelSchema.parse({ ...req.body, userId, type: 'user' });
      const model = await storage.createRecommendedModel(modelData);
      res.status(201).json(model);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid recommended model data", errors: error.errors });
      }
      console.error("Error creating recommended model:", error);
      res.status(500).json({ message: "Failed to create recommended model" });
    }
  });

  // User stats
  app.get('/api/user/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });

  // Credits API endpoints
  // Get user's credit balance
  app.get("/api/credits/balance", isAuthenticated, apiLimiter, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const userCredits = await storage.getUserCredits(userId);
      res.json({
        balance: userCredits.balance,
        totalEarned: userCredits.totalEarned,
        totalSpent: userCredits.totalSpent,
        lastDailyReward: userCredits.lastDailyReward,
        dailyStreak: userCredits.dailyStreak,
      });
    } catch (error) {
      console.error("Error fetching credit balance:", error);
      // If user doesn't have credits record, initialize it
      try {
        const userId = (req.user as any).claims.sub;
        const userCredits = await storage.initializeUserCredits(userId);
        res.json({
          balance: userCredits.balance,
          totalEarned: userCredits.totalEarned,
          totalSpent: userCredits.totalSpent,
          lastDailyReward: userCredits.lastDailyReward,
          dailyStreak: userCredits.dailyStreak,
        });
      } catch (initError) {
        res.status(500).json({ message: "Failed to fetch credit balance" });
      }
    }
  });

  // Get transaction history
  app.get("/api/credits/history", isAuthenticated, apiLimiter, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;
      
      const transactions = await storage.getCreditTransactionHistory(userId, { limit, offset });
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transaction history:", error);
      res.status(500).json({ message: "Failed to fetch transaction history" });
    }
  });

  // Claim daily reward
  app.post("/api/credits/claim-daily", isAuthenticated, apiLimiter, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      
      // Check if user can claim daily reward
      const lastReward = await storage.getDailyReward(userId);
      if (lastReward) {
        const lastClaim = new Date(lastReward.claimedAt);
        const now = new Date();
        const hoursSinceLastClaim = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceLastClaim < 24) {
          return res.status(400).json({ 
            message: "Daily reward already claimed", 
            nextClaimTime: new Date(lastClaim.getTime() + 24 * 60 * 60 * 1000) 
          });
        }
      }
      
      const result = await storage.claimDailyReward(userId);
      res.json({
        success: true,
        reward: result.reward,
        streak: result.streak,
        streakBonus: result.streakBonus,
        message: result.streakBonus 
          ? `Daily reward claimed! +${result.reward} credits (includes ${result.streakBonus} streak bonus)`
          : `Daily reward claimed! +${result.reward} credits`
      });
    } catch (error) {
      console.error("Error claiming daily reward:", error);
      res.status(500).json({ message: "Failed to claim daily reward" });
    }
  });

  // Award credits for sharing prompts (making them public)
  app.post("/api/credits/earn/prompt-share", isAuthenticated, apiLimiter, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const { promptId } = req.body;
      
      if (!promptId) {
        return res.status(400).json({ message: "Prompt ID required" });
      }
      
      // Check if prompt exists and belongs to user
      const prompt = await storage.getPrompt(promptId);
      if (!prompt) {
        return res.status(404).json({ message: "Prompt not found" });
      }
      
      if (prompt.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized to earn credits for this prompt" });
      }
      
      if (!prompt.isPublic) {
        return res.status(400).json({ message: "Prompt must be public to earn credits" });
      }
      
      // Check if user already earned credits for this prompt
      const transactions = await storage.getCreditTransactionHistory(userId, { limit: 1000 });
      const alreadyEarned = transactions.some(
        t => t.referenceId === promptId && (t.source === 'prompt_share' || t.source === 'public_prompt')
      );
      
      if (alreadyEarned) {
        return res.status(400).json({ message: "Credits already earned for this prompt" });
      }
      
      // Validate prompt has quality content (min 100 chars)
      if (!prompt.promptContent || prompt.promptContent.length < 100) {
        return res.status(400).json({ message: "Prompt must have at least 100 characters of content to earn credits" });
      }
      
      // Award credits for sharing prompt  
      const SHARE_REWARD = 50;
      const transaction = await storage.addCredits(
        userId,
        SHARE_REWARD,
        'public_prompt',
        `Made prompt public: ${prompt.name}`,
        promptId,
        'prompt'
      );
      
      res.json({
        success: true,
        credits: SHARE_REWARD,
        newBalance: transaction.balanceAfter,
        message: `+${SHARE_REWARD} credits for sharing your prompt!`
      });
    } catch (error) {
      console.error("Error awarding prompt share credits:", error);
      res.status(500).json({ message: "Failed to award credits" });
    }
  });

  // Achievement Routes
  
  // Get all achievements with user progress
  app.get("/api/achievements", isAuthenticated, apiLimiter, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      
      // Get all active achievements
      const achievements = await storage.getAchievements();
      
      // Get user's achievement progress
      const userProgress = await storage.getUserAchievements(userId);
      
      // Merge achievements with user progress
      const achievementsWithProgress = achievements.map(achievement => {
        const progress = userProgress.find(p => p.achievementId === achievement.id);
        return {
          ...achievement,
          progress: progress?.progress || 0,
          isCompleted: progress?.isCompleted || false,
          completedAt: progress?.completedAt || null,
          creditsClaimed: progress?.creditsClaimed || false,
        };
      });
      
      res.json(achievementsWithProgress);
    } catch (error) {
      console.error("Error fetching achievements:", error);
      res.status(500).json({ message: "Failed to fetch achievements" });
    }
  });
  
  // Check and update achievement progress
  app.post("/api/achievements/check", isAuthenticated, apiLimiter, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const { achievementCode } = req.body;
      
      if (!achievementCode) {
        return res.status(400).json({ message: "Achievement code required" });
      }
      
      const progress = await storage.checkAchievementProgress(userId, achievementCode);
      
      res.json({
        success: true,
        progress,
        message: progress.isCompleted 
          ? "Achievement completed! You can now claim your reward."
          : `Progress: ${progress.progress}/${progress.requiredCount}`
      });
    } catch (error) {
      console.error("Error checking achievement progress:", error);
      res.status(500).json({ message: "Failed to check achievement progress" });
    }
  });
  
  // Claim achievement reward
  app.post("/api/achievements/claim/:id", isAuthenticated, apiLimiter, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const achievementId = req.params.id;
      
      // Get achievement and user progress
      const achievement = await storage.getAchievement(achievementId);
      if (!achievement) {
        return res.status(404).json({ message: "Achievement not found" });
      }
      
      const userAchievement = await storage.getUserAchievement(userId, achievementId);
      if (!userAchievement) {
        return res.status(404).json({ message: "Achievement progress not found" });
      }
      
      if (!userAchievement.isCompleted) {
        return res.status(400).json({ message: "Achievement not completed yet" });
      }
      
      if (userAchievement.creditsClaimed) {
        return res.status(400).json({ message: "Achievement reward already claimed" });
      }
      
      // Award credits for achievement
      const transaction = await storage.addCredits(
        userId,
        achievement.creditReward,
        'achievement',
        `Achievement completed: ${achievement.name}`,
        achievementId,
        'achievement'
      );
      
      // Mark achievement as claimed
      await storage.markAchievementClaimed(userId, achievementId);
      
      res.json({
        success: true,
        creditsEarned: achievement.creditReward,
        newBalance: transaction.balanceAfter,
        message: `Congratulations! You've earned ${achievement.creditReward} credits for completing "${achievement.name}"!`
      });
    } catch (error) {
      console.error("Error claiming achievement reward:", error);
      res.status(500).json({ message: "Failed to claim achievement reward" });
    }
  });

  // Marketplace Routes
  
  // Get current user's seller profile
  app.get('/api/marketplace/seller/profile', isAuthenticated, apiLimiter, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      let profile = await storage.getSellerProfile(userId);
      
      // If no profile exists, create a default one
      if (!profile) {
        profile = await storage.createSellerProfile({
          userId,
          onboardingStatus: 'not_started'
        });
      }
      
      res.json(profile);
    } catch (error) {
      console.error("Error fetching seller profile:", error);
      res.status(500).json({ message: "Failed to fetch seller profile" });
    }
  });
  
  // Create or update seller profile with Stripe Connect onboarding
  app.post('/api/marketplace/seller/onboard', isAuthenticated, apiLimiter, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      
      // Validate the onboarding data
      let validatedData;
      try {
        validatedData = sellerOnboardingSchema.parse(req.body);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ 
            message: "Validation error",
            errors: error.errors 
          });
        }
        throw error;
      }
      
      // Check if profile exists
      const existingProfile = await storage.getSellerProfile(userId);
      
      // Handle PayPal payout method
      if (validatedData.payoutMethod === 'paypal') {
        // For PayPal, we don't need Stripe Connect
        const profileData = {
          userId,
          businessType: validatedData.businessType,
          taxInfo: validatedData.taxInfo,
          payoutMethod: 'paypal' as const,
          paypalEmail: validatedData.paypalEmail,
          onboardingStatus: 'completed' as const // Mark as completed immediately for PayPal
        };
        
        if (existingProfile) {
          // Update existing profile
          await db.update(sellerProfiles)
            .set({
              ...profileData,
              updatedAt: new Date()
            })
            .where(eq(sellerProfiles.userId, userId));
          
          const updatedProfile = await storage.getSellerProfile(userId);
          return res.json(updatedProfile);
        } else {
          // Create new profile
          const newProfile = await storage.createSellerProfile(profileData);
          return res.json(newProfile);
        }
      }
      
      // Check if Stripe is configured (for Stripe payout method)
      if (!stripe) {
        // Fallback to non-Stripe onboarding if Stripe is not configured
        if (existingProfile) {
          // Only allow updating if profile is not yet completed
          if (existingProfile.onboardingStatus === 'completed') {
            return res.status(400).json({ 
              message: "Seller profile already completed. Use the profile update endpoint for changes." 
            });
          }
          
          const updatedProfile = await storage.completeSellerOnboarding(userId, validatedData);
          res.json(updatedProfile);
        } else {
          // Create new profile with initial pending status
          const newProfile = await storage.createSellerProfile({
            userId,
            onboardingStatus: 'pending'
          });
          
          // Then complete onboarding with validated data
          const completedProfile = await storage.completeSellerOnboarding(userId, validatedData);
          res.json(completedProfile);
        }
        return;
      }
      
      // Get user details
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Create or retrieve Stripe Connect account
      let stripeAccountId: string;
      
      if (existingProfile?.stripeAccountId) {
        // Use existing Stripe account
        stripeAccountId = existingProfile.stripeAccountId;
      } else {
        // Create new Stripe Connect Standard account
        const account = await stripe.accounts.create({
          type: 'standard',
          email: user.email || undefined,
          metadata: {
            userId: userId,
            businessType: validatedData.businessType
          }
        });
        stripeAccountId = account.id;
      }
      
      // Generate Stripe Connect onboarding link
      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: `${req.protocol}://${req.get('host')}/seller-dashboard?refresh=true`,
        return_url: `${req.protocol}://${req.get('host')}/seller-dashboard?success=true`,
        type: 'account_onboarding',
      });
      
      // Save or update seller profile with Stripe account ID
      if (existingProfile) {
        // Update existing profile with Stripe account ID
        await db.update(sellerProfiles)
          .set({
            stripeAccountId: stripeAccountId,
            businessType: validatedData.businessType,
            taxInfo: validatedData.taxInfo,
            payoutMethod: 'stripe', // Force Stripe payouts when using Connect
            onboardingStatus: 'pending',
            updatedAt: new Date()
          })
          .where(eq(sellerProfiles.userId, userId));
          
        const updatedProfile = await storage.getSellerProfile(userId);
        
        res.json({
          ...updatedProfile,
          stripeOnboardingUrl: accountLink.url
        });
      } else {
        // Create new profile with Stripe account ID
        const newProfile = await storage.createSellerProfile({
          userId,
          stripeAccountId: stripeAccountId,
          businessType: validatedData.businessType,
          taxInfo: validatedData.taxInfo,
          payoutMethod: 'stripe', // Force Stripe payouts when using Connect
          onboardingStatus: 'pending'
        });
        
        res.json({
          ...newProfile,
          stripeOnboardingUrl: accountLink.url
        });
      }
    } catch (error) {
      console.error("Error onboarding seller:", error);
      res.status(500).json({ message: "Failed to complete seller onboarding" });
    }
  });
  
  // Create a new listing
  app.post('/api/marketplace/listings', isAuthenticated, apiLimiter, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      
      // Check if seller profile exists AND is completed
      const sellerProfile = await storage.getSellerProfile(userId);
      if (!sellerProfile || sellerProfile.onboardingStatus !== 'completed') {
        return res.status(403).json({ 
          message: "Please complete seller onboarding before creating listings" 
        });
      }
      
      const listingData = insertMarketplaceListingSchema.parse({
        ...req.body,
        sellerId: userId
      });
      
      const listing = await storage.createListing(listingData);
      res.json(listing);
    } catch (error: any) {
      console.error("Error creating listing:", error);
      if (error.message?.includes("You can only list your own prompts")) {
        res.status(403).json({ message: error.message });
      } else if (error.message?.includes("already listed")) {
        res.status(400).json({ message: error.message });
      } else if (error.message?.includes("Minimum")) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to create listing" });
      }
    }
  });
  
  // Get all active marketplace listings with enhanced filtering and sorting
  app.get('/api/marketplace/listings', async (req, res) => {
    try {
      const { 
        page = 1, 
        limit = 20, 
        search,
        category,
        minPrice,
        maxPrice,
        minCredits,
        maxCredits,
        sortBy = 'newest',
        acceptsMoney,
        acceptsCredits
      } = req.query;
      
      const result = await storage.getMarketplaceListings({
        page: Number(page),
        limit: Number(limit),
        search: search as string,
        category: category as string,
        minPriceCents: minPrice ? Number(minPrice) * 100 : undefined, // Convert dollars to cents
        maxPriceCents: maxPrice ? Number(maxPrice) * 100 : undefined,
        minCredits: minCredits ? Number(minCredits) : undefined,
        maxCredits: maxCredits ? Number(maxCredits) : undefined,
        sortBy: sortBy as any,
        acceptsMoney: acceptsMoney === 'true' ? true : acceptsMoney === 'false' ? false : undefined,
        acceptsCredits: acceptsCredits === 'true' ? true : acceptsCredits === 'false' ? false : undefined,
      });
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching marketplace listings:", error);
      res.status(500).json({ message: "Failed to fetch marketplace listings" });
    }
  });

  // Get featured marketplace listings
  app.get('/api/marketplace/featured', async (req, res) => {
    try {
      const { limit = 6 } = req.query;
      const listings = await storage.getFeaturedListings(Number(limit));
      res.json(listings);
    } catch (error) {
      console.error("Error fetching featured listings:", error);
      res.status(500).json({ message: "Failed to fetch featured listings" });
    }
  });

  // Get marketplace categories with counts
  app.get('/api/marketplace/categories', async (req, res) => {
    try {
      const categories = await storage.getMarketplaceCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching marketplace categories:", error);
      res.status(500).json({ message: "Failed to fetch marketplace categories" });
    }
  });
  
  // Get current user's listings
  app.get('/api/marketplace/my-listings', isAuthenticated, apiLimiter, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const { status, limit = 20, offset = 0 } = req.query;
      
      const listings = await storage.getListingsByUser(userId, {
        status: status as string,
        limit: Number(limit),
        offset: Number(offset)
      });
      
      res.json(listings);
    } catch (error) {
      console.error("Error fetching user listings:", error);
      res.status(500).json({ message: "Failed to fetch your listings" });
    }
  });
  
  // Get listing details with preview
  app.get('/api/marketplace/listings/:id', async (req, res) => {
    try {
      const listing = await storage.getListingWithDetails(req.params.id);
      
      if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
      }
      
      // Add preview of the prompt content
      const preview = await storage.getListingPreview(listing.promptId, listing.previewPercentage);
      
      res.json({
        ...listing,
        promptPreview: preview,
      });
    } catch (error) {
      console.error("Error fetching listing:", error);
      res.status(500).json({ message: "Failed to fetch listing" });
    }
  });

  // Get similar listings
  app.get('/api/marketplace/listings/:id/similar', async (req, res) => {
    try {
      const { limit = 4 } = req.query;
      const listings = await storage.getSimilarListings(req.params.id, Number(limit));
      res.json(listings);
    } catch (error) {
      console.error("Error fetching similar listings:", error);
      res.status(500).json({ message: "Failed to fetch similar listings" });
    }
  });
  
  // Update a listing
  app.put('/api/marketplace/listings/:id', isAuthenticated, apiLimiter, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const listingId = req.params.id;
      const updateData = req.body;
      
      const updatedListing = await storage.updateListing(listingId, updateData, userId);
      res.json(updatedListing);
    } catch (error: any) {
      console.error("Error updating listing:", error);
      if (error.message?.includes("You can only update your own listings")) {
        res.status(403).json({ message: error.message });
      } else if (error.message?.includes("not found")) {
        res.status(404).json({ message: error.message });
      } else if (error.message?.includes("Minimum")) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to update listing" });
      }
    }
  });
  
  // Delete/deactivate a listing
  app.delete('/api/marketplace/listings/:id', isAuthenticated, apiLimiter, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const listingId = req.params.id;
      
      await storage.deleteListing(listingId, userId);
      res.json({ message: "Listing deactivated successfully" });
    } catch (error: any) {
      console.error("Error deleting listing:", error);
      if (error.message?.includes("You can only delete your own listings")) {
        res.status(403).json({ message: error.message });
      } else if (error.message?.includes("not found")) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to delete listing" });
      }
    }
  });

  // ============ Stripe Connect Webhook Handler ============
  
  // Stripe webhook endpoint for Connect events
  app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
      // Get webhook signature from headers
      const signature = req.headers['stripe-signature'] as string;
      
      if (!stripe) {
        return res.status(503).json({ message: "Stripe is not configured" });
      }
      
      // Verify webhook signature if secret is configured
      let event: Stripe.Event;
      if (process.env.STRIPE_WEBHOOK_SECRET) {
        try {
          event = stripe.webhooks.constructEvent(
            req.body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
          );
        } catch (err: any) {
          console.error('Webhook signature verification failed:', err.message);
          return res.status(400).json({ message: `Webhook Error: ${err.message}` });
        }
      } else {
        // In development/testing, accept webhooks without signature verification
        console.warn('STRIPE_WEBHOOK_SECRET not configured - accepting webhook without verification');
        event = req.body as Stripe.Event;
      }
      
      // Handle different event types
      switch (event.type) {
        case 'account.updated': {
          const account = event.data.object as Stripe.Account;
          
          // Find seller profile by Stripe account ID
          const [sellerProfile] = await db.select()
            .from(sellerProfiles)
            .where(eq(sellerProfiles.stripeAccountId, account.id))
            .limit(1);
            
          if (sellerProfile) {
            // Update onboarding status based on account status
            let onboardingStatus: 'pending' | 'completed' | 'rejected' = 'pending';
            
            if (account.charges_enabled && account.payouts_enabled) {
              onboardingStatus = 'completed';
            } else if (account.requirements?.disabled_reason) {
              onboardingStatus = 'rejected';
            }
            
            await db.update(sellerProfiles)
              .set({
                onboardingStatus: onboardingStatus,
                updatedAt: new Date()
              })
              .where(eq(sellerProfiles.stripeAccountId, account.id));
              
            console.log(`Updated seller profile for Stripe account ${account.id}: status = ${onboardingStatus}`);
          }
          break;
        }
        
        case 'account.application.deauthorized': {
          const account = event.data.object as Stripe.Account;
          
          // Handle account disconnection
          const [sellerProfile] = await db.select()
            .from(sellerProfiles)
            .where(eq(sellerProfiles.stripeAccountId, account.id))
            .limit(1);
            
          if (sellerProfile) {
            await db.update(sellerProfiles)
              .set({
                stripeAccountId: null,
                onboardingStatus: 'not_started',
                payoutMethod: null,
                updatedAt: new Date()
              })
              .where(eq(sellerProfiles.stripeAccountId, account.id));
              
            console.log(`Stripe account ${account.id} was deauthorized`);
          }
          break;
        }
        
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          
          // Mark order as completed when payment succeeds
          if (paymentIntent.metadata?.orderId) {
            await db.update(marketplaceOrders)
              .set({
                status: 'completed',
                deliveredAt: new Date(),
                updatedAt: new Date()
              })
              .where(eq(marketplaceOrders.id, paymentIntent.metadata.orderId));
              
            // Create digital license for the buyer
            const order = await db.select()
              .from(marketplaceOrders)
              .where(eq(marketplaceOrders.id, paymentIntent.metadata.orderId))
              .limit(1);
              
            if (order[0]) {
              const licenseKey = `LIC-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
              await db.insert(digitalLicenses)
                .values({
                  orderId: order[0].id,
                  buyerId: order[0].buyerId,
                  listingId: order[0].listingId,
                  licenseKey: licenseKey,
                  licenseType: 'commercial',
                  isActive: true
                });
                
              console.log(`Created digital license for order ${order[0].id}`);
            }
          }
          break;
        }
        
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
      
      res.json({ received: true });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).json({ message: "Webhook processing failed" });
    }
  });
  
  // ============ PayPal Webhook Handler ============
  
  // PayPal webhook endpoint for payout events
  app.post('/api/webhooks/paypal', express.json(), async (req, res) => {
    try {
      // Import PayPal webhook handler
      const { handlePayPalWebhook } = await import('./webhooks/paypalWebhook');
      
      // Delegate to PayPal webhook handler
      await handlePayPalWebhook(req, res);
    } catch (error: any) {
      console.error("PayPal webhook error:", error);
      // Still return 200 to prevent PayPal from retrying
      res.status(200).json({ received: true, error: error.message });
    }
  });
  
  // ============ Seller Payout Management Endpoints ============
  
  // Get seller's Stripe balance
  app.get('/api/marketplace/seller/balance', isAuthenticated, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({ message: "Stripe is not configured" });
      }
      
      const userId = (req.user as any).claims.sub;
      
      // Get seller profile
      const sellerProfile = await storage.getSellerProfile(userId);
      if (!sellerProfile) {
        return res.status(404).json({ message: "Seller profile not found" });
      }
      
      if (!sellerProfile.stripeAccountId) {
        return res.status(400).json({ message: "Stripe account not connected" });
      }
      
      // Get balance from Stripe
      const balance = await stripe.balance.retrieve({
        stripeAccount: sellerProfile.stripeAccountId
      });
      
      res.json({
        available: balance.available,
        pending: balance.pending,
        instantAvailable: balance.instant_available || []
      });
    } catch (error) {
      console.error("Error fetching balance:", error);
      res.status(500).json({ message: "Failed to fetch balance" });
    }
  });
  
  // Get seller's payout history
  app.get('/api/marketplace/seller/payouts', isAuthenticated, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({ message: "Stripe is not configured" });
      }
      
      const userId = (req.user as any).claims.sub;
      
      // Get seller profile
      const sellerProfile = await storage.getSellerProfile(userId);
      if (!sellerProfile) {
        return res.status(404).json({ message: "Seller profile not found" });
      }
      
      if (!sellerProfile.stripeAccountId) {
        return res.status(400).json({ message: "Stripe account not connected" });
      }
      
      // Get payouts from Stripe
      const payouts = await stripe.payouts.list({
        limit: 100
      }, {
        stripeAccount: sellerProfile.stripeAccountId
      });
      
      res.json(payouts.data);
    } catch (error) {
      console.error("Error fetching payouts:", error);
      res.status(500).json({ message: "Failed to fetch payouts" });
    }
  });
  
  // Refresh Stripe onboarding link
  app.post('/api/marketplace/seller/refresh-onboarding', isAuthenticated, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({ message: "Stripe is not configured" });
      }
      
      const userId = (req.user as any).claims.sub;
      
      // Get seller profile
      const sellerProfile = await storage.getSellerProfile(userId);
      if (!sellerProfile) {
        return res.status(404).json({ message: "Seller profile not found" });
      }
      
      if (!sellerProfile.stripeAccountId) {
        return res.status(400).json({ message: "No Stripe account found. Please start onboarding first." });
      }
      
      // Generate new onboarding link
      const accountLink = await stripe.accountLinks.create({
        account: sellerProfile.stripeAccountId,
        refresh_url: `${req.protocol}://${req.get('host')}/seller-dashboard?refresh=true`,
        return_url: `${req.protocol}://${req.get('host')}/seller-dashboard?success=true`,
        type: 'account_onboarding',
      });
      
      res.json({ url: accountLink.url });
    } catch (error) {
      console.error("Error refreshing onboarding link:", error);
      res.status(500).json({ message: "Failed to refresh onboarding link" });
    }
  });
  
  // ============ Seller Analytics Endpoints ============
  
  // Get seller analytics dashboard data
  app.get('/api/marketplace/seller/analytics', isAuthenticated, apiLimiter, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      
      // Get seller profile
      const sellerProfile = await storage.getSellerProfile(userId);
      if (!sellerProfile) {
        return res.status(404).json({ message: "Seller profile not found" });
      }
      
      // Parse date range from query params
      const { startDate, endDate } = req.query;
      let dateRange: { start: Date; end: Date } | undefined;
      
      if (startDate && endDate) {
        dateRange = {
          start: new Date(startDate as string),
          end: new Date(endDate as string),
        };
      } else {
        // Default to last 30 days
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);
        dateRange = { start, end };
      }
      
      // Get analytics data
      const analytics = await storage.getSellerAnalytics(userId, dateRange);
      const topListings = await storage.getTopListings(userId, 5);
      
      res.json({
        metrics: analytics,
        topListings,
      });
    } catch (error) {
      console.error("Error fetching seller analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });
  
  // Get seller analytics chart data
  app.get('/api/marketplace/seller/analytics/chart', isAuthenticated, apiLimiter, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      
      // Get seller profile
      const sellerProfile = await storage.getSellerProfile(userId);
      if (!sellerProfile) {
        return res.status(404).json({ message: "Seller profile not found" });
      }
      
      // Parse query params
      const { startDate, endDate, period = 'day' } = req.query;
      let dateRange: { start: Date; end: Date } | undefined;
      
      if (startDate && endDate) {
        dateRange = {
          start: new Date(startDate as string),
          end: new Date(endDate as string),
        };
      } else {
        // Default to last 30 days
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);
        dateRange = { start, end };
      }
      
      // Validate period
      if (!['day', 'week', 'month'].includes(period as string)) {
        return res.status(400).json({ message: "Invalid period. Must be 'day', 'week', or 'month'" });
      }
      
      // Get chart data
      const chartData = await storage.getSalesChartData(
        userId, 
        period as 'day' | 'week' | 'month', 
        dateRange
      );
      
      res.json(chartData);
    } catch (error) {
      console.error("Error fetching chart data:", error);
      res.status(500).json({ message: "Failed to fetch chart data" });
    }
  });

  // ============ Admin Middleware ============
  const isSuperAdmin = async (req: any, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'super_admin' && user.role !== 'global_admin' && user.role !== 'developer')) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      next();
    } catch (error) {
      console.error("Admin middleware error:", error);
      res.status(500).json({ message: "Authorization check failed" });
    }
  };

  // ============ Transaction Reporting Endpoints ============
  
  // Get transaction history for a user (buyers see purchases, sellers see sales)
  app.get('/api/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const { 
        type = 'all', // all, purchases, sales, payouts, refunds
        status,
        startDate,
        endDate,
        page = 1,
        limit = 20
      } = req.query;
      
      const transactions = await storage.getUserTransactions(userId, {
        type: type as string,
        status: status as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: Number(page),
        limit: Number(limit)
      });
      
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });
  
  // Export transactions as CSV or JSON
  app.get('/api/user/transactions/export', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const { type, startDate, endDate, format = 'csv' } = req.query;
      
      const transactions = await storage.getUserTransactions(userId, {
        type: type as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: 1,
        limit: 10000 // Export all matching transactions
      });
      
      if (format === 'json') {
        res.json(transactions.data);
      } else {
        // Convert to CSV format
        const csv = storage.convertTransactionsToCSV(transactions.data);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="transactions-${Date.now()}.csv"`);
        res.send(csv);
      }
    } catch (error) {
      console.error("Error exporting transactions:", error);
      res.status(500).json({ message: "Failed to export transactions" });
    }
  });
  
  // Get seller statistics
  app.get('/api/seller/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const { startDate, endDate } = req.query;
      
      const stats = await storage.getSellerStats(userId, {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching seller stats:", error);
      res.status(500).json({ message: "Failed to fetch seller stats" });
    }
  });
  
  // Get seller's payout status and next payout info
  app.get('/api/seller/payout-status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      
      // Import payout scheduler
      const { payoutScheduler } = await import('./services/payoutScheduler');
      
      // Get next payout info
      const nextPayout = await payoutScheduler.getNextPayoutDate(userId);
      
      // Get seller's payout method
      const sellerProfile = await storage.getSellerProfile(userId);
      
      res.json({
        nextPayoutDate: nextPayout?.date,
        nextPayoutAmount: nextPayout?.amount ? nextPayout.amount / 100 : 0,
        payoutMethod: sellerProfile?.stripeAccountId ? 'stripe' : 
                     sellerProfile?.paypalEmail ? 'paypal' : null,
        isOnboarded: !!(sellerProfile?.stripeAccountId || sellerProfile?.paypalEmail),
      });
    } catch (error) {
      console.error("Error fetching payout status:", error);
      res.status(500).json({ message: "Failed to fetch payout status" });
    }
  });
  
  // Get seller's pending payouts
  app.get('/api/marketplace/seller/pending-payouts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      
      // Get seller profile
      const sellerProfile = await storage.getSellerProfile(userId);
      if (!sellerProfile) {
        return res.status(404).json({ message: "Seller profile not found" });
      }
      
      const pendingPayouts = await storage.getPendingPayouts(userId);
      res.json(pendingPayouts);
    } catch (error) {
      console.error("Error fetching pending payouts:", error);
      res.status(500).json({ message: "Failed to fetch pending payouts" });
    }
  });
  
  // Admin: Get platform transaction summary
  app.get('/api/admin/transactions/summary', isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      const summary = await storage.getPlatformTransactionSummary({
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      });
      
      res.json(summary);
    } catch (error) {
      console.error("Error fetching transaction summary:", error);
      res.status(500).json({ message: "Failed to fetch transaction summary" });
    }
  });
  
  // Admin: Get all transactions with filtering
  app.get('/api/admin/transactions', isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const {
        type,
        status,
        userId,
        startDate,
        endDate,
        page = 1,
        limit = 50
      } = req.query;
      
      const transactions = await storage.getAllTransactions({
        type: type as string,
        status: status as string,
        userId: userId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: Number(page),
        limit: Number(limit)
      });
      
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching all transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });
  
  // Admin: Export transactions as CSV or JSON
  app.get('/api/admin/transactions/export', isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const { 
        startDate, 
        endDate, 
        format = 'csv',
        type,
        status
      } = req.query;
      
      // Fetch all transactions for the period
      const transactions = await storage.getAllTransactions({
        type: type as string,
        status: status as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: 1,
        limit: 10000 // Export all
      });
      
      if (format === 'json') {
        res.json(transactions.data);
      } else {
        // Convert to CSV
        const csv = storage.convertTransactionsToCSV(transactions.data);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="admin-transactions-${Date.now()}.csv"`);
        res.send(csv);
      }
    } catch (error) {
      console.error("Error exporting transactions:", error);
      res.status(500).json({ message: "Failed to export transactions" });
    }
  });
  
  // Admin: Process manual payout batch
  app.post('/api/admin/payouts/process', isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const { payoutMethod = 'stripe', limit = 100 } = req.body;
      
      // Import payment service
      const { paymentService } = await import('./services/paymentService');
      
      const result = await paymentService.processScheduledPayouts(
        payoutMethod as 'stripe' | 'paypal',
        limit
      );
      
      res.json(result);
    } catch (error) {
      console.error("Error processing payouts:", error);
      res.status(500).json({ message: "Failed to process payouts" });
    }
  });
  
  // Admin: Get payout batches
  app.get('/api/admin/payouts/batches', isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      
      const batches = await storage.getPayoutBatches({
        status: status as string,
        page: Number(page),
        limit: Number(limit)
      });
      
      res.json(batches);
    } catch (error) {
      console.error("Error fetching payout batches:", error);
      res.status(500).json({ message: "Failed to fetch payout batches" });
    }
  });
  
  // ============ PayPal Configuration Endpoints ============
  
  // Get PayPal configuration
  app.get('/api/admin/paypal-config', isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      // Fetch PayPal settings from platformSettings table
      const settings = await storage.getPlatformSettings(['paypal.mode', 'paypal.enabled', 'paypal.webhook_id', 'paypal.last_verified']);
      
      const config = {
        mode: settings['paypal.mode'] || 'sandbox',
        enabled: settings['paypal.enabled'] === 'true',
        webhookId: settings['paypal.webhook_id'] || '',
        clientId: process.env.PAYPAL_CLIENT_ID ? '***CONFIGURED***' : '',
        secretConfigured: !!process.env.PAYPAL_CLIENT_SECRET,
        lastVerified: settings['paypal.last_verified'] || null,
      };
      
      res.json(config);
    } catch (error) {
      console.error("Error fetching PayPal config:", error);
      res.status(500).json({ message: "Failed to fetch PayPal configuration" });
    }
  });
  
  // Update PayPal configuration
  app.put('/api/admin/paypal-config', isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const { mode, enabled, webhookId } = req.body;
      
      // Update settings
      const updates: Record<string, string> = {};
      if (mode !== undefined) updates['paypal.mode'] = mode;
      if (enabled !== undefined) updates['paypal.enabled'] = String(enabled);
      if (webhookId !== undefined) updates['paypal.webhook_id'] = webhookId;
      
      await storage.updatePlatformSettings(updates);
      
      res.json({ message: "PayPal configuration updated" });
    } catch (error) {
      console.error("Error updating PayPal config:", error);
      res.status(500).json({ message: "Failed to update PayPal configuration" });
    }
  });
  
  // Test PayPal connection
  app.post('/api/admin/paypal-test', isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const { paypalService } = await import('./services/paypalService');
      
      if (!paypalService.isConfigured()) {
        return res.status(400).json({ 
          message: "PayPal is not configured. Please add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to environment variables." 
        });
      }
      
      // Try to get payout batch status (using a fake ID to test API connection)
      try {
        await paypalService.getPayoutStatus('TEST_CONNECTION_CHECK');
      } catch (error: any) {
        // We expect this to fail with 404 (batch not found) if connection works
        if (error.statusCode === 404 || error.message?.includes('404')) {
          // Connection successful, just batch doesn't exist
          await storage.updatePlatformSettings({ 'paypal.last_verified': new Date().toISOString() });
          return res.json({ success: true, message: "PayPal connection verified" });
        }
        throw error;
      }
      
      return res.json({ success: true, message: "PayPal connection verified" });
    } catch (error: any) {
      console.error("Error testing PayPal connection:", error);
      res.status(500).json({ 
        message: error.message || "Failed to connect to PayPal", 
        details: error.details 
      });
    }
  });
  
  // Process PayPal payouts manually
  app.post('/api/admin/paypal-payouts/process', isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const { paymentService } = await import('./services/paymentService');
      
      // Process PayPal payouts
      const result = await paymentService.processScheduledPayouts('paypal', 100);
      
      res.json({
        success: true,
        payoutCount: result.payoutCount,
        totalAmount: result.totalAmountCents,
        batchId: result.batchId,
      });
    } catch (error: any) {
      console.error("Error processing PayPal payouts:", error);
      res.status(500).json({ message: error.message || "Failed to process PayPal payouts" });
    }
  });
  
  // ============ Marketplace Management Endpoints ============
  
  // Get marketplace settings
  app.get('/api/admin/marketplace/settings', isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const settings = await storage.getPlatformSettings([
        'commission_rate',
        'payout_frequency',
        'minimum_payout_amount',
        'auto_payouts',
        'stripe_enabled',
        'paypal_enabled',
        'processing_fee_percentage',
        'flat_processing_fee',
        'marketplace_name',
        'marketplace_description',
        'require_seller_verification',
        'max_listings_per_seller',
        'allow_digital_products',
        'allow_physical_products',
        'dispute_resolution_days',
        'buyer_protection_enabled'
      ]);
      
      res.json({
        commissionRate: Number(settings['commission_rate'] || 15),
        payoutFrequency: settings['payout_frequency'] || 'weekly',
        minimumPayoutAmount: Number(settings['minimum_payout_amount'] || 1000),
        autoPayouts: settings['auto_payouts'] === 'true',
        stripeEnabled: settings['stripe_enabled'] === 'true',
        paypalEnabled: settings['paypal_enabled'] === 'true',
        processingFeePercentage: Number(settings['processing_fee_percentage'] || 2.9),
        flatProcessingFee: Number(settings['flat_processing_fee'] || 0.30),
        marketplaceName: settings['marketplace_name'] || 'PromptAtrium Marketplace',
        marketplaceDescription: settings['marketplace_description'] || '',
        requireSellerVerification: settings['require_seller_verification'] === 'true',
        maxListingsPerSeller: Number(settings['max_listings_per_seller'] || 100),
        allowDigitalProducts: settings['allow_digital_products'] !== 'false',
        allowPhysicalProducts: settings['allow_physical_products'] === 'true',
        disputeResolutionDays: Number(settings['dispute_resolution_days'] || 7),
        buyerProtectionEnabled: settings['buyer_protection_enabled'] !== 'false'
      });
    } catch (error) {
      console.error("Error fetching marketplace settings:", error);
      res.status(500).json({ message: "Failed to fetch marketplace settings" });
    }
  });
  
  // Update marketplace settings
  app.put('/api/admin/marketplace/settings', isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const updates: Record<string, string> = {};
      const {
        commissionRate,
        payoutFrequency,
        minimumPayoutAmount,
        autoPayouts,
        stripeEnabled,
        paypalEnabled,
        processingFeePercentage,
        flatProcessingFee,
        marketplaceName,
        marketplaceDescription,
        requireSellerVerification,
        maxListingsPerSeller,
        allowDigitalProducts,
        allowPhysicalProducts,
        disputeResolutionDays,
        buyerProtectionEnabled
      } = req.body;
      
      if (commissionRate !== undefined) updates['commission_rate'] = String(commissionRate);
      if (payoutFrequency !== undefined) updates['payout_frequency'] = payoutFrequency;
      if (minimumPayoutAmount !== undefined) updates['minimum_payout_amount'] = String(minimumPayoutAmount);
      if (autoPayouts !== undefined) updates['auto_payouts'] = String(autoPayouts);
      if (stripeEnabled !== undefined) updates['stripe_enabled'] = String(stripeEnabled);
      if (paypalEnabled !== undefined) updates['paypal_enabled'] = String(paypalEnabled);
      if (processingFeePercentage !== undefined) updates['processing_fee_percentage'] = String(processingFeePercentage);
      if (flatProcessingFee !== undefined) updates['flat_processing_fee'] = String(flatProcessingFee);
      if (marketplaceName !== undefined) updates['marketplace_name'] = marketplaceName;
      if (marketplaceDescription !== undefined) updates['marketplace_description'] = marketplaceDescription;
      if (requireSellerVerification !== undefined) updates['require_seller_verification'] = String(requireSellerVerification);
      if (maxListingsPerSeller !== undefined) updates['max_listings_per_seller'] = String(maxListingsPerSeller);
      if (allowDigitalProducts !== undefined) updates['allow_digital_products'] = String(allowDigitalProducts);
      if (allowPhysicalProducts !== undefined) updates['allow_physical_products'] = String(allowPhysicalProducts);
      if (disputeResolutionDays !== undefined) updates['dispute_resolution_days'] = String(disputeResolutionDays);
      if (buyerProtectionEnabled !== undefined) updates['buyer_protection_enabled'] = String(buyerProtectionEnabled);
      
      await storage.updatePlatformSettings(updates);
      
      res.json({ message: "Settings updated successfully" });
    } catch (error) {
      console.error("Error updating marketplace settings:", error);
      res.status(500).json({ message: "Failed to update marketplace settings" });
    }
  });
  
  // Get marketplace statistics
  app.get('/api/admin/marketplace/stats', isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      // Get seller stats
      const sellers = await storage.getSellerProfiles();
      const activeSellers = sellers.filter(s => s.stripeConnected || s.paypalConnected).length;
      
      // Get listing stats
      const prompts = await storage.getPrompts();
      const activeListings = prompts.filter(p => p.isForSale && p.priceCents && p.priceCents > 0).length;
      const newListingsToday = prompts.filter(p => {
        const createdAt = new Date(p.createdAt);
        const today = new Date();
        return createdAt.toDateString() === today.toDateString();
      }).length;
      
      // Get transaction summary
      const summary = await storage.getPlatformTransactionSummary();
      
      res.json({
        totalSellers: sellers.length,
        activeSellers,
        activeListings,
        newListingsToday,
        gmv: summary.totalSales / 100,
        platformRevenue: summary.totalCommission / 100
      });
    } catch (error) {
      console.error("Error fetching marketplace stats:", error);
      res.status(500).json({ message: "Failed to fetch marketplace stats" });
    }
  });
  
  // Get marketplace sellers
  app.get('/api/admin/marketplace/sellers', isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const sellers = await storage.getSellerProfiles();
      const users = await storage.getUsers();
      
      // Join seller data with user data
      const sellersWithUserData = sellers.map(seller => {
        const user = users.find(u => u.id === seller.userId);
        return {
          id: seller.id,
          userId: seller.userId,
          username: user?.username || 'Unknown',
          email: user?.email || 'unknown@example.com',
          status: seller.stripeConnected || seller.paypalConnected ? 'active' : 'inactive',
          stripeConnected: seller.stripeConnected,
          paypalConnected: seller.paypalConnected,
          totalSales: 0, // TODO: Calculate from transaction_ledger
          totalRevenue: 0, // TODO: Calculate from transaction_ledger
          pendingPayout: 0, // TODO: Calculate from transaction_ledger
          joinedAt: user?.createdAt || new Date().toISOString(),
          verified: seller.stripeConnected || seller.paypalConnected
        };
      });
      
      res.json(sellersWithUserData);
    } catch (error) {
      console.error("Error fetching sellers:", error);
      res.status(500).json({ message: "Failed to fetch sellers" });
    }
  });
  
  // Update seller status
  app.patch('/api/admin/marketplace/sellers/:sellerId', isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const { sellerId } = req.params;
      const { status } = req.body;
      
      // TODO: Implement seller status update logic
      // This would typically involve updating a seller status field in the database
      
      res.json({ message: "Seller status updated successfully" });
    } catch (error) {
      console.error("Error updating seller:", error);
      res.status(500).json({ message: "Failed to update seller" });
    }
  });
  
  // Get marketplace listings
  app.get('/api/admin/marketplace/listings', isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const prompts = await storage.getPrompts();
      const users = await storage.getUsers();
      
      // Filter for marketplace listings (prompts that are for sale)
      const listings = prompts
        .filter(p => p.isForSale && p.priceCents && p.priceCents > 0)
        .map(prompt => {
          const seller = users.find(u => u.id === prompt.userId);
          return {
            id: prompt.id,
            title: prompt.name,
            sellerId: prompt.userId,
            sellerName: seller?.username || 'Unknown',
            price: (prompt.priceCents || 0) / 100,
            status: prompt.isPublic ? 'active' : 'inactive',
            category: prompt.category || 'uncategorized',
            salesCount: 0, // TODO: Calculate from orders
            revenue: 0, // TODO: Calculate from transaction_ledger
            createdAt: prompt.createdAt,
            featured: false, // TODO: Add featured field to prompts
            reported: false // TODO: Add reported field to prompts
          };
        });
      
      res.json(listings);
    } catch (error) {
      console.error("Error fetching listings:", error);
      res.status(500).json({ message: "Failed to fetch listings" });
    }
  });
  
  // Update listing status
  app.patch('/api/admin/marketplace/listings/:listingId', isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const { listingId } = req.params;
      const { status, featured } = req.body;
      
      // TODO: Implement listing status/featured update logic
      // This would typically involve updating prompt fields in the database
      
      res.json({ message: "Listing updated successfully" });
    } catch (error) {
      console.error("Error updating listing:", error);
      res.status(500).json({ message: "Failed to update listing" });
    }
  });
  
  // ============ Marketplace Purchase Flow Endpoints ============
  
  // Create Stripe payment intent for a listing
  app.post('/api/marketplace/checkout/stripe', isAuthenticated, apiLimiter, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({ message: "Stripe payments are not configured" });
      }
      
      const userId = (req.user as any).claims.sub;
      const { listingId } = req.body;
      
      if (!listingId) {
        return res.status(400).json({ message: "Listing ID is required" });
      }
      
      // Get listing details
      const listing = await storage.getListingWithDetails(listingId);
      if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
      }
      
      if (listing.status !== 'active') {
        return res.status(400).json({ message: "Listing is not available for purchase" });
      }
      
      if (!listing.acceptsMoney || !listing.priceCents) {
        return res.status(400).json({ message: "This listing does not accept money payments" });
      }
      
      // Check if user already purchased this listing
      const alreadyPurchased = await storage.checkUserPurchasedListing(userId, listingId);
      if (alreadyPurchased) {
        return res.status(400).json({ message: "You have already purchased this listing" });
      }
      
      // Check if seller is trying to purchase their own listing
      if (listing.sellerId === userId) {
        return res.status(400).json({ message: "You cannot purchase your own listing" });
      }
      
      // Calculate platform fee (15%)
      const platformFeeCents = Math.floor(listing.priceCents * 0.15);
      const sellerPayoutCents = listing.priceCents - platformFeeCents;
      
      // Create pending order
      const orderNumber = storage.generateOrderNumber();
      const order = await storage.createOrder({
        orderNumber,
        buyerId: userId,
        sellerId: listing.sellerId,
        listingId: listingId,
        paymentMethod: 'stripe',
        amountCents: listing.priceCents,
        platformFeeCents,
        sellerPayoutCents,
        status: 'pending'
      });
      
      // Get seller's Stripe account ID if they have one
      const sellerProfile = await storage.getSellerProfile(listing.sellerId);
      
      // Create Stripe payment intent with Connect
      let paymentIntentOptions: Stripe.PaymentIntentCreateParams = {
        amount: listing.priceCents,
        currency: 'usd',
        metadata: {
          orderId: order.id,
          listingId: listingId,
          buyerId: userId,
          sellerId: listing.sellerId
        }
      };
      
      // If seller has a connected Stripe account, use Stripe Connect
      if (sellerProfile?.stripeAccountId && sellerProfile.onboardingStatus === 'completed') {
        // Use Stripe Connect with platform fee
        paymentIntentOptions = {
          ...paymentIntentOptions,
          application_fee_amount: platformFeeCents,
          transfer_data: {
            destination: sellerProfile.stripeAccountId,
          },
        };
      } else {
        // Fallback: Regular payment without Connect (platform keeps all funds temporarily)
        console.warn(`Seller ${listing.sellerId} doesn't have completed Stripe Connect account - payment will be held`);
      }
      
      const paymentIntent = await stripe.paymentIntents.create(paymentIntentOptions);
      
      // Update order with payment intent ID
      await db.update(marketplaceOrders)
        .set({ stripePaymentIntentId: paymentIntent.id })
        .where(eq(marketplaceOrders.id, order.id));
      
      res.json({
        clientSecret: paymentIntent.client_secret,
        orderId: order.id,
        amount: listing.priceCents
      });
    } catch (error) {
      console.error("Error creating Stripe checkout:", error);
      res.status(500).json({ message: "Failed to create payment intent" });
    }
  });
  
  // Purchase with credits
  app.post('/api/marketplace/checkout/credits', isAuthenticated, apiLimiter, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const { listingId } = req.body;
      
      if (!listingId) {
        return res.status(400).json({ message: "Listing ID is required" });
      }
      
      // Get listing details
      const listing = await storage.getListingWithDetails(listingId);
      if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
      }
      
      if (listing.status !== 'active') {
        return res.status(400).json({ message: "Listing is not available for purchase" });
      }
      
      if (!listing.acceptsCredits || !listing.creditPrice) {
        return res.status(400).json({ message: "This listing does not accept credit payments" });
      }
      
      // Check if user already purchased this listing
      const alreadyPurchased = await storage.checkUserPurchasedListing(userId, listingId);
      if (alreadyPurchased) {
        return res.status(400).json({ message: "You have already purchased this listing" });
      }
      
      // Check if seller is trying to purchase their own listing
      if (listing.sellerId === userId) {
        return res.status(400).json({ message: "You cannot purchase your own listing" });
      }
      
      // Check user's credit balance
      const userCredits = await storage.getUserCredits(userId);
      if (!userCredits || userCredits.balance < listing.creditPrice) {
        return res.status(400).json({ 
          message: "Insufficient credits",
          required: listing.creditPrice,
          available: userCredits?.balance || 0
        });
      }
      
      // Calculate platform fee (15%)
      const platformFeeCredits = Math.floor(listing.creditPrice * 0.15);
      const sellerPayoutCredits = listing.creditPrice - platformFeeCredits;
      
      // Create atomic transaction for credit transfer
      await db.transaction(async (tx) => {
        // Create order
        const orderNumber = storage.generateOrderNumber();
        const [order] = await tx.insert(marketplaceOrders)
          .values({
            orderNumber,
            buyerId: userId,
            sellerId: listing.sellerId,
            listingId: listingId,
            paymentMethod: 'credits',
            creditAmount: listing.creditPrice,
            platformFeeCredits,
            sellerPayoutCredits,
            status: 'completed',
            deliveredAt: new Date()
          })
          .returning();
        
        // Deduct credits from buyer
        await storage.spendCredits(
          userId,
          listing.creditPrice,
          'marketplace_purchase',
          `Purchased "${listing.title}"`,
          order.id,
          'marketplace_order'
        );
        
        // Add credits to seller (minus platform fee)
        await storage.addCredits(
          listing.sellerId,
          sellerPayoutCredits,
          'marketplace_sale',
          `Sale of "${listing.title}"`,
          order.id,
          'marketplace_order'
        );
        
        // Create digital license
        const licenseKey = storage.generateLicenseKey();
        await tx.insert(digitalLicenses)
          .values({
            orderId: order.id,
            promptId: listing.promptId,
            buyerId: userId,
            licenseKey,
            commercialUse: true
          });
        
        // Update listing sales count
        await tx.update(marketplaceListings)
          .set({ 
            salesCount: sql`${marketplaceListings.salesCount} + 1`,
            updatedAt: new Date()
          })
          .where(eq(marketplaceListings.id, listingId));
        
        // Create activity for the purchase
        await storage.createActivity({
          userId,
          actionType: 'created_prompt', // We'll use this to show in feed
          targetId: listing.promptId,
          targetType: 'prompt',
          metadata: { purchaseType: 'credits', listingId }
        });
        
        res.json({
          success: true,
          order,
          licenseKey,
          creditsSpent: listing.creditPrice,
          remainingCredits: userCredits.balance - listing.creditPrice
        });
      });
    } catch (error: any) {
      console.error("Error processing credit purchase:", error);
      if (error.message?.includes("Insufficient credits")) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to process credit purchase" });
      }
    }
  });
  
  // Complete order (webhook callback from Stripe)
  app.post('/api/marketplace/orders/:id/complete', async (req, res) => {
    try {
      const orderId = req.params.id;
      const { paymentIntentId } = req.body;
      
      if (!paymentIntentId) {
        return res.status(400).json({ message: "Payment intent ID is required" });
      }
      
      // Verify the payment intent with Stripe
      if (stripe) {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (paymentIntent.status !== 'succeeded') {
          return res.status(400).json({ message: "Payment not successful" });
        }
      }
      
      // Get the order
      const order = await storage.getOrderById(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      if (order.status === 'completed') {
        return res.json({ message: "Order already completed", order });
      }
      
      // Complete the order
      await db.transaction(async (tx) => {
        // Update order status
        const [completedOrder] = await tx.update(marketplaceOrders)
          .set({
            status: 'completed',
            deliveredAt: new Date()
          })
          .where(eq(marketplaceOrders.id, orderId))
          .returning();
        
        // Get listing details
        const [listing] = await tx.select()
          .from(marketplaceListings)
          .where(eq(marketplaceListings.id, order.listingId));
        
        // Create digital license
        const licenseKey = storage.generateLicenseKey();
        await tx.insert(digitalLicenses)
          .values({
            orderId: orderId,
            promptId: listing.promptId,
            buyerId: order.buyerId,
            licenseKey,
            commercialUse: true
          });
        
        // Update listing sales count
        await tx.update(marketplaceListings)
          .set({ 
            salesCount: sql`${marketplaceListings.salesCount} + 1`,
            updatedAt: new Date()
          })
          .where(eq(marketplaceListings.id, order.listingId));
        
        // Create activity
        await storage.createActivity({
          userId: order.buyerId,
          actionType: 'created_prompt',
          targetId: listing.promptId,
          targetType: 'prompt',
          metadata: { purchaseType: 'stripe', listingId: order.listingId }
        });
        
        res.json({
          success: true,
          order: completedOrder,
          licenseKey
        });
      });
    } catch (error) {
      console.error("Error completing order:", error);
      res.status(500).json({ message: "Failed to complete order" });
    }
  });
  
  // Get user's purchase history
  app.get('/api/marketplace/purchases', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const { limit = 20, offset = 0 } = req.query;
      
      // Get user's orders
      const orders = await storage.getUserPurchases(userId, {
        limit: Number(limit),
        offset: Number(offset)
      });
      
      // Enrich orders with listing and prompt details
      const enrichedOrders = await Promise.all(orders.map(async (order) => {
        const listing = await storage.getListingWithDetails(order.listingId);
        const license = await storage.getUserLicense(userId, listing?.promptId || '');
        
        return {
          ...order,
          listing,
          license
        };
      }));
      
      res.json(enrichedOrders);
    } catch (error) {
      console.error("Error fetching purchase history:", error);
      res.status(500).json({ message: "Failed to fetch purchase history" });
    }
  });

  // Marketplace Review Routes
  // Create a review for a purchased listing
  app.post('/api/marketplace/reviews', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const { orderId, listingId, rating, title, comment } = req.body;
      
      // Validate inputs
      if (!orderId || !listingId || !rating || !comment) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
      }
      
      if (comment.length < 20) {
        return res.status(400).json({ message: "Review comment must be at least 20 characters" });
      }
      
      // Check if user can review (has purchased and hasn't reviewed yet)
      const canReview = await storage.canUserReview(userId, listingId);
      if (!canReview) {
        return res.status(403).json({ message: "You cannot review this listing. Either you haven't purchased it or you've already reviewed it." });
      }
      
      // Check if this order belongs to the user
      const order = await storage.getOrder(orderId);
      if (!order || order.buyerId !== userId) {
        return res.status(403).json({ message: "Invalid order" });
      }
      
      // Create the review
      const review = await storage.createReview({
        orderId,
        listingId,
        reviewerId: userId,
        rating,
        title: title || null,
        comment,
      });
      
      // Award credits for the review (only for first review per order)
      try {
        await storage.addCredits(
          userId,
          10, // Award 10 credits for review
          "review",
          "Earned credits for writing a product review",
          review.id,
          "review"
        );
        
        // Check achievement progress for review count
        await storage.checkAchievementProgress(userId, "reviewer");
      } catch (creditError) {
        console.error("Error awarding credits for review:", creditError);
        // Continue even if credit awarding fails
      }
      
      res.json({ 
        success: true, 
        review,
        creditsEarned: 10,
        message: "Review submitted successfully! You've earned 10 credits."
      });
    } catch (error: any) {
      console.error("Error creating review:", error);
      if (error.message?.includes("unique_order_review")) {
        return res.status(409).json({ message: "You have already reviewed this purchase" });
      }
      res.status(500).json({ message: "Failed to create review" });
    }
  });

  // Get reviews for a listing
  app.get('/api/marketplace/listings/:id/reviews', async (req, res) => {
    try {
      const listingId = req.params.id;
      const { limit = 20, offset = 0, sortBy = 'newest' } = req.query;
      
      const reviews = await storage.getListingReviews(listingId, {
        limit: Number(limit),
        offset: Number(offset),
        sortBy: sortBy as any,
      });
      
      // Enrich reviews with reviewer information
      const enrichedReviews = await Promise.all(reviews.map(async (review) => {
        const reviewer = await storage.getUser(review.reviewerId);
        return {
          ...review,
          reviewer: {
            id: reviewer?.id,
            username: reviewer?.username,
            firstName: reviewer?.firstName,
            lastName: reviewer?.lastName,
            profileImageUrl: reviewer?.profileImageUrl,
          }
        };
      }));
      
      res.json(enrichedReviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  // Check if user can review a listing
  app.get('/api/marketplace/reviews/can-review/:listingId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const { listingId } = req.params;
      
      const canReview = await storage.canUserReview(userId, listingId);
      const hasPurchased = await storage.checkUserPurchasedListing(userId, listingId);
      const hasReviewed = await storage.getUserHasReviewed(userId, listingId);
      
      res.json({ 
        canReview,
        hasPurchased,
        hasReviewed
      });
    } catch (error) {
      console.error("Error checking review eligibility:", error);
      res.status(500).json({ message: "Failed to check review eligibility" });
    }
  });

  // Mark a review as helpful
  app.put('/api/marketplace/reviews/:id/helpful', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const reviewId = req.params.id;
      
      await storage.markReviewHelpful(reviewId, userId);
      
      res.json({ success: true, message: "Review marked as helpful" });
    } catch (error) {
      console.error("Error marking review as helpful:", error);
      res.status(500).json({ message: "Failed to mark review as helpful" });
    }
  });

  // Add seller response to a review
  app.post('/api/marketplace/reviews/:id/response', isAuthenticated, async (req: any, res) => {
    try {
      const sellerId = (req.user as any).claims.sub;
      const reviewId = req.params.id;
      const { response } = req.body;
      
      if (!response || response.length < 10) {
        return res.status(400).json({ message: "Response must be at least 10 characters" });
      }
      
      const updatedReview = await storage.addSellerResponse(reviewId, sellerId, response);
      
      res.json({ 
        success: true, 
        review: updatedReview,
        message: "Response added successfully"
      });
    } catch (error: any) {
      console.error("Error adding seller response:", error);
      if (error.message?.includes("Unauthorized")) {
        return res.status(403).json({ message: error.message });
      }
      if (error.message?.includes("already responded")) {
        return res.status(409).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to add response" });
    }
  });

  // Get reviews for seller's listings
  app.get('/api/marketplace/seller/reviews', isAuthenticated, async (req: any, res) => {
    try {
      const sellerId = (req.user as any).claims.sub;
      const { limit = 20, offset = 0 } = req.query;
      
      const reviews = await storage.getSellerReviews(sellerId, {
        limit: Number(limit),
        offset: Number(offset),
      });
      
      // Enrich reviews with reviewer and listing information  
      const enrichedReviews = await Promise.all(reviews.map(async (review) => {
        const [reviewer, listing] = await Promise.all([
          storage.getUser(review.reviewerId),
          storage.getMarketplaceListing(review.listingId),
        ]);
        
        return {
          ...review,
          reviewer: {
            id: reviewer?.id,
            username: reviewer?.username,
            firstName: reviewer?.firstName,
            lastName: reviewer?.lastName,
            profileImageUrl: reviewer?.profileImageUrl,
          },
          listing: {
            id: listing?.id,
            title: listing?.title,
            promptId: listing?.promptId,
          }
        };
      }));
      
      res.json(enrichedReviews);
    } catch (error) {
      console.error("Error fetching seller reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });
  
  // ==============================
  // MARKETPLACE DISPUTE ENDPOINTS
  // ==============================
  
  // Create new dispute
  app.post('/api/marketplace/disputes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const disputeData = insertMarketplaceDisputeSchema.parse(req.body);
      
      // Validate that user can create dispute
      const canCreate = await storage.canCreateDispute(disputeData.orderId, userId);
      if (!canCreate.canCreate) {
        return res.status(400).json({ message: canCreate.reason });
      }
      
      // Get order details to determine initiator and respondent
      const order = await storage.getOrderById(disputeData.orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Determine roles
      const initiatedBy = userId === order.buyerId ? 'buyer' : 'seller';
      const respondentId = userId === order.buyerId ? order.sellerId : order.buyerId;
      
      // Create dispute
      const dispute = await storage.createDispute({
        ...disputeData,
        initiatedBy,
        initiatorId: userId,
        respondentId,
      });
      
      res.status(201).json(dispute);
    } catch (error: any) {
      console.error("Error creating dispute:", error);
      if (error.issues) {
        return res.status(400).json({ message: "Invalid dispute data", errors: error.issues });
      }
      res.status(500).json({ message: "Failed to create dispute" });
    }
  });
  
  // Get user's disputes
  app.get('/api/marketplace/disputes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const { role = 'all', status, limit = 20, offset = 0 } = req.query;
      
      const disputes = await storage.getUserDisputes(userId, {
        role: role as 'initiator' | 'respondent' | 'all',
        status: status as string | undefined,
        limit: Number(limit),
        offset: Number(offset),
      });
      
      // Enrich disputes with order and user details
      const enrichedDisputes = await Promise.all(disputes.map(async (dispute) => {
        const [order, initiator, respondent] = await Promise.all([
          storage.getOrderById(dispute.orderId),
          storage.getUser(dispute.initiatorId),
          storage.getUser(dispute.respondentId),
        ]);
        
        let listing = null;
        if (order) {
          listing = await storage.getListingById(order.listingId);
        }
        
        return {
          ...dispute,
          order: {
            id: order?.id,
            orderNumber: order?.orderNumber,
            amountCents: order?.amountCents,
            creditAmount: order?.creditAmount,
            createdAt: order?.createdAt,
          },
          listing: {
            id: listing?.id,
            title: listing?.title,
            promptId: listing?.promptId,
          },
          initiator: {
            id: initiator?.id,
            username: initiator?.username,
            profileImageUrl: initiator?.profileImageUrl,
          },
          respondent: {
            id: respondent?.id,
            username: respondent?.username,
            profileImageUrl: respondent?.profileImageUrl,
          },
        };
      }));
      
      res.json(enrichedDisputes);
    } catch (error) {
      console.error("Error fetching disputes:", error);
      res.status(500).json({ message: "Failed to fetch disputes" });
    }
  });
  
  // Get dispute details
  app.get('/api/marketplace/disputes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const user = await storage.getUser(userId);
      const disputeId = req.params.id;
      
      const dispute = await storage.getDisputeById(disputeId);
      if (!dispute) {
        return res.status(404).json({ message: "Dispute not found" });
      }
      
      // Check if user can view the dispute (participant or admin)
      const isParticipant = userId === dispute.initiatorId || userId === dispute.respondentId;
      const isAdmin = user?.role === 'super_admin' || user?.role === 'community_admin';
      
      if (!isParticipant && !isAdmin) {
        return res.status(403).json({ message: "You don't have permission to view this dispute" });
      }
      
      // Get messages
      const messages = await storage.getDisputeMessages(disputeId);
      
      // Get order and listing details
      const [order, initiator, respondent] = await Promise.all([
        storage.getOrderById(dispute.orderId),
        storage.getUser(dispute.initiatorId),
        storage.getUser(dispute.respondentId),
      ]);
      
      let listing = null;
      if (order) {
        listing = await storage.getListingById(order.listingId);
      }
      
      // Enrich messages with sender information
      const enrichedMessages = await Promise.all(messages.map(async (message) => {
        const sender = await storage.getUser(message.senderId);
        return {
          ...message,
          sender: {
            id: sender?.id,
            username: sender?.username,
            profileImageUrl: sender?.profileImageUrl,
            role: sender?.role,
          }
        };
      }));
      
      res.json({
        ...dispute,
        messages: enrichedMessages,
        order: order ? {
          id: order.id,
          orderNumber: order.orderNumber,
          buyerId: order.buyerId,
          sellerId: order.sellerId,
          amountCents: order.amountCents,
          creditAmount: order.creditAmount,
          status: order.status,
          createdAt: order.createdAt,
        } : null,
        listing: listing ? {
          id: listing.id,
          title: listing.title,
          promptId: listing.promptId,
          priceCents: listing.priceCents,
          creditPrice: listing.creditPrice,
        } : null,
        initiator: {
          id: initiator?.id,
          username: initiator?.username,
          profileImageUrl: initiator?.profileImageUrl,
        },
        respondent: {
          id: respondent?.id,
          username: respondent?.username,
          profileImageUrl: respondent?.profileImageUrl,
        },
      });
    } catch (error) {
      console.error("Error fetching dispute details:", error);
      res.status(500).json({ message: "Failed to fetch dispute details" });
    }
  });
  
  // Add message to dispute
  app.post('/api/marketplace/disputes/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const user = await storage.getUser(userId);
      const disputeId = req.params.id;
      const { message } = req.body;
      
      if (!message || message.trim().length === 0) {
        return res.status(400).json({ message: "Message is required" });
      }
      
      // Check if user can send message
      const canSend = await storage.canSendDisputeMessage(disputeId, userId);
      if (!canSend) {
        return res.status(403).json({ message: "You don't have permission to send messages in this dispute" });
      }
      
      // Determine if this is an admin message
      const isAdminMessage = user?.role === 'super_admin' || user?.role === 'community_admin';
      
      // Create message
      const newMessage = await storage.createDisputeMessage({
        disputeId,
        senderId: userId,
        message: message.trim(),
        isAdminMessage,
      });
      
      // Get sender info for response
      const sender = await storage.getUser(userId);
      
      res.status(201).json({
        ...newMessage,
        sender: {
          id: sender?.id,
          username: sender?.username,
          profileImageUrl: sender?.profileImageUrl,
          role: sender?.role,
        }
      });
    } catch (error) {
      console.error("Error sending dispute message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });
  
  // Resolve dispute (admin only)
  app.put('/api/marketplace/disputes/:id/resolve', isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const disputeId = req.params.id;
      const { resolution, refundAmountCents, creditRefundAmount } = req.body;
      
      if (!resolution || resolution.trim().length === 0) {
        return res.status(400).json({ message: "Resolution description is required" });
      }
      
      const dispute = await storage.getDisputeById(disputeId);
      if (!dispute) {
        return res.status(404).json({ message: "Dispute not found" });
      }
      
      // Process refund if specified
      if ((refundAmountCents && refundAmountCents > 0) || (creditRefundAmount && creditRefundAmount > 0)) {
        const refundResult = await storage.processRefund(dispute.orderId, {
          amountCents: refundAmountCents,
          creditAmount: creditRefundAmount,
          reason: `Dispute resolution: ${resolution}`,
        });
        
        if (!refundResult.success) {
          return res.status(500).json({ message: refundResult.message });
        }
      }
      
      // Resolve dispute
      const resolved = await storage.resolveDispute(disputeId, {
        resolution: resolution.trim(),
        refundAmountCents,
        creditRefundAmount,
      });
      
      res.json(resolved);
    } catch (error) {
      console.error("Error resolving dispute:", error);
      res.status(500).json({ message: "Failed to resolve dispute" });
    }
  });
  
  // Close dispute
  app.put('/api/marketplace/disputes/:id/close', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const user = await storage.getUser(userId);
      const disputeId = req.params.id;
      
      const dispute = await storage.getDisputeById(disputeId);
      if (!dispute) {
        return res.status(404).json({ message: "Dispute not found" });
      }
      
      // Check if user can close the dispute
      const isInitiator = userId === dispute.initiatorId;
      const isAdmin = user?.role === 'super_admin' || user?.role === 'community_admin';
      
      if (!isInitiator && !isAdmin) {
        return res.status(403).json({ message: "Only the dispute initiator or admins can close disputes" });
      }
      
      const closed = await storage.closeDispute(disputeId);
      res.json(closed);
    } catch (error) {
      console.error("Error closing dispute:", error);
      res.status(500).json({ message: "Failed to close dispute" });
    }
  });
  
  // Admin: Get all disputes
  app.get('/api/marketplace/admin/disputes', isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const { status, escalatedOnly, limit = 20, offset = 0 } = req.query;
      
      const disputes = await storage.getAdminDisputes({
        status: status as string | undefined,
        escalatedOnly: escalatedOnly === 'true',
        limit: Number(limit),
        offset: Number(offset),
      });
      
      // Enrich disputes
      const enrichedDisputes = await Promise.all(disputes.map(async (dispute) => {
        const [order, initiator, respondent] = await Promise.all([
          storage.getOrderById(dispute.orderId),
          storage.getUser(dispute.initiatorId),
          storage.getUser(dispute.respondentId),
        ]);
        
        return {
          ...dispute,
          order: {
            orderNumber: order?.orderNumber,
            amountCents: order?.amountCents,
            creditAmount: order?.creditAmount,
          },
          initiator: {
            username: initiator?.username,
            email: initiator?.email,
          },
          respondent: {
            username: respondent?.username,
            email: respondent?.email,
          },
        };
      }));
      
      res.json(enrichedDisputes);
    } catch (error) {
      console.error("Error fetching admin disputes:", error);
      res.status(500).json({ message: "Failed to fetch disputes" });
    }
  });
  
  // Refund endpoint
  app.post('/api/marketplace/orders/:id/refund', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const user = await storage.getUser(userId);
      const orderId = req.params.id;
      const { amountCents, creditAmount, reason } = req.body;
      
      // Get order details
      const order = await storage.getOrderById(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Check permissions (seller or admin can refund)
      const isSeller = userId === order.sellerId;
      const isAdmin = user?.role === 'super_admin' || user?.role === 'community_admin';
      
      if (!isSeller && !isAdmin) {
        return res.status(403).json({ message: "You don't have permission to refund this order" });
      }
      
      // Process refund
      const result = await storage.processRefund(orderId, {
        amountCents,
        creditAmount,
        reason: reason || 'Manual refund',
      });
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      console.error("Error processing refund:", error);
      res.status(500).json({ message: "Failed to process refund" });
    }
  });

  // Get all users (for community page)
  app.get('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers({ limit: 100 });
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Follow operations
  app.post('/api/users/:userId/follow', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = (req.user as any).claims?.sub || (req.user as any).id;
      const targetUserId = req.params.userId;
      
      // Validate input
      if (!currentUserId) {
        return res.status(401).json({ 
          error: "UNAUTHORIZED",
          message: "Authentication required" 
        });
      }
      
      if (!targetUserId) {
        return res.status(400).json({ 
          error: "INVALID_USER_ID",
          message: "Invalid user ID" 
        });
      }
      
      if (currentUserId === targetUserId) {
        return res.status(400).json({ 
          error: "CANNOT_FOLLOW_SELF",
          message: "Cannot follow yourself" 
        });
      }
      
      // Verify target user exists
      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ 
          error: "USER_NOT_FOUND",
          message: "User not found" 
        });
      }
      
      const follow = await storage.followUser(currentUserId, targetUserId);
      
      // Create notification synchronously with error handling
      try {
        const follower = await storage.getUser(currentUserId);
        if (follower) {
          const notification = await storage.createNotification({
            userId: targetUserId,
            type: "follow",
            message: `${follower.username || follower.firstName || 'Someone'} started following you`,
            relatedUserId: currentUserId,
            relatedPromptId: null,
            relatedListId: null,
            isRead: false,
            metadata: {}
          });
          console.log("Created follow notification:", notification.id);
        }
      } catch (notifError) {
        console.error("Error creating follow notification:", notifError);
        console.error("Notification data:", {
          userId: targetUserId,
          type: "follow",
          relatedUserId: currentUserId
        });
      }
      
      res.json({ 
        following: true,
        userId: targetUserId 
      });
    } catch (error: any) {
      console.error("Error following user:", error);
      
      // Handle specific errors
      if (error.message?.includes("already following")) {
        return res.status(409).json({ 
          error: "ALREADY_FOLLOWING",
          message: "You are already following this user",
          retryable: false 
        });
      }
      
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        return res.status(503).json({ 
          error: "SERVICE_UNAVAILABLE",
          message: "Service temporarily unavailable. Please try again.",
          retryable: true 
        });
      }
      
      res.status(500).json({ 
        error: "INTERNAL_ERROR",
        message: "Failed to follow user. Please try again.",
        retryable: true,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  app.delete('/api/users/:userId/follow', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = (req.user as any).claims?.sub || (req.user as any).id;
      const targetUserId = req.params.userId;
      
      // Validate input
      if (!currentUserId) {
        return res.status(401).json({ 
          error: "UNAUTHORIZED",
          message: "Authentication required" 
        });
      }
      
      if (!targetUserId) {
        return res.status(400).json({ 
          error: "INVALID_USER_ID",
          message: "Invalid user ID" 
        });
      }
      
      await storage.unfollowUser(currentUserId, targetUserId);
      
      res.json({ 
        following: false,
        message: "Unfollowed successfully" 
      });
    } catch (error: any) {
      console.error("Error unfollowing user:", error);
      
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        return res.status(503).json({ 
          error: "SERVICE_UNAVAILABLE",
          message: "Service temporarily unavailable. Please try again.",
          retryable: true 
        });
      }
      
      res.status(500).json({ 
        error: "INTERNAL_ERROR",
        message: "Failed to unfollow user. Please try again.",
        retryable: true,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  app.get('/api/users/:userId/follow-status', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = (req.user as any).claims.sub;
      const targetUserId = req.params.userId;
      
      const isFollowing = await storage.isFollowing(currentUserId, targetUserId);
      res.json({ isFollowing });
    } catch (error) {
      console.error("Error checking follow status:", error);
      res.status(500).json({ message: "Failed to check follow status" });
    }
  });

  app.get('/api/users/:userId/followers', async (req, res) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const followers = await storage.getFollowers(userId, limit, offset);
      const followerCount = await storage.getFollowerCount(userId);
      
      res.json({ followers, total: followerCount });
    } catch (error) {
      console.error("Error fetching followers:", error);
      res.status(500).json({ message: "Failed to fetch followers" });
    }
  });

  app.get('/api/users/:userId/following', async (req, res) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const following = await storage.getFollowing(userId, limit, offset);
      const followingCount = await storage.getFollowingCount(userId);
      
      res.json({ following, total: followingCount });
    } catch (error) {
      console.error("Error fetching following:", error);
      res.status(500).json({ message: "Failed to fetch following" });
    }
  });

  app.get('/api/user/following/prompts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const prompts = await storage.getFollowedUsersPrompts(userId, limit, offset);
      res.json(prompts);
    } catch (error) {
      console.error("Error fetching followed users prompts:", error);
      res.status(500).json({ message: "Failed to fetch followed users prompts" });
    }
  });

  app.get('/api/activities/recent', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      
      const activities = await storage.getRecentActivities(limit);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching recent activities:", error);
      res.status(500).json({ message: "Failed to fetch recent activities" });
    }
  });

  app.get('/api/user/following/activities', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const activities = await storage.getFollowedUsersActivities(userId, limit, offset);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching followed users activities:", error);
      res.status(500).json({ message: "Failed to fetch followed users activities" });
    }
  });

  app.get('/api/user/activities', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const activities = await storage.getUserActivities(userId, limit, offset);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching user activities:", error);
      res.status(500).json({ message: "Failed to fetch user activities" });
    }
  });

  // Notification routes
  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const notifications = await storage.getNotifications(userId, limit, offset);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get('/api/notifications/unread-count', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const count = await storage.getUnreadCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  app.put('/api/notifications/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const { id } = req.params;
      
      const notification = await storage.markNotificationRead(id, userId);
      res.json(notification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.put('/api/notifications/read-all', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      
      await storage.markAllNotificationsRead(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  app.get('/api/users/:userId/stats', async (req, res) => {
    try {
      const { userId } = req.params;
      
      const stats = await storage.getUserStats(userId);
      const followerCount = await storage.getFollowerCount(userId);
      const followingCount = await storage.getFollowingCount(userId);
      
      res.json({
        ...stats,
        followers: followerCount,
        following: followingCount
      });
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });

  // Community routes
  // Get global community (publicly accessible)
  app.get('/api/communities/global', async (req, res) => {
    try {
      const globalCommunity = await storage.getGlobalCommunity();
      res.json(globalCommunity || null);
    } catch (error) {
      console.error("Error fetching global community:", error);
      res.status(500).json({ message: "Failed to fetch global community" });
    }
  });

  // Get private communities accessible to user
  app.get('/api/communities/private', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Super admin and global admin can see all private communities
      if (user?.role === 'super_admin' || user?.role === 'global_admin' || user?.role === 'developer') {
        const communities = await storage.getAllPrivateCommunities();
        res.json(communities);
      } else {
        // Regular users only see communities they're members of
        const communities = await storage.getUserPrivateCommunities(userId);
        res.json(communities);
      }
    } catch (error) {
      console.error("Error fetching private communities:", error);
      res.status(500).json({ message: "Failed to fetch private communities" });
    }
  });

  // Main communities endpoint - returns global + user's private communities
  app.get('/api/communities', async (req: any, res) => {
    try {
      // Always include the global community
      const globalCommunity = await storage.getGlobalCommunity();
      const communities = globalCommunity ? [globalCommunity] : [];
      
      // If user is authenticated, add their private communities
      if (req.user?.claims?.sub) {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        
        console.log(`[API /api/communities] User ${userId} with role ${user?.role} is fetching communities`);
        
        if (user?.role === 'super_admin' || user?.role === 'global_admin' || user?.role === 'developer') {
          // Admins see all communities
          const privateCommunities = await storage.getAllPrivateCommunities();
          console.log(`[API /api/communities] Admin user ${userId} can see ${privateCommunities.length} private communities`);
          communities.push(...privateCommunities);
        } else {
          // Regular users only see communities they're members of
          const userCommunities = await storage.getUserPrivateCommunities(userId);
          console.log(`[API /api/communities] Regular user ${userId} can see ${userCommunities.length} private communities they are member of`);
          communities.push(...userCommunities);
        }
      }
      
      console.log(`[API /api/communities] Returning total ${communities.length} communities`);
      res.json(communities);
    } catch (error) {
      console.error("Error fetching communities:", error);
      res.status(500).json({ message: "Failed to fetch communities" });
    }
  });

  // Get communities managed by the current user (community admin)
  app.get('/api/communities/managed', requireCommunityManager, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const communities = await storage.getManagedCommunities(userId);
      res.json(communities);
    } catch (error) {
      console.error("Error fetching managed communities:", error);
      res.status(500).json({ message: "Failed to fetch managed communities" });
    }
  });

  app.get('/api/communities/:id', async (req, res) => {
    try {
      const community = await storage.getCommunity(req.params.id);
      if (!community) {
        return res.status(404).json({ message: "Community not found" });
      }
      res.json(community);
    } catch (error) {
      console.error("Error fetching community:", error);
      res.status(500).json({ message: "Failed to fetch community" });
    }
  });

  // Create private community (only super_admin or global_admin)
  app.post('/api/communities/private', requirePrivateCommunityCreator, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const communityData = insertCommunitySchema.parse(req.body);
      
      // Add creator to the community
      const privateCommData = {
        ...communityData,
        createdBy: userId
      };
      
      const community = await storage.createCommunity(privateCommData);
      
      // Automatically make the creator an admin of the community
      await storage.joinCommunity(userId, community.id, "admin");
      
      res.status(201).json(community);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid community data", errors: error.errors });
      }
      console.error("Error creating private community:", error);
      res.status(500).json({ message: "Failed to create private community" });
    }
  });

  // Legacy create community route - kept for compatibility
  app.post('/api/communities', requireSuperAdmin, async (req: any, res) => {
    try {
      const communityData = insertCommunitySchema.parse(req.body);
      const community = await storage.createCommunity(communityData);
      res.status(201).json(community);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid community data", errors: error.errors });
      }
      console.error("Error creating community:", error);
      res.status(500).json({ message: "Failed to create community" });
    }
  });

  app.put('/api/communities/:id', requireSuperAdmin, async (req: any, res) => {
    try {
      const communityData = insertCommunitySchema.partial().parse(req.body);
      const community = await storage.updateCommunity(req.params.id, communityData);
      res.json(community);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid community data", errors: error.errors });
      }
      console.error("Error updating community:", error);
      res.status(500).json({ message: "Failed to update community" });
    }
  });

  app.delete('/api/communities/:id', requireSuperAdmin, async (req: any, res) => {
    try {
      await storage.deleteCommunity(req.params.id);
      res.json({ message: "Community deleted successfully" });
    } catch (error) {
      console.error("Error deleting community:", error);
      res.status(500).json({ message: "Failed to delete community" });
    }
  });

  // Community membership routes
  app.post('/api/communities/:communityId/join', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const { communityId } = req.params;
      
      // Check if already a member
      const isMember = await storage.isCommunityMember(userId, communityId);
      if (isMember) {
        return res.status(400).json({ message: "Already a member of this community" });
      }
      
      const membership = await storage.joinCommunity(userId, communityId);
      res.status(201).json(membership);
    } catch (error) {
      console.error("Error joining community:", error);
      res.status(500).json({ message: "Failed to join community" });
    }
  });

  app.delete('/api/communities/:communityId/leave', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const { communityId } = req.params;
      
      await storage.leaveCommunity(userId, communityId);
      res.json({ message: "Left community successfully" });
    } catch (error) {
      console.error("Error leaving community:", error);
      res.status(500).json({ message: "Failed to leave community" });
    }
  });

  app.get('/api/communities/:communityId/members', requireCommunityMember(), async (req: any, res) => {
    try {
      const { communityId } = req.params;
      const members = await storage.getCommunityMembers(communityId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching community members:", error);
      res.status(500).json({ message: "Failed to fetch community members" });
    }
  });

  app.put('/api/communities/:communityId/members/:userId/role', requireCommunityAdminRole(), async (req: any, res) => {
    try {
      const { communityId, userId } = req.params;
      const { role } = req.body;
      
      if (!["member", "admin"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      const membership = await storage.updateCommunityMemberRole(userId, communityId, role);
      res.json(membership);
    } catch (error) {
      console.error("Error updating member role:", error);
      res.status(500).json({ message: "Failed to update member role" });
    }
  });

  // Get user's communities
  app.get('/api/user/communities', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const user = await storage.getUser(userId);
      console.log(`[API /api/user/communities] Fetching for user ${userId} with role: ${user?.role}`);
      const communities = await storage.getUserCommunities(userId);
      console.log(`[API /api/user/communities] Returning ${communities.length} communities for user ${userId}`);
      res.json(communities);
    } catch (error) {
      console.error("Error fetching user communities:", error);
      res.status(500).json({ message: "Failed to fetch user communities" });
    }
  });

  // Community admin assignment routes (Super Admin only)
  app.post('/api/communities/:id/admins', requireSuperAdmin, async (req: any, res) => {
    try {
      const { id: communityId } = req.params;
      const { userId } = req.body;
      const assignedByUserId = req.user.claims.sub;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID required" });
      }

      // Check if user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if community exists
      const community = await storage.getCommunity(communityId);
      if (!community) {
        return res.status(404).json({ message: "Community not found" });
      }

      // Check if user is already a community admin
      const existingAdmins = await storage.getCommunityAdmins(communityId);
      const isAlreadyAdmin = existingAdmins.some(admin => admin.userId === userId);
      if (isAlreadyAdmin) {
        return res.status(400).json({ message: "User is already a community admin" });
      }

      const adminAssignment = await storage.assignCommunityAdmin({
        userId,
        communityId,
        assignedBy: assignedByUserId,
      });
      
      res.status(201).json(adminAssignment);
    } catch (error) {
      console.error("Error assigning community admin:", error);
      res.status(500).json({ message: "Failed to assign community admin" });
    }
  });

  app.delete('/api/communities/:id/admins/:userId', requireSuperAdmin, async (req: any, res) => {
    try {
      const { id: communityId, userId } = req.params;
      
      // Check if community exists
      const community = await storage.getCommunity(communityId);
      if (!community) {
        return res.status(404).json({ message: "Community not found" });
      }

      // Check if user is actually a community admin
      const existingAdmins = await storage.getCommunityAdmins(communityId);
      const isAdmin = existingAdmins.some(admin => admin.userId === userId);
      if (!isAdmin) {
        return res.status(404).json({ message: "User is not a community admin" });
      }

      await storage.removeCommunityAdmin(userId, communityId);
      res.json({ message: "Community admin removed successfully" });
    } catch (error) {
      console.error("Error removing community admin:", error);
      res.status(500).json({ message: "Failed to remove community admin" });
    }
  });

  app.get('/api/communities/:id/admins', requireSuperAdmin, async (req: any, res) => {
    try {
      const { id: communityId } = req.params;
      
      // Check if community exists
      const community = await storage.getCommunity(communityId);
      if (!community) {
        return res.status(404).json({ message: "Community not found" });
      }

      const admins = await storage.getCommunityAdmins(communityId);
      res.json(admins);
    } catch (error) {
      console.error("Error fetching community admins:", error);
      res.status(500).json({ message: "Failed to fetch community admins" });
    }
  });

  // ========================
  // Private Community Invite Routes
  // ========================

  // Create invite for private community (community admins can invite)
  app.post('/api/communities/:id/invites', requireCommunityAdminRole('id'), async (req: any, res) => {
    try {
      const { id: communityId } = req.params;
      const userId = req.user.claims.sub;
      const { maxUses = 1, expiresAt, role = 'member' } = req.body;
      
      // Check if community exists (all non-global communities are private)
      const community = await storage.getCommunity(communityId);
      if (!community) {
        return res.status(404).json({ message: "Community not found" });
      }
      
      // Check if this is the global community (identified by slug)
      if (community.slug === 'global' || community.slug === 'general') {
        return res.status(400).json({ message: "The global community is public and doesn't need invites" });
      }
      
      const invite = await storage.createInvite({
        communityId,
        createdBy: userId,
        maxUses,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        code: Math.random().toString(36).substring(2, 10).toUpperCase()
      });
      
      res.status(201).json(invite);
    } catch (error) {
      console.error("Error creating community invite:", error);
      res.status(500).json({ message: "Failed to create community invite" });
    }
  });

  // Get all invites for a community
  app.get('/api/communities/:id/invites', requireCommunityAdminRole('id'), async (req: any, res) => {
    try {
      const { id: communityId } = req.params;
      const activeOnly = req.query.active === 'true';
      
      // Use appropriate method based on whether filtering for active invites
      const invites = activeOnly 
        ? await storage.getActiveInvites(communityId)
        : await storage.getCommunityInvites(communityId);
        
      res.json(invites);
    } catch (error) {
      console.error("Error fetching community invites:", error);
      res.status(500).json({ message: "Failed to fetch community invites" });
    }
  });

  // Generic invite lookup - determines type and returns appropriate data
  app.get('/api/invites/:code', async (req, res) => {
    try {
      const { code } = req.params;
      
      // First check community invites
      const communityInvite = await storage.getInviteByCode(code);
      if (communityInvite) {
        // Get community details and member count
        const community = await storage.getCommunity(communityInvite.communityId);
        const memberCount = await storage.getCommunityMemberCount(communityInvite.communityId);
        
        // Get creator details
        const creator = await storage.getUser(communityInvite.createdBy);
        
        return res.json({
          type: 'community',
          invite: {
            ...communityInvite,
            community: community ? {
              ...community,
              memberCount
            } : null,
            creator: creator ? {
              id: creator.id,
              firstName: creator.firstName,
              lastName: creator.lastName,
              profileImageUrl: creator.profileImageUrl
            } : null
          }
        });
      }
      
      // Check sub-community invites
      const subCommunityInvite = await storage.getSubCommunityInvite(code);
      if (subCommunityInvite) {
        // Check if invite is still valid
        if (!subCommunityInvite.isActive) {
          return res.status(400).json({ message: "Invite is no longer active" });
        }
        
        if (subCommunityInvite.expiresAt && new Date() > new Date(subCommunityInvite.expiresAt)) {
          return res.status(400).json({ message: "Invite has expired" });
        }
        
        if (subCommunityInvite.currentUses >= subCommunityInvite.maxUses) {
          return res.status(400).json({ message: "Invite has reached maximum uses" });
        }
        
        // Get sub-community info for the invite
        const subCommunity = await storage.getCommunity(subCommunityInvite.subCommunityId);
        
        return res.json({
          type: 'sub-community',
          invite: {
            ...subCommunityInvite,
            subCommunity,
          }
        });
      }
      
      // No invite found
      return res.status(404).json({ message: "Invalid invite code" });
    } catch (error) {
      console.error("Error fetching invite:", error);
      res.status(500).json({ message: "Failed to fetch invite" });
    }
  });

  // Get invite details by code (public for preview)
  app.get('/api/invites/community/:code', async (req, res) => {
    try {
      const { code } = req.params;
      const invite = await storage.getInviteByCode(code);
      
      if (!invite) {
        return res.status(404).json({ message: "Invalid invite code" });
      }
      
      // Get community details and member count
      const community = await storage.getCommunity(invite.communityId);
      const memberCount = await storage.getCommunityMemberCount(invite.communityId);
      
      // Get creator details
      const creator = await storage.getUser(invite.createdBy);
      
      res.json({
        ...invite,
        community: community ? {
          ...community,
          memberCount
        } : null,
        creator: creator ? {
          id: creator.id,
          firstName: creator.firstName,
          lastName: creator.lastName,
          profileImageUrl: creator.profileImageUrl
        } : null
      });
    } catch (error) {
      console.error("Error fetching invite:", error);
      res.status(500).json({ message: "Failed to fetch invite" });
    }
  });

  // Generic invite accept endpoint - handles both community and sub-community invites
  app.post('/api/invites/:code/accept', isAuthenticated, async (req: any, res) => {
    try {
      const { code } = req.params;
      const userId = req.user.claims.sub;
      
      // First check if it's a community invite
      const communityInvite = await storage.getInviteByCode(code);
      if (communityInvite) {
        const result = await storage.useInvite(code);
        
        if (!result) {
          return res.status(400).json({ message: "Failed to accept invite" });
        }
        
        // Add user to community
        await storage.joinCommunity(userId, communityInvite.communityId, communityInvite.role);
        
        return res.status(201).json({
          type: 'community',
          message: "Successfully joined community",
          communityId: communityInvite.communityId
        });
      }
      
      // Check if it's a sub-community invite
      const subCommunityInvite = await storage.getSubCommunityInvite(code);
      if (subCommunityInvite) {
        const result = await storage.useSubCommunityInvite(code, userId);
        
        if (!result.success) {
          return res.status(400).json({ message: result.message });
        }
        
        return res.status(201).json({
          type: 'sub-community',
          message: result.message,
          community: result.community,
          subCommunityId: subCommunityInvite.subCommunityId
        });
      }
      
      // No invite found
      return res.status(404).json({ message: "Invalid invite code" });
    } catch (error) {
      console.error("Error accepting invite:", error);
      res.status(500).json({ message: "Failed to accept invite" });
    }
  });

  // Search users for adding to community (excludes existing members)
  app.get('/api/communities/:id/available-users', requireCommunityAdminRole('id'), async (req: any, res) => {
    try {
      const { id: communityId } = req.params;
      const { search } = req.query;
      
      if (!search || search.length < 2) {
        return res.json([]);
      }
      
      // Get all users matching the search
      const users = await storage.searchUsers(search as string, 10);
      
      // Get existing members
      const members = await storage.getCommunityMembers(communityId);
      const memberIds = new Set(members.map(m => m.userId));
      
      // Filter out existing members
      const availableUsers = users.filter(u => !memberIds.has(u.id));
      
      res.json(availableUsers);
    } catch (error) {
      console.error("Error searching available users:", error);
      res.status(500).json({ message: "Failed to search users" });
    }
  });

  // Add user directly to community (sends invitation)
  app.post('/api/communities/:id/members', requireCommunityAdminRole('id'), async (req: any, res) => {
    try {
      const { id: communityId } = req.params;
      const { userId, role = 'member' } = req.body;
      const adminId = req.user.claims.sub;
      
      // Check if community exists
      const community = await storage.getCommunity(communityId);
      if (!community) {
        return res.status(404).json({ message: "Community not found" });
      }
      
      // Check if user is already a member
      const existingMembership = await storage.getCommunityMembership(userId, communityId);
      if (existingMembership) {
        if (existingMembership.status === 'pending') {
          return res.status(400).json({ message: "User already has a pending invitation to this community" });
        } else if (existingMembership.status === 'accepted') {
          return res.status(400).json({ message: "User is already a member of this community" });
        }
      }
      
      // Send invitation to user (status will be pending)
      await storage.inviteUserToCommunity(userId, communityId, adminId, role);
      
      res.status(201).json({ message: "Invitation sent to user successfully" });
    } catch (error) {
      console.error("Error inviting user to community:", error);
      res.status(500).json({ message: "Failed to invite user to community" });
    }
  });
  
  // Remove user from community (admin only)
  app.delete('/api/communities/:id/members/:userId', requireCommunityAdminRole('id'), async (req: any, res) => {
    try {
      const { id: communityId, userId } = req.params;
      const adminId = req.user.claims.sub;
      
      // Check if user is trying to remove themselves
      if (userId === adminId) {
        return res.status(400).json({ message: "Admins cannot remove themselves. Please transfer admin rights first." });
      }
      
      // Check if user is a member
      const membership = await storage.getCommunityMembership(userId, communityId);
      if (!membership) {
        return res.status(404).json({ message: "User is not a member of this community" });
      }
      
      // Remove user from community
      await storage.removeUserFromCommunity(userId, communityId);
      
      // Create activity for removal
      await storage.createActivity({
        userId,
        actionType: 'removed_from_community',
        targetId: communityId,
        targetType: 'community',
        metadata: { removedBy: adminId }
      });
      
      res.json({ message: "User removed from community successfully" });
    } catch (error) {
      console.error("Error removing user from community:", error);
      res.status(500).json({ message: "Failed to remove user from community" });
    }
  });
  
  // Accept or reject community invitation
  app.post('/api/communities/:id/invitations/respond', isAuthenticated, async (req: any, res) => {
    try {
      const { id: communityId } = req.params;
      const userId = req.user.claims.sub;
      const { accept } = req.body;
      
      // Check if user has a pending invitation
      const membership = await storage.getCommunityMembership(userId, communityId);
      if (!membership) {
        return res.status(404).json({ message: "No invitation found for this community" });
      }
      
      if (membership.status !== 'pending') {
        return res.status(400).json({ message: "Invitation has already been responded to" });
      }
      
      // Update invitation status
      const status = accept ? 'accepted' : 'rejected';
      await storage.respondToInvitation(userId, communityId, status);
      
      // Create activity
      await storage.createActivity({
        userId,
        actionType: accept ? 'joined_community' : 'rejected_invitation',
        targetId: communityId,
        targetType: 'community',
        metadata: { status }
      });
      
      res.json({ message: accept ? "Invitation accepted successfully" : "Invitation rejected" });
    } catch (error) {
      console.error("Error responding to invitation:", error);
      res.status(500).json({ message: "Failed to respond to invitation" });
    }
  });
  
  // Leave a community (any member)
  app.delete('/api/communities/:id/leave', isAuthenticated, async (req: any, res) => {
    try {
      const { id: communityId } = req.params;
      const userId = req.user.claims.sub;
      
      // Check if user is a member
      const membership = await storage.getCommunityMembership(userId, communityId);
      if (!membership || membership.status !== 'accepted') {
        return res.status(404).json({ message: "You are not a member of this community" });
      }
      
      // Check if user is the last admin
      if (membership.role === 'admin') {
        const admins = await storage.getCommunityAdmins(communityId);
        if (admins.length <= 1) {
          return res.status(400).json({ message: "Cannot leave community as you are the last admin. Please assign another admin first." });
        }
      }
      
      // Remove user from community
      await storage.removeUserFromCommunity(userId, communityId);
      
      // Create activity
      await storage.createActivity({
        userId,
        actionType: 'left_community',
        targetId: communityId,
        targetType: 'community',
        metadata: {}
      });
      
      res.json({ message: "Left community successfully" });
    } catch (error) {
      console.error("Error leaving community:", error);
      res.status(500).json({ message: "Failed to leave community" });
    }
  });
  
  // Get user's pending invitations
  app.get('/api/user/invitations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const invitations = await storage.getUserInvitations(userId);
      res.json(invitations);
    } catch (error) {
      console.error("Error fetching user invitations:", error);
      res.status(500).json({ message: "Failed to fetch invitations" });
    }
  });

  // Check if user is a member of a community
  app.get('/api/communities/:id/member-status', isAuthenticated, async (req: any, res) => {
    try {
      const { id: communityId } = req.params;
      const userId = req.user.claims.sub;
      
      // Check if user is member
      const membership = await storage.getCommunityMembership(userId, communityId);
      
      res.json({
        isMember: !!membership,
        role: membership?.role || null
      });
    } catch (error) {
      console.error("Error checking member status:", error);
      res.status(500).json({ message: "Failed to check member status" });
    }
  });

  // Accept community invite
  app.post('/api/invites/community/:code/accept', isAuthenticated, async (req: any, res) => {
    try {
      const { code } = req.params;
      const userId = req.user.claims.sub;
      
      const result = await storage.useCommunityInvite(code, userId);
      
      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error accepting invite:", error);
      res.status(500).json({ message: "Failed to accept invite" });
    }
  });

  // Deactivate invite
  app.delete('/api/communities/:communityId/invites/:inviteId', requireCommunityAdminRole('communityId'), async (req, res) => {
    try {
      const { inviteId } = req.params;
      await storage.deactivateInvite(inviteId);
      res.json({ message: "Invite deactivated successfully" });
    } catch (error) {
      console.error("Error deactivating invite:", error);
      res.status(500).json({ message: "Failed to deactivate invite" });
    }
  });

  // ========================
  // Sub-Community Routes
  // ========================
  
  // Sub-community CRUD routes
  
  // Create a sub-community under a parent
  app.post('/api/communities/:id/sub-communities', requireCommunityAdminRole('id'), async (req: any, res) => {
    try {
      const { id: parentId } = req.params;
      const userId = (req.user as any).claims.sub;
      
      // Validate request data
      const subCommunityData = insertCommunitySchema.parse(req.body);
      
      // Create the sub-community
      const subCommunity = await storage.createSubCommunity(parentId, subCommunityData);
      
      // Automatically assign the creator as sub-community admin if they're not super admin
      const user = await storage.getUser(userId);
      if (user && user.role !== 'super_admin' && user.role !== 'developer') {
        await storage.assignSubCommunityAdmin({
          userId,
          subCommunityId: subCommunity.id,
          assignedBy: userId,
          permissions: {}
        });
      }
      
      res.status(201).json(subCommunity);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid sub-community data", errors: error.errors });
      }
      console.error("Error creating sub-community:", error);
      res.status(500).json({ message: "Failed to create sub-community" });
    }
  });
  
  // Get all direct sub-communities of a parent
  app.get('/api/communities/:id/sub-communities', requireCommunityMember('id'), async (req: any, res) => {
    try {
      const { id: parentId } = req.params;
      const subCommunities = await storage.getSubCommunities(parentId);
      res.json(subCommunities);
    } catch (error) {
      console.error("Error fetching sub-communities:", error);
      res.status(500).json({ message: "Failed to fetch sub-communities" });
    }
  });
  
  // Get sub-community details
  app.get('/api/sub-communities/:id', requireSubCommunityMember('id'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const subCommunity = await storage.getCommunity(id);
      
      if (!subCommunity) {
        return res.status(404).json({ message: "Sub-community not found" });
      }
      
      if (!subCommunity.parentCommunityId) {
        return res.status(400).json({ message: "Not a sub-community" });
      }
      
      res.json(subCommunity);
    } catch (error) {
      console.error("Error fetching sub-community:", error);
      res.status(500).json({ message: "Failed to fetch sub-community" });
    }
  });
  
  // Update sub-community
  app.put('/api/sub-communities/:id', requireSubCommunityAdmin('id'), async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Validate update data
      const updateData = insertCommunitySchema.partial().parse(req.body);
      
      // Don't allow changing parent community or hierarchy
      delete (updateData as any).parentCommunityId;
      delete (updateData as any).level;
      delete (updateData as any).path;
      
      const updated = await storage.updateSubCommunity(id, updateData);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid update data", errors: error.errors });
      }
      console.error("Error updating sub-community:", error);
      res.status(500).json({ message: "Failed to update sub-community" });
    }
  });
  
  // Delete sub-community
  app.delete('/api/sub-communities/:id', async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = (req.user as any).claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Get the sub-community to check its parent
      const subCommunity = await storage.getCommunity(id);
      if (!subCommunity || !subCommunity.parentCommunityId) {
        return res.status(404).json({ message: "Sub-community not found" });
      }
      
      // Check permissions: super admin, developer, or parent community admin
      const userRole = user.role as UserRole;
      let hasPermission = false;
      
      if (userRole === 'super_admin' || userRole === 'developer') {
        hasPermission = true;
      } else if (userRole === 'community_admin') {
        const isParentAdmin = await storage.isCommunityAdmin(userId, subCommunity.parentCommunityId);
        hasPermission = isParentAdmin;
      }
      
      if (!hasPermission) {
        return res.status(403).json({ message: "Insufficient permissions to delete sub-community" });
      }
      
      await storage.deleteSubCommunity(id);
      res.json({ message: "Sub-community deleted successfully" });
    } catch (error) {
      console.error("Error deleting sub-community:", error);
      res.status(500).json({ message: "Failed to delete sub-community" });
    }
  });
  
  // Sub-community membership routes
  
  // Join a sub-community
  app.post('/api/sub-communities/:id/join', isAuthenticated, async (req: any, res) => {
    try {
      const { id: subCommunityId } = req.params;
      const userId = (req.user as any).claims.sub;
      
      const membership = await storage.joinSubCommunity(userId, subCommunityId);
      res.status(201).json(membership);
    } catch (error: any) {
      if (error.message === 'Sub-community not found') {
        return res.status(404).json({ message: error.message });
      }
      console.error("Error joining sub-community:", error);
      res.status(500).json({ message: "Failed to join sub-community" });
    }
  });
  
  // Leave a sub-community
  app.post('/api/sub-communities/:id/leave', isAuthenticated, async (req: any, res) => {
    try {
      const { id: subCommunityId } = req.params;
      const userId = (req.user as any).claims.sub;
      
      await storage.leaveSubCommunity(userId, subCommunityId);
      res.json({ message: "Left sub-community successfully" });
    } catch (error) {
      console.error("Error leaving sub-community:", error);
      res.status(500).json({ message: "Failed to leave sub-community" });
    }
  });
  
  // Get sub-community members
  app.get('/api/sub-communities/:id/members', requireSubCommunityMember('id'), async (req: any, res) => {
    try {
      const { id: subCommunityId } = req.params;
      const memberships = await storage.getSubCommunityMembers(subCommunityId);
      
      // Enhance with user details
      const membersWithDetails = await Promise.all(
        memberships.map(async (membership) => {
          const user = await storage.getUser(membership.userId);
          return {
            ...membership,
            user: user ? {
              id: user.id,
              username: user.username,
              firstName: user.firstName,
              lastName: user.lastName,
              profileImageUrl: resolvePublicImageUrl(user.profileImageUrl),
            } : null
          };
        })
      );
      
      res.json(membersWithDetails);
    } catch (error) {
      console.error("Error fetching sub-community members:", error);
      res.status(500).json({ message: "Failed to fetch sub-community members" });
    }
  });
  
  // Update member role in sub-community
  app.put('/api/sub-communities/:id/members/:userId/role', requireSubCommunityAdmin('id'), async (req: any, res) => {
    try {
      const { id: subCommunityId, userId } = req.params;
      const { role } = req.body;
      
      if (!["member", "admin"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      const membership = await storage.updateSubCommunityMemberRole(userId, subCommunityId, role as CommunityRole);
      res.json(membership);
    } catch (error: any) {
      if (error.message === 'User is not a member of this sub-community') {
        return res.status(404).json({ message: error.message });
      }
      console.error("Error updating member role:", error);
      res.status(500).json({ message: "Failed to update member role" });
    }
  });
  
  // Sub-community admin routes
  
  // Assign a sub-community admin
  app.post('/api/sub-communities/:id/admins', requireSubCommunityAdmin('id'), async (req: any, res) => {
    try {
      const { id: subCommunityId } = req.params;
      const { userId, permissions = {} } = req.body;
      const assignedBy = (req.user as any).claims.sub;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID required" });
      }
      
      // Check if user is a member of the sub-community
      const isMember = await storage.isSubCommunityMember(userId, subCommunityId);
      if (!isMember) {
        return res.status(400).json({ message: "User must be a member of the sub-community" });
      }
      
      // Check if already admin
      const isAlreadyAdmin = await storage.isSubCommunityAdmin(userId, subCommunityId);
      if (isAlreadyAdmin) {
        return res.status(400).json({ message: "User is already a sub-community admin" });
      }
      
      const admin = await storage.assignSubCommunityAdmin({
        userId,
        subCommunityId,
        assignedBy,
        permissions
      });
      
      res.status(201).json(admin);
    } catch (error) {
      console.error("Error assigning sub-community admin:", error);
      res.status(500).json({ message: "Failed to assign sub-community admin" });
    }
  });
  
  // Remove a sub-community admin
  app.delete('/api/sub-communities/:id/admins/:userId', requireSubCommunityAdmin('id'), async (req: any, res) => {
    try {
      const { id: subCommunityId, userId } = req.params;
      
      await storage.removeSubCommunityAdmin(userId, subCommunityId);
      res.json({ message: "Admin removed successfully" });
    } catch (error) {
      console.error("Error removing sub-community admin:", error);
      res.status(500).json({ message: "Failed to remove sub-community admin" });
    }
  });
  
  // Get list of sub-community admins
  app.get('/api/sub-communities/:id/admins', requireSubCommunityMember('id'), async (req: any, res) => {
    try {
      const { id: subCommunityId } = req.params;
      const admins = await storage.getSubCommunityAdmins(subCommunityId);
      
      // Enhance with user details
      const adminsWithDetails = await Promise.all(
        admins.map(async (admin) => {
          const user = await storage.getUser(admin.userId);
          const assignedByUser = await storage.getUser(admin.assignedBy);
          return {
            ...admin,
            user: user ? {
              id: user.id,
              username: user.username,
              firstName: user.firstName,
              lastName: user.lastName,
              profileImageUrl: resolvePublicImageUrl(user.profileImageUrl),
            } : null,
            assignedByUser: assignedByUser ? {
              id: assignedByUser.id,
              username: assignedByUser.username,
              firstName: assignedByUser.firstName,
              lastName: assignedByUser.lastName,
            } : null
          };
        })
      );
      
      res.json(adminsWithDetails);
    } catch (error) {
      console.error("Error fetching sub-community admins:", error);
      res.status(500).json({ message: "Failed to fetch sub-community admins" });
    }
  });
  
  // Sub-community content routes
  
  // Get prompts shared to sub-community with visibility controls
  app.get('/api/sub-communities/:id/prompts', async (req: any, res) => {
    try {
      const { id: subCommunityId } = req.params;
      const { limit, offset, search } = req.query;
      const userId = req.user?.claims?.sub;
      
      const options: any = {
        userId: userId,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
        search: search as string,
      };
      
      const prompts = await storage.getPromptsForSubCommunity(subCommunityId, options);
      res.json(prompts);
    } catch (error) {
      console.error("Error fetching sub-community prompts:", error);
      res.status(500).json({ message: "Failed to fetch sub-community prompts" });
    }
  });
  
  // Share a prompt to sub-community with visibility settings
  app.post('/api/prompts/:promptId/share-to-sub-community', isAuthenticated, async (req: any, res) => {
    try {
      const { promptId } = req.params;
      const { subCommunityId, visibility = 'private' } = req.body;
      const userId = (req.user as any).claims.sub;
      
      if (!subCommunityId) {
        return res.status(400).json({ message: "Sub-community ID required" });
      }
      
      // Validate visibility value
      if (!['private', 'parent_community', 'public'].includes(visibility)) {
        return res.status(400).json({ message: "Invalid visibility setting" });
      }
      
      // Check if user can share to this sub-community (must be member or admin)
      const isMember = await storage.isSubCommunityMember(userId, subCommunityId);
      const isAdmin = await storage.isSubCommunityAdmin(userId, subCommunityId);
      
      if (!isMember && !isAdmin) {
        return res.status(403).json({ message: "Must be a member of the sub-community to share prompts" });
      }
      
      // Check if user owns the prompt or it's public
      const prompt = await storage.getPrompt(promptId);
      if (!prompt) {
        return res.status(404).json({ message: "Prompt not found" });
      }
      
      if (prompt.userId !== userId && !prompt.isPublic) {
        return res.status(403).json({ message: "Can only share your own prompts or public prompts" });
      }
      
      const updated = await storage.sharePromptToSubCommunity(promptId, subCommunityId, visibility);
      res.json(updated);
    } catch (error: any) {
      if (error.message === 'Sub-community not found') {
        return res.status(404).json({ message: error.message });
      }
      if (error.message === 'Prompt not found') {
        return res.status(404).json({ message: error.message });
      }
      console.error("Error sharing prompt to sub-community:", error);
      res.status(500).json({ message: "Failed to share prompt to sub-community" });
    }
  });
  
  // Update prompt sub-community visibility
  app.post('/api/prompts/:id/sub-community-visibility', isAuthenticated, async (req: any, res) => {
    try {
      const { id: promptId } = req.params;
      const { visibility } = req.body;
      const userId = (req.user as any).claims.sub;
      
      // Validate visibility value
      if (!visibility || !['private', 'parent_community', 'public'].includes(visibility)) {
        return res.status(400).json({ message: "Invalid visibility setting. Must be 'private', 'parent_community', or 'public'" });
      }
      
      const updated = await storage.updatePromptSubCommunityVisibility(promptId, visibility, userId);
      res.json(updated);
    } catch (error: any) {
      if (error.message === 'Prompt not found') {
        return res.status(404).json({ message: error.message });
      }
      if (error.message === 'Prompt is not associated with a sub-community') {
        return res.status(400).json({ message: error.message });
      }
      if (error.message === 'Insufficient permissions to change prompt visibility') {
        return res.status(403).json({ message: error.message });
      }
      console.error("Error updating prompt sub-community visibility:", error);
      res.status(500).json({ message: "Failed to update prompt visibility" });
    }
  });
  
  // Remove prompt from sub-community
  app.delete('/api/sub-communities/:id/prompts/:promptId', requireSubCommunityAdmin('id'), async (req: any, res) => {
    try {
      const { id: subCommunityId, promptId } = req.params;
      
      await storage.removePromptFromSubCommunity(promptId, subCommunityId);
      res.json({ message: "Prompt removed from sub-community successfully" });
    } catch (error) {
      console.error("Error removing prompt from sub-community:", error);
      res.status(500).json({ message: "Failed to remove prompt from sub-community" });
    }
  });
  
  // User's sub-communities route
  
  // Get all sub-communities the current user belongs to
  app.get('/api/user/sub-communities', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const subCommunities = await storage.getUserSubCommunities(userId);
      
      // Enhance with parent community info
      const subCommunitiesWithParents = await Promise.all(
        subCommunities.map(async (subComm) => {
          const parent = subComm.parentCommunityId ? 
            await storage.getCommunity(subComm.parentCommunityId) : null;
          return {
            ...subComm,
            parentCommunity: parent ? {
              id: parent.id,
              name: parent.name,
              slug: parent.slug,
            } : null
          };
        })
      );
      
      res.json(subCommunitiesWithParents);
    } catch (error) {
      console.error("Error fetching user sub-communities:", error);
      res.status(500).json({ message: "Failed to fetch user sub-communities" });
    }
  });

  // ========================
  // End Sub-Community Routes
  // ========================
  
  // User management routes (Super Admin only)
  app.get('/api/users', requireSuperAdmin, async (req: any, res) => {
    try {
      const {
        search,
        role,
        communityId,
        limit = "50",
        offset = "0"
      } = req.query;

      const options = {
        search: search as string,
        role: role as "user" | "community_admin" | "super_admin" | undefined,
        communityId: communityId as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      };

      const users = await storage.getAllUsers(options);
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get('/api/users/search', requireSuperAdmin, async (req: any, res) => {
    try {
      const { q, limit = "20" } = req.query;
      
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ message: "Search query required" });
      }

      const users = await storage.searchUsers(q, parseInt(limit as string));
      res.json(users);
    } catch (error) {
      console.error("Error searching users:", error);
      res.status(500).json({ message: "Failed to search users" });
    }
  });

  app.put('/api/users/:id/role', requireSuperAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      
      if (!["user", "community_admin", "super_admin"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      const user = await storage.updateUserRole(id, role);
      res.json(user);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // ============ Global Sub-Community Admin Routes ============
  
  // Get all communities (super admin only)
  app.get('/api/admin/communities', requireSuperAdmin, async (req: any, res) => {
    try {
      const communities = await storage.getCommunities();
      res.json(communities);
    } catch (error) {
      console.error("Error fetching communities:", error);
      res.status(500).json({ message: "Failed to fetch communities" });
    }
  });

  // Get all sub-community invites (super admin only)
  app.get('/api/admin/sub-community-invites', requireSuperAdmin, async (req: any, res) => {
    try {
      // Get all sub-communities
      const communities = await storage.getCommunities();
      const subCommunities = communities.filter(c => c.parentCommunityId !== null);
      
      // Get all invites for all sub-communities
      const allInvites = [];
      for (const subCommunity of subCommunities) {
        const invites = await storage.getSubCommunityInvites(subCommunity.id);
        allInvites.push(...invites);
      }
      
      res.json(allInvites);
    } catch (error) {
      console.error("Error fetching all sub-community invites:", error);
      res.status(500).json({ message: "Failed to fetch invites" });
    }
  });

  // Get all user memberships across sub-communities (super admin only)
  app.get('/api/admin/user-memberships', requireSuperAdmin, async (req: any, res) => {
    try {
      // Get all communities
      const communities = await storage.getCommunities();
      const subCommunities = communities.filter(c => c.parentCommunityId !== null);
      
      // Get all memberships grouped by user
      const userMembershipsMap = new Map();
      
      for (const subCommunity of subCommunities) {
        const members = await storage.getSubCommunityMembers(subCommunity.id);
        
        for (const member of members) {
          const userId = member.userId;
          
          // Get user details if not already in map
          if (!userMembershipsMap.has(userId)) {
            const user = await storage.getUser(userId);
            if (user) {
              userMembershipsMap.set(userId, {
                user,
                memberships: []
              });
            }
          }
          
          // Add membership to user's list
          if (userMembershipsMap.has(userId)) {
            userMembershipsMap.get(userId).memberships.push({
              community: subCommunity,
              role: member.role,
              joinedAt: member.joinedAt
            });
          }
        }
      }
      
      // Convert map to array
      const userMemberships = Array.from(userMembershipsMap.values());
      
      res.json(userMemberships);
    } catch (error) {
      console.error("Error fetching user memberships:", error);
      res.status(500).json({ message: "Failed to fetch user memberships" });
    }
  });


  // ============ Sub-community Invite Routes ============
  
  // Create a sub-community invite (requires sub-community admin)
  app.post('/api/sub-communities/:id/invites', requireSubCommunityAdmin('id'), async (req: any, res) => {
    try {
      const { id: subCommunityId } = req.params;
      const userId = (req.user as any).claims.sub;
      const { maxUses, expiresAt, role } = req.body;
      
      // Validate role
      if (role && !['member', 'admin'].includes(role)) {
        return res.status(400).json({ message: "Invalid role. Must be 'member' or 'admin'" });
      }
      
      // Create the invite
      const invite = await storage.createSubCommunityInvite({
        subCommunityId,
        createdBy: userId,
        maxUses: maxUses || 1,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: true,
        role: role || 'member',
        currentUses: 0,
      });
      
      res.status(201).json(invite);
    } catch (error) {
      console.error("Error creating sub-community invite:", error);
      res.status(500).json({ message: "Failed to create invite" });
    }
  });
  
  // Get all invites for a sub-community (requires sub-community admin)
  app.get('/api/sub-communities/:id/invites', requireSubCommunityAdmin('id'), async (req: any, res) => {
    try {
      const { id: subCommunityId } = req.params;
      const { active } = req.query;
      
      const options = active !== undefined ? { active: active === 'true' } : undefined;
      const invites = await storage.getSubCommunityInvites(subCommunityId, options);
      
      res.json(invites);
    } catch (error) {
      console.error("Error fetching sub-community invites:", error);
      res.status(500).json({ message: "Failed to fetch invites" });
    }
  });
  
  // Get sub-community invite details by code (public endpoint)
  app.get('/api/invites/sub-community/:code', async (req: any, res) => {
    try {
      const { code } = req.params;
      
      const invite = await storage.getSubCommunityInvite(code);
      if (!invite) {
        return res.status(404).json({ message: "Invite not found" });
      }
      
      // Check if invite is still valid
      if (!invite.isActive) {
        return res.status(400).json({ message: "Invite is no longer active" });
      }
      
      if (invite.expiresAt && new Date() > new Date(invite.expiresAt)) {
        return res.status(400).json({ message: "Invite has expired" });
      }
      
      if (invite.currentUses >= invite.maxUses) {
        return res.status(400).json({ message: "Invite has reached maximum uses" });
      }
      
      // Get sub-community info for the invite
      const subCommunity = await storage.getCommunity(invite.subCommunityId);
      
      res.json({
        ...invite,
        subCommunity,
      });
    } catch (error) {
      console.error("Error validating sub-community invite:", error);
      res.status(500).json({ message: "Failed to validate invite" });
    }
  });
  
  // Accept a sub-community invite (requires authentication)
  app.post('/api/invites/sub-community/:code/accept', isAuthenticated, async (req: any, res) => {
    try {
      const { code } = req.params;
      const userId = (req.user as any).claims.sub;
      
      const result = await storage.useSubCommunityInvite(code, userId);
      
      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }
      
      res.status(201).json({
        message: result.message,
        community: result.community,
      });
    } catch (error) {
      console.error("Error accepting sub-community invite:", error);
      res.status(500).json({ message: "Failed to accept invite" });
    }
  });
  
  // Deactivate a sub-community invite (requires sub-community admin)
  app.delete('/api/sub-communities/invites/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = (req.user as any).claims.sub;
      
      // Get the invite first to check ownership/permissions
      const invites = await storage.getSubCommunityInvites('');
      const invite = invites.find(inv => inv.id === id);
      
      if (!invite) {
        return res.status(404).json({ message: "Invite not found" });
      }
      
      // Check if user is admin of the sub-community or super admin
      const user = await storage.getUser(userId);
      const isSubAdmin = await storage.isSubCommunityAdmin(userId, invite.subCommunityId);
      const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'developer';
      
      if (!isSubAdmin && !isSuperAdmin) {
        return res.status(403).json({ message: "Not authorized to deactivate this invite" });
      }
      
      await storage.deactivateSubCommunityInvite(id);
      res.json({ message: "Invite deactivated successfully" });
    } catch (error) {
      console.error("Error deactivating sub-community invite:", error);
      res.status(500).json({ message: "Failed to deactivate invite" });
    }
  });
  
  // Get sub-community invite statistics (requires sub-community admin)
  app.get('/api/sub-communities/:id/invites/stats', requireSubCommunityAdmin('id'), async (req: any, res) => {
    try {
      const { id: subCommunityId } = req.params;
      
      const stats = await storage.getSubCommunityInviteStats(subCommunityId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching sub-community invite stats:", error);
      res.status(500).json({ message: "Failed to fetch invite statistics" });
    }
  });

  // Public object serving endpoint for images - ACL-aware with proper streaming
  // NOTE: No isAuthenticated middleware - allows public access but still checks ACL
  app.get('/api/objects/serve/:path(*)', async (req: any, res) => {
    try {
      const { path } = req.params;
      
      // Development mode early check - if sidecar is not available, return a dev placeholder
      if (process.env.NODE_ENV === 'development') {
        // Quick check if sidecar is available with a very short timeout
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        );
        
        try {
          await Promise.race([
            objectStorageClient.getBuckets({ maxResults: 1 }),
            timeoutPromise
          ]);
        } catch (sidecarError) {
          // If we get a timeout or connection error, assume sidecar is not available
          console.log('Development mode: Object storage sidecar not available, returning placeholder for path:', path);
          // Return a placeholder that indicates images would work in production
          return res.status(200).json({ 
            message: 'Development mode: Object storage not available',
            path: path,
            note: 'Images will display when object storage sidecar is running or in production'
          });
        }
      }
      
      const objectStorageService = new ObjectStorageService();
      
      // Get user ID if authenticated (setupAuth populates req.user even without isAuthenticated middleware)
      const userId = req.user?.claims?.sub || null;
      
      let objectFile: File | null = null;
      
      // Handle different path formats
      if (path.startsWith('http://') || path.startsWith('https://')) {
        // Parse storage.googleapis.com URLs to internal paths
        if (path.includes('storage.googleapis.com')) {
          try {
            const url = new URL(path);
            const pathParts = url.pathname.split('/').filter(p => p);
            if (pathParts.length >= 2) {
              const bucketName = pathParts[0];
              const objectName = pathParts.slice(1).join('/');
              const bucket = objectStorageClient.bucket(bucketName);
              objectFile = bucket.file(objectName);
              
              // Verify file exists
              const [exists] = await objectFile.exists();
              if (!exists) {
                objectFile = null;
              }
            }
          } catch (parseError) {
            console.error('Error parsing storage URL:', parseError);
          }
        } else {
          // For non-storage URLs, redirect as fallback (but restrict to safe domains)
          const allowedDomains = ['storage.googleapis.com'];
          const url = new URL(path);
          if (allowedDomains.includes(url.hostname)) {
            return res.redirect(path);
          } else {
            return res.status(403).json({ message: 'External URL not allowed' });
          }
        }
      } else if (path.startsWith('/objects/')) {
        // Handle /objects/ paths using getObjectEntityFile
        try {
          objectFile = await objectStorageService.getObjectEntityFile('/' + path);
        } catch (error) {
          if (error instanceof ObjectNotFoundError) {
            objectFile = null;
          } else if (process.env.NODE_ENV === 'development' && 
                     (error.message?.includes('127.0.0.1:1106') || 
                      error.config?.url?.includes('127.0.0.1:1106') ||
                      error.toString().includes('127.0.0.1:1106'))) {
            // In development, object storage auth might fail - try direct construction
            console.log('Development mode: Attempting direct object construction for path:', path);
            try {
              const { bucketName, objectName } = parseObjectPath('/' + path);
              const bucket = objectStorageClient.bucket(bucketName);
              objectFile = bucket.file(objectName);
              // In dev, we'll assume it exists and is public for testing
            } catch (parseError) {
              console.error('Failed to construct object file in development:', parseError);
              objectFile = null;
            }
          } else {
            throw error;
          }
        }
      } else if (path.startsWith('objects/')) {
        // Handle objects/ paths (without leading slash)
        try {
          objectFile = await objectStorageService.getObjectEntityFile('/' + path);
        } catch (error) {
          if (error instanceof ObjectNotFoundError) {
            objectFile = null;
          } else if (process.env.NODE_ENV === 'development' && 
                     (error.message?.includes('127.0.0.1:1106') || 
                      error.config?.url?.includes('127.0.0.1:1106') ||
                      error.toString().includes('127.0.0.1:1106'))) {
            // In development, object storage auth might fail - try direct construction
            console.log('Development mode: Attempting direct object construction for path:', path);
            try {
              const { bucketName, objectName } = parseObjectPath('/' + path);
              const bucket = objectStorageClient.bucket(bucketName);
              objectFile = bucket.file(objectName);
              // In dev, we'll assume it exists and is public for testing
            } catch (parseError) {
              console.error('Failed to construct object file in development:', parseError);
              objectFile = null;
            }
          } else {
            throw error;
          }
        }
      } else {
        // Try to find in public search paths
        try {
          // Remove leading slash if present for searchPublicObject
          const searchPath = path.startsWith('/') ? path.slice(1) : path;
          objectFile = await objectStorageService.searchPublicObject(searchPath);
        } catch (error) {
          console.error('Error searching public object:', error);
          objectFile = null;
        }
      }
      
      // If no file found, return 404
      if (!objectFile) {
        return res.status(404).json({ message: 'Object not found' });
      }
      
      // Check access permissions using ACL
      let canAccess = false;
      let isPublic = false;
      
      try {
        canAccess = await objectStorageService.canAccessObjectEntity({
          objectFile,
          userId: userId,
          requestedPermission: ObjectPermission.READ,
        });
        
        // Try to get ACL policy for cache headers
        const aclPolicy = await getObjectAclPolicy(objectFile);
        isPublic = aclPolicy?.visibility === "public";
      } catch (aclError) {
        // In development, if we can't check ACL due to auth issues, allow access for testing
        if (process.env.NODE_ENV === 'development' && 
            (aclError.message?.includes('127.0.0.1:1106') || 
             aclError.config?.url?.includes('127.0.0.1:1106') ||
             aclError.toString().includes('127.0.0.1:1106'))) {
          console.log('Development mode: Assuming public access for testing');
          canAccess = true;
          isPublic = true;
        } else {
          // Re-throw if it's not a development auth issue
          throw aclError;
        }
      }
      
      if (!canAccess) {
        // Return 403 Forbidden for access denied (not 401 which implies authentication required)
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Stream the file with appropriate cache headers
      // Public files get long cache time, private files get shorter cache time
      const cacheTtl = isPublic ? 31536000 : 3600; // 1 year for public, 1 hour for private
      
      try {
        await objectStorageService.downloadObject(objectFile, res, cacheTtl);
      } catch (downloadError) {
        // In development, if download fails due to auth, return a placeholder response
        if (process.env.NODE_ENV === 'development' && 
            (downloadError.message?.includes('127.0.0.1:1106') || 
             downloadError.config?.url?.includes('127.0.0.1:1106') ||
             downloadError.toString().includes('127.0.0.1:1106'))) {
          console.log('Development mode: Cannot stream file due to auth issues');
          // Return a simple response indicating the file would be served in production
          res.status(200).json({ 
            message: 'Development mode: Object storage not available',
            path: path,
            wouldBePublic: isPublic
          });
        } else {
          throw downloadError;
        }
      }
    } catch (error) {
      console.error('Error serving object:', error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ message: 'Object not found' });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Community member management routes
  app.get('/api/communities/:id/members', requireCommunityAdminRole(), async (req: any, res) => {
    try {
      const { id: communityId } = req.params;
      
      const members = await storage.getCommunityMembers(communityId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching community members:", error);
      res.status(500).json({ message: "Failed to fetch community members" });
    }
  });

  app.delete('/api/communities/:id/members/:userId', requireCommunityAdminRole(), async (req: any, res) => {
    try {
      const { id: communityId, userId } = req.params;
      
      await storage.leaveCommunity(userId, communityId);
      res.json({ message: "Member removed successfully" });
    } catch (error) {
      console.error("Error removing community member:", error);
      res.status(500).json({ message: "Failed to remove community member" });
    }
  });

  app.put('/api/communities/:id/members/:userId/role', requireCommunityAdminRole(), async (req: any, res) => {
    try {
      const { id: communityId, userId } = req.params;
      const { role } = req.body;
      
      if (!["member", "moderator", "admin"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      const updatedMember = await storage.updateCommunityMemberRole(userId, communityId, role);
      res.json(updatedMember);
    } catch (error) {
      console.error("Error updating member role:", error);
      res.status(500).json({ message: "Failed to update member role" });
    }
  });

  // Codex API Routes
  // Helper middleware for admin checking
  const isAdminUser = async (req: any, res: any, next: any) => {
    if (!req.isAuthenticated() || !req.user?.claims?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      // Check if user is super_admin or community_admin
      if (user.role === "super_admin" || user.role === "community_admin") {
        return next();
      }
      return res.status(403).json({ message: "Admin privileges required" });
    } catch (error) {
      console.error("Error checking admin status:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };

  // Category endpoints
  app.get('/api/codex/categories', async (req, res) => {
    try {
      const categories = await storage.getWordsmithCategories();
      res.json(categories);
    } catch (error) {
      console.error('Error fetching wordsmith categories:', error);
      res.status(500).json({ message: 'Failed to fetch categories' });
    }
  });

  app.get('/api/codex/categories/:id', async (req, res) => {
    try {
      // Since categories are now derived from the data, just return a simple object
      const categories = await storage.getWordsmithCategories();
      const category = categories.find(c => c.id === req.params.id);
      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }
      res.json(category);
    } catch (error) {
      console.error('Error fetching wordsmith category:', error);
      res.status(500).json({ message: 'Failed to fetch category' });
    }
  });

  // These endpoints are no longer needed as categories are derived from prompt_components and aesthetics
  // app.post('/api/codex/categories', ...)
  // app.put('/api/codex/categories/:id', ...)
  // app.delete('/api/codex/categories/:id', ...)

  // Term endpoints
  app.get('/api/codex/terms', async (req: any, res) => {
    try {
      // Get userId from authenticated user if available
      const userId = req.user?.id;
      
      const terms = await storage.getWordsmithTerms({
        category: req.query.categoryId as string,
        search: req.query.search as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
        excludeAesthetics: req.query.excludeAesthetics === 'true',
        userId: userId,
      });
      res.json(terms);
    } catch (error) {
      console.error('Error fetching wordsmith terms:', error);
      res.status(500).json({ message: 'Failed to fetch terms' });
    }
  });

  app.get('/api/codex/terms/search', async (req: any, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ message: 'Search query required' });
      }
      
      // Get userId from authenticated user if available
      const userId = req.user?.id;
      
      const terms = await storage.getWordsmithTerms({
        search: query,
        category: req.query.categoryId as string,
        userId: userId,
      });
      res.json(terms);
    } catch (error) {
      console.error('Error searching wordsmith terms:', error);
      res.status(500).json({ message: 'Failed to search terms' });
    }
  });

  // Terms are read-only from prompt_components and aesthetics
  app.get('/api/codex/terms/:id', async (req: any, res) => {
    try {
      // Get userId from authenticated user if available
      const userId = req.user?.id;
      
      const terms = await storage.getWordsmithTerms({ userId });
      const term = terms.find(t => t.id === req.params.id);
      if (!term) {
        return res.status(404).json({ message: 'Term not found' });
      }
      res.json(term);
    } catch (error) {
      console.error('Error fetching wordsmith term:', error);
      res.status(500).json({ message: 'Failed to fetch term' });
    }
  });

  // These endpoints are no longer needed as terms come from prompt_components and aesthetics
  // app.post('/api/codex/terms', ...)
  // app.put('/api/codex/terms/:id', ...)
  // app.delete('/api/codex/terms/:id', ...)

  // Simplified lists endpoints - just return empty arrays for now
  app.get('/api/codex/lists', async (req: any, res) => {
    res.json([]);
  });

  app.get('/api/codex/lists/:id', async (req, res) => {
    res.status(404).json({ message: 'Lists not yet supported' });
  });

  app.get('/api/codex/lists/:id/terms', async (req, res) => {
    res.json([]);
  });

  // Assembled String endpoints
  app.get('/api/codex/assembled-strings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const type = req.query.type as "preset" | "wildcard" | undefined;
      const strings = await storage.getCodexAssembledStrings(userId, type);
      res.json(strings);
    } catch (error) {
      console.error('Error fetching assembled strings:', error);
      res.status(500).json({ message: 'Failed to fetch assembled strings' });
    }
  });

  app.get('/api/codex/assembled-strings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const assembledString = await storage.getCodexAssembledString(req.params.id);
      if (!assembledString) {
        return res.status(404).json({ message: 'Assembled string not found' });
      }
      
      // Only allow viewing if user owns the string
      if (assembledString.userId !== userId) {
        return res.status(403).json({ message: 'Not authorized to view this assembled string' });
      }
      
      res.json(assembledString);
    } catch (error) {
      console.error('Error fetching assembled string:', error);
      res.status(500).json({ message: 'Failed to fetch assembled string' });
    }
  });

  app.post('/api/codex/assembled-strings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const assembledString = await storage.createCodexAssembledString({
        ...req.body,
        userId: userId,
      });
      res.json(assembledString);
    } catch (error) {
      console.error('Error creating assembled string:', error);
      res.status(500).json({ message: 'Failed to create assembled string' });
    }
  });

  app.put('/api/codex/assembled-strings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const assembledString = await storage.getCodexAssembledString(req.params.id);
      if (!assembledString) {
        return res.status(404).json({ message: 'Assembled string not found' });
      }
      
      // Only allow editing if user owns the string
      if (assembledString.userId !== userId) {
        return res.status(403).json({ message: 'Not authorized to edit this assembled string' });
      }
      
      const updated = await storage.updateCodexAssembledString(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error('Error updating assembled string:', error);
      res.status(500).json({ message: 'Failed to update assembled string' });
    }
  });

  app.delete('/api/codex/assembled-strings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const assembledString = await storage.getCodexAssembledString(req.params.id);
      if (!assembledString) {
        return res.status(404).json({ message: 'Assembled string not found' });
      }
      
      // Only allow deletion if user owns the string
      if (assembledString.userId !== userId) {
        return res.status(403).json({ message: 'Not authorized to delete this assembled string' });
      }
      
      await storage.deleteCodexAssembledString(req.params.id);
      res.json({ message: 'Assembled string deleted' });
    } catch (error) {
      console.error('Error deleting assembled string:', error);
      res.status(500).json({ message: 'Failed to delete assembled string' });
    }
  });

  // Register AI analyzer routes
  app.use(aiAnalyzerRouter);

  // Register Quick Prompt API routes
  app.use('/api/caption', captionRouter);
  app.use('/api/enhance-prompt', enhancePromptRouter);
  app.use('/api/prompt-miner', promptMinerRouter);
  app.use('/api/system-data', systemDataRouter);
  
  // Register Admin routes
  app.use('/api/admin', adminRouter);
  
  // Register Prompt Refinement routes (AI-powered chat)
  app.use('/api/prompt-refinement', promptRefinementRouter);
  app.use('/api/prompts', promptExtractionRouter);
  
  // Generate prompt metadata endpoint for ShareToLibraryModal
  app.post('/api/generate-prompt-metadata', async (req, res) => {
    try {
      const { prompt, characterPreset, templateName } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'OpenAI API key not configured' });
      }

      const openai = new (await import('openai')).default({ apiKey });
      
      // Build context for the AI
      let contextInfo = '';
      if (templateName && templateName !== 'custom') {
        contextInfo += ` The prompt was created using the "${templateName}" style template.`;
      }
      if (characterPreset && characterPreset !== 'no-character') {
        contextInfo += ` It features a character: "${characterPreset}".`;
      }

      const systemPrompt = `You are a helpful assistant that generates metadata for AI prompts. 
        Analyze the given prompt and generate:
        1. A concise, descriptive title (max 50 characters)
        2. A brief description explaining what the prompt creates (max 200 characters)
        3. Relevant tags (3-5 tags)
        4. A suggested category based on the prompt content
        
        ${contextInfo}
        
        Return the response in JSON format with keys: title, description, tags (array), category`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate metadata for this prompt: "${prompt}"` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 500
      });

      const response = completion.choices[0].message.content;
      const metadata = JSON.parse(response || '{}');
      
      // Ensure all required fields are present
      const result = {
        title: metadata.title || 'AI Generated Prompt',
        description: metadata.description || 'An AI-enhanced prompt for image generation',
        tags: Array.isArray(metadata.tags) ? metadata.tags : [],
        category: metadata.category || 'General'
      };
      
      res.json(result);
    } catch (error) {
      console.error('Error generating prompt metadata:', error);
      res.status(500).json({ 
        error: 'Failed to generate metadata',
        // Fallback metadata
        title: 'Quick Prompt',
        description: 'Generated with Quick Prompt tool',
        tags: [],
        category: 'General'
      });
    }
  });

  // Prompt History Routes
  app.get('/api/prompt-history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const { limit = "50", offset = "0" } = req.query;
      
      const history = await storage.getPromptHistory(userId, {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });
      
      res.json(history);
    } catch (error) {
      console.error("Error fetching prompt history:", error);
      res.status(500).json({ message: "Failed to fetch prompt history" });
    }
  });

  app.post('/api/prompt-history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const { promptText, templateUsed, settings, metadata } = req.body;
      
      if (!promptText) {
        return res.status(400).json({ message: "Prompt text is required" });
      }
      
      const historyEntry = await storage.savePromptToHistory({
        userId,
        promptText,
        templateUsed,
        settings,
        metadata,
        isSaved: false
      });
      
      res.status(201).json(historyEntry);
    } catch (error) {
      console.error("Error saving prompt to history:", error);
      res.status(500).json({ message: "Failed to save prompt to history" });
    }
  });

  app.delete('/api/prompt-history/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const { id } = req.params;
      
      await storage.deletePromptHistory(id, userId);
      res.json({ message: "History entry deleted" });
    } catch (error) {
      console.error("Error deleting prompt history:", error);
      res.status(500).json({ message: "Failed to delete history entry" });
    }
  });

  app.delete('/api/prompt-history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      
      await storage.clearPromptHistory(userId);
      res.json({ message: "History cleared" });
    } catch (error) {
      console.error("Error clearing prompt history:", error);
      res.status(500).json({ message: "Failed to clear history" });
    }
  });

  app.patch('/api/prompt-history/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const { id } = req.params;
      const { isSaved } = req.body;
      
      if (isSaved === true) {
        await storage.markPromptAsSaved(id, userId);
      }
      
      res.json({ message: "History entry updated" });
    } catch (error) {
      console.error("Error updating prompt history:", error);
      res.status(500).json({ message: "Failed to update history entry" });
    }
  });

  // AI Services endpoint - fetches from Google Sheet
  app.get('/api/ai-services', async (req, res) => {
    try {
      const { fetchAIServices } = await import('./integrations/googleSheets');
      const services = await fetchAIServices();
      res.json(services);
    } catch (error) {
      console.error('Error fetching AI services:', error);
      res.status(500).json({ error: 'Failed to fetch AI services' });
    }
  });

  // Sub-community migration endpoints (Super Admin only)
  app.post('/api/admin/migrate-sub-communities', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const user = await storage.getUser(userId);
      
      // Check if user is super admin
      if (user?.role !== 'super_admin' && user?.role !== 'developer') {
        return res.status(403).json({ message: "Only super admins can run migrations" });
      }
      
      // Run the migration
      const migrationResult = await storage.migrateCommunitiesToHierarchy();
      
      // Validate the migration
      const validation = await storage.validateMigration();
      
      // Generate report after migration
      const report = await storage.generateMigrationReport();
      
      res.json({
        success: validation.isValid,
        migrated: migrationResult,
        validation,
        report,
      });
    } catch (error) {
      console.error("Error running sub-community migration:", error);
      res.status(500).json({ 
        message: "Failed to run migration", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Check migration status endpoint (Super Admin only)
  app.get('/api/admin/migrate-sub-communities/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const user = await storage.getUser(userId);
      
      // Check if user is super admin
      if (user?.role !== 'super_admin' && user?.role !== 'developer') {
        return res.status(403).json({ message: "Only super admins can check migration status" });
      }
      
      // Validate current migration status
      const validation = await storage.validateMigration();
      
      res.json({
        migrationNeeded: !validation.isValid,
        validation,
      });
    } catch (error) {
      console.error("Error checking migration status:", error);
      res.status(500).json({ 
        message: "Failed to check migration status", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Preview migration endpoint (Super Admin only) - dry run
  app.get('/api/admin/migrate-sub-communities/preview', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const user = await storage.getUser(userId);
      
      // Check if user is super admin
      if (user?.role !== 'super_admin' && user?.role !== 'developer') {
        return res.status(403).json({ message: "Only super admins can preview migrations" });
      }
      
      // Get current state without running migration
      const currentValidation = await storage.validateMigration();
      
      // Get communities that would be migrated
      const communitiesNeedingMigration = currentValidation.statistics.communitiesWithoutPath + 
                                           currentValidation.statistics.communitiesWithoutLevel;
      
      res.json({
        wouldMigrate: communitiesNeedingMigration,
        currentState: currentValidation,
        message: communitiesNeedingMigration > 0 
          ? `${communitiesNeedingMigration} communities would be migrated to top-level communities`
          : "No communities need migration"
      });
    } catch (error) {
      console.error("Error previewing migration:", error);
      res.status(500).json({ 
        message: "Failed to preview migration", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
