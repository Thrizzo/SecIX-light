import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Plus, Search, Server, Edit, Trash2, Brain } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useProfiles } from '@/hooks/useRisks';
import { useAuth } from '@/contexts/AuthContext';
import {
  PrimaryAsset,
  SecondaryAsset, 
  useCreateSecondaryAsset, 
  useUpdateSecondaryAsset, 
  useDeleteSecondaryAsset,
  generateAssetId,
  formatHours
} from '@/hooks/useAssets';
import { useToast } from '@/hooks/use-toast';

interface SecondaryAssetListProps {
  secondaryAssets: SecondaryAsset[];
  primaryAssets: PrimaryAsset[];
}

const SecondaryAssetList: React.FC<SecondaryAssetListProps> = ({ secondaryAssets, primaryAssets }) => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const { data: profiles = [] } = useProfiles();
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<SecondaryAsset | null>(null);

  const createMutation = useCreateSecondaryAsset();
  const updateMutation = useUpdateSecondaryAsset();
  const deleteMutation = useDeleteSecondaryAsset();

  const [formData, setFormData] = useState({
    asset_id: '',
    name: '',
    description: '',
    secondary_type: 'IT Service' as SecondaryAsset['secondary_type'],
    primary_asset_id: '',
    owner_id: '',
    effective_criticality: '',
    effective_rto_hours: '',
    effective_rpo_hours: '',
    deviation_status: 'Compliant' as SecondaryAsset['deviation_status'],
    deviation_reason: '',
    ai_enabled: false,
  });

  const [inheritedValues, setInheritedValues] = useState({
    criticality: '',
    rto_hours: '',
    rpo_hours: '',
  });

  useEffect(() => {
    if (selectedAsset) {
      const linkedPrimary = primaryAssets.find(pa => pa.id === selectedAsset.primary_asset_id);
      setFormData({
        asset_id: selectedAsset.asset_id,
        name: selectedAsset.name,
        description: selectedAsset.description || '',
        secondary_type: selectedAsset.secondary_type,
        primary_asset_id: selectedAsset.primary_asset_id || '',
        owner_id: selectedAsset.owner_id || '',
        effective_criticality: selectedAsset.effective_criticality || '',
        effective_rto_hours: selectedAsset.effective_rto_hours?.toString() || '',
        effective_rpo_hours: selectedAsset.effective_rpo_hours?.toString() || '',
        deviation_status: selectedAsset.deviation_status,
        deviation_reason: selectedAsset.deviation_reason || '',
        ai_enabled: selectedAsset.ai_enabled ?? false,
      });
      setInheritedValues({
        criticality: linkedPrimary?.criticality || 'Not set',
        rto_hours: linkedPrimary?.rto_hours?.toString() || 'Not set',
        rpo_hours: linkedPrimary?.rpo_hours?.toString() || 'Not set',
      });
    } else {
      const suggestedId = generateAssetId('IT Service', secondaryAssets);
      setFormData({
        asset_id: suggestedId,
        name: '',
        description: '',
        secondary_type: 'IT Service',
        primary_asset_id: '',
        owner_id: '',
        effective_criticality: '',
        effective_rto_hours: '',
        effective_rpo_hours: '',
        deviation_status: 'Compliant',
        deviation_reason: '',
        ai_enabled: false,
      });
      setInheritedValues({ criticality: '', rto_hours: '', rpo_hours: '' });
    }
  }, [selectedAsset, primaryAssets, secondaryAssets]);

  useEffect(() => {
    if (!selectedAsset && formData.secondary_type) {
      const suggestedId = generateAssetId(formData.secondary_type, secondaryAssets);
      setFormData(prev => ({ ...prev, asset_id: suggestedId }));
    }
  }, [formData.secondary_type, selectedAsset, secondaryAssets]);

  useEffect(() => {
    if (formData.primary_asset_id) {
      const linkedPrimary = primaryAssets.find(pa => pa.id === formData.primary_asset_id);
      if (linkedPrimary) {
        setInheritedValues({
          criticality: linkedPrimary.criticality || 'Not set',
          rto_hours: linkedPrimary.rto_hours?.toString() || 'Not set',
          rpo_hours: linkedPrimary.rpo_hours?.toString() || 'Not set',
        });
      }
    }
  }, [formData.primary_asset_id, primaryAssets]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const linkedPrimary = primaryAssets.find(pa => pa.id === formData.primary_asset_id);
    
    const data = {
      asset_id: formData.asset_id,
      name: formData.name,
      description: formData.description || null,
      secondary_type: formData.secondary_type,
      primary_asset_id: formData.primary_asset_id || null,
      owner_id: formData.owner_id || null,
      business_unit_id: linkedPrimary?.business_unit_id || null,
      inherited_criticality: linkedPrimary?.criticality || null,
      inherited_rto_hours: linkedPrimary?.rto_hours || null,
      inherited_rpo_hours: linkedPrimary?.rpo_hours || null,
      inherited_mtd_hours: linkedPrimary?.mtd_hours || null,
      effective_criticality: formData.effective_criticality || linkedPrimary?.criticality || null,
      effective_rto_hours: formData.effective_rto_hours ? parseFloat(formData.effective_rto_hours) : linkedPrimary?.rto_hours || null,
      effective_rpo_hours: formData.effective_rpo_hours ? parseFloat(formData.effective_rpo_hours) : linkedPrimary?.rpo_hours || null,
      effective_mtd_hours: linkedPrimary?.mtd_hours || null,
      deviation_status: formData.deviation_status,
      deviation_reason: formData.deviation_reason || null,
      ai_enabled: formData.ai_enabled,
    };

    try {
      if (selectedAsset) {
        await updateMutation.mutateAsync({ id: selectedAsset.id, ...data });
        toast({ title: 'Asset updated' });
      } else {
        await createMutation.mutateAsync(data);
        toast({ title: 'Asset created' });
      }
      setDialogOpen(false);
      setSelectedAsset(null);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save asset', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this secondary asset?')) {
      try {
        await deleteMutation.mutateAsync(id);
        toast({ title: 'Asset deleted' });
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to delete asset', variant: 'destructive' });
      }
    }
  };

  const filteredAssets = secondaryAssets.filter(asset =>
    asset.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.asset_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDeviationColor = (status: string) => {
    switch (status) {
      case 'Compliant': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'At Risk': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      case 'Non-Compliant': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-muted text-muted-foreground';
    }
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
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setSelectedAsset(null)} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Secondary Asset
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {selectedAsset ? 'Edit Secondary Asset' : 'Create Secondary Asset'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Asset ID</Label>
                    <Input
                      value={formData.asset_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, asset_id: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Asset Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Linked Primary Asset</Label>
                  <Select
                    value={formData.primary_asset_id}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, primary_asset_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select primary asset" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {primaryAssets.map(pa => (
                        <SelectItem key={pa.id} value={pa.id}>
                          {pa.name} ({pa.asset_id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Asset Type</Label>
                    <Select
                      value={formData.secondary_type}
                      onValueChange={(v: SecondaryAsset['secondary_type']) => setFormData(prev => ({ ...prev, secondary_type: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="IT Service">IT Service</SelectItem>
                        <SelectItem value="Application">Application</SelectItem>
                        <SelectItem value="Location">Location</SelectItem>
                        <SelectItem value="Personnel">Personnel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Owner</Label>
                    <Select
                      value={formData.owner_id}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, owner_id: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select owner" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        {profiles.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.full_name || p.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.primary_asset_id && (
                  <div className="p-4 rounded-lg bg-muted/30 border border-border">
                    <h4 className="text-sm font-medium mb-2">Inherited Values</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Criticality:</span>
                        <p className="font-medium">{inheritedValues.criticality}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">RTO:</span>
                        <p className="font-medium">{inheritedValues.rto_hours}h</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">RPO:</span>
                        <p className="font-medium">{inheritedValues.rpo_hours}h</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Effective Values (Override)</h4>
                  <p className="text-xs text-muted-foreground">Only specify if different from inherited values</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Criticality</Label>
                      <Select
                        value={formData.effective_criticality}
                        onValueChange={(v) => setFormData(prev => ({ ...prev, effective_criticality: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Use inherited" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover">
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                          <SelectItem value="Critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>RTO (hours)</Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={formData.effective_rto_hours}
                        onChange={(e) => setFormData(prev => ({ ...prev, effective_rto_hours: e.target.value }))}
                        placeholder="Use inherited"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>RPO (hours)</Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={formData.effective_rpo_hours}
                        onChange={(e) => setFormData(prev => ({ ...prev, effective_rpo_hours: e.target.value }))}
                        placeholder="Use inherited"
                      />
                    </div>
                  </div>
                </div>

                {/* AI Enabled Toggle */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-accent/40 flex items-center justify-center">
                      <Brain className="w-4 h-4 text-accent-foreground" />
                    </div>
                    <div>
                      <Label htmlFor="ai-enabled" className="text-sm font-medium">AI Enabled</Label>
                      <p className="text-xs text-muted-foreground">
                        Enable to track this asset in the AI Governance Register
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="ai-enabled"
                    checked={formData.ai_enabled}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ai_enabled: checked }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => {
                    setDialogOpen(false);
                    setSelectedAsset(null);
                  }}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {selectedAsset ? 'Update Asset' : 'Create Asset'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredAssets.map((asset) => {
          const primaryAsset = primaryAssets.find(pa => pa.id === asset.primary_asset_id);
          return (
            <Card key={asset.id} className="bg-card border-border hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Server className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{asset.name}</h3>
                      <p className="text-sm text-muted-foreground">{asset.asset_id}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Type:</span>
                    <div className="flex items-center gap-2">
                      {asset.ai_enabled && (
                        <Badge variant="outline" className="bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30">
                          <Brain className="w-3 h-3 mr-1" />
                          AI
                        </Badge>
                      )}
                      <Badge variant="outline">{asset.secondary_type}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Primary:</span>
                    <span className="text-foreground text-xs">{primaryAsset?.name || 'Not linked'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge className={getDeviationColor(asset.deviation_status)}>
                      {asset.deviation_status}
                    </Badge>
                  </div>
                  {asset.effective_rto_hours && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">RTO:</span>
                      <span className="font-medium text-foreground">{formatHours(asset.effective_rto_hours)}</span>
                    </div>
                  )}
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
          <Server className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No secondary assets found</p>
        </div>
      )}
    </div>
  );
};

export default SecondaryAssetList;
