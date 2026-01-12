import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TrendDirection = 'up' | 'down' | 'stable';
export type TrendSentiment = 'positive' | 'negative' | 'neutral';

interface MetricsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  trend?: TrendDirection;
  trendValue?: string;
  trendSentiment?: TrendSentiment;
  className?: string;
}

export const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-primary',
  trend,
  trendValue,
  trendSentiment = 'neutral',
  className,
}) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return TrendingUp;
      case 'down':
        return TrendingDown;
      default:
        return Minus;
    }
  };

  const getTrendColor = () => {
    if (trendSentiment === 'positive') {
      return trend === 'up' ? 'text-green-500' : 'text-green-500';
    }
    if (trendSentiment === 'negative') {
      return trend === 'up' ? 'text-red-500' : 'text-red-500';
    }
    return 'text-muted-foreground';
  };

  const TrendIcon = getTrendIcon();

  return (
    <Card className={cn("bg-card border-border hover:shadow-md transition-shadow", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={cn("w-4 h-4", iconColor)} />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-display font-bold">{value}</div>
        {(subtitle || trend) && (
          <div className="flex items-center gap-2 mt-1">
            {trend && (
              <div className={cn("flex items-center gap-1", getTrendColor())}>
                <TrendIcon className="w-3 h-3" />
                {trendValue && <span className="text-xs">{trendValue}</span>}
              </div>
            )}
            {subtitle && (
              <span className="text-xs text-muted-foreground">{subtitle}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
