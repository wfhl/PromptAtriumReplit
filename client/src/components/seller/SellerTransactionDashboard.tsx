import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { CalendarIcon, Download, DollarSign, Package, TrendingUp, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface SellerStats {
  totalRevenue: number;
  netRevenue: number;
  totalCommission: number;
  pendingPayouts: number;
  completedPayouts: number;
  totalOrders: number;
  averageOrderValue: number;
  conversionRate: number;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  createdAt: string;
  orderId?: string;
  buyerUsername?: string;
  promptTitle?: string;
  platformFee?: number;
  netAmount?: number;
  payoutBatchId?: string;
}

export default function SellerTransactionDashboard() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");

  // Fetch seller stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/seller/stats', user?.id, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
      });
      return (apiRequest as any)(`/api/seller/stats?${params}`, { method: 'GET' });
    },
    enabled: !!user?.id,
  });

  // Fetch seller transactions
  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['/api/user/transactions', user?.id, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
      });
      return (apiRequest as any)(`/api/user/transactions?${params}`, { method: 'GET' });
    },
    enabled: !!user?.id,
  });

  // Fetch payout status
  const { data: payoutStatus } = useQuery({
    queryKey: ['/api/seller/payout-status', user?.id],
    queryFn: async () => {
      return (apiRequest as any)('/api/seller/payout-status', { method: 'GET' });
    },
    enabled: !!user?.id,
  });

  const handleExport = async () => {
    const params = new URLSearchParams({
      startDate: dateRange.from.toISOString(),
      endDate: dateRange.to.toISOString(),
      format: exportFormat,
    });
    
    const response = await (apiRequest as any)(`/api/user/transactions/export?${params}`, {
      method: 'GET',
    });

    // Create download link
    const blob = new Blob([exportFormat === 'csv' ? response : JSON.stringify(response, null, 2)], {
      type: exportFormat === 'csv' ? 'text/csv' : 'application/json',
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seller-transactions-${format(new Date(), 'yyyy-MM-dd')}.${exportFormat}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      completed: { variant: "default" as const, icon: CheckCircle, className: "bg-green-100 text-green-800" },
      pending: { variant: "secondary" as const, icon: Clock, className: "bg-yellow-100 text-yellow-800" },
      processing: { variant: "outline" as const, icon: Clock, className: "bg-blue-100 text-blue-800" },
      failed: { variant: "destructive" as const, icon: XCircle, className: "" },
    };
    
    const config = variants[status] || variants.pending;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className={cn("flex items-center gap-1", config.className)}>
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const isLoading = statsLoading || transactionsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Sales Dashboard</h2>
          <p className="text-muted-foreground">
            Track your sales, earnings, and payouts
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(dateRange.from, "PP")} - {format(dateRange.to, "PP")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={(range: any) => {
                  if (range?.from) {
                    setDateRange({
                      from: range.from,
                      to: range.to || range.from,
                    });
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          
          <div className="flex items-center gap-2">
            <Select value={exportFormat} onValueChange={(value: any) => setExportFormat(value)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleExport} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Payout Alert */}
      {payoutStatus?.nextPayoutDate && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Next Payout</AlertTitle>
          <AlertDescription>
            Your next payout of ${payoutStatus.nextPayoutAmount?.toFixed(2)} is scheduled for{' '}
            {format(new Date(payoutStatus.nextPayoutDate), 'MMMM dd, yyyy')}.
            {payoutStatus.payoutMethod === 'stripe' ? ' Via Stripe Connect' : ' Via PayPal'}
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats?.totalRevenue?.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-muted-foreground">
              Gross sales before fees
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Earnings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${stats?.netRevenue?.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              After ${stats?.totalCommission?.toFixed(2) || '0.00'} platform fee
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payout</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats?.pendingPayouts?.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting next payout cycle
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalOrders || 0}</div>
            <p className="text-xs text-muted-foreground">
              Avg: ${stats?.averageOrderValue?.toFixed(2) || '0.00'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sales" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sales">Sales History</TabsTrigger>
          <TabsTrigger value="payouts">Payout History</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sales Transactions</CardTitle>
              <CardDescription>
                Your sales and associated platform fees
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Prompt</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead className="text-right">Sale Price</TableHead>
                    <TableHead className="text-right">Platform Fee</TableHead>
                    <TableHead className="text-right">Net Earnings</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions?.filter((t: Transaction) => t.type === 'purchase')?.map((transaction: Transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="text-sm">
                        {format(new Date(transaction.createdAt), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell className="font-medium">
                        {transaction.promptTitle || `Order #${transaction.orderId}`}
                      </TableCell>
                      <TableCell>
                        {transaction.buyerUsername || 'Anonymous'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${transaction.amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        -${transaction.platformFee?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell className="text-right font-bold text-green-600">
                        ${transaction.netAmount?.toFixed(2) || (transaction.amount - (transaction.platformFee || 0)).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(transaction.status)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!transactions || transactions.filter((t: Transaction) => t.type === 'purchase').length === 0) && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No sales found for this period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payout History</CardTitle>
              <CardDescription>
                Your completed and pending payouts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Batch ID</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions?.filter((t: Transaction) => t.type === 'payout')?.map((payout: Transaction) => (
                    <TableRow key={payout.id}>
                      <TableCell className="text-sm">
                        {format(new Date(payout.createdAt), 'MMM dd, yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {payout.payoutBatchId?.substring(0, 8) || 'N/A'}...
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          Stripe
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        ${payout.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(payout.status)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!transactions || transactions.filter((t: Transaction) => t.type === 'payout').length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No payouts found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}