import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { MessageSquare, Eye, AlertTriangle, Clock } from "lucide-react";
import { DisputeChat } from "./DisputeChat";
import type { MarketplaceDispute } from "@shared/schema";

interface DisputesListProps {
  userId: string;
  isAdmin?: boolean;
}

export function DisputesList({ userId, isAdmin }: DisputesListProps) {
  const [, navigate] = useLocation();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [selectedDisputeId, setSelectedDisputeId] = useState<string | null>(null);
  
  // Build query params
  const queryParams = new URLSearchParams();
  if (filterStatus !== "all") queryParams.set("status", filterStatus);
  if (!isAdmin && filterRole !== "all") queryParams.set("role", filterRole);
  if (isAdmin) queryParams.set("escalatedOnly", "false");
  
  const endpoint = isAdmin 
    ? `/api/marketplace/admin/disputes?${queryParams}` 
    : `/api/marketplace/disputes?${queryParams}`;
  
  const { data: disputes, isLoading } = useQuery<(MarketplaceDispute & {
    order?: any;
    listing?: any;
    initiator?: any;
    respondent?: any;
  })[]>({
    queryKey: [endpoint],
  });
  
  const statusColors = {
    open: "bg-yellow-100 text-yellow-800",
    in_progress: "bg-blue-100 text-blue-800",
    resolved: "bg-green-100 text-green-800",
    closed: "bg-gray-100 text-gray-800",
  };
  
  const reasonLabels = {
    item_not_as_described: "Item Not As Described",
    quality_issue: "Quality Issue",
    not_received: "Not Received",
    other: "Other",
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Disputes</CardTitle>
          <CardDescription>Manage and track your marketplace disputes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{isAdmin ? "Dispute Management" : "Your Disputes"}</CardTitle>
              <CardDescription>
                {isAdmin 
                  ? "Review and resolve marketplace disputes" 
                  : "Manage and track your marketplace disputes"}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {!isAdmin && (
                <Select value={filterRole} onValueChange={setFilterRole}>
                  <SelectTrigger className="w-40" data-testid="select-filter-role">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Disputes</SelectItem>
                    <SelectItem value="initiator">My Disputes</SelectItem>
                    <SelectItem value="respondent">Against Me</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40" data-testid="select-filter-status">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {!disputes || disputes.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No disputes found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dispute ID</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Parties</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disputes.map((dispute) => (
                  <TableRow key={dispute.id}>
                    <TableCell className="font-medium">
                      #{dispute.id.slice(0, 8)}
                      {dispute.escalatedAt && (
                        <Badge className="ml-2 bg-orange-100 text-orange-800" variant="secondary">
                          Escalated
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">#{dispute.order?.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">{dispute.listing?.title}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>
                          <span className="text-muted-foreground">From:</span> {dispute.initiator?.username}
                        </p>
                        <p>
                          <span className="text-muted-foreground">To:</span> {dispute.respondent?.username}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {reasonLabels[dispute.reason as keyof typeof reasonLabels] || dispute.reason}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[dispute.status]}>
                        {dispute.status.replace(/_/g, ' ').toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{format(new Date(dispute.createdAt as any), 'MMM d, yyyy')}</p>
                        {dispute.lastRespondedAt && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Clock className="h-3 w-3" />
                            Last reply: {format(new Date(dispute.lastRespondedAt), 'h:mm a')}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedDisputeId(dispute.id)}
                        data-testid={`button-view-dispute-${dispute.id}`}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {/* Dispute Chat Dialog */}
      <Dialog 
        open={!!selectedDisputeId} 
        onOpenChange={(open) => !open && setSelectedDisputeId(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dispute Details</DialogTitle>
          </DialogHeader>
          {selectedDisputeId && (
            <DisputeChat
              disputeId={selectedDisputeId}
              currentUserId={userId}
              isAdmin={isAdmin}
              onClose={() => setSelectedDisputeId(null)}
              onResolve={() => setSelectedDisputeId(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}