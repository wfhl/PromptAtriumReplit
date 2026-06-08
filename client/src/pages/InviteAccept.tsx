import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Calendar,
  User,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  LogIn,
  Ticket,
  Shield,
  ArrowRight,
  Info,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import type { Community, SubCommunityInvite, User as UserType } from "@shared/schema";

interface InviteWithDetails extends SubCommunityInvite {
  subCommunity: Community & {
    memberCount?: number;
    parentCommunity?: Community;
  };
  creator: UserType;
}

export default function InviteAcceptPage() {
  const params = useParams() as { code?: string };
  const code = params.code || "";
  const [, setLocation] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const [hasAccepted, setHasAccepted] = useState(false);

  // Fetch invite details
  const {
    data: invite,
    isLoading,
    error,
  } = useQuery<InviteWithDetails>({
    queryKey: [`/api/invites/sub-community/${code}`],
    enabled: !!code,
    retry: 1,
  });

  // Check if user is already a member
  const { data: memberStatus } = useQuery<{ isMember: boolean; role?: string }>({
    queryKey: [`/api/sub-communities/${invite?.subCommunityId}/member-status`],
    enabled: !!invite?.subCommunityId && isAuthenticated,
  });

  // Accept invite mutation
  const acceptInviteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/invites/sub-community/${code}/accept`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to accept invite");
      }
      return await response.json();
    },
    onSuccess: () => {
      setHasAccepted(true);
      queryClient.invalidateQueries({ queryKey: ["/api/user/sub-communities"] });
      toast({
        title: "Successfully joined!",
        description: `You are now a member of ${invite?.subCommunity.name}`,
      });
      
      // Redirect to sub-community page after success
      setTimeout(() => {
        setLocation(`/sub-community/${invite?.subCommunityId}`);
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to accept invite",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAcceptInvite = () => {
    if (!isAuthenticated) {
      // Store the invite code in session storage to resume after login
      sessionStorage.setItem("pendingInviteCode", code);
      setLocation("/");
      return;
    }
    
    acceptInviteMutation.mutate();
  };

  // Check for pending invite after login
  useEffect(() => {
    if (isAuthenticated) {
      const pendingCode = sessionStorage.getItem("pendingInviteCode");
      if (pendingCode && pendingCode === code) {
        sessionStorage.removeItem("pendingInviteCode");
        // Auto-accept the invite after login
        acceptInviteMutation.mutate();
      }
    }
  }, [isAuthenticated, code]);

  // Calculate invite status
  const isExpired = invite?.expiresAt && new Date(invite.expiresAt) < new Date();
  const usesRemaining = invite ? (invite.maxUses || 0) - (invite.currentUses || 0) : 0;
  const isExhausted = invite?.maxUses && usesRemaining <= 0;
  const isInvalid = isExpired || isExhausted || !invite?.isActive;

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error || !invite) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-6 w-6" />
              Invalid Invite Link
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Invite not found</AlertTitle>
              <AlertDescription>
                This invite link is invalid or has been removed. Please request a new invite from the sub-community admin.
              </AlertDescription>
            </Alert>
            <div className="flex gap-4">
              <Link href="/communities">
                <Button variant="outline">
                  Browse Communities
                </Button>
              </Link>
              <Link href="/">
                <Button>
                  Go Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" data-testid="invite-accept-page">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-3xl flex items-center gap-2">
                <Ticket className="h-8 w-8 text-primary" />
                Community Invite
              </CardTitle>
              <CardDescription>
                You've been invited to join a sub-community
              </CardDescription>
            </div>
            <Badge variant={isInvalid ? "destructive" : "secondary"} className="mt-2">
              {isExpired ? "Expired" : isExhausted ? "No Uses Left" : !invite.isActive ? "Inactive" : "Active"}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Sub-Community Details */}
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                {invite.subCommunity.imageUrl ? (
                  <AvatarImage src={invite.subCommunity.imageUrl} />
                ) : (
                  <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xl">
                    {invite.subCommunity.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1">
                <h2 
                  className="text-2xl font-bold"
                  data-testid="text-community-name"
                >
                  {invite.subCommunity.name}
                </h2>
                {invite.subCommunity.parentCommunity && (
                  <p className="text-sm text-muted-foreground">
                    Part of {invite.subCommunity.parentCommunity.name}
                  </p>
                )}
              </div>
            </div>
            
            {invite.subCommunity.description && (
              <Card>
                <CardContent className="pt-4">
                  <p className="text-muted-foreground" data-testid="text-community-description">
                    {invite.subCommunity.description}
                  </p>
                </CardContent>
              </Card>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span data-testid="text-member-count">
                  {invite.subCommunity.memberCount || 0} members
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  Created {formatDistanceToNow(new Date(invite.subCommunity.createdAt as any))} ago
                </span>
              </div>
            </div>
          </div>

          {/* Invite Details */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>Created by</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      {invite.creator.profileImageUrl ? (
                        <AvatarImage src={invite.creator.profileImageUrl} />
                      ) : (
                        <AvatarFallback className="text-xs">
                          {(invite.creator.firstName?.[0] || "") + (invite.creator.lastName?.[0] || "")}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <span className="text-sm font-medium" data-testid="text-creator-name">
                      {invite.creator.firstName} {invite.creator.lastName}
                    </span>
                  </div>
                </div>
                
                {invite.expiresAt && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>Expires</span>
                    </div>
                    <span className={`text-sm ${isExpired ? "text-destructive" : ""}`}>
                      {isExpired 
                        ? `Expired ${formatDistanceToNow(new Date(invite.expiresAt))} ago`
                        : format(new Date(invite.expiresAt), "MMM d, yyyy 'at' h:mm a")
                      }
                    </span>
                  </div>
                )}
                
                {invite.maxUses && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <Ticket className="h-4 w-4 text-muted-foreground" />
                      <span>Uses</span>
                    </div>
                    <span className={`text-sm ${isExhausted ? "text-destructive" : ""}`}>
                      {invite.currentUses || 0} / {invite.maxUses} used
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Status Messages */}
          {memberStatus?.isMember && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle>Already a member</AlertTitle>
              <AlertDescription>
                You are already a {memberStatus.role === "admin" ? "admin" : "member"} of this sub-community.
              </AlertDescription>
            </Alert>
          )}

          {hasAccepted && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle>Successfully joined!</AlertTitle>
              <AlertDescription>
                Welcome to {invite.subCommunity.name}! Redirecting you to the sub-community page...
              </AlertDescription>
            </Alert>
          )}

          {isInvalid && !memberStatus?.isMember && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Invite unavailable</AlertTitle>
              <AlertDescription>
                {isExpired && "This invite has expired."}
                {isExhausted && "This invite has reached its maximum number of uses."}
                {!invite.isActive && "This invite has been deactivated."}
                {" Please request a new invite from the sub-community admin."}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            {!isAuthenticated ? (
              <>
                <Alert className="w-full">
                  <LogIn className="h-4 w-4" />
                  <AlertTitle>Login required</AlertTitle>
                  <AlertDescription>
                    You need to log in to accept this invite and join the sub-community.
                  </AlertDescription>
                </Alert>
                <Link href="/" className="w-full">
                  <Button className="w-full" size="lg" data-testid="button-login">
                    <LogIn className="h-5 w-5 mr-2" />
                    Log in to Accept Invite
                  </Button>
                </Link>
              </>
            ) : memberStatus?.isMember ? (
              <Link href={`/sub-community/${invite.subCommunityId}`} className="w-full">
                <Button className="w-full" size="lg" data-testid="button-go-to-community">
                  Go to Sub-Community
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
            ) : !isInvalid && !hasAccepted ? (
              <Button 
                className="w-full" 
                size="lg" 
                onClick={handleAcceptInvite}
                disabled={acceptInviteMutation.isPending}
                data-testid="button-accept-invite"
              >
                {acceptInviteMutation.isPending ? (
                  <>
                    <Clock className="h-5 w-5 mr-2 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Accept Invite & Join
                  </>
                )}
              </Button>
            ) : null}

            {!hasAccepted && (
              <Link href="/communities" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full" size="lg">
                  Browse Other Communities
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}