import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db as supabase } from '@/integrations/database/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRisks } from '@/hooks/useRisks';
import { useProfiles } from '@/hooks/useRisks';
import { useDeleteTreatment, useArchiveTreatment } from '@/hooks/useTreatments';
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
import { useToast } from '@/hooks/use-toast';
import { TreatmentWizardUnified } from './TreatmentWizardUnified';
import { Plus, Search, MoreHorizontal, Pencil, CheckCircle, ClipboardList, AlertTriangle, Filter, Wand2, Archive, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

type TreatmentStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';

const useTreatmentsAll = () => {
  return useQuery({
    queryKey: ['treatments-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('risk_treatments')
        .select(`
          *,
          risks:risk_id(id, risk_id, title)
        `)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};

const useCreateTreatmentFull = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: any) => {
      const { data, error } = await supabase
        .from('risk_treatments')
        .insert([{
          ...input,
          created_by: user?.id || null,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treatments-all'] });
      queryClient.invalidateQueries({ queryKey: ['treatments'] });
      toast({
        title: 'Treatment created',
        description: 'The treatment plan has been added.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create treatment',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

const useUpdateTreatmentFull = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & any) => {
      const updateData: any = { ...input };
      if (input.status === 'completed' && !input.completed_at) {
        updateData.completed_at = new Date().toISOString();
      }
      
      const { data, error } = await supabase
        .from('risk_treatments')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treatments-all'] });
      queryClient.invalidateQueries({ queryKey: ['treatments'] });
      toast({
        title: 'Treatment updated',
        description: 'The treatment plan has been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update treatment',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

const getStatusBadge = (status: TreatmentStatus) => {
  switch (status) {
    case 'planned':
      return <Badge variant="outline" className="bg-slate-100 text-slate-800">Planned</Badge>;
    case 'in_progress':
      return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>;
    case 'completed':
      return <Badge className="bg-emerald-100 text-emerald-800">Completed</Badge>;
    case 'cancelled':
      return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
  }
};

export const TreatmentManagement: React.FC = () => {
  const { data: treatments, isLoading, error } = useTreatmentsAll();
  const { data: risks } = useRisks();
  const { data: profiles } = useProfiles();
  const createTreatment = useCreateTreatmentFull();
  const updateTreatment = useUpdateTreatmentFull();

  const deleteTreatment = useDeleteTreatment();
  const archiveTreatment = useArchiveTreatment();

  const [searchQuery, setSearchQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState<any>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardTreatmentId, setWizardTreatmentId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [selectedTreatment, setSelectedTreatment] = useState<any>(null);

  const filteredTreatments = treatments?.filter((treatment: any) => {
    const query = searchQuery.toLowerCase();
    return (
      treatment.title?.toLowerCase().includes(query) ||
      treatment.risks?.title?.toLowerCase().includes(query) ||
      treatment.risks?.risk_id?.toLowerCase().includes(query)
    );
  });

  const handleEdit = (treatment: any) => {
    setEditingTreatment(treatment);
    setFormOpen(true);
  };

  const handleMarkComplete = async (treatment: any) => {
    await updateTreatment.mutateAsync({ 
      id: treatment.id, 
      status: 'completed',
      completed_at: new Date().toISOString(),
    });
  };

  const handleOpenWizard = (treatment: any) => {
    setWizardTreatmentId(treatment.id);
    setWizardOpen(true);
  };

  const handleDeleteClick = (treatment: any) => {
    setSelectedTreatment(treatment);
    setDeleteDialogOpen(true);
  };

  const handleArchiveClick = (treatment: any) => {
    setSelectedTreatment(treatment);
    setArchiveDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedTreatment) {
      await deleteTreatment.mutateAsync(selectedTreatment.id);
      setDeleteDialogOpen(false);
      setSelectedTreatment(null);
    }
  };

  const confirmArchive = async () => {
    if (selectedTreatment) {
      await archiveTreatment.mutateAsync(selectedTreatment.id);
      setArchiveDialogOpen(false);
      setSelectedTreatment(null);
    }
  };

  if (error) {
    return (
      <Card className="bg-destructive/10 border-destructive/30">
        <CardContent className="py-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            <p>Failed to load treatments: {error.message}</p>
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
          <h2 className="text-xl font-display font-bold text-foreground">Treatment Plans</h2>
          <p className="text-muted-foreground">
            {filteredTreatments?.length || 0} treatment plans
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Treatment
        </Button>
      </div>

      {/* Search */}
      <Card className="bg-card border-border">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search treatments..."
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

      {/* Treatments Table */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-0">
          <CardTitle className="font-display text-lg">All Treatments</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : filteredTreatments && filteredTreatments.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead>Treatment</TableHead>
                    <TableHead className="w-40">Risk</TableHead>
                    <TableHead className="w-28">Status</TableHead>
                    <TableHead className="w-28">Due Date</TableHead>
                    <TableHead className="w-32">Assigned To</TableHead>
                    <TableHead className="w-20 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTreatments.map((treatment: any) => (
                    <TableRow key={treatment.id} className="border-border hover:bg-muted/50">
                      <TableCell>
                        <div>
                          <p className="font-medium">{treatment.title}</p>
                          {treatment.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {treatment.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">
                            {treatment.risks?.risk_id}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(treatment.status)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {treatment.due_date 
                          ? format(new Date(treatment.due_date), 'MMM d, yyyy')
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="text-sm">
                        {profiles?.find((p: any) => p.user_id === treatment.assigned_to)?.full_name || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenWizard(treatment)}>
                              <Wand2 className="w-4 h-4 mr-2" />
                              Open Wizard
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(treatment)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit Details
                            </DropdownMenuItem>
                            {treatment.status !== 'completed' && (
                              <DropdownMenuItem onClick={() => handleMarkComplete(treatment)}>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Mark Complete
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {treatment.status !== 'cancelled' && (
                              <DropdownMenuItem onClick={() => handleArchiveClick(treatment)}>
                                <Archive className="w-4 h-4 mr-2" />
                                Archive
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => handleDeleteClick(treatment)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ClipboardList className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-medium text-foreground mb-1">No treatments found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery ? 'Try adjusting your search.' : 'Create a treatment plan for your risks.'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setFormOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  New Treatment
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Treatment Wizard */}
      <TreatmentWizardUnified
        open={formOpen || wizardOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          setWizardOpen(open);
          if (!open) {
            setEditingTreatment(null);
            setWizardTreatmentId(null);
          }
        }}
        treatmentId={wizardTreatmentId || editingTreatment?.id}
        mode={wizardTreatmentId || editingTreatment ? 'edit' : 'create'}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Treatment Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete "{selectedTreatment?.title}"? 
              This will also remove all associated milestones and control mappings. 
              This action cannot be undone.
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

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Treatment Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive "{selectedTreatment?.title}"? 
              This will mark the treatment as cancelled. You can still view it in the list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmArchive}>
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
