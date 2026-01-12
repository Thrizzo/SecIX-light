// Self-hosted backend function: dashboard-insights
// This mimics the SaaS "dashboard-insights" function shape used by the frontend.

import { chatCompletion } from '../../lib/ai-provider.js';

function emptyDashboardData(thresholds = []) {
  return {
    success: true,
    metrics: {
      risks: { total: 0, open: 0, treated: 0, accepted: 0, registered: 0 },
      controls: { total: 0, overdue: 0, internalTotal: 0, internalOverdue: 0 },
      policies: { total: 0, overdue: 0, draft: 0, published: 0 },
      vendors: { total: 0, assessmentsDue: 0 },
      assets: { primary: 0, secondary: 0, deviations: 0 },
      evidence: { total: 0, expiringSoon: 0, controlsWithoutEvidence: 0 },
      compliance: { frameworks: [], averageCompliance: 0 },
      riskAppetite: { violations: 0, details: [] },
    },
    insights: [],
    overdueDetails: { controls: [], policies: [], vendors: [] },
    assetDeviations: [],
    controlsWithoutEvidence: [],
    evidenceExpiringSoon: [],
    frameworkCompliance: [],
    riskAppetiteViolations: [],
    thresholds,
  };
}

async function tableExists(pool, regclassName) {
  const res = await pool.query('SELECT to_regclass($1) AS reg', [regclassName]);
  return !!res.rows?.[0]?.reg;
}

async function generateAIInsights(data, pool) {
  try {
    const dataContext = `
Current GRC Dashboard Metrics:
- Total Risks: ${data.metrics.risks.total}, Open: ${data.metrics.risks.open}, Treated: ${data.metrics.risks.treated}
- Internal Controls: ${data.metrics.controls.internalTotal}, Overdue: ${data.metrics.controls.internalOverdue}
- Policies: ${data.metrics.policies.total}, Published: ${data.metrics.policies.published}, Draft: ${data.metrics.policies.draft}
- Vendors: ${data.metrics.vendors.total}, Assessments Due: ${data.metrics.vendors.assessmentsDue}
- Primary Assets: ${data.metrics.assets.primary}, Secondary Assets: ${data.metrics.assets.secondary}
- Evidence Items: ${data.metrics.evidence.total}, Expiring Soon: ${data.metrics.evidence.expiringSoon}
- Average Compliance: ${data.metrics.compliance.averageCompliance}%
- Frameworks: ${data.metrics.compliance.frameworks.length}
`;

    const prompt = `You are a GRC (Governance, Risk, and Compliance) expert analyzing dashboard metrics.
Based on the following data, provide 3-5 actionable insights for the security team.

${dataContext}

Respond with a JSON array of insight objects. Each insight must have:
- title: Short descriptive title (max 60 chars)
- description: Brief explanation (max 150 chars)
- severity: One of "critical", "high", "medium", "low"
- category: One of "risk", "compliance", "controls", "evidence", "vendors", "assets"
- trend: One of "improving", "declining", "stable"
- recommendation: Specific action to take (max 200 chars)

Focus on:
1. High-risk areas needing immediate attention
2. Compliance gaps or trends
3. Control effectiveness issues
4. Evidence management concerns
5. Quick wins for improvement

Return ONLY the JSON array, no markdown or explanation.`;

    const response = await chatCompletion({
      messages: [
        { role: 'system', content: 'You are a GRC expert. Always respond with valid JSON only.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1500
    }, pool);

    // Parse AI response
    let insights = [];
    try {
      // Clean response - remove markdown code blocks if present
      let cleaned = response.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
      }
      insights = JSON.parse(cleaned);
      
      // Validate structure
      if (!Array.isArray(insights)) {
        console.warn('[dashboard-insights] AI response is not an array, using fallback');
        insights = [];
      }
      
      // Normalize and validate each insight
      insights = insights.slice(0, 6).map((insight, idx) => ({
        title: String(insight.title || `Insight ${idx + 1}`).slice(0, 60),
        description: String(insight.description || '').slice(0, 150),
        severity: ['critical', 'high', 'medium', 'low'].includes(insight.severity) ? insight.severity : 'medium',
        category: ['risk', 'compliance', 'controls', 'evidence', 'vendors', 'assets'].includes(insight.category) ? insight.category : 'compliance',
        trend: ['improving', 'declining', 'stable'].includes(insight.trend) ? insight.trend : 'stable',
        recommendation: String(insight.recommendation || '').slice(0, 200),
      }));
      
    } catch (parseError) {
      console.warn('[dashboard-insights] Failed to parse AI response:', parseError.message);
      console.log('[dashboard-insights] Raw response:', response.slice(0, 500));
    }

    return insights;
  } catch (error) {
    console.warn('[dashboard-insights] AI insight generation failed:', error.message);
    return [];
  }
}

export default async function handler(_body, ctx) {
  const { pool } = ctx;

  // If schema isn't initialized yet, return safe zeros so the UI doesn't crash.
  const thresholds = [];
  try {
    if (await tableExists(pool, 'public.dashboard_thresholds')) {
      const t = await pool.query(
        'SELECT id, threshold_key, threshold_name, threshold_value, threshold_unit, description, category FROM public.dashboard_thresholds ORDER BY category ASC'
      );
      thresholds.push(...t.rows);
    }
  } catch {
    // ignore
  }

  const data = emptyDashboardData(thresholds);

  try {
    if (await tableExists(pool, 'public.risks')) {
      const totalRes = await pool.query(
        "SELECT COUNT(*)::int AS c FROM public.risks WHERE COALESCE(is_archived,false) = false"
      );
      const total = totalRes.rows?.[0]?.c ?? 0;

      const openRes = await pool.query(
        "SELECT COUNT(*)::int AS c FROM public.risks WHERE COALESCE(is_archived,false) = false AND status IN ('pending_review','approved','active','monitoring')"
      );
      const open = openRes.rows?.[0]?.c ?? 0;

      const treatedRes = await pool.query(
        "SELECT COUNT(*)::int AS c FROM public.risks WHERE COALESCE(is_archived,false) = false AND status = 'treated'"
      );
      const treated = treatedRes.rows?.[0]?.c ?? 0;

      data.metrics.risks.total = total;
      data.metrics.risks.registered = total;
      data.metrics.risks.open = open;
      data.metrics.risks.treated = treated;
    }

    if (await tableExists(pool, 'public.primary_assets')) {
      const r = await pool.query('SELECT COUNT(*)::int AS c FROM public.primary_assets');
      data.metrics.assets.primary = r.rows?.[0]?.c ?? 0;
    }

    if (await tableExists(pool, 'public.secondary_assets')) {
      const r = await pool.query('SELECT COUNT(*)::int AS c FROM public.secondary_assets');
      data.metrics.assets.secondary = r.rows?.[0]?.c ?? 0;
    }

    if (await tableExists(pool, 'public.evidence_items')) {
      const r = await pool.query('SELECT COUNT(*)::int AS c FROM public.evidence_items');
      data.metrics.evidence.total = r.rows?.[0]?.c ?? 0;
    }

    if (await tableExists(pool, 'public.policies')) {
      const totalRes = await pool.query('SELECT COUNT(*)::int AS c FROM public.policies');
      data.metrics.policies.total = totalRes.rows?.[0]?.c ?? 0;
    }

    if (await tableExists(pool, 'public.vendors')) {
      const r = await pool.query('SELECT COUNT(*)::int AS c FROM public.vendors');
      data.metrics.vendors.total = r.rows?.[0]?.c ?? 0;
    }

    if (await tableExists(pool, 'public.internal_controls')) {
      const r = await pool.query('SELECT COUNT(*)::int AS c FROM public.internal_controls');
      data.metrics.controls.internalTotal = r.rows?.[0]?.c ?? 0;
      data.metrics.controls.total = data.metrics.controls.internalTotal;
    }

    if (await tableExists(pool, 'public.framework_compliance_status')) {
      const rows = (await pool.query('SELECT * FROM public.framework_compliance_status')).rows || [];
      data.frameworkCompliance = rows;
      data.metrics.compliance.frameworks = rows;
      if (rows.length > 0) {
        const avg = rows.reduce((sum, r) => sum + (Number(r.compliance_percentage) || 0), 0) / rows.length;
        data.metrics.compliance.averageCompliance = Math.round(avg);
      }
    }

    // Generate AI-powered insights based on collected metrics
    data.insights = await generateAIInsights(data, pool);

  } catch (err) {
    console.warn('[dashboard-insights] Error collecting metrics:', err.message);
    // If anything fails, we still return the safe skeleton.
  }

  return data;
}
