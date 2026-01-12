import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/database/client';
import { useToast } from '@/hooks/use-toast';

export interface EvidenceItem {
  id: string;
  name: string;
  description: string | null;
  evidence_type: string | null;
  file_name: string | null;
  file_mime: string | null;
  file_size_bytes: number | null;
  storage_key: string | null;
  tags: string[] | null;
  evidence_start_date: string | null;
  evidence_end_date: string | null;
  expires_at: string | null;
  owner_id: string | null;
  business_unit_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EvidenceControlLink {
  id: string;
  evidence_id: string;
  internal_control_id: string | null;
  framework_control_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  evidence_item?: EvidenceItem;
}

// Get evidence items linked to an internal control
export const useControlEvidence = (controlId?: string) => {
  return useQuery({
    queryKey: ['control-evidence', controlId],
    enabled: !!controlId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evidence_control_links')
        .select(`
          *,
          evidence_item:evidence_items (*)
        `)
        .eq('internal_control_id', controlId!);
      if (error) throw error;
      return data as (EvidenceControlLink & { evidence_item: EvidenceItem })[];
    },
  });
};

// Get evidence items linked to a framework control
export const useFrameworkControlEvidence = (controlId?: string) => {
  return useQuery({
    queryKey: ['framework-control-evidence', controlId],
    enabled: !!controlId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evidence_control_links')
        .select(`
          *,
          evidence_item:evidence_items (*)
        `)
        .eq('framework_control_id', controlId!);
      if (error) throw error;
      return data as (EvidenceControlLink & { evidence_item: EvidenceItem })[];
    },
  });
};

// Upload evidence and link to control
export const useUploadControlEvidence = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      file: File;
      name: string;
      description?: string;
      evidenceType?: string;
      internalControlId?: string;
      frameworkControlId?: string;
      businessUnitId?: string;
      userId: string;
    }) => {
      // Upload file to storage
      const fileName = `evidence/${input.userId}/${Date.now()}-${input.file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('evidence')
        .upload(fileName, input.file);
      
      if (uploadError) throw uploadError;

      // Create evidence item
      const { data: evidenceItem, error: evidenceError } = await supabase
        .from('evidence_items')
        .insert({
          name: input.name,
          description: input.description || null,
          evidence_type: input.evidenceType || 'Document',
          file_name: input.file.name,
          file_mime: input.file.type,
          file_size_bytes: input.file.size,
          storage_key: fileName,
          business_unit_id: input.businessUnitId || null,
          created_by: input.userId,
          owner_id: input.userId,
        })
        .select()
        .single();

      if (evidenceError) throw evidenceError;

      // Create control link
      const { data: link, error: linkError } = await supabase
        .from('evidence_control_links')
        .insert({
          evidence_id: (evidenceItem as { id: string }).id,
          internal_control_id: input.internalControlId || null,
          framework_control_id: input.frameworkControlId || null,
          created_by: input.userId,
        })
        .select()
        .single();

      if (linkError) throw linkError;

      return { evidenceItem, link };
    },
    onSuccess: (_, variables) => {
      if (variables.internalControlId) {
        queryClient.invalidateQueries({ queryKey: ['control-evidence', variables.internalControlId] });
      }
      if (variables.frameworkControlId) {
        queryClient.invalidateQueries({ queryKey: ['framework-control-evidence', variables.frameworkControlId] });
      }
      toast({ title: 'Evidence uploaded successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to upload evidence', description: error.message, variant: 'destructive' });
    },
  });
};

// Delete evidence and its link
export const useDeleteControlEvidence = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      linkId, 
      evidenceId, 
      storageKey,
      internalControlId,
      frameworkControlId 
    }: { 
      linkId: string; 
      evidenceId: string; 
      storageKey: string | null;
      internalControlId?: string;
      frameworkControlId?: string;
    }) => {
      // Delete storage file if exists
      if (storageKey) {
        await supabase.storage.from('evidence').remove([storageKey]);
      }
      
      // Delete link first
      const { error: linkError } = await supabase
        .from('evidence_control_links')
        .delete()
        .eq('id', linkId);
      if (linkError) throw linkError;

      // Delete evidence item
      const { error: evidenceError } = await supabase
        .from('evidence_items')
        .delete()
        .eq('id', evidenceId);
      if (evidenceError) throw evidenceError;
    },
    onSuccess: (_, variables) => {
      if (variables.internalControlId) {
        queryClient.invalidateQueries({ queryKey: ['control-evidence', variables.internalControlId] });
      }
      if (variables.frameworkControlId) {
        queryClient.invalidateQueries({ queryKey: ['framework-control-evidence', variables.frameworkControlId] });
      }
      toast({ title: 'Evidence deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete evidence', description: error.message, variant: 'destructive' });
    },
  });
};

// Get download URL for evidence
export const getEvidenceDownloadUrl = async (storageKey: string) => {
  const { data, error } = await supabase.storage
    .from('evidence')
    .createSignedUrl(storageKey, 3600); // 1 hour expiry
  if (error) throw error;
  return data.signedUrl;
};

// Get download URL for vendor documents
export const getVendorDocumentDownloadUrl = async (storageKey: string) => {
  const { data, error } = await supabase.storage
    .from('vendor-documents')
    .createSignedUrl(storageKey, 3600); // 1 hour expiry
  if (error) throw error;
  return data.signedUrl;
};
