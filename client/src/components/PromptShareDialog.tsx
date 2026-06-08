import { useState, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Globe,
  Lock,
  Share2,
  ChevronRight,
  Package,
  AlertCircle,
  Check,
  X,
} from "lucide-react";
import type { Prompt, Community } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface PromptShareDialogProps {
  prompt: Prompt;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSubCommunityId?: string;
}

interface ShareSelection {
  subCommunityId: string;
  visibility: "private" | "parent_community" | "public";
}

export function PromptShareDialog({
  prompt,
  open,
  onOpenChange,
  currentSubCommunityId,
}: PromptShareDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selections, setSelections] = useState<ShareSelection[]>([]);
  const [isSharing, setIsSharing] = useState(false);
  const [shareResults, setShareResults] = useState<
    { subCommunityId: string; success: boolean; error?: string }[]
  >([]);

  // Fetch user's sub-communities
  const { data: subCommunities = [], isLoading } = useQuery<
    (Community & { parentCommunity?: Community; memberCount?: number })[]
  >({
    queryKey: ["/api/user/sub-communities"],
    enabled: open && !!user,
  });

  // Group sub-communities by parent
  const groupedSubCommunities = useMemo(() => {
    const groups: Map<string, typeof subCommunities> = new Map();
    
    subCommunities.forEach((subComm) => {
      const parentId = subComm.parentCommunityId || "unknown";
      const parentName = subComm.parentCommunity?.name || "Unknown Community";
      
      if (!groups.has(parentId)) {
        groups.set(parentId, []);
      }
      groups.get(parentId)?.push(subComm);
    });

    return Array.from(groups.entries()).map(([parentId, subs]) => ({
      parentId,
      parentName: subs[0]?.parentCommunity?.name || "Unknown Community",
      subCommunities: subs,
    }));
  }, [subCommunities]);

  // Filter out already shared sub-communities
  const availableSubCommunities = useMemo(() => {
    return subCommunities.filter(
      (sc) => sc.id !== currentSubCommunityId && sc.id !== prompt.subCommunityId
    );
  }, [subCommunities, currentSubCommunityId, prompt.subCommunityId]);

  const handleToggleSubCommunity = (
    subCommunityId: string,
    checked: boolean
  ) => {
    if (checked) {
      setSelections((prev) => [
        ...prev,
        { subCommunityId, visibility: "private" },
      ]);
    } else {
      setSelections((prev) =>
        prev.filter((s) => s.subCommunityId !== subCommunityId)
      );
    }
  };

  const handleVisibilityChange = (
    subCommunityId: string,
    visibility: "private" | "parent_community" | "public"
  ) => {
    setSelections((prev) =>
      prev.map((s) =>
        s.subCommunityId === subCommunityId ? { ...s, visibility } : s
      )
    );
  };

  const handleSelectAll = () => {
    if (selections.length === availableSubCommunities.length) {
      setSelections([]);
    } else {
      setSelections(
        availableSubCommunities.map((sc) => ({
          subCommunityId: sc.id,
          visibility: "private" as const,
        }))
      );
    }
  };

  const shareMutation = useMutation({
    mutationFn: async () => {
      setIsSharing(true);
      const results = [];

      for (const selection of selections) {
        try {
          const response = await apiRequest(
            "POST",
            `/api/prompts/${prompt.id}/share-to-sub-community`,
            {
              subCommunityId: selection.subCommunityId,
              visibility: selection.visibility,
            }
          );

          if (response.ok) {
            results.push({ subCommunityId: selection.subCommunityId, success: true });
          } else {
            const error = await response.json();
            results.push({
              subCommunityId: selection.subCommunityId,
              success: false,
              error: error.message,
            });
          }
        } catch (error) {
          results.push({
            subCommunityId: selection.subCommunityId,
            success: false,
            error: "Network error",
          });
        }
      }

      return results;
    },
    onSuccess: (results) => {
      setShareResults(results);
      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      if (successCount > 0 && failCount === 0) {
        toast({
          title: "Success",
          description: `Prompt shared to ${successCount} sub-communit${
            successCount === 1 ? "y" : "ies"
          }`,
        });
        setTimeout(() => {
          onOpenChange(false);
          setSelections([]);
          setShareResults([]);
        }, 1500);
      } else if (successCount > 0) {
        toast({
          title: "Partial Success",
          description: `Shared to ${successCount} sub-communities, ${failCount} failed`,
          variant: "default",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to share prompt to selected sub-communities",
          variant: "destructive",
        });
      }

      // Invalidate relevant queries
      queryClient.invalidateQueries({
        predicate: (query) =>
          (query.queryKey[0]?.toString().includes("/sub-communities") &&
          query.queryKey[0]?.toString().includes("/prompts")) as boolean,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to share prompt",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSharing(false);
    },
  });

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case "public":
        return <Globe className="h-3 w-3" />;
      case "parent_community":
        return <Users className="h-3 w-3" />;
      case "private":
      default:
        return <Lock className="h-3 w-3" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Share Prompt to Sub-Communities</DialogTitle>
          <DialogDescription>
            Select sub-communities to share this prompt with and set visibility for each.
          </DialogDescription>
        </DialogHeader>

        {/* Prompt Preview */}
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-16 h-16 bg-background rounded-md overflow-hidden">
                {prompt.exampleImagesUrl?.[0] ? (
                  <img
                    src={prompt.exampleImagesUrl[0]}
                    alt={prompt.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate">{prompt.name}</h4>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {prompt.description || "No description"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Sub-Communities List */}
        <ScrollArea className="flex-1 min-h-[300px]">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : availableSubCommunities.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                You're not a member of any other sub-communities
              </p>
            </div>
          ) : (
            <div className="space-y-4 p-4">
              {/* Select All */}
              {availableSubCommunities.length > 1 && (
                <>
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAll}
                      data-testid="button-select-all"
                    >
                      <Checkbox
                        checked={selections.length === availableSubCommunities.length}
                        className="mr-2"
                      />
                      Select All ({availableSubCommunities.length})
                    </Button>
                  </div>
                  <Separator />
                </>
              )}

              {/* Grouped Sub-Communities */}
              {groupedSubCommunities.map(({ parentId, parentName, subCommunities: subs }) => (
                <div key={parentId} className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {parentName}
                  </Label>
                  <div className="space-y-2">
                    {subs
                      .filter((sc) => sc.id !== currentSubCommunityId)
                      .map((subComm) => {
                        const selection = selections.find(
                          (s) => s.subCommunityId === subComm.id
                        );
                        const isSelected = !!selection;
                        const shareResult = shareResults.find(
                          (r) => r.subCommunityId === subComm.id
                        );

                        return (
                          <div
                            key={subComm.id}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-lg border",
                              isSelected ? "bg-accent/50 border-primary/20" : "bg-background",
                              shareResult?.success === true && "border-green-500",
                              shareResult?.success === false && "border-destructive"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) =>
                                  handleToggleSubCommunity(subComm.id, !!checked)
                                }
                                disabled={isSharing}
                                data-testid={`checkbox-${subComm.id}`}
                              />
                              <div>
                                <Label className="text-sm font-medium cursor-pointer">
                                  {subComm.name}
                                </Label>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>{subComm.memberCount || 0} members</span>
                                  {subComm.id === prompt.subCommunityId && (
                                    <Badge variant="secondary" className="text-xs">
                                      Already shared
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {shareResult && (
                                <div>
                                  {shareResult.success ? (
                                    <Check className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <X className="h-4 w-4 text-destructive" />
                                  )}
                                </div>
                              )}
                              {isSelected && !shareResult && (
                                <Select
                                  value={selection.visibility}
                                  onValueChange={(v) =>
                                    handleVisibilityChange(
                                      subComm.id,
                                      v as "private" | "parent_community" | "public"
                                    )
                                  }
                                  disabled={isSharing}
                                >
                                  <SelectTrigger 
                                    className="w-[140px]" 
                                    data-testid={`select-visibility-${subComm.id}`}
                                  >
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="private">
                                      <div className="flex items-center gap-2">
                                        <Lock className="h-3 w-3" />
                                        Members Only
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="parent_community">
                                      <div className="flex items-center gap-2">
                                        <Users className="h-3 w-3" />
                                        Parent Community
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="public">
                                      <div className="flex items-center gap-2">
                                        <Globe className="h-3 w-3" />
                                        Public
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {shareResults.some((r) => !r.success) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Some shares failed. Please try again for failed items.
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setSelections([]);
              setShareResults([]);
            }}
            disabled={isSharing}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button
            onClick={() => shareMutation.mutate()}
            disabled={selections.length === 0 || isSharing}
            data-testid="button-share"
          >
            {isSharing ? (
              "Sharing..."
            ) : (
              <>
                <Share2 className="mr-2 h-4 w-4" />
                Share to {selections.length} Sub-Communit
                {selections.length === 1 ? "y" : "ies"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}