import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  Users,
  FileText,
  HardDrive,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  Database,
  Cpu,
  Globe,
  Zap,
  Shield,
} from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

interface SystemStats {
  users: {
    total: number;
    active24h: number;
    new7d: number;
    growth: number;
  };
  content: {
    totalPrompts: number;
    totalImages: number;
    newToday: number;
    featured: number;
  };
  storage: {
    used: number;
    total: number;
    percentage: number;
    trending: "up" | "down" | "stable";
  };
  database: {
    size: number;
    connections: number;
    queryTime: number;
    health: "healthy" | "warning" | "critical";
  };
  performance: {
    uptime: number;
    responseTime: number;
    errorRate: number;
    requestsPerMin: number;
  };
  security: {
    failedLogins: number;
    suspiciousActivity: number;
    lastSecurityScan: Date;
    status: "secure" | "warning" | "critical";
  };
}

interface HealthCheck {
  service: string;
  status: "operational" | "degraded" | "down";
  responseTime: number;
  lastCheck: Date;
}

export function SystemOverview() {
  // Fetch system statistics
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery<SystemStats>({
    queryKey: ["/api/admin/system-stats"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch health checks
  const { data: healthChecks, isLoading: healthLoading } = useQuery<HealthCheck[]>({
    queryKey: ["/api/admin/health-checks"],
    refetchInterval: 60000, // Refresh every minute
  });

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (statsError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load system statistics. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Health Banner */}
      <Card className={`border-l-4 ${
        stats?.database.health === "healthy" && stats?.security.status === "secure" 
          ? "border-l-green-500" 
          : stats?.database.health === "warning" || stats?.security.status === "warning"
          ? "border-l-yellow-500"
          : "border-l-red-500"
      }`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Health
            </CardTitle>
            <Badge variant={
              stats?.database.health === "healthy" && stats?.security.status === "secure"
                ? "default"
                : stats?.database.health === "warning" || stats?.security.status === "warning"
                ? "secondary"
                : "destructive"
            }>
              {stats?.database.health === "healthy" && stats?.security.status === "secure"
                ? "All Systems Operational"
                : stats?.database.health === "warning" || stats?.security.status === "warning"
                ? "Minor Issues Detected"
                : "Critical Issues"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {healthChecks?.map((check) => (
              <div key={check.service} className="flex items-center gap-2">
                {check.status === "operational" ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : check.status === "degraded" ? (
                  <Clock className="h-4 w-4 text-yellow-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                <div>
                  <p className="text-sm font-medium">{check.service}</p>
                  <p className="text-xs text-muted-foreground">{check.responseTime}ms</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Users Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Users
              </span>
              {stats?.users.growth && stats.users.growth > 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.users.total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.users.active24h} active today
            </p>
            <p className="text-xs mt-1">
              <span className={stats?.users.growth && stats.users.growth > 0 ? "text-green-500" : "text-red-500"}>
                {(stats?.users.growth as number) > 0 ? "+" : ""}{stats?.users.growth}%
              </span>
              {" "}vs last week
            </p>
          </CardContent>
        </Card>

        {/* Content Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Content
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.content.totalPrompts.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.content.newToday} created today
            </p>
            <p className="text-xs mt-1">
              {stats?.content.featured} featured
            </p>
          </CardContent>
        </Card>

        {/* Storage Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                Storage
              </span>
              {stats?.storage.percentage && stats.storage.percentage > 80 && (
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.storage.percentage}%
            </div>
            <Progress value={stats?.storage.percentage} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {stats?.storage.used && formatBytes(stats.storage.used)} of {stats?.storage.total && formatBytes(stats.storage.total)}
            </p>
          </CardContent>
        </Card>

        {/* Performance Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.performance.responseTime}ms</div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg response time
            </p>
            <p className="text-xs mt-1">
              {stats?.performance.errorRate}% error rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Database Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Performance
            </CardTitle>
            <CardDescription>
              Real-time database metrics and health status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Database Size</span>
              <span className="font-medium">{stats?.database.size && formatBytes(stats.database.size)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Active Connections</span>
              <span className="font-medium">{stats?.database.connections}/100</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Avg Query Time</span>
              <span className="font-medium">{stats?.database.queryTime}ms</span>
            </div>
            <div className="pt-2 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm">Status</span>
                <Badge variant={
                  stats?.database.health === "healthy" ? "default" :
                  stats?.database.health === "warning" ? "secondary" : "destructive"
                }>
                  {stats?.database.health}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Overview
            </CardTitle>
            <CardDescription>
              Security events and threat monitoring
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Failed Login Attempts</span>
              <span className="font-medium">{stats?.security.failedLogins}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Suspicious Activities</span>
              <span className="font-medium">{stats?.security.suspiciousActivity}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Last Security Scan</span>
              <span className="text-xs text-muted-foreground">
                {stats?.security.lastSecurityScan && 
                  format(new Date(stats.security.lastSecurityScan), "MMM dd, HH:mm")}
              </span>
            </div>
            <div className="pt-2 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm">Security Status</span>
                <Badge variant={
                  stats?.security.status === "secure" ? "default" :
                  stats?.security.status === "warning" ? "secondary" : "destructive"
                }>
                  {stats?.security.status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            System Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Uptime</p>
              <p className="font-medium">{stats?.performance.uptime && formatUptime(stats.performance.uptime)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Requests/min</p>
              <p className="font-medium">{stats?.performance.requestsPerMin}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Environment</p>
              <p className="font-medium">{process.env.NODE_ENV || "development"}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}