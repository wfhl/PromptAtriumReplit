import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Users, 
  Shield, 
  Plus, 
  FolderTree, 
  AlertCircle,
  Building,
  UserCheck,
  Settings,
  ChevronRight,
  HelpCircle
} from "lucide-react";
import { SubCommunityList } from "@/components/SubCommunityList";
import { SubCommunityBrowser } from "@/components/SubCommunityBrowser";
import { SubCommunitySelector } from "@/components/SubCommunitySelector";
import { CreateSubCommunityDialog } from "@/components/CreateSubCommunityDialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import type { Community, UserCommunity } from "@shared/schema";

export default function Communities() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedParentForCreate, setSelectedParentForCreate] = useState<Community | null>(null);
  const [activeSubCommunity, setActiveSubCommunity] = useState<string>("all");

  // Fetch global community
  const { data: globalCommunity } = useQuery<Community | null>({
    queryKey: ["/api/communities/global"],
  });

  // Fetch private communities (user must be authenticated)
  const { data: privateCommunities = [], isLoading: communitiesLoading, error: communitiesError } = useQuery<Community[]>({
    queryKey: ["/api/communities/private"],
    enabled: isAuthenticated,
  });

  // Combine for backwards compatibility
  const communities = [...(globalCommunity ? [globalCommunity] : []), ...privateCommunities];

  // Fetch user's community memberships
  const { data: userMemberships = [] } = useQuery<UserCommunity[]>({
    queryKey: ["/api/user/communities"],
    enabled: isAuthenticated,
  });

  // Fetch user's sub-community memberships
  const { data: userSubMemberships = [] } = useQuery<UserCommunity[]>({
    queryKey: ["/api/user/sub-communities"],
    enabled: isAuthenticated,
  });

  // Filter parent communities (those without parentCommunityId)
  const parentCommunities = communities.filter(c => !c.parentCommunityId);
  
  // Get communities user is a member of
  const memberCommunities = parentCommunities.filter(c => 
    userMemberships.some(m => m.communityId === c.id)
  );
  
  // Get communities user is admin of
  const adminCommunities = parentCommunities.filter(c => 
    userMemberships.some(m => m.communityId === c.id && m.role === "admin")
  );

  const handleCreateSubCommunity = (parentCommunity: Community) => {
    setSelectedParentForCreate(parentCommunity);
    setCreateDialogOpen(true);
  };

  const handleSelectCommunity = (communityId: string) => {
    setSelectedCommunityId(communityId);
    const community = communities.find(c => c.id === communityId);
    if (community) {
      toast({
        title: "Community selected",
        description: `Viewing ${community.name}`,
      });
    }
  };

  if (authLoading || communitiesLoading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (communitiesError) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load communities. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building className="h-8 w-8" />
            Communities
          </h1>
          <p className="text-muted-foreground mt-1">
            Explore and manage your communities and sub-communities
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Link href="/docs/sub-communities">
            <Button variant="outline" size="sm" data-testid="button-help-docs">
              <HelpCircle className="h-4 w-4 mr-2" />
              Help Guide
            </Button>
          </Link>
          <SubCommunitySelector
            value={activeSubCommunity}
            onValueChange={setActiveSubCommunity}
            className="w-[250px]"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building className="h-4 w-4" />
              Total Communities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{parentCommunities.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Sub-Communities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {communities.filter(c => c.parentCommunityId).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Your Memberships
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userMemberships.length + userSubMemberships.length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Admin Roles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminCommunities.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="global" className="space-y-4">
        <TabsList>
          <TabsTrigger value="global">Global Community</TabsTrigger>
          <TabsTrigger value="private">Private Communities</TabsTrigger>
          <TabsTrigger value="member">My Communities</TabsTrigger>
          <TabsTrigger value="admin">Communities I Manage</TabsTrigger>
          <TabsTrigger value="browser">Browser View</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {parentCommunities.map(community => {
              const membership = userMemberships.find(m => m.communityId === community.id);
              const isAdmin = membership?.role === "admin";
              const isMember = !!membership;
              
              return (
                <Card key={community.id} data-testid={`community-card-${community.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          {community.imageUrl ? (
                            <AvatarImage src={community.imageUrl} />
                          ) : (
                            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600">
                              {community.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">{community.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            {isAdmin && (
                              <Badge variant="secondary" className="text-xs">
                                <Shield className="h-3 w-3 mr-1" />
                                Admin
                              </Badge>
                            )}
                            {isMember && !isAdmin && (
                              <Badge variant="outline" className="text-xs">
                                Member
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    {community.description && (
                      <CardDescription className="mt-2">
                        {community.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <Link href={`/community/${community.id}`}>
                        <Button variant="outline" size="sm" data-testid={`button-view-${community.id}`}>
                          View Community
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          
          {parentCommunities.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Building className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">No communities available yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="member" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {memberCommunities.map(community => {
              const membership = userMemberships.find(m => m.communityId === community.id);
              const isAdmin = membership?.role === "admin";
              
              return (
                <Card key={community.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          {community.imageUrl ? (
                            <AvatarImage src={community.imageUrl} />
                          ) : (
                            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600">
                              {community.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">{community.name}</CardTitle>
                          {isAdmin && (
                            <Badge variant="secondary" className="mt-1 text-xs">
                              <Shield className="h-3 w-3 mr-1" />
                              Admin
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {community.description && (
                      <CardDescription className="mt-2">
                        {community.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <Link href={`/community/${community.id}`}>
                        <Button variant="outline" size="sm">
                          View Community
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          
          {memberCommunities.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">You haven't joined any communities yet</p>
                <Link href="/community">
                  <Button variant="outline" className="mt-4">
                    Browse Communities
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="admin" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {adminCommunities.map(community => (
              <Card key={community.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        {community.imageUrl ? (
                          <AvatarImage src={community.imageUrl} />
                        ) : (
                          <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600">
                            {community.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{community.name}</CardTitle>
                        <Badge variant="secondary" className="mt-1 text-xs">
                          <Shield className="h-3 w-3 mr-1" />
                          Admin
                        </Badge>
                      </div>
                    </div>
                    <Link href={`/community/${community.id}/manage`}>
                      <Button variant="ghost" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                  {community.description && (
                    <CardDescription className="mt-2">
                      {community.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <SubCommunityList
                    parentCommunityId={community.id}
                    parentCommunity={community}
                    onCreateNew={() => handleCreateSubCommunity(community)}
                    showCreateButton={true}
                    compact={true}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
          
          {adminCommunities.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">You don't manage any communities</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="browser" className="space-y-4">
          <SubCommunityBrowser
            onSelectCommunity={handleSelectCommunity}
            selectedCommunityId={selectedCommunityId as any}
            showMembershipIndicators={true}
          />
        </TabsContent>
      </Tabs>

      {/* Create Sub-Community Dialog */}
      {selectedParentForCreate && (
        <CreateSubCommunityDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          parentCommunity={selectedParentForCreate}
        />
      )}
    </div>
  );
}