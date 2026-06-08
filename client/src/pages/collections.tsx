import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FolderPlus, 
  Folder, 
  Search, 
  Edit, 
  Trash2,
  ArrowLeft,
  BookOpen,
  Lock,
  Globe,
  Filter,
  SortAsc,
  SortDesc,
  Calendar,
  Type
} from "lucide-react";
import { Link } from "wouter";
import { ShineBorder } from "@/components/ui/shine-border";

const collectionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  isPublic: z.boolean().default(false),
});

type CollectionFormData = z.infer<typeof collectionSchema>;

export default function CollectionsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "public" | "private">("all");
  const [sortBy, setSortBy] = useState<"name" | "date" | "type">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const createForm = useForm<CollectionFormData>({
    resolver: zodResolver(collectionSchema),
    defaultValues: {
      name: "",
      description: "",
      isPublic: false,
    },
  });

  const editForm = useForm<CollectionFormData>({
    resolver: zodResolver(collectionSchema),
    defaultValues: {
      name: "",
      description: "",
      isPublic: false,
    },
  });

  // Fetch user's personal collections with better caching and error handling
  const { data: collections = [], isLoading, refetch, error } = useQuery<any[]>({
    queryKey: ["/api/collections"],
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount: number, error: any) => {
      // Don't retry on 401/403 errors
      if ((error as any)?.message?.includes("401") || (error as any)?.message?.includes("403")) {
        return false;
      }
      return failureCount < 2;
    },
  } as any);

  // Create collection mutation
  const createCollectionMutation = useMutation({
    mutationFn: async (data: CollectionFormData) => {
      return await apiRequest("POST", "/api/collections", {
        ...data,
        type: "user",
      });
    },
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      createForm.reset();
      setCreateModalOpen(false);
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

  // Update collection mutation
  const updateCollectionMutation = useMutation({
    mutationFn: async (data: CollectionFormData) => {
      return await apiRequest("PUT", `/api/collections/${selectedCollection.id}`, data);
    },
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      setEditModalOpen(false);
      setSelectedCollection(null);
      toast({
        title: "Success",
        description: "Collection updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update collection",
        variant: "destructive",
      });
    },
  });

  // Delete collection mutation
  const deleteCollectionMutation = useMutation({
    mutationFn: async (collectionId: string) => {
      return await apiRequest("DELETE", `/api/collections/${collectionId}`);
    },
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      toast({
        title: "Success",
        description: "Collection deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete collection",
        variant: "destructive",
      });
    },
  });

  const onCreateSubmit = (data: CollectionFormData) => {
    createCollectionMutation.mutate(data);
  };

  const onEditSubmit = (data: CollectionFormData) => {
    updateCollectionMutation.mutate(data);
  };

  const openEditModal = (collection: any) => {
    setSelectedCollection(collection);
    editForm.reset({
      name: collection.name,
      description: collection.description || "",
      isPublic: collection.isPublic || false,
    });
    setEditModalOpen(true);
  };

  // Advanced filtering, searching, and sorting with memoization
  const filteredAndSortedCollections = useMemo(() => {
    let filtered = collections;

    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((collection: any) =>
        collection.name?.toLowerCase().includes(searchLower) ||
        collection.description?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by type
    if (filterType !== "all") {
      filtered = filtered.filter((collection: any) => {
        if (filterType === "public") return collection.isPublic;
        if (filterType === "private") return !collection.isPublic;
        return true;
      });
    }

    // Sort collections
    const sorted = [...filtered].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case "name":
          aValue = a.name?.toLowerCase() || "";
          bValue = b.name?.toLowerCase() || "";
          break;
        case "date":
          aValue = new Date(a.createdAt || 0).getTime();
          bValue = new Date(b.createdAt || 0).getTime();
          break;
        case "type":
          aValue = a.isPublic ? "public" : "private";
          bValue = b.isPublic ? "public" : "private";
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [collections, searchTerm, filterType, sortBy, sortOrder]);

  // Debounced search to improve performance
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background dark:bg-gray-950">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
                <Folder className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                My Collections
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Organize your prompts into collections for easy access and sharing
              </p>
            </div>
          </div>
          
          <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2" data-testid="button-create-collection">
                <FolderPlus className="h-4 w-4" />
                New Collection
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Collection</DialogTitle>
              </DialogHeader>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                  <FormField
                    control={createForm.control}
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
                    control={createForm.control}
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
                    control={createForm.control}
                    name="isPublic"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel>Make Public</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Allow others to discover and view this collection
                          </div>
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
                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createCollectionMutation.isPending}
                      data-testid="button-submit-create-collection"
                    >
                      {createCollectionMutation.isPending ? "Creating..." : "Create Collection"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Advanced Search and Filters */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search collections..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
                data-testid="input-search-collections"
              />
            </div>
            
            <div className="flex items-center gap-2">
              {/* Filter Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    {filterType === "all" ? "All" : filterType === "public" ? "Public" : "Private"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setFilterType("all")}>
                    <Folder className="h-4 w-4 mr-2" />
                    All Collections
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType("public")}>
                    <Globe className="h-4 w-4 mr-2" />
                    Public Only
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType("private")}>
                    <Lock className="h-4 w-4 mr-2" />
                    Private Only
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Sort Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    {sortOrder === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                    Sort
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => { setSortBy("name"); setSortOrder("asc"); }}>
                    <Type className="h-4 w-4 mr-2" />
                    Name A-Z
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortBy("name"); setSortOrder("desc"); }}>
                    <Type className="h-4 w-4 mr-2" />
                    Name Z-A
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { setSortBy("date"); setSortOrder("desc"); }}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Newest First
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortBy("date"); setSortOrder("asc"); }}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Oldest First
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Badge variant="secondary" className="flex items-center justify-center gap-1">
                <BookOpen className="h-3 w-3" />
                {filteredAndSortedCollections.length} of {collections.length}
              </Badge>
            </div>
          </div>
        </div>

        {/* Collections Grid - Masonry Layout */}
        {filteredAndSortedCollections.length === 0 ? (
          <div className="text-center py-12">
            <Folder className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50 dark:text-gray-600" />
            <h3 className="text-xl font-semibold mb-2 text-foreground dark:text-gray-200">
              {searchTerm ? "No collections found" : "No collections yet"}
            </h3>
            <p className="text-muted-foreground dark:text-gray-400 mb-4">
              {searchTerm 
                ? "Try adjusting your search terms" 
                : "Create your first collection to organize your prompts"
              }
            </p>
            {!searchTerm && (
              <Button onClick={() => setCreateModalOpen(true)} data-testid="button-create-first-collection">
                <FolderPlus className="h-4 w-4 mr-2" />
                Create Your First Collection
              </Button>
            )}
          </div>
        ) : (
          <div className="columns-2 md:columns-3 lg:columns-4 gap-2 space-y-2">
            {filteredAndSortedCollections.map((collection: any) => (
              <ShineBorder
                key={collection.id}
                className="w-full break-inside-avoid mb-2"
                color={["#8B7FC8", "#C880A1", "#D4A878"]}
                borderRadius={8}
                borderWidth={0.5}
                duration={15}
              >
                <Card className="border-0 hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-3">
                    {/* Display example images if available */}
                    {collection.exampleImages && collection.exampleImages.length > 0 && (
                      <div className="grid grid-cols-2 gap-0.5 mb-2">
                        {collection.exampleImages.slice(0, 4).map((imageUrl: string, index: number) => (
                          <div key={index} className="aspect-square rounded overflow-hidden bg-muted">
                            <img
                              src={imageUrl}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        ))}
                        {/* Fill empty slots with placeholders */}
                        {collection.exampleImages.length < 4 && [...Array(4 - collection.exampleImages.length)].map((_: any, i: number) => (
                          <div key={`placeholder-${i}`} className="aspect-square rounded bg-muted/50" />
                        ))}
                      </div>
                    )}

                    <div className="flex items-start justify-between mb-2">
                      <Link href={`/collection/${collection.id}`} className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-indigo-600 rounded flex items-center justify-center flex-shrink-0">
                            <Folder className="h-3 w-3 text-white" />
                          </div>
                          <h3 className="font-semibold text-sm text-foreground line-clamp-1">
                            {collection.name}
                          </h3>
                        </div>
                      </Link>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditModal(collection)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => deleteCollectionMutation.mutate(collection.id)}
                            disabled={deleteCollectionMutation.isPending}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {collection.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {collection.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Badge variant={collection.isPublic ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                          {collection.isPublic ? (
                            <>
                              <Globe className="h-3 w-3 mr-1" />
                              Public
                            </>
                          ) : (
                            <>
                              <Lock className="h-3 w-3 mr-1" />
                              Private
                            </>
                          )}
                        </Badge>
                        <span className="text-muted-foreground">
                          {collection.promptCount || 0} prompts
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </ShineBorder>
            ))}
          </div>
        )}

        {/* Edit Collection Modal */}
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Collection</DialogTitle>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Collection Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-collection-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} data-testid="textarea-edit-collection-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="isPublic"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel>Make Public</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Allow others to discover and view this collection
                        </div>
                      </div>
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="h-4 w-4"
                          data-testid="checkbox-edit-collection-public"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateCollectionMutation.isPending}
                    data-testid="button-submit-edit-collection"
                  >
                    {updateCollectionMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}