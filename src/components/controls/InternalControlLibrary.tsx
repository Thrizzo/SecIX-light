import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Search, Filter, MoreHorizontal, Edit, Trash2, Link2, Eye, CheckCircle2, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';
import { useInternalControls, CONTROL_STATUSES, CONTROL_TYPES, COMPLIANCE_STATUSES, ControlComplianceStatus } from '@/hooks/useInternalControls';
import { useControlFrameworks, SECURITY_FUNCTIONS } from '@/hooks/useControlFrameworks';
import { useBusinessUnits } from '@/hooks/useBusinessUnits';
import { InternalControlFormDialog } from './InternalControlFormDialog';
import { ControlDetailSheet } from './ControlDetailSheet';

export function InternalControlLibrary() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [functionFilter, setFunctionFilter] = useState<string>('all');
  const [buFilter, setBuFilter] = useState<string>('all');
  const [complianceFilter, setComplianceFilter] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingControl, setEditingControl] = useState<string | null>(null);
  const [viewingControl, setViewingControl] = useState<string | null>(null);

  const { data: controls = [], isLoading } = useInternalControls();
  const { data: businessUnits = [] } = useBusinessUnits();

  const filteredControls = controls.filter(control => {
    const matchesSearch = !search || 
      control.title.toLowerCase().includes(search.toLowerCase()) ||
      control.internal_control_code.toLowerCase().includes(search.toLowerCase()) ||
      control.description?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || control.status === statusFilter;
    const matchesType = typeFilter === 'all' || control.control_type === typeFilter;
    const matchesFunction = functionFilter === 'all' || control.security_function === functionFilter;
    const matchesBu = buFilter === 'all' || control.business_unit_id === buFilter;
    const matchesCompliance = complianceFilter === 'all' || control.compliance_status === complianceFilter;

    return matchesSearch && matchesStatus && matchesType && matchesFunction && matchesBu && matchesCompliance;
  });

  const getComplianceIcon = (status: ControlComplianceStatus | null | undefined) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'minor_deviation':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'major_deviation':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <HelpCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getComplianceBadge = (status: ControlComplianceStatus | null | undefined) => {
    const statusInfo = COMPLIANCE_STATUSES.find(s => s.value === status) || COMPLIANCE_STATUSES[3];
    const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      compliant: 'default',
      minor_deviation: 'outline',
      major_deviation: 'destructive',
      not_assessed: 'secondary',
    };
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant={variants[status || 'not_assessed']} className="gap-1">
              {getComplianceIcon(status)}
              <span className="hidden sm:inline">{statusInfo.label}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{statusInfo.description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Internal Controls</h2>
          <p className="text-muted-foreground">
            Manage your organization's internal control library
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Control
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search controls..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {CONTROL_STATUSES.map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {CONTROL_TYPES.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={functionFilter} onValueChange={setFunctionFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="CSF Function" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Functions</SelectItem>
                {SECURITY_FUNCTIONS.map(fn => (
                  <SelectItem key={fn} value={fn}>{fn}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={buFilter} onValueChange={setBuFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Business Unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Units</SelectItem>
                {businessUnits.map(bu => (
                  <SelectItem key={bu.id} value={bu.id}>{bu.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={complianceFilter} onValueChange={setComplianceFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Compliance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Compliance</SelectItem>
                {COMPLIANCE_STATUSES.map(cs => (
                  <SelectItem key={cs.value} value={cs.value}>{cs.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Controls Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {filteredControls.length} Control{filteredControls.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Compliance</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>CSF Function</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Loading controls...
                  </TableCell>
                </TableRow>
              ) : filteredControls.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No controls found. Add your first control to get started.
                  </TableCell>
                </TableRow>
              ) : (
                filteredControls.map(control => (
                  <TableRow key={control.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-mono text-sm">
                      {control.internal_control_code}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{control.title}</p>
                        {control.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {control.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getComplianceBadge(control.compliance_status)}
                    </TableCell>
                    <TableCell>
                      {control.control_type && (
                        <Badge variant="outline">{control.control_type}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {control.security_function && (
                        <Badge variant={getFunctionColor(control.security_function)}>
                          {control.security_function}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(control.status)}>
                        {control.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {(control as any).owner?.full_name || '-'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewingControl(control.id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditingControl(control.id)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Link2 className="h-4 w-4 mr-2" />
                            Map to Framework
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <InternalControlFormDialog
        open={formOpen || !!editingControl}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingControl(null);
        }}
        controlId={editingControl}
      />

      <ControlDetailSheet
        open={!!viewingControl}
        onOpenChange={(open) => !open && setViewingControl(null)}
        controlId={viewingControl}
      />
    </div>
  );
}