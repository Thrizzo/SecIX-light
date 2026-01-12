import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/database/client';
import { useAuth } from '@/contexts/AuthContext';

export interface WorkplaceItem {
  id: string;
  type: 'risk' | 'treatment' | 'control' | 'asset' | 'policy' | 'bia' | 'evidence';
  title: string;
  code?: string;
  status: string;
  dueDate?: string | null;
  reviewDate?: string | null;
  role: 'owner' | 'assigned' | 'accountable' | 'responsible';
  category?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
}

export interface WorkplaceSummary {
  totalItems: number;
  overdueItems: number;
  dueSoon: number; // within 7 days
  byType: Record<string, number>;
}

const getDaysUntil = (dateStr: string | null | undefined): number | null => {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(dateStr);
  dueDate.setHours(0, 0, 0, 0);
  return Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

export const useMyWorkplace = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-workplace', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return { items: [], summary: { totalItems: 0, overdueItems: 0, dueSoon: 0, byType: {} } };

      const items: WorkplaceItem[] = [];

      // Fetch risks owned by user
      const { data: risks } = await supabase
        .from<{
          id: string;
          risk_id: string;
          title: string;
          status: string;
          review_date: string | null;
          inherent_severity: string | null;
        }>('risks')
        .select('id, risk_id, title, status, review_date, inherent_severity')
        .eq('owner_id', user.id)
        .neq('status', 'archived');

      risks?.forEach((risk) => {
        items.push({
          id: risk.id,
          type: 'risk',
          title: risk.title,
          code: risk.risk_id,
          status: risk.status,
          reviewDate: risk.review_date,
          dueDate: risk.review_date,
          role: 'owner',
          priority: risk.inherent_severity === 'critical' ? 'critical' : 
                   risk.inherent_severity === 'high' ? 'high' :
                   risk.inherent_severity === 'medium' ? 'medium' : 'low',
        });
      });

      // Fetch treatments assigned to user
      const { data: treatments } = await supabase
        .from<{
          id: string;
          title: string;
          status: string;
          due_date: string | null;
          risk_id: string;
        }>('risk_treatments')
        .select('id, title, status, due_date, risk_id')
        .eq('assigned_to', user.id)
        .neq('status', 'cancelled');

      treatments?.forEach((t) => {
        items.push({
          id: t.id,
          type: 'treatment',
          title: t.title,
          status: t.status,
          dueDate: t.due_date,
          role: 'assigned',
          priority: t.status === 'in_progress' ? 'high' : 'medium',
        });
      });

      // Fetch internal controls owned by user
      const { data: controls } = await supabase
        .from<{
          id: string;
          internal_control_code: string;
          title: string;
          status: string;
        }>('internal_controls')
        .select('id, internal_control_code, title, status')
        .eq('owner_id', user.id);

      controls?.forEach((c) => {
        items.push({
          id: c.id,
          type: 'control',
          title: c.title,
          code: c.internal_control_code,
          status: c.status,
          role: 'owner',
        });
      });

      // Fetch primary assets owned by user
      const { data: primaryAssets } = await supabase
        .from<{
          id: string;
          asset_id: string;
          name: string;
          criticality: string | null;
        }>('primary_assets')
        .select('id, asset_id, name, criticality')
        .eq('owner_id', user.id);

      primaryAssets?.forEach((a) => {
        items.push({
          id: a.id,
          type: 'asset',
          title: a.name,
          code: a.asset_id,
          status: 'active',
          role: 'owner',
          category: 'Primary Asset',
          priority: a.criticality === 'Critical' ? 'critical' : 
                   a.criticality === 'High' ? 'high' : 'medium',
        });
      });

      // Fetch secondary assets owned by user
      const { data: secondaryAssets } = await supabase
        .from<{
          id: string;
          asset_id: string;
          name: string;
        }>('secondary_assets')
        .select('id, asset_id, name')
        .eq('owner_id', user.id);

      secondaryAssets?.forEach((a) => {
        items.push({
          id: a.id,
          type: 'asset',
          title: a.name,
          code: a.asset_id,
          status: 'active',
          role: 'owner',
          category: 'Secondary Asset',
        });
      });

      // Fetch policies where user is owner/accountable/responsible
      const { data: policies } = await supabase
        .from<{
          id: string;
          title: string;
          status: string;
          review_by_date: string | null;
          owner_user_id: string | null;
          accountable_user_id: string | null;
          responsible_user_id: string | null;
        }>('policies')
        .select('id, title, status, review_by_date, owner_user_id, accountable_user_id, responsible_user_id')
        .or(`owner_user_id.eq.${user.id},accountable_user_id.eq.${user.id},responsible_user_id.eq.${user.id}`);

      policies?.forEach((p) => {
        let role: 'owner' | 'accountable' | 'responsible' = 'owner';
        if (p.responsible_user_id === user.id) role = 'responsible';
        else if (p.accountable_user_id === user.id) role = 'accountable';
        
        items.push({
          id: p.id,
          type: 'policy',
          title: p.title,
          status: p.status,
          dueDate: p.review_by_date,
          reviewDate: p.review_by_date,
          role,
        });
      });

      // Fetch BIA assessments created by user
      const { data: bias } = await supabase
        .from('bia_assessments')
        .select('id, next_review_at, derived_criticality, primary_assets!inner(name)')
        .eq('created_by', user.id);

      bias?.forEach((b: any) => {
        items.push({
          id: b.id,
          type: 'bia',
          title: `BIA: ${b.primary_assets?.name || 'Unknown Asset'}`,
          status: 'active',
          dueDate: b.next_review_at,
          reviewDate: b.next_review_at,
          role: 'owner',
          priority: b.derived_criticality === 'Critical' ? 'critical' : 
                   b.derived_criticality === 'High' ? 'high' : 'medium',
        });
      });

      // Fetch evidence items owned by user
      const { data: evidence } = await supabase
        .from<{
          id: string;
          name: string;
          expires_at: string | null;
        }>('evidence_items')
        .select('id, name, expires_at')
        .eq('owner_id', user.id);

      evidence?.forEach((e) => {
        items.push({
          id: e.id,
          type: 'evidence',
          title: e.name,
          status: 'active',
          dueDate: e.expires_at,
          role: 'owner',
        });
      });

      // Calculate summary
      let overdueItems = 0;
      let dueSoon = 0;
      const byType: Record<string, number> = {};

      items.forEach((item) => {
        byType[item.type] = (byType[item.type] || 0) + 1;
        
        const daysUntil = getDaysUntil(item.dueDate || item.reviewDate);
        if (daysUntil !== null) {
          if (daysUntil < 0) overdueItems++;
          else if (daysUntil <= 7) dueSoon++;
        }
      });

      const summary: WorkplaceSummary = {
        totalItems: items.length,
        overdueItems,
        dueSoon,
        byType,
      };

      return { items, summary };
    },
  });
};

export const getItemTypeLabel = (type: WorkplaceItem['type']): string => {
  const labels: Record<WorkplaceItem['type'], string> = {
    risk: 'Risk',
    treatment: 'Treatment',
    control: 'Control',
    asset: 'Asset',
    policy: 'Policy',
    bia: 'BIA',
    evidence: 'Evidence',
  };
  return labels[type];
};

export const getItemRoute = (item: WorkplaceItem): string => {
  switch (item.type) {
    case 'risk':
      return '/dashboard/risks';
    case 'treatment':
      return '/dashboard/risks';
    case 'control':
      return '/dashboard/controls';
    case 'asset':
      return '/dashboard/assets';
    case 'policy':
      return '/dashboard/governance';
    case 'bia':
      return `/dashboard/continuity/bia/${item.id}`;
    case 'evidence':
      return '/dashboard/controls';
    default:
      return '/dashboard';
  }
};
