import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/database/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';
export type ImplementationStatus = 'planned' | 'in_progress' | 'implemented' | 'not_applicable';
export type PoamStatus = 'draft' | 'active' | 'completed' | 'cancelled';

export interface TreatmentPoam {
  id: string;
  treatment_id: string;
  name: string;
  description: string | null;
  owner_id: string | null;
  start_date: string | null;
  end_date: string | null;
  status: PoamStatus;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  profiles?: {
    id: string;
    full_name: string | null;
    email: string | null;
  };
}

export interface TreatmentControl {
  id: string;
  treatment_id: string;
  control_id: string;
  poam_id: string | null;
  implementation_status: ImplementationStatus;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  controls?: {
    id: string;
    control_id: string;
    name: string;
    description: string | null;
  };
}

export interface TreatmentMilestone {
  id: string;
  treatment_id: string;
  control_id: string | null;
  poam_id: string | null;
  title: string;
  description: string | null;
  owner_id: string | null;
  due_date: string | null;
  completed_at: string | null;
  status: MilestoneStatus;
  created_at: string;
  created_by: string | null;
  profiles?: {
    id: string;
    full_name: string | null;
    email: string | null;
  };
  controls?: {
    id: string;
    control_id: string;
    name: string;
  };
}

export interface TreatmentWithDetails {
  id: string;
  risk_id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  assigned_to: string | null;
  completed_at: string | null;
  residual_likelihood: string | null;
  residual_severity: string | null;
  created_at: string;
  updated_at: string;
  risks: {
    id: string;
    risk_id: string;
    title: string;
    net_severity: string | null;
    net_likelihood: string | null;
    inherent_severity: string;
    inherent_likelihood: string;
  };
}

// Fetch single treatment with risk details
export const useTreatmentDetails = (treatmentId?: string) => {
  return useQuery({
    queryKey: ['treatment-details', treatmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('risk_treatments')
        .select(`
          *,
          risks:risk_id(id, risk_id, title, net_severity, net_likelihood, inherent_severity, inherent_likelihood)
        `)
        .eq('id', treatmentId!)
        .single();

      if (error) throw error;
      return data as TreatmentWithDetails;
    },
    enabled: !!treatmentId,
  });
};

// Fetch POAMs for a treatment
export const useTreatmentPoams = (treatmentId?: string) => {
  return useQuery({
    queryKey: ['treatment-poams', treatmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('treatment_poams')
        .select(`
          *,
          profiles:owner_id(id, full_name, email)
        `)
        .eq('treatment_id', treatmentId!)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as TreatmentPoam[];
    },
    enabled: !!treatmentId,
  });
};

// Fetch controls for a treatment
export const useTreatmentControls = (treatmentId?: string) => {
  return useQuery({
    queryKey: ['treatment-controls', treatmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('treatment_controls')
        .select(`
          *,
          controls:control_id(id, control_id, name, description)
        `)
        .eq('treatment_id', treatmentId!)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as TreatmentControl[];
    },
    enabled: !!treatmentId,
  });
};

// Fetch milestones for a treatment
export const useTreatmentMilestones = (treatmentId?: string) => {
  return useQuery({
    queryKey: ['treatment-milestones', treatmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('treatment_milestones')
        .select(`
          *,
          profiles:owner_id(id, full_name, email),
          controls:control_id(id, control_id, name)
        `)
        .eq('treatment_id', treatmentId!)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data as TreatmentMilestone[];
    },
    enabled: !!treatmentId,
  });
};

// Create POAM
export const useCreateTreatmentPoam = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      treatment_id: string;
      name: string;
      description?: string;
      owner_id?: string;
      start_date?: string;
      end_date?: string;
      status?: PoamStatus;
    }) => {
      const { data, error } = await supabase
        .from('treatment_poams')
        .insert([{
          ...input,
          status: input.status || 'draft',
          created_by: user?.id || null,
        }])
        .select()
        .single();

      if (error) throw error;
      return data as TreatmentPoam;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['treatment-poams', variables.treatment_id] });
      toast({ title: 'POAM created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create POAM', description: error.message, variant: 'destructive' });
    },
  });
};

// Update POAM
export const useUpdateTreatmentPoam = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, treatmentId, ...input }: {
      id: string;
      treatmentId: string;
      name?: string;
      description?: string;
      owner_id?: string;
      start_date?: string;
      end_date?: string;
      status?: PoamStatus;
    }) => {
      const { data, error } = await supabase
        .from('treatment_poams')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, treatmentId };
    },
    onSuccess: ({ treatmentId }) => {
      queryClient.invalidateQueries({ queryKey: ['treatment-poams', treatmentId] });
      toast({ title: 'POAM updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update POAM', description: error.message, variant: 'destructive' });
    },
  });
};

// Delete POAM
export const useDeleteTreatmentPoam = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, treatmentId }: { id: string; treatmentId: string }) => {
      const { error } = await supabase
        .from('treatment_poams')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return treatmentId;
    },
    onSuccess: (treatmentId) => {
      queryClient.invalidateQueries({ queryKey: ['treatment-poams', treatmentId] });
      queryClient.invalidateQueries({ queryKey: ['treatment-milestones', treatmentId] });
      queryClient.invalidateQueries({ queryKey: ['treatment-controls', treatmentId] });
      toast({ title: 'POAM deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete POAM', description: error.message, variant: 'destructive' });
    },
  });
};

// Add control to treatment
export const useAddTreatmentControl = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: { 
      treatment_id: string; 
      control_id: string; 
      poam_id?: string;
      implementation_status?: ImplementationStatus;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('treatment_controls')
        .insert([{
          ...input,
          implementation_status: input.implementation_status || 'planned',
          created_by: user?.id || null,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['treatment-controls', variables.treatment_id] });
      toast({ title: 'Control added to treatment' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to add control', description: error.message, variant: 'destructive' });
    },
  });
};

// Remove control from treatment
export const useRemoveTreatmentControl = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, treatmentId }: { id: string; treatmentId: string }) => {
      const { error } = await supabase
        .from('treatment_controls')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return treatmentId;
    },
    onSuccess: (treatmentId) => {
      queryClient.invalidateQueries({ queryKey: ['treatment-controls', treatmentId] });
      toast({ title: 'Control removed from treatment' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to remove control', description: error.message, variant: 'destructive' });
    },
  });
};

// Update control implementation status
export const useUpdateTreatmentControl = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, treatmentId, ...input }: { 
      id: string; 
      treatmentId: string;
      poam_id?: string | null;
      implementation_status?: ImplementationStatus;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('treatment_controls')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, treatmentId };
    },
    onSuccess: ({ treatmentId }) => {
      queryClient.invalidateQueries({ queryKey: ['treatment-controls', treatmentId] });
    },
  });
};

// Add milestone
export const useAddTreatmentMilestone = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: { 
      treatment_id: string; 
      control_id?: string;
      poam_id?: string;
      title: string;
      description?: string;
      owner_id?: string;
      due_date?: string;
    }) => {
      const { data, error } = await supabase
        .from('treatment_milestones')
        .insert([{
          ...input,
          created_by: user?.id || null,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['treatment-milestones', variables.treatment_id] });
      toast({ title: 'Milestone added' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to add milestone', description: error.message, variant: 'destructive' });
    },
  });
};

// Update milestone
export const useUpdateTreatmentMilestone = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, treatmentId, ...input }: { 
      id: string; 
      treatmentId: string;
      title?: string;
      description?: string;
      owner_id?: string;
      poam_id?: string | null;
      due_date?: string;
      status?: MilestoneStatus;
      completed_at?: string | null;
    }) => {
      const updateData = { ...input } as any;
      if (input.status === 'completed' && !input.completed_at) {
        updateData.completed_at = new Date().toISOString();
      }
      
      const { data, error } = await supabase
        .from('treatment_milestones')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, treatmentId };
    },
    onSuccess: ({ treatmentId }) => {
      queryClient.invalidateQueries({ queryKey: ['treatment-milestones', treatmentId] });
      toast({ title: 'Milestone updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update milestone', description: error.message, variant: 'destructive' });
    },
  });
};

// Delete milestone
export const useDeleteTreatmentMilestone = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, treatmentId }: { id: string; treatmentId: string }) => {
      const { error } = await supabase
        .from('treatment_milestones')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return treatmentId;
    },
    onSuccess: (treatmentId) => {
      queryClient.invalidateQueries({ queryKey: ['treatment-milestones', treatmentId] });
      toast({ title: 'Milestone deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete milestone', description: error.message, variant: 'destructive' });
    },
  });
};

// Complete treatment and update risk residual
export const useCompleteTreatment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      treatmentId, 
      riskId,
      residual_likelihood, 
      residual_severity,
      status = 'completed'
    }: { 
      treatmentId: string;
      riskId: string;
      residual_likelihood: string;
      residual_severity: string;
      status?: 'in_progress' | 'completed';
    }) => {
      // Calculate residual score
      const severityScores: Record<string, number> = {
        negligible: 1, low: 2, medium: 3, high: 4, critical: 5
      };
      const likelihoodScores: Record<string, number> = {
        rare: 1, unlikely: 2, possible: 3, likely: 4, almost_certain: 5
      };
      const residualScore = (severityScores[residual_severity] || 3) * (likelihoodScores[residual_likelihood] || 3);
      
      // Determine rating from score
      let residualRating = 'medium';
      if (residualScore >= 20) residualRating = 'critical';
      else if (residualScore >= 12) residualRating = 'high';
      else if (residualScore >= 6) residualRating = 'medium';
      else residualRating = 'low';

      // Update treatment with residual risk and status
      const treatmentUpdate: Record<string, unknown> = {
        status,
        residual_likelihood,
        residual_severity,
      };
      
      if (status === 'completed') {
        treatmentUpdate.completed_at = new Date().toISOString();
      }
      
      const { error: treatmentError } = await supabase
        .from('risk_treatments')
        .update(treatmentUpdate)
        .eq('id', treatmentId);

      if (treatmentError) throw treatmentError;

      // Update the risk's residual and net risk with the new values
      const riskUpdate: Record<string, unknown> = {
        net_likelihood: residual_likelihood as any,
        net_severity: residual_severity as any,
        residual_likelihood,
        residual_score: residualScore,
        residual_rating: residualRating,
        residual_updated_at: new Date().toISOString(),
      };
      
      if (status === 'completed') {
        riskUpdate.status = 'treated' as any;
      } else {
        riskUpdate.status = 'active' as any;
      }
      
      const { error: riskError } = await supabase
        .from('risks')
        .update(riskUpdate)
        .eq('id', riskId);

      if (riskError) throw riskError;

      return { treatmentId, riskId, status };
    },
    onSuccess: ({ treatmentId, status }) => {
      queryClient.invalidateQueries({ queryKey: ['treatment-details', treatmentId] });
      queryClient.invalidateQueries({ queryKey: ['treatments-all'] });
      queryClient.invalidateQueries({ queryKey: ['treatments'] });
      queryClient.invalidateQueries({ queryKey: ['risks'] });
      
      const message = status === 'completed' 
        ? 'Treatment completed' 
        : 'Treatment started';
      const description = status === 'completed'
        ? 'Residual risk has been updated in the risk register.'
        : 'Treatment is now in progress. Residual risk has been updated.';
        
      toast({ title: message, description });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update treatment', description: error.message, variant: 'destructive' });
    },
  });
};
