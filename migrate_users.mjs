import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_zyGclK32wnNL@ep-rough-term-b4jl3vvr-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require"
});

async function migrate() {
  console.log("Adding columns to users table if not exists...");
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(50);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT true;
  `);

  // Ensure automatizaciones@tlm.net.co has a known password if needed
  await pool.query(`
    UPDATE users 
    SET activo = true, email_verified = true 
    WHERE activo IS NULL OR email_verified IS NULL;
  `);

  const cols = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    ORDER BY ordinal_position;
  `);
  console.log("Updated users columns:", cols.rows.map(r => r.column_name));
  await pool.end();
}

migrate().catch(console.error);
