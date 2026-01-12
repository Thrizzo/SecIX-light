import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/integrations/database/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
export type RiskStatus = 'draft' | 'pending_review' | 'approved' | 'active' | 'monitoring' | 'treated' | 'closed' | 'archived';
export type RiskSeverity = 'critical' | 'high' | 'medium' | 'low' | 'negligible';
export type RiskLikelihood = 'almost_certain' | 'likely' | 'possible' | 'unlikely' | 'rare';
export type RiskLevel = 'organizational' | 'operational' | 'technical';
export type RiskAssetLinkType = 'in_scope' | 'impacted' | 'root_cause' | 'other';

export interface Risk {
  id: string;
  risk_id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  owner_id: string | null;
  status: RiskStatus;
  risk_level: RiskLevel | null;
  inherent_severity: RiskSeverity;
  inherent_likelihood: RiskLikelihood;
  net_severity: RiskSeverity | null;
  net_likelihood: RiskLikelihood | null;
  inherent_score: number | null;
  treatment_plan: string | null;
  review_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  is_archived?: boolean;
  residual_likelihood?: string | null;
  residual_impact?: number | null;
  residual_score?: number | null;
  residual_rating?: string | null;
  residual_updated_at?: string | null;
}

export interface RiskAssetLink {
  id: string;
  risk_id: string;
  primary_asset_id: string | null;
  secondary_asset_id: string | null;
  link_type: RiskAssetLinkType;
  created_at: string;
  created_by: string | null;
}

export interface RiskCategory {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  thresholds_config: Record<string, string> | null;
  worst_case_description?: string | null;
  is_enabled?: boolean | null;
  created_at: string;
}

const DEFAULT_RISK_CATEGORIES: Array<Pick<RiskCategory, 'name' | 'description' | 'color'>> = [
  { name: 'Strategic', description: 'Risks affecting long-term goals', color: '#6366f1' },
  { name: 'Operational', description: 'Risks related to day-to-day operations', color: '#f59e0b' },
  { name: 'Financial', description: 'Risks related to financial losses and economic conditions', color: '#10b981' },
  { name: 'Compliance', description: 'Regulatory and legal risks', color: '#ef4444' },
  { name: 'Reputational', description: 'Brand and reputation risks', color: '#ec4899' },
  { name: 'Cyber Security', description: 'Cyber threats and information security risks', color: '#3b82f6' },
];

export const useRiskCategories = () => {
  return useQuery({
    queryKey: ['risk-categories'],
    queryFn: async () => {
      const fetch = async () => {
        const { data, error } = await db
          .from('risk_categories')
          .select('*')
          .order('name');

        if (error) throw error;
        return (data as RiskCategory[]) || [];
      };

      let categories = await fetch();

      // Fresh/self-hosted databases can come up without seed data.
      // Seed a minimal default set once (only when table is empty).
      if (categories.length === 0) {
        const { error: seedError } = await db
          .from('risk_categories')
          .insert(
            DEFAULT_RISK_CATEGORIES.map((c) => ({
              name: c.name,
              description: c.description,
              color: c.color,
              is_enabled: true,
            }))
          );

        if (!seedError) {
          categories = await fetch();
        }
      }

      return categories;
    },
  });
};

export interface CreateRiskInput {
  title: string;
  description?: string;
  category_id?: string;
  owner_id?: string;
  status?: RiskStatus;
  risk_level?: RiskLevel;
  inherent_severity: RiskSeverity;
  inherent_likelihood: RiskLikelihood;
  net_severity?: RiskSeverity;
  net_likelihood?: RiskLikelihood;
  treatment_plan?: string;
  review_date?: string;
}

export interface UpdateRiskInput extends Partial<CreateRiskInput> {
  id: string;
}

export const useRisks = () => {
  return useQuery({
    queryKey: ['risks'],
    queryFn: async () => {
      const { data, error } = await db
        .from('risks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Risk[];
    },
  });
};

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
}

export const useProfiles = () => {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await db
        .from('profiles')
        .select('*')
        .order('full_name');

      if (error) throw error;
      return data as Profile[];
    },
  });
};

export const useCreateRisk = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateRiskInput) => {
      // risk_id is auto-generated by DB trigger, so we cast to bypass TS requirement
      const insertData = {
        title: input.title,
        description: input.description || null,
        category_id: input.category_id || null,
        owner_id: input.owner_id || user?.id || null,
        status: input.status || ('draft' as const),
        risk_level: input.risk_level || 'operational',
        inherent_severity: input.inherent_severity,
        inherent_likelihood: input.inherent_likelihood,
        net_severity: input.net_severity || null,
        net_likelihood: input.net_likelihood || null,
        treatment_plan: input.treatment_plan || null,
        review_date: input.review_date || null,
        created_by: user?.id || null,
        risk_id: '', // placeholder - trigger will override this
      };
      
      const { data, error } = await db
        .from('risks')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;
      return data as Risk;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risks'] });
      toast({
        title: 'Risk created',
        description: 'The risk has been successfully added to the register.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create risk',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

// Risk Asset Links hooks
export const useRiskAssetLinks = (riskId?: string) => {
  return useQuery({
    queryKey: ['risk-asset-links', riskId],
    queryFn: async () => {
      let query = db
        .from('risk_asset_links')
        .select(`
          *,
          primary_assets:primary_asset_id(id, name, asset_id, primary_type),
          secondary_assets:secondary_asset_id(id, name, asset_id, secondary_type)
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

export const useCreateRiskAssetLink = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: { 
      risk_id: string; 
      primary_asset_id?: string; 
      secondary_asset_id?: string; 
      link_type: RiskAssetLinkType;
    }) => {
      const { data, error } = await db
        .from('risk_asset_links')
        .insert([{
          ...input,
          created_by: user?.id || null,
        }])
        .select()
        .single();

      if (error) throw error;
      return data as RiskAssetLink;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['risk-asset-links', variables.risk_id] });
      toast({
        title: 'Asset linked',
        description: 'The asset has been linked to the risk.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to link asset',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteRiskAssetLink = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, riskId }: { id: string; riskId: string }) => {
      const { error } = await db
        .from('risk_asset_links')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return riskId;
    },
    onSuccess: (riskId) => {
      queryClient.invalidateQueries({ queryKey: ['risk-asset-links', riskId] });
      toast({
        title: 'Asset unlinked',
        description: 'The asset has been unlinked from the risk.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to unlink asset',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateRisk = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateRiskInput) => {
      const { data, error } = await db
        .from('risks')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Risk;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risks'] });
      toast({
        title: 'Risk updated',
        description: 'The risk has been successfully updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update risk',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteRisk = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from('risks')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risks'] });
      toast({
        title: 'Risk deleted',
        description: 'The risk has been removed from the register.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete risk',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

// Utility functions for scoring
export const severityScore = (severity: RiskSeverity): number => {
  const scores: Record<RiskSeverity, number> = {
    critical: 5,
    high: 4,
    medium: 3,
    low: 2,
    negligible: 1,
  };
  return scores[severity];
};

export const likelihoodScore = (likelihood: RiskLikelihood): number => {
  const scores: Record<RiskLikelihood, number> = {
    almost_certain: 5,
    likely: 4,
    possible: 3,
    unlikely: 2,
    rare: 1,
  };
  return scores[likelihood];
};

export const calculateRiskScore = (severity: RiskSeverity, likelihood: RiskLikelihood): number => {
  return severityScore(severity) * likelihoodScore(likelihood);
};

export const getRiskLevel = (score: number): 'critical' | 'high' | 'medium' | 'low' => {
  if (score >= 20) return 'critical';
  if (score >= 12) return 'high';
  if (score >= 6) return 'medium';
  return 'low';
};
