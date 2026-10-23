import React, { useState } from 'react';
import { ConciliacionSummary, MovimientoBancario, MovimientoLibro } from '../types/index.ts';
import {
  Scale,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Download,
  Sliders,
  Building,
  RefreshCw,
  UploadCloud,
  Loader2
} from 'lucide-react';

interface ConciliacionViewProps {
  summary: ConciliacionSummary | null;
  onExecuteReconciliation: (tolerance: number) => void;
  onGenerateFlatFile: () => void;
  isRunning?: boolean;
  onUploadExtracto?: (file: File, banco: string, idEmpresa: number) => Promise<{ movimientos_importados: number; mensaje: string }>;
  activeEmpresaId?: number;
}

export const ConciliacionView: React.FC<ConciliacionViewProps> = ({
  summary,
  onExecuteReconciliation,
  onGenerateFlatFile,
  isRunning = false,
  onUploadExtracto,
  activeEmpresaId = 1
}) => {
  const [bankSelect, setBankSelect] = useState('DAVIVIENDA');
  const [tolerance, setTolerance] = useState(0);
  const [activeTab, setActiveTab] = useState<'CRUCES' | 'PENDIENTES_BANCO' | 'PENDIENTES_LIBRO'>('CRUCES');
  const [extractoUploading, setExtractoUploading] = useState(false);
  const [extractoResult, setExtractoResult] = useState<string | null>(null);

  const handleUploadExtracto = async (file: File) => {
    if (!onUploadExtracto) return;
    setExtractoUploading(true);
    setExtractoResult(null);
    try {
      const result = await onUploadExtracto(file, bankSelect, activeEmpresaId);
      setExtractoResult(result.mensaje);
      setTimeout(() => setExtractoResult(null), 7000);
    } catch {
      setExtractoResult('Error procesando extracto bancario.');
      setTimeout(() => setExtractoResult(null), 5000);
    } finally {
      setExtractoUploading(false);
    }
  };

  const formatCOP = (num: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(num || 0);
  };

  return (
    <div className="space-y-6">
      {/* Control Configuration Bar */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200 uppercase">
              Motor Algorítmico Multibanco
            </span>
            <span className="text-xs text-slate-400 font-medium">Algoritmo de Cruce Hash O(n)</span>
          </div>
          <h3 className="text-xl font-bold text-slate-800 tracking-tight">Conciliación Bancaria Automática</h3>
          <p className="text-xs text-slate-500">Cruce inteligente de extractos bancarios vs libros contables de Siigo</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Entidad Financiera</label>
            <select
              value={bankSelect}
              onChange={(e) => setBankSelect(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#271A82]"
            >
              <option value="DAVIVIENDA">Banco Davivienda S.A.</option>
              <option value="BANCOLOMBIA">Bancolombia S.A.</option>
              <option value="BBVA">BBVA Colombia</option>
              <option value="BCS">Banco Caja Social</option>
              <option value="GLOBAL66">Global66 / Pasarela</option>
            </select>
          </div>

          <div className="w-40">
            <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
              <span>Tolerancia:</span>
              <span className="text-[#e64519] font-mono">${tolerance} COP</span>
            </div>
            <input
              type="range"
              min="0"
              max="500"
              step="50"
              value={tolerance}
              onChange={(e) => setTolerance(parseInt(e.target.value))}
              className="w-full accent-[#e64519] cursor-pointer"
            />
          </div>

          <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0066da] border border-blue-200 font-bold text-xs transition active:scale-95 cursor-pointer ${extractoUploading ? 'opacity-70 pointer-events-none' : ''}`} title="Cargar extracto bancario CSV/TXT">
            {extractoUploading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /><span>Procesando...</span></>
            ) : (
              <><UploadCloud className="w-4 h-4" /><span>Cargar Extracto</span></>
            )}
            <input
              type="file"
              accept=".csv,.txt,.xls,.xlsx"
              className="hidden"
              disabled={extractoUploading}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleUploadExtracto(e.target.files[0]);
                  e.target.value = '';
                }
              }}
            />
          </label>

          <button
            onClick={() => onExecuteReconciliation(tolerance)}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#e64519] hover:bg-[#c43610] text-white font-bold text-xs shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <ArrowRightLeft className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
            Ejecutar Cruce Algorítmico
          </button>
        </div>
      </div>

      {/* Extracto upload result banner */}
      {extractoResult && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3 flex items-center gap-3 text-xs font-semibold text-blue-800 animate-in fade-in">
          <UploadCloud className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{extractoResult}</span>
        </div>
      )}

      {/* KPI Stats */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase block mb-1">Partidas Conciliadas</span>
            <span className="text-2xl font-black text-emerald-700">{summary.partidasConciliadas}</span>
            <span className="text-[11px] text-emerald-600 font-medium block mt-1">Coincidencia exacta de importes</span>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase block mb-1">Pendientes en Banco</span>
            <span className="text-2xl font-black text-amber-700">{summary.partidasPendientesBanco}</span>
            <span className="text-[11px] text-amber-600 font-medium block mt-1">4x1000, comisiones o cargos</span>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase block mb-1">Pendientes en Libros</span>
            <span className="text-2xl font-black text-blue-700">{summary.partidasPendientesLibros}</span>
            <span className="text-[11px] text-blue-600 font-medium block mt-1">Transacciones en tránsito</span>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase block mb-1">Efectividad de Cruce</span>
            <span className="text-2xl font-black text-[#271A82]">{summary.tasaCoincidencia}%</span>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-[#271A82] h-full rounded-full transition-all duration-500" 
                style={{ width: `${summary.tasaCoincidencia}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Main Tabs Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Tab Switcher */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('CRUCES')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                activeTab === 'CRUCES'
                  ? 'bg-[#271A82] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Cruces Validados ({summary?.cruces.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('PENDIENTES_BANCO')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                activeTab === 'PENDIENTES_BANCO'
                  ? 'bg-[#271A82] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Partidas Pendientes Banco ({summary?.pendientesBanco.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('PENDIENTES_LIBRO')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                activeTab === 'PENDIENTES_LIBRO'
                  ? 'bg-[#271A82] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Partidas Pendientes Libros ({summary?.pendientesLibro.length || 0})
            </button>
          </div>

          <button
            onClick={onGenerateFlatFile}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition active:scale-95 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            Generar Plano Ajustes Siigo (CC-99)
          </button>
        </div>

        {/* Tab Content */}
        <div className="overflow-x-auto">
          {activeTab === 'CRUCES' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">ID Cruce</th>
                  <th className="py-3 px-4">Movimiento en Banco</th>
                  <th className="py-3 px-4">Movimiento en Libros</th>
                  <th className="py-3 px-4 text-right">Monto</th>
                  <th className="py-3 px-4 text-center">Score</th>
                  <th className="py-3 px-4 text-center">Método</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary?.cruces.map(c => (
                  <tr key={c.id_cruce} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">{c.id_cruce}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{c.banco.concepto}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{c.banco.fecha}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{c.libro.concepto}</div>
                      <div className="text-[11px] text-slate-400 font-mono">Cta: {c.libro.cuenta} | {c.libro.fecha}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-800">
                      {formatCOP(c.banco.monto)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        {c.puntaje_coincidencia}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {c.metodo_match}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'PENDIENTES_BANCO' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Concepto en Extracto Bancario</th>
                  <th className="py-3 px-4">Tipo Movimiento</th>
                  <th className="py-3 px-4 text-right">Valor en Extracto</th>
                  <th className="py-3 px-4 text-center">Acción Sugerida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary?.pendientesBanco.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono text-slate-600">{b.fecha}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{b.concepto}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        b.tipo === 'DEBITO' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {b.tipo}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-800">
                      {formatCOP(b.monto)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-1 rounded-lg bg-red-50 text-[#e64519] border border-red-200 font-bold text-[10px]">
                        Causar Ajuste Contable Siigo
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'PENDIENTES_LIBRO' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Concepto en Libros Contables</th>
                  <th className="py-3 px-4">Cuenta Contable</th>
                  <th className="py-3 px-4 text-right">Valor Asentado</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary?.pendientesLibro.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono text-slate-600">{l.fecha}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{l.concepto}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{l.cuenta}</td>
                    <td className="py-3 px-4 text-right font-black text-slate-800">
                      {formatCOP(l.monto)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">
                        Pendiente Cobro / Tránsito
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
