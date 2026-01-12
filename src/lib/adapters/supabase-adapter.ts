// Supabase adapter - wraps the backend client for SaaS mode
//
// IMPORTANT:
// This module must be safe to import even in self-hosted builds.
// Do NOT import the generated integrations/supabase/client here because it eagerly
// constructs a client from build-time env vars.
//
// Instead we use the lazy getSupabaseClient() wrapper which only initializes when used.

import { getSupabaseClient } from '@/lib/supabase';
import type {
  UnifiedClient,
  QueryBuilder,
  AuthClient,
  StorageClient,
  FunctionsClient,
  RpcClient,
  AuthResponse,
  AuthSession,
  AuthUser,
} from './types';

function sb() {
  return getSupabaseClient();
}

// Create a wrapped auth client that matches our unified interface
const wrappedAuth: AuthClient = {
  async signUp(
    email: string,
    password: string,
    options?: {
      emailRedirectTo?: string;
      data?: Record<string, unknown>;
    }
  ): Promise<AuthResponse> {
    const { data, error } = await sb().auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: options?.emailRedirectTo,
        data: options?.data,
      },
    });
    return {
      data: {
        user: data.user as AuthUser | null,
        session: data.session as AuthSession | null,
      },
      error: error as Error | null,
    };
  },

  async signInWithPassword(credentials: { email: string; password: string }): Promise<AuthResponse> {
    const { data, error } = await sb().auth.signInWithPassword(credentials);
    return {
      data: {
        user: data.user as AuthUser | null,
        session: data.session as AuthSession | null,
      },
      error: error as Error | null,
    };
  },

  async signOut(): Promise<{ error: Error | null }> {
    const { error } = await sb().auth.signOut();
    return { error: error as Error | null };
  },

  async getSession(): Promise<{ data: { session: AuthSession | null }; error: Error | null }> {
    const { data, error } = await sb().auth.getSession();
    return {
      data: { session: data.session as AuthSession | null },
      error: error as Error | null,
    };
  },

  async getUser(): Promise<{ data: { user: AuthUser | null }; error: Error | null }> {
    const { data, error } = await sb().auth.getUser();
    return {
      data: { user: data.user as AuthUser | null },
      error: error as Error | null,
    };
  },

  onAuthStateChange(
    callback: (event: string, session: AuthSession | null) => void
  ): {
    data: { subscription: { unsubscribe: () => void } };
  } {
    return sb().auth.onAuthStateChange((event, session) => {
      callback(event, session as AuthSession | null);
    });
  },

  async updateUser(updates: { password?: string; data?: Record<string, unknown> }): Promise<AuthResponse> {
    const { data, error } = await sb().auth.updateUser(updates);
    return {
      data: {
        user: data.user as AuthUser | null,
        session: null,
      },
      error: error as Error | null,
    };
  },

  async resetPasswordForEmail(
    email: string,
    options?: { redirectTo?: string }
  ): Promise<{ error: Error | null }> {
    const { error } = await sb().auth.resetPasswordForEmail(email, options);
    return { error: error as Error | null };
  },
};

// Lazy proxies so we don't touch the client until needed
const storageProxy = new Proxy({} as StorageClient, {
  get(_target, prop) {
    return (sb().storage as unknown as StorageClient)[prop as keyof StorageClient];
  },
});

const functionsProxy = new Proxy({} as FunctionsClient, {
  get(_target, prop) {
    return (sb().functions as unknown as FunctionsClient)[prop as keyof FunctionsClient];
  },
});

// Re-export the client with our unified interface
export const supabaseAdapter: UnifiedClient = {
  from: <T = unknown>(table: string): QueryBuilder<T> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (sb() as any).from(table) as QueryBuilder<T>;
  },
  auth: wrappedAuth,
  storage: storageProxy,
  functions: functionsProxy,
  rpc: (async (functionName: string, params?: Record<string, unknown>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (sb() as any).rpc(functionName, params);
  }) as RpcClient,
};

export default supabaseAdapter;
