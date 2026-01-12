/**
 * AI Provider Abstraction for SecIX Light
 * 
 * Supports multiple AI providers:
 * - ollama: Local Ollama instance (default for self-hosted)
 * - openai: OpenAI API
 * 
 * Configuration priority:
 * 1. Database settings (app_settings table)
 * 2. Environment variables
 * 3. Defaults (Ollama)
 */

import OpenAI from 'openai';

const DEFAULTS = {
  provider: 'ollama',
  ollama_base_url: process.env.OLLAMA_BASE_URL || 'http://ollama:11434',
  ollama_model: process.env.OLLAMA_MODEL || 'llama3.2',
  openai_model: 'gpt-4o-mini',
};

export async function ensureAppSettingsTable(pool) {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.app_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key TEXT NOT NULL UNIQUE,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT now(),
        updated_by UUID
      );
    `);
  } catch (error) {
    console.warn('[ai-provider] Failed to ensure public.app_settings exists:', error.message);
  }
}

export async function getProviderConfig(pool) {
  try {
    await ensureAppSettingsTable(pool);

    const result = await pool.query(
      "SELECT value FROM public.app_settings WHERE key = 'ai_provider'"
    );
    
    if (result.rows.length > 0) {
      const dbSettings = result.rows[0].value;
      console.log('[ai-provider] Using DB settings:', JSON.stringify(dbSettings));
      return {
        provider: dbSettings.provider || DEFAULTS.provider,
        ollama_base_url: dbSettings.ollama_base_url || DEFAULTS.ollama_base_url,
        ollama_model: dbSettings.ollama_model || DEFAULTS.ollama_model,
        openai_api_key: dbSettings.openai_api_key || process.env.OPENAI_API_KEY,
        openai_model: dbSettings.openai_model || DEFAULTS.openai_model,
      };
    }
  } catch (error) {
    console.warn('[ai-provider] Could not fetch AI settings from database:', error.message);
  }

  console.log('[ai-provider] Using default Ollama configuration');
  return {
    provider: DEFAULTS.provider,
    ollama_base_url: DEFAULTS.ollama_base_url,
    ollama_model: DEFAULTS.ollama_model,
    openai_api_key: process.env.OPENAI_API_KEY,
    openai_model: DEFAULTS.openai_model,
  };
}

async function callOllama(options, config) {
  const { messages, temperature = 0.7, max_tokens } = options;
  
  const response = await fetch(`${config.ollama_base_url}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.ollama_model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      stream: false,
      options: {
        temperature,
        ...(max_tokens && { num_predict: max_tokens }),
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.message?.content || '';
}

async function callOpenAI(options, config) {
  if (!config.openai_api_key) {
    throw new Error('OpenAI API key not configured');
  }

  const openai = new OpenAI({ apiKey: config.openai_api_key });
  
  const response = await openai.chat.completions.create({
    model: config.openai_model,
    messages: options.messages,
    temperature: options.temperature ?? 0.7,
    ...(options.max_tokens && { max_tokens: options.max_tokens }),
  });

  return response.choices[0]?.message?.content || '';
}

export async function chatCompletion(options, pool) {
  const config = await getProviderConfig(pool);
  
  console.log(`Using AI provider: ${config.provider}`);
  
  switch (config.provider) {
    case 'ollama':
      return callOllama(options, config);
    
    case 'openai':
      return callOpenAI(options, config);
    
    default:
      console.warn(`Unknown provider "${config.provider}", falling back to Ollama`);
      return callOllama(options, { ...config, provider: 'ollama' });
  }
}

export async function testConnection(pool, overrides = {}) {
  const baseConfig = await getProviderConfig(pool);
  const config = { ...baseConfig, ...overrides };
  
  try {
    switch (config.provider) {
      case 'ollama': {
        const response = await fetch(`${config.ollama_base_url}/api/tags`);
        if (!response.ok) {
          throw new Error(`Ollama not reachable: ${response.status}`);
        }
        const data = await response.json();
        return {
          success: true,
          provider: 'ollama',
          models: data.models?.map(m => m.name) || [],
          message: `Connected to Ollama with ${data.models?.length || 0} models available`,
        };
      }
      
      case 'openai': {
        if (!config.openai_api_key) {
          throw new Error('OpenAI API key not configured');
        }
        const openai = new OpenAI({ apiKey: config.openai_api_key });
        const models = await openai.models.list();
        return {
          success: true,
          provider: 'openai',
          models: models.data.slice(0, 10).map(m => m.id),
          message: 'Connected to OpenAI successfully',
        };
      }
      
      default:
        throw new Error(`Unknown provider: ${config.provider}`);
    }
  } catch (error) {
    return {
      success: false,
      provider: config.provider,
      error: error.message,
    };
  }
}

export default { chatCompletion, getProviderConfig, testConnection };
