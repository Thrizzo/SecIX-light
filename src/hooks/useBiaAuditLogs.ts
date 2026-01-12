import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/database/client';

export interface BiaAuditLog {
  id: string;
  bia_assessment_id: string | null;
  continuity_plan_id: string | null;
  action: string;
  actor_user_id: string | null;
  changes: Record<string, unknown> | null;
  rationale: string | null;
  created_at: string;
}

export const useBiaAuditLogs = () => {
  return useQuery({
    queryKey: ['bia-audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bia_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as BiaAuditLog[];
    },
  });
};

export const useBiaAuditLogsByAssessment = (biaId?: string) => {
  return useQuery({
    queryKey: ['bia-audit-logs', 'assessment', biaId],
    enabled: !!biaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bia_audit_logs')
        .select('*')
        .eq('bia_assessment_id', biaId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as BiaAuditLog[];
    },
  });
};

export const useBiaAuditLogsByPlan = (planId?: string) => {
  return useQuery({
    queryKey: ['bia-audit-logs', 'plan', planId],
    enabled: !!planId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bia_audit_logs')
        .select('*')
        .eq('continuity_plan_id', planId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as BiaAuditLog[];
    },
  });
};
