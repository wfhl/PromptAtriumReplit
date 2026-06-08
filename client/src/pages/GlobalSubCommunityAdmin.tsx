import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CheckCircle,
  XCircle,
  Clock,
  Copy,
  Users,
  Shield,
  Ticket,
  Activity,
  Search,
  MoreVertical,
  UserPlus,
  UserMinus,
  Calendar,
  Link2,
  Filter,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Community, SubCommunityInvite, UserCommunity, User } from "@shared/schema";

interface SubCommunityWithInvites extends Community {
  invites?: SubCommunityInvite[];
  members?: (UserCommunity & { user: User })[];
}

interface UserGroupMembership {
  user: User;
  memberships: {
    community: Community;
    role: string;
    joinedAt: Date;
  }[];
}

export function GlobalSubCommunityAdmin() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("invites");
  const [inviteFilter, setInviteFilter] = useState<"all" | "active" | "used" | "expired">("all");
  const [selectedSubCommunity, setSelectedSubCommunity] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch all communities and sub-communities
  const { data: communities = [], isLoading: communitiesLoading, error: communitiesError } = useQuery<Community[]>({
    queryKey: ['/api/admin/communities'],
    enabled: isAuthenticated,
  });

  // Fetch all sub-community invites
  const { data: allInvites = [], isLoading: invitesLoading } = useQuery<SubCommunityInvite[]>({
    queryKey: ['/api/admin/sub-community-invites'],
    enabled: isAuthenticated,
  });

  // Fetch all user memberships
  const { data: userMemberships = [], isLoading: membershipsLoading } = useQuery<UserGroupMembership[]>({
    queryKey: ['/api/admin/user-memberships'],
    enabled: isAuthenticated,
  });

  // Filter sub-communities only
  const subCommunities = communities.filter(c => c.parentCommunityId !== null);

  // Filter invites based on selected filters
  const filteredInvites = allInvites.filter(invite => {
    if (selectedSubCommunity !== "all" && invite.subCommunityId !== selectedSubCommunity) {
      return false;
    }

    if (inviteFilter === "active") {
      return invite.isActive && (!invite.expiresAt || new Date(invite.expiresAt) > new Date());
    }
    if (inviteFilter === "used") {
      return invite.currentUses! > 0;
    }
    if (inviteFilter === "expired") {
      return invite.expiresAt && new Date(invite.expiresAt) <= new Date();
    }
    
    return true;
  });

  // Filter users based on search
  const filteredUsers = userMemberships.filter(um => {
    const searchLower = searchTerm.toLowerCase();
    const userName = `${um.user.firstName || ""} ${um.user.lastName || ""}`.toLowerCase();
    const email = um.user.email?.toLowerCase() || "";
    const username = um.user.username?.toLowerCase() || "";
    
    return (
      userName.includes(searchLower) ||
      email.includes(searchLower) ||
      username.includes(searchLower)
    );
  });

  const copyInviteLink = async (invite: SubCommunityInvite) => {
    const link = `${window.location.origin}/invite/${invite.code}`;
    await navigator.clipboard.writeText(link);
    setCopiedId(invite.id);
    toast({
      title: "Copied!",
      description: "Invite link copied to clipboard",
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const deactivateInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const response = await apiRequest("DELETE", `/api/sub-communities/invites/${inviteId}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sub-community-invites'] });
      toast({
        title: "Invite deactivated",
        description: "The invite link has been deactivated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to deactivate",
        description: error.message || "Could not deactivate invite",
        variant: "destructive",
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, subCommunityId, role }: { 
      userId: string; 
      subCommunityId: string; 
      role: "member" | "admin" 
    }) => {
      const response = await apiRequest(
        "PUT",
        `/api/sub-communities/${subCommunityId}/members/${userId}/role`,
        { role }
      );
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/user-memberships'] });
      toast({
        title: "Role updated",
        description: "User role has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update role",
        description: error.message || "Could not update user role",
        variant: "destructive",
      });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async ({ userId, subCommunityId }: { userId: string; subCommunityId: string }) => {
      const response = await apiRequest(
        "DELETE",
        `/api/sub-communities/${subCommunityId}/members/${userId}`
      );
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/user-memberships'] });
      toast({
        title: "Member removed",
        description: "User has been removed from the sub-community",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to remove member",
        description: error.message || "Could not remove member",
        variant: "destructive",
      });
    },
  });

  // Check if current user is super admin
  const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'developer';

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    } else if (!isSuperAdmin && isAuthenticated) {
      toast({
        title: "Access Denied",
        description: "You must be a super admin to access this page",
        variant: "destructive",
      });
      setLocation("/admin");
    }
  }, [isAuthenticated, isSuperAdmin, setLocation, toast]);

  if (communitiesLoading || invitesLoading || membershipsLoading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (communitiesError) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load data. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const getInviteStatus = (invite: SubCommunityInvite) => {
    const now = new Date();
    const expired = invite.expiresAt && new Date(invite.expiresAt) <= now;
    const maxUsesReached = invite.maxUses && invite.currentUses! >= invite.maxUses;
    
    if (!invite.isActive) {
      return { label: "Deactivated", variant: "secondary" as const, icon: XCircle };
    }
    if (expired) {
      return { label: "Expired", variant: "destructive" as const, icon: Clock };
    }
    if (maxUsesReached) {
      return { label: "Full", variant: "secondary" as const, icon: Users };
    }
    return { label: "Active", variant: "default" as const, icon: CheckCircle };
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setLocation("/admin")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8" />
              Global Sub-Community Management
            </h1>
            <p className="text-muted-foreground">
              Manage invites and memberships across all sub-communities
            </p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Sub-Communities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subCommunities.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Invites</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {allInvites.filter(i => i.isActive && (!i.expiresAt || new Date(i.expiresAt) > new Date())).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Uses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {allInvites.reduce((sum, invite) => sum + invite.currentUses!, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userMemberships.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="invites">Invites Management</TabsTrigger>
          <TabsTrigger value="members">User-Group Management</TabsTrigger>
        </TabsList>

        {/* Invites Tab */}
        <TabsContent value="invites" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Sub-Community Invites</CardTitle>
              <CardDescription>
                View and manage invite links across all sub-communities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex gap-4 mb-4">
                <Select value={selectedSubCommunity} onValueChange={setSelectedSubCommunity}>
                  <SelectTrigger className="w-[200px]" data-testid="select-subcommunity">
                    <SelectValue placeholder="Filter by sub-community" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sub-Communities</SelectItem>
                    {subCommunities.map(sc => (
                      <SelectItem key={sc.id} value={sc.id}>{sc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={inviteFilter} onValueChange={(v: any) => setInviteFilter(v)}>
                  <SelectTrigger className="w-[150px]" data-testid="select-status">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active Only</SelectItem>
                    <SelectItem value="used">Used</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Invites Table */}
              {filteredInvites.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Ticket className="h-12 w-12 mx-auto mb-2" />
                  <p>No invites found</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sub-Community</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Uses</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvites.map(invite => {
                        const status = getInviteStatus(invite);
                        const StatusIcon = status.icon;
                        const subCommunity = subCommunities.find(sc => sc.id === invite.subCommunityId);
                        
                        return (
                          <TableRow key={invite.id} data-testid={`invite-row-${invite.id}`}>
                            <TableCell>
                              <Badge variant="outline">
                                {subCommunity?.name || "Unknown"}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {invite.code}
                            </TableCell>
                            <TableCell>
                              <Badge variant={status.variant} className="flex items-center gap-1 w-fit">
                                <StatusIcon className="h-3 w-3" />
                                {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {invite.role === "admin" ? (
                                  <>
                                    <Shield className="h-3 w-3 mr-1" />
                                    Admin
                                  </>
                                ) : (
                                  "Member"
                                )}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">
                                {invite.currentUses}/{invite.maxUses || "∞"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">
                                {format(new Date(invite.createdAt as any), "MMM d, yyyy")}
                              </span>
                            </TableCell>
                            <TableCell>
                              {invite.expiresAt ? (
                                <span className="text-sm flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(invite.expiresAt), "MMM d, yyyy")}
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground">Never</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => copyInviteLink(invite)}
                                  data-testid={`button-copy-${invite.id}`}
                                >
                                  {copiedId === invite.id ? (
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </Button>
                                {invite.isActive && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => deactivateInviteMutation.mutate(invite.id)}
                                    disabled={deactivateInviteMutation.isPending}
                                    data-testid={`button-deactivate-${invite.id}`}
                                  >
                                    <XCircle className="h-4 w-4 text-red-500" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User-Group Memberships</CardTitle>
              <CardDescription>
                View and manage which users are members of which sub-communities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Search */}
              <div className="relative max-w-sm mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by name, email, or username..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-users"
                />
              </div>

              {/* Users Table */}
              {filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2" />
                  <p>No users found</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Sub-Communities</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map(um => {
                        const userName = `${um.user.firstName || ""} ${um.user.lastName || ""}`.trim() || 
                                        um.user.username || 
                                        "Anonymous";
                        
                        return (
                          <TableRow key={um.user.id} data-testid={`user-row-${um.user.id}`}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  {um.user.profileImageUrl ? (
                                    <AvatarImage src={um.user.profileImageUrl} />
                                  ) : (
                                    <AvatarFallback>
                                      {userName.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  )}
                                </Avatar>
                                <div>
                                  <div className="font-medium">{userName}</div>
                                  {um.user.username && (
                                    <div className="text-sm text-muted-foreground">
                                      @{um.user.username}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-2">
                                {um.memberships.map(membership => (
                                  <Badge
                                    key={membership.community.id}
                                    variant={membership.role === "admin" ? "default" : "secondary"}
                                    className="flex items-center gap-1"
                                  >
                                    {membership.role === "admin" && <Shield className="h-3 w-3" />}
                                    {membership.community.name}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    data-testid={`button-user-actions-${um.user.id}`}
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Manage Memberships</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  {um.memberships.map(membership => (
                                    <div key={membership.community.id}>
                                      <DropdownMenuLabel className="text-xs">
                                        {membership.community.name}
                                      </DropdownMenuLabel>
                                      {membership.role === "admin" ? (
                                        <DropdownMenuItem
                                          onClick={() => updateRoleMutation.mutate({
                                            userId: um.user.id,
                                            subCommunityId: membership.community.id,
                                            role: "member"
                                          })}
                                          data-testid={`button-demote-${um.user.id}-${membership.community.id}`}
                                        >
                                          <UserMinus className="h-4 w-4 mr-2" />
                                          Remove Admin
                                        </DropdownMenuItem>
                                      ) : (
                                        <DropdownMenuItem
                                          onClick={() => updateRoleMutation.mutate({
                                            userId: um.user.id,
                                            subCommunityId: membership.community.id,
                                            role: "admin"
                                          })}
                                          data-testid={`button-promote-${um.user.id}-${membership.community.id}`}
                                        >
                                          <UserPlus className="h-4 w-4 mr-2" />
                                          Make Admin
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem
                                        className="text-red-600"
                                        onClick={() => removeMemberMutation.mutate({
                                          userId: um.user.id,
                                          subCommunityId: membership.community.id
                                        })}
                                        data-testid={`button-remove-${um.user.id}-${membership.community.id}`}
                                      >
                                        <UserMinus className="h-4 w-4 mr-2" />
                                        Remove from {membership.community.name}
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                    </div>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}