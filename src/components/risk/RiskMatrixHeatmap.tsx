import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Grid3X3 } from 'lucide-react';

interface Band {
  label: string;
  color: string;
  min_score: number;
  max_score: number;
  description?: string;
}

interface RiskMatrixHeatmapProps {
  matrixSize: number;
  bands: Band[];
  likelihoodLabels?: string[];
  impactLabels?: string[];
  title?: string;
  description?: string;
  showLegend?: boolean;
  onCellClick?: (likelihood: number, impact: number, score: number) => void;
  highlightedCells?: Array<{ likelihood: number; impact: number }>;
}

const defaultLikelihoodLabels = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];
const defaultImpactLabels = ['Negligible', 'Low', 'Medium', 'High', 'Critical'];

const RiskMatrixHeatmap: React.FC<RiskMatrixHeatmapProps> = ({
  matrixSize,
  bands,
  likelihoodLabels,
  impactLabels,
  title = 'Risk Matrix',
  description = 'Visual representation of risk scoring',
  showLegend = true,
  onCellClick,
  highlightedCells = [],
}) => {
  const getLikelihoodLabels = () => {
    if (likelihoodLabels && likelihoodLabels.length >= matrixSize) {
      return likelihoodLabels.slice(0, matrixSize);
    }
    return defaultLikelihoodLabels.slice(0, matrixSize);
  };

  const getImpactLabels = () => {
    if (impactLabels && impactLabels.length >= matrixSize) {
      return impactLabels.slice(0, matrixSize);
    }
    return defaultImpactLabels.slice(0, matrixSize);
  };

  const calculateScore = (likelihood: number, impact: number): number => {
    return likelihood * impact;
  };

  const getBandForScore = (score: number): Band | undefined => {
    return bands.find(band => score >= band.min_score && score <= band.max_score);
  };

  const getCellColor = (likelihood: number, impact: number): string => {
    const score = calculateScore(likelihood, impact);
    const band = getBandForScore(score);
    return band?.color || '#94a3b8';
  };

  const isHighlighted = (likelihood: number, impact: number): boolean => {
    return highlightedCells.some(
      cell => cell.likelihood === likelihood && cell.impact === impact
    );
  };

  const likelihoods = getLikelihoodLabels();
  const impacts = getImpactLabels();

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Grid3X3 className="w-5 h-5 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="overflow-x-auto">
          <div className="min-w-[400px]">
            {/* Matrix Grid */}
            <div className="flex">
              {/* Y-axis label */}
              <div className="flex items-center justify-center w-8 mr-2">
                <span 
                  className="text-xs font-medium text-muted-foreground uppercase tracking-wider transform -rotate-90 whitespace-nowrap"
                  style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                >
                  Likelihood →
                </span>
              </div>

              <div className="flex-1">
                {/* Matrix rows (likelihood from high to low) */}
                {[...Array(matrixSize)].map((_, rowIndex) => {
                  const likelihood = matrixSize - rowIndex;
                  const likelihoodLabel = likelihoods[likelihood - 1] || `L${likelihood}`;
                  
                  return (
                    <div key={rowIndex} className="flex items-stretch">
                      {/* Row label */}
                      <div className="w-24 flex items-center justify-end pr-2 py-1">
                        <span className="text-xs text-muted-foreground truncate" title={likelihoodLabel}>
                          {likelihoodLabel}
                        </span>
                      </div>
                      
                      {/* Cells */}
                      <div className="flex-1 flex gap-1">
                        {[...Array(matrixSize)].map((_, colIndex) => {
                          const impact = colIndex + 1;
                          const score = calculateScore(likelihood, impact);
                          const bgColor = getCellColor(likelihood, impact);
                          const highlighted = isHighlighted(likelihood, impact);
                          
                          return (
                            <button
                              key={colIndex}
                              onClick={() => onCellClick?.(likelihood, impact, score)}
                              className={`
                                flex-1 aspect-square min-w-[48px] min-h-[48px] rounded-md 
                                flex items-center justify-center
                                text-sm font-bold transition-all duration-200
                                hover:scale-105 hover:shadow-lg hover:z-10
                                ${highlighted ? 'ring-2 ring-primary ring-offset-2 ring-offset-card scale-105' : ''}
                                ${onCellClick ? 'cursor-pointer' : 'cursor-default'}
                              `}
                              style={{ 
                                backgroundColor: bgColor,
                                color: getContrastColor(bgColor)
                              }}
                              title={`Likelihood: ${likelihoodLabel}, Impact: ${impacts[impact - 1] || `I${impact}`}, Score: ${score}`}
                            >
                              {score}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* X-axis labels */}
                <div className="flex items-start mt-2">
                  <div className="w-24" />
                  <div className="flex-1 flex gap-1">
                    {impacts.map((label, index) => (
                      <div key={index} className="flex-1 min-w-[48px] text-center">
                        <span className="text-xs text-muted-foreground truncate block" title={label}>
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* X-axis title */}
                <div className="flex items-center justify-center mt-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Impact →
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        {showLegend && bands.length > 0 && (
          <div className="pt-4 border-t border-border">
            <h4 className="text-sm font-medium text-foreground mb-3">Risk Bands</h4>
            <div className="flex flex-wrap gap-2">
              {bands.map((band, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="gap-2 py-1.5 px-3"
                  style={{ borderColor: band.color }}
                >
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: band.color }}
                  />
                  <span className="text-foreground">{band.label}</span>
                  <span className="text-muted-foreground text-xs">
                    ({band.min_score}–{band.max_score})
                  </span>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Helper function to determine text color based on background
function getContrastColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace('#', '');
  
  // Parse RGB values
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  return luminance > 0.5 ? '#1f2937' : '#ffffff';
}

export default RiskMatrixHeatmap;
