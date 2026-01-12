import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Database, Server, GitBranch, Building2, User, Clock, Shield, 
  Link2, Plus, Trash2, ArrowRight
} from 'lucide-react';
import { usePrimaryAssets, useSecondaryAssets, useLinkedProcesses, formatHours } from '@/hooks/useAssets';
import { useBusinessUnits } from '@/hooks/useBusinessUnits';
import { useProfiles } from '@/hooks/useProfiles';
import { useConfidentialityLevels } from '@/hooks/useConfidentialityLevels';
import { format } from 'date-fns';

interface AssetDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: string | null;
  assetType: 'PRIMARY' | 'SECONDARY';
}

const AssetDetailSheet: React.FC<AssetDetailSheetProps> = ({
  open,
  onOpenChange,
  assetId,
  assetType,
}) => {
  const { data: primaryAssets = [] } = usePrimaryAssets();
  const { data: secondaryAssets = [] } = useSecondaryAssets();
  const { data: businessUnits = [] } = useBusinessUnits();
  const { data: profiles = [] } = useProfiles();
  const { data: confidentialityLevels = [] } = useConfidentialityLevels();
  const { data: linkedProcesses = [] } = useLinkedProcesses(assetId || '', assetType);

  const asset = assetType === 'PRIMARY' 
    ? primaryAssets.find(a => a.id === assetId)
    : secondaryAssets.find(a => a.id === assetId);

  if (!asset) return null;

  const isPrimary = assetType === 'PRIMARY';
  const primaryAsset = isPrimary ? asset as typeof primaryAssets[0] : null;
  const secondaryAsset = !isPrimary ? asset as typeof secondaryAssets[0] : null;

  const getOwnerName = (ownerId: string | null) => {
    if (!ownerId) return 'Unassigned';
    const profile = profiles.find(p => p.id === ownerId);
    return profile?.full_name || profile?.email || 'Unknown';
  };

  const getBusinessUnitName = (buId: string | null) => {
    if (!buId) return 'Not assigned';
    return businessUnits.find(bu => bu.id === buId)?.name || 'Unknown';
  };

  const getConfidentialityLevel = (levelId: string | null) => {
    if (!levelId) return null;
    return confidentialityLevels.find(l => l.id === levelId);
  };

  const getCriticalityColor = (criticality: string | null) => {
    switch (criticality) {
      case 'Critical': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'High': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      case 'Medium': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Low': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTypeIcon = () => {
    if (!isPrimary) return <Server className="w-5 h-5" />;
    if (primaryAsset?.asset_kind === 'process') return <GitBranch className="w-5 h-5" />;
    return <Database className="w-5 h-5" />;
  };

  const getTypeLabel = () => {
    if (!isPrimary) return secondaryAsset?.secondary_type || 'Secondary';
    if (primaryAsset?.asset_kind === 'process') return `Process ${primaryAsset.process_level}`;
    return primaryAsset?.primary_type || 'Primary';
  };

  // Get parent process for child processes
  const parentProcess = primaryAsset?.parent_primary_asset_id 
    ? primaryAssets.find(a => a.id === primaryAsset.parent_primary_asset_id)
    : null;

  // Get child processes
  const childProcesses = isPrimary && primaryAsset?.asset_kind === 'process'
    ? primaryAssets.filter(a => a.parent_primary_asset_id === assetId)
    : [];

  // Get linked primary asset for secondary
  const linkedPrimaryAsset = secondaryAsset?.primary_asset_id
    ? primaryAssets.find(a => a.id === secondaryAsset.primary_asset_id)
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              {getTypeIcon()}
            </div>
            <div className="flex-1">
              <SheetTitle className="text-xl">{asset.name}</SheetTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{asset.asset_id}</Badge>
                <Badge variant="outline">{getTypeLabel()}</Badge>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Description */}
          {asset.description && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Description</h4>
              <p className="text-sm">{asset.description}</p>
            </div>
          )}

          <Separator />

          {/* Core Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="w-4 h-4" />
                <span className="text-sm">Business Unit</span>
              </div>
              <p className="font-medium">{getBusinessUnitName(asset.business_unit_id)}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="w-4 h-4" />
                <span className="text-sm">Owner</span>
              </div>
              <p className="font-medium">{getOwnerName(asset.owner_id)}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Shield className="w-4 h-4" />
                <span className="text-sm">Criticality</span>
              </div>
              <Badge className={getCriticalityColor(
                isPrimary ? primaryAsset?.criticality || null : secondaryAsset?.effective_criticality || null
              )}>
                {isPrimary ? primaryAsset?.criticality : secondaryAsset?.effective_criticality || 'Not set'}
              </Badge>
            </div>
            {isPrimary && primaryAsset?.confidentiality_level_id && (
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Confidentiality</span>
                <p className="font-medium">
                  {getConfidentialityLevel(primaryAsset.confidentiality_level_id)?.name}
                </p>
              </div>
            )}
          </div>

          {/* RTO/RPO/MTD */}
          <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-muted/30">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-sm">RTO</span>
              </div>
              <p className="font-semibold">
                {formatHours(isPrimary ? primaryAsset?.rto_hours : secondaryAsset?.effective_rto_hours)}
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-sm">RPO</span>
              </div>
              <p className="font-semibold">
                {formatHours(isPrimary ? primaryAsset?.rpo_hours : secondaryAsset?.effective_rpo_hours)}
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-sm">MTD</span>
              </div>
              <p className="font-semibold">
                {formatHours(isPrimary ? primaryAsset?.mtd_hours : secondaryAsset?.effective_mtd_hours)}
              </p>
            </div>
          </div>

          {/* Process Hierarchy (for processes) */}
          {isPrimary && primaryAsset?.asset_kind === 'process' && (
            <>
              <Separator />
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <GitBranch className="w-4 h-4" />
                    Process Hierarchy
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {parentProcess && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                      <Badge variant="outline">{parentProcess.process_level}</Badge>
                      <span className="font-medium">{parentProcess.name}</span>
                      <span className="text-muted-foreground text-sm">(Parent)</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20">
                    <Badge>{primaryAsset.process_level}</Badge>
                    <span className="font-medium">{primaryAsset.name}</span>
                    <span className="text-muted-foreground text-sm">(Current)</span>
                  </div>

                  {childProcesses.length > 0 && (
                    <div className="pl-4 border-l-2 border-muted space-y-2">
                      {childProcesses.map(child => (
                        <div key={child.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                          <Badge variant="outline">{child.process_level}</Badge>
                          <span className="font-medium">{child.name}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {!parentProcess && childProcesses.length === 0 && (
                    <p className="text-sm text-muted-foreground">No related processes</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* Linked Primary Asset (for secondary assets) */}
          {!isPrimary && linkedPrimaryAsset && (
            <>
              <Separator />
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Link2 className="w-4 h-4" />
                    Linked Primary Asset
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Database className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium">{linkedPrimaryAsset.name}</p>
                      <p className="text-sm text-muted-foreground">{linkedPrimaryAsset.asset_id}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Linked Processes (for non-process assets) */}
          {linkedProcesses.length > 0 && (
            <>
              <Separator />
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <GitBranch className="w-4 h-4" />
                    Linked Processes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {linkedProcesses.map((link: any) => (
                    <div key={link.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <GitBranch className="w-5 h-5 text-primary" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{link.process?.process_level}</Badge>
                          <span className="font-medium">{link.process?.name}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{link.link_type}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}

          {/* Deviation Status (for secondary assets) */}
          {!isPrimary && secondaryAsset && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Deviation Status</h4>
                <Badge className={
                  secondaryAsset.deviation_status === 'Compliant' 
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : secondaryAsset.deviation_status === 'At Risk'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                }>
                  {secondaryAsset.deviation_status}
                </Badge>
                {secondaryAsset.deviation_reason && (
                  <p className="text-sm mt-2 text-muted-foreground">{secondaryAsset.deviation_reason}</p>
                )}
              </div>
            </>
          )}

          {/* Timestamps */}
          <Separator />
          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div>
              <span>Created:</span>
              <p className="text-foreground">{format(new Date(asset.created_at), 'MMM d, yyyy')}</p>
            </div>
            <div>
              <span>Updated:</span>
              <p className="text-foreground">{format(new Date(asset.updated_at), 'MMM d, yyyy')}</p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AssetDetailSheet;