import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/integrations/database/client';
import { useAuth } from '@/contexts/AuthContext';

// Alias for backward compatibility
const supabase = db;

// ============================================
// Types
// ============================================

export type AssetKind = 'asset' | 'process';
export type ProcessLevel = 'L1' | 'L2' | 'L3';
export type PrimaryType = 'Data' | 'Process';
export type Criticality = 'Low' | 'Medium' | 'High' | 'Critical';
export type SecondaryType = 'IT Service' | 'Application' | 'Location' | 'Personnel';
export type DeviationStatus = 'Compliant' | 'At Risk' | 'Non-Compliant';
export type ProcessPrimaryLinkType = 'USES' | 'PRODUCES' | 'INPUT' | 'OUTPUT' | 'STORES' | 'GOVERNS' | 'SUPPORTS';
export type ProcessSecondaryLinkType = 'RUNS_ON' | 'SUPPORTED_BY' | 'OWNED_BY' | 'OPERATED_BY' | 'DEPENDS_ON';
export type AssetRelationshipType = 'DATA_FLOW' | 'DEPENDS_ON' | 'SUPPORTS' | 'HOSTS' | 'USES' | 'PRODUCES' | 'CONTAINS' | 'TAGGED';

export interface PrimaryAsset {
  id: string;
  asset_id: string;
  name: string;
  description: string | null;
  primary_type: PrimaryType;
  asset_kind: AssetKind;
  process_level: ProcessLevel | null;
  parent_primary_asset_id: string | null;
  inherit_from_parent: boolean;
  criticality: Criticality | null;
  owner_id: string | null;
  rto_hours: number | null;
  rpo_hours: number | null;
  mtd_hours: number | null;
  bia_id: string | null;
  bia_completed: boolean;
  confidentiality_level_id: string | null;
  business_unit_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PrimaryAssetWithBU extends PrimaryAsset {
  business_units?: {
    id: string;
    name: string;
    is_security_org: boolean;
  } | null;
  parent_asset?: {
    id: string;
    name: string;
    asset_id: string;
    process_level: ProcessLevel | null;
  } | null;
  children?: PrimaryAsset[];
}

export interface SecondaryAsset {
  id: string;
  asset_id: string;
  name: string;
  description: string | null;
  secondary_type: SecondaryType;
  primary_asset_id: string | null;
  owner_id: string | null;
  inherited_criticality: string | null;
  inherited_rto_hours: number | null;
  inherited_rpo_hours: number | null;
  inherited_mtd_hours: number | null;
  effective_criticality: string | null;
  effective_rto_hours: number | null;
  effective_rpo_hours: number | null;
  effective_mtd_hours: number | null;
  deviation_status: DeviationStatus;
  deviation_reason: string | null;
  business_unit_id: string | null;
  ai_enabled: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProcessPrimaryAssetLink {
  id: string;
  business_unit_id: string;
  process_id: string;
  primary_asset_id: string;
  link_type: ProcessPrimaryLinkType;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  primary_asset?: PrimaryAsset;
  process?: PrimaryAsset;
}

export interface ProcessSecondaryAssetLink {
  id: string;
  business_unit_id: string;
  process_id: string;
  secondary_asset_id: string;
  link_type: ProcessSecondaryLinkType;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  secondary_asset?: SecondaryAsset;
  process?: PrimaryAsset;
}

export interface AssetRelationship {
  id: string;
  business_unit_id: string;
  from_entity_type: 'PRIMARY' | 'SECONDARY';
  from_entity_id: string;
  to_entity_type: 'PRIMARY' | 'SECONDARY';
  to_entity_id: string;
  relationship_type: AssetRelationshipType;
  data_flow_label: string | null;
  data_sensitivity: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// Combined inventory item for unified view
export interface AssetInventoryItem {
  id: string;
  asset_id: string;
  name: string;
  description: string | null;
  entity_type: 'PRIMARY' | 'SECONDARY';
  asset_kind: AssetKind | null;
  process_level: ProcessLevel | null;
  primary_type?: PrimaryType;
  secondary_type?: SecondaryType;
  criticality: string | null;
  owner_id: string | null;
  business_unit_id: string | null;
  business_unit_name?: string | null;
  owner_name?: string | null;
  confidentiality_level_id?: string | null;
  updated_at: string;
}

// ============================================
// Primary Assets
// ============================================

export function usePrimaryAssets() {
  return useQuery({
    queryKey: ['primary-assets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('primary_assets')
        .select(`
          *,
          business_units (id, name, is_security_org)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as PrimaryAssetWithBU[];
    },
  });
}

export function usePrimaryAssetWithChildren(assetId: string | null) {
  return useQuery({
    queryKey: ['primary-asset-with-children', assetId],
    queryFn: async () => {
      if (!assetId) return null;
      
      // Get the asset
      const { data: asset, error: assetError } = await supabase
        .from('primary_assets')
        .select(`
          *,
          business_units (id, name, is_security_org)
        `)
        .eq('id', assetId)
        .single();
      
      if (assetError) throw assetError;
      const typedAsset = asset as PrimaryAssetWithBU;
      
      // Get children
      const { data: children, error: childrenError } = await supabase
        .from('primary_assets')
        .select('*')
        .eq('parent_primary_asset_id', assetId)
        .order('name');
      
      if (childrenError) throw childrenError;
      
      // Get parent if exists
      let parent = null;
      if (typedAsset.parent_primary_asset_id) {
        const { data: parentData } = await supabase
          .from('primary_assets')
          .select('id, name, asset_id, process_level')
          .eq('id', typedAsset.parent_primary_asset_id)
          .single();
        parent = parentData;
      }
      
      return {
        ...typedAsset,
        children: (children as PrimaryAsset[]) || [],
        parent_asset: parent,
      } as PrimaryAssetWithBU;
    },
    enabled: !!assetId,
  });
}

export function useProcessAssets() {
  return useQuery({
    queryKey: ['process-assets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('primary_assets')
        .select(`
          *,
          business_units (id, name, is_security_org)
        `)
        .eq('asset_kind', 'process')
        .order('process_level', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return data as PrimaryAssetWithBU[];
    },
  });
}

export function useCreatePrimaryAsset() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (asset: Partial<PrimaryAsset> & { name: string; asset_id: string }) => {
      // Handle inheritance for child processes
      let finalAsset = { ...asset, created_by: user?.id };
      
      // Default business_unit_id from profile if not specified
      if (!finalAsset.business_unit_id && profile?.business_unit_id) {
        finalAsset.business_unit_id = profile.business_unit_id;
      }
      
      if (asset.asset_kind === 'process' && asset.parent_primary_asset_id && asset.inherit_from_parent) {
        // Fetch parent to inherit values
        const { data: parentData } = await supabase
          .from('primary_assets')
          .select('business_unit_id, owner_id, confidentiality_level_id, criticality')
          .eq('id', asset.parent_primary_asset_id)
          .single();
        
        const parent = parentData as PrimaryAsset | null;
        if (parent) {
          finalAsset = {
            ...finalAsset,
            business_unit_id: asset.business_unit_id || parent.business_unit_id,
            owner_id: asset.owner_id || parent.owner_id,
            confidentiality_level_id: asset.confidentiality_level_id || parent.confidentiality_level_id,
            criticality: (asset.criticality || parent.criticality) as Criticality | null,
          };
        }
      }

      const { data, error } = await supabase
        .from('primary_assets')
        .insert(finalAsset)
        .select()
        .single();
      if (error) throw error;
      return data as PrimaryAsset;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['primary-assets'] });
      queryClient.invalidateQueries({ queryKey: ['process-assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset-inventory'] });
    },
  });
}

export function useUpdatePrimaryAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PrimaryAsset> & { id: string }) => {
      const { data, error } = await supabase
        .from('primary_assets')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as PrimaryAsset;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['primary-assets'] });
      queryClient.invalidateQueries({ queryKey: ['process-assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['primary-asset-with-children', data.id] });
    },
  });
}

export function useDeletePrimaryAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('primary_assets')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['primary-assets'] });
      queryClient.invalidateQueries({ queryKey: ['process-assets'] });
      queryClient.invalidateQueries({ queryKey: ['secondary-assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset-inventory'] });
    },
  });
}

// ============================================
// Secondary Assets
// ============================================

export function useSecondaryAssets() {
  return useQuery({
    queryKey: ['secondary-assets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('secondary_assets')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as SecondaryAsset[];
    },
  });
}

export function useCreateSecondaryAsset() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (asset: Omit<SecondaryAsset, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      // Default business_unit_id from profile if not specified
      const finalAsset = {
        ...asset,
        created_by: user?.id,
        business_unit_id: asset.business_unit_id || profile?.business_unit_id || null,
      };
      
      const { data, error } = await supabase
        .from('secondary_assets')
        .insert(finalAsset)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secondary-assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['ai-enabled-assets'] });
    },
  });
}

export function useUpdateSecondaryAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SecondaryAsset> & { id: string }) => {
      const { data, error } = await supabase
        .from('secondary_assets')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secondary-assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['ai-enabled-assets'] });
    },
  });
}

export function useDeleteSecondaryAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('secondary_assets')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secondary-assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['ai-enabled-assets'] });
    },
  });
}

// ============================================
// Process-Asset Links
// ============================================

export function useProcessPrimaryAssetLinks(processId?: string) {
  return useQuery({
    queryKey: ['process-primary-links', processId],
    queryFn: async () => {
      let query = supabase
        .from('process_primary_asset_links')
        .select('*');
      
      if (processId) {
        query = query.eq('process_id', processId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data as ProcessPrimaryAssetLink[];
    },
    enabled: processId !== '',
  });
}

export function useProcessSecondaryAssetLinks(processId?: string) {
  return useQuery({
    queryKey: ['process-secondary-links', processId],
    queryFn: async () => {
      let query = supabase
        .from('process_secondary_asset_links')
        .select('*');
      
      if (processId) {
        query = query.eq('process_id', processId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data as ProcessSecondaryAssetLink[];
    },
    enabled: processId !== '',
  });
}

export function useLinkedProcesses(assetId: string, assetType: 'PRIMARY' | 'SECONDARY') {
  return useQuery({
    queryKey: ['linked-processes', assetId, assetType],
    queryFn: async () => {
      if (assetType === 'PRIMARY') {
        const { data, error } = await supabase
          .from('process_primary_asset_links')
          .select('*')
          .eq('primary_asset_id', assetId);
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('process_secondary_asset_links')
          .select('*')
          .eq('secondary_asset_id', assetId);
        if (error) throw error;
        return data;
      }
    },
    enabled: !!assetId,
  });
}

export function useCreateProcessPrimaryLink() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (link: Omit<ProcessPrimaryAssetLink, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      const { data, error } = await supabase
        .from('process_primary_asset_links')
        .insert({ ...link, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['process-primary-links'] });
      queryClient.invalidateQueries({ queryKey: ['linked-processes'] });
      queryClient.invalidateQueries({ queryKey: ['asset-graph'] });
    },
  });
}

export function useCreateProcessSecondaryLink() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (link: Omit<ProcessSecondaryAssetLink, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      const { data, error } = await supabase
        .from('process_secondary_asset_links')
        .insert({ ...link, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['process-secondary-links'] });
      queryClient.invalidateQueries({ queryKey: ['linked-processes'] });
      queryClient.invalidateQueries({ queryKey: ['asset-graph'] });
    },
  });
}

export function useDeleteProcessPrimaryLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('process_primary_asset_links')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['process-primary-links'] });
      queryClient.invalidateQueries({ queryKey: ['linked-processes'] });
      queryClient.invalidateQueries({ queryKey: ['asset-graph'] });
    },
  });
}

export function useDeleteProcessSecondaryLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('process_secondary_asset_links')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['process-secondary-links'] });
      queryClient.invalidateQueries({ queryKey: ['linked-processes'] });
      queryClient.invalidateQueries({ queryKey: ['asset-graph'] });
    },
  });
}

// ============================================
// Asset Relationships (Data Flow Graph)
// ============================================

export function useAssetRelationships(businessUnitId?: string) {
  return useQuery({
    queryKey: ['asset-relationships', businessUnitId],
    queryFn: async () => {
      let query = supabase
        .from('asset_relationships')
        .select('*');
      
      if (businessUnitId) {
        query = query.eq('business_unit_id', businessUnitId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data as AssetRelationship[];
    },
  });
}

export function useCreateAssetRelationship() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (rel: Omit<AssetRelationship, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      const { data, error } = await supabase
        .from('asset_relationships')
        .insert({ ...rel, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-relationships'] });
      queryClient.invalidateQueries({ queryKey: ['asset-graph'] });
    },
  });
}

export function useDeleteAssetRelationship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('asset_relationships')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-relationships'] });
      queryClient.invalidateQueries({ queryKey: ['asset-graph'] });
    },
  });
}

// ============================================
// Unified Asset Inventory
// ============================================

export function useAssetInventory() {
  const { data: primaryAssets = [] } = usePrimaryAssets();
  const { data: secondaryAssets = [] } = useSecondaryAssets();

  const inventory: AssetInventoryItem[] = [
    ...primaryAssets.map(pa => ({
      id: pa.id,
      asset_id: pa.asset_id,
      name: pa.name,
      description: pa.description,
      entity_type: 'PRIMARY' as const,
      asset_kind: pa.asset_kind,
      process_level: pa.process_level,
      primary_type: pa.primary_type,
      criticality: pa.criticality,
      owner_id: pa.owner_id,
      business_unit_id: pa.business_unit_id,
      business_unit_name: pa.business_units?.name || null,
      confidentiality_level_id: pa.confidentiality_level_id,
      updated_at: pa.updated_at,
    })),
    ...secondaryAssets.map(sa => ({
      id: sa.id,
      asset_id: sa.asset_id,
      name: sa.name,
      description: sa.description,
      entity_type: 'SECONDARY' as const,
      asset_kind: null,
      process_level: null,
      secondary_type: sa.secondary_type,
      criticality: sa.effective_criticality,
      owner_id: sa.owner_id,
      business_unit_id: sa.business_unit_id,
      updated_at: sa.updated_at,
    })),
  ];

  return {
    data: inventory,
    isLoading: false,
  };
}

// ============================================
// Graph Data for Visualization
// ============================================

export interface GraphNode {
  id: string;
  type: 'process-l1' | 'process-l2' | 'process-l3' | 'primary-asset' | 'secondary-asset';
  label: string;
  entityType: 'PRIMARY' | 'SECONDARY';
  entityId: string;
  businessUnitId: string | null;
  metadata: {
    assetId: string;
    criticality?: string | null;
    processLevel?: ProcessLevel | null;
    secondaryType?: SecondaryType;
  };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'hierarchy' | 'process-link' | 'data-flow' | 'relationship' | 'secondary-link';
  label?: string;
  metadata?: {
    linkType?: string;
    dataFlowLabel?: string;
  };
}

export function useAssetGraphData(businessUnitId?: string | null) {
  const { data: primaryAssets = [] } = usePrimaryAssets();
  const { data: secondaryAssets = [] } = useSecondaryAssets();
  const { data: primaryLinks = [] } = useProcessPrimaryAssetLinks();
  const { data: secondaryLinks = [] } = useProcessSecondaryAssetLinks();
  const { data: relationships = [] } = useAssetRelationships(businessUnitId || undefined);

  return useMemo(() => {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // Filter by business unit if provided
    const filteredPrimary = businessUnitId 
      ? primaryAssets.filter(pa => pa.business_unit_id === businessUnitId)
      : primaryAssets;
    
    const filteredSecondary = businessUnitId
      ? secondaryAssets.filter(sa => sa.business_unit_id === businessUnitId)
      : secondaryAssets;

    // Create nodes for primary assets
    filteredPrimary.forEach(pa => {
      let nodeType: GraphNode['type'] = 'primary-asset';
      if (pa.asset_kind === 'process') {
        nodeType = pa.process_level === 'L1' ? 'process-l1' 
          : pa.process_level === 'L2' ? 'process-l2' 
          : 'process-l3';
      }

      nodes.push({
        id: `primary-${pa.id}`,
        type: nodeType,
        label: pa.name,
        entityType: 'PRIMARY',
        entityId: pa.id,
        businessUnitId: pa.business_unit_id,
        metadata: {
          assetId: pa.asset_id,
          criticality: pa.criticality,
          processLevel: pa.process_level,
        },
      });
    });

    // Create nodes for secondary assets
    filteredSecondary.forEach(sa => {
      nodes.push({
        id: `secondary-${sa.id}`,
        type: 'secondary-asset',
        label: sa.name,
        entityType: 'SECONDARY',
        entityId: sa.id,
        businessUnitId: sa.business_unit_id,
        metadata: {
          assetId: sa.asset_id,
          criticality: sa.effective_criticality,
          secondaryType: sa.secondary_type,
        },
      });
    });

    // Create a set of valid node IDs for edge validation
    const validNodeIds = new Set(nodes.map(n => n.id));

    // Add edges for secondary assets linked to primary assets (dotted lines)
    filteredSecondary.forEach(sa => {
      if (sa.primary_asset_id) {
        const sourceId = `primary-${sa.primary_asset_id}`;
        const targetId = `secondary-${sa.id}`;
        if (validNodeIds.has(sourceId) && validNodeIds.has(targetId)) {
          edges.push({
            id: `sec-primary-${sa.id}`,
            source: sourceId,
            target: targetId,
            type: 'secondary-link',
            label: 'supports',
            metadata: { linkType: 'SECONDARY_PARENT' },
          });
        }
      }
    });

    // Add hierarchy edges (only if both nodes exist)
    filteredPrimary.forEach(pa => {
      if (pa.parent_primary_asset_id) {
        const sourceId = `primary-${pa.parent_primary_asset_id}`;
        const targetId = `primary-${pa.id}`;
        if (validNodeIds.has(sourceId) && validNodeIds.has(targetId)) {
          edges.push({
            id: `hierarchy-${pa.id}`,
            source: sourceId,
            target: targetId,
            type: 'hierarchy',
            label: 'contains',
          });
        }
      }
    });

    // Add process-primary links (validate nodes exist)
    primaryLinks.forEach(link => {
      const sourceId = `primary-${link.process_id}`;
      const targetId = `primary-${link.primary_asset_id}`;
      if (validNodeIds.has(sourceId) && validNodeIds.has(targetId)) {
        edges.push({
          id: `plink-${link.id}`,
          source: sourceId,
          target: targetId,
          type: 'process-link',
          label: link.link_type,
          metadata: { linkType: link.link_type },
        });
      }
    });

    // Add process-secondary links (validate nodes exist)
    secondaryLinks.forEach(link => {
      const sourceId = `primary-${link.process_id}`;
      const targetId = `secondary-${link.secondary_asset_id}`;
      if (validNodeIds.has(sourceId) && validNodeIds.has(targetId)) {
        edges.push({
          id: `slink-${link.id}`,
          source: sourceId,
          target: targetId,
          type: 'process-link',
          label: link.link_type,
          metadata: { linkType: link.link_type },
        });
      }
    });

    // Add data flow and tagged relationships
    relationships.forEach(rel => {
      const sourcePrefix = rel.from_entity_type === 'PRIMARY' ? 'primary' : 'secondary';
      const targetPrefix = rel.to_entity_type === 'PRIMARY' ? 'primary' : 'secondary';
      
      const sourceId = `${sourcePrefix}-${rel.from_entity_id}`;
      const targetId = `${targetPrefix}-${rel.to_entity_id}`;
      
      // Only add edge if both source and target nodes exist in the graph
      if (validNodeIds.has(sourceId) && validNodeIds.has(targetId)) {
        edges.push({
          id: `rel-${rel.id}`,
          source: sourceId,
          target: targetId,
          type: rel.relationship_type === 'DATA_FLOW' ? 'data-flow' : 'relationship',
          label: rel.relationship_type === 'TAGGED' ? 'linked' : (rel.data_flow_label || rel.relationship_type),
          metadata: {
            linkType: rel.relationship_type,
            dataFlowLabel: rel.data_flow_label || undefined,
          },
        });
      }
    });

    return { nodes, edges };
  }, [primaryAssets, secondaryAssets, primaryLinks, secondaryLinks, relationships, businessUnitId]);
}

// ============================================
// Helper Functions
// ============================================

export function generateAssetId(type: string, existingAssets: { asset_id: string }[]) {
  let prefix = 'sa-';
  if (type === 'Data') prefix = 'pd-';
  else if (type === 'Process') prefix = 'pp-';
  else if (type === 'IT Service') prefix = 'ss-';
  else if (type === 'Location') prefix = 'sl-';
  else if (type === 'Personnel') prefix = 'sp-';
  else if (type === 'Application') prefix = 'sa-';

  const existing = existingAssets.filter(a => a.asset_id?.startsWith(prefix));
  const numbers = existing.map(a => {
    const match = a.asset_id?.match(new RegExp(`${prefix.replace('-', '\\-')}(\\d+)`));
    return match ? parseInt(match[1]) : 0;
  });
  const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
  return `${prefix}${maxNum + 1}`;
}

export function formatHours(hours: number | null | undefined): string {
  if (hours === null || hours === undefined) return 'N/A';
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours >= 24) return `${Math.round(hours / 24)} days`;
  return `${hours} hrs`;
}

export function getValidParentLevels(level: ProcessLevel | null): ProcessLevel[] {
  if (!level) return [];
  if (level === 'L2') return ['L1'];
  if (level === 'L3') return ['L2'];
  return [];
}

export function getValidChildLevels(level: ProcessLevel | null): ProcessLevel[] {
  if (!level) return [];
  if (level === 'L1') return ['L2'];
  if (level === 'L2') return ['L3'];
  return [];
}