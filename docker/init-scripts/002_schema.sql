-- =====================================================
-- GRC Platform Complete Schema for Docker Deployment
-- (Self-hosted Postgres; no Supabase helper functions)
-- =====================================================

-- NOTE:
-- - This file is executed by the Postgres image ONLY on first init of the volume.
-- - We intentionally DO NOT enable RLS / policies here because plain Postgres
--   doesn't have Supabase helpers like auth.uid(). Access control is enforced
--   at the API layer (JWT middleware) in self-hosted mode.

-- =====================================================
-- ENUMS (idempotent)
-- =====================================================
DO $$ BEGIN
  CREATE TYPE public.risk_status AS ENUM ('draft', 'pending_review', 'approved', 'active', 'monitoring', 'treated', 'closed', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.risk_severity AS ENUM ('critical', 'high', 'medium', 'low', 'negligible');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.risk_likelihood AS ENUM ('almost_certain', 'likely', 'possible', 'unlikely', 'rare');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.treatment_status AS ENUM ('planned', 'in_progress', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- BUSINESS UNITS (ensure all columns exist)
-- =====================================================
ALTER TABLE public.business_units
  ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.business_units
  ADD COLUMN IF NOT EXISTS is_security_org BOOLEAN DEFAULT false;

ALTER TABLE public.business_units
  ADD COLUMN IF NOT EXISTS manager_user_id UUID;

ALTER TABLE public.business_units
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.business_units
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- =====================================================
-- COMPANY PROFILE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.company_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name TEXT NOT NULL,
  trading_name TEXT,
  registration_id TEXT,
  industry TEXT,
  employee_count INTEGER,
  website_url TEXT,
  logo_url TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT,
  primary_timezone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- GOVERNANCE PEOPLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.governance_people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  title TEXT,
  department TEXT,
  external_org TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- EXECUTIVE ROLES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.executive_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  governance_person_id UUID REFERENCES public.governance_people(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- BOARD MEMBERS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.board_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  governance_person_id UUID NOT NULL REFERENCES public.governance_people(id),
  position_title TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- POINTS OF CONTACT
-- =====================================================
CREATE TABLE IF NOT EXISTS public.points_of_contact (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  governance_person_id UUID NOT NULL REFERENCES public.governance_people(id),
  contact_type TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- SCOPE STATEMENT
-- =====================================================
CREATE TABLE IF NOT EXISTS public.scope_statement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_text TEXT,
  version INTEGER DEFAULT 1,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- RISK CATEGORIES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.risk_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  thresholds_config JSONB,
  is_enabled BOOLEAN DEFAULT true,
  worst_case_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- RISK MATRICES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.risk_matrices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  size INT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.matrix_likelihood_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matrix_id UUID NOT NULL REFERENCES public.risk_matrices(id) ON DELETE CASCADE,
  level INT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (matrix_id, level)
);

CREATE TABLE IF NOT EXISTS public.matrix_impact_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matrix_id UUID NOT NULL REFERENCES public.risk_matrices(id) ON DELETE CASCADE,
  level INT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (matrix_id, level)
);

-- =====================================================
-- RISK APPETITES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.risk_appetites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  matrix_id UUID REFERENCES public.risk_matrices(id) ON DELETE RESTRICT,
  narrative_statement TEXT,
  escalation_criteria TEXT,
  reporting_cadence TEXT,
  privacy_constraints TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'draft',
  version INT DEFAULT 1,
  effective_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.risk_appetite_bands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appetite_id UUID NOT NULL REFERENCES public.risk_appetites(id) ON DELETE CASCADE,
  band TEXT NOT NULL,
  min_score INT NOT NULL,
  max_score INT NOT NULL,
  acceptance_owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  acceptance_role TEXT,
  label TEXT,
  color TEXT,
  description TEXT,
  authorized_actions TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (appetite_id, band)
);

CREATE TABLE IF NOT EXISTS public.risk_appetite_category_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appetite_id UUID NOT NULL REFERENCES public.risk_appetites(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.risk_categories(id) ON DELETE CASCADE,
  max_inherent_score INT,
  max_residual_score INT,
  max_risk_count INT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (appetite_id, category_id)
);

-- =====================================================
-- RISKS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.risk_categories(id),
  owner_id UUID REFERENCES auth.users(id),
  status public.risk_status NOT NULL DEFAULT 'draft',
  risk_level TEXT DEFAULT 'operational',
  inherent_severity public.risk_severity NOT NULL DEFAULT 'medium',
  inherent_likelihood public.risk_likelihood NOT NULL DEFAULT 'possible',
  net_severity public.risk_severity,
  net_likelihood public.risk_likelihood,
  inherent_score INTEGER GENERATED ALWAYS AS (
    (CASE inherent_severity
      WHEN 'critical' THEN 5
      WHEN 'high' THEN 4
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 2
      WHEN 'negligible' THEN 1
    END) *
    (CASE inherent_likelihood
      WHEN 'almost_certain' THEN 5
      WHEN 'likely' THEN 4
      WHEN 'possible' THEN 3
      WHEN 'unlikely' THEN 2
      WHEN 'rare' THEN 1
    END)
  ) STORED,
  treatment_plan TEXT,
  treatment_action TEXT,
  review_date DATE,
  business_unit_id UUID REFERENCES public.business_units(id),
  threat_id UUID,
  vulnerability_id UUID,
  residual_likelihood TEXT,
  residual_impact NUMERIC,
  residual_score NUMERIC,
  residual_rating TEXT,
  residual_updated_at TIMESTAMPTZ,
  is_archived BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TREATMENTS
-- =====================================================
-- Legacy table (kept for backwards compatibility with older self-hosted builds)
CREATE TABLE IF NOT EXISTS public.treatments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id UUID NOT NULL REFERENCES public.risks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  treatment_type TEXT NOT NULL DEFAULT 'mitigate',
  status public.treatment_status NOT NULL DEFAULT 'planned',
  owner_id UUID REFERENCES public.profiles(id),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  effectiveness_rating TEXT,
  cost_estimate NUMERIC,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Primary table used by the frontend (matches SaaS schema naming)
CREATE TABLE IF NOT EXISTS public.risk_treatments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id UUID NOT NULL REFERENCES public.risks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  strategy TEXT,
  status public.treatment_status NOT NULL DEFAULT 'planned',
  assigned_to UUID REFERENCES auth.users(id),
  business_unit_id UUID REFERENCES public.business_units(id),
  residual_severity TEXT,
  residual_likelihood TEXT,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_risk_treatments_risk_id ON public.risk_treatments(risk_id);
CREATE INDEX IF NOT EXISTS idx_risk_treatments_assigned_to ON public.risk_treatments(assigned_to);

-- =====================================================
-- RISK LOGS (Audit Trail)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.risk_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id UUID NOT NULL REFERENCES public.risks(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- CONFIDENTIALITY LEVELS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.confidentiality_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  rank INT NOT NULL,
  description TEXT,
  breach_impact_level_id UUID REFERENCES public.matrix_impact_levels(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- PRIMARY ASSETS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.primary_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  asset_kind TEXT DEFAULT 'asset',
  primary_type TEXT NOT NULL DEFAULT 'Data',
  process_level TEXT,
  parent_primary_asset_id UUID REFERENCES public.primary_assets(id) ON DELETE SET NULL,
  inherit_from_parent BOOLEAN DEFAULT false,
  confidentiality_level_id UUID REFERENCES public.confidentiality_levels(id),
  criticality TEXT DEFAULT 'Medium',
  owner_id UUID REFERENCES public.profiles(id),
  business_unit_id UUID REFERENCES public.business_units(id),
  rto_hours NUMERIC,
  rpo_hours NUMERIC,
  mtd_hours NUMERIC,
  bia_completed BOOLEAN DEFAULT false,
  bia_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- SECONDARY ASSETS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.secondary_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  secondary_type TEXT NOT NULL DEFAULT 'IT Service',
  primary_asset_id UUID REFERENCES public.primary_assets(id) ON DELETE SET NULL,
  business_unit_id UUID REFERENCES public.business_units(id),
  owner_id UUID REFERENCES public.profiles(id),
  inherited_criticality TEXT,
  inherited_rto_hours NUMERIC,
  inherited_rpo_hours NUMERIC,
  inherited_mtd_hours NUMERIC,
  effective_criticality TEXT,
  effective_rto_hours NUMERIC,
  effective_rpo_hours NUMERIC,
  effective_mtd_hours NUMERIC,
  deviation_status TEXT DEFAULT 'Compliant',
  deviation_reason TEXT,
  ai_enabled BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- AI ASSET DETAILS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ai_asset_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  secondary_asset_id UUID NOT NULL UNIQUE REFERENCES public.secondary_assets(id) ON DELETE CASCADE,
  model_name TEXT,
  model_provider TEXT,
  model_version TEXT,
  eu_ai_act_category TEXT,
  notes TEXT,
  archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMPTZ,
  archived_by UUID REFERENCES public.profiles(id),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- AI USE CASES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ai_use_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_asset_details_id UUID NOT NULL REFERENCES public.ai_asset_details(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft',
  rationale TEXT,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- VENDORS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_unit_id UUID NOT NULL REFERENCES public.business_units(id),
  name TEXT NOT NULL,
  legal_name TEXT,
  website_url TEXT,
  trust_center_url TEXT,
  service_description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  contract_owner_user_id UUID REFERENCES auth.users(id),
  next_review_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- SECONDARY ASSET VENDOR LINKS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.secondary_asset_vendor_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  secondary_asset_id UUID NOT NULL REFERENCES public.secondary_assets(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (secondary_asset_id, vendor_id)
);

-- =====================================================
-- ASSET RELATIONSHIPS (Data Flow Graph)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.asset_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id UUID NOT NULL REFERENCES public.business_units(id),
  from_entity_type TEXT NOT NULL,
  from_entity_id UUID NOT NULL,
  to_entity_type TEXT NOT NULL,
  to_entity_id UUID NOT NULL,
  relationship_type TEXT NOT NULL,
  data_flow_label TEXT,
  data_sensitivity TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- PROCESS-ASSET LINKS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.process_primary_asset_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id UUID NOT NULL REFERENCES public.business_units(id),
  process_id UUID NOT NULL REFERENCES public.primary_assets(id) ON DELETE CASCADE,
  primary_asset_id UUID NOT NULL REFERENCES public.primary_assets(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL DEFAULT 'USES',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.process_secondary_asset_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id UUID NOT NULL REFERENCES public.business_units(id),
  process_id UUID NOT NULL REFERENCES public.primary_assets(id) ON DELETE CASCADE,
  secondary_asset_id UUID NOT NULL REFERENCES public.secondary_assets(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL DEFAULT 'RUNS_ON',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- RISK ASSET LINKS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.risk_asset_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id UUID NOT NULL REFERENCES public.risks(id) ON DELETE CASCADE,
  primary_asset_id UUID REFERENCES public.primary_assets(id) ON DELETE CASCADE,
  secondary_asset_id UUID REFERENCES public.secondary_assets(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL DEFAULT 'in_scope',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  CONSTRAINT at_least_one_asset CHECK (primary_asset_id IS NOT NULL OR secondary_asset_id IS NOT NULL)
);

-- =====================================================
-- CONTROL FRAMEWORKS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.control_frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  version TEXT,
  publisher TEXT,
  external_id TEXT,
  default_id_prefix TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- FRAMEWORK CONTROLS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.framework_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id UUID NOT NULL REFERENCES public.control_frameworks(id) ON DELETE CASCADE,
  control_id TEXT,
  control_code TEXT,
  title TEXT NOT NULL,
  description TEXT,
  guidance TEXT,
  implementation_guidance TEXT,
  domain TEXT,
  subcategory TEXT,
  control_type TEXT,
  security_function TEXT,
  reference_links TEXT,
  source_hash TEXT,
  parent_control_id UUID REFERENCES public.framework_controls(id),
  implementation_status TEXT DEFAULT 'not_implemented',
  applicability TEXT DEFAULT 'applicable',
  soa_justification TEXT,
  soa_responsible_party TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (framework_id, control_code)
);

-- =====================================================
-- FRAMEWORK CONTROL CROSSWALK
-- =====================================================
CREATE TABLE IF NOT EXISTS public.framework_control_crosswalk (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_framework_control_id UUID NOT NULL REFERENCES public.framework_controls(id) ON DELETE CASCADE,
  to_framework_control_id UUID NOT NULL REFERENCES public.framework_controls(id) ON DELETE CASCADE,
  mapping_type TEXT NOT NULL DEFAULT 'related',
  confidence NUMERIC,
  rationale TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- FRAMEWORK COMPLIANCE STATUS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.framework_compliance_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id UUID NOT NULL UNIQUE REFERENCES public.control_frameworks(id) ON DELETE CASCADE,
  total_controls INT DEFAULT 0,
  implemented_controls INT DEFAULT 0,
  partially_implemented INT DEFAULT 0,
  not_implemented INT DEFAULT 0,
  not_applicable INT DEFAULT 0,
  compliance_percentage NUMERIC DEFAULT 0,
  last_calculated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- INTERNAL CONTROLS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.internal_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_control_code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  control_type TEXT,
  automation_level TEXT,
  frequency TEXT,
  status TEXT DEFAULT 'Draft',
  implementation_status TEXT DEFAULT 'not_implemented',
  owner_id UUID REFERENCES public.profiles(id),
  business_unit_id UUID REFERENCES public.business_units(id),
  system_scope TEXT,
  security_function TEXT,
  legacy_control_id TEXT,
  implementation_date DATE,
  effective_date DATE,
  review_date DATE,
  last_review_date DATE,
  next_review_date DATE,
  effectiveness TEXT,
  testing_frequency TEXT,
  automation_status TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Backwards-compatible upgrades for internal_controls
ALTER TABLE public.internal_controls
  ADD COLUMN IF NOT EXISTS internal_control_code TEXT,
  ADD COLUMN IF NOT EXISTS automation_level TEXT,
  ADD COLUMN IF NOT EXISTS frequency TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Draft',
  ADD COLUMN IF NOT EXISTS system_scope TEXT,
  ADD COLUMN IF NOT EXISTS security_function TEXT,
  ADD COLUMN IF NOT EXISTS legacy_control_id TEXT,
  ADD COLUMN IF NOT EXISTS effective_date DATE,
  ADD COLUMN IF NOT EXISTS review_date DATE,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create internal_control_framework_map table for framework mappings
CREATE TABLE IF NOT EXISTS public.internal_control_framework_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_control_id UUID NOT NULL REFERENCES public.internal_controls(id) ON DELETE CASCADE,
  framework_control_id UUID NOT NULL REFERENCES public.framework_controls(id) ON DELETE CASCADE,
  mapping_type TEXT DEFAULT 'implements',
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (internal_control_id, framework_control_id)
);

-- =====================================================
-- CONTROL MAPPINGS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.control_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_control_id UUID NOT NULL REFERENCES public.internal_controls(id) ON DELETE CASCADE,
  framework_control_id UUID NOT NULL REFERENCES public.framework_controls(id) ON DELETE CASCADE,
  coverage_level TEXT DEFAULT 'full',
  mapping_notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (internal_control_id, framework_control_id)
);

-- =====================================================
-- CONTROL ASSET LINKS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.control_asset_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_control_id UUID REFERENCES public.internal_controls(id) ON DELETE CASCADE,
  framework_control_id UUID REFERENCES public.framework_controls(id) ON DELETE CASCADE,
  primary_asset_id UUID REFERENCES public.primary_assets(id) ON DELETE CASCADE,
  secondary_asset_id UUID REFERENCES public.secondary_assets(id) ON DELETE CASCADE,
  link_type TEXT DEFAULT 'protects',
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- CONTROL FINDINGS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.control_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  finding_type TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  internal_control_id UUID REFERENCES public.internal_controls(id) ON DELETE SET NULL,
  framework_control_id UUID REFERENCES public.framework_controls(id) ON DELETE SET NULL,
  business_unit_id UUID REFERENCES public.business_units(id),
  identified_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  closed_date DATE,
  assigned_to UUID REFERENCES public.profiles(id),
  remediation_plan TEXT,
  remediation_notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- FINDING POAMS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.finding_poams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id UUID NOT NULL REFERENCES public.control_findings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'not_started',
  owner_id UUID REFERENCES public.profiles(id),
  start_date DATE,
  end_date DATE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- FINDING MILESTONES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.finding_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id UUID NOT NULL REFERENCES public.control_findings(id) ON DELETE CASCADE,
  poam_id UUID REFERENCES public.finding_poams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  due_date DATE,
  completed_at TIMESTAMPTZ,
  owner_id UUID REFERENCES public.profiles(id),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- CONTROL IMPORT JOBS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.control_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id UUID NOT NULL REFERENCES public.control_frameworks(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_file_name TEXT,
  status TEXT DEFAULT 'pending',
  duplicate_behavior TEXT,
  row_count INT,
  imported_count INT,
  updated_count INT,
  skipped_count INT,
  error_count INT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.control_import_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.control_import_jobs(id) ON DELETE CASCADE,
  source_column TEXT,
  canonical_field TEXT NOT NULL,
  confidence NUMERIC,
  ai_reasoning TEXT,
  transform_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.control_import_staging_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.control_import_jobs(id) ON DELETE CASCADE,
  row_number INT NOT NULL,
  raw JSONB NOT NULL,
  normalized JSONB,
  validation_errors JSONB,
  will_import BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- EVIDENCE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.evidence_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  evidence_type TEXT,
  file_name TEXT,
  file_mime TEXT,
  file_size_bytes BIGINT,
  storage_key TEXT,
  evidence_start_date DATE,
  evidence_end_date DATE,
  expires_at TIMESTAMPTZ,
  tags TEXT[],
  ai_summary TEXT,
  ai_suggested_tags TEXT[],
  ai_extracted_dates JSONB,
  owner_id UUID REFERENCES public.profiles(id),
  business_unit_id UUID REFERENCES public.business_units(id),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.evidence_control_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id UUID NOT NULL REFERENCES public.evidence_items(id) ON DELETE CASCADE,
  internal_control_id UUID REFERENCES public.internal_controls(id) ON DELETE CASCADE,
  framework_control_id UUID REFERENCES public.framework_controls(id) ON DELETE CASCADE,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- POLICIES (align with app expectations; idempotent)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft',
  category TEXT,
  owner_id UUID REFERENCES public.profiles(id),
  business_unit_id UUID REFERENCES public.business_units(id),
  effective_date DATE,
  review_date DATE,
  next_review_date DATE,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Newer app fields (safe to apply manually too)
ALTER TABLE public.policies ADD COLUMN IF NOT EXISTS policy_type TEXT;
ALTER TABLE public.policies ADD COLUMN IF NOT EXISTS document_type TEXT DEFAULT 'policy';
ALTER TABLE public.policies ADD COLUMN IF NOT EXISTS owner_user_id UUID;
ALTER TABLE public.policies ADD COLUMN IF NOT EXISTS accountable_user_id UUID;
ALTER TABLE public.policies ADD COLUMN IF NOT EXISTS approver_user_id UUID;
ALTER TABLE public.policies ADD COLUMN IF NOT EXISTS responsible_user_id UUID;
ALTER TABLE public.policies ADD COLUMN IF NOT EXISTS consulted_user_ids UUID[] DEFAULT '{}'::uuid[];
ALTER TABLE public.policies ADD COLUMN IF NOT EXISTS informed_user_ids UUID[] DEFAULT '{}'::uuid[];
ALTER TABLE public.policies ADD COLUMN IF NOT EXISTS review_by_date DATE;
ALTER TABLE public.policies ADD COLUMN IF NOT EXISTS last_published_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.policy_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
  version INT NOT NULL,
  content TEXT,
  change_summary TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (policy_id, version)
);

-- Newer app fields for versions
ALTER TABLE public.policy_versions ADD COLUMN IF NOT EXISTS content_markdown TEXT;
ALTER TABLE public.policy_versions ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.policy_versions ADD COLUMN IF NOT EXISTS ai_prompt_context JSONB;
ALTER TABLE public.policy_versions ADD COLUMN IF NOT EXISTS ai_rationale TEXT;
ALTER TABLE public.policy_versions ADD COLUMN IF NOT EXISTS created_by_user_id UUID;

-- Policy sections (used by policy builder)
CREATE TABLE IF NOT EXISTS public.policy_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_markdown TEXT NOT NULL DEFAULT '',
  section_order INT NOT NULL DEFAULT 0,
  ai_generated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.policy_control_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
  internal_control_id UUID REFERENCES public.internal_controls(id) ON DELETE CASCADE,
  framework_control_id UUID REFERENCES public.framework_controls(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- BIA ASSESSMENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.bia_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_asset_id UUID NOT NULL UNIQUE REFERENCES public.primary_assets(id) ON DELETE CASCADE,
  risk_appetite_id UUID NOT NULL REFERENCES public.risk_appetites(id),
  business_unit_id UUID REFERENCES public.business_units(id),
  bia_owner UUID REFERENCES public.profiles(id),
  rto_hours NUMERIC,
  rpo_hours NUMERIC,
  mtd_hours NUMERIC,
  ai_suggested_rto_hours NUMERIC,
  ai_suggested_rpo_hours NUMERIC,
  ai_suggested_mtd_hours NUMERIC,
  ai_rationale TEXT,
  derived_criticality TEXT,
  time_to_high_bucket TEXT,
  last_assessed_at TIMESTAMPTZ,
  next_review_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bia_impact_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bia_assessment_id UUID NOT NULL REFERENCES public.bia_assessments(id) ON DELETE CASCADE,
  time_bucket TEXT NOT NULL,
  impact_level_id UUID NOT NULL REFERENCES public.matrix_impact_levels(id),
  ai_suggested_impact_level_id UUID REFERENCES public.matrix_impact_levels(id),
  rationale TEXT,
  ai_rationale TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bia_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bia_assessment_id UUID REFERENCES public.bia_assessments(id) ON DELETE SET NULL,
  continuity_plan_id UUID,
  action TEXT NOT NULL,
  changes JSONB,
  rationale TEXT,
  actor_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- CONTINUITY PLANS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.continuity_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_asset_id UUID NOT NULL REFERENCES public.primary_assets(id) ON DELETE CASCADE,
  business_unit_id UUID REFERENCES public.business_units(id),
  plan_name TEXT NOT NULL,
  plan_version TEXT,
  description TEXT,
  status TEXT DEFAULT 'draft',
  recovery_strategy TEXT,
  alternate_site TEXT,
  dependencies TEXT,
  communication_plan TEXT,
  key_contacts JSONB,
  testing_schedule TEXT,
  last_tested_at TIMESTAMPTZ,
  next_test_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add foreign key for bia_audit_logs -> continuity_plans
DO $$ BEGIN
  ALTER TABLE public.bia_audit_logs
    ADD CONSTRAINT bia_audit_logs_continuity_plan_id_fkey
    FOREIGN KEY (continuity_plan_id) REFERENCES public.continuity_plans(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- SECURITY OPS - THREATS & VULNERABILITIES
-- =====================================================

-- Threat intelligence / info sources
CREATE TABLE IF NOT EXISTS public.threat_info_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  source_type TEXT,
  url TEXT,
  credibility_notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Threat sources (align with frontend expectations: identifier, in_scope, source_info_id, etc.)
CREATE TABLE IF NOT EXISTS public.threat_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT,
  threat_type TEXT,
  subtype TEXT,
  taxonomy_id UUID,
  name TEXT,
  description TEXT,
  notes TEXT,
  in_scope BOOLEAN DEFAULT true,
  source_info_id UUID REFERENCES public.threat_info_sources(id),
  business_unit_id UUID REFERENCES public.business_units(id),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One-to-one threat source profiles
CREATE TABLE IF NOT EXISTS public.threat_source_adversarial_profiles (
  threat_source_id UUID PRIMARY KEY REFERENCES public.threat_sources(id) ON DELETE CASCADE,
  capability_score NUMERIC,
  capability_qual TEXT,
  intent_score NUMERIC,
  intent_qual TEXT,
  targeting_score NUMERIC,
  targeting_qual TEXT,
  rationale TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.threat_source_nonadversarial_profiles (
  threat_source_id UUID PRIMARY KEY REFERENCES public.threat_sources(id) ON DELETE CASCADE,
  range_effects_score NUMERIC,
  range_effects_qual TEXT,
  rationale TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.threat_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT,
  title TEXT,
  event_type TEXT,
  relevance TEXT,
  name TEXT,
  description TEXT,
  notes TEXT,
  tags TEXT[],
  mitre_technique_id TEXT,
  source_info_id UUID REFERENCES public.threat_info_sources(id),
  threat_source_id UUID REFERENCES public.threat_sources(id),
  taxonomy_id UUID,
  business_unit_id UUID REFERENCES public.business_units(id),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Backwards-compatible upgrades (safe if the table already existed)
ALTER TABLE public.threat_events
  ADD COLUMN IF NOT EXISTS identifier TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS event_type TEXT,
  ADD COLUMN IF NOT EXISTS relevance TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[],
  ADD COLUMN IF NOT EXISTS mitre_technique_id TEXT,
  ADD COLUMN IF NOT EXISTS source_info_id UUID,
  ADD COLUMN IF NOT EXISTS taxonomy_id UUID,
  ADD COLUMN IF NOT EXISTS business_unit_id UUID,
  ADD COLUMN IF NOT EXISTS created_by UUID;

CREATE TABLE IF NOT EXISTS public.vulnerabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT,
  title TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  category TEXT,
  description TEXT,
  notes TEXT,
  severity_qual TEXT,
  severity_score NUMERIC,
  cves JSONB,
  source_info_id UUID REFERENCES public.threat_info_sources(id),
  nature_taxonomy_id UUID,
  business_unit_id UUID REFERENCES public.business_units(id),
  created_by UUID REFERENCES public.profiles(id),
  discovered_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vulnerabilities
  ADD COLUMN IF NOT EXISTS identifier TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS severity_qual TEXT,
  ADD COLUMN IF NOT EXISTS severity_score NUMERIC,
  ADD COLUMN IF NOT EXISTS cves JSONB,
  ADD COLUMN IF NOT EXISTS source_info_id UUID,
  ADD COLUMN IF NOT EXISTS nature_taxonomy_id UUID,
  ADD COLUMN IF NOT EXISTS business_unit_id UUID,
  ADD COLUMN IF NOT EXISTS created_by UUID;

CREATE TABLE IF NOT EXISTS public.predisposing_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT,
  condition_type TEXT,
  subtype TEXT,
  description TEXT,
  notes TEXT,
  pervasiveness_qual TEXT,
  pervasiveness_score NUMERIC,
  source_info_id UUID REFERENCES public.threat_info_sources(id),
  business_unit_id UUID REFERENCES public.business_units(id),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.predisposing_conditions
  ADD COLUMN IF NOT EXISTS identifier TEXT,
  ADD COLUMN IF NOT EXISTS subtype TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS pervasiveness_qual TEXT,
  ADD COLUMN IF NOT EXISTS pervasiveness_score NUMERIC,
  ADD COLUMN IF NOT EXISTS source_info_id UUID,
  ADD COLUMN IF NOT EXISTS business_unit_id UUID,
  ADD COLUMN IF NOT EXISTS created_by UUID;

CREATE TABLE IF NOT EXISTS public.security_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  url TEXT NOT NULL DEFAULT '',
  description TEXT,
  owner_id UUID REFERENCES public.profiles(id),
  tags TEXT[],
  is_pinned_default BOOLEAN DEFAULT false,
  integration_status TEXT DEFAULT 'unknown',
  last_check_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Backwards-compatible upgrades for security_tools
ALTER TABLE public.security_tools
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS tags TEXT[],
  ADD COLUMN IF NOT EXISTS is_pinned_default BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS integration_status TEXT DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS last_check_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by UUID;

-- SIRT Teams (must be created before sirt_members due to FK)
CREATE TABLE IF NOT EXISTS public.sirt_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sirt_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.sirt_teams(id) ON DELETE SET NULL,
  profile_id UUID REFERENCES public.profiles(id),
  name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  timezone TEXT,
  location TEXT,
  escalation_tier INT,
  availability TEXT,
  backup_member_id UUID,
  skills_tags TEXT[],
  is_on_call BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Backwards-compatible upgrades for sirt_members
ALTER TABLE public.sirt_members
  ADD COLUMN IF NOT EXISTS team_id UUID,
  ADD COLUMN IF NOT EXISTS name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS timezone TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS escalation_tier INT,
  ADD COLUMN IF NOT EXISTS availability TEXT,
  ADD COLUMN IF NOT EXISTS backup_member_id UUID,
  ADD COLUMN IF NOT EXISTS skills_tags TEXT[],
  ADD COLUMN IF NOT EXISTS is_on_call BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by UUID;

-- Add FK for sirt_members.backup_member_id after table exists
DO $$ BEGIN
  ALTER TABLE public.sirt_members
    ADD CONSTRAINT sirt_members_backup_member_id_fkey
    FOREIGN KEY (backup_member_id) REFERENCES public.sirt_members(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.sirt_members
    ADD CONSTRAINT sirt_members_team_id_fkey
    FOREIGN KEY (team_id) REFERENCES public.sirt_teams(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- SECOPS TAXONOMY & SCALES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.secops_scales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scale_name TEXT NOT NULL,
  qualitative TEXT NOT NULL,
  semi_quant_min NUMERIC,
  semi_quant_max NUMERIC,
  score_0_to_10 NUMERIC NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0,
  is_default BOOLEAN DEFAULT true,
  org_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.secops_threat_source_taxonomy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  subtype TEXT NOT NULL,
  description TEXT,
  risk_factors TEXT[],
  is_default BOOLEAN DEFAULT true,
  org_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.secops_threat_event_taxonomy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_adversarial BOOLEAN DEFAULT false,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT true,
  org_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.secops_vulnerability_nature_taxonomy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  subcategory TEXT,
  description TEXT,
  is_default BOOLEAN DEFAULT true,
  org_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Threat Catalog (Threats = Source + Event pairing)
CREATE TABLE IF NOT EXISTS public.secops_threats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  name TEXT NOT NULL,
  threat_source_id UUID REFERENCES public.threat_sources(id) ON DELETE SET NULL,
  threat_event_id UUID REFERENCES public.threat_events(id) ON DELETE SET NULL,
  relevance TEXT,
  in_scope BOOLEAN DEFAULT true,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- CONTROLS (Legacy/Deprecated) - must be before treatment_controls
-- =====================================================
CREATE TABLE IF NOT EXISTS public.controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  control_type TEXT,
  control_category TEXT,
  status TEXT DEFAULT 'active',
  effectiveness TEXT,
  implementation_date DATE,
  last_review_date DATE,
  next_review_date DATE,
  owner_id UUID REFERENCES public.profiles(id),
  business_unit_id UUID REFERENCES public.business_units(id),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TREATMENT POAMS, CONTROLS, MILESTONES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.treatment_poams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_id UUID NOT NULL REFERENCES public.risk_treatments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES public.profiles(id),
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'draft',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.treatment_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_id UUID NOT NULL REFERENCES public.risk_treatments(id) ON DELETE CASCADE,
  control_id UUID NOT NULL REFERENCES public.controls(id) ON DELETE CASCADE,
  poam_id UUID REFERENCES public.treatment_poams(id) ON DELETE SET NULL,
  implementation_status TEXT DEFAULT 'planned',
  effectiveness_estimate NUMERIC,
  evidence_links JSONB,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.treatment_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_id UUID NOT NULL REFERENCES public.risk_treatments(id) ON DELETE CASCADE,
  control_id UUID REFERENCES public.controls(id) ON DELETE SET NULL,
  poam_id UUID REFERENCES public.treatment_poams(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES public.profiles(id),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- DATA FORGE CONNECTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.data_forge_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  connection_type TEXT NOT NULL,
  system_type TEXT NOT NULL,
  source_category TEXT,
  base_url TEXT NOT NULL,
  auth_type TEXT DEFAULT 'none',
  auth_config JSONB,
  headers_config JSONB,
  timeout_seconds INT,
  rate_limit_per_minute INT,
  driver_type TEXT,
  database_name TEXT,
  schema_name TEXT,
  query_template TEXT,
  region TEXT,
  bucket_name TEXT,
  file_pattern TEXT,
  file_format TEXT,
  is_active BOOLEAN DEFAULT true,
  sync_enabled BOOLEAN DEFAULT false,
  sync_schedule TEXT,
  last_sync_at TIMESTAMPTZ,
  next_sync_at TIMESTAMPTZ,
  last_tested_at TIMESTAMPTZ,
  last_test_status TEXT,
  last_test_error TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.data_forge_connection_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES public.data_forge_connections(id) ON DELETE CASCADE,
  secret_key TEXT NOT NULL,
  secret_value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.data_forge_connection_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES public.data_forge_connections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  endpoint_path TEXT NOT NULL,
  http_method TEXT DEFAULT 'GET',
  query_params JSONB,
  request_body_template JSONB,
  response_data_path TEXT,
  pagination_type TEXT,
  pagination_config JSONB,
  target_module TEXT NOT NULL,
  field_mappings JSONB,
  unique_key_field TEXT,
  is_active BOOLEAN DEFAULT true,
  sync_enabled BOOLEAN DEFAULT false,
  sync_interval TEXT,
  last_synced_at TIMESTAMPTZ,
  last_sync_status TEXT,
  last_sync_error TEXT,
  last_sync_row_count INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.data_forge_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  source_type TEXT DEFAULT 'file',
  source_file_name TEXT,
  source_api_config JSONB,
  target_module TEXT NOT NULL,
  connection_id UUID REFERENCES public.data_forge_connections(id),
  endpoint_id UUID REFERENCES public.data_forge_connection_endpoints(id),
  business_unit_id UUID REFERENCES public.business_units(id),
  status TEXT DEFAULT 'pending',
  duplicate_behavior TEXT,
  row_count INT,
  imported_count INT,
  skipped_count INT,
  error_count INT,
  sync_enabled BOOLEAN DEFAULT false,
  sync_schedule TEXT,
  last_synced_at TIMESTAMPTZ,
  next_sync_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.data_forge_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.data_forge_jobs(id) ON DELETE CASCADE,
  source_column TEXT,
  target_field TEXT NOT NULL,
  transform_config JSONB,
  confidence NUMERIC,
  ai_reasoning TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.data_forge_staging_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.data_forge_jobs(id) ON DELETE CASCADE,
  row_number INT NOT NULL,
  raw_data JSONB NOT NULL,
  normalized_data JSONB,
  validation_errors JSONB,
  will_import BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- MATURITY ASSESSMENTS (NIST CSF 2.0)
-- =====================================================
-- Legacy domains table for backwards compatibility
CREATE TABLE IF NOT EXISTS public.maturity_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  display_order INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Primary maturity assessments table (NIST CSF 2.0 structure)
CREATE TABLE IF NOT EXISTS public.maturity_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  score_govern NUMERIC,
  score_identify NUMERIC,
  score_protect NUMERIC,
  score_detect NUMERIC,
  score_respond NUMERIC,
  score_recover NUMERIC,
  ai_rationale TEXT,
  evidence_summary JSONB,
  run_by UUID REFERENCES public.profiles(id),
  assessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- DASHBOARD & CACHE TABLES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.dashboard_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  metrics JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dashboard_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  threshold_key TEXT NOT NULL UNIQUE,
  threshold_name TEXT NOT NULL,
  threshold_value NUMERIC NOT NULL,
  threshold_unit TEXT DEFAULT 'count',
  category TEXT DEFAULT 'general',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dashboard_insights_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type TEXT NOT NULL,
  insight_data JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '1 hour',
  created_by UUID REFERENCES public.profiles(id)
);

CREATE TABLE IF NOT EXISTS public.ai_control_insights_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  insight_type TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  output_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_ops_insights_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID,
  insight_type TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  output_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.regulatory_compliance_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regulation TEXT NOT NULL,
  analysis_data JSONB NOT NULL,
  coverage_percentage NUMERIC,
  generated_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '24 hours'
);

-- =====================================================
-- AUDIT LOGS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  actor_user_id UUID REFERENCES auth.users(id),
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  is_retained BOOLEAN DEFAULT false,
  retention_reason TEXT,
  retained_at TIMESTAMPTZ,
  retained_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- ACCESS CONTROL
-- =====================================================
CREATE TABLE IF NOT EXISTS public.access_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_access_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_group_id UUID NOT NULL REFERENCES public.access_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, access_group_id)
);

CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role public.app_role DEFAULT 'user',
  access_group_id UUID REFERENCES public.access_groups(id),
  business_unit_id UUID REFERENCES public.business_units(id),
  token TEXT NOT NULL UNIQUE,
  invited_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  business TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- APP SETTINGS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- (controls table moved earlier in file to satisfy foreign key ordering)
-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply update triggers to all tables with updated_at
DO $$ 
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'business_units', 'profiles', 'risks', 'treatments', 'primary_assets', 
    'secondary_assets', 'vendors', 'risk_matrices', 'risk_appetites',
    'control_frameworks', 'framework_controls', 'internal_controls', 
    'control_findings', 'policies', 'evidence_items', 'bia_assessments',
    'continuity_plans', 'threat_sources', 'threat_events', 'vulnerabilities',
    'predisposing_conditions', 'security_tools', 'sirt_members',
    'data_forge_connections', 'data_forge_jobs', 'maturity_assessments',
    'dashboard_thresholds', 'access_groups', 'company_profile',
    'governance_people', 'executive_roles', 'board_members', 'points_of_contact',
    'scope_statement', 'ai_asset_details', 'ai_use_cases', 'confidentiality_levels',
    'framework_compliance_status', 'control_import_jobs', 'finding_poams', 
    'finding_milestones', 'controls'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS update_%I_updated_at ON public.%I;
      CREATE TRIGGER update_%I_updated_at 
        BEFORE UPDATE ON public.%I
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    ', tbl, tbl, tbl, tbl);
  END LOOP;
END $$;

-- Generate risk ID function
CREATE OR REPLACE FUNCTION public.generate_risk_id()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(risk_id FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.risks
  WHERE risk_id LIKE 'RSK-%';

  NEW.risk_id := 'RSK-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DO $$ BEGIN
  CREATE TRIGGER set_risk_id
    BEFORE INSERT ON public.risks
    FOR EACH ROW
    WHEN (NEW.risk_id IS NULL OR NEW.risk_id = '')
    EXECUTE FUNCTION public.generate_risk_id();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Generate primary asset ID
CREATE OR REPLACE FUNCTION public.generate_primary_asset_id()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(asset_id FROM 4) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.primary_assets
  WHERE asset_id LIKE 'PA-%';

  NEW.asset_id := 'PA-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DO $$ BEGIN
  CREATE TRIGGER set_primary_asset_id
    BEFORE INSERT ON public.primary_assets
    FOR EACH ROW
    WHEN (NEW.asset_id IS NULL OR NEW.asset_id = '')
    EXECUTE FUNCTION public.generate_primary_asset_id();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Generate secondary asset ID
CREATE OR REPLACE FUNCTION public.generate_secondary_asset_id()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(asset_id FROM 4) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.secondary_assets
  WHERE asset_id LIKE 'SA-%';

  NEW.asset_id := 'SA-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DO $$ BEGIN
  CREATE TRIGGER set_secondary_asset_id
    BEFORE INSERT ON public.secondary_assets
    FOR EACH ROW
    WHEN (NEW.asset_id IS NULL OR NEW.asset_id = '')
    EXECUTE FUNCTION public.generate_secondary_asset_id();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Generate internal control ID
CREATE OR REPLACE FUNCTION public.generate_internal_control_id()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(internal_control_code FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.internal_controls
  WHERE internal_control_code LIKE 'CTL-%';

  NEW.internal_control_code := 'CTL-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DO $$ BEGIN
  CREATE TRIGGER set_internal_control_id
    BEFORE INSERT ON public.internal_controls
    FOR EACH ROW
    WHEN (NEW.internal_control_code IS NULL OR NEW.internal_control_code = '')
    EXECUTE FUNCTION public.generate_internal_control_id();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO PUBLIC;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO PUBLIC;

-- =====================================================
-- SEED DATA (idempotent)
-- =====================================================

-- Default Security Organization business unit
INSERT INTO public.business_units (name, description, is_security_org)
SELECT 'Security Organization', 'Default security team', true
WHERE NOT EXISTS (SELECT 1 FROM public.business_units WHERE is_security_org = true);

-- Default risk categories
INSERT INTO public.risk_categories (name, description, color)
SELECT 'Operational', 'Risks related to day-to-day operations', '#f59e0b'
WHERE NOT EXISTS (SELECT 1 FROM public.risk_categories WHERE name = 'Operational');

INSERT INTO public.risk_categories (name, description, color)
SELECT 'Strategic', 'Risks affecting long-term goals', '#8b5cf6'
WHERE NOT EXISTS (SELECT 1 FROM public.risk_categories WHERE name = 'Strategic');

INSERT INTO public.risk_categories (name, description, color)
SELECT 'Financial', 'Risks related to financial assets', '#10b981'
WHERE NOT EXISTS (SELECT 1 FROM public.risk_categories WHERE name = 'Financial');

INSERT INTO public.risk_categories (name, description, color)
SELECT 'Technical', 'IT and technology risks', '#3b82f6'
WHERE NOT EXISTS (SELECT 1 FROM public.risk_categories WHERE name = 'Technical');

INSERT INTO public.risk_categories (name, description, color)
SELECT 'Compliance', 'Regulatory and legal risks', '#ef4444'
WHERE NOT EXISTS (SELECT 1 FROM public.risk_categories WHERE name = 'Compliance');

INSERT INTO public.risk_categories (name, description, color)
SELECT 'Reputational', 'Brand and reputation risks', '#ec4899'
WHERE NOT EXISTS (SELECT 1 FROM public.risk_categories WHERE name = 'Reputational');

-- Default confidentiality levels
INSERT INTO public.confidentiality_levels (name, rank, description)
SELECT 'Public', 1, 'Information that can be freely shared'
WHERE NOT EXISTS (SELECT 1 FROM public.confidentiality_levels WHERE name = 'Public');

INSERT INTO public.confidentiality_levels (name, rank, description)
SELECT 'Internal', 2, 'Information for internal use only'
WHERE NOT EXISTS (SELECT 1 FROM public.confidentiality_levels WHERE name = 'Internal');

INSERT INTO public.confidentiality_levels (name, rank, description)
SELECT 'Confidential', 3, 'Sensitive business information'
WHERE NOT EXISTS (SELECT 1 FROM public.confidentiality_levels WHERE name = 'Confidential');

INSERT INTO public.confidentiality_levels (name, rank, description)
SELECT 'Restricted', 4, 'Highly sensitive information with strict access controls'
WHERE NOT EXISTS (SELECT 1 FROM public.confidentiality_levels WHERE name = 'Restricted');

-- Default maturity domains
INSERT INTO public.maturity_domains (name, description, display_order)
SELECT 'Governance', 'Security governance and leadership', 1
WHERE NOT EXISTS (SELECT 1 FROM public.maturity_domains WHERE name = 'Governance');

INSERT INTO public.maturity_domains (name, description, display_order)
SELECT 'Risk Management', 'Risk identification and treatment', 2
WHERE NOT EXISTS (SELECT 1 FROM public.maturity_domains WHERE name = 'Risk Management');

INSERT INTO public.maturity_domains (name, description, display_order)
SELECT 'Asset Management', 'Asset identification and protection', 3
WHERE NOT EXISTS (SELECT 1 FROM public.maturity_domains WHERE name = 'Asset Management');

INSERT INTO public.maturity_domains (name, description, display_order)
SELECT 'Access Control', 'Identity and access management', 4
WHERE NOT EXISTS (SELECT 1 FROM public.maturity_domains WHERE name = 'Access Control');

INSERT INTO public.maturity_domains (name, description, display_order)
SELECT 'Security Operations', 'Detection and response capabilities', 5
WHERE NOT EXISTS (SELECT 1 FROM public.maturity_domains WHERE name = 'Security Operations');

INSERT INTO public.maturity_domains (name, description, display_order)
SELECT 'Business Continuity', 'Recovery and resilience', 6
WHERE NOT EXISTS (SELECT 1 FROM public.maturity_domains WHERE name = 'Business Continuity');

-- Default dashboard thresholds
INSERT INTO public.dashboard_thresholds (threshold_key, threshold_name, threshold_value, threshold_unit, category, description)
SELECT 'overdue_findings_days', 'Overdue Findings Threshold', 30, 'days', 'findings', 'Number of days after which a finding is considered overdue'
WHERE NOT EXISTS (SELECT 1 FROM public.dashboard_thresholds WHERE threshold_key = 'overdue_findings_days');

INSERT INTO public.dashboard_thresholds (threshold_key, threshold_name, threshold_value, threshold_unit, category, description)
SELECT 'risk_review_days', 'Risk Review Threshold', 90, 'days', 'risks', 'Number of days between required risk reviews'
WHERE NOT EXISTS (SELECT 1 FROM public.dashboard_thresholds WHERE threshold_key = 'risk_review_days');

INSERT INTO public.dashboard_thresholds (threshold_key, threshold_name, threshold_value, threshold_unit, category, description)
SELECT 'control_review_days', 'Control Review Threshold', 365, 'days', 'controls', 'Number of days between required control reviews'
WHERE NOT EXISTS (SELECT 1 FROM public.dashboard_thresholds WHERE threshold_key = 'control_review_days');

INSERT INTO public.dashboard_thresholds (threshold_key, threshold_name, threshold_value, threshold_unit, category, description)
SELECT 'vendor_review_days', 'Vendor Review Threshold', 365, 'days', 'vendors', 'Number of days between required vendor reviews'
WHERE NOT EXISTS (SELECT 1 FROM public.dashboard_thresholds WHERE threshold_key = 'vendor_review_days');

-- =====================================================
-- BACKWARDS COMPATIBILITY: ADD MISSING COLUMNS
-- =====================================================
-- These ALTER statements add columns that may be missing if upgrading from older schemas

-- Risk appetite columns
ALTER TABLE public.risk_appetites ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE public.risk_appetites ADD COLUMN IF NOT EXISTS version INT DEFAULT 1;
ALTER TABLE public.risk_appetites ADD COLUMN IF NOT EXISTS effective_date DATE;

-- Risk appetite bands columns  
ALTER TABLE public.risk_appetite_bands ADD COLUMN IF NOT EXISTS label TEXT;
ALTER TABLE public.risk_appetite_bands ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE public.risk_appetite_bands ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.risk_appetite_bands ADD COLUMN IF NOT EXISTS authorized_actions TEXT[];

-- Matrix level columns
ALTER TABLE public.matrix_likelihood_levels ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE public.matrix_impact_levels ADD COLUMN IF NOT EXISTS color TEXT;

-- Framework controls columns
ALTER TABLE public.framework_controls ADD COLUMN IF NOT EXISTS control_code TEXT;
ALTER TABLE public.framework_controls ADD COLUMN IF NOT EXISTS implementation_guidance TEXT;
ALTER TABLE public.framework_controls ADD COLUMN IF NOT EXISTS domain TEXT;
ALTER TABLE public.framework_controls ADD COLUMN IF NOT EXISTS subcategory TEXT;
ALTER TABLE public.framework_controls ADD COLUMN IF NOT EXISTS control_type TEXT;
ALTER TABLE public.framework_controls ADD COLUMN IF NOT EXISTS security_function TEXT;
ALTER TABLE public.framework_controls ADD COLUMN IF NOT EXISTS reference_links TEXT;
ALTER TABLE public.framework_controls ADD COLUMN IF NOT EXISTS source_hash TEXT;

-- Risk appetites archive column
ALTER TABLE public.risk_appetites ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- =====================================================
-- =====================================================
-- DATA FORGE TABLES
-- =====================================================

-- Data Forge Connections
CREATE TABLE IF NOT EXISTS public.data_forge_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  connection_type TEXT NOT NULL,
  system_type TEXT NOT NULL,
  source_category TEXT,
  base_url TEXT NOT NULL,
  auth_type TEXT DEFAULT 'none',
  auth_config JSONB,
  headers_config JSONB,
  timeout_seconds INTEGER DEFAULT 30,
  rate_limit_per_minute INTEGER,
  is_active BOOLEAN DEFAULT true,
  sync_enabled BOOLEAN DEFAULT false,
  sync_schedule TEXT,
  last_sync_at TIMESTAMPTZ,
  next_sync_at TIMESTAMPTZ,
  last_tested_at TIMESTAMPTZ,
  last_test_status TEXT,
  last_test_error TEXT,
  driver_type TEXT,
  database_name TEXT,
  schema_name TEXT,
  query_template TEXT,
  bucket_name TEXT,
  region TEXT,
  file_pattern TEXT,
  file_format TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Data Forge Connection Secrets
CREATE TABLE IF NOT EXISTS public.data_forge_connection_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES public.data_forge_connections(id) ON DELETE CASCADE,
  secret_key TEXT NOT NULL,
  secret_value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Data Forge Connection Endpoints
CREATE TABLE IF NOT EXISTS public.data_forge_connection_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES public.data_forge_connections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  endpoint_path TEXT NOT NULL,
  http_method TEXT DEFAULT 'GET',
  query_params JSONB,
  request_body_template JSONB,
  response_data_path TEXT,
  pagination_type TEXT,
  pagination_config JSONB,
  target_module TEXT NOT NULL,
  field_mappings JSONB,
  unique_key_field TEXT,
  sync_enabled BOOLEAN DEFAULT false,
  sync_interval TEXT,
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  last_sync_status TEXT,
  last_sync_error TEXT,
  last_sync_row_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Data Forge Jobs
CREATE TABLE IF NOT EXISTS public.data_forge_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  target_module TEXT NOT NULL,
  source_type TEXT DEFAULT 'file',
  source_file_name TEXT,
  source_api_config JSONB,
  connection_id UUID REFERENCES public.data_forge_connections(id) ON DELETE SET NULL,
  endpoint_id UUID REFERENCES public.data_forge_connection_endpoints(id) ON DELETE SET NULL,
  business_unit_id UUID REFERENCES public.business_units(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending',
  duplicate_behavior TEXT DEFAULT 'skip',
  row_count INTEGER DEFAULT 0,
  imported_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  sync_enabled BOOLEAN DEFAULT false,
  sync_schedule TEXT,
  last_synced_at TIMESTAMPTZ,
  next_sync_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Data Forge Mappings
CREATE TABLE IF NOT EXISTS public.data_forge_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.data_forge_jobs(id) ON DELETE CASCADE,
  source_column TEXT,
  target_field TEXT NOT NULL,
  transform_config JSONB,
  confidence NUMERIC,
  ai_reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Data Forge Staging Rows
CREATE TABLE IF NOT EXISTS public.data_forge_staging_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.data_forge_jobs(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  raw_data JSONB NOT NULL,
  normalized_data JSONB,
  validation_errors JSONB,
  will_import BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- DEFAULT RISK CATEGORIES
-- =====================================================
INSERT INTO public.risk_categories (name, description, color, is_enabled)
SELECT 'Strategic', 'Risks related to strategic objectives and business direction', '#6366f1', true
WHERE NOT EXISTS (SELECT 1 FROM public.risk_categories WHERE name = 'Strategic');

INSERT INTO public.risk_categories (name, description, color, is_enabled) 
SELECT 'Operational', 'Risks arising from internal processes, people and systems', '#8b5cf6', true
WHERE NOT EXISTS (SELECT 1 FROM public.risk_categories WHERE name = 'Operational');

INSERT INTO public.risk_categories (name, description, color, is_enabled) 
SELECT 'Financial', 'Risks related to financial losses and economic conditions', '#a855f7', true
WHERE NOT EXISTS (SELECT 1 FROM public.risk_categories WHERE name = 'Financial');

INSERT INTO public.risk_categories (name, description, color, is_enabled) 
SELECT 'Compliance', 'Risks related to laws, regulations and contractual obligations', '#d946ef', true
WHERE NOT EXISTS (SELECT 1 FROM public.risk_categories WHERE name = 'Compliance');

INSERT INTO public.risk_categories (name, description, color, is_enabled) 
SELECT 'Reputational', 'Risks that could harm organizational reputation or brand', '#ec4899', true
WHERE NOT EXISTS (SELECT 1 FROM public.risk_categories WHERE name = 'Reputational');

INSERT INTO public.risk_categories (name, description, color, is_enabled) 
SELECT 'Cyber Security', 'Risks related to cyber threats and information security', '#f43f5e', true
WHERE NOT EXISTS (SELECT 1 FROM public.risk_categories WHERE name = 'Cyber Security');

INSERT INTO public.risk_categories (name, description, color, is_enabled) 
SELECT 'Legal', 'Risks arising from legal disputes and contractual issues', '#ef4444', true
WHERE NOT EXISTS (SELECT 1 FROM public.risk_categories WHERE name = 'Legal');

INSERT INTO public.risk_categories (name, description, color, is_enabled) 
SELECT 'Environmental', 'Risks related to environmental impact and sustainability', '#22c55e', true
WHERE NOT EXISTS (SELECT 1 FROM public.risk_categories WHERE name = 'Environmental');

INSERT INTO public.risk_categories (name, description, color, is_enabled) 
SELECT 'Social', 'Risks related to social responsibility and community impact', '#14b8a6', true
WHERE NOT EXISTS (SELECT 1 FROM public.risk_categories WHERE name = 'Social');

INSERT INTO public.risk_categories (name, description, color, is_enabled) 
SELECT 'Governance', 'Risks related to corporate governance and oversight', '#f97316', true
WHERE NOT EXISTS (SELECT 1 FROM public.risk_categories WHERE name = 'Governance');

-- DEFAULT RISK MATRIX (5x5)
-- =====================================================
INSERT INTO public.risk_matrices (id, name, size, is_active)
SELECT '00000000-0000-0000-0000-000000000001', 'Default 5x5 Matrix', 5, true
WHERE NOT EXISTS (SELECT 1 FROM public.risk_matrices);

-- Default likelihood levels
INSERT INTO public.matrix_likelihood_levels (matrix_id, level, label, description, color)
SELECT '00000000-0000-0000-0000-000000000001', 1, 'Rare', 'Highly unlikely to occur', '#22c55e'
WHERE EXISTS (SELECT 1 FROM public.risk_matrices WHERE id = '00000000-0000-0000-0000-000000000001')
  AND NOT EXISTS (SELECT 1 FROM public.matrix_likelihood_levels WHERE matrix_id = '00000000-0000-0000-0000-000000000001' AND level = 1);

INSERT INTO public.matrix_likelihood_levels (matrix_id, level, label, description, color)
SELECT '00000000-0000-0000-0000-000000000001', 2, 'Unlikely', 'Could occur but not expected', '#84cc16'
WHERE EXISTS (SELECT 1 FROM public.risk_matrices WHERE id = '00000000-0000-0000-0000-000000000001')
  AND NOT EXISTS (SELECT 1 FROM public.matrix_likelihood_levels WHERE matrix_id = '00000000-0000-0000-0000-000000000001' AND level = 2);

INSERT INTO public.matrix_likelihood_levels (matrix_id, level, label, description, color)
SELECT '00000000-0000-0000-0000-000000000001', 3, 'Possible', 'Might occur at some time', '#eab308'
WHERE EXISTS (SELECT 1 FROM public.risk_matrices WHERE id = '00000000-0000-0000-0000-000000000001')
  AND NOT EXISTS (SELECT 1 FROM public.matrix_likelihood_levels WHERE matrix_id = '00000000-0000-0000-0000-000000000001' AND level = 3);

INSERT INTO public.matrix_likelihood_levels (matrix_id, level, label, description, color)
SELECT '00000000-0000-0000-0000-000000000001', 4, 'Likely', 'Will probably occur in most circumstances', '#f97316'
WHERE EXISTS (SELECT 1 FROM public.risk_matrices WHERE id = '00000000-0000-0000-0000-000000000001')
  AND NOT EXISTS (SELECT 1 FROM public.matrix_likelihood_levels WHERE matrix_id = '00000000-0000-0000-0000-000000000001' AND level = 4);

INSERT INTO public.matrix_likelihood_levels (matrix_id, level, label, description, color)
SELECT '00000000-0000-0000-0000-000000000001', 5, 'Almost Certain', 'Expected to occur in most circumstances', '#ef4444'
WHERE EXISTS (SELECT 1 FROM public.risk_matrices WHERE id = '00000000-0000-0000-0000-000000000001')
  AND NOT EXISTS (SELECT 1 FROM public.matrix_likelihood_levels WHERE matrix_id = '00000000-0000-0000-0000-000000000001' AND level = 5);

-- Default impact levels
INSERT INTO public.matrix_impact_levels (matrix_id, level, label, description, color)
SELECT '00000000-0000-0000-0000-000000000001', 1, 'Negligible', 'Minimal impact on operations', '#22c55e'
WHERE EXISTS (SELECT 1 FROM public.risk_matrices WHERE id = '00000000-0000-0000-0000-000000000001')
  AND NOT EXISTS (SELECT 1 FROM public.matrix_impact_levels WHERE matrix_id = '00000000-0000-0000-0000-000000000001' AND level = 1);

INSERT INTO public.matrix_impact_levels (matrix_id, level, label, description, color)
SELECT '00000000-0000-0000-0000-000000000001', 2, 'Minor', 'Limited impact, easily manageable', '#84cc16'
WHERE EXISTS (SELECT 1 FROM public.risk_matrices WHERE id = '00000000-0000-0000-0000-000000000001')
  AND NOT EXISTS (SELECT 1 FROM public.matrix_impact_levels WHERE matrix_id = '00000000-0000-0000-0000-000000000001' AND level = 2);

INSERT INTO public.matrix_impact_levels (matrix_id, level, label, description, color)
SELECT '00000000-0000-0000-0000-000000000001', 3, 'Moderate', 'Significant but recoverable impact', '#eab308'
WHERE EXISTS (SELECT 1 FROM public.risk_matrices WHERE id = '00000000-0000-0000-0000-000000000001')
  AND NOT EXISTS (SELECT 1 FROM public.matrix_impact_levels WHERE matrix_id = '00000000-0000-0000-0000-000000000001' AND level = 3);

INSERT INTO public.matrix_impact_levels (matrix_id, level, label, description, color)
SELECT '00000000-0000-0000-0000-000000000001', 4, 'Major', 'Serious impact requiring significant response', '#f97316'
WHERE EXISTS (SELECT 1 FROM public.risk_matrices WHERE id = '00000000-0000-0000-0000-000000000001')
  AND NOT EXISTS (SELECT 1 FROM public.matrix_impact_levels WHERE matrix_id = '00000000-0000-0000-0000-000000000001' AND level = 4);

INSERT INTO public.matrix_impact_levels (matrix_id, level, label, description, color)
SELECT '00000000-0000-0000-0000-000000000001', 5, 'Catastrophic', 'Critical impact threatening organization survival', '#ef4444'
WHERE EXISTS (SELECT 1 FROM public.risk_matrices WHERE id = '00000000-0000-0000-0000-000000000001')
  AND NOT EXISTS (SELECT 1 FROM public.matrix_impact_levels WHERE matrix_id = '00000000-0000-0000-0000-000000000001' AND level = 5);

-- =====================================================
-- USER JOURNEY PROGRESS (Onboarding)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_journey_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  journey_mode TEXT NOT NULL DEFAULT 'startup' CHECK (journey_mode IN ('startup', 'advanced')),
  current_step INTEGER DEFAULT 0,
  completed_steps JSONB DEFAULT '[]'::jsonb,
  journey_completed BOOLEAN DEFAULT false,
  journey_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

DO $$ BEGIN
  RAISE NOTICE 'GRC Platform complete schema initialized for Docker deployment';
END $$;
