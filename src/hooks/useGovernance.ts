import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/integrations/database/client';
import { useToast } from '@/hooks/use-toast';

// Alias for backward compatibility
const supabase = db;

export interface CompanyProfile {
  id: string;
  legal_name: string;
  trading_name: string | null;
  registration_id: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  website_url: string | null;
  industry: string | null;
  employee_count: number | null;
  primary_timezone: string | null;
  notes: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface GovernancePerson {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  organization: string | null;
  is_internal: boolean;
  created_at: string;
  updated_at: string;
}

export interface BoardMember {
  id: string;
  governance_person_id: string;
  position_title: string;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  governance_people?: GovernancePerson;
}

export interface ExecutiveRole {
  id: string;
  key: string;
  label: string;
  governance_person_id: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  governance_people?: GovernancePerson | null;
}

export interface SecurityPosition {
  id: string;
  title: string;
  description: string | null;
  reports_to_position_id: string | null;
  requires_access_group_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SecurityPositionAssignment {
  id: string;
  security_position_id: string;
  user_id: string;
  is_primary: boolean;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  security_positions?: SecurityPosition;
}

export interface PointOfContact {
  id: string;
  type: string;
  governance_person_id: string;
  escalation_window: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  governance_people?: GovernancePerson;
}

// Company Profile hooks
export const useCompanyProfile = () => {
  return useQuery({
    queryKey: ['company-profile'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_profile')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as CompanyProfile | null;
    },
  });
};

export const useUpsertCompanyProfile = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: Partial<CompanyProfile> & { legal_name: string }) => {
      const existing = await supabase.from('company_profile').select('id').limit(1).maybeSingle();
      const existingRecord = existing.data as { id: string } | null;
      
      if (existingRecord?.id) {
        const { data, error } = await supabase
          .from('company_profile')
          .update(input)
          .eq('id', existingRecord.id)
          .select()
          .single();
        if (error) throw error;
        return data as CompanyProfile;
      } else {
        const { data, error } = await supabase
          .from('company_profile')
          .insert(input)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-profile'] });
      toast({ title: 'Company profile saved' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to save company profile', description: error.message, variant: 'destructive' });
    },
  });
};

// Governance People hooks
export const useGovernancePeople = () => {
  return useQuery({
    queryKey: ['governance-people'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('governance_people')
        .select('*')
        .order('full_name');
      if (error) throw error;
      return data as GovernancePerson[];
    },
  });
};

export const useCreateGovernancePerson = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: Omit<GovernancePerson, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('governance_people')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as GovernancePerson;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance-people'] });
      toast({ title: 'Person added' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to add person', description: error.message, variant: 'destructive' });
    },
  });
};

// Executive Roles hooks
export const useExecutiveRoles = () => {
  return useQuery({
    queryKey: ['executive-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('executive_roles')
        .select(`
          *,
          governance_people (*)
        `)
        .order('label');
      if (error) throw error;
      return data as ExecutiveRole[];
    },
  });
};

export const useUpdateExecutiveRole = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string; governance_person_id?: string | null; user_id?: string | null }) => {
      const { data, error } = await supabase
        .from('executive_roles')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['executive-roles'] });
      toast({ title: 'Executive role updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update role', description: error.message, variant: 'destructive' });
    },
  });
};

// Board Members hooks
export const useBoardMembers = () => {
  return useQuery({
    queryKey: ['board-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('board_members')
        .select(`
          *,
          governance_people (*)
        `)
        .order('position_title');
      if (error) throw error;
      return data as BoardMember[];
    },
  });
};

export const useCreateBoardMember = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: { governance_person_id: string; position_title: string; start_date?: string; notes?: string }) => {
      const { data, error } = await supabase
        .from('board_members')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-members'] });
      toast({ title: 'Board member added' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to add board member', description: error.message, variant: 'destructive' });
    },
  });
};

export const useDeleteBoardMember = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('board_members').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-members'] });
      toast({ title: 'Board member removed' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to remove board member', description: error.message, variant: 'destructive' });
    },
  });
};

// Security Positions hooks
export const useSecurityPositions = () => {
  return useQuery({
    queryKey: ['security-positions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('security_positions')
        .select('*')
        .order('title');
      if (error) throw error;
      return data as SecurityPosition[];
    },
  });
};

export const useCreateSecurityPosition = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: { title: string; description?: string; reports_to_position_id?: string; requires_access_group_id?: string }) => {
      const { data, error } = await supabase
        .from('security_positions')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-positions'] });
      toast({ title: 'Security position created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create position', description: error.message, variant: 'destructive' });
    },
  });
};

export const useDeleteSecurityPosition = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('security_positions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-positions'] });
      toast({ title: 'Security position deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete position', description: error.message, variant: 'destructive' });
    },
  });
};

export const useSecurityPositionAssignments = () => {
  return useQuery({
    queryKey: ['security-position-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('security_position_assignments')
        .select(`
          *,
          security_positions (*)
        `);
      if (error) throw error;
      return data as SecurityPositionAssignment[];
    },
  });
};

export const useCreateSecurityPositionAssignment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: { security_position_id: string; user_id: string; is_primary?: boolean; start_date?: string; notes?: string }) => {
      const { data, error } = await supabase
        .from('security_position_assignments')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-position-assignments'] });
      toast({ title: 'User assigned to position' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to assign user', description: error.message, variant: 'destructive' });
    },
  });
};

export const useDeleteSecurityPositionAssignment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('security_position_assignments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-position-assignments'] });
      toast({ title: 'Assignment removed' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to remove assignment', description: error.message, variant: 'destructive' });
    },
  });
};

export const useAssignSecurityPosition = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: { security_position_id: string; user_id: string; is_primary?: boolean }) => {
      const { data, error } = await supabase
        .from('security_position_assignments')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-position-assignments'] });
      toast({ title: 'Position assigned' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to assign position', description: error.message, variant: 'destructive' });
    },
  });
};

// Points of Contact hooks
export const usePointsOfContact = () => {
  return useQuery({
    queryKey: ['points-of-contact'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('points_of_contact')
        .select(`
          *,
          governance_people (*)
        `)
        .order('type');
      if (error) throw error;
      return data as PointOfContact[];
    },
  });
};

export const useCreatePointOfContact = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: { type: string; governance_person_id: string; escalation_window?: string; notes?: string }) => {
      const { data, error } = await supabase
        .from('points_of_contact')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['points-of-contact'] });
      toast({ title: 'Contact added' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to add contact', description: error.message, variant: 'destructive' });
    },
  });
};

export const useDeletePointOfContact = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('points_of_contact').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['points-of-contact'] });
      toast({ title: 'Contact removed' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to remove contact', description: error.message, variant: 'destructive' });
    },
  });
};
