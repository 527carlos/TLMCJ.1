import React, { useEffect, useRef, useState } from 'react';
import { Building2, ChevronDown, CheckCircle2, Search, Plus, X, Loader2 } from 'lucide-react';
import type { Empresa } from '../types/index.ts';
import { ERP_DESTINO } from '../shared/catalogosDian.ts';

const iniciales = (nombre: string) =>
  (nombre || '?').split(/\s+/).filter(Boolean).map(w => w[0]).join('').substring(0, 2).toUpperCase();

export const LogoEmpresa: React.FC<{ empresa: Empresa; activa?: boolean; tam?: string }> = ({ empresa, activa, tam = 'w-7 h-7' }) =>
  empresa.logo_url ? (
    <img src={empresa.logo_url} alt="" className={`${tam} rounded-md object-cover shrink-0 bg-white`} />
  ) : (
    <div className={`${tam} rounded-md shrink-0 font-bold text-[10px] flex items-center justify-center ${activa ? 'bg-[#e64519] text-white' : 'bg-white/15 text-white'}`}>
      {iniciales(empresa.nombre_comercial)}
    </div>
  );

interface Props {
  empresas: Empresa[];
  activeEmpresa: Empresa | null;
  onSelectEmpresa: (e: Empresa) => void;
  onCrearEmpresa?: () => void;
  fondo: string;
}

/** Selector de empresa activa con búsqueda y confirmación del cambio de entorno. */
export const EmpresaSelector: React.FC<Props> = ({ empresas, activeEmpresa, onSelectEmpresa, onCrearEmpresa, fondo }) => {
  const [abierto, setAbierto] = useState(false);
  const [filtro, setFiltro] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cerrar = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false); };
    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, []);

  const lista = empresas.filter(e =>
    e.nombre_comercial.toLowerCase().includes(filtro.toLowerCase()) || String(e.nit).includes(filtro)
  );

  const elegir = (e: Empresa) => {
    setAbierto(false);
    if (e.id_empresa === activeEmpresa?.id_empresa) return;
    if (window.confirm(`¿Cambiar la sesión de trabajo a "${e.nombre_comercial}"?`)) onSelectEmpresa(e);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAbierto(!abierto)}
        className="w-full flex items-center gap-2 border border-white/20 rounded-xl px-2.5 py-2 text-left hover:border-white/40 transition cursor-pointer"
        style={{ backgroundColor: fondo }}
        title={activeEmpresa?.nombre_comercial}
      >
        {activeEmpresa ? <LogoEmpresa empresa={activeEmpresa} activa /> : <Building2 className="w-5 h-5 text-white/60" />}
        <span className="flex-1 min-w-0 leading-tight">
          <span className="block text-xs font-bold text-white truncate">{activeEmpresa?.nombre_comercial || 'Seleccionar cliente'}</span>
          <span className="block text-[10px] text-white/60 font-mono">NIT: {activeEmpresa?.nit || '—'}</span>
        </span>
        <ChevronDown className={`w-4 h-4 text-white/70 transition ${abierto ? 'rotate-180' : ''}`} />
      </button>

      {abierto && (
        <div className="absolute left-0 right-0 mt-1.5 z-50 bg-white rounded-xl shadow-2xl border border-slate-200 p-2 text-slate-800">
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              autoFocus
              value={filtro}
              onChange={e => setFiltro(e.target.value)}
              placeholder="Buscar por nombre o NIT…"
              className="w-full pl-8 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#271a82]"
            />
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {lista.length === 0 && <p className="text-xs text-center text-slate-400 py-3">No hay coincidencias</p>}
            {lista.map(e => {
              const activa = e.id_empresa === activeEmpresa?.id_empresa;
              return (
                <button
                  key={e.id_empresa}
                  onClick={() => elegir(e)}
                  className={`w-full flex items-center gap-2.5 p-2 rounded-lg text-left transition cursor-pointer ${activa ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-slate-50 border border-transparent'}`}
                >
                  {e.logo_url ? <img src={e.logo_url} alt="" className="w-7 h-7 rounded-md object-cover" /> : (
                    <div className={`w-7 h-7 rounded-md text-[10px] font-bold flex items-center justify-center ${activa ? 'bg-[#271a82] text-white' : 'bg-slate-200 text-slate-700'}`}>{iniciales(e.nombre_comercial)}</div>
                  )}
                  <span className="flex-1 min-w-0 leading-tight">
                    <span className={`block text-xs font-bold truncate ${activa ? 'text-[#271a82]' : ''}`}>{e.nombre_comercial}</span>
                    <span className="block text-[10px] text-slate-400 font-mono">NIT: {e.nit}</span>
                  </span>
                  {activa && <CheckCircle2 className="w-4 h-4 text-[#271a82]" />}
                </button>
              );
            })}
          </div>
          {onCrearEmpresa && (
            <button
              onClick={() => { setAbierto(false); onCrearEmpresa(); }}
              className="w-full mt-2 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#271a82] hover:bg-[#1c1343] text-white text-xs font-bold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Crear cliente
            </button>
          )}
        </div>
      )}
    </div>
  );
};

/** Modal para registrar un cliente (empresa). Quien lo crea queda asignado a él. */
export const NuevaEmpresaModal: React.FC<{ onClose: () => void; onCrear: (datos: { nombre_comercial: string; nit: string; software_erp: string; logo_url?: string }) => Promise<void> }> = ({ onClose, onCrear }) => {
  const [nombre, setNombre] = useState('');
  const [nit, setNit] = useState('');
  const [erp, setErp] = useState(ERP_DESTINO[0]);
  const [logo, setLogo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const guardar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!nombre.trim() || !nit.trim()) { setError('La razón social y el NIT son obligatorios.'); return; }
    setEnviando(true);
    setError('');
    try {
      await onCrear({ nombre_comercial: nombre.trim(), nit: nit.trim(), software_erp: erp, logo_url: logo.trim() || undefined });
      onClose();
    } catch (err: any) {
      setError(err.message || 'No se pudo crear la empresa.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={guardar} className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800"><Building2 className="w-4 h-4 text-[#271a82]" /> Crear cliente</div>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-slate-100 cursor-pointer"><X className="w-4 h-4 text-slate-500" /></button>
        </div>
        <div className="p-5 space-y-3">
          <label className="block"><span className="text-[11px] font-bold text-slate-600 uppercase">Razón social</span>
            <input value={nombre} onChange={e => setNombre(e.target.value)} className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" /></label>
          <label className="block"><span className="text-[11px] font-bold text-slate-600 uppercase">NIT</span>
            <input value={nit} onChange={e => setNit(e.target.value)} placeholder="900123456-7" className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono" /></label>
          <label className="block"><span className="text-[11px] font-bold text-slate-600 uppercase">URL del logo (opcional)</span>
            <input type="url" value={logo} onChange={e => setLogo(e.target.value)} placeholder="https://dominio.com/logo.png" className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" /></label>
          <label className="block"><span className="text-[11px] font-bold text-slate-600 uppercase">Software / ERP destino</span>
            <select value={erp} onChange={e => setErp(e.target.value)} className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm">
              {ERP_DESTINO.map(x => <option key={x}>{x}</option>)}
            </select></label>
          <p className="text-[11px] text-slate-500">Quedará asignado como gestor de este cliente. Sus archivos se guardarán en su propia carpeta.</p>
          {error && <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-700">{error}</div>}
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer">Cancelar</button>
          <button type="submit" disabled={enviando} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#271a82] text-white text-xs font-bold cursor-pointer disabled:opacity-60">
            {enviando && <Loader2 className="w-4 h-4 animate-spin" />} Guardar
          </button>
        </div>
      </form>
    </div>
  );
};
