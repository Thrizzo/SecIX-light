import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sparkles, Loader2, Percent } from 'lucide-react';
import { WizardFormData } from './types';
import { invokeBackendFunction } from '@/lib/backend-functions';
import { useToast } from '@/hooks/use-toast';

interface LikelihoodThresholdsProps {
  formData: WizardFormData;
  onChange: (data: Partial<WizardFormData>) => void;
}

const defaultLikelihoodLabels = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];

const LikelihoodThresholds: React.FC<LikelihoodThresholdsProps> = ({ formData, onChange }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleUpdateLevel = (level: number, field: 'label' | 'description' | 'color', value: string) => {
    onChange({
      likelihood_levels: formData.likelihood_levels.map(l =>
        l.level === level ? { ...l, [field]: value } : l
      ),
    });
  };

  const handleGenerateSuggestions = async () => {
    setLoading(true);
    try {
      const data = await invokeBackendFunction<{ suggestions?: Array<{ label: string; description: string }> }>(
        'suggest-risk-content',
        {
          type: 'likelihood-descriptions',
          levels_count: formData.matrix_size,
        }
      );

      if (data?.suggestions && Array.isArray(data.suggestions)) {
        onChange({
          likelihood_levels: formData.likelihood_levels.map((l, index) => ({
            ...l,
            label: data.suggestions![index]?.label || l.label || defaultLikelihoodLabels[index] || `Level ${index + 1}`,
            description: data.suggestions![index]?.description || l.description,
          })),
        });

        toast({
          title: 'Suggestions generated',
          description: 'AI has suggested likelihood labels and descriptions.',
        });
      }
    } catch (err) {
      console.error('Failed to generate suggestions:', err);
      toast({
        title: 'Generation failed',
        description: 'Could not generate suggestions. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Only initialize levels if they don't exist or size changed AND they're empty
  React.useEffect(() => {
    const currentLevels = formData.likelihood_levels;
    const needsInit = currentLevels.length !== formData.matrix_size;
    
    // If levels exist with content, preserve them (just adjust size if needed)
    if (needsInit) {
      const hasContent = currentLevels.some(l => l.label || l.description);
      
      if (hasContent && currentLevels.length > 0) {
        // Preserve existing content, just adjust to new size
        const newLevels = Array.from({ length: formData.matrix_size }, (_, i) => {
          const existing = currentLevels.find(l => l.level === i + 1);
          if (existing) {
            return existing;
          }
          return {
            level: i + 1,
            label: defaultLikelihoodLabels[i] || `Level ${i + 1}`,
            description: '',
            color: '#6366f1',
          };
        });
        onChange({ likelihood_levels: newLevels });
      } else {
        // No content, initialize with defaults
        onChange({
          likelihood_levels: Array.from({ length: formData.matrix_size }, (_, i) => ({
            level: i + 1,
            label: defaultLikelihoodLabels[i] || `Level ${i + 1}`,
            description: '',
            color: '#6366f1',
          })),
        });
      }
    }
  }, [formData.matrix_size]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-semibold text-foreground mb-2">Likelihood Levels</h2>
        <p className="text-muted-foreground">
          Define your organization's likelihood scale. Labels and descriptions are fully customizable.
        </p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Percent className="w-5 h-5 text-primary" />
                Likelihood Scale
              </CardTitle>
              <CardDescription>
                {formData.matrix_size} levels from least to most likely
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateSuggestions}
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  AI Suggest All
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Level</TableHead>
                <TableHead className="w-40">Label</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {formData.likelihood_levels.map((level) => (
                <TableRow key={level.level}>
                  <TableCell className="font-mono font-bold">{level.level}</TableCell>
                  <TableCell>
                    <Input
                      placeholder={defaultLikelihoodLabels[level.level - 1] || `Level ${level.level}`}
                      value={level.label}
                      onChange={(e) => handleUpdateLevel(level.level, 'label', e.target.value)}
                      className="bg-input border-border"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      placeholder={`e.g., "Less than once per ${level.level === 1 ? 'decade' : 'year'}"`}
                      value={level.description}
                      onChange={(e) => handleUpdateLevel(level.level, 'description', e.target.value)}
                      className="bg-input border-border"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <h4 className="font-medium text-foreground mb-3">Common Approaches</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• <strong>Frequency-based:</strong> "Once per year", "Multiple times per month"</li>
              <li>• <strong>Percentage-based:</strong> "&lt;1%", "10-25%", "&gt;90%"</li>
              <li>• <strong>Qualitative:</strong> "Rare", "Unlikely", "Possible"</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <h4 className="font-medium text-foreground mb-3">Tips</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Use descriptions that assessors can easily interpret</li>
              <li>• Be consistent with your organization's planning horizon</li>
              <li>• Consider historical data when setting thresholds</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LikelihoodThresholds;
