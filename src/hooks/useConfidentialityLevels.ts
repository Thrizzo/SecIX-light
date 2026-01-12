import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/database/client';
import { useToast } from '@/hooks/use-toast';

export interface ConfidentialityLevel {
  id: string;
  name: string;
  rank: number;
  description: string | null;
  breach_impact_level_id: string | null;
  created_at: string;
  updated_at: string;
}

export const useConfidentialityLevels = () => {
  return useQuery({
    queryKey: ['confidentiality-levels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('confidentiality_levels')
        .select('*')
        .order('rank');

      if (error) throw error;
      return data as ConfidentialityLevel[];
    },
  });
};

export interface CreateConfidentialityLevelInput {
  name: string;
  rank: number;
  description?: string;
  breach_impact_level_id?: string;
}

export const useCreateConfidentialityLevel = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateConfidentialityLevelInput) => {
      const { data, error } = await supabase
        .from('confidentiality_levels')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data as ConfidentialityLevel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['confidentiality-levels'] });
      toast({ title: 'Level Created', description: 'Confidentiality level added successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create level', description: error.message, variant: 'destructive' });
    },
  });
};

export const useUpdateConfidentialityLevel = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<CreateConfidentialityLevelInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('confidentiality_levels')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ConfidentialityLevel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['confidentiality-levels'] });
      toast({ title: 'Level Updated', description: 'Confidentiality level updated successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update level', description: error.message, variant: 'destructive' });
    },
  });
};

export const useDeleteConfidentialityLevel = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('confidentiality_levels').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['confidentiality-levels'] });
      toast({ title: 'Level Deleted', description: 'Confidentiality level removed.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete level', description: error.message, variant: 'destructive' });
    },
  });
};
