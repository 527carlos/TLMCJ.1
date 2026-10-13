import React, { useState } from 'react';
import { X, Upload, Palette, Check, RefreshCw, Sparkles, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { TlmLogo } from './TlmLogo.tsx';

interface BrandCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customLogoUrl: string | null;
  onSaveCustomLogo: (url: string | null) => void;
}

export const BrandCustomizerModal: React.FC<BrandCustomizerModalProps> = ({
  isOpen,
  onClose,
  customLogoUrl,
  onSaveCustomLogo,
}) => {
  const [activeTab, setActiveTab] = useState<'official' | 'upload'>('official');
  const [previewUrl, setPreviewUrl] = useState<string | null>(customLogoUrl);
  const [logoInputUrl, setLogoInputUrl] = useState<string>('');

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyOfficial = () => {
    onSaveCustomLogo(null);
    setPreviewUrl(null);
    onClose();
  };

  const handleApplyCustom = () => {
    onSaveCustomLogo(previewUrl);
    onClose();
  };

  const corporateColors = [
    { name: 'Azul Índigo TLM (Primario)', hex: '#271a82', role: 'Color corporativo principal, cabeceras y contrastes institucionales', bgClass: 'bg-[#271a82]' },
    { name: 'Bermellón Coral TLM (Acento)', hex: '#e64519', role: 'Botones primarios de acción, alertas y foco visual dinámico', bgClass: 'bg-[#e64519]' },
    { name: 'Ámbar Cálido TLM (Alerta)', hex: '#fa9d1c', role: 'Indicadores de auditoría, advertencias y retenciones pendientes', bgClass: 'bg-[#fa9d1c]' },
    { name: 'Lavanda Suave TLM (Secundario)', hex: '#777eec', role: 'Etiquetas de cuentas PUC, bordes y acentos balanceados', bgClass: 'bg-[#777eec]' },
    { name: 'Azul Zafiro TLM (Eléctrico)', hex: '#4059aa', role: 'Resaltados de interacción, botones secundarios y enlaces', bgClass: 'bg-[#4059aa]' },
    { name: 'Gris Superficie TLM', hex: '#f8f9fa', role: 'Fondo limpio de aplicación según diseño de tlmcol.com', bgClass: 'bg-[#f8f9fa] border border-slate-300' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#271a82] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Palette className="w-5 h-5 text-[#fa9d1c]" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Identidad Corporativa & Logos TLM</h3>
              <p className="text-xs text-indigo-200">
                Basado en el portal corporativo{' '}
                <a
                  href="https://www.tlmcol.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-white inline-flex items-center gap-0.5"
                >
                  tlmcol.com <ExternalLink className="w-2.5 h-2.5 inline" />
                </a>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/20 text-indigo-200 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('official')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'official'
                ? 'bg-white text-[#271a82] border-t-2 border-[#271a82] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-[#fa9d1c]" />
            Identidad Oficial TLM (tlmcol.com)
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'upload'
                ? 'bg-white text-[#271a82] border-t-2 border-[#e64519] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-4 h-4 text-[#e64519]" />
            Cargar Logotipo Personalizado
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {activeTab === 'official' ? (
            <div className="space-y-6">
              {/* Preview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase block mb-3">
                    Variante Fondo Claro (Documentos y Encabezados)
                  </span>
                  <div className="py-4 flex justify-center items-center bg-[#f8f9fa] rounded-lg border border-slate-100">
                    <TlmLogo variant="full" theme="light" size="lg" subtitle="Get Adviced" />
                  </div>
                </div>

                <div className="p-5 rounded-xl border border-slate-800 bg-[#1c1343] shadow-xs">
                  <span className="text-[11px] font-bold text-indigo-300/80 uppercase block mb-3">
                    Variante Fondo Oscuro (Sidebar y Consola)
                  </span>
                  <div className="py-4 flex justify-center items-center bg-[#271a82] rounded-lg border border-indigo-900">
                    <TlmLogo variant="full" theme="dark" size="lg" subtitle="Get Adviced" />
                  </div>
                </div>
              </div>

              {/* Color Palette from tlmcol.com */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-[#271a82]" />
                  Paleta de Colores Extraída de tlmcol.com
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {corporateColors.map((col) => (
                    <div key={col.hex} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-lg ${col.bgClass} shadow-xs shrink-0`}></div>
                        <div>
                          <span className="font-mono text-xs font-bold text-slate-800">{col.hex}</span>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-700 leading-tight">{col.name}</span>
                      <span className="text-[10px] text-slate-500 leading-tight">{col.role}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-900">
                <p className="font-semibold mb-1">Sociedad BIC y Metodología Ágil TLM:</p>
                <p className="text-indigo-700 text-[11px] leading-relaxed">
                  Esta plataforma integra la identidad institucional de TLM Get Adviced SAS BIC, combinando contabilidad en tiempo real, tableros de Business Intelligence y liquidaciones tributarias precisas para Colombia.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center flex flex-col items-center justify-center gap-3">
                <div className="p-3 rounded-full bg-indigo-100 text-[#271a82]">
                  <ImageIcon className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800">Sube el archivo de tu Logotipo Corporativo</h4>
                  <p className="text-xs text-slate-500">Formatos recomendados: SVG, PNG transparente o JPG (máx. 5MB)</p>
                </div>

                <label className="px-4 py-2 bg-[#271a82] hover:bg-[#1c1343] text-white text-xs font-bold rounded-xl cursor-pointer shadow-sm transition inline-flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Seleccionar archivo del equipo
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/svg+xml, image/webp"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  O pegar URL directa de la imagen del logotipo:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={logoInputUrl}
                    onChange={(e) => {
                      setLogoInputUrl(e.target.value);
                      setPreviewUrl(e.target.value);
                    }}
                    placeholder="https://ejemplo.com/mi-logo-empresa.png"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-[#271a82]"
                  />
                  <button
                    onClick={() => setPreviewUrl(logoInputUrl)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                  >
                    Cargar
                  </button>
                </div>
              </div>

              {previewUrl && (
                <div className="p-4 rounded-xl border border-slate-200 bg-white">
                  <span className="text-xs font-bold text-slate-500 uppercase block mb-2">Vista previa:</span>
                  <div className="flex items-center justify-center p-4 bg-slate-100 rounded-lg">
                    <img src={previewUrl} alt="Vista previa de logo" className="max-h-20 object-contain" />
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => setPreviewUrl(null)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Remover imagen
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={handleApplyOfficial}
            className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-xl transition cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Restaurar Logotipo Oficial TLM
          </button>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={activeTab === 'official' ? handleApplyOfficial : handleApplyCustom}
              className="px-5 py-2 text-xs font-bold text-white bg-[#e64519] hover:bg-[#c43610] rounded-xl shadow-sm transition cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Aplicar a la Consola
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
