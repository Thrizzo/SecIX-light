import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Lightbulb
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DashboardInsight } from '@/types/dashboard';

interface InsightCardProps {
  insight: DashboardInsight;
}

export const InsightCard: React.FC<InsightCardProps> = ({ insight }) => {
  const getSeverityConfig = () => {
    switch (insight.severity) {
      case 'critical':
        return { 
          icon: AlertTriangle, 
          color: 'text-red-500', 
          bgColor: 'bg-red-500/10',
          badgeVariant: 'destructive' as const
        };
      case 'high':
        return { 
          icon: AlertCircle, 
          color: 'text-orange-500', 
          bgColor: 'bg-orange-500/10',
          badgeVariant: 'default' as const
        };
      case 'medium':
        return { 
          icon: Info, 
          color: 'text-yellow-500', 
          bgColor: 'bg-yellow-500/10',
          badgeVariant: 'secondary' as const
        };
      case 'low':
        return { 
          icon: CheckCircle, 
          color: 'text-blue-500', 
          bgColor: 'bg-blue-500/10',
          badgeVariant: 'outline' as const
        };
      default:
        return { 
          icon: Lightbulb, 
          color: 'text-muted-foreground', 
          bgColor: 'bg-muted',
          badgeVariant: 'outline' as const
        };
    }
  };

  const getTrendIcon = () => {
    switch (insight.trend) {
      case 'improving':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'declining':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const config = getSeverityConfig();
  const Icon = config.icon;

  return (
    <Card className={cn("border-border hover:shadow-md transition-shadow", config.bgColor)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn("p-2 rounded-lg", config.bgColor)}>
            <Icon className={cn("w-5 h-5", config.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h4 className="font-semibold text-foreground">{insight.title}</h4>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                insight.severity === 'critical' ? 'bg-red-500/20 text-red-500' :
                insight.severity === 'high' ? 'bg-orange-500/20 text-orange-500' :
                insight.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-500' :
                'bg-blue-500/20 text-blue-500'
              }`}>
                {insight.severity}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
                {insight.category}
              </span>
              {getTrendIcon()}
            </div>
            <p className="text-sm text-muted-foreground mb-2">{insight.description}</p>
            {insight.recommendation && (
              <div className="flex items-start gap-2 bg-background/50 rounded-md p-2">
                <Lightbulb className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm text-foreground">{insight.recommendation}</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
