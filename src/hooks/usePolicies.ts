import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/database/client';
import { useToast } from '@/hooks/use-toast';

export interface Policy {
  id: string;
  business_unit_id: string;
  title: string;
  policy_type: string | null;
  document_type: 'policy' | 'standard' | 'procedure' | 'scope_statement' | 'statement_of_applicability';
  status: 'draft' | 'review' | 'published' | 'archived';
  owner_user_id: string;
  accountable_user_id: string;
  approver_user_id: string | null;
  responsible_user_id: string | null;
  consulted_user_ids: string[];
  informed_user_ids: string[];
  effective_date: string | null;
  review_by_date: string | null;
  last_published_at: string | null;
  created_at: string;
  updated_at: string;
  business_units?: {
    id: string;
    name: string;
  };
}

export interface PolicyVersion {
  id: string;
  policy_id: string;
  version: number;
  content_markdown: string;
  ai_generated: boolean;
  ai_prompt_context: Record<string, any> | null;
  ai_rationale: string | null;
  created_by_user_id: string | null;
  created_at: string;
}

export interface PolicySection {
  id: string;
  policy_id: string;
  title: string;
  content_markdown: string;
  section_order: number;
  ai_generated: boolean;
  created_at: string;
  updated_at: string;
}

export const usePolicies = () => {
  return useQuery({
    queryKey: ['policies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('policies')
        .select(`
          *,
          business_units (id, name)
        `)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data as Policy[];
    },
  });
};

export const usePolicy = (id?: string) => {
  return useQuery({
    queryKey: ['policy', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('policies')
        .select(`
          *,
          business_units (id, name)
        `)
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as Policy;
    },
  });
};

export const usePolicySections = (policyId?: string) => {
  return useQuery({
    queryKey: ['policy-sections', policyId],
    enabled: !!policyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('policy_sections')
        .select('*')
        .eq('policy_id', policyId!)
        .order('section_order', { ascending: true });
      if (error) throw error;
      return data as PolicySection[];
    },
  });
};

export const usePolicyVersions = (policyId?: string) => {
  return useQuery({
    queryKey: ['policy-versions', policyId],
    enabled: !!policyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('policy_versions')
        .select('*')
        .eq('policy_id', policyId!)
        .order('version', { ascending: false });
      if (error) throw error;
      return data as PolicyVersion[];
    },
  });
};

export const useCreatePolicy = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      business_unit_id: string;
      title: string;
      policy_type?: string;
      document_type?: 'policy' | 'standard' | 'procedure' | 'scope_statement' | 'statement_of_applicability';
      owner_user_id: string;
      accountable_user_id: string;
      responsible_user_id?: string;
      consulted_user_ids?: string[];
      informed_user_ids?: string[];
      effective_date?: string;
      review_by_date?: string;
    }) => {
      const { data, error } = await supabase
        .from('policies')
        .insert({
          ...input,
          document_type: input.document_type || 'policy',
        })
        .select()
        .single();
      if (error) throw error;
      return data as Policy;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      toast({ title: 'Document created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create document', description: error.message, variant: 'destructive' });
    },
  });
};

export const useUpdatePolicy = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Partial<Policy>) => {
      const { data, error } = await supabase
        .from('policies')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      queryClient.invalidateQueries({ queryKey: ['policy', variables.id] });
      toast({ title: 'Document updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update document', description: error.message, variant: 'destructive' });
    },
  });
};

export const useCreatePolicySection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      policy_id: string;
      title: string;
      content_markdown?: string;
      section_order: number;
      ai_generated?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('policy_sections')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as PolicySection;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['policy-sections', variables.policy_id] });
    },
  });
};

export const useUpdatePolicySection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, policyId, ...input }: { id: string; policyId: string } & Partial<PolicySection>) => {
      const { data, error } = await supabase
        .from('policy_sections')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['policy-sections', variables.policyId] });
    },
  });
};

export const useDeletePolicySection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, policyId }: { id: string; policyId: string }) => {
      const { error } = await supabase
        .from('policy_sections')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['policy-sections', variables.policyId] });
    },
  });
};

export const useReorderPolicySections = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ policyId, sections }: { policyId: string; sections: { id: string; section_order: number }[] }) => {
      const updates = sections.map(s => 
        supabase
          .from('policy_sections')
          .update({ section_order: s.section_order })
          .eq('id', s.id)
      );
      await Promise.all(updates);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['policy-sections', variables.policyId] });
    },
  });
};

export const useCreatePolicyVersion = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      policy_id: string;
      content_markdown: string;
      ai_generated?: boolean;
      ai_prompt_context?: Record<string, any>;
      ai_rationale?: string;
      created_by_user_id?: string;
    }) => {
      const { data: versions } = await supabase
        .from('policy_versions')
        .select('version')
        .eq('policy_id', input.policy_id)
        .order('version', { ascending: false })
        .limit(1);

      const typedVersions = versions as Array<{ version: number }> | null;
      const nextVersion = (typedVersions?.[0]?.version || 0) + 1;

      const { data, error } = await supabase
        .from('policy_versions')
        .insert({
          ...input,
          version: nextVersion,
        })
        .select()
        .single();
      if (error) throw error;
      return data as PolicyVersion;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['policy-versions', variables.policy_id] });
      toast({ title: 'Version saved' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to save version', description: error.message, variant: 'destructive' });
    },
  });
};

export const usePublishPolicy = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('policies')
        .update({ 
          status: 'published',
          last_published_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      queryClient.invalidateQueries({ queryKey: ['policy', id] });
      toast({ title: 'Document published' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to publish', description: error.message, variant: 'destructive' });
    },
  });
};

export const useDeletePolicy = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // Delete sections first
      await supabase.from('policy_sections').delete().eq('policy_id', id);
      // Delete versions
      await supabase.from('policy_versions').delete().eq('policy_id', id);
      // Delete the policy
      const { error } = await supabase.from('policies').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      toast({ title: 'Document deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete document', description: error.message, variant: 'destructive' });
    },
  });
};

// Helper to compile all sections into markdown
export const compileSectionsToMarkdown = (sections: PolicySection[]): string => {
  return sections
    .sort((a, b) => a.section_order - b.section_order)
    .map(s => `## ${s.title}\n\n${s.content_markdown}`)
    .join('\n\n');
};
