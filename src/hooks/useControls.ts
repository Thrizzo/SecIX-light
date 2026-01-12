import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/integrations/database/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// Alias for backward compatibility
const supabase = db;

// Cache times for data (2 minutes for controls as they're modified more often)
const CONTROLS_STALE_TIME = 2 * 60 * 1000;

export type ControlType = 'preventive' | 'detective' | 'corrective' | 'directive';
export type ControlCategory = 'technical' | 'administrative' | 'physical';
export type ControlEffectiveness = 'high' | 'moderate' | 'low' | 'not_tested';
export type ControlStatus = 'active' | 'inactive' | 'planned' | 'retired';
export type RiskControlEffectiveness = 'high' | 'moderate' | 'low' | 'ineffective';

export interface Control {
  id: string;
  control_id: string;
  name: string;
  description: string | null;
  control_type: ControlType;
  control_category: ControlCategory;
  effectiveness: ControlEffectiveness;
  status: ControlStatus;
  owner_id: string | null;
  implementation_date: string | null;
  last_review_date: string | null;
  next_review_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RiskControl {
  id: string;
  risk_id: string;
  control_id: string;
  effectiveness_rating: RiskControlEffectiveness;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  control?: Control;
}

export interface CreateControlInput {
  name: string;
  description?: string;
  control_type?: ControlType;
  control_category?: ControlCategory;
  effectiveness?: ControlEffectiveness;
  status?: ControlStatus;
  owner_id?: string;
  implementation_date?: string;
  last_review_date?: string;
  next_review_date?: string;
}

export const useControls = () => {
  return useQuery({
    queryKey: ['controls'],
    staleTime: CONTROLS_STALE_TIME,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('controls')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Control[];
    },
  });
};

export const useCreateControl = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateControlInput) => {
      const insertData = {
        name: input.name,
        description: input.description || null,
        control_type: input.control_type || 'preventive',
        control_category: input.control_category || 'technical',
        effectiveness: input.effectiveness || 'moderate',
        status: input.status || 'active',
        owner_id: input.owner_id || null,
        implementation_date: input.implementation_date || null,
        last_review_date: input.last_review_date || null,
        next_review_date: input.next_review_date || null,
        created_by: user?.id || null,
        control_id: '',
      };
      
      const { data, error } = await supabase
        .from('controls')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;
      return data as Control;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['controls'] });
      toast({
        title: 'Control created',
        description: 'The control has been successfully added.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create control',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateControl = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Partial<CreateControlInput>) => {
      const { data, error } = await supabase
        .from('controls')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Control;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['controls'] });
      toast({
        title: 'Control updated',
        description: 'The control has been successfully updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update control',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteControl = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('controls')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['controls'] });
      toast({
        title: 'Control deleted',
        description: 'The control has been removed.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete control',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

// Risk Controls hooks
export const useRiskControls = (riskId?: string) => {
  return useQuery({
    queryKey: ['risk-controls', riskId],
    queryFn: async () => {
      let query = supabase
        .from('risk_controls')
        .select(`
          *,
          controls:control_id(*)
        `);
      
      if (riskId) {
        query = query.eq('risk_id', riskId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!riskId,
  });
};

export const useAddRiskControl = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: { 
      risk_id: string; 
      control_id: string; 
      effectiveness_rating?: RiskControlEffectiveness;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('risk_controls')
        .insert([{
          ...input,
          effectiveness_rating: input.effectiveness_rating || 'moderate',
          created_by: user?.id || null,
        }])
        .select()
        .single();

      if (error) throw error;
      return data as RiskControl;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['risk-controls', variables.risk_id] });
      toast({
        title: 'Control added',
        description: 'The control has been linked to the risk.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to add control',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useRemoveRiskControl = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, riskId }: { id: string; riskId: string }) => {
      const { error } = await supabase
        .from('risk_controls')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return riskId;
    },
    onSuccess: (riskId) => {
      queryClient.invalidateQueries({ queryKey: ['risk-controls', riskId] });
      toast({
        title: 'Control removed',
        description: 'The control has been unlinked from the risk.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to remove control',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
