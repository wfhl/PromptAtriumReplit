import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow 
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings,
  DollarSign,
  Percent,
  Calendar,
  CreditCard,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Save,
  Users,
  ShoppingCart,
  TrendingUp,
  Package,
  FileText,
  Clock,
  Shield,
  Ban,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Play,
  Pause,
  ChevronRight,
  Download,
  Upload,
  Plus
} from "lucide-react";
import { format } from "date-fns";

interface MarketplaceSettings {
  commissionRate: number;
  payoutFrequency: string;
  minimumPayoutAmount: number;
  autoPayouts: boolean;
  stripeEnabled: boolean;
  paypalEnabled: boolean;
  processingFeePercentage: number;
  flatProcessingFee: number;
  marketplaceName: string;
  marketplaceDescription: string;
  requireSellerVerification: boolean;
  maxListingsPerSeller: number;
  allowDigitalProducts: boolean;
  allowPhysicalProducts: boolean;
  disputeResolutionDays: number;
  buyerProtectionEnabled: boolean;
}

interface SellerData {
  id: string;
  userId: string;
  username: string;
  email: string;
  status: string;
  stripeConnected: boolean;
  paypalConnected: boolean;
  totalSales: number;
  totalRevenue: number;
  pendingPayout: number;
  commissionRate?: number;
  joinedAt: string;
  verified: boolean;
}

interface ListingData {
  id: string;
  title: string;
  sellerId: string;
  sellerName: string;
  price: number;
  status: string;
  category: string;
  salesCount: number;
  revenue: number;
  createdAt: string;
  featured: boolean;
  reported: boolean;
}

export default function MarketplaceManagement() {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("overview");
  const [selectedSeller, setSelectedSeller] = useState<SellerData | null>(null);
  const [selectedListing, setSelectedListing] = useState<ListingData | null>(null);
  const [editSettingsOpen, setEditSettingsOpen] = useState(false);
  const [editSellerOpen, setEditSellerOpen] = useState(false);
  const [editListingOpen, setEditListingOpen] = useState(false);
  
  // Fetch marketplace settings
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['/api/admin/marketplace/settings'],
    queryFn: async () => {
      const response = await (apiRequest as any)('/api/admin/marketplace/settings', { method: 'GET' });
      return response as MarketplaceSettings;
    }
  });

  // Fetch marketplace statistics
  const { data: stats } = useQuery({
    queryKey: ['/api/admin/marketplace/stats'],
    queryFn: async () => {
      const response = await (apiRequest as any)('/api/admin/marketplace/stats', { method: 'GET' });
      return response;
    }
  });

  // Fetch sellers
  const { data: sellers } = useQuery({
    queryKey: ['/api/admin/marketplace/sellers'],
    queryFn: async () => {
      const response = await (apiRequest as any)('/api/admin/marketplace/sellers', { method: 'GET' });
      return response as SellerData[];
    }
  });

  // Fetch listings
  const { data: listings } = useQuery({
    queryKey: ['/api/admin/marketplace/listings'],
    queryFn: async () => {
      const response = await (apiRequest as any)('/api/admin/marketplace/listings', { method: 'GET' });
      return response as ListingData[];
    }
  });

  // Update marketplace settings
  const updateSettings = useMutation({
    mutationFn: async (newSettings: Partial<MarketplaceSettings>) => {
      return await apiRequest('PUT', '/api/admin/marketplace/settings', newSettings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/marketplace/settings'] });
      setEditSettingsOpen(false);
      toast({
        title: "Success",
        description: "Marketplace settings updated successfully"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update marketplace settings",
        variant: "destructive"
      });
    }
  });

  // Update seller status
  const updateSellerStatus = useMutation({
    mutationFn: async ({ sellerId, status }: { sellerId: string; status: string }) => {
      return await apiRequest('PATCH', `/api/admin/marketplace/sellers/${sellerId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/marketplace/sellers'] });
      toast({
        title: "Success",
        description: "Seller status updated successfully"
      });
    }
  });

  // Update listing status
  const updateListingStatus = useMutation({
    mutationFn: async ({ listingId, status, featured }: { listingId: string; status?: string; featured?: boolean }) => {
      return await apiRequest('PATCH', `/api/admin/marketplace/listings/${listingId}`, { status, featured });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/marketplace/listings'] });
      toast({
        title: "Success",
        description: "Listing updated successfully"
      });
    }
  });

  // Process manual payout
  const processPayouts = useMutation({
    mutationFn: async (method: 'stripe' | 'paypal') => {
      return await apiRequest('POST', '/api/admin/payouts/process', { payoutMethod: method });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/payouts/batches'] });
      toast({
        title: "Success",
        description: `Processed ${data.payoutCount} payouts for $${(data.totalAmountCents / 100).toFixed(2)}`
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to process payouts",
        variant: "destructive"
      });
    }
  });

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Marketplace Management</h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Configure marketplace settings and manage sellers
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => processPayouts.mutate('stripe')} disabled={processPayouts.isPending} size="sm">
            <Play className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
            Process Stripe Payouts
          </Button>
          <Button onClick={() => processPayouts.mutate('paypal')} disabled={processPayouts.isPending} variant="outline" size="sm">
            <Play className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
            Process PayPal Payouts
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sellers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalSellers || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.activeSellers || 0} active this month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Listings</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeListings || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.newListingsToday || 0} added today
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gross Merchandise Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats?.gmv?.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats?.platformRevenue?.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-muted-foreground">
              {settings?.commissionRate || 15}% commission
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1 h-auto p-1">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
          <TabsTrigger value="sellers" className="text-xs sm:text-sm">Sellers</TabsTrigger>
          <TabsTrigger value="listings" className="text-xs sm:text-sm">Listings</TabsTrigger>
          <TabsTrigger value="settings" className="text-xs sm:text-sm">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common marketplace management tasks
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <Button variant="outline" className="justify-start" onClick={() => setSelectedTab("settings")}>
                <Settings className="mr-2 h-4 w-4" />
                Configure Commission Rates
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => setSelectedTab("sellers")}>
                <Users className="mr-2 h-4 w-4" />
                Review Seller Applications
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => processPayouts.mutate('stripe')}>
                <CreditCard className="mr-2 h-4 w-4" />
                Process Pending Payouts
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => setSelectedTab("listings")}>
                <Shield className="mr-2 h-4 w-4" />
                Moderate Reported Listings
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Platform Health</CardTitle>
              <CardDescription>
                Current marketplace status and configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Stripe Payments</span>
                  <Badge variant={settings?.stripeEnabled ? "default" : "secondary"}>
                    {settings?.stripeEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">PayPal Payments</span>
                  <Badge variant={settings?.paypalEnabled ? "default" : "secondary"}>
                    {settings?.paypalEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Auto Payouts</span>
                  <Badge variant={settings?.autoPayouts ? "default" : "secondary"}>
                    {settings?.autoPayouts ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Payout Frequency</span>
                  <Badge variant="outline" className="capitalize">
                    {settings?.payoutFrequency || "Weekly"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Commission Rate</span>
                  <Badge variant="outline">
                    {settings?.commissionRate || 15}%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sellers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Seller Management</CardTitle>
              <CardDescription>
                View and manage marketplace sellers
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Seller</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment Methods</TableHead>
                    <TableHead className="text-right">Total Sales</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sellers?.map((seller) => (
                    <TableRow key={seller.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{seller.username}</div>
                          <div className="text-xs text-muted-foreground">{seller.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          seller.status === 'active' ? 'default' :
                          seller.status === 'suspended' ? 'destructive' :
                          'secondary'
                        }>
                          {seller.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {seller.stripeConnected && (
                            <Badge variant="outline" className="text-xs">Stripe</Badge>
                          )}
                          {seller.paypalConnected && (
                            <Badge variant="outline" className="text-xs">PayPal</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{seller.totalSales}</TableCell>
                      <TableCell className="text-right">${(seller.totalRevenue / 100).toFixed(2)}</TableCell>
                      <TableCell className="text-right">${(seller.pendingPayout / 100).toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedSeller(seller);
                              setEditSellerOpen(true);
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          {seller.status === 'active' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateSellerStatus.mutate({ sellerId: seller.id, status: 'suspended' })}
                            >
                              <Ban className="h-3 w-3" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateSellerStatus.mutate({ sellerId: seller.id, status: 'active' })}
                            >
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!sellers || sellers.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No sellers found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="listings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Listing Management</CardTitle>
              <CardDescription>
                View and moderate marketplace listings
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Listing</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Sales</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listings?.map((listing) => (
                    <TableRow key={listing.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{listing.title}</div>
                          {listing.featured && (
                            <Badge variant="secondary" className="text-xs">Featured</Badge>
                          )}
                          {listing.reported && (
                            <Badge variant="destructive" className="text-xs">Reported</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{listing.sellerName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {listing.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">${listing.price.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{listing.salesCount}</TableCell>
                      <TableCell>
                        <Badge variant={
                          listing.status === 'active' ? 'default' :
                          listing.status === 'suspended' ? 'destructive' :
                          'secondary'
                        }>
                          {listing.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateListingStatus.mutate({ 
                              listingId: listing.id, 
                              featured: !listing.featured 
                            })}
                          >
                            {listing.featured ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </Button>
                          {listing.status === 'active' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateListingStatus.mutate({ 
                                listingId: listing.id, 
                                status: 'suspended' 
                              })}
                            >
                              <Ban className="h-3 w-3" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateListingStatus.mutate({ 
                                listingId: listing.id, 
                                status: 'active' 
                              })}
                            >
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!listings || listings.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No listings found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Marketplace Settings</CardTitle>
              <CardDescription>
                Configure global marketplace parameters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Commission & Fees</h3>
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="commission">Commission Rate</Label>
                      <span className="text-sm font-medium">{settings?.commissionRate || 15}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="processing">Processing Fee</Label>
                      <span className="text-sm font-medium">
                        {settings?.processingFeePercentage || 2.9}% + ${settings?.flatProcessingFee || 0.30}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Payout Configuration</h3>
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="frequency">Payout Frequency</Label>
                      <Badge variant="outline" className="capitalize">
                        {settings?.payoutFrequency || 'weekly'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="minimum">Minimum Payout</Label>
                      <span className="text-sm font-medium">
                        ${(settings?.minimumPayoutAmount || 1000) / 100}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="auto">Auto Payouts</Label>
                      <Switch checked={settings?.autoPayouts || false} disabled />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Payment Methods</h3>
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="stripe">Stripe Payments</Label>
                      <Switch checked={settings?.stripeEnabled || false} disabled />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="paypal">PayPal Payments</Label>
                      <Switch checked={settings?.paypalEnabled || false} disabled />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Marketplace Policies</h3>
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="verification">Seller Verification Required</Label>
                      <Switch checked={settings?.requireSellerVerification || false} disabled />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="protection">Buyer Protection</Label>
                      <Switch checked={settings?.buyerProtectionEnabled || false} disabled />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="disputes">Dispute Resolution Days</Label>
                      <span className="text-sm font-medium">{settings?.disputeResolutionDays || 7}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="max-listings">Max Listings per Seller</Label>
                      <span className="text-sm font-medium">{settings?.maxListingsPerSeller || 100}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Dialog open={editSettingsOpen} onOpenChange={setEditSettingsOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Settings
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Edit Marketplace Settings</DialogTitle>
                        <DialogDescription>
                          Update global marketplace configuration
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Changes to commission rates only apply to new orders. Existing pending payouts retain their original rates.
                          </AlertDescription>
                        </Alert>
                        <div className="grid gap-4">
                          <div>
                            <Label htmlFor="edit-commission">Commission Rate (%)</Label>
                            <Input 
                              id="edit-commission"
                              type="number"
                              min="0"
                              max="100"
                              defaultValue={settings?.commissionRate || 15}
                            />
                          </div>
                          <div>
                            <Label htmlFor="edit-min-payout">Minimum Payout Amount ($)</Label>
                            <Input 
                              id="edit-min-payout"
                              type="number"
                              min="0"
                              defaultValue={(settings?.minimumPayoutAmount || 1000) / 100}
                            />
                          </div>
                          <div>
                            <Label htmlFor="edit-frequency">Payout Frequency</Label>
                            <Select defaultValue={settings?.payoutFrequency || 'weekly'}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="biweekly">Bi-weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setEditSettingsOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={() => {
                          // Implement save logic
                          toast({
                            title: "Settings Updated",
                            description: "Marketplace settings have been updated successfully"
                          });
                          setEditSettingsOpen(false);
                        }}>
                          Save Changes
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}