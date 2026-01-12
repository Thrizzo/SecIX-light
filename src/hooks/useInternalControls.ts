import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/database/client';
import { useToast } from '@/hooks/use-toast';

export type ControlComplianceStatus = 'compliant' | 'minor_deviation' | 'major_deviation' | 'not_assessed';

export const COMPLIANCE_STATUSES: Array<{ value: ControlComplianceStatus; label: string; description: string }> = [
  { value: 'compliant', label: 'Compliant', description: 'Control is fully compliant with no findings' },
  { value: 'minor_deviation', label: 'Minor Deviation', description: 'Control has minor deviations but is acceptable for risk mitigation' },
  { value: 'major_deviation', label: 'Major Deviation', description: 'Control has major deviations and cannot be used for risk mitigation' },
  { value: 'not_assessed', label: 'Not Assessed', description: 'Control compliance has not been assessed' },
];

// Helper: Check if a control is in a usable compliance state for risk mitigation
export function isControlUsableForRisk(status: ControlComplianceStatus | null | undefined): boolean {
  return status === 'compliant' || status === 'minor_deviation';
}

export interface InternalControl {
  id: string;
  internal_control_code: string;
  title: string;
  description: string | null;
  control_type: string | null;
  automation_level: string | null;
  frequency: string | null;
  status: string;
  owner_id: string | null;
  business_unit_id: string | null;
  system_scope: string | null;
  security_function: string | null;
  legacy_control_id: string | null;
  effective_date: string | null;
  review_date: string | null;
  compliance_status: ControlComplianceStatus | null;
  compliance_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateInternalControlInput {
  internal_control_code: string;
  title: string;
  description?: string;
  control_type?: string;
  automation_level?: string;
  frequency?: string;
  status?: string;
  owner_id?: string;
  business_unit_id?: string;
  system_scope?: string;
  security_function?: string;
  legacy_control_id?: string;
  source_framework_control_ids?: string[];
  effective_date?: string;
  review_date?: string;
  compliance_status?: ControlComplianceStatus;
  compliance_notes?: string;
}

export const CONTROL_TYPES = [
  'Preventive',
  'Detective',
  'Corrective',
  'Deterrent',
  'Compensating',
] as const;

export const AUTOMATION_LEVELS = [
  'Manual',
  'Semi-Automated',
  'Fully Automated',
] as const;

export const CONTROL_FREQUENCIES = [
  'Continuous',
  'Daily',
  'Weekly',
  'Monthly',
  'Quarterly',
  'Annual',
  'On-Demand',
] as const;

export const CONTROL_STATUSES = [
  'Draft',
  'Active',
  'Under Review',
  'Deprecated',
] as const;

export function useInternalControls(businessUnitId?: string) {
  return useQuery({
    queryKey: ['internal-controls', businessUnitId],
    queryFn: async () => {
      try {
        let query = supabase
          .from<InternalControl>('internal_controls')
          .select(`
            *,
            owner:profiles!internal_controls_owner_id_fkey(id, full_name, email),
            business_unit:business_units!internal_controls_business_unit_id_fkey(id, name)
          `)
          .order('internal_control_code');

        if (businessUnitId) {
          query = query.eq('business_unit_id', businessUnitId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as InternalControl[];
      } catch (err: any) {
        const msg = err?.message ? String(err.message) : String(err);
        // Self-hosted setups may not have the full schema yet; don't crash the UI.
        if (msg.includes('does not exist')) {
          console.warn('[useInternalControls] Table missing; returning empty list:', msg);
          return [] as InternalControl[];
        }
        throw err;
      }
    },
  });
}

export function useInternalControl(id?: string) {
  return useQuery({
    queryKey: ['internal-control', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from<InternalControl>('internal_controls')
        .select(`
          *,
          owner:profiles!internal_controls_owner_id_fkey(id, full_name, email),
          business_unit:business_units!internal_controls_business_unit_id_fkey(id, name),
          framework_mappings:internal_control_framework_map(
            id,
            mapping_type,
            notes,
            framework_control:framework_controls(
              id,
              control_code,
              title,
              framework:control_frameworks(id, name)
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as InternalControl;
    },
    enabled: !!id,
  });
}

export function useCreateInternalControl() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateInternalControlInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get the profile ID and business_unit_id for the current user
      let profileId: string | null = null;
      let businessUnitId: string | null = input.business_unit_id || null;
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, business_unit_id')
          .eq('user_id', user.id)
          .maybeSingle();
        const profileData = profile as { id: string; business_unit_id: string | null } | null;
        profileId = profileData?.id || null;
        if (!businessUnitId) {
          businessUnitId = profileData?.business_unit_id || null;
        }
      }
      
      // Clean the input - remove undefined/empty values for UUID fields
      // and ensure required fields have proper defaults
      const cleanInput: Record<string, unknown> = {
        internal_control_code: input.internal_control_code,
        title: input.title,
        status: input.status || 'Draft',
        created_by: profileId,
        business_unit_id: businessUnitId,
      };

      // Only add optional fields if they have valid values
      if (input.description) cleanInput.description = input.description;
      if (input.control_type) cleanInput.control_type = input.control_type;
      if (input.automation_level) cleanInput.automation_level = input.automation_level;
      if (input.frequency) cleanInput.frequency = input.frequency;
      if (input.owner_id) cleanInput.owner_id = input.owner_id;
      if (input.system_scope) cleanInput.system_scope = input.system_scope;
      if (input.security_function) cleanInput.security_function = input.security_function;
      if (input.effective_date) cleanInput.effective_date = input.effective_date;
      if (input.review_date) cleanInput.review_date = input.review_date;
      // legacy_control_id is UUID type - only include if valid UUID
      if (input.legacy_control_id && input.legacy_control_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        cleanInput.legacy_control_id = input.legacy_control_id;
      }
      // Note: source_framework_control_ids may not exist in all deployments, skip it
      
      const { data, error } = await supabase
        .from('internal_controls')
        .insert(cleanInput)
        .select()
        .single();

      if (error) throw error;
      return data as InternalControl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal-controls'] });
      toast({ title: 'Internal control created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to create control', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateInternalControl() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<InternalControl> & { id: string }) => {
      const { data, error } = await supabase
        .from('internal_controls')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as InternalControl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal-controls'] });
      queryClient.invalidateQueries({ queryKey: ['internal-control'] });
      toast({ title: 'Control updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update control', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteInternalControl() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('internal_controls')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal-controls'] });
      toast({ title: 'Control deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to delete control', description: error.message, variant: 'destructive' });
    },
  });
}
