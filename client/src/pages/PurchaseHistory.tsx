import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ShoppingBag,
  Package,
  Download,
  Calendar,
  DollarSign,
  Coins,
  FileText,
  Copy,
  Check,
  Search,
  Filter,
  ExternalLink,
  CreditCard,
  Key,
  User,
  ArrowUpDown,
  Clock,
  Star,
  PenLine,
  MessageSquare,
  AlertTriangle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { ReviewForm } from "@/components/ReviewForm";
import { DisputeButton } from "@/components/marketplace/DisputeButton";
import { DisputeModal } from "@/components/marketplace/DisputeModal";
import { DisputeChat } from "@/components/marketplace/DisputeChat";
import { DisputesList } from "@/components/marketplace/DisputesList";

export function PurchaseHistory() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("purchases");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filterPaymentMethod, setFilterPaymentMethod] = useState("all");
  const [copiedLicenseId, setCopiedLicenseId] = useState<string | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [selectedDisputeOrder, setSelectedDisputeOrder] = useState<any>(null);
  const [viewDisputeId, setViewDisputeId] = useState<string | null>(null);
  
  // Fetch purchase history
  const { data: purchases, isLoading, error } = useQuery<any>({
    queryKey: ["/api/marketplace/purchases", { limit: 50, offset: 0 }],
    enabled: !!user,
  });
  
  // Fetch user's reviews to check which purchases have been reviewed
  const { data: userReviews } = useQuery<any>({
    queryKey: ["/api/marketplace/reviews/user"],
    enabled: !!user,
  });
  
  // Fetch disputes to check dispute status for orders
  const { data: disputes } = useQuery<any>({
    queryKey: ["/api/marketplace/disputes"],
    enabled: !!user,
  });
  
  // Copy license key to clipboard
  const copyLicenseKey = (licenseKey: string, orderId: string) => {
    navigator.clipboard.writeText(licenseKey);
    setCopiedLicenseId(orderId);
    toast({
      title: "License Key Copied",
      description: "The license key has been copied to your clipboard",
    });
    
    setTimeout(() => {
      setCopiedLicenseId(null);
    }, 2000);
  };
  
  // Filter and sort purchases
  const filteredPurchases = purchases?.filter((purchase: any) => {
    const matchesSearch = !searchTerm || 
      purchase.listing?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.listing?.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.orderNumber?.includes(searchTerm);
    
    const matchesPaymentFilter = filterPaymentMethod === "all" || 
      purchase.paymentMethod === filterPaymentMethod;
    
    return matchesSearch && matchesPaymentFilter;
  }).sort((a: any, b: any) => {
    switch (sortBy) {
      case "newest":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "oldest":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "priceHigh":
        const priceA = a.amountCents || (a.creditAmount || 0) * 100;
        const priceB = b.amountCents || (b.creditAmount || 0) * 100;
        return priceB - priceA;
      case "priceLow":
        const priceALow = a.amountCents || (a.creditAmount || 0) * 100;
        const priceBLow = b.amountCents || (b.creditAmount || 0) * 100;
        return priceALow - priceBLow;
      default:
        return 0;
    }
  }).map((purchase: any) => {
    // Add dispute information to each purchase
    const dispute = disputes?.find((d: any) => d.orderId === purchase.id);
    return {
      ...purchase,
      disputeId: dispute?.id,
      disputeStatus: dispute?.status,
    };
  });
  
  // Format price display
  const formatPrice = (purchase: any) => {
    if (purchase.paymentMethod === "stripe" && purchase.amountCents) {
      return `$${(purchase.amountCents / 100).toFixed(2)} USD`;
    } else if (purchase.creditAmount) {
      return `${purchase.creditAmount} Credits`;
    }
    return "N/A";
  };
  
  // Get payment method icon
  const getPaymentIcon = (method: string) => {
    if (method === "stripe") {
      return <CreditCard className="h-4 w-4" />;
    } else {
      return <Coins className="h-4 w-4 text-yellow-600" />;
    }
  };
  
  if (!user) {
    return (
      <div className="container max-w-7xl mx-auto p-6">
        <Alert>
          <AlertDescription>
            Please log in to view your purchase history.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="container max-w-7xl mx-auto p-6">
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container max-w-7xl mx-auto p-6">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load purchase history. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="container max-w-7xl mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-8 w-8" />
            <h1 className="text-3xl font-bold">Purchase History & Disputes</h1>
          </div>
          <p className="text-muted-foreground">
            View and manage your marketplace purchases and dispute resolutions
          </p>
        </div>
        
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="purchases" className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Purchases
            </TabsTrigger>
            <TabsTrigger value="disputes" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Disputes
            </TabsTrigger>
          </TabsList>
          
          {/* Purchases Tab */}
          <TabsContent value="purchases" className="space-y-6">
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Purchases
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {purchases?.length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Spent (USD)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${((purchases?.reduce((sum: number, p: any) => 
                  sum + (p.amountCents || 0), 0) || 0) / 100).toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Credits Spent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center">
                <Coins className="h-5 w-5 text-yellow-600 mr-2" />
                {purchases?.reduce((sum: number, p: any) => 
                  sum + (p.creditAmount || 0), 0) || 0}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search purchases..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={filterPaymentMethod} onValueChange={setFilterPaymentMethod}>
                  <SelectTrigger className="w-[140px]" data-testid="select-payment">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Payments</SelectItem>
                    <SelectItem value="stripe">Card Payments</SelectItem>
                    <SelectItem value="credits">Credit Payments</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[140px]" data-testid="select-sort">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="priceHigh">Price: High to Low</SelectItem>
                    <SelectItem value="priceLow">Price: Low to High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Purchases List */}
        {filteredPurchases && filteredPurchases.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPurchases.map((purchase: any) => (
              <Card key={purchase.id} className="overflow-hidden" data-testid={`card-purchase-${purchase.id}`}>
                {/* Listing Image or Placeholder */}
                <div className="h-48 bg-gradient-to-br from-primary/10 to-primary/5 relative">
                  {purchase.listing?.prompt?.imageUrl ? (
                    <img 
                      src={purchase.listing.prompt.imageUrl}
                      alt={purchase.listing.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Package className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  <Badge className="absolute top-2 right-2" variant={purchase.status === "completed" ? "default" : "secondary"}>
                    {purchase.status}
                  </Badge>
                </div>
                
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg line-clamp-1">
                    {purchase.listing?.title || "Untitled Listing"}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {purchase.listing?.description || "No description available"}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  {/* Order Details */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Order #</span>
                      <span className="font-mono">{purchase.orderNumber}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Price</span>
                      <span className="font-semibold flex items-center gap-1">
                        {getPaymentIcon(purchase.paymentMethod)}
                        {formatPrice(purchase)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Purchased</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(purchase.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  
                  {/* Seller Info */}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={purchase.listing?.seller?.avatarUrl} />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {purchase.listing?.seller?.username || "Unknown Seller"}
                      </p>
                      <p className="text-xs text-muted-foreground">Seller</p>
                    </div>
                  </div>
                  
                  {/* License Key */}
                  {purchase.license && (
                    <div className="space-y-2 pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Key className="h-3 w-3" />
                          License Key
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyLicenseKey(purchase.license.licenseKey, purchase.id)}
                          data-testid={`button-copy-license-${purchase.id}`}
                        >
                          {copiedLicenseId === purchase.id ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      <Input
                        readOnly
                        value={purchase.license.licenseKey}
                        className="font-mono text-xs"
                        data-testid={`input-license-${purchase.id}`}
                      />
                    </div>
                  )}
                </CardContent>
                
                <CardFooter className="flex-col gap-2">
                  {/* Dispute Status/Button */}
                  <DisputeButton
                    order={purchase}
                    onOpenDispute={() => {
                      setSelectedDisputeOrder(purchase);
                      setShowDisputeModal(true);
                    }}
                    onViewDispute={(disputeId) => setViewDisputeId(disputeId)}
                  />
                  
                  {/* Review Status */}
                  {(() => {
                    const hasReviewed = userReviews?.some((review: any) => review.orderId === purchase.id);
                    return (
                      <div className="w-full">
                        {hasReviewed ? (
                          <Badge variant="secondary" className="w-full justify-center py-1">
                            <Star className="h-3 w-3 mr-1 fill-current" />
                            Reviewed
                          </Badge>
                        ) : purchase.status === "completed" && !purchase.disputeId ? (
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="w-full"
                            onClick={() => {
                              setSelectedPurchase(purchase);
                              setShowReviewForm(true);
                            }}
                            data-testid={`button-leave-review-${purchase.id}`}
                          >
                            <PenLine className="h-4 w-4 mr-2" />
                            Leave Review
                          </Button>
                        ) : null}
                      </div>
                    );
                  })()}
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2 w-full">
                    <Link href={`/prompts/${purchase.listing?.promptId}`} className="flex-1">
                      <Button variant="outline" className="w-full" size="sm" data-testid={`button-view-prompt-${purchase.id}`}>
                        <FileText className="h-4 w-4 mr-2" />
                        View Prompt
                      </Button>
                    </Link>
                    <Link href={`/marketplace/listing/${purchase.listingId}`}>
                      <Button variant="ghost" size="sm" data-testid={`button-view-listing-${purchase.id}`}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12">
            <div className="text-center space-y-4">
              <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">No purchases found</h3>
                <p className="text-muted-foreground mt-2">
                  {searchTerm || filterPaymentMethod !== "all" 
                    ? "Try adjusting your filters"
                    : "Start shopping in the marketplace to see your purchases here"}
                </p>
              </div>
              {!searchTerm && filterPaymentMethod === "all" && (
                <Link href="/marketplace">
                  <Button className="mt-4">
                    Browse Marketplace
                  </Button>
                </Link>
              )}
            </div>
          </Card>
        )}
          </TabsContent>
          
          {/* Disputes Tab */}
          <TabsContent value="disputes">
            {user && <DisputesList userId={user.id} />}
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Review Form Modal */}
      {selectedPurchase && (
        <ReviewForm
          orderId={selectedPurchase.id}
          listingId={selectedPurchase.listingId}
          listingTitle={selectedPurchase.listing?.title || "Untitled Listing"}
          open={showReviewForm}
          onOpenChange={setShowReviewForm}
          onSuccess={() => {
            setShowReviewForm(false);
            setSelectedPurchase(null);
          }}
        />
      )}
      
      {/* Dispute Modal */}
      {selectedDisputeOrder && (
        <DisputeModal
          isOpen={showDisputeModal}
          onClose={() => {
            setShowDisputeModal(false);
            setSelectedDisputeOrder(null);
          }}
          order={{
            ...selectedDisputeOrder,
            listingTitle: selectedDisputeOrder.listing?.title
          }}
          onSuccess={() => {
            setActiveTab("disputes");
          }}
        />
      )}
      
      {/* Dispute Chat Dialog */}
      {viewDisputeId && (
        <Dialog 
          open={!!viewDisputeId} 
          onOpenChange={(open) => !open && setViewDisputeId(null)}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Dispute Details</DialogTitle>
            </DialogHeader>
            <DisputeChat
              disputeId={viewDisputeId}
              currentUserId={user?.id || ""}
              onClose={() => setViewDisputeId(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}