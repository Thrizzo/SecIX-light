import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Edit2, Trash2, Building2, Shield } from 'lucide-react';
import {
  useBusinessUnits,
  useCreateBusinessUnit,
  useUpdateBusinessUnit,
  useDeleteBusinessUnit,
  BusinessUnit,
} from '@/hooks/useBusinessUnits';
import { useProfiles } from '@/hooks/useProfiles';

const BusinessUnitsList: React.FC = () => {
  const { data: businessUnits, isLoading } = useBusinessUnits();
  const { data: profiles } = useProfiles();

  const createUnit = useCreateBusinessUnit();
  const updateUnit = useUpdateBusinessUnit();
  const deleteUnit = useDeleteBusinessUnit();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<BusinessUnit | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_security_org: false,
  });

  const resetForm = () => {
    setFormData({ name: '', description: '', is_security_org: false });
    setEditingUnit(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (unit: BusinessUnit) => {
    setEditingUnit(unit);
    setFormData({
      name: unit.name,
      description: unit.description || '',
      is_security_org: unit.is_security_org,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    const payload = {
      name: formData.name,
      description: formData.description || undefined,
      is_security_org: formData.is_security_org,
    };

    if (editingUnit) {
      await updateUnit.mutateAsync({ id: editingUnit.id, ...payload });
    } else {
      await createUnit.mutateAsync(payload);
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this business unit? All users in this unit will need to be reassigned.')) {
      await deleteUnit.mutateAsync(id);
    }
  };

  // Count users per business unit
  const userCounts = new Map<string, number>();
  profiles?.forEach((p) => {
    if (p.business_unit_id) {
      userCounts.set(p.business_unit_id, (userCounts.get(p.business_unit_id) || 0) + 1);
    }
  });

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
          <h2 className="text-xl font-semibold text-foreground">Business Units</h2>
          <p className="text-muted-foreground text-sm">Manage organizational units and access boundaries</p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Unit
        </Button>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            All Business Units
          </CardTitle>
          <CardDescription>
            Users can only access records within their assigned business unit (except Security Org members)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Type</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {businessUnits?.map((unit) => (
                <TableRow key={unit.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {unit.is_security_org && <Shield className="w-4 h-4 text-amber-500" />}
                      <span className="font-medium">{unit.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                    {unit.description || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{userCounts.get(unit.id) || 0} users</Badge>
                  </TableCell>
                  <TableCell>
                    {unit.is_security_org ? (
                      <Badge className="bg-amber-500/20 text-amber-600 gap-1">
                        <Shield className="w-3 h-3" />
                        Security Org
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Standard</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(unit)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      {!unit.is_security_org && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(unit.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!businessUnits || businessUnits.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No business units found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUnit ? 'Edit Business Unit' : 'New Business Unit'}</DialogTitle>
            <DialogDescription>
              {editingUnit
                ? 'Update business unit details.'
                : 'Create a new organizational unit for access control.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Finance, Engineering, Sales"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="bg-input border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of this unit..."
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                className="bg-input border-border"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between border rounded-lg p-4 bg-muted/30">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-500" />
                  <Label>Security Organization</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Members can view and edit all records across all business units
                </p>
              </div>
              <Switch
                checked={formData.is_security_org}
                onCheckedChange={(v) => setFormData((prev) => ({ ...prev, is_security_org: v }))}
              />
            </div>

            {formData.is_security_org && (
              <p className="text-sm text-amber-600 bg-amber-500/10 rounded-lg p-3">
                ⚠️ Only one business unit can be the Security Organization. Setting this will unset any existing Security Org.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name || createUnit.isPending || updateUnit.isPending}
            >
              {editingUnit ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusinessUnitsList;
