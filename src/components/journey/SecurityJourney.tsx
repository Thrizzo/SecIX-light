import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useJourney, JOURNEY_STEPS } from '@/contexts/JourneyContext';
import JourneyModeSelector from './JourneyModeSelector';
import JourneyStep from './JourneyStep';
import JourneyProgress from './JourneyProgress';
import { getStepContent } from './JourneyStepContent';
import { Compass, Trophy, Rocket, Sparkles, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const SecurityJourney: React.FC = () => {
  const navigate = useNavigate();
  const {
    journeyProgress,
    isLoading,
    isJourneyComplete,
    isStartupMode,
    currentStep,
    completedSteps,
    journeyMode,
    setJourneyMode,
    switchMode,
    completeStep,
    skipStep,
    goToStep,
    completeJourney,
    resetJourney,
    reopenJourney,
  } = useJourney();
  const [settingMode, setSettingMode] = useState(false);
  const [showAllSteps, setShowAllSteps] = useState(false);

  const handleSelectMode = async (mode: 'startup' | 'advanced') => {
    setSettingMode(true);
    await setJourneyMode(mode);
    setSettingMode(false);
  };

  const handleCompleteJourney = async () => {
    await completeJourney();
    navigate('/dashboard');
  };

  const handleRestartJourney = async () => {
    await resetJourney();
  };

  const handleSwitchMode = async (newMode: 'startup' | 'advanced') => {
    setSettingMode(true);
    await switchMode(newMode);
    setSettingMode(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Journey complete view
  if (isJourneyComplete) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mb-4">
              <Trophy className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-2xl">Journey Complete!</CardTitle>
            <CardDescription>
              You've successfully completed the Security Journey. All modules are now available.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap justify-center gap-3">
              <Button onClick={() => navigate('/dashboard')}>
                <Rocket className="w-4 h-4 mr-2" />
                Go to Dashboard
              </Button>
              <Button variant="outline" onClick={reopenJourney}>
                <Compass className="w-4 h-4 mr-2" />
                Review Journey
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Start Over
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Restart Security Journey?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will reset all your progress and let you start fresh. Your data in the modules will not be deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRestartJourney}>
                      Restart Journey
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Mode selection (step 0)
  if (!journeyMode) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Compass className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Security Journey</h1>
            <p className="text-muted-foreground">Your guided path to GRC excellence</p>
          </div>
        </div>
        <JourneyModeSelector onSelectMode={handleSelectMode} isLoading={settingMode} />
      </div>
    );
  }

  // Filter steps based on mode
  const applicableSteps = JOURNEY_STEPS.filter(step => !step.advancedOnly || !isStartupMode);
  const isLastStep = currentStep === JOURNEY_STEPS.length - 1;

  // Split steps into current/upcoming and completed
  const upcomingSteps = JOURNEY_STEPS.slice(1).filter(step => 
    step.id >= currentStep && (!step.advancedOnly || !isStartupMode)
  );
  const otherSteps = JOURNEY_STEPS.slice(1).filter(step => 
    step.id < currentStep && (!step.advancedOnly || !isStartupMode)
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Compass className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Security Journey</h1>
            <p className="text-muted-foreground">
              {isStartupMode ? 'Startup Mode' : 'Advanced Mode'} • Step {currentStep + 1} of {applicableSteps.length}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSwitchMode(isStartupMode ? 'advanced' : 'startup')}
            disabled={settingMode}
          >
            Switch to {isStartupMode ? 'Advanced' : 'Startup'}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <RotateCcw className="w-4 h-4 mr-1" />
                Restart
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Restart Security Journey?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will reset all your progress and let you start fresh. Your data in the modules will not be deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleRestartJourney}>
                  Restart Journey
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <JourneyProgress
        completedSteps={completedSteps}
        currentStep={currentStep}
        isStartupMode={isStartupMode}
      />

      <Alert className="bg-accent/10 border-accent/20">
        <Sparkles className="h-4 w-4 text-accent" />
        <AlertDescription>
          If you ever have questions or don't know what to do, ask our handy assistant <strong>Fragobert</strong> — just click the chat button in the bottom right corner!
        </AlertDescription>
      </Alert>

      {/* Completed steps - collapsible */}
      {otherSteps.length > 0 && (
        <Collapsible open={showAllSteps} onOpenChange={setShowAllSteps}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between text-muted-foreground hover:text-foreground">
              <span>{otherSteps.length} completed step{otherSteps.length > 1 ? 's' : ''}</span>
              {showAllSteps ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 mt-2">
            {otherSteps.map((step) => {
              const stepContent = getStepContent(step.id);
              return (
                <JourneyStep
                  key={step.id}
                  stepId={step.id}
                  name={step.name}
                  description={step.description}
                  route={step.route}
                  isCompleted={completedSteps.includes(step.id)}
                  isCurrent={false}
                  isAdvancedOnly={step.advancedOnly}
                  isStartupMode={isStartupMode}
                  onComplete={() => completeStep(step.id)}
                  onSkip={() => skipStep(step.id)}
                  onJumpTo={() => goToStep(step.id)}
                  content={stepContent.content}
                  actions={stepContent.actions}
                  isCollapsed
                />
              );
            })}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Current and upcoming steps */}
      <div className="space-y-4">
        {upcomingSteps.map((step) => {
          const stepContent = getStepContent(step.id);
          return (
            <JourneyStep
              key={step.id}
              stepId={step.id}
              name={step.name}
              description={step.description}
              route={step.route}
              isCompleted={completedSteps.includes(step.id)}
              isCurrent={currentStep === step.id}
              isAdvancedOnly={step.advancedOnly}
              isStartupMode={isStartupMode}
              onComplete={() => {
                if (isLastStep) {
                  handleCompleteJourney();
                } else {
                  completeStep(step.id);
                }
              }}
              onSkip={() => {
                if (isLastStep) {
                  handleCompleteJourney();
                } else {
                  skipStep(step.id);
                }
              }}
              onJumpTo={() => goToStep(step.id)}
              content={stepContent.content}
              actions={stepContent.actions}
            />
          );
        })}
      </div>

      {currentStep === JOURNEY_STEPS.length - 1 && (
        <div className="flex justify-center pt-4">
          <Button size="lg" onClick={handleCompleteJourney}>
            <Trophy className="w-5 h-5 mr-2" />
            Complete Journey & Start Using SecIX
          </Button>
        </div>
      )}
    </div>
  );
};

export default SecurityJourney;
