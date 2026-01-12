import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Shield, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { FrameworkCompliance } from '@/types/dashboard';
import { cn } from '@/lib/utils';

interface FrameworkComplianceListProps {
  frameworks: FrameworkCompliance[];
}

export const FrameworkComplianceList: React.FC<FrameworkComplianceListProps> = ({ frameworks }) => {
  const getComplianceColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-500';
    if (percentage >= 60) return 'text-yellow-500';
    if (percentage >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getComplianceBadge = (percentage: number) => {
    if (percentage >= 80) return { label: 'Compliant', variant: 'default' as const, className: 'bg-green-500' };
    if (percentage >= 60) return { label: 'Partial', variant: 'secondary' as const, className: 'bg-yellow-500' };
    if (percentage >= 40) return { label: 'At Risk', variant: 'default' as const, className: 'bg-orange-500' };
    return { label: 'Non-Compliant', variant: 'destructive' as const, className: '' };
  };

  if (frameworks.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Framework Compliance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No frameworks configured. Import a framework to see compliance status.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Framework Compliance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {frameworks.map((fw) => {
          const badge = getComplianceBadge(fw.compliance_percentage);
          return (
            <div key={fw.framework_id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{fw.framework_name}</span>
                  <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white", badge.className)}>{badge.label}</span>
                </div>
                <span className={cn("font-bold", getComplianceColor(fw.compliance_percentage))}>
                  {fw.compliance_percentage}%
                </span>
              </div>
              <Progress value={fw.compliance_percentage} className="h-2" />
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  {fw.implemented_controls} Implemented
                </span>
                <span className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-yellow-500" />
                  {fw.partially_implemented} Partial
                </span>
                <span className="flex items-center gap-1">
                  <XCircle className="w-3 h-3 text-red-500" />
                  {fw.not_implemented} Not Implemented
                </span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
