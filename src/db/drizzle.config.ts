import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

const sqlHost = process.env.SQL_HOST || "34.175.144.94";
const sqlPort = process.env.SQL_PORT ? parseInt(process.env.SQL_PORT, 10) : 5432;
const sqlDbName = process.env.SQL_DB_NAME || "postgres";
const user = process.env.SQL_ADMIN_USER || process.env.SQL_USER || "postgres";
const password = process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD || "Tlmcj0510*";
const isSocket = sqlHost.startsWith('/');

console.log(`[Drizzle Kit] Configurando migraciones para PostgreSQL -> Host: ${sqlHost}, Puerto: ${isSocket ? 'Socket' : sqlPort}, BD: ${sqlDbName}, Usuario: ${user}`);

const dbCredentials: any = {
  host: sqlHost,
  user: user,
  password: password,
  database: sqlDbName,
  ssl: process.env.SQL_SSL === 'true' || process.env.SQL_SSL === 'require' ? { rejectUnauthorized: false } : false,
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
