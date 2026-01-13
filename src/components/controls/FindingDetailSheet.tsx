import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  XCircle, AlertCircle, Lightbulb, Calendar, Plus, Trash2, 
  ChevronDown, ChevronUp, CheckCircle2, Clock, ClipboardList, Save, Loader2, Edit2, X
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/database/client';
import { 
  useFindingPoams,
  useFindingMilestones,
  useCreateFindingPoam,
  useUpdateFindingPoam,
  useDeleteFindingPoam,
  useCreateFindingMilestone,
  useUpdateFindingMilestone,
  useDeleteFindingMilestone,
  FindingType,
  FindingStatus,
  PoamStatus,
  MilestoneStatus,
  FindingPoam,
  FindingMilestone,
} from '@/hooks/useControlFindings';
import { useProfiles } from '@/hooks/useRisks';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface FindingDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  findingId?: string | null;
}

const POAM_STATUSES: PoamStatus[] = ['draft', 'active', 'completed', 'cancelled'];
const MILESTONE_STATUSES: MilestoneStatus[] = ['pending', 'in_progress', 'completed', 'overdue'];
const FINDING_TYPES: FindingType[] = ['Major Deviation', 'Minor Deviation', 'Opportunity for Improvement'];
const FINDING_STATUSES: FindingStatus[] = ['Open', 'In Progress', 'Closed', 'Accepted'];

type FindingRow = {
  id: string;
  finding_type: string;
  title: string;
  status: string;
  description: string | null;
  identified_date: string;
  due_date: string | null;
  remediation_plan: string | null;
  internal_control_id: string | null;
  framework_control_id: string | null;
};

export function FindingDetailSheet({ open, onOpenChange, findingId }: FindingDetailSheetProps) {
  const [showPoamForm, setShowPoamForm] = useState(false);
  const [editingPoamId, setEditingPoamId] = useState<string | null>(null);
  const [expandedPoamIds, setExpandedPoamIds] = useState<Set<string>>(new Set());
  const [showMilestoneForm, setShowMilestoneForm] = useState<string | null>(null);
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    finding_type: '' as FindingType,
    status: '' as FindingStatus,
    description: '',
    identified_date: '',
    due_date: '',
    remediation_plan: '',
  });
  
  const [poamForm, setPoamForm] = useState({ name: '', owner_id: '', description: '', start_date: '', end_date: '' });
  const [milestoneForm, setMilestoneForm] = useState({ title: '', owner_id: '', description: '', due_date: '' });

  const { data: profiles = [] } = useProfiles();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch finding details
  const { data: finding, isLoading, refetch: refetchFinding } = useQuery({
    queryKey: ['finding-detail', findingId],
    queryFn: async () => {
      if (!findingId) return null;
      const { data, error } = await supabase
        .from<FindingRow>('control_findings')
        .select('*')
        .eq('id', findingId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!findingId && open,
  });

  // Update finding mutation
  const updateFinding = useMutation({
    mutationFn: async (updates: Partial<FindingRow>) => {
      if (!findingId) throw new Error('No finding ID');
      const { data, error } = await supabase
        .from('control_findings')
        .update(updates)
        .eq('id', findingId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finding-detail', findingId] });
      queryClient.invalidateQueries({ queryKey: ['control-findings'] });
      toast({ title: 'Finding updated successfully' });
      setIsEditingDetails(false);
    },
    onError: (error: any) => {
      toast({ title: 'Failed to update finding', description: error.message, variant: 'destructive' });
    },
  });

  const handleStartEdit = () => {
    if (!finding) return;
    setEditForm({
      title: finding.title || '',
      finding_type: finding.finding_type as FindingType,
      status: finding.status as FindingStatus,
      description: finding.description || '',
      identified_date: finding.identified_date || '',
      due_date: finding.due_date || '',
      remediation_plan: finding.remediation_plan || '',
    });
    setIsEditingDetails(true);
  };

  const handleSaveEdit = async () => {
    await updateFinding.mutateAsync({
      title: editForm.title,
      finding_type: editForm.finding_type,
      status: editForm.status,
      description: editForm.description || null,
      identified_date: editForm.identified_date,
      due_date: editForm.due_date || null,
      remediation_plan: editForm.remediation_plan || null,
    });
  };

  const { data: poams = [], refetch: refetchPoams } = useFindingPoams(findingId || undefined);
  const { data: milestones = [], refetch: refetchMilestones } = useFindingMilestones(findingId || undefined);

  const createPoam = useCreateFindingPoam();
  const updatePoam = useUpdateFindingPoam();
  const deletePoam = useDeleteFindingPoam();
  const createMilestone = useCreateFindingMilestone();
  const updateMilestone = useUpdateFindingMilestone();
  const deleteMilestone = useDeleteFindingMilestone();

  const getTypeIcon = (type: FindingType) => {
    switch (type) {
      case 'Major Deviation': return <XCircle className="h-5 w-5 text-destructive" />;
      case 'Minor Deviation': return <AlertCircle className="h-5 w-5 text-amber-500" />;
      case 'Opportunity for Improvement': return <Lightbulb className="h-5 w-5 text-blue-500" />;
      default: return <AlertCircle className="h-5 w-5" />;
    }
  };

  const getStatusBadgeVariant = (status: FindingStatus): 'default' | 'secondary' | 'outline' | 'destructive' => {
    switch (status) {
      case 'Open': return 'destructive';
      case 'In Progress': return 'secondary';
      case 'Closed': return 'outline';
      case 'Accepted': return 'default';
      default: return 'secondary';
    }
  };

  const getMilestoneIcon = (status: MilestoneStatus) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-amber-500" />;
      case 'overdue': return <XCircle className="h-4 w-4 text-destructive" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (!finding && !isLoading) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[700px] sm:max-w-[700px] p-0">
        <ScrollArea className="h-full">
          <div className="p-6">
            <SheetHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {finding && getTypeIcon(finding.finding_type as FindingType)}
                  <div className="space-y-1">
                    <SheetTitle className="text-xl">{finding?.title}</SheetTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusBadgeVariant(finding?.status as FindingStatus)}>
                        {finding?.status}
                      </Badge>
                      <Badge variant="outline">{finding?.finding_type}</Badge>
                    </div>
                  </div>
                </div>
                {!isEditingDetails && (
                  <Button variant="outline" size="sm" onClick={handleStartEdit}>
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
            </SheetHeader>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <Tabs defaultValue="details" className="mt-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="remediation">
                    POAMs
                    {poams.length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                        {poams.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4 mt-4">
                  {isEditingDetails ? (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center justify-between">
                          Edit Finding
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setIsEditingDetails(false)}>
                              <X className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                            <Button size="sm" onClick={handleSaveEdit} disabled={updateFinding.isPending}>
                              {updateFinding.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                              Save
                            </Button>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>Title</Label>
                          <Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Finding Type</Label>
                            <Select value={editForm.finding_type} onValueChange={(v) => setEditForm({ ...editForm, finding_type: v as FindingType })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent className="bg-popover">
                                {FINDING_TYPES.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v as FindingStatus })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent className="bg-popover">
                                {FINDING_STATUSES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Identified Date</Label>
                            <Input type="date" value={editForm.identified_date} onChange={(e) => setEditForm({ ...editForm, identified_date: e.target.value })} />
                          </div>
                          <div className="space-y-2">
                            <Label>Due Date</Label>
                            <Input type="date" value={editForm.due_date} onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={3} />
                        </div>
                        <div className="space-y-2">
                          <Label>Remediation Plan</Label>
                          <Textarea value={editForm.remediation_plan} onChange={(e) => setEditForm({ ...editForm, remediation_plan: e.target.value })} rows={3} />
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      {finding?.description && (
                        <Card>
                          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Description</CardTitle></CardHeader>
                          <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{finding.description}</p></CardContent>
                        </Card>
                      )}
                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Details</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="space-y-1">
                              <p className="text-muted-foreground">Identified Date</p>
                              <p className="font-medium">{finding?.identified_date ? format(new Date(finding.identified_date), 'MMM d, yyyy') : '-'}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-muted-foreground">Due Date</p>
                              <p className="font-medium">{finding?.due_date ? format(new Date(finding.due_date), 'MMM d, yyyy') : '-'}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      {finding?.remediation_plan && (
                        <Card>
                          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Remediation Plan</CardTitle></CardHeader>
                          <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{finding.remediation_plan}</p></CardContent>
                        </Card>
                      )}
                    </>
                  )}
                </TabsContent>

                <TabsContent value="remediation" className="space-y-4 mt-4">
                  {/* Add POAM Button */}
                  {!showPoamForm && (
                    <Button size="sm" onClick={() => setShowPoamForm(true)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add POAM
                    </Button>
                  )}

                  {/* POAM Form */}
                  {showPoamForm && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                          {editingPoamId ? 'Edit POAM' : 'New POAM'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="space-y-2">
                          <Label>Name *</Label>
                          <Input
                            value={poamForm.name}
                            onChange={(e) => setPoamForm({ ...poamForm, name: e.target.value })}
                            placeholder="POAM name..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Owner</Label>
                          <Select value={poamForm.owner_id} onValueChange={(v) => setPoamForm({ ...poamForm, owner_id: v })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select owner..." />
                            </SelectTrigger>
                            <SelectContent className="bg-popover">
                              {profiles.map((p) => (
                                <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Start Date</Label>
                            <Input
                              type="date"
                              value={poamForm.start_date}
                              onChange={(e) => setPoamForm({ ...poamForm, start_date: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>End Date</Label>
                            <Input
                              type="date"
                              value={poamForm.end_date}
                              onChange={(e) => setPoamForm({ ...poamForm, end_date: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Textarea
                            value={poamForm.description}
                            onChange={(e) => setPoamForm({ ...poamForm, description: e.target.value })}
                            placeholder="POAM description..."
                            rows={2}
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => {
                            setShowPoamForm(false);
                            setEditingPoamId(null);
                            setPoamForm({ name: '', owner_id: '', description: '', start_date: '', end_date: '' });
                          }}>
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={async () => {
                              if (!findingId || !poamForm.name) return;
                              if (editingPoamId) {
                                await updatePoam.mutateAsync({
                                  id: editingPoamId,
                                  findingId,
                                  name: poamForm.name,
                                  description: poamForm.description || undefined,
                                  owner_id: poamForm.owner_id || undefined,
                                  start_date: poamForm.start_date || undefined,
                                  end_date: poamForm.end_date || undefined,
                                });
                              } else {
                                await createPoam.mutateAsync({
                                  finding_id: findingId,
                                  name: poamForm.name,
                                  description: poamForm.description || undefined,
                                  owner_id: poamForm.owner_id || undefined,
                                  start_date: poamForm.start_date || undefined,
                                  end_date: poamForm.end_date || undefined,
                                });
                              }
                              setShowPoamForm(false);
                              setEditingPoamId(null);
                              setPoamForm({ name: '', owner_id: '', description: '', start_date: '', end_date: '' });
                            }}
                            disabled={!poamForm.name || createPoam.isPending || updatePoam.isPending}
                          >
                            {createPoam.isPending || updatePoam.isPending ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4 mr-1" />
                            )}
                            {editingPoamId ? 'Update' : 'Create'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* POAMs List */}
                  {poams.length > 0 ? (
                    <div className="space-y-3">
                      {poams.map((poam) => {
                        const poamMilestones = milestones.filter(m => m.poam_id === poam.id);
                        const completedMilestones = poamMilestones.filter(m => m.status === 'completed').length;
                        const isExpanded = expandedPoamIds.has(poam.id);

                        return (
                          <Collapsible
                            key={poam.id}
                            open={isExpanded}
                            onOpenChange={(open) => {
                              const newSet = new Set(expandedPoamIds);
                              if (open) newSet.add(poam.id);
                              else newSet.delete(poam.id);
                              setExpandedPoamIds(newSet);
                            }}
                          >
                            <div className="border rounded-lg overflow-hidden">
                              <CollapsibleTrigger asChild>
                                <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                                  <div className="flex items-center gap-3">
                                    <div className="flex-shrink-0">
                                      {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                                    </div>
                                    <div>
                                      <div className="font-medium text-sm flex items-center gap-2">
                                        {poam.name}
                                        <Badge variant="outline" className="text-xs capitalize">{poam.status}</Badge>
                                      </div>
                                      <div className="text-xs text-muted-foreground flex items-center gap-3 mt-1">
                                        {poam.profiles && <span>Owner: {poam.profiles.full_name || poam.profiles.email}</span>}
                                        {poam.start_date && <span>Start: {format(new Date(poam.start_date), 'MMM d, yyyy')}</span>}
                                        {poam.end_date && <span>End: {format(new Date(poam.end_date), 'MMM d, yyyy')}</span>}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="text-xs">
                                      {completedMilestones}/{poamMilestones.length} milestones
                                    </Badge>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingPoamId(poam.id);
                                        setPoamForm({
                                          name: poam.name,
                                          owner_id: poam.owner_id || '',
                                          description: poam.description || '',
                                          start_date: poam.start_date || '',
                                          end_date: poam.end_date || '',
                                        });
                                        setShowPoamForm(true);
                                      }}
                                    >
                                      <ClipboardList className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        if (!findingId) return;
                                        await deletePoam.mutateAsync({ id: poam.id, findingId });
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="border-t px-4 py-3 space-y-3 bg-muted/30">
                                  {poam.description && (
                                    <p className="text-sm text-muted-foreground">{poam.description}</p>
                                  )}

                                  {/* Milestones */}
                                  <div className="flex items-center justify-between">
                                    <Label className="text-sm font-medium">Milestones</Label>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setShowMilestoneForm(poam.id)}
                                    >
                                      <Plus className="w-3 h-3 mr-1" />
                                      Add Milestone
                                    </Button>
                                  </div>

                                  {/* Milestone Form */}
                                  {showMilestoneForm === poam.id && (
                                    <Card>
                                      <CardContent className="p-3 space-y-3">
                                        <div className="space-y-2">
                                          <Label className="text-xs">Title *</Label>
                                          <Input
                                            value={milestoneForm.title}
                                            onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
                                            placeholder="Milestone title..."
                                          />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                          <div className="space-y-2">
                                            <Label className="text-xs">Owner</Label>
                                            <Select value={milestoneForm.owner_id} onValueChange={(v) => setMilestoneForm({ ...milestoneForm, owner_id: v })}>
                                              <SelectTrigger className="h-8">
                                                <SelectValue placeholder="Select..." />
                                              </SelectTrigger>
                                              <SelectContent className="bg-popover">
                                                {profiles.map((p) => (
                                                  <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          <div className="space-y-2">
                                            <Label className="text-xs">Due Date</Label>
                                            <Input
                                              type="date"
                                              className="h-8"
                                              value={milestoneForm.due_date}
                                              onChange={(e) => setMilestoneForm({ ...milestoneForm, due_date: e.target.value })}
                                            />
                                          </div>
                                        </div>
                                        <div className="flex justify-end gap-2">
                                          <Button variant="outline" size="sm" onClick={() => {
                                            setShowMilestoneForm(null);
                                            setEditingMilestoneId(null);
                                            setMilestoneForm({ title: '', owner_id: '', description: '', due_date: '' });
                                          }}>
                                            Cancel
                                          </Button>
                                          <Button
                                            size="sm"
                                            onClick={async () => {
                                              if (!findingId || !milestoneForm.title) return;
                                              if (editingMilestoneId) {
                                                await updateMilestone.mutateAsync({
                                                  id: editingMilestoneId,
                                                  findingId,
                                                  title: milestoneForm.title,
                                                  owner_id: milestoneForm.owner_id || undefined,
                                                  due_date: milestoneForm.due_date || undefined,
                                                });
                                              } else {
                                                await createMilestone.mutateAsync({
                                                  finding_id: findingId,
                                                  poam_id: poam.id,
                                                  title: milestoneForm.title,
                                                  owner_id: milestoneForm.owner_id || undefined,
                                                  due_date: milestoneForm.due_date || undefined,
                                                });
                                              }
                                              setShowMilestoneForm(null);
                                              setEditingMilestoneId(null);
                                              setMilestoneForm({ title: '', owner_id: '', description: '', due_date: '' });
                                            }}
                                            disabled={!milestoneForm.title || createMilestone.isPending || updateMilestone.isPending}
                                          >
                                            {editingMilestoneId ? 'Update' : 'Add'}
                                          </Button>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  )}

                                  {/* Milestones List */}
                                  {poamMilestones.length > 0 ? (
                                    <div className="space-y-2">
                                      {poamMilestones.map((milestone) => (
                                        <div
                                          key={milestone.id}
                                          className="flex items-center justify-between p-2 rounded border bg-background"
                                        >
                                          <div className="flex items-center gap-2">
                                            {getMilestoneIcon(milestone.status as MilestoneStatus)}
                                            <div>
                                              <p className="text-sm font-medium">{milestone.title}</p>
                                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                {milestone.profiles && <span>{milestone.profiles.full_name}</span>}
                                                {milestone.due_date && (
                                                  <span className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {format(new Date(milestone.due_date), 'MMM d')}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <Select
                                              value={milestone.status}
                                              onValueChange={async (v) => {
                                                await updateMilestone.mutateAsync({
                                                  id: milestone.id,
                                                  findingId: findingId!,
                                                  status: v as MilestoneStatus,
                                                  completed_at: v === 'completed' ? new Date().toISOString() : null,
                                                });
                                              }}
                                            >
                                              <SelectTrigger className="h-7 w-[100px] text-xs">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent className="bg-popover">
                                                {MILESTONE_STATUSES.map((s) => (
                                                  <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-7 w-7 p-0 text-destructive"
                                              onClick={() => deleteMilestone.mutate({ id: milestone.id, findingId: findingId! })}
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground text-center py-2">No milestones yet</p>
                                  )}
                                </div>
                              </CollapsibleContent>
                            </div>
                          </Collapsible>
                        );
                      })}
                    </div>
                  ) : !showPoamForm && (
                    <div className="text-center py-8 text-muted-foreground">
                      <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No POAMs yet</p>
                      <p className="text-sm">Add a Plan of Action & Milestones to track remediation</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
