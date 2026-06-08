import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MarketplaceListingCard } from "@/components/MarketplaceListingCard";
import { SubCommunitySelector } from "@/components/SubCommunitySelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  DollarSign,
  Coins,
  TrendingUp,
  Package,
  X,
  HelpCircle,
  Users,
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";

export default function Marketplace() {
  const { user } = useAuth();
  
  // Search and filter states
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubCommunity, setSelectedSubCommunity] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100]);
  const [creditsRange, setCreditsRange] = useState<[number, number]>([0, 10000]);
  const [sortBy, setSortBy] = useState<string>("newest");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const limit = 12;

  // Fetch categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<
    { category: string; count: number }[]
  >({
    queryKey: ["/api/marketplace/categories"],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Fetch featured listings
  const { data: featuredListings = [], isLoading: featuredLoading } = useQuery<any[]>({
    queryKey: ["/api/marketplace/featured"],
    staleTime: 5 * 60 * 1000,
  });

  // Fetch marketplace listings with filters
  const {
    data: listingsData = { listings: [], total: 0 },
    isLoading: listingsLoading,
    isFetching,
  } = useQuery({
    queryKey: [
      "/api/marketplace/listings",
      {
        page,
        limit,
        search,
        category: selectedCategory,
        subCommunityId: selectedSubCommunity,
        minPrice: priceRange[0],
        maxPrice: priceRange[1],
        minCredits: creditsRange[0],
        maxCredits: creditsRange[1],
        sortBy,
      },
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
      });

      if (search) params.append("search", search);
      if (selectedCategory) params.append("category", selectedCategory);
      if (selectedSubCommunity !== "all") params.append("subCommunityId", selectedSubCommunity);
      if (priceRange[0] > 0) params.append("minPrice", priceRange[0].toString());
      if (priceRange[1] < 100) params.append("maxPrice", priceRange[1].toString());
      if (creditsRange[0] > 0) params.append("minCredits", creditsRange[0].toString());
      if (creditsRange[1] < 10000) params.append("maxCredits", creditsRange[1].toString());

      const response = await fetch(`/api/marketplace/listings?${params}`);
      if (!response.ok) throw new Error("Failed to fetch listings");
      return response.json();
    },
    staleTime: 1 * 60 * 1000, // Cache for 1 minute
  });

  const totalPages = Math.ceil(listingsData.total / limit);

  // Handle search
  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1); // Reset to first page on new search
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Reset filters
  const resetFilters = () => {
    setSearch("");
    setSearchInput("");
    setSelectedCategory(null);
    setSelectedSubCommunity("all");
    setPriceRange([0, 100]);
    setCreditsRange([0, 10000]);
    setSortBy("newest");
    setPage(1);
  };

  const hasActiveFilters =
    search ||
    selectedCategory ||
    selectedSubCommunity !== "all" ||
    priceRange[0] > 0 ||
    priceRange[1] < 100 ||
    creditsRange[0] > 0 ||
    creditsRange[1] < 10000;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section - Mobile optimized */}
      <div className="bg-gradient-to-b from-indigo-900/20 to-background border-b">
        <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-12">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-2xl sm:text-4xl font-bold mb-3 sm:mb-4 flex items-center justify-center">
              <ShoppingBag className="h-8 w-8 sm:h-10 sm:w-10 mr-2 sm:mr-3 text-indigo-500" />
              <span>Prompt Marketplace</span>
            </h1>
            <p className="text-sm sm:text-lg text-muted-foreground mb-4 sm:mb-8 px-2">
              Discover and purchase high-quality prompts from our community of creators
            </p>

            {/* Search Bar - Mobile responsive */}
            <div className="flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto mb-3 sm:mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search for prompts..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-10 pr-4 text-sm sm:text-base"
                  data-testid="input-marketplace-search"
                />
              </div>
              <Button 
                onClick={handleSearch} 
                data-testid="button-search"
                className="w-full sm:w-auto"
              >
                Search
              </Button>
            </div>
            
            {/* Help Link - Mobile responsive */}
            <div className="flex justify-center">
              <Link href="/marketplace/help">
                <Button variant="ghost" size="sm" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground">
                  <HelpCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  How does the marketplace work?
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Featured Listings - Mobile responsive grid */}
        {!hasActiveFilters && featuredListings.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-2xl font-semibold flex items-center">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 mr-1.5 sm:mr-2 text-yellow-500" />
                Featured Prompts
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {featuredLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-0">
                        <Skeleton className="h-32 sm:h-48 w-full" />
                        <div className="p-3 sm:p-4 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                          <Skeleton className="h-6 w-20" />
                        </div>
                      </CardContent>
                    </Card>
                  ))
                : featuredListings
                    .slice(0, 4)
                    .map((listing: any) => (
                      <MarketplaceListingCard key={listing.id} listing={listing} />
                    ))}
            </div>
            <Separator className="mt-6 sm:mt-8" />
          </div>
        )}

        {/* Filters and Sort Bar */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div className="flex flex-wrap gap-2 items-center">
            {/* Mobile Filter Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden"
            >
              <Filter className="h-4 w-4 mr-1" />
              Filters
              <ChevronDown
                className={`h-4 w-4 ml-1 transition-transform ${
                  showFilters ? "rotate-180" : ""
                }`}
              />
            </Button>

            {/* Category Chips - Desktop */}
            <div className="hidden lg:flex flex-wrap gap-2 items-center">
              <span className="text-sm text-muted-foreground">Categories:</span>
              <Badge
                variant={!selectedCategory ? "default" : "outline"}
                className="cursor-pointer hover:bg-primary/80"
                onClick={() => setSelectedCategory(null)}
                data-testid="chip-category-all"
              >
                All
              </Badge>
              {categories.slice(0, 5).map((cat) => (
                <Badge
                  key={cat.category}
                  variant={selectedCategory === cat.category ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/80"
                  onClick={() => {
                    setSelectedCategory(
                      selectedCategory === cat.category ? null : cat.category
                    );
                    setPage(1);
                  }}
                  data-testid={`chip-category-${cat.category}`}
                >
                  {cat.category} ({cat.count})
                </Badge>
              ))}
              {categories.length > 5 && (
                <Badge variant="secondary">+{categories.length - 5} more</Badge>
              )}
            </div>
          </div>

          {/* Sort Dropdown */}
          <Select value={sortBy} onValueChange={(value) => {
            setSortBy(value);
            setPage(1);
          }}>
            <SelectTrigger className="w-[200px]" data-testid="select-sort">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="most_popular">Most Popular</SelectItem>
              <SelectItem value="price_low_high">Price: Low to High</SelectItem>
              <SelectItem value="price_high_low">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Mobile/Collapsible Filters */}
        <Collapsible open={showFilters} className="lg:hidden mb-6">
          <CollapsibleContent>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Filters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Categories */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Category</label>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant={!selectedCategory ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setSelectedCategory(null)}
                    >
                      All
                    </Badge>
                    {categories.map((cat) => (
                      <Badge
                        key={cat.category}
                        variant={selectedCategory === cat.category ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => setSelectedCategory(cat.category)}
                      >
                        {cat.category} ({cat.count})
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    <DollarSign className="inline h-3 w-3 mr-1" />
                    Price Range: ${priceRange[0]} - ${priceRange[1]}
                  </label>
                  <Slider
                    value={priceRange}
                    onValueChange={setPriceRange as (value: number[]) => void}
                    min={0}
                    max={100}
                    step={5}
                    className="mt-2"
                  />
                </div>

                {/* Credits Range */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    <Coins className="inline h-3 w-3 mr-1" />
                    Credits Range: {creditsRange[0].toLocaleString()} -{" "}
                    {creditsRange[1].toLocaleString()}
                  </label>
                  <Slider
                    value={creditsRange}
                    onValueChange={setCreditsRange as (value: number[]) => void}
                    min={0}
                    max={10000}
                    step={100}
                    className="mt-2"
                  />
                </div>

                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetFilters}
                    className="w-full"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        <div className="flex gap-6">
          {/* Desktop Filters Sidebar */}
          <aside className="hidden lg:block w-64 shrink-0">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  Filters
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={resetFilters}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Categories */}
                <div>
                  <label className="text-sm font-medium mb-3 block">Category</label>
                  <div className="space-y-2">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="category"
                        checked={!selectedCategory}
                        onChange={() => setSelectedCategory(null)}
                        className="mr-2"
                      />
                      <span className="text-sm">All Categories</span>
                    </label>
                    {categories.map((cat) => (
                      <label key={cat.category} className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="category"
                          checked={selectedCategory === cat.category}
                          onChange={() => {
                            setSelectedCategory(cat.category);
                            setPage(1);
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm">
                          {cat.category} ({cat.count})
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Sub-Community Filter */}
                {user && (
                  <>
                    <div>
                      <label className="text-sm font-medium mb-3 block">
                        <Users className="inline h-3 w-3 mr-1" />
                        Sub-Community
                      </label>
                      <SubCommunitySelector
                        value={selectedSubCommunity}
                        onValueChange={(value) => {
                          setSelectedSubCommunity(value);
                          setPage(1);
                        }}
                        showAllOption={true}
                        placeholder="Filter by sub-community"
                      />
                    </div>
                    <Separator />
                  </>
                )}

                {/* Price Range */}
                <div>
                  <label className="text-sm font-medium mb-3 block">
                    <DollarSign className="inline h-3 w-3 mr-1" />
                    USD Price Range
                  </label>
                  <div className="px-2">
                    <Slider
                      value={priceRange}
                      onValueChange={(value) => {
                        setPriceRange(value as [number, number]);
                        setPage(1);
                      }}
                      min={0}
                      max={100}
                      step={5}
                      className="mb-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>${priceRange[0]}</span>
                      <span>${priceRange[1]}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Credits Range */}
                <div>
                  <label className="text-sm font-medium mb-3 block">
                    <Coins className="inline h-3 w-3 mr-1" />
                    Credits Range
                  </label>
                  <div className="px-2">
                    <Slider
                      value={creditsRange}
                      onValueChange={(value) => {
                        setCreditsRange(value as [number, number]);
                        setPage(1);
                      }}
                      min={0}
                      max={10000}
                      step={100}
                      className="mb-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{creditsRange[0].toLocaleString()}</span>
                      <span>{creditsRange[1].toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                {listingsData.total === 0
                  ? "No listings found"
                  : `Showing ${(page - 1) * limit + 1}-${Math.min(
                      page * limit,
                      listingsData.total
                    )} of ${listingsData.total} listings`}
              </p>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="lg:hidden"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>

            {/* Listings Grid */}
            {listingsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 9 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-0">
                      <Skeleton className="h-48 w-full" />
                      <div className="p-4 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-6 w-20" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : listingsData.listings.length === 0 ? (
              <Card className="p-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No listings found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your filters or search terms
                </p>
                <Button variant="outline" onClick={resetFilters}>
                  Clear all filters
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {listingsData.listings.map((listing: any) => (
                  <MarketplaceListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1 || isFetching}
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                        disabled={isFetching}
                        className="w-10"
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
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages || isFetching}
                  data-testid="button-next-page"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}