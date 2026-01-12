import React from 'react';
import { useRiskMatrices, useCreateRiskAppetite, useSetActiveAppetite, useCreateAppetiteBand, useUpdateRiskAppetite, useRiskAppetiteBands, useDeleteAppetiteBand, useMatrixLikelihoodLevels, useMatrixImpactLevels } from '@/hooks/useRiskAppetite';
import { useProfiles, useRiskCategories } from '@/hooks/useRisks';
import { db } from '@/integrations/database/client';

// Use database adapter that works with both Supabase and REST API
const supabase = db;
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import RiskAppetiteWizard from './RiskAppetiteWizard';
import { WizardFormData, WizardBand, WizardRiskCategory, WizardLikelihoodLevel, getInitialFormData } from './types';

interface RiskAppetiteWizardContainerProps {
  onComplete: () => void;
  editingAppetiteId?: string | null;
}

export const RiskAppetiteWizardContainer: React.FC<RiskAppetiteWizardContainerProps> = ({ onComplete, editingAppetiteId }) => {
  const { data: matrices, isLoading: matricesLoading } = useRiskMatrices();
  const { data: profiles, isLoading: profilesLoading } = useProfiles();
  const { data: categories, isLoading: categoriesLoading } = useRiskCategories();
  const { data: existingBands, isLoading: bandsLoading } = useRiskAppetiteBands(editingAppetiteId || undefined);
  const createAppetite = useCreateRiskAppetite();
  const updateAppetite = useUpdateRiskAppetite();
  const setActiveAppetite = useSetActiveAppetite();
  const createBand = useCreateAppetiteBand();
  const deleteBand = useDeleteAppetiteBand();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [existingAppetite, setExistingAppetite] = React.useState<any>(null);
  const [appetiteLoading, setAppetiteLoading] = React.useState(!!editingAppetiteId);
  const [initialData, setInitialData] = React.useState<Partial<WizardFormData> | null>(null);
  const [matrixIdForLevels, setMatrixIdForLevels] = React.useState<string | null>(null);
  
  // Fetch likelihood levels for the matrix
  const { data: likelihoodLevels, isLoading: likelihoodLoading } = useMatrixLikelihoodLevels(matrixIdForLevels || undefined);

  // Fetch existing appetite for edit mode
  React.useEffect(() => {
    if (!editingAppetiteId) {
      setAppetiteLoading(false);
      return;
    }

    const fetchAppetite = async () => {
      const { data, error } = await supabase
        .from('risk_appetites')
        .select('*')
        .eq('id', editingAppetiteId)
        .single();
      
      if (!error && data) {
        setExistingAppetite(data);
      }
      setAppetiteLoading(false);
    };
    fetchAppetite();
  }, [editingAppetiteId]);

  // Set matrix ID for fetching likelihood levels when editing
  React.useEffect(() => {
    if (existingAppetite?.matrix_id) {
      setMatrixIdForLevels(existingAppetite.matrix_id);
    }
  }, [existingAppetite]);

  // Build initial data for edit mode
  React.useEffect(() => {
    if (!editingAppetiteId || !existingAppetite || !existingBands || !matrices) return;
    if (!categories || categories.length === 0) return;

    // Wait for likelihood levels if we have a matrix
    if (existingAppetite.matrix_id && !likelihoodLevels) return;

    const matrix = matrices.find(m => m.id === existingAppetite.matrix_id);
    const matrixSize = matrix?.size || 5;

    // Convert existing bands to wizard format
    const wizardBands: WizardBand[] = existingBands.map(band => ({
      id: band.id,
      label: band.label || band.band,
      color: band.color || '#6366f1',
      min_score: band.min_score,
      max_score: band.max_score,
      acceptance_role: band.acceptance_role || '',
      acceptance_owner_id: band.acceptance_owner_id || null,
      authorized_actions: band.authorized_actions || [],
      description: band.description || '',
    }));

    // Convert DB categories to wizard format (so edit mode shows saved values)
    const wizardCategories: WizardRiskCategory[] = categories.map((c) => {
      const raw = (c.thresholds_config || {}) as Record<string, string>;
      const thresholds = Object.entries(raw).reduce((acc, [k, v]) => {
        const n = Number(k);
        if (!Number.isNaN(n)) acc[n] = String(v ?? '');
        return acc;
      }, {} as Record<number, string>);

      return {
        id: c.id,
        name: c.name,
        description: c.description,
        color: c.color || '#6366f1',
        is_enabled: Boolean(c.is_enabled),
        worst_case_description: c.worst_case_description || null,
        thresholds_config: thresholds,
      };
    });

    // Convert existing likelihood levels to wizard format
    const wizardLikelihoodLevels: WizardLikelihoodLevel[] = likelihoodLevels && likelihoodLevels.length > 0
      ? likelihoodLevels.map(l => ({
          level: l.level,
          label: l.label || '',
          description: l.description || '',
          color: l.color || '#6366f1',
        }))
      : Array.from({ length: matrixSize }, (_, i) => ({
          level: i + 1,
          label: '',
          description: '',
          color: '#6366f1',
        }));

    setInitialData({
      name: existingAppetite.name,
      owner_id: existingAppetite.owner_id || '',
      matrix_id: existingAppetite.matrix_id,
      matrix_size: matrixSize,
      version: existingAppetite.version || 1,
      status: existingAppetite.status || 'Draft',
      risk_categories: wizardCategories,
      bands: wizardBands.length > 0 ? wizardBands : getInitialFormData(matrixSize).bands,
      likelihood_levels: wizardLikelihoodLevels,
      narrative_statement: existingAppetite.narrative_statement || '',
      escalation_criteria: existingAppetite.escalation_criteria || '',
      reporting_cadence: existingAppetite.reporting_cadence || '',
      privacy_constraints: existingAppetite.privacy_constraints || '',
      effective_date: existingAppetite.effective_date || null,
    });
  }, [editingAppetiteId, existingAppetite, existingBands, matrices, likelihoodLevels, categories]);

  const handleSave = async (data: WizardFormData, activate: boolean) => {
    try {
      const bandTypeMap: Record<string, string> = {
        'low': 'acceptable',
        'acceptable': 'acceptable',
        'medium': 'monitor',
        'monitor': 'monitor',
        'high': 'treat',
        'treat': 'treat',
        'critical': 'escalate',
        'escalate': 'escalate',
        'extreme': 'escalate',
      };

      let appetiteId: string;

      if (editingAppetiteId && existingAppetite) {
        // Update existing appetite
        await updateAppetite.mutateAsync({
          id: editingAppetiteId,
          name: data.name,
          matrix_id: data.matrix_id,
          owner_id: data.owner_id || null,
          narrative_statement: data.narrative_statement || null,
          escalation_criteria: data.escalation_criteria || null,
          reporting_cadence: data.reporting_cadence || null,
          privacy_constraints: data.privacy_constraints || null,
        });

        appetiteId = editingAppetiteId;

        // Delete existing bands and recreate
        if (existingBands) {
          for (const band of existingBands) {
            await deleteBand.mutateAsync({ id: band.id, appetite_id: editingAppetiteId });
          }
        }
      } else {
        // Create new appetite
        const appetite = await createAppetite.mutateAsync({
          name: data.name,
          matrix_id: data.matrix_id,
          owner_id: data.owner_id || undefined,
          narrative_statement: data.narrative_statement || undefined,
          escalation_criteria: data.escalation_criteria || undefined,
          reporting_cadence: data.reporting_cadence || undefined,
          privacy_constraints: data.privacy_constraints || undefined,
          status: data.status,
          effective_date: data.effective_date || undefined,
        });
        appetiteId = appetite.id;
      }

      // Create bands
      for (const band of data.bands) {
        const labelLower = band.label.toLowerCase().replace(/\s+/g, '_');
        const bandType = bandTypeMap[labelLower] || 'monitor';
        
        await createBand.mutateAsync({
          appetite_id: appetiteId,
          band: bandType,
          min_score: band.min_score,
          max_score: band.max_score,
          label: band.label || undefined,
          color: band.color || undefined,
          description: band.description || undefined,
          authorized_actions: band.authorized_actions || undefined,
          acceptance_role: band.acceptance_role || undefined,
        });
      }

      // Update categories from wizard (incl. enabled state + thresholds)
      for (const category of data.risk_categories) {
        // Skip client-only categories (not persisted yet)
        if (category.id.startsWith('new-')) continue;

        const thresholds = (category.thresholds_config || {}) as Record<number, string>;
        const thresholdsForDb = Object.entries(thresholds).reduce((acc, [k, v]) => {
          acc[String(k)] = v;
          return acc;
        }, {} as Record<string, string>);

        const { error: catErr } = await supabase
          .from('risk_categories')
          .update({
            name: category.name,
            description: category.description,
            color: category.color,
            is_enabled: category.is_enabled,
            thresholds_config: thresholdsForDb,
            worst_case_description: category.worst_case_description || null,
          })
          .eq('id', category.id);

        if (catErr) throw catErr;
      }

      // Persist likelihood levels (RAS) to the database for the selected matrix
      if (data.matrix_id) {
        const defaultLikelihoodLabels = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];

        const { error: delErr } = await supabase
          .from('matrix_likelihood_levels')
          .delete()
          .eq('matrix_id', data.matrix_id);
        if (delErr) throw delErr;

        const payload = (data.likelihood_levels || []).map((l) => ({
          matrix_id: data.matrix_id,
          level: l.level,
          label: (l.label || defaultLikelihoodLabels[l.level - 1] || `Level ${l.level}`).trim(),
          description: l.description?.trim() ? l.description.trim() : null,
          color: l.color || null,
        }));

        if (payload.length > 0) {
          const { error: insErr } = await supabase
            .from('matrix_likelihood_levels')
            .insert(payload);
          if (insErr) throw insErr;
        }
      }

      // Activate if requested
      if (activate) {
        await setActiveAppetite.mutateAsync(appetiteId);
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['risk-appetites'] });
      queryClient.invalidateQueries({ queryKey: ['risk-appetite-bands'] });
      queryClient.invalidateQueries({ queryKey: ['risk-categories'] });
      if (data.matrix_id) {
        queryClient.invalidateQueries({ queryKey: ['matrix-likelihood-levels', data.matrix_id] });
      }

      toast({
        title: editingAppetiteId ? 'Risk Appetite Updated' : 'Risk Appetite Created',
        description: activate 
          ? 'Your risk appetite statement has been saved and activated.'
          : 'Your risk appetite statement has been saved.',
      });

      onComplete();
    } catch (error) {
      console.error('Failed to save risk appetite:', error);
      toast({
        title: 'Error',
        description: 'Failed to save risk appetite. Please try again.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const isLoading = matricesLoading || profilesLoading || categoriesLoading || appetiteLoading || (editingAppetiteId && (bandsLoading || likelihoodLoading || !initialData));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <RiskAppetiteWizard
      onSave={handleSave}
      onCancel={onComplete}
      initialData={initialData}
      profiles={profiles || []}
      matrices={matrices || []}
      categories={categories}
    />
  );
};

export default RiskAppetiteWizardContainer;
