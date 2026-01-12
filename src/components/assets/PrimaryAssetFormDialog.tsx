import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Building2, GitBranch, Database, Link2, X, Truck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useProfiles } from '@/hooks/useProfiles';
import { useBusinessUnits } from '@/hooks/useBusinessUnits';
import { useConfidentialityLevels } from '@/hooks/useConfidentialityLevels';
import { supabase } from '@/integrations/database/client';
import { useQueryClient } from '@tanstack/react-query';
import { 
  PrimaryAsset,
  PrimaryAssetWithBU,
  ProcessLevel,
  useCreatePrimaryAsset, 
  useUpdatePrimaryAsset, 
  generateAssetId,
  getValidParentLevels,
} from '@/hooks/useAssets';
import { useToast } from '@/hooks/use-toast';
import { 
  useVendors, 
  usePrimaryAssetVendors, 
  useLinkPrimaryAssetVendor, 
  useUnlinkPrimaryAssetVendor 
} from '@/hooks/useVendors';

interface PrimaryAssetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: string | null;
  primaryAssets: PrimaryAssetWithBU[];
}

const PrimaryAssetFormDialog: React.FC<PrimaryAssetFormDialogProps> = ({
  open,
  onOpenChange,
  assetId,
  primaryAssets,
}) => {
  const { toast } = useToast();
  const { data: profiles = [] } = useProfiles();
  const { data: businessUnits = [] } = useBusinessUnits();
  const { data: confidentialityLevels = [] } = useConfidentialityLevels();
  const { data: allVendors = [] } = useVendors();
  const { data: linkedVendorsData = [] } = usePrimaryAssetVendors(assetId || undefined);

  const createMutation = useCreatePrimaryAsset();
  const updateMutation = useUpdatePrimaryAsset();
  const linkVendorMutation = useLinkPrimaryAssetVendor();
  const unlinkVendorMutation = useUnlinkPrimaryAssetVendor();

  const existingAsset = assetId ? primaryAssets.find(a => a.id === assetId) : null;

  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    asset_id: '',
    name: '',
    description: '',
    asset_kind: 'data' as 'data' | 'process',
    process_level: '' as ProcessLevel | '',
    parent_primary_asset_id: '',
    inherit_from_parent: true,
    criticality: 'Medium' as 'Low' | 'Medium' | 'High' | 'Critical',
    owner_id: '',
    business_unit_id: '',
    rto_hours: '',
    rpo_hours: '',
    mtd_hours: '',
    bia_completed: false,
    confidentiality_level_id: '',
  });

  const [linkedAssetIds, setLinkedAssetIds] = useState<string[]>([]);
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
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

  const [inheritedValues, setInheritedValues] = useState<{
    business_unit_id?: string;
    owner_id?: string;
    criticality?: string;
    confidentiality_level_id?: string;
  }>({});

  // Load existing asset data
  useEffect(() => {
    if (existingAsset) {
      // Map old 'asset' kind to 'data'
      const mappedKind = existingAsset.asset_kind === 'asset' ? 'data' : existingAsset.asset_kind as 'data' | 'process';
      setFormData({
        asset_id: existingAsset.asset_id,
        name: existingAsset.name,
        description: existingAsset.description || '',
        asset_kind: mappedKind,
        process_level: existingAsset.process_level || '',
        parent_primary_asset_id: existingAsset.parent_primary_asset_id || '',
        inherit_from_parent: existingAsset.inherit_from_parent,
        criticality: existingAsset.criticality || 'Medium',
        owner_id: existingAsset.owner_id || '',
        business_unit_id: existingAsset.business_unit_id || '',
        rto_hours: existingAsset.rto_hours?.toString() || '',
        rpo_hours: existingAsset.rpo_hours?.toString() || '',
        mtd_hours: existingAsset.mtd_hours?.toString() || '',
        bia_completed: existingAsset.bia_completed,
        confidentiality_level_id: existingAsset.confidentiality_level_id || '',
      });
    } else {
      const suggestedId = generateAssetId('Data', primaryAssets);
      setFormData({
        asset_id: suggestedId,
        name: '',
        description: '',
        asset_kind: 'data',
        process_level: '',
        parent_primary_asset_id: '',
        inherit_from_parent: true,
        criticality: 'Medium',
        owner_id: '',
        business_unit_id: '',
        rto_hours: '',
        rpo_hours: '',
        mtd_hours: '',
        bia_completed: false,
        confidentiality_level_id: '',
      });
    }
  }, [existingAsset, primaryAssets, open]);

  // Update asset ID prefix when type changes
  useEffect(() => {
    if (!existingAsset) {
      const prefix = formData.asset_kind === 'process' ? 'Process' : 'Data';
      const suggestedId = generateAssetId(prefix, primaryAssets);
      setFormData(prev => ({ ...prev, asset_id: suggestedId }));
    }
  }, [formData.asset_kind, existingAsset, primaryAssets]);

  // Auto-populate business unit when owner changes
  useEffect(() => {
    if (!formData.owner_id) return;

    // If we're inheriting from a parent process, don't override inherited BU.
    const isInheritingFromParent =
      formData.asset_kind === 'process' &&
      (formData.process_level === 'L2' || formData.process_level === 'L3') &&
      !!formData.parent_primary_asset_id &&
      formData.inherit_from_parent;

    if (isInheritingFromParent) return;

    const selectedProfile = profiles.find((p) => p.id === formData.owner_id);
    if (selectedProfile?.business_unit_id) {
      setFormData((prev) => ({ ...prev, business_unit_id: selectedProfile.business_unit_id || '' }));
    }
  }, [
    formData.owner_id,
    formData.asset_kind,
    formData.process_level,
    formData.parent_primary_asset_id,
    formData.inherit_from_parent,
    profiles,
  ]);

  // Load inherited values from parent
  useEffect(() => {
    if (formData.parent_primary_asset_id && formData.inherit_from_parent) {
      const parent = primaryAssets.find(a => a.id === formData.parent_primary_asset_id);
      if (parent) {
        setInheritedValues({
          business_unit_id: parent.business_unit_id || undefined,
          owner_id: parent.owner_id || undefined,
          criticality: parent.criticality || undefined,
          confidentiality_level_id: parent.confidentiality_level_id || undefined,
        });
      }
    } else {
      setInheritedValues({});
    }
  }, [formData.parent_primary_asset_id, formData.inherit_from_parent, primaryAssets]);

  // Load existing linked assets when editing
  useEffect(() => {
    const loadLinkedAssets = async () => {
      if (existingAsset) {
        const { data } = await supabase
          .from<{ to_entity_id: string }>('asset_relationships')
          .select('to_entity_id')
          .eq('from_entity_id', existingAsset.id)
          .eq('relationship_type', 'TAGGED');
        
        if (data) {
          setLinkedAssetIds(data.map(r => r.to_entity_id));
        }
      } else {
        setLinkedAssetIds([]);
      }
    };
    loadLinkedAssets();
  }, [existingAsset]);

  // Get valid parents based on process level
  const validParentLevels = getValidParentLevels(formData.process_level as ProcessLevel || null);
  const validParents = primaryAssets.filter(
    a => a.asset_kind === 'process' && 
    validParentLevels.includes(a.process_level as ProcessLevel) &&
    a.id !== assetId
  );
  
  // Ensure the currently linked parent is always in the list (for edit mode)
  const currentParent = formData.parent_primary_asset_id 
    ? primaryAssets.find(a => a.id === formData.parent_primary_asset_id)
    : null;
  const parentsForSelect = currentParent && !validParents.find(p => p.id === currentParent.id)
    ? [currentParent, ...validParents]
    : validParents;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate process requirements
    if (formData.asset_kind === 'process' && !formData.process_level) {
      toast({ title: 'Error', description: 'Process level is required for processes', variant: 'destructive' });
      return;
    }

    // Validate parent requirements
    if ((formData.process_level === 'L2' || formData.process_level === 'L3') && !formData.parent_primary_asset_id) {
      toast({ title: 'Error', description: `${formData.process_level} processes require a parent process`, variant: 'destructive' });
      return;
    }

    const isInheritingFromParent =
      formData.asset_kind === 'process' &&
      (formData.process_level === 'L2' || formData.process_level === 'L3') &&
      !!formData.parent_primary_asset_id &&
      formData.inherit_from_parent;

    const effectiveBuIdForLinks = (isInheritingFromParent ? inheritedValues.business_unit_id : formData.business_unit_id) || '';
    if (linkedAssetIds.length > 0 && !effectiveBuIdForLinks) {
      toast({
        title: 'Error',
        description: 'Business unit is required to save linked assets. Pick an owner (auto-fills) or select a business unit.',
        variant: 'destructive',
      });
      return;
    }

    const data: Partial<PrimaryAsset> & { name: string; asset_id: string } = {
      asset_id: formData.asset_id,
      name: formData.name,
      description: formData.description || null,
      primary_type: formData.asset_kind === 'process' ? 'Process' : 'Data',
      asset_kind: formData.asset_kind === 'data' ? 'asset' : 'process', // Map back to DB schema
      process_level: formData.asset_kind === 'process' ? (formData.process_level as ProcessLevel) : null,
      parent_primary_asset_id: formData.asset_kind === 'process' && formData.process_level !== 'L1' 
        ? formData.parent_primary_asset_id || null 
        : null,
      inherit_from_parent: formData.inherit_from_parent,
      criticality: formData.inherit_from_parent && inheritedValues.criticality 
        ? (inheritedValues.criticality as any) 
        : formData.criticality,
      owner_id: formData.inherit_from_parent && inheritedValues.owner_id 
        ? inheritedValues.owner_id 
        : formData.owner_id || null,
      business_unit_id: formData.inherit_from_parent && inheritedValues.business_unit_id 
        ? inheritedValues.business_unit_id 
        : formData.business_unit_id || null,
      rto_hours: formData.rto_hours ? parseFloat(formData.rto_hours) : null,
      rpo_hours: formData.rpo_hours ? parseFloat(formData.rpo_hours) : null,
      mtd_hours: formData.mtd_hours ? parseFloat(formData.mtd_hours) : null,
      bia_completed: formData.bia_completed,
      confidentiality_level_id: formData.inherit_from_parent && inheritedValues.confidentiality_level_id 
        ? inheritedValues.confidentiality_level_id 
        : formData.confidentiality_level_id || null,
    };

    try {
      let assetRecordId: string;
      
      if (existingAsset) {
        await updateMutation.mutateAsync({ id: existingAsset.id, ...data });
        assetRecordId = existingAsset.id;
        toast({ title: 'Asset updated' });
      } else {
        const result = await createMutation.mutateAsync(data);
        assetRecordId = result.id;
        toast({ title: 'Asset created' });
      }

      // Save linked assets as relationships
      const effectiveBuId = formData.business_unit_id || inheritedValues.business_unit_id;
      if (linkedAssetIds.length > 0 && effectiveBuId) {
        const { data: { user } } = await supabase.auth.getUser();

        // Delete existing TAG relationships for this asset
        const { error: deleteError } = await supabase
          .from('asset_relationships')
          .delete()
          .eq('from_entity_id', assetRecordId)
          .eq('relationship_type', 'TAGGED');
        if (deleteError) throw deleteError;

        // Insert new TAG relationships
        const relationships = linkedAssetIds.map((toId) => ({
          from_entity_id: assetRecordId,
          from_entity_type: 'PRIMARY',
          to_entity_id: toId,
          to_entity_type: 'PRIMARY',
          relationship_type: 'TAGGED',
          business_unit_id: effectiveBuId,
          created_by: user?.id,
        }));

        const { error: insertError } = await supabase.from('asset_relationships').insert(relationships);
        if (insertError) throw insertError;

        queryClient.invalidateQueries({ queryKey: ['asset-relationships'] });
      } else if (linkedAssetIds.length === 0 && existingAsset) {
        // Delete all TAG relationships if no linked assets
        const { error: clearError } = await supabase
          .from('asset_relationships')
          .delete()
          .eq('from_entity_id', assetRecordId)
          .eq('relationship_type', 'TAGGED');
        if (clearError) throw clearError;

        queryClient.invalidateQueries({ queryKey: ['asset-relationships'] });
      }

      // Save linked vendors
      if (existingAsset) {
        const currentVendorIds = linkedVendorsData.map(lv => lv.vendor_id);
        const vendorsToAdd = linkedVendorIds.filter(id => !currentVendorIds.includes(id));
        const vendorsToRemove = currentVendorIds.filter(id => !linkedVendorIds.includes(id));

        for (const vendorId of vendorsToAdd) {
          await linkVendorMutation.mutateAsync({ primaryAssetId: assetRecordId, vendorId });
        }
        for (const vendorId of vendorsToRemove) {
          await unlinkVendorMutation.mutateAsync({ primaryAssetId: assetRecordId, vendorId });
        }
      } else if (linkedVendorIds.length > 0) {
        // New asset - link all selected vendors
        for (const vendorId of linkedVendorIds) {
          await linkVendorMutation.mutateAsync({ primaryAssetId: assetRecordId, vendorId });
        }
      }

      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to save asset', variant: 'destructive' });
    }
  };

  const showInheritance = formData.asset_kind === 'process' && 
    (formData.process_level === 'L2' || formData.process_level === 'L3') &&
    formData.parent_primary_asset_id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {existingAsset ? 'Edit Primary Asset' : 'Create Primary Asset'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Info */}
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

          {/* Asset Kind Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Asset Kind</Label>
              <Select
                value={formData.asset_kind}
                onValueChange={(v: 'data' | 'process') => {
                  setFormData(prev => ({ 
                    ...prev, 
                    asset_kind: v,
                    process_level: v === 'data' ? '' : prev.process_level,
                    parent_primary_asset_id: v === 'data' ? '' : prev.parent_primary_asset_id,
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="data">
                    <span className="flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      Data Asset
                    </span>
                  </SelectItem>
                  <SelectItem value="process">
                    <span className="flex items-center gap-2">
                      <GitBranch className="w-4 h-4" />
                      Business Process
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.asset_kind === 'process' && (
              <div className="space-y-2">
                <Label>Process Level *</Label>
                <Select
                  value={formData.process_level || '__NONE__'}
                  onValueChange={(v) => {
                    const level = v === '__NONE__' ? '' : v as ProcessLevel;
                    setFormData(prev => ({ 
                      ...prev, 
                      process_level: level,
                      parent_primary_asset_id: level === 'L1' ? '' : prev.parent_primary_asset_id,
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__NONE__" disabled>Select level</SelectItem>
                    <SelectItem value="L1">L1 - Strategic Process</SelectItem>
                    <SelectItem value="L2">L2 - Tactical Process</SelectItem>
                    <SelectItem value="L3">L3 - Operational Process</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Process Hierarchy (only for L2/L3) */}
          {formData.asset_kind === 'process' && (formData.process_level === 'L2' || formData.process_level === 'L3') && (
            <div className="space-y-4 p-4 rounded-lg border border-primary/20 bg-primary/5">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-primary" />
                <h4 className="font-medium">Process Hierarchy</h4>
              </div>

              <div className="space-y-2">
                <Label>Parent Process *</Label>
                <Select
                  value={formData.parent_primary_asset_id || undefined}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, parent_primary_asset_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent process" />
                  </SelectTrigger>
                  <SelectContent>
                    {parentsForSelect.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        No valid parent processes found. Create a {validParentLevels[0]} process first.
                      </div>
                    ) : (
                      parentsForSelect.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          <span className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{p.process_level}</Badge>
                            {p.name}
                          </span>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {formData.parent_primary_asset_id && (
                <div className="flex items-center gap-3">
                  <Switch
                    checked={formData.inherit_from_parent}
                    onCheckedChange={(v) => setFormData(prev => ({ ...prev, inherit_from_parent: v }))}
                  />
                  <Label className="font-normal">Inherit values from parent process</Label>
                </div>
              )}
            </div>
          )}

          {/* Inherited Values Display */}
          {showInheritance && formData.inherit_from_parent && Object.keys(inheritedValues).length > 0 && (
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <h4 className="text-sm font-medium mb-2">Inherited from parent</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {inheritedValues.business_unit_id && (
                  <div>
                    <span className="text-muted-foreground">Business Unit:</span>
                    <p className="font-medium">
                      {businessUnits.find(bu => bu.id === inheritedValues.business_unit_id)?.name}
                    </p>
                  </div>
                )}
                {inheritedValues.owner_id && (
                  <div>
                    <span className="text-muted-foreground">Owner:</span>
                    <p className="font-medium">
                      {profiles.find(p => p.id === inheritedValues.owner_id)?.full_name}
                    </p>
                  </div>
                )}
                {inheritedValues.criticality && (
                  <div>
                    <span className="text-muted-foreground">Criticality:</span>
                    <p className="font-medium">{inheritedValues.criticality}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Owner & BU (hidden when inheriting) */}
          {(!showInheritance || !formData.inherit_from_parent) && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Owner</Label>
                  <Select
                    value={formData.owner_id}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, owner_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select owner" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.full_name || p.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Business Unit {formData.owner_id ? '(auto-filled)' : ''}</Label>
                  <Select
                    value={formData.business_unit_id}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, business_unit_id: v }))}
                    disabled={!!formData.owner_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select business unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {businessUnits.map(bu => (
                        <SelectItem key={bu.id} value={bu.id}>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-3 h-3" />
                            {bu.name}
                            {bu.is_security_org && <Badge variant="outline" className="text-xs ml-1">Security Org</Badge>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Criticality</Label>
                  <Select
                    value={formData.criticality}
                    onValueChange={(v: 'Low' | 'Medium' | 'High' | 'Critical') => setFormData(prev => ({ ...prev, criticality: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Confidentiality Level</Label>
                  <Select
                    value={formData.confidentiality_level_id}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, confidentiality_level_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      {confidentialityLevels
                        .sort((a, b) => a.rank - b.rank)
                        .map(level => (
                          <SelectItem key={level.id} value={level.id}>
                            {level.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {/* RTO/RPO/MTD */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>RTO (hours)</Label>
              <Input
                type="number"
                step="0.5"
                value={formData.rto_hours}
                onChange={(e) => setFormData(prev => ({ ...prev, rto_hours: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>RPO (hours)</Label>
              <Input
                type="number"
                step="0.5"
                value={formData.rpo_hours}
                onChange={(e) => setFormData(prev => ({ ...prev, rpo_hours: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>MTD (hours)</Label>
              <Input
                type="number"
                step="0.5"
                value={formData.mtd_hours}
                onChange={(e) => setFormData(prev => ({ ...prev, mtd_hours: e.target.value }))}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Linked Assets (Tags) */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              Linked Assets
            </Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {linkedAssetIds.map(id => {
                const asset = primaryAssets.find(a => a.id === id);
                return asset ? (
                  <Badge key={id} variant="secondary" className="flex items-center gap-1">
                    {asset.asset_kind === 'process' && asset.process_level && (
                      <span className="text-xs opacity-70">{asset.process_level}</span>
                    )}
                    {asset.name}
                    <button
                      type="button"
                      onClick={() => setLinkedAssetIds(prev => prev.filter(aid => aid !== id))}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ) : null;
              })}
            </div>
            <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="w-full justify-start">
                  <Link2 className="w-4 h-4 mr-2" />
                  Add linked asset...
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-80" align="start">
                <Command>
                  <CommandInput placeholder="Search assets..." />
                  <CommandList>
                    <CommandEmpty>No assets found.</CommandEmpty>
                    <CommandGroup>
                      <ScrollArea className="h-48">
                        {primaryAssets
                          .filter(a => a.id !== assetId && !linkedAssetIds.includes(a.id))
                          .map(asset => (
                            <CommandItem
                              key={asset.id}
                              value={asset.name}
                              onSelect={() => {
                                setLinkedAssetIds(prev => [...prev, asset.id]);
                                setTagPopoverOpen(false);
                              }}
                            >
                              <div className="flex items-center gap-2">
                                {asset.asset_kind === 'process' ? (
                                  <GitBranch className="w-4 h-4 text-muted-foreground" />
                                ) : (
                                  <Database className="w-4 h-4 text-muted-foreground" />
                                )}
                                {asset.asset_kind === 'process' && asset.process_level && (
                                  <Badge variant="outline" className="text-xs">{asset.process_level}</Badge>
                                )}
                                <span>{asset.name}</span>
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
              Link related primary assets to create relationships visible on the asset map.
            </p>
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

          {/* Actions */}
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

export default PrimaryAssetFormDialog;