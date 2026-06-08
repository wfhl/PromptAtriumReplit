import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Prompt } from "@shared/schema";

interface FilterState {
  visibility: string[];
  dateRange: { start: Date | null; end: Date | null };
  authors: string[];
  tags: string[];
}

interface UseSubCommunityContentOptions {
  subCommunityId: string;
  contentType: "prompts" | "collections" | "discussions";
  sortBy: "newest" | "popular" | "most-used";
  filters: FilterState;
  pageSize?: number;
  enabled?: boolean;
}

interface UseSubCommunityContentReturn {
  prompts: Prompt[];
  collections: any[]; // Will be implemented when collections are added
  discussions: any[]; // Will be implemented when discussions are added
  isLoading: boolean;
  error: Error | null;
  page: number;
  setPage: (page: number) => void;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  refetch: () => void;
}

export function useSubCommunityContent({
  subCommunityId,
  contentType,
  sortBy,
  filters,
  pageSize = 12,
  enabled = true,
}: UseSubCommunityContentOptions): UseSubCommunityContentReturn {
  const [page, setPage] = useState(1);

  // Reset page when filters or sort changes
  useEffect(() => {
    setPage(1);
  }, [sortBy, filters, contentType]);

  // Build query parameters
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    
    // Pagination
    params.append("page", page.toString());
    params.append("pageSize", pageSize.toString());
    
    // Sorting
    params.append("sortBy", sortBy);
    
    // Visibility filters
    if (filters.visibility.length > 0) {
      filters.visibility.forEach((v) => params.append("visibility", v));
    }
    
    // Date range
    if (filters.dateRange.start) {
      params.append("startDate", filters.dateRange.start.toISOString());
    }
    if (filters.dateRange.end) {
      params.append("endDate", filters.dateRange.end.toISOString());
    }
    
    // Authors
    if (filters.authors.length > 0) {
      filters.authors.forEach((a) => params.append("author", a));
    }
    
    // Tags
    if (filters.tags.length > 0) {
      filters.tags.forEach((t) => params.append("tag", t));
    }
    
    return params.toString();
  }, [page, pageSize, sortBy, filters]);

  // Fetch prompts (main content type for now)
  const {
    data: promptsData,
    isLoading: loadingPrompts,
    error: promptsError,
    refetch: refetchPrompts,
  } = useQuery<{
    items: Prompt[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>({
    queryKey: [`/api/sub-communities/${subCommunityId}/prompts?${queryParams}`],
    enabled: enabled && contentType === "prompts" && !!subCommunityId,
  });

  // Placeholder for collections (future implementation)
  const {
    data: collectionsData,
    isLoading: loadingCollections,
    error: collectionsError,
  } = useQuery<{
    items: Prompt[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>({
    queryKey: [`/api/sub-communities/${subCommunityId}/collections?${queryParams}`],
    enabled: false, // Disabled until implemented
  });

  // Placeholder for discussions (future implementation)
  const {
    data: discussionsData,
    isLoading: loadingDiscussions,
    error: discussionsError,
  } = useQuery<{
    items: Prompt[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>({
    queryKey: [`/api/sub-communities/${subCommunityId}/discussions?${queryParams}`],
    enabled: false, // Disabled until implemented
  });

  // Determine which data to return based on content type
  const isLoading = useMemo(() => {
    switch (contentType) {
      case "prompts":
        return loadingPrompts;
      case "collections":
        return loadingCollections;
      case "discussions":
        return loadingDiscussions;
      default:
        return false;
    }
  }, [contentType, loadingPrompts, loadingCollections, loadingDiscussions]);

  const error = useMemo(() => {
    switch (contentType) {
      case "prompts":
        return promptsError;
      case "collections":
        return collectionsError;
      case "discussions":
        return discussionsError;
      default:
        return null;
    }
  }, [contentType, promptsError, collectionsError, discussionsError]);

  const data = useMemo(() => {
    switch (contentType) {
      case "prompts":
        return promptsData;
      case "collections":
        return collectionsData;
      case "discussions":
        return discussionsData;
      default:
        return null;
    }
  }, [contentType, promptsData, collectionsData, discussionsData]);

  const refetch = useMemo(() => {
    switch (contentType) {
      case "prompts":
        return refetchPrompts;
      case "collections":
        return () => Promise.resolve({ data: null, error: null, isSuccess: false, isError: false });
      case "discussions":
        return () => Promise.resolve({ data: null, error: null, isSuccess: false, isError: false });
      default:
        return () => Promise.resolve({ data: null, error: null, isSuccess: false, isError: false });
    }
  }, [contentType, refetchPrompts]);

  return {
    prompts: data?.items || [],
    collections: [], // To be implemented
    discussions: [], // To be implemented
    isLoading,
    error: error as Error | null,
    page,
    setPage,
    totalPages: data?.totalPages || 1,
    totalItems: data?.total || 0,
    hasNextPage: page < (data?.totalPages || 1),
    hasPrevPage: page > 1,
    refetch,
  };
}