import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, FileText, Calendar, Shield, Sparkles, Loader2 } from 'lucide-react';
import { WizardFormData } from './types';
import { invokeBackendFunction } from '@/lib/backend-functions';
import { useToast } from '@/hooks/use-toast';

interface ConfirmationProps {
  formData: WizardFormData;
  onChange: (data: Partial<WizardFormData>) => void;
  profiles: Array<{ id: string; full_name: string | null; email: string | null }>;
}

type SuggestionType = 'narrative-statement' | 'escalation-criteria' | 'security-constraints';

const Confirmation: React.FC<ConfirmationProps> = ({ formData, onChange, profiles }) => {
  const enabledCategories = formData.risk_categories.filter(c => c.is_enabled);
  const owner = profiles.find(p => p.id === formData.owner_id);
  const { toast } = useToast();
  
  const [loadingType, setLoadingType] = useState<SuggestionType | null>(null);

  const generateSuggestion = async (type: SuggestionType) => {
    setLoadingType(type);
    
    try {
      const categoryNames = enabledCategories.map(c => c.name).join(', ');
      const bandInfo = formData.bands.map(b => `${b.label} (${b.min_score}-${b.max_score})`).join(', ');
      
      const data = await invokeBackendFunction<{ suggestion?: string }>('suggest-risk-content', {
        type,
        category_name: categoryNames,
        worst_case: bandInfo,
        levels_count: formData.matrix_size,
      });

      if (data?.suggestion) {
        switch (type) {
          case 'narrative-statement':
            onChange({ narrative_statement: data.suggestion });
            break;
          case 'escalation-criteria':
            onChange({ escalation_criteria: data.suggestion });
            break;
          case 'security-constraints':
            onChange({ privacy_constraints: data.suggestion });
            break;
        }
        toast({
          title: 'Suggestion generated',
          description: 'AI-generated content has been added. Feel free to customize it.',
        });
      }
    } catch (error) {
      console.error('Failed to generate suggestion:', error);
      toast({
        title: 'Generation failed',
        description: error instanceof Error ? error.message : 'Unable to generate suggestion. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-semibold text-foreground mb-2">Confirmation</h2>
        <p className="text-muted-foreground">
          Review your risk appetite statement and add any final details.
        </p>
      </div>

      {/* Summary Card */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            {formData.name || 'Unnamed Appetite'}
          </CardTitle>
          <CardDescription>
            Version {formData.version} • {formData.status}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Owner</span>
              <p className="font-medium text-foreground">
                {owner?.full_name || owner?.email || 'Not set'}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Matrix Size</span>
              <p className="font-medium text-foreground">
                {formData.matrix_size}×{formData.matrix_size}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Categories</span>
              <p className="font-medium text-foreground">{enabledCategories.length}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Risk Bands</span>
              <p className="font-medium text-foreground">{formData.bands.length}</p>
            </div>
          </div>

          <Separator />

          <div>
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Included Categories</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {enabledCategories.map((category) => (
                <Badge
                  key={category.id}
                  variant="outline"
                  className="gap-1"
                  style={{ borderColor: category.color }}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  {category.name}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Risk Bands</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.bands.map((band, index) => (
                <Badge
                  key={index}
                  style={{ backgroundColor: band.color, color: 'white' }}
                >
                  {band.label} ({band.min_score}–{band.max_score})
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Narrative Statement */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5 text-primary" />
            Narrative Statement
          </CardTitle>
          <CardDescription>
            A high-level summary of your organization's risk appetite
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Statement</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => generateSuggestion('narrative-statement')}
                disabled={loadingType !== null}
                className="gap-2 text-primary hover:text-primary"
              >
                {loadingType === 'narrative-statement' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Generate with AI
              </Button>
            </div>
            <Textarea
              placeholder="Our organization maintains a balanced approach to risk, accepting moderate risks in pursuit of strategic objectives while ensuring adequate controls are in place..."
              value={formData.narrative_statement}
              onChange={(e) => onChange({ narrative_statement: e.target.value })}
              rows={4}
              className="bg-input border-border resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Escalation Criteria</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => generateSuggestion('escalation-criteria')}
                  disabled={loadingType !== null}
                  className="gap-2 text-primary hover:text-primary h-auto py-1"
                >
                  {loadingType === 'escalation-criteria' ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  AI
                </Button>
              </div>
              <Textarea
                placeholder="Define when and how risks should be escalated..."
                value={formData.escalation_criteria}
                onChange={(e) => onChange({ escalation_criteria: e.target.value })}
                rows={3}
                className="bg-input border-border resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label>Reporting Cadence</Label>
              <Input
                placeholder="e.g., Monthly to Risk Committee, Quarterly to Board"
                value={formData.reporting_cadence}
                onChange={(e) => onChange({ reporting_cadence: e.target.value })}
                className="bg-input border-border"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Security Constraints</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => generateSuggestion('security-constraints')}
                disabled={loadingType !== null}
                className="gap-2 text-primary hover:text-primary h-auto py-1"
              >
                {loadingType === 'security-constraints' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                AI
              </Button>
            </div>
            <Textarea
              placeholder="Any security-related considerations or constraints..."
              value={formData.privacy_constraints}
              onChange={(e) => onChange({ privacy_constraints: e.target.value })}
              rows={2}
              className="bg-input border-border resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Dates */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="w-5 h-5 text-primary" />
            Effective Period
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Effective Date</Label>
              <Input
                type="date"
                value={formData.effective_date || ''}
                onChange={(e) => onChange({ effective_date: e.target.value || null })}
                className="bg-input border-border"
              />
              <p className="text-xs text-muted-foreground">
                When this appetite statement becomes active
              </p>
            </div>
            <div className="space-y-2">
              <Label>Review Date</Label>
              <Input
                type="date"
                value={formData.review_date || ''}
                onChange={(e) => onChange({ review_date: e.target.value || null })}
                className="bg-input border-border"
              />
              <p className="text-xs text-muted-foreground">
                When this appetite should be reviewed
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ready to Save */}
      <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-accent mt-0.5" />
          <div>
            <h4 className="font-medium text-foreground">Ready to Save</h4>
            <p className="text-sm text-muted-foreground mt-1">
              You can save this as a draft to continue editing later, or approve and activate it immediately.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Confirmation;
