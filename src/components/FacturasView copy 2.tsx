import React, { useState } from 'react';
import { Factura, CuentaPUC } from '../types/index.ts';
import { 
  UploadCloud, 
  Search, 
  Filter, 
  FileCheck2, 
  Trash2, 
  Send, 
  FileSpreadsheet, 
  Eye, 
  Sparkles, 
  CheckSquare, 
  Square,
  ShieldCheck,
  Building,
  FolderDown
} from 'lucide-react';

interface FacturasViewProps {
  facturas: Factura[];
  cuentasPUC: CuentaPUC[];
  onUploadXml: (files: FileList) => void;
  onSeedDemo: () => void;
  onImportFromDrive?: () => void;
  onUpdateFactura: (id: number, field: string, value: any) => void;
  onDeleteFactura: (id: number) => void;
  onBulkDelete: (ids: number[]) => void;
  onInspectCufe: (factura: Factura) => void;
  onOpenSiigoPush: (facturas: Factura[]) => void;
  isUploading?: boolean;
}

export const FacturasView: React.FC<FacturasViewProps> = ({
  facturas,
  cuentasPUC,
  onUploadXml,
  onSeedDemo,
  onImportFromDrive,
  onUpdateFactura,
  onDeleteFactura,
  onBulkDelete,
  onInspectCufe,
  onOpenSiigoPush,
  isUploading = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [casillaFilter, setCasillaFilter] = useState('TODOS');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const formatCOP = (num: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(num || 0);
  };

  const filteredFacturas = facturas.filter(f => {
    const matchesSearch = 
      f.factura_num.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.proveedor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.nit_tercero.includes(searchTerm) ||
      f.cuenta_gasto.includes(searchTerm);

    const matchesStatus = statusFilter === 'TODOS' || f.estado_revision === statusFilter;
    const matchesCasilla = casillaFilter === 'TODOS' || f.casilla_350.toString() === casillaFilter;

    return matchesSearch && matchesStatus && matchesCasilla;
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredFacturas.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredFacturas.map(f => f.id_factura));
    }
  };

  const toggleSelectOne = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(item => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkApprove = () => {
    selectedIds.forEach(id => {
      onUpdateFactura(id, 'estado', 'AUDITADA');
    });
    setSelectedIds([]);
  };

  const handleBulkDeleteSelected = () => {
    if (confirm(`Eliminar ${selectedIds.length} facturas seleccionadas?`)) {
      onBulkDelete(selectedIds);
      setSelectedIds([]);
    }
  };

  const selectedFacturasList = facturas.filter(f => selectedIds.includes(f.id_factura));

  return (
    <div className="space-y-6">
      {/* Upload & Actions Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-800 text-lg">Ingesta Masiva UBL 2.1 & Auditoría</h3>
          <p className="text-xs text-slate-500">Arrastre facturas electrónicas XML de la DIAN o pruebe con el generador de muestras</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#271a82] hover:bg-[#1c1343] text-white font-bold text-xs shadow-md transition active:scale-95 cursor-pointer">
            <UploadCloud className="w-4 h-4 text-[#fa9d1c]" />
            <span>Cargar XMLs DIAN</span>
            <input
              type="file"
              multiple
              accept=".xml"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  onUploadXml(e.target.files);
                }
              }}
            />
          </label>

          <button
            onClick={onSeedDemo}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#e64519] border border-orange-200 font-bold text-xs transition active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[#fa9d1c]" />
            Inyectar Facturas Demo
          </button>

          <button
            onClick={onImportFromDrive}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0066da] border border-blue-200 font-bold text-xs transition active:scale-95 cursor-pointer shadow-2xs"
            title="Importar facturas directamente desde la carpeta Google Drive de Juan Yaya"
          >
            <FolderDown className="w-4 h-4 text-[#0066da]" />
            <span>Importar de Google Drive</span>
          </button>

          <a
            href="/api/v1/sistema/exportar-excel/facturas"
            download="tlm_facturas_dian.xlsx"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs transition active:scale-95 cursor-pointer shadow-2xs"
            title="Exportar todas las facturas en formato Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Exportar a Excel (.xlsx)</span>
          </a>
        </div>
      </div>

      {/* Filter and Batch Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por número, proveedor, NIT o cuenta PUC..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#f8f9fa] border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#271a82]"
            />
          </div>

          {/* Dropdown Filters */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">Estado:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#f8f9fa] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none"
              >
                <option value="TODOS">Todos</option>
                <option value="PENDIENTE">Pendientes</option>
                <option value="AUDITADA">Auditadas</option>
                <option value="SINCRONIZADA_SIIGO">Sincronizadas Siigo</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">Casilla F350:</span>
              <select
                value={casillaFilter}
                onChange={(e) => setCasillaFilter(e.target.value)}
                className="bg-[#f8f9fa] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none"
              >
                <option value="TODOS">Todas</option>
                <option value="61">C.61 - Honorarios (10%)</option>
                <option value="62">C.62 - Servicios (4%)</option>
                <option value="63">C.63 - Arrendamientos (3.5%)</option>
                <option value="64">C.64 - Compras (2.5%)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Batch actions bar if items are selected */}
        {selectedIds.length > 0 && (
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between bg-indigo-50/70 p-3 rounded-xl border border-indigo-100 animate-in fade-in">
            <div className="flex items-center gap-2 text-xs font-bold text-[#271a82]">
              <CheckSquare className="w-4 h-4 text-[#e64519]" />
              <span>{selectedIds.length} facturas seleccionadas</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkApprove}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#271a82] text-white text-xs font-bold hover:bg-[#1c1343] transition active:scale-95 cursor-pointer shadow-xs"
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                Marcar Auditadas
              </button>

              <button
                onClick={() => onOpenSiigoPush(selectedFacturasList)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#e64519] text-white text-xs font-bold hover:bg-[#c43610] transition active:scale-95 cursor-pointer shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                Transmitir a Siigo ({selectedIds.length})
              </button>

              <button
                onClick={handleBulkDeleteSelected}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-xs font-semibold hover:bg-red-200 transition active:scale-95 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 w-10 text-center">
                  <button onClick={toggleSelectAll} className="cursor-pointer">
                    {selectedIds.length === filteredFacturas.length && filteredFacturas.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-[#271A82]" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-3">Comprobante</th>
                <th className="py-3 px-3">Fecha</th>
                <th className="py-3 px-3">Proveedor / NIT</th>
                <th className="py-3 px-3">Subtotal & IVA</th>
                <th className="py-3 px-3">Retención F350</th>
                <th className="py-3 px-3">Cuenta PUC</th>
                <th className="py-3 px-3">Estado</th>
                <th className="py-3 px-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFacturas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No se encontraron facturas con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredFacturas.map(f => {
                  const isSelected = selectedIds.includes(f.id_factura);
                  return (
                    <tr key={f.id_factura} className={`hover:bg-slate-50/70 transition ${isSelected ? 'bg-indigo-50/30' : ''}`}>
                      <td className="py-3 px-3 text-center">
                        <button onClick={() => toggleSelectOne(f.id_factura)} className="cursor-pointer">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#271A82]" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-800">{f.factura_num}</div>
                        <button
                          onClick={() => onInspectCufe(f)}
                          className="flex items-center gap-1 text-[10px] text-[#271a82] hover:text-[#e64519] font-mono cursor-pointer mt-0.5"
                          title="Inspeccionar CUFE UBL 2.1"
                        >
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          {f.cufe_hash.substring(0, 10)}...
                        </button>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600">{f.fecha}</td>
                      <td className="py-3 px-3 max-w-[220px]">
                        <div className="font-semibold text-slate-800 truncate" title={f.proveedor}>{f.proveedor}</div>
                        <div className="text-[10px] text-slate-400">NIT: {f.nit_tercero}</div>
                        <div className="text-[10px] text-slate-500 truncate" title={f.descripcion_item}>{f.descripcion_item}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-800">{formatCOP(f.subtotal)}</div>
                        <div className="text-[10px] text-slate-400">IVA: {formatCOP(f.iva)}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <select
                            value={f.casilla_350}
                            onChange={(e) => {
                              const cNum = parseInt(e.target.value);
                              let retTarifa = 2.5;
                              if (cNum === 61) retTarifa = 10.0;
                              if (cNum === 62) retTarifa = 4.0;
                              if (cNum === 63) retTarifa = 3.5;
                              onUpdateFactura(f.id_factura, 'retencion', { retencion_porc: retTarifa, casilla_350: cNum });
                            }}
                            className="bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-[10px] font-bold text-slate-700"
                          >
                            <option value={61}>C.61 (10% Honorarios)</option>
                            <option value={62}>C.62 (4% Servicios)</option>
                            <option value={63}>C.63 (3.5% Arriendos)</option>
                            <option value={64}>C.64 (2.5% Compras)</option>
                          </select>
                        </div>
                        <div className="text-[11px] font-bold text-amber-700 mt-0.5">
                          -{formatCOP(f.retencion_valor)}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <select
                          value={f.cuenta_gasto}
                          onChange={(e) => onUpdateFactura(f.id_factura, 'cuenta', e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[11px] font-mono text-[#271A82] font-semibold max-w-[150px] truncate"
                        >
                          {cuentasPUC.filter(c => c.cuenta.startsWith('5')).map(c => (
                            <option key={c.id_puc} value={c.cuenta}>
                              {c.cuenta} - {c.nombre}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          f.estado_revision === 'AUDITADA'
                            ? 'bg-blue-100 text-blue-700'
                            : f.estado_revision === 'SINCRONIZADA_SIIGO'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {f.estado_revision}
                        </span>
                        {f.siigo_id && (
                          <div className="text-[9px] font-mono text-emerald-600 font-bold mt-0.5">
                            {f.siigo_id}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onInspectCufe(f)}
                            title="Ver CUFE y XML UBL"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {f.estado_revision === 'PENDIENTE' && (
                            <button
                              onClick={() => onUpdateFactura(f.id_factura, 'estado', 'AUDITADA')}
                              title="Aprobar Auditoría"
                              className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 cursor-pointer"
                            >
                              <FileCheck2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => onDeleteFactura(f.id_factura)}
                            title="Eliminar Factura"
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
