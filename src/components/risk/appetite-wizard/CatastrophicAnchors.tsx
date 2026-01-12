import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { WizardFormData } from './types';
import { invokeBackendFunction } from '@/lib/backend-functions';
import { useToast } from '@/hooks/use-toast';

interface CatastrophicAnchorsProps {
  formData: WizardFormData;
  onChange: (data: Partial<WizardFormData>) => void;
}

const CatastrophicAnchors: React.FC<CatastrophicAnchorsProps> = ({ formData, onChange }) => {
  const { toast } = useToast();
  const [loadingCategory, setLoadingCategory] = useState<string | null>(null);
  const enabledCategories = formData.risk_categories.filter(c => c.is_enabled);

  const handleUpdateWorstCase = (categoryId: string, description: string) => {
    onChange({
      risk_categories: formData.risk_categories.map(c =>
        c.id === categoryId ? { ...c, worst_case_description: description } : c
      ),
    });
  };

  const handleGenerateSuggestion = async (categoryId: string) => {
    const category = formData.risk_categories.find(c => c.id === categoryId);
    if (!category) return;

    setLoadingCategory(categoryId);
    try {
      const data = await invokeBackendFunction<{ suggestion?: string }>('suggest-risk-content', {
        type: 'worst-case',
        category_name: category.name,
        category_description: category.description,
      });

      if (data?.suggestion) {
        handleUpdateWorstCase(categoryId, data.suggestion);
        toast({
          title: 'Suggestion generated',
          description: 'AI has suggested a worst-case scenario. Feel free to edit it.',
        });
      }
    } catch (err) {
      console.error('Failed to generate suggestion:', err);
      toast({
        title: 'Generation failed',
        description: 'Could not generate suggestion. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoadingCategory(null);
    }
  };

  if (enabledCategories.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-display font-semibold text-foreground mb-2">Worst Case Scenarios</h2>
          <p className="text-muted-foreground">
            Define the catastrophic outcomes for each risk category.
          </p>
        </div>
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-medium text-foreground mb-2">No Categories Selected</h3>
            <p className="text-sm text-muted-foreground">
              Please go back and select at least one risk category.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-semibold text-foreground mb-2">Worst Case Scenarios</h2>
        <p className="text-muted-foreground">
          For each category, describe what the worst possible outcome would look like.
          This anchors your highest impact level.
        </p>
      </div>

      <div className="space-y-4">
        {enabledCategories.map((category) => (
          <Card key={category.id} className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  {category.name}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleGenerateSuggestion(category.id)}
                  disabled={loadingCategory === category.id}
                  className="gap-2"
                >
                  {loadingCategory === category.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : category.worst_case_description ? (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Regenerate
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      AI Suggest
                    </>
                  )}
                </Button>
              </CardTitle>
              <CardDescription>
                What's the worst that could happen in this category?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label className="sr-only">Worst Case Description</Label>
                <Textarea
                  placeholder={`Example: Complete ${category.name.toLowerCase()} failure resulting in...`}
                  value={category.worst_case_description || ''}
                  onChange={(e) => handleUpdateWorstCase(category.id, e.target.value)}
                  rows={4}
                  className="bg-input border-border resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  This description will be used to define your highest impact level for this category.
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="p-4 rounded-lg bg-info/10 border border-info/20">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-info mt-0.5" />
          <div>
            <h4 className="font-medium text-foreground">AI-Powered Suggestions</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Click "AI Suggest" to generate realistic worst-case scenarios based on industry best practices.
              You can always edit the suggestions to match your organization's context.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CatastrophicAnchors;
