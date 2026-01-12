import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/database/client';
import { useToast } from '@/hooks/use-toast';

// Types
export interface BiaAssessment {
  id: string;
  primary_asset_id: string;
  risk_appetite_id: string;
  bia_owner: string | null;
  notes: string | null;
  rto_hours: number | null;
  rpo_hours: number | null;
  mtd_hours: number | null;
  ai_suggested_rto_hours: number | null;
  ai_suggested_rpo_hours: number | null;
  ai_suggested_mtd_hours: number | null;
  ai_rationale: string | null;
  derived_criticality: string | null;
  time_to_high_bucket: string | null;
  last_assessed_at: string | null;
  next_review_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BiaImpactTimeline {
  id: string;
  bia_assessment_id: string;
  time_bucket: TimeBucket;
  impact_level_id: string;
  rationale: string | null;
  ai_suggested_impact_level_id: string | null;
  ai_rationale: string | null;
  created_at: string;
}

export type TimeBucket = '1d' | '3d' | '1w' | '2w' | '1m' | 'gt1m';

export const TIME_BUCKETS: { value: TimeBucket; label: string; hours: number }[] = [
  { value: '1d', label: '1 Day', hours: 24 },
  { value: '3d', label: '3 Days', hours: 72 },
  { value: '1w', label: '1 Week', hours: 168 },
  { value: '2w', label: '2 Weeks', hours: 336 },
  { value: '1m', label: '1 Month', hours: 720 },
  { value: 'gt1m', label: '> 1 Month', hours: 1440 },
];

export const BUCKET_TO_CRITICALITY: Record<TimeBucket, string> = {
  '1d': 'Critical',
  '3d': 'High',
  '1w': 'Medium',
  '2w': 'Medium',
  '1m': 'Low',
  'gt1m': 'Low',
};

export interface BiaWithAsset extends BiaAssessment {
  primary_assets?: {
    id: string;
    name: string;
    asset_id: string;
    primary_type: string;
    description: string | null;
  };
}

// Hooks
export const useBiaAssessments = () => {
  return useQuery({
    queryKey: ['bia-assessments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bia_assessments')
        .select(`
          *,
          primary_assets!bia_assessments_primary_asset_id_fkey (id, name, asset_id, primary_type, description)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as BiaWithAsset[];
    },
  });
};

// Get asset IDs that already have BIA assessments
export const useAssetsWithBia = () => {
  return useQuery({
    queryKey: ['assets-with-bia'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bia_assessments')
        .select('primary_asset_id');

      if (error) throw error;
      return new Set((data as { primary_asset_id: string }[]).map((row) => row.primary_asset_id));
    },
  });
};

export const useBiaAssessment = (id?: string) => {
  return useQuery({
    queryKey: ['bia-assessment', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bia_assessments')
        .select(`
          *,
          primary_assets!bia_assessments_primary_asset_id_fkey (id, name, asset_id, primary_type, description)
        `)
        .eq('id', id!)
        .single();

      if (error) throw error;
      return data as BiaWithAsset;
    },
  });
};

export const useBiaByAssetId = (assetId?: string) => {
  return useQuery({
    queryKey: ['bia-by-asset', assetId],
    enabled: !!assetId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bia_assessments')
        .select('*')
        .eq('primary_asset_id', assetId!)
        .maybeSingle();

      if (error) throw error;
      return data as BiaAssessment | null;
    },
  });
};

export const useBiaTimeline = (biaId?: string) => {
  return useQuery({
    queryKey: ['bia-timeline', biaId],
    enabled: !!biaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bia_impact_timeline')
        .select('*')
        .eq('bia_assessment_id', biaId!)
        .order('time_bucket');

      if (error) throw error;
      return data as BiaImpactTimeline[];
    },
  });
};

export interface CreateBiaInput {
  primary_asset_id: string;
  risk_appetite_id: string;
  bia_owner?: string;
  notes?: string;
  rto_hours?: number;
  rpo_hours?: number;
  mtd_hours?: number;
  ai_suggested_rto_hours?: number;
  ai_suggested_rpo_hours?: number;
  ai_suggested_mtd_hours?: number;
  ai_rationale?: string;
  derived_criticality?: string;
  time_to_high_bucket?: string;
  next_review_at?: string;
}

export interface TimelineEntry {
  time_bucket: TimeBucket;
  impact_level_id: string;
  rationale?: string;
}

export const useCreateBia = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      assessment,
      timeline,
    }: {
      assessment: CreateBiaInput & { business_unit_id?: string };
      timeline: TimelineEntry[];
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      // Get the user's profile to get business_unit_id if not provided
      let businessUnitId = assessment.business_unit_id;
      if (!businessUnitId && userId) {
        const { data: profile } = await supabase
          .from<{ business_unit_id: string | null }>('profiles')
          .select('business_unit_id')
          .eq('user_id', userId)
          .maybeSingle();
        businessUnitId = profile?.business_unit_id || undefined;
      }

      // Create assessment
      const { data: bia, error: biaErr } = await supabase
        .from('bia_assessments')
        .insert({
          ...assessment,
          business_unit_id: businessUnitId,
          created_by: userId,
          last_assessed_at: new Date().toISOString(),
        } as any)
        .select()
        .single();

      if (biaErr) throw biaErr;
      const biaData = bia as BiaAssessment;

      // Create timeline entries
      const timelineRows = timeline.map((t) => ({
        bia_assessment_id: biaData.id,
        time_bucket: t.time_bucket,
        impact_level_id: t.impact_level_id,
        rationale: t.rationale || null,
      }));

      const { error: tlErr } = await supabase
        .from('bia_impact_timeline')
        .insert(timelineRows as any);

      if (tlErr) throw tlErr;

      // Update primary_asset with BIA reference
      const { error: assetErr } = await supabase
        .from('primary_assets')
        .update({
          bia_id: biaData.id,
          criticality: assessment.derived_criticality,
          rto_hours: assessment.rto_hours,
          rpo_hours: assessment.rpo_hours,
          mtd_hours: assessment.mtd_hours,
          bia_completed: true,
        } as any)
        .eq('id', assessment.primary_asset_id);

      if (assetErr) throw assetErr;

      // Log audit entry
      await supabase.from('bia_audit_logs').insert({
        bia_assessment_id: biaData.id,
        action: 'BIA_CREATED',
        actor_user_id: userId,
        changes: {
          asset_id: assessment.primary_asset_id,
          criticality: assessment.derived_criticality,
          rto_hours: assessment.rto_hours,
          rpo_hours: assessment.rpo_hours,
          mtd_hours: assessment.mtd_hours,
        },
      } as any);

      return biaData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bia-assessments'] });
      queryClient.invalidateQueries({ queryKey: ['assets-with-bia'] });
      queryClient.invalidateQueries({ queryKey: ['bia-by-asset', data.primary_asset_id] });
      queryClient.invalidateQueries({ queryKey: ['primary-assets'] });
      queryClient.invalidateQueries({ queryKey: ['bia-audit-logs'] });
      toast({ title: 'BIA Created', description: 'Business Impact Assessment saved successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create BIA', description: error.message, variant: 'destructive' });
    },
  });
};

export const useUpdateBia = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      assessment,
      timeline,
    }: {
      id: string;
      assessment: Partial<CreateBiaInput>;
      timeline: TimelineEntry[];
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      // Update assessment
      const { data: bia, error: biaErr } = await supabase
        .from('bia_assessments')
        .update({
          ...assessment,
          last_assessed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (biaErr) throw biaErr;

      // Delete existing timeline and recreate
      await supabase.from('bia_impact_timeline').delete().eq('bia_assessment_id', id);

      const timelineRows = timeline.map((t) => ({
        bia_assessment_id: id,
        time_bucket: t.time_bucket,
        impact_level_id: t.impact_level_id,
        rationale: t.rationale || null,
      }));

      const { error: tlErr } = await supabase
        .from('bia_impact_timeline')
        .insert(timelineRows);

      if (tlErr) throw tlErr;

      // Sync to primary_asset
      const { error: assetErr } = await supabase
        .from('primary_assets')
        .update({
          criticality: assessment.derived_criticality,
          rto_hours: assessment.rto_hours,
          rpo_hours: assessment.rpo_hours,
          mtd_hours: assessment.mtd_hours,
          bia_completed: true,
        } as any)
        .eq('id', (bia as BiaAssessment).primary_asset_id);

      if (assetErr) throw assetErr;

      // Log audit entry
      await supabase.from('bia_audit_logs').insert({
        bia_assessment_id: id,
        action: 'BIA_UPDATED',
        actor_user_id: userId,
        changes: {
          criticality: assessment.derived_criticality,
          rto_hours: assessment.rto_hours,
          rpo_hours: assessment.rpo_hours,
          mtd_hours: assessment.mtd_hours,
        },
      });

      return bia as BiaAssessment;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bia-assessments'] });
      queryClient.invalidateQueries({ queryKey: ['assets-with-bia'] });
      queryClient.invalidateQueries({ queryKey: ['bia-assessment', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['bia-timeline', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['bia-by-asset', data.primary_asset_id] });
      queryClient.invalidateQueries({ queryKey: ['primary-assets'] });
      queryClient.invalidateQueries({ queryKey: ['bia-audit-logs'] });
      toast({ title: 'BIA Updated', description: 'Business Impact Assessment updated successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update BIA', description: error.message, variant: 'destructive' });
    },
  });
};

export const useDeleteBia = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // Get asset ID first to clear reference
      const { data: bia } = await supabase
        .from('bia_assessments')
        .select('primary_asset_id')
        .eq('id', id)
        .single();

      const biaData = bia as { primary_asset_id: string } | null;
      if (biaData) {
        await supabase
          .from('primary_assets')
          .update({ bia_id: null, bia_completed: false } as any)
          .eq('id', biaData.primary_asset_id);
      }

      const { error } = await supabase.from('bia_assessments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bia-assessments'] });
      queryClient.invalidateQueries({ queryKey: ['assets-with-bia'] });
      queryClient.invalidateQueries({ queryKey: ['primary-assets'] });
      toast({ title: 'BIA Deleted', description: 'Business Impact Assessment removed.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete BIA', description: error.message, variant: 'destructive' });
    },
  });
};

// Utility to derive criticality from timeline
export const deriveCriticalityFromTimeline = (
  timeline: { time_bucket: TimeBucket; level: number }[],
  highThreshold: number
): { criticality: string; timeToHighBucket: TimeBucket | null } => {
  // Sort by bucket order
  const orderedBuckets: TimeBucket[] = ['1d', '3d', '1w', '2w', '1m', 'gt1m'];

  for (const bucket of orderedBuckets) {
    const entry = timeline.find((t) => t.time_bucket === bucket);
    if (entry && entry.level >= highThreshold) {
      return {
        criticality: BUCKET_TO_CRITICALITY[bucket],
        timeToHighBucket: bucket,
      };
    }
  }

  return { criticality: 'Low', timeToHighBucket: null };
};
