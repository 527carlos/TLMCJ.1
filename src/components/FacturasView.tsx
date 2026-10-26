import React, { useMemo, useState } from 'react';
import { Factura, CuentaPUC, Empresa } from '../types/index.ts';
import {
  UploadCloud,
  Search,
  FileCheck2,
  Trash2,
  Send,
  FileSpreadsheet,
  Eye,
  Sparkles,
  CheckSquare,
  Square,
  ShieldCheck,
  FolderDown,
  Archive,
  Loader2,
  FileDown,
  FileText,
  Settings2,
  X,
  Landmark,
  Check
} from 'lucide-react';
import { apiJson, descargarArchivo, textoArchivado } from '../lib/api.ts';

interface FacturasViewProps {
  facturas: Factura[];
  cuentasPUC: CuentaPUC[];
  activeEmpresa?: Empresa | null;
  onUploadXml: (files: FileList) => void;
  onSeedDemo: () => void;
  onImportFromDrive?: () => void;
  onUpdateFactura: (id: number, field: string, value: any) => void;
  onDeleteFactura: (id: number) => void;
  onBulkDelete: (ids: number[]) => void;
  onInspectCufe: (factura: Factura) => void;
  onOpenSiigoPush: (facturas: Factura[]) => void;
  onRefresh?: () => void;
  onShowToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
  isUploading?: boolean;
  onUploadXmlWithProgress?: (files: FileList) => Promise<{ archivos_procesados: number; xmls_extraidos: number; facturas_creadas: number }>;
}

const CUENTAS_AVANZADAS: { clave: string; etiqueta: string; defecto: string }[] = [
  { clave: 'clientes', etiqueta: 'Clientes (CxC)', defecto: '13050501' },
  { clave: 'proveedores', etiqueta: 'Proveedores (CxP)', defecto: '22050101' },
  { clave: 'iva_generado', etiqueta: 'IVA generado (ventas)', defecto: '24080105' },
  { clave: 'iva_descontable', etiqueta: 'IVA descontable (compras)', defecto: '24080101' },
  { clave: 'retefuente_por_pagar', etiqueta: 'ReteFuente por pagar', defecto: '23652501' },
  { clave: 'reteica_por_pagar', etiqueta: 'ReteICA por pagar', defecto: '23680501' },
  { clave: 'reteiva_por_pagar', etiqueta: 'ReteIVA por pagar', defecto: '23670501' },
  { clave: 'anticipo_retefuente', etiqueta: 'Anticipo ReteFuente (ventas)', defecto: '13551501' }
];

const leerLocal = (k: string, d: string) => {
  try { return localStorage.getItem(k) ?? d; } catch { return d; }
};
const guardarLocal = (k: string, v: string) => {
  try { localStorage.setItem(k, v); } catch {}
};

export const FacturasView: React.FC<FacturasViewProps> = ({
  facturas,
  cuentasPUC,
  activeEmpresa,
  onUploadXml,
  onSeedDemo,
  onImportFromDrive,
  onUpdateFactura,
  onDeleteFactura,
  onBulkDelete,
  onInspectCufe,
  onOpenSiigoPush,
  onRefresh,
  onShowToast,
  isUploading = false,
  onUploadXmlWithProgress
}) => {
  const avisar = (m: string, t: 'success' | 'info' | 'error' = 'success') => (onShowToast ? onShowToast(m, t) : alert(m));
  const idEmpresa = activeEmpresa?.id_empresa || 1;

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [tipoFilter, setTipoFilter] = useState<'TODOS' | 'VENTA' | 'COMPRA'>('TODOS');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [uploadingState, setUploadingState] = useState<{ active: boolean; fileName: string; result: { archivos_procesados: number; xmls_extraidos: number; facturas_creadas: number } | null }>({ active: false, fileName: '', result: null });
  const [ocupado, setOcupado] = useState<'' | 'auditoria' | 'erp' | 'pdf' | 'masivo'>('');

  // Modal Exportar ERP
  const [erpAbierto, setErpAbierto] = useState(false);
  const [erpTipo, setErpTipo] = useState(() => leerLocal(`tlm_erp_tipo_${idEmpresa}`, '11'));
  const [erpPrefijo, setErpPrefijo] = useState('');
  const [erpConsecutivo, setErpConsecutivo] = useState(() => leerLocal(`tlm_erp_consec_${idEmpresa}`, '1'));
  const [erpSoloAuditadas, setErpSoloAuditadas] = useState(false);
  const [erpAvanzado, setErpAvanzado] = useState(false);
  const [erpCuentas, setErpCuentas] = useState<Record<string, string>>(() => {
    try { return JSON.parse(leerLocal(`tlm_erp_cuentas_${idEmpresa}`, '{}')); } catch { return {}; }
  });

  // Asignación masiva
  const [bancoMasivo, setBancoMasivo] = useState('');
  const [reteMasiva, setReteMasiva] = useState('');

  const handleUploadFiles = async (files: FileList) => {
    if (!files || files.length === 0) return;
    const names = Array.from(files).map(f => f.name).join(', ');
    setUploadingState({ active: true, fileName: names, result: null });
    if (onUploadXmlWithProgress) {
      try {
        const result = await onUploadXmlWithProgress(files);
        setUploadingState({ active: false, fileName: names, result });
        setTimeout(() => setUploadingState(s => ({ ...s, result: null })), 7000);
      } catch {
        setUploadingState({ active: false, fileName: names, result: null });
      }
    } else {
      onUploadXml(files);
      setUploadingState({ active: false, fileName: names, result: null });
    }
  };

  const filteredFacturas = useMemo(() => facturas.filter(f => {
    const s = searchTerm.toLowerCase();
    const matchesSearch = !s ||
      f.factura_num.toLowerCase().includes(s) ||
      f.proveedor.toLowerCase().includes(s) ||
      f.nit_tercero.includes(searchTerm) ||
      (f.descripcion_item || '').toLowerCase().includes(s) ||
      (f.cuenta_gasto || '').includes(searchTerm);
    const matchesStatus = statusFilter === 'TODOS' || f.estado_revision === statusFilter;
    const tipo = f.tipo_operacion || 'COMPRA';
    const matchesTipo = tipoFilter === 'TODOS' || tipo === tipoFilter;
    const matchesDesde = !desde || (f.fecha || '') >= desde;
    const matchesHasta = !hasta || (f.fecha || '') <= hasta;
    return matchesSearch && matchesStatus && matchesTipo && matchesDesde && matchesHasta;
  }), [facturas, searchTerm, statusFilter, tipoFilter, desde, hasta]);

  const facturasUnicas = useMemo(() => new Set(facturas.map(f => f.cufe_hash)).size, [facturas]);
  const lineasContables = useMemo(() => facturas.reduce((s, f) => s + (f.items?.length || 1), 0), [facturas]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredFacturas.length) setSelectedIds([]);
    else setSelectedIds(filteredFacturas.map(f => f.id_factura));
  };
  const toggleSelectOne = (id: number) =>
    setSelectedIds(selectedIds.includes(id) ? selectedIds.filter(i => i !== id) : [...selectedIds, id]);

  const handleBulkApprove = () => {
    selectedIds.forEach(id => onUpdateFactura(id, 'estado', 'AUDITADA'));
    setSelectedIds([]);
  };

  const handleBulkDeleteSelected = () => {
    if (confirm(`Eliminar ${selectedIds.length} facturas seleccionadas?`)) {
      onBulkDelete(selectedIds);
      setSelectedIds([]);
    }
  };

  /** Ids sobre los que actúan las exportaciones: la selección, o lo que muestran los filtros */
  const idsObjetivo = () => (selectedIds.length ? selectedIds : filteredFacturas.map(f => f.id_factura));
  const filtrosActivos = searchTerm || statusFilter !== 'TODOS' || tipoFilter !== 'TODOS' || desde || hasta;
  const consultaIds = () => (selectedIds.length || filtrosActivos ? `?ids=${idsObjetivo().join(',')}` : '');

  const descargarAuditoria = async () => {
    setOcupado('auditoria');
    try {
      const r = await descargarArchivo(`/api/v1/empresas/${idEmpresa}/facturas/auditoria-excel${consultaIds()}`, {}, 'Auditoria_TLM.xlsx');
      avisar(`Auditoría generada${textoArchivado(r)}.`, r.archivado === 'error' ? 'info' : 'success');
    } catch (err: any) {
      avisar(err.message, 'error');
    } finally {
      setOcupado('');
    }
  };

  const descargarSoportes = async () => {
    setOcupado('pdf');
    try {
      const r = await descargarArchivo(`/api/v1/empresas/${idEmpresa}/facturas/soportes-pdf${consultaIds()}`, {}, 'Soportes_PDF.zip');
      avisar(`Soportes PDF generados (${idsObjetivo().length} documentos)${textoArchivado(r)}.`, r.archivado === 'error' ? 'info' : 'success');
    } catch (err: any) {
      avisar(err.message, 'error');
    } finally {
      setOcupado('');
    }
  };

  const exportarErp = async () => {
    if (!erpTipo.trim() || !erpConsecutivo.trim()) {
      avisar('Indique el tipo de comprobante y el consecutivo inicial.', 'error');
      return;
    }
    setOcupado('erp');
    try {
      const cuentas = Object.fromEntries(Object.entries(erpCuentas).filter(([, v]) => v && v.trim()));
      const r = await descargarArchivo(
        `/api/v1/empresas/${idEmpresa}/facturas/exportar-erp`,
        {
          method: 'POST',
          body: JSON.stringify({
            tipo_comprobante: erpTipo.trim(),
            prefijo: erpPrefijo.trim(),
            consecutivo_inicial: Number(erpConsecutivo),
            ids: selectedIds.length || filtrosActivos ? idsObjetivo() : undefined,
            solo_auditadas: erpSoloAuditadas,
            cuentas
          })
        },
        'Comprobantes_Contables.xlsx'
      );
      const final = Number(r.encabezados.get('X-TLM-Consecutivo-Final') || erpConsecutivo);
      guardarLocal(`tlm_erp_tipo_${idEmpresa}`, erpTipo.trim());
      guardarLocal(`tlm_erp_consec_${idEmpresa}`, String(final + 1));
      guardarLocal(`tlm_erp_cuentas_${idEmpresa}`, JSON.stringify(erpCuentas));
      setErpConsecutivo(String(final + 1));
      setErpAbierto(false);
      avisar(`Archivo ERP generado (consecutivos ${r.nombre.match(/_(\d+)\.xlsx$/)?.[1] || ''} a ${final})${textoArchivado(r)}.`, r.archivado === 'error' ? 'info' : 'success');
    } catch (err: any) {
      avisar(err.message, 'error');
    } finally {
      setOcupado('');
    }
  };

  const aplicarMasivo = async (campos: Record<string, unknown>, descripcion: string) => {
    const ids = idsObjetivo();
    if (!ids.length) return;
    setOcupado('masivo');
    try {
      const r = await apiJson<{ mensaje: string }>(`/api/v1/empresas/${idEmpresa}/facturas/masivo`, {
        method: 'PATCH',
        body: JSON.stringify({ ids, campos })
      });
      avisar(`${descripcion}: ${r.mensaje}`);
      onRefresh?.();
    } catch (err: any) {
      avisar(err.message, 'error');
    } finally {
      setOcupado('');
    }
  };

  const formatCOP = (num: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num || 0);

  const cuentasPara = (f: Factura) => {
    const prefijos = f.tipo_operacion === 'VENTA' ? ['4'] : ['5', '6', '7', '1'];
    const lista = cuentasPUC.filter(c => prefijos.some(p => c.cuenta.startsWith(p)) && c.cuenta.length >= 4);
    if (f.cuenta_gasto && !lista.some(c => c.cuenta === f.cuenta_gasto)) {
      lista.unshift({ id_puc: -1, id_empresa: f.id_empresa, cuenta: f.cuenta_gasto, nombre: 'Cuenta actual' });
    }
    return lista;
  };

  const selectedFacturasList = facturas.filter(f => selectedIds.includes(f.id_factura));
  const objetivoTexto = selectedIds.length ? `${selectedIds.length} seleccionadas` : filtrosActivos ? `${filteredFacturas.length} filtradas` : 'todas';

  return (
    <div className="space-y-6">
      {/* Carga automática + contador */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-4">
        <div className="bg-white rounded-2xl p-5 border border-dashed border-slate-300 shadow-xs flex flex-col items-center text-center gap-3">
          <UploadCloud className="w-6 h-6 text-[#271a82]" />
          <div>
            <h3 className="font-bold text-slate-800 text-base">Carga Automática de Comprobantes</h3>
            <p className="text-xs text-slate-500">Procesa paquetes comprimidos (ZIP) o archivos XML UBL 2.1 de la DIAN. Las facturas emitidas por {activeEmpresa?.nombre_comercial || 'la empresa activa'} se registran como Venta; las recibidas, como Compra.</p>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-2">
            <label className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-[#271a82] hover:bg-[#1c1343] text-white font-bold text-xs shadow-md transition active:scale-95 cursor-pointer ${uploadingState.active || isUploading ? 'opacity-70 pointer-events-none' : ''}`}>
              {uploadingState.active ? <><Loader2 className="w-4 h-4 text-[#fa9d1c] animate-spin" /><span>Procesando...</span></> : <><UploadCloud className="w-4 h-4 text-[#fa9d1c]" /><span>Subir Archivos</span></>}
              <input
                type="file"
                multiple
                accept=".xml,.zip,application/zip,text/xml,application/xml"
                className="hidden"
                disabled={uploadingState.active}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleUploadFiles(e.target.files);
                    e.target.value = '';
                  }
                }}
              />
            </label>

            <button onClick={descargarAuditoria} disabled={!!ocupado} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#e07b16] hover:bg-[#c96a0f] text-white font-bold text-xs shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-60" title={`Excel de auditoría (${objetivoTexto})`}>
              {ocupado === 'auditoria' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
              Auditoría Excel
            </button>

            <button onClick={() => setErpAbierto(true)} disabled={!!ocupado} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-60" title={`Plantilla de comprobantes Siigo (${objetivoTexto})`}>
              {ocupado === 'erp' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              Exportar ERP
            </button>

            <button onClick={() => onOpenSiigoPush(selectedFacturasList.length ? selectedFacturasList : facturas.filter(f => f.estado_revision === 'AUDITADA'))} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#271a82]/90 hover:bg-[#1c1343] text-white font-bold text-xs shadow-sm transition active:scale-95 cursor-pointer" title="Enviar facturas auditadas a Siigo Nube por API">
              <Send className="w-4 h-4" />
              Enviar Auditadas a SIIGO
            </button>

            <button onClick={descargarSoportes} disabled={!!ocupado} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-60" title={`Representación gráfica en PDF (${objetivoTexto})`}>
              {ocupado === 'pdf' ? <><Loader2 className="w-4 h-4 animate-spin" /> Comprimiendo ({idsObjetivo().length} docs)…</> : <><FileText className="w-4 h-4" /> Soportes PDF</>}
            </button>
          </div>
          <div className="flex flex-wrap justify-center gap-3 text-[11px]">
            <button onClick={onSeedDemo} className="flex items-center gap-1 text-[#e64519] hover:underline cursor-pointer"><Sparkles className="w-3 h-3" /> Inyectar facturas demo</button>
            {onImportFromDrive && <button onClick={onImportFromDrive} className="flex items-center gap-1 text-[#0066da] hover:underline cursor-pointer"><FolderDown className="w-3 h-3" /> Importar de Google Drive</button>}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col items-center justify-center text-center">
          <FileText className="w-5 h-5 text-[#271a82]" />
          <div className="text-3xl font-black text-[#271a82] mt-1">{facturasUnicas}</div>
          <div className="text-xs font-bold text-slate-700">Facturas Únicas</div>
          <div className="text-[10px] text-slate-400">{lineasContables} líneas contables registradas</div>
          <div className="text-[10px] text-slate-400 mt-1">{facturas.filter(f => f.tipo_operacion === 'VENTA').length} ventas · {facturas.filter(f => f.tipo_operacion !== 'VENTA').length} compras</div>
        </div>
      </div>

      {uploadingState.result && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-3 flex items-center gap-3 text-xs font-semibold text-emerald-800 animate-in fade-in">
          <FileCheck2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            {uploadingState.result.archivos_procesados} archivo(s) procesado(s)
            {uploadingState.result.xmls_extraidos > uploadingState.result.archivos_procesados && (
              <> &mdash; <Archive className="w-3.5 h-3.5 inline mx-0.5 relative top-[-1px]" />{uploadingState.result.xmls_extraidos} XMLs extra&iacute;dos</>
            )}
            {' — '}{uploadingState.result.facturas_creadas} factura(s) registrada(s). Los originales quedaron en la carpeta de la empresa.
          </span>
        </div>
      )}

      {/* Filtros y acciones masivas */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por tercero, NIT, ítem o factura..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#f8f9fa] border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#271a82]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">Desde
              <input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="bg-[#f8f9fa] border border-slate-200 rounded-xl px-2 py-1.5 text-xs text-slate-700" />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">Hasta
              <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="bg-[#f8f9fa] border border-slate-200 rounded-xl px-2 py-1.5 text-xs text-slate-700" />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">Tipo
              <select value={tipoFilter} onChange={(e) => setTipoFilter(e.target.value as any)} className="bg-[#f8f9fa] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-medium">
                <option value="TODOS">Todas las transacciones</option>
                <option value="VENTA">Ventas</option>
                <option value="COMPRA">Compras</option>
              </select>
            </label>
            <label className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">Estado
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-[#f8f9fa] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-medium">
                <option value="TODOS">Todos</option>
                <option value="PENDIENTE">Pendientes</option>
                <option value="AUDITADA">Auditadas</option>
                <option value="SINCRONIZADA_SIIGO">Sincronizadas Siigo</option>
              </select>
            </label>
          </div>
        </div>

        {/* Asignación masiva (como la barra BANCO / RTEFTE) */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
          <span className="text-[10px] font-bold uppercase text-slate-400 mr-1">Asignar a {objetivoTexto}:</span>
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl pl-2">
            <Landmark className="w-3.5 h-3.5 text-slate-400" />
            <input value={bancoMasivo} onChange={e => setBancoMasivo(e.target.value.replace(/[^\d]/g, ''))} placeholder="Cuenta banco Siigo (ej. 11100505)" className="bg-transparent px-1.5 py-1.5 text-xs w-64 focus:outline-none font-mono" />
            <button disabled={!!ocupado} onClick={() => aplicarMasivo({ banco_siigo: bancoMasivo }, bancoMasivo ? `Banco ${bancoMasivo}` : 'Banco predeterminado de Siigo')} className="p-1.5 rounded-lg bg-[#271a82] text-white cursor-pointer disabled:opacity-60" title="Aplicar banco"><Check className="w-3.5 h-3.5" /></button>
          </div>
          <div className="flex items-center gap-1 bg-red-50 border border-red-200 rounded-xl pl-2">
            <span className="text-[10px] font-bold text-red-700">RTEFTE</span>
            <select value={reteMasiva} onChange={e => setReteMasiva(e.target.value)} className="bg-transparent px-1.5 py-1.5 text-xs focus:outline-none">
              <option value="">Elegir tarifa…</option>
              <option value="0|64">Sin retención (0%)</option>
              <option value="2.5|64">Compras 2,5% (C.64)</option>
              <option value="4|62">Servicios 4% (C.62)</option>
              <option value="3.5|63">Arrendamientos 3,5% (C.63)</option>
              <option value="10|61">Honorarios 10% (C.61)</option>
              <option value="11|61">Honorarios 11% (C.61)</option>
            </select>
            <button disabled={!reteMasiva || !!ocupado} onClick={() => { const [p, c] = reteMasiva.split('|'); aplicarMasivo({ retencion_porc: Number(p), casilla_350: Number(c) }, `ReteFuente ${p}%`); }} className="p-1.5 rounded-lg bg-red-600 text-white cursor-pointer disabled:opacity-50" title="Aplicar retención"><Check className="w-3.5 h-3.5" /></button>
          </div>
          {ocupado === 'masivo' && <Loader2 className="w-4 h-4 animate-spin text-[#271a82]" />}
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between bg-indigo-50/70 p-3 rounded-xl border border-indigo-100 animate-in fade-in">
            <div className="flex items-center gap-2 text-xs font-bold text-[#271a82]">
              <CheckSquare className="w-4 h-4 text-[#e64519]" />
              <span>{selectedIds.length} facturas seleccionadas</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleBulkApprove} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#271a82] text-white text-xs font-bold hover:bg-[#1c1343] cursor-pointer">
                <FileCheck2 className="w-3.5 h-3.5" /> Marcar Auditadas
              </button>
              <button onClick={() => onOpenSiigoPush(selectedFacturasList)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#e64519] text-white text-xs font-bold hover:bg-[#c43610] cursor-pointer">
                <Send className="w-3.5 h-3.5" /> Transmitir a Siigo ({selectedIds.length})
              </button>
              <button onClick={handleBulkDeleteSelected} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-xs font-semibold hover:bg-red-200 cursor-pointer">
                <Trash2 className="w-3.5 h-3.5" /> Eliminar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 w-10 text-center">
                  <button onClick={toggleSelectAll} className="cursor-pointer">
                    {selectedIds.length === filteredFacturas.length && filteredFacturas.length > 0 ? <CheckSquare className="w-4 h-4 text-[#271A82]" /> : <Square className="w-4 h-4 text-slate-400" />}
                  </button>
                </th>
                <th className="py-3 px-3">Acción</th>
                <th className="py-3 px-3">Factura</th>
                <th className="py-3 px-3">Fecha</th>
                <th className="py-3 px-3">Tercero / NIT</th>
                <th className="py-3 px-3">Ítem / Descripción</th>
                <th className="py-3 px-3 text-right">Subtotal</th>
                <th className="py-3 px-3 text-right">IVA</th>
                <th className="py-3 px-3">Banco (Siigo)</th>
                <th className="py-3 px-3">Cta. contable</th>
                <th className="py-3 px-3">Retenciones</th>
                <th className="py-3 px-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFacturas.length === 0 ? (
                <tr><td colSpan={12} className="py-12 text-center text-slate-400">No se encontraron facturas con los filtros aplicados.</td></tr>
              ) : (
                filteredFacturas.map((f, fIdx) => {
                  const isSelected = selectedIds.includes(f.id_factura);
                  const esVenta = f.tipo_operacion === 'VENTA';
                  return (
                    <tr key={`factura-row-${f.id_factura}-${f.factura_num || fIdx}`} className={`hover:bg-slate-50/70 transition ${isSelected ? 'bg-indigo-50/30' : ''}`}>
                      <td className="py-3 px-3 text-center">
                        <button onClick={() => toggleSelectOne(f.id_factura)} className="cursor-pointer">
                          {isSelected ? <CheckSquare className="w-4 h-4 text-[#271A82]" /> : <Square className="w-4 h-4 text-slate-300" />}
                        </button>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => onInspectCufe(f)} title="Ver CUFE y XML UBL" className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"><Eye className="w-3.5 h-3.5" /></button>
                          <a href={`/api/v1/empresas/${f.id_empresa}/facturas/${f.id_factura}/pdf`} target="_blank" rel="noreferrer" title="Ver representación gráfica PDF" className="p-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700"><FileText className="w-3.5 h-3.5" /></a>
                          <button onClick={() => onDeleteFactura(f.id_factura)} title="Eliminar factura" className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-[#271a82]">{f.factura_num}</div>
                        <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold ${esVenta ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>{esVenta ? 'Venta' : 'Compra'}</span>
                        <button onClick={() => onInspectCufe(f)} className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-[#e64519] font-mono cursor-pointer mt-0.5" title="Inspeccionar CUFE UBL 2.1">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />{(f.cufe_hash || '').substring(0, 8)}…
                        </button>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">{f.fecha}</td>
                      <td className="py-3 px-3 max-w-[200px]">
                        <div className="font-semibold text-slate-800 truncate" title={f.proveedor}>{f.proveedor}</div>
                        <div className="text-[10px] text-slate-400">NIT: {f.nit_tercero}</div>
                      </td>
                      <td className="py-3 px-3 max-w-[220px]">
                        <div className="text-slate-700 truncate" title={(f.items || []).map(i => `${i.descripcion_item} × ${i.cantidad}`).join('\n') || f.descripcion_item}>{f.descripcion_item}</div>
                        <div className="text-[10px] text-slate-400">{f.items?.length || 1} línea(s) · cant. {f.cantidad}</div>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-800 whitespace-nowrap">{formatCOP(f.subtotal)}</td>
                      <td className="py-3 px-3 text-right text-emerald-700 whitespace-nowrap">{formatCOP(f.iva)}</td>
                      <td className="py-3 px-3">
                        <input
                          key={`banco-${f.id_factura}-${f.banco_siigo || ''}`}
                          defaultValue={f.banco_siigo || ''}
                          placeholder="Default (Siigo)"
                          onBlur={(e) => {
                            const v = e.target.value.replace(/[^\d]/g, '');
                            if (v !== (f.banco_siigo || '')) aplicarMasivoUno(f.id_factura, v);
                          }}
                          className="w-28 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[11px] font-mono text-slate-700"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <select
                          value={f.cuenta_gasto}
                          onChange={(e) => onUpdateFactura(f.id_factura, 'cuenta', e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[11px] font-mono text-[#271A82] font-semibold max-w-[150px] truncate"
                        >
                          {cuentasPara(f).map(c => <option key={`${c.id_puc}-${c.cuenta}`} value={c.cuenta}>{c.cuenta} - {c.nombre}</option>)}
                        </select>
                      </td>
                      <td className="py-3 px-3">
                        {esVenta ? (
                          <span className="text-[10px] text-slate-400">No aplica en ventas</span>
                        ) : (
                          <>
                            <select
                              value={f.casilla_350}
                              onChange={(e) => {
                                const cNum = parseInt(e.target.value);
                                const tarifas: Record<number, number> = { 61: 10, 62: 4, 63: 3.5, 64: 2.5 };
                                onUpdateFactura(f.id_factura, 'retencion', { retencion_porc: tarifas[cNum] ?? 0, casilla_350: cNum });
                              }}
                              className="bg-red-50 border border-red-200 rounded px-1.5 py-1 text-[10px] font-bold text-red-700"
                            >
                              <option value={61}>C.61 (10% Honorarios)</option>
                              <option value={62}>C.62 (4% Servicios)</option>
                              <option value={63}>C.63 (3.5% Arriendos)</option>
                              <option value={64}>C.64 (2.5% Compras)</option>
                            </select>
                            <div className="text-[10px] font-bold text-amber-700 mt-0.5">Fte: -{formatCOP(f.retencion_valor)} ({f.retencion_porc}%)</div>
                            {(f.reteica_tarifa || 0) > 0 && <div className="text-[10px] text-orange-700">ICA: -{formatCOP((Math.abs(f.subtotal) * (f.reteica_tarifa || 0)) / 1000)} ({f.reteica_tarifa}‰)</div>}
                            {(f.reteiva_porc || 0) > 0 && <div className="text-[10px] text-purple-700">IVA: -{formatCOP((Math.abs(f.iva) * (f.reteiva_porc || 0)) / 100)} ({f.reteiva_porc}%)</div>}
                          </>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${f.estado_revision === 'AUDITADA' ? 'bg-blue-100 text-blue-700' : f.estado_revision === 'SINCRONIZADA_SIIGO' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {f.estado_revision}
                        </span>
                        {f.estado_revision === 'PENDIENTE' && (
                          <button onClick={() => onUpdateFactura(f.id_factura, 'estado', 'AUDITADA')} className="block mt-1 text-[10px] font-bold text-emerald-700 hover:underline cursor-pointer">Aprobar</button>
                        )}
                        {f.siigo_id && <div className="text-[9px] font-mono text-emerald-600 font-bold mt-0.5">{f.siigo_id}</div>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
          <span>Mostrando {filteredFacturas.length} de {facturas.length} facturas</span>
          <span>Las exportaciones usan {objetivoTexto === 'todas' ? 'todas las facturas de la empresa' : `las ${objetivoTexto}`}</span>
        </div>
      </div>

      {/* Modal Exportación a ERP */}
      {erpAbierto && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" onClick={() => setErpAbierto(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 rounded-lg"><FileDown className="w-4 h-4 text-emerald-700" /></div>
                <div>
                  <div className="text-sm font-bold text-slate-800">Exportación a ERP</div>
                  <div className="text-[11px] text-slate-500">Plantilla de comprobantes contables de Siigo · {objetivoTexto}</div>
                </div>
              </div>
              <button onClick={() => setErpAbierto(false)} className="p-1 rounded hover:bg-slate-100 cursor-pointer"><X className="w-4 h-4 text-slate-500" /></button>
            </div>
            <div className="p-5 space-y-3">
              <label className="block">
                <span className="text-[11px] font-bold text-slate-600 uppercase">Tipo de comprobante Siigo</span>
                <input value={erpTipo} onChange={e => setErpTipo(e.target.value)} className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" placeholder="Ej: 11" />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold text-slate-600 uppercase">Prefijo de documento (opcional)</span>
                <input value={erpPrefijo} onChange={e => setErpPrefijo(e.target.value)} className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" placeholder="Ej: FE, SETT, CC" />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold text-slate-600 uppercase">Consecutivo numérico inicial</span>
                <input type="number" min={1} value={erpConsecutivo} onChange={e => setErpConsecutivo(e.target.value)} className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" />
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input type="checkbox" checked={erpSoloAuditadas} onChange={e => setErpSoloAuditadas(e.target.checked)} /> Exportar solo facturas auditadas
              </label>
              <button onClick={() => setErpAvanzado(!erpAvanzado)} className="flex items-center gap-1.5 text-[11px] font-bold text-[#271a82] cursor-pointer">
                <Settings2 className="w-3.5 h-3.5" /> {erpAvanzado ? 'Ocultar' : 'Ver'} cuentas de contrapartida
              </button>
              {erpAvanzado && (
                <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  {CUENTAS_AVANZADAS.map(c => (
                    <label key={c.clave} className="block">
                      <span className="text-[10px] font-semibold text-slate-500">{c.etiqueta}</span>
                      <input value={erpCuentas[c.clave] ?? ''} placeholder={c.defecto} onChange={e => setErpCuentas({ ...erpCuentas, [c.clave]: e.target.value.replace(/[^\d]/g, '') })} className="mt-0.5 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono bg-white" />
                    </label>
                  ))}
                  <p className="col-span-2 text-[10px] text-slate-500">Cada factura genera un comprobante de partida doble: ingreso o gasto por línea, IVA, retenciones y la contrapartida (cliente, proveedor o el banco asignado). Se valida el cuadre antes de descargar.</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100">
              <button onClick={() => setErpAbierto(false)} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer">Cancelar</button>
              <button onClick={exportarErp} disabled={ocupado === 'erp'} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-60">
                {ocupado === 'erp' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />} Descargar Archivo ERP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  async function aplicarMasivoUno(id: number, banco: string) {
    try {
      await apiJson(`/api/v1/empresas/${idEmpresa}/facturas/masivo`, { method: 'PATCH', body: JSON.stringify({ ids: [id], campos: { banco_siigo: banco } }) });
      onRefresh?.();
    } catch (err: any) {
      avisar(err.message, 'error');
    }
  }
};
