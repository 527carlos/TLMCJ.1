import React, { useState } from 'react';
import { CuentaPUC, BalanceTercero } from '../types/index.ts';
import { BookOpen, Search, Layers, UserCheck, ArrowUpDown, CloudUpload, Trash2, Loader2, Scale } from 'lucide-react';
import { apiJson } from '../lib/api.ts';

interface CerebroContableViewProps {
  cuentasPUC: CuentaPUC[];
  balanceTerceros: BalanceTercero[];
  idEmpresa?: number;
  puedeEliminar?: boolean;
  onRefresh?: () => void;
  onShowToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

/** Tarjeta de carga: selecciona un Excel/CSV y lo sincroniza con la base de la empresa activa. */
const TarjetaCarga: React.FC<{
  titulo: string;
  subtitulo: string;
  boton: string;
  color: 'indigo' | 'emerald';
  icono: React.ReactNode;
  url: string;
  urlEliminar: string;
  puedeEliminar?: boolean;
  onListo: (m: string, ok: boolean) => void;
}> = ({ titulo, subtitulo, boton, color, icono, url, urlEliminar, puedeEliminar, onListo }) => {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const sincronizar = async () => {
    if (!archivo) { onListo('Seleccione primero el archivo.', false); return; }
    setOcupado(true);
    try {
      const fd = new FormData();
      fd.append('archivo', archivo);
      const r = await apiJson<{ mensaje: string; archivado?: boolean }>(url, { method: 'POST', body: fd });
      onListo(`${r.mensaje}${r.archivado ? ' Archivo guardado en la carpeta de la empresa.' : ''}`, true);
      setArchivo(null);
    } catch (err: any) {
      onListo(err.message, false);
    } finally {
      setOcupado(false);
    }
  };
  const eliminar = async () => {
    if (!confirm(`¿Eliminar ${titulo.toLowerCase().replace('cargar ', '')} de esta empresa?`)) return;
    try {
      const r = await apiJson<{ mensaje: string }>(urlEliminar, { method: 'DELETE' });
      onListo(r.mensaje, true);
    } catch (err: any) {
      onListo(err.message, false);
    }
  };
  const btn = color === 'indigo' ? 'bg-[#271a82] hover:bg-[#1c1343]' : 'bg-emerald-600 hover:bg-emerald-700';
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${color === 'indigo' ? 'bg-indigo-50 text-[#271a82]' : 'bg-emerald-50 text-emerald-700'}`}>{icono}</div>
          <div><div className="text-sm font-bold text-slate-800">{titulo}</div><div className="text-[10px] text-slate-400">{subtitulo}</div></div>
        </div>
        {puedeEliminar && <button onClick={eliminar} className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 cursor-pointer" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>}
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <span className={`px-3 py-1.5 rounded-lg text-[11px] font-bold ${color === 'indigo' ? 'bg-indigo-50 text-[#271a82]' : 'bg-emerald-50 text-emerald-700'}`}>Seleccionar archivo</span>
        <span className="text-[11px] text-slate-500 truncate">{archivo?.name || 'Ningún archivo seleccionado'}</span>
        <input type="file" accept=".xlsx,.xls,.csv,.txt" className="hidden" onChange={e => { setArchivo(e.target.files?.[0] || null); e.target.value = ''; }} />
      </label>
      <button onClick={sincronizar} disabled={ocupado} className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white font-bold text-xs cursor-pointer disabled:opacity-60 ${btn}`}>
        {ocupado ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />} {boton}
      </button>
    </div>
  );
};

export const CerebroContableView: React.FC<CerebroContableViewProps> = ({ cuentasPUC, balanceTerceros, idEmpresa, puedeEliminar, onRefresh, onShowToast }) => {
  const [activeTab, setActiveTab] = useState<'PUC' | 'BALANCE'>('PUC');
  const [searchPuc, setSearchPuc] = useState('');
  const [searchBalance, setSearchBalance] = useState('');

  const formatCOP = (num: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(num || 0);
  };

  const filteredPuc = cuentasPUC.filter(c =>
    c.cuenta.includes(searchPuc) || c.nombre.toLowerCase().includes(searchPuc.toLowerCase())
  );

  const filteredBalance = balanceTerceros.filter(b =>
    b.cuenta_contable.includes(searchBalance) ||
    b.nombre_cuenta.toLowerCase().includes(searchBalance.toLowerCase()) ||
    b.nit_tercero.includes(searchBalance) ||
    b.nombre_tercero.toLowerCase().includes(searchBalance.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-[#271A82] bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200 uppercase">
              Cerebro Contable Enterprise
            </span>
            <span className="text-xs text-slate-400 font-medium">Catálogo Jerárquico & Balances</span>
          </div>
          <h3 className="text-xl font-bold text-slate-800 tracking-tight">Catálogo PUC & Balance de Terceros</h3>
          <p className="text-xs text-slate-500">Mapeo canónico de cuentas para comprobantes en Siigo Nube y Siigo Pyme</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('PUC')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'PUC'
                ? 'bg-[#271A82] text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Catálogo PUC ({cuentasPUC.length})
          </button>
          <button
            onClick={() => setActiveTab('BALANCE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'BALANCE'
                ? 'bg-[#271A82] text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Balance de Terceros ({balanceTerceros.length})
          </button>
        </div>
      </div>

      {idEmpresa && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <TarjetaCarga
            titulo="Cargar Catálogo PUC"
            subtitulo="Excel exportado desde el ERP (columnas Código y Nombre)"
            boton="Sincronizar Cuentas"
            color="indigo"
            icono={<BookOpen className="w-4 h-4" />}
            url={`/api/v1/empresas/${idEmpresa}/cerebro/puc`}
            urlEliminar={`/api/v1/empresas/${idEmpresa}/cerebro/puc`}
            puedeEliminar={puedeEliminar}
            onListo={(m, ok) => { onShowToast?.(m, ok ? 'success' : 'error'); if (ok) onRefresh?.(); }}
          />
          <TarjetaCarga
            titulo="Cargar Balance de Prueba"
            subtitulo="Modelo agnóstico: detecta cuenta, tercero, saldos, débitos y créditos"
            boton="Sincronizar Saldos"
            color="emerald"
            icono={<Scale className="w-4 h-4" />}
            url={`/api/v1/empresas/${idEmpresa}/cerebro/balance`}
            urlEliminar={`/api/v1/empresas/${idEmpresa}/cerebro/balance`}
            puedeEliminar={puedeEliminar}
            onListo={(m, ok) => { onShowToast?.(m, ok ? 'success' : 'error'); if (ok) onRefresh?.(); }}
          />
        </div>
      )}

      {/* View Content */}
      {activeTab === 'PUC' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por código de cuenta o nombre..."
              value={searchPuc}
              onChange={(e) => setSearchPuc(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#271A82]"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-32">Código PUC</th>
                  <th className="py-3 px-4">Descripción de Cuenta</th>
                  <th className="py-3 px-4 w-32 text-center">Clase / Tipo</th>
                  <th className="py-3 px-4 w-32 text-center">Uso en Motor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPuc.map(c => {
                  const clase = c.cuenta.charAt(0);
                  let tipoNombre = 'Activo';
                  if (clase === '2') tipoNombre = 'Pasivo';
                  if (clase === '3') tipoNombre = 'Patrimonio';
                  if (clase === '4') tipoNombre = 'Ingresos';
                  if (clase === '5') tipoNombre = 'Gastos Operacionales';

                  return (
                    <tr key={c.id_puc} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-[#271A82]">{c.cuenta}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{c.nombre}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {tipoNombre}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {clase === '5' ? (
                          <span className="px-2 py-0.5 rounded bg-red-50 text-[#e64519] border border-red-200 font-bold text-[10px]">
                            Causación ETL
                          </span>
                        ) : clase === '2' ? (
                          <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold text-[10px]">
                            Retención / Pasivo
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">General</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por tercero, NIT o cuenta contable..."
              value={searchBalance}
              onChange={(e) => setSearchBalance(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#271A82]"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Cuenta</th>
                  <th className="py-3 px-4">Tercero / Razón Social</th>
                  <th className="py-3 px-4 text-right">Saldo Inicial</th>
                  <th className="py-3 px-4 text-right">Débitos</th>
                  <th className="py-3 px-4 text-right">Créditos</th>
                  <th className="py-3 px-4 text-right">Saldo Final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBalance.map(b => (
                  <tr key={b.id_balance} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-[#271A82] block">{b.cuenta_contable}</span>
                      <span className="text-[11px] text-slate-400">{b.nombre_cuenta}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{b.nombre_tercero}</div>
                      <div className="text-[11px] text-slate-400 font-mono">NIT: {b.nit_tercero}</div>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600">{formatCOP(b.saldo_inicial)}</td>
                    <td className="py-3 px-4 text-right font-medium text-emerald-700">{formatCOP(b.debitos)}</td>
                    <td className="py-3 px-4 text-right font-medium text-amber-700">{formatCOP(b.creditos)}</td>
                    <td className="py-3 px-4 text-right font-black text-slate-800 text-sm">
                      {formatCOP(b.saldo_final)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
