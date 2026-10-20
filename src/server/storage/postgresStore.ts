import { Pool } from 'pg';

const TABLE = 'tlm_estado';
const ROW_ID = 'principal';

// Guarda el estado completo de la aplicación en una fila jsonb de PostgreSQL (Neon).
export function createPostgresStore(connectionString: string) {
  const pool = new Pool({ connectionString, max: 5 });

  return {
    async init() {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ${TABLE} (
          id text PRIMARY KEY,
          data jsonb NOT NULL,
          actualizado_en timestamptz NOT NULL DEFAULT now()
        )
      `);
    },

    async read(): Promise<any | null> {
      const { rows } = await pool.query(`SELECT data FROM ${TABLE} WHERE id = $1`, [ROW_ID]);
      return rows[0]?.data ?? null;
    },

    async write(dump: object) {
      await pool.query(
        `INSERT INTO ${TABLE} (id, data, actualizado_en) VALUES ($1, $2::jsonb, now())
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, actualizado_en = now()`,
        [ROW_ID, JSON.stringify(dump)]
      );
    },

    close() {
      return pool.end();
    }
  };
}
