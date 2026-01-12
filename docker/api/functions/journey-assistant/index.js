// Self-hosted backend function: journey-assistant
// Fragobert AI assistant for GRC guidance using Ollama or OpenAI

import { chatCompletion } from "../../lib/ai-provider.js";
const SYSTEM_PROMPT = `You are Fragobert, an expert in Governance, Risk, and Compliance (GRC). You help users navigate and maximize their usage of the SecIX GRC platform.

## Your Knowledge Areas:
- All SecIX modules: Dashboard, Governance, Risk Management, Asset Management, Vendor Management, Business Continuity, Data Protection, Control Library, Maturity Assessment, Security Operations, AI Governance, Data Forge
- GRC best practices and methodologies
- NIST SP 800-53 (Security and Privacy Controls)
- NIST SP 800-37 (Risk Management Framework)
- CIS Controls v8.1
- MITRE ATT&CK Framework
- ISO 27001/27002
- Business continuity and disaster recovery
- Third-party risk management

## SecIX Module Guide:

### Dashboard
The central hub showing compliance metrics, risk status, overdue items, and AI-generated insights.

### Governance
- Company Profile: Organization details, legal name, industry
- Scope Statements: Define what's in-scope for security programs
- Policies: Security policy management and generation
- Executives: Board members and key security personnel
- Points of Contact: Security contacts and responsibilities

### Risk Management
- Risk Register: Track identified risks with likelihood and impact ratings
- Risk Appetite: Define organizational risk tolerance thresholds
- Risk Matrix: Visual heatmap of risks
- Treatments: Mitigation plans for unacceptable risks
- Archive: Historical risk records

### Asset Management
- Primary Assets: Business processes, information, and data
- Secondary Assets: Systems, applications, infrastructure
- Asset Relationships: Dependencies between assets
- Deviation Dashboard: Track assets needing attention

### Control Library
- Framework Controls: NIST, ISO, CIS controls from external frameworks
- Internal Controls: Organization-specific security controls
- Mappings: Link internal controls to framework requirements
- Control Forge: AI-assisted control generation
- Findings: Control deficiencies and gaps

### Vendor Management
- Vendor Register: Third-party vendor inventory
- Risk Assessment: Evaluate vendor security posture
- Contract Tracking: Monitor contract terms and renewals

### Business Continuity
- BIA (Business Impact Assessment): Assess impact of asset unavailability
- RTO/RPO: Recovery time and point objectives
- Continuity Plans: Documented recovery procedures

### Data Protection
- Confidentiality Levels: Data classification tiers
- Impact Mapping: Link sensitivity to risk impact

### Maturity Assessment
- Capability Maturity: Track security program maturity
- Gap Analysis: Identify improvement areas
- Progress Tracking: Monitor maturity over time

### Security Operations (Advanced Mode)
- Security Tools: Technology stack inventory
- SIRT: Security Incident Response Team directory
- Threats: Threat sources, events, and vulnerabilities
- Predisposing Conditions: Environmental risk factors

### AI Governance
- AI Asset Register: Inventory of AI/ML systems
- Use Cases: Document AI applications
- EU AI Act Categories: Risk classification

### Data Forge
- Import Wizard: Bring in data from files
- Connections: API integrations with external systems
- Jobs: Data synchronization management

## Response Guidelines:
1. Be concise but thorough
2. Reference specific SecIX features when applicable
3. Provide step-by-step guidance when explaining processes
4. Link concepts to relevant security frameworks (NIST, CIS, ISO)
5. Stay focused on GRC and SecIX scope - don't answer unrelated questions
6. Use numbered lists for multi-step instructions
7. If unsure about a specific SecIX feature, acknowledge it and provide general GRC guidance
8. When answering questions about the organization's data (risks, assets, controls, etc.), use the context provided below

## Important:
- Only answer questions related to SecIX and GRC topics
- For unrelated questions, politely redirect to GRC-focused assistance
- Be encouraging and supportive for users new to GRC
- When organization-specific context is provided, use it to give personalized answers`;

async function searchKnowledgeBase(pool, query) {
  try {
    // Check if table exists
    const tableCheck = await pool.query("SELECT to_regclass('public.knowledge_base') AS reg");
    if (!tableCheck.rows?.[0]?.reg) return '';

    // Simple ILIKE search
    const res = await pool.query(
      `SELECT title, content, category FROM public.knowledge_base 
       WHERE is_active = true AND (title ILIKE $1 OR content ILIKE $1)
       LIMIT 5`,
      [`%${query}%`]
    );

    if (!res.rows?.length) return '';

    return res.rows.map(doc =>
      `### ${doc.title} (${doc.category})\n${doc.content}`
    ).join('\n\n');
  } catch (e) {
    console.error('Knowledge base search error:', e);
    return '';
  }
}

async function getDatabaseContext(pool, query) {
  const lowerQuery = query.toLowerCase();
  const context = [];

  try {
    // Risk-related queries
    if (lowerQuery.includes('risk') || lowerQuery.includes('threat') || lowerQuery.includes('vulnerability')) {
      const risksRes = await pool.query(
        'SELECT risk_id, name, status, residual_risk_level FROM public.risks LIMIT 10'
      ).catch(() => ({ rows: [] }));

      if (risksRes.rows?.length) {
        context.push(`## Current Risks (${risksRes.rows.length} shown):\n` +
          risksRes.rows.map(r => `- ${r.risk_id}: ${r.name} (${r.status}, ${r.residual_risk_level || 'unrated'})`).join('\n'));
      }

      const treatmentsRes = await pool.query(
        'SELECT name, treatment_type, status FROM public.risk_treatments LIMIT 10'
      ).catch(() => ({ rows: [] }));

      if (treatmentsRes.rows?.length) {
        context.push(`## Risk Treatments (${treatmentsRes.rows.length} shown):\n` +
          treatmentsRes.rows.map(t => `- ${t.name}: ${t.treatment_type} (${t.status})`).join('\n'));
      }
    }

    // Asset-related queries
    if (lowerQuery.includes('asset') || lowerQuery.includes('system') || lowerQuery.includes('application')) {
      const primaryRes = await pool.query(
        'SELECT name, asset_type, criticality FROM public.primary_assets LIMIT 10'
      ).catch(() => ({ rows: [] }));

      if (primaryRes.rows?.length) {
        context.push(`## Primary Assets (${primaryRes.rows.length} shown):\n` +
          primaryRes.rows.map(a => `- ${a.name} (${a.asset_type}, ${a.criticality || 'unrated'})`).join('\n'));
      }

      const secondaryRes = await pool.query(
        'SELECT name, asset_type, status FROM public.secondary_assets LIMIT 10'
      ).catch(() => ({ rows: [] }));

      if (secondaryRes.rows?.length) {
        context.push(`## Secondary Assets (${secondaryRes.rows.length} shown):\n` +
          secondaryRes.rows.map(a => `- ${a.name} (${a.asset_type}, ${a.status || 'active'})`).join('\n'));
      }
    }

    // Control-related queries
    if (lowerQuery.includes('control') || lowerQuery.includes('compliance') || lowerQuery.includes('framework')) {
      const frameworksRes = await pool.query(
        "SELECT name, version FROM public.control_frameworks WHERE is_active = true LIMIT 10"
      ).catch(() => ({ rows: [] }));

      if (frameworksRes.rows?.length) {
        context.push(`## Active Frameworks:\n` +
          frameworksRes.rows.map(f => `- ${f.name} ${f.version || ''}`).join('\n'));
      }

      const internalRes = await pool.query(
        'SELECT control_id, name, status, implementation_status FROM public.internal_controls LIMIT 10'
      ).catch(() => ({ rows: [] }));

      if (internalRes.rows?.length) {
        context.push(`## Internal Controls (${internalRes.rows.length} shown):\n` +
          internalRes.rows.map(c => `- ${c.control_id}: ${c.name} (${c.implementation_status || c.status || 'unknown'})`).join('\n'));
      }

      const findingsRes = await pool.query(
        "SELECT title, status, finding_type FROM public.control_findings WHERE status IN ('open', 'in_progress') LIMIT 10"
      ).catch(() => ({ rows: [] }));

      if (findingsRes.rows?.length) {
        context.push(`## Open Findings (${findingsRes.rows.length} shown):\n` +
          findingsRes.rows.map(f => `- ${f.title} (${f.finding_type}, ${f.status})`).join('\n'));
      }
    }

    // Vendor queries
    if (lowerQuery.includes('vendor') || lowerQuery.includes('third party') || lowerQuery.includes('supplier')) {
      const vendorsRes = await pool.query(
        'SELECT name, vendor_type, risk_tier FROM public.vendors LIMIT 10'
      ).catch(() => ({ rows: [] }));

      if (vendorsRes.rows?.length) {
        context.push(`## Vendors (${vendorsRes.rows.length} shown):\n` +
          vendorsRes.rows.map(v => `- ${v.name} (${v.vendor_type || 'unknown'}, Risk: ${v.risk_tier || 'unrated'})`).join('\n'));
      }
    }

    // Policy queries
    if (lowerQuery.includes('policy') || lowerQuery.includes('procedure') || lowerQuery.includes('document')) {
      const policiesRes = await pool.query(
        'SELECT title, status, policy_type FROM public.policies LIMIT 10'
      ).catch(() => ({ rows: [] }));

      if (policiesRes.rows?.length) {
        context.push(`## Policies (${policiesRes.rows.length} shown):\n` +
          policiesRes.rows.map(p => `- ${p.title} (${p.policy_type || 'general'}, ${p.status || 'draft'})`).join('\n'));
      }
    }

    // BIA/continuity queries
    if (lowerQuery.includes('bia') || lowerQuery.includes('business impact') || lowerQuery.includes('continuity') || lowerQuery.includes('recovery')) {
      const biaRes = await pool.query(
        'SELECT derived_criticality, rto_hours, rpo_hours FROM public.bia_assessments LIMIT 10'
      ).catch(() => ({ rows: [] }));

      if (biaRes.rows?.length) {
        context.push(`## BIA Assessments (${biaRes.rows.length} shown):\n` +
          biaRes.rows.map(b => `- Criticality: ${b.derived_criticality || 'unrated'}, RTO: ${b.rto_hours || 'N/A'}h, RPO: ${b.rpo_hours || 'N/A'}h`).join('\n'));
      }

      const plansRes = await pool.query(
        'SELECT plan_name, status FROM public.continuity_plans LIMIT 10'
      ).catch(() => ({ rows: [] }));

      if (plansRes.rows?.length) {
        context.push(`## Continuity Plans (${plansRes.rows.length} shown):\n` +
          plansRes.rows.map(p => `- ${p.plan_name} (${p.status || 'draft'})`).join('\n'));
      }
    }

    // General stats if no specific context
    if (context.length === 0) {
      const [risks, assets, controls, vendors] = await Promise.all([
        pool.query('SELECT COUNT(*) as count FROM public.risks').catch(() => ({ rows: [{ count: 0 }] })),
        pool.query('SELECT COUNT(*) as count FROM public.primary_assets').catch(() => ({ rows: [{ count: 0 }] })),
        pool.query('SELECT COUNT(*) as count FROM public.internal_controls').catch(() => ({ rows: [{ count: 0 }] })),
        pool.query('SELECT COUNT(*) as count FROM public.vendors').catch(() => ({ rows: [{ count: 0 }] })),
      ]);

      context.push(`## Organization Overview:
- Total Risks: ${risks.rows?.[0]?.count || 0}
- Primary Assets: ${assets.rows?.[0]?.count || 0}
- Internal Controls: ${controls.rows?.[0]?.count || 0}
- Vendors: ${vendors.rows?.[0]?.count || 0}`);
    }

    return context.join('\n\n');
  } catch (e) {
    console.error('Database context error:', e);
    return '';
  }
}

export default async function handler(body, ctx) {
  const { pool, method } = ctx;
  const { messages, currentRoute } = body || {};

  if (method === 'OPTIONS') {
    return { status: 204 };
  }

  if (!messages || !Array.isArray(messages)) {
    throw new Error('Messages array is required');
  }

  // Get last user message for context search
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || '';

  // Build context
  const contextSections = [];

  if (currentRoute) {
    contextSections.push(`The user is currently on the ${currentRoute} page in SecIX.`);
  }

  // Search knowledge base
  const knowledgeContext = await searchKnowledgeBase(pool, lastUserMessage);
  if (knowledgeContext) {
    contextSections.push(`## Custom Knowledge Base:\n${knowledgeContext}`);
  }

  // Get database context
  const dbContext = await getDatabaseContext(pool, lastUserMessage);
  if (dbContext) {
    contextSections.push(`## Organization Data:\n${dbContext}`);
  }

  // Build final system prompt
  let finalSystemPrompt = SYSTEM_PROMPT;
  if (contextSections.length > 0) {
    finalSystemPrompt += `\n\n---\n## CONTEXT FOR THIS CONVERSATION:\n\n${contextSections.join('\n\n')}`;
  }

  console.log('Journey Assistant: Processing request with', messages.length, 'messages');

  const response = await chatCompletion({
    messages: [
      { role: 'system', content: finalSystemPrompt },
      ...messages,
    ],
    temperature: 0.7,
    max_tokens: 1500,
  }, pool);

  console.log('Journey Assistant: Response generated successfully');

  return { response };
}
