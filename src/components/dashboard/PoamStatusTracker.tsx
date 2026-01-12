import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ClipboardList, CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/database/client';

interface PoamSummary {
  total: number;
  draft: number;
  active: number;
  completed: number;
  cancelled: number;
  totalMilestones: number;
  completedMilestones: number;
  overdueMilestones: number;
}

export function PoamStatusTracker() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['poam-status-summary'],
    queryFn: async (): Promise<PoamSummary> => {
      type PoamRow = { id: string; status: string };
      type MilestoneRow = { id: string; status: string; due_date: string | null };

      const emptyResult: PoamSummary = {
        total: 0, draft: 0, active: 0, completed: 0, cancelled: 0,
        totalMilestones: 0, completedMilestones: 0, overdueMilestones: 0,
      };

      try {
        // Fetch finding POAMs (table may not exist)
        const { data: poams, error: poamsError } = await supabase
          .from('finding_poams')
          .select('id, status');

        // Fetch finding milestones
        const { data: milestones, error: milestonesError } = await supabase
          .from('finding_milestones')
          .select('id, status, due_date');

        // Also fetch treatment POAMs for a complete picture
        const { data: treatmentPoams, error: treatmentError } = await supabase
          .from('treatment_poams')
          .select('id, status');

        const { data: treatmentMilestones, error: tmError } = await supabase
          .from('treatment_milestones')
          .select('id, status, due_date');

        // If all tables fail to load, return empty (tables may not exist in self-hosted)
        if (poamsError && milestonesError && treatmentError && tmError) {
          console.warn('POAM tables may not exist:', poamsError?.message);
          return emptyResult;
        }

        const allPoams = [
          ...((poams ?? []) as PoamRow[]),
          ...((treatmentPoams ?? []) as PoamRow[]),
        ];
        const allMilestones = [
          ...((milestones ?? []) as MilestoneRow[]),
          ...((treatmentMilestones ?? []) as MilestoneRow[]),
        ];

        const today = new Date().toISOString().split('T')[0];

        return {
          total: allPoams.length,
          draft: allPoams.filter(p => p.status === 'draft').length,
          active: allPoams.filter(p => p.status === 'active').length,
          completed: allPoams.filter(p => p.status === 'completed').length,
          cancelled: allPoams.filter(p => p.status === 'cancelled').length,
          totalMilestones: allMilestones.length,
          completedMilestones: allMilestones.filter(m => m.status === 'completed').length,
          overdueMilestones: allMilestones.filter(m => 
            m.status !== 'completed' && m.due_date && m.due_date < today
          ).length,
        };
      } catch (e) {
        console.warn('PoamStatusTracker query error:', e);
        return emptyResult;
      }
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">POAM Status</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const milestoneProgress = summary?.totalMilestones 
    ? Math.round((summary.completedMilestones / summary.totalMilestones) * 100) 
    : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              POAM Status
            </CardTitle>
            <CardDescription>Plans of Action & Milestones</CardDescription>
          </div>
          <Badge variant={summary?.active ? 'default' : 'secondary'}>
            {summary?.active || 0} Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Milestone Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Milestone Completion</span>
            <span className="font-medium">{milestoneProgress}%</span>
          </div>
          <Progress value={milestoneProgress} className="h-2" />
        </div>

        {/* POAM Status Breakdown */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50 border">
            <span className="text-lg font-bold">{summary?.draft || 0}</span>
            <span className="text-xs text-muted-foreground">Draft</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-lg bg-primary/10 border border-primary/20">
            <span className="text-lg font-bold text-primary">{summary?.active || 0}</span>
            <span className="text-xs text-muted-foreground">Active</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-lg bg-green-500/10 border border-green-500/20">
            <CheckCircle2 className="h-4 w-4 text-green-500 mb-1" />
            <span className="text-lg font-bold text-green-600">{summary?.completed || 0}</span>
            <span className="text-xs text-muted-foreground">Completed</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50 border">
            <span className="text-lg font-bold text-muted-foreground">{summary?.cancelled || 0}</span>
            <span className="text-xs text-muted-foreground">Cancelled</span>
          </div>
        </div>

        {/* Milestone Summary */}
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span>Total Milestones</span>
            </div>
            <span className="font-medium">{summary?.totalMilestones || 0}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              <span>Completed</span>
            </div>
            <span className="font-medium">{summary?.completedMilestones || 0}</span>
          </div>
          {(summary?.overdueMilestones || 0) > 0 && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-3 w-3 text-destructive" />
                <span className="text-destructive">Overdue</span>
              </div>
              <span className="font-medium text-destructive">{summary?.overdueMilestones}</span>
            </div>
          )}
        </div>

        {/* Total POAMs */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total POAMs</span>
            <span className="font-semibold">{summary?.total || 0}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
