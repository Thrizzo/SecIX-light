import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/database/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  Lock, 
  Unlock, 
  Trash2, 
  RefreshCw, 
  Filter, 
  Clock, 
  Shield,
  AlertTriangle,
  FileText,
  User,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow, isAfter } from 'date-fns';

interface AuditLog {
  id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  actor_user_id: string | null;
  details: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  is_retained: boolean;
  retained_at: string | null;
  retained_by: string | null;
  retention_reason: string | null;
  expires_at: string | null;
}

const AuditLogsList: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterRetained, setFilterRetained] = useState<string>('all');
  const [retainDialogOpen, setRetainDialogOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [retentionReason, setRetentionReason] = useState('');
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [detailsLog, setDetailsLog] = useState<AuditLog | null>(null);

  // Fetch audit logs
  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['audit-logs-management'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);
      
      if (error) throw error;
      return data as AuditLog[];
    },
  });

  // Get unique target types for filter
  const targetTypes = [...new Set(logs.map(log => log.target_type))].sort();

  // Toggle retention status
  const toggleRetention = useMutation({
    mutationFn: async ({ logId, retain, reason }: { logId: string; retain: boolean; reason?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const updateData: Record<string, any> = {
        is_retained: retain,
        retained_at: retain ? new Date().toISOString() : null,
        retained_by: retain ? user?.id : null,
        retention_reason: retain ? reason : null,
      };

      const { error } = await supabase
        .from('audit_logs')
        .update(updateData)
        .eq('id', logId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['audit-logs-management'] });
      toast.success(variables.retain ? 'Log marked for retention' : 'Log retention removed');
      setRetainDialogOpen(false);
      setSelectedLog(null);
      setRetentionReason('');
    },
    onError: (error) => {
      toast.error('Failed to update retention status');
      console.error(error);
    },
  });

  // Cleanup expired logs
  const cleanupLogs = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('cleanup_expired_audit_logs');
      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['audit-logs-management'] });
      toast.success(`Cleaned up ${count} expired log(s)`);
    },
    onError: (error) => {
      toast.error('Failed to cleanup expired logs');
      console.error(error);
    },
  });

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.target_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.target_id && log.target_id.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = filterType === 'all' || log.target_type === filterType;
    const matchesRetained = 
      filterRetained === 'all' || 
      (filterRetained === 'retained' && log.is_retained) ||
      (filterRetained === 'expiring' && !log.is_retained);

    return matchesSearch && matchesType && matchesRetained;
  });

  // Stats
  const totalLogs = logs.length;
  const retainedLogs = logs.filter(l => l.is_retained).length;
  const expiringLogs = logs.filter(l => !l.is_retained && l.expires_at && isAfter(new Date(l.expires_at), new Date())).length;
  const expiredLogs = logs.filter(l => !l.is_retained && l.expires_at && !isAfter(new Date(l.expires_at), new Date())).length;

  const handleRetainClick = (log: AuditLog) => {
    if (log.is_retained) {
      // Remove retention directly
      toggleRetention.mutate({ logId: log.id, retain: false });
    } else {
      // Open dialog to add reason
      setSelectedLog(log);
      setRetainDialogOpen(true);
    }
  };

  const handleViewDetails = (log: AuditLog) => {
    setDetailsLog(log);
    setDetailsDialogOpen(true);
  };

  const getActionBadgeVariant = (action: string): "default" | "secondary" | "destructive" | "outline" => {
    if (action.includes('delete') || action.includes('remove')) return 'destructive';
    if (action.includes('create') || action.includes('add')) return 'default';
    if (action.includes('update') || action.includes('edit')) return 'secondary';
    return 'outline';
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalLogs}</p>
                <p className="text-sm text-muted-foreground">Total Logs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Lock className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{retainedLogs}</p>
                <p className="text-sm text-muted-foreground">Retained</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{expiringLogs}</p>
                <p className="text-sm text-muted-foreground">Expiring (30d)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{expiredLogs}</p>
                <p className="text-sm text-muted-foreground">Expired</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Immutable Audit Logs
              </CardTitle>
              <CardDescription>
                System activity logs with 30-day retention policy. Retained logs are kept indefinitely.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => cleanupLogs.mutate()}
                disabled={cleanupLogs.isPending || expiredLogs === 0}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Cleanup Expired ({expiredLogs})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {targetTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterRetained} onValueChange={setFilterRetained}>
              <SelectTrigger className="w-[180px]">
                <Lock className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Retention status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Logs</SelectItem>
                <SelectItem value="retained">Retained Only</SelectItem>
                <SelectItem value="expiring">Expiring Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <ScrollArea className="h-[500px] rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target Type</TableHead>
                  <TableHead>Target ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No audit logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id} className={log.is_retained ? 'bg-green-500/5' : ''}>
                      <TableCell className="font-mono text-xs">
                        <div className="flex flex-col">
                          <span>{format(new Date(log.created_at), 'MMM dd, yyyy')}</span>
                          <span className="text-muted-foreground">{format(new Date(log.created_at), 'HH:mm:ss')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getActionBadgeVariant(log.action)}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{log.target_type}</TableCell>
                      <TableCell className="font-mono text-xs max-w-[120px] truncate">
                        {log.target_id || '-'}
                      </TableCell>
                      <TableCell>
                        {log.is_retained ? (
                          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                            <Lock className="w-3 h-3 mr-1" />
                            Retained
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                            <Clock className="w-3 h-3 mr-1" />
                            Expiring
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.is_retained ? (
                          <span className="text-green-500">Never</span>
                        ) : log.expires_at ? (
                          formatDistanceToNow(new Date(log.expires_at), { addSuffix: true })
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(log)}
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRetainClick(log)}
                            className={log.is_retained ? 'text-green-500 hover:text-green-600' : ''}
                          >
                            {log.is_retained ? (
                              <Unlock className="w-4 h-4" />
                            ) : (
                              <Lock className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Retain Dialog */}
      <Dialog open={retainDialogOpen} onOpenChange={setRetainDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retain Audit Log</DialogTitle>
            <DialogDescription>
              This log will be kept indefinitely and exempt from the 30-day retention policy.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Retention Reason</Label>
              <Textarea
                id="reason"
                placeholder="Enter reason for retaining this log (e.g., compliance requirement, investigation, etc.)"
                value={retentionReason}
                onChange={(e) => setRetentionReason(e.target.value)}
                rows={3}
              />
            </div>
            {selectedLog && (
              <div className="p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Action:</span>
                  <span className="font-medium">{selectedLog.action}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target:</span>
                  <span className="font-medium">{selectedLog.target_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-medium">{format(new Date(selectedLog.created_at), 'PPpp')}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRetainDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => selectedLog && toggleRetention.mutate({ 
                logId: selectedLog.id, 
                retain: true, 
                reason: retentionReason 
              })}
              disabled={toggleRetention.isPending}
            >
              <Lock className="w-4 h-4 mr-2" />
              Retain Log
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
          </DialogHeader>
          {detailsLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Action</Label>
                  <p className="font-medium">{detailsLog.action}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Target Type</Label>
                  <p className="font-medium">{detailsLog.target_type}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Target ID</Label>
                  <p className="font-mono text-sm">{detailsLog.target_id || '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Timestamp</Label>
                  <p className="font-medium">{format(new Date(detailsLog.created_at), 'PPpp')}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">IP Address</Label>
                  <p className="font-mono text-sm">{detailsLog.ip_address || '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Status</Label>
                  <p>{detailsLog.is_retained ? 'Retained' : 'Expiring'}</p>
                </div>
              </div>
              
              {detailsLog.is_retained && (
                <div className="p-4 bg-green-500/10 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-green-500">
                    <Lock className="w-4 h-4" />
                    <span className="font-medium">Retention Information</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Retained At:</span>
                      <p>{detailsLog.retained_at ? format(new Date(detailsLog.retained_at), 'PPpp') : '-'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Reason:</span>
                      <p>{detailsLog.retention_reason || '-'}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {detailsLog.details && Object.keys(detailsLog.details).length > 0 && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Additional Details</Label>
                  <ScrollArea className="h-[200px] rounded-md border p-4">
                    <pre className="text-xs font-mono whitespace-pre-wrap">
                      {JSON.stringify(detailsLog.details, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              )}
              
              {detailsLog.user_agent && (
                <div className="space-y-1">
                  <Label className="text-muted-foreground">User Agent</Label>
                  <p className="text-xs font-mono text-muted-foreground break-all">{detailsLog.user_agent}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditLogsList;
