import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { MARKETPLACE_ENABLED } from "@/config/features";
import { queryClient, prefetchCommonData, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { SearchWithFilters } from "@/components/SearchWithFilters";
import { MultiSelectFilters } from "@/components/MultiSelectFilters";
import type { MultiSelectFilters as MultiSelectFiltersType, EnabledFilters } from "@/components/MultiSelectFilters";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Heart, Folder, GitBranch, Plus, ChevronDown, ChevronUp, BookOpen, Share2, Star, UserPlus, Users, Activity, ShoppingBag, TrendingUp, Settings, Eye, EyeOff } from "lucide-react";
import { PromptCard } from "@/components/PromptCard";
import { PromptModal } from "@/components/PromptModal";
import { QuickActions } from "@/components/QuickActions";
import { BulkImportModal } from "@/components/BulkImportModal";
import { StatsCard } from "@/components/StatsCard";
import { MarketplaceListingCard } from "@/components/MarketplaceListingCard";
import { PromptImporter } from "@/components/PromptImporter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Prompt, Collection, User, MarketplaceListing } from "@shared/schema";

const collectionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  isPublic: z.boolean().default(false),
});

type CollectionFormData = z.infer<typeof collectionSchema>;

interface DashboardProps {
  onCreatePrompt?: () => void;
}

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const [bulkImportModalOpen, setBulkImportModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Prompt[]>([]);
  const [createCollectionModalOpen, setCreateCollectionModalOpen] = useState(false);
  const [communityTab, setCommunityTab] = useState("featured");

  // Multi-select filters state
  const [multiSelectFilters, setMultiSelectFilters] = useState<MultiSelectFiltersType>({
    category: [],
    type: [],
    style: [],
    intendedGenerator: [],
    recommendedModel: [],
    collection: [],
  });

  // Enabled filters state
  const [enabledFilters, setEnabledFilters] = useState<EnabledFilters>({
    category: false,
    type: false,
    style: false,
    intendedGenerator: false,
    recommendedModel: false,
    collection: false,
  });

  // Initialize collapsible state from localStorage for the specific user
  const [isStatsCollapsed, setIsStatsCollapsed] = useState(false);
  const [isActivityCollapsed, setIsActivityCollapsed] = useState(false);
  const [isRecentPromptsCollapsed, setIsRecentPromptsCollapsed] = useState(false);
  const [isBookmarkedPromptsCollapsed, setIsBookmarkedPromptsCollapsed] = useState(false);
  const [isMarketplaceCollapsed, setIsMarketplaceCollapsed] = useState(false);
  const [isCommunityHighlightsCollapsed, setIsCommunityHighlightsCollapsed] = useState(false);
  const [isToolsCollapsed, setIsToolsCollapsed] = useState(false);

  // Visibility states for completely hiding/showing sections
  const [isStatsVisible, setIsStatsVisible] = useState(true);
  const [isToolsVisible, setIsToolsVisible] = useState(true);
  const [isRecentPromptsVisible, setIsRecentPromptsVisible] = useState(true);
  const [isBookmarkedPromptsVisible, setIsBookmarkedPromptsVisible] = useState(true);
  const [isMarketplaceVisible, setIsMarketplaceVisible] = useState(true);
  const [isCommunityHighlightsVisible, setIsCommunityHighlightsVisible] = useState(true);
  const [isActivityVisible, setIsActivityVisible] = useState(true);

  // Load collapsed states from localStorage once user is available
  useEffect(() => {
    if (user?.id) {
      const statsStored = localStorage.getItem(`statsCollapsed_${user.id}`);
      if (statsStored !== null) {
        setIsStatsCollapsed(statsStored === 'true');
      }

      const activityStored = localStorage.getItem(`activityCollapsed_${user.id}`);
      if (activityStored !== null) {
        setIsActivityCollapsed(activityStored === 'true');
      }

      const recentPromptsStored = localStorage.getItem(`recentPromptsCollapsed_${user.id}`);
      if (recentPromptsStored !== null) {
        setIsRecentPromptsCollapsed(recentPromptsStored === 'true');
      }

      const bookmarkedPromptsStored = localStorage.getItem(`bookmarkedPromptsCollapsed_${user.id}`);
      if (bookmarkedPromptsStored !== null) {
        setIsBookmarkedPromptsCollapsed(bookmarkedPromptsStored === 'true');
      }

      const marketplaceStored = localStorage.getItem(`marketplaceCollapsed_${user.id}`);
      if (marketplaceStored !== null) {
        setIsMarketplaceCollapsed(marketplaceStored === 'true');
      }

      const communityHighlightsStored = localStorage.getItem(`communityHighlightsCollapsed_${user.id}`);
      if (communityHighlightsStored !== null) {
        setIsCommunityHighlightsCollapsed(communityHighlightsStored === 'true');
      }

      const toolsStored = localStorage.getItem(`toolsCollapsed_${user.id}`);
      if (toolsStored !== null) {
        setIsToolsCollapsed(toolsStored === 'true');
      }

      // Load visibility states
      const statsVisible = localStorage.getItem(`statsVisible_${user.id}`);
      if (statsVisible !== null) {
        setIsStatsVisible(statsVisible === 'true');
      }

      const toolsVisible = localStorage.getItem(`toolsVisible_${user.id}`);
      if (toolsVisible !== null) {
        setIsToolsVisible(toolsVisible === 'true');
      }

      const recentPromptsVisible = localStorage.getItem(`recentPromptsVisible_${user.id}`);
      if (recentPromptsVisible !== null) {
        setIsRecentPromptsVisible(recentPromptsVisible === 'true');
      }

      const bookmarkedPromptsVisible = localStorage.getItem(`bookmarkedPromptsVisible_${user.id}`);
      if (bookmarkedPromptsVisible !== null) {
        setIsBookmarkedPromptsVisible(bookmarkedPromptsVisible === 'true');
      }

      const marketplaceVisible = localStorage.getItem(`marketplaceVisible_${user.id}`);
      if (marketplaceVisible !== null) {
        setIsMarketplaceVisible(marketplaceVisible === 'true');
      }

      const communityHighlightsVisible = localStorage.getItem(`communityHighlightsVisible_${user.id}`);
      if (communityHighlightsVisible !== null) {
        setIsCommunityHighlightsVisible(communityHighlightsVisible === 'true');
      }

      const activityVisible = localStorage.getItem(`activityVisible_${user.id}`);
      if (activityVisible !== null) {
        setIsActivityVisible(activityVisible === 'true');
      }
    }
  }, [user?.id]);

  // Update localStorage when the collapsed states change
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`statsCollapsed_${user.id}`, isStatsCollapsed.toString());
    }
  }, [isStatsCollapsed, user?.id]);

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`activityCollapsed_${user.id}`, isActivityCollapsed.toString());
    }
  }, [isActivityCollapsed, user?.id]);

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`recentPromptsCollapsed_${user.id}`, isRecentPromptsCollapsed.toString());
    }
  }, [isRecentPromptsCollapsed, user?.id]);

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`bookmarkedPromptsCollapsed_${user.id}`, isBookmarkedPromptsCollapsed.toString());
    }
  }, [isBookmarkedPromptsCollapsed, user?.id]);

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`marketplaceCollapsed_${user.id}`, isMarketplaceCollapsed.toString());
    }
  }, [isMarketplaceCollapsed, user?.id]);

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`communityHighlightsCollapsed_${user.id}`, isCommunityHighlightsCollapsed.toString());
    }
  }, [isCommunityHighlightsCollapsed, user?.id]);

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`toolsCollapsed_${user.id}`, isToolsCollapsed.toString());
    }
  }, [isToolsCollapsed, user?.id]);

  // Update localStorage when visibility states change
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`statsVisible_${user.id}`, isStatsVisible.toString());
    }
  }, [isStatsVisible, user?.id]);

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`toolsVisible_${user.id}`, isToolsVisible.toString());
    }
  }, [isToolsVisible, user?.id]);

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`recentPromptsVisible_${user.id}`, isRecentPromptsVisible.toString());
    }
  }, [isRecentPromptsVisible, user?.id]);

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`bookmarkedPromptsVisible_${user.id}`, isBookmarkedPromptsVisible.toString());
    }
  }, [isBookmarkedPromptsVisible, user?.id]);

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`marketplaceVisible_${user.id}`, isMarketplaceVisible.toString());
    }
  }, [isMarketplaceVisible, user?.id]);

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`communityHighlightsVisible_${user.id}`, isCommunityHighlightsVisible.toString());
    }
  }, [isCommunityHighlightsVisible, user?.id]);

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`activityVisible_${user.id}`, isActivityVisible.toString());
    }
  }, [isActivityVisible, user?.id]);

  // Prefetch common data for faster navigation
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      prefetchCommonData(user.id);
    }
  }, [isAuthenticated, user?.id]);

  // Fetch user stats
  const { data: userStats } = useQuery<{
    totalPrompts: number;
    totalLikes: number;
    collections: number;
    branchesCreated: number;
  }>({
    queryKey: ["/api/user/stats"],
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  // Fetch user's recent prompts (exclude archived)
  const { data: userPrompts = [] } = useQuery<Prompt[]>({
    queryKey: [`/api/prompts?userId=${user?.id || ''}&limit=3&statusNotEqual=archived`],
    enabled: isAuthenticated && !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: false,
  });

  // Build query string for community prompts
  const buildCommunityQuery = () => {
    const params = new URLSearchParams();
    params.append("isPublic", "true");
    params.append("limit", "10");

    // Handle community tab selection
    if (communityTab === "featured") {
      params.append("isFeatured", "true");
    } else if (communityTab === "trending") {
      params.append("sortBy", "trending");
    } else if (communityTab === "recent") {
      params.append("sortBy", "recent");
    }

    // Handle multi-select filters
    if (multiSelectFilters.category.length > 0) {
      params.append("category", multiSelectFilters.category.join(","));
    }
    if (multiSelectFilters.type.length > 0) {
      params.append("type", multiSelectFilters.type.join(","));
    }
    if (multiSelectFilters.style.length > 0) {
      params.append("style", multiSelectFilters.style.join(","));
    }
    if (multiSelectFilters.intendedGenerator.length > 0) {
      params.append("generator", multiSelectFilters.intendedGenerator.join(","));
    }
    if (multiSelectFilters.recommendedModel.length > 0) {
      params.append("model", multiSelectFilters.recommendedModel.join(","));
    }
    if (multiSelectFilters.collection.length > 0) {
      params.append("collection", multiSelectFilters.collection.join(","));
    }

    return params.toString();
  };

  // Fetch community featured prompts
  const { data: communityPrompts = [], refetch: refetchCommunity } = useQuery<Prompt[]>({
    queryKey: [`/api/prompts?${buildCommunityQuery()}`],
    enabled: isAuthenticated,
    retry: false,
  });

  // Refetch community prompts when filters or tab change
  useEffect(() => {
    if (isAuthenticated) {
      refetchCommunity();
    }
  }, [communityTab, multiSelectFilters, isAuthenticated]);

  // Fetch user collections
  const { data: collections = [] } = useQuery<Collection[]>({
    queryKey: ["/api/collections"],
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  // Fetch user's favorite prompts
  const { data: favoritePrompts = [] } = useQuery<Prompt[]>({
    queryKey: ["/api/user/favorites"],
    enabled: isAuthenticated,
    staleTime: 3 * 60 * 1000, // 3 minutes
    retry: false,
  });

  // Fetch featured marketplace listings
  const { data: featuredListings = [] } = useQuery<MarketplaceListing[]>({
    queryKey: ["/api/marketplace/featured?limit=4"],
    enabled: isAuthenticated && MARKETPLACE_ENABLED,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  // Fetch recent activities with user data
  interface ActivityType {
    id: string;
    actionType: string;
    userId: string;
    targetId?: string;
    targetType?: string;
    targetEntity?: {
      id: string;
      name?: string;
      username?: string;
      firstName?: string;
      lastName?: string;
      isPublic?: boolean;
    };
    metadata?: {
      promptName?: string;
      collectionName?: string;
      userName?: string;
    };
    details?: any;
    createdAt: string;
    user?: User;
  }

  const { data: recentActivities = [] } = useQuery<ActivityType[]>({
    queryKey: ["/api/activities/recent"],
    enabled: isAuthenticated,
    retry: false,
  });

  const handleCreatePrompt = () => {
    setEditingPrompt(null);
    setPromptModalOpen(true);
  };

  const handleEditPrompt = (prompt: Prompt) => {
    setEditingPrompt(prompt);
    setPromptModalOpen(true);
  };

  // Collection form
  const createCollectionForm = useForm<CollectionFormData>({
    resolver: zodResolver(collectionSchema),
    defaultValues: {
      name: "",
      description: "",
      isPublic: false,
    },
  });

  // Collection creation mutation
  const createCollectionMutation = useMutation({
    mutationFn: async (data: CollectionFormData) => {
      return await apiRequest("POST", "/api/collections", {
        ...data,
        type: "user",
      });
    },
    onSuccess: () => {
      // Invalidate and refetch collections to show new collection immediately
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
      createCollectionForm.reset();
      setCreateCollectionModalOpen(false);
      toast({
        title: "Success",
        description: "Collection created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create collection",
        variant: "destructive",
      });
    },
  });

  const handleCreateCollection = () => {
    setCreateCollectionModalOpen(true);
  };

  const onCreateCollectionSubmit = (data: CollectionFormData) => {
    createCollectionMutation.mutate(data);
  };

  const handleStartProject = () => {
    toast({
      title: "Coming Soon",
      description: "Project creation will be available soon!",
    });
  };

  const handleImportPrompts = () => {
    setBulkImportModalOpen(true);
  };

  // Helper functions for activity display
  const getActivityIcon = (actionType: string) => {
    switch (actionType) {
      case "created_prompt":
        return <BookOpen className="h-4 w-4" />;
      case "shared_prompt":
        return <Share2 className="h-4 w-4" />;
      case "liked_prompt":
        return <Heart className="h-4 w-4" />;
      case "favorited_prompt":
        return <Star className="h-4 w-4" />;
      case "followed_user":
        return <UserPlus className="h-4 w-4" />;
      case "joined_community":
        return <Users className="h-4 w-4" />;
      case "created_collection":
        return <Folder className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityDescription = (activity: ActivityType) => {
    const userName = activity.user?.username || "Someone";
    const userLink = userName !== "Someone" ? (
      <Link href={`/user/${userName}`} className="font-medium text-foreground hover:underline">
        @{userName}
      </Link>
    ) : (
      <span className="font-medium text-foreground">@{userName}</span>
    );

    const promptName = activity.targetEntity?.name || activity.metadata?.promptName || "a prompt";
    const promptLink = (activity.targetEntity || activity.metadata?.promptName) && activity.targetId && activity.targetType === 'prompt' ? (
      <Link href={`/prompt/${activity.targetId}`} className="font-medium hover:underline">
        "{promptName}"
      </Link>
    ) : (
      <span className="font-medium">"{promptName}"</span>
    );

    const collectionName = activity.targetEntity?.name || activity.metadata?.collectionName || "a collection";
    const collectionLink = (activity.targetEntity || activity.metadata?.collectionName) && activity.targetId && activity.targetType === 'collection' ? (
      <Link href={`/collection/${activity.targetId}`} className="font-medium hover:underline">
        {collectionName}
      </Link>
    ) : (
      <span className="font-medium">{collectionName}</span>
    );

    const targetUserName = activity.targetEntity?.username || activity.targetEntity?.firstName || "someone";
    const targetUserLink = activity.targetEntity && activity.targetId && activity.targetType === 'user' ? (
      <Link href={`/user/${activity.targetEntity.username || activity.targetId}`} className="font-medium hover:underline">
        @{targetUserName}
      </Link>
    ) : (
      <span className="font-medium">@{targetUserName}</span>
    );

    switch (activity.actionType) {
      case "created_prompt":
        return <>{userLink} created {promptLink}</>;
      case "shared_prompt":
        return <>{userLink} shared {promptLink}</>;
      case "liked_prompt":
        return <>{userLink} liked {promptLink}</>;
      case "favorited_prompt":
        return <>{userLink} favorited {promptLink}</>;
      case "followed_user":
        return <>{userLink} started following {targetUserLink}</>;
      case "joined_community":
        return <>{userLink} joined the community</>;
      case "created_collection":
        return <>{userLink} created {collectionLink}</>;
      default:
        return <>{userLink} performed an action</>;
    }
  };

  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <div className="container mx-auto px-2 py-2 sm:px-3 sm:py-3 md:px-6 md:py-8 pb-24 lg:pb-8">
        {/* Dashboard Header */}
        <div className="mb-2 md:mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2 md:mb-6">
            <div className="flex items-center gap-2">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1 md:mb-2" data-testid="text-welcome">
                  Welcome back, {user?.firstName || (user?.email ? user.email.split("@")[0] : "") || "User"}
                </h1>
                <p className="text-sm md:text-base text-muted-foreground">Manage your AI prompts and discover community favorites</p>
              </div>

              {/* Section Visibility Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="ml-2" data-testid="button-section-visibility">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  <DropdownMenuLabel>Show/Hide Sections</DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  <DropdownMenuCheckboxItem
                    checked={isStatsVisible}
                    onCheckedChange={setIsStatsVisible}
                    className="cursor-pointer"
                  >
                    <Eye className={`h-4 w-4 mr-2 ${isStatsVisible ? '' : 'opacity-50'}`} />
                    Your Statistics
                  </DropdownMenuCheckboxItem>

                  <DropdownMenuCheckboxItem
                    checked={isToolsVisible}
                    onCheckedChange={setIsToolsVisible}
                    className="cursor-pointer"
                  >
                    <Eye className={`h-4 w-4 mr-2 ${isToolsVisible ? '' : 'opacity-50'}`} />
                    Tools
                  </DropdownMenuCheckboxItem>

                  <DropdownMenuCheckboxItem
                    checked={isRecentPromptsVisible}
                    onCheckedChange={setIsRecentPromptsVisible}
                    className="cursor-pointer"
                  >
                    <Eye className={`h-4 w-4 mr-2 ${isRecentPromptsVisible ? '' : 'opacity-50'}`} />
                    Recent Prompts
                  </DropdownMenuCheckboxItem>

                  <DropdownMenuCheckboxItem
                    checked={isBookmarkedPromptsVisible}
                    onCheckedChange={setIsBookmarkedPromptsVisible}
                    className="cursor-pointer"
                  >
                    <Eye className={`h-4 w-4 mr-2 ${isBookmarkedPromptsVisible ? '' : 'opacity-50'}`} />
                    Bookmarked Prompts
                  </DropdownMenuCheckboxItem>

                  {MARKETPLACE_ENABLED && (
                    <DropdownMenuCheckboxItem
                      checked={isMarketplaceVisible}
                      onCheckedChange={setIsMarketplaceVisible}
                      className="cursor-pointer"
                    >
                      <Eye className={`h-4 w-4 mr-2 ${isMarketplaceVisible ? '' : 'opacity-50'}`} />
                      Featured Marketplace
                    </DropdownMenuCheckboxItem>
                  )}

                  <DropdownMenuCheckboxItem
                    checked={isCommunityHighlightsVisible}
                    onCheckedChange={setIsCommunityHighlightsVisible}
                    className="cursor-pointer"
                  >
                    <Eye className={`h-4 w-4 mr-2 ${isCommunityHighlightsVisible ? '' : 'opacity-50'}`} />
                    Community Highlights
                  </DropdownMenuCheckboxItem>

                  <DropdownMenuCheckboxItem
                    checked={isActivityVisible}
                    onCheckedChange={setIsActivityVisible}
                    className="cursor-pointer"
                  >
                    <Eye className={`h-4 w-4 mr-2 ${isActivityVisible ? '' : 'opacity-50'}`} />
                    Community Activity
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="mt-2 md:mt-0">
              <SearchWithFilters
                placeholder="Search prompts..."
                onSearchChange={(query) => setSearchQuery(query)}
                onResultsChange={(results) => setSearchResults(results)}
                onResultClick={(prompt) => {
                  // Navigate to prompt detail page or handle selection
                  setLocation(`/prompt/${prompt.id}`);
                }}
              />
            </div>
          </div>

          {/* Prompt Importer - Extract prompts from social media */}
          <div className="mb-6">
            <PromptImporter />
          </div>

          {/* Stats Cards - Collapsible, Hidden on mobile */}
          {isStatsVisible && (
            <Collapsible
              open={!isStatsCollapsed}
              onOpenChange={(open) => setIsStatsCollapsed(!open)}
              className="hidden md:block mb-6"
            >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Your Statistics</h2>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" data-testid="button-toggle-stats">
                  {isStatsCollapsed ? (
                    <>
                      <ChevronDown className="h-4 w-4 mr-2" />
                      Show Stats
                    </>
                  ) : (
                    <>
                      <ChevronUp className="h-4 w-4 mr-2" />
                      Hide Stats
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <div className="grid grid-cols-4 gap-4">
                <Link href="/library" className="hover:scale-105 transition-transform cursor-pointer">
                  <StatsCard
                    title="Your Prompts"
                    value={userStats?.totalPrompts || 0}
                    icon={FileText}
                    iconColor="bg-primary/10 text-primary"
                    testId="stat-prompts"
                  />
                </Link>
                <Link href="/liked-prompts" className="hover:scale-105 transition-transform cursor-pointer">
                  <StatsCard
                    title="Total Likes"
                    value={userStats?.totalLikes || 0}
                    icon={Heart}
                    iconColor="bg-red-500/10 text-red-500"
                    testId="stat-likes"
                  />
                </Link>
                <Link href="/library?section=collections" className="hover:scale-105 transition-transform cursor-pointer">
                  <StatsCard
                    title="Collections"
                    value={userStats?.collections || 0}
                    icon={Folder}
                    iconColor="bg-green-500/10 text-green-500"
                    testId="stat-collections"
                  />
                </Link>
                <Link href="/branched-prompts" className="hover:scale-105 transition-transform cursor-pointer">
                  <StatsCard
                    title="Branches Created"
                    value={userStats?.branchesCreated || 0}
                    icon={GitBranch}
                    iconColor="bg-blue-500/10 text-blue-500"
                    testId="stat-branches"
                  />
                </Link>
              </div>
            </CollapsibleContent>
          </Collapsible>
          )}
        </div>

        {/* Search Results Section - Positioned directly below search field */}
        {(searchQuery || searchResults.length > 0) && (
          <div className="mb-6 md:mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Search Results</span>
                  {searchResults.length > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {searchResults.length} result{searchResults.length === 1 ? '' : 's'}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {searchResults.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {searchResults.map((prompt) => (
                      <div
                        key={prompt.id}
                        className="cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => setLocation(`/prompt/${prompt.id}`)}
                      >
                        <PromptCard prompt={prompt} />
                      </div>
                    ))}
                  </div>
                ) : searchQuery ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No results found for "{searchQuery}"
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions for Mobile and Tablet - Show at top on mobile and tablet */}
        {isToolsVisible && (
          <Collapsible
            open={!isToolsCollapsed}
            onOpenChange={(open) => setIsToolsCollapsed(!open)}
            className="block lg:hidden mb-3 md:mb-6"
          >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base md:text-xl font-semibold">Tools</h3>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" data-testid="button-toggle-tools-mobile">
                {isToolsCollapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <Card data-testid="card-tools-mobile">
              <CardContent className="pt-4">
                <QuickActions
                  onCreatePrompt={handleCreatePrompt}
                  onCreateCollection={handleCreateCollection}
                  onStartProject={handleStartProject}
                  onImportPrompts={handleImportPrompts}
                />
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
        )}

        {/* Activity Cards for Mobile/Tablet - Show above recent prompts */}
        <div className="block lg:hidden space-y-4 mb-6">
          {/* Community Activity - Collapsible on mobile/tablet */}
          {isActivityVisible && (
            <Collapsible
              open={!isActivityCollapsed}
              onOpenChange={(open) => setIsActivityCollapsed(!open)}
              className="mb-6"
            >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Community Activity</h2>
              <div className="flex items-center gap-2">
                <Link href="/community?tab=activity">
                  <Button variant="link" className="text-primary hover:underline p-0 text-sm" data-testid="link-view-all-activity-mobile">
                    View all
                  </Button>
                </Link>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" data-testid="button-toggle-activity">
                    {isActivityCollapsed ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronUp className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>
            <CollapsibleContent>
              <Card data-testid="card-activity-mobile">
                <CardHeader className="pb-3">
                  <CardTitle className="sr-only">Activity Content</CardTitle>
                </CardHeader>
                <CardContent>
                  {recentActivities.length > 0 ? (
                    <div className="space-y-4">
                      {recentActivities.slice(0, 5).map((activity) => (
                        <div key={activity.id} className="flex items-start gap-3 pb-4 border-b last:border-0">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={activity.user?.profileImageUrl || undefined} />
                            <AvatarFallback>
                              {activity.user?.firstName?.[0]?.toUpperCase() || activity.user?.username?.[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {getActivityIcon(activity.actionType)}
                              <p className="text-sm">
                                {getActivityDescription(activity)}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {activity.createdAt ? formatDate(activity.createdAt) : 'recently'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">No recent activity yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 md:gap-4 lg:gap-8">
          <div className="lg:col-span-2">
            {/* Recent Prompts */}
            {isRecentPromptsVisible && (
              <Collapsible
                open={!isRecentPromptsCollapsed}
                onOpenChange={(open) => setIsRecentPromptsCollapsed(!open)}
                className="mb-6 md:mb-8"
              >
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <h2 className="text-lg md:text-xl font-semibold text-foreground">Recent Prompts</h2>
                <div className="flex items-center gap-2">
                  <Link href="/library">
                    <Button variant="link" className="text-primary hover:underline p-0" data-testid="link-view-all-prompts">
                      View all
                    </Button>
                  </Link>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" data-testid="button-toggle-recent-prompts">
                      {isRecentPromptsCollapsed ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronUp className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </div>

              <CollapsibleContent>
                <div className="space-y-4" data-testid="section-recent-prompts">
                  {userPrompts.length > 0 ? (
                    userPrompts.map((prompt) => (
                      <PromptCard
                        key={prompt.id}
                        prompt={prompt}
                        showActions={true}
                        onEdit={handleEditPrompt}
                      />
                    ))
                  ) : (
                    <Card>
                      <CardContent className="p-6 text-center">
                        <p className="text-muted-foreground mb-4">You haven't created any prompts yet.</p>
                        <Button onClick={handleCreatePrompt} data-testid="button-create-first-prompt">
                          <Plus className="h-4 w-4 mr-2" />
                          Create Your First Prompt
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
            )}

            {/* Bookmarked Prompts */}
            {isBookmarkedPromptsVisible && (
              <Collapsible
                open={!isBookmarkedPromptsCollapsed}
                onOpenChange={(open) => setIsBookmarkedPromptsCollapsed(!open)}
                className="mb-6 md:mb-8"
              >
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <h2 className="text-lg md:text-xl font-semibold text-[#005eff]">Bookmarked Prompts</h2>
                <div className="flex items-center gap-2">
                  <Link href="/library?section=favorites">
                    <Button variant="link" className="text-primary hover:underline p-0" data-testid="link-view-all-favorites">
                      View all
                    </Button>
                  </Link>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" data-testid="button-toggle-bookmarked-prompts">
                      {isBookmarkedPromptsCollapsed ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronUp className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </div>

              <CollapsibleContent>
                <div className="space-y-4" data-testid="section-favorite-prompts">
                  {favoritePrompts.length > 0 ? (
                    favoritePrompts.slice(0, 3).map((prompt) => (
                      <PromptCard
                        key={prompt.id}
                        prompt={prompt}
                      />
                    ))
                  ) : (
                    <Card>
                      <CardContent className="p-6 text-center">
                        <p className="text-muted-foreground mb-4">You haven't bookmarked any prompts yet.</p>
                        <p className="text-sm text-muted-foreground">Click the star icon on any prompt to add it to your favorites!</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
            )}

            {/* Featured Marketplace Listings */}
            {MARKETPLACE_ENABLED && isMarketplaceVisible && featuredListings.length > 0 && (
              <Collapsible
                open={!isMarketplaceCollapsed}
                onOpenChange={(open) => setIsMarketplaceCollapsed(!open)}
                className="mb-6 md:mb-8"
              >
                <div className="flex items-center justify-between mb-3 md:mb-4">
                  <h2 className="text-lg md:text-xl font-semibold text-purple-600 dark:text-purple-400">
                    <TrendingUp className="inline h-5 w-5 mr-2" />
                    Featured in Marketplace
                  </h2>
                  <div className="flex items-center gap-2">
                    <Link href="/marketplace">
                      <Button variant="link" className="text-purple-600 hover:text-purple-500" data-testid="link-view-marketplace">
                        <ShoppingBag className="h-4 w-4 mr-1" />
                        Browse All
                      </Button>
                    </Link>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" data-testid="button-toggle-marketplace">
                        {isMarketplaceCollapsed ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronUp className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                </div>
                <CollapsibleContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="section-featured-marketplace">
                    {featuredListings.slice(0, 4).map((listing) => (
                      <MarketplaceListingCard key={listing.id} listing={listing as any} />
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Community Highlights */}
            {isCommunityHighlightsVisible && (
              <Collapsible
                open={!isCommunityHighlightsCollapsed}
                onOpenChange={(open) => setIsCommunityHighlightsCollapsed(!open)}
                className="mb-6 md:mb-8"
              >
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <h2 className="text-lg md:text-xl font-semibold text-[#a328c9]">Community Highlights</h2>
                <div className="flex items-center gap-2">
                  {/* Filter Options Button */}
                  <MultiSelectFilters
                    onFiltersChange={(filters) => {
                      setMultiSelectFilters(filters);
                    }}
                    onEnabledFiltersChange={setEnabledFilters}
                    enabledFilters={enabledFilters}
                    selectedFilters={multiSelectFilters}
                    sortBy={communityTab}
                    showButton={true}
                    showTabs={false}
                  />

                  <Tabs value={communityTab} onValueChange={setCommunityTab}>
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="featured" className="text-xs" data-testid="filter-featured">
                        Featured
                      </TabsTrigger>
                      <TabsTrigger value="trending" className="text-xs" data-testid="filter-trending">
                        Trending
                      </TabsTrigger>
                      <TabsTrigger value="recent" className="text-xs" data-testid="filter-recent">
                        Recent
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" data-testid="button-toggle-community-highlights">
                      {isCommunityHighlightsCollapsed ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronUp className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </div>

              <CollapsibleContent>
                {/* Multi-Select Filter Tabs - Show below headers */}
                <MultiSelectFilters
                  onFiltersChange={(filters) => {
                    setMultiSelectFilters(filters);
                  }}
                  onEnabledFiltersChange={setEnabledFilters}
                  enabledFilters={enabledFilters}
                  selectedFilters={multiSelectFilters}
                  sortBy={communityTab}
                  showButton={false}
                  showTabs={true}
                />

                <div className="space-y-4 mt-4" data-testid="section-community-highlights">
                  {communityPrompts.length > 0 ? (
                    communityPrompts.map((prompt) => (
                      <PromptCard key={prompt.id} prompt={prompt} isCommunityPage={true} />
                    ))
                  ) : (
                    <Card>
                      <CardContent className="p-6 text-center">
                        <p className="text-muted-foreground">No featured prompts available.</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4 md:space-y-6">
            {/* Navigation Buttons - Desktop */}
            <div className="hidden md:flex gap-2">
              <Link href="/library" className="flex-1">
                <Button className="w-full button-gradient-library" data-testid="button-my-prompts-desktop">
                  <FileText className="h-4 w-4 mr-2" />
                  My Prompts
                </Button>
              </Link>
              <Link href="/community" className="flex-1">
                <Button className="w-full button-gradient-community" data-testid="button-community-prompts-desktop">
                  <Users className="h-4 w-4 mr-2" />
                  Community Prompts
                </Button>
              </Link>
            </div>

            {/* Quick Actions - Hidden on mobile/tablet (shown at top) */}
            {isToolsVisible && (
              <Collapsible
                open={!isToolsCollapsed}
                onOpenChange={(open) => setIsToolsCollapsed(!open)}
                className="hidden lg:block"
              >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base md:text-xl font-semibold">Tools</h3>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" data-testid="button-toggle-tools-desktop">
                    {isToolsCollapsed ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronUp className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <Card data-testid="card-tools">
                  <CardContent className="pt-4">
                    <QuickActions
                      onCreatePrompt={handleCreatePrompt}
                      onCreateCollection={handleCreateCollection}
                      onStartProject={handleStartProject}
                      onImportPrompts={handleImportPrompts}
                    />
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>
            )}

            {/* Community Activity - Hidden on mobile/tablet, shown on desktop */}
            {isActivityVisible && (
              <Collapsible
                open={!isActivityCollapsed}
                onOpenChange={(open) => setIsActivityCollapsed(!open)}
                className="hidden lg:block mb-6"
              >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Community Activity</h2>
                <div className="flex items-center gap-2">
                  <Link href="/community?tab=activity">
                    <Button variant="link" className="text-primary hover:underline p-0" data-testid="link-view-all-activity">
                      View all
                    </Button>
                  </Link>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" data-testid="button-toggle-activity">
                      {isActivityCollapsed ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronUp className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </div>
              <CollapsibleContent>
                <Card data-testid="card-activity">
                  <CardHeader className="pb-3">
                    <CardTitle className="sr-only">Activity Content</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {recentActivities.length > 0 ? (
                      <div className="space-y-4">
                        {recentActivities.slice(0, 5).map((activity) => (
                          <div key={activity.id} className="flex items-start gap-3 pb-4 border-b last:border-0">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={activity.user?.profileImageUrl || undefined} />
                              <AvatarFallback>
                                {activity.user?.firstName?.[0]?.toUpperCase() || activity.user?.username?.[0]?.toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                {getActivityIcon(activity.actionType)}
                                <p className="text-sm">
                                  {getActivityDescription(activity)}
                                </p>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {activity.createdAt ? formatDate(activity.createdAt) : 'recently'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10">
                        <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground">No recent activity yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>
            )}
          </div>
        </div>
      </div>
      {/* Prompt Modal */}
      <PromptModal
        open={promptModalOpen}
        onOpenChange={setPromptModalOpen}
        prompt={editingPrompt}
        mode={editingPrompt ? "edit" : "create"}
      />
      {/* Bulk Import Modal */}
      <BulkImportModal
        open={bulkImportModalOpen}
        onOpenChange={setBulkImportModalOpen}
        collections={collections}
      />

      {/* Create Collection Modal */}
      <Dialog open={createCollectionModalOpen} onOpenChange={setCreateCollectionModalOpen}>
        <DialogContent className="backdrop-blur-md bg-transparent border-white/20">
          <DialogHeader>
            <DialogTitle>Create New Collection</DialogTitle>
          </DialogHeader>
          <Form {...createCollectionForm}>
            <form onSubmit={createCollectionForm.handleSubmit(onCreateCollectionSubmit)} className="space-y-4">
              <FormField
                control={createCollectionForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Collection Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Creative Writing, Business Ideas" {...field} data-testid="input-collection-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createCollectionForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe what this collection contains..."
                        {...field}
                        data-testid="textarea-collection-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createCollectionForm.control}
                name="isPublic"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Make Public</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Allow others to view and use this collection
                      </p>
                    </div>
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4"
                        data-testid="checkbox-collection-public"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setCreateCollectionModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createCollectionMutation.isPending}>
                  {createCollectionMutation.isPending ? "Creating..." : "Create Collection"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}