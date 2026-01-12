/**
 * SecIX Light API Server
 * Express server for self-hosted deployments
 * Mimics Supabase Edge Functions API for compatibility
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import pg from 'pg';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

// Configuration
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret';
const DATABASE_URL = process.env.DATABASE_URL;
const STORAGE_PATH = process.env.STORAGE_PATH || path.join(__dirname, '../storage');
const IS_DEV = process.env.NODE_ENV !== 'production';

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_PATH)) {
  fs.mkdirSync(STORAGE_PATH, { recursive: true });
}

// Database pool with optimized settings
const useDbSsl =
  process.env.DATABASE_SSL === 'true' ||
  process.env.PGSSLMODE === 'require' ||
  process.env.PGSSLMODE === 'verify-full' ||
  process.env.PGSSLMODE === 'verify-ca';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: useDbSsl ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL = 60000;

function getCached(key) {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expires) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key, data, ttl = CACHE_TTL) {
  cache.set(key, { data, expires: Date.now() + ttl });
}

const COLUMN_TYPES_TTL = 5 * 60 * 1000;

async function getPublicColumnTypes(table) {
  const cacheKey = `coltypes:${table}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const result = await pool.query(
    `SELECT column_name, data_type, udt_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [table]
  );

  const map = new Map(
    result.rows.map((r) => [r.column_name, { data_type: r.data_type, udt_name: r.udt_name }])
  );

  setCache(cacheKey, map, COLUMN_TYPES_TTL);
  return map;
}

// Express app
const app = express();
app.set('etag', false);

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const bucket = req.params.bucket || 'default';
    const bucketPath = path.join(STORAGE_PATH, bucket);
    if (!fs.existsSync(bucketPath)) {
      fs.mkdirSync(bucketPath, { recursive: true });
    }
    cb(null, bucketPath);
  },
  filename: (req, file, cb) => {
    const filePath = req.params[0] || `${Date.now()}-${file.originalname}`;
    const dir = path.dirname(path.join(STORAGE_PATH, req.params.bucket, filePath));
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, path.basename(filePath));
  }
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Auth middleware
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      // Ignore invalid tokens for optional auth
    }
  }
  next();
};

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', timestamp: new Date().toISOString(), database: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', timestamp: new Date().toISOString(), database: 'disconnected' });
  }
});

// ============ AUTH ENDPOINTS ============

// Signup
app.post('/auth/v1/signup', async (req, res) => {
  const { email, password, data: userData } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ message: 'Email is required', error: 'Email is required' });
  }
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ message: 'Password is required', error: 'Password is required' });
  }

  try {
    const existing = await pool.query('SELECT id FROM auth.users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'User already registered', error: 'User already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO auth.users (email, encrypted_password, raw_user_meta_data) 
       VALUES ($1, $2, $3::jsonb) 
       RETURNING id, email, created_at, raw_user_meta_data`,
      [email, hashedPassword, JSON.stringify(userData || {})]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { sub: user.id, email: user.email, role: 'authenticated' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    const refreshToken = jwt.sign(
      { sub: user.id, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Create profile
    await pool.query(
      `INSERT INTO public.profiles (user_id, email, full_name) VALUES ($1, $2, $3)`,
      [user.id, user.email, userData?.full_name || user.email]
    );

    // Assign role - first user gets admin, others get user
    const existingRoles = await pool.query('SELECT 1 FROM public.user_roles LIMIT 1');
    const role = existingRoles.rows.length === 0 ? 'admin' : 'user';
    await pool.query(
      `INSERT INTO public.user_roles (user_id, role) VALUES ($1, $2)`,
      [user.id, role]
    );

    res.json({
      access_token: token,
      refresh_token: refreshToken,
      token_type: 'bearer',
      expires_in: 604800,
      user: {
        id: user.id,
        email: user.email,
        user_metadata: userData || {},
        app_metadata: {},
        created_at: user.created_at,
      },
      session: {
        access_token: token,
        refresh_token: refreshToken,
        user: { id: user.id, email: user.email },
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    const msg = error?.message || 'Signup failed';
    res.status(400).json({ message: msg, error: msg });
  }
});

// Login
app.post('/auth/v1/token', async (req, res) => {
  const { email, password, grant_type } = req.body;
  
  if (grant_type === 'refresh_token' && req.body.refresh_token) {
    try {
      const decoded = jwt.verify(req.body.refresh_token, JWT_SECRET);
      const result = await pool.query('SELECT * FROM auth.users WHERE id = $1', [decoded.sub]);
      
      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'User not found' });
      }
      
      const user = result.rows[0];
      const token = jwt.sign(
        { sub: user.id, email: user.email, role: 'authenticated' }, 
        JWT_SECRET, 
        { expiresIn: '7d' }
      );
      
      return res.json({
        access_token: token,
        refresh_token: req.body.refresh_token,
        token_type: 'bearer',
        expires_in: 604800,
        user: { id: user.id, email: user.email },
      });
    } catch (error) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
  }
  
  try {
    const result = await pool.query('SELECT * FROM auth.users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.encrypted_password);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { sub: user.id, email: user.email, role: 'authenticated' }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );
    const refreshToken = jwt.sign(
      { sub: user.id, type: 'refresh' }, 
      JWT_SECRET, 
      { expiresIn: '30d' }
    );
    
    res.json({
      access_token: token,
      refresh_token: refreshToken,
      token_type: 'bearer',
      expires_in: 604800,
      expires_at: Math.floor(Date.now() / 1000) + 604800,
      user: { 
        id: user.id, 
        email: user.email,
        user_metadata: user.raw_user_meta_data || {},
        app_metadata: user.raw_app_meta_data || {},
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Logout
app.post('/auth/v1/logout', authenticate, (req, res) => {
  res.json({ success: true });
});

// Get current user
app.get('/auth/v1/user', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, created_at, raw_user_meta_data FROM auth.users WHERE id = $1',
      [req.user.sub]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      user_metadata: user.raw_user_meta_data || {},
      created_at: user.created_at,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update user
app.put('/auth/v1/user', authenticate, async (req, res) => {
  const { password, data } = req.body;
  
  try {
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.query(
        'UPDATE auth.users SET encrypted_password = $1 WHERE id = $2',
        [hashedPassword, req.user.sub]
      );
    }
    
    if (data) {
      await pool.query(
        'UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || $1 WHERE id = $2',
        [JSON.stringify(data), req.user.sub]
      );
    }
    
    const result = await pool.query(
      'SELECT id, email, raw_user_meta_data FROM auth.users WHERE id = $1',
      [req.user.sub]
    );
    
    res.json({ user: result.rows[0] });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Password recovery
app.post('/auth/v1/recover', async (req, res) => {
  const { email } = req.body;
  console.log(`Password recovery requested for: ${email}`);
  res.json({ success: true, message: 'If the email exists, a recovery link has been sent' });
});

// ============ STORAGE ENDPOINTS ============

app.post('/storage/v1/object/:bucket/*', authenticate, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const filePath = req.params[0] || req.file.filename;
  res.json({ 
    Key: filePath,
    path: filePath,
  });
});

app.get('/storage/v1/object/:bucket/*', optionalAuth, (req, res) => {
  const bucket = req.params.bucket;
  const filePath = req.params[0];
  const fullPath = path.join(STORAGE_PATH, bucket, filePath);
  
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  res.sendFile(fullPath);
});

app.get('/storage/v1/object/public/:bucket/*', (req, res) => {
  const bucket = req.params.bucket;
  const filePath = req.params[0];
  const fullPath = path.join(STORAGE_PATH, bucket, filePath);
  
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  res.sendFile(fullPath);
});

app.post('/storage/v1/object/sign/:bucket/*', authenticate, (req, res) => {
  const bucket = req.params.bucket;
  const filePath = req.params[0];
  const { expiresIn = 3600 } = req.body;
  
  const signedToken = jwt.sign(
    { bucket, path: filePath, type: 'storage' },
    JWT_SECRET,
    { expiresIn }
  );
  
  const signedUrl = `${req.protocol}://${req.get('host')}/storage/v1/object/signed/${bucket}/${filePath}?token=${signedToken}`;
  
  res.json({ signedUrl });
});

app.get('/storage/v1/object/signed/:bucket/*', (req, res) => {
  const { token } = req.query;
  
  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const fullPath = path.join(STORAGE_PATH, decoded.bucket, decoded.path);
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.sendFile(fullPath);
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

app.delete('/storage/v1/object/:bucket', authenticate, (req, res) => {
  const bucket = req.params.bucket;
  const { prefixes } = req.body;
  
  try {
    for (const prefix of prefixes) {
      const fullPath = path.join(STORAGE_PATH, bucket, prefix);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============ REST API (PostgREST-compatible) ============

const FK_TO_TABLE_MAP = {
  'primary_asset_id': 'primary_assets',
  'secondary_asset_id': 'secondary_assets',
  'business_unit_id': 'business_units',
  'framework_id': 'control_frameworks',
  'framework_control_id': 'framework_controls',
  'internal_control_id': 'internal_controls',
  'risk_id': 'risks',
  'vendor_id': 'vendors',
  'risk_appetite_id': 'risk_appetites',
  'confidentiality_level_id': 'confidentiality_levels',
  'owner_id': 'profiles',
  'assigned_to': 'profiles',
  'created_by': 'profiles',
  'approved_by': 'profiles',
  'bia_owner': 'profiles',
  'threat_source_id': 'threat_sources',
  'threat_event_id': 'threat_events',
  'source_info_id': 'threat_info_sources',
  'impact_level_id': 'matrix_impact_levels',
  'likelihood_level_id': 'matrix_likelihood_levels',
  'connection_id': 'data_forge_connections',
  'endpoint_id': 'data_forge_connection_endpoints',
  'job_id': 'data_forge_jobs',
  'finding_id': 'control_findings',
  'poam_id': 'finding_poams',
  'evidence_id': 'evidence_items',
  'governance_person_id': 'governance_people',
  'ai_asset_details_id': 'ai_asset_details',
};

const REVERSE_FK_MAP = {
  'threat_source_adversarial_profiles': 'threat_source_id',
  'threat_source_nonadversarial_profiles': 'threat_source_id',
  'ai_use_cases': 'ai_asset_details_id',
  'bia_impact_timeline': 'bia_assessment_id',
  'continuity_plans': 'primary_asset_id',
  'finding_milestones': 'finding_id',
  'finding_poams': 'finding_id',
  'risk_treatments': 'risk_id',
  'treatment_milestones': 'treatment_id',
  'evidence_control_links': 'evidence_id',
  'control_import_mappings': 'job_id',
  'control_import_staging_rows': 'job_id',
  'data_forge_mappings': 'job_id',
  'data_forge_staging_rows': 'job_id',
  'data_forge_connection_endpoints': 'connection_id',
  'data_forge_connection_secrets': 'connection_id',
  // Internal Controls
  'internal_control_framework_map': 'internal_control_id',
  'internal_control_asset_links': 'internal_control_id',
  'risk_control_links': 'internal_control_id',
  'control_findings': 'internal_control_id',
};

function parseFilters(query, table) {
  const conditions = [];
  const params = [];
  let paramIndex = 1;
  
  for (const [key, value] of Object.entries(query)) {
    if (['select', 'limit', 'offset', 'order', 'on_conflict'].includes(key)) continue;
    
    const match = String(value).match(/^(eq|neq|gt|gte|lt|lte|like|ilike|is|in|cs|cd)\.(.+)$/);
    if (match) {
      const [, operator, val] = match;
      switch (operator) {
        case 'eq':
          conditions.push(`"${table}"."${key}" = $${paramIndex++}`);
          params.push(val);
          break;
        case 'neq':
          conditions.push(`"${table}"."${key}" != $${paramIndex++}`);
          params.push(val);
          break;
        case 'gt':
          conditions.push(`"${table}"."${key}" > $${paramIndex++}`);
          params.push(val);
          break;
        case 'gte':
          conditions.push(`"${table}"."${key}" >= $${paramIndex++}`);
          params.push(val);
          break;
        case 'lt':
          conditions.push(`"${table}"."${key}" < $${paramIndex++}`);
          params.push(val);
          break;
        case 'lte':
          conditions.push(`"${table}"."${key}" <= $${paramIndex++}`);
          params.push(val);
          break;
        case 'like':
          conditions.push(`"${table}"."${key}" LIKE $${paramIndex++}`);
          params.push(val);
          break;
        case 'ilike':
          conditions.push(`"${table}"."${key}" ILIKE $${paramIndex++}`);
          params.push(val);
          break;
        case 'is':
          if (val === 'null') {
            conditions.push(`"${table}"."${key}" IS NULL`);
          } else if (val === 'true') {
            conditions.push(`"${table}"."${key}" IS TRUE`);
          } else if (val === 'false') {
            conditions.push(`"${table}"."${key}" IS FALSE`);
          }
          break;
        case 'in':
          const inValues = val.replace(/^\(|\)$/g, '').split(',');
          conditions.push(`"${table}"."${key}" IN (${inValues.map(() => `$${paramIndex++}`).join(',')})`);
          params.push(...inValues);
          break;
      }
    }
  }
  
  return { conditions, params, nextIndex: paramIndex };
}

function splitSelectTokens(selectStr) {
  const tokens = [];
  let depth = 0;
  let current = '';
  
  for (const char of selectStr) {
    if (char === '(') {
      depth++;
      current += char;
    } else if (char === ')') {
      depth--;
      current += char;
    } else if (char === ',' && depth === 0) {
      if (current.trim()) tokens.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) tokens.push(current.trim());
  
  return tokens;
}

// Parse a single relation token - handles nested parentheses
function parseRelationToken(token, mainTable) {
  // Match: optional_alias:table_or_fk!optional_hint(columns_with_nesting)
  // We need to handle nested parentheses, so we can't use a simple regex for the column list
  
  // First, extract everything before the first '(' to get alias:table!hint
  const parenStart = token.indexOf('(');
  if (parenStart === -1) return null;
  
  const prefix = token.slice(0, parenStart).trim();
  
  // Find the matching closing parenthesis (handles nesting)
  let depth = 0;
  let parenEnd = -1;
  for (let i = parenStart; i < token.length; i++) {
    if (token[i] === '(') depth++;
    else if (token[i] === ')') {
      depth--;
      if (depth === 0) {
        parenEnd = i;
        break;
      }
    }
  }
  
  if (parenEnd === -1) return null; // Unbalanced parentheses
  
  const columnsStr = token.slice(parenStart + 1, parenEnd).trim();
  
  // Parse the prefix: optional_alias:table_or_fk!optional_hint
  const prefixRegex = /^(?:(\w+):)?(\w+)(?:!(\w+))?$/;
  const match = prefix.match(prefixRegex);

  if (!match) return null;

  let [, alias, tableOrFk, hint] = match;

  let actualTable = tableOrFk;
  let fkColumn = null;

  if (FK_TO_TABLE_MAP[tableOrFk]) {
    fkColumn = tableOrFk;
    actualTable = FK_TO_TABLE_MAP[tableOrFk];
  }

  // Parse FK hint to extract the actual FK column name
  // PostgREST uses hints like: `${mainTable}_${fkColumn}_fkey`
  // e.g. "internal_controls_owner_id_fkey" -> "owner_id"
  if (hint && hint !== 'inner') {
    let cleaned = hint;
    if (cleaned.endsWith('_fkey')) cleaned = cleaned.slice(0, -5);
    if (mainTable && cleaned.startsWith(`${mainTable}_`)) {
      cleaned = cleaned.slice(mainTable.length + 1);
    }
    if (cleaned && cleaned.includes('_id')) {
      fkColumn = cleaned;
    }
  }

  const finalAlias = alias || tableOrFk;

  // Parse columns, allowing nested relations
  const columnTokensRaw = splitSelectTokens((columnsStr || '').trim());
  let hasStar = false;
  const scalarColumns = [];
  const nestedRelations = [];

  for (const colToken of columnTokensRaw) {
    const t = colToken.trim();
    if (!t) continue;

    if (t === '*') {
      hasStar = true;
      continue;
    }

    if (t.includes('(')) {
      const nested = parseRelationToken(t, actualTable);
      if (nested) nestedRelations.push(nested);
      else scalarColumns.push(t);
      continue;
    }

    scalarColumns.push(t);
  }

  const columns = hasStar ? ['*'] : scalarColumns;

  let fkOn = 'main';
  let relationFkColumn = null;

  if (REVERSE_FK_MAP[actualTable]) {
    fkOn = 'relation';
    relationFkColumn = REVERSE_FK_MAP[actualTable];
  }

  if (fkColumn) {
    fkOn = 'main';
  }

  return {
    alias: finalAlias,
    table: actualTable,
    columns,
    nestedRelations,
    fkColumn: fkColumn || null,
    fkOn,
    relationFkColumn,
    isInner: hint === 'inner',
  };
}

function parseSelectWithRelations(selectStr, mainTable) {
  const relations = [];
  const mainColumnTokens = [];
  
  const tokens = splitSelectTokens(selectStr || '*');
  
  for (const token of tokens) {
    if (token.includes('(')) {
      const rel = parseRelationToken(token, mainTable);
      if (rel) {
        relations.push(rel);
      } else {
        mainColumnTokens.push(token);
      }
    } else {
      mainColumnTokens.push(token);
    }
  }
  
  let mainColumns = mainColumnTokens.join(', ').trim();
  if (!mainColumns || mainColumns === '') {
    mainColumns = '*';
  }
  
  return { mainColumns, relations };
}

// Build SQL query using JSON subqueries for embedded relations
// This avoids row duplication and supports nested embedded relations.

function inferForwardFkColumn(relTable, explicitFkColumn) {
  if (explicitFkColumn) return explicitFkColumn;
  const inferred = Object.entries(FK_TO_TABLE_MAP).find(([, v]) => v === relTable)?.[0];
  return inferred || `${relTable.replace(/s$/, '')}_id`;
}

function buildRelationJsonSubquery(parentTable, parentRowAlias, rel, depth = 0) {
  const relTable = rel.table;
  const rowAlias = `r${depth}`;

  // One-to-many
  if (rel.fkOn === 'relation' || rel.relationFkColumn) {
    const relFkCol = rel.relationFkColumn || REVERSE_FK_MAP[relTable] || `${parentTable.replace(/s$/, '')}_id`;
    const rowExpr = buildRowJsonExpr(relTable, rowAlias, rel.columns, rel.nestedRelations || [], depth + 1);
    return `(SELECT COALESCE(jsonb_agg(${rowExpr}), '[]'::jsonb) FROM public."${relTable}" ${rowAlias} WHERE ${rowAlias}."${relFkCol}" = ${parentRowAlias}."id")`;
  }

  // Many-to-one / one-to-one
  const fkCol = inferForwardFkColumn(relTable, rel.fkColumn);
  const rowExpr = buildRowJsonExpr(relTable, rowAlias, rel.columns, rel.nestedRelations || [], depth + 1);
  return `(SELECT ${rowExpr} FROM public."${relTable}" ${rowAlias} WHERE ${rowAlias}."id" = ${parentRowAlias}."${fkCol}")`;
}

function buildRowJsonExpr(table, rowAlias, scalarColumns, nestedRelations, depth) {
  const hasStar = Array.isArray(scalarColumns) && scalarColumns.length === 1 && scalarColumns[0] === '*';

  const nestedPairs = (nestedRelations || []).map((child) => {
    const childExpr = buildRelationJsonSubquery(table, rowAlias, child, depth);
    return `'${child.alias}', ${childExpr}`;
  });

  if (hasStar) {
    const base = `to_jsonb(${rowAlias})`;
    if (nestedPairs.length === 0) return base;
    return `${base} || jsonb_build_object(${nestedPairs.join(', ')})`;
  }

  const scalarPairs = (scalarColumns || []).map((c) => `'${c}', ${rowAlias}."${c}"`);
  const allPairs = [...scalarPairs, ...nestedPairs];

  if (allPairs.length === 0) {
    return `to_jsonb(${rowAlias})`;
  }

  return `jsonb_build_object(${allPairs.join(', ')})`;
}

function buildQueryWithRelations(mainTable, mainColumns, relations, conditions, order, limit, offset) {
  const selectParts = [];

  if (mainColumns === '*') {
    selectParts.push(`"${mainTable}".*`);
  } else {
    const cols = mainColumns.split(',').map((c) => {
      const col = c.trim();
      if (!col.includes('.') && !col.includes('"')) {
        return `"${mainTable}"."${col}"`;
      }
      return col;
    });
    selectParts.push(...cols);
  }

  for (const rel of relations) {
    const alias = rel.alias;
    const expr = buildRelationJsonSubquery(mainTable, `"${mainTable}"`, rel, 0);
    selectParts.push(`${expr} AS "${alias}"`);
  }

  const fromClause = `FROM public."${mainTable}"`;

  let whereClause = '';
  if (conditions.length > 0) {
    whereClause = `WHERE ${conditions.join(' AND ')}`;
  }

  let orderClause = '';
  if (order) {
    const orders = String(order).split(',').map((o) => {
      const [column, direction] = o.split('.');
      return `"${mainTable}"."${column}" ${direction === 'desc' ? 'DESC' : 'ASC'}`;
    });
    orderClause = `ORDER BY ${orders.join(', ')}`;
  }

  const limitClause = limit ? `LIMIT ${parseInt(limit)}` : '';
  const offsetClause = offset ? `OFFSET ${parseInt(offset)}` : '';

  const sql = `SELECT ${selectParts.join(', ')} ${fromClause} ${whereClause} ${orderClause} ${limitClause} ${offsetClause}`.trim();

  return { sql, relations };
}

// GET - Select
app.get('/rest/v1/:table', optionalAuth, async (req, res) => {
  const { table } = req.params;
  let { select = '*', limit, offset, order } = req.query;
  
  if (typeof select === 'string') {
    select = select.replace(/\+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  
  const cacheableTables = [
    'control_frameworks', 'framework_controls', 'matrix_impact_levels',
    'matrix_likelihood_levels', 'business_units', 'confidentiality_levels',
    'risk_appetites', 'risk_appetite_bands', 'risk_categories'
  ];
  
  const cacheKey = `table:${table}:${JSON.stringify(req.query)}`;
  
  if (cacheableTables.includes(table)) {
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json(cached);
    }
  }
  
  let sql = '';
  let params = [];
  
  try {
    const { conditions, params: filterParams } = parseFilters(req.query, table);
    params = filterParams;
    
    const { mainColumns, relations } = parseSelectWithRelations(select, table);
    
    const queryResult = buildQueryWithRelations(
      table, mainColumns, relations, conditions, order, limit, offset
    );
    sql = queryResult.sql;
    
    // Always log for debugging nested relations issues
    console.log('[REST] Table:', table);
    console.log('[REST] Select:', select);
    console.log('[REST] Parsed relations:', JSON.stringify(relations, null, 2));
    console.log('[REST] SQL:', sql);
    console.log('[REST] Params:', params);
    
    const result = await pool.query(sql, params);
    
    if (cacheableTables.includes(table)) {
      setCache(cacheKey, result.rows);
    }
    
    res.json(result.rows);
  } catch (error) {
    console.error('Query error:', error);
    console.error('SQL:', sql);
    console.error('Params:', params);
    
    const response = { error: error.message };
    if (IS_DEV) {
      response.sql = sql;
      response.params = params;
    }
    res.status(400).json(response);
  }
});

// POST - Insert
app.post('/rest/v1/:table', authenticate, async (req, res) => {
  const { table } = req.params;
  const { on_conflict } = req.query;
  const data = Array.isArray(req.body) ? req.body : [req.body];
  
  try {
    if (data.length === 0) {
      return res.status(400).json({ error: 'No data provided' });
    }
    
    const columns = [...new Set(data.flatMap(row => Object.keys(row)))];
    const columnTypes = await getPublicColumnTypes(table);

    const values = [];
    const valuePlaceholders = [];
    let paramIndex = 1;

    for (const row of data) {
      const rowPlaceholders = [];
      for (const col of columns) {
        rowPlaceholders.push(`$${paramIndex++}`);

        const rawValue = row[col] !== undefined ? row[col] : null;
        const colType = columnTypes.get(col)?.data_type;

        if (rawValue !== null && (colType === 'jsonb' || colType === 'json')) {
          values.push(JSON.stringify(rawValue));
        } else {
          values.push(rawValue);
        }
      }
      valuePlaceholders.push(`(${rowPlaceholders.join(', ')})`);
    }

    let query;
    
    if (on_conflict) {
      const conflictCols = on_conflict.split(',').map(c => `"${c.trim()}"`).join(', ');
      const updateCols = columns
        .filter(c => !on_conflict.split(',').map(oc => oc.trim()).includes(c))
        .map(c => `"${c}" = EXCLUDED."${c}"`)
        .join(', ');
      
      if (updateCols) {
        query = `
          INSERT INTO public."${table}" (${columns.map(c => `"${c}"`).join(', ')})
          VALUES ${valuePlaceholders.join(', ')}
          ON CONFLICT (${conflictCols}) DO UPDATE SET ${updateCols}
          RETURNING *
        `;
      } else {
        query = `
          INSERT INTO public."${table}" (${columns.map(c => `"${c}"`).join(', ')})
          VALUES ${valuePlaceholders.join(', ')}
          ON CONFLICT (${conflictCols}) DO NOTHING
          RETURNING *
        `;
      }
    } else {
      query = `
        INSERT INTO public."${table}" (${columns.map(c => `"${c}"`).join(', ')})
        VALUES ${valuePlaceholders.join(', ')}
        RETURNING *
      `;
    }
    
    if (IS_DEV) {
      console.log('[REST POST] Table:', table);
      console.log('[REST POST] SQL:', query);
      console.log('[REST POST] on_conflict:', on_conflict);
    }
    
    const result = await pool.query(query, values);
    
    for (const key of cache.keys()) {
      if (key.startsWith(`table:${table}:`)) {
        cache.delete(key);
      }
    }
    
    res.status(201).json(result.rows.length === 1 ? result.rows[0] : result.rows);
  } catch (error) {
    console.error('Insert/Upsert error:', error);
    res.status(400).json({ error: error.message });
  }
});

// PATCH - Update
app.patch('/rest/v1/:table', authenticate, async (req, res) => {
  const { table } = req.params;
  const data = req.body;
  
  try {
    const { conditions, params: filterParams } = parseFilters(req.query, table);
    
    const updateColumns = Object.keys(data);

    const columnTypes = await getPublicColumnTypes(table);
    const updateValues = updateColumns.map((col) => {
      const rawValue = data[col];
      const colType = columnTypes.get(col)?.data_type;
      if (rawValue !== null && rawValue !== undefined && (colType === 'jsonb' || colType === 'json')) {
        return JSON.stringify(rawValue);
      }
      return rawValue;
    });

    const setClause = updateColumns.map((col, i) => `"${col}" = $${filterParams.length + i + 1}`).join(', ');

    let query = `UPDATE public."${table}" SET ${setClause}`;
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ' RETURNING *';
    
    const result = await pool.query(query, [...filterParams, ...updateValues]);
    
    for (const key of cache.keys()) {
      if (key.startsWith(`table:${table}:`)) {
        cache.delete(key);
      }
    }
    
    res.json(result.rows);
  } catch (error) {
    console.error('Update error:', error);
    res.status(400).json({ error: error.message });
  }
});

// DELETE
app.delete('/rest/v1/:table', authenticate, async (req, res) => {
  const { table } = req.params;
  
  try {
    const { conditions, params } = parseFilters(req.query, table);
    
    let query = `DELETE FROM public."${table}"`;
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ' RETURNING *';
    
    const result = await pool.query(query, params);
    
    for (const key of cache.keys()) {
      if (key.startsWith(`table:${table}:`)) {
        cache.delete(key);
      }
    }
    
    res.json(result.rows);
  } catch (error) {
    console.error('Delete error:', error);
    res.status(400).json({ error: error.message });
  }
});

// ============ EDGE FUNCTIONS ============

async function executeEdgeFunction(req, res, method) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');

  const { functionName } = req.params;
  const body = req.body || {};
  
  try {
    const functionPath = path.join(__dirname, 'functions', functionName, 'index.js');
    
    if (!fs.existsSync(functionPath)) {
      return res.status(404).json({ error: `Function ${functionName} not found` });
    }
    
    const functionModule = await import(functionPath);
    const handler = functionModule.default || functionModule.handler;
    
    if (typeof handler !== 'function') {
      return res.status(500).json({ error: `Function ${functionName} has no valid handler` });
    }
    
    const result = await handler(body, { user: req.user, pool, method });
    res.json(result);
  } catch (error) {
    console.error(`Function ${functionName} error:`, error);
    res.status(500).json({ error: error.message });
  }
}

app.get('/functions/v1/:functionName', authenticate, (req, res) => executeEdgeFunction(req, res, 'GET'));
app.post('/functions/v1/:functionName', authenticate, (req, res) => executeEdgeFunction(req, res, 'POST'));

// ============ ERROR HANDLING ============

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ============ START SERVER ============

app.listen(PORT, () => {
  console.log(`SecIX Light API Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Storage path: ${STORAGE_PATH}`);
});
