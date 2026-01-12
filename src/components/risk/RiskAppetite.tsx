import React, { useState, lazy, Suspense } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db as supabase } from '@/integrations/database/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLogRiskAction } from '@/hooks/useAuditLogs';
import { useToast } from '@/hooks/use-toast';
import {
  useActiveRiskMatrix,
  useRiskAppetites,
  useActiveRiskAppetite,
  useRiskAppetiteBands,
  useUpdateRiskAppetite,
  useSetActiveAppetite,
  bandConfig,
  RiskAppetite as RiskAppetiteType,
} from '@/hooks/useRiskAppetite';
import { useProfiles } from '@/hooks/useRisks';
import { useDeleteRiskAppetite } from '@/hooks/useDeleteRiskAppetite';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  CheckCircle2, 
  Edit, 
  FileText,
  Target,
  Wand2,
  LayoutGrid,
  Archive,
  MoreHorizontal,
  Trash2,
} from 'lucide-react';
import RiskMatrixHeatmap from './RiskMatrixHeatmap';

// Lazy load the wizard to avoid circular dependency issues
const RiskAppetiteWizardContainer = lazy(() => import('./appetite-wizard/RiskAppetiteWizardContainer'));

// Archive appetite hook
const useArchiveAppetite = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('risk_appetites')
        .update({ is_archived: true, is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-appetite'] });
      queryClient.invalidateQueries({ queryKey: ['risk-appetites'] });
      queryClient.invalidateQueries({ queryKey: ['archived-appetites'] });
      toast({ title: 'Risk appetite archived' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to archive', description: error.message, variant: 'destructive' });
    },
  });
};

export const RiskAppetite: React.FC = () => {
  const { isAdmin } = useAuth();
  const { data: activeMatrix } = useActiveRiskMatrix();
  const { data: appetites, isLoading: appetitesLoading } = useRiskAppetites();
  const { data: activeAppetite } = useActiveRiskAppetite();
  const { data: activeBands } = useRiskAppetiteBands(activeAppetite?.id);
  const { data: profiles } = useProfiles();
  const { logAction } = useLogRiskAction();
  
  const updateAppetite = useUpdateRiskAppetite();
  const setActiveAppetite = useSetActiveAppetite();
  const archiveAppetite = useArchiveAppetite();
  const deleteAppetite = useDeleteRiskAppetite();

  const [wizardDialogOpen, setWizardDialogOpen] = useState(false);
  const [editingAppetiteId, setEditingAppetiteId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [appetiteToDelete, setAppetiteToDelete] = useState<RiskAppetiteType | null>(null);

  const handleEditAppetite = (appetite: RiskAppetiteType) => {
    setEditingAppetiteId(appetite.id);
    setWizardDialogOpen(true);
  };

  const handleCloseWizard = () => {
    setWizardDialogOpen(false);
    setEditingAppetiteId(null);
  };

  const handleArchive = async (appetite: RiskAppetiteType) => {
    await archiveAppetite.mutateAsync(appetite.id);
    logAction('archived', 'risk_appetite', appetite.id, { name: appetite.name });
  };

  const handleDeleteClick = (appetite: RiskAppetiteType) => {
    if (appetite.is_active) {
      return; // Can't delete active appetite
    }
    setAppetiteToDelete(appetite);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!appetiteToDelete) return;
    await deleteAppetite.mutateAsync(appetiteToDelete.id);
    logAction('deleted', 'risk_appetite', appetiteToDelete.id, { name: appetiteToDelete.name });
    setDeleteDialogOpen(false);
    setAppetiteToDelete(null);
  };

  const getOwnerName = (ownerId: string | null) => {
    if (!ownerId) return 'Unassigned';
    const profile = profiles?.find(p => p.id === ownerId);
    return profile?.full_name || profile?.email || 'Unknown';
  };

  // Filter out archived appetites
  const nonArchivedAppetites = appetites?.filter(a => !(a as any).is_archived);

  if (appetitesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Target className="w-6 h-6 text-primary" />
            Risk Appetite
          </h1>
          <p className="text-muted-foreground">
            Define organizational risk tolerance and acceptance thresholds
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setWizardDialogOpen(true)} className="gap-2">
            <Wand2 className="w-4 h-4" />
            Launch Wizard
          </Button>
        )}
      </div>

      <Tabs defaultValue="statement" className="space-y-6">
        <TabsList>
          <TabsTrigger value="statement" className="gap-2">
            <FileText className="w-4 h-4" />
            Statement
          </TabsTrigger>
          <TabsTrigger value="heatmap" className="gap-2">
            <LayoutGrid className="w-4 h-4" />
            Heatmap
          </TabsTrigger>
        </TabsList>

        {/* Statement Tab */}
        <TabsContent value="statement" className="space-y-6">
          {activeAppetite ? (
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="w-6 h-6 text-primary" />
                    <div>
                      <CardTitle className="font-display">{activeAppetite.name}</CardTitle>
                      <CardDescription>Active Risk Appetite Statement</CardDescription>
                    </div>
                  </div>
                  {isAdmin && (
                    <Button variant="ghost" size="sm" onClick={() => handleEditAppetite(activeAppetite)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {activeAppetite.narrative_statement && (
                  <div>
                    <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                      Narrative Statement
                    </Label>
                    <p className="mt-2 text-foreground leading-relaxed whitespace-pre-wrap">
                      {activeAppetite.narrative_statement}
                    </p>
                  </div>
                )}

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {activeAppetite.escalation_criteria && (
                    <div>
                      <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                        Escalation Criteria
                      </Label>
                      <p className="mt-2 text-foreground text-sm whitespace-pre-wrap">
                        {activeAppetite.escalation_criteria}
                      </p>
                    </div>
                  )}
                  {activeAppetite.reporting_cadence && (
                    <div>
                      <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                        Reporting Cadence
                      </Label>
                      <p className="mt-2 text-foreground text-sm">
                        {activeAppetite.reporting_cadence}
                      </p>
                    </div>
                  )}
                  {activeAppetite.privacy_constraints && (
                    <div>
                      <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                        Privacy Constraints
                      </Label>
                      <p className="mt-2 text-foreground text-sm whitespace-pre-wrap">
                        {activeAppetite.privacy_constraints}
                      </p>
                    </div>
                  )}
                  <div>
                    <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                      Owner
                    </Label>
                    <p className="mt-2 text-foreground text-sm">
                      {getOwnerName(activeAppetite.owner_id)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <Shield className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-medium text-foreground mb-2">No Active Risk Appetite</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Use the wizard to create a risk appetite statement with matrix and bands.
                </p>
                {isAdmin && (
                  <Button onClick={() => setWizardDialogOpen(true)} className="gap-2">
                    <Wand2 className="w-4 h-4" />
                    Launch Wizard
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Other Appetites */}
          {nonArchivedAppetites && nonArchivedAppetites.filter(a => a.id !== activeAppetite?.id).length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg font-display">Other Appetite Statements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {nonArchivedAppetites.filter(a => a.id !== activeAppetite?.id).map((appetite) => (
                  <div
                    key={appetite.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-muted-foreground" />
                      <span className="font-medium">{appetite.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isAdmin && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveAppetite.mutate(appetite.id)}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Activate
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditAppetite(appetite)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleArchive(appetite)}>
                                <Archive className="w-4 h-4 mr-2" />
                                Archive
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteClick(appetite)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Heatmap Tab */}
        <TabsContent value="heatmap" className="space-y-6">
          {activeAppetite && activeMatrix && activeBands && activeBands.length > 0 ? (
            <RiskMatrixHeatmap
              matrixSize={activeMatrix.size}
              bands={activeBands.map(band => ({
                label: band.label || bandConfig[band.band]?.label || band.band,
                color: band.color || '#6366f1',
                min_score: band.min_score,
                max_score: band.max_score,
                description: band.description || undefined,
              }))}
              title={`${activeAppetite.name} - Risk Matrix`}
              description={`${activeMatrix.size}×${activeMatrix.size} matrix with ${activeBands.length} risk bands`}
            />
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <LayoutGrid className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-medium text-foreground mb-2">Heatmap Not Available</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Use the wizard to create a risk appetite with matrix and bands.
                </p>
                {isAdmin && (
                  <Button onClick={() => setWizardDialogOpen(true)} className="gap-2">
                    <Wand2 className="w-4 h-4" />
                    Launch Wizard
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Risk Appetite Wizard Dialog */}
      <Dialog open={wizardDialogOpen} onOpenChange={(open) => { if (!open) handleCloseWizard(); }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
          <Suspense fallback={
            <div className="flex items-center justify-center h-96">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          }>
            <RiskAppetiteWizardContainer onComplete={handleCloseWizard} editingAppetiteId={editingAppetiteId} />
          </Suspense>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Risk Appetite Profile</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{appetiteToDelete?.name}"? This will also delete all associated bands. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
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
