// Self-hosted backend function: ai-settings
// Stores settings in public.app_settings (key = 'ai_settings').

const DEFAULTS = {
  provider: (process.env.AI_PROVIDER || 'ollama'),
  enabled: true,
  openai_model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  openai_base_url: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  ollama_base_url: process.env.OLLAMA_BASE_URL || 'http://ollama:11434',
  ollama_model: process.env.OLLAMA_MODEL || 'llama3.2',
};

async function tableExists(pool, regclassName) {
  const res = await pool.query('SELECT to_regclass($1) AS reg', [regclassName]);
  return !!res.rows?.[0]?.reg;
}

async function loadSettings(pool) {
  if (!(await tableExists(pool, 'public.app_settings'))) return null;
  const res = await pool.query('SELECT value FROM public.app_settings WHERE key = $1 LIMIT 1', ['ai_settings']);
  return res.rows?.[0]?.value ?? null;
}

async function saveSettings(pool, userId, value) {
  if (!(await tableExists(pool, 'public.app_settings'))) {
    throw new Error('Database not initialized (missing app_settings)');
  }

  await pool.query(
    `INSERT INTO public.app_settings (key, value, updated_by)
     VALUES ($1, $2::jsonb, $3)
     ON CONFLICT (key)
     DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()`,
    ['ai_settings', JSON.stringify(value), userId || null]
  );
}

export default async function handler(body, ctx) {
  const { pool, user, method } = ctx;

  // Basic method handling (server passes method as 'GET' or 'POST')
  if (method === 'GET') {
    const stored = await loadSettings(pool);
    const merged = { ...DEFAULTS, ...(stored || {}) };

    return {
      provider: merged.provider,
      enabled: !!merged.enabled,
      openai_model: merged.openai_model,
      openai_base_url: merged.openai_base_url,
      ollama_base_url: merged.ollama_base_url,
      ollama_model: merged.ollama_model,
      has_openai_key: !!process.env.OPENAI_API_KEY,
    };
  }

  // POST: update or test
  const action = body?.action;

  if (action === 'test' && body?.provider === 'ollama') {
    const base = body?.ollama_base_url || DEFAULTS.ollama_base_url;
    try {
      const resp = await fetch(`${String(base).replace(/\/+$/, '')}/api/tags`, { method: 'GET' });
      if (!resp.ok) throw new Error('Ollama connection failed');
      const data = await resp.json().catch(() => ({}));
      const models = Array.isArray(data?.models) ? data.models : [];
      return {
        success: true,
        message: models.length ? `Ollama connected. Found ${models.length} model(s)` : 'Ollama connected but no models found',
        models: models.map((m) => m?.name).filter(Boolean),
        warning: models.length === 0,
      };
    } catch (e) {
      throw new Error(e?.message || 'Ollama connection failed');
    }
  }

  const next = {
    provider: body?.provider || DEFAULTS.provider,
    enabled: typeof body?.enabled === 'boolean' ? body.enabled : DEFAULTS.enabled,
    openai_model: body?.openai_model || DEFAULTS.openai_model,
    openai_base_url: body?.openai_base_url || DEFAULTS.openai_base_url,
    ollama_base_url: body?.ollama_base_url || DEFAULTS.ollama_base_url,
    ollama_model: body?.ollama_model || DEFAULTS.ollama_model,
  };

  // Persist (we do NOT store OpenAI API keys in DB; only presence is detected via env)
  await saveSettings(pool, user?.sub, next);

  return { success: true, message: 'AI settings updated' };
}
