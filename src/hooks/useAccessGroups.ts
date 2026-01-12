import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/database/client';
import { useToast } from '@/hooks/use-toast';

export interface AccessGroup {
  id: string;
  name: string;
  description: string | null;
  permissions: Record<string, boolean>;
  created_at: string;
  updated_at: string;
}

export interface UserAccessGroup {
  id: string;
  user_id: string;
  access_group_id: string;
  created_at: string;
  access_groups?: AccessGroup;
}

export const useAccessGroups = () => {
  return useQuery({
    queryKey: ['access-groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('access_groups')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as AccessGroup[];
    },
  });
};

export const useUserAccessGroups = (userId?: string) => {
  return useQuery({
    queryKey: ['user-access-groups', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_access_groups')
        .select(`
          *,
          access_groups (*)
        `)
        .eq('user_id', userId!);

      if (error) throw error;
      return data as UserAccessGroup[];
    },
  });
};

export const useAllUserAccessGroups = () => {
  return useQuery({
    queryKey: ['all-user-access-groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_access_groups')
        .select(`
          *,
          access_groups (*)
        `);

      if (error) throw error;
      return data as UserAccessGroup[];
    },
  });
};

export const useAddUserToAccessGroup = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, accessGroupId }: { userId: string; accessGroupId: string }) => {
      const { data, error } = await supabase
        .from('user_access_groups')
        .insert({ user_id: userId, access_group_id: accessGroupId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-access-groups', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['all-user-access-groups'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast({ title: 'User added to access group' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to add user to group', description: error.message, variant: 'destructive' });
    },
  });
};

export const useRemoveUserFromAccessGroup = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, accessGroupId }: { userId: string; accessGroupId: string }) => {
      const { error } = await supabase
        .from('user_access_groups')
        .delete()
        .eq('user_id', userId)
        .eq('access_group_id', accessGroupId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-access-groups', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['all-user-access-groups'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast({ title: 'User removed from access group' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to remove user from group', description: error.message, variant: 'destructive' });
    },
  });
};

export const useCreateAccessGroup = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: { name: string; description?: string; permissions?: Record<string, boolean> }) => {
      const { data, error } = await supabase
        .from('access_groups')
        .insert({
          name: input.name,
          description: input.description || null,
          permissions: input.permissions || {},
        })
        .select()
        .single();

      if (error) throw error;
      return data as AccessGroup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-groups'] });
      toast({ title: 'Access group created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create access group', description: error.message, variant: 'destructive' });
    },
  });
};

export const useUpdateAccessGroup = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string; name?: string; description?: string; permissions?: Record<string, boolean> }) => {
      const { data, error } = await supabase
        .from('access_groups')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as AccessGroup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-groups'] });
      toast({ title: 'Access group updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update access group', description: error.message, variant: 'destructive' });
    },
  });
};

export const useDeleteAccessGroup = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('access_groups')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-groups'] });
      toast({ title: 'Access group deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete access group', description: error.message, variant: 'destructive' });
    },
  });
};
