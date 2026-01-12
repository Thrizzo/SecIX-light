import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/integrations/database/client';
import { useToast } from '@/hooks/use-toast';

// Alias for backward compatibility
const supabase = db;

export interface Vendor {
  id: string;
  business_unit_id: string;
  name: string;
  legal_name: string | null;
  website_url: string | null;
  trust_center_url: string | null;
  service_description: string | null;
  status: 'active' | 'onboarding' | 'inactive';
  contract_owner_user_id: string;
  notes: string | null;
  next_review_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  business_units?: {
    id: string;
    name: string;
  };
}

export interface VendorDocument {
  id: string;
  vendor_id: string;
  business_unit_id: string;
  doc_type: string;
  title: string | null;
  file_name: string;
  mime_type: string | null;
  storage_key: string;
  uploaded_by_user_id: string | null;
  uploaded_at: string;
  notes: string | null;
}

export interface RiskVendor {
  id: string;
  risk_id: string;
  vendor_id: string;
  created_by: string | null;
  created_at: string;
  vendors?: Vendor;
}

export const useVendors = () => {
  return useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select(`
          *,
          business_units (id, name)
        `)
        .order('name');
      if (error) throw error;
      return data as Vendor[];
    },
  });
};

export const useVendor = (id?: string) => {
  return useQuery({
    queryKey: ['vendor', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select(`
          *,
          business_units (id, name)
        `)
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as Vendor;
    },
  });
};

export const useCreateVendor = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      name: string;
      legal_name?: string;
      website_url?: string;
      trust_center_url?: string;
      service_description?: string;
      status?: 'active' | 'onboarding' | 'inactive';
      contract_owner_user_id: string;
      business_unit_id: string;
      created_by: string;
      notes?: string;
      next_review_at?: string;
    }) => {
      const { data, error } = await supabase
        .from('vendors')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as Vendor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast({ title: 'Vendor created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create vendor', description: error.message, variant: 'destructive' });
    },
  });
};

export const useUpdateVendor = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Partial<Vendor>) => {
      const { data, error } = await supabase
        .from('vendors')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', variables.id] });
      toast({ title: 'Vendor updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update vendor', description: error.message, variant: 'destructive' });
    },
  });
};

export const useDeleteVendor = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vendors').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast({ title: 'Vendor deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete vendor', description: error.message, variant: 'destructive' });
    },
  });
};

// Vendor Documents
export const useVendorDocuments = (vendorId?: string) => {
  return useQuery({
    queryKey: ['vendor-documents', vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_documents')
        .select('*')
        .eq('vendor_id', vendorId!)
        .order('uploaded_at', { ascending: false });
      if (error) throw error;
      return data as VendorDocument[];
    },
  });
};

export const useUploadVendorDocument = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      vendorId: string;
      businessUnitId: string;
      docType: string;
      file: File;
      title?: string;
      notes?: string;
      userId: string;
    }) => {
      // Upload file to storage
      const fileName = `${input.vendorId}/${Date.now()}-${input.file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('vendor-documents')
        .upload(fileName, input.file);
      
      if (uploadError) throw uploadError;

      // Create document record
      const { data, error } = await supabase
        .from('vendor_documents')
        .insert({
          vendor_id: input.vendorId,
          business_unit_id: input.businessUnitId,
          doc_type: input.docType,
          file_name: input.file.name,
          mime_type: input.file.type,
          storage_key: fileName,
          title: input.title || null,
          notes: input.notes || null,
          uploaded_by_user_id: input.userId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendor-documents', variables.vendorId] });
      toast({ title: 'Document uploaded' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to upload document', description: error.message, variant: 'destructive' });
    },
  });
};

export const useDeleteVendorDocument = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, storageKey, vendorId }: { id: string; storageKey: string; vendorId: string }) => {
      // Delete from storage
      await supabase.storage.from('vendor-documents').remove([storageKey]);
      
      // Delete record
      const { error } = await supabase.from('vendor_documents').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendor-documents', variables.vendorId] });
      toast({ title: 'Document deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete document', description: error.message, variant: 'destructive' });
    },
  });
};

// Risk-Vendor links
export const useRiskVendors = (riskId?: string) => {
  return useQuery({
    queryKey: ['risk-vendors', riskId],
    enabled: !!riskId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('risk_vendors')
        .select(`
          *,
          vendors (*)
        `)
        .eq('risk_id', riskId!);
      if (error) throw error;
      return data as RiskVendor[];
    },
  });
};

export const useAddRiskVendor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { risk_id: string; vendor_id: string; created_by: string }) => {
      const { data, error } = await supabase
        .from('risk_vendors')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['risk-vendors', variables.risk_id] });
    },
  });
};

export const useRemoveRiskVendor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ riskId, vendorId }: { riskId: string; vendorId: string }) => {
      const { error } = await supabase
        .from('risk_vendors')
        .delete()
        .eq('risk_id', riskId)
        .eq('vendor_id', vendorId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['risk-vendors', variables.riskId] });
    },
  });
};

// Vendor-Asset links
export const useVendorPrimaryAssets = (vendorId?: string) => {
  return useQuery({
    queryKey: ['vendor-primary-assets', vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_primary_assets')
        .select(`
          *,
          primary_assets (id, name, asset_id)
        `)
        .eq('vendor_id', vendorId!);
      if (error) throw error;
      return data;
    },
  });
};

export const useVendorSecondaryAssets = (vendorId?: string) => {
  return useQuery({
    queryKey: ['vendor-secondary-assets', vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_secondary_assets')
        .select(`
          *,
          secondary_assets (id, name, asset_id)
        `)
        .eq('vendor_id', vendorId!);
      if (error) throw error;
      return data;
    },
  });
};

export const useLinkVendorPrimaryAsset = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ vendorId, primaryAssetId }: { vendorId: string; primaryAssetId: string }) => {
      const { data, error } = await supabase
        .from('vendor_primary_assets')
        .insert({ vendor_id: vendorId, primary_asset_id: primaryAssetId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendor-primary-assets', variables.vendorId] });
    },
  });
};

export const useUnlinkVendorPrimaryAsset = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ vendorId, primaryAssetId }: { vendorId: string; primaryAssetId: string }) => {
      const { error } = await supabase
        .from('vendor_primary_assets')
        .delete()
        .eq('vendor_id', vendorId)
        .eq('primary_asset_id', primaryAssetId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendor-primary-assets', variables.vendorId] });
      queryClient.invalidateQueries({ queryKey: ['primary-asset-vendors', variables.primaryAssetId] });
    },
  });
};

interface AssetVendorLink {
  id: string;
  vendor_id: string;
  primary_asset_id?: string;
  secondary_asset_id?: string;
  vendors?: { id: string; name: string; status: string };
}

// Reverse: Primary Asset -> Vendors
export const usePrimaryAssetVendors = (primaryAssetId?: string) => {
  return useQuery({
    queryKey: ['primary-asset-vendors', primaryAssetId],
    enabled: !!primaryAssetId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_primary_assets')
        .select(`
          *,
          vendors (id, name, status)
        `)
        .eq('primary_asset_id', primaryAssetId!);
      if (error) throw error;
      return data as AssetVendorLink[];
    },
  });
};

export const useLinkPrimaryAssetVendor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ primaryAssetId, vendorId }: { primaryAssetId: string; vendorId: string }) => {
      const { data, error } = await supabase
        .from('vendor_primary_assets')
        .insert({ primary_asset_id: primaryAssetId, vendor_id: vendorId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['primary-asset-vendors', variables.primaryAssetId] });
      queryClient.invalidateQueries({ queryKey: ['vendor-primary-assets', variables.vendorId] });
    },
  });
};

export const useUnlinkPrimaryAssetVendor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ primaryAssetId, vendorId }: { primaryAssetId: string; vendorId: string }) => {
      const { error } = await supabase
        .from('vendor_primary_assets')
        .delete()
        .eq('primary_asset_id', primaryAssetId)
        .eq('vendor_id', vendorId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['primary-asset-vendors', variables.primaryAssetId] });
      queryClient.invalidateQueries({ queryKey: ['vendor-primary-assets', variables.vendorId] });
    },
  });
};

// Secondary Asset -> Vendors
export const useSecondaryAssetVendors = (secondaryAssetId?: string) => {
  return useQuery({
    queryKey: ['secondary-asset-vendors', secondaryAssetId],
    enabled: !!secondaryAssetId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_secondary_assets')
        .select(`
          *,
          vendors (id, name, status)
        `)
        .eq('secondary_asset_id', secondaryAssetId!);
      if (error) throw error;
      return data as AssetVendorLink[];
    },
  });
};

export const useLinkSecondaryAssetVendor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ secondaryAssetId, vendorId }: { secondaryAssetId: string; vendorId: string }) => {
      const { data, error } = await supabase
        .from('vendor_secondary_assets')
        .insert({ secondary_asset_id: secondaryAssetId, vendor_id: vendorId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['secondary-asset-vendors', variables.secondaryAssetId] });
      queryClient.invalidateQueries({ queryKey: ['vendor-secondary-assets', variables.vendorId] });
    },
  });
};

export const useUnlinkSecondaryAssetVendor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ secondaryAssetId, vendorId }: { secondaryAssetId: string; vendorId: string }) => {
      const { error } = await supabase
        .from('vendor_secondary_assets')
        .delete()
        .eq('secondary_asset_id', secondaryAssetId)
        .eq('vendor_id', vendorId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['secondary-asset-vendors', variables.secondaryAssetId] });
      queryClient.invalidateQueries({ queryKey: ['vendor-secondary-assets', variables.vendorId] });
    },
  });
};
