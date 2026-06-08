import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, 
  Mail, 
  Shield, 
  AlertCircle,
  Copy,
  CheckCircle,
  Plus,
  Trash2,
  ArrowLeft,
  Settings,
  FolderOpen,
  BookOpen,
  Package,
  UserX
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Community, UserCommunity, Collection } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const inviteSchema = z.object({
  maxUses: z.number().min(1).max(100).default(10),
  expiresIn: z.enum(["1d", "7d", "30d", "never"]).default("7d"),
  role: z.enum(["member", "admin"]).default("member"),
});

type InviteFormData = z.infer<typeof inviteSchema>;

export default function CommunityDetail() {
  const { id } = useParams() as { id: string };
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<any>(null);

  const inviteForm = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      maxUses: 10,
      expiresIn: "7d",
      role: "member",
    },
  });

  // Fetch community details
  const { data: community, isLoading: communityLoading } = useQuery<Community>({
    queryKey: [`/api/communities/${id}`],
  });

  // Fetch user's membership in this community
  const { data: membership } = useQuery<UserCommunity | null>({
    queryKey: [`/api/communities/${id}/membership`],
    enabled: isAuthenticated,
  });

  // Fetch community members
  const { data: members = [], isLoading: membersLoading } = useQuery<any[]>({
    queryKey: [`/api/communities/${id}/members`],
    enabled: !!membership,
  });

  // Fetch community invites
  const { data: invites = [], isLoading: invitesLoading, refetch: refetchInvites } = useQuery<any[]>({
    queryKey: [`/api/communities/${id}/invites`],
    enabled: !!membership && (membership.role === "admin" || user?.role === "super_admin"),
  });

  // Fetch community prompts
  const { data: prompts = [], isLoading: promptsLoading } = useQuery<any[]>({
    queryKey: [`/api/prompts?communityId=${id}`],
    enabled: !!membership,
  });

  // Fetch community collections
  const { data: collections = [], isLoading: collectionsLoading } = useQuery<Collection[]>({
    queryKey: [`/api/collections?communityId=${id}`],
    enabled: !!membership,
  });

  const isAdmin = membership?.role === "admin" || user?.role === "super_admin" || user?.role === "global_admin";
  const isMember = !!membership;

  // Create invite mutation
  const createInviteMutation = useMutation({
    mutationFn: async (data: InviteFormData) => {
      return apiRequest("POST", `/api/communities/${id}/invites`, data);
    },
    onSuccess: (invite) => {
      const inviteLink = `${window.location.origin}/join-community/${(invite as any).token}`;
      setGeneratedInviteLink(inviteLink);
      refetchInvites();
      toast({
        title: "Invite created",
        description: "Your invite link has been generated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create invite",
        variant: "destructive",
      });
    },
  });

  // Revoke invite mutation
  const revokeInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      return apiRequest("DELETE", `/api/communities/${id}/invites/${inviteId}`);
    },
    onSuccess: () => {
      refetchInvites();
      toast({
        title: "Success",
        description: "Invite revoked successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to revoke invite",
        variant: "destructive",
      });
    },
  });
  
  // Leave community mutation
  const leaveCommunityMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/communities/${id}/leave`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "You have left the community",
      });
      // Redirect to communities page
      window.location.href = "/communities";
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to leave community",
        variant: "destructive",
      });
    },
  });
  
  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("DELETE", `/api/communities/${id}/members/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/communities/${id}/members`] });
      toast({
        title: "Success",
        description: "Member removed from community",
      });
      setRemoveDialogOpen(false);
      setMemberToRemove(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to remove member",
        variant: "destructive",
      });
    },
  });

  const handleCopyInvite = () => {
    if (generatedInviteLink) {
      navigator.clipboard.writeText(generatedInviteLink);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    }
  };

  const handleCreateInvite = (data: InviteFormData) => {
    createInviteMutation.mutate(data);
  };

  if (communityLoading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!community) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Community not found
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/communities">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Communities
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{community.name}</h1>
            <p className="text-muted-foreground">@{community.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <Button 
                variant="outline"
                onClick={() => setInviteModalOpen(true)}
                data-testid="button-manage-invites"
              >
                <Mail className="h-4 w-4 mr-2" />
                Manage Invites
              </Button>
              <Link href={`/admin?tab=communities&community=${id}`}>
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Description */}
      {community.description && (
        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{community.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Content Tabs */}
      <Tabs defaultValue="prompts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="prompts">
            <FolderOpen className="h-4 w-4 mr-2" />
            Prompts ({prompts.length})
          </TabsTrigger>
          <TabsTrigger value="collections">
            <BookOpen className="h-4 w-4 mr-2" />
            Collections ({collections.length})
          </TabsTrigger>
          <TabsTrigger value="members">
            <Users className="h-4 w-4 mr-2" />
            Members ({members.length})
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="invites">
              <Mail className="h-4 w-4 mr-2" />
              Invites ({invites.length})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="prompts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Community Prompts</CardTitle>
              <CardDescription>
                Prompts shared within this community
              </CardDescription>
            </CardHeader>
            <CardContent>
              {promptsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
              ) : prompts.length > 0 ? (
                <div className="space-y-4">
                  {prompts.map((prompt: any) => (
                    <div key={prompt.id} className="border-b pb-4 last:border-0">
                      <h4 className="font-semibold">{prompt.name}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {prompt.description}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No prompts shared yet
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="collections" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Community Collections</CardTitle>
                  <CardDescription>
                    Collections shared within this community
                  </CardDescription>
                </div>
                {isAdmin && (
                  <Link href={`/collections/new?communityId=${id}`}>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Collection
                    </Button>
                  </Link>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {collectionsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <Skeleton key={i} className="h-32" />
                  ))}
                </div>
              ) : collections.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {collections.map((collection) => (
                    <Card key={collection.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold flex items-center gap-2">
                              <Package className="h-4 w-4" />
                              {collection.name}
                            </h4>
                            {collection.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {collection.description}
                              </p>
                            )}
                          </div>
                          {collection.isPublic && (
                            <Badge variant="secondary">Public</Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>
                            Created by {collection.userId === user?.id ? "you" : "member"}
                          </span>
                          <Link href={`/collections/${collection.id}`}>
                            <Button variant="ghost" size="sm">
                              View
                              <ArrowLeft className="h-4 w-4 ml-1 rotate-180" />
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No collections shared yet</p>
                  {isAdmin && (
                    <Link href={`/collections/new?communityId=${id}`}>
                      <Button variant="outline" className="mt-4">
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Collection
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Community Members</CardTitle>
                  <CardDescription>
                    Users who are part of this community
                  </CardDescription>
                </div>
                {isMember && !isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLeaveDialogOpen(true)}
                  >
                    <UserX className="h-4 w-4 mr-2" />
                    Leave Community
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {membersLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : members.length > 0 ? (
                <div className="space-y-2">
                  {members.map((member: any) => (
                    <div key={member.id} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium">{member.user?.name || member.user?.email}</p>
                          <p className="text-sm text-muted-foreground">@{member.user?.username}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {member.role === "admin" && (
                          <Badge>
                            <Shield className="h-3 w-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                        {isAdmin && member.userId !== user?.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setMemberToRemove(member);
                              setRemoveDialogOpen(true);
                            }}
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No members yet
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="invites" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Active Invites</CardTitle>
                    <CardDescription>
                      Manage invite links for this community
                    </CardDescription>
                  </div>
                  <Button onClick={() => setInviteModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Invite
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {invitesLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-16" />
                    ))}
                  </div>
                ) : invites.length > 0 ? (
                  <div className="space-y-4">
                    {invites.map((invite) => (
                      <div key={invite.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-mono text-sm">{invite.token}</p>
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                              <span>Uses: {invite.usedCount}/{invite.maxUses || "∞"}</span>
                              <span>Role: {invite.role}</span>
                              <span>
                                Expires: {invite.expiresAt ? 
                                  new Date(invite.expiresAt).toLocaleDateString() : 
                                  "Never"}
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => revokeInviteMutation.mutate(invite.id)}
                            disabled={revokeInviteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No active invites
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Create Invite Modal */}
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Community Invite</DialogTitle>
            <DialogDescription>
              Generate an invite link for {community.name}
            </DialogDescription>
          </DialogHeader>

          {!generatedInviteLink ? (
            <Form {...inviteForm}>
              <form onSubmit={inviteForm.handleSubmit(handleCreateInvite)} className="space-y-4">
                <FormField
                  control={inviteForm.control}
                  name="maxUses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Uses</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum number of times this invite can be used (1-100)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={inviteForm.control}
                  name="expiresIn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expires In</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select expiration" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1d">1 Day</SelectItem>
                          <SelectItem value="7d">7 Days</SelectItem>
                          <SelectItem value="30d">30 Days</SelectItem>
                          <SelectItem value="never">Never</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={inviteForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Member Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Role assigned to users who join with this invite
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setInviteModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createInviteMutation.isPending}
                  >
                    Generate Invite
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          ) : (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Invite link generated successfully!
                </AlertDescription>
              </Alert>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={generatedInviteLink}
                  className="font-mono text-sm"
                />
                <Button
                  size="icon"
                  onClick={handleCopyInvite}
                  variant={inviteCopied ? "default" : "outline"}
                >
                  {inviteCopied ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => {
                    setInviteModalOpen(false);
                    setGeneratedInviteLink(null);
                    inviteForm.reset();
                  }}
                >
                  Done
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Leave Community Dialog */}
      <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Community</DialogTitle>
            <DialogDescription>
              Are you sure you want to leave {community.name}? You will need to be invited again to rejoin.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLeaveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => leaveCommunityMutation.mutate()}
              disabled={leaveCommunityMutation.isPending}
            >
              Leave Community
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Remove Member Dialog */}
      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {memberToRemove?.user?.username || 'this member'} from {community.name}? They will need to be invited again to rejoin.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRemoveDialogOpen(false);
                setMemberToRemove(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (memberToRemove?.userId) {
                  removeMemberMutation.mutate(memberToRemove.userId);
                }
              }}
              disabled={removeMemberMutation.isPending}
            >
              Remove Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}