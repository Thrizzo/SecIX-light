import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Edit2, Trash2, Shield, AlertTriangle } from 'lucide-react';
import {
  useConfidentialityLevels,
  useCreateConfidentialityLevel,
  useUpdateConfidentialityLevel,
  useDeleteConfidentialityLevel,
  ConfidentialityLevel,
} from '@/hooks/useConfidentialityLevels';
import { useActiveRiskAppetite, useMatrixImpactLevels } from '@/hooks/useRiskAppetite';

const ConfidentialityLevelsList: React.FC = () => {
  const { data: levels, isLoading } = useConfidentialityLevels();
  const { data: activeAppetite } = useActiveRiskAppetite();
  const { data: impactLevels } = useMatrixImpactLevels(activeAppetite?.matrix_id);

  const createLevel = useCreateConfidentialityLevel();
  const updateLevel = useUpdateConfidentialityLevel();
  const deleteLevel = useDeleteConfidentialityLevel();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<ConfidentialityLevel | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    rank: '',
    description: '',
    breach_impact_level_id: '',
  });

  const resetForm = () => {
    setFormData({ name: '', rank: '', description: '', breach_impact_level_id: '' });
    setEditingLevel(null);
  };

  const openCreateDialog = () => {
    resetForm();
    const nextRank = levels ? Math.max(...levels.map((l) => l.rank), 0) + 1 : 1;
    setFormData((prev) => ({ ...prev, rank: String(nextRank) }));
    setIsDialogOpen(true);
  };

  const openEditDialog = (level: ConfidentialityLevel) => {
    setEditingLevel(level);
    setFormData({
      name: level.name,
      rank: String(level.rank),
      description: level.description || '',
      breach_impact_level_id: level.breach_impact_level_id || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    const payload = {
      name: formData.name,
      rank: parseInt(formData.rank),
      description: formData.description || undefined,
      breach_impact_level_id: formData.breach_impact_level_id === 'none' ? undefined : (formData.breach_impact_level_id || undefined),
    };

    if (editingLevel) {
      await updateLevel.mutateAsync({ id: editingLevel.id, ...payload });
    } else {
      await createLevel.mutateAsync(payload);
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this confidentiality level?')) {
      await deleteLevel.mutateAsync(id);
    }
  };

  const getImpactLabel = (levelId: string | null) => {
    if (!levelId || !impactLevels) return null;
    const impact = impactLevels.find((l) => l.id === levelId);
    return impact ? `${impact.level} - ${impact.label}` : null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">Confidentiality Levels</h2>
          <p className="text-muted-foreground">Define data classification levels for your organization</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Level
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingLevel ? 'Edit Confidentiality Level' : 'New Confidentiality Level'}</DialogTitle>
              <DialogDescription>
                Define a data classification level and its breach impact.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Level Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Confidential"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="bg-input border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rank">Rank *</Label>
                <Input
                  id="rank"
                  type="number"
                  min={1}
                  placeholder="1"
                  value={formData.rank}
                  onChange={(e) => setFormData((prev) => ({ ...prev, rank: e.target.value }))}
                  className="bg-input border-border"
                />
                <p className="text-xs text-muted-foreground">Higher rank = more sensitive</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe this classification level..."
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  className="bg-input border-border"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Breach Impact Level</Label>
                {!activeAppetite ? (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>Set an active Risk Appetite to map breach impact.</AlertDescription>
                  </Alert>
                ) : (
                  <Select
                    value={formData.breach_impact_level_id}
                    onValueChange={(v) => setFormData((prev) => ({ ...prev, breach_impact_level_id: v }))}
                  >
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue placeholder="Select impact if breached" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {impactLevels
                        ?.sort((a, b) => a.level - b.level)
                        .map((level) => (
                          <SelectItem key={level.id} value={level.id}>
                            {level.level} - {level.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.name || !formData.rank || createLevel.isPending || updateLevel.isPending}
              >
                {editingLevel ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Classification Levels
          </CardTitle>
          <CardDescription>
            Levels ordered by sensitivity rank (higher = more sensitive)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Breach Impact</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {levels
                ?.sort((a, b) => a.rank - b.rank)
                .map((level) => (
                  <TableRow key={level.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {level.rank}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{level.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                      {level.description || '—'}
                    </TableCell>
                    <TableCell>
                      {getImpactLabel(level.breach_impact_level_id) || (
                        <span className="text-muted-foreground">Not set</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(level)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(level.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              {(!levels || levels.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No confidentiality levels defined. Add your first level to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfidentialityLevelsList;