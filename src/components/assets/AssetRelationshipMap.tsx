import React, { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  MarkerType,
  Panel,
  NodeTypes,
  Handle,
  Position,
  ConnectionLineType,
  type ColorMode,
} from '@xyflow/react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  GitBranch, Database, Server, 
  Filter, RefreshCw, ChevronDown, ChevronRight, Minus, Plus, Layers
} from 'lucide-react';
import { useAssetGraphData } from '@/hooks/useAssets';
import { useBusinessUnits } from '@/hooks/useBusinessUnits';

interface EmbeddedDataAsset {
  id: string;
  label: string;
  criticality?: string;
}

interface EmbeddedSecondaryAsset {
  id: string;
  label: string;
  secondaryType?: string;
}

interface CollapsibleNodeData {
  label: string;
  assetId?: string;
  criticality?: string;
  secondaryType?: string;
  childCount?: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  embeddedDataAssets?: EmbeddedDataAsset[];
  embeddedSecondaryAssets?: EmbeddedSecondaryAsset[];
}

// Custom node components with clean solid design
const ProcessL1Node = ({ data }: { data: CollapsibleNodeData }) => {
  const hasEmbeddedData = data.embeddedDataAssets && data.embeddedDataAssets.length > 0;
  const hasEmbeddedSecondary = data.embeddedSecondaryAssets && data.embeddedSecondaryAssets.length > 0;
  const hasEmbedded = hasEmbeddedData || hasEmbeddedSecondary;
  const hasChildren = typeof data.childCount === 'number' && data.childCount > 0;
  
  return (
    <div className={`px-5 py-4 rounded-xl border-2 border-primary bg-card shadow-md ${hasEmbedded ? 'min-w-[220px]' : 'min-w-[180px]'}`}>
      <Handle id="t" type="target" position={Position.Top} className="!w-3 !h-3 !bg-primary !border-2 !border-background rounded-full !-top-1.5" />
      <Handle id="s" type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-primary !border-2 !border-background rounded-full !-bottom-1.5" />
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Layers className="w-4 h-4 text-primary" />
          </div>
          <Badge className="bg-primary text-primary-foreground font-semibold text-xs px-2">L1</Badge>
        </div>
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              data.onToggleCollapse?.();
            }}
            className="p-1.5 hover:bg-muted rounded-lg transition-colors"
          >
            {data.isCollapsed ? (
              <Plus className="w-3.5 h-3.5 text-primary" />
            ) : (
              <Minus className="w-3.5 h-3.5 text-primary" />
            )}
          </button>
        )}
      </div>
      <p className="font-bold text-sm text-foreground">{data.label}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{data.assetId}</p>
      
      {/* Embedded data assets */}
      {hasEmbeddedData && (
        <div className="mt-3 pt-2 border-t border-border space-y-1.5">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Database className="w-3 h-3" />
            <span>Linked Data Assets</span>
          </div>
          {data.embeddedDataAssets!.slice(0, 4).map((asset) => (
            <div 
              key={asset.id}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-accent/10 border border-accent/30"
            >
              <Database className="w-2.5 h-2.5 text-accent" />
              <span className="text-[10px] font-medium text-foreground truncate max-w-[140px]">
                {asset.label}
              </span>
            </div>
          ))}
          {data.embeddedDataAssets!.length > 4 && (
            <Badge variant="secondary" className="text-[9px]">
              +{data.embeddedDataAssets!.length - 4} more
            </Badge>
          )}
        </div>
      )}
      
      {/* Embedded secondary assets */}
      {hasEmbeddedSecondary && (
        <div className={`mt-3 pt-2 ${hasEmbeddedData ? '' : 'border-t border-border'} space-y-1.5`}>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Server className="w-3 h-3" />
            <span>Supporting Assets</span>
          </div>
          {data.embeddedSecondaryAssets!.slice(0, 4).map((asset) => (
            <div 
              key={asset.id}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 border border-border"
            >
              <Server className="w-2.5 h-2.5 text-muted-foreground" />
              <span className="text-[10px] font-medium text-foreground truncate max-w-[140px]">
                {asset.label}
              </span>
            </div>
          ))}
          {data.embeddedSecondaryAssets!.length > 4 && (
            <Badge variant="secondary" className="text-[9px]">
              +{data.embeddedSecondaryAssets!.length - 4} more
            </Badge>
          )}
        </div>
      )}
      
      {data.isCollapsed && hasChildren && (
        <Badge variant="secondary" className="mt-2 text-xs">
          {data.childCount} hidden
        </Badge>
      )}
    </div>
  );
};

const ProcessL2Node = ({ data }: { data: CollapsibleNodeData }) => {
  const hasEmbeddedData = data.embeddedDataAssets && data.embeddedDataAssets.length > 0;
  const hasEmbeddedSecondary = data.embeddedSecondaryAssets && data.embeddedSecondaryAssets.length > 0;
  const hasEmbedded = hasEmbeddedData || hasEmbeddedSecondary;
  const hasChildren = typeof data.childCount === 'number' && data.childCount > 0;
  
  return (
    <div className={`px-5 py-4 rounded-xl border-2 border-info bg-card shadow-md ${hasEmbedded ? 'min-w-[220px]' : 'min-w-[170px]'}`}>
      <Handle id="t" type="target" position={Position.Top} className="!w-3 !h-3 !bg-info !border-2 !border-background rounded-full !-top-1.5" />
      <Handle id="s" type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-info !border-2 !border-background rounded-full !-bottom-1.5" />
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-info/10">
            <GitBranch className="w-4 h-4 text-info" />
          </div>
          <Badge className="bg-info text-info-foreground font-semibold text-xs px-2">L2</Badge>
        </div>
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              data.onToggleCollapse?.();
            }}
            className="p-1.5 hover:bg-muted rounded-lg transition-colors"
          >
            {data.isCollapsed ? (
              <Plus className="w-3.5 h-3.5 text-info" />
            ) : (
              <Minus className="w-3.5 h-3.5 text-info" />
            )}
          </button>
        )}
      </div>
      <p className="font-bold text-sm text-foreground">{data.label}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{data.assetId}</p>
      
      {/* Embedded data assets */}
      {hasEmbeddedData && (
        <div className="mt-3 pt-2 border-t border-border space-y-1.5">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Database className="w-3 h-3" />
            <span>Linked Data Assets</span>
          </div>
          {data.embeddedDataAssets!.slice(0, 4).map((asset) => (
            <div 
              key={asset.id}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-accent/10 border border-accent/30"
            >
              <Database className="w-2.5 h-2.5 text-accent" />
              <span className="text-[10px] font-medium text-foreground truncate max-w-[140px]">
                {asset.label}
              </span>
            </div>
          ))}
          {data.embeddedDataAssets!.length > 4 && (
            <Badge variant="secondary" className="text-[9px]">
              +{data.embeddedDataAssets!.length - 4} more
            </Badge>
          )}
        </div>
      )}
      
      {/* Embedded secondary assets */}
      {hasEmbeddedSecondary && (
        <div className={`mt-3 pt-2 ${hasEmbeddedData ? '' : 'border-t border-border'} space-y-1.5`}>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Server className="w-3 h-3" />
            <span>Supporting Assets</span>
          </div>
          {data.embeddedSecondaryAssets!.slice(0, 4).map((asset) => (
            <div 
              key={asset.id}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 border border-border"
            >
              <Server className="w-2.5 h-2.5 text-muted-foreground" />
              <span className="text-[10px] font-medium text-foreground truncate max-w-[140px]">
                {asset.label}
              </span>
            </div>
          ))}
          {data.embeddedSecondaryAssets!.length > 4 && (
            <Badge variant="secondary" className="text-[9px]">
              +{data.embeddedSecondaryAssets!.length - 4} more
            </Badge>
          )}
        </div>
      )}
      
      {data.isCollapsed && hasChildren && (
        <Badge variant="secondary" className="mt-2 text-xs">
          {data.childCount} hidden
        </Badge>
      )}
    </div>
  );
};

const ProcessL3Node = ({ data }: { data: CollapsibleNodeData }) => {
  const hasEmbeddedData = data.embeddedDataAssets && data.embeddedDataAssets.length > 0;
  const hasEmbeddedSecondary = data.embeddedSecondaryAssets && data.embeddedSecondaryAssets.length > 0;
  const hasEmbedded = hasEmbeddedData || hasEmbeddedSecondary;
  const hasChildren = typeof data.childCount === 'number' && data.childCount > 0;
  
  return (
    <div className={`px-5 py-4 rounded-xl border-2 border-chart-4 bg-card shadow-md ${hasEmbedded ? 'min-w-[220px]' : 'min-w-[160px]'}`}>
      <Handle id="t" type="target" position={Position.Top} className="!w-3 !h-3 !bg-chart-4 !border-2 !border-background rounded-full !-top-1.5" />
      <Handle id="s" type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-chart-4 !border-2 !border-background rounded-full !-bottom-1.5" />
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-chart-4/10">
            <GitBranch className="w-4 h-4 text-chart-4" />
          </div>
          <Badge className="bg-chart-4 text-foreground font-semibold text-xs px-2">L3</Badge>
        </div>
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              data.onToggleCollapse?.();
            }}
            className="p-1.5 hover:bg-muted rounded-lg transition-colors"
          >
            {data.isCollapsed ? (
              <Plus className="w-3.5 h-3.5 text-chart-4" />
            ) : (
              <Minus className="w-3.5 h-3.5 text-chart-4" />
            )}
          </button>
        )}
      </div>
      <p className="font-bold text-sm text-foreground">{data.label}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{data.assetId}</p>
      
      {/* Embedded data assets */}
      {hasEmbeddedData && (
        <div className="mt-3 pt-2 border-t border-border space-y-1.5">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Database className="w-3 h-3" />
            <span>Linked Data Assets</span>
          </div>
          {data.embeddedDataAssets!.slice(0, 4).map((asset) => (
            <div 
              key={asset.id}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-accent/10 border border-accent/30"
            >
              <Database className="w-2.5 h-2.5 text-accent" />
              <span className="text-[10px] font-medium text-foreground truncate max-w-[140px]">
                {asset.label}
              </span>
            </div>
          ))}
          {data.embeddedDataAssets!.length > 4 && (
            <Badge variant="secondary" className="text-[9px]">
              +{data.embeddedDataAssets!.length - 4} more
            </Badge>
          )}
        </div>
      )}
      
      {/* Embedded secondary assets */}
      {hasEmbeddedSecondary && (
        <div className={`mt-3 pt-2 ${hasEmbeddedData ? '' : 'border-t border-border'} space-y-1.5`}>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Server className="w-3 h-3" />
            <span>Supporting Assets</span>
          </div>
          {data.embeddedSecondaryAssets!.slice(0, 4).map((asset) => (
            <div 
              key={asset.id}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 border border-border"
            >
              <Server className="w-2.5 h-2.5 text-muted-foreground" />
              <span className="text-[10px] font-medium text-foreground truncate max-w-[140px]">
                {asset.label}
              </span>
            </div>
          ))}
          {data.embeddedSecondaryAssets!.length > 4 && (
            <Badge variant="secondary" className="text-[9px]">
              +{data.embeddedSecondaryAssets!.length - 4} more
            </Badge>
          )}
        </div>
      )}
      
      {data.isCollapsed && hasChildren && (
        <Badge variant="secondary" className="mt-2 text-xs">
          {data.childCount} hidden
        </Badge>
      )}
    </div>
  );
};

const PrimaryAssetNode = ({ data }: { data: CollapsibleNodeData }) => {
  const hasEmbeddedSecondary = data.embeddedSecondaryAssets && data.embeddedSecondaryAssets.length > 0;
  const hasChildren = typeof data.childCount === 'number' && data.childCount > 0;
  
  return (
    <div className={`px-4 py-3 rounded-xl border-2 border-accent bg-card shadow-md ${hasEmbeddedSecondary ? 'min-w-[200px]' : 'min-w-[140px]'}`}>
      <Handle id="t" type="target" position={Position.Top} className="!w-2.5 !h-2.5 !bg-accent !border-2 !border-background rounded-full !-top-1.5" />
      <Handle id="s" type="source" position={Position.Bottom} className="!w-2.5 !h-2.5 !bg-accent !border-2 !border-background rounded-full !-bottom-1.5" />
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-accent/10">
            <Database className="w-3.5 h-3.5 text-accent" />
          </div>
          <span className="text-xs font-semibold text-accent">Data</span>
        </div>
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              data.onToggleCollapse?.();
            }}
            className="p-1 hover:bg-muted rounded-md transition-colors"
          >
            {data.isCollapsed ? (
              <Plus className="w-3 h-3 text-accent" />
            ) : (
              <Minus className="w-3 h-3 text-accent" />
            )}
          </button>
        )}
      </div>
      <p className="font-bold text-xs text-foreground">{data.label}</p>
      {data.criticality && (
        <Badge variant="outline" className="text-[10px] mt-1.5 border-accent/50 text-accent">{data.criticality}</Badge>
      )}
      
      {/* Embedded secondary assets */}
      {hasEmbeddedSecondary && (
        <div className="mt-2 pt-2 border-t border-border space-y-1">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Server className="w-3 h-3" />
            <span>Supporting Assets</span>
          </div>
          {data.embeddedSecondaryAssets!.slice(0, 4).map((asset) => (
            <div 
              key={asset.id}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 border border-border"
            >
              <Server className="w-2.5 h-2.5 text-muted-foreground" />
              <span className="text-[10px] font-medium text-foreground truncate max-w-[130px]">
                {asset.label}
              </span>
            </div>
          ))}
          {data.embeddedSecondaryAssets!.length > 4 && (
            <Badge variant="secondary" className="text-[9px]">
              +{data.embeddedSecondaryAssets!.length - 4} more
            </Badge>
          )}
        </div>
      )}
      
      {data.isCollapsed && hasChildren && (
        <Badge variant="secondary" className="mt-1.5 text-[10px]">
          +{data.childCount}
        </Badge>
      )}
    </div>
  );
};

const SecondaryAssetNode = ({ data }: { data: CollapsibleNodeData }) => {
  const hasChildren = typeof data.childCount === 'number' && data.childCount > 0;
  
  return (
    <div className="px-3 py-2.5 rounded-lg border border-border bg-card min-w-[110px] shadow-sm">
      <Handle id="t" type="target" position={Position.Top} className="!w-2 !h-2 !bg-muted-foreground !border !border-background rounded-full !-top-1" />
      <Handle id="s" type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-muted-foreground !border !border-background rounded-full !-bottom-1" />
      <div className="flex items-center justify-between gap-1.5 mb-1">
        <div className="flex items-center gap-1.5">
          <Server className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground font-medium">{data.secondaryType || 'Secondary'}</span>
        </div>
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              data.onToggleCollapse?.();
            }}
            className="p-0.5 hover:bg-muted rounded transition-colors"
          >
            {data.isCollapsed ? (
              <Plus className="w-2.5 h-2.5 text-muted-foreground" />
            ) : (
              <Minus className="w-2.5 h-2.5 text-muted-foreground" />
            )}
          </button>
        )}
      </div>
      <p className="font-semibold text-xs text-foreground">{data.label}</p>
      {data.isCollapsed && hasChildren && (
        <Badge variant="secondary" className="mt-1 text-[9px]">
          +{data.childCount}
        </Badge>
      )}
    </div>
  );
};

const nodeTypes: NodeTypes = {
  'process-l1': ProcessL1Node,
  'process-l2': ProcessL2Node,
  'process-l3': ProcessL3Node,
  'primary-asset': PrimaryAssetNode,
  'secondary-asset': SecondaryAssetNode,
};

type ThemeHsl = {
  backgroundRaw: string;
  foregroundRaw: string;
  background: string;
  foreground: string;
  mutedForeground: string;
  border: string;
  card: string;
  primary: string;
  info: string;
  accent: string;
  chart4: string;
  warning: string;
  minimapMask: string;
  labelBg: string;
};

const readCssVar = (name: string) => {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
};

const hslFromRaw = (raw: string, alpha?: number) => {
  if (!raw) return "";
  return alpha == null ? `hsl(${raw})` : `hsl(${raw} / ${alpha})`;
};

const useDocumentIsLight = () => {
  const [isLight, setIsLight] = useState(false);

  React.useEffect(() => {
    const el = document.documentElement;
    const update = () => setIsLight(el.classList.contains("light"));

    update();

    const obs = new MutationObserver(update);
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  return isLight;
};

const AssetRelationshipMap: React.FC = () => {
  const { data: businessUnits = [] } = useBusinessUnits();
  const isLight = useDocumentIsLight();
  const [selectedBU, setSelectedBU] = useState<string>('');
  const [showSecondary, setShowSecondary] = useState(true);
  const [embedDataInProcess, setEmbedDataInProcess] = useState(true);
  const [embedSecondaryInProcess, setEmbedSecondaryInProcess] = useState(true);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [hasInitializedCollapsed, setHasInitializedCollapsed] = useState(false);
  
  const { nodes: graphNodes, edges: graphEdges } = useAssetGraphData(selectedBU || null);

  // Compute real HSL strings from CSS variables (canvas/SVG can't interpret CSS var() strings)
  const themeHsl = useMemo<ThemeHsl>(() => {
    const backgroundRaw = readCssVar('--background');
    const foregroundRaw = readCssVar('--foreground');
    const mutedForegroundRaw = readCssVar('--muted-foreground');
    const cardRaw = readCssVar('--card');
    const borderRaw = readCssVar('--border');
    const primaryRaw = readCssVar('--primary');
    const infoRaw = readCssVar('--info');
    const accentRaw = readCssVar('--accent');
    const chart4Raw = readCssVar('--chart-4');
    const warningRaw = readCssVar('--warning');

    return {
      backgroundRaw,
      foregroundRaw,
      background: hslFromRaw(backgroundRaw),
      foreground: hslFromRaw(foregroundRaw),
      mutedForeground: hslFromRaw(mutedForegroundRaw),
      card: hslFromRaw(cardRaw),
      border: hslFromRaw(borderRaw),
      primary: hslFromRaw(primaryRaw),
      info: hslFromRaw(infoRaw),
      accent: hslFromRaw(accentRaw),
      chart4: hslFromRaw(chart4Raw),
      warning: hslFromRaw(warningRaw),
      minimapMask: hslFromRaw(backgroundRaw, 0.85),
      labelBg: hslFromRaw(backgroundRaw, 0.95),
    };
  }, [isLight]);

  React.useEffect(() => {
    // Debug: verify computed theme vars actually change when toggling
    // (This will show up in console logs in Lovable preview)
    console.log("[AssetRelationshipMap] theme", {
      htmlClass: document.documentElement.className,
      isLight,
      backgroundRaw: themeHsl.backgroundRaw,
      background: themeHsl.background,
    });
  }, [isLight, themeHsl.backgroundRaw]);

  // Build parent-child relationships
  const childrenMap = useMemo(() => {
    const map = new Map<string, string[]>();
    graphEdges.forEach(edge => {
      if (edge.type === 'hierarchy' || edge.type === 'secondary-link') {
        const children = map.get(edge.source) || [];
        children.push(edge.target);
        map.set(edge.source, children);
      }
    });
    return map;
  }, [graphEdges]);

  // Initialize collapsed state to collapse all nodes with children by default
  React.useEffect(() => {
    if (!hasInitializedCollapsed && childrenMap.size > 0) {
      const nodesWithChildren = new Set<string>();
      childrenMap.forEach((children, parentId) => {
        if (children.length > 0) {
          nodesWithChildren.add(parentId);
        }
      });
      setCollapsedNodes(nodesWithChildren);
      setHasInitializedCollapsed(true);
    }
  }, [childrenMap, hasInitializedCollapsed]);

  // Map primary data assets to their linked process nodes
  // A data asset (primary_type = 'Data', asset_kind = 'asset') can be linked to a process via:
  // 1. process-link edges (from process_primary_asset_links table)
  // 2. relationship edges with type 'TAGGED' or other relationship types
  const dataAssetToProcessMap = useMemo(() => {
    const map = new Map<string, string>(); // dataNodeId -> processNodeId
    
    // Find all process node IDs (L1, L2, L3)
    const processNodeIds = new Set(
      graphNodes
        .filter(n => n.type === 'process-l1' || n.type === 'process-l2' || n.type === 'process-l3')
        .map(n => n.id)
    );
    
    // Find all data asset node IDs (primary-asset nodes that aren't processes)
    const dataAssetNodeIds = new Set(
      graphNodes
        .filter(n => n.type === 'primary-asset')
        .map(n => n.id)
    );
    
    // Check all edges to find links between data assets and processes
    graphEdges.forEach(edge => {
      // process-link: source is process, target is data asset
      if (edge.type === 'process-link') {
        if (processNodeIds.has(edge.source) && dataAssetNodeIds.has(edge.target)) {
          map.set(edge.target, edge.source);
        }
      }
      // relationship edge (like TAGGED): could link data to process
      if (edge.type === 'relationship') {
        if (processNodeIds.has(edge.source) && dataAssetNodeIds.has(edge.target)) {
          map.set(edge.target, edge.source);
        } else if (processNodeIds.has(edge.target) && dataAssetNodeIds.has(edge.source)) {
          map.set(edge.source, edge.target);
        }
      }
    });
    
    return map;
  }, [graphEdges, graphNodes]);

  // Map secondary assets to their parent process nodes
  // Secondary assets can be linked to processes via:
  // 1. process-link edges (from process_secondary_asset_links table)
  // 2. relationship edges (from asset_relationships table)
  const secondaryToProcessMap = useMemo(() => {
    const map = new Map<string, string>(); // secondaryNodeId -> processNodeId
    
    // Find all process node IDs (L1, L2, L3)
    const processNodeIds = new Set(
      graphNodes
        .filter(n => n.type === 'process-l1' || n.type === 'process-l2' || n.type === 'process-l3')
        .map(n => n.id)
    );
    
    // Find all secondary asset node IDs
    const secondaryAssetIds = new Set(
      graphNodes
        .filter(n => n.type === 'secondary-asset')
        .map(n => n.id)
    );
    
    // Check all edges to find links between secondary assets and processes
    graphEdges.forEach(edge => {
      // process-link: source is process, target is secondary asset
      if (edge.type === 'process-link') {
        if (processNodeIds.has(edge.source) && secondaryAssetIds.has(edge.target)) {
          map.set(edge.target, edge.source);
        }
      }
      // relationship edge: could link secondary to process
      if (edge.type === 'relationship') {
        if (processNodeIds.has(edge.source) && secondaryAssetIds.has(edge.target)) {
          map.set(edge.target, edge.source);
        } else if (processNodeIds.has(edge.target) && secondaryAssetIds.has(edge.source)) {
          map.set(edge.source, edge.target);
        }
      }
    });
    
    return map;
  }, [graphEdges, graphNodes]);

  // Get all descendant nodes of a collapsed node
  const getDescendants = useCallback((nodeId: string, visited = new Set<string>()): Set<string> => {
    const descendants = new Set<string>();
    if (visited.has(nodeId)) return descendants;
    visited.add(nodeId);
    
    const children = childrenMap.get(nodeId) || [];
    children.forEach(childId => {
      descendants.add(childId);
      const childDescendants = getDescendants(childId, visited);
      childDescendants.forEach(d => descendants.add(d));
    });
    return descendants;
  }, [childrenMap]);

  // Get all hidden nodes based on collapsed parents
  const hiddenNodes = useMemo(() => {
    const hidden = new Set<string>();
    collapsedNodes.forEach(nodeId => {
      const descendants = getDescendants(nodeId);
      descendants.forEach(d => hidden.add(d));
    });
    return hidden;
  }, [collapsedNodes, getDescendants]);

  const toggleCollapse = useCallback((nodeId: string) => {
    setCollapsedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Convert graph data to ReactFlow format with hierarchical layout
  const initialNodes: Node[] = useMemo(() => {
    // Build embedded data assets map (process node -> data assets)
    const embeddedDataAssetsMap = new Map<string, EmbeddedDataAsset[]>();
    if (embedDataInProcess) {
      graphNodes
        .filter(n => n.type === 'primary-asset')
        .forEach(dataAsset => {
          const processId = dataAssetToProcessMap.get(dataAsset.id);
          if (processId) {
            const list = embeddedDataAssetsMap.get(processId) || [];
            list.push({
              id: dataAsset.id,
              label: dataAsset.label,
              criticality: dataAsset.metadata.criticality,
            });
            embeddedDataAssetsMap.set(processId, list);
          }
        });
    }

    // Build embedded secondary assets map (process node -> secondary assets)
    const embeddedSecondaryAssetsMap = new Map<string, EmbeddedSecondaryAsset[]>();
    if (showSecondary && embedSecondaryInProcess) {
      graphNodes
        .filter(n => n.type === 'secondary-asset')
        .forEach(secondaryAsset => {
          const processId = secondaryToProcessMap.get(secondaryAsset.id);
          if (processId) {
            const list = embeddedSecondaryAssetsMap.get(processId) || [];
            list.push({
              id: secondaryAsset.id,
              label: secondaryAsset.label,
              secondaryType: secondaryAsset.metadata.secondaryType,
            });
            embeddedSecondaryAssetsMap.set(processId, list);
          }
        });
    }

    // Filter nodes based on settings and collapse state
    let filteredNodes = graphNodes.filter(n => !hiddenNodes.has(n.id));
    
    // Hide primary assets (data) if embedding them in process
    if (embedDataInProcess) {
      filteredNodes = filteredNodes.filter(n => {
        if (n.type === 'primary-asset') {
          return !dataAssetToProcessMap.has(n.id); // Only show orphan data assets
        }
        return true;
      });
    }
    
    // Hide secondary assets if not showing them, or if embedding them in process
    if (!showSecondary) {
      filteredNodes = filteredNodes.filter(n => n.type !== 'secondary-asset');
    } else if (embedSecondaryInProcess) {
      filteredNodes = filteredNodes.filter(n => {
        if (n.type === 'secondary-asset') {
          return !secondaryToProcessMap.has(n.id); // Only show orphan secondary assets
        }
        return true;
      });
    }

    // Group nodes by parent for hierarchical layout
    const l1Nodes = filteredNodes.filter(n => n.type === 'process-l1');
    const l2Nodes = filteredNodes.filter(n => n.type === 'process-l2');
    const l3Nodes = filteredNodes.filter(n => n.type === 'process-l3');
    const primaryNodes = filteredNodes.filter(n => n.type === 'primary-asset');
    const secondaryNodes = filteredNodes.filter(n => n.type === 'secondary-asset');

    // Find parent for each node
    const parentMap = new Map<string, string>();
    graphEdges.forEach(edge => {
      if (edge.type === 'hierarchy' || edge.type === 'secondary-link') {
        parentMap.set(edge.target, edge.source);
      }
    });

    let result: Node[] = [];
    
    // Layout configuration - more spacing
    const nodeWidth = 220;
    const levelGap = 180;
    const siblingGap = 60;

    // Helper to position children under parent
    const positionHierarchically = (
      nodeList: typeof graphNodes,
      yLevel: number,
      parentPositions: Map<string, { x: number; width: number }>
    ) => {
      // Group by parent
      const byParent = new Map<string, typeof nodeList>();
      nodeList.forEach(node => {
        const parent = parentMap.get(node.id) || '__root__';
        const list = byParent.get(parent) || [];
        list.push(node);
        byParent.set(parent, list);
      });

      const newPositions = new Map<string, { x: number; width: number }>();
      let xOffset = 0;

      // First, position orphans (no parent or parent not visible)
      const orphans = byParent.get('__root__') || [];
      byParent.delete('__root__');

      // Position children under their parents
      Array.from(byParent.entries()).forEach(([parentId, children]) => {
        const parentPos = parentPositions.get(parentId);
        if (parentPos) {
          const totalWidth = children.length * (nodeWidth + siblingGap) - siblingGap;
          const startX = parentPos.x + (parentPos.width / 2) - (totalWidth / 2);
          
          children.forEach((node, i) => {
            const x = startX + i * (nodeWidth + siblingGap);
            result.push({
              id: node.id,
              type: node.type,
              position: { x, y: yLevel },
              data: {
                label: node.label,
                assetId: node.metadata.assetId,
                criticality: node.metadata.criticality,
                secondaryType: node.metadata.secondaryType,
                childCount: childrenMap.get(node.id)?.length || 0,
                isCollapsed: collapsedNodes.has(node.id),
                onToggleCollapse: () => toggleCollapse(node.id),
                embeddedDataAssets: embeddedDataAssetsMap.get(node.id),
                embeddedSecondaryAssets: embeddedSecondaryAssetsMap.get(node.id),
              },
            });
            newPositions.set(node.id, { x, width: nodeWidth });
          });
        } else {
          // Parent not visible, treat as orphan
          orphans.push(...children);
        }
      });

      // Position orphans at the end
      orphans.forEach((node, i) => {
        const x = xOffset + i * (nodeWidth + siblingGap);
        result.push({
          id: node.id,
          type: node.type,
          position: { x, y: yLevel },
          data: {
            label: node.label,
            assetId: node.metadata.assetId,
            criticality: node.metadata.criticality,
            secondaryType: node.metadata.secondaryType,
            childCount: childrenMap.get(node.id)?.length || 0,
            isCollapsed: collapsedNodes.has(node.id),
            onToggleCollapse: () => toggleCollapse(node.id),
            embeddedDataAssets: embeddedDataAssetsMap.get(node.id),
            embeddedSecondaryAssets: embeddedSecondaryAssetsMap.get(node.id),
          },
        });
        newPositions.set(node.id, { x, width: nodeWidth });
      });

      return newPositions;
    };

    // Layout each level
    let yOffset = 0;
    let positions = new Map<string, { x: number; width: number }>();

    // L1 at top
    if (l1Nodes.length > 0) {
      l1Nodes.forEach((node, i) => {
        const x = i * (nodeWidth + siblingGap * 2);
        result.push({
          id: node.id,
          type: node.type,
          position: { x, y: yOffset },
          data: {
            label: node.label,
            assetId: node.metadata.assetId,
            criticality: node.metadata.criticality,
            childCount: childrenMap.get(node.id)?.length || 0,
            isCollapsed: collapsedNodes.has(node.id),
            onToggleCollapse: () => toggleCollapse(node.id),
            embeddedDataAssets: embeddedDataAssetsMap.get(node.id),
          },
        });
        positions.set(node.id, { x, width: nodeWidth });
      });
      yOffset += levelGap;
    }

    // L2 under L1
    if (l2Nodes.length > 0) {
      positions = new Map([...positions, ...positionHierarchically(l2Nodes, yOffset, positions)]);
      yOffset += levelGap;
    }

    // L3 under L2
    if (l3Nodes.length > 0) {
      positions = new Map([...positions, ...positionHierarchically(l3Nodes, yOffset, positions)]);
      yOffset += levelGap;
    }

    // Primary assets (orphan data assets only if embedding)
    if (primaryNodes.length > 0) {
      positions = new Map([...positions, ...positionHierarchically(primaryNodes, yOffset, positions)]);
      yOffset += levelGap;
    }

    // Secondary assets at bottom
    if (secondaryNodes.length > 0) {
      positionHierarchically(secondaryNodes, yOffset, positions);
    }

    return result;
  }, [graphNodes, hiddenNodes, childrenMap, collapsedNodes, toggleCollapse, graphEdges, embedDataInProcess, dataAssetToProcessMap, showSecondary, embedSecondaryInProcess, secondaryToProcessMap]);

  const initialEdges: Edge[] = useMemo(() => {
    let filteredEdges = graphEdges;
    
    // Filter out edges where source or target is hidden
    filteredEdges = filteredEdges.filter(e => 
      !hiddenNodes.has(e.source) && !hiddenNodes.has(e.target)
    );

    // Filter out edges to/from embedded data assets
    if (embedDataInProcess) {
      filteredEdges = filteredEdges.filter(e => {
        // Hide process-link edges to embedded data assets
        if (e.type === 'process-link' && dataAssetToProcessMap.has(e.target)) {
          return false;
        }
        // Hide relationship edges between process and embedded data assets
        if (e.type === 'relationship') {
          if (dataAssetToProcessMap.has(e.source) || dataAssetToProcessMap.has(e.target)) {
            return false;
          }
        }
        return true;
      });
    }

    // Filter out secondary-related edges if not showing or embedding them
    if (!showSecondary) {
      filteredEdges = filteredEdges.filter(e => 
        !e.source.startsWith('secondary-') && !e.target.startsWith('secondary-')
      );
    } else if (embedSecondaryInProcess) {
      filteredEdges = filteredEdges.filter(e => {
        // Hide process-link edges to embedded secondary assets
        if (e.type === 'process-link' && secondaryToProcessMap.has(e.target)) {
          return false;
        }
        // Hide secondary-link edges to embedded secondary assets
        if (e.type === 'secondary-link' && secondaryToProcessMap.has(e.target)) {
          return false;
        }
        // Hide relationship edges between processes and embedded secondary assets
        if (e.type === 'relationship') {
          if (secondaryToProcessMap.has(e.source) || secondaryToProcessMap.has(e.target)) {
            return false;
          }
        }
        return true;
      });
    }

    return filteredEdges.map(edge => {
      const isTagged = edge.metadata?.linkType === 'TAGGED';
      const isHierarchy = edge.type === 'hierarchy';
      const isDataFlow = edge.type === 'data-flow';
      const isSecondaryLink = edge.type === 'secondary-link';
      const isProcessLink = edge.type === 'process-link';

      // SVG/canvas props cannot reliably use CSS var() strings; use computed HSL values.
      let strokeClass = 'edge-default';
      let strokeColor = themeHsl.mutedForeground;
      let strokeWidth = 1.5;

      if (isHierarchy) {
        strokeClass = 'edge-primary';
        strokeColor = themeHsl.primary;
        strokeWidth = 2.5;
      } else if (isDataFlow) {
        strokeClass = 'edge-warning';
        strokeColor = themeHsl.warning;
        strokeWidth = 2;
      } else if (isTagged) {
        strokeClass = 'edge-chart4';
        strokeColor = themeHsl.chart4;
        strokeWidth = 2;
      } else if (isSecondaryLink) {
        strokeClass = 'edge-muted';
        strokeColor = themeHsl.mutedForeground;
        strokeWidth = 1.5;
      } else if (isProcessLink) {
        strokeClass = 'edge-accent';
        strokeColor = themeHsl.accent;
        strokeWidth = 2;
      }

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: 's',
        targetHandle: 't',
        label: isTagged ? 'linked' : edge.label,
        type: 'default',
        animated: isDataFlow,
        className: strokeClass,
        style: {
          stroke: strokeColor,
          strokeWidth,
          strokeDasharray: (isTagged || isSecondaryLink) ? '8 4' : undefined,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: strokeColor,
          width: 16,
          height: 16,
        },
        labelStyle: {
          fontSize: 10,
          fontWeight: 600,
          fill: themeHsl.foreground,
        },
        labelBgStyle: {
          fill: themeHsl.labelBg,
          rx: 4,
          ry: 4,
        },
        labelBgPadding: [6, 4] as [number, number],
      };
    });
  }, [graphEdges, hiddenNodes, embedDataInProcess, dataAssetToProcessMap, showSecondary, embedSecondaryInProcess, secondaryToProcessMap]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes/edges when graph data changes
  React.useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const resetLayout = useCallback(() => {
    setCollapsedNodes(new Set());
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const collapseAll = useCallback(() => {
    const allParents = new Set<string>();
    childrenMap.forEach((children, parentId) => {
      if (children.length > 0) {
        allParents.add(parentId);
      }
    });
    setCollapsedNodes(allParents);
  }, [childrenMap]);

  const expandAll = useCallback(() => {
    setCollapsedNodes(new Set());
  }, []);

  if (graphNodes.length === 0) {
    return (
      <Card className="min-h-[500px] flex items-center justify-center">
        <CardContent className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <GitBranch className="w-8 h-8 text-primary/60" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Assets to Display</h3>
          <p className="text-muted-foreground">
            Create some assets and processes to see the relationship map.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Business Unit:</Label>
              <Select
                value={selectedBU}
                onValueChange={(v) => setSelectedBU(v === '__ALL__' ? '' : v)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All units" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__ALL__">All units</SelectItem>
                  {businessUnits.map((bu) => (
                    <SelectItem key={bu.id} value={bu.id}>
                      {bu.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="h-6 w-px bg-border" />

            <div className="flex items-center gap-2">
              <Switch 
                id="embed-data"
                checked={embedDataInProcess} 
                onCheckedChange={setEmbedDataInProcess}
              />
              <Label htmlFor="embed-data" className="text-sm cursor-pointer">
                Embed Data in Process
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch 
                id="show-secondary"
                checked={showSecondary} 
                onCheckedChange={setShowSecondary}
              />
              <Label htmlFor="show-secondary" className="text-sm cursor-pointer">
                Secondary Assets
              </Label>
            </div>

            {showSecondary && (
              <div className="flex items-center gap-2">
                <Switch 
                  id="embed-secondary"
                  checked={embedSecondaryInProcess} 
                  onCheckedChange={setEmbedSecondaryInProcess}
                />
                <Label htmlFor="embed-secondary" className="text-sm cursor-pointer">
                  Embed in Process
                </Label>
              </div>
            )}

            <div className="h-6 w-px bg-border" />

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={expandAll} className="gap-1.5">
                <ChevronDown className="w-3.5 h-3.5" />
                Expand
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAll} className="gap-1.5">
                <ChevronRight className="w-3.5 h-3.5" />
                Collapse
              </Button>
              <Button variant="outline" size="sm" onClick={resetLayout} className="gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" />
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Graph */}
      <Card className="h-[650px] overflow-hidden" style={{ backgroundColor: themeHsl.background }}>
        <ReactFlow
          key={isLight ? "rf-light" : "rf-dark"}
          className={`${isLight ? "rf-light" : "rf-dark"} ${isLight ? "" : "dark"}`}
          colorMode={isLight ? "light" : "dark"}
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          connectionLineType={ConnectionLineType.Bezier}
          fitView
          fitViewOptions={{ padding: 0.4 }}
          minZoom={0.1}
          maxZoom={2}
          nodesDraggable
          nodesConnectable={false}
          defaultEdgeOptions={{
            type: 'default',
          }}
          style={{ backgroundColor: themeHsl.background }}
        >
          <Background
            bgColor={themeHsl.background}
            color={themeHsl.mutedForeground}
            gap={32}
            size={1}
            style={{ opacity: isLight ? 0.22 : 0.28 }}
          />
          <Controls position="bottom-left" className="!bg-card !border-border !rounded-lg !shadow-md" />
          <MiniMap
            nodeColor={(node) => {
              switch (node.type) {
                case 'process-l1':
                  return themeHsl.primary;
                case 'process-l2':
                  return themeHsl.info;
                case 'process-l3':
                  return themeHsl.chart4;
                case 'primary-asset':
                  return themeHsl.accent;
                case 'secondary-asset':
                  return themeHsl.mutedForeground;
                default:
                  return themeHsl.mutedForeground;
              }
            }}
            maskColor={themeHsl.minimapMask}
            className="!bg-card !border-border !rounded-lg"
            position="bottom-right"
            pannable
            zoomable
          />
          <Panel
            position="top-right"
            className="!bg-card !text-card-foreground p-3 rounded-xl border border-border shadow-md"
          >
            <div className="space-y-2 text-xs">
              <div className="font-semibold mb-2 text-sm">Legend</div>
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded border-2 border-primary bg-card" />
                <span className="text-muted-foreground">L1 Process</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded border-2 border-info bg-card" />
                <span className="text-muted-foreground">L2 Process</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded border-2 border-chart-4 bg-card" />
                <span className="text-muted-foreground">L3 Process</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded border-2 border-accent bg-card" />
                <span className="text-muted-foreground">Data Asset</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded border border-border bg-card" />
                <span className="text-muted-foreground">Secondary</span>
              </div>
              <div className="border-t border-border pt-2 mt-2 text-[10px] text-muted-foreground">
                Click +/- to collapse nodes
              </div>
            </div>
          </Panel>
        </ReactFlow>
      </Card>
    </div>
  );
};

export default AssetRelationshipMap;
