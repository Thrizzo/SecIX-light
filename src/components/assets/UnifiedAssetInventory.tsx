import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, Search, Database, Server, GitBranch, Filter, X, 
  Building2, User, Shield, ChevronDown, MoreHorizontal,
  Edit, Trash2, Eye
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  useAssetInventory, 
  AssetInventoryItem,
  usePrimaryAssets,
  useSecondaryAssets,
  useDeletePrimaryAsset,
  useDeleteSecondaryAsset,
} from '@/hooks/useAssets';
import { useBusinessUnits } from '@/hooks/useBusinessUnits';
import { useProfiles } from '@/hooks/useProfiles';
import { useConfidentialityLevels } from '@/hooks/useConfidentialityLevels';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import PrimaryAssetFormDialog from './PrimaryAssetFormDialog';
import SecondaryAssetFormDialog from './SecondaryAssetFormDialog';
import AssetDetailSheet from './AssetDetailSheet';

interface FilterState {
  entityType: string;
  assetKind: string;
  processLevel: string;
  businessUnitId: string;
  ownerId: string;
  criticality: string;
}

const UnifiedAssetInventory: React.FC = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const { data: inventory = [] } = useAssetInventory();
  const { data: primaryAssets = [] } = usePrimaryAssets();
  const { data: secondaryAssets = [] } = useSecondaryAssets();
  const { data: businessUnits = [] } = useBusinessUnits();
  const { data: profiles = [] } = useProfiles();
  const { data: confidentialityLevels = [] } = useConfidentialityLevels();
  
  const deletePrimaryMutation = useDeletePrimaryAsset();
  const deleteSecondaryMutation = useDeleteSecondaryAsset();

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    entityType: '',
    assetKind: '',
    processLevel: '',
    businessUnitId: '',
    ownerId: '',
    criticality: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Dialog states
  const [primaryDialogOpen, setPrimaryDialogOpen] = useState(false);
  const [secondaryDialogOpen, setSecondaryDialogOpen] = useState(false);
  const [selectedPrimaryAsset, setSelectedPrimaryAsset] = useState<string | null>(null);
  const [selectedSecondaryAsset, setSelectedSecondaryAsset] = useState<string | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [detailAsset, setDetailAsset] = useState<{ id: string; type: 'PRIMARY' | 'SECONDARY' } | null>(null);

  const activeFilterCount = Object.values(filters).filter(v => v !== '').length;

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      // Search filter
      const matchesSearch = 
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.asset_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase());

      // Entity type filter
      const matchesEntityType = !filters.entityType || item.entity_type === filters.entityType;

      // Asset kind filter (only for primary)
      const matchesAssetKind = !filters.assetKind || 
        (item.entity_type === 'PRIMARY' && item.asset_kind === filters.assetKind);

      // Process level filter
      const matchesProcessLevel = !filters.processLevel || 
        (item.entity_type === 'PRIMARY' && item.process_level === filters.processLevel);

      // Business unit filter
      const matchesBU = !filters.businessUnitId || item.business_unit_id === filters.businessUnitId;

      // Owner filter
      const matchesOwner = !filters.ownerId || item.owner_id === filters.ownerId;

      // Criticality filter
      const matchesCriticality = !filters.criticality || item.criticality === filters.criticality;

      return matchesSearch && matchesEntityType && matchesAssetKind && 
             matchesProcessLevel && matchesBU && matchesOwner && matchesCriticality;
    });
  }, [inventory, searchTerm, filters]);

  const clearFilters = () => {
    setFilters({
      entityType: '',
      assetKind: '',
      processLevel: '',
      businessUnitId: '',
      ownerId: '',
      criticality: '',
    });
  };

  const handleDelete = async (item: AssetInventoryItem) => {
    if (!confirm(`Delete ${item.name}? This action cannot be undone.`)) return;
    
    try {
      if (item.entity_type === 'PRIMARY') {
        await deletePrimaryMutation.mutateAsync(item.id);
      } else {
        await deleteSecondaryMutation.mutateAsync(item.id);
      }
      toast({ title: 'Asset deleted' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete asset', variant: 'destructive' });
    }
  };

  const handleEdit = (item: AssetInventoryItem) => {
    if (item.entity_type === 'PRIMARY') {
      setSelectedPrimaryAsset(item.id);
      setPrimaryDialogOpen(true);
    } else {
      setSelectedSecondaryAsset(item.id);
      setSecondaryDialogOpen(true);
    }
  };

  const handleView = (item: AssetInventoryItem) => {
    setDetailAsset({ id: item.id, type: item.entity_type });
    setDetailSheetOpen(true);
  };

  const getOwnerName = (ownerId: string | null) => {
    if (!ownerId) return '-';
    const profile = profiles.find(p => p.id === ownerId);
    return profile?.full_name || profile?.email || '-';
  };

  const getBusinessUnitName = (buId: string | null) => {
    if (!buId) return '-';
    return businessUnits.find(bu => bu.id === buId)?.name || '-';
  };

  const getCriticalityColor = (criticality: string | null) => {
    switch (criticality) {
      case 'Critical': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'High': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      case 'Medium': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Low': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTypeIcon = (item: AssetInventoryItem) => {
    if (item.entity_type === 'SECONDARY') {
      return <Server className="w-4 h-4 text-muted-foreground" />;
    }
    if (item.asset_kind === 'process') {
      return <GitBranch className="w-4 h-4 text-primary" />;
    }
    return <Database className="w-4 h-4 text-primary" />;
  };

  const getTypeLabel = (item: AssetInventoryItem) => {
    if (item.entity_type === 'SECONDARY') {
      return item.secondary_type || 'Secondary';
    }
    if (item.asset_kind === 'process') {
      return `Process ${item.process_level}`;
    }
    return item.primary_type || 'Primary';
  };

  return (
    <div className="space-y-6">
      {/* Header with search and filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search assets by name, ID, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2">
            <Popover open={showFilters} onOpenChange={setShowFilters}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="w-4 h-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Filters</h4>
                    {activeFilterCount > 0 && (
                      <Button variant="ghost" size="sm" onClick={clearFilters}>
                        Clear all
                      </Button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-sm text-muted-foreground">Entity Type</label>
                      <Select
                        value={filters.entityType}
                        onValueChange={(v) =>
                          setFilters((prev) => ({
                            ...prev,
                            entityType: v === '__ALL__' ? '' : v,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__ALL__">All types</SelectItem>
                          <SelectItem value="PRIMARY">Primary</SelectItem>
                          <SelectItem value="SECONDARY">Secondary</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {(!filters.entityType || filters.entityType === 'PRIMARY') && (
                      <>
                        <div className="space-y-1">
                          <label className="text-sm text-muted-foreground">Asset Kind</label>
                          <Select
                            value={filters.assetKind}
                            onValueChange={(v) =>
                              setFilters((prev) => ({
                                ...prev,
                                assetKind: v === '__ALL__' ? '' : v,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="All kinds" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__ALL__">All kinds</SelectItem>
                              <SelectItem value="asset">Asset</SelectItem>
                              <SelectItem value="process">Process</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {filters.assetKind === 'process' && (
                          <div className="space-y-1">
                            <label className="text-sm text-muted-foreground">Process Level</label>
                            <Select
                              value={filters.processLevel}
                              onValueChange={(v) =>
                                setFilters((prev) => ({
                                  ...prev,
                                  processLevel: v === '__ALL__' ? '' : v,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="All levels" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__ALL__">All levels</SelectItem>
                                <SelectItem value="L1">L1</SelectItem>
                                <SelectItem value="L2">L2</SelectItem>
                                <SelectItem value="L3">L3</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </>
                    )}

                    <div className="space-y-1">
                      <label className="text-sm text-muted-foreground">Business Unit</label>
                      <Select
                        value={filters.businessUnitId}
                        onValueChange={(v) =>
                          setFilters((prev) => ({
                            ...prev,
                            businessUnitId: v === '__ALL__' ? '' : v,
                          }))
                        }
                      >
                        <SelectTrigger>
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

                    <div className="space-y-1">
                      <label className="text-sm text-muted-foreground">Criticality</label>
                      <Select
                        value={filters.criticality}
                        onValueChange={(v) =>
                          setFilters((prev) => ({
                            ...prev,
                            criticality: v === '__ALL__' ? '' : v,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All levels" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__ALL__">All levels</SelectItem>
                          <SelectItem value="Critical">Critical</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="Low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Asset
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {
                    setSelectedPrimaryAsset(null);
                    setPrimaryDialogOpen(true);
                  }}>
                    <Database className="w-4 h-4 mr-2" />
                    Primary Asset
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    setSelectedSecondaryAsset(null);
                    setSecondaryDialogOpen(true);
                  }}>
                    <Server className="w-4 h-4 mr-2" />
                    Secondary Asset
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2">
            {filters.entityType && (
              <Badge variant="secondary" className="gap-1">
                Type: {filters.entityType}
                <X 
                  className="w-3 h-3 cursor-pointer" 
                  onClick={() => setFilters(prev => ({ ...prev, entityType: '' }))}
                />
              </Badge>
            )}
            {filters.assetKind && (
              <Badge variant="secondary" className="gap-1">
                Kind: {filters.assetKind}
                <X 
                  className="w-3 h-3 cursor-pointer" 
                  onClick={() => setFilters(prev => ({ ...prev, assetKind: '' }))}
                />
              </Badge>
            )}
            {filters.processLevel && (
              <Badge variant="secondary" className="gap-1">
                Level: {filters.processLevel}
                <X 
                  className="w-3 h-3 cursor-pointer" 
                  onClick={() => setFilters(prev => ({ ...prev, processLevel: '' }))}
                />
              </Badge>
            )}
            {filters.businessUnitId && (
              <Badge variant="secondary" className="gap-1">
                BU: {getBusinessUnitName(filters.businessUnitId)}
                <X 
                  className="w-3 h-3 cursor-pointer" 
                  onClick={() => setFilters(prev => ({ ...prev, businessUnitId: '' }))}
                />
              </Badge>
            )}
            {filters.criticality && (
              <Badge variant="secondary" className="gap-1">
                Criticality: {filters.criticality}
                <X 
                  className="w-3 h-3 cursor-pointer" 
                  onClick={() => setFilters(prev => ({ ...prev, criticality: '' }))}
                />
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredInventory.length} of {inventory.length} assets
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Business Unit</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Criticality</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No assets found matching your criteria
                  </TableCell>
                </TableRow>
              ) : (
                filteredInventory.map((item) => (
                  <TableRow 
                    key={`${item.entity_type}-${item.id}`}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleView(item)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {getTypeIcon(item)}
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.asset_id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {getTypeLabel(item)}
                      </Badge>
                    </TableCell>
                    <TableCell>{getBusinessUnitName(item.business_unit_id)}</TableCell>
                    <TableCell>{getOwnerName(item.owner_id)}</TableCell>
                    <TableCell>
                      {item.criticality && (
                        <Badge className={getCriticalityColor(item.criticality)}>
                          {item.criticality}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(item.updated_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {isAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(item)}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(item)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(item)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <PrimaryAssetFormDialog
        open={primaryDialogOpen}
        onOpenChange={setPrimaryDialogOpen}
        assetId={selectedPrimaryAsset}
        primaryAssets={primaryAssets}
      />

      <SecondaryAssetFormDialog
        open={secondaryDialogOpen}
        onOpenChange={setSecondaryDialogOpen}
        assetId={selectedSecondaryAsset}
        primaryAssets={primaryAssets}
        secondaryAssets={secondaryAssets}
      />

      <AssetDetailSheet
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        assetId={detailAsset?.id || null}
        assetType={detailAsset?.type || 'PRIMARY'}
      />
    </div>
  );
};

export default UnifiedAssetInventory;