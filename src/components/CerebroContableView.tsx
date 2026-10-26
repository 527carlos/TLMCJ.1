import React, { useState, useRef } from 'react';
import { CuentaPUC, BalanceTercero, Empresa } from '../types/index.ts';
import { BookOpen, Search, Layers, UserCheck, ArrowUpDown, UploadCloud, CheckCircle2, Loader2 } from 'lucide-react';

interface CerebroContableViewProps {
  cuentasPUC: CuentaPUC[];
  balanceTerceros: BalanceTercero[];
  activeEmpresa?: Empresa | null;
  onRefreshData?: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const CerebroContableView: React.FC<CerebroContableViewProps> = ({
  cuentasPUC,
  balanceTerceros,
  activeEmpresa,
  onRefreshData,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<'PUC' | 'BALANCE'>('PUC');
  const [searchPuc, setSearchPuc] = useState('');
  const [searchBalance, setSearchBalance] = useState('');

  const [pucFile, setPucFile] = useState<File | null>(null);
  const [balanceFile, setBalanceFile] = useState<File | null>(null);

  const [isUploadingPuc, setIsUploadingPuc] = useState(false);
  const [isUploadingBalance, setIsUploadingBalance] = useState(false);

  const pucInputRef = useRef<HTMLInputElement>(null);
  const balanceInputRef = useRef<HTMLInputElement>(null);

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

  const handleSincronizarPuc = async () => {
    if (!pucFile) {
      alert('Por favor seleccione un archivo de PUC (.xlsx, .xls o .csv)');
      return;
    }

    setIsUploadingPuc(true);
    const formData = new FormData();
    formData.append('archivo_puc', pucFile);
    formData.append('nit', activeEmpresa?.nit || '900543210-9');

    try {
      const res = await fetch('/api/v1/contabilidad/puc-masivo', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error cargando PUC');
      onShowToast?.(data.mensaje || 'Plan Único de Cuentas sincronizado con éxito.', 'success');
      setPucFile(null);
      if (pucInputRef.current) pucInputRef.current.value = '';
      onRefreshData?.();
    } catch (err: any) {
      alert(err.message || 'Error cargando PUC');
    } finally {
      setIsUploadingPuc(false);
    }
  };

  const handleSincronizarBalance = async () => {
    if (!balanceFile) {
      alert('Por favor seleccione un archivo de Balance de Prueba (.xlsx, .xls o .csv)');
      return;
    }

    setIsUploadingBalance(true);
    const formData = new FormData();
    formData.append('archivo_balance', balanceFile);
    formData.append('id_empresa', (activeEmpresa?.id_empresa || 1).toString());

    try {
      const res = await fetch('/api/v1/contabilidad/balance-masivo', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error cargando Balance');
      onShowToast?.(data.mensaje || 'Balance de prueba sincronizado con éxito.', 'success');
      setBalanceFile(null);
      if (balanceInputRef.current) balanceInputRef.current.value = '';
      onRefreshData?.();
    } catch (err: any) {
      alert(err.message || 'Error cargando Balance');
    } finally {
      setIsUploadingBalance(false);
    }
  };

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
          <h3 className="text-xl font-bold text-slate-800 tracking-tight">Cerebro Contable (MSM)</h3>
          <p className="text-xs text-slate-500">Cargue del Catálogo PUC y Saldos de Balance de Prueba</p>
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

      {/* TWO BIG CARDS FROM VIDEO (02:51 - 02:55) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Cargar Catálogo PUC */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Cargar Catálogo PUC</h4>
                <p className="text-[11px] text-slate-400">Soporta formato Excel (.xlsx) o archivo plano delimitado</p>
              </div>
            </div>

            <div className="pt-2">
              <input
                ref={pucInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => setPucFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
              />
            </div>
          </div>

          <button
            onClick={handleSincronizarPuc}
            disabled={isUploadingPuc}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#1c1343] hover:bg-[#271a82] text-white font-bold text-xs shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {isUploadingPuc ? <Loader2 className="w-4 h-4 animate-spin text-[#fa9d1c]" /> : <UploadCloud className="w-4 h-4 text-[#fa9d1c]" />}
            <span>Sincronizar Cuentas</span>
          </button>
        </div>

        {/* Card 2: Cargar Balance de Prueba */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Cargar Balance de Prueba</h4>
                <p className="text-[11px] text-slate-400">Soporta balance de terceros con saldos iniciales y débitos/créditos</p>
              </div>
            </div>

            <div className="pt-2">
              <input
                ref={balanceInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => setBalanceFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
              />
            </div>
          </div>

          <button
            onClick={handleSincronizarBalance}
            disabled={isUploadingBalance}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#1c1343] hover:bg-[#271a82] text-white font-bold text-xs shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {isUploadingBalance ? <Loader2 className="w-4 h-4 animate-spin text-[#fa9d1c]" /> : <UploadCloud className="w-4 h-4 text-[#fa9d1c]" />}
            <span>Sincronizar Saldos</span>
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
                {filteredPuc.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      No se encontraron cuentas con el filtro ingresado.
                    </td>
                  </tr>
                ) : (
                  filteredPuc.map(c => {
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
                            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[10px]">
                              Pasivos / CXP
                            </span>
                          ) : clase === '1' ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
                              Bancos & Activos
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono text-[10px]">Estándar</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
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
                {filteredBalance.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No hay registros en el balance de prueba.
                    </td>
                  </tr>
                ) : (
                  filteredBalance.map(b => (
                    <tr key={b.id_balance} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">
                        <div>{b.cuenta_contable}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{b.nombre_cuenta}</div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        <div>{b.nombre_tercero}</div>
                        <div className="text-[10px] text-slate-400 font-mono">NIT: {b.nit_tercero}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">{formatCOP(b.saldo_inicial)}</td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-700 font-semibold">{formatCOP(b.debitos)}</td>
                      <td className="py-3 px-4 text-right font-mono text-red-700 font-semibold">{formatCOP(b.creditos)}</td>
                      <td className="py-3 px-4 text-right font-mono font-black text-slate-800">{formatCOP(b.saldo_final)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
