/**
 * PDF originales (representación gráfica) que llegan dentro de los paquetes .zip de la DIAN.
 * Se guardan por empresa y CUFE en PostgreSQL (persistente) y en una copia local en /storage/soportes (caché).
 */
import fs from 'fs';
import path from 'path';
import { pool } from '../../db/index.ts';

const DIR_BASE = path.join(process.cwd(), 'storage', 'soportes');
const nombreLocal = (cufe: string) => (cufe || '').replace(/[^A-Za-z0-9_-]/g, '').substring(0, 150) || 'sin_cufe';
const rutaLocal = (idEmpresa: number, cufe: string) => path.join(DIR_BASE, String(idEmpresa), `${nombreLocal(cufe)}.pdf`);

let tablaLista: Promise<boolean> | null = null;
function asegurarTabla(): Promise<boolean> {
  if (!tablaLista) {
    tablaLista = pool.query(`CREATE TABLE IF NOT EXISTS factura_soportes (
        id SERIAL PRIMARY KEY,
        id_empresa INTEGER NOT NULL,
        cufe_hash TEXT NOT NULL,
        nombre_archivo TEXT,
        pdf BYTEA NOT NULL,
        tamano INTEGER,
        creado_en TIMESTAMP DEFAULT now(),
        UNIQUE (id_empresa, cufe_hash)
      )`).then(() => true).catch(err => {
        console.warn('[Soportes] PostgreSQL no disponible; los PDF originales se guardan solo en local:', err.message);
        tablaLista = null;
        return false;
      });
  }
  return tablaLista;
}

function escribirLocal(idEmpresa: number, cufe: string, contenido: Buffer) {
  try {
    fs.mkdirSync(path.join(DIR_BASE, String(idEmpresa)), { recursive: true });
    fs.writeFileSync(rutaLocal(idEmpresa, cufe), contenido);
  } catch (err: any) {
    console.warn('[Soportes] No se pudo escribir la copia local:', err.message);
  }
}

export const SoportesOriginales = {
  async guardar(idEmpresa: number, cufe: string, nombre: string, contenido: Buffer): Promise<void> {
    if (!cufe || !contenido?.length) return;
    escribirLocal(idEmpresa, cufe, contenido);
    if (await asegurarTabla()) {
      await pool.query(
        `INSERT INTO factura_soportes (id_empresa, cufe_hash, nombre_archivo, pdf, tamano) VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id_empresa, cufe_hash) DO UPDATE SET nombre_archivo = EXCLUDED.nombre_archivo, pdf = EXCLUDED.pdf, tamano = EXCLUDED.tamano, creado_en = now()`,
        [idEmpresa, cufe, nombre, contenido, contenido.length]
      ).catch(err => console.warn('[Soportes] No se pudo guardar el PDF en PostgreSQL:', err.message));
    }
  },

  async obtener(idEmpresa: number, cufe: string): Promise<{ nombre: string; contenido: Buffer } | null> {
    if (!cufe) return null;
    const local = rutaLocal(idEmpresa, cufe);
    if (await asegurarTabla()) {
      try {
        const r = await pool.query('SELECT nombre_archivo, pdf FROM factura_soportes WHERE id_empresa = $1 AND cufe_hash = $2', [idEmpresa, cufe]);
        if (r.rows[0]) {
          if (!fs.existsSync(local)) escribirLocal(idEmpresa, cufe, r.rows[0].pdf);
          return { nombre: r.rows[0].nombre_archivo || `${nombreLocal(cufe)}.pdf`, contenido: r.rows[0].pdf };
        }
      } catch {}
    }
    if (fs.existsSync(local)) return { nombre: path.basename(local), contenido: fs.readFileSync(local) };
    return null;
  },

  /** CUFE de la empresa que tienen PDF original guardado */
  async cufesConPdf(idEmpresa: number): Promise<Set<string>> {
    const set = new Set<string>();
    if (await asegurarTabla()) {
      try {
        const r = await pool.query('SELECT cufe_hash FROM factura_soportes WHERE id_empresa = $1', [idEmpresa]);
        r.rows.forEach((x: any) => set.add(nombreLocal(x.cufe_hash)));
      } catch {}
    }
    try {
      fs.readdirSync(path.join(DIR_BASE, String(idEmpresa))).forEach(n => set.add(n.replace(/\.pdf$/i, '')));
    } catch {}
    return set;
  },

  tiene(set: Set<string>, cufe: string) {
    return Boolean(cufe) && set.has(nombreLocal(cufe));
  }
};
