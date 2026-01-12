import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/integrations/database/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// Alias for backward compatibility
const supabase = db;

export type TreatmentStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';

export interface Treatment {
  id: string;
  risk_id: string;
  title: string;
  description: string | null;
  strategy: string | null;
  assigned_to: string | null;
  status: TreatmentStatus;
  due_date: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTreatmentInput {
  risk_id: string;
  title: string;
  description?: string;
  assigned_to?: string;
  status?: TreatmentStatus;
  due_date?: string;
}

export interface UpdateTreatmentInput extends Partial<Omit<CreateTreatmentInput, 'risk_id'>> {
  id: string;
}

export const useTreatments = (riskId?: string) => {
  return useQuery({
    queryKey: riskId ? ['treatments', riskId] : ['treatments-all'],
    queryFn: async () => {
      let query = supabase
        .from('risk_treatments')
        .select('*')
        .order('created_at', { ascending: false });

      if (riskId) {
        query = query.eq('risk_id', riskId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Treatment[];
    },
  });
};

export const useCreateTreatment = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateTreatmentInput) => {
      const { data, error } = await supabase
        .from('risk_treatments')
        .insert({
          ...input,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Treatment;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['treatments', variables.risk_id] });
      toast({
        title: 'Treatment added',
        description: 'The treatment plan has been created.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create treatment',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateTreatment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateTreatmentInput) => {
      const updateData: Record<string, unknown> = {};
      
      if (input.title !== undefined) updateData.title = input.title;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.assigned_to !== undefined) updateData.assigned_to = input.assigned_to;
      if (input.due_date !== undefined) updateData.due_date = input.due_date;
      if (input.status !== undefined) {
        updateData.status = input.status;
        // Set completed_at when status changes to completed
        if (input.status === 'completed') {
          updateData.completed_at = new Date().toISOString();
        } else {
          updateData.completed_at = null;
        }
      }

      const { data, error } = await supabase
        .from('risk_treatments')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Treatment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['treatments', data.risk_id] });
      queryClient.invalidateQueries({ queryKey: ['treatments-all'] });
      toast({
        title: 'Treatment updated',
        description: 'The treatment has been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update treatment',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteTreatment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // First get the treatment to find the associated risk_id
      const { data: treatmentData, error: fetchError } = await supabase
        .from('risk_treatments')
        .select('risk_id')
        .eq('id', id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      
      const treatment = treatmentData as { risk_id: string } | null;
      const riskId = treatment?.risk_id;

      // Soft delete: mark as cancelled instead of actually deleting
      const { error } = await supabase
        .from('risk_treatments')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;

      // Clear residual risk values from the associated risk
      if (riskId) {
        await supabase
          .from('risks')
          .update({
            residual_likelihood: null,
            residual_impact: null,
            residual_score: null,
            residual_rating: null,
            residual_updated_at: null,
          })
          .eq('id', riskId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treatments'] });
      queryClient.invalidateQueries({ queryKey: ['treatments-all'] });
      queryClient.invalidateQueries({ queryKey: ['risks'] });
      toast({
        title: 'Treatment deleted',
        description: 'The treatment plan has been cancelled and residual risk values cleared.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete treatment',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useArchiveTreatment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('risk_treatments')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Treatment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['treatments', data.risk_id] });
      queryClient.invalidateQueries({ queryKey: ['treatments-all'] });
      toast({
        title: 'Treatment archived',
        description: 'The treatment plan has been cancelled/archived.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to archive treatment',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
