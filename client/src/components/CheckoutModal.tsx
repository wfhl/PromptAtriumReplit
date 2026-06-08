import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Coins, Check, Lock, ShoppingCart, Package, AlertCircle } from "lucide-react";
import { type MarketplaceListing } from "@shared/schema";

// Initialize Stripe
let stripePromise: Promise<Stripe | null> | null = null;
if (import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);
} else {
  console.warn("VITE_STRIPE_PUBLIC_KEY not set - Stripe payments will be disabled");
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: MarketplaceListing & {
    seller?: {
      id: string;
      username: string;
      avatarUrl?: string;
    };
    prompt?: {
      title: string;
      description: string;
      categoryId: string;
    };
  };
}

// Stripe payment form component
function StripePaymentForm({ 
  listing, 
  onSuccess, 
  onCancel 
}: { 
  listing: MarketplaceListing; 
  onSuccess: (order: any) => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }
    
    setProcessing(true);
    setError(null);
    
    try {
      // Submit the payment
      const { error: submitError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/purchase-success`,
        },
        redirect: "if_required",
      });
      
      if (submitError) {
        setError(submitError.message || "Payment failed");
        setProcessing(false);
        return;
      }
      
      if (paymentIntent?.status === "succeeded") {
        // Complete the order on the backend
        const response = await apiRequest(
          `/api/marketplace/orders/${(paymentIntent as any).metadata?.orderId}/complete`,
          "POST",
          { paymentIntentId: paymentIntent.id }
        );
        
        onSuccess(response);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setProcessing(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={processing}>
          Cancel
        </Button>
        <Button type="submit" disabled={!stripe || processing}>
          {processing ? "Processing..." : `Pay $${(listing.priceCents! / 100).toFixed(2)}`}
        </Button>
      </div>
    </form>
  );
}

export function CheckoutModal({ isOpen, onClose, listing }: CheckoutModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "credits">("stripe");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // Get user's credit balance
  const { data: userCredits } = useQuery<any>({
    queryKey: ["/api/credits/balance"],
    enabled: isOpen && listing.acceptsCredits
  });
  
  // Create Stripe payment intent
  const stripeCheckout = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/marketplace/checkout/stripe", "POST", {
        listingId: listing.id
      });
      return response as any;
    },
    onSuccess: (data: any) => {
      setClientSecret(data.clientSecret);
      setOrderId(data.orderId);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to initialize payment",
        variant: "destructive"
      });
    }
  });
  
  // Process credit payment
  const creditCheckout = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/marketplace/checkout/credits", "POST", {
        listingId: listing.id
      });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Purchase Successful!",
        description: `You've successfully purchased "${listing.title}" for ${listing.creditPrice} credits`,
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/credits/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/prompts"] });
      
      onClose();
      
      // Navigate to purchases page
      navigate("/purchases");
    },
    onError: (error: any) => {
      toast({
        title: "Purchase Failed",
        description: error.message || "Failed to complete purchase",
        variant: "destructive"
      });
    }
  });
  
  const handlePaymentSuccess = (order: any) => {
    toast({
      title: "Purchase Successful!",
      description: `You've successfully purchased "${listing.title}"`,
    });
    
    // Invalidate relevant queries
    queryClient.invalidateQueries({ queryKey: ["/api/marketplace/purchases"] });
    queryClient.invalidateQueries({ queryKey: ["/api/prompts"] });
    
    onClose();
    
    // Navigate to purchases page
    navigate("/purchases");
  };
  
  const handlePurchase = () => {
    if (paymentMethod === "stripe") {
      stripeCheckout.mutate();
    } else {
      creditCheckout.mutate();
    }
  };
  
  // Calculate fees
  const platformFee = paymentMethod === "stripe" 
    ? Math.floor((listing.priceCents || 0) * 0.15)
    : Math.floor((listing.creditPrice || 0) * 0.15);
    
  const sellerPayout = paymentMethod === "stripe"
    ? (listing.priceCents || 0) - platformFee
    : (listing.creditPrice || 0) - platformFee;
  
  const insufficientCredits = paymentMethod === "credits" && 
    userCredits && listing.creditPrice && 
    userCredits.balance < listing.creditPrice;
  
  const stripeOptions = clientSecret ? {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
    },
  } : null;
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl" data-testid="dialog-checkout">
        <DialogHeader className="p-0">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
            Complete Your Purchase
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Choose your payment method to purchase this prompt
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Listing Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-4 w-4" />
                {listing.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{listing.description}</p>
              
              <Separator />
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Seller</span>
                <span className="font-medium">{listing.seller?.username || 'Unknown'}</span>
              </div>
              
              {listing.salesCount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Sales</span>
                  <Badge variant="secondary">{listing.salesCount} sold</Badge>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Payment Method Selection */}
          {!clientSecret && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Method</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <RadioGroup 
                  value={paymentMethod} 
                  onValueChange={(value) => setPaymentMethod(value as "stripe" | "credits")}
                >
                  {listing.acceptsMoney && listing.priceCents && (
                    <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent transition-colors">
                      <RadioGroupItem value="stripe" id="stripe" data-testid="radio-stripe" />
                      <Label htmlFor="stripe" className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            <span>Credit/Debit Card</span>
                          </div>
                          <span className="font-bold">
                            ${(listing.priceCents / 100).toFixed(2)} USD
                          </span>
                        </div>
                      </Label>
                    </div>
                  )}
                  
                  {listing.acceptsCredits && listing.creditPrice && (
                    <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent transition-colors">
                      <RadioGroupItem value="credits" id="credits" data-testid="radio-credits" />
                      <Label htmlFor="credits" className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Coins className="h-4 w-4" />
                            <span>Platform Credits</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">
                              {listing.creditPrice} credits
                            </span>
                            {userCredits && (
                              <Badge variant={insufficientCredits ? "destructive" : "secondary"}>
                                Balance: {userCredits.balance}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </Label>
                    </div>
                  )}
                </RadioGroup>
                
                {insufficientCredits && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      You need {listing.creditPrice! - userCredits!.balance} more credits to complete this purchase.
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* Fee Information */}
                <div className="space-y-2 p-3 bg-muted rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span>Platform Fee (15%)</span>
                    <span>
                      {paymentMethod === "stripe" 
                        ? `$${(platformFee / 100).toFixed(2)}`
                        : `${platformFee} credits`}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-medium">
                    <span>Seller Receives</span>
                    <span>
                      {paymentMethod === "stripe"
                        ? `$${(sellerPayout / 100).toFixed(2)}`
                        : `${sellerPayout} credits`}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Stripe Payment Form */}
          {clientSecret && stripeOptions && stripePromise && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Secure Payment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Elements stripe={stripePromise} options={stripeOptions}>
                  <StripePaymentForm 
                    listing={listing} 
                    onSuccess={handlePaymentSuccess}
                    onCancel={() => {
                      setClientSecret(null);
                      setOrderId(null);
                    }}
                  />
                </Elements>
              </CardContent>
            </Card>
          )}
          
          {/* Action Buttons */}
          {!clientSecret && (
            <div className="flex gap-2 justify-end">
              <Button 
                variant="outline" 
                onClick={onClose}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePurchase}
                disabled={
                  (paymentMethod === "credits" && insufficientCredits) ||
                  stripeCheckout.isPending ||
                  creditCheckout.isPending
                }
                data-testid="button-purchase"
              >
                {stripeCheckout.isPending || creditCheckout.isPending ? (
                  "Processing..."
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    {paymentMethod === "stripe" 
                      ? `Pay $${(listing.priceCents! / 100).toFixed(2)}`
                      : `Pay ${listing.creditPrice} Credits`}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
        
        {/* Security Badge */}
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" />
          <span>Secure checkout powered by Stripe</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}