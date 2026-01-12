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
import { useControls } from '@/hooks/useControls';
import { useProfiles, calculateRiskScore, getRiskLevel, RiskSeverity, RiskLikelihood } from '@/hooks/useRisks';
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
  Calendar,
  User,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';

interface TreatmentWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  treatmentId: string | null;
}

const STEPS = [
  { id: 'controls', title: 'Select Controls', icon: Shield },
  { id: 'poam', title: 'Plan of Action & Milestones', icon: ClipboardList },
  { id: 'residual', title: 'Assess Residual Risk', icon: Target },
  { id: 'submit', title: 'Review & Submit', icon: CheckCircle2 },
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

export const TreatmentWizard: React.FC<TreatmentWizardProps> = ({
  open,
  onOpenChange,
  treatmentId,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedControlId, setSelectedControlId] = useState('');
  const [residualSeverity, setResidualSeverity] = useState<RiskSeverity>('medium');
  const [residualLikelihood, setResidualLikelihood] = useState<RiskLikelihood>('possible');
  
  // Milestone form
  const [milestoneForm, setMilestoneForm] = useState({
    control_id: '',
    title: '',
    description: '',
    owner_id: '',
    due_date: '',
  });
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);

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

  useEffect(() => {
    if (treatment?.risks) {
      const netSeverity = treatment.risks.net_severity || treatment.risks.inherent_severity;
      const netLikelihood = treatment.risks.net_likelihood || treatment.risks.inherent_likelihood;
      setResidualSeverity(netSeverity as RiskSeverity);
      setResidualLikelihood(netLikelihood as RiskLikelihood);
    }
  }, [treatment]);

  useEffect(() => {
    if (!open) {
      setCurrentStep(0);
      setSelectedControlId('');
      setShowMilestoneForm(false);
      setMilestoneForm({ control_id: '', title: '', description: '', owner_id: '', due_date: '' });
    }
  }, [open]);

  const handleAddControl = async () => {
    if (!treatmentId || !selectedControlId) return;
    await addControl.mutateAsync({ treatment_id: treatmentId, control_id: selectedControlId });
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

  const handleComplete = async () => {
    if (!treatmentId || !treatment?.risk_id) return;
    await completeTreatment.mutateAsync({
      treatmentId,
      riskId: treatment.risk_id,
      residual_likelihood: residualLikelihood,
      residual_severity: residualSeverity,
    });
    logAction('treatment_completed', 'treatment', treatmentId, {
      residual_likelihood: residualLikelihood,
      residual_severity: residualSeverity,
    });
    onOpenChange(false);
  };

  const currentNetScore = treatment?.risks
    ? calculateRiskScore(
        (treatment.risks.net_severity || treatment.risks.inherent_severity) as RiskSeverity,
        (treatment.risks.net_likelihood || treatment.risks.inherent_likelihood) as RiskLikelihood
      )
    : 0;
  const currentNetLevel = getRiskLevel(currentNetScore);

  const residualScore = calculateRiskScore(residualSeverity, residualLikelihood);
  const residualLevel = getRiskLevel(residualScore);

  const availableControls = allControls?.filter(
    (c) => !treatmentControls?.some((tc) => tc.control_id === c.id)
  );

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
            Treatment Wizard
          </DialogTitle>
          <DialogDescription>
            {treatment?.title} for {treatment?.risks?.risk_id}
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
              <span className="hidden sm:inline text-sm font-medium">{step.title}</span>
            </div>
          ))}
        </div>
        <Progress value={((currentStep + 1) / STEPS.length) * 100} className="h-1" />

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Step 1: Select Controls */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Current Net Risk
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <Badge className={`text-lg px-4 py-2 ${getRiskScoreColor(currentNetLevel)}`}>
                      Score: {currentNetScore} ({currentNetLevel.toUpperCase()})
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {treatment?.risks?.net_severity || treatment?.risks?.inherent_severity} severity, {' '}
                      {treatment?.risks?.net_likelihood || treatment?.risks?.inherent_likelihood} likelihood
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Add Control */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Controls to Implement</CardTitle>
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
            </div>
          )}

          {/* Step 2: POAM - Plan of Action & Milestones */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Milestones</CardTitle>
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
                                {profiles?.map((p: any) => (
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
                              placeholder="Describe what needs to be done..."
                              rows={2}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
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
                    <div className="space-y-2">
                      {milestones.map((m) => (
                        <div key={m.id} className="flex items-start justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{m.title}</span>
                              {m.controls && (
                                <Badge variant="outline" className="text-xs">
                                  {m.controls.control_id}
                                </Badge>
                              )}
                            </div>
                            {m.description && (
                              <p className="text-sm text-muted-foreground mb-2">{m.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              {m.profiles && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {m.profiles.full_name || m.profiles.email}
                                </span>
                              )}
                              {m.due_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {format(new Date(m.due_date), 'MMM d, yyyy')}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Select 
                              value={m.status} 
                              onValueChange={(v) => handleUpdateMilestoneStatus(m.id, v as MilestoneStatus)}
                            >
                              <SelectTrigger className="h-8 w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="overdue">Overdue</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteMilestone(m.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : !showMilestoneForm && (
                    <div className="text-center py-8 text-muted-foreground">
                      <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>No milestones yet. Add milestones to track implementation progress.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 3: Assess Residual Risk */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Current Net Risk</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge className={`text-lg px-4 py-2 ${getRiskScoreColor(currentNetLevel)}`}>
                    Score: {currentNetScore} ({currentNetLevel.toUpperCase()})
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Projected Residual Risk After Treatment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Residual Severity</Label>
                      <Select value={residualSeverity} onValueChange={(v) => setResidualSeverity(v as RiskSeverity)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SEVERITY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Residual Likelihood</Label>
                      <Select value={residualLikelihood} onValueChange={(v) => setResidualLikelihood(v as RiskLikelihood)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LIKELIHOOD_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-center py-4">
                    <Badge className={`text-xl px-6 py-3 ${getRiskScoreColor(residualLevel)}`}>
                      Projected Score: {residualScore} ({residualLevel.toUpperCase()})
                    </Badge>
                  </div>

                  {residualScore < currentNetScore && (
                    <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-800 rounded-lg">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Risk will be reduced by {currentNetScore - residualScore} points</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 4: Review & Submit */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Treatment Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Risk</p>
                      <p className="font-medium">{treatment?.risks?.risk_id} - {treatment?.risks?.title}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Treatment</p>
                      <p className="font-medium">{treatment?.title}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Controls to Implement</p>
                      <p className="font-medium">{treatmentControls?.length || 0} controls</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Milestones</p>
                      <p className="font-medium">{milestones?.length || 0} milestones</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-1">Current Net Risk</p>
                      <Badge className={`${getRiskScoreColor(currentNetLevel)}`}>
                        {currentNetScore} ({currentNetLevel})
                      </Badge>
                    </div>
                    <ChevronRight className="w-6 h-6 text-muted-foreground" />
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-1">Residual Risk</p>
                      <Badge className={`${getRiskScoreColor(residualLevel)}`}>
                        {residualScore} ({residualLevel})
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/50 bg-primary/5">
                <CardContent className="py-4">
                  <p className="text-sm text-center">
                    Completing this treatment will update the risk register with the residual risk values.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between border-t pt-4">
          <Button
            variant="outline"
            onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Save & Close
            </Button>
            {currentStep < STEPS.length - 1 ? (
              <Button onClick={() => setCurrentStep((s) => s + 1)}>
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleComplete} disabled={completeTreatment.isPending}>
                {completeTreatment.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Complete Treatment
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
