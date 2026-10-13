import React from 'react';
import { F350Report } from '../types/index.ts';
import { FileSpreadsheet, Download, ShieldCheck, CheckCircle2, AlertCircle, FileText } from 'lucide-react';

interface CentroFiscalViewProps {
  report: F350Report | null;
  onNavigateToFacturas: () => void;
}

export const CentroFiscalView: React.FC<CentroFiscalViewProps> = ({ report, onNavigateToFacturas }) => {
  const formatCOP = (num: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(num || 0);
  };

  if (!report) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-slate-500">
        Cargando liquidación fiscal Formulario 350...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* DIAN Header Simulation */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#271a82] flex items-center justify-center text-white font-black text-xl shadow-md">
            350
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold text-[#e64519] uppercase tracking-wider bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
                Formulario Oficial DIAN
              </span>
              <span className="text-xs text-slate-400 font-mono">Año Gravable: {report.anoGravable}</span>
              <span className="text-[11px] text-[#271a82] font-semibold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                Certificado TLM Get Adviced
              </span>
            </div>
            <h3 className="text-xl font-bold text-[#271a82] tracking-tight">
              Declaración de Retención en la Fuente (F350)
            </h3>
            <p className="text-xs text-slate-500">
              Liquidación consolidada según umbrales de UVT vigentes (Compras ≥ 27 UVT, Servicios ≥ 4 UVT)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => alert("Reporte fiscal F350 generado con certificación tributaria TLM.")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#271a82] hover:bg-[#1c1343] text-white font-bold text-xs shadow-md transition active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#fa9d1c]" />
            Exportar Hoja F350
          </button>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase block mb-1">Total Bases Gravables</span>
          <span className="text-2xl font-black text-slate-800">{formatCOP(report.totalBasesGravables)}</span>
          <span className="text-[11px] text-slate-400 block mt-1">Suma de compras y servicios sujetos</span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase block mb-1">Retención Renta (F350)</span>
          <span className="text-2xl font-black text-amber-700">{formatCOP(report.totalRetenciones)}</span>
          <span className="text-[11px] text-amber-600 block mt-1">A declarar en Casillas 59-75</span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase block mb-1">ReteIVA Practicado (15%)</span>
          <span className="text-2xl font-black text-purple-700">{formatCOP(report.totalReteIva)}</span>
          <span className="text-[11px] text-purple-600 block mt-1">Casilla 80 - Retención de IVA</span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs bg-gradient-to-br from-indigo-50/50 to-orange-50/40">
          <span className="text-xs font-semibold text-[#271A82] uppercase block mb-1">Gran Total a Pagar DIAN</span>
          <span className="text-2xl font-black text-[#271A82]">{formatCOP(report.granTotalRetenido)}</span>
          <span className="text-[11px] text-emerald-600 font-semibold block mt-1">Liquidación exacta consolidada</span>
        </div>
      </div>

      {/* Official Casillas Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[#271A82]" />
            <span className="font-bold text-slate-800 text-sm">Desglose Oficial por Renglón / Casilla DIAN</span>
          </div>
          <span className="text-xs font-medium text-slate-500">Periodo Mensual</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-24">Casilla</th>
                <th className="py-3 px-4">Concepto Tributario Oficial</th>
                <th className="py-3 px-4 text-right">Base Gravable</th>
                <th className="py-3 px-4 text-center">Tarifa Sugerida</th>
                <th className="py-3 px-4 text-right">Retención Calculada</th>
                <th className="py-3 px-4 text-center">Facturas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.casillas.map((c) => (
                <tr key={c.casilla} className="hover:bg-slate-50/80 transition">
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-1 rounded-lg bg-[#271A82] text-white font-mono font-bold text-xs">
                      #{c.casilla}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-slate-800 block text-xs">{c.concepto}</span>
                    <span className="text-[11px] text-slate-400">
                      {c.facturas_asociadas.length > 0 ? `Asociadas: ${c.facturas_asociadas.join(', ')}` : 'Sin movimientos en periodo'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold text-slate-700">
                    {formatCOP(c.base_gravable)}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 font-bold text-slate-700 text-[11px]">
                      {c.tarifa_sugerida}%
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-black text-amber-700 text-sm">
                    {formatCOP(c.retencion_calculada)}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                      {c.cantidad_facturas}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-black text-slate-900 border-t-2 border-slate-200">
              <tr>
                <td colSpan={2} className="py-4 px-4 text-right uppercase text-xs">
                  Totales Consolidados Formulario 350:
                </td>
                <td className="py-4 px-4 text-right text-sm">
                  {formatCOP(report.totalBasesGravables)}
                </td>
                <td></td>
                <td className="py-4 px-4 text-right text-base text-amber-700">
                  {formatCOP(report.totalRetenciones + report.totalReteIva)}
                </td>
                <td className="py-4 px-4 text-center">
                  {report.casillas.reduce((acc, c) => acc + c.cantidad_facturas, 0)} facturas
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
