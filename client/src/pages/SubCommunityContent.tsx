import { useState, useMemo } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useSubCommunityContent } from "@/hooks/useSubCommunityContent";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Grid3x3,
  List,
  Package,
  MessageSquare,
  Filter,
  ChevronLeft,
  Users,
  Lock,
  Globe,
  Eye,
  EyeOff,
} from "lucide-react";
import { Link } from "wouter";
import type { Community } from "@shared/schema";
import { SubCommunityPromptGrid } from "@/components/SubCommunityPromptGrid";
import { ContentFilterSidebar } from "@/components/ContentFilterSidebar";

type ViewMode = "grid" | "list";
type ContentType = "prompts" | "collections" | "discussions";
type SortOption = "newest" | "popular" | "most-used";

interface FilterState {
  visibility: string[];
  dateRange: { start: Date | null; end: Date | null };
  authors: string[];
  tags: string[];
}

export default function SubCommunityContentPage() {
  const [params] = useRoute("/sub-community/:id/content");
  const subCommunityId = (params as any)?.id;
  const { user } = useAuth();
  
  // State management
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [contentType, setContentType] = useState<ContentType>("prompts");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [showFilters, setShowFilters] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    visibility: [],
    dateRange: { start: null, end: null },
    authors: [],
    tags: [],
  });

  // Fetch sub-community details
  const { data: subCommunity, isLoading: loadingSubCommunity } = useQuery<Community>({
    queryKey: [`/api/sub-communities/${subCommunityId}`],
    enabled: !!subCommunityId,
  });

  // Fetch parent community details
  const { data: parentCommunity } = useQuery<Community>({
    queryKey: [`/api/communities/${subCommunity?.parentCommunityId}`],
    enabled: !!subCommunity?.parentCommunityId,
  });

  // Check user's role in the sub-community
  const { data: membershipData } = useQuery<any>({
    queryKey: [`/api/sub-communities/${subCommunityId}/membership`],
    enabled: !!subCommunityId && !!user,
  });

  const isAdmin = membershipData?.role === "admin";
  const isMember = !!membershipData;

  // Use the custom hook for content management
  const {
    prompts,
    isLoading: loadingContent,
    page,
    totalPages,
    totalItems,
    setPage,
    refetch,
  } = useSubCommunityContent({
    subCommunityId: subCommunityId || "",
    contentType,
    sortBy,
    filters,
    enabled: !!subCommunityId,
  });

  // Filter counts for badges
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.visibility.length > 0) count += filters.visibility.length;
    if (filters.authors.length > 0) count += filters.authors.length;
    if (filters.tags.length > 0) count += filters.tags.length;
    if (filters.dateRange.start || filters.dateRange.end) count += 1;
    return count;
  }, [filters]);

  const handleClearFilters = () => {
    setFilters({
      visibility: [],
      dateRange: { start: null, end: null },
      authors: [],
      tags: [],
    });
  };

  if (!subCommunityId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">Invalid sub-community</p>
      </div>
    );
  }

  if (loadingSubCommunity) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!subCommunity) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">Sub-community not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6 space-y-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/communities">
            <Button variant="ghost" size="sm" className="gap-1 px-2">
              <ChevronLeft className="h-4 w-4" />
              Communities
            </Button>
          </Link>
          {parentCommunity && (
            <>
              <span>/</span>
              <Link href={`/community/${parentCommunity.id}`}>
                <span className="hover:text-foreground transition-colors">
                  {parentCommunity.name}
                </span>
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-foreground font-medium">{subCommunity.name}</span>
        </div>

        {/* Title and Actions */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold">{subCommunity.name} Content</h1>
            <p className="text-muted-foreground">
              Browse and filter content shared within this sub-community
            </p>
            <div className="flex items-center gap-2 mt-2">
              {isAdmin && (
                <Badge variant="secondary">
                  <Eye className="mr-1 h-3 w-3" />
                  Admin View
                </Badge>
              )}
              {isMember && !isAdmin && (
                <Badge variant="outline">
                  <Users className="mr-1 h-3 w-3" />
                  Member
                </Badge>
              )}
              {!isMember && (
                <Badge variant="outline">
                  <EyeOff className="mr-1 h-3 w-3" />
                  Public View
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter Toggle */}
            <Button
              variant={showFilters ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              data-testid="button-toggle-filters"
            >
              <Filter className="mr-2 h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="default" className="ml-2">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>

            {/* View Mode Toggle */}
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(value) => value && setViewMode(value as ViewMode)}
              className="border rounded-md"
            >
              <ToggleGroupItem value="grid" size="sm" data-testid="toggle-view-grid">
                <Grid3x3 className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="list" size="sm" data-testid="toggle-view-list">
                <List className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>

            {/* Sort Dropdown */}
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
              <SelectTrigger className="w-[140px]" data-testid="select-sort">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="most-used">Most Used</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex gap-6">
        {/* Filter Sidebar */}
        {showFilters && (
          <div className="w-80 flex-shrink-0">
            <ContentFilterSidebar
              filters={filters}
              onFiltersChange={setFilters}
              onClearAll={handleClearFilters}
              subCommunityId={subCommunityId}
              isAdmin={isAdmin}
            />
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1">
          <Tabs value={contentType} onValueChange={(v) => setContentType(v as ContentType)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="prompts" data-testid="tab-prompts">
                <Package className="mr-2 h-4 w-4" />
                Prompts
                {totalItems > 0 && contentType === "prompts" && (
                  <Badge variant="secondary" className="ml-2">
                    {totalItems}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="collections" data-testid="tab-collections">
                <Grid3x3 className="mr-2 h-4 w-4" />
                Collections
              </TabsTrigger>
              <TabsTrigger value="discussions" disabled data-testid="tab-discussions">
                <MessageSquare className="mr-2 h-4 w-4" />
                Discussions
                <Badge variant="outline" className="ml-2">
                  Soon
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="prompts" className="mt-6">
              {loadingContent ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-64 rounded-lg" />
                  ))}
                </div>
              ) : prompts.length > 0 ? (
                <>
                  <SubCommunityPromptGrid
                    prompts={prompts}
                    viewMode={viewMode}
                    subCommunityId={subCommunityId}
                    isAdmin={isAdmin}
                    onRefresh={refetch}
                  />
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-8 flex justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1}
                        data-testid="button-prev-page"
                      >
                        Previous
                      </Button>
                      <div className="flex items-center gap-2">
                        {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                          const pageNum = i + 1;
                          return (
                            <Button
                              key={pageNum}
                              variant={page === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => setPage(pageNum)}
                              data-testid={`button-page-${pageNum}`}
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page + 1)}
                        disabled={page === totalPages}
                        data-testid="button-next-page"
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No prompts found</h3>
                  <p className="text-muted-foreground mt-1">
                    {activeFilterCount > 0
                      ? "Try adjusting your filters"
                      : "No prompts have been shared to this sub-community yet"}
                  </p>
                  {activeFilterCount > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={handleClearFilters}
                      data-testid="button-clear-filters-empty"
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="collections" className="mt-6">
              <div className="text-center py-12">
                <Grid3x3 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Collections coming soon</h3>
                <p className="text-muted-foreground mt-1">
                  Collection sharing within sub-communities will be available in a future update
                </p>
              </div>
            </TabsContent>

            <TabsContent value="discussions" className="mt-6">
              <div className="text-center py-12">
                <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Discussions coming soon</h3>
                <p className="text-muted-foreground mt-1">
                  Community discussions will be available in a future update
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}