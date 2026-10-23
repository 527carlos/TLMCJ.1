import React, { useState } from 'react';
import { CuentaPUC, BalanceTercero } from '../types/index.ts';
import { BookOpen, Search, Layers, UserCheck, ArrowUpDown } from 'lucide-react';

interface CerebroContableViewProps {
  cuentasPUC: CuentaPUC[];
  balanceTerceros: BalanceTercero[];
}

export const CerebroContableView: React.FC<CerebroContableViewProps> = ({ cuentasPUC, balanceTerceros }) => {
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
