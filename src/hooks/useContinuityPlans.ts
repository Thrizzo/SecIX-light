import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/database/client';
import { useToast } from '@/hooks/use-toast';
import { Json } from '@/integrations/supabase/types';

export interface ContinuityPlan {
  id: string;
  primary_asset_id: string;
  plan_name: string;
  plan_version: string | null;
  status: string | null;
  description: string | null;
  recovery_strategy: string | null;
  key_contacts: Json | null;
  dependencies: string | null;
  alternate_site: string | null;
  communication_plan: string | null;
  testing_schedule: string | null;
  last_tested_at: string | null;
  next_test_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  business_unit_id: string | null;
}

export interface ContinuityPlanWithAsset extends ContinuityPlan {
  primary_assets?: {
    id: string;
    name: string;
    asset_id: string;
    criticality: string | null;
  };
}

export const useContinuityPlans = () => {
  return useQuery({
    queryKey: ['continuity-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('continuity_plans')
        .select(`
          *,
          primary_assets (id, name, asset_id, criticality)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ContinuityPlanWithAsset[];
    },
  });
};

export const useContinuityPlan = (id?: string) => {
  return useQuery({
    queryKey: ['continuity-plan', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('continuity_plans')
        .select(`
          *,
          primary_assets (id, name, asset_id, criticality)
        `)
        .eq('id', id!)
        .single();

      if (error) throw error;
      return data as ContinuityPlanWithAsset;
    },
  });
};

export const useContinuityPlanByAssetId = (assetId?: string) => {
  return useQuery({
    queryKey: ['continuity-plan-by-asset', assetId],
    enabled: !!assetId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('continuity_plans')
        .select('*')
        .eq('primary_asset_id', assetId!)
        .maybeSingle();

      if (error) throw error;
      return data as ContinuityPlan | null;
    },
  });
};

export interface CreateContinuityPlanInput {
  primary_asset_id: string;
  plan_name: string;
  plan_version?: string;
  status?: string;
  description?: string;
  recovery_strategy?: string;
  key_contacts?: { name: string; role: string; contact: string }[];
  dependencies?: string;
  alternate_site?: string;
  communication_plan?: string;
  testing_schedule?: string;
  next_test_at?: string;
}

export const useCreateContinuityPlan = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateContinuityPlanInput & { business_unit_id?: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      // Get the user's profile to get business_unit_id if not provided
      let businessUnitId = input.business_unit_id;
      if (!businessUnitId && userId) {
        const { data: profile } = await supabase
          .from<{ business_unit_id: string | null }>('profiles')
          .select('business_unit_id')
          .eq('user_id', userId)
          .maybeSingle();
        businessUnitId = profile?.business_unit_id || undefined;
      }

      const { data, error } = await supabase
        .from<ContinuityPlan>('continuity_plans')
        .insert({
          ...input,
          business_unit_id: businessUnitId,
          key_contacts: input.key_contacts || [],
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;

      // Log the action
      await supabase.from('bia_audit_logs').insert({
        continuity_plan_id: data.id,
        action: 'COOP_CREATED',
        actor_user_id: userId,
        changes: { plan_name: input.plan_name, asset_id: input.primary_asset_id },
      });

      return data as ContinuityPlan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['continuity-plans'] });
      queryClient.invalidateQueries({ queryKey: ['bia-audit-logs'] });
      toast({ title: 'Plan Created', description: 'Continuity of Operations Plan saved successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create plan', description: error.message, variant: 'destructive' });
    },
  });
};

export const useUpdateContinuityPlan = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Partial<CreateContinuityPlanInput>) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      const { data, error } = await supabase
        .from<ContinuityPlan>('continuity_plans')
        .update({
          ...input,
          key_contacts: input.key_contacts || undefined,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Log the action
      await supabase.from('bia_audit_logs').insert({
        continuity_plan_id: id,
        action: 'COOP_UPDATED',
        actor_user_id: userId,
        changes: input,
      });

      return data as ContinuityPlan;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['continuity-plans'] });
      queryClient.invalidateQueries({ queryKey: ['continuity-plan', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['bia-audit-logs'] });
      toast({ title: 'Plan Updated', description: 'Continuity of Operations Plan updated successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update plan', description: error.message, variant: 'destructive' });
    },
  });
};

export const useDeleteContinuityPlan = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('continuity_plans').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['continuity-plans'] });
      toast({ title: 'Plan Deleted', description: 'Continuity of Operations Plan removed.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete plan', description: error.message, variant: 'destructive' });
    },
  });
};
