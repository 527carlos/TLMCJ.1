import React from 'react';
import { 
  LayoutDashboard, 
  FileSpreadsheet, 
  Receipt, 
  Scale, 
  BookOpen, 
  Users, 
  Cpu, 
  Database,
  ChevronLeft, 
  ChevronRight,
  ShieldCheck,
  Building2,
  ExternalLink,
  Palette,
  UserCheck,
  LogIn
} from 'lucide-react';
import { Empresa, Usuario } from '../types/index.ts';
import { TlmLogo } from './TlmLogo.tsx';

interface SidebarProps {
  currentSection: string;
  onSelectSection: (section: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeEmpresa: Empresa | null;
  empresas: Empresa[];
  onSelectEmpresa: (empresa: Empresa) => void;
  pendingInvoicesCount: number;
  customLogoUrl?: string | null;
  onOpenBrandCustomizer?: () => void;
  currentUser?: Usuario | null;
  onOpenAuthModal?: () => void;
  primaryColor?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentSection,
  onSelectSection,
  collapsed,
  onToggleCollapse,
  activeEmpresa,
  empresas,
  onSelectEmpresa,
  pendingInvoicesCount,
  customLogoUrl = null,
  onOpenBrandCustomizer,
  currentUser = null,
  onOpenAuthModal,
  primaryColor = '#271a82'
}) => {
  const getCleanInitials = (user: Usuario | null): string => {
    if (!user || !user.nombre_completo) return 'JY';
    const cleaned = user.nombre_completo.replace(/[¿?¡!]/g, '').trim();
    // Default to 'JY' for Juan Yaya (Admin Maestro) or fallback
    if (cleaned.toLowerCase().includes('juan') && cleaned.toLowerCase().includes('yaya')) {
      return 'JY';
    }
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (cleaned.slice(0, 2) || 'JY').toUpperCase();
  };
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard Directivo', icon: LayoutDashboard },
    { 
      id: 'facturas', 
      label: 'Cargue & Auditoría UBL', 
      icon: Receipt,
      badge: pendingInvoicesCount > 0 ? pendingInvoicesCount : null 
    },
    { id: 'centro-fiscal', label: 'Centro Fiscal (F350)', icon: FileSpreadsheet },
    { id: 'conciliacion', label: 'Conciliación Bancaria', icon: Scale },
    { id: 'cerebro', label: 'Cerebro Contable PUC', icon: BookOpen },
    { id: 'accesos', label: 'Admin Usuarios & Cloud', icon: Users },
    { id: 'base-datos', label: 'Base de Datos & Cloud', icon: Database, highlight: true },
    { id: 'arquitectura', label: 'Arquitectura & Escala', icon: Cpu }
  ];

  return (
    <aside 
      className={`h-screen bg-[#1c1343] text-white flex flex-col justify-between shadow-2xl transition-all duration-300 z-30 select-none border-r border-indigo-950/80 ${
        collapsed ? 'w-20' : 'w-72'
      }`}
    >
      <div className="flex-1 overflow-y-auto">
        {/* Header Branding with Official TLM Logo */}
        <div className="p-4 border-b border-indigo-900/50 flex items-center justify-between bg-[#160f38]">
          <div className="flex items-center gap-3 overflow-hidden">
            {collapsed ? (
              <TlmLogo variant="symbol" theme="dark" size="sm" customLogoUrl={customLogoUrl} />
            ) : (
              <TlmLogo
                variant="full"
                theme="dark"
                size="md"
                subtitle="Get Adviced"
                customLogoUrl={customLogoUrl}
              />
            )}
          </div>
          <button 
            onClick={onToggleCollapse}
            title={collapsed ? "Expandir Menú" : "Contraer Menú"}
            className="p-1.5 rounded-lg bg-indigo-950/80 hover:bg-[#271a82] text-indigo-300 hover:text-white transition cursor-pointer shrink-0"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Company Selector Switcher */}
        {!collapsed ? (
          <div className="p-3 border-b border-indigo-900/40 bg-[#19113e]">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-bold tracking-wider text-indigo-300 uppercase block">
                Empresa Activa / Contribuyente
              </label>
              {onOpenBrandCustomizer && (
                <button
                  onClick={onOpenBrandCustomizer}
                  title="Personalizar Identidad y Logo TLM"
                  className="text-[10px] text-[#fa9d1c] hover:text-[#e64519] flex items-center gap-1 font-semibold cursor-pointer transition"
                >
                  <Palette className="w-3 h-3" /> Marca
                </button>
              )}
            </div>
            <div className="relative">
              <select
                value={activeEmpresa?.id_empresa || 1}
                onChange={(e) => {
                  const emp = empresas.find(item => item.id_empresa === parseInt(e.target.value));
                  if (emp) onSelectEmpresa(emp);
                }}
                className="w-full bg-[#271a82]/60 border border-indigo-700/60 rounded-xl px-2.5 py-2 text-xs text-white font-medium focus:outline-none focus:border-[#e64519] transition appearance-none cursor-pointer"
              >
                {empresas.map((emp, empIdx) => (
                  <option key={`sidebar-emp-${emp.id_empresa}-${emp.nit || empIdx}`} value={emp.id_empresa} className="bg-[#1c1343] text-white">
                    {emp.nombre_comercial} (NIT: {emp.nit})
                  </option>
                ))}
              </select>
              <Building2 className="w-3.5 h-3.5 text-indigo-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>
        ) : (
          <div className="p-3 border-b border-indigo-900/40 flex justify-center" title={activeEmpresa?.nombre_comercial}>
            <Building2 className="w-5 h-5 text-indigo-300" />
          </div>
        )}

        {/* Navigation Items */}
        <nav className="p-3 space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectSection(item.id)}
                title={item.label}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'text-white shadow-lg border-l-4 border-[#e64519] font-bold'
                    : item.highlight
                    ? 'bg-indigo-950/60 text-indigo-200 hover:bg-[#271a82]/50 hover:text-white border border-indigo-800/40'
                    : 'text-indigo-200 hover:bg-[#271a82]/40 hover:text-white'
                }`}
                style={isActive ? { background: `linear-gradient(135deg, ${primaryColor}, #4059aa)` } : undefined}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-[#fa9d1c]' : item.highlight ? 'text-[#e64519]' : 'text-indigo-300'}`} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </div>
                {!collapsed && item.badge && (
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-[#e64519] text-white animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Status & Official Links */}
      <div className="p-3 border-t border-indigo-900/50 bg-[#160f38] space-y-2">
        {!collapsed ? (
          <>
            {/* User session trigger */}
            {onOpenAuthModal && (
              <button
                onClick={onOpenAuthModal}
                className="w-full bg-[#1c1343] hover:bg-[#271a82]/80 rounded-xl p-2.5 border border-indigo-900/80 flex items-center justify-between text-left transition cursor-pointer group"
                title="Haga clic para cambiar de usuario o ver credenciales"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#271a82] to-[#fa9d1c] text-white flex items-center justify-center font-bold text-xs ring-1 ring-white/20 shrink-0 overflow-hidden shadow-xs">
                    {currentUser?.avatar_url ? (
                      <img
                        src={currentUser.avatar_url}
                        alt={currentUser.nombre_completo}
                        className="w-full h-full object-cover"
                      />
                    ) : currentUser ? (
                      getCleanInitials(currentUser)
                    ) : (
                      <UserCheck className="w-3.5 h-3.5 text-white" />
                    )}
                  </div>
                  <div className="min-w-0 truncate">
                    <div className="text-[11px] font-bold text-white truncate group-hover:text-[#fa9d1c] transition">
                      {currentUser ? currentUser.nombre_completo : 'Iniciar Sesión'}
                    </div>
                    <div className="text-[10px] text-indigo-300 flex items-center gap-1">
                      <UserCheck className="w-2.5 h-2.5 text-emerald-400" />
                      <span>{currentUser ? currentUser.rol : 'Sin sesión'}</span>
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-[#fa9d1c] font-bold bg-[#fa9d1c]/10 px-1.5 py-0.5 rounded border border-[#fa9d1c]/30 shrink-0">
                  Cambiar
                </span>
              </button>
            )}

            <div className="bg-[#271a82]/40 rounded-xl p-2 border border-indigo-800/50">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] font-medium text-indigo-200">Estado Siigo Nube</span>
                <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Conectado
                </span>
              </div>
              <p className="text-[10px] text-indigo-300 truncate">
                ERP: {activeEmpresa?.software_erp || 'SIIGO NUBE v1'}
              </p>
            </div>

            <div className="flex items-center justify-between px-1 text-[10px] text-indigo-300/80">
              <span className="flex items-center gap-1 font-semibold text-white/80">
                <ShieldCheck className="w-3 h-3 text-[#fa9d1c]" /> Sociedad BIC
              </span>
              <a
                href="https://www.tlmcol.com/"
                target="_blank"
                rel="noreferrer"
                className="hover:text-white flex items-center gap-0.5 text-[#fa9d1c] transition"
              >
                tlmcol.com <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2">
            {onOpenAuthModal && (
              <button
                onClick={onOpenAuthModal}
                className="w-7 h-7 rounded-full bg-[#271a82] text-white flex items-center justify-center font-bold text-[10px] hover:ring-2 hover:ring-[#fa9d1c] transition cursor-pointer overflow-hidden shadow-xs ring-1 ring-white/20"
                title={currentUser ? `Usuario: ${currentUser.nombre_completo} (${currentUser.rol})` : "Iniciar Sesión"}
              >
                {currentUser?.avatar_url ? (
                  <img
                    src={currentUser.avatar_url}
                    alt={currentUser.nombre_completo}
                    className="w-full h-full object-cover"
                  />
                ) : currentUser ? (
                  getCleanInitials(currentUser)
                ) : (
                  <LogIn className="w-3.5 h-3.5" />
                )}
              </button>
            )}
            <span className="w-2 h-2 rounded-full bg-emerald-400" title="Siigo Nube Online"></span>
            {onOpenBrandCustomizer && (
              <button
                onClick={onOpenBrandCustomizer}
                className="text-indigo-400 hover:text-white p-1"
                title="Personalizar Identidad TLM"
              >
                <Palette className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
