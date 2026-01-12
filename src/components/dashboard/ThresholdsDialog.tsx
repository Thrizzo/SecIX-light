import React, { forwardRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Save } from 'lucide-react';
import { useDashboardThresholds, useUpdateThreshold, DashboardThreshold } from '@/hooks/useDashboard';
import { Skeleton } from '@/components/ui/skeleton';

interface ThresholdsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Wrapper to fix ref forwarding warning with Radix Dialog
const ThresholdInputWrapper = forwardRef<HTMLDivElement, { children: React.ReactNode }>(
  ({ children }, ref) => <div ref={ref}>{children}</div>
);

export const ThresholdsDialog: React.FC<ThresholdsDialogProps> = ({ open, onOpenChange }) => {
  const { data: thresholds, isLoading } = useDashboardThresholds();
  const updateThreshold = useUpdateThreshold();
  const [editedValues, setEditedValues] = React.useState<Record<string, number>>({});

  React.useEffect(() => {
    if (thresholds) {
      const values: Record<string, number> = {};
      thresholds.forEach(t => {
        values[t.id] = t.threshold_value;
      });
      setEditedValues(values);
    }
  }, [thresholds]);

  const handleSave = async (threshold: DashboardThreshold) => {
    const newValue = editedValues[threshold.id];
    if (newValue !== threshold.threshold_value) {
      await updateThreshold.mutateAsync({ id: threshold.id, threshold_value: newValue });
    }
  };

  const groupedThresholds = React.useMemo(() => {
    if (!thresholds) return {};
    return thresholds.reduce((acc, t) => {
      if (!acc[t.category]) {
        acc[t.category] = [];
      }
      acc[t.category].push(t);
      return acc;
    }, {} as Record<string, DashboardThreshold[]>);
  }, [thresholds]);

  const categoryLabels: Record<string, string> = {
    controls: 'Controls',
    risks: 'Risks',
    policies: 'Policies',
    vendors: 'Vendors',
    evidence: 'Evidence',
    bia: 'Business Impact Analysis',
    general: 'General',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Dashboard Thresholds
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedThresholds).map(([category, items]) => (
              <Card key={category} className="bg-muted/30">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">
                    {categoryLabels[category] || category}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {items.map(threshold => (
                    <div key={threshold.id} className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <Label className="text-sm font-medium">{threshold.threshold_name}</Label>
                        {threshold.description && (
                          <p className="text-xs text-muted-foreground">{threshold.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          className="w-20"
                          value={editedValues[threshold.id] || 0}
                          onChange={(e) => setEditedValues(prev => ({
                            ...prev,
                            [threshold.id]: parseInt(e.target.value) || 0
                          }))}
                        />
                        <span className="text-xs text-muted-foreground w-12">
                          {threshold.threshold_unit}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSave(threshold)}
                          disabled={
                            updateThreshold.isPending ||
                            editedValues[threshold.id] === threshold.threshold_value
                          }
                        >
                          <Save className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
