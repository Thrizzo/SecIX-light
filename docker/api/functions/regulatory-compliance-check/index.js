// Self-hosted backend function: regulatory-compliance-check
// Minimal implementation that caches a placeholder analysis in public.regulatory_compliance_cache.

async function tableExists(pool, regclassName) {
  const res = await pool.query('SELECT to_regclass($1) AS reg', [regclassName]);
  return !!res.rows?.[0]?.reg;
}

export default async function handler(body, ctx) {
  const { pool } = ctx;

  const regulation = body?.regulation;
  const forceRefresh = !!body?.forceRefresh;

  if (!regulation) {
    throw new Error('Missing regulation');
  }

  if (!(await tableExists(pool, 'public.regulatory_compliance_cache'))) {
    throw new Error('Database not initialized (missing regulatory_compliance_cache)');
  }

  if (!forceRefresh) {
    const cached = await pool.query(
      `SELECT id, regulation, analysis_data, coverage_percentage, generated_at, expires_at
       FROM public.regulatory_compliance_cache
       WHERE regulation = $1 AND expires_at > now()
       ORDER BY generated_at DESC
       LIMIT 1`,
      [regulation]
    );

    if (cached.rows.length) {
      const row = cached.rows[0];
      return {
        success: true,
        regulation: row.regulation,
        analysis: row.analysis_data,
        coverage_percentage: row.coverage_percentage ?? 0,
        cached: true,
      };
    }
  }

  // Placeholder analysis (so UI works in self-hosted mode even without AI wiring)
  const analysis = {
    regulation,
    summary: 'Compliance analysis is not yet configured in self-hosted mode.',
    generated_at: new Date().toISOString(),
    gaps: [],
    recommendations: [],
  };

  const insert = await pool.query(
    `INSERT INTO public.regulatory_compliance_cache (regulation, analysis_data, coverage_percentage, generated_at, expires_at)
     VALUES ($1, $2::jsonb, $3, now(), now() + interval '24 hours')
     RETURNING id, regulation, analysis_data, coverage_percentage, generated_at, expires_at`,
    [regulation, JSON.stringify(analysis), 0]
  );

  const row = insert.rows[0];
  return {
    success: true,
    regulation: row.regulation,
    analysis: row.analysis_data,
    coverage_percentage: row.coverage_percentage ?? 0,
    cached: false,
  };
}
