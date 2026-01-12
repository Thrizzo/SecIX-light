import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/database/client';
import { toast } from 'sonner';

export type Regulation = 'NIS2' | 'DORA' | 'HIPAA' | 'PCI_DSS' | 'SOX';

export interface CoveredArticle {
  article_id: string;
  article_title: string;
  coverage_level: 'full' | 'partial';
  mapped_controls: string[];
  evidence: string;
}

export interface Gap {
  article_id: string;
  article_title: string;
  description: string;
  criticality: 'critical' | 'high' | 'medium' | 'low';
  recommendation: string;
  effort_estimate: string;
}

export interface RegulatoryAnalysis {
  regulation: Regulation;
  regulation_name: string;
  overall_coverage: number;
  covered_articles: CoveredArticle[];
  gaps: Gap[];
  summary: {
    strengths: string[];
    weaknesses: string[];
    priority_actions: string[];
  };
  generated_at: string;
}

export interface CachedAnalysis {
  id: string;
  regulation: Regulation;
  analysis_data: RegulatoryAnalysis;
  coverage_percentage: number;
  generated_at: string;
  expires_at: string;
}

function normalizeRegulatoryAnalysis(raw: unknown, fallbackRegulation: Regulation): RegulatoryAnalysis {
  const obj = (raw ?? {}) as any;

  const summary = (obj.summary ?? {}) as any;

  const covered_articles = Array.isArray(obj.covered_articles) ? obj.covered_articles : [];
  const gaps = Array.isArray(obj.gaps) ? obj.gaps : [];

  const normalizedCovered: CoveredArticle[] = covered_articles.map((a: any) => ({
    article_id: String(a?.article_id ?? ''),
    article_title: String(a?.article_title ?? ''),
    coverage_level: a?.coverage_level === 'partial' ? 'partial' : 'full',
    mapped_controls: Array.isArray(a?.mapped_controls)
      ? a.mapped_controls.map((c: any) => String(c))
      : [],
    evidence: String(a?.evidence ?? ''),
  }));

  const normalizedGaps: Gap[] = gaps.map((g: any) => ({
    article_id: String(g?.article_id ?? ''),
    article_title: String(g?.article_title ?? ''),
    description: String(g?.description ?? ''),
    criticality:
      g?.criticality === 'critical' ||
      g?.criticality === 'high' ||
      g?.criticality === 'medium' ||
      g?.criticality === 'low'
        ? g.criticality
        : 'medium',
    recommendation: String(g?.recommendation ?? ''),
    effort_estimate: String(g?.effort_estimate ?? ''),
  }));

  return {
    regulation: (obj.regulation as Regulation) ?? fallbackRegulation,
    regulation_name: String(obj.regulation_name ?? fallbackRegulation),
    overall_coverage: Number.isFinite(Number(obj.overall_coverage)) ? Number(obj.overall_coverage) : 0,
    covered_articles: normalizedCovered,
    gaps: normalizedGaps,
    summary: {
      strengths: Array.isArray(summary.strengths) ? summary.strengths.map((s: any) => String(s)) : [],
      weaknesses: Array.isArray(summary.weaknesses) ? summary.weaknesses.map((w: any) => String(w)) : [],
      priority_actions: Array.isArray(summary.priority_actions) ? summary.priority_actions.map((p: any) => String(p)) : [],
    },
    generated_at: String(obj.generated_at ?? new Date().toISOString()),
  };
}

export function useRegulatoryComplianceCache(regulation: Regulation) {
  return useQuery({
    queryKey: ['regulatory-compliance-cache', regulation],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('regulatory_compliance_cache')
          .select('*')
          .eq('regulation', regulation)
          .gt('expires_at', new Date().toISOString())
          .order('generated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Table may not exist in self-hosted - return null gracefully
        if (error) {
          console.warn('regulatory_compliance_cache query failed (table may not exist):', error.message);
          return null;
        }
        if (!data) return null;
        
        const typedData = data as { id: string; regulation: string; analysis_data: unknown; coverage_percentage: number; generated_at: string; expires_at: string };
        return {
          ...typedData,
          regulation: typedData.regulation as Regulation,
          analysis_data: normalizeRegulatoryAnalysis(typedData.analysis_data, regulation),
        } as CachedAnalysis;
      } catch (e) {
        console.warn('regulatory_compliance_cache error:', e);
        return null;
      }
    },
  });
}

export function useAllRegulatoryComplianceCache() {
  return useQuery({
    queryKey: ['regulatory-compliance-cache-all'],
    queryFn: async () => {
      const regulations: Regulation[] = ['NIS2', 'DORA', 'HIPAA', 'PCI_DSS', 'SOX'];
      const results: Record<Regulation, CachedAnalysis | null> = {
        NIS2: null,
        DORA: null,
        HIPAA: null,
        PCI_DSS: null,
        SOX: null,
      };

      try {
        for (const reg of regulations) {
          const { data, error } = await supabase
            .from('regulatory_compliance_cache')
            .select('*')
            .eq('regulation', reg)
            .gt('expires_at', new Date().toISOString())
            .order('generated_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          // Skip if table doesn't exist or query fails
          if (error) {
            console.warn(`regulatory_compliance_cache query for ${reg} failed:`, error.message);
            continue;
          }
          
          if (data) {
            const typedData = data as { id: string; regulation: string; analysis_data: unknown; coverage_percentage: number; generated_at: string; expires_at: string };
            results[reg] = {
              ...typedData,
              regulation: typedData.regulation as Regulation,
              analysis_data: normalizeRegulatoryAnalysis(typedData.analysis_data, reg),
            } as CachedAnalysis;
          }
        }
      } catch (e) {
        console.warn('useAllRegulatoryComplianceCache error:', e);
      }

      return results;
    },
  });
}

export function useRunRegulatoryAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ regulation, forceRefresh = false }: { regulation: Regulation; forceRefresh?: boolean }) => {
      const { data, error } = await supabase.functions.invoke('regulatory-compliance-check', {
        body: { regulation, forceRefresh },
      });

      if (error) throw error;
      const typedData = data as { error?: string } & Partial<RegulatoryAnalysis>;
      if (typedData?.error) throw new Error(typedData.error);

      // Defensive normalization: the AI/function may omit fields; UI expects arrays.
      return normalizeRegulatoryAnalysis(typedData, regulation);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['regulatory-compliance-cache', variables.regulation] });
      queryClient.invalidateQueries({ queryKey: ['regulatory-compliance-cache-all'] });
      toast.success(`${data.regulation_name} analysis complete: ${data.overall_coverage}% coverage`);
    },
    onError: (error: Error) => {
      console.error('Regulatory analysis failed:', error);
      if (error.message.includes('Rate limit')) {
        toast.error('Rate limit exceeded. Please try again later.');
      } else if (error.message.includes('credits')) {
        toast.error('AI credits exhausted. Please add credits to continue.');
      } else {
        toast.error(`Analysis failed: ${error.message}`);
      }
    },
  });
}
