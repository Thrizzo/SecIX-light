import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sparkles, Loader2 } from 'lucide-react';
import { WizardFormData } from './types';
import { invokeBackendFunction } from '@/lib/backend-functions';
import { useToast } from '@/hooks/use-toast';

interface CategoryThresholdsTableProps {
  formData: WizardFormData;
  onChange: (data: Partial<WizardFormData>) => void;
}

const defaultImpactLabels = ['Negligible', 'Low', 'Medium', 'High', 'Critical'];

const CategoryThresholdsTable: React.FC<CategoryThresholdsTableProps> = ({ formData, onChange }) => {
  const { toast } = useToast();
  const [loadingCategory, setLoadingCategory] = useState<string | null>(null);
  const enabledCategories = formData.risk_categories.filter(c => c.is_enabled);

  const handleUpdateThreshold = (categoryId: string, level: number, description: string) => {
    onChange({
      risk_categories: formData.risk_categories.map(c =>
        c.id === categoryId
          ? {
              ...c,
              thresholds_config: {
                ...c.thresholds_config,
                [level]: description,
              },
            }
          : c
      ),
    });
  };

  const handleGenerateThresholds = async (categoryId: string) => {
    const category = formData.risk_categories.find(c => c.id === categoryId);
    if (!category) return;

    setLoadingCategory(categoryId);
    try {
      const data = await invokeBackendFunction<{ suggestions?: string[] }>('suggest-risk-content', {
        type: 'impact-descriptions',
        category_name: category.name,
        category_description: category.description,
        worst_case: category.worst_case_description,
        levels_count: formData.matrix_size,
      });

      if (data?.suggestions && Array.isArray(data.suggestions)) {
        const newThresholds: Record<number, string> = {};
        data.suggestions.forEach((desc: string, index: number) => {
          newThresholds[index + 1] = desc;
        });

        onChange({
          risk_categories: formData.risk_categories.map(c =>
            c.id === categoryId
              ? { ...c, thresholds_config: newThresholds }
              : c
          ),
        });

        toast({
          title: 'Thresholds generated',
          description: 'AI has suggested impact descriptions for each level.',
        });
      }
    } catch (err) {
      console.error('Failed to generate thresholds:', err);
      toast({
        title: 'Generation failed',
        description: 'Could not generate thresholds. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoadingCategory(null);
    }
  };

  const getImpactLabel = (level: number): string => {
    return defaultImpactLabels[level - 1] || `Level ${level}`;
  };

  if (enabledCategories.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-display font-semibold text-foreground mb-2">Impact Thresholds</h2>
          <p className="text-muted-foreground">No categories selected.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-semibold text-foreground mb-2">Impact Thresholds</h2>
        <p className="text-muted-foreground">
          Define what each impact level means for each category. This creates consistency in risk assessment.
        </p>
      </div>

      <Tabs defaultValue={enabledCategories[0]?.id} className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-2 bg-muted/50 p-2">
          {enabledCategories.map((category) => (
            <TabsTrigger
              key={category.id}
              value={category.id}
              className="gap-2"
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              {category.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {enabledCategories.map((category) => (
          <TabsContent key={category.id} value={category.id}>
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      {category.name} Impact Levels
                    </CardTitle>
                    <CardDescription>
                      Define what each impact severity means for {category.name}
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGenerateThresholds(category.id)}
                    disabled={loadingCategory === category.id}
                    className="gap-2"
                  >
                    {loadingCategory === category.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        AI Generate All
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Level</TableHead>
                      <TableHead className="w-32">Label</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: formData.matrix_size }, (_, i) => i + 1).map((level) => (
                      <TableRow key={level}>
                        <TableCell className="font-mono">{level}</TableCell>
                        <TableCell className="font-medium">{getImpactLabel(level)}</TableCell>
                        <TableCell>
                          <Input
                            placeholder={`What does "${getImpactLabel(level)}" mean for ${category.name}?`}
                            value={category.thresholds_config[level] || ''}
                            onChange={(e) => handleUpdateThreshold(category.id, level, e.target.value)}
                            className="bg-input border-border"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {category.worst_case_description && (
                  <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                      Worst Case Anchor (Level {formData.matrix_size})
                    </p>
                    <p className="text-sm text-foreground">{category.worst_case_description}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default CategoryThresholdsTable;
