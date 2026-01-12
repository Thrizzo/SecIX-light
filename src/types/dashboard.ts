/**
 * Shared types for Dashboard components
 * These types are used by both Supabase and Postgres versions
 */

export interface DashboardMetrics {
  risks: {
    total: number;
    open: number;
    treated: number;
    accepted: number;
    registered: number;
  };
  controls: {
    total: number;
    overdue: number;
    internalTotal: number;
    internalOverdue: number;
  };
  policies: {
    total: number;
    overdue: number;
    draft: number;
    published: number;
  };
  vendors: {
    total: number;
    assessmentsDue: number;
  };
  assets: {
    primary: number;
    secondary: number;
    deviations: number;
  };
  evidence: {
    total: number;
    expiringSoon: number;
    controlsWithoutEvidence: number;
  };
  compliance: {
    frameworks: FrameworkCompliance[];
    averageCompliance: number;
  };
  riskAppetite: {
    violations: number;
    details: RiskAppetiteViolation[];
  };
}

export interface FrameworkCompliance {
  framework_id: string;
  framework_name: string;
  total_controls: number;
  implemented_controls: number;
  partially_implemented: number;
  not_implemented: number;
  compliance_percentage: number;
}

export interface RiskAppetiteViolation {
  risk_id: string;
  risk_name: string;
  score: number;
  band: string;
  band_label: string;
}

export interface DashboardThreshold {
  id: string;
  threshold_key: string;
  threshold_name: string;
  threshold_value: number;
  threshold_unit: string;
  description: string | null;
  category: string;
}

export interface AssetDeviation {
  asset_id: string;
  asset_name: string;
  asset_criticality: string;
  bia_criticality: string;
}

export interface DashboardInsight {
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  action?: string;
  link?: string;
  trend?: 'improving' | 'declining' | 'stable';
  recommendation?: string;
}

export interface DashboardData {
  success: boolean;
  metrics: DashboardMetrics;
  insights: DashboardInsight[];
  overdueDetails: {
    controls: Array<{ id: string; name: string; next_review_date: string }>;
    policies: Array<{ id: string; title: string; review_by_date: string }>;
    vendors: Array<{ id: string; name: string; next_assessment_date: string }>;
  };
  assetDeviations: AssetDeviation[];
  controlsWithoutEvidence: Array<{ id: string; title: string; code: string }>;
  evidenceExpiringSoon: Array<{ id: string; name: string; expires_at: string }>;
  frameworkCompliance: FrameworkCompliance[];
  riskAppetiteViolations: RiskAppetiteViolation[];
  thresholds: DashboardThreshold[];
}
