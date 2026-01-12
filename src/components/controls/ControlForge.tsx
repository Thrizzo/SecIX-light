import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Wand2, Loader2, Sparkles, Plus, Copy, 
  CheckCircle2, ChevronDown, ChevronUp, Shield, X, Layers,
  AlertCircle, ArrowRight, Search
} from 'lucide-react';
import { useControlFrameworks, useFrameworkControls } from '@/hooks/useControlFrameworks';
import { useInternalControls, useCreateInternalControl } from '@/hooks/useInternalControls';
import { useCreateFrameworkMapping } from '@/hooks/useControlMappings';
import { supabase } from '@/integrations/database/client';
import { useToast } from '@/hooks/use-toast';

interface SingleControlSuggestion {
  title: string;
  description: string;
  implementation_guidance: string;
  control_type: string;
  automation_level: string;
  frequency: string;
  security_function: string;
  subcontrols?: {
    title: string;
    description: string;
  }[];
}

interface MultiControlSuggestion {
  coverage_analysis: {
    overall_coverage: number;
    common_requirements: string[];
    control_specific: {
      control_code: string;
      unique_requirements: string[];
      coverage_by_unified: number;
    }[];
    gaps: string[];
  };
  unified_control: {
    title: string;
    description: string;
    implementation_guidance: string;
    control_type: string;
    automation_level: string;
    frequency: string;
    security_function: string;
    subcontrols?: {
      title: string;
      description: string;
      addresses_controls?: string[];
    }[];
    framework_mappings?: {
      control_code: string;
      coverage_type: string;
      notes: string;
    }[];
  };
}

type AISuggestion = SingleControlSuggestion | MultiControlSuggestion;

function isMultiControlSuggestion(suggestion: AISuggestion): suggestion is MultiControlSuggestion {
  return 'coverage_analysis' in suggestion && 'unified_control' in suggestion;
}

export function ControlForge() {
  const { toast } = useToast();
  
  const [selectedFrameworkIds, setSelectedFrameworkIds] = useState<string[]>([]);
  const [selectedControlIds, setSelectedControlIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);
  const [expandedSubcontrols, setExpandedSubcontrols] = useState(false);
  const [expandedCoverage, setExpandedCoverage] = useState(true);
  const [customContext, setCustomContext] = useState('');
  const [controlSearch, setControlSearch] = useState('');
  
  // Editable suggestion fields
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedGuidance, setEditedGuidance] = useState('');
  
  // Subcontrol state: array of { selected, title, description } for each subcontrol
  const [editedSubcontrols, setEditedSubcontrols] = useState<Array<{
    selected: boolean;
    title: string;
    description: string;
    editingTitle: boolean;
    editingDescription: boolean;
    addresses_controls?: string[];
  }>>([]);

  const { data: frameworks = [] } = useControlFrameworks();
  
  // Fetch controls for all selected frameworks
  const fw1Controls = useFrameworkControls(selectedFrameworkIds[0] || undefined);
  const fw2Controls = useFrameworkControls(selectedFrameworkIds[1] || undefined);
  const fw3Controls = useFrameworkControls(selectedFrameworkIds[2] || undefined);
  const fw4Controls = useFrameworkControls(selectedFrameworkIds[3] || undefined);
  const fw5Controls = useFrameworkControls(selectedFrameworkIds[4] || undefined);
  
  // Aggregate controls from all selected frameworks
  const aggregatedControls = useMemo(() => {
    const controlsMap = new Map<string, { control: any; frameworkName: string; frameworkId: string }>();
    
    const addControls = (controls: any[], frameworkId: string) => {
      const framework = frameworks.find(f => f.id === frameworkId);
      controls.forEach(ctrl => {
        controlsMap.set(ctrl.id, { 
          control: ctrl, 
          frameworkName: framework?.name || 'Unknown',
          frameworkId 
        });
      });
    };
    
    if (selectedFrameworkIds[0] && fw1Controls.data) addControls(fw1Controls.data, selectedFrameworkIds[0]);
    if (selectedFrameworkIds[1] && fw2Controls.data) addControls(fw2Controls.data, selectedFrameworkIds[1]);
    if (selectedFrameworkIds[2] && fw3Controls.data) addControls(fw3Controls.data, selectedFrameworkIds[2]);
    if (selectedFrameworkIds[3] && fw4Controls.data) addControls(fw4Controls.data, selectedFrameworkIds[3]);
    if (selectedFrameworkIds[4] && fw5Controls.data) addControls(fw5Controls.data, selectedFrameworkIds[4]);
    
    return Array.from(controlsMap.values());
  }, [selectedFrameworkIds, fw1Controls.data, fw2Controls.data, fw3Controls.data, fw4Controls.data, fw5Controls.data, frameworks]);

  const { data: internalControls = [] } = useInternalControls();
  const createInternalControl = useCreateInternalControl();
  const createMapping = useCreateFrameworkMapping();

  const selectedControls = useMemo(() => 
    selectedControlIds.map(id => aggregatedControls.find(c => c.control.id === id)).filter(Boolean),
    [selectedControlIds, aggregatedControls]
  );

  // Filter controls based on search
  const filteredControls = useMemo(() => {
    if (!controlSearch.trim()) return aggregatedControls;
    const search = controlSearch.toLowerCase();
    return aggregatedControls.filter(({ control, frameworkName }) => 
      control.control_code?.toLowerCase().includes(search) ||
      control.title?.toLowerCase().includes(search) ||
      control.description?.toLowerCase().includes(search) ||
      control.domain?.toLowerCase().includes(search) ||
      frameworkName.toLowerCase().includes(search)
    );
  }, [aggregatedControls, controlSearch]);

  const toggleFramework = (frameworkId: string) => {
    setSelectedFrameworkIds(prev => {
      if (prev.includes(frameworkId)) {
        return prev.filter(id => id !== frameworkId);
      }
      if (prev.length >= 5) {
        toast({ title: 'Maximum 5 frameworks', description: 'You can select up to 5 frameworks at once' });
        return prev;
      }
      return [...prev, frameworkId];
    });
    setSelectedControlIds([]);
    setSuggestion(null);
  };

  const toggleControlSelection = (controlId: string) => {
    setSelectedControlIds(prev => {
      if (prev.includes(controlId)) {
        return prev.filter(id => id !== controlId);
      }
      if (prev.length >= 10) {
        toast({ title: 'Maximum 10 controls', description: 'You can select up to 10 controls' });
        return prev;
      }
      return [...prev, controlId];
    });
    setSuggestion(null);
  };

  const generateSuggestion = async () => {
    if (selectedControlIds.length === 0) return;

    setIsGenerating(true);
    setSuggestion(null);

    try {
      const controlsToSend = selectedControls.map(c => ({
        code: c!.control.control_code,
        title: c!.control.title,
        description: c!.control.description,
        guidance: c!.control.guidance,
        implementation_guidance: c!.control.implementation_guidance,
        domain: c!.control.domain,
        security_function: c!.control.security_function,
        framework: c!.frameworkName,
      }));

      const { data, error } = await supabase.functions.invoke<{ suggestion: AISuggestion }>('control-forge-suggest', {
        body: {
          frameworkControls: controlsToSend,
          customContext,
          existingControls: internalControls.map(c => ({
            code: c.internal_control_code,
            title: c.title,
            description: c.description,
          })),
        },
      });

      if (error) throw error;
      const suggestionData = data?.suggestion ?? null;
      setSuggestion(suggestionData);
      
      // Populate editable fields from suggestion
      if (suggestionData) {
        const controlData = isMultiControlSuggestion(suggestionData) 
          ? suggestionData.unified_control 
          : suggestionData;
        setEditedTitle(controlData.title || '');
        setEditedDescription(controlData.description || '');
        setEditedGuidance(controlData.implementation_guidance || '');
        
        // Initialize editable subcontrols
        if (controlData.subcontrols && controlData.subcontrols.length > 0) {
          setEditedSubcontrols(controlData.subcontrols.map((sub: any) => ({
            selected: true,
            title: sub.title || '',
            description: sub.description || '',
            editingTitle: false,
            editingDescription: false,
            addresses_controls: sub.addresses_controls || [],
          })));
        } else {
          setEditedSubcontrols([]);
        }
      }
    } catch (error: any) {
      console.error('AI suggestion error:', error);
      toast({
        title: 'Failed to generate suggestion',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const createControlFromSuggestion = async () => {
    if (!suggestion) return;

    const controlData = isMultiControlSuggestion(suggestion) 
      ? suggestion.unified_control 
      : suggestion;

    try {
      // Generate a unique control code
      const existingCodes = internalControls.map(c => c.internal_control_code);
      let codeNum = internalControls.length + 1;
      let newCode = `INT-${String(codeNum).padStart(3, '0')}`;
      while (existingCodes.includes(newCode)) {
        codeNum++;
        newCode = `INT-${String(codeNum).padStart(3, '0')}`;
      }

      // Collect the source framework control IDs
      const sourceFrameworkControlIds = selectedControls
        .map(c => c?.control.id)
        .filter((id): id is string => !!id);

      // Build description with optional subcontrols (only selected ones)
      let fullDescription = `${editedDescription}\n\n**Implementation Guidance:**\n${editedGuidance}`;
      
      const selectedSubcontrols = editedSubcontrols.filter(sub => sub.selected);
      if (selectedSubcontrols.length > 0) {
        fullDescription += '\n\n**Subcontrols:**\n';
        selectedSubcontrols.forEach((sub, idx) => {
          const subId = `${newCode}.${idx + 1}`;
          fullDescription += `\n**${subId}. ${sub.title}**\n${sub.description}`;
        });
      }

      const newControl = await createInternalControl.mutateAsync({
        internal_control_code: newCode,
        title: editedTitle,
        description: fullDescription,
        control_type: controlData.control_type,
        automation_level: controlData.automation_level,
        frequency: controlData.frequency,
        security_function: controlData.security_function,
        status: 'Draft',
        source_framework_control_ids: sourceFrameworkControlIds,
      });

      // Create mappings to all selected framework controls
      if (newControl?.id) {
        for (const ctrl of selectedControls) {
          if (ctrl) {
            await createMapping.mutateAsync({
              internal_control_id: newControl.id,
              framework_control_id: ctrl.control.id,
              mapping_type: selectedControls.length > 1 ? 'Covers' : 'Exact',
              notes: selectedControls.length > 1 
                ? 'Created via Control Forge AI - Unified control' 
                : 'Created via Control Forge AI',
            });
          }
        }
      }

      const controlCodes = selectedControls.map(c => c?.control.control_code).filter(Boolean).join(', ');
      toast({
        title: 'Control created successfully',
        description: `${newCode} has been created and mapped to ${controlCodes}`,
      });

      // Reset
      setSuggestion(null);
      setSelectedControlIds([]);
      setEditedTitle('');
      setEditedDescription('');
      setEditedGuidance('');
      setEditedSubcontrols([]);
    } catch (error: any) {
      toast({
        title: 'Failed to create control',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard' });
  };

  const getCoverageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 70) return 'text-blue-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getCoverageBarColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-green-500';
    if (percentage >= 70) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          Control Forge
        </h2>
        <p className="text-muted-foreground">
          Select multiple framework controls to analyze coverage and generate unified internal controls
        </p>
      </div>

      {/* Framework Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Source Frameworks</CardTitle>
          <CardDescription>Select frameworks to work with controls from multiple standards</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2 min-h-[40px] p-3 border border-dashed rounded-lg bg-muted/30">
            {selectedFrameworkIds.length === 0 ? (
              <span className="text-sm text-muted-foreground">No frameworks selected</span>
            ) : (
              selectedFrameworkIds.map(id => {
                const fw = frameworks.find(f => f.id === id);
                return fw ? (
                  <Badge 
                    key={id} 
                    variant="secondary" 
                    className="flex items-center gap-1.5 py-1.5 px-3 bg-primary/10 text-primary border-primary/20"
                  >
                    <Layers className="h-3 w-3" />
                    {fw.name} {fw.version && `v${fw.version}`}
                    <X 
                      className="h-3.5 w-3.5 cursor-pointer hover:text-destructive transition-colors" 
                      onClick={() => toggleFramework(id)} 
                    />
                  </Badge>
                ) : null;
              })
            )}
            
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 gap-1.5 border-dashed"
                  disabled={selectedFrameworkIds.length >= 5}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Framework
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2 bg-popover" align="start">
                <ScrollArea className="max-h-[250px]">
                  <div className="space-y-1">
                    {frameworks
                      .filter(fw => !selectedFrameworkIds.includes(fw.id))
                      .map(fw => (
                        <Button
                          key={fw.id}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-left h-auto py-2 px-3"
                          onClick={() => toggleFramework(fw.id)}
                        >
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{fw.name}</span>
                            {fw.version && (
                              <span className="text-xs text-muted-foreground">v{fw.version}</span>
                            )}
                          </div>
                        </Button>
                      ))}
                    {frameworks.filter(fw => !selectedFrameworkIds.includes(fw.id)).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        All frameworks selected
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
          </div>
          
          {selectedFrameworkIds.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              {selectedFrameworkIds.length}/5 frameworks • {aggregatedControls.length} controls available
            </p>
          )}
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Control Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Framework Controls</CardTitle>
            <CardDescription>
              Choose 1-10 controls to generate a unified internal control
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedFrameworkIds.length > 0 ? (
              <>
                {/* Selected Controls Summary */}
                {selectedControlIds.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Selected Controls ({selectedControlIds.length})
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedControlIds([])}>
                        Clear all
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedControls.map(c => c && (
                        <Badge 
                          key={c.control.id} 
                          variant="secondary"
                          className="flex items-center gap-1 bg-primary/10 text-primary"
                        >
                          <span className="font-mono text-xs">{c.control.control_code}</span>
                          <X 
                            className="h-3 w-3 cursor-pointer hover:text-destructive" 
                            onClick={() => toggleControlSelection(c.control.id)} 
                          />
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search controls by code, title, or domain..."
                    value={controlSearch}
                    onChange={e => setControlSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Control List */}
                <ScrollArea className="h-[300px] border rounded-lg">
                  <div className="p-2 space-y-1">
                    {filteredControls.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No controls match "{controlSearch}"</p>
                      </div>
                    ) : (
                      filteredControls.map(({ control: ctrl, frameworkName }) => (
                        <div
                          key={ctrl.id}
                          className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors ${
                            selectedControlIds.includes(ctrl.id) ? 'bg-primary/10 border border-primary/30' : ''
                          }`}
                          onClick={() => toggleControlSelection(ctrl.id)}
                        >
                          <Checkbox 
                            checked={selectedControlIds.includes(ctrl.id)}
                            onCheckedChange={() => toggleControlSelection(ctrl.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-muted-foreground">{ctrl.control_code}</span>
                              <Badge variant="outline" className="text-xs">{frameworkName}</Badge>
                            </div>
                            <p className="text-sm truncate">{ctrl.title}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>

                <Separator />

                {/* Additional Context */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Additional Context (Optional)</label>
                  <Textarea
                    placeholder="Add organization-specific context, constraints, or requirements..."
                    value={customContext}
                    onChange={e => setCustomContext(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button 
                  className="w-full" 
                  onClick={generateSuggestion}
                  disabled={selectedControlIds.length === 0 || isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {selectedControlIds.length > 1 ? 'Analyzing & Generating...' : 'Generating...'}
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      {selectedControlIds.length > 1 
                        ? `Analyze & Generate Unified Control (${selectedControlIds.length})` 
                        : 'Generate Internal Control'}
                    </>
                  )}
                </Button>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Layers className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Select frameworks above to see available controls</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Panel - AI Suggestion */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              AI-Generated Control
              {suggestion && <CheckCircle2 className="h-5 w-5 text-green-500" />}
            </CardTitle>
            <CardDescription>
              {selectedControlIds.length > 1 
                ? 'Coverage analysis and unified control recommendation'
                : 'Review and customize the suggested internal control'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isGenerating ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">
                  {selectedControlIds.length > 1 
                    ? 'Analyzing control coverage and generating unified control...' 
                    : 'Analyzing control requirements...'}
                </p>
              </div>
            ) : suggestion ? (
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-4">
                  {/* Coverage Analysis for multi-control */}
                  {isMultiControlSuggestion(suggestion) && (
                    <div className="space-y-3">
                      <Button
                        variant="ghost"
                        className="w-full justify-between p-0 h-auto"
                        onClick={() => setExpandedCoverage(!expandedCoverage)}
                      >
                        <span className="flex items-center gap-2 font-medium">
                          <Shield className="h-4 w-4 text-primary" />
                          Coverage Analysis
                          <Badge className={getCoverageColor(suggestion.coverage_analysis.overall_coverage)}>
                            {suggestion.coverage_analysis.overall_coverage}% overall
                          </Badge>
                        </span>
                        {expandedCoverage ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                      
                      {expandedCoverage && (
                        <Card className="bg-muted/30">
                          <CardContent className="pt-4 space-y-4">
                            {/* Overall Coverage */}
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Overall Control Coverage</span>
                                <span className={`font-bold ${getCoverageColor(suggestion.coverage_analysis.overall_coverage)}`}>
                                  {suggestion.coverage_analysis.overall_coverage}%
                                </span>
                              </div>
                              <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <div 
                                  className={`h-full ${getCoverageBarColor(suggestion.coverage_analysis.overall_coverage)} transition-all`}
                                  style={{ width: `${suggestion.coverage_analysis.overall_coverage}%` }}
                                />
                              </div>
                            </div>

                            {/* Per-control coverage */}
                            {suggestion.coverage_analysis.control_specific?.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground">Per-Control Coverage</p>
                                {suggestion.coverage_analysis.control_specific.map((ctrl, idx) => (
                                  <div key={idx} className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                      <span className="font-mono">{ctrl.control_code}</span>
                                      <span className={getCoverageColor(ctrl.coverage_by_unified)}>
                                        {ctrl.coverage_by_unified}%
                                      </span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                      <div 
                                        className={`h-full ${getCoverageBarColor(ctrl.coverage_by_unified)}`}
                                        style={{ width: `${ctrl.coverage_by_unified}%` }}
                                      />
                                    </div>
                                    {ctrl.unique_requirements?.length > 0 && (
                                      <p className="text-xs text-muted-foreground pl-2">
                                        Unique: {ctrl.unique_requirements.join(', ')}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Common Requirements */}
                            {suggestion.coverage_analysis.common_requirements?.length > 0 && (
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Common Requirements</p>
                                <ul className="text-xs space-y-0.5 text-muted-foreground">
                                  {suggestion.coverage_analysis.common_requirements.map((req, i) => (
                                    <li key={i} className="flex items-start gap-1">
                                      <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                                      {req}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Gaps */}
                            {suggestion.coverage_analysis.gaps?.length > 0 && (
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3 text-orange-500" />
                                  Coverage Gaps
                                </p>
                                <ul className="text-xs space-y-0.5 text-orange-600">
                                  {suggestion.coverage_analysis.gaps.map((gap, i) => (
                                    <li key={i}>• {gap}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}

                      <Separator />
                    </div>
                  )}

                  {/* Control Details */}
                  {(() => {
                    const controlData = isMultiControlSuggestion(suggestion) 
                      ? suggestion.unified_control 
                      : suggestion;
                    
                    return (
                      <>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-muted-foreground">Title</p>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => copyToClipboard(editedTitle)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          <Input
                            value={editedTitle}
                            onChange={(e) => setEditedTitle(e.target.value)}
                            className="font-medium"
                            placeholder="Control title"
                          />
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">{controlData.control_type}</Badge>
                            <Badge variant="secondary">{controlData.automation_level}</Badge>
                            <Badge variant="secondary">{controlData.frequency}</Badge>
                            {controlData.security_function && (
                              <Badge variant="secondary">{controlData.security_function}</Badge>
                            )}
                          </div>
                        </div>

                        <Separator />

                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Description</p>
                          <Textarea
                            value={editedDescription}
                            onChange={(e) => setEditedDescription(e.target.value)}
                            className="min-h-[100px] text-sm"
                            placeholder="Control description"
                          />
                        </div>

                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Implementation Guidance</p>
                          <Textarea
                            value={editedGuidance}
                            onChange={(e) => setEditedGuidance(e.target.value)}
                            className="min-h-[120px] text-sm bg-muted/50"
                            placeholder="Implementation guidance"
                          />
                        </div>

                        {/* Framework Mappings (for multi-control) */}
                        {isMultiControlSuggestion(suggestion) && suggestion.unified_control.framework_mappings?.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">Framework Mappings</p>
                            <div className="space-y-1">
                              {suggestion.unified_control.framework_mappings.map((mapping, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm p-2 bg-muted/30 rounded">
                                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                  <span className="font-mono text-xs">{mapping.control_code}</span>
                                  <Badge variant={mapping.coverage_type === 'Full' ? 'default' : 'secondary'} className="text-xs">
                                    {mapping.coverage_type}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground flex-1">{mapping.notes}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Subcontrols */}
                        {editedSubcontrols.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Button
                                variant="ghost"
                                className="flex-1 justify-between p-0 h-auto"
                                onClick={() => setExpandedSubcontrols(!expandedSubcontrols)}
                              >
                                <span className="flex items-center gap-2">
                                  <Shield className="h-4 w-4" />
                                  Subcontrols ({editedSubcontrols.filter(s => s.selected).length}/{editedSubcontrols.length} selected)
                                </span>
                                {expandedSubcontrols ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </Button>
                            </div>
                            
                            {/* Select/Deselect All */}
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditedSubcontrols(prev => prev.map(s => ({ ...s, selected: true })))}
                              >
                                Select All
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditedSubcontrols(prev => prev.map(s => ({ ...s, selected: false })))}
                              >
                                Deselect All
                              </Button>
                            </div>
                            
                            {expandedSubcontrols && (
                              <div className="space-y-3 pl-4 border-l-2 border-muted">
                                {editedSubcontrols.map((sub, idx) => {
                                  const subId = `SC-${idx + 1}`;
                                  return (
                                    <Card key={idx} className={`transition-all ${sub.selected ? 'bg-primary/5 border-primary/20' : 'bg-muted/30 opacity-60'}`}>
                                      <CardContent className="pt-3 pb-3 space-y-2">
                                        {/* Checkbox and Sub ID Header */}
                                        <div className="flex items-center gap-2">
                                          <Checkbox
                                            checked={sub.selected}
                                            onCheckedChange={(checked) => {
                                              setEditedSubcontrols(prev => prev.map((s, i) => 
                                                i === idx ? { ...s, selected: checked === true } : s
                                              ));
                                            }}
                                          />
                                          <Badge variant="secondary" className="font-mono text-xs">{subId}</Badge>
                                        </div>
                                        
                                        {/* Editable Title */}
                                        {sub.editingTitle ? (
                                          <Input
                                            value={sub.title}
                                            onChange={(e) => {
                                              setEditedSubcontrols(prev => prev.map((s, i) => 
                                                i === idx ? { ...s, title: e.target.value } : s
                                              ));
                                            }}
                                            onBlur={() => {
                                              setEditedSubcontrols(prev => prev.map((s, i) => 
                                                i === idx ? { ...s, editingTitle: false } : s
                                              ));
                                            }}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                setEditedSubcontrols(prev => prev.map((s, i) => 
                                                  i === idx ? { ...s, editingTitle: false } : s
                                                ));
                                              }
                                            }}
                                            autoFocus
                                            className="font-medium text-sm"
                                          />
                                        ) : (
                                          <p 
                                            className="font-medium text-sm cursor-pointer hover:bg-muted/50 px-2 py-1 rounded -mx-2"
                                            onClick={() => {
                                              setEditedSubcontrols(prev => prev.map((s, i) => 
                                                i === idx ? { ...s, editingTitle: true } : s
                                              ));
                                            }}
                                          >
                                            {sub.title || <span className="text-muted-foreground italic">Click to edit title...</span>}
                                          </p>
                                        )}
                                        
                                        {/* Editable Description */}
                                        {sub.editingDescription ? (
                                          <Textarea
                                            value={sub.description}
                                            onChange={(e) => {
                                              setEditedSubcontrols(prev => prev.map((s, i) => 
                                                i === idx ? { ...s, description: e.target.value } : s
                                              ));
                                            }}
                                            onBlur={() => {
                                              setEditedSubcontrols(prev => prev.map((s, i) => 
                                                i === idx ? { ...s, editingDescription: false } : s
                                              ));
                                            }}
                                            autoFocus
                                            rows={3}
                                            className="text-xs"
                                          />
                                        ) : (
                                          <p 
                                            className="text-xs text-muted-foreground cursor-pointer hover:bg-muted/50 px-2 py-1 rounded -mx-2"
                                            onClick={() => {
                                              setEditedSubcontrols(prev => prev.map((s, i) => 
                                                i === idx ? { ...s, editingDescription: true } : s
                                              ));
                                            }}
                                          >
                                            {sub.description || <span className="italic">Click to edit description...</span>}
                                          </p>
                                        )}
                                        
                                        {/* Addresses Controls */}
                                        {sub.addresses_controls && sub.addresses_controls.length > 0 && (
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            <span className="text-xs text-muted-foreground">Addresses:</span>
                                            {sub.addresses_controls.map((code, i) => (
                                              <Badge key={i} variant="outline" className="text-xs font-mono">
                                                {code}
                                              </Badge>
                                            ))}
                                          </div>
                                        )}
                                      </CardContent>
                                    </Card>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        <Separator />

                        <div className="flex gap-2">
                          <Button 
                            className="flex-1" 
                            onClick={createControlFromSuggestion}
                            disabled={createInternalControl.isPending || !editedTitle.trim()}
                          >
                            {createInternalControl.isPending ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Plus className="h-4 w-4 mr-2" />
                            )}
                            Create Internal Control
                          </Button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Wand2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Select framework controls to generate suggestions</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Select multiple controls to see coverage analysis
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
