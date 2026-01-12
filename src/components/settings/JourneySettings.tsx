import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useJourney, JOURNEY_STEPS } from '@/contexts/JourneyContext';
import { useNavigate } from 'react-router-dom';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Compass, RotateCcw, Play, CheckCircle, Rocket, Zap } from 'lucide-react';
import { toast } from 'sonner';

const JourneySettings: React.FC = () => {
  const navigate = useNavigate();
  const {
    journeyProgress,
    isLoading,
    isJourneyComplete,
    isStartupMode,
    currentStep,
    completedSteps,
    journeyMode,
    switchMode,
    resetJourney,
    reopenJourney,
  } = useJourney();

  const handleSwitchMode = async (newMode: 'startup' | 'advanced') => {
    await switchMode(newMode);
    toast.success(`Switched to ${newMode === 'startup' ? 'Startup' : 'Advanced'} mode`);
  };

  const handleRestart = async () => {
    await resetJourney();
    toast.success('Journey reset successfully');
    navigate('/dashboard/journey');
  };

  const handleReopen = async () => {
    await reopenJourney();
    toast.success('Journey reopened');
    navigate('/dashboard/journey');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  const applicableSteps = JOURNEY_STEPS.filter(step => !step.advancedOnly || !isStartupMode);
  const progressPercentage = Math.round((completedSteps.length / applicableSteps.length) * 100);

  return (
    <div className="space-y-6">
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Compass className="w-6 h-6 text-primary" />
            <div>
              <CardTitle>Security Journey</CardTitle>
              <CardDescription>
                Manage your guided onboarding experience and progress
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Status */}
          <div className="p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-medium">Current Status</h3>
                <p className="text-sm text-muted-foreground">
                  {isJourneyComplete 
                    ? 'Journey completed! All modules unlocked.'
                    : journeyMode 
                      ? `In progress - Step ${currentStep + 1} of ${applicableSteps.length}`
                      : 'Not started'
                  }
                </p>
              </div>
              <Badge variant={isJourneyComplete ? 'default' : journeyMode ? 'secondary' : 'outline'}>
                {isJourneyComplete ? 'Complete' : journeyMode ? 'In Progress' : 'Not Started'}
              </Badge>
            </div>
            
            {journeyMode && (
              <>
                <div className="w-full bg-muted rounded-full h-2 mb-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {completedSteps.length} of {applicableSteps.length} steps completed ({progressPercentage}%)
                </p>
              </>
            )}
          </div>

          {/* Journey Mode */}
          <div>
            <h3 className="font-medium mb-3">Journey Mode</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  journeyMode === 'startup' ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => journeyMode !== 'startup' && handleSwitchMode('startup')}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Rocket className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Startup Mode</h4>
                        {journeyMode === 'startup' && (
                          <Badge variant="default" className="text-xs">Active</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Streamlined journey for early-stage companies. Skips advanced security operations.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  journeyMode === 'advanced' ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => journeyMode !== 'advanced' && handleSwitchMode('advanced')}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-purple-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Advanced Mode</h4>
                        {journeyMode === 'advanced' && (
                          <Badge variant="default" className="text-xs">Active</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Complete journey with all security modules including Security Operations.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-4 border-t">
            {isJourneyComplete ? (
              <Button onClick={handleReopen}>
                <Play className="w-4 h-4 mr-2" />
                Reopen Journey
              </Button>
            ) : journeyMode ? (
              <Button onClick={() => navigate('/dashboard/journey')}>
                <Play className="w-4 h-4 mr-2" />
                Continue Journey
              </Button>
            ) : (
              <Button onClick={() => navigate('/dashboard/journey')}>
                <Play className="w-4 h-4 mr-2" />
                Start Journey
              </Button>
            )}

            {journeyMode && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Restart Journey
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Restart Security Journey?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will reset all your journey progress and let you start fresh from the beginning. 
                      Your data in the modules (risks, assets, controls, etc.) will NOT be deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRestart}>
                      Restart Journey
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Completed Steps Summary */}
      {journeyMode && completedSteps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Completed Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {JOURNEY_STEPS.filter(step => 
                completedSteps.includes(step.id) && step.id > 0
              ).map(step => (
                <div 
                  key={step.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-sm"
                >
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  <span className="truncate">{step.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default JourneySettings;
