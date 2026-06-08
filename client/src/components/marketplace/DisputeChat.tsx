import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import {
  AlertTriangle,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  Shield,
  DollarSign,
  CreditCard,
} from "lucide-react";
import type { MarketplaceDispute, DisputeMessage } from "@shared/schema";

interface DisputeChatProps {
  disputeId: string;
  currentUserId: string;
  isAdmin?: boolean;
  onClose?: () => void;
  onResolve?: () => void;
}

export function DisputeChat({ disputeId, currentUserId, isAdmin, onClose, onResolve }: DisputeChatProps) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [resolutionMode, setResolutionMode] = useState(false);
  const [resolution, setResolution] = useState("");
  const [refundAmountCents, setRefundAmountCents] = useState(0);
  const [creditRefundAmount, setCreditRefundAmount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Fetch dispute details
  const { data: dispute, isLoading } = useQuery<MarketplaceDispute & {
    messages: (DisputeMessage & {
      sender: { id: string; username: string; profileImageUrl?: string; role?: string };
    })[];
    order: any;
    listing: any;
    initiator: any;
    respondent: any;
  }>({
    queryKey: [`/api/marketplace/disputes/${disputeId}`],
    refetchInterval: 10000, // Refetch every 10 seconds for new messages
  });
  
  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (messageText: string) =>
      apiRequest(`/api/marketplace/disputes/${disputeId}/messages`, "POST", {
        message: messageText,
      }),
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: [`/api/marketplace/disputes/${disputeId}`] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send message",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });
  
  // Close dispute mutation
  const closeDisputeMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/api/marketplace/disputes/${disputeId}/close`, "PUT", {}),
    onSuccess: () => {
      toast({ title: "Dispute closed successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/disputes"] });
      queryClient.invalidateQueries({ queryKey: [`/api/marketplace/disputes/${disputeId}`] });
      onClose?.();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to close dispute",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });
  
  // Resolve dispute mutation (admin only)
  const resolveDisputeMutation = useMutation({
    mutationFn: (data: { resolution: string; refundAmountCents?: number; creditRefundAmount?: number }) =>
      apiRequest(`/api/marketplace/disputes/${disputeId}/resolve`, "PUT", data),
    onSuccess: () => {
      toast({ title: "Dispute resolved successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/disputes"] });
      queryClient.invalidateQueries({ queryKey: [`/api/marketplace/disputes/${disputeId}`] });
      setResolutionMode(false);
      onResolve?.();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to resolve dispute",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [dispute?.messages]);
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading dispute...</p>
        </CardContent>
      </Card>
    );
  }
  
  if (!dispute) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Dispute not found</p>
        </CardContent>
      </Card>
    );
  }
  
  const isParticipant = currentUserId === dispute.initiatorId || currentUserId === dispute.respondentId;
  const isInitiator = currentUserId === dispute.initiatorId;
  const canSendMessage = (isParticipant || isAdmin) && dispute.status !== 'closed' && dispute.status !== 'resolved';
  const canClose = (isInitiator || isAdmin) && dispute.status === 'open';
  const canResolve = isAdmin && dispute.status !== 'resolved' && dispute.status !== 'closed';
  
  const statusColors = {
    open: "bg-yellow-100 text-yellow-800",
    in_progress: "bg-blue-100 text-blue-800",
    resolved: "bg-green-100 text-green-800",
    closed: "bg-gray-100 text-gray-800",
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Dispute #{dispute.id.slice(0, 8)}</CardTitle>
            <CardDescription>
              Order #{dispute.order?.orderNumber} - {dispute.listing?.title}
            </CardDescription>
          </div>
          <Badge className={statusColors[dispute.status]}>
            {dispute.status.replace(/_/g, ' ').toUpperCase()}
          </Badge>
        </div>
        
        {/* Dispute Info */}
        <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
          <div>
            <span className="text-muted-foreground">Initiated by:</span>
            <p className="font-medium">{dispute.initiator?.username} ({dispute.initiatedBy})</p>
          </div>
          <div>
            <span className="text-muted-foreground">Respondent:</span>
            <p className="font-medium">{dispute.respondent?.username}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Reason:</span>
            <p className="font-medium">{dispute.reason?.replace(/_/g, ' ')}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Created:</span>
            <p className="font-medium">{format(new Date(dispute.createdAt as any), 'MMM d, yyyy')}</p>
          </div>
        </div>
        
        {dispute.escalatedAt && (
          <Alert className="mt-4 border-orange-200 bg-orange-50">
            <Shield className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-sm">
              This dispute has been escalated for admin review
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>
      
      <Separator />
      
      <CardContent className="p-0">
        {/* Messages */}
        <ScrollArea ref={scrollRef} className="h-96 p-4">
          <div className="space-y-4">
            {/* Initial description */}
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm font-medium text-gray-700">Initial Dispute Description:</p>
              <p className="text-sm mt-1">{dispute.description}</p>
            </div>
            
            {/* Messages */}
            {dispute.messages?.map((msg) => {
              const isCurrentUser = msg.senderId === currentUserId;
              const isAdminMsg = msg.isAdminMessage;
              
              return (
                <div
                  key={msg.id}
                  className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-2 max-w-[70%] ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={msg.sender.profileImageUrl} />
                      <AvatarFallback>
                        {msg.sender.username?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className={`rounded-lg p-3 ${
                        isAdminMsg ? 'bg-purple-100 border border-purple-200' :
                        isCurrentUser ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                        <p className="text-sm font-medium">
                          {msg.sender.username}
                          {isAdminMsg && (
                            <Badge className="ml-2 text-xs" variant="secondary">Admin</Badge>
                          )}
                        </p>
                        <p className="text-sm mt-1">{msg.message}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(msg.createdAt as any), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Resolution info if resolved */}
            {dispute.status === 'resolved' && dispute.resolution && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <p className="font-medium text-green-800">Dispute Resolved</p>
                </div>
                <p className="text-sm text-green-700">{dispute.resolution}</p>
                {(dispute.refundAmountCents || dispute.creditRefundAmount) && (
                  <div className="mt-2 space-y-1">
                    {dispute.refundAmountCents! > 0 && (
                      <p className="text-sm text-green-700">
                        <DollarSign className="h-3 w-3 inline mr-1" />
                        Refunded: ${(dispute.refundAmountCents! / 100).toFixed(2)}
                      </p>
                    )}
                    {dispute.creditRefundAmount! > 0 && (
                      <p className="text-sm text-green-700">
                        <CreditCard className="h-3 w-3 inline mr-1" />
                        Credits Refunded: {dispute.creditRefundAmount}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
        
        <Separator />
        
        {/* Action area */}
        {canSendMessage && !resolutionMode && (
          <div className="p-4 space-y-3">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="resize-none"
              rows={3}
              data-testid="textarea-dispute-message"
            />
            <div className="flex justify-between">
              <div className="flex gap-2">
                {canClose && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => closeDisputeMutation.mutate()}
                    disabled={closeDisputeMutation.isPending}
                    data-testid="button-close-dispute"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Close Dispute
                  </Button>
                )}
                {canResolve && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setResolutionMode(true)}
                    className="text-green-600 border-green-200 hover:bg-green-50"
                    data-testid="button-resolve-dispute"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Resolve Dispute
                  </Button>
                )}
              </div>
              <Button
                onClick={() => sendMessageMutation.mutate(message)}
                disabled={!message.trim() || sendMessageMutation.isPending}
                data-testid="button-send-message"
              >
                <Send className="h-4 w-4 mr-2" />
                {sendMessageMutation.isPending ? "Sending..." : "Send"}
              </Button>
            </div>
          </div>
        )}
        
        {/* Resolution form (admin only) */}
        {resolutionMode && isAdmin && (
          <div className="p-4 space-y-3">
            <p className="text-sm font-medium">Resolve Dispute</p>
            <Textarea
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="Describe the resolution..."
              rows={3}
              data-testid="textarea-resolution"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">USD Refund Amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={refundAmountCents / 100}
                  onChange={(e) => setRefundAmountCents(Math.round(parseFloat(e.target.value) * 100))}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  placeholder="0.00"
                  data-testid="input-usd-refund"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Credit Refund Amount</label>
                <input
                  type="number"
                  min="0"
                  value={creditRefundAmount}
                  onChange={(e) => setCreditRefundAmount(parseInt(e.target.value) || 0)}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  placeholder="0"
                  data-testid="input-credit-refund"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setResolutionMode(false);
                  setResolution("");
                  setRefundAmountCents(0);
                  setCreditRefundAmount(0);
                }}
                data-testid="button-cancel-resolution"
              >
                Cancel
              </Button>
              <Button
                onClick={() => resolveDisputeMutation.mutate({
                  resolution,
                  refundAmountCents: refundAmountCents > 0 ? refundAmountCents : undefined,
                  creditRefundAmount: creditRefundAmount > 0 ? creditRefundAmount : undefined,
                })}
                disabled={!resolution.trim() || resolveDisputeMutation.isPending}
                data-testid="button-confirm-resolution"
              >
                {resolveDisputeMutation.isPending ? "Resolving..." : "Confirm Resolution"}
              </Button>
            </div>
          </div>
        )}
        
        {dispute.status === 'closed' && (
          <div className="p-4 text-center text-muted-foreground">
            This dispute has been closed
          </div>
        )}
      </CardContent>
    </Card>
  );
}