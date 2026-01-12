import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/database/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";
import { getModuleConfig } from "@/components/dataforge/ModuleFieldConfigs";

export interface DataForgeJob {
  id: string;
  job_name: string;
  target_module: string;
  source_type: string;
  source_file_name: string | null;
  source_api_config: Json | null;
  status: string;
  row_count: number;
  imported_count: number;
  error_count: number;
  skipped_count: number;
  duplicate_behavior: string;
  business_unit_id: string | null;
  connection_id: string | null;
  endpoint_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Sync scheduling
  sync_enabled: boolean | null;
  sync_schedule: string | null;
  last_synced_at: string | null;
  next_sync_at: string | null;
}

export interface DataForgeMapping {
  id: string;
  job_id: string;
  source_column: string | null;
  target_field: string;
  confidence: number | null;
  ai_reasoning: string | null;
  transform_config: Json | null;
  created_at: string;
}

export interface DataForgeStagingRow {
  id: string;
  job_id: string;
  row_number: number;
  raw_data: Json;
  normalized_data: Json | null;
  validation_errors: Json | null;
  will_import: boolean;
  created_at: string;
}

// Fetch all jobs
export function useDataForgeJobs() {
  return useQuery({
    queryKey: ["data-forge-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_forge_jobs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as DataForgeJob[];
    },
  });
}

// Fetch single job
export function useDataForgeJob(jobId: string | null) {
  return useQuery({
    queryKey: ["data-forge-job", jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const { data, error } = await supabase
        .from("data_forge_jobs")
        .select("*")
        .eq("id", jobId)
        .single();

      if (error) throw error;
      return data as DataForgeJob;
    },
    enabled: !!jobId,
  });
}

// Fetch mappings for a job
export function useDataForgeMappings(jobId: string | null) {
  return useQuery({
    queryKey: ["data-forge-mappings", jobId],
    queryFn: async () => {
      if (!jobId) return [];
      const { data, error } = await supabase
        .from("data_forge_mappings")
        .select("*")
        .eq("job_id", jobId);

      if (error) throw error;
      return data as DataForgeMapping[];
    },
    enabled: !!jobId,
  });
}

// Fetch staging rows for a job
export function useDataForgeStagingRows(jobId: string | null) {
  return useQuery({
    queryKey: ["data-forge-staging-rows", jobId],
    queryFn: async () => {
      if (!jobId) return [];
      const { data, error } = await supabase
        .from("data_forge_staging_rows")
        .select("*")
        .eq("job_id", jobId)
        .order("row_number", { ascending: true });

      if (error) throw error;
      return data as DataForgeStagingRow[];
    },
    enabled: !!jobId,
  });
}

// Create job
export function useCreateDataForgeJob() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      job_name: string;
      target_module: string;
      source_type: string;
      source_file_name?: string;
      duplicate_behavior?: string;
      business_unit_id?: string;
      connection_id?: string;
      endpoint_id?: string;
    }) => {
      // Get profile ID from user_id
      let profileId: string | null = null;
      if (user?.id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        const typedProfile = profile as { id: string } | null;
        profileId = typedProfile?.id || null;
      }

      const { data: job, error } = await supabase
        .from("data_forge_jobs")
        .insert({
          ...data,
          created_by: profileId,
          status: "draft",
        })
        .select()
        .single();

      if (error) throw error;
      return job as DataForgeJob;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-forge-jobs"] });
    },
    onError: (error) => {
      toast.error("Failed to create import job: " + error.message);
    },
  });
}

// Update job
export function useUpdateDataForgeJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: Partial<DataForgeJob> & { id: string }) => {
      const { data: job, error } = await supabase
        .from("data_forge_jobs")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return job as DataForgeJob;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["data-forge-jobs"] });
      queryClient.invalidateQueries({
        queryKey: ["data-forge-job", variables.id],
      });
    },
    onError: (error) => {
      toast.error("Failed to update import job: " + error.message);
    },
  });
}

// Delete job
export function useDeleteDataForgeJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("data_forge_jobs")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-forge-jobs"] });
      toast.success("Import job deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete import job: " + error.message);
    },
  });
}

// Save mappings
export function useSaveDataForgeMappings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      jobId,
      mappings,
    }: {
      jobId: string;
      mappings: Omit<DataForgeMapping, "id" | "created_at">[];
    }) => {
      // Delete existing mappings
      await supabase.from("data_forge_mappings").delete().eq("job_id", jobId);

      // Insert new mappings
      if (mappings.length > 0) {
        const { error } = await supabase
          .from("data_forge_mappings")
          .insert(mappings);
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["data-forge-mappings", variables.jobId],
      });
    },
    onError: (error) => {
      toast.error("Failed to save mappings: " + error.message);
    },
  });
}

// Save staging rows
export function useSaveDataForgeStagingRows() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      jobId,
      rows,
    }: {
      jobId: string;
      rows: Omit<DataForgeStagingRow, "id" | "created_at">[];
    }) => {
      // Delete existing rows
      await supabase
        .from("data_forge_staging_rows")
        .delete()
        .eq("job_id", jobId);

      // Insert new rows in batches
      const batchSize = 100;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const { error } = await supabase
          .from("data_forge_staging_rows")
          .insert(batch);
        if (error) throw error;
      }

      // Update job row count
      await supabase
        .from("data_forge_jobs")
        .update({ row_count: rows.length })
        .eq("id", jobId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["data-forge-staging-rows", variables.jobId],
      });
      queryClient.invalidateQueries({
        queryKey: ["data-forge-job", variables.jobId],
      });
    },
    onError: (error) => {
      toast.error("Failed to save staging rows: " + error.message);
    },
  });
}

// Update staging row will_import flag
export function useUpdateStagingRowImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      rowId,
      willImport,
      jobId,
    }: {
      rowId: string;
      willImport: boolean;
      jobId: string;
    }) => {
      const { error } = await supabase
        .from("data_forge_staging_rows")
        .update({ will_import: willImport })
        .eq("id", rowId);

      if (error) throw error;
      return jobId;
    },
    onSuccess: (jobId) => {
      queryClient.invalidateQueries({
        queryKey: ["data-forge-staging-rows", jobId],
      });
    },
  });
}

// Import data to target module
export function useExecuteDataForgeImport() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      jobId,
      targetModule,
      mappings,
      rows,
    }: {
      jobId: string;
      targetModule: string;
      mappings: DataForgeMapping[];
      rows: DataForgeStagingRow[];
    }) => {
      const rowsToImport = rows.filter((r) => r.will_import);
      let importedCount = 0;
      let errorCount = 0;
      let skippedCount = rows.length - rowsToImport.length;

      // Update job status to importing
      await supabase
        .from("data_forge_jobs")
        .update({ status: "importing" })
        .eq("id", jobId);

      // Get user's profile id + business unit (used by RLS on some modules)
      let profileId: string | null = null;
      let businessUnitId: string | null = null;
      if (user?.id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, business_unit_id")
          .eq("user_id", user.id)
          .maybeSingle();
        const typedProfile = profile as { id: string; business_unit_id: string | null } | null;
        profileId = typedProfile?.id || null;
        businessUnitId = typedProfile?.business_unit_id || null;
      }

      // Process rows based on target module
      const tableName = getTableName(targetModule);
      const defaultCreatedBy =
        targetModule === "internal_controls" ? profileId : user?.id;

      for (const row of rowsToImport) {
        try {
          const rawDataObj = (typeof row.raw_data === "object" && row.raw_data !== null && !Array.isArray(row.raw_data))
            ? (row.raw_data as Record<string, Json>)
            : {};

          const normalizedData = applyMappings(rawDataObj, mappings);

          // Coerce values to match expected field types (e.g. IDs to strings)
          const payload: Record<string, unknown> = coercePayloadForModule(targetModule, normalizedData);

          // Some modules use auth user id, others use profile id (internal_controls)
          if (defaultCreatedBy && payload.created_by === undefined) {
            payload.created_by = defaultCreatedBy;
          }

          // Default business_unit_id from profile when missing
          if (businessUnitId && payload.business_unit_id === undefined) {
            payload.business_unit_id = businessUnitId;
          }

          const { error } = await supabase
            .from(tableName as any)
            .insert(payload as any);

          if (error) {
            errorCount++;
            console.error("Import error for row", row.row_number, error);
          } else {
            importedCount++;
          }
        } catch (err) {
          errorCount++;
          console.error("Import error for row", row.row_number, err);
        }
      }

      // Update job with final counts
      await supabase
        .from("data_forge_jobs")
        .update({
          status: "completed",
          imported_count: importedCount,
          error_count: errorCount,
          skipped_count: skippedCount,
        })
        .eq("id", jobId);

      return { importedCount, errorCount, skippedCount };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["data-forge-jobs"] });
      toast.success(
        `Import complete: ${result.importedCount} imported, ${result.errorCount} errors, ${result.skippedCount} skipped`
      );
    },
    onError: (error) => {
      toast.error("Import failed: " + error.message);
    },
  });
}

// Resync an import job (re-run the import using stored mappings and raw data)
export function useResyncDataForgeJob() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (jobId: string) => {
      // Fetch job, mappings, and staging rows
      const { data: job, error: jobError } = await supabase
        .from("data_forge_jobs")
        .select("*")
        .eq("id", jobId)
        .single();
      if (jobError) throw jobError;

      const { data: mappings, error: mappingsError } = await supabase
        .from("data_forge_mappings")
        .select("*")
        .eq("job_id", jobId);
      if (mappingsError) throw mappingsError;

      const { data: rows, error: rowsError } = await supabase
        .from("data_forge_staging_rows")
        .select("*")
        .eq("job_id", jobId)
        .order("row_number", { ascending: true });
      if (rowsError) throw rowsError;

      if (!mappings?.length || !rows?.length) {
        throw new Error("No mappings or staging data found for this job");
      }

      const typedRows = rows as DataForgeStagingRow[];
      const typedJob = job as DataForgeJob;
      const rowsToImport = typedRows.filter((r) => r.will_import);
      let importedCount = 0;
      let errorCount = 0;
      let skippedCount = typedRows.length - rowsToImport.length;

      // Update job status to importing
      await supabase
        .from("data_forge_jobs")
        .update({ status: "importing" })
        .eq("id", jobId);

      // Get user's profile id + business unit
      let profileId: string | null = null;
      let businessUnitId: string | null = null;
      if (user?.id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, business_unit_id")
          .eq("user_id", user.id)
          .maybeSingle();
        const typedProfile = profile as { id: string; business_unit_id: string | null } | null;
        profileId = typedProfile?.id || null;
        businessUnitId = typedProfile?.business_unit_id || null;
      }

      const tableName = getTableName(typedJob.target_module);
      const defaultCreatedBy =
        typedJob.target_module === "internal_controls" ? profileId : user?.id;

      for (const row of rowsToImport) {
        try {
          const rawDataObj = (typeof row.raw_data === "object" && row.raw_data !== null && !Array.isArray(row.raw_data))
            ? (row.raw_data as Record<string, Json>)
            : {};

          const normalizedData = applyMappings(rawDataObj, mappings as DataForgeMapping[]);
          const payload: Record<string, unknown> = coercePayloadForModule(typedJob.target_module, normalizedData);

          if (defaultCreatedBy && payload.created_by === undefined) {
            payload.created_by = defaultCreatedBy;
          }
          if (businessUnitId && payload.business_unit_id === undefined) {
            payload.business_unit_id = businessUnitId;
          }

          const { error } = await supabase
            .from(tableName as any)
            .insert(payload as any);

          if (error) {
            errorCount++;
            console.error("Resync error for row", row.row_number, error);
          } else {
            importedCount++;
          }
        } catch (err) {
          errorCount++;
          console.error("Resync error for row", row.row_number, err);
        }
      }

      // Update job with final counts and sync time
      await supabase
        .from("data_forge_jobs")
        .update({
          status: "completed",
          imported_count: importedCount,
          error_count: errorCount,
          skipped_count: skippedCount,
          last_synced_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      return { importedCount, errorCount, skippedCount };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["data-forge-jobs"] });
      toast.success(
        `Resync complete: ${result.importedCount} imported, ${result.errorCount} errors`
      );
    },
    onError: (error) => {
      toast.error("Resync failed: " + error.message);
    },
  });
}

// Update sync schedule for a job
export function useUpdateJobSyncSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      jobId,
      syncEnabled,
      syncSchedule,
    }: {
      jobId: string;
      syncEnabled: boolean;
      syncSchedule: string | null;
    }) => {
      const nextSyncAt = syncEnabled && syncSchedule 
        ? calculateNextSyncTime(syncSchedule) 
        : null;

      const { error } = await supabase
        .from("data_forge_jobs")
        .update({
          sync_enabled: syncEnabled,
          sync_schedule: syncSchedule,
          next_sync_at: nextSyncAt,
        })
        .eq("id", jobId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-forge-jobs"] });
      toast.success("Sync schedule updated");
    },
    onError: (error) => {
      toast.error("Failed to update schedule: " + error.message);
    },
  });
}

// Calculate next sync time based on schedule
function calculateNextSyncTime(schedule: string): string {
  const now = new Date();
  switch (schedule) {
    case "15m":
      return new Date(now.getTime() + 15 * 60 * 1000).toISOString();
    case "1h":
      return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    case "6h":
      return new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString();
    case "12h":
      return new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString();
    case "24h":
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  }
}

// Helper functions
function applyMappings(
  rawData: Record<string, Json>,
  mappings: DataForgeMapping[]
): Record<string, Json> {
  const result: Record<string, Json> = {};

  for (const mapping of mappings) {
    if (mapping.source_column && rawData[mapping.source_column] !== undefined) {
      result[mapping.target_field] = rawData[mapping.source_column];
    }
  }

  return result;
}

function getTableName(targetModule: string): string {
  const tableMap: Record<string, string> = {
    primary_assets: "primary_assets",
    secondary_assets: "secondary_assets",
    vendors: "vendors",
    risks: "risks",
    vulnerabilities: "vulnerabilities",
    threat_sources: "threat_sources",
    threat_events: "threat_events",
    internal_controls: "internal_controls",
  };

  return tableMap[targetModule] || targetModule;
}

function coercePayloadForModule(
  moduleKey: string,
  payload: Record<string, Json>
): Record<string, unknown> {
  const config = getModuleConfig(moduleKey);
  if (!config) return { ...payload };

  const out: Record<string, unknown> = { ...payload };

  for (const field of config.fields) {
    const value = out[field.name];
    if (value === undefined || value === null) continue;

    switch (field.type) {
      case "text":
      case "email":
      case "url":
      case "select":
        if (typeof value !== "string") out[field.name] = String(value);
        break;
      case "number":
        if (typeof value === "string") {
          const n = Number(value);
          if (!Number.isNaN(n)) out[field.name] = n;
        }
        break;
      case "boolean":
        if (typeof value === "string") {
          const v = value.trim().toLowerCase();
          out[field.name] = v === "true" || v === "1" || v === "yes";
        } else if (typeof value === "number") {
          out[field.name] = value !== 0;
        }
        break;
      case "date":
        // keep as-is (string recommended)
        break;
      default:
        break;
    }
  }

  return out;
}
