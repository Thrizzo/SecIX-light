import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
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
import { Switch } from '@/components/ui/switch';
import { 
  useTreatmentDetails,
  useTreatmentControls,
  useTreatmentMilestones,
  useTreatmentPoams,
  useAddTreatmentControl,
  useRemoveTreatmentControl,
  useUpdateTreatmentControl,
  useAddTreatmentMilestone,
  useUpdateTreatmentMilestone,
  useDeleteTreatmentMilestone,
  useCreateTreatmentPoam,
  useUpdateTreatmentPoam,
  useDeleteTreatmentPoam,
  useCompleteTreatment,
  ImplementationStatus,
  MilestoneStatus,
  PoamStatus,
  TreatmentPoam,
} from '@/hooks/useTreatmentWizard';
import { useRisks, useRiskCategories, calculateRiskScore, getRiskLevel, RiskSeverity, RiskLikelihood } from '@/hooks/useRisks';
import { useControls } from '@/hooks/useControls';
import { useProfiles } from '@/hooks/useRisks';
import { useCreateTreatment, useUpdateTreatment } from '@/hooks/useTreatments';
import { useAuth } from '@/contexts/AuthContext';
import { useLogRiskAction } from '@/hooks/useAuditLogs';
import { 
  ArrowLeft,
  ArrowRight,
  Shield, 
  ClipboardList, 
  Target, 
  CheckCircle2, 
  Plus,
  X,
  AlertTriangle,
  Loader2,
  ListChecks,
  Crosshair,
  Save,
  Calendar,
  TrendingDown,
  Play,
  Grid3X3,
  PanelRightOpen,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { format } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  useActiveRiskAppetite, 
  useRiskAppetiteBands,
  useMatrixLikelihoodLevels,
  useMatrixImpactLevels,
  useRiskMatrices, 
} from '@/hooks/useRiskAppetite';
import { RiskMatrixPanel } from './RiskMatrixPanel';

interface TreatmentWizardUnifiedProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  treatmentId?: string | null;
  riskId?: string | null;
  mode?: 'create' | 'edit';
}

type TreatmentStrategy = 'mitigate' | 'accept' | 'transfer' | 'avoid';

const STEPS = [
  { id: 'risk', label: 'Risk', icon: AlertTriangle },
  { id: 'strategy', label: 'Strategy', icon: Crosshair },
  { id: 'controls', label: 'Controls', icon: Shield },
  { id: 'poam', label: 'POAM', icon: Calendar },
  { id: 'residual', label: 'Residual Risk', icon: TrendingDown },
  { id: 'review', label: 'Review', icon: CheckCircle2 },
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

const SEVERITY_OPTIONS: RiskSeverity[] = ['negligible', 'low', 'medium', 'high', 'critical'];
const LIKELIHOOD_OPTIONS: RiskLikelihood[] = ['rare', 'unlikely', 'possible', 'likely', 'almost_certain'];

const getRiskScoreColor = (level: string) => {
  switch (level) {
    case 'critical': return 'text-red-600 bg-red-100';
    case 'high': return 'text-orange-600 bg-orange-100';
    case 'medium': return 'text-amber-600 bg-amber-100';
    case 'low': return 'text-emerald-600 bg-emerald-100';
    default: return 'text-slate-600 bg-slate-100';
  }
};

const calculateResidualRisk = (
  inherentSeverity: RiskSeverity,
  inherentLikelihood: RiskLikelihood,
  controls: { implementation_status: ImplementationStatus; effectiveness_estimate?: number | null }[]
): { severity: RiskSeverity; likelihood: RiskLikelihood; score: number } => {
  const inherentScore = calculateRiskScore(inherentSeverity, inherentLikelihood);
  
  if (controls.length === 0) {
    return { severity: inherentSeverity, likelihood: inherentLikelihood, score: inherentScore };
  }

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
  const cappedEffectiveness = Math.min(avgEffectiveness, 0.85);
  
  const residualScore = Math.round(inherentScore * (1 - cappedEffectiveness));
  
  const severities: RiskSeverity[] = ['negligible', 'low', 'medium', 'high', 'critical'];
  const likelihoods: RiskLikelihood[] = ['rare', 'unlikely', 'possible', 'likely', 'almost_certain'];
  
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

// Severity/likelihood to number mapping
const severityToNumber: Record<RiskSeverity, number> = {
  negligible: 1, low: 2, medium: 3, high: 4, critical: 5,
};
const likelihoodToNumber: Record<RiskLikelihood, number> = {
  rare: 1, unlikely: 2, possible: 3, likely: 4, almost_certain: 5,
};

function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#1f2937' : '#ffffff';
}

interface TreatmentMatrixDisplayProps {
  matrixSize: number;
  bands: any[];
  likelihoodLevels?: any[];
  impactLevels?: any[];
  selectedRisk?: any;
}

const TreatmentMatrixDisplay: React.FC<TreatmentMatrixDisplayProps> = ({
  matrixSize,
  bands,
  likelihoodLevels,
  impactLevels,
  selectedRisk,
}) => {
  const getBandForScore = (score: number) => {
    return bands?.find(band => score >= band.min_score && score <= band.max_score);
  };

  const getCellColor = (likelihood: number, impact: number): string => {
    const score = likelihood * impact;
    const band = getBandForScore(score);
    return band?.color || '#94a3b8';
  };

  const getLikelihoodLabel = (level: number) => {
    const found = likelihoodLevels?.find((l: any) => l.level === level);
    if (found) return found.label;
    const defaults = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];
    return defaults[level - 1] || `L${level}`;
  };

  const getImpactLabel = (level: number) => {
    const found = impactLevels?.find((l: any) => l.level === level);
    if (found) return found.label;
    const defaults = ['Negligible', 'Low', 'Medium', 'High', 'Critical'];
    return defaults[level - 1] || `I${level}`;
  };

  // Get selected risk position on matrix
  const selectedLikelihood = selectedRisk ? likelihoodToNumber[selectedRisk.inherent_likelihood as RiskLikelihood] : null;
  const selectedImpact = selectedRisk ? severityToNumber[selectedRisk.inherent_severity as RiskSeverity] : null;

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <div className="min-w-[350px]">
          <div className="flex">
            {/* Y-axis label */}
            <div className="flex items-center justify-center w-6 mr-1">
              <span 
                className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider transform -rotate-90 whitespace-nowrap"
                style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
              >
                Likelihood →
              </span>
            </div>

            <div className="flex-1">
              {/* Matrix rows */}
              {[...Array(matrixSize)].map((_, rowIndex) => {
                const likelihood = matrixSize - rowIndex;
                const likelihoodLabel = getLikelihoodLabel(likelihood);
                
                return (
                  <div key={rowIndex} className="flex items-stretch">
                    <div className="w-20 flex items-center justify-end pr-2 py-0.5">
                      <span className="text-[10px] text-muted-foreground truncate" title={likelihoodLabel}>
                        {likelihoodLabel}
                      </span>
                    </div>
                    
                    <div className="flex-1 flex gap-0.5">
                      {[...Array(matrixSize)].map((_, colIndex) => {
                        const impact = colIndex + 1;
                        const score = likelihood * impact;
                        const bgColor = getCellColor(likelihood, impact);
                        const isSelected = selectedLikelihood === likelihood && selectedImpact === impact;
                        
                        return (
                          <div
                            key={colIndex}
                            className={`flex-1 aspect-square min-w-[36px] min-h-[36px] rounded flex items-center justify-center text-xs font-bold transition-all ${
                              isSelected ? 'ring-2 ring-primary ring-offset-2 scale-110 z-10' : ''
                            }`}
                            style={{ 
                              backgroundColor: bgColor,
                              color: getContrastColor(bgColor)
                            }}
                            title={`Likelihood: ${likelihoodLabel}, Impact: ${getImpactLabel(impact)}, Score: ${score}`}
                          >
                            {score}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* X-axis labels */}
              <div className="flex items-start mt-1">
                <div className="w-20" />
                <div className="flex-1 flex gap-0.5">
                  {[...Array(matrixSize)].map((_, index) => (
                    <div key={index} className="flex-1 min-w-[36px] text-center">
                      <span className="text-[10px] text-muted-foreground truncate block" title={getImpactLabel(index + 1)}>
                        {getImpactLabel(index + 1)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-center mt-1">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Impact →
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      {bands && bands.length > 0 && (
        <div className="pt-2 border-t border-border">
          <div className="flex flex-wrap gap-1">
            {bands.map((band) => (
              <Badge
                key={band.id}
                variant="outline"
                className="gap-1 py-0.5 px-2 text-xs"
                style={{ borderColor: band.color || '#6366f1' }}
              >
                <div
                  className="w-2 h-2 rounded-sm"
                  style={{ backgroundColor: band.color || '#6366f1' }}
                />
                <span className="text-foreground">{band.label || band.band}</span>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const TreatmentWizardUnified: React.FC<TreatmentWizardUnifiedProps> = ({
  open,
  onOpenChange,
  treatmentId,
  riskId: initialRiskId,
  mode = 'create',
}) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedRiskId, setSelectedRiskId] = useState<string>(initialRiskId || '');
  const [strategy, setStrategy] = useState<TreatmentStrategy | ''>('');
  const [selectedControlId, setSelectedControlId] = useState('');
  const [treatmentTitle, setTreatmentTitle] = useState('');
  const [treatmentDescription, setTreatmentDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [createdTreatmentId, setCreatedTreatmentId] = useState<string | null>(treatmentId || null);
  
  // Residual risk manual override state
  const [useManualResidual, setUseManualResidual] = useState(false);
  const [manualResidualSeverity, setManualResidualSeverity] = useState<RiskSeverity>('medium');
  const [manualResidualLikelihood, setManualResidualLikelihood] = useState<RiskLikelihood>('possible');
  
  // POAM - Plan of Action form state
  const [poamForm, setPoamForm] = useState({
    name: '',
    owner_id: '',
    description: '',
    start_date: '',
    end_date: '',
  });
  const [showPoamForm, setShowPoamForm] = useState(false);
  const [editingPoamId, setEditingPoamId] = useState<string | null>(null);
  const [selectedPoamId, setSelectedPoamId] = useState<string | null>(null);
  const [expandedPoamIds, setExpandedPoamIds] = useState<Set<string>>(new Set());
  
  // Milestone form state (within a POAM/control context)
  const [milestoneForm, setMilestoneForm] = useState({
    control_id: '',
    poam_id: '',
    title: '',
    description: '',
    owner_id: '',
    due_date: '',
  });
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [showMatrix, setShowMatrix] = useState(false);

  const { data: risks } = useRisks();
  const { data: categories } = useRiskCategories();
  const { data: activeAppetite } = useActiveRiskAppetite();
  const { data: appetiteBands } = useRiskAppetiteBands(activeAppetite?.id);
  const { data: likelihoodLevels } = useMatrixLikelihoodLevels(activeAppetite?.matrix_id);
  const { data: impactLevels } = useMatrixImpactLevels(activeAppetite?.matrix_id);
  const { data: matrices } = useRiskMatrices();
  const matrixSize = matrices?.find(m => m.id === activeAppetite?.matrix_id)?.size || 5;
  const { data: treatment, isLoading: treatmentLoading } = useTreatmentDetails(createdTreatmentId || undefined);
  const { data: treatmentControls, refetch: refetchControls } = useTreatmentControls(createdTreatmentId || undefined);
  const { data: milestones, refetch: refetchMilestones } = useTreatmentMilestones(createdTreatmentId || undefined);
  const { data: poams, refetch: refetchPoams } = useTreatmentPoams(createdTreatmentId || undefined);
  const { data: allControls } = useControls();
  const { data: profiles } = useProfiles();
  const { logAction } = useLogRiskAction();

  const createTreatment = useCreateTreatment();
  const addControl = useAddTreatmentControl();
  const removeControl = useRemoveTreatmentControl();
  const updateControl = useUpdateTreatmentControl();
  const addMilestone = useAddTreatmentMilestone();
  const updateMilestone = useUpdateTreatmentMilestone();
  const deleteMilestone = useDeleteTreatmentMilestone();
  const createPoam = useCreateTreatmentPoam();
  const updatePoam = useUpdateTreatmentPoam();
  const deletePoam = useDeleteTreatmentPoam();
  const completeTreatment = useCompleteTreatment();
  const updateTreatment = useUpdateTreatment();

  const selectedRisk = risks?.find(r => r.id === (selectedRiskId || treatment?.risk_id));
  const isCreateMode = mode === 'create' && !createdTreatmentId;

  useEffect(() => {
    if (treatment) {
      setSelectedRiskId(treatment.risk_id);
      setStrategy((treatment as any).strategy || '');
      setTreatmentTitle(treatment.title || '');
      setTreatmentDescription((treatment as any).description || '');
      
      // If treatment has residual values set, use them as manual override
      if (treatment.residual_severity && treatment.residual_likelihood) {
        setManualResidualSeverity(treatment.residual_severity as RiskSeverity);
        setManualResidualLikelihood(treatment.residual_likelihood as RiskLikelihood);
      }
    }
  }, [treatment]);

  useEffect(() => {
    if (initialRiskId) {
      setSelectedRiskId(initialRiskId);
    }
    if (treatmentId) {
      setCreatedTreatmentId(treatmentId);
    }
  }, [initialRiskId, treatmentId]);

  useEffect(() => {
    if (!open) {
      setCurrentStep(0);
      setSelectedControlId('');
      setShowMilestoneForm(false);
      setShowPoamForm(false);
      setEditingPoamId(null);
      setSelectedPoamId(null);
      setExpandedPoamIds(new Set());
      setMilestoneForm({ control_id: '', poam_id: '', title: '', description: '', owner_id: '', due_date: '' });
      setPoamForm({ name: '', owner_id: '', description: '', start_date: '', end_date: '' });
      setUseManualResidual(false);
      if (mode === 'create') {
        setSelectedRiskId('');
        setStrategy('');
        setTreatmentTitle('');
        setTreatmentDescription('');
        setAssignedTo('');
        setDueDate('');
        setCreatedTreatmentId(null);
      }
    }
  }, [open, mode]);

  // Update manual residual when auto-calculation changes and not in manual mode
  useEffect(() => {
    if (!useManualResidual && selectedRisk && treatmentControls) {
      const controlsData = treatmentControls?.map(tc => ({
        implementation_status: tc.implementation_status,
        effectiveness_estimate: (tc as any).effectiveness_estimate,
      })) || [];
      
      const residual = calculateResidualRisk(
        selectedRisk.inherent_severity,
        selectedRisk.inherent_likelihood,
        controlsData
      );
      setManualResidualSeverity(residual.severity);
      setManualResidualLikelihood(residual.likelihood);
    }
  }, [selectedRisk, treatmentControls, useManualResidual]);

  const handleCreateTreatment = async () => {
    if (!selectedRiskId || !treatmentTitle) return;
    
    const result = await createTreatment.mutateAsync({
      risk_id: selectedRiskId,
      title: treatmentTitle,
      description: treatmentDescription || undefined,
      assigned_to: assignedTo || undefined,
      due_date: dueDate || undefined,
      status: 'planned',
    });
    
    setCreatedTreatmentId(result.id);
    logAction('treatment_created', 'treatment', result.id, { title: treatmentTitle });
    setCurrentStep(1);
  };

  const handleAddControl = async () => {
    if (!createdTreatmentId || !selectedControlId) return;
    await addControl.mutateAsync({ 
      treatment_id: createdTreatmentId, 
      control_id: selectedControlId,
      implementation_status: 'planned',
    });
    logAction('control_added', 'treatment', createdTreatmentId, { control_id: selectedControlId });
    setSelectedControlId('');
    refetchControls();
  };

  const handleRemoveControl = async (id: string) => {
    if (!createdTreatmentId) return;
    await removeControl.mutateAsync({ id, treatmentId: createdTreatmentId });
    logAction('control_removed', 'treatment', createdTreatmentId, { control_id: id });
    refetchControls();
  };

  const handleUpdateControlStatus = async (id: string, status: ImplementationStatus) => {
    if (!createdTreatmentId) return;
    await updateControl.mutateAsync({ id, treatmentId: createdTreatmentId, implementation_status: status });
    refetchControls();
  };

  const handleAddMilestone = async () => {
    if (!createdTreatmentId || !milestoneForm.title) return;
    await addMilestone.mutateAsync({
      treatment_id: createdTreatmentId,
      ...milestoneForm,
      control_id: milestoneForm.control_id || undefined,
      owner_id: milestoneForm.owner_id || undefined,
      due_date: milestoneForm.due_date || undefined,
    });
    logAction('milestone_added', 'milestone', createdTreatmentId, { title: milestoneForm.title });
    setMilestoneForm({ control_id: '', poam_id: '', title: '', description: '', owner_id: '', due_date: '' });
    setShowMilestoneForm(false);
    refetchMilestones();
  };

  const handleUpdateMilestoneStatus = async (id: string, status: MilestoneStatus) => {
    if (!createdTreatmentId) return;
    await updateMilestone.mutateAsync({ id, treatmentId: createdTreatmentId, status });
    refetchMilestones();
  };

  const handleDeleteMilestone = async (id: string) => {
    if (!createdTreatmentId) return;
    await deleteMilestone.mutateAsync({ id, treatmentId: createdTreatmentId });
    refetchMilestones();
  };

  const handleSaveStrategy = async () => {
    if (!createdTreatmentId || !strategy) return;
    await updateTreatment.mutateAsync({ 
      id: createdTreatmentId, 
      status: 'planned',
    });
    setCurrentStep(2);
  };

  const handleSetInProgress = async () => {
    if (!createdTreatmentId || !selectedRisk) return;
    
    // Save residual risk to treatment and risk
    await completeTreatment.mutateAsync({
      treatmentId: createdTreatmentId,
      riskId: selectedRisk.id,
      residual_likelihood: manualResidualLikelihood,
      residual_severity: manualResidualSeverity,
      status: 'in_progress',
    });
    
    logAction('treatment_in_progress', 'treatment', createdTreatmentId, {
      residual_likelihood: manualResidualLikelihood,
      residual_severity: manualResidualSeverity,
    });
    
    onOpenChange(false);
  };

  const handleComplete = async () => {
    if (!createdTreatmentId || !selectedRisk) return;
    
    await completeTreatment.mutateAsync({
      treatmentId: createdTreatmentId,
      riskId: selectedRisk.id,
      residual_likelihood: manualResidualLikelihood,
      residual_severity: manualResidualSeverity,
      status: 'completed',
    });
    
    logAction('treatment_completed', 'treatment', createdTreatmentId, {
      residual_likelihood: manualResidualLikelihood,
      residual_severity: manualResidualSeverity,
    });
    
    onOpenChange(false);
  };

  const handleSaveDraft = async () => {
    if (!createdTreatmentId) return;
    await updateTreatment.mutateAsync({ 
      id: createdTreatmentId, 
      status: 'planned',
    });
    onOpenChange(false);
  };

  const controlsData = treatmentControls?.map(tc => ({
    implementation_status: tc.implementation_status,
    effectiveness_estimate: (tc as any).effectiveness_estimate,
  })) || [];

  const autoResidual = selectedRisk 
    ? calculateResidualRisk(selectedRisk.inherent_severity, selectedRisk.inherent_likelihood, controlsData)
    : null;

  const finalResidualScore = calculateRiskScore(manualResidualSeverity, manualResidualLikelihood);
  const finalResidualLevel = getRiskLevel(finalResidualScore);

  const inherentScore = selectedRisk 
    ? calculateRiskScore(selectedRisk.inherent_severity, selectedRisk.inherent_likelihood)
    : 0;
  const inherentLevel = getRiskLevel(inherentScore);

  const availableControls = allControls?.filter(
    (c) => !treatmentControls?.some((tc) => tc.control_id === c.id)
  );

  const canProceed = (step: number) => {
    switch (step) {
      case 0: 
        if (isCreateMode) {
          return !!selectedRiskId && !!treatmentTitle;
        }
        return !!selectedRiskId || !!treatment?.risk_id;
      case 1: return !!strategy;
      case 2: return true;
      case 3: return true;
      case 4: return true;
      case 5: return true;
      default: return true;
    }
  };

  const handleNext = () => {
    if (currentStep === 0 && isCreateMode) {
      handleCreateTreatment();
    } else if (currentStep === 1) {
      handleSaveStrategy();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  if (treatmentLoading && treatmentId) {
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
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <div className="border-b border-border p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <ClipboardList className="w-5 h-5 text-primary" />
              <h1 className="text-xl font-display font-bold text-foreground">
                {mode === 'create' ? 'New Treatment Plan' : 'Treatment Wizard'}
              </h1>
              <Badge variant={createdTreatmentId ? 'default' : 'secondary'}>
                {createdTreatmentId ? 'In Progress' : 'Draft'}
              </Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Stepper - Risk Appetite style */}
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {STEPS.map((step, index) => (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => createdTreatmentId && setCurrentStep(index)}
                  disabled={!createdTreatmentId && index > 0}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors whitespace-nowrap ${
                    index < currentStep
                      ? 'bg-accent/20 text-accent hover:bg-accent/30'
                      : index === currentStep
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  } ${!createdTreatmentId && index > 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {index < currentStep ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <span className="w-4 h-4 flex items-center justify-center text-xs font-mono">
                      {index + 1}
                    </span>
                  )}
                  <span className="hidden sm:inline">{step.label}</span>
                </button>
                {index < STEPS.length - 1 && (
                  <div
                    className={`w-4 h-0.5 flex-shrink-0 ${
                      index < currentStep ? 'bg-accent' : 'bg-border'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-4">
            {/* Step 1: Select Risk */}
            {currentStep === 0 && (
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Select Risk to Treat</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!isCreateMode && treatment?.risk_id ? (
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
                      <div className="space-y-2">
                        <Label>Risk *</Label>
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
                      </div>
                    )}
                    
                    {selectedRisk && (
                      <div className="grid grid-cols-2 gap-4">
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

                    {isCreateMode && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="title">Treatment Title *</Label>
                          <Input
                            id="title"
                            value={treatmentTitle}
                            onChange={(e) => setTreatmentTitle(e.target.value)}
                            placeholder="Enter treatment plan title..."
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={treatmentDescription}
                            onChange={(e) => setTreatmentDescription(e.target.value)}
                            placeholder="Describe the treatment plan..."
                            rows={2}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Assigned To</Label>
                            <Select value={assignedTo} onValueChange={setAssignedTo}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select assignee..." />
                              </SelectTrigger>
                              <SelectContent>
                                {profiles?.map((p) => (
                                  <SelectItem key={p.user_id} value={p.user_id}>
                                    {p.full_name || p.email}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Due Date</Label>
                            <Input
                              type="date"
                              value={dueDate}
                              onChange={(e) => setDueDate(e.target.value)}
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Collapsible Risk Matrix */}
                {activeAppetite && appetiteBands && (
                  <Collapsible open={showMatrix} onOpenChange={setShowMatrix}>
                    <Card>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Grid3X3 className="w-4 h-4 text-primary" />
                              Risk Matrix
                            </CardTitle>
                            {showMatrix ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          <TreatmentMatrixDisplay
                            matrixSize={5}
                            bands={appetiteBands}
                            likelihoodLevels={likelihoodLevels}
                            impactLevels={impactLevels}
                            selectedRisk={selectedRisk}
                          />
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )}
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
              </div>
            )}

            {/* Step 4: POAM (Plan of Action and Milestones) */}
            {currentStep === 3 && (
              <div className="space-y-4">
                {/* POAMs List Header */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Calendar className="w-5 h-5" />
                          Plans of Action & Milestones
                        </CardTitle>
                        <CardDescription>
                          Create multiple plans to organize control implementation
                        </CardDescription>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => {
                          setShowPoamForm(true);
                          setEditingPoamId(null);
                          setPoamForm({ name: '', owner_id: '', description: '', start_date: '', end_date: '' });
                        }}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add POAM
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Add/Edit POAM Form */}
                    {showPoamForm && (
                      <Card className="border-primary/50 bg-primary/5">
                        <CardContent className="pt-4 space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 space-y-2">
                              <Label>Plan Name *</Label>
                              <Input
                                value={poamForm.name}
                                onChange={(e) => setPoamForm({ ...poamForm, name: e.target.value })}
                                placeholder="e.g., Access Control Implementation Plan"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Plan Owner</Label>
                              <Select 
                                value={poamForm.owner_id} 
                                onValueChange={(v) => setPoamForm({ ...poamForm, owner_id: v })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select owner..." />
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
                            <div className="space-y-2">
                              <Label>Status</Label>
                              <Badge variant="outline">Draft</Badge>
                            </div>
                            <div className="space-y-2">
                              <Label>Start Date</Label>
                              <Input
                                type="date"
                                value={poamForm.start_date}
                                onChange={(e) => setPoamForm({ ...poamForm, start_date: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>End Date</Label>
                              <Input
                                type="date"
                                value={poamForm.end_date}
                                onChange={(e) => setPoamForm({ ...poamForm, end_date: e.target.value })}
                              />
                            </div>
                            <div className="col-span-2 space-y-2">
                              <Label>Description</Label>
                              <Textarea
                                value={poamForm.description}
                                onChange={(e) => setPoamForm({ ...poamForm, description: e.target.value })}
                                placeholder="Describe the plan of action..."
                                rows={2}
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-2 border-t">
                            <Button variant="outline" size="sm" onClick={() => {
                              setShowPoamForm(false);
                              setEditingPoamId(null);
                              setPoamForm({ name: '', owner_id: '', description: '', start_date: '', end_date: '' });
                            }}>
                              Cancel
                            </Button>
                            <Button 
                              size="sm" 
                              onClick={async () => {
                                if (!createdTreatmentId || !poamForm.name) return;
                                if (editingPoamId) {
                                  await updatePoam.mutateAsync({
                                    id: editingPoamId,
                                    treatmentId: createdTreatmentId,
                                    name: poamForm.name,
                                    description: poamForm.description || undefined,
                                    owner_id: poamForm.owner_id || undefined,
                                    start_date: poamForm.start_date || undefined,
                                    end_date: poamForm.end_date || undefined,
                                  });
                                } else {
                                  await createPoam.mutateAsync({
                                    treatment_id: createdTreatmentId,
                                    name: poamForm.name,
                                    description: poamForm.description || undefined,
                                    owner_id: poamForm.owner_id || undefined,
                                    start_date: poamForm.start_date || undefined,
                                    end_date: poamForm.end_date || undefined,
                                  });
                                }
                                setShowPoamForm(false);
                                setEditingPoamId(null);
                                setPoamForm({ name: '', owner_id: '', description: '', start_date: '', end_date: '' });
                                refetchPoams();
                              }}
                              disabled={!poamForm.name || createPoam.isPending || updatePoam.isPending}
                            >
                              {createPoam.isPending || updatePoam.isPending ? (
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4 mr-1" />
                              )}
                              {editingPoamId ? 'Update POAM' : 'Create POAM'}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* POAMs List */}
                    {poams && poams.length > 0 ? (
                      <div className="space-y-3">
                        {poams.map((poam) => {
                          const poamMilestones = milestones?.filter(m => m.poam_id === poam.id) || [];
                          const completedMilestones = poamMilestones.filter(m => m.status === 'completed').length;
                          const isExpanded = expandedPoamIds.has(poam.id);
                          
                          return (
                            <Collapsible
                              key={poam.id}
                              open={isExpanded}
                              onOpenChange={(open) => {
                                const newSet = new Set(expandedPoamIds);
                                if (open) {
                                  newSet.add(poam.id);
                                } else {
                                  newSet.delete(poam.id);
                                }
                                setExpandedPoamIds(newSet);
                              }}
                            >
                              <div className="border rounded-lg overflow-hidden">
                                <CollapsibleTrigger asChild>
                                  <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                      <div className="flex-shrink-0">
                                        {isExpanded ? (
                                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                                        ) : (
                                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                                        )}
                                      </div>
                                      <div>
                                        <div className="font-medium text-sm flex items-center gap-2">
                                          {poam.name}
                                          <Badge variant="outline" className="text-xs">
                                            {poam.status}
                                          </Badge>
                                        </div>
                                        <div className="text-xs text-muted-foreground flex items-center gap-3 mt-1">
                                          {poam.profiles && (
                                            <span>Owner: {poam.profiles.full_name || poam.profiles.email}</span>
                                          )}
                                          {poam.start_date && (
                                            <span>Start: {format(new Date(poam.start_date), 'MMM d, yyyy')}</span>
                                          )}
                                          {poam.end_date && (
                                            <span>End: {format(new Date(poam.end_date), 'MMM d, yyyy')}</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="secondary" className="text-xs">
                                        {completedMilestones}/{poamMilestones.length} milestones
                                      </Badge>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingPoamId(poam.id);
                                          setPoamForm({
                                            name: poam.name,
                                            owner_id: poam.owner_id || '',
                                            description: poam.description || '',
                                            start_date: poam.start_date || '',
                                            end_date: poam.end_date || '',
                                          });
                                          setShowPoamForm(true);
                                        }}
                                      >
                                        <ClipboardList className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          if (!createdTreatmentId) return;
                                          await deletePoam.mutateAsync({ id: poam.id, treatmentId: createdTreatmentId });
                                          refetchPoams();
                                          refetchMilestones();
                                        }}
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <div className="border-t px-4 py-3 space-y-3 bg-muted/30">
                                    {poam.description && (
                                      <p className="text-sm text-muted-foreground">{poam.description}</p>
                                    )}
                                    
                                    {/* Milestones for this POAM */}
                                    <div className="flex items-center justify-between">
                                      <Label className="text-sm font-medium">Milestones</Label>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setMilestoneForm({ ...milestoneForm, poam_id: poam.id });
                                          setSelectedPoamId(poam.id);
                                          setShowMilestoneForm(true);
                                        }}
                                      >
                                        <Plus className="w-3 h-3 mr-1" />
                                        Add Milestone
                                      </Button>
                                    </div>

                                    {/* Milestone Form for this POAM */}
                                    {showMilestoneForm && selectedPoamId === poam.id && (
                                      <Card className="border-primary/30 bg-background">
                                        <CardContent className="pt-4 space-y-4">
                                          <div className="grid grid-cols-2 gap-3">
                                            <div className="col-span-2 space-y-2">
                                              <Label className="text-xs">Milestone Title *</Label>
                                              <Input
                                                value={milestoneForm.title}
                                                onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
                                                placeholder="e.g., Complete security assessment..."
                                                className="h-8"
                                              />
                                            </div>
                                            <div className="space-y-2">
                                              <Label className="text-xs">Linked Control</Label>
                                              <Select 
                                                value={milestoneForm.control_id} 
                                                onValueChange={(v) => setMilestoneForm({ ...milestoneForm, control_id: v })}
                                              >
                                                <SelectTrigger className="h-8">
                                                  <SelectValue placeholder="Tag a control..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  {treatmentControls?.map((tc) => (
                                                    <SelectItem key={tc.control_id} value={tc.control_id}>
                                                      {tc.controls?.name} ({tc.controls?.control_id})
                                                    </SelectItem>
                                                  ))}
                                                </SelectContent>
                                              </Select>
                                            </div>
                                            <div className="space-y-2">
                                              <Label className="text-xs">Owner</Label>
                                              <Select 
                                                value={milestoneForm.owner_id} 
                                                onValueChange={(v) => setMilestoneForm({ ...milestoneForm, owner_id: v })}
                                              >
                                                <SelectTrigger className="h-8">
                                                  <SelectValue placeholder="Assign..." />
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
                                            <div className="space-y-2">
                                              <Label className="text-xs">Due Date</Label>
                                              <Input
                                                type="date"
                                                value={milestoneForm.due_date}
                                                onChange={(e) => setMilestoneForm({ ...milestoneForm, due_date: e.target.value })}
                                                className="h-8"
                                              />
                                            </div>
                                            <div className="col-span-2 space-y-2">
                                              <Label className="text-xs">Description</Label>
                                              <Textarea
                                                value={milestoneForm.description}
                                                onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                                                placeholder="Describe what needs to be accomplished..."
                                                rows={2}
                                                className="text-sm"
                                              />
                                            </div>
                                          </div>
                                          <div className="flex justify-end gap-2">
                                            <Button variant="outline" size="sm" onClick={() => {
                                              setShowMilestoneForm(false);
                                              setSelectedPoamId(null);
                                              setMilestoneForm({ control_id: '', poam_id: '', title: '', description: '', owner_id: '', due_date: '' });
                                            }}>
                                              Cancel
                                            </Button>
                                            <Button 
                                              size="sm" 
                                              onClick={async () => {
                                                if (!createdTreatmentId || !milestoneForm.title) return;
                                                await addMilestone.mutateAsync({
                                                  treatment_id: createdTreatmentId,
                                                  title: milestoneForm.title,
                                                  description: milestoneForm.description || undefined,
                                                  poam_id: poam.id,
                                                  control_id: milestoneForm.control_id || undefined,
                                                  owner_id: milestoneForm.owner_id || undefined,
                                                  due_date: milestoneForm.due_date || undefined,
                                                });
                                                setShowMilestoneForm(false);
                                                setSelectedPoamId(null);
                                                setMilestoneForm({ control_id: '', poam_id: '', title: '', description: '', owner_id: '', due_date: '' });
                                                refetchMilestones();
                                              }}
                                              disabled={!milestoneForm.title || addMilestone.isPending}
                                            >
                                              <Plus className="w-3 h-3 mr-1" />
                                              Add
                                            </Button>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    )}

                                    {/* Milestones List */}
                                    {poamMilestones.length > 0 ? (
                                      <div className="space-y-2">
                                        {poamMilestones.map((milestone, idx) => (
                                          <div key={milestone.id} className="flex items-center gap-3 p-2 bg-background rounded border">
                                            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                                              {idx + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <div className="font-medium text-sm">{milestone.title}</div>
                                              <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                {milestone.controls && (
                                                  <Badge variant="outline" className="text-xs py-0 h-4">
                                                    {milestone.controls.control_id}
                                                  </Badge>
                                                )}
                                                {milestone.due_date && (
                                                  <span>Due: {format(new Date(milestone.due_date), 'MMM d')}</span>
                                                )}
                                              </div>
                                            </div>
                                            <Select 
                                              value={milestone.status}
                                              onValueChange={(v) => handleUpdateMilestoneStatus(milestone.id, v as MilestoneStatus)}
                                            >
                                              <SelectTrigger className="h-7 w-24 text-xs">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="pending">Pending</SelectItem>
                                                <SelectItem value="in_progress">In Progress</SelectItem>
                                                <SelectItem value="completed">Completed</SelectItem>
                                              </SelectContent>
                                            </Select>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                              onClick={() => handleDeleteMilestone(milestone.id)}
                                            >
                                              <X className="w-3 h-3" />
                                            </Button>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-center py-4 text-muted-foreground text-sm border rounded border-dashed">
                                        No milestones yet. Add milestones to track progress.
                                      </div>
                                    )}
                                  </div>
                                </CollapsibleContent>
                              </div>
                            </Collapsible>
                          );
                        })}
                      </div>
                    ) : !showPoamForm && (
                      <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                        <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No plans of action defined yet.</p>
                        <p className="text-xs mt-1">Create a POAM to organize control implementation and track milestones.</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-3"
                          onClick={() => setShowPoamForm(true)}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Create First POAM
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 5: Residual Risk */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingDown className="w-5 h-5" />
                      Residual Risk Assessment
                    </CardTitle>
                    <CardDescription>
                      Review the calculated residual risk or manually adjust if needed
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Inherent Risk Summary */}
                    <div className="p-4 rounded-lg bg-muted/50">
                      <Label className="text-xs text-muted-foreground">Inherent Risk</Label>
                      <div className="flex items-center gap-4 mt-2">
                        <Badge className={getRiskScoreColor(inherentLevel)}>
                          Score: {inherentScore} ({inherentLevel})
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Severity: {selectedRisk?.inherent_severity} | Likelihood: {selectedRisk?.inherent_likelihood.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Auto-calculated Residual */}
                    {autoResidual && (
                      <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
                        <Label className="text-xs text-muted-foreground">Auto-calculated Residual Risk (from controls)</Label>
                        <div className="flex items-center gap-4 mt-2">
                          <Badge className={getRiskScoreColor(getRiskLevel(autoResidual.score))}>
                            Score: {autoResidual.score} ({getRiskLevel(autoResidual.score)})
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Severity: {autoResidual.severity} | Likelihood: {autoResidual.likelihood.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Manual Override Toggle */}
                    <div className="flex items-center justify-between p-4 rounded-lg border">
                      <div>
                        <Label>Manual Adjustment</Label>
                        <p className="text-sm text-muted-foreground">
                          Override the auto-calculated residual risk
                        </p>
                      </div>
                      <Switch
                        checked={useManualResidual}
                        onCheckedChange={setUseManualResidual}
                      />
                    </div>

                    {/* Manual Residual Inputs */}
                    <div className={`space-y-4 ${!useManualResidual ? 'opacity-50 pointer-events-none' : ''}`}>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Residual Severity</Label>
                          <Select 
                            value={manualResidualSeverity} 
                            onValueChange={(v) => setManualResidualSeverity(v as RiskSeverity)}
                            disabled={!useManualResidual}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {SEVERITY_OPTIONS.map((s) => (
                                <SelectItem key={s} value={s} className="capitalize">
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Residual Likelihood</Label>
                          <Select 
                            value={manualResidualLikelihood} 
                            onValueChange={(v) => setManualResidualLikelihood(v as RiskLikelihood)}
                            disabled={!useManualResidual}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {LIKELIHOOD_OPTIONS.map((l) => (
                                <SelectItem key={l} value={l} className="capitalize">
                                  {l.replace('_', ' ')}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Final Residual Preview */}
                    <div className="p-4 rounded-lg border-2 border-primary bg-primary/10">
                      <Label className="text-xs text-muted-foreground">Final Residual Risk (will be saved)</Label>
                      <div className="flex items-center gap-4 mt-2">
                        <Badge className={`${getRiskScoreColor(finalResidualLevel)} text-base px-3 py-1`}>
                          Score: {finalResidualScore} ({finalResidualLevel})
                        </Badge>
                        <span className="text-sm">
                          Severity: <span className="font-medium capitalize">{manualResidualSeverity}</span> | 
                          Likelihood: <span className="font-medium capitalize">{manualResidualLikelihood.replace('_', ' ')}</span>
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {useManualResidual ? 'Manually adjusted' : 'Auto-calculated from control implementation status'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 6: Review & Save */}
            {currentStep === 5 && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Treatment Summary</CardTitle>
                    <CardDescription>
                      Review the treatment plan and choose an action
                    </CardDescription>
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

                    {/* Risk Comparison */}
                    <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
                      <Label className="text-xs text-muted-foreground">Risk Reduction</Label>
                      <div className="flex items-center gap-4 mt-2">
                        <Badge className={getRiskScoreColor(inherentLevel)}>
                          Inherent: {inherentScore} ({inherentLevel})
                        </Badge>
                        <span className="text-muted-foreground">→</span>
                        <Badge className={getRiskScoreColor(finalResidualLevel)}>
                          Residual: {finalResidualScore} ({finalResidualLevel})
                        </Badge>
                        {inherentScore > finalResidualScore && (
                          <span className="text-sm text-emerald-600 font-medium">
                            -{Math.round((1 - finalResidualScore / inherentScore) * 100)}% reduction
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status Actions */}
                    <div className="space-y-3 pt-4 border-t">
                      <Label className="text-sm font-medium">Choose Treatment Status</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <Card 
                          className="cursor-pointer hover:border-primary/50 transition-colors"
                          onClick={handleSetInProgress}
                        >
                          <CardContent className="pt-4 flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                              <Play className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="font-medium">Start Treatment</h4>
                              <p className="text-sm text-muted-foreground">
                                Set status to "In Progress" and begin implementation
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                        <Card 
                          className="cursor-pointer hover:border-primary/50 transition-colors"
                          onClick={handleComplete}
                        >
                          <CardContent className="pt-4 flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
                              <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="font-medium">Complete Treatment</h4>
                              <p className="text-sm text-muted-foreground">
                                Mark as completed and update risk register
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 flex-shrink-0">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
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
              {createdTreatmentId && (
                <Button variant="outline" onClick={handleSaveDraft}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Draft
                </Button>
              )}
              {currentStep < STEPS.length - 1 && (
                <Button 
                  onClick={handleNext} 
                  disabled={!canProceed(currentStep) || createTreatment.isPending}
                >
                  {createTreatment.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {currentStep === 0 && isCreateMode ? 'Create & Continue' : 'Next'}
                  <ArrowRight className="w-4 h-4 ml-2" />
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
          highlightedLikelihood={selectedRisk ? likelihoodToNumber[selectedRisk.inherent_likelihood as RiskLikelihood] : null}
          highlightedImpact={selectedRisk ? severityToNumber[selectedRisk.inherent_severity as RiskSeverity] : null}
          categories={categories}
        />
      </DialogContent>
    </Dialog>
  );
};

export default TreatmentWizardUnified;
