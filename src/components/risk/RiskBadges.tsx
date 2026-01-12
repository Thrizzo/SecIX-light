import React from 'react';
import { cn } from '@/lib/utils';
import { RiskSeverity, RiskLikelihood, getRiskLevel, calculateRiskScore } from '@/hooks/useRisks';

interface RiskScoreBadgeProps {
  severity: RiskSeverity;
  likelihood: RiskLikelihood;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const RiskScoreBadge: React.FC<RiskScoreBadgeProps> = ({
  severity,
  likelihood,
  size = 'md',
  showLabel = false,
}) => {
  const score = calculateRiskScore(severity, likelihood);
  const level = getRiskLevel(score);

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };

  const colorClasses = {
    critical: 'bg-severity-critical text-foreground',
    high: 'bg-severity-high text-background',
    medium: 'bg-severity-medium text-background',
    low: 'bg-severity-low text-background',
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          'rounded flex items-center justify-center font-mono font-bold',
          sizeClasses[size],
          colorClasses[level]
        )}
      >
        {score}
      </div>
      {showLabel && (
        <span className={cn('capitalize text-sm', {
          'text-severity-critical': level === 'critical',
          'text-severity-high': level === 'high',
          'text-severity-medium': level === 'medium',
          'text-severity-low': level === 'low',
        })}>
          {level}
        </span>
      )}
    </div>
  );
};

interface SeverityBadgeProps {
  severity: RiskSeverity;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity }) => {
  const colorClasses: Record<RiskSeverity, string> = {
    critical: 'bg-severity-critical/20 text-severity-critical border-severity-critical/30',
    high: 'bg-severity-high/20 text-severity-high border-severity-high/30',
    medium: 'bg-severity-medium/20 text-severity-medium border-severity-medium/30',
    low: 'bg-severity-low/20 text-severity-low border-severity-low/30',
    negligible: 'bg-muted text-muted-foreground border-border',
  };

  const labels: Record<RiskSeverity, string> = {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    negligible: 'Negligible',
  };

  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
      colorClasses[severity]
    )}>
      {labels[severity]}
    </span>
  );
};

interface LikelihoodBadgeProps {
  likelihood: RiskLikelihood;
}

export const LikelihoodBadge: React.FC<LikelihoodBadgeProps> = ({ likelihood }) => {
  const labels: Record<RiskLikelihood, string> = {
    almost_certain: 'Almost Certain',
    likely: 'Likely',
    possible: 'Possible',
    unlikely: 'Unlikely',
    rare: 'Rare',
  };

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground border border-border">
      {labels[likelihood]}
    </span>
  );
};

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const statusConfig: Record<string, { label: string; className: string }> = {
    draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
    pending_review: { label: 'Pending Review', className: 'bg-warning/20 text-warning' },
    approved: { label: 'Approved', className: 'bg-info/20 text-info' },
    active: { label: 'Active', className: 'bg-primary/20 text-primary' },
    monitoring: { label: 'Monitoring', className: 'bg-accent/20 text-accent' },
    treated: { label: 'Treated', className: 'bg-accent/20 text-accent' },
    closed: { label: 'Closed', className: 'bg-muted text-muted-foreground' },
    archived: { label: 'Archived', className: 'bg-muted text-muted-foreground' },
  };

  const config = statusConfig[status] || statusConfig.draft;

  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
      config.className
    )}>
      {config.label}
    </span>
  );
};
