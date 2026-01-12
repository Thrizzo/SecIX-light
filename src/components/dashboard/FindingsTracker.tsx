import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, XCircle, AlertCircle, Lightbulb, CheckCircle2, Clock } from 'lucide-react';
import { useFindingsSummary } from '@/hooks/useControlFindings';

export function FindingsTracker() {
  const { data: summary, isLoading } = useFindingsSummary();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Findings Tracker</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const openFindings = (summary?.open || 0) + (summary?.inProgress || 0);
  const closedPercentage = summary?.total ? Math.round((summary.closed / summary.total) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Findings Tracker
            </CardTitle>
            <CardDescription>Control audit findings overview</CardDescription>
          </div>
          <Badge variant={openFindings > 0 ? 'destructive' : 'secondary'}>
            {openFindings} Open
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Closure Rate</span>
            <span className="font-medium">{closedPercentage}%</span>
          </div>
          <Progress value={closedPercentage} className="h-2" />
        </div>

        {/* Type Breakdown */}
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center p-2 rounded-lg bg-destructive/10 border border-destructive/20">
            <XCircle className="h-5 w-5 text-destructive mb-1" />
            <span className="text-lg font-bold text-destructive">{summary?.majorDeviations || 0}</span>
            <span className="text-xs text-muted-foreground text-center">Major</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertCircle className="h-5 w-5 text-amber-500 mb-1" />
            <span className="text-lg font-bold text-amber-600">{summary?.minorDeviations || 0}</span>
            <span className="text-xs text-muted-foreground text-center">Minor</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Lightbulb className="h-5 w-5 text-blue-500 mb-1" />
            <span className="text-lg font-bold text-blue-600">{summary?.opportunities || 0}</span>
            <span className="text-xs text-muted-foreground text-center">OFI</span>
          </div>
        </div>

        {/* Status Summary */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-destructive" />
              <span>Open</span>
            </div>
            <span className="font-medium">{summary?.open || 0}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3 text-amber-500" />
              <span>In Progress</span>
            </div>
            <span className="font-medium">{summary?.inProgress || 0}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              <span>Closed</span>
            </div>
            <span className="font-medium">{summary?.closed || 0}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-muted-foreground" />
              <span>Accepted</span>
            </div>
            <span className="font-medium">{summary?.accepted || 0}</span>
          </div>
        </div>

        {/* Total */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Findings</span>
            <span className="font-semibold">{summary?.total || 0}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
