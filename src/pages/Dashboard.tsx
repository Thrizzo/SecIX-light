import React, { useRef, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { 
  AlertTriangle, Shield, CheckCircle, FileText, 
  Building2, Package, RefreshCw, Settings, Download, Sparkles, LayoutGrid, GripVertical, X, Eye, EyeOff 
} from 'lucide-react';
import { useDashboardInsights } from '@/hooks/useDashboard';
import { MetricsCard } from '@/components/dashboard/MetricsCard';
import { InsightCard } from '@/components/dashboard/InsightCard';
import { FrameworkComplianceList } from '@/components/dashboard/FrameworkComplianceList';
import { OverdueItemsList } from '@/components/dashboard/OverdueItemsList';
import { RiskAppetiteViolations } from '@/components/dashboard/RiskAppetiteViolations';
import { AssetDeviationsList } from '@/components/dashboard/AssetDeviationsList';
import { ThresholdsDialog } from '@/components/dashboard/ThresholdsDialog';
import { RegulatoryCompliancePanel } from '@/components/dashboard/RegulatoryCompliancePanel';
import { FindingsTracker } from '@/components/dashboard/FindingsTracker';
import { PoamStatusTracker } from '@/components/dashboard/PoamStatusTracker';
import { ExportWizardDialog, ExportSection } from '@/components/dashboard/ExportWizardDialog';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const STORAGE_KEY = 'dashboard-tile-config';

export interface DashboardTileConfig {
  id: string;
  label: string;
  visible: boolean;
  order: number;
}

const DEFAULT_TILES: DashboardTileConfig[] = [
  { id: 'key-metrics', label: 'Key Metrics', visible: true, order: 0 },
  { id: 'secondary-metrics', label: 'Secondary Metrics', visible: true, order: 1 },
  { id: 'ai-insights', label: 'AI Insights', visible: true, order: 2 },
  { id: 'regulatory-compliance', label: 'Regulatory Compliance', visible: true, order: 3 },
  { id: 'framework-compliance', label: 'Framework Compliance', visible: true, order: 4 },
  { id: 'risk-violations', label: 'Risk Violations', visible: true, order: 5 },
  { id: 'overdue-controls', label: 'Overdue Controls', visible: true, order: 6 },
  { id: 'overdue-policies', label: 'Overdue Policies', visible: true, order: 7 },
  { id: 'asset-deviations', label: 'Asset Deviations', visible: true, order: 8 },
  { id: 'findings-tracker', label: 'Findings Tracker', visible: true, order: 9 },
  { id: 'poam-status', label: 'POAM Status', visible: true, order: 10 },
];

interface SortableTileProps {
  tile: DashboardTileConfig;
  children: React.ReactNode;
  isCustomizing: boolean;
  onToggleVisibility: (id: string) => void;
}

function SortableTile({ tile, children, isCustomizing, onToggleVisibility }: SortableTileProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tile.id, disabled: !isCustomizing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (!isCustomizing) {
    return <>{children}</>;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${isDragging ? 'z-50 shadow-2xl' : ''} ${!tile.visible ? 'opacity-40' : ''}`}
    >
      {/* Customize overlay */}
      <div className="absolute -top-3 -left-3 -right-3 -bottom-3 border-2 border-dashed border-primary/50 rounded-xl pointer-events-none" />
      
      {/* Drag handle and controls */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-background border rounded-full px-3 py-1 shadow-md">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        <span className="text-xs font-medium text-muted-foreground">{tile.label}</span>
        <button
          onClick={() => onToggleVisibility(tile.id)}
          className="p-1 hover:bg-muted rounded"
        >
          {tile.visible ? (
            <Eye className="h-4 w-4 text-muted-foreground" />
          ) : (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {children}
    </div>
  );
}

const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const { data, isLoading, refetch, isFetching } = useDashboardInsights();
  const [thresholdsOpen, setThresholdsOpen] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [exportWizardOpen, setExportWizardOpen] = useState(false);
  const [tiles, setTiles] = useState<DashboardTileConfig[]>(DEFAULT_TILES);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const tileRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load saved tile config
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const merged = DEFAULT_TILES.map(defaultTile => {
          const savedTile = parsed.find((t: DashboardTileConfig) => t.id === defaultTile.id);
          return savedTile || defaultTile;
        });
        setTiles(merged.sort((a, b) => a.order - b.order));
      } catch {
        setTiles(DEFAULT_TILES);
      }
    }
  }, []);

  // Save tile config
  const saveTileConfig = (newTiles: DashboardTileConfig[]) => {
    setTiles(newTiles);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newTiles));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setTiles((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        const reordered = newItems.map((item, idx) => ({ ...item, order: idx }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reordered));
        return reordered;
      });
    }
  };

  const toggleVisibility = (id: string) => {
    setTiles((items) => {
      const updated = items.map((item) =>
        item.id === id ? { ...item, visible: !item.visible } : item
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const resetTileConfig = () => {
    setTiles(DEFAULT_TILES);
    localStorage.removeItem(STORAGE_KEY);
  };

  const isTileVisible = (id: string) => tiles.find(t => t.id === id)?.visible ?? true;

  const getExportSections = (): ExportSection[] => {
    return tiles.map(tile => ({
      id: tile.id,
      label: tile.label,
      enabled: tile.visible,
    }));
  };

  const exportToPDF = async (selectedSections: string[]) => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    let yOffset = 10;
    const margin = 10;

    pdf.setFontSize(18);
    pdf.text('GRC Dashboard Report', margin, yOffset);
    yOffset += 10;
    pdf.setFontSize(10);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, yOffset);
    yOffset += 15;

    for (const sectionId of selectedSections) {
      const element = tileRefs.current.get(sectionId);
      if (!element) continue;

      try {
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        });

        const imgData = canvas.toDataURL('image/png');
        const imgHeight = (canvas.height * (pdfWidth - margin * 2)) / canvas.width;

        if (yOffset + imgHeight > pdf.internal.pageSize.getHeight() - margin) {
          pdf.addPage();
          yOffset = margin;
        }

        pdf.addImage(imgData, 'PNG', margin, yOffset, pdfWidth - margin * 2, imgHeight);
        yOffset += imgHeight + 10;
      } catch (error) {
        console.error(`Failed to capture section ${sectionId}:`, error);
      }
    }

    pdf.save(`GRC-Dashboard-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-64" />)}
        </div>
      </div>
    );
  }

  const metrics = data?.metrics;
  const sortedTiles = [...tiles].sort((a, b) => a.order - b.order);

  const getTileContent = (tileId: string) => {
    switch (tileId) {
      case 'key-metrics':
        return (
          <div 
            ref={el => el && tileRefs.current.set(tileId, el)}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <MetricsCard title="Open Risks" value={metrics?.risks.open || 0} subtitle={`${metrics?.risks.total || 0} total`} icon={AlertTriangle} iconColor="text-red-500" trend={metrics?.risks.open && metrics.risks.open > 5 ? 'up' : 'down'} trendSentiment={metrics?.risks.open && metrics.risks.open > 5 ? 'negative' : 'positive'} />
            <MetricsCard title="Treated Risks" value={metrics?.risks.treated || 0} subtitle={`${metrics?.risks.accepted || 0} accepted`} icon={CheckCircle} iconColor="text-green-500" trend="up" trendSentiment="positive" />
            <MetricsCard title="Avg Compliance" value={`${metrics?.compliance.averageCompliance || 0}%`} subtitle={`${metrics?.compliance.frameworks.length || 0} frameworks`} icon={Shield} iconColor="text-primary" trend={metrics?.compliance.averageCompliance && metrics.compliance.averageCompliance >= 70 ? 'up' : 'down'} trendSentiment={metrics?.compliance.averageCompliance && metrics.compliance.averageCompliance >= 70 ? 'positive' : 'negative'} />
            <MetricsCard title="Overdue Items" value={(metrics?.controls.overdue || 0) + (metrics?.policies.overdue || 0)} subtitle="controls & policies" icon={FileText} iconColor="text-amber-500" trend={(metrics?.controls.overdue || 0) > 0 ? 'up' : 'stable'} trendSentiment={(metrics?.controls.overdue || 0) > 0 ? 'negative' : 'positive'} />
          </div>
        );

      case 'secondary-metrics':
        return (
          <div 
            ref={el => el && tileRefs.current.set(tileId, el)}
            className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4"
          >
            <MetricsCard title="Total Controls" value={metrics?.controls.internalTotal || 0} icon={Shield} iconColor="text-blue-500" className="col-span-1" />
            <MetricsCard title="Policies" value={metrics?.policies.total || 0} subtitle={`${metrics?.policies.published || 0} published`} icon={FileText} iconColor="text-purple-500" className="col-span-1" />
            <MetricsCard title="Vendors" value={metrics?.vendors.total || 0} subtitle={`${metrics?.vendors.assessmentsDue || 0} due`} icon={Building2} iconColor="text-teal-500" className="col-span-1" />
            <MetricsCard title="Primary Assets" value={metrics?.assets.primary || 0} icon={Package} iconColor="text-indigo-500" className="col-span-1" />
            <MetricsCard title="Evidence Items" value={metrics?.evidence.total || 0} subtitle={`${metrics?.evidence.expiringSoon || 0} expiring`} icon={FileText} iconColor="text-cyan-500" className="col-span-1" />
            <MetricsCard title="Missing Evidence" value={metrics?.evidence.controlsWithoutEvidence || 0} icon={AlertTriangle} iconColor="text-orange-500" className="col-span-1" />
          </div>
        );

      case 'ai-insights':
        if (!data?.insights || data.insights.length === 0) return null;
        return (
          <div 
            ref={el => el && tileRefs.current.set(tileId, el)}
            className="space-y-3"
          >
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Insights
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {data.insights.slice(0, 6).map((insight, idx) => (
                <InsightCard key={idx} insight={insight} />
              ))}
            </div>
          </div>
        );

      case 'regulatory-compliance':
        return (
          <div ref={el => el && tileRefs.current.set(tileId, el)}>
            <RegulatoryCompliancePanel />
          </div>
        );

      case 'framework-compliance':
        return (
          <div ref={el => el && tileRefs.current.set(tileId, el)}>
            <FrameworkComplianceList frameworks={data?.frameworkCompliance || []} />
          </div>
        );

      case 'risk-violations':
        return (
          <div ref={el => el && tileRefs.current.set(tileId, el)}>
            <RiskAppetiteViolations violations={data?.riskAppetiteViolations || []} />
          </div>
        );

      case 'overdue-controls':
        return (
          <div ref={el => el && tileRefs.current.set(tileId, el)}>
            <OverdueItemsList title="Overdue Controls" icon="control" items={data?.overdueDetails?.controls || []} emptyMessage="No overdue controls" />
          </div>
        );

      case 'overdue-policies':
        return (
          <div ref={el => el && tileRefs.current.set(tileId, el)}>
            <OverdueItemsList title="Overdue Policies" icon="policy" items={data?.overdueDetails?.policies || []} emptyMessage="No overdue policies" />
          </div>
        );

      case 'asset-deviations':
        return (
          <div ref={el => el && tileRefs.current.set(tileId, el)}>
            <AssetDeviationsList deviations={data?.assetDeviations || []} />
          </div>
        );

      case 'findings-tracker':
        return (
          <div ref={el => el && tileRefs.current.set(tileId, el)}>
            <FindingsTracker />
          </div>
        );

      case 'poam-status':
        return (
          <div ref={el => el && tileRefs.current.set(tileId, el)}>
            <PoamStatusTracker />
          </div>
        );

      default:
        return null;
    }
  };

  const renderTile = (tile: DashboardTileConfig) => {
    const content = getTileContent(tile.id);
    if (!content && !isCustomizing) return null;

    // In customize mode, show all tiles (even hidden ones)
    // In normal mode, only show visible tiles
    if (!isCustomizing && !tile.visible) return null;

    return (
      <SortableTile
        key={tile.id}
        tile={tile}
        isCustomizing={isCustomizing}
        onToggleVisibility={toggleVisibility}
      >
        {content || (
          <div className="h-32 flex items-center justify-center bg-muted/50 rounded-lg border border-dashed">
            <span className="text-muted-foreground text-sm">No data available</span>
          </div>
        )}
      </SortableTile>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Welcome back, {profile?.full_name?.split(' ')[0] || 'User'}
          </h1>
          <p className="text-muted-foreground">Your GRC command center</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            variant={isCustomizing ? "default" : "outline"} 
            size="sm" 
            onClick={() => setIsCustomizing(!isCustomizing)}
          >
            {isCustomizing ? (
              <>
                <X className="w-4 h-4 mr-2" />
                Done
              </>
            ) : (
              <>
                <LayoutGrid className="w-4 h-4 mr-2" />
                Customize
              </>
            )}
          </Button>
          {isCustomizing && (
            <Button variant="ghost" size="sm" onClick={resetTileConfig}>
              Reset
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setThresholdsOpen(true)}>
            <Settings className="w-4 h-4 mr-2" />
            Thresholds
          </Button>
          <Button variant="default" size="sm" onClick={() => setExportWizardOpen(true)}>
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {isCustomizing && (
        <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-primary" />
          <span className="text-sm">
            <strong>Customize Mode:</strong> Drag tiles to reorder. Click the eye icon to show/hide tiles.
          </span>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortedTiles.map(t => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div ref={dashboardRef} className={`space-y-6 ${isCustomizing ? 'pt-4' : ''}`}>
            {sortedTiles.map(tile => renderTile(tile))}
          </div>
        </SortableContext>
      </DndContext>

      <ThresholdsDialog open={thresholdsOpen} onOpenChange={setThresholdsOpen} />
      <ExportWizardDialog
        open={exportWizardOpen}
        onOpenChange={setExportWizardOpen}
        sections={getExportSections()}
        onExport={exportToPDF}
      />
    </div>
  );
};

export default Dashboard;
