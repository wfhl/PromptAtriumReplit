import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { 
  TrendingUp, TrendingDown, DollarSign, Users, ShoppingCart, 
  Star, Eye, Calendar, Download, RefreshCw, CreditCard,
  Package, ArrowUpRight, ArrowDownRight, Wallet
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { MarketplaceListing } from "@shared/schema";

// Chart colors
const CHART_COLORS = {
  primary: "#3b82f6",
  secondary: "#10b981",
  tertiary: "#f59e0b",
  quaternary: "#8b5cf6",
  danger: "#ef4444",
  muted: "#94a3b8",
};

// Helper function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

// Helper function to format percentage
const formatPercentage = (value: number) => {
  return `${value.toFixed(1)}%`;
};

// Helper function to format numbers with commas
const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-US').format(num);
};

// Date range options
const DATE_RANGES = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 3 months" },
  { value: "365", label: "Last year" },
  { value: "all", label: "All time" },
];

interface AnalyticsMetrics {
  totalSales: number;
  totalRevenueUSD: number;
  totalCreditsEarned: number;
  averageOrderValue: number;
  uniqueCustomers: number;
  conversionRate: number;
  averageRating: number;
  growthPercentage: number;
  repeatCustomerRate: number;
  totalViews: number;
}

interface TopListing extends MarketplaceListing {
  salesCount: number;
  revenue: number;
  conversionRate: number;
  views?: number;
}

interface ChartDataPoint {
  date: string;
  revenue: number;
  sales: number;
  usdRevenue: number;
  creditRevenue: number;
}

export default function SellerAnalytics() {
  const [dateRange, setDateRange] = useState("30");
  const [chartPeriod, setChartPeriod] = useState<"day" | "week" | "month">("day");
  const [isExporting, setIsExporting] = useState(false);
  
  // Calculate date range for API calls
  const getDateRange = () => {
    const end = new Date();
    const start = new Date();
    
    if (dateRange === "all") {
      start.setFullYear(start.getFullYear() - 10); // 10 years back for "all time"
    } else {
      start.setDate(start.getDate() - parseInt(dateRange));
    }
    
    return { 
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    };
  };
  
  // Fetch analytics data
  const { data: analyticsData, isLoading: analyticsLoading, refetch: refetchAnalytics } = useQuery({
    queryKey: ["/api/marketplace/seller/analytics", dateRange],
    queryFn: async () => {
      const { startDate, endDate } = getDateRange();
      const response = await fetch(`/api/marketplace/seller/analytics?startDate=${startDate}&endDate=${endDate}`);
      if (!response.ok) throw new Error("Failed to fetch analytics");
      return response.json();
    }
  }) as { 
    data: { metrics: AnalyticsMetrics; topListings: TopListing[] } | undefined;
    isLoading: boolean;
    refetch: () => void;
  };
  
  // Fetch chart data
  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ["/api/marketplace/seller/analytics/chart", dateRange, chartPeriod],
    queryFn: async () => {
      const { startDate, endDate } = getDateRange();
      const response = await fetch(`/api/marketplace/seller/analytics/chart?startDate=${startDate}&endDate=${endDate}&period=${chartPeriod}`);
      if (!response.ok) throw new Error("Failed to fetch chart data");
      return response.json();
    }
  }) as { data: ChartDataPoint[] | undefined; isLoading: boolean };
  
  // Export data as CSV
  const exportData = async () => {
    setIsExporting(true);
    try {
      // Prepare CSV data
      const csvHeader = "Date,Revenue (USD),Sales Count,USD Revenue,Credit Revenue\n";
      const csvRows = chartData?.map(row => 
        `${row.date},${row.revenue},${row.sales},${row.usdRevenue},${row.creditRevenue}`
      ).join('\n') || '';
      
      const csvContent = csvHeader + csvRows;
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };
  
  // Calculate pie chart data for payment types
  const pieChartData = chartData ? [
    { 
      name: "USD Payments", 
      value: chartData.reduce((sum, d) => sum + d.usdRevenue, 0),
      color: CHART_COLORS.primary
    },
    { 
      name: "Credit Payments", 
      value: chartData.reduce((sum, d) => sum + d.creditRevenue, 0),
      color: CHART_COLORS.secondary
    }
  ].filter(d => d.value > 0) : [];
  
  const metrics = analyticsData?.metrics;
  const topListings = analyticsData?.topListings || [];
  
  if (analyticsLoading || chartLoading) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton for metric cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Loading skeleton for charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  if (!metrics) {
    return (
      <Alert>
        <AlertDescription>
          No analytics data available. Start selling to see your performance metrics.
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]" data-testid="select-date-range">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGES.map(range => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={chartPeriod} onValueChange={(value) => setChartPeriod(value as typeof chartPeriod)}>
            <SelectTrigger className="w-[140px]" data-testid="select-chart-period">
              <SelectValue placeholder="Group by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Daily</SelectItem>
              <SelectItem value="week">Weekly</SelectItem>
              <SelectItem value="month">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchAnalytics()}
            data-testid="button-refresh-analytics"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportData}
            disabled={isExporting || !chartData?.length}
            data-testid="button-export-data"
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>
      
      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-sales">{formatNumber(metrics.totalSales)}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.uniqueCustomers} unique customers
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-revenue">{formatCurrency(metrics.totalRevenueUSD)}</div>
            <div className="flex items-center text-xs">
              {metrics.growthPercentage !== 0 && (
                <>
                  {metrics.growthPercentage > 0 ? (
                    <ArrowUpRight className="mr-1 h-3 w-3 text-green-500" />
                  ) : (
                    <ArrowDownRight className="mr-1 h-3 w-3 text-red-500" />
                  )}
                  <span className={metrics.growthPercentage > 0 ? "text-green-500" : "text-red-500"}>
                    {formatPercentage(Math.abs(metrics.growthPercentage))}
                  </span>
                  <span className="ml-1 text-muted-foreground">vs previous period</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credits Earned</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-credits-earned">{formatNumber(metrics.totalCreditsEarned)}</div>
            <p className="text-xs text-muted-foreground">
              ≈ {formatCurrency(metrics.totalCreditsEarned * 0.01)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <span className="text-2xl font-bold" data-testid="text-avg-rating">
                {metrics.averageRating.toFixed(1)}
              </span>
              <Star className="ml-1 h-5 w-5 fill-yellow-400 text-yellow-400" />
            </div>
            <p className="text-xs text-muted-foreground">
              Based on customer reviews
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-conversion-rate">{formatPercentage(metrics.conversionRate)}</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(metrics.totalViews)} total views
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Chart - Takes 2 columns */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue Over Time</CardTitle>
            <CardDescription>
              Track your revenue trends across different time periods
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chartData && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      if (chartPeriod === "month") {
                        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                      }
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => {
                      const date = new Date(label);
                      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                    }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke={CHART_COLORS.primary}
                    fill={CHART_COLORS.primary}
                    fillOpacity={0.6}
                    name="Total Revenue"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No data available for selected period
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Payment Type Breakdown - Takes 1 column */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Types</CardTitle>
            <CardDescription>
              USD vs Credits breakdown
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${formatCurrency(entry.value)}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No payment data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Additional Metrics */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sales Volume Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Volume</CardTitle>
            <CardDescription>
              Number of sales over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chartData && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      if (chartPeriod === "month") {
                        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                      }
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="sales" fill={CHART_COLORS.secondary} name="Sales Count" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
            <CardDescription>
              Key performance indicators
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Repeat Customer Rate</span>
              </div>
              <Badge variant={metrics.repeatCustomerRate > 20 ? "default" : "secondary"}>
                {formatPercentage(metrics.repeatCustomerRate)}
              </Badge>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <DollarSign className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Average Order Value</span>
              </div>
              <span className="font-medium">{formatCurrency(metrics.averageOrderValue)}</span>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Eye className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Views to Sales</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {formatNumber(metrics.totalViews)} → {formatNumber(metrics.totalSales)}
              </span>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CreditCard className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Credit vs USD Split</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {pieChartData.length > 0 
                  ? `${((pieChartData[1]?.value || 0) / (pieChartData[0]?.value + pieChartData[1]?.value) * 100).toFixed(0)}% credits`
                  : "N/A"
                }
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Top Performing Listings */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Listings</CardTitle>
          <CardDescription>
            Your best-selling prompts based on revenue and conversion
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topListings.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Listing</TableHead>
                  <TableHead className="text-center">Sales</TableHead>
                  <TableHead className="text-center">Revenue</TableHead>
                  <TableHead className="text-center">Views</TableHead>
                  <TableHead className="text-center">Conversion</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topListings.map((listing) => (
                  <TableRow key={listing.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{listing.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {listing.category}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">
                        {listing.salesCount}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {formatCurrency(listing.revenue)}
                    </TableCell>
                    <TableCell className="text-center">
                      {formatNumber(listing.views || 0)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant={listing.conversionRate > 5 ? "default" : "secondary"}
                      >
                        {formatPercentage(listing.conversionRate)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant={listing.status === 'active' ? 'default' : 'secondary'}
                        className="capitalize"
                      >
                        {listing.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No listings with sales in this period
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}