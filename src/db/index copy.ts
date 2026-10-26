import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, type PoolConfig } from 'pg';
import * as dotenv from 'dotenv';
import * as schema from './schema.ts';
import fs from 'fs';
import path from 'path';

// Cargar variables de entorno locales desde .env
dotenv.config();

export interface ActiveDatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
  ssl: boolean;
  isSupabase: boolean;
  supabaseProjectId?: string;
  isNeon?: boolean;
  neonProjectId?: string;
  neonBranchId?: string;
  neonEndpointId?: string;
  connectionString?: string;
}

// Configuración global en memoria para persistencia y soporte de recargas en caliente
declare global {
  var _postgresPool: Pool | undefined;
  var _activeDbConfig: ActiveDatabaseConfig | undefined;
}

export function parseConnectionString(connStr: string): Partial<ActiveDatabaseConfig> | null {
  try {
    const url = new URL(connStr);
    const host = url.hostname;
    const port = url.port ? parseInt(url.port, 10) : 5432;
    const user = decodeURIComponent(url.username || 'neondb_owner');
    const password = decodeURIComponent(url.password || '');
    const database = url.pathname.replace(/^\//, '') || 'neondb';
    const isNeon = host.includes('neon.tech');
    const isSupabase = host.includes('supabase.co');

    return {
      host,
      port,
      user,
      password,
      database,
      ssl: true,
      isNeon,
      isSupabase,
      neonProjectId: isNeon ? 'bitter-frost-14568057' : undefined,
      neonBranchId: isNeon ? 'br-tiny-boat-b4jd4u1z' : undefined,
      connectionString: connStr
    };
  } catch (err) {
    return null;
  }
}

export function resolveDefaultConfig(): ActiveDatabaseConfig {
  // 1. Si hay DATABASE_URL configurada (por ejemplo copiada de Neon Console)
  if (process.env.DATABASE_URL) {
    const parsed = parseConnectionString(process.env.DATABASE_URL);
    if (parsed && parsed.host) {
      return {
        host: parsed.host,
        port: parsed.port || 5432,
        database: parsed.database || 'neondb',
        user: parsed.user || 'neondb_owner',
        password: parsed.password || process.env.SQL_PASSWORD || 'npg_zyGclK32wnNL',
        ssl: true,
        isSupabase: Boolean(parsed.isSupabase),
        supabaseProjectId: parsed.isSupabase ? 'fqatuwzsunvxbtryhloy' : undefined,
        isNeon: Boolean(parsed.isNeon),
        neonProjectId: 'bitter-frost-14568057',
        neonBranchId: 'br-tiny-boat-b4jd4u1z',
        connectionString: process.env.DATABASE_URL
      };
    }
  }

  // 2. Parámetros independientes
  const neonHost = 'ep-rough-term-b4jl3vvr-pooler.c-6.us-east-2.aws.neon.tech';
  const rawHost = process.env.SQL_HOST || neonHost;
  const isSocket = rawHost.startsWith('/');
  const port = process.env.SQL_PORT ? parseInt(process.env.SQL_PORT, 10) : 5432;
  const isNeon = rawHost.includes('neon.tech') || Boolean(process.env.NEON_PROJECT_ID);
  const isSupabase = rawHost.includes('supabase.co') || rawHost.includes('supabase.com');
  const requireSsl = isNeon || isSupabase || process.env.SQL_SSL === 'true' || process.env.SQL_SSL === 'require';

  return {
    host: rawHost,
    port: isSocket ? 5432 : port,
    database: process.env.SQL_DB_NAME || (isNeon ? 'neondb' : 'postgres'),
    user: process.env.SQL_USER || (isNeon ? 'neondb_owner' : 'postgres'),
    password: process.env.SQL_PASSWORD || 'npg_zyGclK32wnNL',
    ssl: requireSsl,
    isSupabase,
    supabaseProjectId: isSupabase ? 'fqatuwzsunvxbtryhloy' : undefined,
    isNeon,
    neonProjectId: 'bitter-frost-14568057',
    neonBranchId: 'br-tiny-boat-b4jd4u1z',
    connectionString: process.env.DATABASE_URL || `postgresql://${encodeURIComponent(process.env.SQL_USER || 'neondb_owner')}:${encodeURIComponent(process.env.SQL_PASSWORD || 'npg_zyGclK32wnNL')}@${rawHost}:${port}/${process.env.SQL_DB_NAME || 'neondb'}?sslmode=require`
  };
}

export const createPoolFromConfig = (config: ActiveDatabaseConfig): Pool => {
  const isSocket = config.host.startsWith('/');
  const isNeon = config.isNeon || config.host.includes('neon.tech');

  const effectiveConnStr = config.connectionString || (
    isNeon && !isSocket && config.user && config.password
      ? `postgresql://${encodeURIComponent(config.user)}:${encodeURIComponent(config.password)}@${config.host}:${config.port}/${config.database}?sslmode=require`
      : undefined
  );

  const poolConfig: PoolConfig = effectiveConnStr
    ? {
        connectionString: effectiveConnStr,
        ssl: { rejectUnauthorized: false },
        max: 10,
        connectionTimeoutMillis: 8000,
      }
    : {
        host: config.host,
        user: config.user,
        password: config.password,
        database: config.database,
        max: 10,
        connectionTimeoutMillis: 8000,
        port: isSocket ? undefined : config.port,
        ssl: config.ssl ? { rejectUnauthorized: false } : false,
      };

  const poolInstance = new Pool(poolConfig);

  poolInstance.on('error', (err) => {
    console.error('[PostgreSQL Pool Error] Advertencia en cliente idle:', err.message);
  });

  return poolInstance;
};

export const getOrCreatePool = (): Pool => {
  if (!global._postgresPool) {
    const config = global._activeDbConfig || resolveDefaultConfig();
    global._activeDbConfig = config;
    const providerLabel = config.isNeon ? 'Neon Serverless' : (config.isSupabase ? 'Supabase' : 'PostgreSQL');
    console.log(`[Database] Inicializando Pool (${providerLabel}) -> Host: ${config.host}, Puerto: ${config.port}, BD: ${config.database}, Usuario: ${config.user}, SSL: ${config.ssl}`);
    global._postgresPool = createPoolFromConfig(config);
  }
  return global._postgresPool;
};

export const getActiveConnectionConfig = (): ActiveDatabaseConfig & { passwordMasked: string } => {
  if (!global._activeDbConfig) {
    global._activeDbConfig = resolveDefaultConfig();
  }
  return {
    ...global._activeDbConfig,
    passwordMasked: global._activeDbConfig.password ? '••••••••' : 'No configurado'
  };
};

export const reconnectPool = async (newConfig: {
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean;
  supabaseProjectId?: string;
  neonProjectId?: string;
  neonBranchId?: string;
  neonEndpointId?: string;
  connectionString?: string;
}) => {
  // Si se envió connectionString directa
  if (newConfig.connectionString) {
    const parsed = parseConnectionString(newConfig.connectionString);
    if (parsed) {
      Object.assign(newConfig, parsed);
    }
  }

  const hostCandidate = newConfig.host || global._activeDbConfig?.host || 'ep-rough-term-b4jl3vvr-pooler.c-6.us-east-2.aws.neon.tech';
  const isNeon = hostCandidate.includes('neon.tech') || Boolean(newConfig.neonProjectId);
  const isSupabase = hostCandidate.includes('supabase.co') || Boolean(newConfig.supabaseProjectId);

  const targetConfig: ActiveDatabaseConfig = {
    host: hostCandidate,
    port: newConfig.port || 5432,
    database: newConfig.database || (isNeon ? 'neondb' : 'postgres'),
    user: newConfig.user || (isNeon ? 'neondb_owner' : 'postgres'),
    password: newConfig.password ?? (global._activeDbConfig?.password || process.env.SQL_PASSWORD || 'npg_zyGclK32wnNL'),
    ssl: newConfig.ssl !== undefined ? newConfig.ssl : (isNeon || isSupabase || true),
    isSupabase,
    supabaseProjectId: newConfig.supabaseProjectId || (isSupabase ? 'fqatuwzsunvxbtryhloy' : undefined),
    isNeon,
    neonProjectId: newConfig.neonProjectId || (isNeon ? 'bitter-frost-14568057' : undefined),
    neonBranchId: newConfig.neonBranchId || (isNeon ? 'br-tiny-boat-b4jd4u1z' : undefined),
    neonEndpointId: newConfig.neonEndpointId || (isNeon ? 'ep-rough-term-b4jl3vvr' : undefined),
    connectionString: newConfig.connectionString
  };

  const testPool = createPoolFromConfig(targetConfig);
  try {
    const start = Date.now();
    const result = await testPool.query('SELECT current_database() as db, current_user as usr, version() as ver');
    const latency = Date.now() - start;

    if (global._postgresPool) {
      try {
        await global._postgresPool.end();
      } catch (err) {
        console.warn('[Database] Aviso cerrando pool anterior:', err);
      }
    }

    global._postgresPool = testPool;
    global._activeDbConfig = targetConfig;

    // Persistir configuración en .env para asegurar disponibilidad tras reinicios
    try {
      const envPath = path.resolve(process.cwd(), '.env');
      const envLines = [
        '# ==========================================',
        `# Neon Serverless PostgreSQL - Conector Único Oficial`,
        `# Endpoint: ${targetConfig.neonEndpointId || 'ep-rough-term-b4jl3vvr'}`,
        '# ==========================================',
        `NEON_PROJECT_ID=${targetConfig.neonProjectId || 'bitter-frost-14568057'}`,
        `NEON_BRANCH_ID=${targetConfig.neonBranchId || 'br-tiny-boat-b4jd4u1z'}`,
        `NEON_ENDPOINT_ID=ep-rough-term-b4jl3vvr`,
        `SQL_HOST=${targetConfig.host}`,
        `SQL_PORT=${targetConfig.port}`,
        `SQL_DB_NAME=${targetConfig.database}`,
        `SQL_USER=${targetConfig.user}`,
        `SQL_PASSWORD=${targetConfig.password || ''}`,
        `SQL_ADMIN_USER=${targetConfig.user}`,
        `SQL_ADMIN_PASSWORD=${targetConfig.password || ''}`,
        `SQL_SSL=${targetConfig.ssl ? 'true' : 'false'}`,
        '',
        '# Connection String Oficial de Neon',
        `DATABASE_URL=${targetConfig.connectionString || `postgresql://${encodeURIComponent(targetConfig.user)}:${encodeURIComponent(targetConfig.password || '')}@${targetConfig.host}:${targetConfig.port}/${targetConfig.database}${targetConfig.ssl ? '?sslmode=require' : ''}`}`
      ];
      fs.writeFileSync(envPath, envLines.join('\n') + '\n', 'utf-8');
    } catch (e) {
      console.warn('[Database] Advertencia al persistir .env:', e);
    }

    const providerName = isNeon ? 'Neon Serverless' : (isSupabase ? 'Supabase' : 'PostgreSQL');
    console.log(`[Database] ¡Conexión cambiada exitosamente a ${providerName} (${targetConfig.host}:${targetConfig.port}, Latencia: ${latency}ms)!`);

    return {
      ok: true,
      mensaje: `Conexión establecida exitosamente con ${providerName}.`,
      database: result.rows[0]?.db,
      user: result.rows[0]?.usr,
      version: result.rows[0]?.ver,
      latencyMs: latency,
      config: {
        host: targetConfig.host,
        port: targetConfig.port,
        database: targetConfig.database,
        user: targetConfig.user,
        ssl: targetConfig.ssl,
        isSupabase: targetConfig.isSupabase,
        isNeon: targetConfig.isNeon,
        neonProjectId: targetConfig.neonProjectId,
        neonBranchId: targetConfig.neonBranchId
      }
    };
  } catch (err: any) {
    try {
      await testPool.end();
    } catch (_) {}
    throw err;
  }
};

// Proxy para el Pool: Todas las consultas se canalizan al pool activo
export const pool = new Proxy({} as Pool, {
  get: (_target, prop) => {
    const active = getOrCreatePool();
    const val = (active as any)[prop];
    if (typeof val === 'function') {
      return val.bind(active);
    }
    return val;
  }
});

// Inicializar Drizzle ORM sobre el pool activo y los esquemas
export const db = drizzle(pool, { schema });
