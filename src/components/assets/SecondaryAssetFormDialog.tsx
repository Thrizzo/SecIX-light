import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Truck, X, Brain } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useProfiles } from '@/hooks/useProfiles';
import { 
  PrimaryAsset,
  SecondaryAsset, 
  useCreateSecondaryAsset, 
  useUpdateSecondaryAsset, 
  generateAssetId,
} from '@/hooks/useAssets';
import { useToast } from '@/hooks/use-toast';
import { 
  useVendors, 
  useSecondaryAssetVendors, 
  useLinkSecondaryAssetVendor, 
  useUnlinkSecondaryAssetVendor 
} from '@/hooks/useVendors';

interface SecondaryAssetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: string | null;
  primaryAssets: PrimaryAsset[];
  secondaryAssets: SecondaryAsset[];
}

const SecondaryAssetFormDialog: React.FC<SecondaryAssetFormDialogProps> = ({
  open,
  onOpenChange,
  assetId,
  primaryAssets,
  secondaryAssets,
}) => {
  const { toast } = useToast();
  const { data: profiles = [] } = useProfiles();
  const { data: allVendors = [] } = useVendors();
  const { data: linkedVendorsData = [] } = useSecondaryAssetVendors(assetId || undefined);

  const createMutation = useCreateSecondaryAsset();
  const updateMutation = useUpdateSecondaryAsset();
  const linkVendorMutation = useLinkSecondaryAssetVendor();
  const unlinkVendorMutation = useUnlinkSecondaryAssetVendor();

  const existingAsset = assetId ? secondaryAssets.find(a => a.id === assetId) : null;

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
  const [vendorPopoverOpen, setVendorPopoverOpen] = useState(false);
  const [linkedVendorIds, setLinkedVendorIds] = useState<string[]>([]);

  // Sync linked vendors from DB
  useEffect(() => {
    if (linkedVendorsData.length > 0) {
      setLinkedVendorIds(linkedVendorsData.map(lv => lv.vendor_id));
    } else {
      setLinkedVendorIds([]);
    }
  }, [linkedVendorsData]);

  useEffect(() => {
    if (existingAsset) {
      const linkedPrimary = primaryAssets.find(pa => pa.id === existingAsset.primary_asset_id);
      setFormData({
        asset_id: existingAsset.asset_id,
        name: existingAsset.name,
        description: existingAsset.description || '',
        secondary_type: existingAsset.secondary_type,
        primary_asset_id: existingAsset.primary_asset_id || '',
        owner_id: existingAsset.owner_id || '',
        effective_criticality: existingAsset.effective_criticality || '',
        effective_rto_hours: existingAsset.effective_rto_hours?.toString() || '',
        effective_rpo_hours: existingAsset.effective_rpo_hours?.toString() || '',
        deviation_status: existingAsset.deviation_status,
        deviation_reason: existingAsset.deviation_reason || '',
        ai_enabled: existingAsset.ai_enabled || false,
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
  }, [existingAsset, primaryAssets, secondaryAssets, open]);

  useEffect(() => {
    if (!existingAsset && formData.secondary_type) {
      const suggestedId = generateAssetId(formData.secondary_type, secondaryAssets);
      setFormData(prev => ({ ...prev, asset_id: suggestedId }));
    }
  }, [formData.secondary_type, existingAsset, secondaryAssets]);

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
    
    const data: Omit<SecondaryAsset, 'id' | 'created_at' | 'updated_at' | 'created_by'> = {
      asset_id: formData.asset_id,
      name: formData.name,
      description: formData.description || null,
      secondary_type: formData.secondary_type,
      primary_asset_id: formData.primary_asset_id || null,
      owner_id: formData.owner_id || null,
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
      business_unit_id: linkedPrimary?.business_unit_id || null,
      ai_enabled: formData.ai_enabled,
    };

    try {
      let assetRecordId: string;
      
      if (existingAsset) {
        await updateMutation.mutateAsync({ id: existingAsset.id, ...data });
        assetRecordId = existingAsset.id;
        toast({ title: 'Asset updated' });
      } else {
        const result = await createMutation.mutateAsync(data) as { id: string };
        assetRecordId = result.id;
        toast({ title: 'Asset created' });
      }

      // Save linked vendors
      if (existingAsset) {
        const currentVendorIds = linkedVendorsData.map(lv => lv.vendor_id);
        const vendorsToAdd = linkedVendorIds.filter(id => !currentVendorIds.includes(id));
        const vendorsToRemove = currentVendorIds.filter(id => !linkedVendorIds.includes(id));

        for (const vendorId of vendorsToAdd) {
          await linkVendorMutation.mutateAsync({ secondaryAssetId: assetRecordId, vendorId });
        }
        for (const vendorId of vendorsToRemove) {
          await unlinkVendorMutation.mutateAsync({ secondaryAssetId: assetRecordId, vendorId });
        }
      } else if (linkedVendorIds.length > 0) {
        // New asset - link all selected vendors
        for (const vendorId of linkedVendorIds) {
          await linkVendorMutation.mutateAsync({ secondaryAssetId: assetRecordId, vendorId });
        }
      }

      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to save asset', variant: 'destructive' });
    }
  };

  // Show all primary assets (both data and processes) for linking
  // Ensure the currently linked asset is always in the list even if it doesn't match filters
  const availablePrimaryAssets = primaryAssets;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {existingAsset ? 'Edit Secondary Asset' : 'Create Secondary Asset'}
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
              value={formData.primary_asset_id || undefined}
              onValueChange={(v) => setFormData(prev => ({ ...prev, primary_asset_id: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select primary asset" />
              </SelectTrigger>
              <SelectContent className="z-[200] bg-popover">
                {availablePrimaryAssets.length === 0 ? (
                  <div className="px-4 py-2 text-sm text-muted-foreground">
                    No primary assets available
                  </div>
                ) : (
                  availablePrimaryAssets.map(pa => (
                    <SelectItem key={pa.id} value={pa.id}>
                      {pa.name} ({pa.asset_id})
                    </SelectItem>
                  ))
                )}
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
                <SelectContent className="z-[200] bg-popover">
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
                value={formData.owner_id || undefined}
                onValueChange={(v) => setFormData(prev => ({ ...prev, owner_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select owner" />
                </SelectTrigger>
                <SelectContent className="z-[200] bg-popover">
                  {profiles.length === 0 ? (
                    <div className="px-4 py-2 text-sm text-muted-foreground">
                      No users available
                    </div>
                  ) : (
                    profiles.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.full_name || p.email}
                      </SelectItem>
                    ))
                  )}
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
                  value={formData.effective_criticality || undefined}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, effective_criticality: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Use inherited" />
                  </SelectTrigger>
                  <SelectContent className="z-[200] bg-popover">
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
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Brain className="w-4 h-4 text-purple-500" />
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

          {/* Linked Vendors */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Truck className="w-4 h-4" />
              Linked Vendors
            </Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {linkedVendorIds.map(id => {
                const vendor = allVendors.find(v => v.id === id);
                return vendor ? (
                  <Badge key={id} variant="secondary" className="flex items-center gap-1">
                    {vendor.name}
                    <button
                      type="button"
                      onClick={() => setLinkedVendorIds(prev => prev.filter(vid => vid !== id))}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ) : null;
              })}
            </div>
            <Popover open={vendorPopoverOpen} onOpenChange={setVendorPopoverOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="w-full justify-start">
                  <Truck className="w-4 h-4 mr-2" />
                  Add linked vendor...
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-80" align="start">
                <Command>
                  <CommandInput placeholder="Search vendors..." />
                  <CommandList>
                    <CommandEmpty>No vendors found.</CommandEmpty>
                    <CommandGroup>
                      <ScrollArea className="h-48">
                        {allVendors
                          .filter(v => !linkedVendorIds.includes(v.id))
                          .map(vendor => (
                            <CommandItem
                              key={vendor.id}
                              value={vendor.name}
                              onSelect={() => {
                                setLinkedVendorIds(prev => [...prev, vendor.id]);
                                setVendorPopoverOpen(false);
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <Truck className="w-4 h-4 text-muted-foreground" />
                                <span>{vendor.name}</span>
                                <Badge variant="outline" className="text-xs ml-auto">{vendor.status}</Badge>
                              </div>
                            </CommandItem>
                          ))}
                      </ScrollArea>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Link vendors that support or provide this asset.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {existingAsset ? 'Update Asset' : 'Create Asset'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SecondaryAssetFormDialog;