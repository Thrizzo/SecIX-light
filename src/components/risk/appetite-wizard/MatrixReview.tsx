import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Grid3X3 } from 'lucide-react';
import { WizardFormData } from './types';

interface MatrixReviewProps {
  formData: WizardFormData;
}

const MatrixReview: React.FC<MatrixReviewProps> = ({ formData }) => {
  const size = formData.matrix_size;

  const getBandForScore = (score: number) => {
    return formData.bands.find(b => score >= b.min_score && score <= b.max_score);
  };

  const getCellScore = (likelihood: number, impact: number) => {
    return likelihood * impact;
  };

  const getImpactLabel = (level: number) => {
    const labels = ['Negligible', 'Low', 'Medium', 'High', 'Critical'];
    return labels[level - 1] || `I${level}`;
  };

  const getLikelihoodLabel = (level: number) => {
    const likLevel = formData.likelihood_levels.find(l => l.level === level);
    if (likLevel?.label) return likLevel.label;
    const labels = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];
    return labels[level - 1] || `L${level}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-semibold text-foreground mb-2">Matrix Review</h2>
        <p className="text-muted-foreground">
          Review how your bands map onto the risk matrix. Each cell shows the score (Likelihood × Impact).
        </p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Grid3X3 className="w-5 h-5 text-primary" />
            {formData.matrix_size}×{formData.matrix_size} Risk Matrix
          </CardTitle>
          <CardDescription>
            Colors indicate the risk band for each score
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-2 text-xs text-muted-foreground font-normal"></th>
                  {Array.from({ length: size }, (_, i) => i + 1).map((impact) => (
                    <th key={impact} className="p-2 text-center">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                        Impact
                      </div>
                      <div className="text-sm font-medium text-foreground">
                        {getImpactLabel(impact)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: size }, (_, i) => size - i).map((likelihood) => (
                  <tr key={likelihood}>
                    <td className="p-2 text-right">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">
                        Likelihood
                      </div>
                      <div className="text-sm font-medium text-foreground">
                        {getLikelihoodLabel(likelihood)}
                      </div>
                    </td>
                    {Array.from({ length: size }, (_, i) => i + 1).map((impact) => {
                      const score = getCellScore(likelihood, impact);
                      const band = getBandForScore(score);
                      return (
                        <td key={impact} className="p-1">
                          <div
                            className="w-full h-16 rounded flex flex-col items-center justify-center transition-transform hover:scale-105 cursor-default"
                            style={{
                              backgroundColor: band?.color || '#6366f1',
                              opacity: 0.9,
                            }}
                          >
                            <span className="text-xl font-mono font-bold text-white drop-shadow-md">
                              {score}
                            </span>
                            <span className="text-xs text-white/80">
                              {band?.label || 'Unassigned'}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Band Legend */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Band Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {formData.bands.map((band, index) => (
              <div
                key={index}
                className="p-3 rounded-lg border border-border"
                style={{ borderLeftWidth: 4, borderLeftColor: band.color }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: band.color }}
                  />
                  <span className="font-medium text-foreground">{band.label}</span>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>Scores: {band.min_score} – {band.max_score}</div>
                  <div>Authority: {band.acceptance_role || 'Not set'}</div>
                  {band.authorized_actions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {band.authorized_actions.slice(0, 3).map((action) => (
                        <Badge key={action} variant="outline" className="text-xs">
                          {action}
                        </Badge>
                      ))}
                      {band.authorized_actions.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{band.authorized_actions.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Coverage Check */}
      <div className="p-4 rounded-lg bg-muted/30 border border-border">
        <h4 className="font-medium text-foreground mb-2">Coverage Analysis</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Total Cells:</span>
            <span className="ml-2 font-mono text-foreground">{size * size}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Score Range:</span>
            <span className="ml-2 font-mono text-foreground">1 – {size * size}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Bands Defined:</span>
            <span className="ml-2 font-mono text-foreground">{formData.bands.length}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Categories:</span>
            <span className="ml-2 font-mono text-foreground">
              {formData.risk_categories.filter(c => c.is_enabled).length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatrixReview;
