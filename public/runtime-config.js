// Runtime configuration for Docker/self-hosted deployments
// This file is replaced at runtime by docker-entrypoint.sh with actual values
window.__RUNTIME_CONFIG__ = {
  SUPABASE_URL: '__RUNTIME_SUPABASE_URL__',
  SUPABASE_ANON_KEY: '__RUNTIME_SUPABASE_ANON_KEY__',
  API_URL: '__RUNTIME_API_URL__'
};
