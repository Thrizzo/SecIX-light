import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Link2, Trash2, ArrowRight, Database, GitBranch } from 'lucide-react';
import { 
  PrimaryAssetWithBU, 
  AssetRelationshipType,
  useCreateAssetRelationship,
  useDeleteAssetRelationship,
  useAssetRelationships,
} from '@/hooks/useAssets';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface AssetLinkingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceAsset: PrimaryAssetWithBU;
  primaryAssets: PrimaryAssetWithBU[];
}

const RELATIONSHIP_TYPES: { value: AssetRelationshipType; label: string; description: string }[] = [
  { value: 'TAGGED', label: 'Tagged/Related', description: 'Assets are related or grouped together' },
  { value: 'DATA_FLOW', label: 'Data Flow', description: 'Data flows from source to target' },
  { value: 'DEPENDS_ON', label: 'Depends On', description: 'Source depends on target' },
  { value: 'SUPPORTS', label: 'Supports', description: 'Source supports target' },
  { value: 'USES', label: 'Uses', description: 'Source uses target' },
  { value: 'PRODUCES', label: 'Produces', description: 'Source produces target' },
  { value: 'CONTAINS', label: 'Contains', description: 'Source contains target' },
];

const AssetLinkingDialog: React.FC<AssetLinkingDialogProps> = ({
  open,
  onOpenChange,
  sourceAsset,
  primaryAssets,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: relationships = [] } = useAssetRelationships();
  const createRelationship = useCreateAssetRelationship();
  const deleteRelationship = useDeleteAssetRelationship();

  const [formData, setFormData] = useState({
    targetAssetId: '',
    relationshipType: '' as AssetRelationshipType | '',
    dataFlowLabel: '',
    notes: '',
  });

  // Get existing links for this asset
  const existingLinks = relationships.filter(
    r => (r.from_entity_id === sourceAsset.id && r.from_entity_type === 'PRIMARY') ||
         (r.to_entity_id === sourceAsset.id && r.to_entity_type === 'PRIMARY')
  );

  // Available targets (exclude self)
  const availableTargets = primaryAssets.filter(a => a.id !== sourceAsset.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.targetAssetId || !formData.relationshipType) {
      toast({ title: 'Error', description: 'Please select a target asset and relationship type', variant: 'destructive' });
      return;
    }

    try {
      await createRelationship.mutateAsync({
        business_unit_id: sourceAsset.business_unit_id || '',
        from_entity_type: 'PRIMARY',
        from_entity_id: sourceAsset.id,
        to_entity_type: 'PRIMARY',
        to_entity_id: formData.targetAssetId,
        relationship_type: formData.relationshipType,
        data_flow_label: formData.dataFlowLabel || null,
        data_sensitivity: null,
        notes: formData.notes || null,
      });
      
      toast({ title: 'Link created' });
      setFormData({
        targetAssetId: '',
        relationshipType: '',
        dataFlowLabel: '',
        notes: '',
      });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to create link', variant: 'destructive' });
    }
  };

  const handleDeleteLink = async (id: string) => {
    if (confirm('Delete this link?')) {
      try {
        await deleteRelationship.mutateAsync(id);
        toast({ title: 'Link deleted' });
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to delete link', variant: 'destructive' });
      }
    }
  };

  const getAssetById = (id: string) => primaryAssets.find(a => a.id === id);

  const getAssetIcon = (asset: PrimaryAssetWithBU) => {
    return asset.asset_kind === 'process' ? GitBranch : Database;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Link Assets
          </DialogTitle>
          <DialogDescription>
            Create relationships between "{sourceAsset.name}" and other primary assets
          </DialogDescription>
        </DialogHeader>

        {/* Existing Links */}
        {existingLinks.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Existing Links</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {existingLinks.map(link => {
                const isSource = link.from_entity_id === sourceAsset.id;
                const otherAssetId = isSource ? link.to_entity_id : link.from_entity_id;
                const otherAsset = getAssetById(otherAssetId);
                const OtherIcon = otherAsset ? getAssetIcon(otherAsset) : Database;

                return (
                  <div key={link.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-2 text-sm">
                      {isSource ? (
                        <>
                          <span className="text-muted-foreground">This asset</span>
                          <Badge variant="secondary" className="text-xs">{link.relationship_type}</Badge>
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          <OtherIcon className="w-4 h-4 text-primary" />
                          <span className="font-medium">{otherAsset?.name || 'Unknown'}</span>
                        </>
                      ) : (
                        <>
                          <OtherIcon className="w-4 h-4 text-primary" />
                          <span className="font-medium">{otherAsset?.name || 'Unknown'}</span>
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          <Badge variant="secondary" className="text-xs">{link.relationship_type}</Badge>
                          <span className="text-muted-foreground">This asset</span>
                        </>
                      )}
                      {link.data_flow_label && (
                        <Badge variant="outline" className="text-xs ml-2">{link.data_flow_label}</Badge>
                      )}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => handleDeleteLink(link.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* New Link Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create New Link
          </h4>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Target Asset *</Label>
              <Select
                value={formData.targetAssetId}
                onValueChange={(v) => setFormData(prev => ({ ...prev, targetAssetId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select target asset" />
                </SelectTrigger>
                <SelectContent>
                  {availableTargets.map(asset => {
                    const Icon = getAssetIcon(asset);
                    return (
                      <SelectItem key={asset.id} value={asset.id}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          {asset.name}
                          {asset.asset_kind === 'process' && asset.process_level && (
                            <Badge variant="outline" className="text-xs ml-1">{asset.process_level}</Badge>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Relationship Type *</Label>
              <Select
                value={formData.relationshipType}
                onValueChange={(v: AssetRelationshipType) => setFormData(prev => ({ ...prev, relationshipType: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONSHIP_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-xs text-muted-foreground">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.relationshipType === 'DATA_FLOW' && (
            <div className="space-y-2">
              <Label>Data Flow Label</Label>
              <Textarea
                value={formData.dataFlowLabel}
                onChange={(e) => setFormData(prev => ({ ...prev, dataFlowLabel: e.target.value }))}
                placeholder="e.g., Customer PII, Order data, Analytics events"
                rows={2}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes about this relationship..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button type="submit" disabled={createRelationship.isPending} className="gap-2">
              <Link2 className="w-4 h-4" />
              Create Link
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AssetLinkingDialog;
