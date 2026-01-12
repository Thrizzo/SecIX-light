import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/database/client';
import { useToast } from '@/hooks/use-toast';

export interface ControlAssetLink {
  id: string;
  internal_control_id: string;
  primary_asset_id: string | null;
  secondary_asset_id: string | null;
  link_type: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ControlAssetLinkWithDetails extends ControlAssetLink {
  primary_asset?: {
    id: string;
    asset_id: string;
    name: string;
    asset_kind: string;
  } | null;
  secondary_asset?: {
    id: string;
    asset_id: string;
    name: string;
    secondary_type: string;
  } | null;
}

export function useControlAssetLinks(internalControlId?: string) {
  return useQuery({
    queryKey: ['control-asset-links', internalControlId],
    queryFn: async () => {
      if (!internalControlId) return [];
      
      const { data, error } = await supabase
        .from('internal_control_asset_links')
        .select(`
          *,
          primary_asset:primary_assets(id, asset_id, name, asset_kind),
          secondary_asset:secondary_assets(id, asset_id, name, secondary_type)
        `)
        .eq('internal_control_id', internalControlId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ControlAssetLinkWithDetails[];
    },
    enabled: !!internalControlId,
  });
}

export function useCreateControlAssetLink() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      internal_control_id: string;
      primary_asset_id?: string;
      secondary_asset_id?: string;
      link_type?: string;
      notes?: string;
    }) => {
      // Get profile ID for created_by
      const { data: { user } } = await supabase.auth.getUser();
      let profileId: string | null = null;
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        profileId = (profile as { id: string } | null)?.id || null;
      }

      const { data, error } = await supabase
        .from('internal_control_asset_links')
        .insert({
          internal_control_id: input.internal_control_id,
          primary_asset_id: input.primary_asset_id || null,
          secondary_asset_id: input.secondary_asset_id || null,
          link_type: input.link_type || 'IN_SCOPE',
          notes: input.notes || null,
          created_by: profileId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['control-asset-links', variables.internal_control_id] });
      queryClient.invalidateQueries({ queryKey: ['internal-control', variables.internal_control_id] });
      toast({ title: 'Asset linked successfully' });
    },
    onError: (error: Error) => {
      if (error.message.includes('unique')) {
        toast({ title: 'Asset already linked', description: 'This asset is already linked to the control.', variant: 'destructive' });
      } else {
        toast({ title: 'Failed to link asset', description: error.message, variant: 'destructive' });
      }
    },
  });
}

export function useDeleteControlAssetLink() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, internalControlId }: { id: string; internalControlId: string }) => {
      const { error } = await supabase
        .from('internal_control_asset_links')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { internalControlId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['control-asset-links', result.internalControlId] });
      queryClient.invalidateQueries({ queryKey: ['internal-control', result.internalControlId] });
      toast({ title: 'Asset unlinked successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to unlink asset', description: error.message, variant: 'destructive' });
    },
  });
}
