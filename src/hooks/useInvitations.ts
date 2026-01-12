import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/database/client';
import { useToast } from '@/hooks/use-toast';

export interface Invitation {
  id: string;
  token: string;
  email: string | null;
  role: 'admin' | 'user' | 'auditor';
  expires_at: string;
  used_at: string | null;
  used_by: string | null;
  created_by: string | null;
  created_at: string;
  notes: string | null;
}

export function useInvitations() {
  return useQuery({
    queryKey: ['invitations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Invitation[];
    },
  });
}

export function useInvitationByToken(token: string) {
  return useQuery({
    queryKey: ['invitation', token],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('token', token)
        .maybeSingle();

      if (error) throw error;
      return data as Invitation | null;
    },
    enabled: !!token,
  });
}

export function useCreateInvitation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      email?: string;
      notes?: string;
      expiryDays?: number;
    }) => {
      const expiryDays = params.expiryDays || 3;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiryDays);

      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('invitations')
        .insert({
          email: params.email || null,
          notes: params.notes || null,
          role: 'user' as const,
          expires_at: expiresAt.toISOString(),
          created_by: userData.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Invitation;
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['invitations'] });
      toast({
        title: 'Invitation created',
        description: 'The invitation link has been generated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create invitation',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteInvitation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['invitations'] });
      toast({
        title: 'Invitation deleted',
        description: 'The invitation has been revoked.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete invitation',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useMarkInvitationUsed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ token, userId }: { token: string; userId: string }) => {
      const { error } = await supabase
        .from('invitations')
        .update({
          used_at: new Date().toISOString(),
          used_by: userId,
        })
        .eq('token', token);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['invitations'] });
    },
  });
}
