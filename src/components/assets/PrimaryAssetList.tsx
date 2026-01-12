import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Database, Edit, Trash2, Building2, GitBranch, Link2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useProfiles } from '@/hooks/useProfiles';
import { useBusinessUnits } from '@/hooks/useBusinessUnits';
import { useAuth } from '@/contexts/AuthContext';
import { 
  PrimaryAsset, 
  PrimaryAssetWithBU,
  useDeletePrimaryAsset,
  formatHours,
} from '@/hooks/useAssets';
import { useConfidentialityLevels } from '@/hooks/useConfidentialityLevels';
import { useToast } from '@/hooks/use-toast';
import PrimaryAssetFormDialog from './PrimaryAssetFormDialog';
import AssetLinkingDialog from './AssetLinkingDialog';

interface PrimaryAssetListProps {
  assets: PrimaryAsset[];
}

const PrimaryAssetList: React.FC<PrimaryAssetListProps> = ({ assets }) => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const { data: profiles = [] } = useProfiles();
  const { data: businessUnits = [] } = useBusinessUnits();
  const { data: confidentialityLevels = [] } = useConfidentialityLevels();
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<PrimaryAsset | null>(null);
  const [linkingAsset, setLinkingAsset] = useState<PrimaryAssetWithBU | null>(null);

  const deleteMutation = useDeletePrimaryAsset();

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setSelectedAsset(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this primary asset? This will affect linked secondary assets.')) {
      try {
        await deleteMutation.mutateAsync(id);
        toast({ title: 'Asset deleted' });
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to delete asset', variant: 'destructive' });
      }
    }
  };

  const filteredAssets = assets.filter(asset =>
    asset.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.asset_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCriticalityColor = (criticality: string | null) => {
    switch (criticality) {
      case 'Critical': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'High': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      case 'Medium': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Low': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getOwnerName = (ownerId: string | null) => {
    if (!ownerId) return 'Unassigned';
    const profile = profiles.find(p => p.id === ownerId);
    return profile?.full_name || profile?.email || 'Unknown';
  };

  const getBusinessUnitName = (buId: string | null | undefined) => {
    if (!buId) return null;
    return businessUnits.find(bu => bu.id === buId)?.name || null;
  };

  const getConfidentialityLevel = (levelId: string | null) => {
    if (!levelId) return null;
    return confidentialityLevels.find(l => l.id === levelId);
  };

  const getConfidentialityColor = (rank: number) => {
    if (rank >= 4) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    if (rank === 3) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
    if (rank === 2) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search assets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {isAdmin && (
          <>
            <Button
              onClick={() => {
                setSelectedAsset(null);
                setDialogOpen(true);
              }}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Primary Asset
            </Button>

            <PrimaryAssetFormDialog
              open={dialogOpen}
              onOpenChange={handleDialogOpenChange}
              assetId={selectedAsset?.id ?? null}
              primaryAssets={assets as PrimaryAssetWithBU[]}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAssets.map((asset) => {
          const confLevel = getConfidentialityLevel(asset.confidentiality_level_id);
          const isProcess = asset.asset_kind === 'process';
          const parentAsset = asset.parent_primary_asset_id 
            ? assets.find(a => a.id === asset.parent_primary_asset_id) 
            : null;
          
          const getProcessLevelColor = (level: string | null) => {
            switch (level) {
              case 'L1': return 'bg-primary text-primary-foreground';
              case 'L2': return 'bg-blue-500 text-white';
              case 'L3': return 'bg-indigo-500 text-white';
              default: return 'bg-muted text-muted-foreground';
            }
          };
          
          return (
            <Card key={asset.id} className={`bg-card border-border hover:shadow-lg transition-shadow ${isProcess ? 'border-l-4 border-l-primary' : ''}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isProcess ? 'bg-primary/20' : 'bg-primary/10'}`}>
                      {isProcess ? (
                        <GitBranch className="w-5 h-5 text-primary" />
                      ) : (
                        <Database className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{asset.name}</h3>
                        {isProcess && asset.process_level && (
                          <Badge className={getProcessLevelColor(asset.process_level)}>
                            {asset.process_level}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{asset.asset_id}</p>
                    </div>
                  </div>
                </div>

                {/* Parent process indicator */}
                {parentAsset && (
                  <div className="mb-3 p-2 rounded bg-muted/50 border border-border text-xs">
                    <span className="text-muted-foreground">Parent: </span>
                    <span className="font-medium">{parentAsset.name}</span>
                    {parentAsset.process_level && (
                      <Badge variant="outline" className="ml-2 text-xs">{parentAsset.process_level}</Badge>
                    )}
                  </div>
                )}

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Type:</span>
                    <div className="flex items-center gap-1">
                      {isProcess && <GitBranch className="w-3 h-3 text-muted-foreground" />}
                      <Badge variant="outline">{isProcess ? 'Process' : asset.primary_type}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Owner:</span>
                    <span className="text-foreground text-xs">{getOwnerName(asset.owner_id)}</span>
                  </div>
                  {getBusinessUnitName(asset.business_unit_id) && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Business Unit:</span>
                      <div className="flex items-center gap-1 text-xs">
                        <Building2 className="w-3 h-3 text-muted-foreground" />
                        <span className="text-foreground">{getBusinessUnitName(asset.business_unit_id)}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Criticality:</span>
                    <Badge className={getCriticalityColor(asset.criticality)}>
                      {asset.criticality || 'Not set'}
                    </Badge>
                  </div>
                  {confLevel && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Confidentiality:</span>
                      <Badge className={getConfidentialityColor(confLevel.rank)}>
                        {confLevel.name}
                      </Badge>
                    </div>
                  )}
                  {asset.rto_hours && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">RTO:</span>
                      <span className="font-medium text-foreground">{formatHours(asset.rto_hours)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">BIA Status:</span>
                    <Badge className={asset.bia_completed ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'}>
                      {asset.bia_completed ? 'Complete' : 'Pending'}
                    </Badge>
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setSelectedAsset(asset);
                        setDialogOpen(true);
                      }}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLinkingAsset(asset as PrimaryAssetWithBU)}
                      title="Link to other assets"
                    >
                      <Link2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(asset.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredAssets.length === 0 && (
        <div className="text-center py-12">
          <Database className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No primary assets found</p>
        </div>
      )}

      {/* Asset Linking Dialog */}
      {linkingAsset && (
        <AssetLinkingDialog
          open={!!linkingAsset}
          onOpenChange={(open) => !open && setLinkingAsset(null)}
          sourceAsset={linkingAsset}
          primaryAssets={assets as PrimaryAssetWithBU[]}
        />
      )}
    </div>
  );
};

export default PrimaryAssetList;
