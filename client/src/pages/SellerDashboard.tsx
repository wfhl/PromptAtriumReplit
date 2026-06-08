import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DollarSign, TrendingUp, Package, Star, MoreVertical, Plus, Edit, Pause, Play, Trash, CheckCircle, AlertCircle, MessageSquare, Reply, User, ThumbsUp, HelpCircle, CreditCard, Wallet, ArrowUpRight, RefreshCw, ExternalLink, Clock, BarChart3 } from "lucide-react";
import { CreateListingModal } from "@/components/CreateListingModal";
import SellerAnalytics from "@/components/SellerAnalytics";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import type { MarketplaceListing, SellerProfile } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { Link, useLocation } from "wouter";

// Onboarding form validation schema
const onboardingSchema = z.object({
  businessType: z.enum(["individual", "business"]),
  taxId: z.string().optional(),
  vatNumber: z.string().optional(),
  businessName: z.string().optional(),
  businessAddress: z.string().optional(),
  payoutMethod: z.enum(["stripe", "paypal"]),
  paypalEmail: z.string().email("Invalid email address").optional(),
}).refine((data) => {
  // At least one tax field should be provided
  return data.taxId || data.vatNumber || data.businessName || data.businessAddress;
}, {
  message: "At least one tax information field is required",
  path: ["taxId"], // Show error on first tax field
}).refine((data) => {
  // If PayPal is selected, email is required
  if (data.payoutMethod === "paypal" && !data.paypalEmail) {
    return false;
  }
  return true;
}, {
  message: "PayPal email is required for PayPal payouts",
  path: ["paypalEmail"],
});

// Seller response form validation schema
const sellerResponseSchema = z.object({
  response: z.string().min(10, "Response must be at least 10 characters").max(1000, "Response must be less than 1000 characters"),
});

export default function SellerDashboard() {
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingListing, setEditingListing] = useState<MarketplaceListing | null>(null);
  const [respondingToReview, setRespondingToReview] = useState<any>(null);
  const [showResponseDialog, setShowResponseDialog] = useState(false);
  
  // Check URL params for Stripe redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      toast({
        title: "Stripe Connect Setup Complete!",
        description: "Your Stripe account has been successfully connected. You can now receive payments.",
        duration: 5000,
      });
      // Remove URL parameters
      navigate('/seller-dashboard', { replace: true });
    } else if (urlParams.get('refresh') === 'true') {
      toast({
        title: "Stripe Connect Setup Incomplete",
        description: "Please complete your Stripe account setup to receive payments.",
        variant: "destructive",
      });
      // Remove URL parameters
      navigate('/seller-dashboard', { replace: true });
    }
  }, []);

  // Fetch seller profile
  const { data: sellerProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["/api/marketplace/seller/profile"],
  }) as { data: SellerProfile | undefined; isLoading: boolean };

  // Fetch user's listings
  const { data: myListings = [], isLoading: listingsLoading } = useQuery({
    queryKey: ["/api/marketplace/my-listings"],
  }) as { data: MarketplaceListing[]; isLoading: boolean };
  
  // Fetch all reviews for seller's listings
  const { data: sellerReviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ["/api/marketplace/reviews/seller"],
    enabled: !!sellerProfile,
  }) as { data: any[]; isLoading: boolean };
  
  // Fetch Stripe balance
  const { data: stripeBalance, isLoading: balanceLoading } = useQuery({
    queryKey: ["/api/marketplace/seller/balance"],
    enabled: !!sellerProfile?.stripeAccountId && sellerProfile.onboardingStatus === 'completed',
  }) as { data: { available?: any[]; pending?: any[] } | undefined; isLoading: boolean };
  
  // Fetch Stripe payouts
  const { data: stripePayouts = [], isLoading: payoutsLoading } = useQuery({
    queryKey: ["/api/marketplace/seller/payouts"],
    enabled: !!sellerProfile?.stripeAccountId && sellerProfile.onboardingStatus === 'completed',
  }) as { data: any[]; isLoading: boolean };

  // Update listing mutation
  const updateListingMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MarketplaceListing> }) => {
      const response = await apiRequest("PUT", `/api/marketplace/listings/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/my-listings"] });
      toast({ title: "Success", description: "Listing updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update listing",
        variant: "destructive"
      });
    },
  });

  // Delete listing mutation
  const deleteListingMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/marketplace/listings/${id}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/my-listings"] });
      toast({ title: "Success", description: "Listing deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete listing",
        variant: "destructive"
      });
    },
  });

  // Seller response mutation
  const addResponseMutation = useMutation({
    mutationFn: async ({ reviewId, response }: { reviewId: string; response: string }) => {
      const res = await apiRequest("POST", `/api/marketplace/reviews/${reviewId}/response`, { response });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/reviews/seller"] });
      toast({ title: "Success", description: "Response added successfully" });
      setShowResponseDialog(false);
      setRespondingToReview(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to add response",
        variant: "destructive"
      });
    },
  });

  // Onboarding form
  const form = useForm<z.infer<typeof onboardingSchema>>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      businessType: "individual",
      taxId: "",
      vatNumber: "",
      businessName: "",
      businessAddress: "",
      payoutMethod: "stripe",
      paypalEmail: "",
    },
  });
  
  // Response form for reviews
  const responseForm = useForm<z.infer<typeof sellerResponseSchema>>({
    resolver: zodResolver(sellerResponseSchema),
    defaultValues: {
      response: "",
    },
  });

  // Seller onboarding mutation with Stripe Connect or PayPal
  const onboardingMutation = useMutation({
    mutationFn: async (data: z.infer<typeof onboardingSchema>) => {
      const response = await apiRequest("POST", "/api/marketplace/seller/onboard", {
        businessType: data.businessType,
        taxInfo: {
          taxId: data.taxId || undefined,
          vatNumber: data.vatNumber || undefined,
          businessName: data.businessName || undefined,
          businessAddress: data.businessAddress || undefined,
        },
        payoutMethod: data.payoutMethod,
        paypalEmail: data.payoutMethod === "paypal" ? data.paypalEmail : undefined,
      });
      return await response.json() as { stripeOnboardingUrl?: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/seller/profile"] });
      
      // If Stripe onboarding URL is provided, redirect to it
      if (data?.stripeOnboardingUrl) {
        toast({ 
          title: "Redirecting to Stripe", 
          description: "Complete your Stripe account setup to receive payments.",
          duration: 3000,
        });
        // Redirect to Stripe Connect onboarding
        setTimeout(() => {
          window.location.href = data.stripeOnboardingUrl!;
        }, 1500);
      } else {
        toast({ 
          title: "Success", 
          description: "Seller profile completed successfully! You can now create listings.",
          duration: 5000,
        });
      }
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to complete seller onboarding",
        variant: "destructive"
      });
    },
  });
  
  // Refresh Stripe onboarding link mutation
  const refreshOnboardingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/marketplace/seller/refresh-onboarding");
      return await response.json() as { url?: string };
    },
    onSuccess: (data) => {
      if (data?.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to refresh onboarding link",
        variant: "destructive"
      });
    },
  });

  const handleOnboardingSubmit = async (data: z.infer<typeof onboardingSchema>) => {
    await onboardingMutation.mutateAsync(data);
  };

  const handleToggleStatus = async (listing: MarketplaceListing) => {
    const newStatus = listing.status === "active" ? "paused" : "active";
    await updateListingMutation.mutateAsync({ 
      id: listing.id, 
      data: { status: newStatus } 
    });
  };

  const formatPrice = (cents: number | null | undefined) => {
    if (!cents) return null;
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatCredits = (credits: number | null | undefined) => {
    if (!credits) return null;
    return `${credits.toLocaleString()} credits`;
  };

  const activeListings = myListings.filter(l => l.status === "active");
  const pausedListings = myListings.filter(l => l.status === "paused");
  const draftListings = myListings.filter(l => l.status === "draft");

  if (profileLoading || listingsLoading) {
    return <div>Loading...</div>;
  }

  // Show onboarding form if profile doesn't exist or is not completed
  if (!sellerProfile || sellerProfile.onboardingStatus !== 'completed') {
    return (
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Complete Seller Onboarding
            </CardTitle>
            <CardDescription>
              Please complete your seller profile to start creating marketplace listings.
              This information is required for tax compliance and payment processing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleOnboardingSubmit)} className="space-y-6">
                {/* Business Type */}
                <FormField
                  control={form.control}
                  name="businessType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-business-type">
                            <SelectValue placeholder="Select business type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="individual">Individual</SelectItem>
                          <SelectItem value="business">Business</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select whether you're selling as an individual or a business entity
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Tax Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Tax Information</h3>
                  <p className="text-xs text-muted-foreground">
                    Please provide at least one tax identification field
                  </p>
                  
                  <FormField
                    control={form.control}
                    name="taxId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tax ID Number</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter tax ID" data-testid="input-tax-id" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="vatNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>VAT Number</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter VAT number" data-testid="input-vat-number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="businessName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter business name" data-testid="input-business-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="businessAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Address</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter business address" data-testid="input-business-address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Payout Method Selection */}
                <FormField
                  control={form.control}
                  name="payoutMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payout Method</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-payout-method">
                            <SelectValue placeholder="Select payout method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="stripe">
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4" />
                              Bank Transfer (via Stripe)
                            </div>
                          </SelectItem>
                          <SelectItem value="paypal">
                            <div className="flex items-center gap-2">
                              <Wallet className="h-4 w-4" />
                              PayPal
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {field.value === "stripe" ? (
                          "Automated payouts directly to your bank account (2-7 business days)"
                        ) : field.value === "paypal" ? (
                          "Automated payouts to your PayPal account (typically within 24 hours)"
                        ) : (
                          "Choose how you'd like to receive payments for your sales"
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* PayPal Email - Only shown when PayPal is selected */}
                {form.watch("payoutMethod") === "paypal" && (
                  <FormField
                    control={form.control}
                    name="paypalEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PayPal Email</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="email"
                            placeholder="your-email@example.com" 
                            data-testid="input-paypal-email" 
                          />
                        </FormControl>
                        <FormDescription>
                          Enter the email address associated with your PayPal account
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={onboardingMutation.isPending}
                  data-testid="button-complete-onboarding"
                >
                  {onboardingMutation.isPending ? (
                    "Completing Onboarding..."
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Complete Onboarding
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Seller Dashboard</h1>
            <p className="text-muted-foreground">Manage your marketplace listings and track your sales</p>
          </div>
          <Link href="/marketplace/help">
            <Button variant="outline" size="sm">
              <HelpCircle className="h-4 w-4 mr-2" />
              Marketplace Guide
            </Button>
          </Link>
        </div>
      </div>

      {/* Stripe Connect Status */}
      {sellerProfile && (
        <div className="mb-8">
          {sellerProfile.stripeAccountId ? (
            sellerProfile.onboardingStatus === 'completed' ? (
              <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle>Stripe Connected</AlertTitle>
                <AlertDescription>
                  Your Stripe account is connected and ready to receive payments. You'll receive automatic payouts according to your Stripe payout schedule.
                </AlertDescription>
              </Alert>
            ) : sellerProfile.onboardingStatus === 'pending' ? (
              <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
                <Clock className="h-4 w-4 text-yellow-600" />
                <AlertTitle>Stripe Setup Incomplete</AlertTitle>
                <AlertDescription className="flex items-center justify-between">
                  <span>Please complete your Stripe account setup to receive payments from sales.</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => refreshOnboardingMutation.mutate()}
                    disabled={refreshOnboardingMutation.isPending}
                  >
                    {refreshOnboardingMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Continue Setup
                      </>
                    )}
                  </Button>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertTitle>Stripe Account Issue</AlertTitle>
                <AlertDescription>
                  There was an issue with your Stripe account setup. Please contact support for assistance.
                </AlertDescription>
              </Alert>
            )
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Payment Setup Required</AlertTitle>
              <AlertDescription>
                To receive USD payments, you need to connect a Stripe account. This will be set up automatically when you complete seller onboarding.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-sales">
              {sellerProfile?.totalSales || 0}
            </div>
            <p className="text-xs text-muted-foreground">Lifetime sales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue (USD)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-revenue-usd">
              {formatPrice(sellerProfile?.totalRevenueCents) || "$0.00"}
            </div>
            <p className="text-xs text-muted-foreground">Total earnings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credits Earned</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-credits-earned">
              {sellerProfile?.totalCreditsEarned?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">From sales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-average-rating">
              {sellerProfile?.averageRating || "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">From buyers</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">My Listings ({myListings.length})</h2>
        <Button onClick={() => setShowCreateModal(true)} data-testid="button-create-listing">
          <Plus className="h-4 w-4 mr-2" />
          Create Listing
        </Button>
      </div>

      {/* Listings Tabs */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="analytics" data-testid="tab-analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="active" data-testid="tab-active">
            Active ({activeListings.length})
          </TabsTrigger>
          <TabsTrigger value="paused" data-testid="tab-paused">
            Paused ({pausedListings.length})
          </TabsTrigger>
          <TabsTrigger value="draft" data-testid="tab-draft">
            Drafts ({draftListings.length})
          </TabsTrigger>
          <TabsTrigger value="reviews" data-testid="tab-reviews">
            <MessageSquare className="h-4 w-4 mr-2" />
            Reviews ({sellerReviews.length})
          </TabsTrigger>
          {sellerProfile?.stripeAccountId && sellerProfile.onboardingStatus === 'completed' && (
            <TabsTrigger value="payouts" data-testid="tab-payouts">
              <Wallet className="h-4 w-4 mr-2" />
              Payouts
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="analytics" className="space-y-4">
          <SellerAnalytics />
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          {activeListings.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No active listings</p>
              </CardContent>
            </Card>
          ) : (
            activeListings.map((listing) => (
              <Card key={listing.id} data-testid={`card-listing-${listing.id}`}>
                <CardContent className="flex justify-between items-center py-4">
                  <div className="flex-1">
                    <h3 className="font-semibold">{listing.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{listing.description}</p>
                    <div className="flex gap-4 text-sm">
                      {listing.acceptsMoney && listing.priceCents && (
                        <span>💵 {formatPrice(listing.priceCents)}</span>
                      )}
                      {listing.acceptsCredits && listing.creditPrice && (
                        <span>✨ {formatCredits(listing.creditPrice)}</span>
                      )}
                      <span>📊 {listing.salesCount} sales</span>
                      {listing.averageRating && (
                        <span>⭐ {listing.averageRating}</span>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" data-testid={`button-menu-${listing.id}`}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        onClick={() => setEditingListing(listing)}
                        data-testid={`menu-edit-${listing.id}`}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleToggleStatus(listing)}
                        data-testid={`menu-pause-${listing.id}`}
                      >
                        <Pause className="h-4 w-4 mr-2" />
                        Pause
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => deleteListingMutation.mutate(listing.id)}
                        className="text-destructive"
                        data-testid={`menu-delete-${listing.id}`}
                      >
                        <Trash className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="paused" className="space-y-4">
          {pausedListings.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No paused listings</p>
              </CardContent>
            </Card>
          ) : (
            pausedListings.map((listing) => (
              <Card key={listing.id} data-testid={`card-listing-${listing.id}`}>
                <CardContent className="flex justify-between items-center py-4">
                  <div className="flex-1 opacity-60">
                    <h3 className="font-semibold">{listing.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{listing.description}</p>
                    <div className="flex gap-4 text-sm">
                      {listing.acceptsMoney && listing.priceCents && (
                        <span>💵 {formatPrice(listing.priceCents)}</span>
                      )}
                      {listing.acceptsCredits && listing.creditPrice && (
                        <span>✨ {formatCredits(listing.creditPrice)}</span>
                      )}
                      <Badge variant="secondary">Paused</Badge>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" data-testid={`button-menu-${listing.id}`}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        onClick={() => handleToggleStatus(listing)}
                        data-testid={`menu-activate-${listing.id}`}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Activate
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setEditingListing(listing)}
                        data-testid={`menu-edit-${listing.id}`}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => deleteListingMutation.mutate(listing.id)}
                        className="text-destructive"
                        data-testid={`menu-delete-${listing.id}`}
                      >
                        <Trash className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="draft" className="space-y-4">
          {draftListings.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No draft listings</p>
              </CardContent>
            </Card>
          ) : (
            draftListings.map((listing) => (
              <Card key={listing.id} data-testid={`card-listing-${listing.id}`}>
                <CardContent className="flex justify-between items-center py-4">
                  <div className="flex-1">
                    <h3 className="font-semibold">{listing.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{listing.description}</p>
                    <div className="flex gap-4 text-sm">
                      {listing.acceptsMoney && listing.priceCents && (
                        <span>💵 {formatPrice(listing.priceCents)}</span>
                      )}
                      {listing.acceptsCredits && listing.creditPrice && (
                        <span>✨ {formatCredits(listing.creditPrice)}</span>
                      )}
                      <Badge variant="outline">Draft</Badge>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" data-testid={`button-menu-${listing.id}`}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        onClick={() => setEditingListing(listing)}
                        data-testid={`menu-edit-${listing.id}`}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit & Publish
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => deleteListingMutation.mutate(listing.id)}
                        className="text-destructive"
                        data-testid={`menu-delete-${listing.id}`}
                      >
                        <Trash className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
        
        <TabsContent value="reviews" className="space-y-4">
          {reviewsLoading ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">Loading reviews...</p>
              </CardContent>
            </Card>
          ) : sellerReviews.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No reviews yet</p>
              </CardContent>
            </Card>
          ) : (
            sellerReviews.map((review: any) => (
              <Card key={review.id} data-testid={`card-review-${review.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={review.reviewer?.profileImageUrl} />
                        <AvatarFallback>
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{review.reviewer?.username || "Anonymous"}</p>
                          {review.verifiedPurchase && (
                            <Badge variant="secondary" className="text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Verified Purchase
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-4 w-4 ${star <= review.rating ? 'fill-yellow-500 text-yellow-500' : 'text-gray-300'}`}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <Badge>{review.listing?.title || "Unknown Listing"}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {review.title && <h4 className="font-semibold">{review.title}</h4>}
                  <p className="text-sm">{review.comment}</p>
                  
                  {/* Helpful Count */}
                  {review.helpfulCount > 0 && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <ThumbsUp className="h-3 w-3" />
                      <span>{review.helpfulCount} {review.helpfulCount === 1 ? 'person' : 'people'} found this helpful</span>
                    </div>
                  )}
                  
                  {/* Seller Response */}
                  {review.sellerResponse ? (
                    <div className="bg-muted/50 p-3 rounded-lg mt-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Reply className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-medium">Seller Response</p>
                      </div>
                      <p className="text-sm">{review.sellerResponse}</p>
                      {review.sellerRespondedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Responded {formatDistanceToNow(new Date(review.sellerRespondedAt), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex justify-end">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setRespondingToReview(review);
                          setShowResponseDialog(true);
                          responseForm.reset();
                        }}
                        data-testid={`button-respond-${review.id}`}
                      >
                        <Reply className="h-4 w-4 mr-2" />
                        Respond to Review
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Payouts Tab */}
        {sellerProfile?.stripeAccountId && sellerProfile.onboardingStatus === 'completed' && (
          <TabsContent value="payouts" className="space-y-4">
            {/* Balance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {balanceLoading ? (
                    <Skeleton className="h-8 w-32" />
                  ) : stripeBalance?.available ? (
                    <div>
                      {stripeBalance.available.map((balance: any) => (
                        <div key={balance.currency} className="text-2xl font-bold">
                          {balance.currency.toUpperCase()} {(balance.amount / 100).toFixed(2)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-2xl font-bold">$0.00</div>
                  )}
                  <p className="text-xs text-muted-foreground">Ready for payout</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Balance</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {balanceLoading ? (
                    <Skeleton className="h-8 w-32" />
                  ) : stripeBalance?.pending ? (
                    <div>
                      {stripeBalance.pending.map((balance: any) => (
                        <div key={balance.currency} className="text-2xl font-bold">
                          {balance.currency.toUpperCase()} {(balance.amount / 100).toFixed(2)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-2xl font-bold">$0.00</div>
                  )}
                  <p className="text-xs text-muted-foreground">Processing</p>
                </CardContent>
              </Card>
            </div>

            {/* Payout History */}
            <Card>
              <CardHeader>
                <CardTitle>Payout History</CardTitle>
                <CardDescription>
                  Your recent payouts from Stripe. Payouts are sent automatically according to your payout schedule.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {payoutsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : stripePayouts && stripePayouts.length > 0 ? (
                  <div className="space-y-2">
                    {stripePayouts.map((payout: any) => (
                      <div key={payout.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <div className="flex items-center gap-2">
                            {payout.status === 'paid' ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : payout.status === 'pending' ? (
                              <Clock className="h-4 w-4 text-yellow-500" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-gray-500" />
                            )}
                            <span className="font-medium">
                              {payout.currency.toUpperCase()} {(payout.amount / 100).toFixed(2)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {payout.status === 'paid' ? 'Paid' : payout.status === 'pending' ? 'Pending' : payout.status}
                            {payout.arrival_date && ` • Expected ${new Date(payout.arrival_date * 1000).toLocaleDateString()}`}
                          </p>
                        </div>
                        <Badge variant={
                          payout.status === 'paid' ? 'default' :
                          payout.status === 'pending' ? 'secondary' :
                          'outline'
                        }>
                          {payout.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No payouts yet. Your first payout will appear here after your first sale.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
      
      {/* Response Dialog */}
      <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Respond to Review</DialogTitle>
            <DialogDescription>
              Add a response to address the reviewer's feedback
            </DialogDescription>
          </DialogHeader>
          <Form {...responseForm}>
            <form onSubmit={responseForm.handleSubmit((data) => {
              if (respondingToReview) {
                addResponseMutation.mutate({
                  reviewId: respondingToReview.id,
                  response: data.response,
                });
              }
            })} className="space-y-4">
              <FormField
                control={responseForm.control}
                name="response"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Response</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Thank you for your feedback..."
                        rows={4}
                        data-testid="textarea-response"
                      />
                    </FormControl>
                    <FormDescription>
                      Be professional and address the customer's concerns
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowResponseDialog(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={addResponseMutation.isPending}
                  data-testid="button-submit-response"
                >
                  {addResponseMutation.isPending ? "Submitting..." : "Submit Response"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Listing Modal */}
      <CreateListingModal 
        open={showCreateModal || !!editingListing}
        onClose={() => {
          setShowCreateModal(false);
          setEditingListing(null);
        }}
        editingListing={editingListing}
      />
    </div>
  );
}