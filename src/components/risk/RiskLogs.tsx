import React, { useState } from 'react';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Filter, History, AlertTriangle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

const ACTION_COLORS: Record<string, string> = {
  created: 'bg-emerald-100 text-emerald-800',
  updated: 'bg-blue-100 text-blue-800',
  deleted: 'bg-red-100 text-red-800',
  archived: 'bg-slate-100 text-slate-800',
  completed: 'bg-purple-100 text-purple-800',
  control_added: 'bg-indigo-100 text-indigo-800',
  control_removed: 'bg-orange-100 text-orange-800',
  milestone_added: 'bg-cyan-100 text-cyan-800',
  treatment_completed: 'bg-emerald-100 text-emerald-800',
};

const TARGET_TYPE_LABELS: Record<string, string> = {
  risk: 'Risk',
  treatment: 'Treatment',
  control: 'Control',
  risk_appetite: 'Risk Appetite',
  milestone: 'Milestone',
};

export const RiskLogs: React.FC = () => {
  const { data: logs, isLoading, error, refetch } = useAuditLogs();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const filteredLogs = logs?.filter((log) => {
    const matchesSearch = 
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.target_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.target_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.profiles?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterType === 'all' || log.target_type === filterType;

    return matchesSearch && matchesFilter;
  });

  const getActionBadge = (action: string) => {
    const colorClass = ACTION_COLORS[action] || 'bg-slate-100 text-slate-800';
    return <Badge className={colorClass}>{action.replace(/_/g, ' ')}</Badge>;
  };

  if (error) {
    return (
      <Card className="bg-destructive/10 border-destructive/30">
        <CardContent className="py-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            <p>Failed to load audit logs: {error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">Audit Logs</h2>
          <p className="text-muted-foreground">
            {filteredLogs?.length || 0} logged activities
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="risk">Risks</SelectItem>
                <SelectItem value="treatment">Treatments</SelectItem>
                <SelectItem value="control">Controls</SelectItem>
                <SelectItem value="risk_appetite">Risk Appetites</SelectItem>
                <SelectItem value="milestone">Milestones</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-0">
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <History className="w-5 h-5" />
            Activity Log
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : filteredLogs && filteredLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="w-40">Timestamp</TableHead>
                    <TableHead className="w-32">Action</TableHead>
                    <TableHead className="w-28">Type</TableHead>
                    <TableHead>Target ID</TableHead>
                    <TableHead className="w-40">User</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id} className="border-border hover:bg-muted/50">
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        {getActionBadge(log.action)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {TARGET_TYPE_LABELS[log.target_type] || log.target_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.target_id ? log.target_id.substring(0, 8) + '...' : '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.profiles?.full_name || log.profiles?.email || 'System'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {log.details ? JSON.stringify(log.details) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <History className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-medium text-foreground mb-1">No logs found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'Try adjusting your search.' : 'Activity logs will appear here.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
