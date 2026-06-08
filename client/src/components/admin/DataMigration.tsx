import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Database,
  ArrowRight,
  Eye,
  PlayCircle,
  Info
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface MigrationValidation {
  isValid: boolean;
  invalidCommunities: Array<{
    id: string;
    name: string;
    issues: string[];
  }>;
  statistics: {
    totalCommunities: number;
    topLevelCommunities: number;
    subCommunities: number;
    communitiesWithoutPath: number;
    communitiesWithoutLevel: number;
  };
}

interface MigrationReport {
  timestamp: string;
  preCheck: {
    communitiesNeedingMigration: number;
    promptsWithoutSubCommunity: number;
    existingMemberships: number;
    existingAdmins: number;
  };
  results: {
    communitiesUpdated: number;
    errors: number;
    preservedMemberships: number;
    preservedAdmins: number;
  };
  validation: {
    allFieldsValid: boolean;
    dataIntegrityMaintained: boolean;
  };
}

export function DataMigration() {
  const [showReport, setShowReport] = useState(false);
  const [migrationReport, setMigrationReport] = useState<MigrationReport | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Check current migration status
  const { data: statusData, isLoading: statusLoading, refetch: refetchStatus } = useQuery<any>({
    queryKey: ["/api/admin/migrate-sub-communities/status"],
    retry: false,
  });

  // Preview migration (dry run)
  const { data: previewData, isLoading: previewLoading, refetch: refetchPreview } = useQuery<any>({
    queryKey: ["/api/admin/migrate-sub-communities/preview"],
    retry: false,
  });

  // Run migration mutation
  const migrationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/admin/migrate-sub-communities", "POST", {});
      return response;
    },
    onSuccess: (data) => {
      setMigrationReport((data as any).report);
      setShowReport(true);
      setShowConfirmDialog(false);
      // Refetch status after migration
      refetchStatus();
      refetchPreview();
      // Invalidate communities data
      queryClient.invalidateQueries({ queryKey: ["/api/communities"] });
    },
    onError: (error: any) => {
      console.error("Migration failed:", error);
    },
  });

  const handleRunMigration = () => {
    setShowConfirmDialog(true);
  };

  const confirmMigration = () => {
    migrationMutation.mutate();
  };

  const isLoading = statusLoading || previewLoading;
  const needsMigration = statusData?.migrationNeeded || false;
  const validation = statusData?.validation as MigrationValidation | undefined;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Sub-Community Hierarchy Migration
          </CardTitle>
          <CardDescription>
            Migrate existing communities to support the new sub-community hierarchy system.
            This migration will convert all existing communities to top-level communities.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Status */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Current Status</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  refetchStatus();
                  refetchPreview();
                }}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>

            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Loading migration status...
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {needsMigration ? (
                    <>
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                      <span className="font-medium">Migration Required</span>
                      <Badge variant="outline" className="bg-yellow-50">
                        {previewData?.wouldMigrate || 0} communities need migration
                      </Badge>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <span className="font-medium">Migration Complete</span>
                      <Badge variant="outline" className="bg-green-50">
                        All communities migrated
                      </Badge>
                    </>
                  )}
                </div>

                {/* Statistics */}
                {validation && (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Communities</p>
                      <p className="text-2xl font-bold">{validation.statistics.totalCommunities}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Top-Level Communities</p>
                      <p className="text-2xl font-bold">{validation.statistics.topLevelCommunities}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Without Path</p>
                      <p className="text-2xl font-bold text-orange-500">
                        {validation.statistics.communitiesWithoutPath}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Without Level</p>
                      <p className="text-2xl font-bold text-orange-500">
                        {validation.statistics.communitiesWithoutLevel}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Migration Info */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>What this migration does:</AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              <ul className="list-disc list-inside space-y-1">
                <li>Sets all existing communities as top-level communities (level: 0)</li>
                <li>Assigns a unique path to each community (/communityId/)</li>
                <li>Ensures parentCommunityId is null for all existing communities</li>
                <li>Preserves all existing memberships and admin relationships</li>
                <li>Keeps existing prompts accessible without changes</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {needsMigration ? (
              <>
                <Button
                  onClick={handleRunMigration}
                  disabled={migrationMutation.isPending}
                  className="flex items-center gap-2"
                >
                  {migrationMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Running Migration...
                    </>
                  ) : (
                    <>
                      <PlayCircle className="h-4 w-4" />
                      Run Migration
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowReport(!showReport)}
                  disabled={!migrationReport}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {showReport ? "Hide" : "Show"} Last Report
                </Button>
              </>
            ) : (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Migration Complete</AlertTitle>
                <AlertDescription className="text-green-700">
                  All communities have been successfully migrated to support the sub-community hierarchy.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Migration Report */}
          {showReport && migrationReport && (
            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Migration Report</CardTitle>
                <CardDescription>
                  Generated at {new Date(migrationReport.timestamp).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Pre-Check */}
                <div>
                  <h4 className="font-semibold mb-2">Pre-Migration Check</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Communities needing migration:</div>
                    <div className="font-mono">{migrationReport.preCheck.communitiesNeedingMigration}</div>
                    <div>Prompts without subCommunityId:</div>
                    <div className="font-mono">{migrationReport.preCheck.promptsWithoutSubCommunity}</div>
                    <div>Existing memberships:</div>
                    <div className="font-mono">{migrationReport.preCheck.existingMemberships}</div>
                    <div>Existing admins:</div>
                    <div className="font-mono">{migrationReport.preCheck.existingAdmins}</div>
                  </div>
                </div>

                <Separator />

                {/* Results */}
                <div>
                  <h4 className="font-semibold mb-2">Migration Results</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Communities updated:</div>
                    <div className="font-mono text-green-600">{migrationReport.results.communitiesUpdated}</div>
                    <div>Errors:</div>
                    <div className={`font-mono ${migrationReport.results.errors > 0 ? "text-red-600" : "text-green-600"}`}>
                      {migrationReport.results.errors}
                    </div>
                    <div>Preserved memberships:</div>
                    <div className="font-mono">{migrationReport.results.preservedMemberships}</div>
                    <div>Preserved admins:</div>
                    <div className="font-mono">{migrationReport.results.preservedAdmins}</div>
                  </div>
                </div>

                <Separator />

                {/* Validation */}
                <div>
                  <h4 className="font-semibold mb-2">Validation</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {migrationReport.validation.allFieldsValid ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span>All fields valid: {migrationReport.validation.allFieldsValid ? "Yes" : "No"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {migrationReport.validation.dataIntegrityMaintained ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span>Data integrity maintained: {migrationReport.validation.dataIntegrityMaintained ? "Yes" : "No"}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Migration</DialogTitle>
            <DialogDescription className="space-y-3 pt-3">
              <p>You are about to run the sub-community hierarchy migration. This will:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Update {previewData?.wouldMigrate || 0} communities with hierarchy fields</li>
                <li>Set all communities as top-level communities</li>
                <li>Preserve all existing relationships and data</li>
              </ul>
              <Alert className="mt-3">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This migration is idempotent and can be run multiple times safely.
                  However, it's recommended to backup your database before proceeding.
                </AlertDescription>
              </Alert>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowConfirmDialog(false)}
              disabled={migrationMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmMigration}
              disabled={migrationMutation.isPending}
            >
              {migrationMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Run Migration
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}