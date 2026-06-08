import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { DisputesList } from "@/components/marketplace/DisputesList";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  AlertTriangle,
  MessageSquare,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  DollarSign,
} from "lucide-react";
import { format } from "date-fns";

interface DisputeStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  escalated: number;
  avgResolutionDays: number;
  totalRefunded: number;
  totalCreditsRefunded: number;
}

export function AdminDisputes() {
  const { user, loading } = useAuth() as ReturnType<typeof useAuth> & { loading?: boolean };
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("all");
  
  // Redirect if not admin
  if (!loading && (!user || (user.role !== 'super_admin' && user.role !== 'community_admin' && user.role !== 'developer'))) {
    setLocation("/dashboard");
    return null;
  }
  
  // Fetch dispute statistics
  const { data: stats, isLoading: statsLoading } = useQuery<DisputeStats>({
    queryKey: ["/api/marketplace/admin/disputes/stats"],
    enabled: !!user && (user.role === 'super_admin' || user.role === 'community_admin' || user.role === 'developer'),
  });
  
  // Fetch recent disputes for quick overview
  const { data: recentDisputes } = useQuery<any>({
    queryKey: ["/api/marketplace/admin/disputes", { limit: 5, status: "open", escalatedOnly: true }],
    enabled: !!user && (user.role === 'super_admin' || user.role === 'community_admin' || user.role === 'developer'),
  });
  
  if (loading || statsLoading) {
    return (
      <div className="container max-w-7xl mx-auto p-6">
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="container max-w-7xl mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Dispute Management</h1>
            <Badge variant="secondary" className="ml-2">Admin</Badge>
          </div>
          <p className="text-muted-foreground">
            Review and resolve marketplace disputes between buyers and sellers
          </p>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Total Disputes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">All time</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                Open Cases
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats?.open || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.escalated || 0} escalated
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Resolution Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {(stats?.total ?? 0) > 0 
                  ? Math.round((stats!.resolved / stats!.total) * 100)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Avg: {stats?.avgResolutionDays || 0} days
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total Refunded
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${((stats?.totalRefunded || 0) / 100).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                + {stats?.totalCreditsRefunded || 0} credits
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Escalated Disputes Alert */}
        {recentDisputes && recentDisputes.length > 0 && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription>
              <span className="font-medium text-orange-800">
                {recentDisputes.length} escalated dispute(s) require admin attention
              </span>
              <div className="mt-2 space-y-1">
                {recentDisputes.slice(0, 3).map((dispute: any) => (
                  <div key={dispute.id} className="text-sm text-orange-700">
                    • Dispute #{dispute.id.slice(0, 8)} - Order #{dispute.order?.orderNumber} 
                    - {format(new Date(dispute.createdAt), "MMM d, yyyy")}
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Dispute Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all" className="flex items-center gap-2">
              All Disputes
            </TabsTrigger>
            <TabsTrigger value="open" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Open
            </TabsTrigger>
            <TabsTrigger value="escalated" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Escalated
            </TabsTrigger>
            <TabsTrigger value="resolved" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Resolved
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all">
            <DisputesList userId={user?.id || ""} isAdmin={true} />
          </TabsContent>
          
          <TabsContent value="open">
            <Card>
              <CardHeader>
                <CardTitle>Open Disputes</CardTitle>
                <CardDescription>
                  Disputes waiting for response or resolution
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DisputesList userId={user?.id || ""} isAdmin={true} />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="escalated">
            <Card>
              <CardHeader>
                <CardTitle>Escalated Disputes</CardTitle>
                <CardDescription>
                  Disputes requiring immediate admin intervention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert className="mb-4 border-orange-200 bg-orange-50">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-sm">
                    These disputes have been automatically escalated due to:
                    <ul className="mt-2 ml-6 list-disc">
                      <li>No seller response within 48 hours</li>
                      <li>Dispute open for more than 72 hours</li>
                      <li>Manual escalation by either party</li>
                    </ul>
                  </AlertDescription>
                </Alert>
                <DisputesList userId={user?.id || ""} isAdmin={true} />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="resolved">
            <Card>
              <CardHeader>
                <CardTitle>Resolved Disputes</CardTitle>
                <CardDescription>
                  Successfully resolved dispute cases
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DisputesList userId={user?.id || ""} isAdmin={true} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Guidelines */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Dispute Resolution Guidelines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <h4 className="font-semibold mb-2">Investigation Steps</h4>
                <ol className="space-y-1 list-decimal list-inside text-muted-foreground">
                  <li>Review the order details and listing information</li>
                  <li>Examine evidence provided by both parties</li>
                  <li>Check seller's response time and cooperation</li>
                  <li>Verify if the dispute reason is valid</li>
                  <li>Consider past dispute history of both parties</li>
                </ol>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Resolution Options</h4>
                <ul className="space-y-1 list-disc list-inside text-muted-foreground">
                  <li>Full refund - Complete return of payment</li>
                  <li>Partial refund - Agreed percentage return</li>
                  <li>No refund - Dispute ruled in seller's favor</li>
                  <li>Credit compensation - Platform credits instead of refund</li>
                  <li>Warning/Suspension - For repeat offenders</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Time Limits</h4>
                <ul className="space-y-1 list-disc list-inside text-muted-foreground">
                  <li>Buyers: 30 days to open dispute</li>
                  <li>Sellers: 48 hours to respond</li>
                  <li>Auto-escalation: After 72 hours</li>
                  <li>Admin resolution: Within 24-48 hours of escalation</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Common Dispute Types</h4>
                <ul className="space-y-1 list-disc list-inside text-muted-foreground">
                  <li>Item not as described</li>
                  <li>Quality issues</li>
                  <li>Not received / Access issues</li>
                  <li>License key problems</li>
                  <li>Other seller-buyer conflicts</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}