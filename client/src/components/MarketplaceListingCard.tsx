import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ListingPreviewModal } from "@/components/ListingPreviewModal";
import { Eye, DollarSign, Coins, Star, TrendingUp, User, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface MarketplaceListingCardProps {
  listing: {
    id: string;
    title: string;
    description?: string;
    priceCents?: number;
    creditPrice?: number;
    acceptsMoney: boolean;
    acceptsCredits: boolean;
    previewPercentage: number;
    tags?: string[];
    category?: string;
    salesCount: number;
    averageRating?: string;
    promptPreview?: string;
    prompt: {
      id: string;
      name: string;
      description?: string;
      imageUrl?: string;
      tags?: string[];
    };
    seller: {
      id: string;
      username?: string;
      firstName?: string;
      lastName?: string;
      profileImageUrl?: string;
    };
  };
}

export function MarketplaceListingCard({ listing }: MarketplaceListingCardProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const { user } = useAuth();
  
  // Check if user has already purchased this listing
  const { data: purchases } = useQuery<any>({
    queryKey: ["/api/marketplace/purchases"],
    enabled: !!user,
  });
  
  const hasPurchased = purchases?.some((purchase: any) => purchase.listingId === listing.id);
  const isOwnListing = listing.seller.id === user?.id;

  // Format price display
  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatCredits = (credits: number) => {
    return credits.toLocaleString();
  };

  // Get seller display name
  const sellerName = listing.seller.username || 
    (listing.seller.firstName && listing.seller.lastName 
      ? `${listing.seller.firstName} ${listing.seller.lastName}` 
      : 'Anonymous Seller');

  return (
    <>
      <Card className="group hover:shadow-lg transition-all duration-300 overflow-hidden h-full flex flex-col">
        {/* Image Section - Optimized for mobile */}
        {listing.prompt.imageUrl && (
          <div className="aspect-video relative overflow-hidden bg-muted">
            <img 
              src={listing.prompt.imageUrl} 
              alt={listing.title}
              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
            />
            {/* Badges - Stack on mobile */}
            <div className="absolute top-2 right-2 flex flex-col gap-1 sm:gap-2">
              {hasPurchased && (
                <Badge 
                  variant="default" 
                  className="bg-green-600 text-white text-[10px] sm:text-xs"
                >
                  <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                  Purchased
                </Badge>
              )}
              {isOwnListing && (
                <Badge 
                  variant="default" 
                  className="bg-blue-600 text-white text-[10px] sm:text-xs"
                >
                  Your Listing
                </Badge>
              )}
              {listing.salesCount > 0 && !hasPurchased && !isOwnListing && (
                <Badge 
                  variant="secondary" 
                  className="bg-background/80 backdrop-blur-sm text-[10px] sm:text-xs"
                >
                  <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                  {listing.salesCount} sold
                </Badge>
              )}
            </div>
          </div>
        )}

        <CardContent className="flex-1 p-3 sm:p-4">
          {/* Title and Category - Responsive text sizes */}
          <div className="mb-2 sm:mb-3">
            <h3 className="font-semibold text-base sm:text-lg line-clamp-2 mb-1">
              {listing.title}
            </h3>
            {listing.category && (
              <Badge variant="outline" className="text-[10px] sm:text-xs">
                {listing.category}
              </Badge>
            )}
          </div>

          {/* Description - Responsive */}
          {listing.description && (
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-2 sm:mb-3">
              {listing.description}
            </p>
          )}

          {/* Seller Info - Mobile optimized */}
          <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
            <Avatar className="h-5 w-5 sm:h-6 sm:w-6">
              <AvatarImage src={listing.seller.profileImageUrl} />
              <AvatarFallback>
                <User className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              </AvatarFallback>
            </Avatar>
            <Link href={`/user/${listing.seller.username || listing.seller.id}`}>
              <span className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors truncate max-w-[150px] sm:max-w-none">
                {sellerName}
              </span>
            </Link>
          </div>

          {/* Price Section - Stack on mobile */}
          <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
            {listing.acceptsMoney && listing.priceCents && (
              <div className="flex items-center gap-1 sm:gap-2">
                <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600" />
                <span className="font-bold text-base sm:text-lg">{formatPrice(listing.priceCents)}</span>
              </div>
            )}
            {listing.acceptsCredits && listing.creditPrice && (
              <div className="flex items-center gap-1 sm:gap-2">
                <Coins className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-600" />
                <span className="font-bold text-base sm:text-lg">{formatCredits(listing.creditPrice)} credits</span>
              </div>
            )}
          </div>

          {/* Rating - Mobile responsive */}
          {listing.averageRating && parseFloat(listing.averageRating) > 0 && (
            <div className="flex items-center gap-1 mt-2 sm:mt-3">
              <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-yellow-500 text-yellow-500" />
              <span className="text-xs sm:text-sm font-medium">{parseFloat(listing.averageRating).toFixed(1)}</span>
              <span className="text-xs sm:text-sm text-muted-foreground">
                ({listing.salesCount} reviews)
              </span>
            </div>
          )}

          {/* Tags - Mobile responsive */}
          {listing.tags && listing.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2 sm:mt-3">
              {listing.tags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0 sm:py-0.5">
                  {tag}
                </Badge>
              ))}
              {listing.tags.length > 3 && (
                <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0 sm:py-0.5">
                  +{listing.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="p-3 sm:p-4 pt-0 gap-2 flex-col sm:flex-row">
          <Button 
            variant="outline" 
            size="sm"
            className="w-full sm:flex-1 text-xs sm:text-sm"
            onClick={() => setPreviewOpen(true)}
            data-testid={`button-preview-${listing.id}`}
          >
            <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
            Preview
          </Button>
          <Link href={`/marketplace/listing/${listing.id}`} className="w-full sm:flex-1">
            <Button 
              size="sm"
              className="w-full text-xs sm:text-sm"
              data-testid={`button-view-details-${listing.id}`}
            >
              View Details
            </Button>
          </Link>
        </CardFooter>
      </Card>

      {/* Preview Modal */}
      <ListingPreviewModal 
        listingId={listing.id}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </>
  );
}