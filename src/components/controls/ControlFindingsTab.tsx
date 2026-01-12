import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertTriangle, Plus, Trash2, Edit2, XCircle, AlertCircle, Lightbulb, Calendar, ClipboardList, ChevronRight } from 'lucide-react';
import { 
  useInternalControlFindings, 
  useFrameworkControlFindings, 
  useCreateFinding, 
  useUpdateFinding, 
  useDeleteFinding,
  FindingType,
  FindingStatus,
  ControlFinding,
} from '@/hooks/useControlFindings';
import { format } from 'date-fns';
import { FindingDetailSheet } from './FindingDetailSheet';

interface ControlFindingsTabProps {
  controlId: string;
  controlType: 'internal' | 'framework';
  businessUnitId?: string | null;
}

const FINDING_TYPES: FindingType[] = ['Major Deviation', 'Minor Deviation', 'Opportunity for Improvement'];
const FINDING_STATUSES: FindingStatus[] = ['Open', 'In Progress', 'Closed', 'Accepted'];

export function ControlFindingsTab({ controlId, controlType, businessUnitId }: ControlFindingsTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFinding, setEditingFinding] = useState<ControlFinding | null>(null);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    finding_type: 'Minor Deviation' as FindingType,
    description: '',
    status: 'Open' as FindingStatus,
    due_date: '',
  });

  const { data: findings = [], isLoading } = controlType === 'internal' 
    ? useInternalControlFindings(controlId)
    : useFrameworkControlFindings(controlId);
  
  const createFinding = useCreateFinding();
  const updateFinding = useUpdateFinding();
  const deleteFinding = useDeleteFinding();

  const handleOpenCreate = () => {
    setEditingFinding(null);
    setFormData({
      title: '',
      finding_type: 'Minor Deviation',
      description: '',
      status: 'Open',
      due_date: '',
    });
    setDialogOpen(true);
  };

  const handleEdit = (finding: ControlFinding, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFinding(finding);
    setFormData({
      title: finding.title,
      finding_type: finding.finding_type,
      description: finding.description || '',
      status: finding.status,
      due_date: finding.due_date || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) return;

    if (editingFinding) {
      await updateFinding.mutateAsync({
        id: editingFinding.id,
        ...formData,
        due_date: formData.due_date || null,
        closed_date: formData.status === 'Closed' ? new Date().toISOString().split('T')[0] : null,
      });
    } else {
      await createFinding.mutateAsync({
        ...(controlType === 'internal' ? { internal_control_id: controlId } : { framework_control_id: controlId }),
        ...formData,
        due_date: formData.due_date || null,
        business_unit_id: businessUnitId,
      });
    }
    setDialogOpen(false);
  };

  const getTypeIcon = (type: FindingType) => {
    switch (type) {
      case 'Major Deviation': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'Minor Deviation': return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case 'Opportunity for Improvement': return <Lightbulb className="h-4 w-4 text-blue-500" />;
    }
  };

  const getTypeBadgeVariant = (type: FindingType): 'destructive' | 'secondary' | 'outline' => {
    switch (type) {
      case 'Major Deviation': return 'destructive';
      case 'Minor Deviation': return 'secondary';
      case 'Opportunity for Improvement': return 'outline';
    }
  };

  const getStatusBadgeVariant = (status: FindingStatus): 'default' | 'secondary' | 'outline' | 'destructive' => {
    switch (status) {
      case 'Open': return 'destructive';
      case 'In Progress': return 'secondary';
      case 'Closed': return 'outline';
      case 'Accepted': return 'default';
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Findings
              </CardTitle>
              <CardDescription>
                Track audit findings, deviations, and improvement opportunities
              </CardDescription>
            </div>
            <Button size="sm" onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-1" />
              Add Finding
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading findings...</p>
          ) : findings.length > 0 ? (
            <div className="space-y-3">
              {findings.map((finding) => (
                <div
                  key={finding.id}
                  className="flex items-start justify-between p-3 border rounded-lg group hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedFindingId(finding.id)}
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getTypeIcon(finding.finding_type)}
                      <span className="font-medium text-sm">{finding.title}</span>
                      <Badge variant={getTypeBadgeVariant(finding.finding_type)} className="text-xs">
                        {finding.finding_type}
                      </Badge>
                      <Badge variant={getStatusBadgeVariant(finding.status)} className="text-xs">
                        {finding.status}
                      </Badge>
                    </div>
                    {finding.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {finding.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Identified: {format(new Date(finding.identified_date), 'MMM d, yyyy')}</span>
                      {finding.due_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Due: {format(new Date(finding.due_date), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={(e) => handleEdit(finding, e)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFinding.mutate({
                            id: finding.id,
                            internalControlId: finding.internal_control_id,
                            frameworkControlId: finding.framework_control_id,
                          });
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No findings recorded</p>
              <p className="text-sm">Add findings from audits or assessments</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingFinding ? 'Edit Finding' : 'Add Finding'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Finding title..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Finding Type</Label>
                <Select
                  value={formData.finding_type}
                  onValueChange={(v) => setFormData({ ...formData, finding_type: v as FindingType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {FINDING_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v as FindingStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {FINDING_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the finding..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!formData.title.trim() || createFinding.isPending || updateFinding.isPending}
            >
              {editingFinding ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FindingDetailSheet 
        open={!!selectedFindingId}
        onOpenChange={(open) => !open && setSelectedFindingId(null)}
        findingId={selectedFindingId}
      />
    </>
  );
}
