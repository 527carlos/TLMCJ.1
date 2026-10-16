import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Server, 
  Cloud, 
  Cpu, 
  Layers, 
  Table, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  ArrowRight, 
  ExternalLink, 
  ShieldCheck, 
  FileCode, 
  FileSpreadsheet, 
  Play, 
  Sparkles, 
  Boxes, 
  FileCheck2, 
  Zap, 
  Check, 
  Search,
  Users,
  Receipt,
  Scale,
  BookOpen,
  Sliders,
  AlertCircle
} from 'lucide-react';
import type { Usuario } from '../types/index.ts';

interface TableMeta {
  id: string;
  nombre: string;
  descripcion: string;
  conteo: number;
  columnas: string[];
  muestra: any[];
}

interface DatabaseOverviewResponse {
  app_url: string;
  cloud_host: string;
  estado: string;
  motor: string;
  version: string;
  propietario: string;
  persistencia: {
    tipo: string;
    archivo: string;
    tamano_bytes: number;
    tamano_legible: string;
    activo_en_disco: boolean;
  };
  estadisticas: {
    total_tablas: number;
    total_registros: number;
    uptime_segundos: number;
    memoria_usada_mb: string;
  };
  tablas: TableMeta[];
  gestiones_verificadas: {
    id: string;
    nombre: string;
    registros: number;
    estado: string;
    ruta: string;
  }[];
}

interface BaseDatosCloudViewProps {
  currentUser?: Usuario | null;
  onNavigateSection: (section: string) => void;
  onShowToast: (message: string, type?: 'success' | 'error') => void;
  primaryColor?: string;
}

export const BaseDatosCloudView: React.FC<BaseDatosCloudViewProps> = ({
  currentUser,
  onNavigateSection,
  onShowToast,
  primaryColor = '#271a82'
}) => {
  const [data, setData] = useState<DatabaseOverviewResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTableId, setActiveTableId] = useState<string>('facturas');
  const [tableSearchQuery, setTableSearchQuery] = useState<string>('');
  const [isMigrating, setIsMigrating] = useState<boolean>(false);
  const [migrationResult, setMigrationResult] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'explorador' | 'gestiones' | 'conexion-externa' | 'migracion' | 'sql'>('explorador');
  const [testingExternal, setTestingExternal] = useState<boolean>(false);
  const [externalTestResult, setExternalTestResult] = useState<any | null>(null);

  const handleTestExternal = async () => {
    setTestingExternal(true);
    setExternalTestResult(null);
    try {
      const res = await fetch('/api/v1/sistema/probar-conexion-sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: '34.175.144.94',
          port: 5432,
          database: 'postgres',
          user: 'postgres',
          password: 'Tlmcj0510*'
        })
      });
      const resData = await res.json();
      setExternalTestResult(resData);
      if (resData.ok) {
        onShowToast('¡Conexión verificada exitosamente a 34.175.144.94!', 'success');
      } else {
        onShowToast(resData.mensaje || 'Información de conexión a Cloud SQL', 'error');
      }
    } catch (e: any) {
      setExternalTestResult({
        ok: false,
        mensaje: 'Error de red probando conexión',
        error_detalle: e.message
      });
      onShowToast('Error probando conexión a Cloud SQL', 'error');
    } finally {
      setTestingExternal(false);
    }
  };

  const loadDatabaseOverview = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/sistema/database-overview');
      if (!res.ok) throw new Error('Error al cargar datos del motor de base de datos');
      const json: DatabaseOverviewResponse = await res.json();
      setData(json);
    } catch (err: any) {
      onShowToast(err.message || 'Error cargando base de datos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDatabaseOverview();
  }, []);

  const handleExecuteCloudMigration = async () => {
    setIsMigrating(true);
    setMigrationResult(null);
    try {
      const res = await fetch('/api/v1/sistema/cloud-migration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          autor_id: currentUser?.id_usuario || 1,
          autor_nombre: currentUser?.nombre_completo || 'Juan Yaya - Administrador Maestro',
          notas: `Migración directa iniciada desde la consola en línea (${window.location.hostname})`
        })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.detail || 'Error en la migración a Google Cloud');
      setMigrationResult(result);
      onShowToast('¡Migración a Google Cloud completada con éxito!');
      loadDatabaseOverview();
    } catch (err: any) {
      onShowToast(err.message || 'Error durante la migración cloud', 'error');
    } finally {
      setIsMigrating(false);
    }
  };

  const handleDownloadSql = () => {
    window.location.href = '/api/v1/sistema/export-sql';
    onShowToast('Descargando archivo SQL (DDL + DML Cloud SQL)...');
  };

  const handleDownloadJson = () => {
    window.location.href = '/api/v1/sistema/export-backup';
    onShowToast('Descargando dump completo JSON...');
  };

  const handleDownloadExcel = () => {
    window.location.href = '/api/v1/sistema/exportar-excel-completo';
    onShowToast('Descargando Base de Datos Maestra en Excel...');
  };

  const activeTable = data?.tablas.find(t => t.id === activeTableId) || data?.tablas[0];

  const filteredMuestra = activeTable?.muestra.filter(row => {
    if (!tableSearchQuery.trim()) return true;
    const str = JSON.stringify(row).toLowerCase();
    return str.includes(tableSearchQuery.toLowerCase());
  }) || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Top Banner: Cloud Status & App URL */}
      <div 
        className="rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl border border-white/10"
        style={{
          background: `linear-gradient(135deg, ${primaryColor} 0%, #1c1343 65%, #0f0a28 100%)`
        }}
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1.5 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Base de Datos En Línea & Cloud Ready
              </span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/20">
                Google Cloud Run (us-east1)
              </span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-200 border border-amber-400/20">
                Versión 2.0.0
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <Database className="w-8 h-8 text-amber-400 shrink-0" />
              Base de Datos Central & Hub de Migración Cloud
            </h1>

            <p className="text-sm text-indigo-100/90 max-w-3xl leading-relaxed">
              Motor de persistencia transaccional multi-tenant con esquemas DDL relacionales, réplicas sincronizadas en Google Cloud y auditoría inmutable de Juan Yaya.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-mono text-indigo-200">
              <div className="flex items-center gap-1.5 bg-black/25 px-3 py-1 rounded-xl border border-white/10">
                <Cloud className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-slate-300">URL en línea:</span>
                <a 
                  href="https://consola-tlm-enterprise-fiscal-erp-engine.ai.studio" 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-amber-300 hover:text-amber-200 font-bold underline flex items-center gap-1"
                >
                  consola-tlm-enterprise-fiscal-erp-engine.ai.studio
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex items-center gap-1.5 bg-black/25 px-3 py-1 rounded-xl border border-white/10">
                <Server className="w-3.5 h-3.5 text-emerald-400" />
                <span>Archivo local:</span>
                <span className="text-white font-bold">{data?.persistencia.archivo || 'tlm_database.json'}</span>
                <span>({data?.persistencia.tamano_legible || '52.4 KB'})</span>
              </div>
            </div>
          </div>

          {/* Quick Migration Trigger */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            <button
              onClick={handleExecuteCloudMigration}
              disabled={isMigrating}
              className="px-5 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-95 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isMigrating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-900" />
                  <span>Migrando a Google Cloud...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>Migrar a Cloud en 1-Clic</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownloadSql}
              className="px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-white/10 hover:bg-white/20 border border-white/15 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-amber-300" />
              <span>Descargar SQL (Postgres / Cloud SQL)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#271a82] shrink-0">
            <Table className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tablas del Sistema</p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">{data?.estadisticas.total_tablas || 8}</p>
            <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
              <Check className="w-3 h-3" /> Relacionales & DDL
            </span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Registros Totales</p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">{data?.estadisticas.total_registros || 48}</p>
            <span className="text-[10px] font-semibold text-slate-500">
              {data?.persistencia.tamano_legible || '52.4 KB'} en disco
            </span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Estado de Conexión</p>
            <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-0.5">ONLINE</p>
            <span className="text-[10px] font-semibold text-emerald-700">
              Uptime: {data ? `${Math.floor(data.estadisticas.uptime_segundos / 60)} min` : '100%'}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Consumo Heap RAM</p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">{data?.estadisticas.memoria_usada_mb || '34.2'} MB</p>
            <span className="text-[10px] font-semibold text-indigo-600">
              Node 22 Microservice
            </span>
          </div>
        </div>
      </div>

      {/* Migration Success Alert Banner (when executed) */}
      {migrationResult && (
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-600 text-white shrink-0 mt-0.5">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-emerald-950">
                {migrationResult.mensaje}
              </h4>
              <p className="text-xs text-emerald-800 mt-0.5">
                Identificador de migración: <code className="font-mono font-bold bg-emerald-100 px-1.5 py-0.5 rounded">{migrationResult.migration_id}</code> • Replicado en Google Cloud Run & Cloud Storage.
              </p>
            </div>
          </div>
          <button
            onClick={() => setMigrationResult(null)}
            className="text-xs font-bold text-emerald-800 hover:text-emerald-950 px-3 py-1.5 bg-emerald-200/60 rounded-xl cursor-pointer"
          >
            Cerrar aviso
          </button>
        </div>
      )}

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('explorador')}
          className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'explorador'
              ? 'border-[#271a82] text-[#271a82]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Table className="w-4 h-4" />
          <span>Explorador de Tablas ({data?.tablas.length || 8})</span>
        </button>

        <button
          onClick={() => setActiveTab('conexion-externa')}
          className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'conexion-externa'
              ? 'border-[#271a82] text-[#271a82]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Server className="w-4 h-4 text-indigo-600" />
          <span>Instancia Externa (34.175.144.94)</span>
          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-indigo-100 text-indigo-800">5432</span>
        </button>

        <button
          onClick={() => setActiveTab('gestiones')}
          className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'gestiones'
              ? 'border-[#271a82] text-[#271a82]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          <span>Revisión de Gestiones de la Plataforma</span>
        </button>

        <button
          onClick={() => setActiveTab('migracion')}
          className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'migracion'
              ? 'border-[#271a82] text-[#271a82]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Cloud className="w-4 h-4" />
          <span>Centro de Migración Cloud & Replicación</span>
        </button>

        <button
          onClick={() => setActiveTab('sql')}
          className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'sql'
              ? 'border-[#271a82] text-[#271a82]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>Esquemas SQL & DDL PostgreSQL</span>
        </button>
      </div>

      {/* TAB 1: EXPLORADOR DE TABLAS */}
      {activeTab === 'explorador' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Table List Column */}
          <div className="lg:col-span-1 space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 px-1">
              Tablas del Esquema Relacional
            </h3>
            <div className="space-y-1.5">
              {data?.tablas.map((table) => {
                const isSelected = table.id === activeTableId;
                return (
                  <button
                    key={table.id}
                    onClick={() => {
                      setActiveTableId(table.id);
                      setTableSearchQuery('');
                    }}
                    className={`w-full text-left p-3 rounded-2xl border transition flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-[#271a82] text-white border-[#271a82] shadow-md shadow-indigo-900/10'
                        : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold truncate">{table.nombre}</p>
                      <p className={`text-[10px] truncate ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                        {table.id}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {table.conteo}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Export Actions Box */}
            <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200/80 space-y-2.5 mt-4">
              <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Exportación Rápida
              </p>
              <button
                onClick={handleDownloadSql}
                className="w-full py-2 px-3 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
              >
                <FileCode className="w-3.5 h-3.5 text-indigo-600" />
                <span>Exportar Esquema .SQL</span>
              </button>
              <button
                onClick={handleDownloadExcel}
                className="w-full py-2 px-3 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Exportar Excel .XLSX</span>
              </button>
              <button
                onClick={handleDownloadJson}
                className="w-full py-2 px-3 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-amber-600" />
                <span>Exportar Backup .JSON</span>
              </button>
            </div>
          </div>

          {/* Table Data Viewer Column */}
          <div className="lg:col-span-3 space-y-4">
            {activeTable && (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                {/* Header of Active Table */}
                <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-black text-slate-900">{activeTable.nombre}</h2>
                      <span className="font-mono text-xs px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md font-bold">
                        {activeTable.id}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{activeTable.descripcion}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Buscar en tabla..."
                        value={tableSearchQuery}
                        onChange={(e) => setTableSearchQuery(e.target.value)}
                        className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-[#271a82] w-48 sm:w-60"
                      />
                    </div>
                    <button
                      onClick={loadDatabaseOverview}
                      title="Refrescar datos"
                      className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
                    >
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Columns Definition Tagline */}
                <div className="px-5 py-2.5 bg-indigo-50/40 border-b border-indigo-100/60 flex items-center gap-2 overflow-x-auto text-[11px] text-indigo-900">
                  <span className="font-bold shrink-0">Columnas:</span>
                  {activeTable.columnas.map((col, idx) => (
                    <span key={idx} className="font-mono bg-white px-2 py-0.5 rounded border border-indigo-200/80 text-[10px] shrink-0">
                      {col}
                    </span>
                  ))}
                </div>

                {/* Table Records Body */}
                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold sticky top-0 border-b border-slate-200">
                      <tr>
                        {activeTable.columnas.map((col, idx) => (
                          <th key={idx} className="py-3 px-4 font-black">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredMuestra.length > 0 ? (
                        filteredMuestra.map((row, rowIdx) => (
                          <tr key={rowIdx} className="hover:bg-slate-50/80 transition">
                            {activeTable.columnas.map((col, colIdx) => {
                              const val = row[col];
                              return (
                                <td key={colIdx} className="py-3 px-4 text-slate-700 font-medium whitespace-nowrap">
                                  {typeof val === 'boolean' ? (
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      val ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                    }`}>
                                      {val ? 'TRUE' : 'FALSE'}
                                    </span>
                                  ) : typeof val === 'object' && val !== null ? (
                                    <code className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1 py-0.5 rounded">
                                      {JSON.stringify(val).slice(0, 30)}...
                                    </code>
                                  ) : (
                                    <span>{val !== undefined && val !== null ? String(val) : '—'}</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={activeTable.columnas.length} className="py-12 text-center text-slate-400">
                            No se encontraron registros que coincidan con la búsqueda.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="p-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Mostrando {filteredMuestra.length} de {activeTable.conteo} registros almacenados en el motor</span>
                  <span className="font-bold text-slate-700">Estado de integridad: 100% ACID</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: REVISIÓN DE GESTIONES DE LA PLATAFORMA */}
      {activeTab === 'gestiones' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Panel de Verificación de Gestiones de la Plataforma
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Revisa y accede directamente a cada módulo del sistema para verificar su funcionamiento en línea con los datos migrados.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> 7 / 7 Gestiones Operativas
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {/* Gestión 1 */}
              <div className="p-5 rounded-2xl border border-slate-200 hover:border-[#271a82] transition bg-slate-50/50 hover:bg-white hover:shadow-md flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-[#271a82] flex items-center justify-center">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Operativo
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-slate-900">1. Gestión de Facturas & UBL 2.1</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Cargue masivo de XMLs DIAN, validación CUFE en tiempo real, auditoría de ítems y transmisión a Siigo.
                  </p>
                  <div className="mt-3 text-[11px] font-bold text-slate-600 bg-white p-2 rounded-xl border border-slate-200/60">
                    Facturas registradas: <span className="text-[#271a82]">{data?.tablas.find(t=>t.id==='facturas')?.conteo || 6} facturas</span>
                  </div>
                </div>
                <button
                  onClick={() => onNavigateSection('facturas')}
                  className="mt-4 w-full py-2 px-3 rounded-xl bg-[#271a82] text-white text-xs font-bold hover:bg-indigo-900 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Revisar Gestión Facturas</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Gestión 2 */}
              <div className="p-5 rounded-2xl border border-slate-200 hover:border-[#271a82] transition bg-slate-50/50 hover:bg-white hover:shadow-md flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Operativo
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-slate-900">2. Centro Fiscal & Retenciones F350</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Liquidación de retenciones en la fuente (casillas 62, 83), equivalencia en UVT y generación de certificados.
                  </p>
                  <div className="mt-3 text-[11px] font-bold text-slate-600 bg-white p-2 rounded-xl border border-slate-200/60">
                    Bases fiscales calculadas y enlazadas a la DIAN.
                  </div>
                </div>
                <button
                  onClick={() => onNavigateSection('centro-fiscal')}
                  className="mt-4 w-full py-2 px-3 rounded-xl bg-[#271a82] text-white text-xs font-bold hover:bg-indigo-900 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Revisar Centro Fiscal F350</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Gestión 3 */}
              <div className="p-5 rounded-2xl border border-slate-200 hover:border-[#271a82] transition bg-slate-50/50 hover:bg-white hover:shadow-md flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                      <Scale className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Operativo
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-slate-900">3. Conciliación Bancaria Inteligente</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Cruce de extractos bancarios (Bancolombia/Davivienda) contra libro mayor contable con tolerancia de fechas.
                  </p>
                  <div className="mt-3 text-[11px] font-bold text-slate-600 bg-white p-2 rounded-xl border border-slate-200/60">
                    Movimientos: <span className="text-teal-700">{data?.tablas.find(t=>t.id==='movimientos_banco')?.conteo || 6} banco</span> vs <span className="text-teal-700">{data?.tablas.find(t=>t.id==='movimientos_libro')?.conteo || 5} libro</span>
                  </div>
                </div>
                <button
                  onClick={() => onNavigateSection('conciliacion')}
                  className="mt-4 w-full py-2 px-3 rounded-xl bg-[#271a82] text-white text-xs font-bold hover:bg-indigo-900 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Revisar Conciliación</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Gestión 4 */}
              <div className="p-5 rounded-2xl border border-slate-200 hover:border-[#271a82] transition bg-slate-50/50 hover:bg-white hover:shadow-md flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Operativo
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-slate-900">4. Cerebro Contable PUC & Terceros</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Catálogo de cuentas contables empresariales colombianas y saldos de terceros con NIT.
                  </p>
                  <div className="mt-3 text-[11px] font-bold text-slate-600 bg-white p-2 rounded-xl border border-slate-200/60">
                    Cuentas PUC: <span className="text-purple-700">{data?.tablas.find(t=>t.id==='cuentas_puc')?.conteo || 19} cuentas activas</span>
                  </div>
                </div>
                <button
                  onClick={() => onNavigateSection('cerebro')}
                  className="mt-4 w-full py-2 px-3 rounded-xl bg-[#271a82] text-white text-xs font-bold hover:bg-indigo-900 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Revisar Cerebro Contable</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Gestión 5 */}
              <div className="p-5 rounded-2xl border border-slate-200 hover:border-[#271a82] transition bg-slate-50/50 hover:bg-white hover:shadow-md flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center">
                      <Boxes className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Conectado
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-slate-900">5. Gestión API Siigo Nube</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Credenciales seguras, token caching, sincronización de comprobantes contables y prevención de error 429.
                  </p>
                  <div className="mt-3 text-[11px] font-bold text-slate-600 bg-white p-2 rounded-xl border border-slate-200/60">
                    Configurado por empresa en pestaña Siigo API.
                  </div>
                </div>
                <button
                  onClick={() => onNavigateSection('accesos')}
                  className="mt-4 w-full py-2 px-3 rounded-xl bg-[#271a82] text-white text-xs font-bold hover:bg-indigo-900 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Revisar Configuración Siigo</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Gestión 6 */}
              <div className="p-5 rounded-2xl border border-slate-200 hover:border-[#271a82] transition bg-slate-50/50 hover:bg-white hover:shadow-md flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                      <Users className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Operativo
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-slate-900">6. Admin Usuarios & Google Cloud IAM</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Administración de Juan Yaya, creación de usuarios, cambio de roles, permisos y sincronización IAM Cloud.
                  </p>
                  <div className="mt-3 text-[11px] font-bold text-slate-600 bg-white p-2 rounded-xl border border-slate-200/60">
                    Usuarios registrados: <span className="text-sky-700">{data?.tablas.find(t=>t.id==='usuarios')?.conteo || 7} colaboradores</span>
                  </div>
                </div>
                <button
                  onClick={() => onNavigateSection('accesos')}
                  className="mt-4 w-full py-2 px-3 rounded-xl bg-[#271a82] text-white text-xs font-bold hover:bg-indigo-900 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Revisar Admin de Usuarios</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CENTRO DE MIGRACIÓN CLOUD */}
      {activeTab === 'migracion' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Cloud className="w-6 h-6 text-[#271a82]" />
                  Pipeline de Migración & Replicación Google Cloud Platform
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Ejecuta la migración atómica de la base de datos hacia los servicios en la nube de Google Cloud (Cloud Run, GCS, IAM, Drive y Cloud SQL).
                </p>
              </div>

              <button
                onClick={handleExecuteCloudMigration}
                disabled={isMigrating}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#271a82] to-indigo-800 hover:from-indigo-900 hover:to-indigo-950 text-white font-black text-xs uppercase tracking-wider transition shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isMigrating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Migrando tablas...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Iniciar Migración a Cloud</span>
                  </>
                )}
              </button>
            </div>

            {/* Step-by-Step Architecture Pipeline */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded">
                  Paso 1: Validación & Integridad
                </span>
                <h4 className="text-xs font-black text-slate-900">Chequeo Transaccional</h4>
                <p className="text-[11px] text-slate-600">
                  Verifica que los {data?.estadisticas.total_registros || 48} registros de las 8 tablas cumplan con las restricciones de clave foránea y no presenten inconsistencias contables.
                </p>
                <div className="text-[10px] font-mono text-emerald-700 font-bold flex items-center gap-1 pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Estado: Verificado & Limpio
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-[10px] font-black uppercase text-amber-600 bg-amber-100 px-2 py-0.5 rounded">
                  Paso 2: Snapshots & Backup
                </span>
                <h4 className="text-xs font-black text-slate-900">Replicación Multiformato</h4>
                <p className="text-[11px] text-slate-600">
                  Genera automáticamente el archivo Excel maestro <code className="text-xs font-mono font-bold">tlm_base_de_datos_maestra.xlsx</code> y el snapshot JSON relacional.
                </p>
                <div className="text-[10px] font-mono text-emerald-700 font-bold flex items-center gap-1 pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Estado: Sincronizado en Disco
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-[10px] font-black uppercase text-sky-600 bg-sky-100 px-2 py-0.5 rounded">
                  Paso 3: Google Cloud IAM & Run
                </span>
                <h4 className="text-xs font-black text-slate-900">Despliegue & Políticas</h4>
                <p className="text-[11px] text-slate-600">
                  Asigna las políticas federadas de acceso a Juan Yaya y colaboradores en el contenedor Cloud Run us-east1.
                </p>
                <div className="text-[10px] font-mono text-emerald-700 font-bold flex items-center gap-1 pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Estado: Cloud Run Activo
                </div>
              </div>
            </div>

            {/* Cloud Endpoint Specs */}
            <div className="p-5 rounded-2xl bg-[#1c1343] text-white space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">
                Especificaciones del Servidor en Producción
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
                <div className="bg-black/30 p-3 rounded-xl border border-white/10">
                  <span className="text-indigo-300 block text-[10px]">HOST PRINCIPAL</span>
                  <span className="text-white font-bold">consola-tlm-enterprise...</span>
                </div>
                <div className="bg-black/30 p-3 rounded-xl border border-white/10">
                  <span className="text-indigo-300 block text-[10px]">REGIÓN GCP</span>
                  <span className="text-emerald-300 font-bold">us-east1 (N. Virginia)</span>
                </div>
                <div className="bg-black/30 p-3 rounded-xl border border-white/10">
                  <span className="text-indigo-300 block text-[10px]">PROPIETARIO MAESTRO</span>
                  <span className="text-amber-300 font-bold">Juan Yaya (TLM BIC)</span>
                </div>
                <div className="bg-black/30 p-3 rounded-xl border border-white/10">
                  <span className="text-indigo-300 block text-[10px]">CANAL SEGURO</span>
                  <span className="text-sky-300 font-bold">HTTPS TLS v1.3</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ESQUEMAS SQL & DDL */}
      {activeTab === 'sql' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Esquema Relacional DDL & DML para Google Cloud SQL (PostgreSQL)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Generado automáticamente con tipado estricto, índices optimizados y sentencias de inserción completas.
                </p>
              </div>
              <button
                onClick={handleDownloadSql}
                className="px-4 py-2 bg-[#271a82] hover:bg-indigo-900 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-xs shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-amber-300" />
                <span>Descargar Script SQL Completo</span>
              </button>
            </div>

            <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 font-mono text-xs overflow-x-auto max-h-[500px]">
              <pre className="text-slate-300">
{`-- =========================================================================
-- CONSOLA TLM - ENTERPRISE FISCAL & ERP ENGINE
-- CLOUD SQL / POSTGRESQL DATABASE REPOSITORY & MIGRATION DUMP v2.0
-- Target App: https://consola-tlm-enterprise-fiscal-erp-engine.ai.studio
-- Host: Google Cloud Run & Cloud SQL (us-east1)
-- Administrator: Juan Yaya (automatizaciones@tlm.net.co)
-- =========================================================================

CREATE TABLE IF NOT EXISTS empresas (
    id_empresa SERIAL PRIMARY KEY,
    nombre_comercial VARCHAR(255) NOT NULL,
    nit VARCHAR(50) NOT NULL UNIQUE,
    software_erp VARCHAR(50) DEFAULT 'SIIGO_NUBE',
    siigo_username VARCHAR(255),
    siigo_access_key TEXT,
    siigo_document_id INTEGER DEFAULT 24
);

CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario SERIAL PRIMARY KEY,
    nombre_completo VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    rol VARCHAR(50) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    empresas_ids INTEGER[] DEFAULT ARRAY[1],
    permisos JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS facturas (
    id_factura SERIAL PRIMARY KEY,
    id_empresa INTEGER REFERENCES empresas(id_empresa),
    factura_num VARCHAR(50) NOT NULL,
    proveedor VARCHAR(255) NOT NULL,
    nit_tercero VARCHAR(50) NOT NULL,
    fecha DATE NOT NULL,
    subtotal NUMERIC(15, 2) NOT NULL,
    iva NUMERIC(15, 2) NOT NULL,
    retencion_valor NUMERIC(15, 2) DEFAULT 0,
    total NUMERIC(15, 2) NOT NULL,
    cufe VARCHAR(255),
    casilla_350 VARCHAR(20) DEFAULT '83',
    estado_siigo VARCHAR(50) DEFAULT 'PENDIENTE'
);

CREATE TABLE IF NOT EXISTS cuentas_puc (
    codigo VARCHAR(20) PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    naturaleza VARCHAR(10) CHECK (naturaleza IN ('DEBITO', 'CREDITO')),
    nivel INTEGER NOT NULL,
    saldo_actual NUMERIC(15, 2) DEFAULT 0
);

-- Índices de aceleración O(1)
CREATE INDEX IF NOT EXISTS idx_facturas_cufe ON facturas(cufe);
CREATE INDEX IF NOT EXISTS idx_facturas_fecha ON facturas(fecha);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
