import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

const supabaseProjectId = process.env.SUPABASE_PROJECT_ID || "fqatuwzsunvxbtryhloy";
const defaultHost = supabaseProjectId ? `db.${supabaseProjectId}.supabase.co` : "34.175.144.94";
const sqlHost = process.env.SQL_HOST || defaultHost;
const sqlPort = process.env.SQL_PORT ? parseInt(process.env.SQL_PORT, 10) : 5432;
const sqlDbName = process.env.SQL_DB_NAME || "postgres";
const user = process.env.SQL_ADMIN_USER || process.env.SQL_USER || "postgres";
const password = process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD || "Tlmcj0510*";
const isSocket = sqlHost.startsWith('/');
const useSsl = sqlHost.includes('supabase') || process.env.SQL_SSL === 'true' || process.env.SQL_SSL === 'require';

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

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials,
  verbose: true,
});
