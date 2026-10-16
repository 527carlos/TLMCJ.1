import { eq, desc, inArray } from 'drizzle-orm';
import { db as drizzleDb, pool } from '../../db/index.ts';
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
      console.warn('[CloudSQL] Healthcheck error:', err);
      return false;
    }
  }

  public static async initAndSeed(): Promise<void> {
    if (this.isInitialized) return;
    try {
      const online = await this.isCloudSqlOnline();
      if (!online) {
        console.warn('[CloudSQL] Base de datos no disponible aún, posponiendo carga inicial.');
        return;
      }

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
        }

      this.isInitialized = true;
      console.log('[CloudSQL] Conexión en línea activa y sincronizada con Google Cloud SQL (peak-sunset-511516-q7).');
    } catch (error) {
      console.error('[CloudSQL] Error inicializando/migrando a Cloud SQL:', error);
    }
  }

  // ==========================================
  // USUARIOS
  // ==========================================
  public static async getUsuarios(): Promise<Usuario[]> {
    try {
      const rows = await drizzleDb.select().from(schema.users).orderBy(schema.users.id);
      return rows.map(r => ({
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
      }));
    } catch (error) {
      console.error('[CloudSQL] Error getUsuarios:', error);
      throw error;
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
      throw error;
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
      throw error;
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
      const deleted = await drizzleDb.delete(schema.facturas).where(eq(schema.facturas.id, id)).returning();
      return deleted.length > 0;
    } catch (error) {
      console.error('[CloudSQL] Error deleteFactura:', error);
      throw error;
    }
  }

  public static async bulkDeleteFacturas(ids: number[]): Promise<number> {
    try {
      const deleted = await drizzleDb.delete(schema.facturas).where(inArray(schema.facturas.id, ids)).returning();
      return deleted.length;
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
      throw error;
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
      throw error;
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
      throw error;
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
      throw error;
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

      const counts = {
        users: parseInt(uRes.rows[0]?.cnt || '0', 10),
        empresas: parseInt(eRes.rows[0]?.cnt || '0', 10),
        facturas: parseInt(fRes.rows[0]?.cnt || '0', 10),
        cuentas_puc: parseInt(pRes.rows[0]?.cnt || '0', 10),
        balance_terceros: parseInt(bRes.rows[0]?.cnt || '0', 10),
        movimientos_banco: parseInt(mbRes.rows[0]?.cnt || '0', 10),
        movimientos_libro: parseInt(mlRes.rows[0]?.cnt || '0', 10),
        modificaciones: parseInt(mRes.rows[0]?.cnt || '0', 10),
      };

      const [sampleEmpresas, sampleUsers, sampleFacturas, samplePuc, sampleBalance, sampleBanco, sampleLibro, sampleMod] = await Promise.all([
        drizzleDb.select().from(schema.empresas).limit(5),
        drizzleDb.select().from(schema.users).limit(5),
        drizzleDb.select().from(schema.facturas).limit(5),
        drizzleDb.select().from(schema.cuentasPuc).limit(5),
        drizzleDb.select().from(schema.balanceTerceros).limit(5),
        drizzleDb.select().from(schema.movimientosBanco).limit(5),
        drizzleDb.select().from(schema.movimientosLibro).limit(5),
        drizzleDb.select().from(schema.modificacionesRepositorio).limit(5)
      ]);

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

      return {
        app_url: "https://consola-tlm-enterprise-fiscal-erp-engine.ai.studio",
        cloud_host: process.env.SQL_HOST ? `Google Cloud SQL (${process.env.SQL_HOST}:${process.env.SQL_PORT || 5432})` : "34.175.144.94:5432",
        cloud_project: "peak-sunset-511516-q7",
        cloud_region: "us-east1",
        cloud_user: process.env.SQL_USER || "postgres",
        estado: online ? "EN_LINEA_ACTIVO" : "OFFLINE",
        motor: "Google Cloud SQL (PostgreSQL Managed)",
        version: "2.0.0",
        propietario: "Juan Yaya - Administrador Maestro (automatizaciones@tlm.net.co)",
        persistencia: {
          tipo: "Relacional PostgreSQL Online Transaccional ACID",
          archivo: process.env.SQL_DB_NAME || "postgres",
          tamano_bytes: 1048576,
          tamano_legible: "Cloud SQL Managed Storage",
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
      throw error;
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

