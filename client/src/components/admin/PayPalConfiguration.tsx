import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, AlertCircle, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PayPalConfig {
  clientId: string;
  mode: 'sandbox' | 'live';
  enabled: boolean;
  webhookId?: string;
  secretConfigured?: boolean;
  lastVerified?: string;
}

export default function PayPalConfiguration() {
  const { toast } = useToast();
  const [showSecrets, setShowSecrets] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  
  // Fetch PayPal configuration
  const { data: config, isLoading } = useQuery({
    queryKey: ['/api/admin/paypal-config'],
    queryFn: async () => {
      const response = await apiRequest('/api/admin/paypal-config', { method: 'GET' } as any);
      return response as unknown as PayPalConfig;
    },
  });

  // Update PayPal configuration
  const updateConfigMutation = useMutation({
    mutationFn: async (config: Partial<PayPalConfig>) => {
      return apiRequest('/api/admin/paypal-config', {
        method: 'PUT',
        body: JSON.stringify(config),
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/paypal-config'] });
      toast({
        title: "Configuration Updated",
        description: "PayPal configuration has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update PayPal configuration",
        variant: "destructive",
      });
    },
  });

  // Test PayPal connection
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      setTestingConnection(true);
      return apiRequest('/api/admin/paypal-test', { method: 'POST' } as any);
    },
    onSuccess: (data: any) => {
      setTestingConnection(false);
      toast({
        title: "Connection Successful",
        description: `PayPal ${config?.mode} environment connected successfully.`,
      });
    },
    onError: (error: any) => {
      setTestingConnection(false);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to PayPal",
        variant: "destructive",
      });
    },
  });

  // Process manual PayPal payouts
  const processPayoutsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/admin/paypal-payouts/process', { method: 'POST' } as any);
    },
    onSuccess: (data: any) => {
      toast({
        title: "Payouts Initiated",
        description: `Processing ${data.payoutCount} payouts totaling $${(data.totalAmount / 100).toFixed(2)}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/transactions'] });
    },
    onError: (error: any) => {
      toast({
        title: "Payout Failed",
        description: error.message || "Failed to process PayPal payouts",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const isConfigured = config?.clientId && config?.clientId !== '' && config?.secretConfigured;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">PayPal Configuration</h2>
        <p className="text-muted-foreground">
          Configure PayPal Payouts API for automated seller payments
        </p>
      </div>

      {!isConfigured && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Setup Required</AlertTitle>
          <AlertDescription>
            PayPal is not configured. To enable automated PayPal payouts:
            <ol className="list-decimal ml-6 mt-2">
              <li>Create a PayPal Business account at <a href="https://paypal.com" target="_blank" rel="noopener" className="underline">paypal.com</a></li>
              <li>Visit <a href="https://developer.paypal.com" target="_blank" rel="noopener" className="underline">developer.paypal.com</a></li>
              <li>Create an app with Payouts enabled</li>
              <li>Add your Client ID and Secret below</li>
            </ol>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="configuration" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="testing">Testing</TabsTrigger>
          <TabsTrigger value="manual">Manual Payouts</TabsTrigger>
        </TabsList>

        <TabsContent value="configuration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Credentials</CardTitle>
              <CardDescription>
                Your PayPal API credentials for processing payouts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="mode">Environment Mode</Label>
                  <Select
                    value={config?.mode || 'sandbox'}
                    onValueChange={(value: 'sandbox' | 'live') => 
                      updateConfigMutation.mutate({ mode: value })
                    }
                  >
                    <SelectTrigger id="mode">
                      <SelectValue placeholder="Select environment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
                      <SelectItem value="live">Live (Production)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Use Sandbox for testing, Live for real payments
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="clientId">Client ID</Label>
                  <Input
                    id="clientId"
                    type={showSecrets ? "text" : "password"}
                    value={config?.clientId || ''}
                    placeholder="Enter PayPal Client ID"
                    onChange={(e) => updateConfigMutation.mutate({ clientId: e.target.value })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Found in PayPal Developer Dashboard under your app
                  </p>
                </div>

                {!config?.secretConfigured && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Client Secret Required</AlertTitle>
                    <AlertDescription>
                      The PayPal Client Secret must be added as an environment variable for security.
                      Add PAYPAL_CLIENT_SECRET to your Replit Secrets.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-secrets"
                    checked={showSecrets}
                    onCheckedChange={setShowSecrets}
                  />
                  <Label htmlFor="show-secrets">Show credentials</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="enabled"
                    checked={config?.enabled || false}
                    onCheckedChange={(enabled) => updateConfigMutation.mutate({ enabled })}
                  />
                  <Label htmlFor="enabled">Enable PayPal Payouts</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Webhook Configuration</CardTitle>
              <CardDescription>
                Configure webhooks to receive payout status updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label>Webhook URL</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={`${window.location.origin}/webhooks/paypal`}
                      className="font-mono text-sm"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/webhooks/paypal`);
                        toast({ title: "Copied", description: "Webhook URL copied to clipboard" });
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Add this URL to your PayPal app webhooks with these events:
                    PAYMENT.PAYOUTS-BATCH.SUCCESS, PAYMENT.PAYOUTS-BATCH.DENIED
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="webhookId">Webhook ID</Label>
                  <Input
                    id="webhookId"
                    value={config?.webhookId || ''}
                    placeholder="Enter PayPal Webhook ID"
                    onChange={(e) => updateConfigMutation.mutate({ webhookId: e.target.value })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Found in PayPal Developer Dashboard after creating webhook
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Connection Test</CardTitle>
              <CardDescription>
                Test your PayPal API connection and credentials
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <p className="font-medium">PayPal API Status</p>
                  <p className="text-sm text-muted-foreground">
                    Mode: {config?.mode === 'live' ? 'Production' : 'Sandbox'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {config?.lastVerified ? (
                    <Badge variant="outline" className="gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1">
                      <XCircle className="h-3 w-3" />
                      Not Verified
                    </Badge>
                  )}
                  <Button
                    size="sm"
                    onClick={() => testConnectionMutation.mutate()}
                    disabled={testingConnection || !isConfigured}
                  >
                    {testingConnection ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      'Test Connection'
                    )}
                  </Button>
                </div>
              </div>

              {config?.mode === 'sandbox' && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Sandbox Mode</AlertTitle>
                  <AlertDescription>
                    You're in sandbox mode. Payouts will use test funds only.
                    To test payouts, ensure sellers have sandbox PayPal accounts.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manual Payout Processing</CardTitle>
              <CardDescription>
                Manually trigger PayPal payouts for pending transactions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Manual Processing</AlertTitle>
                <AlertDescription>
                  This will process all pending PayPal payouts immediately.
                  Normally, payouts are processed according to the configured schedule.
                </AlertDescription>
              </Alert>

              <div className="flex justify-end">
                <Button
                  onClick={() => processPayoutsMutation.mutate()}
                  disabled={!isConfigured || processPayoutsMutation.isPending}
                >
                  {processPayoutsMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Process PayPal Payouts
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}