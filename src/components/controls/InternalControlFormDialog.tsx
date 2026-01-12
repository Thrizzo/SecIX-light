import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { CalendarIcon, Plus, X, Server, Database, Layers, Shield, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  useInternalControl, 
  useCreateInternalControl, 
  useUpdateInternalControl,
  CONTROL_TYPES,
  AUTOMATION_LEVELS,
  CONTROL_FREQUENCIES,
  CONTROL_STATUSES,
  COMPLIANCE_STATUSES,
  CreateInternalControlInput,
} from '@/hooks/useInternalControls';
import { SECURITY_FUNCTIONS } from '@/hooks/useControlFrameworks';
import { useBusinessUnits } from '@/hooks/useBusinessUnits';
import { useProfiles } from '@/hooks/useProfiles';
import { usePrimaryAssets, useSecondaryAssets } from '@/hooks/useAssets';
import { useControlAssetLinks, useCreateControlAssetLink, useDeleteControlAssetLink } from '@/hooks/useControlAssetLinks';

interface InternalControlFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  controlId?: string | null;
}

export function InternalControlFormDialog({ open, onOpenChange, controlId }: InternalControlFormDialogProps) {
  const isEditing = !!controlId;
  const { data: existingControl } = useInternalControl(controlId || undefined);
  const { data: businessUnits = [] } = useBusinessUnits();
  const { data: profiles = [] } = useProfiles();
  const { data: primaryAssets = [] } = usePrimaryAssets();
  const { data: secondaryAssets = [] } = useSecondaryAssets();
  const { data: assetLinks = [] } = useControlAssetLinks(controlId || undefined);
  
  const [assetPopoverOpen, setAssetPopoverOpen] = useState(false);
  const [subcontrolsExpanded, setSubcontrolsExpanded] = useState(true);
  
  // Subcontrols state - parsed from description for editing
  const [subcontrols, setSubcontrols] = useState<Array<{
    id: string;
    title: string;
    description: string;
  }>>([]);
  
  const createControl = useCreateInternalControl();
  const updateControl = useUpdateInternalControl();
  const createAssetLink = useCreateControlAssetLink();
  const deleteAssetLink = useDeleteControlAssetLink();
  
  // Parse subcontrols from description when editing
  const parseSubcontrolsFromDescription = (description: string): { mainDescription: string; subcontrols: Array<{ id: string; title: string; description: string }> } => {
    const subcontrolsMatch = description?.split('**Subcontrols:**');
    if (!subcontrolsMatch || subcontrolsMatch.length < 2) {
      // Also try to extract implementation guidance
      const guidanceMatch = description?.split('**Implementation Guidance:**');
      return { 
        mainDescription: guidanceMatch ? guidanceMatch[0].trim() : (description || ''), 
        subcontrols: [] 
      };
    }
    
    const mainPart = subcontrolsMatch[0].split('**Implementation Guidance:**')[0].trim();
    const subcontrolsPart = subcontrolsMatch[1];
    
    // Parse individual subcontrols
    const subcontrolRegex = /\*\*([A-Z]+-\d+\.\d+|\d+)\.\s*([^*]+)\*\*\n([^*]+?)(?=\*\*[A-Z]+-\d+\.\d+|\*\*\d+|$)/gs;
    const parsed: Array<{ id: string; title: string; description: string }> = [];
    let match;
    
    while ((match = subcontrolRegex.exec(subcontrolsPart)) !== null) {
      parsed.push({
        id: match[1],
        title: match[2].trim(),
        description: match[3].trim(),
      });
    }
    
    // Fallback simpler parsing
    if (parsed.length === 0) {
      const lines = subcontrolsPart.split('\n').filter(l => l.trim());
      let currentSubcontrol: { id: string; title: string; description: string } | null = null;
      
      for (const line of lines) {
        const titleMatch = line.match(/^\*\*(.+?)\.\s*(.+?)\*\*$/);
        if (titleMatch) {
          if (currentSubcontrol) parsed.push(currentSubcontrol);
          currentSubcontrol = { id: titleMatch[1], title: titleMatch[2], description: '' };
        } else if (currentSubcontrol && line.trim()) {
          currentSubcontrol.description += (currentSubcontrol.description ? ' ' : '') + line.trim();
        }
      }
      if (currentSubcontrol) parsed.push(currentSubcontrol);
    }
    
    return { mainDescription: mainPart, subcontrols: parsed };
  };
  
  // Build description with subcontrols
  const buildDescriptionWithSubcontrols = (mainDesc: string, guidance: string, subs: Array<{ id: string; title: string; description: string }>): string => {
    let result = mainDesc;
    if (guidance) {
      result += `\n\n**Implementation Guidance:**\n${guidance}`;
    }
    if (subs.length > 0) {
      result += '\n\n**Subcontrols:**\n';
      subs.forEach((sub, idx) => {
        const subId = sub.id || `${idx + 1}`;
        result += `\n**${subId}. ${sub.title}**\n${sub.description}`;
      });
    }
    return result;
  };

  const form = useForm<CreateInternalControlInput>({
    defaultValues: {
      internal_control_code: '',
      title: '',
      description: '',
      control_type: undefined,
      automation_level: undefined,
      frequency: undefined,
      status: 'Draft',
      security_function: undefined,
      owner_id: undefined,
      business_unit_id: undefined,
      system_scope: '',
      effective_date: undefined,
      review_date: undefined,
      compliance_status: 'not_assessed',
    },
  });

  useEffect(() => {
    if (existingControl && isEditing) {
      const { mainDescription, subcontrols: parsedSubs } = parseSubcontrolsFromDescription(existingControl.description || '');
      
      form.reset({
        internal_control_code: existingControl.internal_control_code,
        title: existingControl.title,
        description: mainDescription,
        control_type: existingControl.control_type || undefined,
        automation_level: existingControl.automation_level || undefined,
        frequency: existingControl.frequency || undefined,
        status: existingControl.status,
        security_function: existingControl.security_function || undefined,
        owner_id: existingControl.owner_id || undefined,
        business_unit_id: existingControl.business_unit_id || undefined,
        system_scope: existingControl.system_scope || '',
        effective_date: existingControl.effective_date || undefined,
        review_date: existingControl.review_date || undefined,
        compliance_status: existingControl.compliance_status || 'not_assessed',
      });
      
      setSubcontrols(parsedSubs);
    } else if (!isEditing) {
      form.reset({
        internal_control_code: '',
        title: '',
        description: '',
        control_type: undefined,
        automation_level: undefined,
        frequency: undefined,
        status: 'Draft',
        security_function: undefined,
        owner_id: undefined,
        business_unit_id: undefined,
        system_scope: '',
        effective_date: undefined,
        review_date: undefined,
        compliance_status: 'not_assessed',
      });
      setSubcontrols([]);
    }
  }, [existingControl, isEditing, form]);

  const onSubmit = async (data: CreateInternalControlInput) => {
    try {
      // Rebuild the full description with subcontrols
      const fullDescription = buildDescriptionWithSubcontrols(
        data.description || '',
        '', // guidance is embedded in description already
        subcontrols
      );
      
      const submitData = { ...data, description: fullDescription };
      
      if (isEditing && controlId) {
        await updateControl.mutateAsync({ id: controlId, ...submitData });
      } else {
        await createControl.mutateAsync(submitData);
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };
  
  const addSubcontrol = () => {
    const newId = `SC-${subcontrols.length + 1}`;
    setSubcontrols(prev => [...prev, { id: newId, title: '', description: '' }]);
  };
  
  const updateSubcontrol = (index: number, field: 'title' | 'description', value: string) => {
    setSubcontrols(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };
  
  const removeSubcontrol = (index: number) => {
    setSubcontrols(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEditing ? 'Edit Internal Control' : 'Add Internal Control'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the details of this internal control.'
              : 'Create a new internal control for your control library.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-hidden flex flex-col">
            <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="w-full justify-start mb-4">
                <TabsTrigger value="details">Control Details</TabsTrigger>
                <TabsTrigger value="subcontrols" className="gap-1.5">
                  <Shield className="h-3.5 w-3.5" />
                  Subcontrols
                  {subcontrols.length > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs">{subcontrols.length}</Badge>
                  )}
                </TabsTrigger>
                {isEditing && <TabsTrigger value="assets">Assets in Scope</TabsTrigger>}
              </TabsList>
              
              <ScrollArea className="flex-1 pr-4">
                {/* Details Tab */}
                <TabsContent value="details" className="space-y-6 mt-0">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="internal_control_code"
                      rules={{ required: 'Control code is required' }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Control Code *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., IC-001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CONTROL_STATUSES.map(status => (
                                <SelectItem key={status} value={status}>{status}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="compliance_status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Compliance Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || 'not_assessed'}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select compliance status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {COMPLIANCE_STATUSES.map(cs => (
                              <SelectItem key={cs.value} value={cs.value}>
                                <div className="flex flex-col">
                                  <span>{cs.label}</span>
                                  <span className="text-xs text-muted-foreground">{cs.description}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="title"
                    rules={{ required: 'Title is required' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title *</FormLabel>
                        <FormControl>
                          <Input placeholder="Control title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe the control objective and activities..."
                            rows={4}
                            className="min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="control_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Control Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CONTROL_TYPES.map(type => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="security_function"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Security Function (NIST CSF)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select function" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {SECURITY_FUNCTIONS.map(fn => (
                                <SelectItem key={fn} value={fn}>{fn}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="automation_level"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Automation Level</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {AUTOMATION_LEVELS.map(level => (
                                <SelectItem key={level} value={level}>{level}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="frequency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Frequency</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select frequency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CONTROL_FREQUENCIES.map(freq => (
                                <SelectItem key={freq} value={freq}>{freq}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="owner_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Owner</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select owner" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {profiles.map(profile => (
                                <SelectItem key={profile.id} value={profile.id}>
                                  {profile.full_name || profile.email}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="business_unit_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Unit</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select unit" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {businessUnits.map(bu => (
                                <SelectItem key={bu.id} value={bu.id}>{bu.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="effective_date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Effective Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(new Date(field.value), "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value ? new Date(field.value) : undefined}
                                onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : undefined)}
                                initialFocus
                                className={cn("p-3 pointer-events-auto")}
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="review_date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Review Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(new Date(field.value), "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value ? new Date(field.value) : undefined}
                                onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : undefined)}
                                initialFocus
                                className={cn("p-3 pointer-events-auto")}
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="system_scope"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>System Scope Notes</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Additional scope notes..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* Subcontrols Tab */}
                <TabsContent value="subcontrols" className="space-y-4 mt-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-medium">Subcontrols</h3>
                      <p className="text-sm text-muted-foreground">
                        Break down this control into specific subcontrols with their own descriptions
                      </p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addSubcontrol} className="gap-1.5">
                      <Plus className="h-3.5 w-3.5" />
                      Add Subcontrol
                    </Button>
                  </div>

                  {subcontrols.length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <Shield className="h-12 w-12 text-muted-foreground/30 mb-4" />
                        <p className="text-muted-foreground text-center">No subcontrols defined yet</p>
                        <p className="text-sm text-muted-foreground text-center mt-1">
                          Add subcontrols to break down this control into specific requirements
                        </p>
                        <Button type="button" variant="outline" size="sm" onClick={addSubcontrol} className="mt-4 gap-1.5">
                          <Plus className="h-3.5 w-3.5" />
                          Add First Subcontrol
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {subcontrols.map((sub, idx) => (
                        <Card key={idx} className="relative">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="font-mono text-xs">
                                  {form.watch('internal_control_code') || 'IC'}.{idx + 1}
                                </Badge>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => removeSubcontrol(idx)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div>
                              <FormLabel className="text-xs">Subcontrol Title</FormLabel>
                              <Input
                                value={sub.title}
                                onChange={(e) => updateSubcontrol(idx, 'title', e.target.value)}
                                placeholder="Enter subcontrol title..."
                                className="mt-1.5"
                              />
                            </div>
                            <div>
                              <FormLabel className="text-xs">Description</FormLabel>
                              <Textarea
                                value={sub.description}
                                onChange={(e) => updateSubcontrol(idx, 'description', e.target.value)}
                                placeholder="Describe this subcontrol requirement..."
                                rows={3}
                                className="mt-1.5"
                              />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Assets Tab - Only when editing */}
                {isEditing && controlId && (
                  <TabsContent value="assets" className="space-y-4 mt-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-medium">Assets in Scope</h3>
                        <p className="text-sm text-muted-foreground">
                          Link assets that are covered by this control
                        </p>
                      </div>
                      <Popover open={assetPopoverOpen} onOpenChange={setAssetPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button type="button" variant="outline" size="sm" className="gap-1.5">
                            <Plus className="h-3.5 w-3.5" />
                            Add Asset
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-0" align="end">
                          <div className="p-3 border-b">
                            <p className="text-sm font-medium">Link an Asset</p>
                            <p className="text-xs text-muted-foreground">Select assets that are in scope for this control</p>
                          </div>
                          <ScrollArea className="max-h-[300px]">
                            <div className="p-2">
                              {primaryAssets.length > 0 && (
                                <div className="mb-2">
                                  <p className="text-xs font-medium text-muted-foreground px-2 py-1">Primary Assets</p>
                                  {primaryAssets
                                    .filter(a => !assetLinks.some(l => l.primary_asset_id === a.id))
                                    .slice(0, 10)
                                    .map(asset => (
                                      <Button
                                        key={asset.id}
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="w-full justify-start text-left h-auto py-2 px-2"
                                        onClick={() => {
                                          createAssetLink.mutate({
                                            internal_control_id: controlId,
                                            primary_asset_id: asset.id,
                                          });
                                          setAssetPopoverOpen(false);
                                        }}
                                      >
                                        <div className="flex items-center gap-2">
                                          {asset.asset_kind === 'process' ? (
                                            <Layers className="h-3.5 w-3.5 text-blue-500" />
                                          ) : (
                                            <Database className="h-3.5 w-3.5 text-green-500" />
                                          )}
                                          <div>
                                            <span className="font-medium text-sm">{asset.name}</span>
                                            <span className="text-xs text-muted-foreground ml-2">{asset.asset_id}</span>
                                          </div>
                                        </div>
                                      </Button>
                                    ))}
                                </div>
                              )}
                              {secondaryAssets.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground px-2 py-1">Secondary Assets</p>
                                  {secondaryAssets
                                    .filter(a => !assetLinks.some(l => l.secondary_asset_id === a.id))
                                    .slice(0, 10)
                                    .map(asset => (
                                      <Button
                                        key={asset.id}
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="w-full justify-start text-left h-auto py-2 px-2"
                                        onClick={() => {
                                          createAssetLink.mutate({
                                            internal_control_id: controlId,
                                            secondary_asset_id: asset.id,
                                          });
                                          setAssetPopoverOpen(false);
                                        }}
                                      >
                                        <div className="flex items-center gap-2">
                                          <Server className="h-3.5 w-3.5 text-purple-500" />
                                          <div>
                                            <span className="font-medium text-sm">{asset.name}</span>
                                            <span className="text-xs text-muted-foreground ml-2">{asset.asset_id}</span>
                                          </div>
                                        </div>
                                      </Button>
                                    ))}
                                </div>
                              )}
                              {primaryAssets.length === 0 && secondaryAssets.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                  No assets available
                                </p>
                              )}
                            </div>
                          </ScrollArea>
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    {assetLinks.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {assetLinks.map(link => (
                          <Card key={link.id} className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {link.primary_asset ? (
                                  <>
                                    {link.primary_asset.asset_kind === 'process' ? (
                                      <Layers className="h-4 w-4 text-blue-500" />
                                    ) : (
                                      <Database className="h-4 w-4 text-green-500" />
                                    )}
                                    <div>
                                      <p className="font-medium text-sm">{link.primary_asset.name}</p>
                                      <p className="text-xs text-muted-foreground">Primary Asset</p>
                                    </div>
                                  </>
                                ) : link.secondary_asset ? (
                                  <>
                                    <Server className="h-4 w-4 text-purple-500" />
                                    <div>
                                      <p className="font-medium text-sm">{link.secondary_asset.name}</p>
                                      <p className="text-xs text-muted-foreground">Secondary Asset</p>
                                    </div>
                                  </>
                                ) : null}
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => deleteAssetLink.mutate({ id: link.id, internalControlId: controlId })}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-12">
                          <Database className="h-12 w-12 text-muted-foreground/30 mb-4" />
                          <p className="text-muted-foreground text-center">No assets linked yet</p>
                          <p className="text-sm text-muted-foreground text-center mt-1">
                            Add assets to define the scope of this control
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>
                )}
              </ScrollArea>
            </Tabs>

            <Separator className="my-4" />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createControl.isPending || updateControl.isPending}
              >
                {createControl.isPending || updateControl.isPending 
                  ? 'Saving...' 
                  : isEditing ? 'Update Control' : 'Create Control'
                }
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
