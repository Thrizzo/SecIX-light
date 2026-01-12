import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/database/client';
import { useToast } from '@/hooks/use-toast';

export interface DashboardMetrics {
  risks: {
    total: number;
    open: number;
    treated: number;
    accepted: number;
    registered: number;
  };
  controls: {
    total: number;
    overdue: number;
    internalTotal: number;
    internalOverdue: number;
  };
  policies: {
    total: number;
    overdue: number;
    draft: number;
    published: number;
  };
  vendors: {
    total: number;
    assessmentsDue: number;
  };
  assets: {
    primary: number;
    secondary: number;
    deviations: number;
  };
  evidence: {
    total: number;
    expiringSoon: number;
    controlsWithoutEvidence: number;
  };
  compliance: {
    frameworks: FrameworkCompliance[];
    averageCompliance: number;
  };
  riskAppetite: {
    violations: number;
    details: RiskAppetiteViolation[];
  };
}

export interface FrameworkCompliance {
  framework_id: string;
  framework_name: string;
  total_controls: number;
  implemented_controls: number;
  partially_implemented: number;
  not_implemented: number;
  compliance_percentage: number;
}

export interface RiskAppetiteViolation {
  risk_id: string;
  risk_name: string;
  score: number;
  band: string;
  band_label: string;
}

export interface DashboardInsight {
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  recommendation: string;
  trend: 'improving' | 'stable' | 'declining';
}

export interface AssetDeviation {
  asset_id: string;
  asset_name: string;
  asset_criticality: string;
  bia_criticality: string;
  type: string;
}

export interface DashboardThreshold {
  id: string;
  threshold_key: string;
  threshold_name: string;
  threshold_value: number;
  threshold_unit: string;
  description: string | null;
  category: string;
}

export interface DashboardData {
  success: boolean;
  metrics: DashboardMetrics;
  insights: DashboardInsight[];
  overdueDetails: {
    controls: Array<{ id: string; name: string; next_review_date: string }>;
    policies: Array<{ id: string; title: string; review_by_date: string }>;
    vendors: Array<{ id: string; name: string; next_assessment_date: string }>;
  };
  assetDeviations: AssetDeviation[];
  controlsWithoutEvidence: Array<{ id: string; title: string; code: string }>;
  evidenceExpiringSoon: Array<{ id: string; name: string; expires_at: string }>;
  frameworkCompliance: FrameworkCompliance[];
  riskAppetiteViolations: RiskAppetiteViolation[];
  thresholds: DashboardThreshold[];
}

export interface DashboardSnapshot {
  id: string;
  snapshot_date: string;
  metrics: DashboardMetrics;
  created_at: string;
}

const getEmptyDashboardData = (): DashboardData => ({
  success: false,
  metrics: {
    risks: { total: 0, open: 0, treated: 0, accepted: 0, registered: 0 },
    controls: { total: 0, overdue: 0, internalTotal: 0, internalOverdue: 0 },
    policies: { total: 0, overdue: 0, draft: 0, published: 0 },
    vendors: { total: 0, assessmentsDue: 0 },
    assets: { primary: 0, secondary: 0, deviations: 0 },
    evidence: { total: 0, expiringSoon: 0, controlsWithoutEvidence: 0 },
    compliance: { frameworks: [], averageCompliance: 0 },
    riskAppetite: { violations: 0, details: [] },
  },
  insights: [],
  overdueDetails: { controls: [], policies: [], vendors: [] },
  assetDeviations: [],
  controlsWithoutEvidence: [],
  evidenceExpiringSoon: [],
  frameworkCompliance: [],
  riskAppetiteViolations: [],
  thresholds: [],
});

export function useDashboardInsights() {
  return useQuery({
    queryKey: ['dashboard-insights'],
    queryFn: async (): Promise<DashboardData> => {
      // TanStack Query warns/crashes when queryFn returns undefined or throws unexpectedly.
      // Always return a valid DashboardData shape so the dashboard can render even if backend
      // functions/tables aren't available (e.g., self-hosted without full schema).
      try {
        const { data, error } = await supabase.functions.invoke('dashboard-insights');
        if (error) {
          console.warn('dashboard-insights function error:', error.message);
          return getEmptyDashboardData();
        }

        // If the function returns null/undefined for any reason, keep UI stable.
        return (data ?? getEmptyDashboardData()) as DashboardData;
      } catch (e) {
        console.warn('useDashboardInsights error:', e);
        return getEmptyDashboardData();
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });
}

export function useDashboardThresholds() {
  return useQuery({
    queryKey: ['dashboard-thresholds'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('dashboard_thresholds')
          .select('*')
          .order('category', { ascending: true });
        
        // Table may not exist in self-hosted - return empty array
        if (error) {
          console.warn('dashboard_thresholds query failed (table may not exist):', error.message);
          return [] as DashboardThreshold[];
        }
        return (data ?? []) as DashboardThreshold[];
      } catch (e) {
        console.warn('useDashboardThresholds error:', e);
        return [] as DashboardThreshold[];
      }
    },
  });
}

export function useUpdateThreshold() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, threshold_value }: { id: string; threshold_value: number }) => {
      const { data, error } = await supabase
        .from('dashboard_thresholds')
        .update({ threshold_value })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-thresholds'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-insights'] });
      toast({ title: 'Threshold updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update threshold', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDashboardSnapshots(days: number = 30) {
  return useQuery({
    queryKey: ['dashboard-snapshots', days],
    queryFn: async () => {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      
      const { data, error } = await supabase
        .from('dashboard_snapshots')
        .select('*')
        .gte('snapshot_date', fromDate.toISOString().split('T')[0])
        .order('snapshot_date', { ascending: true });
      if (error) throw error;
      return ((data || []) as Array<{ id: string; snapshot_date: string; metrics: unknown; created_at: string }>).map(item => ({
        ...item,
        metrics: item.metrics as DashboardMetrics
      })) as DashboardSnapshot[];
    },
  });
}

export function useFrameworkComplianceStatus() {
  return useQuery({
    queryKey: ['framework-compliance-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('framework_compliance_status')
        .select('*, control_frameworks(name, version)');
      if (error) throw error;
      return data;
    },
  });
}
