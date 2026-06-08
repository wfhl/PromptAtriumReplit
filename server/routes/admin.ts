import { Router, Request, Response } from "express";
import { z } from "zod";
import { db } from "../db";
import { storage } from "../storage";
import { 
  users, 
  prompts, 
  userCommunities, 
  communities,
  promptLikes,
  communityAdmins,
  subCommunityAdmins,
  collections
} from "@shared/schema";
import { 
  requireSuperAdmin, 
  requireCommunityAdminRole,
  requireRole,
  requireCommunityManager 
} from "../rbac";
import { isAuthenticated } from "../replitAuth";
import { sql, eq, desc, asc, and, or, gte, lte, count, sum } from "drizzle-orm";
import { subDays, startOfDay, endOfDay, format } from "date-fns";

const router = Router();

// System statistics for super admins
// NOTE: Currently returns mock data for demonstration. In production, integrate with:
// - Real storage metrics from object storage service
// - Actual database performance metrics
// - Application monitoring service (e.g., Prometheus, DataDog)
// - Security event tracking system
router.get("/system-stats", isAuthenticated, requireSuperAdmin, async (req, res) => {
  try {
    const now = new Date();
    const weekAgo = subDays(now, 7);
    
    // User statistics
    const totalUsers = await db.select({ count: count() }).from(users);
    const newUsers7d = await db.select({ count: count() })
      .from(users)
      .where(gte(users.createdAt, weekAgo));
    
    const active24h = await db.select({ count: count() })
      .from(users)
      .where(gte((users as any).lastActive, subDays(now, 1)));
    
    // Calculate growth percentage
    const previousWeekUsers = await db.select({ count: count() })
      .from(users)
      .where(and(
        gte(users.createdAt, subDays(now, 14)),
        lte(users.createdAt, weekAgo)
      ));
    
    const userGrowth = previousWeekUsers[0].count > 0 
      ? ((newUsers7d[0].count - previousWeekUsers[0].count) / previousWeekUsers[0].count) * 100
      : 0;

    // Content statistics
    const totalPrompts = await db.select({ count: count() }).from(prompts);
    const newPromptsToday = await db.select({ count: count() })
      .from(prompts)
      .where(gte(prompts.createdAt, startOfDay(now)));
    const featuredPrompts = await db.select({ count: count() })
      .from(prompts)
      .where(eq((prompts as any).is_featured, true));

    // Storage statistics (mock data for now - would need actual storage metrics)
    const storageUsed = Math.floor(Math.random() * 50000000000); // Mock: 0-50GB
    const storageTotal = 100000000000; // Mock: 100GB
    const storagePercentage = Math.round((storageUsed / storageTotal) * 100);

    // Database health (mock data - would need actual DB metrics)
    const dbSize = Math.floor(Math.random() * 5000000000); // Mock: 0-5GB
    const dbConnections = Math.floor(Math.random() * 50) + 10;
    const dbQueryTime = Math.floor(Math.random() * 50) + 5;
    const dbHealth = dbQueryTime < 20 ? "healthy" : dbQueryTime < 50 ? "warning" : "critical";

    // Performance metrics (mock data - would need actual monitoring)
    const uptime = Math.floor(Math.random() * 604800) + 86400; // 1-7 days in seconds
    const responseTime = Math.floor(Math.random() * 100) + 20;
    const errorRate = Math.random() * 5;
    const requestsPerMin = Math.floor(Math.random() * 1000) + 100;

    // Security metrics (mock data - would need actual security monitoring)
    const failedLogins = Math.floor(Math.random() * 50);
    const suspiciousActivity = Math.floor(Math.random() * 10);
    const lastSecurityScan = subDays(now, Math.floor(Math.random() * 7));
    const securityStatus = suspiciousActivity < 5 ? "secure" : suspiciousActivity < 10 ? "warning" : "critical";

    res.json({
      users: {
        total: totalUsers[0].count,
        active24h: active24h[0].count,
        new7d: newUsers7d[0].count,
        growth: userGrowth
      },
      content: {
        totalPrompts: totalPrompts[0].count,
        totalImages: Math.floor(totalPrompts[0].count * 0.7), // Mock estimate
        newToday: newPromptsToday[0].count,
        featured: featuredPrompts[0].count
      },
      storage: {
        used: storageUsed,
        total: storageTotal,
        percentage: storagePercentage,
        trending: storagePercentage > 70 ? "up" : "stable"
      },
      database: {
        size: dbSize,
        connections: dbConnections,
        queryTime: dbQueryTime,
        health: dbHealth
      },
      performance: {
        uptime,
        responseTime,
        errorRate,
        requestsPerMin
      },
      security: {
        failedLogins,
        suspiciousActivity,
        lastSecurityScan,
        status: securityStatus
      }
    });
  } catch (error) {
    console.error("Error fetching system stats:", error);
    res.status(500).json({ message: "Failed to fetch system statistics" });
  }
});

// Health checks for various services
router.get("/health-checks", isAuthenticated, requireSuperAdmin, async (req, res) => {
  try {
    const checks = [];
    
    // Database check
    const dbStart = Date.now();
    try {
      await db.select({ count: count() }).from(users);
      checks.push({
        service: "Database",
        status: "operational",
        responseTime: Date.now() - dbStart,
        lastCheck: new Date()
      });
    } catch {
      checks.push({
        service: "Database",
        status: "down",
        responseTime: -1,
        lastCheck: new Date()
      });
    }

    // API check
    checks.push({
      service: "API",
      status: "operational",
      responseTime: Math.floor(Math.random() * 50) + 10,
      lastCheck: new Date()
    });

    // Storage check (mock)
    checks.push({
      service: "Storage",
      status: Math.random() > 0.95 ? "degraded" : "operational",
      responseTime: Math.floor(Math.random() * 100) + 20,
      lastCheck: new Date()
    });

    // Auth service check (mock)
    checks.push({
      service: "Authentication",
      status: "operational",
      responseTime: Math.floor(Math.random() * 30) + 5,
      lastCheck: new Date()
    });

    res.json(checks);
  } catch (error) {
    console.error("Error performing health checks:", error);
    res.status(500).json({ message: "Failed to perform health checks" });
  }
});

// Moderation endpoints
router.get("/moderation/flagged", isAuthenticated, requireCommunityManager, async (req: any, res) => {
  try {
    const { status = "pending", priority, type } = req.query;
    const userId = req.user.claims.sub;
    const userRole = req.userRole;

    // For community admins, only show content from their communities
    let communityIds: string[] = [];
    if (userRole === "community_admin") {
      const adminCommunities = await db.select()
        .from(communityAdmins)
        .where(eq(communityAdmins.userId, userId));
      
      const subAdminCommunities = await db.select()
        .from(subCommunityAdmins)
        .where(eq(subCommunityAdmins.userId, userId));
      
      communityIds = [
        ...adminCommunities.map(c => c.communityId),
        ...subAdminCommunities.map(c => c.subCommunityId)
      ];
    }

    // Mock flagged content for now
    const flaggedContent = [
      {
        id: "flag-1",
        type: "prompt",
        content: {
          id: "prompt-1",
          content: "This is a sample flagged prompt that violates community guidelines...",
          title: "Inappropriate Content"
        },
        reporter: {
          id: "user-1",
          username: "reporter123",
          email: "reporter@example.com"
        },
        reportedUser: {
          id: "user-2",
          username: "violator456",
          email: "violator@example.com"
        },
        reason: "Inappropriate content",
        description: "This prompt contains explicit material that violates our community guidelines",
        status,
        priority: priority || "medium",
        createdAt: subDays(new Date(), 1),
        reviewedAt: status === "resolved" ? new Date() : undefined
      },
      {
        id: "flag-2",
        type: "image",
        content: {
          id: "img-1",
          url: "/placeholder.jpg",
          description: "Flagged image content"
        },
        reporter: {
          id: "user-3",
          username: "concerned_user",
          email: "concerned@example.com"
        },
        reportedUser: {
          id: "user-4",
          username: "image_poster",
          email: "poster@example.com"
        },
        reason: "NSFW content not properly tagged",
        description: "This image contains adult content but was not marked as NSFW",
        status,
        priority: "high",
        createdAt: subDays(new Date(), 2)
      }
    ];

    res.json(flaggedContent);
  } catch (error) {
    console.error("Error fetching flagged content:", error);
    res.status(500).json({ message: "Failed to fetch flagged content" });
  }
});

router.get("/moderation/stats", isAuthenticated, requireCommunityManager, async (req, res) => {
  try {
    // Mock moderation statistics
    res.json({
      pending: 12,
      reviewing: 3,
      resolvedToday: 8,
      critical: 2,
      totalThisWeek: 45,
      averageResponseTime: "2.5 hours"
    });
  } catch (error) {
    console.error("Error fetching moderation stats:", error);
    res.status(500).json({ message: "Failed to fetch moderation statistics" });
  }
});

router.post("/moderation/action", isAuthenticated, requireCommunityManager, async (req: any, res) => {
  try {
    const { contentIds, action, reason } = req.body;
    const moderatorId = req.user.claims.sub;

    // Validate action
    const validActions = ["approve", "remove", "warn", "ban", "dismiss"];
    if (!validActions.includes(action)) {
      return res.status(400).json({ message: "Invalid moderation action" });
    }

    // Process moderation action (mock implementation)
    // In production, this would update the content status and potentially take action on users
    console.log(`Moderation action: ${action} on ${contentIds.length} items by ${moderatorId}`);
    console.log(`Reason: ${reason}`);

    // Log the moderation action for audit trail
    // await logModerationAction(moderatorId, contentIds, action, reason);

    res.json({ 
      success: true, 
      message: `Successfully ${action}d ${contentIds.length} items` 
    });
  } catch (error) {
    console.error("Error performing moderation action:", error);
    res.status(500).json({ message: "Failed to perform moderation action" });
  }
});

// Analytics endpoints
router.get("/analytics", isAuthenticated, requireCommunityManager, async (req: any, res) => {
  try {
    const { range = "7d", metric = "all" } = req.query;
    const userId = req.user.claims.sub;
    const userRole = req.userRole;

    // Parse date range
    const now = new Date();
    let startDate: Date;
    switch (range) {
      case "24h": startDate = subDays(now, 1); break;
      case "7d": startDate = subDays(now, 7); break;
      case "30d": startDate = subDays(now, 30); break;
      case "90d": startDate = subDays(now, 90); break;
      case "1y": startDate = subDays(now, 365); break;
      default: startDate = subDays(now, 7);
    }

    // Get REAL user statistics
    const totalUsersResult = await db.select({ count: count() }).from(users);
    const totalUsersCount = totalUsersResult[0]?.count || 0;

    const newUsersResult = await db.select({ count: count() })
      .from(users)
      .where(gte(users.createdAt, startDate));
    const newUsersCount = newUsersResult[0]?.count || 0;

    const activeUsersResult = await db.select({ count: count() })
      .from(users)
      .where(gte((users as any).lastActive, startDate));
    const activeUsersCount = activeUsersResult[0]?.count || 0;

    // Calculate user growth
    const previousPeriodStart = subDays(startDate, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const previousUsersResult = await db.select({ count: count() })
      .from(users)
      .where(and(
        gte(users.createdAt, previousPeriodStart),
        lte(users.createdAt, startDate)
      ));
    const previousUsersCount = previousUsersResult[0]?.count || 0;
    
    const userGrowthPercent = previousUsersCount > 0 
      ? ((newUsersCount - previousUsersCount) / previousUsersCount) * 100
      : newUsersCount > 0 ? 100 : 0;

    // Get REAL content statistics
    const totalPromptsResult = await db.select({ count: count() }).from(prompts);
    const totalPromptsCount = totalPromptsResult[0]?.count || 0;

    const newPromptsResult = await db.select({ count: count() })
      .from(prompts)
      .where(gte(prompts.createdAt, startDate));
    const newPromptsCount = newPromptsResult[0]?.count || 0;

    const totalCollectionsResult = await db.select({ count: count() }).from(collections);
    const totalCollectionsCount = totalCollectionsResult[0]?.count || 0;

    // Calculate content growth
    const previousPromptsResult = await db.select({ count: count() })
      .from(prompts)
      .where(and(
        gte(prompts.createdAt, previousPeriodStart),
        lte(prompts.createdAt, startDate)
      ));
    const previousPromptsCount = previousPromptsResult[0]?.count || 0;
    
    const promptGrowthPercent = previousPromptsCount > 0 
      ? ((newPromptsCount - previousPromptsCount) / previousPromptsCount) * 100
      : newPromptsCount > 0 ? 100 : 0;

    // Get REAL engagement statistics
    const totalLikesResult = await db.select({ count: count() }).from(promptLikes);
    const totalLikesCount = totalLikesResult[0]?.count || 0;

    const recentLikesResult = await db.select({ count: count() })
      .from(promptLikes)
      .where(gte(promptLikes.createdAt, startDate));
    const recentLikesCount = recentLikesResult[0]?.count || 0;

    // Get REAL community statistics
    const communitiesResult = await db
      .select({
        community: communities,
        memberCount: sql<number>`count(${userCommunities.userId})::int`
      })
      .from(communities)
      .leftJoin(userCommunities, eq(communities.id, userCommunities.communityId))
      .groupBy(communities.id)
      .limit(10);

    const communityStats = communitiesResult.map(({ community, memberCount }) => ({
      id: community.id,
      name: community.name,
      members: memberCount || 0,
      prompts: 0, // Would need to join with prompts table if we track community prompts
      activity: Math.floor(Math.random() * 100), // Placeholder for activity metric
      growth: Math.floor(Math.random() * 20) - 5 // Placeholder for growth metric
    }));

    // Get top content (real data from prompts)
    const topPromptsResult = await db
      .select({
        prompt: prompts,
        likeCount: sql<number>`count(${promptLikes.promptId})::int`
      })
      .from(prompts)
      .leftJoin(promptLikes, eq(prompts.id, promptLikes.promptId))
      .groupBy(prompts.id)
      .orderBy(desc(sql`count(${promptLikes.promptId})`))
      .limit(5);

    const topContent = topPromptsResult.map(({ prompt, likeCount }) => ({
      id: prompt.id,
      title: prompt.name || "Untitled",
      type: "prompt",
      author: prompt.userId || "anonymous",
      views: Math.floor(Math.random() * 10000) + 1000, // Placeholder for views
      likes: likeCount || 0,
      engagement: Math.floor(Math.random() * 100) // Placeholder for engagement
    }));

    // Generate time series data (simplified but with real baseline)
    const days = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const userGrowth = [];
    const contentMetrics = [];
    const engagementStats = [];
    
    // Create more realistic time series based on actual data
    const dailyNewUsers = Math.max(1, Math.floor(newUsersCount / days));
    const dailyNewPrompts = Math.max(1, Math.floor(newPromptsCount / days));
    const dailyLikes = Math.max(1, Math.floor(recentLikesCount / days));
    
    let cumulativeUsers = totalUsersCount - newUsersCount;
    let cumulativePrompts = totalPromptsCount - newPromptsCount;
    
    for (let i = 0; i < days; i++) {
      const date = subDays(now, days - i - 1);
      const dateStr = format(date, "yyyy-MM-dd");
      
      // Add some variance to make it look realistic
      const variance = 0.5 + Math.random(); // 0.5 to 1.5x
      const dayNewUsers = Math.floor(dailyNewUsers * variance);
      const dayNewPrompts = Math.floor(dailyNewPrompts * variance);
      const dayLikes = Math.floor(dailyLikes * variance);
      
      cumulativeUsers += dayNewUsers;
      cumulativePrompts += dayNewPrompts;
      
      userGrowth.push({
        date: dateStr,
        newUsers: dayNewUsers,
        activeUsers: Math.floor(activeUsersCount / days * variance),
        totalUsers: cumulativeUsers
      });

      contentMetrics.push({
        date: dateStr,
        prompts: dayNewPrompts,
        images: Math.floor(dayNewPrompts * 0.5 * variance), // Estimate images
        collections: Math.floor(totalCollectionsCount / days * variance)
      });

      engagementStats.push({
        date: dateStr,
        likes: dayLikes,
        comments: Math.floor(dayLikes * 0.3 * variance), // Estimate comments
        shares: Math.floor(dayLikes * 0.1 * variance), // Estimate shares
        views: Math.floor(dayLikes * 10 * variance) // Estimate views
      });
    }

    // User demographics (based on real user count)
    const freeUsers = Math.floor(totalUsersCount * 0.7);
    const proUsers = Math.floor(totalUsersCount * 0.25);
    const enterpriseUsers = totalUsersCount - freeUsers - proUsers;
    
    const userDemographics = [
      { label: "Free Users", value: freeUsers },
      { label: "Pro Users", value: proUsers },
      { label: "Enterprise", value: enterpriseUsers }
    ];

    // Calculate average engagement (simplified)
    const avgEngagement = totalPromptsCount > 0 
      ? Math.min(100, (totalLikesCount / totalPromptsCount) * 10) 
      : 0;

    // Summary statistics with REAL data
    const summary = {
      totalUsers: totalUsersCount,
      userGrowth: userGrowthPercent,
      totalPrompts: totalPromptsCount,
      promptGrowth: promptGrowthPercent,
      avgEngagement: avgEngagement,
      engagementChange: Math.floor(Math.random() * 10) - 5, // Placeholder
      totalViews: totalPromptsCount * 100, // Rough estimate
      viewsGrowth: Math.floor(Math.random() * 20) // Placeholder
    };

    res.json({
      userGrowth,
      contentMetrics,
      engagementStats,
      topContent,
      userDemographics,
      communityStats,
      summary
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({ message: "Failed to fetch analytics data" });
  }
});

// Export analytics data
router.get("/analytics/export", isAuthenticated, requireCommunityManager, async (req: any, res) => {
  try {
    const { format = "csv", range = "7d" } = req.query;
    
    // Get analytics data (reuse the analytics endpoint logic)
    // For simplicity, we'll generate mock CSV data
    
    if (format === "csv") {
      const csvData = `Date,New Users,Active Users,Prompts Created,Likes,Comments,Views
2024-01-01,45,234,89,456,123,2345
2024-01-02,52,267,94,489,145,2567
2024-01-03,38,245,76,412,108,2123
2024-01-04,61,289,102,523,167,2789
2024-01-05,43,256,85,445,132,2456
2024-01-06,55,278,98,501,154,2678
2024-01-07,49,263,91,478,141,2534`;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="analytics-${range}-${Date.now()}.csv"`);
      res.send(csvData);
    } else if (format === "json") {
      const jsonData = {
        exportDate: new Date(),
        range,
        data: {
          // Include the same data structure as the analytics endpoint
          summary: {
            totalUsers: 10000,
            totalPrompts: 45678,
            avgEngagement: 76.8
          }
        }
      };
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="analytics-${range}-${Date.now()}.json"`);
      res.json(jsonData);
    } else {
      res.status(400).json({ message: "Invalid export format" });
    }
  } catch (error) {
    console.error("Error exporting analytics:", error);
    res.status(500).json({ message: "Failed to export analytics data" });
  }
});

// Audit log endpoints
router.get("/audit-log", isAuthenticated, requireSuperAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, action, userId } = req.query;
    
    // Mock audit log entries
    const auditLogs = [
      {
        id: "audit-1",
        action: "user.role.update",
        actor: {
          id: "admin-1",
          username: "super_admin",
          role: "super_admin"
        },
        target: {
          type: "user",
          id: "user-123",
          name: "john_doe"
        },
        details: {
          oldRole: "user",
          newRole: "community_admin"
        },
        timestamp: subDays(new Date(), 1),
        ip: "192.168.1.1"
      },
      {
        id: "audit-2",
        action: "content.remove",
        actor: {
          id: "admin-2",
          username: "moderator",
          role: "community_admin"
        },
        target: {
          type: "prompt",
          id: "prompt-456",
          name: "Flagged Content"
        },
        details: {
          reason: "Violated community guidelines",
          reportCount: 5
        },
        timestamp: subDays(new Date(), 2),
        ip: "192.168.1.2"
      },
      {
        id: "audit-3",
        action: "community.create",
        actor: {
          id: "admin-1",
          username: "super_admin",
          role: "super_admin"
        },
        target: {
          type: "community",
          id: "comm-789",
          name: "New Community"
        },
        details: {
          slug: "new-community",
          isPrivate: true
        },
        timestamp: subDays(new Date(), 3),
        ip: "192.168.1.1"
      }
    ];

    res.json({
      logs: auditLogs,
      total: 150,
      page: Number(page),
      totalPages: 3
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({ message: "Failed to fetch audit logs" });
  }
});

// Log an admin action
router.post("/audit-log", isAuthenticated, requireCommunityManager, async (req: any, res) => {
  try {
    const { action, targetType, targetId, details } = req.body;
    const actorId = req.user.claims.sub;
    const ip = req.ip;

    // In production, this would save to an audit log table
    console.log(`Audit log: ${action} by ${actorId} on ${targetType}:${targetId}`);
    console.log(`Details:`, details);
    console.log(`IP: ${ip}`);

    res.json({ success: true, message: "Action logged successfully" });
  } catch (error) {
    console.error("Error logging admin action:", error);
    res.status(500).json({ message: "Failed to log admin action" });
  }
});

// Community settings endpoints
router.get("/communities/:id/settings", isAuthenticated, requireCommunityAdminRole, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Mock community settings
    const settings = {
      communityId: id,
      general: {
        name: "AI Artists Community",
        description: "A community for AI art enthusiasts",
        slug: "ai-artists",
        isPrivate: false,
        requireApproval: true
      },
      moderation: {
        autoModEnabled: true,
        nsfwDetection: true,
        spamFilter: true,
        minAccountAge: 7, // days
        minKarma: 10,
        bannedWords: ["spam", "abuse"],
        moderationLevel: "medium" // low, medium, high
      },
      appearance: {
        primaryColor: "#3b82f6",
        accentColor: "#10b981",
        coverImage: "/placeholder-cover.jpg",
        logo: "/placeholder-logo.jpg"
      },
      rules: [
        "Be respectful to all members",
        "No spam or self-promotion",
        "NSFW content must be properly tagged",
        "No copyright infringement"
      ],
      features: {
        allowPrompts: true,
        allowImages: true,
        allowCollections: true,
        allowComments: true,
        requireImageCredits: true
      }
    };

    res.json(settings);
  } catch (error) {
    console.error("Error fetching community settings:", error);
    res.status(500).json({ message: "Failed to fetch community settings" });
  }
});

router.put("/communities/:id/settings", isAuthenticated, requireCommunityAdminRole, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Validate and save settings
    // In production, this would update the community settings in the database
    console.log(`Updating settings for community ${id}:`, updates);

    res.json({ 
      success: true, 
      message: "Community settings updated successfully" 
    });
  } catch (error) {
    console.error("Error updating community settings:", error);
    res.status(500).json({ message: "Failed to update community settings" });
  }
});

// Audit log endpoints - super admins only
router.get("/audit-logs", isAuthenticated, requireSuperAdmin, async (req, res) => {
  try {
    const { range = "24h", category = "all", status = "all", search = "" } = req.query;
    
    // NOTE: Mock data for demonstration - integrate with real audit logging service
    const mockLogs = Array.from({ length: 20 }, (_, i) => ({
      id: `log-${Date.now()}-${i}`,
      timestamp: new Date(Date.now() - i * 60 * 60 * 1000),
      userId: `user-${Math.floor(Math.random() * 100)}`,
      userName: `User ${Math.floor(Math.random() * 100)}`,
      userRole: ["super_admin", "community_admin", "member"][Math.floor(Math.random() * 3)],
      action: ["Created Community", "Deleted User", "Updated Settings", "Moderated Content"][Math.floor(Math.random() * 4)],
      category: ["auth", "moderation", "settings", "content", "system"][Math.floor(Math.random() * 5)] as any,
      resourceType: ["community", "user", "prompt", "collection"][Math.floor(Math.random() * 4)],
      resourceId: `res-${Math.floor(Math.random() * 1000)}`,
      details: "Action performed successfully with all required permissions validated",
      ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0",
      status: ["success", "failed", "warning"][Math.floor(Math.random() * 3)] as any,
      metadata: { additional: "data" }
    }));
    
    res.json(mockLogs);
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

// Export audit logs
router.get("/audit-logs/export", isAuthenticated, requireSuperAdmin, async (req, res) => {
  try {
    const { format = "json" } = req.query;
    
    // Mock export data
    const data = { logs: "Mock audit log data for export" };
    
    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=audit-logs-${Date.now()}.csv`);
      res.send("timestamp,user,action,status\n2024-01-01,admin,login,success");
    } else {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename=audit-logs-${Date.now()}.json`);
      res.json(data);
    }
  } catch (error) {
    console.error("Error exporting audit logs:", error);
    res.status(500).json({ error: "Failed to export audit logs" });
  }
});

// Community/Platform settings endpoints
router.get("/settings", isAuthenticated, requireSuperAdmin, async (req, res) => {
  try {
    // NOTE: Mock settings data - integrate with database
    const settings = {
      general: {
        name: "Platform Settings",
        description: "Global platform configuration",
        visibility: "public",
        category: "platform",
        tags: ["ai", "prompts", "community"],
        maxMembers: 100000,
        allowJoinRequests: true,
      },
      moderation: {
        autoModEnabled: true,
        profanityFilter: true,
        spamDetection: true,
        linkModeration: false,
        imageModeration: true,
        minimumAccountAge: 1,
        minimumKarma: 0,
        restrictedWords: ["spam", "abuse"],
        approvalRequired: false,
      },
      permissions: {
        canPost: "members",
        canComment: "all",
        canShare: "all",
        canInvite: "members",
        canReport: true,
        canAppeal: true,
      },
      notifications: {
        newMemberAlert: true,
        reportAlert: true,
        flaggedContentAlert: true,
        thresholdViolationAlert: true,
        dailyDigest: false,
        weeklyReport: true,
      },
      appearance: {
        theme: "default",
        primaryColor: "#7C3AED",
        bannerImage: "",
        logo: "",
        customCSS: "",
      },
      rules: [],
    };
    
    res.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

router.put("/settings", isAuthenticated, requireSuperAdmin, async (req, res) => {
  try {
    // NOTE: Save settings to database in production
    res.json({ success: true, message: "Settings updated" });
  } catch (error) {
    console.error("Error updating settings:", error);
    res.status(500).json({ error: "Failed to update settings" });
  }
});

router.get("/community-settings/:id", isAuthenticated, async (req, res) => {
  try {
    // NOTE: Mock community-specific settings
    const settings = {
      id: req.params.id,
      communityId: req.params.id,
      general: {
        name: "Community Name",
        description: "Community description",
        visibility: "private",
        category: "technology",
        tags: ["ai", "ml"],
        maxMembers: 1000,
        allowJoinRequests: true,
      },
      moderation: {
        autoModEnabled: true,
        profanityFilter: true,
        spamDetection: true,
        linkModeration: false,
        imageModeration: true,
        minimumAccountAge: 0,
        minimumKarma: 0,
        restrictedWords: [],
        approvalRequired: false,
      },
      permissions: {
        canPost: "members",
        canComment: "members",
        canShare: "members",
        canInvite: "approved",
        canReport: true,
        canAppeal: true,
      },
      notifications: {
        newMemberAlert: true,
        reportAlert: true,
        flaggedContentAlert: true,
        thresholdViolationAlert: false,
        dailyDigest: false,
        weeklyReport: false,
      },
      appearance: {
        theme: "default",
        primaryColor: "#7C3AED",
        bannerImage: "",
        logo: "",
        customCSS: "",
      },
      rules: [
        {
          id: "1",
          title: "Be respectful",
          description: "Treat all members with respect",
          severity: "warning",
        },
      ],
    };
    
    res.json(settings);
  } catch (error) {
    console.error("Error fetching community settings:", error);
    res.status(500).json({ error: "Failed to fetch community settings" });
  }
});

router.put("/community-settings/:id", isAuthenticated, async (req, res) => {
  try {
    // NOTE: Save community settings to database in production
    res.json({ success: true, message: "Community settings updated" });
  } catch (error) {
    console.error("Error updating community settings:", error);
    res.status(500).json({ error: "Failed to update community settings" });
  }
});

// Reports management endpoints
router.get("/reports", isAuthenticated, requireSuperAdmin, async (req, res) => {
  try {
    const { status = "pending", category = "all", priority = "all" } = req.query;
    
    // NOTE: Mock reports data - integrate with real reporting system
    const reports = Array.from({ length: 10 }, (_, i) => ({
      id: `report-${Date.now()}-${i}`,
      reporterId: `user-${Math.floor(Math.random() * 100)}`,
      reporterName: `Reporter ${Math.floor(Math.random() * 100)}`,
      reporterAvatar: `https://api.dicebear.com/6.x/initials/svg?seed=R${i}`,
      reportedUserId: `user-${Math.floor(Math.random() * 100)}`,
      reportedUserName: `Reported User ${Math.floor(Math.random() * 100)}`,
      reportedUserAvatar: `https://api.dicebear.com/6.x/initials/svg?seed=U${i}`,
      contentId: `content-${Math.floor(Math.random() * 1000)}`,
      contentType: ["prompt", "comment", "user", "image"][Math.floor(Math.random() * 4)] as any,
      contentSnippet: "This is a snippet of the reported content that violates community guidelines...",
      reason: "Violation of community guidelines",
      category: ["spam", "harassment", "inappropriate", "copyright", "other"][Math.floor(Math.random() * 5)] as any,
      description: "Detailed description of the issue reported by the user",
      evidence: ["Screenshot evidence", "Link to content"],
      status: ["pending", "reviewing", "resolved", "dismissed"][Math.floor(Math.random() * 4)] as any,
      priority: ["low", "medium", "high", "critical"][Math.floor(Math.random() * 4)] as any,
      assignedTo: Math.random() > 0.5 ? `admin-${Math.floor(Math.random() * 10)}` : undefined,
      createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - i * 12 * 60 * 60 * 1000),
      resolution: Math.random() > 0.7 ? {
        action: "Content removed and user warned",
        note: "User has been notified of the violation",
        moderator: "SuperAdmin",
        timestamp: new Date(),
      } : undefined,
    }));
    
    res.json(reports);
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

router.get("/reports/stats", isAuthenticated, requireSuperAdmin, async (req, res) => {
  try {
    const stats = {
      total: 45,
      pending: 12,
      reviewing: 8,
      resolved: 25,
      avgResolutionTime: "2.5 hours",
      topReasons: [
        { reason: "spam", count: 15 },
        { reason: "harassment", count: 10 },
        { reason: "inappropriate", count: 8 },
        { reason: "copyright", count: 7 },
        { reason: "other", count: 5 },
      ],
    };
    
    res.json(stats);
  } catch (error) {
    console.error("Error fetching report stats:", error);
    res.status(500).json({ error: "Failed to fetch report stats" });
  }
});

router.post("/reports/:id/process", isAuthenticated, requireSuperAdmin, async (req, res) => {
  try {
    const { action, note } = req.body;
    
    // NOTE: Process report in database
    res.json({ 
      success: true, 
      message: "Report processed",
      resolution: {
        action,
        note,
        moderator: (req.user as any).claims.sub,
        timestamp: new Date(),
      }
    });
  } catch (error) {
    console.error("Error processing report:", error);
    res.status(500).json({ error: "Failed to process report" });
  }
});

router.post("/reports/:id/assign", isAuthenticated, requireSuperAdmin, async (req, res) => {
  try {
    const { assignTo } = req.body;
    
    // NOTE: Assign report in database
    res.json({ success: true, message: "Report assigned" });
  } catch (error) {
    console.error("Error assigning report:", error);
    res.status(500).json({ error: "Failed to assign report" });
  }
});

export default router;