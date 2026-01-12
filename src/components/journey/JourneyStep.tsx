import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Check, ArrowRight, ExternalLink, SkipForward, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface JourneyStepProps {
  stepId: number;
  name: string;
  description: string;
  route?: string;
  isCompleted: boolean;
  isCurrent: boolean;
  isAdvancedOnly?: boolean;
  isStartupMode: boolean;
  onComplete: () => void;
  onSkip: () => void;
  onJumpTo?: () => void;
  content: React.ReactNode;
  actions?: { label: string; description: string }[];
  isCollapsed?: boolean;
}

const JourneyStep: React.FC<JourneyStepProps> = ({
  stepId,
  name,
  description,
  route,
  isCompleted,
  isCurrent,
  isAdvancedOnly,
  isStartupMode,
  onComplete,
  onSkip,
  onJumpTo,
  content,
  actions = [],
  isCollapsed = false,
}) => {
  const navigate = useNavigate();

  // Skip this step display if it's advanced-only and we're in startup mode
  if (isAdvancedOnly && isStartupMode) {
    return null;
  }

  // Collapsed view for completed steps
  if (isCollapsed) {
    return (
      <Card className="bg-muted/30 transition-all hover:bg-muted/50">
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-green-500 text-white">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  {name}
                  {isAdvancedOnly && (
                    <Badge variant="secondary" className="text-xs">Advanced</Badge>
                  )}
                </CardTitle>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {route && (
                <Button variant="ghost" size="sm" onClick={() => navigate(route)}>
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Open
                </Button>
              )}
              {onJumpTo && (
                <Button variant="ghost" size="sm" onClick={onJumpTo}>
                  <Play className="w-3 h-3 mr-1" />
                  Resume Here
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={`transition-all ${isCurrent ? 'ring-2 ring-primary shadow-lg' : ''} ${isCompleted ? 'bg-muted/30' : ''}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                isCompleted
                  ? 'bg-green-500 text-white'
                  : isCurrent
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {isCompleted ? <Check className="w-5 h-5" /> : stepId + 1}
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {name}
                {isAdvancedOnly && (
                  <Badge variant="secondary" className="text-xs">Advanced</Badge>
                )}
              </CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isCompleted && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Completed
              </Badge>
            )}
            {!isCurrent && onJumpTo && (
              <Button variant="ghost" size="sm" onClick={onJumpTo}>
                <Play className="w-3 h-3 mr-1" />
                Jump Here
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {isCurrent && (
        <CardContent className="space-y-4">
          <div className="prose prose-sm max-w-none text-muted-foreground">
            {content}
          </div>

          {actions.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Key Actions:</p>
              <ul className="space-y-1">
                {actions.map((action, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <div className="w-5 h-5 rounded bg-muted flex items-center justify-center text-xs mt-0.5">
                      {index + 1}
                    </div>
                    <div>
                      <span className="font-medium">{action.label}</span>
                      <span className="text-muted-foreground"> — {action.description}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-3 pt-4 border-t">
            {route && (
              <Button variant="outline" onClick={() => navigate(route)}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Module
              </Button>
            )}
            <Button onClick={onComplete}>
              Mark Complete
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button variant="ghost" onClick={onSkip}>
              <SkipForward className="w-4 h-4 mr-2" />
              Skip
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default JourneyStep;
