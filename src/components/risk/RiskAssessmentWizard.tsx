import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db as supabase } from '@/integrations/database/client';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  useRiskCategories, 
  useProfiles, 
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
import { useVendors, useRiskVendors, useAddRiskVendor, useRemoveRiskVendor } from '@/hooks/useVendors';
import { 
  useRiskControlLinksByRisk,
  useAddRiskFrameworkControlLink,
  useRemoveRiskFrameworkControlLink,
} from '@/hooks/useControlMappings';
import { 
  useActiveFramework,
  useActiveFrameworkControls,
} from '@/hooks/useControlFrameworks';
import { useThreatSources, useVulnerabilities } from '@/hooks/useSecurityOps';
import { useAuth } from '@/contexts/AuthContext';
import { 
  AlertTriangle, 
  ArrowLeft, 
  ArrowRight, 
  Link2, 
  X, 
  Database, 
  Server, 
  ShieldCheck, 
  Shield,
  Plus, 
  CheckCircle2, 
  Loader2,
  FileText,
  Target,
  TrendingDown,
  Crosshair,
  PanelRightOpen,
  Handshake,
  Info,
  Eye,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  useActiveRiskAppetite, 
  useRiskAppetiteBands,
  useMatrixLikelihoodLevels,
  useMatrixImpactLevels,
  useRiskMatrices,
} from '@/hooks/useRiskAppetite';
import { RiskMatrixPanel } from './RiskMatrixPanel';

// Severity/likelihood to number mapping
const severityToNumber: Record<RiskSeverity, number> = {
  negligible: 1, low: 2, medium: 3, high: 4, critical: 5,
};
const likelihoodToNumber: Record<RiskLikelihood, number> = {
  rare: 1, unlikely: 2, possible: 3, likely: 4, almost_certain: 5,
};

interface RiskAssessmentWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  risk?: Risk | null;
}

const STEPS = [
  { id: 'basics', label: 'Basics', icon: FileText },
  { id: 'assets', label: 'Assets', icon: Database },
  { id: 'vendors', label: 'Vendors', icon: Handshake },
  { id: 'inherent', label: 'Inherent Risk', icon: AlertTriangle },
  { id: 'controls', label: 'Controls', icon: ShieldCheck },
  { id: 'net', label: 'Net Risk', icon: TrendingDown },
  { id: 'treatment', label: 'Treatment', icon: Crosshair },
  { id: 'review', label: 'Review', icon: CheckCircle2 },
];

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

const CONTROL_LINK_TYPES = [
  { value: 'mitigating', label: 'Mitigating' },
  { value: 'detective', label: 'Detective' },
  { value: 'preventive', label: 'Preventive' },
  { value: 'corrective', label: 'Corrective' },
];

const TREATMENT_ACTIONS = [
  { value: 'accept', label: 'Accept', description: 'Accept the risk without additional treatment' },
  { value: 'transfer', label: 'Transfer', description: 'Transfer risk to a third party' },
  { value: 'mitigate', label: 'Mitigate', description: 'Implement controls to reduce risk' },
  { value: 'avoid', label: 'Avoid', description: 'Eliminate the risk source' },
  { value: 'escalate', label: 'Escalate', description: 'Escalate to higher authority' },
];

const getRiskScoreColor = (level: string) => {
  switch (level) {
    case 'critical': return 'text-red-600 bg-red-100';
    case 'high': return 'text-orange-600 bg-orange-100';
    case 'medium': return 'text-amber-600 bg-amber-100';
    case 'low': return 'text-emerald-600 bg-emerald-100';
    default: return 'text-slate-600 bg-slate-100';
  }
};

const getSecurityFunctionColor = (func: string | null) => {
  switch (func?.toLowerCase()) {
    case 'protect': return 'bg-blue-100 text-blue-800';
    case 'detect': return 'bg-amber-100 text-amber-800';
    case 'respond': return 'bg-orange-100 text-orange-800';
    case 'recover': return 'bg-emerald-100 text-emerald-800';
    case 'identify': return 'bg-purple-100 text-purple-800';
    case 'govern': return 'bg-slate-100 text-slate-800';
    default: return 'bg-muted text-muted-foreground';
  }
};

export const RiskAssessmentWizard: React.FC<RiskAssessmentWizardProps> = ({
  open,
  onOpenChange,
  risk,
}) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [createdRiskId, setCreatedRiskId] = useState<string | null>(risk?.id || null);
  const [showMatrix, setShowMatrix] = useState(false);
  
  const { data: categories } = useRiskCategories();
  const { data: profiles } = useProfiles();
  const { data: primaryAssets } = usePrimaryAssets();
  const { data: secondaryAssets } = useSecondaryAssets();
  const { data: assetLinks, refetch: refetchLinks } = useRiskAssetLinks(createdRiskId || undefined);
  const { data: vendors } = useVendors();
  const { data: riskVendors, refetch: refetchVendors } = useRiskVendors(createdRiskId || undefined);
  const { data: activeFramework } = useActiveFramework();
  const { data: frameworkControls } = useActiveFrameworkControls();
  const { data: riskControlLinks, refetch: refetchControlLinks } = useRiskControlLinksByRisk(createdRiskId || undefined);
  const { data: activeAppetite } = useActiveRiskAppetite();
  const { data: appetiteBands } = useRiskAppetiteBands(activeAppetite?.id);
  const { data: likelihoodLevels } = useMatrixLikelihoodLevels(activeAppetite?.matrix_id);
  const { data: impactLevels } = useMatrixImpactLevels(activeAppetite?.matrix_id);
  const { data: matrices } = useRiskMatrices();
  const matrixSize = matrices?.find(m => m.id === activeAppetite?.matrix_id)?.size || 5;
  const { data: threatSources } = useThreatSources(true); // in-scope only
  const { data: vulnerabilities } = useVulnerabilities();
  
  const createRisk = useCreateRisk();
  const updateRisk = useUpdateRisk();
  const createAssetLink = useCreateRiskAssetLink();
  const deleteAssetLink = useDeleteRiskAssetLink();
  const addFrameworkControlLink = useAddRiskFrameworkControlLink();
  const removeFrameworkControlLink = useRemoveRiskFrameworkControlLink();
  const addRiskVendor = useAddRiskVendor();
  const removeRiskVendor = useRemoveRiskVendor();

  // Filter available controls (exclude already linked ones)
  const availableControls = frameworkControls?.filter(
    fc => !riskControlLinks?.some((rcl: any) => rcl.framework_control_id === fc.id)
  ) || [];

  // threatSources is already filtered to in-scope only from the hook
  const inScopeThreats = threatSources || [];

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: '',
    owner_id: '',
    risk_level: 'operational' as RiskLevel,
    inherent_severity: 'medium' as RiskSeverity,
    inherent_likelihood: 'possible' as RiskLikelihood,
    net_severity: '' as RiskSeverity | '',
    net_likelihood: '' as RiskLikelihood | '',
    status: 'draft' as RiskStatus,
    treatment_action: '' as string,
    review_date: '',
    threat_id: '',
    vulnerability_id: '',
  });

  const [selectedAssetType, setSelectedAssetType] = useState<'primary' | 'secondary'>('primary');
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [selectedLinkType, setSelectedLinkType] = useState<RiskAssetLinkType>('in_scope');
  const [selectedControlId, setSelectedControlId] = useState('');
  const [selectedControlLinkType, setSelectedControlLinkType] = useState('mitigating');
  const [selectedVendorId, setSelectedVendorId] = useState('');

  useEffect(() => {
    if (risk) {
      setFormData({
        title: risk.title,
        description: risk.description || '',
        category_id: risk.category_id || '',
        owner_id: risk.owner_id || '',
        risk_level: risk.risk_level || 'operational',
        inherent_severity: risk.inherent_severity,
        inherent_likelihood: risk.inherent_likelihood,
        net_severity: risk.net_severity || '',
        net_likelihood: risk.net_likelihood || '',
        status: risk.status,
        treatment_action: (risk as any).treatment_action || '',
        review_date: risk.review_date || '',
        threat_id: (risk as any).threat_id || '',
        vulnerability_id: (risk as any).vulnerability_id || '',
      });
      setCreatedRiskId(risk.id);
    }
  }, [risk]);

  useEffect(() => {
    if (!open) {
      setCurrentStep(0);
      setSelectedAssetId('');
      setSelectedControlId('');
      setSelectedVendorId('');
      if (!risk) {
        setFormData({
          title: '',
          description: '',
          category_id: '',
          owner_id: '',
          risk_level: 'operational',
          inherent_severity: 'medium',
          inherent_likelihood: 'possible',
          net_severity: '',
          net_likelihood: '',
          status: 'draft',
          treatment_action: '',
          review_date: '',
          threat_id: '',
          vulnerability_id: '',
        });
        setCreatedRiskId(null);
      }
    }
  }, [open, risk]);

  const inherentScore = calculateRiskScore(formData.inherent_severity, formData.inherent_likelihood);
  const inherentLevel = getRiskLevel(inherentScore);

  const netScore = formData.net_severity && formData.net_likelihood
    ? calculateRiskScore(formData.net_severity, formData.net_likelihood)
    : null;
  const netLevel = netScore ? getRiskLevel(netScore) : null;

  const isCreateMode = !risk && !createdRiskId;

  const canProceed = (step: number) => {
    switch (step) {
      case 0: return formData.title.trim().length > 0;
      case 1: return true; // Assets optional
      case 2: return true; // Vendors optional
      case 3: return true; // Inherent risk has defaults
      case 4: return true; // Controls optional
      case 5: return true; // Net risk optional
      case 6: return true; // Treatment optional
      default: return true;
    }
  };

  const handleCreateRisk = async () => {
    const submitData = {
      title: formData.title,
      description: formData.description || undefined,
      category_id: formData.category_id || undefined,
      owner_id: formData.owner_id || undefined,
      risk_level: formData.risk_level,
      inherent_severity: formData.inherent_severity,
      inherent_likelihood: formData.inherent_likelihood,
      status: formData.status,
      threat_id: formData.threat_id || undefined,
      vulnerability_id: formData.vulnerability_id || undefined,
    } as any;

    const result = await createRisk.mutateAsync(submitData);
    setCreatedRiskId(result.id);
    return result;
  };

  const handleUpdateRisk = async () => {
    if (!createdRiskId) return;
    
    const submitData = {
      id: createdRiskId,
      title: formData.title,
      description: formData.description || undefined,
      category_id: formData.category_id || undefined,
      owner_id: formData.owner_id || undefined,
      risk_level: formData.risk_level,
      inherent_severity: formData.inherent_severity,
      inherent_likelihood: formData.inherent_likelihood,
      net_severity: formData.net_severity || undefined,
      net_likelihood: formData.net_likelihood || undefined,
      status: formData.status,
      review_date: formData.review_date || undefined,
      treatment_action: formData.treatment_action || undefined,
      threat_id: formData.threat_id || undefined,
      vulnerability_id: formData.vulnerability_id || undefined,
    } as any;

    await updateRisk.mutateAsync(submitData);
  };

  const handleNext = async () => {
    if (currentStep === 0 && isCreateMode) {
      await handleCreateRisk();
    }
    setCurrentStep(currentStep + 1);
  };

  const handleComplete = async () => {
    await handleUpdateRisk();
    onOpenChange(false);
  };

  const handleAddAssetLink = async () => {
    if (!createdRiskId || !selectedAssetId) return;
    
    await createAssetLink.mutateAsync({
      risk_id: createdRiskId,
      primary_asset_id: selectedAssetType === 'primary' ? selectedAssetId : undefined,
      secondary_asset_id: selectedAssetType === 'secondary' ? selectedAssetId : undefined,
      link_type: selectedLinkType,
    });
    setSelectedAssetId('');
    refetchLinks();
  };

  const handleRemoveAssetLink = async (linkId: string) => {
    if (!createdRiskId) return;
    await deleteAssetLink.mutateAsync({ id: linkId, riskId: createdRiskId });
    refetchLinks();
  };

  const handleAddControl = async () => {
    if (!createdRiskId || !selectedControlId) return;
    
    await addFrameworkControlLink.mutateAsync({
      risk_id: createdRiskId,
      framework_control_id: selectedControlId,
      link_type: selectedControlLinkType,
    });
    setSelectedControlId('');
    refetchControlLinks();
  };

  const handleRemoveControl = async (linkId: string) => {
    if (!createdRiskId) return;
    await removeFrameworkControlLink.mutateAsync({ id: linkId, riskId: createdRiskId });
    refetchControlLinks();
  };

  const handleAddVendor = async () => {
    if (!createdRiskId || !selectedVendorId || !user?.id) return;
    
    await addRiskVendor.mutateAsync({
      risk_id: createdRiskId,
      vendor_id: selectedVendorId,
      created_by: user.id,
    });
    setSelectedVendorId('');
    refetchVendors();
  };

  const handleRemoveVendor = async (vendorId: string) => {
    if (!createdRiskId) return;
    await removeRiskVendor.mutateAsync({ riskId: createdRiskId, vendorId });
    refetchVendors();
  };

  const getCategoryName = (id: string) => categories?.find(c => c.id === id)?.name || 'None';
  const getOwnerName = (id: string) => {
    const profile = profiles?.find(p => p.user_id === id);
    return profile?.full_name || profile?.email || 'Unassigned';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0 flex flex-col">
        {/* Header with Steps */}
        <div className="border-b border-border p-4 flex-shrink-0">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold font-display">
              {risk ? 'Edit Risk Assessment' : 'New Risk Assessment'}
            </h2>
          </div>
          
          {/* Step Progress */}
          <div className="flex items-center gap-1">
            {STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              
              return (
                <React.Fragment key={step.id}>
                  <button
                    onClick={() => (isCompleted || (createdRiskId && index <= currentStep + 1)) && setCurrentStep(index)}
                    disabled={!isCompleted && index > currentStep && !createdRiskId}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive 
                        ? 'bg-primary text-primary-foreground' 
                        : isCompleted 
                          ? 'bg-primary/10 text-primary hover:bg-primary/20' 
                          : 'bg-muted/50 text-muted-foreground'
                    }`}
                  >
                    <StepIcon className="w-4 h-4" />
                    <span className="hidden md:inline">{step.label}</span>
                  </button>
                  {index < STEPS.length - 1 && (
                    <div className={`h-px flex-1 max-w-4 ${isCompleted ? 'bg-primary' : 'bg-border'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Step 0: Basics */}
            {currentStep === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Basic Information
                  </CardTitle>
                  <CardDescription>Enter the fundamental details of the risk</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Risk Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Enter a descriptive title..."
                    />
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
                              {level.label}
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
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
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

                  {/* Threat & Vulnerability Links */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label>Linked Threat (Optional)</Label>
                      <div className="flex gap-2">
                        <Select
                          value={formData.threat_id}
                          onValueChange={(v) => setFormData({ ...formData, threat_id: v === '__none__' ? '' : v })}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select threat..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">None</SelectItem>
                            {inScopeThreats?.map((threat) => (
                              <SelectItem key={threat.id} value={threat.id}>
                                {threat.identifier} - {(threat as any).name || threat.threat_type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {formData.threat_id && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="icon" className="shrink-0">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80" align="end">
                              {(() => {
                                const selectedThreat = inScopeThreats?.find(t => t.id === formData.threat_id);
                                if (!selectedThreat) return <p className="text-sm text-muted-foreground">Threat not found</p>;
                                return (
                                  <div className="space-y-3">
                                    <div>
                                      <h4 className="font-semibold text-sm">{selectedThreat.identifier}</h4>
                                      <p className="text-sm font-medium">{(selectedThreat as any).name || selectedThreat.threat_type}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      <div>
                                        <span className="text-muted-foreground">Type:</span>
                                        <p className="font-medium capitalize">{selectedThreat.threat_type}</p>
                                      </div>
                                      {selectedThreat.subtype && (
                                        <div>
                                          <span className="text-muted-foreground">Subtype:</span>
                                          <p className="font-medium capitalize">{selectedThreat.subtype}</p>
                                        </div>
                                      )}
                                    </div>
                                    {selectedThreat.description && (
                                      <div className="text-xs">
                                        <span className="text-muted-foreground">Description:</span>
                                        <p className="mt-1">{selectedThreat.description}</p>
                                      </div>
                                    )}
                                    {((selectedThreat as any).adv_context || (selectedThreat as any).nonadv_context) && (
                                      <div className="text-xs border-t pt-2">
                                        <span className="text-muted-foreground">Threat Context:</span>
                                        <p className="mt-1 text-xs leading-relaxed">
                                          {(selectedThreat as any).adv_context || (selectedThreat as any).nonadv_context}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">From Security Operations threats catalog</p>
                    </div>

                    <div className="space-y-2">
                      <Label>Linked Vulnerability (Optional)</Label>
                      <div className="flex gap-2">
                        <Select
                          value={formData.vulnerability_id}
                          onValueChange={(v) => setFormData({ ...formData, vulnerability_id: v === '__none__' ? '' : v })}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select vulnerability..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">None</SelectItem>
                            {vulnerabilities?.map((vuln) => (
                              <SelectItem key={vuln.id} value={vuln.id}>
                                {vuln.identifier} - {vuln.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {formData.vulnerability_id && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="icon" className="shrink-0">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80" align="end">
                              {(() => {
                                const selectedVuln = vulnerabilities?.find(v => v.id === formData.vulnerability_id);
                                if (!selectedVuln) return <p className="text-sm text-muted-foreground">Vulnerability not found</p>;
                                return (
                                  <div className="space-y-3">
                                    <div>
                                      <h4 className="font-semibold text-sm">{selectedVuln.identifier}</h4>
                                      <p className="text-sm font-medium">{selectedVuln.title}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      {selectedVuln.severity_qual && (
                                        <div>
                                          <span className="text-muted-foreground">Severity:</span>
                                          <p className="font-medium capitalize">{selectedVuln.severity_qual}</p>
                                        </div>
                                      )}
                                      {selectedVuln.severity_score !== null && (
                                        <div>
                                          <span className="text-muted-foreground">CVSS:</span>
                                          <p className="font-medium">{selectedVuln.severity_score}</p>
                                        </div>
                                      )}
                                    </div>
                                    {selectedVuln.description && (
                                      <div className="text-xs">
                                        <span className="text-muted-foreground">Description:</span>
                                        <p className="mt-1">{selectedVuln.description}</p>
                                      </div>
                                    )}
                                    {(selectedVuln as any).cve_ids && (selectedVuln as any).cve_ids.length > 0 && (
                                      <div className="text-xs">
                                        <span className="text-muted-foreground">CVEs:</span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {(selectedVuln as any).cve_ids.map((cve: string) => (
                                            <Badge key={cve} variant="secondary" className="text-xs">
                                              {cve}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {selectedVuln.notes && (
                                      <div className="text-xs border-t pt-2">
                                        <span className="text-muted-foreground">Notes:</span>
                                        <p className="mt-1">{selectedVuln.notes}</p>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">From Security Operations vulnerabilities</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 1: Assets */}
            {currentStep === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-primary" />
                    Linked Assets
                  </CardTitle>
                  <CardDescription>Link primary and secondary assets affected by this risk</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {assetLinks && assetLinks.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {assetLinks.map((link: any) => {
                        const asset = link.primary_assets || link.secondary_assets;
                        const isPrimary = !!link.primary_assets;
                        return (
                          <Badge key={link.id} variant="outline" className="flex items-center gap-2 py-1.5 px-3">
                            {isPrimary ? <Database className="w-3 h-3 text-indigo-500" /> : <Server className="w-3 h-3 text-blue-500" />}
                            <span>{asset?.name || 'Unknown'}</span>
                            <span className="text-xs text-muted-foreground">({link.link_type})</span>
                            <button type="button" onClick={() => handleRemoveAssetLink(link.id)} className="ml-1 hover:text-destructive">
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  )}

                  <div className="grid grid-cols-4 gap-2">
                    <Select value={selectedAssetType} onValueChange={(v) => { setSelectedAssetType(v as 'primary' | 'secondary'); setSelectedAssetId(''); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="primary">Primary Asset</SelectItem>
                        <SelectItem value="secondary">Secondary Asset</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
                      <SelectTrigger><SelectValue placeholder="Select asset..." /></SelectTrigger>
                      <SelectContent>
                        {selectedAssetType === 'primary' 
                          ? primaryAssets?.map((asset) => <SelectItem key={asset.id} value={asset.id}>{asset.name}</SelectItem>)
                          : secondaryAssets?.map((asset) => <SelectItem key={asset.id} value={asset.id}>{asset.name}</SelectItem>)
                        }
                      </SelectContent>
                    </Select>

                    <Select value={selectedLinkType} onValueChange={(v) => setSelectedLinkType(v as RiskAssetLinkType)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LINK_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}
                      </SelectContent>
                    </Select>

                    <Button type="button" variant="outline" onClick={handleAddAssetLink} disabled={!selectedAssetId}>
                      <Link2 className="w-4 h-4 mr-2" />
                      Link
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Vendors */}
            {currentStep === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Handshake className="w-5 h-5 text-primary" />
                    Linked Vendors
                  </CardTitle>
                  <CardDescription>Link third-party vendors associated with this risk</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {riskVendors && riskVendors.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {riskVendors.map((rv: any) => (
                        <Badge key={rv.id} variant="outline" className="flex items-center gap-2 py-1.5 px-3">
                          <Handshake className="w-3 h-3 text-amber-500" />
                          <span>{rv.vendors?.name || 'Unknown'}</span>
                          <button type="button" onClick={() => handleRemoveVendor(rv.vendor_id)} className="ml-1 hover:text-destructive">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
                      <SelectTrigger><SelectValue placeholder="Select vendor..." /></SelectTrigger>
                      <SelectContent>
                        {vendors?.filter(v => !riskVendors?.some((rv: any) => rv.vendor_id === v.id)).map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button type="button" variant="outline" onClick={handleAddVendor} disabled={!selectedVendorId}>
                      <Link2 className="w-4 h-4 mr-2" />
                      Link Vendor
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Inherent Risk */}
            {currentStep === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-primary" />
                    Inherent Risk
                  </CardTitle>
                  <CardDescription>Assess risk before any controls are applied</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <span className="font-medium">Inherent Risk Score</span>
                    <div className="flex items-center gap-2">
                      <Badge className={getRiskScoreColor(inherentLevel)}>{inherentScore}</Badge>
                      <span className="capitalize text-sm">{inherentLevel}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Severity *</Label>
                      <Select value={formData.inherent_severity} onValueChange={(v) => setFormData({ ...formData, inherent_severity: v as RiskSeverity })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
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
                      <Select value={formData.inherent_likelihood} onValueChange={(v) => setFormData({ ...formData, inherent_likelihood: v as RiskLikelihood })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
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
                </CardContent>
              </Card>
            )}

            {/* Step 4: Controls */}
            {currentStep === 4 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                    Controls to Implement
                  </CardTitle>
                  <CardDescription>
                    {activeFramework 
                      ? `Select controls from the active framework: ${activeFramework.name}`
                      : 'No active framework selected. Please set an active framework in Control Management.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!activeFramework && (
                    <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
                      <Info className="w-4 h-4" />
                      <span className="text-sm">Set an active framework in Control Management to select controls.</span>
                    </div>
                  )}

                  {activeFramework && (
                    <>
                      <div className="flex gap-2">
                        <Select value={selectedControlId} onValueChange={setSelectedControlId}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select a control to add..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableControls.map((control) => (
                              <SelectItem key={control.id} value={control.id}>
                                {control.control_code} - {control.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button 
                          onClick={handleAddControl} 
                          disabled={!selectedControlId || addFrameworkControlLink.isPending}
                        >
                          {addFrameworkControlLink.isPending ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <Plus className="w-4 h-4 mr-1" />
                          )}
                          Add
                        </Button>
                      </div>

                      {riskControlLinks && riskControlLinks.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Control</TableHead>
                              <TableHead className="w-32">Domain</TableHead>
                              <TableHead className="w-24">Function</TableHead>
                              <TableHead className="w-16"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {riskControlLinks.map((rcl: any) => {
                              const control = rcl.framework_control;
                              return (
                                <TableRow key={rcl.id}>
                                  <TableCell>
                                    <div>
                                      <span className="font-medium">{control?.title || 'Unknown'}</span>
                                      <span className="text-xs text-muted-foreground ml-2">
                                        ({control?.control_code})
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <span className="text-sm text-muted-foreground">
                                      {control?.domain || '-'}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    {control?.security_function && (
                                      <Badge 
                                        variant="outline" 
                                        className={`text-xs ${getSecurityFunctionColor(control.security_function)}`}
                                      >
                                        {control.security_function}
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => handleRemoveControl(rcl.id)}
                                      className="text-destructive hover:text-destructive"
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Shield className="w-10 h-10 mx-auto mb-2 opacity-50" />
                          <p>No controls added yet.</p>
                          <p className="text-sm">Select controls from the framework to implement.</p>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 5: Net Risk */}
            {currentStep === 5 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-primary" />
                    Net Risk
                  </CardTitle>
                  <CardDescription>Risk level after current controls are applied</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {netScore && netLevel && (
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                      <span className="font-medium">Net Risk Score</span>
                      <div className="flex items-center gap-2">
                        <Badge className={getRiskScoreColor(netLevel)}>{netScore}</Badge>
                        <span className="capitalize text-sm">{netLevel}</span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Net Severity</Label>
                      <Select value={formData.net_severity} onValueChange={(v) => setFormData({ ...formData, net_severity: v as RiskSeverity })}>
                        <SelectTrigger><SelectValue placeholder="Select severity" /></SelectTrigger>
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
                      <Select value={formData.net_likelihood} onValueChange={(v) => setFormData({ ...formData, net_likelihood: v as RiskLikelihood })}>
                        <SelectTrigger><SelectValue placeholder="Select likelihood" /></SelectTrigger>
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
                </CardContent>
              </Card>
            )}

            {/* Step 6: Treatment Action */}
            {currentStep === 6 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crosshair className="w-5 h-5 text-primary" />
                    Treatment Action
                  </CardTitle>
                  <CardDescription>Select the response strategy for this risk</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    {TREATMENT_ACTIONS.map((action) => (
                      <Card
                        key={action.value}
                        className={`cursor-pointer transition-all ${formData.treatment_action === action.value ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}`}
                        onClick={() => setFormData({ ...formData, treatment_action: action.value })}
                      >
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className={`w-4 h-4 rounded-full border-2 ${formData.treatment_action === action.value ? 'border-primary bg-primary' : 'border-muted-foreground'}`} />
                          <div>
                            <p className="font-medium">{action.label}</p>
                            <p className="text-sm text-muted-foreground">{action.description}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 7: Review */}
            {currentStep === 7 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    Review & Complete
                  </CardTitle>
                  <CardDescription>Review the risk assessment before saving</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Title</Label>
                      <p className="font-medium">{formData.title}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Risk Level</Label>
                      <p className="font-medium capitalize">{formData.risk_level}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Category</Label>
                      <p className="font-medium">{getCategoryName(formData.category_id)}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Owner</Label>
                      <p className="font-medium">{getOwnerName(formData.owner_id)}</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
                    <Label className="text-xs text-muted-foreground">Risk Scores</Label>
                    <div className="flex items-center gap-4 mt-2">
                      <Badge className={getRiskScoreColor(inherentLevel)}>
                        Inherent: {inherentScore} ({inherentLevel})
                      </Badge>
                      {netScore && netLevel && (
                        <>
                          <span className="text-muted-foreground">→</span>
                          <Badge className={getRiskScoreColor(netLevel)}>
                            Net: {netScore} ({netLevel})
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>

                  {riskControlLinks && riskControlLinks.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Linked Controls ({riskControlLinks.length})</Label>
                      <div className="flex flex-wrap gap-2">
                        {riskControlLinks.map((rcl: any) => (
                          <Badge key={rcl.id} variant="outline" className="gap-1">
                            <Shield className="w-3 h-3" />
                            {rcl.framework_control?.control_code}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {formData.treatment_action && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Treatment Action</Label>
                      <Badge variant="outline" className="capitalize">{formData.treatment_action}</Badge>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as RiskStatus })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="pending_review">Pending Review</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="monitoring">Monitoring</SelectItem>
                          <SelectItem value="treated">Treated</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
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
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 flex-shrink-0">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              {currentStep > 0 && (
                <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
            </div>

            {/* Center - Matrix Toggle */}
            <Button 
              variant={showMatrix ? "secondary" : "outline"} 
              size="sm"
              onClick={() => setShowMatrix(!showMatrix)}
              className="gap-2"
            >
              <PanelRightOpen className="w-4 h-4" />
              <span className="hidden sm:inline">{showMatrix ? 'Hide Matrix' : 'Show Matrix'}</span>
            </Button>

            <div className="flex items-center gap-2">
              {currentStep < STEPS.length - 1 ? (
                <Button onClick={handleNext} disabled={!canProceed(currentStep) || createRisk.isPending}>
                  {createRisk.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {currentStep === 0 && isCreateMode ? 'Create & Continue' : 'Next'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleComplete} disabled={updateRisk.isPending}>
                  {updateRisk.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Complete
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Risk Matrix Side Panel */}
        <RiskMatrixPanel
          open={showMatrix}
          onClose={() => setShowMatrix(false)}
          matrixSize={matrixSize}
          bands={appetiteBands || []}
          likelihoodLevels={likelihoodLevels}
          impactLevels={impactLevels}
          highlightedLikelihood={likelihoodToNumber[formData.inherent_likelihood]}
          highlightedImpact={severityToNumber[formData.inherent_severity]}
          categories={categories}
        />
      </DialogContent>
    </Dialog>
  );
};

export default RiskAssessmentWizard;
