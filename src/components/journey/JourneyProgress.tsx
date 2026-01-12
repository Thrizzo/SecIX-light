import React from 'react';
import { Progress } from '@/components/ui/progress';
import { JOURNEY_STEPS } from '@/contexts/JourneyContext';

interface JourneyProgressProps {
  completedSteps: number[];
  currentStep: number;
  isStartupMode: boolean;
}

const JourneyProgress: React.FC<JourneyProgressProps> = ({ completedSteps, currentStep, isStartupMode }) => {
  // Filter steps based on mode
  const applicableSteps = JOURNEY_STEPS.filter(step => !step.advancedOnly || !isStartupMode);
  const completedCount = completedSteps.filter(stepId => 
    applicableSteps.some(s => s.id === stepId)
  ).length;
  const totalSteps = applicableSteps.length;
  const progressPercent = Math.round((completedCount / totalSteps) * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {completedCount} of {totalSteps} steps completed
        </span>
        <span className="font-medium">{progressPercent}%</span>
      </div>
      <Progress value={progressPercent} className="h-2" />
    </div>
  );
};

export default JourneyProgress;
