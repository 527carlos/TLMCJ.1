import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, type PoolConfig } from 'pg';
import * as dotenv from 'dotenv';
import * as schema from './schema.ts';

// Cargar variables de entorno locales desde .env
dotenv.config();

// Add global connection pool caching to persist across hot-reloads
declare global {
  var _postgresPool: Pool | undefined;
}

// Function to create or retrieve the connection pool.
export const createPool = () => {
  if (!global._postgresPool) {
    const rawHost = process.env.SQL_HOST || '34.175.144.94';
    const isSocket = rawHost.startsWith('/');

    const poolConfig: PoolConfig = {
      host: rawHost,
      user: process.env.SQL_USER || 'postgres',
      password: process.env.SQL_PASSWORD || 'Tlmcj0510*',
      database: process.env.SQL_DB_NAME || 'postgres',
      max: 10,
      connectionTimeoutMillis: 10000,
    };

    // Si es conexión TCP por IP/Host externo, configurar puerto y SSL
    if (!isSocket) {
      poolConfig.port = process.env.SQL_PORT ? parseInt(process.env.SQL_PORT, 10) : 5432;
      if (process.env.SQL_SSL === 'true' || process.env.SQL_SSL === 'require') {
        poolConfig.ssl = { rejectUnauthorized: false };
      } else {
        poolConfig.ssl = false;
      }
    }

    console.log(`[Database] Inicializando Pool PostgreSQL -> Host: ${poolConfig.host}, Puerto: ${poolConfig.port || 'Socket'}, BD: ${poolConfig.database}, Usuario: ${poolConfig.user}`);

    global._postgresPool = new Pool(poolConfig);

    // Prevent unhandled pool-level errors from crashing the application
    global._postgresPool.on('error', (err) => {
      console.error('[Database Pool Error] Advertencia en cliente idle de PostgreSQL:', err.message);
    });
  }
  return global._postgresPool;
};

// Create or retrieve the pool instance.
export const pool = createPool();

// Initialize Drizzle with the pool and schema.
export const db = drizzle(pool, { schema });
