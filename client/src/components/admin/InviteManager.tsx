import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Copy, 
  Plus, 
  Trash, 
  CheckCircle, 
  XCircle, 
  Clock,
  Link2,
  Calendar,
  Users
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { SubCommunityInvite } from "@shared/schema";

const createInviteSchema = z.object({
  maxUses: z.number().min(1).max(100).optional(),
  expirationHours: z.number().min(0).max(720).optional(), // 30 days max
  role: z.enum(["member", "admin"]).default("member"),
  hasMaxUses: z.boolean().default(false),
  hasExpiration: z.boolean().default(false),
});

type CreateInviteForm = z.infer<typeof createInviteSchema>;

interface InviteManagerProps {
  subCommunityId: string;
  existingInvites: SubCommunityInvite[];
}

export function InviteManager({ subCommunityId, existingInvites }: InviteManagerProps) {
  const { toast } = useToast();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const form = useForm<CreateInviteForm>({
    resolver: zodResolver(createInviteSchema),
    defaultValues: {
      maxUses: 10,
      expirationHours: 24,
      role: "member",
      hasMaxUses: false,
      hasExpiration: false,
    },
  });

  const createInviteMutation = useMutation({
    mutationFn: async (data: CreateInviteForm) => {
      const payload: any = {
        role: data.role,
      };

      if (data.hasMaxUses && data.maxUses) {
        payload.maxUses = data.maxUses;
      }

      if (data.hasExpiration && data.expirationHours) {
        const expiresAt = new Date(Date.now() + data.expirationHours * 60 * 60 * 1000);
        payload.expiresAt = expiresAt.toISOString();
      }

      const response = await apiRequest("POST", `/api/sub-communities/${subCommunityId}/invites`, payload);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sub-communities/${subCommunityId}/invites`] });
      toast({
        title: "Invite created",
        description: "Your invite link has been created successfully",
      });
      form.reset();
      setShowCreateForm(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create invite",
        description: error.message || "Could not create invite link",
        variant: "destructive",
      });
    },
  });

  const deactivateInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const response = await apiRequest("DELETE", `/api/sub-communities/invites/${inviteId}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sub-communities/${subCommunityId}/invites`] });
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

  const copyInviteLink = async (invite: SubCommunityInvite) => {
    const baseUrl = window.location.origin;
    const inviteUrl = `${baseUrl}/invite/${invite.code}`;
    
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedId(invite.id);
      toast({
        title: "Link copied",
        description: "The invite link has been copied to your clipboard",
      });
      
      setTimeout(() => setCopiedId(null), 3000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Could not copy link to clipboard",
        variant: "destructive",
      });
    }
  };

  const getInviteStatus = (invite: SubCommunityInvite) => {
    if (!invite.isActive) {
      return { label: "Inactive", variant: "secondary" as const, icon: XCircle };
    }
    
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      return { label: "Expired", variant: "destructive" as const, icon: Clock };
    }
    
    if (invite.maxUses && invite.currentUses! >= invite.maxUses) {
      return { label: "Used Up", variant: "secondary" as const, icon: XCircle };
    }
    
    return { label: "Active", variant: "default" as const, icon: CheckCircle };
  };

  const onSubmit = (data: CreateInviteForm) => {
    createInviteMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      {/* Create Invite Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Create New Invite</h3>
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            data-testid="button-toggle-create-invite"
          >
            <Plus className="h-4 w-4 mr-2" />
            {showCreateForm ? "Cancel" : "New Invite"}
          </Button>
        </div>

        {showCreateForm && (
          <Card>
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Role Selection */}
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invite Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-invite-role">
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          The role that will be assigned to users who join using this invite
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Max Uses */}
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="hasMaxUses"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <FormLabel>Limit Uses</FormLabel>
                            <FormDescription>
                              Set a maximum number of times this invite can be used
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-limit-uses"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    {form.watch("hasMaxUses") && (
                      <FormField
                        control={form.control}
                        name="maxUses"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Maximum Uses</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="10"
                                {...field}
                                onChange={e => field.onChange(parseInt(e.target.value))}
                                data-testid="input-max-uses"
                              />
                            </FormControl>
                            <FormDescription>
                              Number of times this invite can be used (1-100)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  {/* Expiration */}
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="hasExpiration"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <FormLabel>Set Expiration</FormLabel>
                            <FormDescription>
                              Make this invite expire after a certain time
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-set-expiration"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    {form.watch("hasExpiration") && (
                      <FormField
                        control={form.control}
                        name="expirationHours"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Expiration (Hours)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="24"
                                {...field}
                                onChange={e => field.onChange(parseInt(e.target.value))}
                                data-testid="input-expiration-hours"
                              />
                            </FormControl>
                            <FormDescription>
                              Hours until this invite expires (max 720 hours / 30 days)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={createInviteMutation.isPending}
                    data-testid="button-create-invite"
                  >
                    {createInviteMutation.isPending ? "Creating..." : "Create Invite Link"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </div>

      <Separator />

      {/* Existing Invites Table */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Active & Recent Invites</h3>
        
        {existingInvites.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Link2 className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">No invites created yet</p>
              <p className="text-sm text-muted-foreground">Create your first invite to start inviting members</p>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Uses</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>2
                {existingInvites.map(invite => {
                  const status = getInviteStatus(invite);
                  const StatusIcon = status.icon;
                  
                  return (
                    <TableRow key={invite.id} data-testid={`invite-row-${invite.id}`}>
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
                              <Users className="h-3 w-3 mr-1" />
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
                              <Trash className="h-4 w-4 text-red-500" />
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
      </div>
    </div>
  );
}