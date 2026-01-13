import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/integrations/database/client';
import { useToast } from '@/hooks/use-toast';

// Alias for backward compatibility
const supabase = db;

// Cache times for static data (5 minutes)
const STATIC_STALE_TIME = 5 * 60 * 1000;

export interface ControlFramework {
  id: string;
  name: string;
  version: string | null;
  publisher: string | null;
  description: string | null;
  external_id: string | null;
  default_id_prefix: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type FrameworkControlComplianceStatus = 'compliant' | 'minor_deviation' | 'major_deviation' | 'not_assessed';

export interface FrameworkControl {
  id: string;
  framework_id: string;
  control_code: string | null;
  title: string;
  description: string | null;
  domain: string | null;
  subcategory: string | null;
  control_type: string | null;
  guidance: string | null;
  implementation_guidance: string | null;
  reference_links: string | null;
  security_function: string | null;
  compliance_status: FrameworkControlComplianceStatus;
  compliance_notes: string | null;
  source_hash: string | null;
  created_at: string;
  updated_at: string;
}

// Helper to check if a framework control can be used for risk mitigation
export const isFrameworkControlCompliant = (status: FrameworkControlComplianceStatus | null | undefined): boolean => {
  return status === 'compliant' || status === 'minor_deviation';
};

export interface CreateFrameworkInput {
  name: string;
  version?: string;
  publisher?: string;
  description?: string;
  external_id?: string;
  default_id_prefix?: string;
}

export interface CreateFrameworkControlInput {
  framework_id: string;
  control_code?: string;
  title: string;
  description?: string;
  domain?: string;
  subcategory?: string;
  control_type?: string;
  guidance?: string;
  implementation_guidance?: string;
  reference_links?: string;
  security_function?: string;
  source_hash?: string;
}

export const SECURITY_FUNCTIONS = [
  'Govern',
  'Identify',
  'Protect',
  'Detect',
  'Respond',
  'Recover',
] as const;

export type SecurityFunction = typeof SECURITY_FUNCTIONS[number];

export function useControlFrameworks() {
  return useQuery({
    queryKey: ['control-frameworks'],
    staleTime: STATIC_STALE_TIME,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('control_frameworks')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as ControlFramework[];
    },
  });
}

export function useFrameworkControls(frameworkId?: string) {
  return useQuery({
    queryKey: ['framework-controls', frameworkId],
    staleTime: STATIC_STALE_TIME,
    queryFn: async () => {
      if (!frameworkId) return [];
      
      const { data, error } = await supabase
        .from('framework_controls')
        .select('*')
        .eq('framework_id', frameworkId)
        .order('control_code');

      if (error) throw error;
      return data as FrameworkControl[];
    },
    enabled: !!frameworkId,
  });
}

export function useCreateFramework() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateFrameworkInput) => {
      const { data: { user } } = await supabase.auth.getUser();

      // Get profile id for the current user (created_by references profiles.id)
      let profileId: string | null = null;
      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        const profileData = profile as { id: string } | null;
        profileId = profileData?.id ?? null;
      }

      // If a framework with the same (name, version) already exists, reuse it.
      // This avoids unique-constraint failures when importing the same framework twice.
      const version = input.version ?? null;
      let existingQuery = supabase
        .from('control_frameworks')
        .select('*')
        .eq('name', input.name);

      existingQuery = version === null ? existingQuery.is('version', null) : existingQuery.eq('version', version);

      const { data: existing, error: existingError } = await existingQuery.maybeSingle();
      if (existingError) throw existingError;

      if (existing) {
        toast({
          title: 'Framework already exists',
          description: 'Using the existing framework and importing controls into it.',
        });
        return existing as ControlFramework;
      }

      const { data, error } = await supabase
        .from('control_frameworks')
        .insert({
          ...input,
          created_by: profileId,
        })
        .select()
        .single();

      if (error) throw error;

      toast({ title: 'Framework created successfully' });
      return data as ControlFramework;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['control-frameworks'] });
    },
    onError: (error) => {
      toast({ title: 'Failed to create framework', description: error.message, variant: 'destructive' });
    },
  });
}

export function useCreateFrameworkControls() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (controls: CreateFrameworkControlInput[]) => {
      // Normalize + de-duplicate by (framework_id, control_code) to avoid violating the unique constraint
      const seen = new Set<string>();
      const normalized: Array<CreateFrameworkControlInput & { control_code: string | null }> = [];

      for (const c of controls) {
        const controlCode = (c.control_code ?? '').trim();
        const normalizedRow = {
          ...c,
          control_code: controlCode.length ? controlCode : null,
        };

        if (normalizedRow.control_code) {
          const k = `${normalizedRow.framework_id}::${normalizedRow.control_code}`;
          if (seen.has(k)) continue;
          seen.add(k);
        }

        normalized.push(normalizedRow);
      }

      const { data, error } = await supabase
        .from('framework_controls')
        .upsert(normalized as any, {
          onConflict: 'framework_id,control_code',
        })
        .select();

      if (error) throw error;
      return (data ?? []) as FrameworkControl[];
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['framework-controls'] });

      const attempted = variables.length;
      const imported = data.length;
      const skipped = Math.max(0, attempted - imported);

      toast({
        title: `Imported ${imported} controls`,
        description: skipped ? `${skipped} duplicates were skipped.` : undefined,
      });
    },
    onError: (error) => {
      toast({ title: 'Failed to import controls', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteFramework() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('control_frameworks')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['control-frameworks'] });
      toast({ title: 'Framework deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to delete framework', description: error.message, variant: 'destructive' });
    },
  });
}

export interface FrameworkControlWithFramework extends FrameworkControl {
  framework?: {
    id: string;
    name: string;
    version: string | null;
  };
}

export function useFrameworkControl(controlId?: string) {
  return useQuery({
    queryKey: ['framework-control', controlId],
    queryFn: async () => {
      if (!controlId) return null;
      
      const { data, error } = await supabase
        .from('framework_controls')
        .select(`
          *,
          framework:control_frameworks(id, name, version)
        `)
        .eq('id', controlId)
        .single();

      if (error) throw error;
      return data as FrameworkControlWithFramework;
    },
    enabled: !!controlId,
  });
}

export function useUpdateFrameworkControl() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FrameworkControl> & { id: string }) => {
      const { data, error } = await supabase
        .from('framework_controls')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as FrameworkControl;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['framework-controls'] });
      queryClient.invalidateQueries({ queryKey: ['framework-control', data.id] });
      toast({ title: 'Control updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update control', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteFrameworkControl() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('framework_controls')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['framework-controls'] });
      toast({ title: 'Control deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to delete control', description: error.message, variant: 'destructive' });
    },
  });
}

export function useFrameworkControlMappingsToInternal(controlId?: string) {
  return useQuery({
    queryKey: ['framework-control-internal-mappings', controlId],
    queryFn: async () => {
      if (!controlId) return [];
      
      const { data, error } = await supabase
        .from('internal_control_framework_map')
        .select(`
          *,
          internal_control:internal_controls(id, internal_control_code, title, status)
        `)
        .eq('framework_control_id', controlId);

      if (error) throw error;
      return data;
    },
    enabled: !!controlId,
  });
}

export function useSetActiveFramework() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (frameworkId: string | null) => {
      if (frameworkId === null) {
        // Deactivate all frameworks
        const { error } = await supabase
          .from('control_frameworks')
          .update({ is_active: false })
          .eq('is_active', true);
        if (error) throw error;
        return null;
      }

      const { data, error } = await supabase
        .from('control_frameworks')
        .update({ is_active: true })
        .eq('id', frameworkId)
        .select()
        .single();

      if (error) throw error;
      return data as ControlFramework;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['control-frameworks'] });
      queryClient.invalidateQueries({ queryKey: ['active-framework'] });
      toast({ 
        title: data ? `${data.name} set as active framework` : 'Framework deactivated',
      });
    },
    onError: (error) => {
      toast({ title: 'Failed to set active framework', description: error.message, variant: 'destructive' });
    },
  });
}

export function useActiveFramework() {
  return useQuery({
    queryKey: ['active-framework'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('control_frameworks')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data as ControlFramework | null;
    },
  });
}

export function useActiveFrameworkControls() {
  const { data: activeFramework } = useActiveFramework();

  return useQuery({
    queryKey: ['active-framework-controls', activeFramework?.id],
    queryFn: async () => {
      if (!activeFramework) return [];

      const { data, error } = await supabase
        .from('framework_controls')
        .select('*')
        .eq('framework_id', activeFramework.id)
        .order('control_code');

      if (error) throw error;
      return data as FrameworkControl[];
    },
    enabled: !!activeFramework,
  });
}
