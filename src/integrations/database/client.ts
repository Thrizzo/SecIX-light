// Unified database client - switches between backend adapters based on deployment mode
//
// Key rule: NEVER use CommonJS `require()` in the browser (Vite builds are ESM).
//
// We statically import both adapters, but the Supabase adapter is now safe to import
// even in self-hosted builds because it lazily initializes the backend client only
// when actually used.

import { config } from '@/lib/config';
import type { UnifiedClient } from '@/lib/adapters/types';
import { supabaseAdapter } from '@/lib/adapters/supabase-adapter';
import { restAdapter } from '@/lib/adapters/rest-adapter';

export const db: UnifiedClient = config.isSelfHosted() ? restAdapter : supabaseAdapter;

// Alias for backward compatibility with components that import 'supabase'
export const supabase = db;

// Re-export types for convenience
export type {
  UnifiedClient,
  QueryBuilder,
  QueryResult,
  AuthClient,
  AuthUser,
  AuthSession,
  AuthResponse,
  StorageClient,
  StorageBucket,
  FunctionsClient,
} from '@/lib/adapters/types';

export default db;

