import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BirthdayPicker } from "@/components/ui/birthday-picker";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Lightbulb, Plus, X, Link2, Calendar, User as UserIcon, Shield, Globe, ChevronDown, Crown, Settings, LogOut, Moon, Sun, Eye, Mail, Home } from "lucide-react";
import type { User } from "@shared/schema";
import { ProfilePictureUpload } from "@/components/ProfilePictureUpload";
import { InviteAcceptanceForm } from "@/components/InviteAcceptanceForm";

// Custom social link type
type CustomSocial = {
  platform: string;
  url: string;
  handle?: string;
};

// Profile form schema
const profileSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(30, "Username must be less than 30 characters").regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, hyphens, and underscores").optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
  birthday: z.date().optional(),
  website: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  twitterHandle: z.string().optional(),
  githubHandle: z.string().optional(),
  linkedinHandle: z.string().optional(),
  instagramHandle: z.string().optional(),
  deviantartHandle: z.string().optional(),
  blueskyHandle: z.string().optional(),
  tiktokHandle: z.string().optional(),
  redditHandle: z.string().optional(),
  patreonHandle: z.string().optional(),
  profileVisibility: z.enum(["public", "private"]).default("public"),
  emailVisibility: z.boolean().default(false),
  showStats: z.boolean().default(true),
  showBirthday: z.boolean().default(false),
  showNsfw: z.boolean().default(true),
  defaultLandingPage: z.enum(["dashboard", "my-prompts"]).default("dashboard"),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfileSettings() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const typedUser = user as User;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [customSocials, setCustomSocials] = useState<CustomSocial[]>([]);
  const [newSocial, setNewSocial] = useState({ platform: "", url: "", handle: "" });

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      profileVisibility: "public",
      emailVisibility: false,
      showStats: true,
      showBirthday: false,
      defaultLandingPage: "dashboard",
    },
  });

  // Load current user data into form
  useEffect(() => {
    if (typedUser) {
      form.reset({
        username: typedUser.username || "",
        firstName: typedUser.firstName || "",
        lastName: typedUser.lastName || "",
        bio: typedUser.bio || "",
        birthday: typedUser.birthday ? new Date(typedUser.birthday) : undefined,
        website: typedUser.website || "",
        twitterHandle: typedUser.twitterHandle || "",
        githubHandle: typedUser.githubHandle || "",
        linkedinHandle: typedUser.linkedinHandle || "",
        instagramHandle: typedUser.instagramHandle || "",
        deviantartHandle: typedUser.deviantartHandle || "",
        blueskyHandle: typedUser.blueskyHandle || "",
        tiktokHandle: typedUser.tiktokHandle || "",
        redditHandle: typedUser.redditHandle || "",
        patreonHandle: typedUser.patreonHandle || "",
        profileVisibility: typedUser.profileVisibility || "public",
        emailVisibility: typedUser.emailVisibility || false,
        showStats: typedUser.showStats !== false, // Default to true
        showBirthday: typedUser.showBirthday || false,
        showNsfw: typedUser.showNsfw !== false, // Default to true
        defaultLandingPage: typedUser.defaultLandingPage || "dashboard",
      });

      if (typedUser.customSocials && Array.isArray(typedUser.customSocials)) {
        setCustomSocials(typedUser.customSocials);
      }
    }
  }, [typedUser, form]);


  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const profileData = {
        ...data,
        // Ensure birthday is sent as ISO string or null
        birthday: data.birthday ? data.birthday.toISOString() : null,
        customSocials,
      };
      const response = await apiRequest("PUT", "/api/profile", profileData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Success",
        description: "Profile updated successfully!",
        action: (
          <Link href="/">
            <Button variant="outline" size="sm">
              Go to Dashboard
            </Button>
          </Link>
        ),
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  // Add custom social link
  const addCustomSocial = () => {
    if (newSocial.platform && newSocial.url) {
      setCustomSocials([...customSocials, { ...newSocial }]);
      setNewSocial({ platform: "", url: "", handle: "" });
    }
  };

  // Remove custom social link
  const removeCustomSocial = (index: number) => {
    setCustomSocials(customSocials.filter((_, i) => i !== index));
  };

  const onSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center mx-auto mb-4">
            <Lightbulb className="h-4 w-4 text-primary-foreground animate-pulse" />
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Profile Settings</h1>
          <p className="text-muted-foreground">Manage your personal information and privacy preferences</p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <UserIcon className="h-5 w-5" />
                <span>Basic Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Picture Upload */}
              <div className="flex flex-col items-center space-y-4">
                <div className="text-center">
                  <Label className="text-sm font-medium">Profile Picture</Label>
                  <p className="text-xs text-muted-foreground mt-1">Upload a picture to personalize your profile</p>
                </div>
                <ProfilePictureUpload
                  currentImageUrl={user?.profileImageUrl}
                  onImageUpdate={() => {
                    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
                  }}
                  data-testid="profile-picture-upload"
                />
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    {...form.register("firstName")}
                    data-testid="input-firstName"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    {...form.register("lastName")}
                    data-testid="input-lastName"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="@username"
                  {...form.register("username")}
                  data-testid="input-username"
                />
                {form.formState.errors.username && (
                  <p className="text-sm text-destructive">{form.formState.errors.username.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us about yourself..."
                  rows={4}
                  {...form.register("bio")}
                  data-testid="textarea-bio"
                />
                {form.formState.errors.bio && (
                  <p className="text-sm text-destructive">{form.formState.errors.bio.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="birthday">Birthday</Label>
                <Controller
                  name="birthday"
                  control={form.control}
                  render={({ field }) => (
                    <BirthdayPicker
                      id="birthday"
                      value={field.value}
                      onChange={field.onChange}
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      dataTestId="input-birthday"
                    />
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Links & Social Media */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Link2 className="h-5 w-5" />
                <span>Links & Social Media</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://your-website.com"
                  {...form.register("website")}
                  data-testid="input-website"
                />
                {form.formState.errors.website && (
                  <p className="text-sm text-destructive">{form.formState.errors.website.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="twitterHandle">Twitter/X Handle @</Label>
                  <Input
                    id="twitterHandle"
                    placeholder="username"
                    {...form.register("twitterHandle")}
                    data-testid="input-twitter"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="githubHandle">GitHub Handle</Label>
                  <Input
                    id="githubHandle"
                    placeholder="username"
                    {...form.register("githubHandle")}
                    data-testid="input-github"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkedinHandle">LinkedIn Handle</Label>
                  <Input
                    id="linkedinHandle"
                    placeholder="username"
                    {...form.register("linkedinHandle")}
                    data-testid="input-linkedin"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="instagramHandle">Instagram Handle @</Label>
                  <Input
                    id="instagramHandle"
                    placeholder="username"
                    {...form.register("instagramHandle")}
                    data-testid="input-instagram"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deviantartHandle">DeviantArt Handle</Label>
                  <Input
                    id="deviantartHandle"
                    placeholder="username"
                    {...form.register("deviantartHandle")}
                    data-testid="input-deviantart"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="blueskyHandle">Bluesky Handle @</Label>
                  <Input
                    id="blueskyHandle"
                    placeholder="username.bsky.social"
                    {...form.register("blueskyHandle")}
                    data-testid="input-bluesky"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tiktokHandle">TikTok Handle @</Label>
                  <Input
                    id="tiktokHandle"
                    placeholder="username"
                    {...form.register("tiktokHandle")}
                    data-testid="input-tiktok"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="redditHandle">Reddit Handle u/</Label>
                  <Input
                    id="redditHandle"
                    placeholder="username"
                    {...form.register("redditHandle")}
                    data-testid="input-reddit"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="patreonHandle">Patreon Handle</Label>
                  <Input
                    id="patreonHandle"
                    placeholder="username"
                    {...form.register("patreonHandle")}
                    data-testid="input-patreon"
                  />
                </div>
              </div>

              <Separator />

              {/* Custom Social Links */}
              <div className="space-y-4">
                <h4 className="font-medium">Custom Social Links</h4>
                
                {customSocials.map((social, index) => (
                  <div key={index} className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{social.platform}</p>
                      <p className="text-sm text-muted-foreground">{social.url}</p>
                      {social.handle && <p className="text-sm text-muted-foreground">@{social.handle}</p>}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCustomSocial(index)}
                      data-testid={`button-remove-social-${index}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <Input
                    placeholder="Platform"
                    value={newSocial.platform}
                    onChange={(e) => setNewSocial({ ...newSocial, platform: e.target.value })}
                    data-testid="input-new-social-platform"
                  />
                  <Input
                    placeholder="URL"
                    value={newSocial.url}
                    onChange={(e) => setNewSocial({ ...newSocial, url: e.target.value })}
                    data-testid="input-new-social-url"
                  />
                  <Input
                    placeholder="Handle (optional)"
                    value={newSocial.handle}
                    onChange={(e) => setNewSocial({ ...newSocial, handle: e.target.value })}
                    data-testid="input-new-social-handle"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addCustomSocial}
                    disabled={!newSocial.platform || !newSocial.url}
                    data-testid="button-add-social"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Home className="h-5 w-5" />
                <span>Preferences</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="defaultLandingPage">Default Page</Label>
                  <p className="text-sm text-muted-foreground">Choose which page loads when you log in</p>
                </div>
                <Select
                  value={form.watch("defaultLandingPage")}
                  onValueChange={(value: "dashboard" | "my-prompts") => form.setValue("defaultLandingPage", value)}
                >
                  <SelectTrigger className="w-40" data-testid="select-default-landing-page">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dashboard">Dashboard</SelectItem>
                    <SelectItem value="my-prompts">My Prompts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Privacy Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Privacy Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="profileVisibility">Profile Visibility</Label>
                  <p className="text-sm text-muted-foreground">Control who can see your profile</p>
                </div>
                <Select
                  value={form.watch("profileVisibility")}
                  onValueChange={(value: "public" | "private") => form.setValue("profileVisibility", value)}
                >
                  <SelectTrigger className="w-32" data-testid="select-profile-visibility">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="emailVisibility">Show Email</Label>
                  <p className="text-sm text-muted-foreground">Make your email visible on your profile</p>
                </div>
                <Switch
                  id="emailVisibility"
                  checked={form.watch("emailVisibility")}
                  onCheckedChange={(checked) => form.setValue("emailVisibility", checked)}
                  data-testid="switch-email-visibility"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="showStats">Show Statistics</Label>
                  <p className="text-sm text-muted-foreground">Display prompt counts, likes, and other stats</p>
                </div>
                <Switch
                  id="showStats"
                  checked={form.watch("showStats")}
                  onCheckedChange={(checked) => form.setValue("showStats", checked)}
                  data-testid="switch-show-stats"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="showBirthday">Show Birthday</Label>
                  <p className="text-sm text-muted-foreground">Display your birthday on your profile</p>
                </div>
                <Switch
                  id="showBirthday"
                  checked={form.watch("showBirthday")}
                  onCheckedChange={(checked) => form.setValue("showBirthday", checked)}
                  data-testid="switch-show-birthday"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="showNsfw">Show NSFW Content</Label>
                  <p className="text-sm text-muted-foreground">Display prompts marked as NSFW in your feed</p>
                </div>
                <Switch
                  id="showNsfw"
                  checked={form.watch("showNsfw")}
                  onCheckedChange={(checked) => form.setValue("showNsfw", checked)}
                  data-testid="switch-show-nsfw"
                />
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={updateProfileMutation.isPending}
              data-testid="button-save-profile"
            >
              {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>

        {/* Invitations Card - Outside the form */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Mail className="h-5 w-5" />
              <span>Community Invitations</span>
            </CardTitle>
            <CardDescription>
              Join communities and sub-communities using invite codes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InviteAcceptanceForm embedded={true} />
          </CardContent>
        </Card>
    </div>
  );
}