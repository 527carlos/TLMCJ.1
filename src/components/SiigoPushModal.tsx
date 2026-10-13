import React, { useState } from 'react';
import { Factura } from '../types/index.ts';
import { X, Send, CheckCircle2, AlertCircle, Loader2, Database } from 'lucide-react';

interface SiigoPushModalProps {
  facturas: Factura[];
  onClose: () => void;
  onSuccess: () => void;
}

export const SiigoPushModal: React.FC<SiigoPushModalProps> = ({ facturas, onClose, onSuccess }) => {
  const [docId, setDocId] = useState<number>(24);
  const [medioPago, setMedioPago] = useState<number>(47);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [results, setResults] = useState<any[] | null>(null);

  const handleTransmit = async () => {
    setIsSending(true);
    try {
      const res = await fetch('/api/v1/siigo/enviar-facturas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facturas_ids: facturas.map(f => f.id_factura),
          id_tipo_doc: docId,
          id_medio_pago: medioPago
        })
      });

      const data = await res.json();
      setResults(data.resultados || []);
      onSuccess();
    } catch (err) {
      console.error("Error transmitiendo a Siigo:", err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 bg-[#271a82] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-[#e64519] p-2 rounded-xl text-white shadow-xs">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Transmitir Comprobantes a Siigo Nube API</h3>
              <p className="text-xs text-indigo-200">{facturas.length} Factura(s) seleccionada(s)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {!results ? (
            <>
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-800">
                <span className="font-bold block mb-1">Inyección Automática en Comprobante de Compras (FC)</span>
                El conector mapeará automáticamente la cuenta de gasto (51), registrará el NIT del tercero si no existe, e inyectará las retenciones en el arreglo correspondiente de la API de Siigo.
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    ID Comprobante Siigo (Document ID)
                  </label>
                  <select
                    value={docId}
                    onChange={(e) => setDocId(parseInt(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#271A82]"
                  >
                    <option value={24}>ID 24 - Factura de Compra General</option>
                    <option value={583}>ID 583 - Comprobante de Compra Electrónica (FC-1)</option>
                    <option value={101}>ID 101 - Documento Soporte en Adquisiciones</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Medio de Pago Predeterminado para Siigo
                  </label>
                  <select
                    value={medioPago}
                    onChange={(e) => setMedioPago(parseInt(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#271A82]"
                  >
                    <option value={47}>47 - Transferencia Bancaria</option>
                    <option value={10}>10 - Efectivo / Caja Menor</option>
                    <option value={48}>48 - Tarjeta de Crédito Corporativa</option>
                    <option value={30}>30 - Crédito Proveedor</option>
                  </select>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 max-h-40 overflow-y-auto">
                <span className="text-[11px] font-bold text-slate-600 block mb-2">Comprobantes a Sincronizar:</span>
                <ul className="space-y-1">
                  {facturas.map(f => (
                    <li key={f.id_factura} className="text-xs text-slate-700 flex justify-between">
                      <span className="font-semibold">{f.factura_num} - {f.proveedor}</span>
                      <span className="font-mono text-slate-500">${(f.subtotal).toLocaleString('es-CO')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs font-bold">
                <CheckCircle2 className="w-5 h-5" /> Transmisión Procesada
              </div>

              <div className="space-y-2">
                {results.map((r, i) => (
                  <div key={i} className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs flex justify-between items-center">
                    <div>
                      <span className="font-bold text-slate-800 block">{r.factura_num}</span>
                      <span className="text-slate-500 text-[11px]">{r.mensaje}</span>
                    </div>
                    {r.siigo_id && (
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-bold text-[10px]">
                        {r.siigo_id}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
          {!results ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleTransmit}
                disabled={isSending}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#e64519] hover:bg-[#c43610] transition flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Transmitiendo...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Transmitir a Siigo ({facturas.length})
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#271A82] hover:bg-indigo-900 transition cursor-pointer"
            >
              Finalizar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
