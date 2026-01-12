import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/database/client';
import { useToast } from '@/hooks/use-toast';

export interface UserProfile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  department: string | null;
  job_title: string | null;
  avatar_url: string | null;
  business_unit_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
}

export interface UserProfileWithDetails extends UserProfile {
  business_units?: {
    id: string;
    name: string;
    is_security_org: boolean;
  } | null;
  role?: 'admin' | 'user' | 'auditor';
}

export const useProfiles = () => {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      // Fetch profiles with business units (only active users)
      const { data: profiles, error: profilesError } = await supabase
        .from<UserProfile & { business_units?: { id: string; name: string; is_security_org: boolean } | null }>('profiles')
        .select(`
          *,
          business_units (id, name, is_security_org)
        `)
        .eq('is_active', true)
        .order('full_name');

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: roles, error: rolesError } = await supabase
        .from<{ user_id: string; role: 'admin' | 'user' | 'auditor' }>('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Create a map of user_id -> role
      const roleMap = new Map<string, 'admin' | 'user' | 'auditor'>();
      (roles || []).forEach(r => roleMap.set(r.user_id, r.role));

      // Merge profiles with their roles
      return (profiles || []).map(profile => ({
        ...profile,
        role: roleMap.get(profile.user_id) || 'user',
      })) as UserProfileWithDetails[];
    },
  });
};

export const useProfile = (id?: string) => {
  return useQuery({
    queryKey: ['profile', id],
    enabled: !!id,
    queryFn: async () => {
      const { data: profile, error: profileError } = await supabase
        .from<UserProfile & { business_units?: { id: string; name: string; is_security_org: boolean } | null }>('profiles')
        .select(`
          *,
          business_units (id, name, is_security_org)
        `)
        .eq('id', id!)
        .single();

      if (profileError) throw profileError;
      if (!profile) throw new Error('Profile not found');

      // Fetch role for this user
      const { data: roleData } = await supabase
        .from<{ role: 'admin' | 'user' | 'auditor' }>('user_roles')
        .select('role')
        .eq('user_id', profile.user_id)
        .maybeSingle();

      return {
        ...profile,
        role: roleData?.role || 'user',
      } as UserProfileWithDetails;
    },
  });
};

export const useCurrentUserProfile = () => {
  return useQuery({
    queryKey: ['current-user-profile'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;

      const { data: profile, error: profileError } = await supabase
        .from<UserProfile & { business_units?: { id: string; name: string; is_security_org: boolean } | null }>('profiles')
        .select(`
          *,
          business_units (id, name, is_security_org)
        `)
        .eq('user_id', userData.user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) return null;

      // Fetch role for this user
      const { data: roleData } = await supabase
        .from<{ role: 'admin' | 'user' | 'auditor' }>('user_roles')
        .select('role')
        .eq('user_id', userData.user.id)
        .maybeSingle();

      return {
        ...profile,
        role: roleData?.role || 'user',
      } as UserProfileWithDetails;
    },
  });
};

export interface UpdateProfileInput {
  full_name?: string;
  department?: string;
  job_title?: string;
  business_unit_id?: string;
  expires_at?: string | null;
}

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & UpdateProfileInput) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as UserProfile;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['profile', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['current-user-profile'] });
      toast({ title: 'Profile Updated', description: 'User profile has been updated successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update profile', description: error.message, variant: 'destructive' });
    },
  });
};

export const useUpdateUserRole = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'user' | 'auditor' }) => {
      // First delete existing roles for this user
      await supabase.from('user_roles').delete().eq('user_id', userId);

      // Then insert the new role
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['current-user-profile'] });
      toast({ title: 'Role Updated', description: 'User role has been updated successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update role', description: error.message, variant: 'destructive' });
    },
  });
};

export const useToggleUserActive = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ is_active })
        .eq('id', id)
        .select();

      if (error) throw error;
      return data?.[0] ?? { id, is_active };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['profile', variables.id] });
      toast({ 
        title: variables.is_active ? 'User Enabled' : 'User Disabled', 
        description: `User has been ${variables.is_active ? 'enabled' : 'disabled'} successfully.` 
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update user status', description: error.message, variant: 'destructive' });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, user_id }: { id: string; user_id: string }) => {
      // We cannot reliably delete an authentication user from the client.
      // Treat "Delete" as "Deactivate": disable the profile and remove app roles.

      const { error: roleError } = await supabase.from('user_roles').delete().eq('user_id', user_id);
      if (roleError) {
        // Not fatal for deactivation, but surface for troubleshooting.
        console.error('Failed to delete user role:', roleError);
      }

      const { data, error } = await supabase
        .from('profiles')
        .update({ is_active: false })
        .eq('id', id)
        .select('id, is_active');

      if (error) throw error;
      
      // Return the first result or indicate success even if no row returned
      const profile = data?.[0] ?? { id, is_active: false };
      return { action: 'deactivated' as const, profile };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['current-user-profile'] });
      toast({
        title: 'User Deactivated',
        description: 'The user account has been disabled and can no longer access the app.',
      });
    },
    onError: (error: Error) => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast({ title: 'Failed to deactivate user', description: error.message, variant: 'destructive' });
    },
  });
};

export interface CreateProfileInput {
  full_name: string;
  email: string;
  department?: string;
  job_title?: string;
  business_unit_id?: string;
  role?: 'admin' | 'user' | 'auditor';
  expires_at?: string;
}

export const useCreateProfile = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateProfileInput) => {
      // Generate a placeholder user_id for manual profiles (not linked to auth.users)
      const placeholderUserId = crypto.randomUUID();
      
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          user_id: placeholderUserId,
          email: input.email,
          full_name: input.full_name,
          department: input.department || null,
          job_title: input.job_title || null,
          business_unit_id: input.business_unit_id || null,
          is_active: true,
          expires_at: input.expires_at || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Add role if specified
      if (input.role) {
        await supabase.from('user_roles').insert({
          user_id: placeholderUserId,
          role: input.role,
        });
      }

      return data as UserProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast({ title: 'User Added', description: 'New user has been added successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to add user', description: error.message, variant: 'destructive' });
    },
  });
};
