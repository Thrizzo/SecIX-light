import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/database/client';
import { config } from '@/lib/config';
import { useToast } from '@/hooks/use-toast';

export type FindingType = 'Major Deviation' | 'Minor Deviation' | 'Opportunity for Improvement';
export type FindingStatus = 'Open' | 'In Progress' | 'Closed' | 'Accepted';
export type PoamStatus = 'draft' | 'active' | 'completed' | 'cancelled';
export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';

// Helper to derive compliance status from findings
// Priority: Major Deviation > Minor Deviation > Opportunity for Improvement
// Only open/in-progress findings affect compliance status
function deriveComplianceStatus(findings: Array<{ finding_type: FindingType; status: FindingStatus }>): string {
  const activeFindings = findings.filter(f => f.status !== 'Closed');
  
  if (activeFindings.some(f => f.finding_type === 'Major Deviation')) {
    return 'major_deviation';
  }
  if (activeFindings.some(f => f.finding_type === 'Minor Deviation')) {
    return 'minor_deviation';
  }
  // Opportunities for improvement still allow compliant status
  return 'compliant';
}

// Update internal control compliance status based on its findings
async function updateInternalControlComplianceStatus(controlId: string): Promise<boolean> {
  const { data: findings, error: fetchError } = await supabase
    .from('control_findings')
    .select('finding_type, status')
    .eq('internal_control_id', controlId);

  if (fetchError) {
    console.error('Failed to fetch findings for compliance update:', fetchError);
    return false;
  }

  const typedFindings = (findings || []) as Array<{ finding_type: FindingType; status: FindingStatus }>;
  const newStatus = deriveComplianceStatus(typedFindings);
  
  console.log('Updating internal control compliance:', { controlId, findingsCount: typedFindings.length, newStatus });
  
  const { error: updateError } = await supabase
    .from('internal_controls')
    .update({ compliance_status: newStatus })
    .eq('id', controlId);

  if (updateError) {
    console.error('Failed to update internal control compliance status:', updateError);
    return false;
  }
  return true;
}

// Update framework control compliance status based on its findings
async function updateFrameworkControlComplianceStatus(controlId: string): Promise<boolean> {
  const { data: findings, error: fetchError } = await supabase
    .from('control_findings')
    .select('finding_type, status')
    .eq('framework_control_id', controlId);

  if (fetchError) {
    console.error('Failed to fetch findings for compliance update:', fetchError);
    return false;
  }

  const typedFindings = (findings || []) as Array<{ finding_type: FindingType; status: FindingStatus }>;
  const newStatus = deriveComplianceStatus(typedFindings);
  
  console.log('Updating framework control compliance:', { controlId, findingsCount: typedFindings.length, newStatus });
  
  const { error: updateError } = await supabase
    .from('framework_controls')
    .update({ compliance_status: newStatus })
    .eq('id', controlId);

  if (updateError) {
    console.error('Failed to update framework control compliance status:', updateError);
    return false;
  }
  return true;
}

export interface ControlFinding {
  id: string;
  internal_control_id?: string | null;
  framework_control_id?: string | null;
  finding_type: FindingType;
  title: string;
  description?: string | null;
  status: FindingStatus;
  identified_date: string;
  due_date?: string | null;
  closed_date?: string | null;
  assigned_to?: string | null;
  created_by?: string | null;
  business_unit_id?: string | null;
  remediation_plan?: string | null;
  remediation_notes?: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  internal_control?: { id: string; title: string; internal_control_code: string } | null;
  framework_control?: { id: string; title: string; control_code: string; framework?: { name: string } } | null;
  assigned_profile?: { id: string; full_name: string } | null;
}

export interface FindingPoam {
  id: string;
  finding_id: string;
  name: string;
  description?: string | null;
  owner_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status: PoamStatus;
  created_at: string;
  created_by?: string | null;
  updated_at: string;
  profiles?: { id: string; full_name: string | null; email: string | null } | null;
}

export interface FindingMilestone {
  id: string;
  finding_id: string;
  poam_id?: string | null;
  title: string;
  description?: string | null;
  owner_id?: string | null;
  due_date?: string | null;
  completed_at?: string | null;
  status: MilestoneStatus;
  created_at: string;
  created_by?: string | null;
  updated_at: string;
  profiles?: { id: string; full_name: string | null; email: string | null } | null;
}

export interface CreateFindingInput {
  internal_control_id?: string | null;
  framework_control_id?: string | null;
  finding_type: FindingType;
  title: string;
  description?: string | null;
  status?: FindingStatus;
  identified_date?: string;
  due_date?: string | null;
  assigned_to?: string | null;
  business_unit_id?: string | null;
  remediation_plan?: string | null;
}

// Fetch all findings
export function useControlFindings() {
  return useQuery({
    queryKey: ['control-findings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('control_findings')
        .select(`
          *,
          internal_control:internal_controls(id, title, internal_control_code),
          framework_control:framework_controls(id, title, control_code, framework:control_frameworks(name)),
          assigned_profile:profiles!control_findings_assigned_to_fkey(id, full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ControlFinding[];
    },
  });
}

// Fetch findings for a specific internal control
export function useInternalControlFindings(controlId?: string) {
  return useQuery({
    queryKey: ['control-findings', 'internal', controlId],
    queryFn: async () => {
      if (!controlId) return [];

      // Self-hosted deployments often don't have stable PostgREST FK constraint names,
      // so embedded selects like profiles!some_fk(...) can 400.
      const selectClause = config.isSelfHosted()
        ? '*'
        : `
          *,
          assigned_profile:profiles!control_findings_assigned_to_fkey(id, full_name)
        `;

      const { data, error } = await supabase
        .from('control_findings')
        .select(selectClause)
        .eq('internal_control_id', controlId)
        .order('created_at', { ascending: false });

      if (error) {
        if (config.isSelfHosted()) {
          console.warn('useInternalControlFindings failed in self-hosted mode:', error.message);
          return [];
        }
        throw error;
      }

      return data as ControlFinding[];
    },
    enabled: !!controlId,
    retry: config.isSelfHosted() ? false : 3,
  });
}

// Fetch findings for a specific framework control
export function useFrameworkControlFindings(controlId?: string) {
  return useQuery({
    queryKey: ['control-findings', 'framework', controlId],
    queryFn: async () => {
      if (!controlId) return [];

      const selectClause = config.isSelfHosted()
        ? '*'
        : `
          *,
          assigned_profile:profiles!control_findings_assigned_to_fkey(id, full_name)
        `;

      const { data, error } = await supabase
        .from('control_findings')
        .select(selectClause)
        .eq('framework_control_id', controlId)
        .order('created_at', { ascending: false });

      if (error) {
        if (config.isSelfHosted()) {
          console.warn('useFrameworkControlFindings failed in self-hosted mode:', error.message);
          return [];
        }
        throw error;
      }

      return data as ControlFinding[];
    },
    enabled: !!controlId,
    retry: config.isSelfHosted() ? false : 3,
  });
}

// Fetch findings summary for dashboard
export function useFindingsSummary() {
  return useQuery({
    queryKey: ['control-findings', 'summary'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('control_findings')
          .select('id, finding_type, status');

        // Table may not exist in self-hosted - return empty summary
        if (error) {
          console.warn('control_findings query failed (table may not exist):', error.message);
          return {
            total: 0, open: 0, inProgress: 0, closed: 0, accepted: 0,
            majorDeviations: 0, minorDeviations: 0, opportunities: 0,
          };
        }

        const rows = (data ?? []) as Array<{ status: FindingStatus; finding_type: FindingType }>;

        const summary = {
          total: rows.length,
          open: rows.filter((f) => f.status === 'Open').length,
          inProgress: rows.filter((f) => f.status === 'In Progress').length,
          closed: rows.filter((f) => f.status === 'Closed').length,
          accepted: rows.filter((f) => f.status === 'Accepted').length,
          majorDeviations: rows.filter((f) => f.finding_type === 'Major Deviation' && f.status !== 'Closed').length,
          minorDeviations: rows.filter((f) => f.finding_type === 'Minor Deviation' && f.status !== 'Closed').length,
          opportunities: rows.filter((f) => f.finding_type === 'Opportunity for Improvement' && f.status !== 'Closed').length,
        };

        return summary;
      } catch (e) {
        console.warn('useFindingsSummary error:', e);
        return {
          total: 0, open: 0, inProgress: 0, closed: 0, accepted: 0,
          majorDeviations: 0, minorDeviations: 0, opportunities: 0,
        };
      }
    },
  });
}

// Create finding
export function useCreateFinding() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateFindingInput) => {
      // Remove created_by - it references profiles.id but we only have auth user id
      const { data, error } = await supabase
        .from('control_findings')
        .insert({
          ...input,
          identified_date: input.identified_date || new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (error) throw error;
      
      // Update compliance status immediately after insert (before returning)
      if (input.internal_control_id) {
        await updateInternalControlComplianceStatus(input.internal_control_id);
      }
      if (input.framework_control_id) {
        await updateFrameworkControlComplianceStatus(input.framework_control_id);
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['control-findings'] });
      queryClient.invalidateQueries({ queryKey: ['internal-controls'] });
      queryClient.invalidateQueries({ queryKey: ['framework-controls'] });
      
      toast({ title: 'Finding created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to create finding', description: error.message, variant: 'destructive' });
    },
  });
}

// Update finding
export function useUpdateFinding() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ControlFinding> & { id: string }) => {
      // Remove joined fields that shouldn't be updated
      const { internal_control, framework_control, assigned_profile, ...cleanUpdates } = updates as any;
      
      const { data, error } = await supabase
        .from('control_findings')
        .update(cleanUpdates)
        .eq('id', id)
        .select('*, internal_control_id, framework_control_id')
        .single();

      if (error) throw error;
      
      const result = data as { internal_control_id?: string | null; framework_control_id?: string | null };
      
      // Update compliance status immediately after update (before returning)
      if (result.internal_control_id) {
        await updateInternalControlComplianceStatus(result.internal_control_id);
      }
      if (result.framework_control_id) {
        await updateFrameworkControlComplianceStatus(result.framework_control_id);
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['control-findings'] });
      queryClient.invalidateQueries({ queryKey: ['internal-controls'] });
      queryClient.invalidateQueries({ queryKey: ['framework-controls'] });
      
      toast({ title: 'Finding updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update finding', description: error.message, variant: 'destructive' });
    },
  });
}

// Delete finding
export function useDeleteFinding() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, internalControlId, frameworkControlId }: { id: string; internalControlId?: string | null; frameworkControlId?: string | null }) => {
      const { error } = await supabase
        .from('control_findings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Update compliance status immediately after delete (before returning)
      if (internalControlId) {
        await updateInternalControlComplianceStatus(internalControlId);
      }
      if (frameworkControlId) {
        await updateFrameworkControlComplianceStatus(frameworkControlId);
      }
      
      return { internalControlId, frameworkControlId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['control-findings'] });
      queryClient.invalidateQueries({ queryKey: ['internal-controls'] });
      queryClient.invalidateQueries({ queryKey: ['framework-controls'] });
      
      toast({ title: 'Finding deleted' });
    },
    onError: (error) => {
      toast({ title: 'Failed to delete finding', description: error.message, variant: 'destructive' });
    },
  });
}

// ==================== POAM Hooks ====================

export function useFindingPoams(findingId?: string) {
  return useQuery({
    queryKey: ['finding-poams', findingId],
    queryFn: async () => {
      if (!findingId) return [];
      const { data, error } = await supabase
        .from('finding_poams')
        .select(`*, profiles!finding_poams_owner_id_fkey(id, full_name, email)`)
        .eq('finding_id', findingId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as FindingPoam[];
    },
    enabled: !!findingId,
  });
}

export function useCreateFindingPoam() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      finding_id: string;
      name: string;
      description?: string;
      owner_id?: string;
      start_date?: string;
      end_date?: string;
    }) => {
      const { data, error } = await supabase
        .from('finding_poams')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['finding-poams', variables.finding_id] });
      toast({ title: 'POAM created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to create POAM', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateFindingPoam() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, findingId, ...updates }: Partial<FindingPoam> & { id: string; findingId: string }) => {
      const { profiles, ...cleanUpdates } = updates as any;
      const { data, error } = await supabase
        .from('finding_poams')
        .update(cleanUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['finding-poams', variables.findingId] });
      toast({ title: 'POAM updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update POAM', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteFindingPoam() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, findingId }: { id: string; findingId: string }) => {
      const { error } = await supabase
        .from('finding_poams')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['finding-poams', variables.findingId] });
      queryClient.invalidateQueries({ queryKey: ['finding-milestones', variables.findingId] });
      toast({ title: 'POAM deleted' });
    },
    onError: (error) => {
      toast({ title: 'Failed to delete POAM', description: error.message, variant: 'destructive' });
    },
  });
}

// ==================== Milestone Hooks ====================

export function useFindingMilestones(findingId?: string) {
  return useQuery({
    queryKey: ['finding-milestones', findingId],
    queryFn: async () => {
      if (!findingId) return [];
      const { data, error } = await supabase
        .from('finding_milestones')
        .select(`*, profiles!finding_milestones_owner_id_fkey(id, full_name, email)`)
        .eq('finding_id', findingId)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data as FindingMilestone[];
    },
    enabled: !!findingId,
  });
}

export function useCreateFindingMilestone() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      finding_id: string;
      poam_id?: string;
      title: string;
      description?: string;
      owner_id?: string;
      due_date?: string;
    }) => {
      const { data, error } = await supabase
        .from('finding_milestones')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['finding-milestones', variables.finding_id] });
      toast({ title: 'Milestone created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to create milestone', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateFindingMilestone() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, findingId, ...updates }: Partial<FindingMilestone> & { id: string; findingId: string }) => {
      const { profiles, ...cleanUpdates } = updates as any;
      const { data, error } = await supabase
        .from('finding_milestones')
        .update(cleanUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['finding-milestones', variables.findingId] });
      toast({ title: 'Milestone updated' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update milestone', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteFindingMilestone() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, findingId }: { id: string; findingId: string }) => {
      const { error } = await supabase
        .from('finding_milestones')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['finding-milestones', variables.findingId] });
      toast({ title: 'Milestone deleted' });
    },
    onError: (error) => {
      toast({ title: 'Failed to delete milestone', description: error.message, variant: 'destructive' });
    },
  });
}