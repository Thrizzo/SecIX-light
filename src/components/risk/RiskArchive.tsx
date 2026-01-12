import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db as supabase } from '@/integrations/database/client';
import { useToast } from '@/hooks/use-toast';
import { useLogRiskAction } from '@/hooks/useAuditLogs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Search, Archive, MoreHorizontal, RotateCcw, Trash2, AlertTriangle, FileWarning, Target } from 'lucide-react';
import { format } from 'date-fns';

interface ArchivedRisk {
  id: string;
  risk_id: string;
  title: string;
  status: string;
  is_archived: boolean;
  updated_at: string;
  category?: { id: string; name: string } | null;
}

interface ArchivedAppetite {
  id: string;
  name: string;
  version?: number;
  is_archived: boolean;
  updated_at: string;
}

// Fetch archived risks
const useArchivedRisks = () => {
  return useQuery({
    queryKey: ['archived-risks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('risks')
        .select('*')
        .eq('is_archived', true)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data as ArchivedRisk[];
    },
  });
};

// Fetch archived risk appetites
const useArchivedAppetites = () => {
  return useQuery({
    queryKey: ['archived-appetites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('risk_appetites')
        .select('*')
        .eq('is_archived', true)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data as ArchivedAppetite[];
    },
  });
};

// Restore risk
const useRestoreRisk = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('risks')
        .update({ is_archived: false, status: 'active' })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archived-risks'] });
      queryClient.invalidateQueries({ queryKey: ['risks'] });
      toast({ title: 'Risk restored', description: 'The risk has been restored to the register.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to restore risk', description: error.message, variant: 'destructive' });
    },
  });
};

// Restore risk appetite
const useRestoreAppetite = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('risk_appetites')
        .update({ is_archived: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archived-appetites'] });
      queryClient.invalidateQueries({ queryKey: ['risk-appetite'] });
      toast({ title: 'Risk appetite restored' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to restore', description: error.message, variant: 'destructive' });
    },
  });
};

// Delete risk permanently
const useDeleteRiskPermanently = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('risks')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archived-risks'] });
      toast({ title: 'Risk deleted permanently' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete risk', description: error.message, variant: 'destructive' });
    },
  });
};

// Delete appetite permanently
const useDeleteAppetitePermanently = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('risk_appetites')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archived-appetites'] });
      toast({ title: 'Risk appetite deleted permanently' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete', description: error.message, variant: 'destructive' });
    },
  });
};

export const RiskArchive: React.FC = () => {
  const { data: archivedRisks, isLoading: risksLoading } = useArchivedRisks();
  const { data: archivedAppetites, isLoading: appetitesLoading } = useArchivedAppetites();
  const restoreRisk = useRestoreRisk();
  const restoreAppetite = useRestoreAppetite();
  const deleteRisk = useDeleteRiskPermanently();
  const deleteAppetite = useDeleteAppetitePermanently();
  const { logAction } = useLogRiskAction();

  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'risk' | 'appetite'; name: string } | null>(null);

  const filteredRisks = archivedRisks?.filter((risk) =>
    risk.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    risk.risk_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAppetites = archivedAppetites?.filter((appetite) =>
    appetite.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRestore = async (id: string, type: 'risk' | 'appetite') => {
    if (type === 'risk') {
      await restoreRisk.mutateAsync(id);
      logAction('restored', 'risk', id);
    } else {
      await restoreAppetite.mutateAsync(id);
      logAction('restored', 'risk_appetite', id);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    
    if (itemToDelete.type === 'risk') {
      await deleteRisk.mutateAsync(itemToDelete.id);
      logAction('deleted', 'risk', itemToDelete.id);
    } else {
      await deleteAppetite.mutateAsync(itemToDelete.id);
      logAction('deleted', 'risk_appetite', itemToDelete.id);
    }
    
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const openDeleteDialog = (id: string, type: 'risk' | 'appetite', name: string) => {
    setItemToDelete({ id, type, name });
    setDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            <Archive className="w-5 h-5" />
            Archive
          </h2>
          <p className="text-muted-foreground">
            View and manage archived items
          </p>
        </div>
      </div>

      {/* Search */}
      <Card className="bg-card border-border">
        <CardContent className="py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search archived items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="risks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="risks" className="gap-2">
            <FileWarning className="w-4 h-4" />
            Archived Risks ({archivedRisks?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="appetites" className="gap-2">
            <Target className="w-4 h-4" />
            Archived Appetites ({archivedAppetites?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* Archived Risks */}
        <TabsContent value="risks">
          <Card className="bg-card border-border">
            <CardHeader className="pb-0">
              <CardTitle className="font-display text-lg">Archived Risks</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {risksLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : filteredRisks && filteredRisks.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead>Risk ID</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead className="w-32">Status</TableHead>
                        <TableHead className="w-40">Archived On</TableHead>
                        <TableHead className="w-20 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRisks.map((risk) => (
                        <TableRow key={risk.id} className="border-border hover:bg-muted/50">
                          <TableCell className="font-mono text-sm">{risk.risk_id}</TableCell>
                          <TableCell className="font-medium">{risk.title}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-slate-100 text-slate-800">
                              Archived
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(risk.updated_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleRestore(risk.id, 'risk')}>
                                  <RotateCcw className="w-4 h-4 mr-2" />
                                  Restore
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => openDeleteDialog(risk.id, 'risk', risk.title)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete Permanently
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
                  <Archive className="w-12 h-12 text-muted-foreground/50 mb-4" />
                  <h3 className="font-medium text-foreground mb-1">No archived risks</h3>
                  <p className="text-sm text-muted-foreground">
                    Archived risks will appear here.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Archived Appetites */}
        <TabsContent value="appetites">
          <Card className="bg-card border-border">
            <CardHeader className="pb-0">
              <CardTitle className="font-display text-lg">Archived Risk Appetites</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {appetitesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : filteredAppetites && filteredAppetites.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead>Name</TableHead>
                        <TableHead className="w-24">Version</TableHead>
                        <TableHead className="w-32">Status</TableHead>
                        <TableHead className="w-40">Archived On</TableHead>
                        <TableHead className="w-20 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAppetites.map((appetite) => (
                        <TableRow key={appetite.id} className="border-border hover:bg-muted/50">
                          <TableCell className="font-medium">{appetite.name}</TableCell>
                          <TableCell>v{appetite.version || 1}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-slate-100 text-slate-800">
                              Archived
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(appetite.updated_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleRestore(appetite.id, 'appetite')}>
                                  <RotateCcw className="w-4 h-4 mr-2" />
                                  Restore
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => openDeleteDialog(appetite.id, 'appetite', appetite.name)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete Permanently
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
                  <Archive className="w-12 h-12 text-muted-foreground/50 mb-4" />
                  <h3 className="font-medium text-foreground mb-1">No archived risk appetites</h3>
                  <p className="text-sm text-muted-foreground">
                    Archived risk appetites will appear here.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete Permanently?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{itemToDelete?.name}</strong>. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
