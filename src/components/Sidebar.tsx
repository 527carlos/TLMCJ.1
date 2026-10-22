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
  currentUser?: Usuario | null;
  primaryColor?: string;
  sidebarColor?: string;
}

function adjustHex(hex: string, percent: number): string {
  try {
    const clean = hex.startsWith('#') ? hex.slice(1) : hex;
    const num = parseInt(clean, 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, Math.max(0, (num >> 16) + amt));
    const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
    const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
  } catch {
    return hex;
  }
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
  currentUser = null,
  primaryColor = '#271a82',
  sidebarColor = '#1c1343'
}) => {
  const getCleanInitials = (user: Usuario | null): string => {
    if (!user || !user.nombre_completo) return 'JY';
    const cleaned = user.nombre_completo.replace(/[¿?¡!]/g, '').trim();
    if (cleaned.toLowerCase().includes('juan') && cleaned.toLowerCase().includes('yaya')) {
      return 'JY';
    }
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (cleaned.slice(0, 2) || 'JY').toUpperCase();
  };

  const isAdminOrDeveloper = currentUser?.rol === 'Administrador' || currentUser?.rol === 'Desarrollador';
  const canManageUsers = Boolean(
    isAdminOrDeveloper || currentUser?.permisos?.gestion_usuarios
  );

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
    ...(canManageUsers
      ? [{ id: 'accesos', label: 'Admin Usuarios & Cloud', icon: Users }]
      : []),
    ...(isAdminOrDeveloper
      ? [
          { id: 'base-datos', label: 'Base de Datos & Cloud', icon: Database, highlight: true },
          { id: 'arquitectura', label: 'Arquitectura & Escala', icon: Cpu }
        ]
      : [])
  ];

  const headerBg = adjustHex(sidebarColor, -12);
  const switcherBg = adjustHex(sidebarColor, -6);
  const footerBg = adjustHex(sidebarColor, -12);

  return (
    <aside 
      className={`h-screen text-white flex flex-col justify-between shadow-2xl transition-all duration-300 z-30 select-none border-r border-black/20 ${
        collapsed ? 'w-20' : 'w-72'
      }`}
      style={{ backgroundColor: sidebarColor }}
    >
      <div className="flex-1 overflow-y-auto">
        {/* Header Branding with Official TLM Logo */}
        <div 
          className="p-4 border-b border-white/10 flex items-center justify-between transition-colors duration-200"
          style={{ backgroundColor: headerBg }}
        >
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
            className="p-1.5 rounded-lg bg-black/20 hover:bg-black/40 text-white/80 hover:text-white transition cursor-pointer shrink-0"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Company Selector Switcher without unneeded Marca button */}
        {!collapsed ? (
          <div 
            className="p-3 border-b border-white/10 transition-colors duration-200"
            style={{ backgroundColor: switcherBg }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-bold tracking-wider text-white/70 uppercase block">
                Empresa Activa / Contribuyente
              </label>
            </div>
            <div className="relative">
              <select
                value={activeEmpresa?.id_empresa || 1}
                onChange={(e) => {
                  const emp = empresas.find(item => item.id_empresa === parseInt(e.target.value));
                  if (emp) onSelectEmpresa(emp);
                }}
                style={{ backgroundColor: adjustHex(sidebarColor, 8) }}
                className="w-full border border-white/20 rounded-xl px-2.5 py-2 text-xs text-white font-medium focus:outline-none focus:border-[#e64519] transition appearance-none cursor-pointer"
              >
                {empresas.map((emp, empIdx) => (
                  <option 
                    key={`sidebar-emp-${emp.id_empresa}-${emp.nit || empIdx}`} 
                    value={emp.id_empresa} 
                    style={{ backgroundColor: sidebarColor, color: '#ffffff' }}
                  >
                    {emp.nombre_comercial} (NIT: {emp.nit})
                  </option>
                ))}
              </select>
              <Building2 className="w-3.5 h-3.5 text-white/60 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>
        ) : (
          <div 
            className="p-3 border-b border-white/10 flex justify-center" 
            style={{ backgroundColor: switcherBg }}
            title={activeEmpresa?.nombre_comercial}
          >
            <Building2 className="w-5 h-5 text-white/70" />
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
                    ? 'bg-black/25 text-white/90 hover:bg-black/40 hover:text-white border border-white/15'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
                style={isActive ? { background: `linear-gradient(135deg, ${primaryColor}, #4059aa)` } : undefined}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-[#fa9d1c]' : item.highlight ? 'text-[#e64519]' : 'text-white/70'}`} />
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

      {/* Footer Status & Official Links without unnecessary session switcher button */}
      <div 
        className="p-3 border-t border-white/10 space-y-2 transition-colors duration-200"
        style={{ backgroundColor: footerBg }}
      >
        {!collapsed ? (
          <>
            {/* User session status badge (non-clickable, elegant profile card) */}
            {currentUser && (
              <div className="w-full bg-white/10 rounded-xl p-2.5 border border-white/15 flex items-center gap-2.5 text-left select-none">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#271a82] to-[#fa9d1c] text-white flex items-center justify-center font-bold text-xs ring-1 ring-white/20 shrink-0 overflow-hidden shadow-xs">
                  {currentUser.avatar_url ? (
                    <img
                      src={currentUser.avatar_url}
                      alt={currentUser.nombre_completo}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    getCleanInitials(currentUser)
                  )}
                </div>
                <div className="min-w-0 truncate">
                  <div className="text-[11px] font-bold text-white truncate">
                    {currentUser.nombre_completo}
                  </div>
                  <div className="text-[10px] text-white/75 flex items-center gap-1">
                    <UserCheck className="w-2.5 h-2.5 text-emerald-400" />
                    <span>{currentUser.rol}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-black/20 rounded-xl p-2 border border-white/10">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] font-medium text-white/80">Estado Siigo Nube</span>
                <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Conectado
                </span>
              </div>
              <p className="text-[10px] text-white/60 truncate">
                ERP: {activeEmpresa?.software_erp || 'SIIGO NUBE v1'}
              </p>
            </div>

            <div className="flex items-center justify-between px-1 text-[10px] text-white/70">
              <span className="flex items-center gap-1 font-semibold text-white/90">
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
            {currentUser && (
              <div 
                className="w-8 h-8 rounded-full bg-gradient-to-br from-[#271a82] to-[#fa9d1c] text-white flex items-center justify-center font-bold text-xs shadow-xs ring-1 ring-white/20 overflow-hidden"
                title={`Sesión activa: ${currentUser.nombre_completo} (${currentUser.rol})`}
              >
                {currentUser.avatar_url ? (
                  <img
                    src={currentUser.avatar_url}
                    alt={currentUser.nombre_completo}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  getCleanInitials(currentUser)
                )}
              </div>
            )}
            <span className="w-2 h-2 rounded-full bg-emerald-400" title="Siigo Nube Online"></span>
          </div>
        )}
      </div>
    </aside>
  );
};
