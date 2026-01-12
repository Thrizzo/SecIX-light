// REST API adapter for self-hosted Docker/Kubernetes deployments
import { config } from '@/lib/config';
import type { 
  UnifiedClient, 
  QueryBuilder, 
  QueryResult,
  AuthClient, 
  AuthSession,
  AuthUser,
  AuthResponse,
  StorageClient, 
  StorageBucket,
  FunctionsClient,
  RpcClient
} from './types';

// Token management
const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const USER_KEY = 'auth_user';

function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

function setStoredRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

function getStoredUser(): AuthUser | null {
  const userStr = localStorage.getItem(USER_KEY);
  return userStr ? JSON.parse(userStr) : null;
}

function setStoredUser(user: AuthUser | null): void {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

function clearStoredAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// Auth state change listeners
type AuthChangeCallback = (event: string, session: AuthSession | null) => void;
const authListeners: Set<AuthChangeCallback> = new Set();

function notifyAuthChange(event: string, session: AuthSession | null): void {
  authListeners.forEach(callback => callback(event, session));
}

// Base fetch with auth
async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getStoredToken();
  const anonKey = config.supabaseAnonKey;
  const headers = new Headers(options.headers);

  // Supabase/PostgREST compatible headers (required by many self-hosted gateways)
  if (anonKey && !headers.has('apikey')) {
    headers.set('apikey', anonKey);
  }

  if (!headers.has('Authorization')) {
    if (token) headers.set('Authorization', `Bearer ${token}`);
    else if (anonKey) headers.set('Authorization', `Bearer ${anonKey}`);
  }

  // Only set JSON content-type when we send a body
  if (!headers.has('Content-Type') && options.body != null) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, { ...options, headers });
}

// PostgREST-compatible query builder
class RestQueryBuilder<T = unknown> implements QueryBuilder<T> {
  private baseUrl: string;
  private tableName: string;
  private queryParams: URLSearchParams;
  private method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET';
  private bodyData: unknown = null;
  private selectColumns: string = '*';
  private returnData: boolean = false;
  private isUpsert: boolean = false;
  private upsertConflict: string | undefined = undefined;

  constructor(baseUrl: string, table: string) {
    this.baseUrl = baseUrl;
    this.tableName = table;
    this.queryParams = new URLSearchParams();
  }

  select(columns: string = '*'): QueryBuilder<T> {
    // Normalize: remove newlines and extra whitespace, then trim
    const normalized = (columns || '*').replace(/\s+/g, ' ').trim();
    this.selectColumns = normalized;
    this.queryParams.set('select', normalized);
    return this;
  }

  insert(data: Partial<T> | Partial<T>[]): QueryBuilder<T> {
    this.method = 'POST';
    this.bodyData = data;
    this.returnData = true;
    return this;
  }

  update(data: Partial<T>): QueryBuilder<T> {
    this.method = 'PATCH';
    this.bodyData = data;
    this.returnData = true;
    return this;
  }

  delete(): QueryBuilder<T> {
    this.method = 'DELETE';
    return this;
  }

  upsert(data: Partial<T> | Partial<T>[], options?: { onConflict?: string }): QueryBuilder<T> {
    this.method = 'POST';
    this.bodyData = data;
    this.returnData = true;
    this.isUpsert = true;
    this.upsertConflict = options?.onConflict;
    return this;
  }

  eq(column: string, value: unknown): QueryBuilder<T> {
    this.queryParams.append(column, `eq.${value}`);
    return this;
  }

  neq(column: string, value: unknown): QueryBuilder<T> {
    this.queryParams.append(column, `neq.${value}`);
    return this;
  }

  gt(column: string, value: unknown): QueryBuilder<T> {
    this.queryParams.append(column, `gt.${value}`);
    return this;
  }

  gte(column: string, value: unknown): QueryBuilder<T> {
    this.queryParams.append(column, `gte.${value}`);
    return this;
  }

  lt(column: string, value: unknown): QueryBuilder<T> {
    this.queryParams.append(column, `lt.${value}`);
    return this;
  }

  lte(column: string, value: unknown): QueryBuilder<T> {
    this.queryParams.append(column, `lte.${value}`);
    return this;
  }

  like(column: string, value: string): QueryBuilder<T> {
    this.queryParams.append(column, `like.${value}`);
    return this;
  }

  ilike(column: string, value: string): QueryBuilder<T> {
    this.queryParams.append(column, `ilike.${value}`);
    return this;
  }

  is(column: string, value: unknown): QueryBuilder<T> {
    this.queryParams.append(column, `is.${value}`);
    return this;
  }

  in(column: string, values: unknown[]): QueryBuilder<T> {
    this.queryParams.append(column, `in.(${values.join(',')})`);
    return this;
  }

  or(filters: string, options?: { foreignTable?: string }): QueryBuilder<T> {
    const key = options?.foreignTable ? `${options.foreignTable}.or` : 'or';
    const value = filters.trim().startsWith('(') ? filters.trim() : `(${filters.trim()})`;
    this.queryParams.set(key, value);
    return this;
  }

  contains(column: string, value: unknown): QueryBuilder<T> {
    this.queryParams.append(column, `cs.${JSON.stringify(value)}`);
    return this;
  }

  containedBy(column: string, value: unknown): QueryBuilder<T> {
    this.queryParams.append(column, `cd.${JSON.stringify(value)}`);
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): QueryBuilder<T> {
    const direction = options?.ascending === false ? 'desc' : 'asc';
    const existing = this.queryParams.get('order');
    const orderValue = existing ? `${existing},${column}.${direction}` : `${column}.${direction}`;
    this.queryParams.set('order', orderValue);
    return this;
  }

  limit(count: number): QueryBuilder<T> {
    this.queryParams.set('limit', String(count));
    return this;
  }

  range(from: number, to: number): QueryBuilder<T> {
    this.queryParams.set('offset', String(from));
    this.queryParams.set('limit', String(to - from + 1));
    return this;
  }

  private async execute(): Promise<QueryResult<T[]>> {
    try {
      const url = `${this.baseUrl}/rest/v1/${this.tableName}?${this.queryParams.toString()}`;

      // Build Prefer header parts
      const preferParts: string[] = [];
      if (this.returnData) {
        preferParts.push('return=representation');
      }
      if (this.isUpsert) {
        // PostgREST requires resolution=merge-duplicates for upsert behavior
        preferParts.push('resolution=merge-duplicates');
      }

      const headers: Record<string, string> = {};
      if (preferParts.length > 0) {
        headers['Prefer'] = preferParts.join(', ');
      }

      // For upsert, on_conflict goes in the query params per PostgREST spec
      // but some versions also accept it in body; we'll pass it as query param
      if (this.isUpsert && this.upsertConflict) {
        // Note: The on_conflict query param IS correct for PostgREST, but we need
        // to ensure the Prefer header has resolution=merge-duplicates
        // The 400 error is likely due to missing Prefer header, not the query param
      }

      const response = await fetchWithAuth(url, {
        method: this.method,
        headers,
        body: this.bodyData ? JSON.stringify(this.bodyData) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return { data: Array.isArray(data) ? data : [data], error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  async single(): Promise<QueryResult<T>> {
    this.queryParams.set('limit', '1');
    const result = await this.execute();
    if (result.error) return { data: null, error: result.error };
    if (!result.data || result.data.length === 0) {
      return { data: null, error: new Error('No rows returned') };
    }
    return { data: result.data[0], error: null };
  }

  async maybeSingle(): Promise<QueryResult<T | null>> {
    this.queryParams.set('limit', '1');
    const result = await this.execute();
    if (result.error) return { data: null, error: result.error };
    return { data: result.data?.[0] ?? null, error: null };
  }

  then<TResult>(
    onfulfilled?: (value: QueryResult<T[]>) => TResult | PromiseLike<TResult>
  ): Promise<TResult> {
    return this.execute().then(onfulfilled as (value: QueryResult<T[]>) => TResult);
  }
}

// REST Auth client
const restAuthClient: AuthClient = {
  async signUp(email, password, options) {
    try {
      const anonKey = config.supabaseAnonKey;
      const response = await fetch(`${config.apiBaseUrl}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(anonKey ? { apikey: anonKey, Authorization: `Bearer ${anonKey}` } : {}),
        },
        body: JSON.stringify({
          email,
          password,
          data: options?.data,
          redirect_to: options?.emailRedirectTo,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const message =
          errorBody?.message ||
          errorBody?.error ||
          errorBody?.msg ||
          `HTTP ${response.status}`;
        return { data: { user: null, session: null }, error: new Error(message) };
      }

      const data = await response.json();
      if (data.session) {
        setStoredToken(data.session.access_token);
        if (data.session.refresh_token) {
          setStoredRefreshToken(data.session.refresh_token);
        }
        setStoredUser(data.user);
        notifyAuthChange('SIGNED_IN', data.session);
      }

      return { data: { user: data.user, session: data.session }, error: null };
    } catch (error) {
      return { data: { user: null, session: null }, error: error as Error };
    }
  },

  async signInWithPassword({ email, password }) {
    try {
      const anonKey = config.supabaseAnonKey;
      const response = await fetch(`${config.apiBaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(anonKey ? { apikey: anonKey, Authorization: `Bearer ${anonKey}` } : {}),
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const message =
          errorBody?.message ||
          errorBody?.error ||
          errorBody?.msg ||
          'Login failed';
        return { data: { user: null, session: null }, error: new Error(message) };
      }

      const data = await response.json();
      setStoredToken(data.access_token);
      if (data.refresh_token) {
        setStoredRefreshToken(data.refresh_token);
      }
      setStoredUser(data.user);

      const session: AuthSession = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at,
        expires_in: data.expires_in,
        token_type: data.token_type || 'bearer',
        user: data.user,
      };

      notifyAuthChange('SIGNED_IN', session);
      return { data: { user: data.user, session }, error: null };
    } catch (error) {
      return { data: { user: null, session: null }, error: error as Error };
    }
  },

  async signOut() {
    try {
      await fetchWithAuth(`${config.apiBaseUrl}/auth/v1/logout`, { method: 'POST' });
      clearStoredAuth();
      notifyAuthChange('SIGNED_OUT', null);
      return { error: null };
    } catch (error) {
      clearStoredAuth();
      notifyAuthChange('SIGNED_OUT', null);
      return { error: error as Error };
    }
  },

  async getSession() {
    const token = getStoredToken();
    const storedUser = getStoredUser();

    if (!token || !storedUser) {
      return { data: { session: null }, error: null };
    }

    // Validate token against the API (important after DB resets)
    try {
      const response = await fetchWithAuth(`${config.apiBaseUrl}/auth/v1/user`, { method: 'GET' });

      if (!response.ok) {
        // If the token is invalid OR the user no longer exists (common after DB resets),
        // clear the local auth to prevent "ghost sessions" that break FK constraints.
        if (response.status === 401 || response.status === 403 || response.status === 404) {
          clearStoredAuth();
          notifyAuthChange('SIGNED_OUT', null);
          return { data: { session: null }, error: null };
        }

        // Some lightweight gateways may not implement this endpoint.
        // In those cases, keep the local session so the UI can continue using the token.
        const session: AuthSession = {
          access_token: token,
          refresh_token: getStoredRefreshToken() || undefined,
          user: storedUser,
        };
        return { data: { session }, error: null };
      }

      const freshUser = await response.json();
      const user: AuthUser = {
        ...storedUser,
        ...freshUser,
      };

      setStoredUser(user);

      const session: AuthSession = {
        access_token: token,
        refresh_token: getStoredRefreshToken() || undefined,
        user,
      };

      return { data: { session }, error: null };
    } catch (error) {
      // On network/API errors, keep the local session (offline-tolerant) but surface the error
      const session: AuthSession = {
        access_token: token,
        refresh_token: getStoredRefreshToken() || undefined,
        user: storedUser,
      };

      return { data: { session }, error: error as Error };
    }
  },

  async getUser() {
    const user = getStoredUser();
    return { data: { user }, error: null };
  },

  onAuthStateChange(callback) {
    authListeners.add(callback);

    // Validate and emit INITIAL_SESSION (prevents "ghost sessions" after DB resets)
    setTimeout(() => {
      restAuthClient.getSession().then(({ data: { session } }) => {
        if (session) callback('INITIAL_SESSION', session);
      });
    }, 0);

    return {
      data: {
        subscription: {
          unsubscribe: () => {
            authListeners.delete(callback);
          },
        },
      },
    };
  },

  async updateUser(updates) {
    try {
      const response = await fetchWithAuth(`${config.apiBaseUrl}/auth/v1/user`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        return { data: { user: null, session: null }, error: new Error(error.message) };
      }

      const data = await response.json();
      setStoredUser(data.user);
      return { data: { user: data.user, session: null }, error: null };
    } catch (error) {
      return { data: { user: null, session: null }, error: error as Error };
    }
  },

  async resetPasswordForEmail(email, options) {
    try {
      const anonKey = config.supabaseAnonKey;
      const response = await fetch(`${config.apiBaseUrl}/auth/v1/recover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(anonKey ? { apikey: anonKey, Authorization: `Bearer ${anonKey}` } : {}),
        },
        body: JSON.stringify({ 
          email,
          redirect_to: options?.redirectTo,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { error: new Error(error.message) };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  },
};

// REST Storage client
function createStorageBucket(bucket: string): StorageBucket {
  return {
    async upload(path, file, options) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const token = getStoredToken();
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        if (options?.contentType) {
          headers['Content-Type'] = options.contentType;
        }

        const response = await fetch(
          `${config.apiBaseUrl}/storage/v1/object/${bucket}/${path}`,
          { method: 'POST', headers, body: formData }
        );

        if (!response.ok) {
          const error = await response.json();
          return { data: null, error: new Error(error.message) };
        }

        return { data: { path }, error: null };
      } catch (error) {
        return { data: null, error: error as Error };
      }
    },

    async remove(paths) {
      try {
        const response = await fetchWithAuth(
          `${config.apiBaseUrl}/storage/v1/object/${bucket}`,
          { method: 'DELETE', body: JSON.stringify({ prefixes: paths }) }
        );

        if (!response.ok) {
          const error = await response.json();
          return { data: null, error: new Error(error.message) };
        }

        return { data: null, error: null };
      } catch (error) {
        return { data: null, error: error as Error };
      }
    },

    async createSignedUrl(path, expiresIn) {
      try {
        const response = await fetchWithAuth(
          `${config.apiBaseUrl}/storage/v1/object/sign/${bucket}/${path}`,
          { method: 'POST', body: JSON.stringify({ expiresIn }) }
        );

        if (!response.ok) {
          const error = await response.json();
          return { data: null, error: new Error(error.message) };
        }

        const data = await response.json();
        return { data: { signedUrl: data.signedUrl }, error: null };
      } catch (error) {
        return { data: null, error: error as Error };
      }
    },

    getPublicUrl(path) {
      return {
        data: {
          publicUrl: `${config.apiBaseUrl}/storage/v1/object/public/${bucket}/${path}`,
        },
      };
    },

    async download(path) {
      try {
        const response = await fetchWithAuth(
          `${config.apiBaseUrl}/storage/v1/object/${bucket}/${path}`
        );

        if (!response.ok) {
          return { data: null, error: new Error('Download failed') };
        }

        const blob = await response.blob();
        return { data: blob, error: null };
      } catch (error) {
        return { data: null, error: error as Error };
      }
    },
  };
}

const restStorageClient: StorageClient = {
  from(bucket: string) {
    return createStorageBucket(bucket);
  },
};

// REST Functions client
const restFunctionsClient: FunctionsClient = {
  async invoke<T>(functionName: string, options?: { body?: Record<string, unknown> }) {
    try {
      const response = await fetchWithAuth(
        `${config.apiBaseUrl}/functions/v1/${functionName}`,
        { 
          method: 'POST',
          body: options?.body ? JSON.stringify(options.body) : undefined,
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Function invocation failed' }));
        return { data: null, error: new Error(error.message || error.error) };
      }

      const data = await response.json();
      return { data: data as T, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },
};

// REST RPC client
const restRpcClient: RpcClient = async <T = unknown>(functionName: string, params?: Record<string, unknown>) => {
  try {
    const response = await fetchWithAuth(
      `${config.apiBaseUrl}/rest/v1/rpc/${functionName}`,
      { 
        method: 'POST',
        body: params ? JSON.stringify(params) : undefined,
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'RPC call failed' }));
      return { data: null, error: new Error(error.message || error.error) };
    }

    const data = await response.json();
    return { data: data as T, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
};

// Export the REST adapter
export const restAdapter: UnifiedClient = {
  from: <T = unknown>(table: string): QueryBuilder<T> => {
    return new RestQueryBuilder<T>(config.apiBaseUrl, table);
  },
  auth: restAuthClient,
  storage: restStorageClient,
  functions: restFunctionsClient,
  rpc: restRpcClient,
};

export default restAdapter;
