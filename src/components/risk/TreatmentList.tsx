import React, { useState } from 'react';
import { Treatment, TreatmentStatus, useCreateTreatment, useUpdateTreatment } from '@/hooks/useTreatments';
import { useProfiles } from '@/hooks/useRisks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, CheckCircle, Clock, XCircle, PlayCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface TreatmentListProps {
  riskId: string;
  treatments: Treatment[];
}

export const TreatmentList: React.FC<TreatmentListProps> = ({ riskId, treatments }) => {
  const { data: profiles } = useProfiles();
  const createTreatment = useCreateTreatment();
  const updateTreatment = useUpdateTreatment();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    due_date: '',
  });

  const getAssigneeName = (userId: string | null) => {
    if (!userId) return 'Unassigned';
    const profile = profiles?.find((p) => p.user_id === userId);
    return profile?.full_name || profile?.email || 'Unknown';
  };

  const getStatusIcon = (status: TreatmentStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-accent" />;
      case 'in_progress':
        return <PlayCircle className="w-4 h-4 text-info" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-muted-foreground" />;
      default:
        return <Clock className="w-4 h-4 text-warning" />;
    }
  };

  const getStatusLabel = (status: TreatmentStatus) => {
    const labels: Record<TreatmentStatus, string> = {
      planned: 'Planned',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };
    return labels[status];
  };

  const handleCreate = async () => {
    if (!formData.title.trim()) return;

    await createTreatment.mutateAsync({
      risk_id: riskId,
      title: formData.title,
      description: formData.description || undefined,
      assigned_to: formData.assigned_to || undefined,
      due_date: formData.due_date || undefined,
    });

    setFormData({ title: '', description: '', assigned_to: '', due_date: '' });
    setDialogOpen(false);
  };

  const handleStatusChange = async (treatment: Treatment, status: TreatmentStatus) => {
    await updateTreatment.mutateAsync({ id: treatment.id, status });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Treatment Actions</h4>
        <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </div>

      {treatments.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No treatment actions defined yet.
        </p>
      ) : (
        <div className="space-y-2">
          {treatments.map((treatment) => (
            <div
              key={treatment.id}
              className={cn(
                'p-3 rounded-lg border border-border bg-muted/30',
                treatment.status === 'completed' && 'opacity-60'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  {getStatusIcon(treatment.status)}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'font-medium text-sm',
                      treatment.status === 'completed' && 'line-through'
                    )}>
                      {treatment.title}
                    </p>
                    {treatment.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {treatment.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>{getAssigneeName(treatment.assigned_to)}</span>
                      {treatment.due_date && (
                        <span>Due: {format(new Date(treatment.due_date), 'MMM d')}</span>
                      )}
                    </div>
                  </div>
                </div>
                <Select
                  value={treatment.status}
                  onValueChange={(v) => handleStatusChange(treatment, v as TreatmentStatus)}
                >
                  <SelectTrigger className="w-28 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Treatment Action</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Implement security controls"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the treatment action..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Assigned To</Label>
                <Select
                  value={formData.assigned_to}
                  onValueChange={(v) => setFormData({ ...formData, assigned_to: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles?.map((profile) => (
                      <SelectItem key={profile.user_id} value={profile.user_id}>
                        {profile.full_name || profile.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!formData.title.trim() || createTreatment.isPending}
            >
              {createTreatment.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
