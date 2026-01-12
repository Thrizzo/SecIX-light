import { useQuery, useMutation, useQueryClient, useIsMutating } from '@tanstack/react-query';
import { supabase } from '@/integrations/database/client';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useRef } from 'react';

export interface MaturityAssessment {
  id: string;
  assessed_at: string;
  score_govern: number;
  score_identify: number;
  score_protect: number;
  score_detect: number;
  score_respond: number;
  score_recover: number;
  overall_score: number;
  ai_rationale: string | null;
  evidence_summary: Record<string, unknown>;
  run_by: string | null;
  created_at: string;
}

export const useMaturityAssessments = () => {
  return useQuery({
    queryKey: ['maturity-assessments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maturity_assessments')
        .select('*')
        .order('assessed_at', { ascending: false });

      if (error) throw error;
      return data as MaturityAssessment[];
    },
  });
};

export const useLatestMaturityAssessment = () => {
  return useQuery({
    queryKey: ['maturity-assessments', 'latest'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maturity_assessments')
        .select('*')
        .order('assessed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as MaturityAssessment | null;
    },
  });
};

export const useRunMaturityAssessment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke<MaturityAssessment & { error?: string }>('maturity-assess');
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as MaturityAssessment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maturity-assessments'] });
      toast({ title: 'Assessment Complete', description: 'Maturity assessment has been updated.' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Assessment Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

/**
 * Hook that monitors changes to evidence/controls and automatically triggers
 * a maturity re-assessment after a debounce period.
 * Use this on the MaturityDashboard or a parent component to enable on-change evaluation.
 */
export const useAutoMaturityAssessment = () => {
  const queryClient = useQueryClient();
  const runAssessment = useRunMaturityAssessment();
  const lastAssessmentTime = useRef<number>(0);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const isMutating = useIsMutating();

  useEffect(() => {
    // Subscribe to query cache updates for evidence and controls
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== 'updated') return;
      const key = event.query.queryKey;
      
      // Check if relevant data changed
      const isRelevant = 
        (Array.isArray(key) && (
          key[0] === 'evidence-items' ||
          key[0] === 'internal-controls' ||
          key[0] === 'framework-controls'
        ));
      
      if (!isRelevant) return;
      
      // Debounce: wait 30 seconds after last change to avoid excessive API calls
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
      
      debounceTimeout.current = setTimeout(() => {
        const now = Date.now();
        // Don't re-assess more than once per 5 minutes
        if (now - lastAssessmentTime.current < 5 * 60 * 1000) return;
        if (runAssessment.isPending) return;
        
        lastAssessmentTime.current = now;
        runAssessment.mutate();
      }, 30000); // 30 second debounce
    });

    return () => {
      unsubscribe();
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [queryClient, runAssessment]);

  return runAssessment;
};
