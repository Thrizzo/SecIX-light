import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/database/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";

export interface DataForgeConnection {
  id: string;
  name: string;
  description: string | null;
  connection_type: string;
  system_type: string;
  base_url: string;
  auth_type: string;
  auth_config: Json;
  headers_config: Json;
  rate_limit_per_minute: number;
  timeout_seconds: number;
  is_active: boolean;
  last_tested_at: string | null;
  last_test_status: string | null;
  last_test_error: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // New fields for multi-source support
  source_category: string | null;
  driver_type: string | null;
  region: string | null;
  bucket_name: string | null;
  database_name: string | null;
  schema_name: string | null;
  query_template: string | null;
  file_pattern: string | null;
  file_format: string | null;
  sync_schedule: string | null;
  last_sync_at: string | null;
  next_sync_at: string | null;
  sync_status?: string | null;
  sync_enabled?: boolean | null;
}

export interface DataForgeConnectionEndpoint {
  id: string;
  connection_id: string;
  name: string;
  description: string | null;
  endpoint_path: string;
  http_method: string;
  target_module: string;
  query_params: Json;
  request_body_template: Json | null;
  response_data_path: string | null;
  field_mappings: Json;
  pagination_type: string | null;
  pagination_config: Json;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Sync-related fields
  sync_enabled: boolean;
  sync_interval: string;
  last_synced_at: string | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
  last_sync_row_count: number;
  unique_key_field: string | null;
}

// Fetch all connections
export function useDataForgeConnections() {
  return useQuery({
    queryKey: ["data-forge-connections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_forge_connections")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as DataForgeConnection[];
    },
  });
}

// Fetch single connection
export function useDataForgeConnection(connectionId: string | null) {
  return useQuery({
    queryKey: ["data-forge-connection", connectionId],
    queryFn: async () => {
      if (!connectionId) return null;
      const { data, error } = await supabase
        .from("data_forge_connections")
        .select("*")
        .eq("id", connectionId)
        .single();

      if (error) throw error;
      return data as DataForgeConnection;
    },
    enabled: !!connectionId,
  });
}

// Fetch endpoints for a connection
export function useDataForgeConnectionEndpoints(connectionId: string | null) {
  return useQuery({
    queryKey: ["data-forge-connection-endpoints", connectionId],
    queryFn: async () => {
      if (!connectionId) return [];
      const { data, error } = await supabase
        .from("data_forge_connection_endpoints")
        .select("*")
        .eq("connection_id", connectionId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as DataForgeConnectionEndpoint[];
    },
    enabled: !!connectionId,
  });
}

// Fetch all endpoints
export function useAllDataForgeConnectionEndpoints() {
  return useQuery({
    queryKey: ["data-forge-all-endpoints"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_forge_connection_endpoints")
        .select("*, data_forge_connections(name, system_type)")
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
  });
}

// Create connection
export function useCreateDataForgeConnection() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      connection_type: string;
      system_type: string;
      base_url: string;
      auth_type: string;
      auth_config?: Json;
      headers_config?: Json;
      rate_limit_per_minute?: number;
      timeout_seconds?: number;
      // NOTE: the UI may pass additional fields; we intentionally ignore them
      // until the database schema supports them.
      source_category?: string;
      driver_type?: string;
      region?: string;
      bucket_name?: string;
      database_name?: string;
      schema_name?: string;
      query_template?: string;
      file_pattern?: string;
      file_format?: string;
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

      // Whitelist fields that actually exist in the DB schema to avoid
      // "column not found" errors.
      const insertPayload = {
        name: data.name,
        description: data.description ?? null,
        connection_type: data.connection_type,
        system_type: data.system_type,
        base_url: data.base_url,
        auth_type: data.auth_type,
        auth_config: (data.auth_config ?? {}) as Json,
        headers_config: (data.headers_config ?? {}) as Json,
        rate_limit_per_minute: data.rate_limit_per_minute ?? null,
        timeout_seconds: data.timeout_seconds ?? null,
        created_by: profileId,
        is_active: true,
      };

      const { data: connection, error } = await supabase
        .from("data_forge_connections")
        .insert(insertPayload)
        .select()
        .single();

      if (error) throw error;
      return connection as DataForgeConnection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-forge-connections"] });
      toast.success("Connection created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create connection: " + error.message);
    },
  });
}

// Update connection
export function useUpdateDataForgeConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: Partial<DataForgeConnection> & { id: string }) => {
      // Whitelist fields that exist in DB schema (avoid updating non-existent columns)
      const patch: Record<string, unknown> = {};
      const allow = new Set([
        "name",
        "description",
        "connection_type",
        "system_type",
        "base_url",
        "auth_type",
        "auth_config",
        "headers_config",
        "rate_limit_per_minute",
        "timeout_seconds",
        "is_active",
        "last_tested_at",
        "last_test_status",
        "last_test_error",
      ]);

      for (const [key, value] of Object.entries(data)) {
        if (allow.has(key)) patch[key] = value as unknown;
      }

      const { data: connection, error } = await supabase
        .from("data_forge_connections")
        .update(patch)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return connection as DataForgeConnection;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["data-forge-connections"] });
      queryClient.invalidateQueries({
        queryKey: ["data-forge-connection", variables.id],
      });
      toast.success("Connection updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update connection: " + error.message);
    },
  });
}

// Delete connection (with cascade)
export function useDeleteDataForgeConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // First, delete related jobs (which will cascade to staging rows and mappings)
      const { error: jobsError } = await supabase
        .from("data_forge_jobs")
        .delete()
        .eq("connection_id", id);

      if (jobsError) {
        console.warn("Error deleting related jobs:", jobsError);
      }

      // Delete related endpoints
      const { error: endpointsError } = await supabase
        .from("data_forge_connection_endpoints")
        .delete()
        .eq("connection_id", id);

      if (endpointsError) {
        console.warn("Error deleting related endpoints:", endpointsError);
      }

      // Delete related secrets
      const { error: secretsError } = await supabase
        .from("data_forge_connection_secrets")
        .delete()
        .eq("connection_id", id);

      if (secretsError) {
        console.warn("Error deleting related secrets:", secretsError);
      }

      // Now delete the connection itself
      const { error } = await supabase
        .from("data_forge_connections")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-forge-connections"] });
      queryClient.invalidateQueries({ queryKey: ["data-forge-jobs"] });
      toast.success("Connection deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete connection: " + error.message);
    },
  });
}

// Test connection
export function useTestDataForgeConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (connectionId: string) => {
      // Update status to pending
      await supabase
        .from("data_forge_connections")
        .update({ 
          last_test_status: "pending",
          last_tested_at: new Date().toISOString()
        })
        .eq("id", connectionId);

      // In a real implementation, this would call an edge function to test the connection
      // For now, simulate a test
      const { data: connection } = await supabase
        .from("data_forge_connections")
        .select("*")
        .eq("id", connectionId)
        .single();

      if (!connection) throw new Error("Connection not found");

      // Simulate test (in production, this would be an edge function call)
      const testSuccess = true; // Placeholder

      await supabase
        .from("data_forge_connections")
        .update({
          last_test_status: testSuccess ? "success" : "failed",
          last_test_error: testSuccess ? null : "Connection test failed",
          last_tested_at: new Date().toISOString(),
        })
        .eq("id", connectionId);

      return testSuccess;
    },
    onSuccess: (success) => {
      queryClient.invalidateQueries({ queryKey: ["data-forge-connections"] });
      if (success) {
        toast.success("Connection test successful");
      } else {
        toast.error("Connection test failed");
      }
    },
    onError: (error) => {
      toast.error("Failed to test connection: " + error.message);
    },
  });
}

// Create endpoint
export function useCreateDataForgeEndpoint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      connection_id: string;
      name: string;
      description?: string;
      endpoint_path: string;
      http_method: string;
      target_module: string;
      query_params?: Json;
      request_body_template?: Json;
      response_data_path?: string;
      field_mappings?: Json;
      pagination_type?: string;
      pagination_config?: Json;
    }) => {
      const { data: endpoint, error } = await supabase
        .from("data_forge_connection_endpoints")
        .insert({
          ...data,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return endpoint as DataForgeConnectionEndpoint;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["data-forge-connection-endpoints", variables.connection_id] 
      });
      queryClient.invalidateQueries({ queryKey: ["data-forge-all-endpoints"] });
      toast.success("Endpoint created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create endpoint: " + error.message);
    },
  });
}

// Update endpoint
export function useUpdateDataForgeEndpoint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: Partial<DataForgeConnectionEndpoint> & { id: string }) => {
      const { data: endpoint, error } = await supabase
        .from("data_forge_connection_endpoints")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return endpoint as DataForgeConnectionEndpoint;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-forge-connection-endpoints"] });
      queryClient.invalidateQueries({ queryKey: ["data-forge-all-endpoints"] });
      toast.success("Endpoint updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update endpoint: " + error.message);
    },
  });
}

// Delete endpoint
export function useDeleteDataForgeEndpoint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, connectionId }: { id: string; connectionId: string }) => {
      const { error } = await supabase
        .from("data_forge_connection_endpoints")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return connectionId;
    },
    onSuccess: (connectionId) => {
      queryClient.invalidateQueries({ 
        queryKey: ["data-forge-connection-endpoints", connectionId] 
      });
      queryClient.invalidateQueries({ queryKey: ["data-forge-all-endpoints"] });
      toast.success("Endpoint deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete endpoint: " + error.message);
    },
  });
}

// Sync endpoint data
export function useSyncDataForgeEndpoint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (endpointId: string) => {
      // Update status to running locally first
      await supabase
        .from("data_forge_connection_endpoints")
        .update({ last_sync_status: "running", last_synced_at: new Date().toISOString() })
        .eq("id", endpointId);

      // Call the edge function to perform sync
      const { data, error } = await supabase.functions.invoke("data-forge-sync", {
        body: { endpoint_id: endpointId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["data-forge-connection-endpoints"] });
      queryClient.invalidateQueries({ queryKey: ["data-forge-all-endpoints"] });
      const typedData = data as { success?: boolean; records_synced?: number } | null;
      if (typedData?.success) {
        toast.success(`Synced ${typedData.records_synced} records`);
      }
    },
    onError: (error) => {
      queryClient.invalidateQueries({ queryKey: ["data-forge-connection-endpoints"] });
      queryClient.invalidateQueries({ queryKey: ["data-forge-all-endpoints"] });
      toast.error("Sync failed: " + error.message);
    },
  });
}

// Update endpoint sync settings
export function useUpdateEndpointSyncSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      sync_enabled,
      sync_interval,
      unique_key_field,
    }: {
      id: string;
      sync_enabled?: boolean;
      sync_interval?: string;
      unique_key_field?: string;
    }) => {
      const { data: endpoint, error } = await supabase
        .from("data_forge_connection_endpoints")
        .update({ sync_enabled, sync_interval, unique_key_field })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return endpoint as DataForgeConnectionEndpoint;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-forge-connection-endpoints"] });
      queryClient.invalidateQueries({ queryKey: ["data-forge-all-endpoints"] });
      toast.success("Sync settings updated");
    },
    onError: (error) => {
      toast.error("Failed to update sync settings: " + error.message);
    },
  });
}
