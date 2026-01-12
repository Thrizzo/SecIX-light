// Configuration helper for multi-deployment support

export type DeploymentMode = 'saas' | 'docker' | 'kubernetes';

type RuntimeConfig = {
  API_URL?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  EDITION?: string;
};

declare global {
  interface Window {
    __RUNTIME_CONFIG__?: RuntimeConfig;
  }
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

function readRuntimeConfig(): RuntimeConfig | null {
  try {
    const rc = window.__RUNTIME_CONFIG__;
    if (!rc) return null;

    // Ignore docker placeholder values like "__RUNTIME_API_URL__"
    const apiUrl = rc.API_URL;
    const safeApiUrl = apiUrl && !apiUrl.includes('__RUNTIME_') ? apiUrl : undefined;

    const supabaseUrl = rc.SUPABASE_URL;
    const safeSupabaseUrl = supabaseUrl && !supabaseUrl.includes('__RUNTIME_') ? supabaseUrl : undefined;

    const anonKey = rc.SUPABASE_ANON_KEY;
    const safeAnonKey = anonKey && !anonKey.includes('__RUNTIME_') ? anonKey : undefined;

    return {
      API_URL: safeApiUrl,
      SUPABASE_URL: safeSupabaseUrl,
      SUPABASE_ANON_KEY: safeAnonKey,
    };
  } catch {
    return null;
  }
}

export const config = {
  // Deployment mode detection
  get deploymentMode(): DeploymentMode {
    // Prefer runtime config so Docker images can be built once and configured at runtime.
    const runtime = typeof window !== 'undefined' ? readRuntimeConfig() : null;
    if (runtime?.API_URL) return 'docker';

    const mode = import.meta.env.VITE_DEPLOYMENT_MODE || 'saas';
    return mode as DeploymentMode;
  },

  // API base URL for self-hosted mode
  get apiBaseUrl(): string {
    const runtime = typeof window !== 'undefined' ? readRuntimeConfig() : null;

    if (this.isSelfHosted() && runtime?.API_URL) {
      return normalizeBaseUrl(runtime.API_URL);
    }

    const envUrl = import.meta.env.VITE_API_BASE_URL || '';

    // In Docker/K8s production images, the frontend is typically served by Nginx
    // and the backend is exposed via a same-origin reverse proxy at /api.
    // Prefer /api in that scenario to avoid hard-coding host/ports and CORS.
    if (this.isSelfHosted() && typeof window !== 'undefined') {
      const port = window.location.port;
      const isDefaultPort = port === '' || port === '80' || port === '443';
      if (isDefaultPort && envUrl.startsWith('http')) {
        return '/api';
      }
    }

    if (envUrl) return normalizeBaseUrl(envUrl);

    // When running behind the provided Nginx config, the backend is exposed on /api
    return this.isSelfHosted() ? '/api' : '';
  },

  // Supabase configuration (SaaS mode)
  get supabaseUrl(): string {
    const runtime = typeof window !== 'undefined' ? readRuntimeConfig() : null;
    const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
    return normalizeBaseUrl(runtime?.SUPABASE_URL || envUrl);
  },
  get supabaseAnonKey(): string {
    const runtime = typeof window !== 'undefined' ? readRuntimeConfig() : null;
    return runtime?.SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
  },
  get supabaseProjectId(): string {
    return import.meta.env.VITE_SUPABASE_PROJECT_ID || '';
  },

  // Helper methods
  isSaas(): boolean {
    return this.deploymentMode === 'saas';
  },
  isSelfHosted(): boolean {
    return this.deploymentMode === 'docker' || this.deploymentMode === 'kubernetes';
  },
  isDocker(): boolean {
    return this.deploymentMode === 'docker';
  },
  isKubernetes(): boolean {
    return this.deploymentMode === 'kubernetes';
  },
};
