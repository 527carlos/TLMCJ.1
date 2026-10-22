import React from 'react';
import { Empresa, Usuario } from '../types/index.ts';
import { Building2, UserCheck, RefreshCw, Palette, GitBranch } from 'lucide-react';

interface HeaderProps {
  currentSection: string;
  activeEmpresa: Empresa | null;
  currentUser: Usuario | null;
  onRefreshData: () => void;
  isRefreshing?: boolean;
  onOpenBrandCustomizer?: () => void;
  onOpenAuthModal?: () => void;
  onNavigateToSection?: (sec: string) => void;
  primaryColor?: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentSection,
  activeEmpresa,
  currentUser,
  onRefreshData,
  isRefreshing = false,
  onOpenBrandCustomizer,
  onOpenAuthModal,
  onNavigateToSection,
  primaryColor = '#271a82'
}) => {
  const isAdminOrDeveloper = currentUser?.rol === 'Administrador' || currentUser?.rol === 'Desarrollador';

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

  const getSectionTitle = () => {
    switch (currentSection) {
      case 'dashboard':
        return { title: 'Dashboard Directivo', subtitle: 'Visión consolidada de KPIs fiscales, flujo de compras y auditoría' };
      case 'facturas':
        return { title: 'Cargue & Auditoría ETL UBL 2.1', subtitle: 'Extracción, validación de reglas UVT y clasificación contable' };
      case 'centro-fiscal':
        return { title: 'Centro Fiscal - Formulario 350 DIAN', subtitle: 'Liquidación oficial de retenciones en la fuente y casillas tributarias' };
      case 'conciliacion':
        return { title: 'Conciliación Bancaria Automática', subtitle: 'Cruce algorítmico multiescala de extractos bancarios vs libros contables' };
      case 'cerebro':
        return { title: 'Cerebro Contable (PUC & Balance)', subtitle: 'Explorador jerárquico de cuentas y balance de prueba por terceros' };
      case 'accesos':
        return { title: 'Gestión, Repositorio & Siigo API', subtitle: 'Repositorio Juan v2.0, gobierno de usuarios y credenciales ERP' };
      case 'base-datos':
        return { title: 'Base de Datos Central & Hub de Migración Cloud', subtitle: 'Persistencia en línea, tablas relacionales, esquemas SQL y replicación en Google Cloud' };
      case 'arquitectura':
        return { title: 'Arquitectura & Centro de Escalabilidad', subtitle: 'Diseño modular Clean Architecture para alto rendimiento empresarial' };
      default:
        return { title: 'Consola TLM', subtitle: 'Gestión Fiscal B2B' };
    }
  };

  const { title } = getSectionTitle();

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shadow-xs z-20">
      <div>
        <h2 className="text-xl font-bold tracking-tight transition-colors duration-200" style={{ color: primaryColor }}>{title}</h2>
      </div>

      <div className="flex items-center gap-3">
        {/* Repositorio Juan v2.0 Badge */}
        {isAdminOrDeveloper && (
        <button
          onClick={() => onNavigateToSection && onNavigateToSection('accesos')}
          title="Ver Repositorio Central de Juan Yaya (Versión 2.0)"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-50 to-amber-50 border border-indigo-200 hover:border-[#271a82] text-xs transition cursor-pointer"
        >
          <GitBranch className="w-3.5 h-3.5 text-[#e64519]" />
          <span className="text-[11px] font-bold text-[#271a82]">Repo Juan</span>
          <span className="px-1.5 py-0.2 rounded bg-[#271a82] text-white text-[10px] font-black">
            v2.0
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Multiusuario conectado en vivo"></span>
        </button>
        )}

        {/* Active Company Pill */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <Building2 className="w-4 h-4 text-[#271a82]" />
          <div>
            <span className="font-semibold text-slate-800 block leading-none">
              {activeEmpresa?.nombre_comercial || 'TLM Consulting SAS BIC'}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">NIT: {activeEmpresa?.nit}</span>
          </div>
        </div>

        {/* Brand & Logo Customizer Trigger */}
        {isAdminOrDeveloper && onOpenBrandCustomizer && (
          <button
            onClick={onOpenBrandCustomizer}
            title="Personalizar Identidad, Logos y Colores TLM"
            style={{ color: primaryColor, borderColor: `${primaryColor}40`, backgroundColor: `${primaryColor}10` }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition hover:opacity-90 cursor-pointer"
          >
            <Palette className="w-3.5 h-3.5 text-[#e64519]" />
            <span className="hidden sm:inline">Identidad & Logos</span>
          </button>
        )}

        {/* Refresh Button */}
        <button
          onClick={onRefreshData}
          disabled={isRefreshing}
          title="Actualizar datos del servidor"
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition active:scale-95 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#e64519]' : ''}`} />
        </button>

        {/* User Badge / Login Trigger */}
        {currentUser ? (
          <button
            onClick={onOpenAuthModal}
            title="Cambiar usuario o ver perfil"
            className="flex items-center gap-2.5 pl-3 border-l border-slate-200 hover:opacity-90 transition cursor-pointer text-left group"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#271a82] to-[#fa9d1c] text-white flex items-center justify-center font-bold text-xs ring-1 ring-[#271a82]/20 shadow-xs overflow-hidden shrink-0">
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
            <div className="text-left hidden sm:block">
              <div className="text-xs font-bold text-slate-800 leading-none group-hover:text-[#271a82] transition">
                {currentUser.nombre_completo}
              </div>
              <div className="text-[11px] font-medium text-emerald-600 flex items-center gap-1 mt-0.5">
                <UserCheck className="w-3 h-3" /> {currentUser.rol}
              </div>
            </div>
          </button>
        ) : (
          <button
            onClick={onOpenAuthModal}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#271a82] text-white text-xs font-bold hover:bg-[#1c1343] transition shadow-xs cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5 text-[#fa9d1c]" />
            <span>Iniciar Sesión</span>
          </button>
        )}
      </div>
    </header>
  );
};
