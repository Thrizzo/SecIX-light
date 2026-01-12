import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/database/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

// Types
export interface SecurityTool {
  id: string;
  name: string;
  category: string;
  url: string;
  description: string | null;
  owner_id: string | null;
  tags: string[] | null;
  is_pinned_default: boolean;
  integration_status: string;
  last_check_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SirtTeam {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface SirtMember {
  id: string;
  team_id: string | null;
  profile_id: string | null;
  name: string;
  role: string;
  email: string | null;
  phone: string | null;
  timezone: string | null;
  location: string | null;
  escalation_tier: number | null;
  availability: string | null;
  backup_member_id: string | null;
  skills_tags: string[] | null;
  is_on_call: boolean;
  created_at: string;
  updated_at: string;
  team?: { id: string; name: string } | null;
  backup_member?: { name: string } | null;
}

export interface ThreatInfoSource {
  id: string;
  name: string;
  source_type: string | null;
  url?: string | null;
  credibility_notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ThreatSource {
  id: string;
  identifier: string;
  threat_type: string;
  subtype: string | null;
  description: string | null;
  source_info_id: string | null;
  in_scope: boolean;
  notes: string | null;
  business_unit_id: string | null;
  created_at: string;
  updated_at: string;
  source_info?: ThreatInfoSource | null;
  adversarial_profile?: {
    capability_score: number | null;
    capability_qual: string | null;
    intent_score: number | null;
    intent_qual: string | null;
    targeting_score: number | null;
    targeting_qual: string | null;
    rationale: string | null;
  } | null;
  nonadversarial_profile?: {
    range_effects_score: number | null;
    range_effects_qual: string | null;
    rationale: string | null;
  } | null;
}

export interface ThreatEvent {
  id: string;
  identifier: string;
  event_type: string;
  title: string;
  description: string | null;
  source_info_id: string | null;
  threat_source_id: string | null;
  relevance: string;
  mitre_technique_id: string | null;
  tags: string[] | null;
  business_unit_id: string | null;
  created_at: string;
  updated_at: string;
  source_info?: { id: string; name: string; source_type: string | null } | null;
  threat_source?: { id: string; identifier: string; threat_type: string } | null;
}

export interface Vulnerability {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  source_info_id: string | null;
  severity_score: number | null;
  severity_qual: string | null;
  status: string;
  discovered_at: string | null;
  resolved_at: string | null;
  notes: string | null;
  business_unit_id: string | null;
  created_at: string;
  updated_at: string;
  source_info?: { id: string; name: string; source_type: string | null } | null;
}

export interface PredisposingCondition {
  id: string;
  identifier: string;
  condition_type: string;
  subtype: string | null;
  description: string | null;
  source_info_id: string | null;
  pervasiveness_score: number | null;
  pervasiveness_qual: string | null;
  notes: string | null;
  business_unit_id: string | null;
  created_at: string;
  updated_at: string;
  source_info?: { id: string; name: string; source_type: string | null } | null;
}

// Taxonomy Types
export interface ThreatSourceTaxonomy {
  id: string;
  type: 'ADVERSARIAL' | 'ACCIDENTAL' | 'STRUCTURAL' | 'ENVIRONMENTAL';
  subtype: string;
  description: string | null;
  risk_factors: string[];
  is_default: boolean;
  org_id: string | null;
}

export interface SecopsScale {
  id: string;
  scale_name: string;
  qualitative: string;
  semi_quant_min: number | null;
  semi_quant_max: number | null;
  score_0_to_10: number;
  description: string | null;
  sort_order: number;
  is_default: boolean;
  org_id: string | null;
}

export interface ThreatEventTaxonomy {
  id: string;
  is_adversarial: boolean;
  category: string;
  name: string;
  description: string | null;
  is_default: boolean;
  org_id: string | null;
}

export interface VulnerabilityNatureTaxonomy {
  id: string;
  category: string;
  subcategory: string | null;
  description: string | null;
  is_default: boolean;
  org_id: string | null;
}

export interface SecopsThreat {
  id: string;
  identifier: string;
  name: string;
  threat_source_id: string | null;
  threat_event_id: string | null;
  relevance: string | null;
  in_scope: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  threat_source?: ThreatSource | null;
  threat_event?: ThreatEvent | null;
}


// Security Tools Hooks
export function useSecurityTools() {
  return useQuery({
    queryKey: ['security-tools'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('security_tools')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return data as SecurityTool[];
    },
  });
}

export function useCreateSecurityTool() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (tool: Omit<SecurityTool, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('security_tools')
        .insert({ ...tool, created_by: profile?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-tools'] });
      toast({ title: 'Security tool added' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding tool', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateSecurityTool() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SecurityTool> & { id: string }) => {
      const { data, error } = await supabase
        .from('security_tools')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-tools'] });
      toast({ title: 'Security tool updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating tool', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteSecurityTool() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('security_tools').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-tools'] });
      toast({ title: 'Security tool deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting tool', description: error.message, variant: 'destructive' });
    },
  });
}

// SIRT Hooks
export function useSirtTeams() {
  return useQuery({
    queryKey: ['sirt-teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sirt_teams')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as SirtTeam[];
    },
  });
}

export function useSirtMembers() {
  return useQuery({
    queryKey: ['sirt-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sirt_members')
        .select(`
          *,
          team:sirt_teams(id, name)
        `)
        .order('escalation_tier', { ascending: true, nullsFirst: false })
        .order('name');
      if (error) throw error;
      return data as SirtMember[];
    },
  });
}

export function useCreateSirtTeam() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (team: { name: string; description?: string }) => {
      const { data, error } = await supabase
        .from('sirt_teams')
        .insert(team)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sirt-teams'] });
      toast({ title: 'SIRT team created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating team', description: error.message, variant: 'destructive' });
    },
  });
}

export function useCreateSirtMember() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (member: Omit<SirtMember, 'id' | 'created_at' | 'updated_at' | 'team' | 'backup_member'>) => {
      const { data, error } = await supabase
        .from('sirt_members')
        .insert({ ...member, created_by: profile?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sirt-members'] });
      toast({ title: 'SIRT member added' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding member', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateSirtMember() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SirtMember> & { id: string }) => {
      const { data, error } = await supabase
        .from('sirt_members')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sirt-members'] });
      toast({ title: 'SIRT member updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating member', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteSirtMember() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sirt_members').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sirt-members'] });
      toast({ title: 'SIRT member removed' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error removing member', description: error.message, variant: 'destructive' });
    },
  });
}

// Threat Info Sources Hooks
export function useThreatInfoSources() {
  return useQuery({
    queryKey: ['threat-info-sources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('threat_info_sources')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as ThreatInfoSource[];
    },
  });
}

export function useCreateThreatInfoSource() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (source: { name: string; source_type?: string; url?: string; credibility_notes?: string }) => {
      const { data, error } = await supabase
        .from('threat_info_sources')
        .insert({ ...source, created_by: profile?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threat-info-sources'] });
      toast({ title: 'Threat info source added' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding source', description: error.message, variant: 'destructive' });
    },
  });
}

// Threat Sources Hooks
export function useThreatSources(inScopeOnly = false) {
  return useQuery({
    queryKey: ['threat-sources', inScopeOnly],
    queryFn: async () => {
      let query = supabase
        .from('threat_sources')
        .select(`
          *,
          source_info:threat_info_sources(id, name, source_type),
          adversarial_profile:threat_source_adversarial_profiles(*),
          nonadversarial_profile:threat_source_nonadversarial_profiles(*)
        `)
        .order('identifier');
      
      if (inScopeOnly) {
        query = query.eq('in_scope', true);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as ThreatSource[];
    },
  });
}

export function useCreateThreatSource() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (source: {
      identifier: string;
      threat_type: string;
      subtype?: string;
      description?: string;
      source_info_id?: string;
      in_scope?: boolean;
      notes?: string;
      business_unit_id?: string;
      adversarial_profile?: {
        capability_score?: number;
        capability_qual?: string;
        intent_score?: number;
        intent_qual?: string;
        targeting_score?: number;
        targeting_qual?: string;
        rationale?: string;
      };
      nonadversarial_profile?: {
        range_effects_score?: number;
        range_effects_qual?: string;
        rationale?: string;
      };
    }) => {
      const { adversarial_profile, nonadversarial_profile, ...sourceData } = source;
      
      const { data, error } = await supabase
        .from('threat_sources')
        .insert({ ...sourceData, created_by: profile?.id })
        .select()
        .single();
      if (error) throw error;

      const insertedData = data as { id: string };
      
      // Insert adversarial profile if applicable
      if (source.threat_type === 'Adversarial' && adversarial_profile) {
        await supabase
          .from('threat_source_adversarial_profiles')
          .insert({ threat_source_id: insertedData.id, ...adversarial_profile } as any);
      }

      // Insert non-adversarial profile if applicable
      if (source.threat_type !== 'Adversarial' && nonadversarial_profile) {
        await supabase
          .from('threat_source_nonadversarial_profiles')
          .insert({ threat_source_id: insertedData.id, ...nonadversarial_profile } as any);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threat-sources'] });
      toast({ title: 'Threat source added' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding threat source', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateThreatSource() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, adversarial_profile, nonadversarial_profile, ...updates }: Partial<ThreatSource> & { id: string } & {
      adversarial_profile?: {
        capability_score?: number;
        capability_qual?: string;
        intent_score?: number;
        intent_qual?: string;
        targeting_score?: number;
        targeting_qual?: string;
        rationale?: string;
      };
      nonadversarial_profile?: {
        range_effects_score?: number;
        range_effects_qual?: string;
        rationale?: string;
      };
    }) => {
      const { data, error } = await supabase
        .from('threat_sources')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      // Upsert adversarial profile if provided
      if (adversarial_profile) {
        await supabase
          .from('threat_source_adversarial_profiles')
          .upsert({ threat_source_id: id, ...adversarial_profile });
      }

      // Upsert non-adversarial profile if provided
      if (nonadversarial_profile) {
        await supabase
          .from('threat_source_nonadversarial_profiles')
          .upsert({ threat_source_id: id, ...nonadversarial_profile });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threat-sources'] });
      toast({ title: 'Threat source updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating threat source', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteThreatSource() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('threat_sources').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threat-sources'] });
      toast({ title: 'Threat source deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting threat source', description: error.message, variant: 'destructive' });
    },
  });
}

// Threat Events Hooks
export function useThreatEvents() {
  return useQuery({
    queryKey: ['threat-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('threat_events')
        .select(`
          *,
          source_info:threat_info_sources(id, name, source_type),
          threat_source:threat_sources(id, identifier, threat_type)
        `)
        .order('identifier');
      if (error) throw error;
      return data as ThreatEvent[];
    },
  });
}

export function useCreateThreatEvent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (event: Omit<ThreatEvent, 'id' | 'created_at' | 'updated_at' | 'source_info' | 'threat_source'>) => {
      const { data, error } = await supabase
        .from('threat_events')
        .insert({ ...event, created_by: profile?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threat-events'] });
      toast({ title: 'Threat event added' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding threat event', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateThreatEvent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ThreatEvent> & { id: string }) => {
      const { data, error } = await supabase
        .from('threat_events')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threat-events'] });
      toast({ title: 'Threat event updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating threat event', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteThreatEvent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('threat_events').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threat-events'] });
      toast({ title: 'Threat event deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting threat event', description: error.message, variant: 'destructive' });
    },
  });
}

// Vulnerabilities Hooks
export function useVulnerabilities() {
  return useQuery({
    queryKey: ['vulnerabilities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vulnerabilities')
        .select(`
          *,
          source_info:threat_info_sources(id, name, source_type)
        `)
        .order('severity_score', { ascending: false, nullsFirst: false })
        .order('identifier');
      if (error) throw error;
      return data as Vulnerability[];
    },
  });
}

export function useCreateVulnerability() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (vuln: Omit<Vulnerability, 'id' | 'created_at' | 'updated_at' | 'source_info'>) => {
      const { data, error } = await supabase
        .from('vulnerabilities')
        .insert({ ...vuln, created_by: profile?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vulnerabilities'] });
      toast({ title: 'Vulnerability added' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding vulnerability', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateVulnerability() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Vulnerability> & { id: string }) => {
      const { data, error } = await supabase
        .from('vulnerabilities')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vulnerabilities'] });
      toast({ title: 'Vulnerability updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating vulnerability', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteVulnerability() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vulnerabilities').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vulnerabilities'] });
      toast({ title: 'Vulnerability deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting vulnerability', description: error.message, variant: 'destructive' });
    },
  });
}

// Predisposing Conditions Hooks
export function usePredisposingConditions() {
  return useQuery({
    queryKey: ['predisposing-conditions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('predisposing_conditions')
        .select(`
          *,
          source_info:threat_info_sources(id, name, source_type)
        `)
        .order('condition_type')
        .order('identifier');
      if (error) throw error;
      return data as PredisposingCondition[];
    },
  });
}

export function useCreatePredisposingCondition() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (condition: Omit<PredisposingCondition, 'id' | 'created_at' | 'updated_at' | 'source_info'>) => {
      const { data, error } = await supabase
        .from('predisposing_conditions')
        .insert({ ...condition, created_by: profile?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['predisposing-conditions'] });
      toast({ title: 'Predisposing condition added' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding condition', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdatePredisposingCondition() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PredisposingCondition> & { id: string }) => {
      const { data, error } = await supabase
        .from('predisposing_conditions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['predisposing-conditions'] });
      toast({ title: 'Predisposing condition updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating condition', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeletePredisposingCondition() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('predisposing_conditions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['predisposing-conditions'] });
      toast({ title: 'Predisposing condition deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting condition', description: error.message, variant: 'destructive' });
    },
  });
}

// Taxonomy Hooks

export function useThreatSourceTaxonomy() {
  return useQuery({
    queryKey: ['secops-threat-source-taxonomy'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('secops_threat_source_taxonomy')
        .select('*')
        .order('type')
        .order('subtype');
      if (error) throw error;
      return data as ThreatSourceTaxonomy[];
    },
  });
}

export function useSecopsScales(scaleName?: string) {
  return useQuery({
    queryKey: ['secops-scales', scaleName],
    queryFn: async () => {
      let query = supabase
        .from('secops_scales')
        .select('*')
        .order('sort_order');
      
      if (scaleName) {
        query = query.eq('scale_name', scaleName);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as SecopsScale[];
    },
  });
}

export function useThreatEventTaxonomy() {
  return useQuery({
    queryKey: ['secops-threat-event-taxonomy'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('secops_threat_event_taxonomy')
        .select('*')
        .order('is_adversarial', { ascending: false })
        .order('category')
        .order('name');
      if (error) throw error;
      return data as ThreatEventTaxonomy[];
    },
  });
}

export function useVulnerabilityNatureTaxonomy() {
  return useQuery({
    queryKey: ['secops-vuln-nature-taxonomy'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('secops_vulnerability_nature_taxonomy')
        .select('*')
        .order('category')
        .order('subcategory');
      if (error) throw error;
      return data as VulnerabilityNatureTaxonomy[];
    },
  });
}

// Threat Catalog (Threats = Source + Event pairing)
export function useSecopsThreats() {
  return useQuery({
    queryKey: ['secops-threats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('secops_threats')
        .select(`
          *,
          threat_source:threat_sources(id, identifier, threat_type, subtype, description),
          threat_event:threat_events(id, identifier, title, event_type, relevance)
        `)
        .order('identifier');
      if (error) throw error;
      return data as SecopsThreat[];
    },
  });
}

export function useCreateSecopsThreat() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (threat: {
      identifier: string;
      name: string;
      threat_source_id?: string | null;
      threat_event_id?: string | null;
      relevance?: string | null;
      in_scope?: boolean;
      notes?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('secops_threats')
        .insert({ ...threat, created_by: profile?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secops-threats'] });
      toast({ title: 'Threat added to catalog' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding threat', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateSecopsThreat() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SecopsThreat> & { id: string }) => {
      const { data, error } = await supabase
        .from('secops_threats')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secops-threats'] });
      toast({ title: 'Threat updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating threat', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteSecopsThreat() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('secops_threats').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secops-threats'] });
      toast({ title: 'Threat deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting threat', description: error.message, variant: 'destructive' });
    },
  });
}

// Threat Event <-> Source linking
export function useThreatEventSourceLinks(eventId?: string) {
  return useQuery({
    queryKey: ['threat-event-source-links', eventId],
    queryFn: async () => {
      let query = supabase
        .from('secops_threat_event_sources')
        .select(`
          *,
          threat_source:threat_sources(id, identifier, threat_type, subtype),
          threat_event:threat_events(id, identifier, title)
        `);
      
      if (eventId) {
        query = query.eq('threat_event_id', eventId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!eventId || eventId === undefined,
  });
}

export function useLinkThreatEventSource() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ threat_event_id, threat_source_id }: { threat_event_id: string; threat_source_id: string }) => {
      const { data, error } = await supabase
        .from('secops_threat_event_sources')
        .insert({ threat_event_id, threat_source_id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threat-event-source-links'] });
      toast({ title: 'Threat source linked' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error linking source', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUnlinkThreatEventSource() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('secops_threat_event_sources').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threat-event-source-links'] });
      toast({ title: 'Threat source unlinked' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error unlinking source', description: error.message, variant: 'destructive' });
    },
  });
}
