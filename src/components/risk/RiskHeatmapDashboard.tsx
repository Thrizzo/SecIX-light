import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Grid3X3, AlertTriangle, TrendingUp, Info, Table } from 'lucide-react';
import { useRisks, useRiskCategories, calculateRiskScore, RiskSeverity, RiskLikelihood } from '@/hooks/useRisks';
import { 
  useActiveRiskAppetite, 
  useRiskAppetiteBands,
  useMatrixLikelihoodLevels,
  useMatrixImpactLevels 
} from '@/hooks/useRiskAppetite';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';

// Map severity/likelihood enums to numeric values (1-5)
const severityToNumber: Record<RiskSeverity, number> = {
  negligible: 1,
  low: 2,
  medium: 3,
  high: 4,
  critical: 5,
};

const likelihoodToNumber: Record<RiskLikelihood, number> = {
  rare: 1,
  unlikely: 2,
  possible: 3,
  likely: 4,
  almost_certain: 5,
};

interface RiskCount {
  likelihood: number;
  impact: number;
  count: number;
  riskIds: string[];
}

interface LevelDefinition {
  level: number;
  label: string;
  description?: string | null;
  color?: string | null;
}

function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#1f2937' : '#ffffff';
}

// Component for hoverable likelihood labels
const LikelihoodLabelHover: React.FC<{ level: LevelDefinition; allLevels: LevelDefinition[] }> = ({ level, allLevels }) => {
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button className="text-xs text-muted-foreground truncate hover:text-foreground hover:underline cursor-help transition-colors flex items-center gap-1">
          {level.label}
          <Info className="w-3 h-3 opacity-50" />
        </button>
      </HoverCardTrigger>
      <HoverCardContent side="left" align="center" className="w-72 p-0 z-[60]">
        <div className="p-3 border-b border-border bg-muted/30">
          <h4 className="font-semibold text-sm">Likelihood Levels</h4>
          <p className="text-xs text-muted-foreground">Probability of risk occurrence</p>
        </div>
        <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
          {[...allLevels].sort((a, b) => b.level - a.level).map((l) => (
            <div 
              key={l.level} 
              className={`p-2 rounded text-xs ${l.level === level.level ? 'bg-primary/10 border border-primary/30' : 'bg-muted/30'}`}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <Badge variant="outline" className="text-[10px] min-w-[20px] justify-center py-0">
                  {l.level}
                </Badge>
                <span className="font-medium">{l.label}</span>
              </div>
              {l.description && (
                <p className="text-muted-foreground pl-7">{l.description}</p>
              )}
            </div>
          ))}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

// Component for hoverable impact labels
const ImpactLabelHover: React.FC<{ level: LevelDefinition; allLevels: LevelDefinition[] }> = ({ level, allLevels }) => {
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button className="text-xs text-muted-foreground truncate hover:text-foreground hover:underline cursor-help transition-colors flex items-center gap-1 justify-center">
          {level.label}
          <Info className="w-3 h-3 opacity-50" />
        </button>
      </HoverCardTrigger>
      <HoverCardContent side="bottom" align="center" className="w-72 p-0 z-[60]">
        <div className="p-3 border-b border-border bg-muted/30">
          <h4 className="font-semibold text-sm">Impact Levels</h4>
          <p className="text-xs text-muted-foreground">Severity of consequences</p>
        </div>
        <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
          {[...allLevels].sort((a, b) => a.level - b.level).map((l) => (
            <div 
              key={l.level} 
              className={`p-2 rounded text-xs ${l.level === level.level ? 'bg-primary/10 border border-primary/30' : 'bg-muted/30'}`}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <Badge variant="outline" className="text-[10px] min-w-[20px] justify-center py-0">
                  {l.level}
                </Badge>
                <span className="font-medium">{l.label}</span>
              </div>
              {l.description && (
                <p className="text-muted-foreground pl-7">{l.description}</p>
              )}
            </div>
          ))}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

export const RiskHeatmapDashboard: React.FC = () => {
  const { data: risks, isLoading: risksLoading } = useRisks();
  const { data: activeAppetite, isLoading: appetiteLoading } = useActiveRiskAppetite();
  const { data: bands } = useRiskAppetiteBands(activeAppetite?.id);
  const { data: likelihoodLevels } = useMatrixLikelihoodLevels(activeAppetite?.matrix_id);
  const { data: impactLevels } = useMatrixImpactLevels(activeAppetite?.matrix_id);
  const { data: categories } = useRiskCategories();

  const isLoading = risksLoading || appetiteLoading;

  // Filter active risks only
  const activeRisks = risks?.filter(r => !(r as any).is_archived) || [];

  // Build risk count map
  const riskCountMap: Map<string, RiskCount> = new Map();
  
  activeRisks.forEach(risk => {
    const likelihood = likelihoodToNumber[risk.inherent_likelihood] || 3;
    const impact = severityToNumber[risk.inherent_severity] || 3;
    const key = `${likelihood}-${impact}`;
    
    if (riskCountMap.has(key)) {
      const existing = riskCountMap.get(key)!;
      existing.count++;
      existing.riskIds.push(risk.id);
    } else {
      riskCountMap.set(key, { likelihood, impact, count: 1, riskIds: [risk.id] });
    }
  });

  const matrixSize = 5; // Default 5x5 matrix
  
  const getBandForScore = (score: number) => {
    return bands?.find(band => score >= band.min_score && score <= band.max_score);
  };

  const getCellColor = (likelihood: number, impact: number): string => {
    const score = likelihood * impact;
    const band = getBandForScore(score);
    return band?.color || '#94a3b8';
  };

  const getLikelihoodLevel = (level: number): LevelDefinition => {
    const found = likelihoodLevels?.find(l => l.level === level);
    if (found) return found;
    const defaults = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];
    return { level, label: defaults[level - 1] || `L${level}` };
  };

  const getImpactLevel = (level: number): LevelDefinition => {
    const found = impactLevels?.find(l => l.level === level);
    if (found) return found;
    const defaults = ['Negligible', 'Low', 'Medium', 'High', 'Critical'];
    return { level, label: defaults[level - 1] || `I${level}` };
  };

  // Build complete level arrays for hover cards
  const allLikelihoodLevels: LevelDefinition[] = [...Array(matrixSize)].map((_, i) => getLikelihoodLevel(i + 1));
  const allImpactLevels: LevelDefinition[] = [...Array(matrixSize)].map((_, i) => getImpactLevel(i + 1));

  // Calculate stats
  const totalRisks = activeRisks.length;
  const criticalRisks = activeRisks.filter(r => {
    const score = calculateRiskScore(r.inherent_severity, r.inherent_likelihood);
    const band = getBandForScore(score);
    return band?.band === 'escalate' || score >= 20;
  }).length;
  const highRisks = activeRisks.filter(r => {
    const score = calculateRiskScore(r.inherent_severity, r.inherent_likelihood);
    const band = getBandForScore(score);
    return band?.band === 'treat' || (score >= 12 && score < 20);
  }).length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!activeAppetite) {
    return (
      <Card className="bg-muted/50 border-border">
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <AlertTriangle className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-medium text-foreground mb-1">No Active Risk Appetite</h3>
            <p className="text-sm text-muted-foreground">
              Create and activate a risk appetite statement to see the heatmap dashboard.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Active Risks</p>
                <p className="text-3xl font-bold text-foreground">{totalRisks}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <Grid3X3 className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical (Escalate)</p>
                <p className="text-3xl font-bold text-red-600">{criticalRisks}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">High (Treat)</p>
                <p className="text-3xl font-bold text-amber-600">{highRisks}</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Heatmap and Thresholds Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Heatmap - Compact */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Grid3X3 className="w-4 h-4 text-primary" />
              Risk Heatmap
            </CardTitle>
            <CardDescription className="text-xs">
              {totalRisks} risks • "{activeAppetite.name}"
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <div className="min-w-[320px]">
                <div className="flex">
                  {/* Y-axis label */}
                  <div className="flex items-center justify-center w-6 mr-1">
                    <span 
                      className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider transform -rotate-90 whitespace-nowrap"
                      style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                    >
                      Likelihood →
                    </span>
                  </div>

                  <div className="flex-1">
                    {/* Matrix rows (likelihood from high to low) */}
                    {[...Array(matrixSize)].map((_, rowIndex) => {
                      const likelihood = matrixSize - rowIndex;
                      const likelihoodLevel = getLikelihoodLevel(likelihood);
                      
                      return (
                        <div key={rowIndex} className="flex items-stretch">
                          {/* Row label */}
                          <div className="w-20 flex items-center justify-end pr-2 py-0.5">
                            <LikelihoodLabelHover level={likelihoodLevel} allLevels={allLikelihoodLevels} />
                          </div>
                          
                          {/* Cells */}
                          <div className="flex-1 flex gap-0.5">
                            {[...Array(matrixSize)].map((_, colIndex) => {
                              const impact = colIndex + 1;
                              const score = likelihood * impact;
                              const bgColor = getCellColor(likelihood, impact);
                              const key = `${likelihood}-${impact}`;
                              const riskData = riskCountMap.get(key);
                              const count = riskData?.count || 0;
                              const band = getBandForScore(score);
                              
                              return (
                                <HoverCard key={colIndex} openDelay={300} closeDelay={100}>
                                  <HoverCardTrigger asChild>
                                    <div
                                      className="flex-1 aspect-square min-w-[40px] min-h-[40px] rounded flex flex-col items-center justify-center transition-all duration-200 hover:scale-105 hover:shadow-lg hover:z-10 relative cursor-help"
                                      style={{ 
                                        backgroundColor: bgColor,
                                        color: getContrastColor(bgColor)
                                      }}
                                    >
                                      <span className="text-sm font-bold">{count > 0 ? count : ''}</span>
                                      <span className="text-[8px] opacity-75">{score}</span>
                                    </div>
                                  </HoverCardTrigger>
                                  <HoverCardContent side="top" className="w-56 p-2.5 z-[60]">
                                    <div className="space-y-1.5">
                                      <div className="flex items-center gap-2">
                                        <div 
                                          className="w-3 h-3 rounded"
                                          style={{ backgroundColor: bgColor }}
                                        />
                                        <span className="font-semibold text-sm">{band?.label || band?.band || 'Unknown'}</span>
                                      </div>
                                      <div className="text-xs space-y-0.5">
                                        <p><span className="text-muted-foreground">Score:</span> {score}</p>
                                        <p><span className="text-muted-foreground">Risks:</span> {count}</p>
                                        <p><span className="text-muted-foreground">Likelihood:</span> {likelihoodLevel.label}</p>
                                        <p><span className="text-muted-foreground">Impact:</span> {getImpactLevel(impact).label}</p>
                                      </div>
                                    </div>
                                  </HoverCardContent>
                                </HoverCard>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {/* X-axis labels */}
                    <div className="flex items-start mt-1">
                      <div className="w-20" />
                      <div className="flex-1 flex gap-0.5">
                        {[...Array(matrixSize)].map((_, index) => {
                          const impactLevel = getImpactLevel(index + 1);
                          return (
                            <div key={index} className="flex-1 min-w-[40px] text-center">
                              <ImpactLabelHover level={impactLevel} allLevels={allImpactLevels} />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* X-axis title */}
                    <div className="flex items-center justify-center mt-1">
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                        Impact →
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Legend */}
            {bands && bands.length > 0 && (
              <div className="pt-3 mt-3 border-t border-border">
                <div className="flex flex-wrap gap-1.5">
                  {[...bands].sort((a, b) => a.min_score - b.min_score).map((band) => (
                    <Badge
                      key={band.id}
                      variant="outline"
                      className="gap-1.5 py-1 px-2 text-[10px]"
                      style={{ borderColor: band.color || '#6366f1' }}
                    >
                      <div
                        className="w-2 h-2 rounded-sm"
                        style={{ backgroundColor: band.color || '#6366f1' }}
                      />
                      <span className="text-foreground">{band.label || band.band}</span>
                      <span className="text-muted-foreground">
                        ({band.min_score}–{band.max_score})
                      </span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Thresholds Table */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Table className="w-4 h-4 text-primary" />
              Risk Assessment Thresholds
            </CardTitle>
            <CardDescription className="text-xs">
              Likelihood & category-specific impact definitions
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="h-[380px]">
              <div className="space-y-4">
                {/* Likelihood Definitions */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Likelihood Levels
                  </h4>
                  <div className="space-y-1">
                    {allLikelihoodLevels.sort((a, b) => b.level - a.level).map((level) => (
                      <div key={level.level} className="p-2 rounded bg-muted/30 text-xs">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] min-w-[20px] justify-center py-0">
                            {level.level}
                          </Badge>
                          <span className="font-medium">{level.label}</span>
                        </div>
                        {level.description && (
                          <p className="text-muted-foreground mt-1 pl-7 text-[11px] leading-relaxed">
                            {level.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Category Impact Thresholds */}
                {categories && categories.filter(c => c.thresholds_config && Object.keys(c.thresholds_config as object).length > 0).length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Impact by Category
                    </h4>
                    <div className="space-y-2">
                      {categories
                        .filter(c => c.thresholds_config && Object.keys(c.thresholds_config as object).length > 0)
                        .map((category) => {
                          const thresholds = (category.thresholds_config || {}) as Record<string, string>;
                          const sortedLevels = Object.entries(thresholds).sort(([a], [b]) => Number(a) - Number(b));
                          
                          return (
                            <div 
                              key={category.id} 
                              className="rounded-lg border border-border overflow-hidden"
                            >
                              <div 
                                className="px-3 py-2 bg-muted/40 flex items-center gap-2"
                                style={{ borderLeft: `3px solid ${category.color || '#6366f1'}` }}
                              >
                                <span className="font-medium text-xs">{category.name}</span>
                              </div>
                              <div className="divide-y divide-border">
                                {sortedLevels.map(([level, description]) => (
                                  <div key={level} className="px-3 py-1.5 text-xs flex gap-2">
                                    <Badge variant="secondary" className="text-[10px] min-w-[20px] justify-center py-0 shrink-0">
                                      {level}
                                    </Badge>
                                    <span className="text-muted-foreground leading-relaxed">
                                      {description}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RiskHeatmapDashboard;
