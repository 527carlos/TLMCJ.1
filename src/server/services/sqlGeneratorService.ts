import type { DataStore } from '../storage/dataStore.ts';

function escapeSqlString(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return isNaN(val) ? '0' : String(val);
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'object') {
    const jsonStr = JSON.stringify(val).replace(/'/g, "''");
    return `'${jsonStr}'::jsonb`;
  }
  return `'${String(val).replace(/'/g, "''")}'`;
}

export class SqlGeneratorService {
  public static generateCloudSqlDump(db: DataStore): string {
    const timestamp = new Date().toISOString();
    const appUrl = "https://consola-tlm-enterprise-fiscal-erp-engine.ai.studio";

    let sql = `-- =========================================================================
-- CONSOLA TLM - ENTERPRISE FISCAL & ERP ENGINE
-- CLOUD SQL / POSTGRESQL DATABASE REPOSITORY & MIGRATION DUMP v2.0
-- Target App: ${appUrl}
-- Host: Google Cloud Run & Cloud SQL (us-east1)
-- Administrator: Juan Yaya (automatizaciones@tlm.net.co)
-- Generated: ${timestamp}
-- =========================================================================

-- Iniciar transacción atómica
BEGIN;

-- Extensiones recomendadas para Cloud SQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -------------------------------------------------------------------------
-- 1. TABLA: empresas (Multi-Tenancy & Credenciales Siigo)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS empresas (
    id_empresa SERIAL PRIMARY KEY,
    nombre_comercial VARCHAR(255) NOT NULL,
    nit VARCHAR(50) NOT NULL UNIQUE,
    software_erp VARCHAR(50) DEFAULT 'SIIGO_NUBE',
    software_destino VARCHAR(50) DEFAULT 'SIIGO_NUBE',
    siigo_username VARCHAR(255),
    siigo_access_key TEXT,
    siigo_document_id INTEGER DEFAULT 24,
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------------------
-- 2. TABLA: usuarios (Identidades, Roles RBAC & Google Cloud IAM)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario SERIAL PRIMARY KEY,
    nombre_completo VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    rol VARCHAR(50) NOT NULL CHECK (rol IN ('Administrador', 'Contador', 'Analista', 'Auditor')),
    activo BOOLEAN DEFAULT TRUE,
    empresas_ids INTEGER[] DEFAULT ARRAY[1],
    requiere_cambio_password BOOLEAN DEFAULT FALSE,
    permisos JSONB NOT NULL DEFAULT '{}'::jsonb,
    avatar_url TEXT,
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------------------
-- 3. TABLA: facturas (Facturación Electrónica DIAN UBL 2.1 & Retenciones)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS facturas (
    id_factura SERIAL PRIMARY KEY,
    id_empresa INTEGER REFERENCES empresas(id_empresa) ON DELETE CASCADE,
    factura_num VARCHAR(50) NOT NULL,
    proveedor VARCHAR(255) NOT NULL,
    nit_tercero VARCHAR(50) NOT NULL,
    fecha DATE NOT NULL,
    fecha_vencimiento DATE,
    tipo_comprobante VARCHAR(50) DEFAULT 'Factura Electrónica',
    descripcion_item TEXT,
    cantidad NUMERIC(15, 2) DEFAULT 1,
    valor_unitario NUMERIC(15, 2) DEFAULT 0,
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0,
    iva NUMERIC(15, 2) NOT NULL DEFAULT 0,
    retencion_porc NUMERIC(5, 2) DEFAULT 0,
    retencion_valor NUMERIC(15, 2) DEFAULT 0,
    total NUMERIC(15, 2) NOT NULL DEFAULT 0,
    estado_revision VARCHAR(50) DEFAULT 'APROBADA',
    cufe VARCHAR(255),
    casilla_350 VARCHAR(20) DEFAULT '83',
    forma_pago VARCHAR(50),
    medio_pago VARCHAR(50),
    cuenta_gasto VARCHAR(50),
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------------------
-- 4. TABLA: cuentas_puc (Plan Único de Cuentas)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cuentas_puc (
    id_puc SERIAL PRIMARY KEY,
    id_empresa INTEGER DEFAULT 1,
    cuenta VARCHAR(20) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    naturaleza VARCHAR(10) CHECK (naturaleza IN ('DEBITO', 'CREDITO'))
);

-- -------------------------------------------------------------------------
-- 5. TABLA: balance_terceros (Saldos Contables por NIT / Tercero)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS balance_terceros (
    id_balance SERIAL PRIMARY KEY,
    id_empresa INTEGER DEFAULT 1,
    cuenta_contable VARCHAR(50) NOT NULL,
    nombre_cuenta VARCHAR(255) NOT NULL,
    nit_tercero VARCHAR(50) NOT NULL,
    nombre_tercero VARCHAR(255) NOT NULL,
    saldo_inicial NUMERIC(15, 2) DEFAULT 0,
    debitos NUMERIC(15, 2) DEFAULT 0,
    creditos NUMERIC(15, 2) DEFAULT 0,
    saldo_final NUMERIC(15, 2) DEFAULT 0
);

-- -------------------------------------------------------------------------
-- 6. TABLA: movimientos_banco (Extractos Bancarios Bancolombia / Davivienda)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS movimientos_banco (
    id VARCHAR(50) PRIMARY KEY,
    fecha DATE NOT NULL,
    concepto TEXT NOT NULL,
    monto NUMERIC(15, 2) NOT NULL,
    tipo VARCHAR(20) CHECK (tipo IN ('DEBITO', 'CREDITO')),
    saldo NUMERIC(15, 2) DEFAULT 0,
    referencia VARCHAR(100),
    conciliado BOOLEAN DEFAULT FALSE
);

-- -------------------------------------------------------------------------
-- 7. TABLA: movimientos_libro (Libro Mayor Contable para Conciliación)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS movimientos_libro (
    id VARCHAR(50) PRIMARY KEY,
    fecha DATE NOT NULL,
    concepto TEXT NOT NULL,
    monto NUMERIC(15, 2) NOT NULL,
    tipo VARCHAR(20) CHECK (tipo IN ('DEBITO', 'CREDITO')),
    cuenta VARCHAR(50) NOT NULL,
    tercero VARCHAR(255),
    conciliado BOOLEAN DEFAULT FALSE
);

-- -------------------------------------------------------------------------
-- 8. TABLA: modificaciones_repositorio (Registro Inmutable de Auditoría v2.0)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS modificaciones_repositorio (
    id VARCHAR(50) PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    autor_id INTEGER,
    autor_nombre VARCHAR(255) NOT NULL,
    autor_email VARCHAR(255),
    autor_rol VARCHAR(50),
    tipo_accion VARCHAR(50) NOT NULL,
    descripcion TEXT NOT NULL,
    detalles TEXT,
    version_destino VARCHAR(20) DEFAULT 'v2.0',
    repositorio VARCHAR(255) DEFAULT 'Repositorio Central de Juan Yaya',
    hash_commit VARCHAR(50)
);

-- -------------------------------------------------------------------------
-- ÍNDICES DE ALTO RENDIMIENTO
-- -------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_facturas_empresa ON facturas(id_empresa);
CREATE INDEX IF NOT EXISTS idx_facturas_fecha ON facturas(fecha);
CREATE INDEX IF NOT EXISTS idx_facturas_cufe ON facturas(cufe);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_mov_banco_conciliado ON movimientos_banco(conciliado);
CREATE INDEX IF NOT EXISTS idx_mov_libro_conciliado ON movimientos_libro(conciliado);

-- =========================================================================
-- CARGUE DML: INSERCIÓN DE DATOS EXISTENTES DE CONSOLA TLM
-- =========================================================================
`;

    // 1. DML Empresas
    if (db.empresas.length > 0) {
      sql += `\n-- Datos de empresas (${db.empresas.length} registros)\n`;
      for (const e of db.empresas) {
        sql += `INSERT INTO empresas (id_empresa, nombre_comercial, nit, software_erp, software_destino, siigo_username, siigo_access_key, siigo_document_id)
VALUES (${e.id_empresa}, ${escapeSqlString(e.nombre_comercial)}, ${escapeSqlString(e.nit)}, ${escapeSqlString(e.software_erp)}, ${escapeSqlString(e.software_destino)}, ${escapeSqlString(e.siigo_username)}, ${escapeSqlString(e.siigo_access_key)}, ${e.siigo_document_id || 24})
ON CONFLICT (id_empresa) DO UPDATE SET
  nombre_comercial = EXCLUDED.nombre_comercial,
  nit = EXCLUDED.nit,
  siigo_username = EXCLUDED.siigo_username,
  siigo_access_key = EXCLUDED.siigo_access_key;\n`;
      }
    }

    // 2. DML Usuarios
    if (db.usuarios.length > 0) {
      sql += `\n-- Datos de usuarios (${db.usuarios.length} registros)\n`;
      for (const u of db.usuarios) {
        const empArray = `ARRAY[${(u.empresas_ids || [1]).join(',')}]`;
        sql += `INSERT INTO usuarios (id_usuario, nombre_completo, email, hashed_password, rol, activo, empresas_ids, requiere_cambio_password, permisos, avatar_url)
VALUES (${u.id_usuario}, ${escapeSqlString(u.nombre_completo)}, ${escapeSqlString(u.email)}, ${escapeSqlString(u.hashed_password || 'pass_token_encrypted')}, ${escapeSqlString(u.rol)}, ${escapeSqlString(u.activo)}, ${empArray}, ${escapeSqlString(u.requiere_cambio_password)}, ${escapeSqlString(u.permisos)}, ${escapeSqlString(u.avatar_url)})
ON CONFLICT (id_usuario) DO UPDATE SET
  nombre_completo = EXCLUDED.nombre_completo,
  email = EXCLUDED.email,
  rol = EXCLUDED.rol,
  activo = EXCLUDED.activo,
  permisos = EXCLUDED.permisos;\n`;
      }
    }

    // 3. DML Cuentas PUC
    if (db.cuentasPUC.length > 0) {
      sql += `\n-- Datos del Plan Único de Cuentas (${db.cuentasPUC.length} registros)\n`;
      for (const c of db.cuentasPUC) {
        sql += `INSERT INTO cuentas_puc (id_puc, id_empresa, cuenta, nombre, naturaleza)
VALUES (${c.id_puc}, ${c.id_empresa || 1}, ${escapeSqlString(c.cuenta)}, ${escapeSqlString(c.nombre)}, ${escapeSqlString(c.naturaleza || 'DEBITO')})
ON CONFLICT (id_puc) DO UPDATE SET nombre = EXCLUDED.nombre;\n`;
      }
    }

    // 4. DML Facturas
    if (db.facturas.length > 0) {
      sql += `\n-- Datos de facturas DIAN UBL (${db.facturas.length} registros)\n`;
      for (const f of db.facturas) {
        const totalCalc = f.total || (f.subtotal + f.iva - f.retencion_valor);
        sql += `INSERT INTO facturas (id_factura, id_empresa, factura_num, proveedor, nit_tercero, fecha, fecha_vencimiento, tipo_comprobante, descripcion_item, cantidad, valor_unitario, subtotal, iva, retencion_porc, retencion_valor, total, estado_revision, cufe, casilla_350, forma_pago, medio_pago, cuenta_gasto)
VALUES (${f.id_factura}, ${f.id_empresa || 1}, ${escapeSqlString(f.factura_num)}, ${escapeSqlString(f.proveedor)}, ${escapeSqlString(f.nit_tercero)}, ${escapeSqlString(f.fecha)}, ${escapeSqlString(f.fecha_vencimiento)}, ${escapeSqlString(f.tipo_comprobante)}, ${escapeSqlString(f.descripcion_item)}, ${f.cantidad || 1}, ${f.valor_unitario || 0}, ${f.subtotal || 0}, ${f.iva || 0}, ${f.retencion_porc || 0}, ${f.retencion_valor || 0}, ${totalCalc || 0}, ${escapeSqlString(f.estado_revision)}, ${escapeSqlString(f.cufe_hash)}, ${escapeSqlString(f.casilla_350)}, ${escapeSqlString(f.forma_pago)}, ${escapeSqlString(f.medio_pago)}, ${escapeSqlString(f.cuenta_gasto)})
ON CONFLICT (id_factura) DO NOTHING;\n`;
      }
    }

    // 5. DML Balance Terceros
    if (db.balanceTerceros.length > 0) {
      sql += `\n-- Balance por terceros (${db.balanceTerceros.length} registros)\n`;
      for (const b of db.balanceTerceros) {
        sql += `INSERT INTO balance_terceros (id_balance, id_empresa, cuenta_contable, nombre_cuenta, nit_tercero, nombre_tercero, saldo_inicial, debitos, creditos, saldo_final)
VALUES (${b.id_balance}, ${b.id_empresa || 1}, ${escapeSqlString(b.cuenta_contable)}, ${escapeSqlString(b.nombre_cuenta)}, ${escapeSqlString(b.nit_tercero)}, ${escapeSqlString(b.nombre_tercero)}, ${b.saldo_inicial || 0}, ${b.debitos || 0}, ${b.creditos || 0}, ${b.saldo_final || 0})
ON CONFLICT (id_balance) DO NOTHING;\n`;
      }
    }

    // 6. DML Movimientos Banco
    if (db.movimientosBanco.length > 0) {
      sql += `\n-- Movimientos de extractos bancarios (${db.movimientosBanco.length} registros)\n`;
      for (const m of db.movimientosBanco) {
        sql += `INSERT INTO movimientos_banco (id, fecha, concepto, monto, tipo, saldo, referencia, conciliado)
VALUES (${escapeSqlString(m.id)}, ${escapeSqlString(m.fecha)}, ${escapeSqlString(m.concepto)}, ${m.monto || 0}, ${escapeSqlString(m.tipo)}, ${m.saldo || 0}, ${escapeSqlString(m.referencia)}, ${escapeSqlString(m.conciliado)})
ON CONFLICT (id) DO NOTHING;\n`;
      }
    }

    // 7. DML Movimientos Libro
    if (db.movimientosLibro.length > 0) {
      sql += `\n-- Movimientos de libro contable (${db.movimientosLibro.length} registros)\n`;
      for (const l of db.movimientosLibro) {
        sql += `INSERT INTO movimientos_libro (id, fecha, concepto, monto, tipo, cuenta, tercero, conciliado)
VALUES (${escapeSqlString(l.id)}, ${escapeSqlString(l.fecha)}, ${escapeSqlString(l.concepto)}, ${l.monto || 0}, ${escapeSqlString(l.tipo)}, ${escapeSqlString(l.cuenta)}, ${escapeSqlString(l.tercero)}, ${escapeSqlString(l.conciliado)})
ON CONFLICT (id) DO NOTHING;\n`;
      }
    }

    // 8. DML Modificaciones Repositorio
    if (db.modificaciones.length > 0) {
      sql += `\n-- Registro de auditoría del repositorio v2.0 (${db.modificaciones.length} registros)\n`;
      for (const mod of db.modificaciones.slice(0, 50)) {
        sql += `INSERT INTO modificaciones_repositorio (id, timestamp, autor_id, autor_nombre, autor_email, autor_rol, tipo_accion, descripcion, detalles, version_destino, repositorio, hash_commit)
VALUES (${escapeSqlString(mod.id)}, ${escapeSqlString(mod.timestamp)}, ${mod.autor_id || 1}, ${escapeSqlString(mod.autor_nombre)}, ${escapeSqlString(mod.autor_email)}, ${escapeSqlString(mod.autor_rol)}, ${escapeSqlString(mod.tipo_accion)}, ${escapeSqlString(mod.descripcion)}, ${escapeSqlString(mod.detalles)}, ${escapeSqlString(mod.version_destino)}, ${escapeSqlString(mod.repositorio)}, ${escapeSqlString(mod.hash_commit)})
ON CONFLICT (id) DO NOTHING;\n`;
      }
    }

    sql += `\nCOMMIT;\n\n-- Fin del dump de migración para Google Cloud SQL\n`;
    return sql;
  }
}
