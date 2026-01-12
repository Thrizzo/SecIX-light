import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/database/client";
import { useToast } from "@/hooks/use-toast";

export type EUAIActCategory = 'unacceptable' | 'high' | 'limited' | 'minimal';
export type UseCaseStatus = 'pending' | 'approved' | 'disapproved';

export interface AIAssetDetails {
  id: string;
  secondary_asset_id: string;
  model_name: string | null;
  model_provider: string | null;
  model_version: string | null;
  eu_ai_act_category: EUAIActCategory | null;
  archived: boolean;
  archived_at: string | null;
  archived_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  secondary_asset?: {
    id: string;
    asset_id: string;
    name: string;
    secondary_type: string;
    owner_id: string | null;
    business_unit_id: string | null;
  };
}

export interface AIUseCase {
  id: string;
  ai_asset_details_id: string;
  name: string;
  description: string | null;
  status: UseCaseStatus;
  approved_by: string | null;
  approved_at: string | null;
  rationale: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface SecondaryAssetWithAI {
  id: string;
  asset_id: string;
  name: string;
  secondary_type: string;
  ai_enabled: boolean;
  owner_id: string | null;
  business_unit_id: string | null;
  created_at: string;
  ai_asset_details?: AIAssetDetails | null;
  use_case_summary?: {
    total: number;
    approved: number;
    pending: number;
    disapproved: number;
  };
}

// Fetch all AI-enabled secondary assets
export function useAIEnabledAssets(includeArchived: boolean = false) {
  return useQuery({
    queryKey: ["ai-enabled-assets", includeArchived],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("secondary_assets")
        .select(`
          id,
          asset_id,
          name,
          secondary_type,
          ai_enabled,
          owner_id,
          business_unit_id,
          created_at,
          ai_asset_details (
            id,
            model_name,
            model_provider,
            model_version,
            eu_ai_act_category,
            archived,
            archived_at,
            notes,
            created_at,
            updated_at,
            ai_use_cases (
              id,
              status
            )
          )
        `)
        .eq("ai_enabled", true)
        .order("name");

      if (error) throw error;
      
      // Relationship `ai_asset_details` is one-to-one, but depending on
      // PostgREST settings it may come back as an object or an array.
      const normalized = (data || []).map((asset: any) => {
        const rawDetails = asset.ai_asset_details;
        const details = Array.isArray(rawDetails) ? rawDetails[0] : rawDetails;
        return { ...asset, ai_asset_details: details ?? null };
      });

      // Filter based on archived status
      const filtered = normalized.filter((asset: any) => {
        const details = asset.ai_asset_details;
        if (includeArchived) return details?.archived === true;
        return !details?.archived;
      });

      return filtered.map((asset: any) => {
        const details = asset.ai_asset_details as any;
        const useCases = details?.ai_use_cases || [];

        // Calculate use case summary
        const use_case_summary = {
          total: useCases.length,
          approved: useCases.filter((uc: any) => uc.status === "approved").length,
          pending: useCases.filter((uc: any) => uc.status === "pending").length,
          disapproved: useCases.filter((uc: any) => uc.status === "disapproved").length,
        };

        // Remove nested use cases from details to keep it clean
        const cleanDetails = details
          ? {
              id: details.id,
              model_name: details.model_name,
              model_provider: details.model_provider,
              model_version: details.model_version,
              eu_ai_act_category: details.eu_ai_act_category,
              archived: details.archived,
              archived_at: details.archived_at,
              notes: details.notes,
              created_at: details.created_at,
              updated_at: details.updated_at,
            }
          : null;

        return {
          ...asset,
          ai_asset_details: cleanDetails,
          use_case_summary,
        };
      }) as SecondaryAssetWithAI[];
    },
  });
}

// Fetch AI details for a specific asset
export function useAIAssetDetails(secondaryAssetId: string | null) {
  return useQuery({
    queryKey: ["ai-asset-details", secondaryAssetId],
    queryFn: async () => {
      if (!secondaryAssetId) return null;
      
      const { data, error } = await supabase
        .from("ai_asset_details")
        .select("*")
        .eq("secondary_asset_id", secondaryAssetId)
        .maybeSingle();

      if (error) throw error;
      return data as AIAssetDetails | null;
    },
    enabled: !!secondaryAssetId,
  });
}

// Create AI asset details
export function useCreateAIAssetDetails() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      secondary_asset_id: string;
      model_name?: string | null;
      model_provider?: string | null;
      model_version?: string | null;
      eu_ai_act_category?: EUAIActCategory | null;
      notes?: string | null;
    }) => {
      const { data: result, error } = await supabase
        .from("ai_asset_details")
        .insert(data)
        .select()
        .single() as { data: AIAssetDetails | null; error: Error | null };

      if (error) throw error;
      return result as AIAssetDetails;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-enabled-assets"] });
      queryClient.invalidateQueries({ queryKey: ["ai-asset-details"] });
      toast({ title: "AI details created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create AI details", description: error.message, variant: "destructive" });
    },
  });
}

// Update AI asset details
export function useUpdateAIAssetDetails() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<AIAssetDetails> & { id: string }) => {
      const { data: result, error } = await supabase
        .from("ai_asset_details")
        .update(data)
        .eq("id", id)
        .select()
        .single() as { data: AIAssetDetails | null; error: Error | null };

      if (error) throw error;
      return result as AIAssetDetails;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-enabled-assets"] });
      queryClient.invalidateQueries({ queryKey: ["ai-asset-details"] });
      toast({ title: "AI details updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update AI details", description: error.message, variant: "destructive" });
    },
  });
}

// Archive AI asset
export function useArchiveAIAsset() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("ai_asset_details")
        .update({ 
          archived: true, 
          archived_at: new Date().toISOString(),
          archived_by: user?.id 
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-enabled-assets"] });
      toast({ title: "AI asset archived successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to archive AI asset", description: error.message, variant: "destructive" });
    },
  });
}

// Restore archived AI asset
export function useRestoreAIAsset() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ai_asset_details")
        .update({ 
          archived: false, 
          archived_at: null,
          archived_by: null 
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-enabled-assets"] });
      toast({ title: "AI asset restored successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to restore AI asset", description: error.message, variant: "destructive" });
    },
  });
}

// Delete AI asset details (removes from register, keeps secondary asset)
export function useDeleteAIAssetDetails() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ai_asset_details")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-enabled-assets"] });
      queryClient.invalidateQueries({ queryKey: ["ai-asset-details"] });
      toast({ title: "AI details deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete AI details", description: error.message, variant: "destructive" });
    },
  });
}

// Fetch use cases for an AI asset
export function useAIUseCases(aiAssetDetailsId: string | null) {
  return useQuery({
    queryKey: ["ai-use-cases", aiAssetDetailsId],
    queryFn: async () => {
      if (!aiAssetDetailsId) return [];
      
      const { data, error } = await supabase
        .from("ai_use_cases")
        .select("*")
        .eq("ai_asset_details_id", aiAssetDetailsId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as AIUseCase[];
    },
    enabled: !!aiAssetDetailsId,
  });
}

// Create use case
export function useCreateAIUseCase() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      ai_asset_details_id: string;
      name: string;
      description?: string | null;
      status?: UseCaseStatus;
    }) => {
      const { data: result, error } = await supabase
        .from("ai_use_cases")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-use-cases"] });
      queryClient.invalidateQueries({ queryKey: ["ai-enabled-assets"] });
      toast({ title: "Use case created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create use case", description: error.message, variant: "destructive" });
    },
  });
}

// Update use case (approve/disapprove)
export function useUpdateAIUseCase() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<AIUseCase> & { id: string }) => {
      const updateData: Record<string, unknown> = { ...data };
      
      // If status is changing to approved/disapproved, set approval fields
      if (data.status === 'approved' || data.status === 'disapproved') {
        const { data: { user } } = await supabase.auth.getUser();
        updateData.approved_by = user?.id;
        updateData.approved_at = new Date().toISOString();
      }
      
      const { data: result, error } = await supabase
        .from("ai_use_cases")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-use-cases"] });
      queryClient.invalidateQueries({ queryKey: ["ai-enabled-assets"] });
      toast({ title: "Use case updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update use case", description: error.message, variant: "destructive" });
    },
  });
}

// Delete use case
export function useDeleteAIUseCase() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ai_use_cases")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-use-cases"] });
      queryClient.invalidateQueries({ queryKey: ["ai-enabled-assets"] });
      toast({ title: "Use case deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete use case", description: error.message, variant: "destructive" });
    },
  });
}
