import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db as supabase } from '@/integrations/database/client';
import { useRisks, useRiskCategories, useDeleteRisk, Risk, RiskLevel, calculateRiskScore } from '@/hooks/useRisks';
import { useBusinessUnits } from '@/hooks/useBusinessUnits';
import { useAuth } from '@/contexts/AuthContext';
import { useLogRiskAction } from '@/hooks/useAuditLogs';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RiskScoreBadge, StatusBadge } from './RiskBadges';
import { RiskAssessmentWizard } from './RiskAssessmentWizard';
import { RiskDetailSheet } from './RiskDetailSheet';
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Eye, AlertTriangle, Filter, Building2, Briefcase, Server, Archive, ShieldCheck, ShieldX, ArrowRightLeft, Ban } from 'lucide-react';
import { format } from 'date-fns';

const getRiskLevelBadge = (level: RiskLevel | null) => {
  switch (level) {
    case 'organizational':
      return (
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 gap-1">
          <Building2 className="w-3 h-3" />
          Org
        </Badge>
      );
    case 'operational':
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1">
          <Briefcase className="w-3 h-3" />
          Ops
        </Badge>
      );
    case 'technical':
      return (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
          <Server className="w-3 h-3" />
          Tech
        </Badge>
      );
    default:
      return null;
  }
};

// Archive risk hook
const useArchiveRisk = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('risks')
        .update({ is_archived: true, status: 'archived' as any })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risks'] });
      queryClient.invalidateQueries({ queryKey: ['archived-risks'] });
      toast({ title: 'Risk archived', description: 'The risk has been moved to the archive.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to archive risk', description: error.message, variant: 'destructive' });
    },
  });
};

const getTreatmentBadge = (strategy: string | null) => {
  switch (strategy) {
    case 'mitigate':
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1">
          <ShieldCheck className="w-3 h-3" />
          Mitigate
        </Badge>
      );
    case 'accept':
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
          <ShieldX className="w-3 h-3" />
          Accept
        </Badge>
      );
    case 'transfer':
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1">
          <ArrowRightLeft className="w-3 h-3" />
          Transfer
        </Badge>
      );
    case 'avoid':
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1">
          <Ban className="w-3 h-3" />
          Avoid
        </Badge>
      );
    default:
      return <span className="text-muted-foreground text-xs">-</span>;
  }
};

export const RiskRegister: React.FC = () => {
  const { data: risks, isLoading, error } = useRisks();
  const { data: categories } = useRiskCategories();
  const { data: businessUnits } = useBusinessUnits();
  const deleteRisk = useDeleteRisk();
  const archiveRisk = useArchiveRisk();
  const { isAdmin } = useAuth();
  const { logAction } = useLogRiskAction();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
  const [viewingRisk, setViewingRisk] = useState<Risk | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingRisk, setDeletingRisk] = useState<Risk | null>(null);

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return '-';
    const cat = categories?.find((c) => c.id === categoryId);
    return cat?.name || '-';
  };

  const getCategoryColor = (categoryId: string | null) => {
    if (!categoryId) return '#6366f1';
    const cat = categories?.find((c) => c.id === categoryId);
    return cat?.color || '#6366f1';
  };

  const getBusinessUnitName = (buId: string | null) => {
    if (!buId) return null;
    return businessUnits?.find(bu => bu.id === buId)?.name || null;
  };

  // Filter out archived risks
  const filteredRisks = risks?.filter((risk) => {
    if ((risk as any).is_archived) return false;
    const query = searchQuery.toLowerCase();
    return (
      risk.title.toLowerCase().includes(query) ||
      risk.risk_id.toLowerCase().includes(query) ||
      risk.description?.toLowerCase().includes(query) ||
      getCategoryName(risk.category_id).toLowerCase().includes(query)
    );
  });

  const handleEdit = (risk: Risk) => {
    setEditingRisk(risk);
    setFormOpen(true);
  };

  const handleView = (risk: Risk) => {
    setViewingRisk(risk);
  };

  const handleDelete = (risk: Risk) => {
    setDeletingRisk(risk);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (deletingRisk) {
      await deleteRisk.mutateAsync(deletingRisk.id);
      logAction('deleted', 'risk', deletingRisk.id, { title: deletingRisk.title });
      setDeleteDialogOpen(false);
      setDeletingRisk(null);
    }
  };

  const handleArchive = async (risk: Risk) => {
    await archiveRisk.mutateAsync(risk.id);
    logAction('archived', 'risk', risk.id, { title: risk.title });
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) {
      setEditingRisk(null);
    }
  };

  if (error) {
    return (
      <Card className="bg-destructive/10 border-destructive/30">
        <CardContent className="py-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            <p>Failed to load risks: {error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Risk Register</h1>
          <p className="text-muted-foreground">
            {filteredRisks?.length || 0} risks in register
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Risk
        </Button>
      </div>

      {/* Search and Filter */}
      <Card className="bg-card border-border">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search risks by title, ID, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Risk Table */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-0">
          <CardTitle className="font-display text-lg">All Risks</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : filteredRisks && filteredRisks.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="w-24">ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="w-24">Level</TableHead>
                    <TableHead className="w-28">Business Unit</TableHead>
                    <TableHead className="w-32">Category</TableHead>
                    <TableHead className="w-20 text-center">Inherent</TableHead>
                    <TableHead className="w-20 text-center">Net</TableHead>
                    <TableHead className="w-20 text-center">Residual</TableHead>
                    <TableHead className="w-28">Treatment</TableHead>
                    <TableHead className="w-28">Status</TableHead>
                    <TableHead className="w-20 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRisks.map((risk) => {
                    const extRisk = risk as any;
                    const netScore = extRisk.net_severity && extRisk.net_likelihood 
                      ? calculateRiskScore(extRisk.net_severity, extRisk.net_likelihood) 
                      : null;
                    const residualScore = extRisk.residual_score || null;
                    
                    return (
                    <TableRow 
                      key={risk.id} 
                      className="border-border cursor-pointer hover:bg-muted/50"
                      onClick={() => handleView(risk)}
                    >
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {risk.risk_id}
                      </TableCell>
                      <TableCell className="font-medium">{risk.title}</TableCell>
                      <TableCell>
                        {getRiskLevelBadge(risk.risk_level)}
                      </TableCell>
                      <TableCell>
                        {getBusinessUnitName((risk as any).business_unit_id) ? (
                          <div className="flex items-center gap-1 text-xs">
                            <Building2 className="w-3 h-3 text-muted-foreground" />
                            <span className="truncate max-w-[100px]">{getBusinessUnitName((risk as any).business_unit_id)}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: getCategoryColor(risk.category_id) }}
                          />
                          <span className="text-sm">{getCategoryName(risk.category_id)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <RiskScoreBadge
                          severity={risk.inherent_severity}
                          likelihood={risk.inherent_likelihood}
                          size="sm"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        {netScore ? (
                          <RiskScoreBadge
                            severity={extRisk.net_severity}
                            likelihood={extRisk.net_likelihood}
                            size="sm"
                          />
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {residualScore ? (
                          <div className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-mono font-bold ${
                            residualScore >= 20 ? 'bg-severity-critical text-foreground' :
                            residualScore >= 15 ? 'bg-severity-high text-background' :
                            residualScore >= 10 ? 'bg-severity-medium text-background' :
                            'bg-severity-low text-background'
                          }`}>
                            {residualScore}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {getTreatmentBadge((risk as any).treatment_action)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={risk.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleView(risk); }}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(risk); }}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleArchive(risk); }}>
                              <Archive className="w-4 h-4 mr-2" />
                              Archive
                            </DropdownMenuItem>
                            {isAdmin && (
                              <DropdownMenuItem
                                onClick={(e) => { e.stopPropagation(); handleDelete(risk); }}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-medium text-foreground mb-1">No risks found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery ? 'Try adjusting your search.' : 'Get started by adding your first risk.'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setFormOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Risk
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Risk Assessment Wizard */}
      <RiskAssessmentWizard
        open={formOpen}
        onOpenChange={handleFormClose}
        risk={editingRisk}
      />

      {/* Detail Sheet */}
      <RiskDetailSheet
        risk={viewingRisk}
        open={!!viewingRisk}
        onOpenChange={(open) => !open && setViewingRisk(null)}
        onEdit={handleEdit}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Risk</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingRisk?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
