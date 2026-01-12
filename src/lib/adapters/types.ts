// Shared types for database adapters

export interface QueryResult<T> {
  data: T | null;
  error: Error | null;
  count?: number | null;
}

export interface QueryBuilder<T = unknown> {
  select(columns?: string): QueryBuilder<T>;
  insert(data: Partial<T> | Partial<T>[]): QueryBuilder<T>;
  update(data: Partial<T>): QueryBuilder<T>;
  delete(): QueryBuilder<T>;
  upsert(data: Partial<T> | Partial<T>[], options?: { onConflict?: string }): QueryBuilder<T>;
  eq(column: string, value: unknown): QueryBuilder<T>;
  neq(column: string, value: unknown): QueryBuilder<T>;
  gt(column: string, value: unknown): QueryBuilder<T>;
  gte(column: string, value: unknown): QueryBuilder<T>;
  lt(column: string, value: unknown): QueryBuilder<T>;
  lte(column: string, value: unknown): QueryBuilder<T>;
  like(column: string, value: string): QueryBuilder<T>;
  ilike(column: string, value: string): QueryBuilder<T>;
  is(column: string, value: unknown): QueryBuilder<T>;
  in(column: string, values: unknown[]): QueryBuilder<T>;
  /**
   * PostgREST OR filter helper.
   * Example: .or('owner_id.eq.123,assigned_to.eq.123')
   */
  or(filters: string, options?: { foreignTable?: string }): QueryBuilder<T>;
  contains(column: string, value: unknown): QueryBuilder<T>;
  containedBy(column: string, value: unknown): QueryBuilder<T>;
  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }): QueryBuilder<T>;
  limit(count: number): QueryBuilder<T>;
  range(from: number, to: number): QueryBuilder<T>;
  single(): Promise<QueryResult<T>>;
  maybeSingle(): Promise<QueryResult<T | null>>;
  then<TResult>(onfulfilled?: (value: QueryResult<T[]>) => TResult | PromiseLike<TResult>): Promise<TResult>;
}

export interface DbClient {
  from<T = unknown>(table: string): QueryBuilder<T>;
}

export interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
  created_at?: string;
}

export interface AuthSession {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
  token_type?: string;
  user: AuthUser;
}

export interface AuthResponse {
  data: {
    user: AuthUser | null;
    session: AuthSession | null;
  };
  error: Error | null;
}

export interface AuthClient {
  signUp(email: string, password: string, options?: { 
    emailRedirectTo?: string; 
    data?: Record<string, unknown>;
  }): Promise<AuthResponse>;
  signInWithPassword(credentials: { email: string; password: string }): Promise<AuthResponse>;
  signOut(): Promise<{ error: Error | null }>;
  getSession(): Promise<{ data: { session: AuthSession | null }; error: Error | null }>;
  getUser(): Promise<{ data: { user: AuthUser | null }; error: Error | null }>;
  onAuthStateChange(callback: (event: string, session: AuthSession | null) => void): { 
    data: { subscription: { unsubscribe: () => void } } 
  };
  updateUser(updates: { password?: string; data?: Record<string, unknown> }): Promise<AuthResponse>;
  resetPasswordForEmail(email: string, options?: { redirectTo?: string }): Promise<{ error: Error | null }>;
}

export interface StorageBucket {
  upload(path: string, file: File | Blob, options?: { contentType?: string; upsert?: boolean }): Promise<{ data: { path: string } | null; error: Error | null }>;
  remove(paths: string[]): Promise<{ data: unknown | null; error: Error | null }>;
  createSignedUrl(path: string, expiresIn: number): Promise<{ data: { signedUrl: string } | null; error: Error | null }>;
  getPublicUrl(path: string): { data: { publicUrl: string } };
  download(path: string): Promise<{ data: Blob | null; error: Error | null }>;
}

export interface StorageClient {
  from(bucket: string): StorageBucket;
}

export interface FunctionsClient {
  invoke<T = unknown>(functionName: string, options?: { body?: Record<string, unknown> }): Promise<{ data: T | null; error: Error | null }>;
}

export interface RpcClient {
  <T = unknown>(functionName: string, params?: Record<string, unknown>): Promise<{ data: T | null; error: Error | null }>;
}

export interface UnifiedClient {
  from<T = unknown>(table: string): QueryBuilder<T>;
  auth: AuthClient;
  storage: StorageClient;
  functions: FunctionsClient;
  rpc: RpcClient;
}
