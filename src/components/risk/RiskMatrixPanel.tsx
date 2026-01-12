import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { X, Info, ChevronDown, ChevronRight } from 'lucide-react';
import { RiskSeverity, RiskLikelihood } from '@/hooks/useRisks';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface Band {
  id: string;
  label: string | null;
  band: string;
  color: string | null;
  min_score: number;
  max_score: number;
  acceptance_role?: string | null;
  authorized_actions?: string[] | null;
  description?: string | null;
}

interface LevelDefinition {
  level: number;
  label: string;
  description?: string | null;
  color?: string | null;
}

interface CategoryThreshold {
  id: string;
  name: string;
  color?: string | null;
  thresholds_config?: Record<string, string> | null;
}

interface RiskMatrixPanelProps {
  open: boolean;
  onClose: () => void;
  matrixSize: number;
  bands: Band[];
  likelihoodLevels?: LevelDefinition[];
  impactLevels?: LevelDefinition[];
  highlightedLikelihood?: number | null;
  highlightedImpact?: number | null;
  categories?: CategoryThreshold[];
}

// Severity/likelihood to number mapping
const severityToNumber: Record<RiskSeverity, number> = {
  negligible: 1, low: 2, medium: 3, high: 4, critical: 5,
};
const likelihoodToNumber: Record<RiskLikelihood, number> = {
  rare: 1, unlikely: 2, possible: 3, likely: 4, almost_certain: 5,
};

function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#1f2937' : '#ffffff';
}

// Component for hoverable likelihood labels
const LikelihoodLabel: React.FC<{ level: LevelDefinition; allLevels: LevelDefinition[] }> = ({ level, allLevels }) => {
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button className="text-[9px] text-muted-foreground truncate hover:text-foreground hover:underline cursor-help transition-colors flex items-center gap-0.5">
          {level.label}
          <Info className="w-2.5 h-2.5 opacity-50" />
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
const ImpactLabel: React.FC<{ level: LevelDefinition; allLevels: LevelDefinition[] }> = ({ level, allLevels }) => {
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button className="text-[9px] text-muted-foreground truncate hover:text-foreground hover:underline cursor-help transition-colors flex items-center gap-0.5 justify-center">
          {level.label}
          <Info className="w-2.5 h-2.5 opacity-50" />
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

export const RiskMatrixPanel: React.FC<RiskMatrixPanelProps> = ({
  open,
  onClose,
  matrixSize,
  bands,
  likelihoodLevels,
  impactLevels,
  highlightedLikelihood,
  highlightedImpact,
  categories,
}) => {
  const [expandedCategories, setExpandedCategories] = React.useState<Set<string>>(new Set());

  if (!open) return null;

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const getBandForScore = (score: number) => {
    return bands?.find(band => score >= band.min_score && score <= band.max_score);
  };

  const getCellColor = (likelihood: number, impact: number): string => {
    const score = likelihood * impact;
    const band = getBandForScore(score);
    return band?.color || '#94a3b8';
  };

  const getLikelihoodLevel = (level: number): LevelDefinition => {
    const found = likelihoodLevels?.find((l) => l.level === level);
    if (found) return found;
    const defaults = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];
    return { level, label: defaults[level - 1] || `L${level}` };
  };

  const getImpactLevel = (level: number): LevelDefinition => {
    const found = impactLevels?.find((l) => l.level === level);
    if (found) return found;
    const defaults = ['Negligible', 'Low', 'Medium', 'High', 'Critical'];
    return { level, label: defaults[level - 1] || `I${level}` };
  };

  // Build complete level arrays for hover cards
  const allLikelihoodLevels: LevelDefinition[] = [...Array(matrixSize)].map((_, i) => getLikelihoodLevel(i + 1));
  const allImpactLevels: LevelDefinition[] = [...Array(matrixSize)].map((_, i) => getImpactLevel(i + 1));

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-background border-l border-border shadow-xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-semibold text-foreground">Risk Matrix Reference</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Matrix Grid */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3">
              Risk Matrix ({matrixSize}x{matrixSize})
              <span className="text-xs ml-2 text-muted-foreground/70">Hover labels for definitions</span>
            </h4>
            <div className="overflow-x-auto">
              <div className="min-w-[280px]">
                <div className="flex">
                  {/* Y-axis label */}
                  <div className="flex items-center justify-center w-5 mr-1">
                    <span 
                      className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider transform -rotate-90 whitespace-nowrap"
                      style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                    >
                      Likelihood →
                    </span>
                  </div>

                  <div className="flex-1">
                    {/* Matrix rows */}
                    {[...Array(matrixSize)].map((_, rowIndex) => {
                      const likelihood = matrixSize - rowIndex;
                      const likelihoodLevel = getLikelihoodLevel(likelihood);
                      
                      return (
                        <div key={rowIndex} className="flex items-stretch">
                          <div className="w-20 flex items-center justify-end pr-1 py-0.5">
                            <LikelihoodLabel level={likelihoodLevel} allLevels={allLikelihoodLevels} />
                          </div>
                          
                          <div className="flex-1 flex gap-0.5">
                            {[...Array(matrixSize)].map((_, colIndex) => {
                              const impact = colIndex + 1;
                              const score = likelihood * impact;
                              const bgColor = getCellColor(likelihood, impact);
                              const isHighlighted = highlightedLikelihood === likelihood && highlightedImpact === impact;
                              const band = getBandForScore(score);
                              
                              return (
                                <HoverCard key={colIndex} openDelay={300} closeDelay={100}>
                                  <HoverCardTrigger asChild>
                                    <div
                                      className={`flex-1 aspect-square min-w-[32px] min-h-[32px] rounded flex items-center justify-center text-[10px] font-bold transition-all cursor-help ${
                                        isHighlighted ? 'ring-2 ring-primary ring-offset-1 scale-110 z-10' : ''
                                      }`}
                                      style={{ 
                                        backgroundColor: bgColor,
                                        color: getContrastColor(bgColor)
                                      }}
                                    >
                                      {score}
                                    </div>
                                  </HoverCardTrigger>
                                  <HoverCardContent side="top" className="w-56 p-3 z-[60]">
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <div 
                                          className="w-4 h-4 rounded"
                                          style={{ backgroundColor: bgColor }}
                                        />
                                        <span className="font-semibold">{band?.label || band?.band || 'Unknown'}</span>
                                      </div>
                                      <div className="text-xs space-y-1">
                                        <p><span className="text-muted-foreground">Score:</span> {score}</p>
                                        <p><span className="text-muted-foreground">Likelihood:</span> {likelihoodLevel.label}</p>
                                        <p><span className="text-muted-foreground">Impact:</span> {getImpactLevel(impact).label}</p>
                                        {band?.acceptance_role && (
                                          <p><span className="text-muted-foreground">Authority:</span> {band.acceptance_role}</p>
                                        )}
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
                            <div key={index} className="flex-1 min-w-[32px] text-center">
                              <ImpactLabel level={impactLevel} allLevels={allImpactLevels} />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-center mt-1">
                      <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">
                        Impact →
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Likelihood Definitions */}
          {likelihoodLevels && likelihoodLevels.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Likelihood Levels</h4>
              <div className="space-y-2">
                {[...likelihoodLevels].sort((a, b) => b.level - a.level).map((level) => (
                  <div key={level.level} className="p-2 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs min-w-[24px] justify-center">
                        {level.level}
                      </Badge>
                      <span className="font-medium text-sm">{level.label}</span>
                    </div>
                    {level.description && (
                      <p className="text-xs text-muted-foreground pl-8">{level.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Likelihood Definitions */}
          {likelihoodLevels && likelihoodLevels.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Likelihood Levels</h4>
              <div className="space-y-2">
                {[...likelihoodLevels].sort((a, b) => b.level - a.level).map((level) => (
                  <div key={level.level} className="p-2 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs min-w-[24px] justify-center">
                        {level.level}
                      </Badge>
                      <span className="font-medium text-sm">{level.label}</span>
                    </div>
                    {level.description && (
                      <p className="text-xs text-muted-foreground pl-8">{level.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Impact Definitions */}
          {impactLevels && impactLevels.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Impact Levels</h4>
              <div className="space-y-2">
                {[...impactLevels].sort((a, b) => a.level - b.level).map((level) => (
                  <div key={level.level} className="p-2 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs min-w-[24px] justify-center">
                        {level.level}
                      </Badge>
                      <span className="font-medium text-sm">{level.label}</span>
                    </div>
                    {level.description && (
                      <p className="text-xs text-muted-foreground pl-8">{level.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Category Impact Thresholds */}
          {categories && categories.filter(c => c.thresholds_config && Object.keys(c.thresholds_config).length > 0).length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Category Impact Definitions</h4>
              <div className="space-y-2">
                {categories
                  .filter(c => c.thresholds_config && Object.keys(c.thresholds_config).length > 0)
                  .map((category) => {
                    const thresholds = category.thresholds_config || {};
                    const isExpanded = expandedCategories.has(category.id);
                    const sortedLevels = Object.entries(thresholds).sort(([a], [b]) => Number(a) - Number(b));
                    
                    return (
                      <Collapsible key={category.id} open={isExpanded} onOpenChange={() => toggleCategory(category.id)}>
                        <CollapsibleTrigger className="w-full">
                          <div 
                            className="p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors flex items-center justify-between cursor-pointer"
                            style={{ borderLeft: `3px solid ${category.color || '#6366f1'}` }}
                          >
                            <div className="flex items-center gap-2">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                              )}
                              <span className="font-medium text-sm">{category.name}</span>
                            </div>
                            <Badge variant="outline" className="text-[10px]">
                              {sortedLevels.length} levels
                            </Badge>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="mt-1 ml-4 space-y-1">
                            {sortedLevels.map(([level, description]) => (
                              <div key={level} className="p-2 rounded bg-muted/20 text-xs">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="secondary" className="text-[10px] min-w-[20px] justify-center">
                                    {level}
                                  </Badge>
                                  <span className="font-medium text-muted-foreground">Level {level}</span>
                                </div>
                                <p className="text-muted-foreground pl-7 leading-relaxed">
                                  {description}
                                </p>
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default RiskMatrixPanel;
