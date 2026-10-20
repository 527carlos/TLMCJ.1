import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, type PoolConfig } from 'pg';
import * as dotenv from 'dotenv';
import * as schema from './schema.ts';

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
}

// Configuración global en memoria para persistencia y soporte de recargas en caliente
declare global {
  var _postgresPool: Pool | undefined;
  var _activeDbConfig: ActiveDatabaseConfig | undefined;
}

export function resolveDefaultConfig(): ActiveDatabaseConfig {
  const supabaseProjectId = process.env.SUPABASE_PROJECT_ID || 'fqatuwzsunvxbtryhloy';
  const defaultHost = supabaseProjectId 
    ? `db.${supabaseProjectId}.supabase.co` 
    : (process.env.SQL_HOST || '34.175.144.94');

  const rawHost = process.env.SQL_HOST || defaultHost;
  const isSocket = rawHost.startsWith('/');
  const port = process.env.SQL_PORT ? parseInt(process.env.SQL_PORT, 10) : 5432;
  const isSupabase = rawHost.includes('supabase.co') || rawHost.includes('supabase.com');
  const requireSsl = isSupabase || process.env.SQL_SSL === 'true' || process.env.SQL_SSL === 'require';

  return {
    host: rawHost,
    port: isSocket ? 5432 : port,
    database: process.env.SQL_DB_NAME || 'postgres',
    user: process.env.SQL_USER || 'postgres',
    password: process.env.SQL_PASSWORD || 'Tlmcj0510*',
    ssl: requireSsl,
    isSupabase,
    supabaseProjectId: isSupabase ? supabaseProjectId : undefined,
  };
}

export const createPoolFromConfig = (config: ActiveDatabaseConfig): Pool => {
  const isSocket = config.host.startsWith('/');

  const poolConfig: PoolConfig = {
    host: config.host,
    user: config.user,
    password: config.password,
    database: config.database,
    max: 10,
    connectionTimeoutMillis: 8000,
  };

  if (!isSocket) {
    poolConfig.port = config.port;
    if (config.ssl) {
      poolConfig.ssl = { rejectUnauthorized: false };
    } else {
      poolConfig.ssl = false;
    }
  }

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
    console.log(`[Database] Inicializando Pool PostgreSQL -> Host: ${config.host}, Puerto: ${config.port}, BD: ${config.database}, Usuario: ${config.user}, SSL: ${config.ssl}`);
    global._postgresPool = createPoolFromConfig(config);
  }
  return global._postgresPool;
};

export const getActiveConnectionConfig = () => {
  if (!global._activeDbConfig) {
    global._activeDbConfig = resolveDefaultConfig();
  }
  return {
    ...global._activeDbConfig,
    // Omitir password en respuestas públicas
    passwordMasked: global._activeDbConfig.password ? '••••••••' : 'No configurado'
  };
};

export const reconnectPool = async (newConfig: {
  host: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean;
  supabaseProjectId?: string;
}) => {
  const isSupabase = newConfig.host.includes('supabase.co') || Boolean(newConfig.supabaseProjectId);
  const targetHost = newConfig.supabaseProjectId 
    ? `db.${newConfig.supabaseProjectId}.supabase.co` 
    : newConfig.host;

  const targetConfig = {
    host: targetHost,
    port: newConfig.port || 5432,
    database: newConfig.database || 'postgres',
    user: newConfig.user || 'postgres',
    password: newConfig.password ?? (global._activeDbConfig?.password || process.env.SQL_PASSWORD || 'Tlmcj0510*'),
    ssl: newConfig.ssl !== undefined ? newConfig.ssl : (isSupabase || true),
    isSupabase,
    supabaseProjectId: newConfig.supabaseProjectId || (isSupabase ? 'fqatuwzsunvxbtryhloy' : undefined)
  };

  // Crear pool temporal para probar la conexión antes de reemplazar el pool global
  const testPool = createPoolFromConfig(targetConfig);
  try {
    const start = Date.now();
    const result = await testPool.query('SELECT current_database() as db, current_user as usr, version() as ver');
    const latency = Date.now() - start;

    // Si tiene éxito, cerrar el pool anterior si existe
    if (global._postgresPool) {
      try {
        await global._postgresPool.end();
      } catch (err) {
        console.warn('[Database] Aviso cerrando pool anterior:', err);
      }
    }

    // Asignar el nuevo pool verificado
    global._postgresPool = testPool;
    global._activeDbConfig = targetConfig;

    console.log(`[Database] ¡Conexión cambiada exitosamente a ${targetConfig.host}:${targetConfig.port} (Latencia: ${latency}ms)!`);

    return {
      ok: true,
      mensaje: `Conexión establecida exitosamente con ${targetConfig.isSupabase ? 'Supabase' : 'PostgreSQL'}.`,
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
        supabaseProjectId: targetConfig.supabaseProjectId
      }
    };
  } catch (err: any) {
    try {
      await testPool.end();
    } catch (_) {}
    throw err;
  }
};

// Proxy para el Pool: Todas las llamadas (query, connect, on, etc.) se delegan siempre al pool activo
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
