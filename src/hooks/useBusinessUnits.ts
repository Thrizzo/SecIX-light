import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/integrations/database/client';
import { useToast } from '@/hooks/use-toast';

// Alias for backward compatibility
const supabase = db;

// Cache times for static data (5 minutes)
const STATIC_STALE_TIME = 5 * 60 * 1000;

export interface BusinessUnit {
  id: string;
  name: string;
  description: string | null;
  is_security_org: boolean;
  created_at: string;
  updated_at: string;
}

export const useBusinessUnits = () => {
  return useQuery({
    queryKey: ['business-units'],
    staleTime: STATIC_STALE_TIME,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_units')
        .select('*')
        .order('is_security_org', { ascending: false })
        .order('name');

      if (error) throw error;
      return data as BusinessUnit[];
    },
  });
};

export const useBusinessUnit = (id?: string) => {
  return useQuery({
    queryKey: ['business-unit', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_units')
        .select('*')
        .eq('id', id!)
        .single();

      if (error) throw error;
      return data as BusinessUnit;
    },
  });
};

export const useSecurityOrgUnit = () => {
  return useQuery({
    queryKey: ['security-org-unit'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_units')
        .select('*')
        .eq('is_security_org', true)
        .maybeSingle();

      if (error) throw error;
      return data as BusinessUnit | null;
    },
  });
};

export interface CreateBusinessUnitInput {
  name: string;
  description?: string;
  is_security_org?: boolean;
}

export const useCreateBusinessUnit = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateBusinessUnitInput) => {
      // If setting as security org, unset the current one first
      if (input.is_security_org) {
        await supabase
          .from('business_units')
          .update({ is_security_org: false })
          .eq('is_security_org', true);
      }

      const { data, error } = await supabase
        .from('business_units')
        .insert({
          name: input.name,
          description: input.description || null,
          is_security_org: input.is_security_org || false,
        })
        .select()
        .single();

      if (error) throw error;
      return data as BusinessUnit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-units'] });
      queryClient.invalidateQueries({ queryKey: ['security-org-unit'] });
      toast({ title: 'Business Unit Created', description: 'The business unit has been created successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create business unit', description: error.message, variant: 'destructive' });
    },
  });
};

export const useUpdateBusinessUnit = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Partial<CreateBusinessUnitInput>) => {
      // If setting as security org, unset the current one first
      if (input.is_security_org) {
        await supabase
          .from('business_units')
          .update({ is_security_org: false })
          .neq('id', id)
          .eq('is_security_org', true);
      }

      const { data, error } = await supabase
        .from('business_units')
        .update({
          name: input.name,
          description: input.description,
          is_security_org: input.is_security_org,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as BusinessUnit;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['business-units'] });
      queryClient.invalidateQueries({ queryKey: ['business-unit', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['security-org-unit'] });
      toast({ title: 'Business Unit Updated', description: 'The business unit has been updated successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update business unit', description: error.message, variant: 'destructive' });
    },
  });
};

export const useDeleteBusinessUnit = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // Check if this is the security org - cannot delete
      const { data: buData } = await supabase
        .from('business_units')
        .select('is_security_org')
        .eq('id', id)
        .single();
      
      const bu = buData as { is_security_org: boolean } | null;

      if (bu?.is_security_org) {
        throw new Error('Cannot delete the Security Organization. Assign another unit as Security Org first.');
      }

      const { error } = await supabase.from('business_units').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-units'] });
      toast({ title: 'Business Unit Deleted', description: 'The business unit has been deleted.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete business unit', description: error.message, variant: 'destructive' });
    },
  });
};
