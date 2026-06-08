import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Flag,
  Shield,
  AlertTriangle,
  Eye,
  EyeOff,
  Check,
  X,
  Search,
  Filter,
  ChevronRight,
  MessageSquare,
  Image,
  FileText,
  Clock,
  User,
  MoreVertical,
  Ban,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Prompt, User as UserType } from "@shared/schema";

interface FlaggedContent {
  id: string;
  type: "prompt" | "image" | "comment";
  content: any; // This would be Prompt | Image | Comment
  reporter: UserType;
  reportedUser: UserType;
  reason: string;
  description?: string;
  status: "pending" | "reviewing" | "resolved" | "dismissed";
  priority: "low" | "medium" | "high" | "critical";
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: UserType;
  resolution?: string;
}

interface ModerationAction {
  id: string;
  contentId: string;
  action: "approve" | "remove" | "warn" | "ban" | "dismiss";
  moderator: UserType;
  reason: string;
  timestamp: Date;
}

export function ContentModerationHub() {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState<FlaggedContent | null>(null);
  const [actionReason, setActionReason] = useState("");

  // Fetch flagged content
  const { data: flaggedContent = [], isLoading: contentLoading } = useQuery<FlaggedContent[]>({
    queryKey: ["/api/admin/moderation/flagged", selectedTab, priorityFilter, typeFilter],
  });

  // Fetch moderation statistics
  const { data: stats } = useQuery<any>({
    queryKey: ["/api/admin/moderation/stats"],
  });

  // Moderation action mutation
  const moderateContentMutation = useMutation({
    mutationFn: async ({ 
      contentIds, 
      action, 
      reason 
    }: { 
      contentIds: string[]; 
      action: string; 
      reason: string 
    }) => {
      return apiRequest("POST", "/api/admin/moderation/action", {
        contentIds,
        action,
        reason,
      });
    },
    onSuccess: () => {
      // Invalidate the correct query keys
      queryClient.invalidateQueries({ queryKey: ["/api/admin/moderation/flagged"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/moderation/stats"] });
      setSelectedItems(new Set());
      setReviewModalOpen(false);
      toast({
        title: "Success",
        description: "Moderation action completed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to moderate content",
        variant: "destructive",
      });
    },
  });

  const handleSelectAll = () => {
    if (selectedItems.size === filteredContent.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredContent.map(item => item.id)));
    }
  };

  const handleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleBulkAction = (action: string) => {
    if (selectedItems.size === 0) {
      toast({
        title: "No items selected",
        description: "Please select items to perform this action",
        variant: "destructive",
      });
      return;
    }
    
    moderateContentMutation.mutate({
      contentIds: Array.from(selectedItems),
      action,
      reason: `Bulk ${action} action`,
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "text-red-500";
      case "high": return "text-orange-500";
      case "medium": return "text-yellow-500";
      case "low": return "text-blue-500";
      default: return "text-gray-500";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="secondary">Pending</Badge>;
      case "reviewing": return <Badge variant="default">Reviewing</Badge>;
      case "resolved": return <Badge variant="default" className="bg-green-500">Resolved</Badge>;
      case "dismissed": return <Badge variant="outline">Dismissed</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const filteredContent = flaggedContent.filter((item: FlaggedContent) => {
    const matchesSearch = !searchTerm || 
      item.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.reportedUser.username?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPriority = priorityFilter === "all" || item.priority === priorityFilter;
    const matchesType = typeFilter === "all" || item.type === typeFilter;
    
    return matchesSearch && matchesPriority && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {stats?.pending || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Requires immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">In Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {stats?.reviewing || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently being reviewed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {stats?.resolvedToday || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Successfully moderated
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {stats?.critical || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              High priority items
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div>
              <CardTitle>Content Moderation Queue</CardTitle>
              <CardDescription>
                Review and moderate flagged content from the community
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction("approve")}
                disabled={selectedItems.size === 0}
              >
                <Check className="h-4 w-4 mr-1" />
                Approve Selected
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleBulkAction("remove")}
                disabled={selectedItems.size === 0}
              >
                <X className="h-4 w-4 mr-1" />
                Remove Selected
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters Row */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by reason, description, or username..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-moderation"
                />
              </div>
            </div>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-priority-filter">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-type-filter">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="prompt">Prompts</SelectItem>
                <SelectItem value="image">Images</SelectItem>
                <SelectItem value="comment">Comments</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabs */}
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="reviewing">In Review</TabsTrigger>
              <TabsTrigger value="resolved">Resolved</TabsTrigger>
              <TabsTrigger value="dismissed">Dismissed</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTab} className="mt-6">
              {contentLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading content...</p>
                </div>
              ) : filteredContent.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No flagged content to review</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Select All Checkbox */}
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Checkbox
                      checked={selectedItems.size === filteredContent.length && filteredContent.length > 0}
                      onCheckedChange={handleSelectAll}
                      data-testid="checkbox-select-all"
                    />
                    <span className="text-sm text-muted-foreground">
                      Select all ({filteredContent.length} items)
                    </span>
                  </div>

                  {/* Content List */}
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-4 pr-4">
                      {filteredContent.map((item: FlaggedContent) => (
                        <Card key={item.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              <Checkbox
                                checked={selectedItems.has(item.id)}
                                onCheckedChange={() => handleSelectItem(item.id)}
                                data-testid={`checkbox-item-${item.id}`}
                              />
                              
                              <div className="flex-1 space-y-3">
                                {/* Header */}
                                <div className="flex justify-between items-start">
                                  <div className="flex items-center gap-3">
                                    {item.type === "prompt" && <FileText className="h-4 w-4" />}
                                    {item.type === "image" && <Image className="h-4 w-4" />}
                                    {item.type === "comment" && <MessageSquare className="h-4 w-4" />}
                                    <span className="font-medium">{item.type}</span>
                                    <Badge className={getPriorityColor(item.priority)}>
                                      {item.priority}
                                    </Badge>
                                    {getStatusBadge(item.status)}
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedContent(item);
                                      setReviewModalOpen(true);
                                    }}
                                    data-testid={`button-review-${item.id}`}
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    Review
                                  </Button>
                                </div>

                                {/* Content Preview */}
                                <div className="bg-muted/50 p-3 rounded-md">
                                  <p className="text-sm line-clamp-2">
                                    {item.content?.content || item.content?.text || "No preview available"}
                                  </p>
                                </div>

                                {/* Report Details */}
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-sm">
                                    <Flag className="h-3 w-3 text-red-500" />
                                    <span className="font-medium">Reason:</span>
                                    <span>{item.reason}</span>
                                  </div>
                                  {item.description && (
                                    <p className="text-sm text-muted-foreground">
                                      {item.description}
                                    </p>
                                  )}
                                </div>

                                {/* Users Info */}
                                <div className="flex justify-between items-center text-sm">
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">Reported by:</span>
                                    <span className="font-medium">
                                      {item.reporter.username || item.reporter.email}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">Content by:</span>
                                    <span className="font-medium">
                                      {item.reportedUser.username || item.reportedUser.email}
                                    </span>
                                  </div>
                                </div>

                                {/* Timestamp */}
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  <span>Reported {format(new Date(item.createdAt), "MMM dd, yyyy HH:mm")}</span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Review Modal */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Flagged Content</DialogTitle>
            <DialogDescription>
              Review the content and take appropriate moderation action
            </DialogDescription>
          </DialogHeader>
          
          {selectedContent && (
            <div className="space-y-4 mt-4">
              {/* Content Details */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Content</h3>
                <div className="bg-muted/50 p-4 rounded-md">
                  <p className="whitespace-pre-wrap">
                    {selectedContent.content?.content || 
                     selectedContent.content?.text || 
                     "Content not available"}
                  </p>
                </div>
              </div>

              {/* Report Information */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Report Details</h3>
                <div className="space-y-2">
                  <div>
                    <span className="font-medium">Reason: </span>
                    <span>{selectedContent.reason}</span>
                  </div>
                  {selectedContent.description && (
                    <div>
                      <span className="font-medium">Description: </span>
                      <span>{selectedContent.description}</span>
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Priority: </span>
                    <Badge className={getPriorityColor(selectedContent.priority)}>
                      {selectedContent.priority}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Action Input */}
              <div>
                <label className="text-sm font-medium">Action Reason/Notes</label>
                <Textarea
                  placeholder="Provide a reason for your moderation action..."
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="mt-2"
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                moderateContentMutation.mutate({
                  contentIds: [selectedContent!.id],
                  action: "dismiss",
                  reason: actionReason || "Dismissed after review",
                });
              }}
            >
              Dismiss
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                moderateContentMutation.mutate({
                  contentIds: [selectedContent!.id],
                  action: "warn",
                  reason: actionReason || "Warning issued",
                });
              }}
            >
              <AlertTriangle className="h-4 w-4 mr-1" />
              Warn User
            </Button>
            <Button
              variant="default"
              onClick={() => {
                moderateContentMutation.mutate({
                  contentIds: [selectedContent!.id],
                  action: "approve",
                  reason: actionReason || "Content approved",
                });
              }}
            >
              <Check className="h-4 w-4 mr-1" />
              Approve
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                moderateContentMutation.mutate({
                  contentIds: [selectedContent!.id],
                  action: "remove",
                  reason: actionReason || "Content removed for violation",
                });
              }}
            >
              <X className="h-4 w-4 mr-1" />
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}