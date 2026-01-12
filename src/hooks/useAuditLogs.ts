import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/database/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AuditLog {
  id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  actor_user_id: string | null;
  details: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  is_retained: boolean;
  retained_at: string | null;
  retained_by: string | null;
  retention_reason: string | null;
  expires_at: string | null;
  profiles?: {
    id: string;
    full_name: string | null;
    email: string | null;
  };
}

export const useAuditLogs = (targetType?: string) => {
  return useQuery({
    queryKey: ['audit-logs', targetType],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (targetType) {
        query = query.eq('target_type', targetType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AuditLog[];
    },
  });
};

export const useCreateAuditLog = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      action: string;
      target_type: string;
      target_id?: string;
      details?: Record<string, any>;
    }) => {
      // Use the secure create_audit_log function instead of direct insert
      // This prevents audit log tampering by ensuring only system-level access
      const { data, error } = await supabase.rpc('create_audit_log', {
        p_action: input.action,
        p_target_type: input.target_type,
        p_target_id: input.target_id || null,
        p_details: input.details || null,
        p_actor_user_id: user?.id || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });
};

// Helper to log actions for risk management module
export const useLogRiskAction = () => {
  const createLog = useCreateAuditLog();
  
  return {
    logAction: (
      action: string,
      targetType: 'risk' | 'treatment' | 'control' | 'risk_appetite' | 'milestone',
      targetId?: string,
      details?: Record<string, any>
    ) => {
      createLog.mutate({
        action,
        target_type: targetType,
        target_id: targetId,
        details,
      });
    },
  };
};
