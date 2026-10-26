import React, { useEffect, useMemo, useState } from 'react';
import {
  HardDrive,
  FolderOpen,
  FolderTree,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Save,
  Download,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Archive,
  Info
} from 'lucide-react';
import type { Empresa, Usuario, AlmacenamientoEmpresa, ArchivoEmpresa, CategoriaArchivo, ProveedorAlmacenamiento } from '../types/index.ts';
import { apiJson, descargarArchivo, formatoBytes } from '../lib/api.ts';

interface Props {
  currentUser?: Usuario | null;
  activeEmpresa?: Empresa | null;
  onShowToast?: (msg: string, type?: any) => void;
}

interface Credenciales {
  google: { modo: 'SERVICE_ACCOUNT' | 'OAUTH' | null; cuenta?: string; suplanta?: string };
  google_configurado: boolean;
  directorio_local: string;
  categorias: { clave: CategoriaArchivo; carpeta: string; descripcion: string }[];
}

interface FilaResumen {
  id_empresa: number;
  nombre_comercial: string;
  nit: string;
  proveedor: ProveedorAlmacenamiento;
  estado: AlmacenamientoEmpresa['estado'];
  carpeta_empresa_url?: string;
  raiz_nombre?: string;
  ultimo_error?: string;
  resumen: { total_archivos: number; total_bytes: number };
}

const PROVEEDORES: { valor: ProveedorAlmacenamiento; titulo: string; detalle: string }[] = [
  { valor: 'LOCAL', titulo: 'Servidor de la consola', detalle: 'Carpeta propia de la empresa en el servidor' },
  { valor: 'GOOGLE_DRIVE_CARPETA', titulo: 'Carpeta de Google Drive', detalle: 'Una carpeta en Mi unidad o dentro de una unidad compartida' },
  { valor: 'GOOGLE_UNIDAD_COMPARTIDA', titulo: 'Unidad compartida', detalle: 'Una unidad compartida (Shared Drive) completa' }
];

const etiquetaProveedor = (p: ProveedorAlmacenamiento) =>
  p === 'LOCAL' ? 'Servidor' : p === 'GOOGLE_UNIDAD_COMPARTIDA' ? 'Unidad compartida' : 'Google Drive';

const EstadoChip: React.FC<{ estado: AlmacenamientoEmpresa['estado'] }> = ({ estado }) => (
  <span
    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
      estado === 'CONECTADO'
        ? 'bg-emerald-100 text-emerald-700'
        : estado === 'ERROR'
        ? 'bg-red-100 text-red-700'
        : 'bg-slate-100 text-slate-500'
    }`}
  >
    {estado === 'CONECTADO' ? <CheckCircle2 className="w-3 h-3" /> : estado === 'ERROR' ? <AlertTriangle className="w-3 h-3" /> : null}
    {estado === 'CONECTADO' ? 'Conectado' : estado === 'ERROR' ? 'Error' : 'Sin configurar'}
  </span>
);

export const AlmacenamientoEmpresasPanel: React.FC<Props> = ({ currentUser, activeEmpresa, onShowToast: avisar }) => {
  const onShowToast = (msg: string, tipo: 'success' | 'info' | 'error' = 'success') => avisar?.(msg, tipo);
  const puedeEditar = currentUser?.rol === 'Administrador' || currentUser?.rol === 'Desarrollador' || Boolean(currentUser?.permisos?.administrador);
  const [credenciales, setCredenciales] = useState<Credenciales | null>(null);
  const [filas, setFilas] = useState<FilaResumen[]>([]);
  const [seleccion, setSeleccion] = useState<number | null>(activeEmpresa?.id_empresa ?? null);
  const [config, setConfig] = useState<AlmacenamientoEmpresa | null>(null);
  const [rutaLocal, setRutaLocal] = useState('');
  const [archivos, setArchivos] = useState<ArchivoEmpresa[]>([]);
  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaArchivo | ''>('');
  const [raiz, setRaiz] = useState('');
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const empresasVisibles = useMemo(() => {
    if (puedeEditar || !currentUser?.empresas_ids?.length) return filas;
    return filas.filter(f => currentUser.empresas_ids.includes(f.id_empresa));
  }, [filas, puedeEditar, currentUser]);

  const cargarResumen = async () => {
    try {
      const [cred, res] = await Promise.all([
        apiJson<Credenciales>('/api/v1/almacenamiento/credenciales'),
        apiJson<FilaResumen[]>('/api/v1/almacenamiento/resumen')
      ]);
      setCredenciales(cred);
      setFilas(res);
      if (seleccion === null && res.length) setSeleccion(activeEmpresa?.id_empresa ?? res[0].id_empresa);
    } catch (err: any) {
      onShowToast(err.message || 'No se pudo cargar el almacenamiento.', 'error');
    }
  };

  const cargarEmpresa = async (id: number) => {
    setCargando(true);
    try {
      const [det, lista] = await Promise.all([
        apiJson<{ config: AlmacenamientoEmpresa; ruta_local: string }>(`/api/v1/empresas/${id}/almacenamiento`),
        apiJson<ArchivoEmpresa[]>(`/api/v1/empresas/${id}/archivos${filtroCategoria ? `?categoria=${filtroCategoria}` : ''}`)
      ]);
      setConfig(det.config);
      setRutaLocal(det.ruta_local);
      setRaiz(det.config.raiz_url || det.config.raiz_id || '');
      setArchivos(lista);
    } catch (err: any) {
      onShowToast(err.message, 'error');
      setConfig(null);
      setArchivos([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargarResumen(); }, []);
  useEffect(() => { if (seleccion !== null) cargarEmpresa(seleccion); }, [seleccion, filtroCategoria]);

  const empresaSel = filas.find(f => f.id_empresa === seleccion);

  const guardar = async () => {
    if (!config || seleccion === null) return;
    setGuardando(true);
    try {
      const r = await apiJson<{ config: AlmacenamientoEmpresa; mensaje: string; error_inicializacion?: string }>(
        `/api/v1/empresas/${seleccion}/almacenamiento`,
        {
          method: 'PUT',
          body: JSON.stringify({
            proveedor: config.proveedor,
            raiz,
            crear_carpeta_empresa: config.crear_carpeta_empresa,
            organizar_por_periodo: config.organizar_por_periodo,
            archivado_automatico: config.archivado_automatico
          })
        }
      );
      setConfig(r.config);
      onShowToast(r.mensaje, r.error_inicializacion ? 'error' : 'success');
      cargarResumen();
    } catch (err: any) {
      onShowToast(err.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  const verificar = async () => {
    if (seleccion === null) return;
    setGuardando(true);
    try {
      const r = await apiJson<{ config: AlmacenamientoEmpresa; mensaje: string }>(`/api/v1/empresas/${seleccion}/almacenamiento/inicializar`, { method: 'POST' });
      setConfig(r.config);
      onShowToast(r.mensaje);
      cargarResumen();
    } catch (err: any) {
      onShowToast(err.message, 'error');
      if (err.data?.config) setConfig(err.data.config);
    } finally {
      setGuardando(false);
    }
  };

  const respaldar = async () => {
    if (seleccion === null) return;
    try {
      const r = await apiJson<{ mensaje: string }>(`/api/v1/empresas/${seleccion}/almacenamiento/respaldo`, { method: 'POST' });
      onShowToast(r.mensaje);
      cargarEmpresa(seleccion);
      cargarResumen();
    } catch (err: any) {
      onShowToast(err.message, 'error');
    }
  };

  const eliminar = async (a: ArchivoEmpresa) => {
    if (seleccion === null || !confirm(`¿Eliminar "${a.nombre}" del almacenamiento de la empresa?`)) return;
    try {
      await apiJson(`/api/v1/empresas/${seleccion}/archivos/${a.id}`, { method: 'DELETE' });
      onShowToast('Archivo eliminado.');
      cargarEmpresa(seleccion);
      cargarResumen();
    } catch (err: any) {
      onShowToast(err.message, 'error');
    }
  };

  const categorias = credenciales?.categorias || [];
  const nombreCategoria = (c: CategoriaArchivo) => categorias.find(x => x.clave === c)?.carpeta.replace(/^\d+_/, '').replace(/_/g, ' ') || c;

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-[#271a82] rounded-xl shrink-0">
            <FolderTree className="w-5 h-5 text-[#fa9d1c]" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base">Almacenamiento contable por empresa</h3>
            <p className="text-xs text-slate-500 max-w-2xl">
              Cada empresa guarda su información en su propia carpeta o unidad compartida: XML cargados, soportes PDF, auditorías,
              planos para Siigo, conciliaciones, PUC, balances y respaldos. Todas las funciones de la consola archivan ahí automáticamente.
            </p>
          </div>
        </div>
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold ${credenciales?.google_configurado ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
          {credenciales?.google_configurado ? <ShieldCheck className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <div>
            <div>Google Drive: {credenciales?.google_configurado ? (credenciales.google.modo === 'SERVICE_ACCOUNT' ? 'cuenta de servicio' : 'OAuth') : 'sin credenciales en el servidor'}</div>
            {credenciales?.google.cuenta && <div className="font-mono text-[10px] opacity-80">{credenciales.google.cuenta}</div>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-5">
        {/* Lista de empresas */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden self-start">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase">Empresas ({empresasVisibles.length})</span>
            <button onClick={cargarResumen} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer" title="Actualizar">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y divide-slate-100 max-h-[560px] overflow-y-auto">
            {empresasVisibles.map(f => (
              <button
                key={f.id_empresa}
                onClick={() => setSeleccion(f.id_empresa)}
                className={`w-full text-left px-4 py-3 transition cursor-pointer ${seleccion === f.id_empresa ? 'bg-indigo-50/70 border-l-4 border-[#271a82]' : 'hover:bg-slate-50 border-l-4 border-transparent'}`}
              >
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-xs font-bold text-slate-800 truncate">{f.nombre_comercial}</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono ml-5">NIT {f.nit}</div>
                <div className="flex items-center gap-2 mt-1.5 ml-5">
                  <EstadoChip estado={f.estado} />
                  <span className="text-[10px] text-slate-500">{etiquetaProveedor(f.proveedor)}</span>
                  <span className="text-[10px] text-slate-400">· {f.resumen.total_archivos} arch. · {formatoBytes(f.resumen.total_bytes)}</span>
                </div>
              </button>
            ))}
            {empresasVisibles.length === 0 && <div className="p-6 text-center text-xs text-slate-400">No hay empresas asignadas a su usuario.</div>}
          </div>
        </div>

        {/* Configuración de la empresa seleccionada */}
        <div className="space-y-5">
          {cargando && !config ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-[#271a82]" /></div>
          ) : config && empresaSel ? (
            <>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-bold uppercase text-slate-400">Destino de los archivos de</div>
                    <div className="text-sm font-bold text-slate-800">{empresaSel.nombre_comercial}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <EstadoChip estado={config.estado} />
                    {config.carpeta_empresa_url && (
                      <a href={config.carpeta_empresa_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] font-bold text-[#0066da] hover:underline">
                        <ExternalLink className="w-3 h-3" /> Abrir carpeta
                      </a>
                    )}
                  </div>
                </div>

                {/* Proveedor */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {PROVEEDORES.map(p => (
                    <label
                      key={p.valor}
                      className={`p-3 rounded-xl border cursor-pointer transition ${config.proveedor === p.valor ? 'border-[#271a82] bg-indigo-50/60 ring-1 ring-[#271a82]' : 'border-slate-200 hover:border-slate-300'} ${!puedeEditar ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      <input
                        type="radio"
                        className="hidden"
                        disabled={!puedeEditar}
                        checked={config.proveedor === p.valor}
                        onChange={() => setConfig({ ...config, proveedor: p.valor })}
                      />
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                        {p.valor === 'LOCAL' ? <HardDrive className="w-4 h-4 text-slate-500" /> : <FolderOpen className="w-4 h-4 text-[#0066da]" />}
                        {p.titulo}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">{p.detalle}</div>
                    </label>
                  ))}
                </div>

                {config.proveedor !== 'LOCAL' ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 uppercase">
                        {config.proveedor === 'GOOGLE_UNIDAD_COMPARTIDA' ? 'URL o ID de la unidad compartida' : 'URL o ID de la carpeta de Google Drive'}
                      </label>
                      <input
                        value={raiz}
                        disabled={!puedeEditar}
                        onChange={e => setRaiz(e.target.value)}
                        placeholder="https://drive.google.com/drive/folders/..."
                        className="mt-1 w-full bg-[#f8f9fa] border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-[#271a82]"
                      />
                    </div>
                    {!credenciales?.google_configurado && (
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>
                          El servidor no tiene credenciales de Google. Configure <span className="font-mono">GOOGLE_SERVICE_ACCOUNT_JSON</span> (o las variables
                          <span className="font-mono"> GOOGLE_OAUTH_*</span>) y reinicie la consola. Mientras tanto puede usar el almacenamiento del servidor.
                        </span>
                      </div>
                    )}
                    {credenciales?.google.modo === 'SERVICE_ACCOUNT' && (
                      <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-blue-900 flex gap-2">
                        <Info className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>
                          Comparta {config.proveedor === 'GOOGLE_UNIDAD_COMPARTIDA' ? 'la unidad compartida' : 'la carpeta'} con
                          <span className="font-mono font-bold"> {credenciales.google.cuenta}</span> como
                          {config.proveedor === 'GOOGLE_UNIDAD_COMPARTIDA' ? ' Administrador de contenido' : ' Editor'}.
                          {config.proveedor === 'GOOGLE_DRIVE_CARPETA' && !credenciales.google.suplanta && ' Las cuentas de servicio no tienen espacio propio en "Mi unidad": use una carpeta dentro de una unidad compartida.'}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                    Ruta en el servidor: <span className="font-mono">{rutaLocal}</span>
                  </div>
                )}

                <div className="flex flex-col md:flex-row gap-4">
                  {config.proveedor !== 'LOCAL' && (
                    <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                      <input type="checkbox" disabled={!puedeEditar} checked={config.crear_carpeta_empresa} onChange={e => setConfig({ ...config, crear_carpeta_empresa: e.target.checked })} className="mt-0.5" />
                      <span>
                        <span className="font-bold">Crear subcarpeta "NIT - Nombre"</span>
                        <span className="block text-[10px] text-slate-500">Útil cuando varias empresas comparten la misma unidad</span>
                      </span>
                    </label>
                  )}
                  <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                    <input type="checkbox" disabled={!puedeEditar} checked={config.organizar_por_periodo} onChange={e => setConfig({ ...config, organizar_por_periodo: e.target.checked })} className="mt-0.5" />
                    <span>
                      <span className="font-bold">Organizar por periodo contable</span>
                      <span className="block text-[10px] text-slate-500">Subcarpetas AAAA-MM según la fecha de los documentos</span>
                    </span>
                  </label>
                </div>

                {/* Archivado automático */}
                <div>
                  <div className="text-[11px] font-bold text-slate-600 uppercase mb-2">Archivar automáticamente</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {categorias.map(c => (
                      <label key={c.clave} className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl border border-slate-200 text-xs cursor-pointer hover:bg-slate-50">
                        <span>
                          <span className="font-mono text-[11px] font-bold text-[#271a82]">{c.carpeta}</span>
                          <span className="block text-[10px] text-slate-500">{c.descripcion}</span>
                        </span>
                        <input
                          type="checkbox"
                          disabled={!puedeEditar}
                          checked={config.archivado_automatico[c.clave] !== false}
                          onChange={e => setConfig({ ...config, archivado_automatico: { ...config.archivado_automatico, [c.clave]: e.target.checked } })}
                        />
                      </label>
                    ))}
                  </div>
                </div>

                {config.ultimo_error && config.estado === 'ERROR' && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-[11px] text-red-800 flex gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{config.ultimo_error}</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {puedeEditar ? (
                    <>
                      <button onClick={guardar} disabled={guardando} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#271a82] hover:bg-[#1c1343] text-white font-bold text-xs shadow-md cursor-pointer disabled:opacity-60">
                        {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-[#fa9d1c]" />}
                        Guardar y crear carpetas
                      </button>
                      <button onClick={verificar} disabled={guardando} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer disabled:opacity-60">
                        <RefreshCw className="w-4 h-4" /> Verificar conexión
                      </button>
                    </>
                  ) : (
                    <span className="text-[11px] text-slate-500">Solo un Administrador puede cambiar el destino de almacenamiento.</span>
                  )}
                  <button onClick={respaldar} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs cursor-pointer">
                    <Archive className="w-4 h-4" /> Respaldar datos ahora
                  </button>
                  {config.verificado_en && <span className="text-[10px] text-slate-400 ml-auto">Verificado {new Date(config.verificado_en).toLocaleString('es-CO')}{config.raiz_nombre ? ` · ${config.raiz_nombre}` : ''}</span>}
                </div>
              </div>

              {/* Archivos */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-700 uppercase">Archivos de la empresa ({archivos.length})</span>
                  <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value as CategoriaArchivo | '')} className="bg-[#f8f9fa] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700">
                    <option value="">Todas las carpetas</option>
                    {categorias.map(c => <option key={c.clave} value={c.clave}>{c.carpeta}</option>)}
                  </select>
                </div>
                <div className="overflow-x-auto max-h-[420px]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">Archivo</th>
                        <th className="py-2.5 px-3">Carpeta</th>
                        <th className="py-2.5 px-3">Periodo</th>
                        <th className="py-2.5 px-3 text-right">Tamaño</th>
                        <th className="py-2.5 px-3">Fecha</th>
                        <th className="py-2.5 px-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {archivos.length === 0 ? (
                        <tr><td colSpan={6} className="py-10 text-center text-slate-400">Todavía no hay archivos guardados para esta empresa.</td></tr>
                      ) : archivos.map(a => (
                        <tr key={a.id} className="hover:bg-slate-50/70">
                          <td className="py-2 px-3 font-semibold text-slate-800 max-w-[280px] truncate" title={a.nombre}>{a.nombre}</td>
                          <td className="py-2 px-3 text-slate-500">{nombreCategoria(a.categoria)}</td>
                          <td className="py-2 px-3 font-mono text-slate-500 whitespace-nowrap">{a.periodo}</td>
                          <td className="py-2 px-3 text-right text-slate-500">{formatoBytes(a.tamano_bytes)}</td>
                          <td className="py-2 px-3 text-slate-500 whitespace-nowrap">{new Date(a.creado_en).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}</td>
                          <td className="py-2 px-3">
                            <div className="flex justify-end gap-1.5">
                              {a.url && (
                                <a href={a.url} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0066da]" title="Ver en Google Drive">
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                              <button
                                onClick={() => descargarArchivo(`/api/v1/empresas/${seleccion}/archivos/${a.id}/descargar`, {}, a.nombre).catch(err => onShowToast(err.message, 'error'))}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                                title="Descargar"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              {puedeEditar && (
                                <button onClick={() => eliminar(a)} className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 cursor-pointer" title="Eliminar">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-xs text-slate-400">Seleccione una empresa.</div>
          )}
        </div>
      </div>
    </div>
  );
};
