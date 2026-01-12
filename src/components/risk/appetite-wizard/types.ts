// Wizard form data types - fully flexible, no hardcoded values

export interface WizardRiskCategory {
  id: string;
  name: string;
  description: string | null;
  color: string;
  is_enabled: boolean;
  worst_case_description: string | null;
  thresholds_config: Record<number, string>; // level -> description
}

export interface WizardBand {
  id?: string;
  label: string;
  color: string;
  min_score: number;
  max_score: number;
  acceptance_role: string;
  acceptance_owner_id: string | null;
  authorized_actions: string[];
  description: string;
}

export interface WizardLikelihoodLevel {
  level: number;
  label: string;
  description: string;
  color: string;
}

export interface WizardImpactLevel {
  level: number;
  label: string;
  description: string;
  color: string;
}

export interface WizardFormData {
  // Step 1: Setup
  name: string;
  owner_id: string;
  matrix_id: string;
  matrix_size: number;
  version: number;
  status: 'Draft' | 'Review' | 'Approved';

  // Step 2-4: Categories & Impact
  risk_categories: WizardRiskCategory[];

  // Step 5: Likelihood
  likelihood_levels: WizardLikelihoodLevel[];

  // Step 6: Bands
  bands: WizardBand[];

  // Step 7-8: Review & Confirm
  narrative_statement: string;
  escalation_criteria: string;
  reporting_cadence: string;
  privacy_constraints: string;
  effective_date: string | null;
  review_date: string | null;
  gray_swan_config: {
    enabled: boolean;
    impact_level: number;
    likelihood_level: number;
    allowed_actions: string[];
  };
}

export const defaultBandColors = [
  '#10B981', // emerald - acceptable
  '#F59E0B', // amber - monitor  
  '#F97316', // orange - treat
  '#EF4444', // red - escalate
  '#7C3AED', // purple - custom
];

export const defaultActions = [
  'Accept',
  'Mitigate', 
  'Transfer',
  'Avoid',
  'Escalate',
];

export const getInitialFormData = (matrixSize: number = 5): WizardFormData => ({
  name: '',
  owner_id: '',
  matrix_id: '',
  matrix_size: matrixSize,
  version: 1,
  status: 'Draft',
  risk_categories: [],
  likelihood_levels: Array.from({ length: matrixSize }, (_, i) => ({
    level: i + 1,
    label: '',
    description: '',
    color: '#6366f1',
  })),
  bands: [
    {
      label: 'Low',
      color: '#10B981',
      min_score: 1,
      max_score: Math.floor(matrixSize * matrixSize * 0.25),
      acceptance_role: 'Risk Owner',
      acceptance_owner_id: null,
      authorized_actions: ['Accept'],
      description: '',
    },
    {
      label: 'Medium',
      color: '#F59E0B',
      min_score: Math.floor(matrixSize * matrixSize * 0.25) + 1,
      max_score: Math.floor(matrixSize * matrixSize * 0.5),
      acceptance_role: 'Department Head',
      acceptance_owner_id: null,
      authorized_actions: ['Accept', 'Mitigate'],
      description: '',
    },
    {
      label: 'High',
      color: '#F97316',
      min_score: Math.floor(matrixSize * matrixSize * 0.5) + 1,
      max_score: Math.floor(matrixSize * matrixSize * 0.75),
      acceptance_role: 'Executive',
      acceptance_owner_id: null,
      authorized_actions: ['Mitigate', 'Transfer'],
      description: '',
    },
    {
      label: 'Critical',
      color: '#EF4444',
      min_score: Math.floor(matrixSize * matrixSize * 0.75) + 1,
      max_score: matrixSize * matrixSize,
      acceptance_role: 'Board',
      acceptance_owner_id: null,
      authorized_actions: ['Mitigate', 'Avoid', 'Escalate'],
      description: '',
    },
  ],
  narrative_statement: '',
  escalation_criteria: '',
  reporting_cadence: '',
  privacy_constraints: '',
  effective_date: null,
  review_date: null,
  gray_swan_config: {
    enabled: true,
    impact_level: matrixSize,
    likelihood_level: 1,
    allowed_actions: ['Accept', 'Transfer', 'Escalate'],
  },
});
