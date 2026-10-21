import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_zyGclK32wnNL@ep-rough-term-b4jl3vvr-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require"
});

async function run() {
  const cols = await pool.query(`
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'users'
    ORDER BY ordinal_position;
  `);
  console.log("Columns of users table:", cols.rows);

  const rows = await pool.query("SELECT * FROM users LIMIT 10;");
  console.log("Existing users in table users:", rows.rows);

  await pool.end();
}

run().catch(console.error);
