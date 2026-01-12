import { useState, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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
}

export function FrameworkControlDetailSheet({ 
  open, 
  onOpenChange, 
  controlId 
}: FrameworkControlDetailSheetProps) {
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

  if (!control && !isLoading) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[700px] sm:max-w-[700px] p-0">
        <ScrollArea className="h-full">
          <div className="p-6">
            <SheetHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="font-mono">
                      {control?.control_code}
                    </Badge>
                    {(control as any)?.framework?.name && (
                      <Badge variant="secondary">
                        {(control as any).framework.name}
                      </Badge>
                    )}
                    {control?.security_function && (
                      <Badge variant={getFunctionColor(control.security_function)}>
                        {control.security_function}
                      </Badge>
                    )}
                  </div>
                  <SheetTitle className="text-xl">{control?.title}</SheetTitle>
                </div>
                {!isEditing && (
                  <Button variant="outline" size="sm" onClick={handleEdit}>
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
            </SheetHeader>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">Loading control details...</p>
              </div>
            ) : (
              <Tabs defaultValue="details" className="mt-4">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="details">Details</TabsTrigger>
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
                            <Input
                              value={editData.control_code}
                              onChange={(e) => setEditData({ ...editData, control_code: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Security Function</Label>
                            <Select
                              value={editData.security_function}
                              onValueChange={(v) => setEditData({ ...editData, security_function: v })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                              <SelectContent className="bg-popover">
                                {SECURITY_FUNCTIONS.map((fn) => (
                                  <SelectItem key={fn} value={fn}>{fn}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Title</Label>
                          <Input
                            value={editData.title}
                            onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Domain</Label>
                            <Input
                              value={editData.domain}
                              onChange={(e) => setEditData({ ...editData, domain: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Subcategory</Label>
                            <Input
                              value={editData.subcategory}
                              onChange={(e) => setEditData({ ...editData, subcategory: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Control Type</Label>
                          <Input
                            value={editData.control_type}
                            onChange={(e) => setEditData({ ...editData, control_type: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Textarea
                            value={editData.description}
                            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                            rows={4}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Reference Links</Label>
                          <Input
                            value={editData.reference_links}
                            onChange={(e) => setEditData({ ...editData, reference_links: e.target.value })}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      {/* Description */}
                      {control?.description && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Description</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {control.description}
                            </p>
                          </CardContent>
                        </Card>
                      )}

                      {/* Control Properties */}
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
                              {control?.security_function ? (
                                <Badge variant="outline">{control.security_function}</Badge>
                              ) : (
                                <p className="font-medium">-</p>
                              )}
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
                              <p className="font-medium">
                                {control?.updated_at 
                                  ? format(new Date(control.updated_at), 'MMM d, yyyy')
                                  : '-'
                                }
                              </p>
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

                      {/* Quick Stats */}
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
                            <Shield className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-2xl font-bold">
                              {(control as any)?.framework?.name ? 1 : 0}
                            </p>
                            <p className="text-xs text-muted-foreground">Framework</p>
                          </CardContent>
                        </Card>
                      </div>
                    </>
                  )}
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
                          <CardDescription>
                            Map this framework control to internal controls
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Add mapping */}
                      <div className="flex gap-2">
                        <Select value={mappingInternalId} onValueChange={setMappingInternalId}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select internal control to map..." />
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            <ScrollArea className="max-h-[200px]">
                              {availableInternalControls.map((ic) => (
                                <SelectItem key={ic.id} value={ic.id}>
                                  <span className="font-mono text-xs mr-2">{ic.internal_control_code}</span>
                                  {ic.title}
                                </SelectItem>
                              ))}
                              {availableInternalControls.length === 0 && (
                                <div className="text-center py-4 text-sm text-muted-foreground">
                                  No available internal controls
                                </div>
                              )}
                            </ScrollArea>
                          </SelectContent>
                        </Select>
                        <Button 
                          onClick={handleAddMapping}
                          disabled={!mappingInternalId || createMapping.isPending}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Map
                        </Button>
                      </div>

                      <Separator />

                      {/* Existing mappings */}
                      {internalMappings.length > 0 ? (
                        <div className="space-y-3">
                          {internalMappings.map((mapping: any) => (
                            <div 
                              key={mapping.id}
                              className="flex items-center justify-between p-3 border rounded-lg group"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="font-mono text-xs">
                                    {mapping.internal_control?.internal_control_code}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    {mapping.mapping_type}
                                  </Badge>
                                  <Badge variant={
                                    mapping.internal_control?.status === 'Active' ? 'default' : 'secondary'
                                  } className="text-xs">
                                    {mapping.internal_control?.status}
                                  </Badge>
                                </div>
                                <p className="text-sm mt-1">
                                  {mapping.internal_control?.title}
                                </p>
                                {mapping.notes && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {mapping.notes}
                                  </p>
                                )}
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
                          <p>No internal control mappings yet</p>
                          <p className="text-sm">Map this control to your internal controls</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="findings" className="mt-4">
                  <ControlFindingsTab 
                    controlId={controlId!}
                    controlType="framework"
                  />
                </TabsContent>

                <TabsContent value="guidance" className="mt-4 space-y-4">
                  {control?.guidance && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Guidance</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {control.guidance}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                  
                  {control?.implementation_guidance && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Implementation Guidance</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {control.implementation_guidance}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {!control?.guidance && !control?.implementation_guidance && (
                    <Card>
                      <CardContent className="py-12 text-center text-muted-foreground">
                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No guidance available for this control</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="evidence" className="mt-4 space-y-4">
                  {/* Upload Section */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        Upload Evidence
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <Label>Evidence Name</Label>
                        <Input
                          value={evidenceName}
                          onChange={(e) => setEvidenceName(e.target.value)}
                          placeholder="Enter evidence name..."
                        />
                      </div>
                      <div>
                        <Input
                          ref={fileInputRef}
                          type="file"
                          onChange={handleFileUpload}
                          disabled={uploadEvidence.isPending}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Evidence List */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Evidence Items ({evidenceItems.length})
                          </CardTitle>
                          <CardDescription>
                            Documents and artifacts supporting control effectiveness
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {evidenceItems.length > 0 ? (
                        <div className="space-y-3">
                          {evidenceItems.map((item) => (
                            <div 
                              key={item.id}
                              className="flex items-center justify-between p-3 border rounded-lg group"
                            >
                              <div className="flex-1">
                                <p className="font-medium text-sm">{item.evidence_item?.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {item.evidence_item?.file_name} • {format(new Date(item.created_at), 'MMM d, yyyy')}
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                {item.evidence_item?.storage_key && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleView(item.evidence_item!.storage_key!)}
                                      title="View"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDownload(item.evidence_item!.storage_key!, item.evidence_item!.file_name || 'download')}
                                      title="Download"
                                    >
                                      <Download className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="opacity-0 group-hover:opacity-100"
                                  onClick={() => deleteEvidence.mutate({
                                    linkId: item.id,
                                    evidenceId: item.evidence_id,
                                    storageKey: item.evidence_item?.storage_key || null,
                                    frameworkControlId: controlId || undefined,
                                  })}
                                >
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
      </SheetContent>
    </Sheet>
  );
}