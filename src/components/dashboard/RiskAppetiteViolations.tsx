import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertOctagon, TrendingUp } from 'lucide-react';
import { RiskAppetiteViolation } from '@/types/dashboard';

interface RiskAppetiteViolationsProps {
  violations: RiskAppetiteViolation[];
}

export const RiskAppetiteViolations: React.FC<RiskAppetiteViolationsProps> = ({ violations }) => {
  const getBandColor = (band: string) => {
    switch (band.toLowerCase()) {
      case 'critical':
      case 'unacceptable':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-red-500" />
            Risk Appetite Violations
          </span>
          {violations.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {violations.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {violations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <TrendingUp className="w-8 h-8 text-green-500 mb-2" />
            <p className="text-muted-foreground text-sm">
              All risks are within acceptable appetite levels
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {violations.map((violation) => (
                <div
                  key={violation.risk_id}
                  className="flex items-center justify-between p-3 rounded-md bg-red-500/10 border border-red-500/20"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{violation.risk_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Score: {violation.score}
                    </p>
                  </div>
                  <Badge variant={getBandColor(violation.band) as any}>
                    {violation.band_label || violation.band}
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
