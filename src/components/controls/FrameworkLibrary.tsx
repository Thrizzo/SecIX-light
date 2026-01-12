import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  Search, MoreHorizontal, FileSpreadsheet, Trash2, Upload, 
  Edit2, Link2, Eye, CheckCircle2, Star, ChevronDown, ChevronUp
} from 'lucide-react';
import { 
  useControlFrameworks, 
  useFrameworkControls, 
  useDeleteFramework,
  useDeleteFrameworkControl,
  useSetActiveFramework,
  useActiveFramework
} from '@/hooks/useControlFrameworks';
import { FrameworkImportWizard } from './FrameworkImportWizard';
import { FrameworkControlDetailSheet } from './FrameworkControlDetailSheet';

export function FrameworkLibrary() {
  const [search, setSearch] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [expandedFramework, setExpandedFramework] = useState<string | null>(null);
  const [selectedControlId, setSelectedControlId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [showAllControls, setShowAllControls] = useState<Record<string, boolean>>({});

  const { data: frameworks = [], isLoading } = useControlFrameworks();
  const { data: activeFramework } = useActiveFramework();
  const { data: controls = [] } = useFrameworkControls(expandedFramework || undefined);
  const deleteFramework = useDeleteFramework();
  const deleteControl = useDeleteFrameworkControl();
  const setActiveFramework = useSetActiveFramework();

  const INITIAL_DISPLAY_COUNT = 20;

  const filteredFrameworks = frameworks.filter(fw =>
    !search || 
    fw.name.toLowerCase().includes(search.toLowerCase()) ||
    fw.publisher?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredControls = controls.filter(ctrl =>
    !search ||
    ctrl.title.toLowerCase().includes(search.toLowerCase()) ||
    ctrl.control_code?.toLowerCase().includes(search.toLowerCase()) ||
    ctrl.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleViewControl = (controlId: string) => {
    setSelectedControlId(controlId);
    setDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Control Frameworks</h2>
          <p className="text-muted-foreground">
            Import and manage industry control frameworks
          </p>
        </div>
        <Button onClick={() => setImportOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Import Framework
        </Button>
      </div>

      {/* Active Framework Banner */}
      {activeFramework && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Framework</p>
                  <p className="font-semibold">{activeFramework.name} {activeFramework.version && `v${activeFramework.version}`}</p>
                </div>
              </div>
              <Badge className="bg-primary text-primary-foreground">
                Controls available for Risk Management
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search frameworks or controls..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Frameworks List */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Loading frameworks...
          </CardContent>
        </Card>
      ) : filteredFrameworks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-medium mb-1">No frameworks imported</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Import a control framework like NIST, ISO 27001, or CIS Controls
            </p>
            <Button onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Import Framework
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Accordion 
          type="single" 
          collapsible 
          value={expandedFramework || undefined}
          onValueChange={setExpandedFramework}
        >
          {filteredFrameworks.map(framework => (
            <AccordionItem key={framework.id} value={framework.id}>
              <Card className={`mb-2 ${framework.is_active ? 'ring-2 ring-primary' : ''}`}>
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                        {framework.is_active && (
                          <Star className="absolute -top-1 -right-1 h-3 w-3 text-primary fill-primary" />
                        )}
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{framework.name}</h3>
                          {framework.is_active && (
                            <Badge variant="default" className="text-xs">Active</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {framework.publisher && `${framework.publisher} • `}
                          {framework.version && `v${framework.version}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover">
                          {framework.is_active ? (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveFramework.mutate(null);
                              }}
                            >
                              <Star className="h-4 w-4 mr-2" />
                              Deactivate Framework
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveFramework.mutate(framework.id);
                              }}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Set as Active
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteFramework.mutate(framework.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Framework
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="px-6 pb-4">
                    {framework.description && (
                      <p className="text-sm text-muted-foreground mb-4">
                        {framework.description}
                      </p>
                    )}
                    
                    {expandedFramework === framework.id && (
                      <>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-32">Code</TableHead>
                              <TableHead>Title</TableHead>
                              <TableHead>Domain</TableHead>
                              <TableHead>CSF Function</TableHead>
                              <TableHead className="w-12"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredControls.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                  No controls in this framework
                                </TableCell>
                              </TableRow>
                            ) : (
                              (showAllControls[framework.id] 
                                ? filteredControls 
                                : filteredControls.slice(0, INITIAL_DISPLAY_COUNT)
                              ).map(control => (
                                <TableRow key={control.id} className="group">
                                  <TableCell className="font-mono text-sm">
                                    {control.control_code || '-'}
                                  </TableCell>
                                  <TableCell>
                                    <div>
                                      <p className="font-medium">{control.title}</p>
                                      {control.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-1">
                                          {control.description}
                                        </p>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {control.domain || '-'}
                                  </TableCell>
                                  <TableCell>
                                    {control.security_function && (
                                      <Badge variant="outline">{control.security_function}</Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button 
                                          variant="ghost" 
                                          size="icon"
                                          className="opacity-0 group-hover:opacity-100"
                                        >
                                          <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="bg-popover">
                                        <DropdownMenuItem onClick={() => handleViewControl(control.id)}>
                                          <Eye className="h-4 w-4 mr-2" />
                                          View Details
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleViewControl(control.id)}>
                                          <Edit2 className="h-4 w-4 mr-2" />
                                          Edit Control
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleViewControl(control.id)}>
                                          <Link2 className="h-4 w-4 mr-2" />
                                          Map to Internal
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem 
                                          className="text-destructive"
                                          onClick={() => deleteControl.mutate(control.id)}
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Delete Control
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                        
                        {filteredControls.length > INITIAL_DISPLAY_COUNT && (
                          <div className="flex justify-center pt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowAllControls(prev => ({
                                ...prev,
                                [framework.id]: !prev[framework.id]
                              }))}
                              className="gap-2"
                            >
                              {showAllControls[framework.id] ? (
                                <>
                                  <ChevronUp className="h-4 w-4" />
                                  Show Less
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-4 w-4" />
                                  Show All {filteredControls.length} Controls
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </AccordionContent>
              </Card>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      <FrameworkImportWizard open={importOpen} onOpenChange={setImportOpen} />
      <FrameworkControlDetailSheet 
        open={detailOpen} 
        onOpenChange={setDetailOpen}
        controlId={selectedControlId}
      />
    </div>
  );
}
