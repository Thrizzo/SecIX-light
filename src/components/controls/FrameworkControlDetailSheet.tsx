import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Shield, Link2, FileText, ExternalLink, Plus, Trash2, 
  Save, X, Edit2, Layers, Upload, Download, Eye
} from 'lucide-react';
import { 
  useFrameworkControl, 
  useUpdateFrameworkControl,
  useFrameworkControlMappingsToInternal,
  SECURITY_FUNCTIONS,
  FrameworkControlWithFramework
} from '@/hooks/useControlFrameworks';
import { useInternalControls } from '@/hooks/useInternalControls';
import { useCreateFrameworkMapping, useDeleteFrameworkMapping } from '@/hooks/useControlMappings';
import { useFrameworkControlEvidence, useUploadControlEvidence, useDeleteControlEvidence, getEvidenceDownloadUrl } from '@/hooks/useEvidence';
import { useFrameworkControlFindings } from '@/hooks/useControlFindings';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ControlFindingsTab } from './ControlFindingsTab';

interface FrameworkControlDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  controlId?: string | null;
  initialTab?: 'details' | 'compliance' | 'mappings' | 'findings' | 'evidence' | 'guidance';
  startEditing?: boolean;
}

export function FrameworkControlDetailSheet({ 
  open, 
  onOpenChange, 
  controlId,
  initialTab = 'details',
  startEditing = false,
}: FrameworkControlDetailSheetProps) {
  type FrameworkControlTab = 'details' | 'compliance' | 'mappings' | 'findings' | 'evidence' | 'guidance';

  const [activeTab, setActiveTab] = useState<FrameworkControlTab>(initialTab);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [mappingInternalId, setMappingInternalId] = useState<string>('');
  const [evidenceName, setEvidenceName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: control, isLoading } = useFrameworkControl(controlId || undefined);
  const { data: internalMappings = [] } = useFrameworkControlMappingsToInternal(controlId || undefined);
  const { data: internalControls = [] } = useInternalControls();
  const { data: evidenceItems = [] } = useFrameworkControlEvidence(controlId || undefined);
  const { data: findings = [] } = useFrameworkControlFindings(controlId || undefined);
  const updateControl = useUpdateFrameworkControl();
  const createMapping = useCreateFrameworkMapping();
  const deleteMapping = useDeleteFrameworkMapping();
  const uploadEvidence = useUploadControlEvidence();
  const deleteEvidence = useDeleteControlEvidence();

  useEffect(() => {
    if (!open) return;
    setActiveTab(initialTab);

    // Reset transient state when switching between controls / intents.
    setIsEditing(false);
    setMappingInternalId('');
    setEvidenceName('');
  }, [open, initialTab, controlId]);

  useEffect(() => {
    if (!open || !startEditing || !control || isEditing) return;

    setEditData({
      control_code: control.control_code || '',
      title: control.title || '',
      description: control.description || '',
      domain: control.domain || '',
      subcategory: control.subcategory || '',
      control_type: control.control_type || '',
      guidance: control.guidance || '',
      implementation_guidance: (control as any).implementation_guidance || '',
      reference_links: (control as any).reference_links || '',
      security_function: (control as any).security_function || '',
    });
    setIsEditing(true);
  }, [open, startEditing, control, isEditing]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !controlId || !user) return;

    await uploadEvidence.mutateAsync({
      file,
      name: evidenceName || file.name,
      frameworkControlId: controlId,
      userId: user.id,
    });

    setEvidenceName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownload = async (storageKey: string, fileName: string) => {
    try {
      const url = await getEvidenceDownloadUrl(storageKey);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      toast({ title: 'Failed to download file', variant: 'destructive' });
    }
  };

  const handleView = async (storageKey: string) => {
    try {
      const url = await getEvidenceDownloadUrl(storageKey);
      window.open(url, '_blank');
    } catch (error) {
      toast({ title: 'Failed to open file', variant: 'destructive' });
    }
  };

  const handleEdit = () => {
    setEditData({
      control_code: control?.control_code || '',
      title: control?.title || '',
      description: control?.description || '',
      domain: control?.domain || '',
      subcategory: control?.subcategory || '',
      control_type: control?.control_type || '',
      guidance: control?.guidance || '',
      implementation_guidance: control?.implementation_guidance || '',
      reference_links: control?.reference_links || '',
      security_function: control?.security_function || '',
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!controlId) return;
    await updateControl.mutateAsync({ id: controlId, ...editData });
    setIsEditing(false);
  };

  const handleAddMapping = async () => {
    if (!controlId || !mappingInternalId) return;
    await createMapping.mutateAsync({
      internal_control_id: mappingInternalId,
      framework_control_id: controlId,
      mapping_type: 'Exact',
      notes: 'Mapped from framework control detail',
    });
    setMappingInternalId('');
  };

  // Filter out already mapped internal controls
  const mappedInternalIds = internalMappings.map((m: any) => m.internal_control?.id).filter(Boolean);
  const availableInternalControls = internalControls.filter(
    (ic) => !mappedInternalIds.includes(ic.id)
  );

  const getFunctionColor = (func: string | null) => {
    if (!func) return 'secondary';
    const colors: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      'Govern': 'default',
      'Identify': 'secondary',
      'Protect': 'default',
      'Detect': 'outline',
      'Respond': 'destructive',
      'Recover': 'secondary',
    };
    return colors[func] || 'secondary';
  };

  const getComplianceLabel = (status: string | null | undefined) => {
    switch (status) {
      case 'compliant':
        return 'Compliant';
      case 'minor_deviation':
        return 'Minor deviation';
      case 'major_deviation':
        return 'Major deviation';
      default:
        return 'Not assessed';
    }
  };

  const getComplianceVariant = (status: string | null | undefined) => {
    switch (status) {
      case 'compliant':
        return 'default' as const;
      case 'minor_deviation':
        return 'outline' as const;
      case 'major_deviation':
        return 'destructive' as const;
      default:
        return 'secondary' as const;
    }
  };

  if (!control && !isLoading) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[900px] p-0">
        <ScrollArea className="max-h-[85vh]">
          <div className="p-6">
            <DialogHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="font-mono">
                      {control?.control_code}
                    </Badge>
                    {(control as any)?.framework?.name && (
                      <Badge variant="secondary">{(control as any).framework.name}</Badge>
                    )}
                    {control?.security_function && (
                      <Badge variant={getFunctionColor(control.security_function)}>{control.security_function}</Badge>
                    )}
                    <Badge variant={getComplianceVariant((control as any)?.compliance_status)}>
                      {getComplianceLabel((control as any)?.compliance_status)}
                    </Badge>
                  </div>
                  <DialogTitle className="text-xl">{control?.title}</DialogTitle>
                </div>
                {!isEditing && (
                  <Button variant="outline" size="sm" onClick={handleEdit}>
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
            </DialogHeader>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">Loading control details...</p>
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mt-4">
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="compliance">Compliance</TabsTrigger>
                  <TabsTrigger value="mappings">
                    Mappings
                    {internalMappings.length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                        {internalMappings.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="findings">
                    Findings
                    {findings.length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                        {findings.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="evidence">
                    Evidence
                    {evidenceItems.length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                        {evidenceItems.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="guidance">Guidance</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4 mt-4">
                  {isEditing ? (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center justify-between">
                          Edit Control
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                              <X className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                            <Button size="sm" onClick={handleSave} disabled={updateControl.isPending}>
                              <Save className="h-4 w-4 mr-1" />
                              Save
                            </Button>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Control Code</Label>
                            <Input value={editData.control_code} onChange={(e) => setEditData({ ...editData, control_code: e.target.value })} />
                          </div>
                          <div className="space-y-2">
                            <Label>Security Function</Label>
                            <Select value={editData.security_function} onValueChange={(v) => setEditData({ ...editData, security_function: v })}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                              <SelectContent className="bg-popover">
                                {SECURITY_FUNCTIONS.map((fn) => (
                                  <SelectItem key={fn} value={fn}>
                                    {fn}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Title</Label>
                          <Input value={editData.title} onChange={(e) => setEditData({ ...editData, title: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Domain</Label>
                            <Input value={editData.domain} onChange={(e) => setEditData({ ...editData, domain: e.target.value })} />
                          </div>
                          <div className="space-y-2">
                            <Label>Subcategory</Label>
                            <Input value={editData.subcategory} onChange={(e) => setEditData({ ...editData, subcategory: e.target.value })} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Control Type</Label>
                          <Input value={editData.control_type} onChange={(e) => setEditData({ ...editData, control_type: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Textarea value={editData.description} onChange={(e) => setEditData({ ...editData, description: e.target.value })} rows={4} />
                        </div>
                        <div className="space-y-2">
                          <Label>Reference Links</Label>
                          <Input value={editData.reference_links} onChange={(e) => setEditData({ ...editData, reference_links: e.target.value })} />
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      {control?.description && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Description</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{control.description}</p>
                          </CardContent>
                        </Card>
                      )}

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Control Properties</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="space-y-1">
                              <p className="text-muted-foreground">Control Code</p>
                              <p className="font-mono font-medium">{control?.control_code || '-'}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-muted-foreground">Security Function</p>
                              {control?.security_function ? <Badge variant="outline">{control.security_function}</Badge> : <p className="font-medium">-</p>}
                            </div>
                            <div className="space-y-1">
                              <p className="text-muted-foreground">Domain</p>
                              <p className="font-medium">{control?.domain || '-'}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-muted-foreground">Subcategory</p>
                              <p className="font-medium">{control?.subcategory || '-'}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-muted-foreground">Control Type</p>
                              <p className="font-medium">{control?.control_type || '-'}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-muted-foreground">Last Updated</p>
                              <p className="font-medium">{control?.updated_at ? format(new Date(control.updated_at), 'MMM d, yyyy') : '-'}</p>
                            </div>
                          </div>
                          {control?.reference_links && (
                            <>
                              <Separator />
                              <div className="space-y-1">
                                <p className="text-muted-foreground text-sm">Reference Links</p>
                                <p className="text-sm">{control.reference_links}</p>
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>

                      <div className="grid grid-cols-2 gap-4">
                        <Card>
                          <CardContent className="pt-4 text-center">
                            <Layers className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-2xl font-bold">{internalMappings.length}</p>
                            <p className="text-xs text-muted-foreground">Internal Mappings</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-4 text-center">
                            <FileText className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-2xl font-bold">{evidenceItems.length}</p>
                            <p className="text-xs text-muted-foreground">Evidence Items</p>
                          </CardContent>
                        </Card>
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="compliance" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">Compliance Assessment</CardTitle>
                      <CardDescription>Evaluate and manually set compliance status for this framework control.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Compliance Status</Label>
                        <Select
                          value={(control as any)?.compliance_status || 'not_assessed'}
                          onValueChange={async (value) => {
                            if (!controlId) return;
                            await updateControl.mutateAsync({
                              id: controlId,
                              compliance_status: value as 'compliant' | 'minor_deviation' | 'major_deviation' | 'not_assessed',
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            <SelectItem value="not_assessed">Not Assessed</SelectItem>
                            <SelectItem value="compliant">Compliant</SelectItem>
                            <SelectItem value="minor_deviation">Minor Deviation</SelectItem>
                            <SelectItem value="major_deviation">Major Deviation</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Compliance Notes</Label>
                        <Textarea
                          placeholder="Add notes about this compliance assessment..."
                          defaultValue={(control as any)?.compliance_notes || ''}
                          onBlur={async (e) => {
                            if (!controlId) return;
                            await updateControl.mutateAsync({
                              id: controlId,
                              compliance_notes: e.target.value || null,
                            });
                          }}
                          rows={4}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="mappings" className="mt-4">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Link2 className="h-4 w-4" />
                            Internal Control Mappings
                          </CardTitle>
                          <CardDescription>Map this framework control to your internal controls</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2 mb-4">
                        <Select value={mappingInternalId} onValueChange={setMappingInternalId}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select internal control..." />
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            {availableInternalControls.map((ic) => (
                              <SelectItem key={ic.id} value={ic.id}>
                                {ic.internal_control_code} - {ic.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button onClick={handleAddMapping} disabled={!mappingInternalId}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      {internalMappings.length > 0 ? (
                        <div className="space-y-3">
                          {internalMappings.map((mapping: any) => (
                            <div key={mapping.id} className="flex items-center justify-between p-3 border rounded-lg group">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="font-mono text-xs">
                                    {mapping.internal_control?.internal_control_code}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    {mapping.mapping_type}
                                  </Badge>
                                </div>
                                <p className="text-sm mt-1">{mapping.internal_control?.title}</p>
                                {mapping.notes && <p className="text-xs text-muted-foreground mt-1">{mapping.notes}</p>}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="opacity-0 group-hover:opacity-100"
                                onClick={() => deleteMapping.mutate(mapping.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Link2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No internal mappings yet</p>
                          <p className="text-sm">Map this control to internal controls for implementation tracking</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="findings" className="mt-4">
                  <ControlFindingsTab controlId={controlId || ''} controlType="framework" />
                </TabsContent>

                <TabsContent value="guidance" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Control Guidance
                      </CardTitle>
                      <CardDescription>Implementation guidance and recommendations</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {(control as FrameworkControlWithFramework)?.guidance ? (
                        <div>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{(control as FrameworkControlWithFramework).guidance}</p>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No guidance provided</p>
                        </div>
                      )}

                      {(control as FrameworkControlWithFramework)?.implementation_guidance && (
                        <>
                          <Separator />
                          <div>
                            <h4 className="font-medium mb-2">Implementation Notes</h4>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{(control as FrameworkControlWithFramework).implementation_guidance}</p>
                          </div>
                        </>
                      )}

                      {(control as FrameworkControlWithFramework)?.reference_links && (
                        <>
                          <Separator />
                          <div>
                            <h4 className="font-medium mb-2">References</h4>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{(control as FrameworkControlWithFramework).reference_links}</p>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="evidence" className="mt-4">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Evidence
                          </CardTitle>
                          <CardDescription>Upload evidence documents related to this control</CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Evidence name..."
                            value={evidenceName}
                            onChange={(e) => setEvidenceName(e.target.value)}
                            className="w-48"
                          />
                          <input
                            ref={fileInputRef}
                            type="file"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                          <Button size="sm" onClick={() => fileInputRef.current?.click()}>
                            <Upload className="h-4 w-4 mr-1" />
                            Upload
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {evidenceItems.length > 0 ? (
                        <div className="space-y-3">
                          {evidenceItems.map((item: any) => (
                            <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg group">
                              <div className="flex-1">
                                <p className="font-medium">{item.name}</p>
                                <p className="text-sm text-muted-foreground">Uploaded {format(new Date(item.created_at), 'MMM d, yyyy')}</p>
                              </div>
                              <div className="flex gap-2 opacity-0 group-hover:opacity-100">
                                <Button variant="ghost" size="icon" onClick={() => handleView(item.storage_key)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDownload(item.storage_key, item.file_name)}>
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => deleteEvidence.mutate(item.id)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No evidence attached yet</p>
                          <p className="text-sm">Upload documents to support control testing</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}