import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db as supabase } from '@/integrations/database/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  useRiskCategories, 
  useCreateRisk, 
  useUpdateRisk, 
  useRiskAssetLinks,
  useCreateRiskAssetLink,
  useDeleteRiskAssetLink,
  Risk, 
  RiskSeverity, 
  RiskLikelihood, 
  RiskStatus, 
  RiskLevel,
  RiskAssetLinkType,
  calculateRiskScore, 
  getRiskLevel 
} from '@/hooks/useRisks';
import { usePrimaryAssets, useSecondaryAssets } from '@/hooks/useAssets';
import { useBusinessUnits } from '@/hooks/useBusinessUnits';
import { useProfiles } from '@/hooks/useProfiles';
import { 
  useControls, 
  useRiskControls, 
  useAddRiskControl, 
  useRemoveRiskControl,
  RiskControlEffectiveness 
} from '@/hooks/useControls';
import { z } from 'zod';
import { AlertTriangle, Link2, X, Building2, Server, Database, ShieldCheck, Plus, CheckCircle2, XCircle } from 'lucide-react';

interface CompletedTreatment {
  id: string;
  risk_id: string;
  status: string;
  residual_severity?: string;
  residual_likelihood?: string;
  completed_at?: string;
}

// Hook to fetch completed treatments for a risk
const useCompletedTreatments = (riskId?: string) => {
  return useQuery({
    queryKey: ['completed-treatments', riskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('risk_treatments')
        .select('*')
        .eq('risk_id', riskId!)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      if (error) throw error;
      return data as CompletedTreatment[];
    },
    enabled: !!riskId,
  });
};

const riskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  category_id: z.string().optional(),
  owner_id: z.string().optional(),
  risk_level: z.enum(['organizational', 'operational', 'technical']).optional(),
  inherent_severity: z.enum(['critical', 'high', 'medium', 'low', 'negligible']),
  inherent_likelihood: z.enum(['almost_certain', 'likely', 'possible', 'unlikely', 'rare']),
  net_severity: z.enum(['critical', 'high', 'medium', 'low', 'negligible']).optional(),
  net_likelihood: z.enum(['almost_certain', 'likely', 'possible', 'unlikely', 'rare']).optional(),
  status: z.enum(['draft', 'pending_review', 'approved', 'active', 'monitoring', 'treated', 'closed', 'archived']).optional(),
  treatment_plan: z.string().max(2000, 'Treatment plan must be less than 2000 characters').optional(),
  review_date: z.string().optional(),
});

interface RiskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  risk?: Risk | null;
}

const RISK_LEVELS: { value: RiskLevel; label: string; description: string }[] = [
  { value: 'organizational', label: 'Organizational', description: 'Strategic/enterprise-level risks' },
  { value: 'operational', label: 'Operational', description: 'Business process risks' },
  { value: 'technical', label: 'Technical', description: 'IT/infrastructure risks' },
];

const LINK_TYPES: { value: RiskAssetLinkType; label: string }[] = [
  { value: 'in_scope', label: 'In Scope' },
  { value: 'impacted', label: 'Impacted' },
  { value: 'root_cause', label: 'Root Cause' },
  { value: 'other', label: 'Other' },
];

const EFFECTIVENESS_RATINGS: { value: RiskControlEffectiveness; label: string }[] = [
  { value: 'high', label: 'High' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'low', label: 'Low' },
  { value: 'ineffective', label: 'Ineffective' },
];

const getEffectivenessColor = (rating: RiskControlEffectiveness) => {
  switch (rating) {
    case 'high': return 'bg-emerald-100 text-emerald-800';
    case 'moderate': return 'bg-blue-100 text-blue-800';
    case 'low': return 'bg-amber-100 text-amber-800';
    case 'ineffective': return 'bg-red-100 text-red-800';
  }
};

export const RiskFormDialog: React.FC<RiskFormDialogProps> = ({
  open,
  onOpenChange,
  risk,
}) => {
  const { data: categories } = useRiskCategories();
  const { data: profiles } = useProfiles();
  const { data: businessUnits } = useBusinessUnits();
  const { data: primaryAssets } = usePrimaryAssets();
  const { data: secondaryAssets } = useSecondaryAssets();
  const { data: assetLinks, refetch: refetchLinks } = useRiskAssetLinks(risk?.id);
  const { data: controls } = useControls();
  const { data: riskControls, refetch: refetchControls } = useRiskControls(risk?.id);
  const { data: completedTreatments } = useCompletedTreatments(risk?.id);
  
  const createRisk = useCreateRisk();
  const updateRisk = useUpdateRisk();
  const createAssetLink = useCreateRiskAssetLink();
  const deleteAssetLink = useDeleteRiskAssetLink();
  const addRiskControl = useAddRiskControl();
  const removeRiskControl = useRemoveRiskControl();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: '',
    owner_id: '',
    business_unit_id: '',
    risk_level: 'operational' as RiskLevel,
    inherent_severity: 'medium' as RiskSeverity,
    inherent_likelihood: 'possible' as RiskLikelihood,
    net_severity: '' as RiskSeverity | '',
    net_likelihood: '' as RiskLikelihood | '',
    status: 'draft' as RiskStatus,
    treatment_action: '' as string,
    review_date: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedAssetType, setSelectedAssetType] = useState<'primary' | 'secondary'>('primary');
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [selectedLinkType, setSelectedLinkType] = useState<RiskAssetLinkType>('in_scope');
  const [selectedControlId, setSelectedControlId] = useState('');
  const [selectedEffectiveness, setSelectedEffectiveness] = useState<RiskControlEffectiveness>('moderate');

  // Get the latest completed treatment for residual risk display
  const latestCompletedTreatment = completedTreatments?.[0];
  const hasResidualRisk = latestCompletedTreatment?.residual_severity && latestCompletedTreatment?.residual_likelihood;
  
  const residualScore = hasResidualRisk 
    ? calculateRiskScore(
        latestCompletedTreatment.residual_severity as RiskSeverity, 
        latestCompletedTreatment.residual_likelihood as RiskLikelihood
      )
    : null;
  const residualLevel = residualScore ? getRiskLevel(residualScore) : null;

  useEffect(() => {
    if (risk) {
      setFormData({
        title: risk.title,
        description: risk.description || '',
        category_id: risk.category_id || '',
        owner_id: risk.owner_id || '',
        business_unit_id: (risk as any).business_unit_id || '',
        risk_level: risk.risk_level || 'operational',
        inherent_severity: risk.inherent_severity,
        inherent_likelihood: risk.inherent_likelihood,
        net_severity: risk.net_severity || '',
        net_likelihood: risk.net_likelihood || '',
        status: risk.status,
        treatment_action: (risk as any).treatment_action || '',
        review_date: risk.review_date || '',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        category_id: '',
        owner_id: '',
        business_unit_id: '',
        risk_level: 'operational',
        inherent_severity: 'medium',
        inherent_likelihood: 'possible',
        net_severity: '',
        net_likelihood: '',
        status: 'draft',
        treatment_action: '',
        review_date: '',
      });
    }
    setErrors({});
    setSelectedAssetId('');
    setSelectedControlId('');
  }, [risk, open]);

  // Auto-populate business unit when owner changes
  useEffect(() => {
    if (formData.owner_id && profiles) {
      const selectedProfile = profiles.find(p => p.user_id === formData.owner_id);
      if (selectedProfile?.business_unit_id) {
        setFormData(prev => ({ ...prev, business_unit_id: selectedProfile.business_unit_id || '' }));
      }
    }
  }, [formData.owner_id, profiles]);

  const handleAddControl = async () => {
    if (!risk?.id || !selectedControlId) return;
    
    try {
      await addRiskControl.mutateAsync({
        risk_id: risk.id,
        control_id: selectedControlId,
        effectiveness_rating: selectedEffectiveness,
      });
      setSelectedControlId('');
      refetchControls();
    } catch {
      // Error handled by mutation
    }
  };

  const handleRemoveControl = async (riskControlId: string) => {
    if (!risk?.id) return;
    try {
      await removeRiskControl.mutateAsync({ id: riskControlId, riskId: risk.id });
      refetchControls();
    } catch {
      // Error handled by mutation
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = riskSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    const submitData = {
      title: formData.title,
      description: formData.description || undefined,
      category_id: formData.category_id || undefined,
      owner_id: formData.owner_id || undefined,
      business_unit_id: formData.business_unit_id || undefined,
      risk_level: formData.risk_level,
      inherent_severity: formData.inherent_severity,
      inherent_likelihood: formData.inherent_likelihood,
      net_severity: formData.net_severity || undefined,
      net_likelihood: formData.net_likelihood || undefined,
      status: formData.status,
      review_date: formData.review_date || undefined,
    } as any;
    
    if (formData.treatment_action) {
      submitData.treatment_action = formData.treatment_action;
    }

    try {
      if (risk) {
        await updateRisk.mutateAsync({ id: risk.id, ...submitData });
      } else {
        await createRisk.mutateAsync(submitData);
      }
      onOpenChange(false);
    } catch {
      // Error handled by mutation
    }
  };

  const handleAddAssetLink = async () => {
    if (!risk?.id || !selectedAssetId) return;
    
    try {
      await createAssetLink.mutateAsync({
        risk_id: risk.id,
        primary_asset_id: selectedAssetType === 'primary' ? selectedAssetId : undefined,
        secondary_asset_id: selectedAssetType === 'secondary' ? selectedAssetId : undefined,
        link_type: selectedLinkType,
      });
      setSelectedAssetId('');
      refetchLinks();
    } catch {
      // Error handled by mutation
    }
  };

  const handleRemoveAssetLink = async (linkId: string) => {
    if (!risk?.id) return;
    try {
      await deleteAssetLink.mutateAsync({ id: linkId, riskId: risk.id });
      refetchLinks();
    } catch {
      // Error handled by mutation
    }
  };

  const inherentScore = calculateRiskScore(formData.inherent_severity, formData.inherent_likelihood);
  const inherentLevel = getRiskLevel(inherentScore);

  const netScore = formData.net_severity && formData.net_likelihood
    ? calculateRiskScore(formData.net_severity, formData.net_likelihood)
    : null;
  const netLevel = netScore ? getRiskLevel(netScore) : null;

  const isLoading = createRisk.isPending || updateRisk.isPending;

  const getRiskLevelColor = (level: RiskLevel) => {
    switch (level) {
      case 'organizational': return 'bg-purple-100 text-purple-800';
      case 'operational': return 'bg-blue-100 text-blue-800';
      case 'technical': return 'bg-emerald-100 text-emerald-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-primary" />
            {risk ? 'Edit Risk' : 'Add New Risk'}
          </DialogTitle>
          <DialogDescription>
            {risk ? 'Update the risk details below.' : 'Enter the details for the new risk assessment.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Risk Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter a descriptive title..."
              />
              {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the risk in detail..."
                rows={3}
              />
              {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Risk Level</Label>
                <Select
                  value={formData.risk_level}
                  onValueChange={(v) => setFormData({ ...formData, risk_level: v as RiskLevel })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {RISK_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        <div className="flex flex-col">
                          <span>{level.label}</span>
                          <span className="text-xs text-muted-foreground">{level.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(v) => setFormData({ ...formData, category_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                          {cat.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Owner</Label>
                <Select
                  value={formData.owner_id}
                  onValueChange={(v) => setFormData({ ...formData, owner_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select owner" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles?.map((profile) => (
                      <SelectItem key={profile.user_id} value={profile.user_id}>
                        {profile.full_name || profile.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Asset Linking - Only show for existing risks */}
          {risk && (
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                <h3 className="font-medium">Linked Assets</h3>
              </div>

              {/* Existing Links */}
              {assetLinks && assetLinks.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {assetLinks.map((link: any) => {
                    const asset = link.primary_assets || link.secondary_assets;
                    const isPrimary = !!link.primary_assets;
                    return (
                      <Badge 
                        key={link.id} 
                        variant="outline" 
                        className="flex items-center gap-2 py-1.5 px-3"
                      >
                        {isPrimary ? (
                          <Database className="w-3 h-3 text-indigo-500" />
                        ) : (
                          <Server className="w-3 h-3 text-blue-500" />
                        )}
                        <span>{asset?.name || 'Unknown'}</span>
                        <span className="text-xs text-muted-foreground">({link.link_type})</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAssetLink(link.id)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}

              {/* Add New Link */}
              <div className="grid grid-cols-4 gap-2">
                <Select
                  value={selectedAssetType}
                  onValueChange={(v) => {
                    setSelectedAssetType(v as 'primary' | 'secondary');
                    setSelectedAssetId('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">Primary Asset</SelectItem>
                    <SelectItem value="secondary">Secondary Asset</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={selectedAssetId}
                  onValueChange={setSelectedAssetId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select asset..." />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedAssetType === 'primary' 
                      ? primaryAssets?.map((asset) => (
                          <SelectItem key={asset.id} value={asset.id}>
                            {asset.name} ({asset.asset_id})
                          </SelectItem>
                        ))
                      : secondaryAssets?.map((asset) => (
                          <SelectItem key={asset.id} value={asset.id}>
                            {asset.name} ({asset.asset_id})
                          </SelectItem>
                        ))
                    }
                  </SelectContent>
                </Select>

                <Select
                  value={selectedLinkType}
                  onValueChange={(v) => setSelectedLinkType(v as RiskAssetLinkType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LINK_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddAssetLink}
                  disabled={!selectedAssetId || createAssetLink.isPending}
                >
                  <Link2 className="w-4 h-4 mr-2" />
                  Link
                </Button>
              </div>
            </div>
          )}

          {/* Inherent Risk */}
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Inherent Risk</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Score:</span>
                <span className={`font-mono font-bold text-lg text-severity-${inherentLevel}`}>
                  {inherentScore}
                </span>
                <span className={`text-sm capitalize text-severity-${inherentLevel}`}>
                  ({inherentLevel})
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Severity *</Label>
                <Select
                  value={formData.inherent_severity}
                  onValueChange={(v) => setFormData({ ...formData, inherent_severity: v as RiskSeverity })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical (5)</SelectItem>
                    <SelectItem value="high">High (4)</SelectItem>
                    <SelectItem value="medium">Medium (3)</SelectItem>
                    <SelectItem value="low">Low (2)</SelectItem>
                    <SelectItem value="negligible">Negligible (1)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Likelihood *</Label>
                <Select
                  value={formData.inherent_likelihood}
                  onValueChange={(v) => setFormData({ ...formData, inherent_likelihood: v as RiskLikelihood })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="almost_certain">Almost Certain (5)</SelectItem>
                    <SelectItem value="likely">Likely (4)</SelectItem>
                    <SelectItem value="possible">Possible (3)</SelectItem>
                    <SelectItem value="unlikely">Unlikely (2)</SelectItem>
                    <SelectItem value="rare">Rare (1)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Controls in Place - Only show for existing risks */}
          {risk && (
            <div className="space-y-4 p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-medium">Controls in Place</h3>
                </div>
                <span className="text-sm text-muted-foreground">
                  {riskControls?.length || 0} control(s) applied
                </span>
              </div>

              {/* Existing Controls */}
              {riskControls && riskControls.length > 0 && (
                <div className="space-y-2">
                  {riskControls.map((rc: any) => {
                    const control = rc.controls;
                    return (
                      <div 
                        key={rc.id} 
                        className="flex items-center justify-between p-3 bg-background rounded-md border"
                      >
                        <div className="flex items-center gap-3">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <div>
                            <p className="font-medium text-sm">{control?.name || 'Unknown Control'}</p>
                            <p className="text-xs text-muted-foreground">
                              {control?.control_id} • {control?.control_type} • {control?.control_category}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getEffectivenessColor(rc.effectiveness_rating)}>
                            {rc.effectiveness_rating}
                          </Badge>
                          <button
                            type="button"
                            onClick={() => handleRemoveControl(rc.id)}
                            className="p-1 hover:text-destructive"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add New Control */}
              <div className="grid grid-cols-3 gap-2">
                <Select
                  value={selectedControlId}
                  onValueChange={setSelectedControlId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select control..." />
                  </SelectTrigger>
                  <SelectContent>
                    {controls?.filter(c => 
                      c.status === 'active' && 
                      !riskControls?.some((rc: any) => rc.control_id === c.id)
                    ).map((control) => (
                      <SelectItem key={control.id} value={control.id}>
                        {control.name} ({control.control_id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={selectedEffectiveness}
                  onValueChange={(v) => setSelectedEffectiveness(v as RiskControlEffectiveness)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EFFECTIVENESS_RATINGS.map((rating) => (
                      <SelectItem key={rating.value} value={rating.value}>
                        {rating.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddControl}
                  disabled={!selectedControlId || addRiskControl.isPending}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Control
                </Button>
              </div>

              {controls?.filter(c => c.status === 'active').length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  No controls defined yet. Visit the Control Library to add controls.
                </p>
              )}
            </div>
          )}

          {/* Net Risk (after controls, before treatment) */}
          <div className="space-y-4 p-4 bg-accent/10 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Net Risk</h3>
                <p className="text-xs text-muted-foreground">After current controls, before treatment (PoAM)</p>
              </div>
              {netScore && netLevel && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Score:</span>
                  <span className={`font-mono font-bold text-lg text-severity-${netLevel}`}>
                    {netScore}
                  </span>
                  <span className={`text-sm capitalize text-severity-${netLevel}`}>
                    ({netLevel})
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Net Severity</Label>
                <Select
                  value={formData.net_severity}
                  onValueChange={(v) => setFormData({ ...formData, net_severity: v as RiskSeverity })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical (5)</SelectItem>
                    <SelectItem value="high">High (4)</SelectItem>
                    <SelectItem value="medium">Medium (3)</SelectItem>
                    <SelectItem value="low">Low (2)</SelectItem>
                    <SelectItem value="negligible">Negligible (1)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Net Likelihood</Label>
                <Select
                  value={formData.net_likelihood}
                  onValueChange={(v) => setFormData({ ...formData, net_likelihood: v as RiskLikelihood })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select likelihood" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="almost_certain">Almost Certain (5)</SelectItem>
                    <SelectItem value="likely">Likely (4)</SelectItem>
                    <SelectItem value="possible">Possible (3)</SelectItem>
                    <SelectItem value="unlikely">Unlikely (2)</SelectItem>
                    <SelectItem value="rare">Rare (1)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Treatment Action */}
          <div className="space-y-4 p-4 bg-orange-50/50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-900">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">Treatment Action</h3>
            </div>
            <p className="text-xs text-muted-foreground">Select the response strategy for this risk</p>
            
            <div className="grid grid-cols-5 gap-2">
              {['accept', 'transfer', 'mitigate', 'avoid', 'escalate'].map((action) => (
                <Button
                  key={action}
                  type="button"
                  variant={formData.treatment_action === action ? 'default' : 'outline'}
                  size="sm"
                  className="capitalize"
                  onClick={() => setFormData({ ...formData, treatment_action: action })}
                >
                  {action}
                </Button>
              ))}
            </div>
          </div>

          {/* Residual Risk (from completed treatment) - Only show for existing risks with completed treatments */}
          {risk && hasResidualRisk && (
            <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <div>
                      <h3 className="font-medium text-emerald-800 dark:text-emerald-300">Residual Risk (After Treatment)</h3>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">
                        From completed treatment plan
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-sm text-muted-foreground">Score: </span>
                      <span className={`font-mono font-bold text-lg text-severity-${residualLevel}`}>
                        {residualScore}
                      </span>
                    </div>
                    <Badge className={`text-severity-${residualLevel} bg-severity-${residualLevel}/10 capitalize`}>
                      {residualLevel}
                    </Badge>
                  </div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Severity: {latestCompletedTreatment.residual_severity} | 
                  Likelihood: {latestCompletedTreatment.residual_likelihood?.replace('_', ' ')}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status and Close Risk */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v as RiskStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending_review">Pending Review</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="monitoring">Monitoring</SelectItem>
                    <SelectItem value="treated">Treated</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Review Date</Label>
                <Input
                  type="date"
                  value={formData.review_date}
                  onChange={(e) => setFormData({ ...formData, review_date: e.target.value })}
                />
              </div>
            </div>

            {/* Close Risk Button - Only for existing risks */}
            {risk && formData.status !== 'closed' && (
              <div className="flex items-center gap-4 p-3 border rounded-lg bg-muted/30">
                <XCircle className="w-5 h-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Close this risk</p>
                  <p className="text-xs text-muted-foreground">
                    Mark as closed if the risk has been eliminated or is no longer relevant
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData({ ...formData, status: 'closed' })}
                >
                  Close Risk
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  {risk ? 'Updating...' : 'Creating...'}
                </span>
              ) : (
                risk ? 'Update Risk' : 'Create Risk'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};