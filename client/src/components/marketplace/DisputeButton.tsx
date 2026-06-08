import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import type { MarketplaceOrder } from "@shared/schema";

interface DisputeButtonProps {
  order: MarketplaceOrder & {
    disputeStatus?: string;
    disputeId?: string;
  };
  onOpenDispute: () => void;
  onViewDispute?: (disputeId: string) => void;
}

export function DisputeButton({ order, onOpenDispute, onViewDispute }: DisputeButtonProps) {
  const [checking, setChecking] = useState(false);
  const [canDispute, setCanDispute] = useState(true);
  const [disputeReason, setDisputeReason] = useState("");
  
  // Check if order is within 30 days
  const orderDate = new Date(order.createdAt as any);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const isWithinDisputeWindow = orderDate >= thirtyDaysAgo;
  
  // If dispute already exists, show view dispute button
  if (order.disputeId && order.disputeStatus) {
    return (
      <div className="flex items-center gap-2">
        <span className={`text-sm px-2 py-1 rounded-md ${
          order.disputeStatus === 'open' ? 'bg-yellow-100 text-yellow-800' :
          order.disputeStatus === 'in_progress' ? 'bg-blue-100 text-blue-800' :
          order.disputeStatus === 'resolved' ? 'bg-green-100 text-green-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          Dispute: {order.disputeStatus}
        </span>
        {onViewDispute && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDispute(order.disputeId!)}
            data-testid={`button-view-dispute-${order.id}`}
          >
            View Dispute
          </Button>
        )}
      </div>
    );
  }
  
  // Only show dispute button for completed orders within 30 days
  if (order.status !== 'completed' || !isWithinDisputeWindow) {
    return null;
  }
  
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onOpenDispute}
      className="text-orange-600 hover:text-orange-700 border-orange-200 hover:border-orange-300"
      data-testid={`button-open-dispute-${order.id}`}
    >
      <AlertTriangle className="h-4 w-4 mr-2" />
      Open Dispute
    </Button>
  );
}