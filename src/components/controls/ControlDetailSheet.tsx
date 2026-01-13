import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Shield, Link2, FileText, AlertTriangle, User, Building2, Clock, 
  Plus, Trash2, ExternalLink, Layers, Upload, Download, Eye 
} from 'lucide-react';
import { useInternalControl } from '@/hooks/useInternalControls';
import { 
  useControlFrameworkMappings, 
  useRiskControlLinks,
  useDeleteFrameworkMapping,
  useDeleteRiskControlLink 
} from '@/hooks/useControlMappings';
import { useControlEvidence, useUploadControlEvidence, useDeleteControlEvidence, getEvidenceDownloadUrl } from '@/hooks/useEvidence';
import { useInternalControlFindings } from '@/hooks/useControlFindings';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { FrameworkMappingDialog } from './FrameworkMappingDialog';
import { ControlFindingsTab } from './ControlFindingsTab';

interface ControlDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  controlId?: string | null;
}

export function ControlDetailSheet({ open, onOpenChange, controlId }: ControlDetailSheetProps) {
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [evidenceName, setEvidenceName] = useState('');
  
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    data: control,
    isLoading,
    error: controlError,
  } = useInternalControl(controlId || undefined);
  const { data: frameworkMappings = [] } = useControlFrameworkMappings(controlId || undefined);
  const { data: riskLinks = [] } = useRiskControlLinks(controlId || undefined);
  const { data: evidenceItems = [] } = useControlEvidence(controlId || undefined);
  const { data: findings = [] } = useInternalControlFindings(controlId || undefined);
  const deleteMapping = useDeleteFrameworkMapping();
  const deleteRiskLink = useDeleteRiskControlLink();
  const uploadEvidence = useUploadControlEvidence();
  const deleteEvidence = useDeleteControlEvidence();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !controlId || !user) return;

    await uploadEvidence.mutateAsync({
      file,
      name: evidenceName || file.name,
      internalControlId: controlId,
      userId: user.id,
      businessUnitId: (control as any)?.business_unit_id,
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

  if (!control && !isLoading && !controlError) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'default';
      case 'Draft': return 'secondary';
      case 'Under Review': return 'outline';
      case 'Deprecated': return 'destructive';
      default: return 'secondary';
    }
  };

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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full max-w-[900px] p-0">
          <ScrollArea className="max-h-[85vh]">
            <div className="p-6">
              <DialogHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="font-mono">
                        {control?.internal_control_code}
                      </Badge>
                      {control?.status && <Badge variant={getStatusColor(control.status)}>{control.status}</Badge>}
                      {control?.security_function && (
                        <Badge variant={getFunctionColor(control.security_function)}>{control.security_function}</Badge>
                      )}
                      <Badge variant={getComplianceVariant((control as any)?.compliance_status)}>
                        {getComplianceLabel((control as any)?.compliance_status)}
                      </Badge>
                    </div>
                    <DialogTitle className="text-xl">{control?.title}</DialogTitle>
                  </div>
                </div>
              </DialogHeader>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-muted-foreground">Loading control details...</p>
                </div>
              ) : controlError ? (
                <div className="py-12">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Unable to load control</CardTitle>
                      <CardDescription>{(controlError as any)?.message || 'An unexpected error occurred.'}</CardDescription>
                    </CardHeader>
                  </Card>
                </div>
              ) : !control ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-muted-foreground">No control selected.</p>
                </div>
              ) : (
                <Tabs defaultValue="overview" className="mt-4">
                  <TabsList className="grid w-full grid-cols-6">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="compliance">Compliance</TabsTrigger>
                    <TabsTrigger value="mappings">
                      Mappings
                      {frameworkMappings.length > 0 && (
                        <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                          {frameworkMappings.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="risks">
                      Risks
                      {riskLinks.length > 0 && (
                        <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                          {riskLinks.length}
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
                    <TabsTrigger value="evidence">Evidence</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-4 mt-4">
                    {/* Description */}
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

                    {/* Control Properties */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Control Properties</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="space-y-1">
                            <p className="text-muted-foreground">Control Type</p>
                            <p className="font-medium">{control?.control_type || '-'}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-muted-foreground">Security Function</p>
                            {control?.security_function ? <Badge variant="outline">{control.security_function}</Badge> : <p className="font-medium">-</p>}
                          </div>
                          <div className="space-y-1">
                            <p className="text-muted-foreground">Automation Level</p>
                            <p className="font-medium">{(control as any)?.automation_level || '-'}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-muted-foreground">Frequency</p>
                            <p className="font-medium">{(control as any)?.frequency || '-'}</p>
                          </div>
                        </div>

                        {(control as any)?.system_scope && (
                          <>
                            <Separator />
                            <div className="space-y-1">
                              <p className="text-muted-foreground text-sm">System Scope</p>
                              <p className="text-sm">{(control as any).system_scope}</p>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>

                    {/* Ownership */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Ownership & Organization</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-3">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Owner</p>
                            <p className="font-medium">{(control as any)?.owner?.full_name || 'Unassigned'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Business Unit</p>
                            <p className="font-medium">{(control as any)?.business_unit?.name || 'Not specified'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Last Updated</p>
                            <p className="font-medium">{control?.updated_at ? format(new Date(control.updated_at), 'MMM d, yyyy') : '-'}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="pt-4 text-center">
                          <Layers className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-2xl font-bold">{frameworkMappings.length}</p>
                          <p className="text-xs text-muted-foreground">Framework Mappings</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4 text-center">
                          <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-2xl font-bold">{riskLinks.length}</p>
                          <p className="text-xs text-muted-foreground">Linked Risks</p>
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
                  </TabsContent>

                  <TabsContent value="compliance" className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm font-medium">Compliance</CardTitle>
                        <CardDescription>Track implementation quality and deviations for this internal control.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Status</p>
                          <Badge variant={getComplianceVariant((control as any)?.compliance_status)}>
                            {getComplianceLabel((control as any)?.compliance_status)}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Notes</p>
                          <p className="text-sm whitespace-pre-wrap">{(control as any)?.compliance_notes || '—'}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* The rest of the tabs below are unchanged */
                  }
                  
                  <TabsContent value="mappings" className="mt-4">
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                              <Link2 className="h-4 w-4" />
                              Framework Mappings
                            </CardTitle>
                            <CardDescription>Map this control to external framework controls</CardDescription>
                          </div>
                          <Button size="sm" onClick={() => setMappingDialogOpen(true)}>
                            <Plus className="h-4 w-4 mr-1" />
                            Add Mapping
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {frameworkMappings.length > 0 ? (
                          <div className="space-y-3">
                            {frameworkMappings.map((mapping: any) => (
                              <div key={mapping.id} className="flex items-center justify-between p-3 border rounded-lg group">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="font-mono text-xs">
                                      {mapping.framework_control?.control_code}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">{mapping.framework_control?.framework?.name}</span>
                                    <Badge variant="secondary" className="text-xs">
                                      {mapping.mapping_type}
                                    </Badge>
                                  </div>
                                  <p className="text-sm mt-1">{mapping.framework_control?.title}</p>
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
                            <p>No framework mappings yet</p>
                            <p className="text-sm">Map this control to framework controls for compliance</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="risks" className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          Linked Risks
                        </CardTitle>
                        <CardDescription>Risks mitigated by this control</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {riskLinks.length > 0 ? (
                          <div className="space-y-3">
                            {riskLinks.map((link: any) => (
                              <div key={link.id} className="flex items-center justify-between p-3 border rounded-lg group">
                                <div>
                                  <p className="font-medium">{link.risk?.title}</p>
                                  <p className="text-sm text-muted-foreground">{link.risk?.risk_code}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="opacity-0 group-hover:opacity-100"
                                  onClick={() => deleteRiskLink.mutate(link.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No linked risks</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="findings" className="mt-4">
                    <ControlFindingsTab findings={findings as any} entityType="internal_control" entityId={controlId || ''} />
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
                            <CardDescription>Upload evidence documents for this control</CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Evidence name..."
                              value={evidenceName}
                              onChange={(e) => setEvidenceName(e.target.value)}
                              className="w-48"
                            />
                            <input ref={fileInputRef} type="file" onChange={handleFileUpload} className="hidden" />
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


      {controlId && (
        <FrameworkMappingDialog
          open={mappingDialogOpen}
          onOpenChange={setMappingDialogOpen}
          internalControlId={controlId}
        />
      )}
    </>
  );
}
