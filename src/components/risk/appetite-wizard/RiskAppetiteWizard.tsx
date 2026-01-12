import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Save, CheckCircle2, X } from 'lucide-react';
import { WizardFormData, getInitialFormData } from './types';
import ProfileSetup from './ProfileSetup';
import RiskCategories from './RiskCategories';
import CatastrophicAnchors from './CatastrophicAnchors';
import CategoryThresholdsTable from './CategoryThresholdsTable';
import LikelihoodThresholds from './LikelihoodThresholds';
import AcceptanceLevels from './AcceptanceLevels';
import MatrixReview from './MatrixReview';
import Confirmation from './Confirmation';
import LivePreview from './LivePreview';

interface RiskAppetiteWizardProps {
  onSave: (data: WizardFormData, activate: boolean) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<WizardFormData> | null;
  profiles: Array<{ id: string; full_name: string | null; email: string | null }>;
  matrices: Array<{ id: string; name: string; size: number; is_active: boolean }>;
  categories: Array<{ id: string; name: string; description: string | null; color: string | null }>;
}

const steps = [
  { id: 0, label: 'Setup' },
  { id: 1, label: 'Categories' },
  { id: 2, label: 'Worst Case' },
  { id: 3, label: 'Impact' },
  { id: 4, label: 'Likelihood' },
  { id: 5, label: 'Bands' },
  { id: 6, label: 'Matrix' },
  { id: 7, label: 'Confirm' },
];

const RiskAppetiteWizard: React.FC<RiskAppetiteWizardProps> = ({
  onSave,
  onCancel,
  initialData,
  profiles,
  matrices,
  categories,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<WizardFormData>(() => {
    if (initialData) {
      return { ...getInitialFormData(initialData.matrix_size || 5), ...initialData };
    }
    const activeMatrix = matrices.find(m => m.is_active);
    return {
      ...getInitialFormData(activeMatrix?.size || 5),
      matrix_id: activeMatrix?.id || '',
    };
  });

  // When editing, initialData arrives async from the container.
  // Hydrate formData when it becomes available.
  React.useEffect(() => {
    if (!initialData) return;
    setFormData({ ...getInitialFormData(initialData.matrix_size || 5), ...initialData });
  }, [initialData]);

  const handleChange = (updates: Partial<WizardFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      await onSave({ ...formData, status: 'Draft' }, false);
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    setSaving(true);
    try {
      await onSave(
        {
          ...formData,
          status: 'Approved',
          effective_date: formData.effective_date || new Date().toISOString().split('T')[0],
        },
        true
      );
    } finally {
      setSaving(false);
    }
  };

  const isValid = formData.name && formData.owner_id && formData.matrix_id;
  const hasCategories = formData.risk_categories.filter(c => c.is_enabled).length > 0;
  const isLastStep = currentStep === steps.length - 1;

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <ProfileSetup
            formData={formData}
            onChange={handleChange}
            profiles={profiles}
            matrices={matrices}
          />
        );
      case 1:
        return (
          <RiskCategories
            formData={formData}
            onChange={handleChange}
            existingCategories={categories}
          />
        );
      case 2:
        return (
          <CatastrophicAnchors
            formData={formData}
            onChange={handleChange}
          />
        );
      case 3:
        return (
          <CategoryThresholdsTable
            formData={formData}
            onChange={handleChange}
          />
        );
      case 4:
        return (
          <LikelihoodThresholds
            formData={formData}
            onChange={handleChange}
          />
        );
      case 5:
        return (
          <AcceptanceLevels
            formData={formData}
            onChange={handleChange}
            profiles={profiles}
          />
        );
      case 6:
        return <MatrixReview formData={formData} />;
      case 7:
        return (
          <Confirmation
            formData={formData}
            onChange={handleChange}
            profiles={profiles}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-[85vh] max-h-[85vh] bg-background overflow-hidden">
      {/* Header */}
      <div className="border-b border-border p-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-display font-bold text-foreground">
              Risk Appetite Wizard
            </h1>
            <Badge variant={formData.status === 'Approved' ? 'default' : 'secondary'}>
              {formData.status}
            </Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <button
                onClick={() => setCurrentStep(index)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors whitespace-nowrap ${
                  index < currentStep
                    ? 'bg-accent/20 text-accent hover:bg-accent/30'
                    : index === currentStep
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
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
              {index < steps.length - 1 && (
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
      <div className="flex-1 overflow-hidden flex">
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto">
            {renderStep()}
          </div>
        </div>

        {/* Live Preview Sidebar */}
        {currentStep >= 1 && (
          <div className="w-64 border-l border-border p-4 overflow-y-auto hidden lg:block">
            <LivePreview formData={formData} />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border p-4 flex-shrink-0">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            {currentStep > 0 && (
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={!isValid || saving}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
            {isLastStep ? (
              <Button
                onClick={handleApprove}
                disabled={!isValid || !hasCategories || saving}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Approve & Activate
              </Button>
            ) : (
              <Button onClick={handleNext} disabled={currentStep === 0 && !isValid}>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskAppetiteWizard;
