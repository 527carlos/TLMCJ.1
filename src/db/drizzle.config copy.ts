import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

const neonHost = "ep-rough-term-b4jl3vvr-pooler.c-6.us-east-2.aws.neon.tech";
const sqlHost = process.env.SQL_HOST || neonHost;
const sqlPort = process.env.SQL_PORT ? parseInt(process.env.SQL_PORT, 10) : 5432;
const sqlDbName = process.env.SQL_DB_NAME || "neondb";
const user = process.env.SQL_ADMIN_USER || process.env.SQL_USER || "neondb_owner";
const password = process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD || "npg_zyGclK32wnNL";
const isSocket = sqlHost.startsWith('/');
const useSsl = sqlHost.includes('neon.tech') || sqlHost.includes('supabase') || process.env.SQL_SSL === 'true';

console.log(`[Drizzle Kit] Configurando migraciones para PostgreSQL -> Host: ${sqlHost}, Puerto: ${isSocket ? 'Socket' : sqlPort}, BD: ${sqlDbName}, Usuario: ${user}, SSL: ${useSsl}`);

const dbCredentials: any = {
  host: sqlHost,
  user: user,
  password: password,
  database: sqlDbName,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
};

if (!isSocket) {
  dbCredentials.port = sqlPort;
}

if (process.env.DATABASE_URL) {
  dbCredentials.url = process.env.DATABASE_URL;
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials,
  verbose: true,
});
