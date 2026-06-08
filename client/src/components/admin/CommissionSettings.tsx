import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Percent, DollarSign, Settings, Users, TrendingUp, Clock } from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface PlatformSetting {
  id: string;
  key: string;
  value: any;
  category: string;
  description: string;
  isEditable: boolean;
  validationRules?: any;
  lastModifiedBy?: string;
  updatedAt?: string;
}

export default function CommissionSettings() {
  const { toast } = useToast();
  const [commissionSettings, setCommissionSettings] = useState({
    default_commission_rate: 15,
    min_payout_amount_cents: 1000,
    payout_frequency: "weekly",
    stripe_application_fee_percent: 2.9,
    stripe_fixed_fee_cents: 30,
    paypal_fee_percent: 3.49,
    paypal_fixed_fee_cents: 49,
    enable_auto_payouts: true,
    payout_delay_days: 7,
  });

  // Fetch platform settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['/api/admin/platform-settings'],
    queryFn: async () => {
      const response = await apiRequest('/api/admin/platform-settings', { method: 'GET' } as any) as any;
      const settingsMap: Record<string, any> = {};
      response.forEach((setting: PlatformSetting) => {
        settingsMap[setting.key] = JSON.parse(setting.value);
      });
      setCommissionSettings(prev => ({ ...prev, ...settingsMap }));
      return response;
    },
  });

  // Update setting mutation
  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      return apiRequest('/api/admin/platform-settings', {
        method: 'PUT',
        body: JSON.stringify({ key, value }),
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/platform-settings'] });
      toast({
        title: "Setting Updated",
        description: "Platform setting has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update setting",
        variant: "destructive",
      });
    },
  });

  const handleSettingChange = (key: string, value: any) => {
    setCommissionSettings(prev => ({ ...prev, [key]: value }));
    updateSettingMutation.mutate({ key, value: JSON.stringify(value) });
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
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Commission & Payout Settings</h2>
        <p className="text-muted-foreground">
          Configure platform fees, payout schedules, and payment processing settings
        </p>
      </div>

      <Tabs defaultValue="commission" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="commission">
            <Percent className="h-4 w-4 mr-2" />
            Commission Rates
          </TabsTrigger>
          <TabsTrigger value="payouts">
            <Clock className="h-4 w-4 mr-2" />
            Payout Schedule
          </TabsTrigger>
          <TabsTrigger value="fees">
            <DollarSign className="h-4 w-4 mr-2" />
            Processing Fees
          </TabsTrigger>
        </TabsList>

        <TabsContent value="commission" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Default Commission Rate</CardTitle>
              <CardDescription>
                The standard commission rate applied to all new sellers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <Label htmlFor="commission-rate">Commission Percentage</Label>
                  <div className="flex items-center space-x-2 mt-2">
                    <Input
                      id="commission-rate"
                      type="number"
                      min="0"
                      max="100"
                      value={commissionSettings.default_commission_rate}
                      onChange={(e) => handleSettingChange('default_commission_rate', Number(e.target.value))}
                      className="w-24"
                      data-testid="input-commission-rate"
                    />
                    <span className="text-lg font-medium">%</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Applied to all sales. Individual seller rates can be customized.
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Example on $100 sale:</p>
                  <p className="text-2xl font-bold">${(100 * commissionSettings.default_commission_rate / 100).toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">Platform fee</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Seller-Specific Rates</CardTitle>
              <CardDescription>
                Override commission rates for individual sellers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" data-testid="button-manage-seller-rates">
                <Users className="h-4 w-4 mr-2" />
                Manage Individual Seller Rates
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payout Configuration</CardTitle>
              <CardDescription>
                Control when and how sellers receive their earnings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="payout-frequency">Payout Frequency</Label>
                  <Select
                    value={commissionSettings.payout_frequency}
                    onValueChange={(value) => handleSettingChange('payout_frequency', value)}
                  >
                    <SelectTrigger id="payout-frequency" data-testid="select-payout-frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Bi-weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="payout-delay">Payout Delay (Days)</Label>
                  <Input
                    id="payout-delay"
                    type="number"
                    min="1"
                    max="30"
                    value={commissionSettings.payout_delay_days}
                    onChange={(e) => handleSettingChange('payout_delay_days', Number(e.target.value))}
                    data-testid="input-payout-delay"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Hold funds for this many days before payout
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="min-payout">Minimum Payout Amount</Label>
                <div className="flex items-center space-x-2 mt-2">
                  <span className="text-lg">$</span>
                  <Input
                    id="min-payout"
                    type="number"
                    min="1"
                    step="0.01"
                    value={commissionSettings.min_payout_amount_cents / 100}
                    onChange={(e) => handleSettingChange('min_payout_amount_cents', Math.round(Number(e.target.value) * 100))}
                    className="w-32"
                    data-testid="input-min-payout"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Sellers must reach this threshold before payout
                </p>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label htmlFor="auto-payouts">Enable Automatic Payouts</Label>
                  <p className="text-sm text-muted-foreground">
                    Process payouts automatically based on schedule
                  </p>
                </div>
                <Switch
                  id="auto-payouts"
                  checked={commissionSettings.enable_auto_payouts}
                  onCheckedChange={(checked) => handleSettingChange('enable_auto_payouts', checked)}
                  data-testid="switch-auto-payouts"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Manual Payout Processing</CardTitle>
              <CardDescription>
                Trigger payout batch processing manually
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Button 
                  variant="default"
                  onClick={() => {
                    apiRequest('/api/admin/payouts/process', {
                      method: 'POST',
                      body: JSON.stringify({ payoutMethod: 'stripe' })
                    } as any).then(() => {
                      toast({
                        title: "Payouts Processing",
                        description: "Stripe payouts have been initiated",
                      });
                    });
                  }}
                  data-testid="button-process-stripe-payouts"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Process Stripe Payouts
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    apiRequest('/api/admin/payouts/process', {
                      method: 'POST',
                      body: JSON.stringify({ payoutMethod: 'paypal' })
                    } as any).then(() => {
                      toast({
                        title: "Payouts Processing",
                        description: "PayPal payouts have been initiated",
                      });
                    });
                  }}
                  data-testid="button-process-paypal-payouts"
                >
                  Process PayPal Payouts
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fees" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Processing Fees</CardTitle>
              <CardDescription>
                Configure payment processor fee calculations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium">Stripe Fees</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="stripe-percent">Percentage Fee</Label>
                    <div className="flex items-center space-x-2 mt-2">
                      <Input
                        id="stripe-percent"
                        type="number"
                        min="0"
                        step="0.1"
                        value={commissionSettings.stripe_application_fee_percent}
                        onChange={(e) => handleSettingChange('stripe_application_fee_percent', Number(e.target.value))}
                        className="w-24"
                        disabled={true}
                        data-testid="input-stripe-percent"
                      />
                      <span className="text-lg">%</span>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="stripe-fixed">Fixed Fee (cents)</Label>
                    <div className="flex items-center space-x-2 mt-2">
                      <Input
                        id="stripe-fixed"
                        type="number"
                        min="0"
                        value={commissionSettings.stripe_fixed_fee_cents}
                        onChange={(e) => handleSettingChange('stripe_fixed_fee_cents', Number(e.target.value))}
                        className="w-24"
                        disabled={true}
                        data-testid="input-stripe-fixed"
                      />
                      <span className="text-lg">¢</span>
                    </div>
                  </div>
                </div>
                <Badge variant="secondary">System-defined (read-only)</Badge>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium">PayPal Fees</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="paypal-percent">Percentage Fee</Label>
                    <div className="flex items-center space-x-2 mt-2">
                      <Input
                        id="paypal-percent"
                        type="number"
                        min="0"
                        step="0.1"
                        value={commissionSettings.paypal_fee_percent}
                        onChange={(e) => handleSettingChange('paypal_fee_percent', Number(e.target.value))}
                        className="w-24"
                        disabled={true}
                        data-testid="input-paypal-percent"
                      />
                      <span className="text-lg">%</span>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="paypal-fixed">Fixed Fee (cents)</Label>
                    <div className="flex items-center space-x-2 mt-2">
                      <Input
                        id="paypal-fixed"
                        type="number"
                        min="0"
                        value={commissionSettings.paypal_fixed_fee_cents}
                        onChange={(e) => handleSettingChange('paypal_fixed_fee_cents', Number(e.target.value))}
                        className="w-24"
                        disabled={true}
                        data-testid="input-paypal-fixed"
                      />
                      <span className="text-lg">¢</span>
                    </div>
                  </div>
                </div>
                <Badge variant="secondary">System-defined (read-only)</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fee Calculator</CardTitle>
              <CardDescription>
                Preview how fees affect seller payouts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="calc-amount">Sale Amount</Label>
                  <div className="flex items-center space-x-2 mt-2">
                    <span className="text-lg">$</span>
                    <Input
                      id="calc-amount"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue="100"
                      className="w-32"
                      data-testid="input-calc-amount"
                    />
                  </div>
                </div>
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span>Sale Amount:</span>
                    <span className="font-medium">$100.00</span>
                  </div>
                  <div className="flex justify-between text-destructive">
                    <span>Platform Commission ({commissionSettings.default_commission_rate}%):</span>
                    <span>-${(100 * commissionSettings.default_commission_rate / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-destructive">
                    <span>Stripe Processing Fee:</span>
                    <span>-${((100 * commissionSettings.stripe_application_fee_percent / 100) + (commissionSettings.stripe_fixed_fee_cents / 100)).toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>Seller Receives:</span>
                    <span className="text-green-600">
                      ${(100 - (100 * commissionSettings.default_commission_rate / 100) - ((100 * commissionSettings.stripe_application_fee_percent / 100) + (commissionSettings.stripe_fixed_fee_cents / 100))).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}