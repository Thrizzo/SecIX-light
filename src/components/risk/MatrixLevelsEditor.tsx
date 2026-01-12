import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowUp, 
  ArrowRight, 
  Save, 
  Loader2,
  TrendingUp,
  AlertCircle,
  LayoutGrid,
} from 'lucide-react';
import { 
  useMatrixLikelihoodLevels, 
  useMatrixImpactLevels,
  useUpdateLikelihoodLevel,
  useUpdateImpactLevel,
  useRiskAppetiteBands,
  useActiveRiskAppetite,
  MatrixLikelihoodLevel,
  MatrixImpactLevel,
  bandConfig,
} from '@/hooks/useRiskAppetite';
import { useToast } from '@/hooks/use-toast';
import RiskMatrixHeatmap from './RiskMatrixHeatmap';

interface MatrixLevelsEditorProps {
  matrixId: string;
  matrixName: string;
  matrixSize: number;
  isAdmin: boolean;
}

const defaultColors = ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'];

const MatrixLevelsEditor: React.FC<MatrixLevelsEditorProps> = ({
  matrixId,
  matrixName,
  matrixSize,
  isAdmin,
}) => {
  const { toast } = useToast();
  const { data: likelihoodLevels, isLoading: likelihoodLoading } = useMatrixLikelihoodLevels(matrixId);
  const { data: impactLevels, isLoading: impactLoading } = useMatrixImpactLevels(matrixId);
  const { data: activeAppetite } = useActiveRiskAppetite();
  const { data: activeBands } = useRiskAppetiteBands(activeAppetite?.id);
  
  const updateLikelihood = useUpdateLikelihoodLevel();
  const updateImpact = useUpdateImpactLevel();

  const [editingLikelihood, setEditingLikelihood] = useState<Record<string, Partial<MatrixLikelihoodLevel>>>({});
  const [editingImpact, setEditingImpact] = useState<Record<string, Partial<MatrixImpactLevel>>>({});

  const isLoading = likelihoodLoading || impactLoading;

  // Compute labels dynamically based on current + editing values
  const currentLikelihoodLabels = useMemo(() => {
    if (!likelihoodLevels) return [];
    return likelihoodLevels
      .slice()
      .sort((a, b) => a.level - b.level)
      .map(level => {
        const edit = editingLikelihood[level.id];
        return edit?.label ?? level.label;
      });
  }, [likelihoodLevels, editingLikelihood]);

  const currentImpactLabels = useMemo(() => {
    if (!impactLevels) return [];
    return impactLevels
      .slice()
      .sort((a, b) => a.level - b.level)
      .map(level => {
        const edit = editingImpact[level.id];
        return edit?.label ?? level.label;
      });
  }, [impactLevels, editingImpact]);

  // Map active bands to the heatmap format
  const heatmapBands = useMemo(() => {
    if (!activeBands) return [];
    return activeBands.map(band => ({
      label: band.label || bandConfig[band.band]?.label || band.band,
      color: band.color || '#6366f1',
      min_score: band.min_score,
      max_score: band.max_score,
      description: band.description || undefined,
    }));
  }, [activeBands]);

  const handleLikelihoodChange = (id: string, field: keyof MatrixLikelihoodLevel, value: string) => {
    setEditingLikelihood(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const handleImpactChange = (id: string, field: keyof MatrixImpactLevel, value: string) => {
    setEditingImpact(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const saveLikelihoodLevel = async (level: MatrixLikelihoodLevel) => {
    const edits = editingLikelihood[level.id];
    if (!edits) return;

    await updateLikelihood.mutateAsync({
      id: level.id,
      matrixId,
      label: edits.label ?? level.label,
      description: edits.description ?? level.description,
      color: edits.color ?? level.color,
    });

    setEditingLikelihood(prev => {
      const next = { ...prev };
      delete next[level.id];
      return next;
    });

    toast({ title: 'Level updated', description: `Likelihood level "${edits.label || level.label}" saved.` });
  };

  const saveImpactLevel = async (level: MatrixImpactLevel) => {
    const edits = editingImpact[level.id];
    if (!edits) return;

    await updateImpact.mutateAsync({
      id: level.id,
      matrixId,
      label: edits.label ?? level.label,
      description: edits.description ?? level.description,
      color: edits.color ?? level.color,
    });

    setEditingImpact(prev => {
      const next = { ...prev };
      delete next[level.id];
      return next;
    });

    toast({ title: 'Level updated', description: `Impact level "${edits.label || level.label}" saved.` });
  };

  const getLevelValue = <T extends MatrixLikelihoodLevel | MatrixImpactLevel>(
    level: T,
    field: keyof T,
    edits: Record<string, Partial<T>>
  ): string => {
    const edit = edits[level.id];
    if (edit && field in edit) {
      return (edit[field] as string) ?? '';
    }
    return (level[field] as string) ?? '';
  };

  const hasChanges = (id: string, edits: Record<string, unknown>) => {
    return !!edits[id] && Object.keys(edits[id] as object).length > 0;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Live Heatmap Preview */}
      {heatmapBands.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <LayoutGrid className="w-5 h-5 text-primary" />
              Live Preview
            </CardTitle>
            <CardDescription>
              The heatmap updates as you edit level labels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RiskMatrixHeatmap
              matrixSize={matrixSize}
              bands={heatmapBands}
              likelihoodLabels={currentLikelihoodLabels}
              impactLabels={currentImpactLabels}
              title=""
              description=""
              showLegend={false}
            />
          </CardContent>
        </Card>
      )}

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            {matrixName}
          </CardTitle>
          <CardDescription>
            Configure the {matrixSize} likelihood and {matrixSize} impact levels for this matrix
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="likelihood" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="likelihood" className="gap-2">
                <ArrowUp className="w-4 h-4" />
                Likelihood Levels
              </TabsTrigger>
              <TabsTrigger value="impact" className="gap-2">
                <ArrowRight className="w-4 h-4" />
                Impact Levels
              </TabsTrigger>
            </TabsList>

            <TabsContent value="likelihood" className="space-y-4">
              <div className="text-sm text-muted-foreground mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Define how likely each risk event is to occur
              </div>
              {likelihoodLevels?.map((level) => (
                <div
                  key={level.id}
                  className="p-4 rounded-lg border border-border bg-muted/30 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="gap-2">
                      <span 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: getLevelValue(level, 'color', editingLikelihood) || defaultColors[level.level - 1] }}
                      />
                      Level {level.level}
                    </Badge>
                    {isAdmin && hasChanges(level.id, editingLikelihood) && (
                      <Button 
                        size="sm" 
                        onClick={() => saveLikelihoodLevel(level)}
                        disabled={updateLikelihood.isPending}
                        className="gap-2"
                      >
                        {updateLikelihood.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        Save
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Label</Label>
                      <Input
                        value={getLevelValue(level, 'label', editingLikelihood)}
                        onChange={(e) => handleLikelihoodChange(level.id, 'label', e.target.value)}
                        disabled={!isAdmin}
                        className="bg-input border-border"
                        placeholder="e.g., Rare, Unlikely, Possible..."
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-xs text-muted-foreground">Description</Label>
                      <Textarea
                        value={getLevelValue(level, 'description', editingLikelihood)}
                        onChange={(e) => handleLikelihoodChange(level.id, 'description', e.target.value)}
                        disabled={!isAdmin}
                        className="bg-input border-border resize-none"
                        rows={2}
                        placeholder="Describe when this likelihood level applies..."
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Color</Label>
                    <div className="flex gap-2">
                      {defaultColors.map((color) => (
                        <button
                          key={color}
                          disabled={!isAdmin}
                          className={`w-8 h-8 rounded transition-transform ${
                            (getLevelValue(level, 'color', editingLikelihood) || defaultColors[level.level - 1]) === color 
                              ? 'ring-2 ring-primary ring-offset-2 ring-offset-card scale-110' 
                              : ''
                          } ${!isAdmin ? 'cursor-not-allowed opacity-50' : ''}`}
                          style={{ backgroundColor: color }}
                          onClick={() => isAdmin && handleLikelihoodChange(level.id, 'color', color)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="impact" className="space-y-4">
              <div className="text-sm text-muted-foreground mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Define the severity of consequences if a risk occurs
              </div>
              {impactLevels?.map((level) => (
                <div
                  key={level.id}
                  className="p-4 rounded-lg border border-border bg-muted/30 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="gap-2">
                      <span 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: getLevelValue(level, 'color', editingImpact) || defaultColors[level.level - 1] }}
                      />
                      Level {level.level}
                    </Badge>
                    {isAdmin && hasChanges(level.id, editingImpact) && (
                      <Button 
                        size="sm" 
                        onClick={() => saveImpactLevel(level)}
                        disabled={updateImpact.isPending}
                        className="gap-2"
                      >
                        {updateImpact.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        Save
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Label</Label>
                      <Input
                        value={getLevelValue(level, 'label', editingImpact)}
                        onChange={(e) => handleImpactChange(level.id, 'label', e.target.value)}
                        disabled={!isAdmin}
                        className="bg-input border-border"
                        placeholder="e.g., Negligible, Low, Medium..."
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-xs text-muted-foreground">Description</Label>
                      <Textarea
                        value={getLevelValue(level, 'description', editingImpact)}
                        onChange={(e) => handleImpactChange(level.id, 'description', e.target.value)}
                        disabled={!isAdmin}
                        className="bg-input border-border resize-none"
                        rows={2}
                        placeholder="Describe the impact at this level..."
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Color</Label>
                    <div className="flex gap-2">
                      {defaultColors.map((color) => (
                        <button
                          key={color}
                          disabled={!isAdmin}
                          className={`w-8 h-8 rounded transition-transform ${
                            (getLevelValue(level, 'color', editingImpact) || defaultColors[level.level - 1]) === color 
                              ? 'ring-2 ring-primary ring-offset-2 ring-offset-card scale-110' 
                              : ''
                          } ${!isAdmin ? 'cursor-not-allowed opacity-50' : ''}`}
                          style={{ backgroundColor: color }}
                          onClick={() => isAdmin && handleImpactChange(level.id, 'color', color)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default MatrixLevelsEditor;
