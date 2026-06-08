import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { CalendarIcon, Download, DollarSign, TrendingUp, Users, Package, AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react";
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

interface TransactionSummary {
  totalRevenue: number;
  totalCommission: number;
  totalPayouts: number;
  pendingPayouts: number;
  totalOrders: number;
  averageOrderValue: number;
  topSellers: Array<{
    userId: string;
    username: string;
    totalSales: number;
    totalRevenue: number;
  }>;
  recentTransactions: Array<{
    id: string;
    type: string;
    amount: number;
    status: string;
    userId: string;
    username: string;
    createdAt: string;
    orderId?: string;
    description?: string;
  }>;
}

export default function TransactionDashboard() {
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");

  // Fetch transaction summary
  const { data: summary, isLoading } = useQuery({
    queryKey: ['/api/admin/transactions/summary', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
      });
      return (apiRequest as any)(`/api/admin/transactions/summary?${params}`, { method: 'GET' });
    },
  });

  // Fetch payout batches
  const { data: payoutBatches } = useQuery({
    queryKey: ['/api/admin/payouts/batches'],
    queryFn: async () => {
      return (apiRequest as any)('/api/admin/payouts/batches', { method: 'GET' });
    },
  });

  const handleExport = async () => {
    const params = new URLSearchParams({
      startDate: dateRange.from.toISOString(),
      endDate: dateRange.to.toISOString(),
      format: exportFormat,
    });
    
    const response = await (apiRequest as any)(`/api/admin/transactions/export?${params}`, {
      method: 'GET',
    });

    // Create download link
    const blob = new Blob([exportFormat === 'csv' ? response : JSON.stringify(response, null, 2)], {
      type: exportFormat === 'csv' ? 'text/csv' : 'application/json',
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${format(new Date(), 'yyyy-MM-dd')}.${exportFormat}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      completed: { variant: "default" as const, icon: CheckCircle },
      pending: { variant: "secondary" as const, icon: Clock },
      processing: { variant: "outline" as const, icon: Clock },
      failed: { variant: "destructive" as const, icon: XCircle },
    };
    
    const config = variants[status] || variants.pending;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const getTransactionTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      purchase: "bg-green-100 text-green-800",
      commission: "bg-blue-100 text-blue-800",
      payout: "bg-purple-100 text-purple-800",
      refund: "bg-red-100 text-red-800",
    };
    
    return (
      <Badge className={cn("capitalize", colors[type] || "bg-gray-100 text-gray-800")}>
        {type}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Transaction Dashboard</h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Monitor all marketplace transactions and financial metrics
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal text-xs sm:text-sm">
                <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                <span className="truncate">{format(dateRange.from, "PP")} - {format(dateRange.to, "PP")}</span>
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
              <SelectTrigger className="w-20 sm:w-24 text-xs sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleExport} variant="outline" size="sm" className="text-xs sm:text-sm">
              <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
              <span className="hidden sm:inline">Export</span>
              <span className="sm:hidden">Export</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary?.totalRevenue?.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-muted-foreground">
              Platform commission: ${summary?.totalCommission?.toFixed(2) || '0.00'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalOrders || 0}</div>
            <p className="text-xs text-muted-foreground">
              Avg value: ${summary?.averageOrderValue?.toFixed(2) || '0.00'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payouts Processed</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary?.totalPayouts?.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-muted-foreground">
              Pending: ${summary?.pendingPayouts?.toFixed(2) || '0.00'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sellers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.topSellers?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              With sales this period
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 gap-1 h-auto p-1">
          <TabsTrigger value="transactions" className="text-xs sm:text-sm">Recent Transactions</TabsTrigger>
          <TabsTrigger value="sellers" className="text-xs sm:text-sm">Top Sellers</TabsTrigger>
          <TabsTrigger value="payouts" className="text-xs sm:text-sm">Payout Batches</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>
                All financial transactions in the selected period
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary?.recentTransactions?.map((transaction: any) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="text-sm">
                        {format(new Date(transaction.createdAt), 'MMM dd, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        {getTransactionTypeBadge(transaction.type)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {transaction.username || 'System'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {transaction.description || `Order #${transaction.orderId}`}
                      </TableCell>
                      <TableCell className="font-medium">
                        ${transaction.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(transaction.status)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!summary?.recentTransactions || summary.recentTransactions.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sellers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Sellers</CardTitle>
              <CardDescription>
                Sellers with highest revenue in the selected period
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead>Total Sales</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary?.topSellers?.map((seller: any, index: number) => (
                    <TableRow key={seller.userId}>
                      <TableCell className="font-medium">#{index + 1}</TableCell>
                      <TableCell className="font-medium">
                        {seller.username}
                      </TableCell>
                      <TableCell>{seller.totalSales}</TableCell>
                      <TableCell className="font-medium">
                        ${seller.totalRevenue.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!summary?.topSellers || summary.topSellers.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No sellers found
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
              <CardTitle>Payout Batches</CardTitle>
              <CardDescription>
                History of payout batch processing
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch ID</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payoutBatches?.data?.map((batch: any) => (
                    <TableRow key={batch.id}>
                      <TableCell className="font-mono text-xs">
                        {batch.id.substring(0, 8)}...
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(batch.createdAt), 'MMM dd, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {batch.payoutMethod}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        ${(batch.totalAmountCents / 100).toFixed(2)}
                      </TableCell>
                      <TableCell>{batch.totalPayouts || batch.payoutCount || 0}</TableCell>
                      <TableCell>
                        {getStatusBadge(batch.status)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!payoutBatches?.data || payoutBatches.data.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No payout batches found
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