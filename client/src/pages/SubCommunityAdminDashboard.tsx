import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Users, 
  Shield, 
  Settings, 
  FileText, 
  Activity,
  Plus,
  UserPlus,
  Link2,
  Eye,
  MessageSquare,
  TrendingUp,
  Calendar,
  ArrowLeft,
  AlertCircle,
  Ticket
} from "lucide-react";
import { InviteManager } from "@/components/admin/InviteManager";
import { MemberTable } from "@/components/admin/MemberTable";
import { SubCommunitySettings } from "@/components/admin/SubCommunitySettings";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Community, UserCommunity, User, Prompt, SubCommunityInvite } from "@shared/schema";
import { format } from "date-fns";

interface SubCommunityStats {
  totalMembers: number;
  totalAdmins: number;
  totalPrompts: number;
  activeInvites: number;
  recentActivity: number;
}

interface ActivityItem {
  id: string;
  type: "member_joined" | "prompt_shared" | "invite_created" | "role_changed";
  description: string;
  userId: string;
  userName: string;
  timestamp: Date;
}

export default function SubCommunityAdminDashboard() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch sub-community details
  const { data: subCommunity, isLoading: subCommunityLoading, error: subCommunityError } = useQuery<Community>({
    queryKey: [`/api/sub-communities/${id}`],
    enabled: !!id && isAuthenticated,
  });

  // Fetch members
  const { data: members = [], isLoading: membersLoading } = useQuery<(UserCommunity & { user: User })[]>({
    queryKey: [`/api/sub-communities/${id}/members`],
    enabled: !!id && isAuthenticated,
  });

  // Fetch invites
  const { data: invites = [], isLoading: invitesLoading } = useQuery<SubCommunityInvite[]>({
    queryKey: [`/api/sub-communities/${id}/invites`],
    enabled: !!id && isAuthenticated,
  });

  // Fetch prompts shared to this sub-community
  const { data: prompts = [], isLoading: promptsLoading } = useQuery<any[]>({
    queryKey: [`/api/sub-communities/${id}/prompts`],
    enabled: !!id && isAuthenticated,
  });

  // Check if current user is admin
  const currentUserMembership = members.find(m => m.userId === user?.id);
  const isAdmin = currentUserMembership?.role === "admin";

  // Calculate stats
  const stats: SubCommunityStats = {
    totalMembers: members.length,
    totalAdmins: members.filter(m => m.role === "admin").length,
    totalPrompts: prompts.length,
    activeInvites: invites.filter(i => i.isActive && (!i.expiresAt || new Date(i.expiresAt) > new Date())).length,
    recentActivity: 0, // This would come from a real activity API
  };

  // Mock recent activity (in a real app, this would come from the API)
  const recentActivity: ActivityItem[] = [
    {
      id: "1",
      type: "member_joined",
      description: "joined the community",
      userId: "user1",
      userName: "Alice Smith",
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
    },
    {
      id: "2",
      type: "prompt_shared",
      description: "shared a new prompt",
      userId: "user2",
      userName: "Bob Johnson",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    },
    {
      id: "3",
      type: "invite_created",
      description: "created a new invite link",
      userId: user?.id || "",
      userName: "You",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
    },
  ];

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    } else if (members.length > 0 && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "You must be an admin to access this page",
        variant: "destructive",
      });
      setLocation(`/sub-community/${id}`);
    }
  }, [isAuthenticated, isAdmin, members.length, id, setLocation, toast]);

  if (subCommunityLoading || membersLoading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (subCommunityError || !subCommunity) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load sub-community details. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const getActivityIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "member_joined":
        return <UserPlus className="h-4 w-4" />;
      case "prompt_shared":
        return <FileText className="h-4 w-4" />;
      case "invite_created":
        return <Link2 className="h-4 w-4" />;
      case "role_changed":
        return <Shield className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-6 max-w-full overflow-x-hidden">
      {/* Header - Mobile optimized */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setLocation(`/communities`)}
            data-testid="button-back"
            className="w-fit"
          >
            <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-xl sm:text-3xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 sm:h-8 sm:w-8" />
              <span className="truncate">{subCommunity.name} Admin</span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Manage your sub-community
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3 sm:space-y-4">
        <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full h-auto">
          <TabsTrigger value="overview" className="text-xs sm:text-sm px-2 sm:px-4 py-2">Overview</TabsTrigger>
          <TabsTrigger value="members" className="text-xs sm:text-sm px-2 sm:px-4 py-2">Members</TabsTrigger>
          <TabsTrigger value="invites" className="text-xs sm:text-sm px-2 sm:px-4 py-2">Invites</TabsTrigger>
          <TabsTrigger value="content" className="text-xs sm:text-sm px-2 sm:px-4 py-2">Content</TabsTrigger>
          <TabsTrigger value="settings" className="text-xs sm:text-sm px-2 sm:px-4 py-2 col-span-2 sm:col-span-1">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 sm:space-y-6">
          {/* Stats Cards - Mobile responsive grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            <Card>
              <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                <CardTitle className="text-[10px] sm:text-sm font-medium flex items-center gap-1 sm:gap-2">
                  <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="truncate">Total Members</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                <div className="text-lg sm:text-2xl font-bold">{stats.totalMembers}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                <CardTitle className="text-[10px] sm:text-sm font-medium flex items-center gap-1 sm:gap-2">
                  <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="truncate">Admins</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                <div className="text-lg sm:text-2xl font-bold">{stats.totalAdmins}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                <CardTitle className="text-[10px] sm:text-sm font-medium flex items-center gap-1 sm:gap-2">
                  <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="truncate">Prompts</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                <div className="text-lg sm:text-2xl font-bold">{stats.totalPrompts}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                <CardTitle className="text-[10px] sm:text-sm font-medium flex items-center gap-1 sm:gap-2">
                  <Ticket className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="truncate">Active Invites</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                <div className="text-lg sm:text-2xl font-bold">{stats.activeInvites}</div>
              </CardContent>
            </Card>
            
            <Card className="col-span-2 sm:col-span-1">
              <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                <CardTitle className="text-[10px] sm:text-sm font-medium flex items-center gap-1 sm:gap-2">
                  <Activity className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="truncate">Activity (7d)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                <div className="text-lg sm:text-2xl font-bold">{stats.recentActivity}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
                <CardDescription>Latest actions in your sub-community</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentActivity.map(activity => (
                  <div 
                    key={activity.id} 
                    className="flex items-start gap-3 pb-3 border-b last:border-0"
                    data-testid={`activity-item-${activity.id}`}
                  >
                    <div className="mt-1">{getActivityIcon(activity.type)}</div>
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-medium">{activity.userName}</span>{" "}
                        {activity.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(activity.timestamp, "PPp")}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
                <CardDescription>Common administrative tasks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => setActiveTab("invites")}
                  data-testid="button-create-invite-quick"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Invite
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => setActiveTab("members")}
                  data-testid="button-manage-members-quick"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Manage Members
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => setActiveTab("content")}
                  data-testid="button-moderate-content-quick"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Moderate Content
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => setActiveTab("settings")}
                  data-testid="button-settings-quick"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Members Management</CardTitle>
              <CardDescription>
                Manage member roles and permissions in your sub-community
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MemberTable 
                members={members} 
                subCommunityId={id!}
                currentUserId={user?.id || ""}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invites Tab */}
        <TabsContent value="invites" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Invite Management</CardTitle>
              <CardDescription>
                Create and manage invite links for your sub-community
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InviteManager 
                subCommunityId={id!}
                existingInvites={invites}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Content Moderation</CardTitle>
              <CardDescription>
                Review and moderate prompts shared in your sub-community
              </CardDescription>
            </CardHeader>
            <CardContent>
              {promptsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : prompts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No prompts have been shared to this sub-community yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {prompts.map(prompt => (
                    <div 
                      key={prompt.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                      data-testid={`prompt-item-${prompt.id}`}
                    >
                      <div className="flex-1">
                        <h4 className="font-medium">{prompt.title}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {prompt.content}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={prompt.visibility === "public" ? "default" : "secondary"}>
                          {prompt.visibility}
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          data-testid={`button-moderate-${prompt.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <SubCommunitySettings 
            subCommunity={subCommunity}
            onUpdate={() => {
              queryClient.invalidateQueries({ queryKey: [`/api/sub-communities/${id}`] });
              toast({
                title: "Settings updated",
                description: "Your sub-community settings have been saved",
              });
            }}
            onDelete={() => {
              setLocation("/communities");
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}