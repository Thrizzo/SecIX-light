// Supabase client wrapper that supports Docker runtime configuration
// Use this instead of directly importing from @/integrations/supabase/client when you need Docker support

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { config } from './config';

let supabaseInstance: SupabaseClient<Database> | null = null;

/**
 * Get the Supabase client instance.
 * This supports both Vite dev mode (import.meta.env) and Docker runtime config.
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const url = config.supabaseUrl;
  const key = config.supabaseAnonKey;

  if (!url || !key) {
    console.error('Supabase configuration missing. URL:', !!url, 'Key:', !!key);
    throw new Error('Supabase URL and/or anon key not configured');
  }

  supabaseInstance = createClient<Database>(url, key, {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return supabaseInstance;
}

// For backward compatibility, also export a lazy-initialized client
// This allows imports to work, but will throw if config is missing
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_, prop) {
    return getSupabaseClient()[prop as keyof SupabaseClient<Database>];
  },
});
