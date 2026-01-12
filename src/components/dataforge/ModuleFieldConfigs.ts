export interface FieldConfig {
  name: string;
  label: string;
  type: "text" | "number" | "date" | "email" | "url" | "select" | "boolean";
  required: boolean;
  options?: string[];
  description?: string;
}

export interface ModuleConfig {
  key: string;
  label: string;
  description: string;
  icon: string;
  fields: FieldConfig[];
}

export const MODULE_CONFIGS: ModuleConfig[] = [
  {
    key: "primary_assets",
    label: "Primary Assets",
    description: "Business processes and information assets",
    icon: "Briefcase",
    fields: [
      { name: "asset_id", label: "Asset ID", type: "text", required: true, description: "Unique identifier for the asset" },
      { name: "name", label: "Name", type: "text", required: true, description: "Asset name" },
      { name: "description", label: "Description", type: "text", required: false },
      { name: "asset_kind", label: "Asset Kind", type: "select", required: false, options: ["asset", "process"] },
      { name: "process_level", label: "Process Level", type: "select", required: false, options: ["L1", "L2", "L3"] },
      { name: "primary_type", label: "Primary Type", type: "select", required: false, options: ["Data", "Process"] },
      { name: "criticality", label: "Criticality", type: "select", required: false, options: ["Low", "Medium", "High", "Critical"] },
      { name: "notes", label: "Notes", type: "text", required: false },
    ],
  },
  {
    key: "secondary_assets",
    label: "Secondary Assets",
    description: "Supporting assets like applications and services",
    icon: "HardDrive",
    fields: [
      { name: "asset_id", label: "Asset ID", type: "text", required: true, description: "Unique identifier" },
      { name: "name", label: "Name", type: "text", required: true },
      { name: "description", label: "Description", type: "text", required: false },
      { name: "secondary_type", label: "Type", type: "select", required: false, options: ["IT Service", "Application", "Location", "Personnel"] },
      { name: "ai_enabled", label: "AI Enabled", type: "boolean", required: false },
      { name: "primary_asset_id", label: "Primary Asset ID", type: "text", required: false, description: "Optional link to a primary asset" },
      { name: "notes", label: "Notes", type: "text", required: false },
    ],
  },
  {
    key: "vendors",
    label: "Vendors",
    description: "Third-party vendors and suppliers",
    icon: "Building2",
    fields: [
      { name: "name", label: "Vendor Name", type: "text", required: true },
      { name: "description", label: "Description", type: "text", required: false },
      { name: "vendor_type", label: "Vendor Type", type: "select", required: false, options: ["software", "hardware", "service", "consulting", "cloud", "other"] },
      { name: "contact_name", label: "Contact Name", type: "text", required: false },
      { name: "contact_email", label: "Contact Email", type: "email", required: false },
      { name: "contact_phone", label: "Contact Phone", type: "text", required: false },
      { name: "website", label: "Website", type: "url", required: false },
      { name: "contract_start_date", label: "Contract Start", type: "date", required: false },
      { name: "contract_end_date", label: "Contract End", type: "date", required: false },
      { name: "risk_tier", label: "Risk Tier", type: "select", required: false, options: ["critical", "high", "medium", "low"] },
      { name: "status", label: "Status", type: "select", required: false, options: ["active", "inactive", "pending", "terminated"] },
    ],
  },
  {
    key: "risks",
    label: "Risks",
    description: "Risk register entries",
    icon: "AlertTriangle",
    fields: [
      { name: "risk_id", label: "Risk ID", type: "text", required: false, description: "Auto-generated if not provided" },
      { name: "title", label: "Title", type: "text", required: true },
      { name: "description", label: "Description", type: "text", required: false },
      { name: "risk_level", label: "Risk Level", type: "select", required: false, options: ["organizational", "operational", "technical"] },
      { name: "inherent_likelihood", label: "Inherent Likelihood", type: "select", required: false, options: ["almost_certain", "likely", "possible", "unlikely", "rare"] },
      { name: "inherent_severity", label: "Inherent Severity", type: "select", required: false, options: ["critical", "high", "medium", "low", "negligible"] },
      { name: "status", label: "Status", type: "select", required: false, options: ["draft", "pending_review", "approved", "active", "monitoring", "treated", "closed", "archived"] },
      { name: "notes", label: "Notes", type: "text", required: false },
    ],
  },
  {
    key: "vulnerabilities",
    label: "Vulnerabilities",
    description: "Security vulnerabilities",
    icon: "Bug",
    fields: [
      { name: "identifier", label: "Identifier", type: "text", required: true },
      { name: "description", label: "Description", type: "text", required: false },
      { name: "severity_base_score", label: "Severity Score", type: "number", required: false },
      { name: "severity_qual", label: "Severity", type: "select", required: false, options: ["critical", "high", "medium", "low", "informational"] },
      { name: "cve_id", label: "CVE ID", type: "text", required: false },
      { name: "status", label: "Status", type: "select", required: false, options: ["open", "in_progress", "mitigated", "accepted", "closed"] },
      { name: "remediation", label: "Remediation", type: "text", required: false },
      { name: "notes", label: "Notes", type: "text", required: false },
    ],
  },
  {
    key: "threat_sources",
    label: "Threat Sources",
    description: "Threat actors and sources",
    icon: "Skull",
    fields: [
      { name: "identifier", label: "Identifier", type: "text", required: true },
      { name: "name", label: "Name", type: "text", required: true },
      { name: "description", label: "Description", type: "text", required: false },
      { name: "source_type", label: "Source Type", type: "select", required: false, options: ["adversarial", "accidental", "structural", "environmental"] },
      { name: "capability_qual", label: "Capability", type: "select", required: false, options: ["very_high", "high", "moderate", "low", "very_low"] },
      { name: "intent_qual", label: "Intent", type: "select", required: false, options: ["very_high", "high", "moderate", "low", "very_low"] },
      { name: "targeting_qual", label: "Targeting", type: "select", required: false, options: ["very_high", "high", "moderate", "low", "very_low"] },
      { name: "notes", label: "Notes", type: "text", required: false },
    ],
  },
  {
    key: "threat_events",
    label: "Threat Events",
    description: "Threat event scenarios",
    icon: "Zap",
    fields: [
      { name: "identifier", label: "Identifier", type: "text", required: true },
      { name: "name", label: "Name", type: "text", required: true },
      { name: "description", label: "Description", type: "text", required: false },
      { name: "threat_type", label: "Threat Type", type: "text", required: false },
      { name: "relevance_qual", label: "Relevance", type: "select", required: false, options: ["confirmed", "expected", "anticipated", "predicted", "possible", "not_applicable"] },
      { name: "likelihood_qual", label: "Likelihood", type: "select", required: false, options: ["very_high", "high", "moderate", "low", "very_low"] },
      { name: "notes", label: "Notes", type: "text", required: false },
    ],
  },
  {
    key: "internal_controls",
    label: "Internal Controls",
    description: "Organization's internal security controls",
    icon: "Shield",
    fields: [
      { name: "internal_control_code", label: "Control Code", type: "text", required: true },
      { name: "title", label: "Title", type: "text", required: true },
      { name: "description", label: "Description", type: "text", required: false },
      { name: "control_type", label: "Control Type", type: "select", required: false, options: ["preventive", "detective", "corrective", "deterrent", "compensating"] },
      { name: "security_function", label: "Security Function", type: "select", required: false, options: ["identify", "protect", "detect", "respond", "recover", "govern"] },
      { name: "automation_level", label: "Automation Level", type: "select", required: false, options: ["manual", "semi-automated", "automated"] },
      { name: "frequency", label: "Frequency", type: "select", required: false, options: ["continuous", "daily", "weekly", "monthly", "quarterly", "annually", "ad-hoc"] },
      { name: "status", label: "Status", type: "select", required: false, options: ["Draft", "Active", "Under Review", "Deprecated"] },
      { name: "system_scope", label: "System Scope", type: "text", required: false },
    ],
  },
];

export function getModuleConfig(moduleKey: string): ModuleConfig | undefined {
  return MODULE_CONFIGS.find((m) => m.key === moduleKey);
}

export function getRequiredFields(moduleKey: string): string[] {
  const config = getModuleConfig(moduleKey);
  return config?.fields.filter((f) => f.required).map((f) => f.name) || [];
}

// Column name matching for auto-mapping
export function suggestMapping(
  sourceColumn: string,
  targetFields: FieldConfig[]
): { field: string; confidence: number } | null {
  const normalized = sourceColumn.toLowerCase().replace(/[_\-\s]/g, "");

  for (const field of targetFields) {
    const fieldNormalized = field.name.toLowerCase().replace(/[_\-\s]/g, "");
    const labelNormalized = field.label.toLowerCase().replace(/[_\-\s]/g, "");

    // Exact match
    if (normalized === fieldNormalized || normalized === labelNormalized) {
      return { field: field.name, confidence: 1.0 };
    }

    // Partial match
    if (normalized.includes(fieldNormalized) || fieldNormalized.includes(normalized)) {
      return { field: field.name, confidence: 0.8 };
    }

    if (normalized.includes(labelNormalized) || labelNormalized.includes(normalized)) {
      return { field: field.name, confidence: 0.7 };
    }
  }

  // Common aliases
  const aliases: Record<string, string[]> = {
    name: ["title", "label", "assetname", "vendorname", "riskname"],
    description: ["desc", "details", "summary", "notes", "comments"],
    asset_id: ["id", "assetid", "code", "identifier"],
    email: ["mail", "emailaddress", "contactemail"],
    status: ["state", "condition"],
  };

  for (const [field, aliasList] of Object.entries(aliases)) {
    if (aliasList.some((a) => normalized.includes(a) || a.includes(normalized))) {
      const targetField = targetFields.find((f) => f.name === field);
      if (targetField) {
        return { field: field, confidence: 0.6 };
      }
    }
  }

  return null;
}
