import type { RequestHandler } from "express";
import { storage } from "./storage";
import type { UserRole, CommunityRole } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { subCommunityAdmins, communities, prompts } from "@shared/schema";

// Role-based access control middleware
export const requireRole = (requiredRole: UserRole): RequestHandler => {
  return async (req: any, res, next) => {
    if (!req.isAuthenticated() || !req.user?.claims?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const userRole = user.role as UserRole;
      
      // Super admin, global admin, and developer can access everything
      if (userRole === "super_admin" || userRole === "global_admin" || userRole === "developer") {
        req.userRole = userRole;
        return next();
      }

      // Check if user has required role
      if (userRole === requiredRole) {
        req.userRole = userRole;
        return next();
      }

      // Community admin can access community_admin level endpoints
      if (requiredRole === "community_admin" && userRole === "community_admin") {
        req.userRole = userRole;
        return next();
      }

      return res.status(403).json({ message: "Insufficient permissions" });
    } catch (error) {
      console.error("Error checking user role:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
};

// Middleware to check if user is super admin
export const requireSuperAdmin = requireRole("super_admin");

// Middleware to check if user is developer
export const requireDeveloper = requireRole("developer");

// Middleware to check if user is global admin
export const requireGlobalAdmin = requireRole("global_admin");

// Middleware to check if user can create private communities (super_admin or global_admin)
export const requirePrivateCommunityCreator: RequestHandler = async (req: any, res, next) => {
  if (!req.isAuthenticated() || !req.user?.claims?.sub) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const userRole = user.role as UserRole;
    
    // Only super admin or global admin can create private communities
    if (userRole === "super_admin" || userRole === "global_admin" || userRole === "developer") {
      req.userRole = userRole;
      return next();
    }

    return res.status(403).json({ message: "Only super admins and global admins can create private communities" });
  } catch (error) {
    console.error("Error checking user role:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Middleware to check if user is community admin or higher
export const requireCommunityAdmin: RequestHandler = async (req: any, res, next) => {
  if (!req.isAuthenticated() || !req.user?.claims?.sub) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const userRole = user.role as UserRole;
    
    // Super admin, global admin, developer, or community admin can access
    if (userRole === "super_admin" || userRole === "global_admin" || userRole === "developer" || userRole === "community_admin") {
      req.userRole = userRole;
      return next();
    }

    return res.status(403).json({ message: "Insufficient permissions" });
  } catch (error) {
    console.error("Error checking user role:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Middleware to check if user can manage communities (either global admin or admin of at least one community)
export const requireCommunityManager: RequestHandler = async (req: any, res, next) => {
  if (!req.isAuthenticated() || !req.user?.claims?.sub) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const userRole = user.role as UserRole;
    
    // Super admin, global admin, developer, or community admin can access
    if (userRole === "super_admin" || userRole === "global_admin" || userRole === "developer" || userRole === "community_admin") {
      req.userRole = userRole;
      return next();
    }

    // Check if user is admin of any community through userCommunities
    const userCommunities = await storage.getUserCommunities(userId);
    const isAdminOfAnyCommunity = userCommunities.some(uc => uc.role === "admin");
    
    if (isAdminOfAnyCommunity) {
      req.userRole = userRole;
      return next();
    }

    return res.status(403).json({ message: "You must be an administrator to access this resource" });
  } catch (error) {
    console.error("Error checking community manager role:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Middleware to check if user is admin of specific community
export const requireCommunityAdminRole = (communityIdParam = "communityId"): RequestHandler => {
  return async (req: any, res, next) => {
    if (!req.isAuthenticated() || !req.user?.claims?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const userRole = user.role as UserRole;
      
      // Super admin, global admin, and developer can access everything
      if (userRole === "super_admin" || userRole === "global_admin" || userRole === "developer") {
        req.userRole = userRole;
        return next();
      }

      // Get community ID from request params or body
      const communityId = req.params[communityIdParam] || req.body.communityId;
      
      if (!communityId) {
        return res.status(400).json({ message: "Community ID required" });
      }

      // Check if user is admin of this specific community
      const isCommunityAdmin = await storage.isCommunityAdmin(userId, communityId);
      
      if (isCommunityAdmin) {
        req.userRole = userRole;
        req.communityId = communityId;
        return next();
      }

      return res.status(403).json({ message: "Not authorized for this community" });
    } catch (error) {
      console.error("Error checking community admin role:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
};

// Middleware to check if user is member of specific community
export const requireCommunityMember = (communityIdParam = "communityId"): RequestHandler => {
  return async (req: any, res, next) => {
    if (!req.isAuthenticated() || !req.user?.claims?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const userRole = user.role as UserRole;
      
      // Super admin, global admin, and developer can access everything
      if (userRole === "super_admin" || userRole === "global_admin" || userRole === "developer") {
        req.userRole = userRole;
        return next();
      }

      // Get community ID from request params or body
      const communityId = req.params[communityIdParam] || req.body.communityId;
      
      if (!communityId) {
        return res.status(400).json({ message: "Community ID required" });
      }

      // Check if user is member of this community
      const isMember = await storage.isCommunityMember(userId, communityId);
      
      if (isMember) {
        req.userRole = userRole;
        req.communityId = communityId;
        return next();
      }

      return res.status(403).json({ message: "Not a member of this community" });
    } catch (error) {
      console.error("Error checking community membership:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
};

// Helper function to check if user can access collection
export const canAccessCollection = async (userId: string, collectionId: string): Promise<boolean> => {
  try {
    const collection = await storage.getCollection(collectionId);
    
    if (!collection) {
      return false;
    }

    const user = await storage.getUser(userId);
    
    if (!user) {
      return false;
    }

    const userRole = user.role as UserRole;
    
    // Super admin and developer can access everything
    if (userRole === "super_admin" || userRole === "developer") {
      return true;
    }

    // User can access their own collections
    if (collection.userId === userId) {
      return true;
    }

    // Public collections can be accessed by anyone
    if (collection.isPublic) {
      return true;
    }

    // For community collections, check membership
    if (collection.type === "community" && collection.communityId) {
      const isMember = await storage.isCommunityMember(userId, collection.communityId);
      return isMember;
    }

    // Global collections can be accessed by community admins and developers
    if (collection.type === "global" && ((userRole as string) === "community_admin" || (userRole as string) === "developer")) {
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error checking collection access:", error);
    return false;
  }
};

// Middleware to check if user is a sub-community admin for a specific sub-community
export const requireSubCommunityAdmin = (subCommunityIdParam = "subCommunityId"): RequestHandler => {
  return async (req: any, res, next) => {
    if (!req.isAuthenticated() || !req.user?.claims?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const userRole = user.role as UserRole;
      
      // Super admin, global admin, and developer can access everything
      if (userRole === "super_admin" || userRole === "global_admin" || userRole === "developer") {
        req.userRole = userRole;
        return next();
      }

      // Get sub-community ID from request params or body
      const subCommunityId = req.params[subCommunityIdParam] || req.body.subCommunityId;
      
      if (!subCommunityId) {
        return res.status(400).json({ message: "Sub-community ID required" });
      }

      // Check if user is sub-community admin
      if (userRole === "sub_community_admin") {
        const isAdmin = await isSubCommunityAdmin(userId, subCommunityId);
        if (isAdmin) {
          req.userRole = userRole;
          req.subCommunityId = subCommunityId;
          return next();
        }
      }

      // Check if user is a community admin with parent access
      if (userRole === "community_admin") {
        const hasAccess = await hasParentCommunityAccess(userId, subCommunityId);
        if (hasAccess) {
          req.userRole = userRole;
          req.subCommunityId = subCommunityId;
          return next();
        }
      }

      return res.status(403).json({ message: "Not authorized for this sub-community" });
    } catch (error) {
      console.error("Error checking sub-community admin role:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
};

// Middleware to check if user is member of specific sub-community
export const requireSubCommunityMember = (subCommunityIdParam = "subCommunityId"): RequestHandler => {
  return async (req: any, res, next) => {
    if (!req.isAuthenticated() || !req.user?.claims?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const userRole = user.role as UserRole;
      
      // Super admin, global admin, and developer can access everything
      if (userRole === "super_admin" || userRole === "global_admin" || userRole === "developer") {
        req.userRole = userRole;
        return next();
      }

      // Get sub-community ID from request params or body
      const subCommunityId = req.params[subCommunityIdParam] || req.body.subCommunityId;
      
      if (!subCommunityId) {
        return res.status(400).json({ message: "Sub-community ID required" });
      }

      // Get the sub-community to find its parent
      const subCommunity = await db.select()
        .from(communities)
        .where(eq(communities.id, subCommunityId))
        .limit(1);

      if (!subCommunity.length) {
        return res.status(404).json({ message: "Sub-community not found" });
      }

      // Check if user is a member of the sub-community's parent community
      if (subCommunity[0].parentCommunityId) {
        const isMember = await storage.isCommunityMember(userId, subCommunity[0].parentCommunityId);
        
        // Also check if user has specific sub-community access
        const userCommunities = await storage.getUserCommunities(userId);
        const hasSubCommunityAccess = userCommunities.some(
          uc => uc.subCommunityId === subCommunityId
        );
        
        if (isMember || hasSubCommunityAccess) {
          req.userRole = userRole;
          req.subCommunityId = subCommunityId;
          return next();
        }
      }

      // Check if user is a sub-community admin for this sub-community
      if (userRole === "sub_community_admin" && await isSubCommunityAdmin(userId, subCommunityId)) {
        req.userRole = userRole;
        req.subCommunityId = subCommunityId;
        return next();
      }

      // Check if user is a community admin with parent access
      if (userRole === "community_admin" && await hasParentCommunityAccess(userId, subCommunityId)) {
        req.userRole = userRole;
        req.subCommunityId = subCommunityId;
        return next();
      }

      return res.status(403).json({ message: "Not a member of this sub-community" });
    } catch (error) {
      console.error("Error checking sub-community membership:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
};

// Helper function to check if user can manage a sub-community
export const canManageSubCommunity = async (userId: string, subCommunityId: string): Promise<boolean> => {
  try {
    const user = await storage.getUser(userId);
    
    if (!user) {
      return false;
    }

    const userRole = user.role as UserRole;
    
    // Super admin and developer can manage everything
    if (userRole === "super_admin" || userRole === "developer") {
      return true;
    }

    // Check if user is a sub-community admin for this specific sub-community
    if (userRole === "sub_community_admin") {
      return await isSubCommunityAdmin(userId, subCommunityId);
    }

    // Check if user is a community admin with parent access
    if (userRole === "community_admin") {
      return await hasParentCommunityAccess(userId, subCommunityId);
    }

    return false;
  } catch (error) {
    console.error("Error checking sub-community management access:", error);
    return false;
  }
};

// Helper function to check if user is admin of specific sub-community
export const isSubCommunityAdmin = async (userId: string, subCommunityId: string): Promise<boolean> => {
  try {
    const adminRecord = await db.select()
      .from(subCommunityAdmins)
      .where(
        and(
          eq(subCommunityAdmins.userId, userId),
          eq(subCommunityAdmins.subCommunityId, subCommunityId)
        )
      )
      .limit(1);

    return adminRecord.length > 0;
  } catch (error) {
    console.error("Error checking sub-community admin status:", error);
    return false;
  }
};

// Helper function to get the materialized path for permission checking
export const getSubCommunityPath = async (communityId: string): Promise<string | null> => {
  try {
    const community = await db.select()
      .from(communities)
      .where(eq(communities.id, communityId))
      .limit(1);

    if (!community.length) {
      return null;
    }

    return community[0].path || null;
  } catch (error) {
    console.error("Error getting sub-community path:", error);
    return null;
  }
};

// Helper function to check if user has access through parent community
export const hasParentCommunityAccess = async (userId: string, subCommunityId: string): Promise<boolean> => {
  try {
    // Get the sub-community details
    const subCommunity = await db.select()
      .from(communities)
      .where(eq(communities.id, subCommunityId))
      .limit(1);

    if (!subCommunity.length) {
      return false;
    }

    const subCommData = subCommunity[0];
    
    // If there's no parent, check if user is a community admin for this root community
    if (!subCommData.parentCommunityId) {
      return await storage.isCommunityAdmin(userId, subCommunityId);
    }

    // Check if user is admin of parent community
    const isParentAdmin = await storage.isCommunityAdmin(userId, subCommData.parentCommunityId);
    
    if (isParentAdmin) {
      return true;
    }

    // If the community has a path, check all ancestors in the hierarchy
    if (subCommData.path) {
      // Path format is typically like: /root_id/parent_id/sub_id
      const pathParts = subCommData.path.split('/').filter(p => p);
      
      // Check if user is admin of any ancestor community
      for (const ancestorId of pathParts) {
        if (ancestorId !== subCommunityId) {
          const isAncestorAdmin = await storage.isCommunityAdmin(userId, ancestorId);
          if (isAncestorAdmin) {
            return true;
          }
        }
      }
    }

    return false;
  } catch (error) {
    console.error("Error checking parent community access:", error);
    return false;
  }
};

// Middleware to check if user can access prompts in a sub-community
export const requireSubCommunityPromptAccess = (promptIdParam = "promptId"): RequestHandler => {
  return async (req: any, res, next) => {
    if (!req.isAuthenticated() || !req.user?.claims?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const userRole = user.role as UserRole;
      
      // Super admin, global admin, and developer can access everything
      if (userRole === "super_admin" || userRole === "global_admin" || userRole === "developer") {
        req.userRole = userRole;
        return next();
      }

      // Get prompt ID from request params
      const promptId = req.params[promptIdParam] || req.body.promptId;
      
      if (!promptId) {
        return res.status(400).json({ message: "Prompt ID required" });
      }

      // Get prompt details to check subCommunityId
      const prompt = await storage.getPrompt(promptId);
      
      if (!prompt) {
        return res.status(404).json({ message: "Prompt not found" });
      }

      // If prompt doesn't have a subCommunityId, no sub-community access control needed
      if (!prompt.subCommunityId) {
        // Check regular community access if communityId exists
        if ((prompt as any).communityId) {
          const isMember = await storage.isCommunityMember(userId, (prompt as any).communityId);
          if (isMember || prompt.isPublic) {
            req.userRole = userRole;
            return next();
          }
        } else if (prompt.isPublic || prompt.userId === userId) {
          req.userRole = userRole;
          return next();
        }
        return res.status(403).json({ message: "Access denied to this prompt" });
      }

      // Check sub-community access
      const hasAccess = await canAccessSubCommunityContent(userId, prompt.subCommunityId);
      
      if (hasAccess || prompt.userId === userId) {
        req.userRole = userRole;
        req.subCommunityId = prompt.subCommunityId;
        return next();
      }

      return res.status(403).json({ message: "Not authorized to access this sub-community prompt" });
    } catch (error) {
      console.error("Error checking sub-community prompt access:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
};

// Middleware to check if user can moderate content in a sub-community
export const requireSubCommunityModerator = (subCommunityIdParam = "subCommunityId"): RequestHandler => {
  return async (req: any, res, next) => {
    if (!req.isAuthenticated() || !req.user?.claims?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const userRole = user.role as UserRole;
      
      // Super admin and developer can moderate everything
      if (userRole === "super_admin" || userRole === "developer") {
        req.userRole = userRole;
        return next();
      }

      // Get sub-community ID from request params or body
      const subCommunityId = req.params[subCommunityIdParam] || req.body.subCommunityId;
      
      if (!subCommunityId) {
        return res.status(400).json({ message: "Sub-community ID required" });
      }

      // Check if user is a sub-community admin
      if (userRole === "sub_community_admin" && await isSubCommunityAdmin(userId, subCommunityId)) {
        req.userRole = userRole;
        req.subCommunityId = subCommunityId;
        return next();
      }

      // Check if user is a community admin with parent access
      if (userRole === "community_admin" && await hasParentCommunityAccess(userId, subCommunityId)) {
        req.userRole = userRole;
        req.subCommunityId = subCommunityId;
        return next();
      }

      // Check if user is explicitly assigned as moderator (if we have a moderator role)
      const subCommunity = await db.select()
        .from(communities)
        .where(eq(communities.id, subCommunityId))
        .limit(1);

      if (subCommunity.length && subCommunity[0].parentCommunityId) {
        // Check if user is admin of the parent community
        const isParentAdmin = await storage.isCommunityAdmin(userId, subCommunity[0].parentCommunityId);
        if (isParentAdmin) {
          req.userRole = userRole;
          req.subCommunityId = subCommunityId;
          return next();
        }
      }

      return res.status(403).json({ message: "Not authorized to moderate this sub-community" });
    } catch (error) {
      console.error("Error checking sub-community moderator permissions:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
};

// Middleware to check if user can create invites for a sub-community
export const requireSubCommunityInvitePermission = (subCommunityIdParam = "subCommunityId"): RequestHandler => {
  return async (req: any, res, next) => {
    if (!req.isAuthenticated() || !req.user?.claims?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const userRole = user.role as UserRole;
      
      // Super admin and developer can create invites for any sub-community
      if (userRole === "super_admin" || userRole === "developer") {
        req.userRole = userRole;
        return next();
      }

      // Get sub-community ID from request params or body
      const subCommunityId = req.params[subCommunityIdParam] || req.body.subCommunityId;
      
      if (!subCommunityId) {
        return res.status(400).json({ message: "Sub-community ID required" });
      }

      // Check if user is a sub-community admin for this specific sub-community
      if (userRole === "sub_community_admin" && await isSubCommunityAdmin(userId, subCommunityId)) {
        req.userRole = userRole;
        req.subCommunityId = subCommunityId;
        return next();
      }

      // Check if user is a community admin with parent access
      if (userRole === "community_admin" && await hasParentCommunityAccess(userId, subCommunityId)) {
        req.userRole = userRole;
        req.subCommunityId = subCommunityId;
        return next();
      }

      return res.status(403).json({ message: "Not authorized to create invites for this sub-community" });
    } catch (error) {
      console.error("Error checking sub-community invite permissions:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
};

// Helper function to check if user can access content in a sub-community
export const canAccessSubCommunityContent = async (userId: string, subCommunityId: string): Promise<boolean> => {
  try {
    const user = await storage.getUser(userId);
    
    if (!user) {
      return false;
    }

    const userRole = user.role as UserRole;
    
    // Super admin and developer can access everything
    if (userRole === "super_admin" || userRole === "developer") {
      return true;
    }

    // Check if user is a sub-community admin for this specific sub-community
    if (userRole === "sub_community_admin" && await isSubCommunityAdmin(userId, subCommunityId)) {
      return true;
    }

    // Check if user is a community admin with parent access
    if (userRole === "community_admin" && await hasParentCommunityAccess(userId, subCommunityId)) {
      return true;
    }

    // Get the sub-community details
    const subCommunity = await db.select()
      .from(communities)
      .where(eq(communities.id, subCommunityId))
      .limit(1);

    if (!subCommunity.length) {
      return false;
    }

    const subCommData = subCommunity[0];

    // Check if user is a member of the sub-community directly
    const userCommunities = await storage.getUserCommunities(userId);
    const hasDirectAccess = userCommunities.some(
      uc => uc.subCommunityId === subCommunityId
    );
    
    if (hasDirectAccess) {
      return true;
    }

    // Check if user is a member of the parent community (for limited access to public content)
    if (subCommData.parentCommunityId) {
      const isParentMember = await storage.isCommunityMember(userId, subCommData.parentCommunityId);
      
      // Parent community members can access public sub-community content
      if (isParentMember && (subCommData as any).isPublic) {
        return true;
      }

      // Check all ancestors in the hierarchy using the path
      if (subCommData.path) {
        const pathParts = subCommData.path.split('/').filter(p => p);
        for (const ancestorId of pathParts) {
          if (ancestorId !== subCommunityId) {
            const isAncestorMember = await storage.isCommunityMember(userId, ancestorId);
            if (isAncestorMember && (subCommData as any).isPublic) {
              return true;
            }
          }
        }
      }
    }

    return false;
  } catch (error) {
    console.error("Error checking sub-community content access:", error);
    return false;
  }
};

// Comprehensive permission check function for sub-communities
export const checkSubCommunityPermission = async (
  userId: string, 
  subCommunityId: string, 
  permission: 'read' | 'write' | 'moderate' | 'admin' | 'invite'
): Promise<boolean> => {
  try {
    const user = await storage.getUser(userId);
    
    if (!user) {
      return false;
    }

    const userRole = user.role as UserRole;
    
    // Super admin and developer have all permissions
    if (userRole === "super_admin" || userRole === "developer") {
      return true;
    }

    // Get sub-community details
    const subCommunity = await db.select()
      .from(communities)
      .where(eq(communities.id, subCommunityId))
      .limit(1);

    if (!subCommunity.length) {
      return false;
    }

    const subCommData = subCommunity[0];

    // Check permission levels
    switch (permission) {
      case 'read':
        // Most permissive - members, parent members (for public), admins
        if (await canAccessSubCommunityContent(userId, subCommunityId)) {
          return true;
        }
        // Check if it's a public sub-community and user is authenticated
        return (subCommData as any).isPublic;

      case 'write':
        // Members, sub-community admins, parent admins
        // Check direct membership
        const userCommunities = await storage.getUserCommunities(userId);
        const hasDirectMembership = userCommunities.some(
          uc => uc.subCommunityId === subCommunityId
        );
        
        if (hasDirectMembership) {
          return true;
        }
        
        // Check admin privileges
        if (userRole === "sub_community_admin" && await isSubCommunityAdmin(userId, subCommunityId)) {
          return true;
        }
        
        if (userRole === "community_admin" && await hasParentCommunityAccess(userId, subCommunityId)) {
          return true;
        }
        
        return false;

      case 'moderate':
        // Sub-community admins and parent community admins
        if (userRole === "sub_community_admin" && await isSubCommunityAdmin(userId, subCommunityId)) {
          return true;
        }
        
        if (userRole === "community_admin" && await hasParentCommunityAccess(userId, subCommunityId)) {
          return true;
        }
        
        // Check if user is admin of parent community directly
        if (subCommData.parentCommunityId) {
          return await storage.isCommunityAdmin(userId, subCommData.parentCommunityId);
        }
        
        return false;

      case 'admin':
      case 'invite':
        // Only sub-community admins and parent community admins
        if (userRole === "sub_community_admin" && await isSubCommunityAdmin(userId, subCommunityId)) {
          return true;
        }
        
        if (userRole === "community_admin" && await hasParentCommunityAccess(userId, subCommunityId)) {
          return true;
        }
        
        return false;

      default:
        return false;
    }
  } catch (error) {
    console.error(`Error checking sub-community permission '${permission}':`, error);
    return false;
  }
};

// Enhanced version of requireSubCommunityMember with parent community support
export const requireSubCommunityMemberEnhanced = (subCommunityIdParam = "subCommunityId"): RequestHandler => {
  return async (req: any, res, next) => {
    if (!req.isAuthenticated() || !req.user?.claims?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const userRole = user.role as UserRole;
      
      // Super admin, global admin, and developer can access everything
      if (userRole === "super_admin" || userRole === "global_admin" || userRole === "developer") {
        req.userRole = userRole;
        return next();
      }

      // Get sub-community ID from request params or body
      const subCommunityId = req.params[subCommunityIdParam] || req.body.subCommunityId;
      
      if (!subCommunityId) {
        return res.status(400).json({ message: "Sub-community ID required" });
      }

      // Get the sub-community to check its visibility and parent
      const subCommunity = await db.select()
        .from(communities)
        .where(eq(communities.id, subCommunityId))
        .limit(1);

      if (!subCommunity.length) {
        return res.status(404).json({ message: "Sub-community not found" });
      }

      const subCommData = subCommunity[0];

      // Check direct sub-community membership
      const userCommunities = await storage.getUserCommunities(userId);
      const hasDirectAccess = userCommunities.some(
        uc => uc.subCommunityId === subCommunityId
      );
      
      if (hasDirectAccess) {
        req.userRole = userRole;
        req.subCommunityId = subCommunityId;
        req.accessLevel = 'member';
        return next();
      }

      // Check if user is a sub-community admin
      if (userRole === "sub_community_admin" && await isSubCommunityAdmin(userId, subCommunityId)) {
        req.userRole = userRole;
        req.subCommunityId = subCommunityId;
        req.accessLevel = 'admin';
        return next();
      }

      // Check if user is a community admin with parent access
      if (userRole === "community_admin" && await hasParentCommunityAccess(userId, subCommunityId)) {
        req.userRole = userRole;
        req.subCommunityId = subCommunityId;
        req.accessLevel = 'parent_admin';
        return next();
      }

      // Check if user is a member of the parent community (limited access for public sub-communities)
      if (subCommData.parentCommunityId && (subCommData as any).isPublic) {
        const isParentMember = await storage.isCommunityMember(userId, subCommData.parentCommunityId);
        
        if (isParentMember) {
          req.userRole = userRole;
          req.subCommunityId = subCommunityId;
          req.accessLevel = 'parent_member';
          req.limitedAccess = true; // Flag for limited access
          return next();
        }
      }

      return res.status(403).json({ message: "Not a member of this sub-community" });
    } catch (error) {
      console.error("Error checking enhanced sub-community membership:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
};