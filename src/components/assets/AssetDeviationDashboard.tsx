import React, { useState, useMemo } from 'react';
import { AlertTriangle, TrendingUp, Filter, Link2Off } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PrimaryAsset, SecondaryAsset, formatHours } from '@/hooks/useAssets';

interface AssetDeviationDashboardProps {
  secondaryAssets: SecondaryAsset[];
  primaryAssets: PrimaryAsset[];
}

const AssetDeviationDashboard: React.FC<AssetDeviationDashboardProps> = ({ 
  secondaryAssets, 
  primaryAssets 
}) => {
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const deviations = useMemo(() => {
    return secondaryAssets.map(sa => {
      const primaryAsset = primaryAssets.find(pa => pa.id === sa.primary_asset_id);
      const isOrphaned = !sa.primary_asset_id || !primaryAsset;
      
      const rtoDelta = sa.effective_rto_hours && sa.inherited_rto_hours 
        ? sa.effective_rto_hours - sa.inherited_rto_hours 
        : 0;
      
      const rpoDelta = sa.effective_rpo_hours && sa.inherited_rpo_hours 
        ? sa.effective_rpo_hours - sa.inherited_rpo_hours 
        : 0;

      return {
        ...sa,
        primaryAsset,
        isOrphaned,
        rtoDelta,
        rpoDelta,
        hasDeviation: rtoDelta !== 0 || rpoDelta !== 0 || sa.deviation_status !== 'Compliant' || isOrphaned
      };
    });
  }, [secondaryAssets, primaryAssets]);

  const filteredDeviations = useMemo(() => {
    return deviations.filter(d => {
      const matchesStatus = filterStatus === 'all' || 
                            (filterStatus === 'Orphaned' && d.isOrphaned) ||
                            d.deviation_status === filterStatus;
      const matchesType = filterType === 'all' || d.secondary_type === filterType;
      return matchesStatus && matchesType && d.hasDeviation;
    });
  }, [deviations, filterStatus, filterType]);

  const nonCompliantCount = deviations.filter(d => d.deviation_status === 'Non-Compliant').length;
  const atRiskCount = deviations.filter(d => d.deviation_status === 'At Risk').length;
  const orphanedCount = deviations.filter(d => d.isOrphaned).length;
  const totalDeviations = deviations.filter(d => d.hasDeviation).length;

  const getDeviationColor = (status: string) => {
    switch (status) {
      case 'Compliant': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'At Risk': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      case 'Non-Compliant': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Total Issues</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{totalDeviations}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Out of {secondaryAssets.length} secondary assets
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Link2Off className="w-5 h-5 text-amber-500" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Orphaned Assets</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{orphanedCount}</p>
            <p className="text-xs text-muted-foreground mt-1">No primary asset linked</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Non-Compliant</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{nonCompliantCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Require immediate action</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">At Risk</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{atRiskCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Monitor closely</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="w-5 h-5 text-primary" />
            Filter Assets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Orphaned">Orphaned</SelectItem>
                <SelectItem value="At Risk">At Risk</SelectItem>
                <SelectItem value="Non-Compliant">Non-Compliant</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="IT Service">IT Service</SelectItem>
                <SelectItem value="Application">Application</SelectItem>
                <SelectItem value="Personnel">Personnel</SelectItem>
                <SelectItem value="Location">Location</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Asset Details */}
      <div className="space-y-4">
        {filteredDeviations.map((deviation) => (
          <Card key={deviation.id} className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">{deviation.name}</h3>
                    {deviation.isOrphaned && (
                      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 gap-1">
                        <Link2Off className="w-3 h-3" />
                        Orphaned
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Primary: {deviation.primaryAsset?.name || 'Not linked'} | Type: {deviation.secondary_type}
                  </p>
                </div>
                {!deviation.isOrphaned && (
                  <Badge className={getDeviationColor(deviation.deviation_status)}>
                    {deviation.deviation_status}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {deviation.rtoDelta !== 0 && (
                  <div className="p-3 rounded-lg bg-muted/30 border border-border">
                    <p className="text-sm font-medium text-foreground mb-1">RTO Deviation</p>
                    <p className={`text-lg font-bold ${deviation.rtoDelta > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                      {deviation.rtoDelta > 0 ? '+' : ''}{deviation.rtoDelta}h
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Target: {formatHours(deviation.inherited_rto_hours)} → Actual: {formatHours(deviation.effective_rto_hours)}
                    </p>
                  </div>
                )}
                {deviation.rpoDelta !== 0 && (
                  <div className="p-3 rounded-lg bg-muted/30 border border-border">
                    <p className="text-sm font-medium text-foreground mb-1">RPO Deviation</p>
                    <p className={`text-lg font-bold ${deviation.rpoDelta > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                      {deviation.rpoDelta > 0 ? '+' : ''}{deviation.rpoDelta}h
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Target: {formatHours(deviation.inherited_rpo_hours)} → Actual: {formatHours(deviation.effective_rpo_hours)}
                    </p>
                  </div>
                )}
              </div>

              {deviation.deviation_reason && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">Deviation Reason:</p>
                  <p className="text-sm text-foreground">{deviation.deviation_reason}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredDeviations.length === 0 && (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No issues found with current filters</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AssetDeviationDashboard;
