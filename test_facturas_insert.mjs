import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_zyGclK32wnNL@ep-rough-term-b4jl3vvr-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require"
});

async function run() {
  const triggers = await pool.query(`
    SELECT trigger_name, event_manipulation, action_statement 
    FROM information_schema.triggers 
    WHERE event_object_table = 'facturas';
  `);
  console.log("Triggers:", triggers.rows);

  try {
    const res = await pool.query(`
      INSERT INTO facturas (id_empresa, factura_num, fecha, proveedor, nit_tercero, subtotal, iva, total, cufe_hash)
      VALUES (1, 'TEST-999', '2026-10-21', 'PROVEEDOR TEST', '901999888', 100000, 19000, 119000, 'cufe-test-' || md5(random()::text))
      RETURNING id, id_factura;
    `);
    console.log("Insert success:", res.rows[0]);
    await pool.query("DELETE FROM facturas WHERE factura_num = 'TEST-999';");
  } catch (err) {
    console.error("Insert failed:", err);
  }
  await pool.end();
}

run().catch(console.error);
