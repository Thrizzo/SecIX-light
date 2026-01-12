import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/database/client';
import { useToast } from '@/hooks/use-toast';

export interface ControlFrameworkMapping {
  id: string;
  internal_control_id: string;
  framework_control_id: string;
  mapping_type: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  framework_control?: {
    id: string;
    control_code: string | null;
    title: string;
    framework: {
      id: string;
      name: string;
    };
  };
}

export interface RiskControlLink {
  id: string;
  risk_id: string;
  internal_control_id: string | null;
  framework_control_id: string | null;
  link_type: string;
  notes: string | null;
  created_at: string;
  risk?: {
    id: string;
    risk_id: string;
    title: string;
    status: string;
  };
}

export const MAPPING_TYPES = [
  'Exact',
  'Partial',
  'Related',
  'Supersedes',
] as const;

export function useControlFrameworkMappings(internalControlId?: string) {
  return useQuery({
    queryKey: ['control-framework-mappings', internalControlId],
    queryFn: async () => {
      if (!internalControlId) return [];
      
      const { data, error } = await supabase
        .from('internal_control_framework_map')
        .select(`
          *,
          framework_control:framework_controls(
            id,
            control_code,
            title,
            security_function,
            framework:control_frameworks(id, name)
          )
        `)
        .eq('internal_control_id', internalControlId);

      if (error) throw error;
      return data as ControlFrameworkMapping[];
    },
    enabled: !!internalControlId,
  });
}

export function useRiskControlLinks(internalControlId?: string) {
  return useQuery({
    queryKey: ['risk-control-links', internalControlId],
    queryFn: async () => {
      if (!internalControlId) return [];
      
      const { data, error } = await supabase
        .from('risk_control_links')
        .select(`
          *,
          risk:risks(id, risk_id, title, status)
        `)
        .eq('internal_control_id', internalControlId);

      if (error) throw error;
      return data as RiskControlLink[];
    },
    enabled: !!internalControlId,
  });
}

export function useRiskControlLinksByRisk(riskId?: string) {
  return useQuery({
    queryKey: ['risk-control-links-by-risk', riskId],
    queryFn: async () => {
      if (!riskId) return [];
      
      const { data, error } = await supabase
        .from('risk_control_links')
        .select(`
          *,
          framework_control:framework_controls(
            id,
            control_code,
            title,
            description,
            domain,
            security_function,
            framework:control_frameworks(id, name)
          ),
          internal_control:internal_controls(
            id,
            internal_control_code,
            title,
            status
          )
        `)
        .eq('risk_id', riskId);

      if (error) throw error;
      return data;
    },
    enabled: !!riskId,
  });
}

export function useAddRiskFrameworkControlLink() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      risk_id: string;
      framework_control_id: string;
      link_type?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('risk_control_links')
        .insert({
          risk_id: input.risk_id,
          framework_control_id: input.framework_control_id,
          link_type: input.link_type || 'mitigating',
          notes: input.notes,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['risk-control-links-by-risk', variables.risk_id] });
      toast({ title: 'Control linked to risk' });
    },
    onError: (error) => {
      toast({ title: 'Failed to link control', description: error.message, variant: 'destructive' });
    },
  });
}

export function useRemoveRiskFrameworkControlLink() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, riskId }: { id: string; riskId: string }) => {
      const { error } = await supabase
        .from('risk_control_links')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return riskId;
    },
    onSuccess: (riskId) => {
      queryClient.invalidateQueries({ queryKey: ['risk-control-links-by-risk', riskId] });
      toast({ title: 'Control unlinked from risk' });
    },
    onError: (error) => {
      toast({ title: 'Failed to unlink control', description: error.message, variant: 'destructive' });
    },
  });
}

export function useCreateFrameworkMapping() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      internal_control_id: string;
      framework_control_id: string;
      mapping_type: string;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get the profile ID for the current user (created_by references profiles.id)
      let profileId: string | null = null;
      if (user) {
        const { data: profile } = await supabase
          .from<{ id: string }>('profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        profileId = profile?.id || null;
      }
      
      const { data, error } = await supabase
        .from('internal_control_framework_map')
        .insert({
          ...input,
          created_by: profileId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['control-framework-mappings'] });
      queryClient.invalidateQueries({ queryKey: ['internal-control'] });
      toast({ title: 'Framework mapping added' });
    },
    onError: (error) => {
      toast({ title: 'Failed to add mapping', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteFrameworkMapping() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('internal_control_framework_map')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['control-framework-mappings'] });
      queryClient.invalidateQueries({ queryKey: ['internal-control'] });
      toast({ title: 'Mapping removed' });
    },
    onError: (error) => {
      toast({ title: 'Failed to remove mapping', description: error.message, variant: 'destructive' });
    },
  });
}

export function useCreateRiskControlLink() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      risk_id: string;
      internal_control_id?: string;
      framework_control_id?: string;
      link_type: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('risk_control_links')
        .insert({
          ...input,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-control-links'] });
      toast({ title: 'Risk linked to control' });
    },
    onError: (error) => {
      toast({ title: 'Failed to link risk', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteRiskControlLink() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('risk_control_links')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-control-links'] });
      toast({ title: 'Risk link removed' });
    },
    onError: (error) => {
      toast({ title: 'Failed to remove link', description: error.message, variant: 'destructive' });
    },
  });
}
