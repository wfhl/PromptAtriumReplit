import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "wouter";
import {
  ShoppingCart,
  DollarSign,
  Coins,
  Star,
  Eye,
  Calendar,
  Package,
  TrendingUp,
  User,
  ExternalLink,
  Info,
  Lock,
  Check,
  MessageSquare,
  PenLine,
} from "lucide-react";
import { CheckoutModal } from "./CheckoutModal";
import { ReviewForm } from "./ReviewForm";
import { ReviewsList } from "./ReviewsList";
import { useAuth } from "@/hooks/useAuth";

interface ListingPreviewModalProps {
  listingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ListingPreviewModal({ listingId, open, onOpenChange }: ListingPreviewModalProps) {
  const [selectedTab, setSelectedTab] = useState("preview");
  const [showCheckout, setShowCheckout] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const { user } = useAuth();
  
  // Fetch listing details with preview
  const { data: listing, isLoading, error } = useQuery<any>({
    queryKey: [`/api/marketplace/listings/${listingId}`],
    enabled: open && !!listingId,
  });
  
  // Check if user has already purchased this listing
  const { data: purchases } = useQuery<any>({
    queryKey: ["/api/marketplace/purchases"],
    enabled: !!user && open,
  });
  
  // Check if user can review this listing
  const { data: reviewStatus } = useQuery<any>({
    queryKey: [`/api/marketplace/reviews/can-review/${listingId}`],
    enabled: !!user && !!listingId && open,
  });
  
  const hasPurchased = purchases?.some((purchase: any) => purchase.listingId === listingId);
  const isOwnListing = listing?.sellerId === user?.id;
  const userPurchase = purchases?.find((purchase: any) => purchase.listingId === listingId);
  
  // Format price display
  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };
  
  const formatCredits = (credits: number) => {
    return credits.toLocaleString();
  };
  
  // Get seller display name
  const sellerName = listing?.seller?.username || 
    (listing?.seller?.firstName && listing?.seller?.lastName 
      ? `${listing.seller.firstName} ${listing.seller.lastName}` 
      : 'Anonymous Seller');
  
  // Format date
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
            <Skeleton className="h-6 sm:h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex gap-3 sm:gap-4">
              <Skeleton className="h-16 sm:h-20 w-full" />
              <Skeleton className="h-16 sm:h-20 w-full" />
            </div>
            <Skeleton className="h-32 sm:h-40 w-full" />
          </div>
        ) : error ? (
          <div className="p-4 sm:p-6 text-center">
            <p className="text-red-500 text-sm sm:text-base">Failed to load listing details</p>
          </div>
        ) : listing ? (
          <>
            <DialogHeader className="p-4 sm:p-6 pb-0">
              <DialogTitle className="text-lg sm:text-2xl flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <span className="flex-1 pr-2 sm:pr-4">{listing.title}</span>
                {listing.category && (
                  <Badge variant="outline" className="w-fit text-xs sm:text-sm">
                    {listing.category}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="text-base mt-2">
                {listing.description}
              </DialogDescription>
            </DialogHeader>
            
            <div className="p-6 pt-4">
              {/* Seller and Stats Row */}
              <div className="flex flex-wrap gap-4 items-center mb-6">
                <Link href={`/user/${listing.seller?.username || listing.seller?.id}`}>
                  <div className="flex items-center gap-3 hover:bg-muted rounded-lg px-3 py-2 transition-colors">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={listing.seller?.profileImageUrl} />
                      <AvatarFallback>
                        <User className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{sellerName}</p>
                      <p className="text-xs text-muted-foreground">Seller</p>
                    </div>
                  </div>
                </Link>
                
                <Separator orientation="vertical" className="h-10" />
                
                <div className="flex gap-4 text-sm">
                  {listing.salesCount > 0 && (
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span>{listing.salesCount} sold</span>
                    </div>
                  )}
                  {listing.averageRating && parseFloat(listing.averageRating) > 0 && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                      <span>{parseFloat(listing.averageRating).toFixed(1)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(listing.createdAt)}</span>
                  </div>
                </div>
              </div>
              
              {/* Pricing Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {listing.acceptsMoney && listing.priceCents && (
                  <Card className="p-4 border-2 hover:border-primary transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">USD Price</p>
                        <p className="text-2xl font-bold flex items-center">
                          <DollarSign className="h-5 w-5" />
                          {formatPrice(listing.priceCents).replace('$', '')}
                        </p>
                      </div>
                      {hasPurchased ? (
                        <Button 
                          variant="secondary" 
                          disabled
                          data-testid="button-purchased"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Purchased
                        </Button>
                      ) : isOwnListing ? (
                        <Button 
                          variant="outline" 
                          disabled
                          data-testid="button-own-listing"
                        >
                          Your Listing
                        </Button>
                      ) : (
                        <Button 
                          variant="outline"
                          onClick={() => setShowCheckout(true)}
                          disabled={!user}
                          data-testid="button-buy-usd"
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Buy with USD
                        </Button>
                      )}
                    </div>
                  </Card>
                )}
                {listing.acceptsCredits && listing.creditPrice && (
                  <Card className="p-4 border-2 hover:border-primary transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Credit Price</p>
                        <p className="text-2xl font-bold flex items-center">
                          <Coins className="h-5 w-5 text-yellow-600 mr-1" />
                          {formatCredits(listing.creditPrice)}
                        </p>
                      </div>
                      {hasPurchased ? (
                        <Button 
                          variant="secondary" 
                          disabled
                          data-testid="button-purchased"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Purchased
                        </Button>
                      ) : isOwnListing ? (
                        <Button 
                          variant="outline" 
                          disabled
                          data-testid="button-own-listing"
                        >
                          Your Listing
                        </Button>
                      ) : (
                        <Button 
                          variant="outline"
                          onClick={() => setShowCheckout(true)}
                          disabled={!user}
                          data-testid="button-buy-credits"
                        >
                          <Coins className="h-4 w-4 mr-2" />
                          Buy with Credits
                        </Button>
                      )}
                    </div>
                  </Card>
                )}
              </div>
              
              {/* Show login prompt if user is not authenticated */}
              {!user && (
                <div className="bg-muted p-4 rounded-lg text-center mb-6">
                  <p className="text-sm text-muted-foreground mb-2">
                    Please log in to purchase this prompt
                  </p>
                  <Link href="/login">
                    <Button size="sm">
                      Sign In to Purchase
                    </Button>
                  </Link>
                </div>
              )}
              
              {/* Content Tabs */}
              <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="preview">
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </TabsTrigger>
                  <TabsTrigger value="details">
                    <Info className="h-4 w-4 mr-2" />
                    Details
                  </TabsTrigger>
                  <TabsTrigger value="images">
                    <Package className="h-4 w-4 mr-2" />
                    Examples
                  </TabsTrigger>
                  <TabsTrigger value="reviews">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Reviews
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="preview" className="mt-4">
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">Prompt Preview</h3>
                      <Badge variant="secondary">
                        {listing.previewPercentage}% preview
                      </Badge>
                    </div>
                    <ScrollArea className="h-[200px] w-full rounded border bg-muted/30 p-4">
                      <pre className="whitespace-pre-wrap text-sm font-mono">
                        {listing.promptPreview || "Preview not available"}
                      </pre>
                      {listing.promptPreview && listing.promptPreview.length > 50 && (
                        <div className="mt-2 text-center">
                          <span className="text-muted-foreground">...</span>
                        </div>
                      )}
                    </ScrollArea>
                    <div className="mt-3 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                      <Lock className="h-4 w-4" />
                      <span>Purchase to unlock the full prompt content</span>
                    </div>
                  </Card>
                </TabsContent>
                
                <TabsContent value="details" className="mt-4">
                  <Card className="p-4 space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Prompt Information</h4>
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Prompt Name:</dt>
                          <dd className="font-medium">{listing.prompt?.name || "Untitled"}</dd>
                        </div>
                        {listing.prompt?.type && (
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Type:</dt>
                            <dd className="font-medium">{listing.prompt.type}</dd>
                          </div>
                        )}
                        {listing.prompt?.category && (
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Category:</dt>
                            <dd className="font-medium">{listing.prompt.category}</dd>
                          </div>
                        )}
                      </dl>
                    </div>
                    
                    {listing.tags && listing.tags.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Tags</h4>
                        <div className="flex flex-wrap gap-2">
                          {listing.tags.map((tag: string, index: number) => (
                            <Badge key={index} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {listing.sellerProfile && (
                      <div>
                        <h4 className="font-semibold mb-2">About the Seller</h4>
                        <p className="text-sm text-muted-foreground">
                          {listing.sellerProfile.bio || "No bio available"}
                        </p>
                        <div className="mt-2 text-sm">
                          <span className="text-muted-foreground">Total Sales: </span>
                          <span className="font-medium">{listing.sellerProfile.totalSales || 0}</span>
                        </div>
                      </div>
                    )}
                  </Card>
                </TabsContent>
                
                <TabsContent value="images" className="mt-4">
                  <Card className="p-4">
                    {listing.prompt?.imageUrl ? (
                      <div className="space-y-4">
                        <h4 className="font-semibold">Example Output</h4>
                        <div className="rounded-lg overflow-hidden bg-muted">
                          <img 
                            src={listing.prompt.imageUrl} 
                            alt="Example output"
                            className="w-full h-auto"
                          />
                        </div>
                        <p className="text-sm text-muted-foreground text-center">
                          This is an example of what you can create with this prompt
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No example images available</p>
                      </div>
                    )}
                  </Card>
                </TabsContent>
                
                <TabsContent value="reviews" className="mt-4">
                  <div className="space-y-4">
                    {/* Write Review Button */}
                    {reviewStatus?.canReview && userPurchase && (
                      <Card className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold mb-1">Share Your Experience</h4>
                            <p className="text-sm text-muted-foreground">
                              Help others by reviewing this prompt
                            </p>
                          </div>
                          <Button
                            onClick={() => {
                              setSelectedOrderId(userPurchase.id);
                              setShowReviewForm(true);
                            }}
                            data-testid="button-write-review"
                          >
                            <PenLine className="h-4 w-4 mr-2" />
                            Write Review
                          </Button>
                        </div>
                      </Card>
                    )}
                    
                    {/* Already Reviewed Message */}
                    {reviewStatus?.hasReviewed && (
                      <Card className="p-4 bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          <p className="text-sm">You've already reviewed this listing</p>
                        </div>
                      </Card>
                    )}
                    
                    {/* Reviews List */}
                    <ReviewsList listingId={listingId} limit={10} />
                  </div>
                </TabsContent>
              </Tabs>
              
              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <Link href={`/marketplace/listing/${listingId}`} className="flex-1">
                  <Button className="w-full" size="lg" data-testid="button-view-full">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Full Listing
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
      
      {/* Checkout Modal */}
      {listing && (
        <CheckoutModal 
          isOpen={showCheckout}
          onClose={() => setShowCheckout(false)}
          listing={listing}
        />
      )}
      
      {/* Review Form Modal */}
      {listing && selectedOrderId && (
        <ReviewForm
          orderId={selectedOrderId}
          listingId={listingId}
          listingTitle={listing.title}
          open={showReviewForm}
          onOpenChange={setShowReviewForm}
          onSuccess={() => {
            setShowReviewForm(false);
            setSelectedOrderId(null);
          }}
        />
      )}
    </Dialog>
  );
}