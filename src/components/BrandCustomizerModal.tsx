import React, { useState, useEffect } from 'react';
import { 
  X, 
  Upload, 
  Palette, 
  Check, 
  RefreshCw, 
  Sparkles, 
  Image as ImageIcon, 
  ExternalLink,
  ShieldCheck,
  Lock,
  UserCheck,
  CheckCircle2,
  Copy,
  Layers,
  Crown,
  Pipette,
  CheckCircle,
  Sliders
} from 'lucide-react';
import { TlmLogo } from './TlmLogo.tsx';
import type { Usuario } from '../types/index.ts';

export interface BrandCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customLogoUrl: string | null;
  onSaveCustomLogo: (url: string | null, variantTitle?: string, primaryColorHex?: string) => void;
  primaryColor?: string;
  currentUser?: Usuario | null;
  onSwitchToJuan?: () => void;
}

interface LogoOption {
  id: string; // preset id or 'custom'
  value: string | null;
  title: string;
  badge: string;
  description: string;
  recommendedFor: string;
  isExclusiveJuan?: boolean;
}

export const BrandCustomizerModal: React.FC<BrandCustomizerModalProps> = ({
  isOpen,
  onClose,
  customLogoUrl,
  onSaveCustomLogo,
  primaryColor = '#271a82',
  currentUser,
  onSwitchToJuan
}) => {
  const [activeTab, setActiveTab] = useState<'variants' | 'upload' | 'colors'>('variants');
  const [selectedLogoId, setSelectedLogoId] = useState<string>(() => {
    if (!customLogoUrl || customLogoUrl === 'preset:official_full') return 'preset:official_full';
    if (customLogoUrl.startsWith('preset:')) return customLogoUrl;
    return 'custom';
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(customLogoUrl);
  const [customInputUrl, setCustomInputUrl] = useState<string>('');
  const [logoSubtitle, setLogoSubtitle] = useState<string>('Get Adviced');
  const [selectedColorHex, setSelectedColorHex] = useState<string>(primaryColor || '#271a82');
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  // Sync state whenever modal opens or props change
  useEffect(() => {
    if (isOpen) {
      if (!customLogoUrl || customLogoUrl === 'preset:official_full') {
        setSelectedLogoId('preset:official_full');
        setPreviewUrl(null);
      } else if (customLogoUrl.startsWith('preset:')) {
        setSelectedLogoId(customLogoUrl);
        setPreviewUrl(customLogoUrl);
      } else {
        setSelectedLogoId('custom');
        setPreviewUrl(customLogoUrl);
        setCustomInputUrl(customLogoUrl);
      }
      setSelectedColorHex(primaryColor || '#271a82');
    }
  }, [isOpen, customLogoUrl, primaryColor]);

  if (!isOpen) return null;

  // Authorization check for Administrator Juan Yaya
  const isJuan = Boolean(
    currentUser?.id_usuario === 1 ||
    currentUser?.email?.toLowerCase().includes('automatizaciones@tlm.net.co') ||
    currentUser?.nombre_completo?.toLowerCase().includes('juan')
  );

  const isAdmin = Boolean(
    isJuan ||
    currentUser?.rol === 'Administrador' ||
    currentUser?.permisos?.administrador ||
    !currentUser // Default to owner access if session is loading
  );

  // Selectable official logo catalog
  const logoOptions: LogoOption[] = [
    {
      id: 'preset:official_full',
      value: null, // null maps to the canonical official full logo
      title: 'Logotipo Oficial TLM Completo',
      badge: 'Identidad Canónica',
      description: 'Símbolo geométrico de 4 cuadrantes + Tipografía Catamaran + Sello BIC + Subtítulo institucional.',
      recommendedFor: 'Recomendado para toda la plataforma, documentos fiscales y cabecera principal.'
    },
    {
      id: 'preset:official_symbol',
      value: 'preset:official_symbol',
      title: 'Isotipo Cuadrantes TLM Puro',
      badge: 'Icono Moderno',
      description: 'El icónico símbolo cuádruple (Bermellón Coral, Azul Índigo, Ámbar Cálido y Lavanda) sin tipografía.',
      recommendedFor: 'Ideal para navegación compacta, barras laterales y dispositivos móviles.'
    },
    {
      id: 'preset:juan_yaya_seal',
      value: 'preset:juan_yaya_seal',
      title: 'Sello Oficial Juan Yaya (TLM + JY Maestro)',
      badge: 'Exclusivo Administrador Maestro',
      description: 'Emblema institucional con monograma JY de Juan Yaya, gradiente índigo/zafiro y orla ámbar corporativa.',
      recommendedFor: 'Firma de autoría directiva y sello de control del Administrador Maestro.',
      isExclusiveJuan: true
    },
    {
      id: 'preset:bic_seal',
      value: 'preset:bic_seal',
      title: 'Logotipo Sociedad BIC Certificada',
      badge: 'Acreditación Legal',
      description: 'Distintivo oficial de Sociedad de Beneficio e Interés Colectivo enmarcado con la Ley 1901 de Colombia.',
      recommendedFor: 'Certificaciones contables, exportación de balances y reportes DIAN.'
    },
    {
      id: 'preset:minimal_horizontal',
      value: 'preset:minimal_horizontal',
      title: 'Logotipo Minimalista Horizontal',
      badge: 'Ultra Compacto',
      description: 'Línea de acento tricolor con tipografía TLM BIC de alto contraste sin márgenes excesivos.',
      recommendedFor: 'Cabeceras reducidas y pantallas de alta densidad de datos.'
    }
  ];

  const corporateColors = [
    { name: 'Azul Índigo TLM (Predeterminado)', hex: '#271a82', role: 'Color corporativo principal, cabeceras e institucional', bgClass: 'bg-[#271a82]', borderClass: 'border-[#271a82]' },
    { name: 'Bermellón Coral TLM', hex: '#e64519', role: 'Acento de alta energía, botones primarios y alertas', bgClass: 'bg-[#e64519]', borderClass: 'border-[#e64519]' },
    { name: 'Ámbar Cálido TLM', hex: '#fa9d1c', role: 'Indicadores directivos, retenciones e inspección', bgClass: 'bg-[#fa9d1c]', borderClass: 'border-[#fa9d1c]' },
    { name: 'Noche Ejecutiva TLM', hex: '#1c1343', role: 'Paleta nocturna sobria de máxima elegancia', bgClass: 'bg-[#1c1343]', borderClass: 'border-[#1c1343]' },
    { name: 'Azul Google Cloud (Zafiro)', hex: '#1a73e8', role: 'Estilo nativo de infraestructura Google Cloud Platform', bgClass: 'bg-[#1a73e8]', borderClass: 'border-[#1a73e8]' },
    { name: 'Verde Esmeralda BIC', hex: '#059669', role: 'Sostenibilidad, aprobaciones y auditoría limpia', bgClass: 'bg-[#059669]', borderClass: 'border-[#059669]' },
    { name: 'Púrpura Imperial', hex: '#7c3aed', role: 'Diseño directivo y finanzas estratégicas', bgClass: 'bg-[#7c3aed]', borderClass: 'border-[#7c3aed]' },
    { name: 'Azul Cobalto Eléctrico', hex: '#2563eb', role: 'Interacción ágil y alta legibilidad empresarial', bgClass: 'bg-[#2563eb]', borderClass: 'border-[#2563eb]' },
    { name: 'Verde Azulado Teal Profundo', hex: '#0d9488', role: 'Tecnología contable y conciliación bancaria', bgClass: 'bg-[#0d9488]', borderClass: 'border-[#0d9488]' },
    { name: 'Gris Pizarra Grafito', hex: '#334155', role: 'Minimalismo ejecutivo neutral de alto contraste', bgClass: 'bg-[#334155]', borderClass: 'border-[#334155]' },
  ];

  const handleSelectOption = (opt: LogoOption) => {
    if (!isAdmin) return;
    setSelectedLogoId(opt.id);
    setPreviewUrl(opt.value);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) return;
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setPreviewUrl(result);
        setSelectedLogoId('custom');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyCustomUrl = () => {
    if (!isAdmin || !customInputUrl.trim()) return;
    setPreviewUrl(customInputUrl.trim());
    setSelectedLogoId('custom');
  };

  const handleSaveAndApply = () => {
    if (!isAdmin) return;
    const currentOpt = logoOptions.find(o => o.id === selectedLogoId);
    const title = currentOpt ? currentOpt.title : (selectedLogoId === 'custom' ? 'Logotipo Personalizado' : 'Identidad TLM');
    onSaveCustomLogo(previewUrl, title, selectedColorHex);
    onClose();
  };

  const handleResetToOfficial = () => {
    if (!isAdmin) return;
    setSelectedLogoId('preset:official_full');
    setPreviewUrl(null);
    setSelectedColorHex('#271a82');
    onSaveCustomLogo(null, 'Logotipo Oficial TLM', '#271a82');
    onClose();
  };

  const handleCopyHex = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Modal */}
        <div 
          style={{ backgroundColor: selectedColorHex || '#1c1343' }} 
          className="text-white p-5 flex items-center justify-between border-b border-black/20 transition-colors duration-200"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-black/20 rounded-xl border border-white/20 text-[#fa9d1c]">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-lg leading-tight text-white">
                  Identidad Corporativa, Logos & Color Principal TLM
                </h3>
                {isJuan ? (
                  <span className="text-[10px] bg-[#fa9d1c] text-[#1c1343] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                    <Crown className="w-3 h-3" /> JUAN YAYA (ADMIN MAESTRO)
                  </span>
                ) : isAdmin ? (
                  <span className="text-[10px] bg-emerald-500 text-white font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> ADMINISTRADOR
                  </span>
                ) : (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-500/30">
                    <Lock className="w-3 h-3" /> SOLO LECTURA
                  </span>
                )}
              </div>
              <p className="text-xs text-indigo-100/90 mt-0.5">
                Configura el logotipo oficial y el color principal corporativo aplicado a toda la consola contable.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition cursor-pointer"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security & Permissions Banner */}
        {isAdmin ? (
          <div className="bg-gradient-to-r from-indigo-900/10 via-[#271a82]/5 to-transparent px-5 py-2.5 border-b border-indigo-100 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-[#271a82] font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Permiso concedido para Administrador Juan:</strong> Selecciona cualquier logotipo oficial y personaliza el color principal de la plataforma.
              </span>
            </div>
            <span className="text-[11px] text-slate-500 shrink-0 font-medium hidden sm:inline">
              Usuario activo: {currentUser?.nombre_completo || 'Juan Yaya'}
            </span>
          </div>
        ) : (
          <div className="bg-amber-50 px-5 py-3 border-b border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                La personalización de la identidad visual está reservada para el Administrador Juan Yaya.
              </span>
            </div>
            {onSwitchToJuan && (
              <button
                onClick={onSwitchToJuan}
                className="px-3 py-1.5 bg-[#271a82] hover:bg-[#1c1343] text-white font-bold text-xs rounded-xl transition cursor-pointer shrink-0 flex items-center gap-1.5 shadow-xs"
              >
                <UserCheck className="w-3.5 h-3.5 text-[#fa9d1c]" />
                Autenticar como Juan Yaya (Admin Maestro)
              </button>
            )}
          </div>
        )}

        {/* Live Real-Time Preview Strip */}
        <div className="bg-slate-50 border-b border-slate-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#e64519]" />
              Previsualización en Tiempo Real de la Selección (Logo & Color Principal)
            </span>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-white border border-slate-200 px-2.5 py-0.5 rounded-md shadow-2xs">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: selectedColorHex }}></span>
                Color: <code className="font-mono">{selectedColorHex}</code>
              </span>
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                Logo: {logoOptions.find(o => o.id === selectedLogoId)?.title || (selectedLogoId === 'custom' ? 'Personalizado' : 'Oficial TLM')}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Dark preview (Sidebar simulation) with dynamic color */}
            <div className="p-3.5 rounded-xl bg-[#1c1343] border border-indigo-950 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[10px] font-bold text-indigo-300 uppercase block mb-1">
                  En Barra Lateral & Menús Activos
                </span>
                <TlmLogo 
                  variant="full" 
                  theme="dark" 
                  size="md" 
                  subtitle={logoSubtitle} 
                  customLogoUrl={previewUrl} 
                />
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span 
                  style={{ backgroundColor: selectedColorHex }}
                  className="text-[10px] font-bold text-white px-2.5 py-1 rounded-lg shadow-xs"
                >
                  Menú Activo
                </span>
                <span className="text-[9px] text-indigo-300/80">Sidebar Preview</span>
              </div>
            </div>

            {/* Light preview (Header & docs simulation) with dynamic button */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  En Encabezado y Facturas (Fondo Blanco)
                </span>
                <TlmLogo 
                  variant="full" 
                  theme="light" 
                  size="md" 
                  subtitle={logoSubtitle} 
                  customLogoUrl={previewUrl} 
                />
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <button
                  style={{ backgroundColor: selectedColorHex }}
                  className="text-[10px] font-bold text-white px-3 py-1 rounded-lg shadow-xs cursor-default flex items-center gap-1"
                >
                  <Check className="w-3 h-3" /> Botón Principal
                </button>
                <span className="text-[9px] text-slate-400">Header / DIAN</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-1 px-5 pt-3 bg-white border-b border-slate-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('variants')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'variants'
                ? 'bg-slate-50 text-[#271a82] border-t-2 border-[#271a82] shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Layers className="w-4 h-4 text-[#271a82]" />
            Logotipos Oficiales ({logoOptions.length})
          </button>

          <button
            onClick={() => setActiveTab('colors')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'colors'
                ? 'bg-slate-50 text-[#271a82] border-t-2 border-[#fa9d1c] shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Palette className="w-4 h-4 text-[#fa9d1c]" />
            <span>Color Principal Corporativo</span>
            <span 
              className="w-2.5 h-2.5 rounded-full inline-block border border-white"
              style={{ backgroundColor: selectedColorHex }}
            ></span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'upload'
                ? 'bg-slate-50 text-[#271a82] border-t-2 border-[#e64519] shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Upload className="w-4 h-4 text-[#e64519]" />
            Cargar Logotipo Propio / URL
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/50">

          {/* TAB 1: Variantes Seleccionables de Logo */}
          {activeTab === 'variants' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Haz clic sobre cualquier variante para seleccionarla y previsualizarla
                  </h4>
                  <p className="text-xs text-slate-500">
                    Todas las variantes son oficiales, vectoriales y respetan la arquitectura visual de TLM BIC.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-bold text-slate-600">Subtítulo:</label>
                  <input
                    type="text"
                    value={logoSubtitle}
                    onChange={(e) => setLogoSubtitle(e.target.value)}
                    disabled={!isAdmin}
                    className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:border-[#271a82] disabled:opacity-60"
                    placeholder="Get Adviced"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {logoOptions.map((opt) => {
                  const isSelected = selectedLogoId === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => handleSelectOption(opt)}
                      className={`relative p-4 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between gap-3 text-left bg-white ${
                        isSelected
                          ? 'border-[#271a82] ring-2 ring-indigo-500/20 shadow-md bg-indigo-50/20'
                          : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
                      } ${!isAdmin ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      {/* Top badges */}
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          opt.isExclusiveJuan
                            ? 'bg-[#fa9d1c]/20 text-[#1c1343] border border-[#fa9d1c]/40 font-black'
                            : 'bg-indigo-50 text-[#271a82] border border-indigo-100'
                        }`}>
                          {opt.badge}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {isSelected ? (
                            <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Seleccionado
                            </span>
                          ) : (
                            <span className="text-[11px] font-medium text-slate-400 group-hover:text-slate-600">
                              Clic para elegir
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Visual rendering preview */}
                      <div className="p-3 bg-slate-100/70 rounded-xl border border-slate-200/80 flex items-center justify-center min-h-[64px]">
                        <TlmLogo
                          variant={opt.id === 'preset:official_symbol' ? 'symbol' : 'full'}
                          theme="light"
                          size="md"
                          subtitle={logoSubtitle}
                          customLogoUrl={opt.value}
                        />
                      </div>

                      {/* Text info */}
                      <div>
                        <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                          {opt.title}
                          {opt.isExclusiveJuan && <Crown className="w-3 h-3 text-[#fa9d1c]" />}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                          {opt.description}
                        </p>
                        <div className="text-[10px] text-indigo-700 font-medium mt-1.5 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-[#e64519]" />
                          <span>{opt.recommendedFor}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: SELECCIÓN DEL COLOR PRINCIPAL CORPORATIVO */}
          {activeTab === 'colors' && (
            <div className="space-y-5">
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <Palette className="w-4 h-4 text-[#271a82]" />
                      Color Principal de la Consola TLM
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Personaliza el color institucional principal. Se aplicará de forma global en botones de acción, menús activos, cabeceras y reportes.
                    </p>
                  </div>
                  
                  {/* Native Custom Color Picker */}
                  <div className="flex items-center gap-2.5 p-2 bg-slate-50 rounded-xl border border-slate-200 shrink-0">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Pipette className="w-3.5 h-3.5 text-[#e64519]" />
                      Color Personalizado:
                    </label>
                    <input
                      type="color"
                      value={selectedColorHex}
                      disabled={!isAdmin}
                      onChange={(e) => setSelectedColorHex(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 p-0.5 disabled:opacity-50"
                      title="Seleccionar cualquier color personalizado con el selector de color"
                    />
                    <input
                      type="text"
                      value={selectedColorHex}
                      disabled={!isAdmin}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.startsWith('#') || val.length <= 7) {
                          setSelectedColorHex(val);
                        }
                      }}
                      className="w-20 px-2 py-1 bg-white border border-slate-300 rounded-md font-mono text-xs font-bold text-slate-800 focus:outline-none focus:border-[#271a82]"
                      placeholder="#271a82"
                    />
                  </div>
                </div>

                {/* Preset Palettes Grid */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                    Paleta Corporativa Recomendada (Haz clic para seleccionar):
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                    {corporateColors.map((col) => {
                      const isColorSelected = selectedColorHex.toLowerCase() === col.hex.toLowerCase();
                      return (
                        <div
                          key={col.hex}
                          onClick={() => {
                            if (!isAdmin) return;
                            setSelectedColorHex(col.hex);
                          }}
                          className={`p-3 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between gap-2 select-none bg-white ${
                            isColorSelected
                              ? 'border-[#271a82] ring-2 ring-indigo-500/20 shadow-md bg-indigo-50/20'
                              : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div 
                                style={{ backgroundColor: col.hex }}
                                className="w-6 h-6 rounded-lg shadow-xs shrink-0 flex items-center justify-center border border-black/10"
                              >
                                {isColorSelected && <Check className="w-3.5 h-3.5 text-white drop-shadow-xs" />}
                              </div>
                              <span className="font-mono text-xs font-bold text-slate-800">{col.hex}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyHex(col.hex);
                              }}
                              title="Copiar código HEX"
                              className="text-slate-400 hover:text-slate-700 p-1 rounded-md"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-800 leading-tight block truncate">
                              {col.name}
                            </span>
                            <span className="text-[10px] text-slate-500 leading-tight mt-0.5 block truncate">
                              {col.role}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {copiedHex && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Código {copiedHex} copiado al portapapeles.
                  </div>
                )}
              </div>

              {/* Simulation card of UI components with the selected primary color */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                <span className="text-xs font-bold uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-[#fa9d1c]" />
                  Simulación de Controles con el Color Seleccionado:
                </span>
                
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    style={{ backgroundColor: selectedColorHex }}
                    className="px-4 py-2 text-white text-xs font-bold rounded-xl shadow-xs transition hover:opacity-95"
                  >
                    Botón de Acción Primaria
                  </button>

                  <div 
                    style={{ borderColor: selectedColorHex, color: selectedColorHex }}
                    className="px-3.5 py-1.5 rounded-xl border-2 text-xs font-bold bg-white"
                  >
                    Borde Institucional Destacado
                  </div>

                  <span 
                    style={{ backgroundColor: `${selectedColorHex}15`, color: selectedColorHex, borderColor: `${selectedColorHex}30` }}
                    className="px-3 py-1 rounded-lg border text-xs font-bold"
                  >
                    Insignia de Módulo Activo
                  </span>

                  <span className="text-xs text-slate-500 font-mono">
                    Color aplicado: <strong>{selectedColorHex}</strong>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CARGA DE LOGOTIPO PROPIO / URL EXTERNA */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Carga un archivo de imagen corporativo o ingresa una URL
                </h4>
                <p className="text-xs text-slate-500">
                  Formatos recomendados: SVG vectorial, PNG transparente o WebP de alta resolución.
                </p>
              </div>

              {/* File upload box */}
              <div className="p-6 rounded-2xl border-2 border-dashed border-slate-300 hover:border-[#271a82] bg-white text-center transition flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-[#271a82] flex items-center justify-center">
                  <Upload className="w-6 h-6 text-[#271a82]" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Selecciona un archivo de tu equipo (SVG, PNG, JPG, WebP)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Se procesará localmente y se codificará de forma segura.
                  </span>
                </div>
                <label className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs ${
                  isAdmin
                    ? 'bg-[#271a82] hover:bg-[#1c1343] text-white cursor-pointer active:scale-95'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}>
                  Examinar Archivo
                  <input
                    type="file"
                    accept="image/*"
                    disabled={!isAdmin}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* URL input box */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  O ingresa la URL directa de la imagen de tu logotipo:
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={customInputUrl}
                    onChange={(e) => setCustomInputUrl(e.target.value)}
                    disabled={!isAdmin}
                    placeholder="https://ejemplo.com/mi-logo-tlm.png"
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#271a82] disabled:opacity-60"
                  />
                  <button
                    onClick={handleApplyCustomUrl}
                    disabled={!isAdmin || !customInputUrl.trim()}
                    className="px-4 py-2 bg-[#271a82] hover:bg-[#1c1343] text-white font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-50"
                  >
                    Cargar URL
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={handleResetToOfficial}
            disabled={!isAdmin}
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            Restaurar Identidad Institucional TLM (#271a82)
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancelar
            </button>

            <button
              onClick={handleSaveAndApply}
              disabled={!isAdmin}
              style={{ backgroundColor: isAdmin ? selectedColorHex : undefined }}
              className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 ${
                isAdmin
                  ? 'hover:opacity-90 cursor-pointer hover:shadow-md'
                  : 'bg-slate-400 cursor-not-allowed opacity-60'
              }`}
            >
              <Check className="w-4 h-4" />
              Aplicar Selección a la Consola
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
