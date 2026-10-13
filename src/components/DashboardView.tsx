import React from 'react';
import { Factura } from '../types/index.ts';
import { 
  TrendingUp, 
  Receipt, 
  Percent, 
  FileCheck2, 
  UploadCloud, 
  ArrowRight, 
  Scale,
  Sparkles,
  BarChart3,
  ShieldCheck,
  Building,
  CheckCircle2
} from 'lucide-react';
import { TlmLogo } from './TlmLogo.tsx';

interface DashboardViewProps {
  facturas: Factura[];
  kpis: {
    total_compras_netas: number;
    total_iva_descontable: number;
    total_retenciones_f350: number;
    total_auditadas: number;
    tasa_auditoria: number;
  };
  onNavigate: (section: string) => void;
  onQuickUpload: () => void;
  onOpenBrandCustomizer?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  facturas,
  kpis,
  onNavigate,
  onQuickUpload,
  onOpenBrandCustomizer
}) => {
  const formatCOP = (num: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(num || 0);
  };

  // Group expenses by account
  const accountExpenses: Record<string, { cuenta: string; label: string; total: number; count: number }> = {};
  facturas.forEach(f => {
    const c = f.cuenta_gasto || '51953001';
    let label = 'Gastos Operacionales Diversos';
    if (c === '513515') label = 'Servicios Cloud / Hosting TI';
    if (c === '511010') label = 'Honorarios Asesoría Tributaria';
    if (c === '512010') label = 'Arrendamientos Corporativos';
    if (c === '513505') label = 'Mantenimiento y Soporte TI';

    if (!accountExpenses[c]) {
      accountExpenses[c] = { cuenta: c, label, total: 0, count: 0 };
    }
    accountExpenses[c].total += f.subtotal || 0;
    accountExpenses[c].count += 1;
  });

  const sortedAccounts = Object.values(accountExpenses).sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6">
      {/* Top Banner with Official TLM Identity & Colors */}
      <div className="bg-gradient-to-r from-[#1c1343] via-[#271a82] to-[#4059aa] rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-indigo-900/50 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="pointer-events-none absolute -top-24 -right-12 w-96 h-96 rounded-full bg-[#fa9d1c]/15 blur-3xl"></div>
        <div className="pointer-events-none absolute -bottom-24 -left-12 w-96 h-96 rounded-full bg-[#e64519]/15 blur-3xl"></div>

        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="bg-[#e64519] text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
              Sociedad BIC
            </span>
            <span className="bg-white/10 text-indigo-100 text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/15">
              Metodología Ágil TLM
            </span>
            <span className="text-xs text-indigo-200 font-medium hidden sm:inline">
              Periodo Gravable 2026
            </span>
          </div>

          <div className="flex items-center gap-3">
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ fontFamily: "'Catamaran', sans-serif" }}>
              Consola TLM Enterprise
            </h3>
          </div>

          <p className="text-xs sm:text-sm text-indigo-100 max-w-2xl leading-relaxed">
            Plataforma integral contable y fiscal según los lineamientos de <strong className="text-white">TLM Get Adviced</strong>. Auditoría UBL 2.1 DIAN, conciliación algorítmica y sincronización certificada con Siigo Nube.
          </p>
        </div>

        <div className="flex items-center gap-2.5 relative z-10 flex-wrap">
          <button
            onClick={onQuickUpload}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#e64519] hover:bg-[#c43610] text-white font-bold text-xs shadow-lg transition active:scale-95 cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            Cargar Facturas Demo
          </button>
          <button
            onClick={() => onNavigate('conciliacion')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition active:scale-95 cursor-pointer backdrop-blur-xs"
          >
            <Scale className="w-4 h-4 text-[#fa9d1c]" />
            Conciliación Bancaria
          </button>
        </div>
      </div>

      {/* KPI Cards Grid with TLM Color Accents */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1 - Compras Netas (TLM Deep Indigo) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#271a82]"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Compras Netas (Subtotal)</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-[#271a82] group-hover:scale-105 transition">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800 tracking-tight" style={{ fontFamily: "'Catamaran', sans-serif" }}>
            {formatCOP(kpis.total_compras_netas)}
          </div>
          <p className="text-xs text-emerald-600 font-semibold mt-1.5 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{facturas.length} comprobantes registrados</span>
          </p>
        </div>

        {/* KPI 2 - IVA Descontable (TLM Warm Amber) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#fa9d1c]"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">IVA Descontable (19%)</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-[#fa9d1c] group-hover:scale-105 transition">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800 tracking-tight" style={{ fontFamily: "'Catamaran', sans-serif" }}>
            {formatCOP(kpis.total_iva_descontable)}
          </div>
          <p className="text-xs text-[#fa9d1c] font-semibold mt-1.5">
            Impuesto deducible para declaración bimestral
          </p>
        </div>

        {/* KPI 3 - ReteFuente F350 (TLM Vermilion Red) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#e64519]"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">ReteFuente F350 DIAN</span>
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center text-[#e64519] group-hover:scale-105 transition">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#e64519] tracking-tight" style={{ fontFamily: "'Catamaran', sans-serif" }}>
            {formatCOP(kpis.total_retenciones_f350)}
          </div>
          <p className="text-xs text-[#e64519] font-semibold mt-1.5">
            Retención a favor de la DIAN periodo actual
          </p>
        </div>

        {/* KPI 4 - Tasa de Auditoría (TLM Soft Lavender & Emerald) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#4059aa]"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tasa Auditoría Fiscal</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition">
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700 tracking-tight" style={{ fontFamily: "'Catamaran', sans-serif" }}>
            {kpis.tasa_auditoria}%
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-2.5 overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, kpis.tasa_auditoria)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Recent Invoices & Audit Status */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h4 className="font-bold text-[#271a82] text-base" style={{ fontFamily: "'Catamaran', sans-serif" }}>
                Últimas Facturas Registradas UBL 2.1
              </h4>
              <p className="text-xs text-slate-500">Comprobantes listos para validación y causación en Siigo</p>
            </div>
            <button
              onClick={() => onNavigate('facturas')}
              className="flex items-center gap-1.5 text-xs font-bold text-[#271a82] hover:text-[#e64519] transition cursor-pointer"
            >
              Ver todas ({facturas.length}) <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8f9fa] text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Número</th>
                  <th className="py-2.5 px-3">Proveedor / NIT</th>
                  <th className="py-2.5 px-3">Subtotal</th>
                  <th className="py-2.5 px-3">Casilla F350</th>
                  <th className="py-2.5 px-3 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {facturas.slice(0, 5).map(f => (
                  <tr key={f.id_factura} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-3 font-bold text-slate-800">{f.factura_num}</td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-800 truncate max-w-[200px]">{f.proveedor}</div>
                      <div className="text-[10px] text-slate-400 font-mono">NIT: {f.nit_tercero}</div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-700">{formatCOP(f.subtotal)}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md font-semibold text-[10px] bg-indigo-50 text-[#271a82] border border-indigo-200">
                        C.{f.casilla_350} ({f.retencion_porc}%)
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        f.estado_revision === 'AUDITADA'
                          ? 'bg-blue-100 text-blue-700'
                          : f.estado_revision === 'SINCRONIZADA_SIIGO'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {f.estado_revision}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column (1 col): Expense by PUC Account */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h4 className="font-bold text-[#271a82] text-base" style={{ fontFamily: "'Catamaran', sans-serif" }}>
              Distribución por Cuenta PUC
            </h4>
            <p className="text-xs text-slate-500">Mapeo automático de cuentas de gastos</p>
          </div>

          <div className="space-y-3">
            {sortedAccounts.map((acc) => {
              const perc = kpis.total_compras_netas > 0
                ? Math.round((acc.total / kpis.total_compras_netas) * 100)
                : 0;

              return (
                <div key={acc.cuenta} className="p-3 rounded-xl bg-[#f8f9fa] border border-slate-200/70">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-[#271a82] font-mono">{acc.cuenta}</span>
                    <span className="font-extrabold text-slate-800">{formatCOP(acc.total)}</span>
                  </div>
                  <div className="text-[11px] text-slate-600 truncate mb-2 font-medium">{acc.label}</div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{acc.count} comprobantes</span>
                    <span className="font-semibold text-slate-600">{perc}% del total</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-[#271a82] to-[#4059aa] h-full rounded-full" 
                      style={{ width: `${perc}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2">
            <button
              onClick={() => onNavigate('centro-fiscal')}
              className="w-full py-2.5 rounded-xl bg-[#271a82] hover:bg-[#1c1343] text-white font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-sm"
            >
              Ver Liquidación Oficial F350
              <ArrowRight className="w-4 h-4 text-[#fa9d1c]" />
            </button>
          </div>
        </div>
      </div>

      {/* Official TLM Ecosystem Banner */}
      <div className="bg-[#f8f9fa] border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#271a82] text-white">
            <ShieldCheck className="w-6 h-6 text-[#fa9d1c]" />
          </div>
          <div>
            <h5 className="font-bold text-slate-800 text-sm">
              Servicios Integrales TLM Get Adviced SAS BIC
            </h5>
            <p className="text-xs text-slate-500">
              Contabilidad NIIF, Revisoría Fiscal, Asesoría Tributaria y Dashboards Power BI & Looker Studio.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://www.tlmcol.com/"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-bold text-[#271a82] hover:text-[#e64519] underline"
          >
            Conoce más en www.tlmcol.com
          </a>
        </div>
      </div>
    </div>
  );
};
