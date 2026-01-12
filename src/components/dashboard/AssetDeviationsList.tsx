import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GitCompare, ArrowRight, CheckCircle } from 'lucide-react';
import { AssetDeviation } from '@/types/dashboard';

interface AssetDeviationsListProps {
  deviations: AssetDeviation[];
}

export const AssetDeviationsList: React.FC<AssetDeviationsListProps> = ({ deviations }) => {
  const getCriticalityColor = (criticality: string) => {
    switch (criticality?.toLowerCase()) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-amber-500" />
            Asset/BIA Deviations
          </span>
          {deviations.length > 0 && (
            <Badge variant="secondary" className="text-xs bg-amber-500/20 text-amber-600">
              {deviations.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {deviations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
            <p className="text-muted-foreground text-sm">
              No deviations between asset classifications and BIA assessments
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {deviations.map((deviation) => (
                <div
                  key={deviation.asset_id}
                  className="p-3 rounded-md bg-amber-500/10 border border-amber-500/20"
                >
                  <p className="text-sm font-medium mb-2">{deviation.asset_name}</p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Asset:</span>
                    <Badge variant={getCriticalityColor(deviation.asset_criticality) as any}>
                      {deviation.asset_criticality}
                    </Badge>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    <span className="text-muted-foreground">BIA:</span>
                    <Badge variant={getCriticalityColor(deviation.bia_criticality) as any}>
                      {deviation.bia_criticality}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
