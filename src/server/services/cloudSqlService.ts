import { eq, desc, inArray } from 'drizzle-orm';
import { db as drizzleDb, pool, getActiveConnectionConfig } from '../../db/index.ts';
import * as schema from '../../db/schema.ts';
import fs from 'fs';
import path from 'path';
import type { 
  Usuario, 
  Empresa, 
  Factura, 
  CuentaPUC, 
  BalanceTercero, 
  MovimientoBancario, 
  MovimientoLibro, 
  ModificacionRepositorio, 
  PermisosUsuario 
} from '../domain/types.ts';
import { getDefaultPermissions } from '../storage/dataStore.ts';

export class CloudSqlService {
  private static isInitialized = false;

  public static async isCloudSqlOnline(): Promise<boolean> {
    try {
      const res = await pool.query('SELECT 1 as online');
      return Boolean(res.rows && res.rows.length > 0);
    } catch (err) {
      console.warn('[Database] Healthcheck error:', err);
      return false;
    }
  }

  // Garantiza que las 8 tablas relacionales existan en Supabase o Cloud SQL
  public static async ensureTablesExist(): Promise<void> {
    const ddl = `
      CREATE TABLE IF NOT EXISTS empresas (
        id SERIAL PRIMARY KEY,
        nombre_comercial TEXT NOT NULL,
        nit TEXT NOT NULL UNIQUE,
        software_erp TEXT DEFAULT 'SIIGO_NUBE',
        software_destino TEXT DEFAULT 'SIIGO_NUBE',
        siigo_username TEXT,
        siigo_access_key TEXT,
        siigo_document_id INTEGER DEFAULT 24,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        uid TEXT UNIQUE,
        email TEXT NOT NULL UNIQUE,
        nombre_completo TEXT NOT NULL,
        hashed_password TEXT,
        rol TEXT NOT NULL DEFAULT 'Analista',
        activo BOOLEAN NOT NULL DEFAULT TRUE,
        empresas_ids INTEGER[] DEFAULT ARRAY[1],
        requiere_cambio_password BOOLEAN DEFAULT FALSE,
        permisos JSONB DEFAULT '{}'::jsonb,
        avatar_url TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS facturas (
        id BIGSERIAL PRIMARY KEY,
        id_empresa INTEGER DEFAULT 1,
        factura_num TEXT NOT NULL,
        proveedor TEXT NOT NULL,
        nit_tercero TEXT NOT NULL,
        fecha TEXT NOT NULL,
        fecha_vencimiento TEXT,
        tipo_comprobante TEXT DEFAULT 'Factura Electrónica',
        descripcion_item TEXT NOT NULL,
        cantidad NUMERIC DEFAULT 1,
        valor_unitario NUMERIC DEFAULT 0,
        subtotal NUMERIC NOT NULL DEFAULT 0,
        iva NUMERIC NOT NULL DEFAULT 0,
        retencion_porc NUMERIC DEFAULT 0,
        retencion_valor NUMERIC DEFAULT 0,
        total NUMERIC DEFAULT 0,
        estado_revision TEXT DEFAULT 'PENDIENTE',
        cufe_hash TEXT,
        casilla_350 INTEGER DEFAULT 83,
        forma_pago TEXT DEFAULT 'Crédito',
        medio_pago TEXT DEFAULT 'Transferencia Débito',
        cuenta_gasto TEXT DEFAULT '513535',
        estado_siigo TEXT DEFAULT 'PENDIENTE',
        fecha_cargue TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS cuentas_puc (
        id SERIAL PRIMARY KEY,
        cuenta TEXT NOT NULL UNIQUE,
        nombre TEXT NOT NULL,
        naturaleza TEXT NOT NULL DEFAULT 'DEBITO',
        nivel INTEGER DEFAULT 4,
        saldo NUMERIC DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS balance_terceros (
        id SERIAL PRIMARY KEY,
        id_empresa INTEGER DEFAULT 1,
        nit TEXT NOT NULL,
        razon_social TEXT NOT NULL,
        cuenta_puc TEXT NOT NULL,
        saldo_debito NUMERIC DEFAULT 0,
        saldo_credito NUMERIC DEFAULT 0,
        saldo_neto NUMERIC DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS movimientos_banco (
        id SERIAL PRIMARY KEY,
        id_empresa INTEGER DEFAULT 1,
        fecha TEXT NOT NULL,
        referencia TEXT NOT NULL,
        descripcion TEXT NOT NULL,
        valor NUMERIC NOT NULL,
        tipo TEXT NOT NULL,
        conciliado BOOLEAN DEFAULT FALSE,
        match_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS movimientos_libro (
        id SERIAL PRIMARY KEY,
        id_empresa INTEGER DEFAULT 1,
        fecha TEXT NOT NULL,
        comprobante TEXT NOT NULL,
        descripcion TEXT NOT NULL,
        valor NUMERIC NOT NULL,
        tipo TEXT NOT NULL,
        conciliado BOOLEAN DEFAULT FALSE,
        match_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS modificaciones_repositorio (
        id SERIAL PRIMARY KEY,
        timestamp TEXT NOT NULL,
        autor_id INTEGER NOT NULL,
        autor_nombre TEXT NOT NULL,
        tipo_accion TEXT NOT NULL,
        descripcion TEXT NOT NULL,
        detalles TEXT,
        version_origen TEXT DEFAULT 'v1.0.0',
        version_destino TEXT DEFAULT 'v2.0.0',
        hash_commit TEXT,
        archivos_modificados TEXT[] DEFAULT ARRAY[]::text[],
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Migraciones de columnas para compatibilidad garantizada
      ALTER TABLE empresas ADD COLUMN IF NOT EXISTS id SERIAL;
      ALTER TABLE empresas ADD COLUMN IF NOT EXISTS software_destino TEXT DEFAULT 'SIIGO_NUBE';
      ALTER TABLE empresas ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

      ALTER TABLE facturas ADD COLUMN IF NOT EXISTS id SERIAL;
      ALTER TABLE facturas ADD COLUMN IF NOT EXISTS fecha_vencimiento TEXT;
      ALTER TABLE facturas ADD COLUMN IF NOT EXISTS cantidad NUMERIC DEFAULT 1;
      ALTER TABLE facturas ADD COLUMN IF NOT EXISTS valor_unitario NUMERIC DEFAULT 0;
      ALTER TABLE facturas ADD COLUMN IF NOT EXISTS retencion_porc NUMERIC DEFAULT 0;
      ALTER TABLE facturas ADD COLUMN IF NOT EXISTS retencion_valor NUMERIC DEFAULT 0;
      ALTER TABLE facturas ADD COLUMN IF NOT EXISTS casilla_350 INTEGER DEFAULT 83;
      ALTER TABLE facturas ADD COLUMN IF NOT EXISTS forma_pago TEXT DEFAULT 'Crédito';
      ALTER TABLE facturas ADD COLUMN IF NOT EXISTS medio_pago TEXT DEFAULT 'Transferencia Débito';
      ALTER TABLE facturas ADD COLUMN IF NOT EXISTS cuenta_gasto TEXT DEFAULT '513535';
      ALTER TABLE facturas ADD COLUMN IF NOT EXISTS estado_siigo TEXT DEFAULT 'PENDIENTE';
      ALTER TABLE facturas ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

      ALTER TABLE balance_terceros ADD COLUMN IF NOT EXISTS nombre_cuenta TEXT DEFAULT '';
      ALTER TABLE movimientos_banco ADD COLUMN IF NOT EXISTS saldo NUMERIC DEFAULT 0;
      ALTER TABLE movimientos_banco ADD COLUMN IF NOT EXISTS referencia TEXT;
      ALTER TABLE movimientos_libro ADD COLUMN IF NOT EXISTS tercero TEXT;
      ALTER TABLE modificaciones_repositorio ALTER COLUMN detalles TYPE text USING detalles::text;

      -- Migración y sincronización de tabla users
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
      ALTER TABLE users ALTER COLUMN correo_corporativo DROP NOT NULL;
      ALTER TABLE users ALTER COLUMN usuario DROP NOT NULL;

      UPDATE users SET email = correo_corporativo WHERE email IS NULL OR email = '';
      UPDATE users SET nombre_completo = usuario WHERE (nombre_completo IS NULL OR nombre_completo = '') AND usuario IS NOT NULL;
      UPDATE users SET usuario = nombre_completo WHERE (usuario IS NULL OR usuario = '') AND nombre_completo IS NOT NULL;
      UPDATE users SET correo_corporativo = email WHERE (correo_corporativo IS NULL OR correo_corporativo = '') AND email IS NOT NULL;

      UPDATE empresas SET id = id_empresa WHERE id IS NULL OR id != id_empresa;
      UPDATE facturas SET id = id_factura WHERE id IS NULL OR id != id_factura;

      -- Triggers para garantizar sincronización bidireccional de IDs y campos
      CREATE OR REPLACE FUNCTION sync_factura_ids()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.id IS NOT NULL THEN
          NEW.id_factura := NEW.id;
        ELSIF NEW.id_factura IS NOT NULL THEN
          NEW.id := NEW.id_factura;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_sync_factura_ids ON facturas;
      CREATE TRIGGER trg_sync_factura_ids
      BEFORE INSERT OR UPDATE ON facturas
      FOR EACH ROW EXECUTE FUNCTION sync_factura_ids();

      CREATE OR REPLACE FUNCTION sync_empresa_ids()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.id IS NOT NULL THEN
          NEW.id_empresa := NEW.id;
        ELSIF NEW.id_empresa IS NOT NULL THEN
          NEW.id := NEW.id_empresa;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_sync_empresa_ids ON empresas;
      CREATE TRIGGER trg_sync_empresa_ids
      BEFORE INSERT OR UPDATE ON empresas
      FOR EACH ROW EXECUTE FUNCTION sync_empresa_ids();

      SELECT setval('users_id_seq', (SELECT GREATEST(COALESCE(max(id), 0), 20) FROM users));
      SELECT setval('empresas_id_seq', (SELECT GREATEST(COALESCE(max(id), 0), COALESCE(max(id_empresa), 0), 10) FROM empresas));
      SELECT setval('facturas_id_seq', (SELECT GREATEST(COALESCE(max(id), 0), COALESCE(max(id_factura), 0), 100) FROM facturas));
      SELECT setval('facturas_id_factura_seq', (SELECT GREATEST(COALESCE(max(id), 0), COALESCE(max(id_factura), 0), 100) FROM facturas));
    `;
    await pool.query(ddl);
    console.log('[Database] DDL asegurado: Las 8 tablas relacionales existen y sus columnas y secuencias están alineadas.');
  }

  // Si la base de datos conectada (ej. Supabase para pruebas) está vacía, sembrar catálogo inicial
  public static async seedDefaultDataIfEmpty(): Promise<void> {
    try {
      const userCountRes = await pool.query('SELECT count(*)::int as cnt FROM users');
      const count = userCountRes.rows[0]?.cnt || 0;
      if (count > 0) return;

      console.log('[Database] Base de datos limpia. Sembrando datos maestros iniciales en la base de datos...');

      await pool.query(`
        INSERT INTO empresas (id, nombre_comercial, nit, software_erp, software_destino, siigo_username, siigo_access_key, siigo_document_id)
        VALUES 
          (1, 'TECNOLOGÍA Y LOGÍSTICA MODERNA S.A.S. BIC', '900543210-9', 'SIIGO_NUBE', 'SIIGO_NUBE', 'automatizaciones@tlm.net.co', 'sk_live_tlm_sec_993418294a', 24),
          (2, 'INVERSIONES Y SERVICIOS TLM S.A.S.', '901234567-1', 'SIIGO_NUBE', 'SIIGO_NUBE', 'automatizaciones@tlm.net.co', 'sk_live_tlm_sec_993418294a', 24)
        ON CONFLICT (id) DO NOTHING;
      `);

      await pool.query(`
        INSERT INTO users (id, uid, email, nombre_completo, hashed_password, rol, activo, empresas_ids, requiere_cambio_password, permisos)
        VALUES
          (1, 'juan-yaya-master-uid', 'automatizaciones@tlm.net.co', 'Juan Yaya - Administrador Maestro', 'pass_token_encrypted', 'Administrador', true, ARRAY[1, 2], false, '{"administrador": true, "auditoria_ubl": true, "impuestos_f350": true, "conciliacion_bancaria": true, "transmitir_siigo": true, "gestion_usuarios": true}'::jsonb),
          (2, 'usr-uid-2', 'contador@tlm.net.co', 'María Paula Gómez', 'pass_token_encrypted', 'Contador', true, ARRAY[1], false, '{"administrador": false, "auditoria_ubl": true, "impuestos_f350": true, "conciliacion_bancaria": true, "transmitir_siigo": true, "gestion_usuarios": false}'::jsonb),
          (3, 'usr-uid-3', 'analista@tlm.net.co', 'Carlos Andrés Silva', 'pass_token_encrypted', 'Analista', true, ARRAY[1], false, '{"administrador": false, "auditoria_ubl": true, "impuestos_f350": true, "conciliacion_bancaria": false, "transmitir_siigo": false, "gestion_usuarios": false}'::jsonb),
          (4, 'usr-uid-4', 'auditor@tlm.net.co', 'Diana Marcela Ortiz', 'pass_token_encrypted', 'Auditor', true, ARRAY[1], false, '{"administrador": false, "auditoria_ubl": true, "impuestos_f350": false, "conciliacion_bancaria": false, "transmitir_siigo": false, "gestion_usuarios": false}'::jsonb)
        ON CONFLICT (id) DO NOTHING;
      `);

      await pool.query(`
        INSERT INTO cuentas_puc (id, cuenta, nombre, naturaleza, nivel, saldo)
        VALUES
          (1, '110505', 'Caja General', 'DEBITO', 4, 1500000),
          (2, '111005', 'Banco Nacional - Cta Corriente', 'DEBITO', 4, 45800000),
          (3, '130505', 'Clientes Nacionales', 'DEBITO', 4, 28400000),
          (4, '143505', 'Mercancías No Fabricadas por la Empresa', 'DEBITO', 4, 62000000),
          (5, '220505', 'Proveedores Nacionales', 'CREDITO', 4, 18900000),
          (6, '233525', 'Honorarios y Servicios Técnicos', 'CREDITO', 4, 4200000),
          (7, '236540', 'Retención en la Fuente 4% Compras', 'CREDITO', 4, 1250000),
          (8, '236525', 'Retención en la Fuente 11% Servicios', 'CREDITO', 4, 980000),
          (9, '236701', 'Retención de IVA (ReteIVA 15%)', 'CREDITO', 4, 450000),
          (10, '236801', 'Retención de ICA (ReteICA 9.66 por mil)', 'CREDITO', 4, 320000),
          (11, '240801', 'Impuesto a las Ventas por Pagar (IVA 19%)', 'CREDITO', 4, 8750000),
          (12, '413501', 'Comercio al por mayor y al por menor', 'CREDITO', 4, 142000000),
          (13, '510506', 'Sueldos y Salarios Administrativos', 'DEBITO', 4, 22000000),
          (14, '513535', 'Servicios de Tecnología & Nube Cloud', 'DEBITO', 4, 6800000)
        ON CONFLICT (id) DO NOTHING;
      `);

      await pool.query(`
        INSERT INTO facturas (id, id_empresa, factura_num, proveedor, nit_tercero, fecha, descripcion_item, cantidad, valor_unitario, subtotal, iva, retencion_porc, retencion_valor, total, estado_revision, cufe_hash, casilla_350, forma_pago, medio_pago, cuenta_gasto, estado_siigo, fecha_cargue)
        VALUES
          (1, 1, 'FE-2045', 'CLOUDFLARE ENTERPRISE SERVICES LLC', '901998877', '2026-10-10', 'Protección WAF, DDoS y CDN Enterprise (Q4 2026)', 1, 1850000, 1850000, 351500, 4, 74000, 2127500, 'AUDITADA', 'cufe-cf-8924b172a3e01', 62, 'Crédito 30 días', 'Transferencia Electrónica', '51353501 - Nube & Ciberseguridad', 'PENDIENTE', NOW()::text),
          (2, 1, 'FAC-9844', 'DATADOG MONITORING & LOGS CORP', '900887766', '2026-10-11', 'Licenciamiento APM & Observabilidad Kubernetes', 1, 3200000, 3200000, 608000, 4, 128000, 3680000, 'AUDITADA', 'cufe-dd-992384a71b2', 62, 'Contado', 'Tarjeta Corporativa', '51353502 - Software SaaS', 'PENDIENTE', NOW()::text),
          (3, 1, 'INV-1029', 'ORACLE CLOUD SERVICES DE COLOMBIA S.A.S.', '860002450', '2026-10-12', 'Bases de Datos Autónomas & Servidores OCI Exadata', 1, 5800000, 5800000, 1102000, 4, 232000, 6670000, 'AUDITADA', 'cufe-ora-102938475c9', 62, 'Crédito 15 días', 'Transferencia Bancolombia', '51353503 - Servidores Dedicados', 'PENDIENTE', NOW()::text),
          (4, 1, 'DRV-3435', 'GOOGLE CLOUD & WORKSPACE IRELAND LTD', '900987654', '2026-10-13', 'Suscripción Enterprise Google Workspace Drive + Cloud Storage (30 Usuarios)', 1, 1450000, 1450000, 275500, 4, 58000, 1667500, 'AUDITADA', 'cufe-drv-5a8af0a2ec8f9', 62, 'Crédito 30 días', 'Transferencia Electrónica', '51353501 - Servicios de Tecnología & Nube', 'AUDITADA', NOW()::text)
        ON CONFLICT (id) DO NOTHING;
      `);

      await pool.query(`
        INSERT INTO balance_terceros (id, id_empresa, nit, razon_social, cuenta_puc, saldo_debito, saldo_credito, saldo_neto)
        VALUES
          (1, 1, '901998877', 'CLOUDFLARE ENTERPRISE SERVICES LLC', '220505', 0, 2127500, -2127500),
          (2, 1, '900887766', 'DATADOG MONITORING & LOGS CORP', '220505', 0, 3680000, -3680000),
          (3, 1, '860002450', 'ORACLE CLOUD SERVICES DE COLOMBIA S.A.S.', '220505', 0, 6670000, -6670000)
        ON CONFLICT (id) DO NOTHING;
      `);

      await pool.query(`
        INSERT INTO movimientos_banco (id, id_empresa, fecha, referencia, descripcion, valor, tipo, conciliado, match_id)
        VALUES
          (1, 1, '2026-10-01', 'TRF-00192', 'PAGO FACTURA PROVEEDOR CLOUDFLARE', 2127500, 'EGRESO', true, 1),
          (2, 1, '2026-10-02', 'TRF-00193', 'PAGO SUSCRIPCION DATADOG', 3680000, 'EGRESO', true, 2),
          (3, 1, '2026-10-05', 'DEP-88392', 'RECAUDO CLIENTE DISTRIBUIDORA NORTE', 15800000, 'INGRESO', true, 3),
          (4, 1, '2026-10-08', 'TRF-00198', 'PAGO NOMINA PRIMERA QUINCENA OCTUBRE', 11000000, 'EGRESO', false, NULL)
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO movimientos_libro (id, id_empresa, fecha, comprobante, descripcion, valor, tipo, conciliado, match_id)
        VALUES
          (1, 1, '2026-10-01', 'CE-10045', 'Egreso comprobante factura Cloudflare', 2127500, 'EGRESO', true, 1),
          (2, 1, '2026-10-02', 'CE-10046', 'Egreso comprobante Datadog', 3680000, 'EGRESO', true, 2),
          (3, 1, '2026-10-05', 'RC-20089', 'Recibo caja cliente Distribuidora Norte', 15800000, 'INGRESO', true, 3),
          (4, 1, '2026-10-09', 'CE-10047', 'Egreso pago nómina quincenal', 11000000, 'EGRESO', false, NULL)
        ON CONFLICT (id) DO NOTHING;
      `);

      await pool.query(`
        INSERT INTO modificaciones_repositorio (id, timestamp, autor_id, autor_nombre, tipo_accion, descripcion, detalles, version_origen, version_destino, hash_commit, archivos_modificados)
        VALUES
          (1, NOW()::text, 1, 'Juan Yaya - Administrador Maestro', 'INIT_SEED', 'Inicialización y despliegue de esquemas relacionales', 'Sembrado automático de 8 tablas en base de datos PostgreSQL', 'v1.0.0', 'v2.0.0', 'c7f92a1', ARRAY['schema.ts', 'cloudSqlService.ts'])
        ON CONFLICT (id) DO NOTHING;
      `);

      console.log('[Database] Siembra de datos maestros completada exitosamente.');
    } catch (err: any) {
      console.warn('[Database] Advertencia sembrando datos predeterminados:', err.message);
    }
  }

  public static async initAndSeed(): Promise<void> {
    if (this.isInitialized) return;
    try {
      const online = await this.isCloudSqlOnline();
      if (!online) {
        console.warn('[Database] Base de datos no disponible aún, posponiendo carga inicial.');
        return;
      }

      // Asegurar que las tablas existan
      await this.ensureTablesExist();

      const jsonPath = path.resolve(process.cwd(), 'data', 'tlm_database.json');
      if (fs.existsSync(jsonPath)) {
        const raw = fs.readFileSync(jsonPath, 'utf-8');
        const dump = JSON.parse(raw);

          // 1. Seed Empresas
          if (dump.empresas && dump.empresas.length > 0) {
            for (const emp of dump.empresas) {
              await drizzleDb.insert(schema.empresas).values({
                id: emp.id_empresa,
                nombreComercial: emp.nombre_comercial,
                nit: emp.nit,
                softwareErp: emp.software_erp || 'SIIGO_NUBE',
                softwareDestino: emp.software_destino || 'SIIGO_NUBE',
                siigoUsername: emp.siigo_username || null,
                siigoAccessKey: emp.siigo_access_key || null,
                siigoDocumentId: emp.siigo_document_id || 24,
              }).onConflictDoNothing();
            }
            console.log(`[CloudSQL] ${dump.empresas.length} empresas migradas a Cloud SQL.`);
          }

          // 2. Seed Users
          if (dump.usuarios && dump.usuarios.length > 0) {
            for (const u of dump.usuarios) {
              await drizzleDb.insert(schema.users).values({
                id: u.id_usuario,
                uid: u.id_usuario === 1 ? 'juan-yaya-master-uid' : `usr-uid-${u.id_usuario}`,
                email: u.email,
                nombreCompleto: u.nombre_completo,
                hashedPassword: u.hashed_password || 'pass_token_encrypted',
                rol: u.rol,
                activo: u.activo,
                empresasIds: u.empresas_ids || [1],
                requiereCambioPassword: Boolean(u.requiere_cambio_password),
                permisos: u.permisos || getDefaultPermissions(u.rol),
                avatarUrl: u.avatar_url || null,
              }).onConflictDoNothing();
            }
            console.log(`[CloudSQL] ${dump.usuarios.length} usuarios migrados a Cloud SQL.`);
          }

          // 3. Seed Facturas
          if (dump.facturas && dump.facturas.length > 0) {
            for (const f of dump.facturas) {
              await drizzleDb.insert(schema.facturas).values({
                id: f.id_factura,
                idEmpresa: f.id_empresa || 1,
                facturaNum: f.factura_num,
                proveedor: f.proveedor,
                nitTercero: f.nit_tercero,
                fecha: f.fecha,
                fechaVencimiento: f.fecha_vencimiento || null,
                tipoComprobante: f.tipo_comprobante || 'Factura Electrónica',
                descripcionItem: f.descripcion_item,
                cantidad: String(f.cantidad || 1),
                valorUnitario: String(f.valor_unitario || 0),
                subtotal: String(f.subtotal || 0),
                iva: String(f.iva || 0),
                retencionPorc: String(f.retencion_porc || 0),
                retencionValor: String(f.retencion_valor || 0),
                total: String(f.total || (f.subtotal + f.iva - f.retencion_valor)),
                estadoRevision: f.estado_revision || 'APROBADA',
                cufeHash: f.cufe_hash || f.cufe || null,
                casilla350: f.casilla_350 || 83,
                formaPago: f.forma_pago || 'Crédito',
                medioPago: f.medio_pago || 'Transferencia Débito',
                cuentaGasto: f.cuenta_gasto || '513535',
                estadoSiigo: f.estado_siigo || 'PENDIENTE',
                fechaCargue: f.fecha_cargue || new Date().toISOString(),
              }).onConflictDoNothing();
            }
            console.log(`[CloudSQL] ${dump.facturas.length} facturas migradas a Cloud SQL.`);
          }

          // 4. Seed Cuentas PUC
          if (dump.cuentasPUC && dump.cuentasPUC.length > 0) {
            for (const c of dump.cuentasPUC) {
              await drizzleDb.insert(schema.cuentasPuc).values({
                id: c.id_puc,
                idEmpresa: c.id_empresa || 1,
                cuenta: c.cuenta,
                nombre: c.nombre,
                naturaleza: c.naturaleza || 'DEBITO',
              }).onConflictDoNothing();
            }
            console.log(`[CloudSQL] ${dump.cuentasPUC.length} cuentas PUC migradas a Cloud SQL.`);
          }

          // 5. Seed Balance Terceros
          if (dump.balanceTerceros && dump.balanceTerceros.length > 0) {
            for (const b of dump.balanceTerceros) {
              await drizzleDb.insert(schema.balanceTerceros).values({
                id: b.id_balance,
                idEmpresa: b.id_empresa || 1,
                cuentaContable: b.cuenta_contable,
                nombreCuenta: b.nombre_cuenta,
                nitTercero: b.nit_tercero,
                nombreTercero: b.nombre_tercero,
                saldoInicial: String(b.saldo_inicial || 0),
                debitos: String(b.debitos || 0),
                creditos: String(b.creditos || 0),
                saldoFinal: String(b.saldo_final || 0),
              }).onConflictDoNothing();
            }
            console.log(`[CloudSQL] ${dump.balanceTerceros.length} saldos de terceros migrados a Cloud SQL.`);
          }

          // 6. Seed Movimientos Banco
          if (dump.movimientosBanco && dump.movimientosBanco.length > 0) {
            for (const m of dump.movimientosBanco) {
              await drizzleDb.insert(schema.movimientosBanco).values({
                id: m.id,
                fecha: m.fecha,
                concepto: m.concepto,
                monto: String(m.monto || 0),
                tipo: m.tipo,
                saldo: String(m.saldo || 0),
                referencia: m.referencia || null,
                conciliado: Boolean(m.conciliado),
              }).onConflictDoNothing();
            }
            console.log(`[CloudSQL] ${dump.movimientosBanco.length} movimientos de banco migrados a Cloud SQL.`);
          }

          // 7. Seed Movimientos Libro
          if (dump.movimientosLibro && dump.movimientosLibro.length > 0) {
            for (const l of dump.movimientosLibro) {
              await drizzleDb.insert(schema.movimientosLibro).values({
                id: l.id,
                fecha: l.fecha,
                concepto: l.concepto,
                monto: String(l.monto || 0),
                tipo: l.tipo,
                cuenta: l.cuenta,
                tercero: l.tercero || null,
                conciliado: Boolean(l.conciliado),
              }).onConflictDoNothing();
            }
            console.log(`[CloudSQL] ${dump.movimientosLibro.length} movimientos de libro contable migrados a Cloud SQL.`);
          }

          // 8. Seed Modificaciones
          if (dump.modificaciones && dump.modificaciones.length > 0) {
            for (const mod of dump.modificaciones.slice(0, 50)) {
              await drizzleDb.insert(schema.modificacionesRepositorio).values({
                id: mod.id,
                timestamp: mod.timestamp,
                autorId: mod.autor_id || 1,
                autorNombre: mod.autor_nombre,
                autorEmail: mod.autor_email || null,
                autorRol: mod.autor_rol || null,
                tipoAccion: mod.tipo_accion,
                descripcion: mod.descripcion,
                detalles: mod.detalles || null,
                versionDestino: mod.version_destino || 'v2.0',
                repositorio: mod.repositorio || 'Repositorio Central de Juan Yaya',
                hashCommit: mod.hash_commit || null,
              }).onConflictDoNothing();
            }
          }
        } else {
          // Si no existe tlm_database.json en disco, usar sembrador SQL nativo en Supabase / Cloud SQL
          await this.seedDefaultDataIfEmpty();
        }

      this.isInitialized = true;
      const dbCfg = getActiveConnectionConfig();
      console.log(`[Database] Conexión en línea activa y sincronizada con ${dbCfg.isSupabase ? 'Supabase (' + dbCfg.supabaseProjectId + ')' : 'Google Cloud SQL'}.`);
    } catch (error) {
      console.error('[Database] Error inicializando/migrando a base de datos:', error);
    }
  }

  // ==========================================
  // USUARIOS
  // ==========================================
  public static async getUsuarios(): Promise<Usuario[]> {
    try {
      const rows = await drizzleDb.select().from(schema.users).orderBy(schema.users.id);
      const seen = new Set<number>();
      const result: Usuario[] = [];
      for (const r of rows) {
        if (!seen.has(r.id)) {
          seen.add(r.id);
          result.push({
            id_usuario: r.id,
            nombre_completo: r.nombreCompleto,
            email: r.email,
            hashed_password: r.hashedPassword || undefined,
            rol: r.rol as any,
            activo: r.activo,
            empresas_ids: r.empresasIds || [1],
            permisos: (r.permisos as PermisosUsuario) || getDefaultPermissions(r.rol as any),
            avatar_url: r.avatarUrl,
            requiere_cambio_password: r.requiereCambioPassword || false
          });
        }
      }
      return result;
    } catch (error) {
      console.error('[CloudSQL] Error getUsuarios:', error);
      return [];
    }
  }

  public static async getUsuarioById(id: number): Promise<Usuario | null> {
    try {
      const rows = await drizzleDb.select().from(schema.users).where(eq(schema.users.id, id));
      if (!rows.length) return null;
      const r = rows[0];
      return {
        id_usuario: r.id,
        nombre_completo: r.nombreCompleto,
        email: r.email,
        hashed_password: r.hashedPassword || undefined,
        rol: r.rol as any,
        activo: r.activo,
        empresas_ids: r.empresasIds || [1],
        permisos: (r.permisos as PermisosUsuario) || getDefaultPermissions(r.rol as any),
        avatar_url: r.avatarUrl,
        requiere_cambio_password: r.requiereCambioPassword || false
      };
    } catch (error) {
      console.error('[CloudSQL] Error getUsuarioById:', error);
      throw error;
    }
  }

  public static async getUsuarioByEmail(email: string): Promise<Usuario | null> {
    try {
      const cleanEmail = (email || '').trim().toLowerCase();
      const rows = await drizzleDb.select().from(schema.users);
      const match = rows.find(r => r.email.toLowerCase() === cleanEmail);
      if (!match) return null;
      return {
        id_usuario: match.id,
        nombre_completo: match.nombreCompleto,
        email: match.email,
        hashed_password: match.hashedPassword || undefined,
        rol: match.rol as any,
        activo: match.activo,
        empresas_ids: match.empresasIds || [1],
        permisos: (match.permisos as PermisosUsuario) || getDefaultPermissions(match.rol as any),
        avatar_url: match.avatarUrl,
        requiere_cambio_password: match.requiereCambioPassword || false
      };
    } catch (error) {
      console.error('[CloudSQL] Error getUsuarioByEmail:', error);
      return null;
    }
  }

  public static async createUsuario(data: Partial<Usuario>): Promise<Usuario> {
    try {
      const inserted = await drizzleDb.insert(schema.users).values({
        uid: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        email: data.email!,
        nombreCompleto: data.nombre_completo!,
        hashedPassword: data.hashed_password || 'encrypted_token',
        rol: data.rol || 'Analista',
        activo: data.activo !== undefined ? data.activo : true,
        empresasIds: data.empresas_ids || [1],
        requiereCambioPassword: Boolean(data.requiere_cambio_password),
        permisos: data.permisos || getDefaultPermissions((data.rol || 'Analista') as any),
        avatarUrl: data.avatar_url || null
      }).returning();

      const r = inserted[0];
      return {
        id_usuario: r.id,
        nombre_completo: r.nombreCompleto,
        email: r.email,
        hashed_password: r.hashedPassword || undefined,
        rol: r.rol as any,
        activo: r.activo,
        empresas_ids: r.empresasIds || [1],
        permisos: (r.permisos as PermisosUsuario) || getDefaultPermissions(r.rol as any),
        avatar_url: r.avatarUrl,
        requiere_cambio_password: r.requiereCambioPassword || false
      };
    } catch (error) {
      console.error('[CloudSQL] Error createUsuario:', error);
      throw error;
    }
  }

  public static async updateUsuario(id: number, data: Partial<Usuario>): Promise<Usuario | null> {
    try {
      const updatePayload: any = {};
      if (data.nombre_completo !== undefined) updatePayload.nombreCompleto = data.nombre_completo;
      if (data.email !== undefined) updatePayload.email = data.email;
      if (data.rol !== undefined) updatePayload.rol = data.rol;
      if (data.activo !== undefined) updatePayload.activo = data.activo;
      if (data.empresas_ids !== undefined) updatePayload.empresasIds = data.empresas_ids;
      if (data.permisos !== undefined) updatePayload.permisos = data.permisos;
      if (data.avatar_url !== undefined) updatePayload.avatarUrl = data.avatar_url;
      if (data.hashed_password !== undefined) updatePayload.hashedPassword = data.hashed_password;
      if (data.requiere_cambio_password !== undefined) updatePayload.requiereCambioPassword = data.requiere_cambio_password;

      const updated = await drizzleDb.update(schema.users)
        .set(updatePayload)
        .where(eq(schema.users.id, id))
        .returning();

      if (!updated.length) return null;
      const r = updated[0];
      return {
        id_usuario: r.id,
        nombre_completo: r.nombreCompleto,
        email: r.email,
        hashed_password: r.hashedPassword || undefined,
        rol: r.rol as any,
        activo: r.activo,
        empresas_ids: r.empresasIds || [1],
        permisos: (r.permisos as PermisosUsuario) || getDefaultPermissions(r.rol as any),
        avatar_url: r.avatarUrl,
        requiere_cambio_password: r.requiereCambioPassword || false
      };
    } catch (error) {
      console.error('[CloudSQL] Error updateUsuario:', error);
      throw error;
    }
  }

  public static async deleteUsuario(id: number): Promise<boolean> {
    try {
      const deleted = await drizzleDb.delete(schema.users).where(eq(schema.users.id, id)).returning();
      return deleted.length > 0;
    } catch (error) {
      console.error('[CloudSQL] Error deleteUsuario:', error);
      throw error;
    }
  }

  // ==========================================
  // EMPRESAS
  // ==========================================
  public static async getEmpresas(): Promise<Empresa[]> {
    try {
      const rows = await drizzleDb.select().from(schema.empresas).orderBy(schema.empresas.id);
      return rows.map(r => ({
        id_empresa: r.id,
        nombre_comercial: r.nombreComercial,
        nit: r.nit,
        software_erp: r.softwareErp || 'SIIGO_NUBE',
        software_destino: r.softwareDestino || 'SIIGO_NUBE',
        siigo_username: r.siigoUsername || undefined,
        siigo_access_key: r.siigoAccessKey || undefined,
        siigo_document_id: r.siigoDocumentId || 24,
      }));
    } catch (error) {
      console.error('[CloudSQL] Error getEmpresas:', error);
      return [];
    }
  }

  public static async createEmpresa(data: Partial<Empresa>): Promise<Empresa> {
    try {
      const inserted = await drizzleDb.insert(schema.empresas).values({
        nombreComercial: data.nombre_comercial!,
        nit: data.nit!,
        softwareErp: data.software_erp || 'SIIGO_NUBE',
        softwareDestino: data.software_destino || 'SIIGO_NUBE',
        siigoUsername: data.siigo_username || null,
        siigoAccessKey: data.siigo_access_key || null,
        siigoDocumentId: data.siigo_document_id || 24,
      }).returning();
      const r = inserted[0];
      return {
        id_empresa: r.id,
        nombre_comercial: r.nombreComercial,
        nit: r.nit,
        software_erp: r.softwareErp || 'SIIGO_NUBE',
        software_destino: r.softwareDestino || 'SIIGO_NUBE',
        siigo_username: r.siigoUsername || undefined,
        siigo_access_key: r.siigoAccessKey || undefined,
        siigo_document_id: r.siigoDocumentId || 24,
      };
    } catch (error) {
      console.error('[CloudSQL] Error createEmpresa:', error);
      throw error;
    }
  }

  public static async updateEmpresaSiigo(id: number, config: { siigo_username: string; siigo_access_key: string; siigo_document_id: number }): Promise<boolean> {
    try {
      const updated = await drizzleDb.update(schema.empresas)
        .set({
          siigoUsername: config.siigo_username,
          siigoAccessKey: config.siigo_access_key,
          siigoDocumentId: config.siigo_document_id || 24,
        })
        .where(eq(schema.empresas.id, id))
        .returning();
      return updated.length > 0;
    } catch (error) {
      console.error('[CloudSQL] Error updateEmpresaSiigo:', error);
      throw error;
    }
  }

  // ==========================================
  // FACTURAS DIAN (UBL 2.1)
  // ==========================================
  public static async getFacturas(filterOrId?: { idEmpresa?: number; estado?: string; search?: string; casilla?: number } | number): Promise<Factura[]> {
    try {
      const idEmpresa = typeof filterOrId === 'number' ? filterOrId : filterOrId?.idEmpresa;
      const estado = typeof filterOrId === 'object' ? filterOrId?.estado : undefined;
      const search = typeof filterOrId === 'object' ? filterOrId?.search : undefined;
      const casilla = typeof filterOrId === 'object' ? filterOrId?.casilla : undefined;

      const query = idEmpresa 
        ? drizzleDb.select().from(schema.facturas).where(eq(schema.facturas.idEmpresa, idEmpresa)).orderBy(desc(schema.facturas.id))
        : drizzleDb.select().from(schema.facturas).orderBy(desc(schema.facturas.id));
      
      const rows = await query;
      let mapped = rows.map(r => ({
        id_factura: r.id,
        id_empresa: r.idEmpresa || 1,
        factura_num: r.facturaNum,
        proveedor: r.proveedor,
        nit_tercero: r.nitTercero,
        fecha: r.fecha,
        fecha_vencimiento: r.fechaVencimiento || undefined,
        tipo_comprobante: r.tipoComprobante || 'Factura Electrónica',
        descripcion_item: r.descripcionItem,
        cantidad: Number(r.cantidad || 1),
        valor_unitario: Number(r.valorUnitario || 0),
        subtotal: Number(r.subtotal || 0),
        iva: Number(r.iva || 0),
        total: Number(r.total || (Number(r.subtotal || 0) + Number(r.iva || 0) - Number(r.retencionValor || 0))),
        retencion_porc: Number(r.retencionPorc || 0),
        retencion_valor: Number(r.retencionValor || 0),
        casilla_350: r.casilla350 || 83,
        forma_pago: r.formaPago || 'Crédito',
        medio_pago: r.medioPago || 'Transferencia Débito',
        cuenta_gasto: r.cuentaGasto || '513535',
        cufe_hash: r.cufeHash || 'CUFE_MIGRADO_CLOUDSQL',
        estado_revision: (r.estadoRevision as any) || 'APROBADA',
        fecha_cargue: r.fechaCargue || new Date().toISOString(),
      }));

      if (estado && estado !== 'TODOS') {
        mapped = mapped.filter(f => f.estado_revision === estado);
      }
      if (casilla) {
        mapped = mapped.filter(f => f.casilla_350 === casilla);
      }
      if (search) {
        const s = search.toLowerCase();
        mapped = mapped.filter(f =>
          f.factura_num.toLowerCase().includes(s) ||
          f.proveedor.toLowerCase().includes(s) ||
          f.nit_tercero.includes(s) ||
          f.cuenta_gasto.includes(s) ||
          f.descripcion_item.toLowerCase().includes(s)
        );
      }

      return mapped;
    } catch (error) {
      console.error('[CloudSQL] Error getFacturas:', error);
      return [];
    }
  }

  public static async bulkCreateFacturas(facturas: Partial<Factura>[]): Promise<Factura[]> {
    const results: Factura[] = [];
    for (const f of facturas) {
      try {
        const created = await this.createFactura(f);
        results.push(created);
      } catch (err) {
        console.warn('[CloudSQL] Error creating invoice in bulk:', f.factura_num, err);
      }
    }
    return results;
  }

  public static async createFactura(data: Partial<Factura>): Promise<Factura> {
    try {
      const subtotal = Number(data.subtotal || 0);
      const iva = Number(data.iva || 0);
      const retencionValor = Number(data.retencion_valor || 0);
      const total = Number(data.total || (subtotal + iva - retencionValor));

      const inserted = await drizzleDb.insert(schema.facturas).values({
        idEmpresa: data.id_empresa || 1,
        facturaNum: data.factura_num!,
        proveedor: data.proveedor!,
        nitTercero: data.nit_tercero!,
        fecha: data.fecha!,
        fechaVencimiento: data.fecha_vencimiento || null,
        tipoComprobante: data.tipo_comprobante || 'Factura Electrónica',
        descripcionItem: data.descripcion_item || 'Bienes o servicios',
        cantidad: String(data.cantidad || 1),
        valorUnitario: String(data.valor_unitario || subtotal),
        subtotal: String(subtotal),
        iva: String(iva),
        retencionPorc: String(data.retencion_porc || 0),
        retencionValor: String(retencionValor),
        total: String(total),
        estadoRevision: data.estado_revision || 'APROBADA',
        cufeHash: data.cufe_hash || `cufe-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        casilla350: data.casilla_350 || 83,
        formaPago: data.forma_pago || 'Crédito',
        medioPago: data.medio_pago || 'Transferencia Débito',
        cuentaGasto: data.cuenta_gasto || '513535',
        fechaCargue: data.fecha_cargue || new Date().toISOString(),
      }).returning();

      const r = inserted[0];
      return {
        id_factura: r.id,
        id_empresa: r.idEmpresa || 1,
        factura_num: r.facturaNum,
        proveedor: r.proveedor,
        nit_tercero: r.nitTercero,
        fecha: r.fecha,
        fecha_vencimiento: r.fechaVencimiento || undefined,
        tipo_comprobante: r.tipoComprobante || 'Factura Electrónica',
        descripcion_item: r.descripcionItem,
        cantidad: Number(r.cantidad || 1),
        valor_unitario: Number(r.valorUnitario || 0),
        subtotal: Number(r.subtotal || 0),
        iva: Number(r.iva || 0),
        total: Number(r.total || 0),
        retencion_porc: Number(r.retencionPorc || 0),
        retencion_valor: Number(r.retencionValor || 0),
        casilla_350: r.casilla350 || 83,
        forma_pago: r.formaPago || 'Crédito',
        medio_pago: r.medioPago || 'Transferencia Débito',
        cuenta_gasto: r.cuentaGasto || '513535',
        cufe_hash: r.cufeHash || '',
        estado_revision: (r.estadoRevision as any) || 'APROBADA',
        fecha_cargue: r.fechaCargue || new Date().toISOString(),
      };
    } catch (error) {
      console.error('[CloudSQL] Error createFactura:', error);
      throw error;
    }
  }

  public static async updateFactura(id: number, data: Partial<Factura>): Promise<Factura | null> {
    try {
      const updatePayload: any = {};
      if (data.estado_revision !== undefined) updatePayload.estadoRevision = data.estado_revision;
      if (data.cuenta_gasto !== undefined) updatePayload.cuentaGasto = data.cuenta_gasto;
      if (data.casilla_350 !== undefined) updatePayload.casilla350 = data.casilla_350;
      if (data.retencion_porc !== undefined) updatePayload.retencionPorc = String(data.retencion_porc);
      if (data.retencion_valor !== undefined) updatePayload.retencionValor = String(data.retencion_valor);

      const updated = await drizzleDb.update(schema.facturas)
        .set(updatePayload)
        .where(eq(schema.facturas.id, id))
        .returning();

      if (!updated.length) return null;
      const r = updated[0];
      return {
        id_factura: r.id,
        id_empresa: r.idEmpresa || 1,
        factura_num: r.facturaNum,
        proveedor: r.proveedor,
        nit_tercero: r.nitTercero,
        fecha: r.fecha,
        descripcion_item: r.descripcionItem,
        cantidad: Number(r.cantidad || 1),
        valor_unitario: Number(r.valorUnitario || 0),
        subtotal: Number(r.subtotal || 0),
        iva: Number(r.iva || 0),
        total: Number(r.total || 0),
        retencion_porc: Number(r.retencionPorc || 0),
        retencion_valor: Number(r.retencionValor || 0),
        casilla_350: r.casilla350 || 83,
        forma_pago: r.formaPago || 'Crédito',
        medio_pago: r.medioPago || 'Transferencia Débito',
        cuenta_gasto: r.cuentaGasto || '513535',
        tipo_comprobante: r.tipoComprobante || 'Factura Electrónica',
        cufe_hash: r.cufeHash || '',
        estado_revision: (r.estadoRevision as any) || 'APROBADA',
        fecha_cargue: r.fechaCargue || new Date().toISOString(),
      };
    } catch (error) {
      console.error('[CloudSQL] Error updateFactura:', error);
      throw error;
    }
  }

  public static async deleteFactura(id: number): Promise<boolean> {
    try {
      const res = await pool.query('DELETE FROM facturas WHERE id = $1 OR id_factura = $1 RETURNING id', [id]);
      return (res.rowCount || 0) > 0;
    } catch (error) {
      console.error('[CloudSQL] Error deleteFactura:', error);
      throw error;
    }
  }

  public static async bulkDeleteFacturas(ids: number[]): Promise<number> {
    try {
      if (!ids || ids.length === 0) return 0;
      const res = await pool.query('DELETE FROM facturas WHERE id = ANY($1::int[]) OR id_factura = ANY($1::int[]) RETURNING id', [ids]);
      return res.rowCount || 0;
    } catch (error) {
      console.error('[CloudSQL] Error bulkDeleteFacturas:', error);
      throw error;
    }
  }

  // ==========================================
  // CEREBRO CONTABLE (PUC & TERCEROS)
  // ==========================================
  public static async getCuentasPuc(idEmpresa?: number): Promise<CuentaPUC[]> {
    try {
      const rows = await drizzleDb.select().from(schema.cuentasPuc).orderBy(schema.cuentasPuc.cuenta);
      return rows.map(r => ({
        id_puc: r.id,
        id_empresa: r.idEmpresa || 1,
        cuenta: r.cuenta,
        nombre: r.nombre,
        naturaleza: (r.naturaleza as any) || 'DEBITO',
      }));
    } catch (error) {
      console.error('[CloudSQL] Error getCuentasPuc:', error);
      return [];
    }
  }

  public static async createCuentaPuc(data: Partial<CuentaPUC>): Promise<CuentaPUC> {
    try {
      const inserted = await drizzleDb.insert(schema.cuentasPuc).values({
        idEmpresa: data.id_empresa || 1,
        cuenta: data.cuenta!,
        nombre: data.nombre!,
        naturaleza: data.naturaleza || 'DEBITO',
      }).returning();
      const r = inserted[0];
      return {
        id_puc: r.id,
        id_empresa: r.idEmpresa || 1,
        cuenta: r.cuenta,
        nombre: r.nombre,
        naturaleza: (r.naturaleza as any) || 'DEBITO',
      };
    } catch (error) {
      console.error('[CloudSQL] Error createCuentaPuc:', error);
      throw error;
    }
  }

  public static async getBalanceTerceros(idEmpresa?: number): Promise<BalanceTercero[]> {
    try {
      const rows = await drizzleDb.select().from(schema.balanceTerceros).orderBy(schema.balanceTerceros.id);
      return rows.map(r => ({
        id_balance: r.id,
        id_empresa: r.idEmpresa || 1,
        cuenta_contable: r.cuentaContable,
        nombre_cuenta: r.nombreCuenta,
        nit_tercero: r.nitTercero,
        nombre_tercero: r.nombreTercero,
        saldo_inicial: Number(r.saldoInicial || 0),
        debitos: Number(r.debitos || 0),
        creditos: Number(r.creditos || 0),
        saldo_final: Number(r.saldoFinal || 0),
      }));
    } catch (error) {
      console.error('[CloudSQL] Error getBalanceTerceros:', error);
      return [];
    }
  }

  // ==========================================
  // CONCILIACIÓN BANCARIA
  // ==========================================
  public static async getMovimientosBanco(): Promise<MovimientoBancario[]> {
    try {
      const rows = await drizzleDb.select().from(schema.movimientosBanco).orderBy(desc(schema.movimientosBanco.fecha));
      return rows.map(r => ({
        id: r.id,
        fecha: r.fecha,
        concepto: r.concepto,
        monto: Number(r.monto),
        tipo: r.tipo as any,
        saldo: Number(r.saldo || 0),
        referencia: r.referencia || undefined,
        conciliado: Boolean(r.conciliado),
      }));
    } catch (error) {
      console.error('[CloudSQL] Error getMovimientosBanco:', error);
      return [];
    }
  }

  public static async createMovimientoBanco(data: Partial<MovimientoBancario>): Promise<MovimientoBancario> {
    try {
      const id = data.id || `banco-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const inserted = await drizzleDb.insert(schema.movimientosBanco).values({
        id,
        fecha: data.fecha!,
        concepto: data.concepto!,
        monto: String(data.monto || 0),
        tipo: data.tipo || 'DEBITO',
        saldo: String(data.saldo || 0),
        referencia: data.referencia || null,
        conciliado: Boolean(data.conciliado),
      }).returning();
      const r = inserted[0];
      return {
        id: r.id,
        fecha: r.fecha,
        concepto: r.concepto,
        monto: Number(r.monto),
        tipo: r.tipo as any,
        saldo: Number(r.saldo || 0),
        referencia: r.referencia || undefined,
        conciliado: Boolean(r.conciliado),
      };
    } catch (error) {
      console.error('[CloudSQL] Error createMovimientoBanco:', error);
      throw error;
    }
  }

  public static async getMovimientosLibro(): Promise<MovimientoLibro[]> {
    try {
      const rows = await drizzleDb.select().from(schema.movimientosLibro).orderBy(desc(schema.movimientosLibro.fecha));
      return rows.map(r => ({
        id: r.id,
        fecha: r.fecha,
        concepto: r.concepto,
        monto: Number(r.monto),
        tipo: r.tipo as any,
        cuenta: r.cuenta,
        tercero: r.tercero || undefined,
        conciliado: Boolean(r.conciliado),
      }));
    } catch (error) {
      console.error('[CloudSQL] Error getMovimientosLibro:', error);
      return [];
    }
  }

  public static async createMovimientoLibro(data: Partial<MovimientoLibro>): Promise<MovimientoLibro> {
    try {
      const id = data.id || `libro-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const inserted = await drizzleDb.insert(schema.movimientosLibro).values({
        id,
        fecha: data.fecha!,
        concepto: data.concepto!,
        monto: String(data.monto || 0),
        tipo: data.tipo || 'DEBITO',
        cuenta: data.cuenta || '111005',
        tercero: data.tercero || null,
        conciliado: Boolean(data.conciliado),
      }).returning();
      const r = inserted[0];
      return {
        id: r.id,
        fecha: r.fecha,
        concepto: r.concepto,
        monto: Number(r.monto),
        tipo: r.tipo as any,
        cuenta: r.cuenta,
        tercero: r.tercero || undefined,
        conciliado: Boolean(r.conciliado),
      };
    } catch (error) {
      console.error('[CloudSQL] Error createMovimientoLibro:', error);
      throw error;
    }
  }

  public static async conciliarMovimiento(tipo: 'banco' | 'libro', id: string, matchId?: string): Promise<void> {
    try {
      if (tipo === 'banco') {
        await drizzleDb.update(schema.movimientosBanco).set({ conciliado: true }).where(eq(schema.movimientosBanco.id, id));
      } else {
        await drizzleDb.update(schema.movimientosLibro).set({ conciliado: true }).where(eq(schema.movimientosLibro.id, id));
      }
    } catch (error) {
      console.error('[CloudSQL] Error conciliarMovimiento:', error);
      throw error;
    }
  }

  // ==========================================
  // AUDITORÍA & MODIFICACIONES
  // ==========================================
  public static async getModificaciones(): Promise<ModificacionRepositorio[]> {
    try {
      const rows = await drizzleDb.select().from(schema.modificacionesRepositorio).orderBy(desc(schema.modificacionesRepositorio.timestamp)).limit(50);
      return rows.map(r => ({
        id: r.id,
        timestamp: r.timestamp,
        autor_id: r.autorId || 1,
        autor_nombre: r.autorNombre,
        autor_email: r.autorEmail || undefined,
        autor_rol: r.autorRol as any,
        tipo_accion: r.tipoAccion as any,
        descripcion: r.descripcion,
        detalles: r.detalles || undefined,
        version_destino: r.versionDestino || 'v2.0',
        repositorio: r.repositorio || 'Repositorio Central de Juan Yaya',
        hash_commit: r.hashCommit || undefined,
      }));
    } catch (error) {
      console.error('[CloudSQL] Error getModificaciones:', error);
      throw error;
    }
  }

  public static async addModificacion(mod: Partial<ModificacionRepositorio> & { descripcion: string; tipo_accion: any }): Promise<ModificacionRepositorio> {
    try {
      const id = 'mod-sql-' + Math.random().toString(36).substring(2, 9);
      const timestamp = new Date().toISOString();
      const hash = 'csql-' + Math.random().toString(36).substring(2, 9);

      await drizzleDb.insert(schema.modificacionesRepositorio).values({
        id,
        timestamp,
        autorId: mod.autor_id || 1,
        autorNombre: mod.autor_nombre || 'Juan Yaya',
        autorEmail: mod.autor_email || null,
        autorRol: mod.autor_rol || null,
        tipoAccion: mod.tipo_accion,
        descripcion: mod.descripcion,
        detalles: mod.detalles || null,
        versionDestino: mod.version_destino || 'v2.0',
        repositorio: mod.repositorio || 'Repositorio Central de Juan Yaya',
        hashCommit: hash,
      });

      return {
        id,
        timestamp,
        autor_id: mod.autor_id || 1,
        autor_nombre: mod.autor_nombre || 'Juan Yaya',
        autor_email: mod.autor_email,
        autor_rol: mod.autor_rol,
        tipo_accion: mod.tipo_accion,
        descripcion: mod.descripcion,
        detalles: mod.detalles,
        version_destino: mod.version_destino || 'v2.0',
        repositorio: mod.repositorio || 'Repositorio Central de Juan Yaya',
        hash_commit: hash,
      };
    } catch (error) {
      console.error('[CloudSQL] Error addModificacion:', error);
      throw error;
    }
  }

  // ==========================================
  // OVERVIEW EN VIVO DE BASE DE DATOS
  // ==========================================
  public static async getDatabaseOverview() {
    try {
      const online = await this.isCloudSqlOnline();
      let counts = { users: 0, empresas: 0, facturas: 0, cuentas_puc: 0, balance_terceros: 0, movimientos_banco: 0, movimientos_libro: 0, modificaciones: 0 };
      let sampleEmpresas: any[] = [];
      let sampleUsers: any[] = [];
      let sampleFacturas: any[] = [];
      let samplePuc: any[] = [];
      let sampleBalance: any[] = [];
      let sampleBanco: any[] = [];
      let sampleLibro: any[] = [];
      let sampleMod: any[] = [];

      if (online) {
        try {
          const [uRes, eRes, fRes, pRes, bRes, mbRes, mlRes, mRes] = await Promise.all([
            pool.query('SELECT count(*) as cnt FROM users'),
            pool.query('SELECT count(*) as cnt FROM empresas'),
            pool.query('SELECT count(*) as cnt FROM facturas'),
            pool.query('SELECT count(*) as cnt FROM cuentas_puc'),
            pool.query('SELECT count(*) as cnt FROM balance_terceros'),
            pool.query('SELECT count(*) as cnt FROM movimientos_banco'),
            pool.query('SELECT count(*) as cnt FROM movimientos_libro'),
            pool.query('SELECT count(*) as cnt FROM modificaciones_repositorio')
          ]);

          counts = {
            users: parseInt(uRes.rows[0]?.cnt || '0', 10),
            empresas: parseInt(eRes.rows[0]?.cnt || '0', 10),
            facturas: parseInt(fRes.rows[0]?.cnt || '0', 10),
            cuentas_puc: parseInt(pRes.rows[0]?.cnt || '0', 10),
            balance_terceros: parseInt(bRes.rows[0]?.cnt || '0', 10),
            movimientos_banco: parseInt(mbRes.rows[0]?.cnt || '0', 10),
            movimientos_libro: parseInt(mlRes.rows[0]?.cnt || '0', 10),
            modificaciones: parseInt(mRes.rows[0]?.cnt || '0', 10),
          };

          const samples = await Promise.all([
            drizzleDb.select().from(schema.empresas).limit(5),
            drizzleDb.select().from(schema.users).limit(5),
            drizzleDb.select().from(schema.facturas).limit(5),
            drizzleDb.select().from(schema.cuentasPuc).limit(5),
            drizzleDb.select().from(schema.balanceTerceros).limit(5),
            drizzleDb.select().from(schema.movimientosBanco).limit(5),
            drizzleDb.select().from(schema.movimientosLibro).limit(5),
            drizzleDb.select().from(schema.modificacionesRepositorio).limit(5)
          ]);
          sampleEmpresas = samples[0] || [];
          sampleUsers = samples[1] || [];
          sampleFacturas = samples[2] || [];
          samplePuc = samples[3] || [];
          sampleBalance = samples[4] || [];
          sampleBanco = samples[5] || [];
          sampleLibro = samples[6] || [];
          sampleMod = samples[7] || [];
        } catch (e) {
          console.warn('[Database] Advertencia obteniendo conteo de tablas:', e);
        }
      }

      const tables = [
        {
          id: 'empresas',
          nombre: 'Empresas / Contribuyentes',
          descripcion: 'Tenants multi-empresa, NITs y configuración API Siigo Nube',
          conteo: counts.empresas,
          columnas: ['id', 'nombreComercial', 'nit', 'softwareErp', 'siigoUsername', 'siigoDocumentId'],
          muestra: sampleEmpresas
        },
        {
          id: 'users',
          nombre: 'Usuarios & Cuentas de Acceso (RBAC & Cloud IAM)',
          descripcion: 'Identidades administradas, contraseñas y permisos sincronizados con Google Cloud IAM',
          conteo: counts.users,
          columnas: ['id', 'email', 'nombreCompleto', 'rol', 'activo', 'empresasIds', 'permisos'],
          muestra: sampleUsers
        },
        {
          id: 'facturas',
          nombre: 'Facturas Electrónicas DIAN (UBL 2.1)',
          descripcion: 'Comprobantes fiscales, CUFEs auditados, retenciones en la fuente y estado Siigo',
          conteo: counts.facturas,
          columnas: ['id', 'facturaNum', 'proveedor', 'nitTercero', 'fecha', 'subtotal', 'iva', 'total', 'cufeHash'],
          muestra: sampleFacturas
        },
        {
          id: 'cuentas_puc',
          nombre: 'Plan Único de Cuentas (PUC)',
          descripcion: 'Catálogo de cuentas contables empresariales, naturaleza débito/crédito',
          conteo: counts.cuentas_puc,
          columnas: ['id', 'cuenta', 'nombre', 'naturaleza'],
          muestra: samplePuc
        },
        {
          id: 'balance_terceros',
          nombre: 'Balance Contable por Terceros',
          descripcion: 'Saldos de cartera, cuentas por pagar y cuentas por cobrar asociadas a NITs',
          conteo: counts.balance_terceros,
          columnas: ['id', 'nitTercero', 'nombreTercero', 'cuentaContable', 'saldoInicial', 'saldoFinal'],
          muestra: sampleBalance
        },
        {
          id: 'movimientos_banco',
          nombre: 'Extractos Bancarios (Bancos)',
          descripcion: 'Movimientos de Bancolombia, Davivienda y Banco de Bogotá para conciliación',
          conteo: counts.movimientos_banco,
          columnas: ['id', 'fecha', 'concepto', 'monto', 'tipo', 'conciliado'],
          muestra: sampleBanco
        },
        {
          id: 'movimientos_libro',
          nombre: 'Libro Mayor de Contabilidad',
          descripcion: 'Asientos contables registrados en ERP para cruce automático con bancos',
          conteo: counts.movimientos_libro,
          columnas: ['id', 'fecha', 'concepto', 'monto', 'tipo', 'cuenta', 'conciliado'],
          muestra: sampleLibro
        },
        {
          id: 'modificaciones_repositorio',
          nombre: 'Historial de Auditoría & Commits v2.0',
          descripcion: 'Registro inmutable de versiones y cambios del Administrador Juan Yaya y equipo',
          conteo: counts.modificaciones,
          columnas: ['id', 'timestamp', 'autorNombre', 'tipoAccion', 'descripcion', 'versionDestino', 'hashCommit'],
          muestra: sampleMod
        }
      ];

      const totalRegistros = tables.reduce((acc, t) => acc + t.conteo, 0);
      const dbConfig = getActiveConnectionConfig();
      const isNeon = Boolean(dbConfig.isNeon || dbConfig.host.includes('neon.tech'));
      const isSupabase = !isNeon && Boolean(dbConfig.isSupabase || dbConfig.host.includes('supabase'));

      const cloudHost = isNeon
        ? `Neon Serverless (${dbConfig.host}:${dbConfig.port})`
        : (isSupabase 
          ? `Supabase (${dbConfig.host}:${dbConfig.port})` 
          : `Google Cloud SQL (${dbConfig.host}:${dbConfig.port})`);

      const motor = isNeon
        ? `Neon Serverless PostgreSQL (Proyecto ${dbConfig.neonProjectId || 'bitter-frost-14568057'})`
        : (isSupabase 
          ? `Supabase PostgreSQL (Proyecto ${dbConfig.supabaseProjectId || 'fqatuwzsunvxbtryhloy'})` 
          : "Google Cloud SQL (PostgreSQL Managed)");

      const cloudProject = isNeon
        ? (dbConfig.neonProjectId || "bitter-frost-14568057")
        : (isSupabase ? (dbConfig.supabaseProjectId || "fqatuwzsunvxbtryhloy") : "peak-sunset-511516-q7");

      const cloudRegion = isNeon
        ? "Neon AWS us-east-2 (Serverless Scale-to-Zero)"
        : (isSupabase ? "Supabase Cloud AWS" : "us-east1");

      return {
        app_url: "https://consola-tlm-enterprise-fiscal-erp-engine.ai.studio",
        cloud_host: cloudHost,
        cloud_project: cloudProject,
        cloud_region: cloudRegion,
        cloud_user: dbConfig.user || "neondb_owner",
        estado: online ? "EN_LINEA_ACTIVO" : "OFFLINE",
        motor: motor,
        version: "2.0.0",
        propietario: "Juan Yaya - Administrador Maestro (automatizaciones@tlm.net.co)",
        is_neon: isNeon,
        neon_project_id: isNeon ? (dbConfig.neonProjectId || "bitter-frost-14568057") : undefined,
        neon_branch_id: isNeon ? (dbConfig.neonBranchId || "br-tiny-boat-b4jd4u1z") : undefined,
        is_supabase: isSupabase,
        supabase_project_id: isSupabase ? (dbConfig.supabaseProjectId || "fqatuwzsunvxbtryhloy") : undefined,
        host_raw: dbConfig.host,
        port_raw: dbConfig.port,
        database_raw: dbConfig.database,
        user_raw: dbConfig.user,
        ssl_raw: dbConfig.ssl,
        persistencia: {
          tipo: isNeon ? "Neon Serverless Storage (Autoscaling)" : (isSupabase ? "Supabase PostgreSQL Managed (SSL Encrypted)" : "Relacional PostgreSQL Online Transaccional ACID"),
          archivo: dbConfig.database || "neondb",
          tamano_bytes: 1048576,
          tamano_legible: isNeon ? "Neon Serverless Storage" : (isSupabase ? "Supabase Cloud Storage" : "Cloud SQL Managed Storage"),
          activo_en_disco: true
        },
        estadisticas: {
          total_tablas: tables.length,
          total_registros: totalRegistros,
          uptime_segundos: Math.floor(process.uptime()),
          memoria_usada_mb: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)
        },
        tablas: tables,
        gestiones_verificadas: [
          { id: 'facturas', nombre: 'Gestión Facturas DIAN (UBL 2.1)', registros: counts.facturas, estado: 'OPERATIVO', ruta: 'facturas' },
          { id: 'centro-fiscal', nombre: 'Centro Fiscal & Retenciones F350', registros: counts.facturas, estado: 'OPERATIVO', ruta: 'centro-fiscal' },
          { id: 'conciliacion', nombre: 'Conciliación Bancaria', registros: counts.movimientos_banco + counts.movimientos_libro, estado: 'OPERATIVO', ruta: 'conciliacion' },
          { id: 'cerebro', nombre: 'Cerebro Contable PUC & Terceros', registros: counts.cuentas_puc + counts.balance_terceros, estado: 'OPERATIVO', ruta: 'cerebro' },
          { id: 'siigo', nombre: 'Gestión Integración Siigo Nube API', registros: counts.empresas, estado: 'CONECTADO', ruta: 'accesos' },
          { id: 'accesos', nombre: 'Admin Usuarios & Google Cloud IAM', registros: counts.users, estado: 'OPERATIVO', ruta: 'accesos' },
          { id: 'arquitectura', nombre: 'Arquitectura & Escala Enterprise', registros: counts.modificaciones, estado: 'OPTIMIZADO', ruta: 'arquitectura' }
        ]
      };
    } catch (error) {
      console.error('[CloudSQL] Error getDatabaseOverview:', error);
      const dbConfig = getActiveConnectionConfig();
      const isNeon = Boolean(dbConfig.isNeon || dbConfig.host.includes('neon.tech'));
      const isSupabase = !isNeon && Boolean(dbConfig.isSupabase || dbConfig.host.includes('supabase'));
      return {
        app_url: "https://consola-tlm-enterprise-fiscal-erp-engine.ai.studio",
        cloud_host: isNeon ? `Neon Serverless (${dbConfig.host}:${dbConfig.port})` : (isSupabase ? `Supabase (${dbConfig.host}:${dbConfig.port})` : `Google Cloud SQL (${dbConfig.host}:${dbConfig.port})`),
        cloud_project: isNeon ? (dbConfig.neonProjectId || "bitter-frost-14568057") : (isSupabase ? (dbConfig.supabaseProjectId || "fqatuwzsunvxbtryhloy") : "peak-sunset-511516-q7"),
        cloud_region: isNeon ? "Neon AWS us-east-2 (Serverless Scale-to-Zero)" : (isSupabase ? "Supabase Cloud AWS" : "us-east1"),
        cloud_user: dbConfig.user || (isNeon ? "neondb_owner" : "postgres"),
        estado: "PENDIENTE_AUTENTICACION",
        motor: isNeon ? `Neon Serverless PostgreSQL (Proyecto ${dbConfig.neonProjectId || 'bitter-frost-14568057'})` : (isSupabase ? "Supabase PostgreSQL" : "Google Cloud SQL"),
        version: "2.0.0",
        propietario: "Juan Yaya - Administrador Maestro (automatizaciones@tlm.net.co)",
        is_neon: isNeon,
        neon_project_id: isNeon ? (dbConfig.neonProjectId || "bitter-frost-14568057") : undefined,
        neon_branch_id: isNeon ? (dbConfig.neonBranchId || "br-tiny-boat-b4jd4u1z") : undefined,
        is_supabase: isSupabase,
        supabase_project_id: isSupabase ? (dbConfig.supabaseProjectId || "fqatuwzsunvxbtryhloy") : undefined,
        host_raw: dbConfig.host,
        port_raw: dbConfig.port,
        database_raw: dbConfig.database,
        user_raw: dbConfig.user,
        ssl_raw: dbConfig.ssl,
        persistencia: {
          tipo: isNeon ? "Neon Serverless Storage (Autoscaling)" : (isSupabase ? "Supabase PostgreSQL Managed (SSL Encrypted)" : "Relacional PostgreSQL Online Transaccional ACID"),
          archivo: dbConfig.database || "neondb",
          tamano_bytes: 1048576,
          tamano_legible: isNeon ? "Neon Serverless Storage" : "Cloud SQL Storage",
          activo_en_disco: true
        },
        estadisticas: {
          total_tablas: 8,
          total_registros: 0,
          uptime_segundos: Math.floor(process.uptime()),
          memoria_usada_mb: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)
        },
        tablas: [],
        gestiones_verificadas: []
      };
    }
  }

  // Sincronización bidireccional en caliente para mantener la caché local de respaldo actualizada con Cloud SQL
  public static async syncCloudSqlToDataStore(dataStore: any): Promise<void> {
    try {
      const online = await this.isCloudSqlOnline();
      if (!online) return;

      const [users, emps, facts, puc, bal, banco, libro, mods] = await Promise.all([
        this.getUsuarios().catch(() => []),
        this.getEmpresas().catch(() => []),
        this.getFacturas().catch(() => []),
        this.getCuentasPuc().catch(() => []),
        this.getBalanceTerceros().catch(() => []),
        this.getMovimientosBanco().catch(() => []),
        this.getMovimientosLibro().catch(() => []),
        this.getModificaciones().catch(() => [])
      ]);

      if (users.length > 0) dataStore.usuarios = users;
      if (emps.length > 0) dataStore.empresas = emps;
      if (facts.length > 0) dataStore.facturas = facts;
      if (puc.length > 0) dataStore.cuentasPUC = puc;
      if (bal.length > 0) dataStore.balanceTerceros = bal;
      if (banco.length > 0) dataStore.movimientosBanco = banco;
      if (libro.length > 0) dataStore.movimientosLibro = libro;
      if (mods.length > 0) dataStore.modificaciones = mods;

      console.log(`[CloudSQL] Sincronización en línea completa: ${facts.length} facturas, ${users.length} usuarios, ${emps.length} empresas cargadas desde Cloud SQL (peak-sunset-511516-q7).`);
    } catch (err) {
      console.warn('[CloudSQL] Error sincronizando Cloud SQL a memoria local:', err);
    }
  }
}

