import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/integrations/database/client';
import { useToast } from '@/hooks/use-toast';

// Alias for backward compatibility
const supabase = db;

// Cache times for static data (5 minutes)
const STATIC_STALE_TIME = 5 * 60 * 1000;

export interface RiskMatrix {
  id: string;
  name: string;
  size: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MatrixLikelihoodLevel {
  id: string;
  matrix_id: string;
  level: number;
  label: string;
  description: string | null;
  color: string | null;
  created_at: string;
}

export interface MatrixImpactLevel {
  id: string;
  matrix_id: string;
  level: number;
  label: string;
  description: string | null;
  color: string | null;
  created_at: string;
}

export interface RiskAppetite {
  id: string;
  name: string;
  owner_id: string | null;
  matrix_id: string;
  narrative_statement: string | null;
  escalation_criteria: string | null;
  reporting_cadence: string | null;
  privacy_constraints: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RiskAppetiteBand {
  id: string;
  appetite_id: string;
  band: string;
  min_score: number;
  max_score: number;
  acceptance_owner_id: string | null;
  acceptance_role: string | null;
  label: string | null;
  color: string | null;
  authorized_actions: string[] | null;
  description: string | null;
  created_at: string;
}

export interface CreateRiskMatrixInput {
  name: string;
  size: number;
  is_active?: boolean;
}

export interface CreateAppetiteInput {
  name: string;
  matrix_id: string;
  owner_id?: string;
  narrative_statement?: string;
  escalation_criteria?: string;
  reporting_cadence?: string;
  privacy_constraints?: string;
  is_active?: boolean;
  status?: string;
  effective_date?: string;
}

export interface CreateAppetiteBandInput {
  appetite_id: string;
  band: string;
  min_score: number;
  max_score: number;
  acceptance_owner_id?: string;
  acceptance_role?: string;
  label?: string;
  color?: string;
  authorized_actions?: string[];
  description?: string;
}

// Risk Matrices
export const useRiskMatrices = () => {
  return useQuery({
    queryKey: ['risk-matrices'],
    staleTime: STATIC_STALE_TIME,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('risk_matrices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as RiskMatrix[];
    },
  });
};

export const useActiveRiskMatrix = () => {
  return useQuery({
    queryKey: ['risk-matrices', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('risk_matrices')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data as RiskMatrix | null;
    },
  });
};

export const useMatrixLikelihoodLevels = (matrixId?: string) => {
  return useQuery({
    queryKey: ['matrix-likelihood-levels', matrixId],
    staleTime: STATIC_STALE_TIME,
    enabled: !!matrixId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matrix_likelihood_levels')
        .select('*')
        .eq('matrix_id', matrixId!)
        .order('level');

      if (error) throw error;
      return data as MatrixLikelihoodLevel[];
    },
  });
};

export const useMatrixImpactLevels = (matrixId?: string) => {
  return useQuery({
    queryKey: ['matrix-impact-levels', matrixId],
    staleTime: STATIC_STALE_TIME,
    enabled: !!matrixId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matrix_impact_levels')
        .select('*')
        .eq('matrix_id', matrixId!)
        .order('level');

      if (error) throw error;
      return data as MatrixImpactLevel[];
    },
  });
};

export const useCreateRiskMatrix = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateRiskMatrixInput) => {
      const { data, error } = await supabase
        .from('risk_matrices')
        .insert([input])
        .select()
        .single();

      if (error) throw error;
      return data as RiskMatrix;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-matrices'] });
      toast({ title: 'Matrix created', description: 'Risk matrix has been created.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create matrix', description: error.message, variant: 'destructive' });
    },
  });
};

export const useSetActiveMatrix = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (matrixId: string) => {
      // First deactivate all matrices
      await supabase.from('risk_matrices').update({ is_active: false }).neq('id', 'none');
      
      // Then activate the selected one
      const { data, error } = await supabase
        .from('risk_matrices')
        .update({ is_active: true })
        .eq('id', matrixId)
        .select()
        .single();

      if (error) throw error;
      return data as RiskMatrix;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-matrices'] });
      toast({ title: 'Matrix activated', description: 'This matrix is now the active scoring matrix.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to activate matrix', description: error.message, variant: 'destructive' });
    },
  });
};

export const useCreateMatrixLevels = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      matrixId, 
      likelihoodLevels, 
      impactLevels 
    }: { 
      matrixId: string; 
      likelihoodLevels: Omit<MatrixLikelihoodLevel, 'id' | 'created_at'>[]; 
      impactLevels: Omit<MatrixImpactLevel, 'id' | 'created_at'>[] 
    }) => {
      const { error: llError } = await supabase
        .from('matrix_likelihood_levels')
        .insert(likelihoodLevels.map(l => ({ ...l, matrix_id: matrixId })));
      
      if (llError) throw llError;

      const { error: ilError } = await supabase
        .from('matrix_impact_levels')
        .insert(impactLevels.map(l => ({ ...l, matrix_id: matrixId })));

      if (ilError) throw ilError;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['matrix-likelihood-levels', variables.matrixId] });
      queryClient.invalidateQueries({ queryKey: ['matrix-impact-levels', variables.matrixId] });
    },
  });
};

export const useUpdateLikelihoodLevel = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, matrixId, label, description, color }: { 
      id: string; 
      matrixId: string;
      label?: string; 
      description?: string | null;
      color?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('matrix_likelihood_levels')
        .update({ label, description, color })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, matrixId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['matrix-likelihood-levels', result.matrixId] });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update level', description: error.message, variant: 'destructive' });
    },
  });
};

export const useUpdateImpactLevel = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, matrixId, label, description, color }: { 
      id: string; 
      matrixId: string;
      label?: string; 
      description?: string | null;
      color?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('matrix_impact_levels')
        .update({ label, description, color })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, matrixId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['matrix-impact-levels', result.matrixId] });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update level', description: error.message, variant: 'destructive' });
    },
  });
};

// Risk Appetites
export const useRiskAppetites = () => {
  return useQuery({
    queryKey: ['risk-appetites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('risk_appetites')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as RiskAppetite[];
    },
  });
};

export const useActiveRiskAppetite = () => {
  return useQuery({
    queryKey: ['risk-appetites', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('risk_appetites')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data as RiskAppetite | null;
    },
  });
};

export const useRiskAppetiteBands = (appetiteId?: string) => {
  return useQuery({
    queryKey: ['risk-appetite-bands', appetiteId],
    enabled: !!appetiteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('risk_appetite_bands')
        .select('*')
        .eq('appetite_id', appetiteId!)
        .order('min_score');

      if (error) throw error;
      return data as RiskAppetiteBand[];
    },
  });
};

export const useCreateRiskAppetite = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateAppetiteInput) => {
      const { data, error } = await supabase
        .from('risk_appetites')
        .insert([input])
        .select()
        .single();

      if (error) throw error;
      return data as RiskAppetite;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-appetites'] });
      toast({ title: 'Appetite created', description: 'Risk appetite statement has been created.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create appetite', description: error.message, variant: 'destructive' });
    },
  });
};

export const useUpdateRiskAppetite = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<CreateAppetiteInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('risk_appetites')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as RiskAppetite;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-appetites'] });
      toast({ title: 'Appetite updated', description: 'Risk appetite statement has been updated.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update appetite', description: error.message, variant: 'destructive' });
    },
  });
};

export const useSetActiveAppetite = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (appetiteId: string) => {
      // First deactivate all currently active appetites
      const { error: deactivateError } = await supabase
        .from('risk_appetites')
        .update({ is_active: false })
        .eq('is_active', true);
      
      if (deactivateError) throw deactivateError;
      
      // Then activate the selected one
      const { data, error } = await supabase
        .from('risk_appetites')
        .update({ is_active: true })
        .eq('id', appetiteId)
        .select()
        .single();

      if (error) throw error;
      return data as RiskAppetite;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-appetites'] });
      toast({ title: 'Appetite activated', description: 'This appetite is now the active statement.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to activate appetite', description: error.message, variant: 'destructive' });
    },
  });
};

export const useCreateAppetiteBand = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateAppetiteBandInput) => {
      const { data, error } = await supabase
        .from('risk_appetite_bands')
        .insert([input])
        .select()
        .single();

      if (error) throw error;
      return data as RiskAppetiteBand;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['risk-appetite-bands', variables.appetite_id] });
      toast({ title: 'Band created', description: 'Appetite band has been added.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create band', description: error.message, variant: 'destructive' });
    },
  });
};

export const useUpdateAppetiteBand = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, appetite_id, ...input }: Partial<CreateAppetiteBandInput> & { id: string; appetite_id: string }) => {
      const { data, error } = await supabase
        .from('risk_appetite_bands')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      const typedData = data as RiskAppetiteBand;
      return { ...typedData, appetite_id } as RiskAppetiteBand;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['risk-appetite-bands', data.appetite_id] });
    },
  });
};

export const useDeleteAppetiteBand = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, appetite_id }: { id: string; appetite_id: string }) => {
      const { error } = await supabase
        .from('risk_appetite_bands')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { appetite_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['risk-appetite-bands', data.appetite_id] });
    },
  });
};

// Utility to get band for a given score
export const getBandForScore = (bands: RiskAppetiteBand[], score: number): RiskAppetiteBand | null => {
  return bands.find(b => score >= b.min_score && score <= b.max_score) || null;
};

// Dynamic band config from database band data
export const getBandConfig = (band: RiskAppetiteBand) => ({
  label: band.label || band.band,
  color: band.color || '#6366f1',
  bgColor: band.color ? `${band.color}20` : 'bg-primary/20',
});

// Legacy bandConfig for backward compatibility
export const bandConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  acceptable: { label: 'Acceptable', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' },
  monitor: { label: 'Monitor', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
  treat: { label: 'Treat', color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
  escalate: { label: 'Escalate', color: 'text-red-400', bgColor: 'bg-red-500/20' },
};
