import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WizardFormData } from './types';

interface LivePreviewProps {
  formData: WizardFormData;
}

const LivePreview: React.FC<LivePreviewProps> = ({ formData }) => {
  const size = formData.matrix_size;
  const enabledCategories = formData.risk_categories.filter(c => c.is_enabled);

  const getBandForScore = (score: number) => {
    return formData.bands.find(b => score >= b.min_score && score <= b.max_score);
  };

  const getCellScore = (likelihood: number, impact: number) => {
    return likelihood * impact;
  };

  return (
    <Card className="bg-card/50 border-border sticky top-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Live Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mini Matrix */}
        <div>
          <div className="text-xs text-muted-foreground mb-2">Matrix ({size}×{size})</div>
          <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
            {Array.from({ length: size }, (_, likIdx) => 
              Array.from({ length: size }, (_, impIdx) => {
                const likelihood = size - likIdx;
                const impact = impIdx + 1;
                const score = getCellScore(likelihood, impact);
                const band = getBandForScore(score);
                return (
                  <div
                    key={`${likelihood}-${impact}`}
                    className="aspect-square rounded-sm flex items-center justify-center text-xs font-mono text-white/80"
                    style={{ backgroundColor: band?.color || '#6366f1' }}
                  >
                    {size <= 5 && score}
                  </div>
                );
              })
            ).flat()}
          </div>
        </div>

        {/* Bands */}
        <div>
          <div className="text-xs text-muted-foreground mb-2">
            Bands ({formData.bands.length})
          </div>
          <div className="space-y-1">
            {formData.bands.map((band, index) => (
              <div
                key={index}
                className="flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: band.color }}
                  />
                  <span className="text-foreground truncate max-w-20">
                    {band.label}
                  </span>
                </div>
                <span className="text-muted-foreground font-mono">
                  {band.min_score}–{band.max_score}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Categories */}
        {enabledCategories.length > 0 && (
          <div>
            <div className="text-xs text-muted-foreground mb-2">
              Categories ({enabledCategories.length})
            </div>
            <div className="flex flex-wrap gap-1">
              {enabledCategories.slice(0, 6).map((category) => (
                <Badge
                  key={category.id}
                  variant="outline"
                  className="text-xs py-0"
                  style={{ borderColor: category.color }}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full mr-1"
                    style={{ backgroundColor: category.color }}
                  />
                  {category.name.slice(0, 10)}
                </Badge>
              ))}
              {enabledCategories.length > 6 && (
                <Badge variant="outline" className="text-xs py-0">
                  +{enabledCategories.length - 6}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Status */}
        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Status</span>
            <Badge
              variant={formData.status === 'Approved' ? 'default' : 'secondary'}
              className="text-xs"
            >
              {formData.status}
            </Badge>
          </div>
          {formData.name && (
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-muted-foreground">Name</span>
              <span className="text-foreground truncate max-w-24">{formData.name}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LivePreview;
