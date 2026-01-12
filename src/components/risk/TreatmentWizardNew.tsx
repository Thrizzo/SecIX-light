import React, { useState, useEffect } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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
  useTreatmentDetails,
  useTreatmentControls,
  useTreatmentMilestones,
  useAddTreatmentControl,
  useRemoveTreatmentControl,
  useUpdateTreatmentControl,
  useAddTreatmentMilestone,
  useUpdateTreatmentMilestone,
  useDeleteTreatmentMilestone,
  useCompleteTreatment,
  ImplementationStatus,
  MilestoneStatus,
} from '@/hooks/useTreatmentWizard';
import { useRisks, calculateRiskScore, getRiskLevel, RiskSeverity, RiskLikelihood, Risk } from '@/hooks/useRisks';
import { useControls } from '@/hooks/useControls';
import { useProfiles } from '@/hooks/useRisks';
import { useTreatments, useUpdateTreatment } from '@/hooks/useTreatments';
import { useLogRiskAction } from '@/hooks/useAuditLogs';
import { 
  ChevronLeft, 
  ChevronRight, 
  Shield, 
  ClipboardList, 
  Target, 
  CheckCircle2, 
  Plus,
  X,
  AlertTriangle,
  User,
  Loader2,
  ListChecks,
  Crosshair,
  Save,
} from 'lucide-react';
import { format } from 'date-fns';

interface TreatmentWizardNewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  treatmentId: string | null;
  riskId?: string | null;
  mode?: 'create' | 'edit';
}

type TreatmentStrategy = 'mitigate' | 'accept' | 'transfer' | 'avoid';

const STEPS = [
  { id: 'risk', title: 'Select Risk', icon: AlertTriangle },
  { id: 'strategy', title: 'Treatment Strategy', icon: Crosshair },
  { id: 'controls', title: 'Select Controls', icon: Shield },
  { id: 'tracking', title: 'Actions & Tracking', icon: ListChecks },
  { id: 'review', title: 'Review & Save', icon: CheckCircle2 },
];

const STRATEGIES: { value: TreatmentStrategy; label: string; description: string }[] = [
  { value: 'mitigate', label: 'Mitigate', description: 'Implement controls to reduce risk likelihood or impact' },
  { value: 'accept', label: 'Accept', description: 'Accept the risk without additional treatment' },
  { value: 'transfer', label: 'Transfer', description: 'Transfer risk to a third party (insurance, outsourcing)' },
  { value: 'avoid', label: 'Avoid', description: 'Eliminate the risk by removing the activity or asset' },
];

const IMPLEMENTATION_STATUS: { value: ImplementationStatus; label: string }[] = [
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'implemented', label: 'Implemented' },
  { value: 'not_applicable', label: 'Not Applicable' },
];

const SEVERITY_OPTIONS: { value: RiskSeverity; label: string }[] = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
  { value: 'negligible', label: 'Negligible' },
];

const LIKELIHOOD_OPTIONS: { value: RiskLikelihood; label: string }[] = [
  { value: 'almost_certain', label: 'Almost Certain' },
  { value: 'likely', label: 'Likely' },
  { value: 'possible', label: 'Possible' },
  { value: 'unlikely', label: 'Unlikely' },
  { value: 'rare', label: 'Rare' },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'planned': return 'bg-slate-100 text-slate-800';
    case 'in_progress': return 'bg-blue-100 text-blue-800';
    case 'implemented':
    case 'completed': return 'bg-emerald-100 text-emerald-800';
    case 'not_applicable': return 'bg-gray-100 text-gray-800';
    case 'pending': return 'bg-amber-100 text-amber-800';
    case 'overdue': return 'bg-red-100 text-red-800';
    default: return 'bg-slate-100 text-slate-800';
  }
};

const getRiskScoreColor = (level: string) => {
  switch (level) {
    case 'critical': return 'text-red-600 bg-red-100';
    case 'high': return 'text-orange-600 bg-orange-100';
    case 'medium': return 'text-amber-600 bg-amber-100';
    case 'low': return 'text-emerald-600 bg-emerald-100';
    default: return 'text-slate-600 bg-slate-100';
  }
};

// Calculate residual risk from controls
const calculateResidualRisk = (
  inherentSeverity: RiskSeverity,
  inherentLikelihood: RiskLikelihood,
  controls: { implementation_status: ImplementationStatus; effectiveness_estimate?: number | null }[]
): { severity: RiskSeverity; likelihood: RiskLikelihood; score: number } => {
  const inherentScore = calculateRiskScore(inherentSeverity, inherentLikelihood);
  
  if (controls.length === 0) {
    return { severity: inherentSeverity, likelihood: inherentLikelihood, score: inherentScore };
  }

  // Calculate effectiveness factor
  const statusFactors: Record<ImplementationStatus, number> = {
    implemented: 1.0,
    in_progress: 0.5,
    planned: 0.2,
    not_applicable: 0.0,
  };

  let totalFactor = 0;
  let applicableControls = 0;

  controls.forEach(control => {
    if (control.implementation_status !== 'not_applicable') {
      let factor = statusFactors[control.implementation_status];
      if (control.effectiveness_estimate !== undefined && control.effectiveness_estimate !== null) {
        factor *= (control.effectiveness_estimate / 100);
      }
      totalFactor += factor;
      applicableControls++;
    }
  });

  const avgEffectiveness = applicableControls > 0 ? totalFactor / applicableControls : 0;
  const cappedEffectiveness = Math.min(avgEffectiveness, 0.85); // Cap at 85%
  
  const residualScore = Math.round(inherentScore * (1 - cappedEffectiveness));
  
  // Map back to severity and likelihood
  const severities: RiskSeverity[] = ['negligible', 'low', 'medium', 'high', 'critical'];
  const likelihoods: RiskLikelihood[] = ['rare', 'unlikely', 'possible', 'likely', 'almost_certain'];
  
  // Simple reduction: reduce likelihood first, then impact
  const scoreReduction = inherentScore - residualScore;
  let newLikelihoodIndex = likelihoods.indexOf(inherentLikelihood);
  let newSeverityIndex = severities.indexOf(inherentSeverity);
  
  let remainingReduction = scoreReduction;
  while (remainingReduction > 0 && (newLikelihoodIndex > 0 || newSeverityIndex > 0)) {
    if (newLikelihoodIndex > 0) {
      newLikelihoodIndex--;
      remainingReduction -= 3;
    }
    if (remainingReduction > 0 && newSeverityIndex > 0) {
      newSeverityIndex--;
      remainingReduction -= 3;
    }
  }

  return {
    severity: severities[Math.max(0, newSeverityIndex)],
    likelihood: likelihoods[Math.max(0, newLikelihoodIndex)],
    score: Math.max(1, residualScore),
  };
};

export const TreatmentWizardNew: React.FC<TreatmentWizardNewProps> = ({
  open,
  onOpenChange,
  treatmentId,
  riskId: initialRiskId,
  mode = 'edit',
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedRiskId, setSelectedRiskId] = useState<string>(initialRiskId || '');
  const [strategy, setStrategy] = useState<TreatmentStrategy | ''>('');
  const [selectedControlId, setSelectedControlId] = useState('');
  const [effectivenessEstimate, setEffectivenessEstimate] = useState<number>(75);
  
  // Milestone form
  const [milestoneForm, setMilestoneForm] = useState({
    control_id: '',
    title: '',
    description: '',
    owner_id: '',
    due_date: '',
  });
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);

  const { data: risks } = useRisks();
  const { data: treatment, isLoading: treatmentLoading } = useTreatmentDetails(treatmentId || undefined);
  const { data: treatmentControls, refetch: refetchControls } = useTreatmentControls(treatmentId || undefined);
  const { data: milestones, refetch: refetchMilestones } = useTreatmentMilestones(treatmentId || undefined);
  const { data: allControls } = useControls();
  const { data: profiles } = useProfiles();
  const { logAction } = useLogRiskAction();

  const addControl = useAddTreatmentControl();
  const removeControl = useRemoveTreatmentControl();
  const updateControl = useUpdateTreatmentControl();
  const addMilestone = useAddTreatmentMilestone();
  const updateMilestone = useUpdateTreatmentMilestone();
  const deleteMilestone = useDeleteTreatmentMilestone();
  const completeTreatment = useCompleteTreatment();
  const updateTreatment = useUpdateTreatment();

  const selectedRisk = risks?.find(r => r.id === (selectedRiskId || treatment?.risk_id));

  useEffect(() => {
    if (treatment) {
      setSelectedRiskId(treatment.risk_id);
      setStrategy((treatment as any).strategy || '');
    }
  }, [treatment]);

  useEffect(() => {
    if (initialRiskId) {
      setSelectedRiskId(initialRiskId);
    }
  }, [initialRiskId]);

  useEffect(() => {
    if (!open) {
      setCurrentStep(0);
      setSelectedControlId('');
      setShowMilestoneForm(false);
      setMilestoneForm({ control_id: '', title: '', description: '', owner_id: '', due_date: '' });
      if (!treatmentId) {
        setSelectedRiskId('');
        setStrategy('');
      }
    }
  }, [open, treatmentId]);

  const handleAddControl = async () => {
    if (!treatmentId || !selectedControlId) return;
    await addControl.mutateAsync({ 
      treatment_id: treatmentId, 
      control_id: selectedControlId,
      implementation_status: 'planned',
    });
    logAction('control_added', 'treatment', treatmentId, { control_id: selectedControlId });
    setSelectedControlId('');
    refetchControls();
  };

  const handleRemoveControl = async (id: string) => {
    if (!treatmentId) return;
    await removeControl.mutateAsync({ id, treatmentId });
    logAction('control_removed', 'treatment', treatmentId, { control_id: id });
    refetchControls();
  };

  const handleUpdateControlStatus = async (id: string, status: ImplementationStatus) => {
    if (!treatmentId) return;
    await updateControl.mutateAsync({ id, treatmentId, implementation_status: status });
    refetchControls();
  };

  const handleAddMilestone = async () => {
    if (!treatmentId || !milestoneForm.title) return;
    await addMilestone.mutateAsync({
      treatment_id: treatmentId,
      ...milestoneForm,
      control_id: milestoneForm.control_id || undefined,
      owner_id: milestoneForm.owner_id || undefined,
      due_date: milestoneForm.due_date || undefined,
    });
    logAction('milestone_added', 'milestone', treatmentId, { title: milestoneForm.title });
    setMilestoneForm({ control_id: '', title: '', description: '', owner_id: '', due_date: '' });
    setShowMilestoneForm(false);
    refetchMilestones();
  };

  const handleUpdateMilestoneStatus = async (id: string, status: MilestoneStatus) => {
    if (!treatmentId) return;
    await updateMilestone.mutateAsync({ id, treatmentId, status });
    refetchMilestones();
  };

  const handleDeleteMilestone = async (id: string) => {
    if (!treatmentId) return;
    await deleteMilestone.mutateAsync({ id, treatmentId });
    refetchMilestones();
  };

  const handleSaveStrategy = async () => {
    if (!treatmentId || !strategy) return;
    await updateTreatment.mutateAsync({ 
      id: treatmentId, 
      status: 'in_progress',
    });
    setCurrentStep(2);
  };

  const handleComplete = async () => {
    if (!treatmentId || !treatment?.risk_id || !selectedRisk) return;
    
    const controlsData = treatmentControls?.map(tc => ({
      implementation_status: tc.implementation_status,
      effectiveness_estimate: (tc as any).effectiveness_estimate,
    })) || [];
    
    const residual = calculateResidualRisk(
      selectedRisk.inherent_severity,
      selectedRisk.inherent_likelihood,
      controlsData
    );
    
    await completeTreatment.mutateAsync({
      treatmentId,
      riskId: treatment.risk_id,
      residual_likelihood: residual.likelihood,
      residual_severity: residual.severity,
    });
    
    logAction('treatment_completed', 'treatment', treatmentId, {
      residual_likelihood: residual.likelihood,
      residual_severity: residual.severity,
      residual_score: residual.score,
    });
    
    onOpenChange(false);
  };

  const handleSaveDraft = async () => {
    if (!treatmentId) return;
    await updateTreatment.mutateAsync({ 
      id: treatmentId, 
      status: 'planned',
    });
    onOpenChange(false);
  };

  // Compute residual risk preview
  const controlsData = treatmentControls?.map(tc => ({
    implementation_status: tc.implementation_status,
    effectiveness_estimate: (tc as any).effectiveness_estimate,
  })) || [];

  const residualPreview = selectedRisk 
    ? calculateResidualRisk(selectedRisk.inherent_severity, selectedRisk.inherent_likelihood, controlsData)
    : null;

  const inherentScore = selectedRisk 
    ? calculateRiskScore(selectedRisk.inherent_severity, selectedRisk.inherent_likelihood)
    : 0;
  const inherentLevel = getRiskLevel(inherentScore);

  const availableControls = allControls?.filter(
    (c) => !treatmentControls?.some((tc) => tc.control_id === c.id)
  );

  const canProceed = (step: number) => {
    switch (step) {
      case 0: return !!selectedRiskId || !!treatment?.risk_id;
      case 1: return !!strategy;
      case 2: return true; // Controls are optional
      case 3: return true; // Tracking is optional
      case 4: return true;
      default: return true;
    }
  };

  if (treatmentLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            {mode === 'create' ? 'Create Treatment Plan' : 'Treatment Wizard'}
          </DialogTitle>
          <DialogDescription>
            {treatment?.title} {treatment?.risks?.risk_id && `for ${treatment.risks.risk_id}`}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center justify-between px-4 py-3 bg-muted/30 rounded-lg">
          {STEPS.map((step, index) => (
            <div 
              key={step.id}
              className={`flex items-center gap-2 ${index <= currentStep ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                index < currentStep 
                  ? 'bg-primary text-primary-foreground' 
                  : index === currentStep 
                    ? 'bg-primary/20 text-primary border-2 border-primary' 
                    : 'bg-muted text-muted-foreground'
              }`}>
                {index < currentStep ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
              </div>
              <span className="hidden md:inline text-xs font-medium">{step.title}</span>
            </div>
          ))}
        </div>
        <Progress value={((currentStep + 1) / STEPS.length) * 100} className="h-1" />

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Step 1: Select Risk */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Select Risk to Treat</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {treatment?.risk_id ? (
                    <div className="p-4 rounded-lg border bg-muted/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{selectedRisk?.risk_id}</span>
                          <span className="mx-2">-</span>
                          <span>{selectedRisk?.title}</span>
                        </div>
                        <Badge className={getRiskScoreColor(inherentLevel)}>
                          Score: {inherentScore}
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <Select value={selectedRiskId} onValueChange={setSelectedRiskId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a risk to treat..." />
                      </SelectTrigger>
                      <SelectContent>
                        {risks?.filter(r => !(r as any).is_archived).map((risk) => (
                          <SelectItem key={risk.id} value={risk.id}>
                            {risk.risk_id} - {risk.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  
                  {selectedRisk && (
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <Label className="text-xs text-muted-foreground">Inherent Severity</Label>
                        <p className="font-medium capitalize">{selectedRisk.inherent_severity}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <Label className="text-xs text-muted-foreground">Inherent Likelihood</Label>
                        <p className="font-medium capitalize">{selectedRisk.inherent_likelihood.replace('_', ' ')}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 2: Treatment Strategy */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Choose Treatment Strategy</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {STRATEGIES.map((strat) => (
                      <div
                        key={strat.value}
                        onClick={() => setStrategy(strat.value)}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          strategy === strat.value
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <h4 className="font-medium">{strat.label}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{strat.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 3: Select Controls */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Select Controls to Implement</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Select value={selectedControlId} onValueChange={setSelectedControlId}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select a control to add..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableControls?.map((control) => (
                          <SelectItem key={control.id} value={control.id}>
                            {control.control_id} - {control.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={handleAddControl} disabled={!selectedControlId || addControl.isPending}>
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </div>

                  {treatmentControls && treatmentControls.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Control</TableHead>
                          <TableHead className="w-40">Status</TableHead>
                          <TableHead className="w-20"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {treatmentControls.map((tc) => (
                          <TableRow key={tc.id}>
                            <TableCell>
                              <div>
                                <span className="font-medium">{tc.controls?.name}</span>
                                <span className="text-xs text-muted-foreground ml-2">({tc.controls?.control_id})</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Select 
                                value={tc.implementation_status}
                                onValueChange={(v) => handleUpdateControlStatus(tc.id, v as ImplementationStatus)}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {IMPLEMENTATION_STATUS.map((s) => (
                                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleRemoveControl(tc.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Shield className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>No controls added yet. Select controls to implement.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Residual Risk Preview */}
              {residualPreview && (
                <Card className="border-primary/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Residual Risk Preview (Auto-calculated)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Badge className={getRiskScoreColor(inherentLevel)}>
                          Inherent: {inherentScore}
                        </Badge>
                        <span className="text-muted-foreground">→</span>
                        <Badge className={getRiskScoreColor(getRiskLevel(residualPreview.score))}>
                          Residual: {residualPreview.score}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        ({residualPreview.severity} / {residualPreview.likelihood.replace('_', ' ')})
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Step 4: Actions & Tracking */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Milestones & Actions</CardTitle>
                  <Button size="sm" onClick={() => setShowMilestoneForm(true)}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Milestone
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {showMilestoneForm && (
                    <Card className="border-primary/50">
                      <CardContent className="pt-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2 space-y-1">
                            <Label>Milestone Title *</Label>
                            <Input
                              value={milestoneForm.title}
                              onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
                              placeholder="e.g., Implement access controls..."
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>Linked Control</Label>
                            <Select 
                              value={milestoneForm.control_id} 
                              onValueChange={(v) => setMilestoneForm({ ...milestoneForm, control_id: v })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Optional..." />
                              </SelectTrigger>
                              <SelectContent>
                                {treatmentControls?.map((tc) => (
                                  <SelectItem key={tc.control_id} value={tc.control_id}>
                                    {tc.controls?.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label>Owner</Label>
                            <Select 
                              value={milestoneForm.owner_id} 
                              onValueChange={(v) => setMilestoneForm({ ...milestoneForm, owner_id: v })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Assign owner..." />
                              </SelectTrigger>
                              <SelectContent>
                                {profiles?.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.full_name || p.email}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label>Due Date</Label>
                            <Input
                              type="date"
                              value={milestoneForm.due_date}
                              onChange={(e) => setMilestoneForm({ ...milestoneForm, due_date: e.target.value })}
                            />
                          </div>
                          <div className="col-span-2 space-y-1">
                            <Label>Description</Label>
                            <Textarea
                              value={milestoneForm.description}
                              onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                              placeholder="Describe the milestone..."
                              rows={2}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => setShowMilestoneForm(false)}>
                            Cancel
                          </Button>
                          <Button size="sm" onClick={handleAddMilestone} disabled={!milestoneForm.title}>
                            Add Milestone
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {milestones && milestones.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Milestone</TableHead>
                          <TableHead>Owner</TableHead>
                          <TableHead>Due</TableHead>
                          <TableHead className="w-32">Status</TableHead>
                          <TableHead className="w-16"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {milestones.map((milestone) => (
                          <TableRow key={milestone.id}>
                            <TableCell>
                              <div>
                                <span className="font-medium">{milestone.title}</span>
                                {milestone.controls && (
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    {milestone.controls.control_id}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {milestone.profiles?.full_name || milestone.profiles?.email || '-'}
                            </TableCell>
                            <TableCell className="text-sm">
                              {milestone.due_date ? format(new Date(milestone.due_date), 'MMM d, yyyy') : '-'}
                            </TableCell>
                            <TableCell>
                              <Select 
                                value={milestone.status}
                                onValueChange={(v) => handleUpdateMilestoneStatus(milestone.id, v as MilestoneStatus)}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="in_progress">In Progress</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleDeleteMilestone(milestone.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <ListChecks className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>No milestones defined yet. Add milestones to track progress.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 5: Review & Save */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Treatment Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <Label className="text-xs text-muted-foreground">Risk</Label>
                      <p className="font-medium">{selectedRisk?.risk_id} - {selectedRisk?.title}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <Label className="text-xs text-muted-foreground">Strategy</Label>
                      <p className="font-medium capitalize">{strategy || 'Not selected'}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <Label className="text-xs text-muted-foreground">Controls Added</Label>
                      <p className="font-medium">{treatmentControls?.length || 0}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <Label className="text-xs text-muted-foreground">Milestones</Label>
                      <p className="font-medium">{milestones?.length || 0}</p>
                    </div>
                  </div>

                  {residualPreview && (
                    <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
                      <Label className="text-xs text-muted-foreground">Residual Risk (Auto-calculated)</Label>
                      <div className="flex items-center gap-4 mt-2">
                        <Badge className={getRiskScoreColor(inherentLevel)}>
                          Inherent: {inherentScore} ({inherentLevel})
                        </Badge>
                        <span className="text-muted-foreground">→</span>
                        <Badge className={getRiskScoreColor(getRiskLevel(residualPreview.score))}>
                          Residual: {residualPreview.score} ({getRiskLevel(residualPreview.score)})
                        </Badge>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Navigation */}
        <DialogFooter className="flex-row justify-between border-t pt-4">
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSaveDraft}>
              <Save className="w-4 h-4 mr-1" />
              Save Draft
            </Button>
            {currentStep < STEPS.length - 1 ? (
              <Button onClick={() => setCurrentStep(currentStep + 1)} disabled={!canProceed(currentStep)}>
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleComplete} disabled={completeTreatment.isPending}>
                {completeTreatment.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                Complete Treatment
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TreatmentWizardNew;
