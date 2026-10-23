/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar.tsx';
import { Header } from './components/Header.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { FacturasView } from './components/FacturasView.tsx';
import { CentroFiscalView } from './components/CentroFiscalView.tsx';
import { ConciliacionView } from './components/ConciliacionView.tsx';
import { CerebroContableView } from './components/CerebroContableView.tsx';
import { AccesosView } from './components/AccesosView.tsx';
import { BaseDatosCloudView } from './components/BaseDatosCloudView.tsx';
import { ArquitecturaView } from './components/ArquitecturaView.tsx';
import { CufeModal } from './components/CufeModal.tsx';
import { SiigoPushModal } from './components/SiigoPushModal.tsx';
import { BrandCustomizerModal } from './components/BrandCustomizerModal.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { TlmLogo } from './components/TlmLogo.tsx';
import { Empresa, Usuario, PermisosUsuario, Factura, CuentaPUC, BalanceTercero, F350Report, ConciliacionSummary } from './types/index.ts';

export default function App() {
  const [currentSection, setCurrentSection] = useState<string>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [primaryColor, setPrimaryColor] = useState<string>(() => {
    return localStorage.getItem('tlm_primary_color') || '#271a82';
  });
  const [sidebarColor, setSidebarColor] = useState<string>(() => {
    return localStorage.getItem('tlm_sidebar_color') || '#1c1343';
  });
  const [customLogoUrl, setCustomLogoUrl] = useState<string | null>(() => {
    return localStorage.getItem('tlm_custom_logo') || null;
  });

  const [currentUser, setCurrentUser] = useState<Usuario | null>(() => {
    try {
      const savedUser = localStorage.getItem('tlm_current_user');
      const savedTimestamp = localStorage.getItem('tlm_session_timestamp');
      const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 horas
      if (savedUser && savedTimestamp) {
        const elapsed = Date.now() - Number(savedTimestamp);
        if (elapsed < SESSION_DURATION_MS) {
          return JSON.parse(savedUser);
        } else {
          localStorage.removeItem('tlm_current_user');
          localStorage.removeItem('tlm_current_user_id');
          localStorage.removeItem('tlm_session_timestamp');
        }
      }
    } catch (e) {}
    return null;
  });

  const handleSelectUser = (u: Usuario | null) => {
    setCurrentUser(u);
    setIsAuthModalOpen(false);
    if (u) {
      localStorage.setItem('tlm_current_user_id', u.id_usuario.toString());
      localStorage.setItem('tlm_current_user', JSON.stringify(u));
      localStorage.setItem('tlm_session_timestamp', Date.now().toString());
    } else {
      localStorage.removeItem('tlm_current_user_id');
      localStorage.removeItem('tlm_current_user');
      localStorage.removeItem('tlm_session_timestamp');
    }
  };

  useEffect(() => {
    document.documentElement.style.setProperty('--tlm-primary', primaryColor);
    document.documentElement.style.setProperty('--tlm-sidebar-bg', sidebarColor);
  }, [primaryColor, sidebarColor]);

  const handleSaveCustomLogo = async (
    url: string | null, 
    variantTitle?: string, 
    primaryColorHex?: string,
    sidebarColorHex?: string
  ) => {
    setCustomLogoUrl(url);
    const newColor = primaryColorHex || primaryColor;
    const newSidebarColor = sidebarColorHex || sidebarColor;

    if (primaryColorHex) {
      setPrimaryColor(primaryColorHex);
      localStorage.setItem('tlm_primary_color', primaryColorHex);
      document.documentElement.style.setProperty('--tlm-primary', primaryColorHex);
    }

    if (sidebarColorHex) {
      setSidebarColor(sidebarColorHex);
      localStorage.setItem('tlm_sidebar_color', sidebarColorHex);
      document.documentElement.style.setProperty('--tlm-sidebar-bg', sidebarColorHex);
    }

    if (url) {
      localStorage.setItem('tlm_custom_logo', url);
      showToast(`¡${variantTitle || 'Logotipo corporativo'} y colores aplicados con éxito!`);
    } else {
      localStorage.removeItem('tlm_custom_logo');
      showToast(`¡Identidad oficial TLM y colores aplicados con éxito!`);
    }

    try {
      await fetch('/api/v1/sistema/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customLogoUrl: url,
          variantTitle,
          temaAcento: newColor,
          sidebarColor: newSidebarColor,
          autor_nombre: currentUser?.nombre_completo || 'Juan Yaya - Administrador Maestro'
        })
      });
    } catch (err) {
      console.warn('Error sincronizando branding con el servidor:', err);
    }
  };

  // Core Data State
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [activeEmpresa, setActiveEmpresa] = useState<Empresa | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [cuentasPUC, setCuentasPUC] = useState<CuentaPUC[]>([]);
  const [balanceTerceros, setBalanceTerceros] = useState<BalanceTercero[]>([]);
  const [kpis, setKpis] = useState({
    total_compras_netas: 0,
    total_iva_descontable: 0,
    total_retenciones_f350: 0,
    total_auditadas: 0,
    tasa_auditoria: 0
  });
  const [f350Report, setF350Report] = useState<F350Report | null>(null);
  const [conciliacionSummary, setConciliacionSummary] = useState<ConciliacionSummary | null>(null);
  const [isConciliating, setIsConciliating] = useState<boolean>(false);

  // Modal State
  const [selectedCufeFactura, setSelectedCufeFactura] = useState<Factura | null>(null);
  const [siigoPushFacturas, setSiigoPushFacturas] = useState<Factura[] | null>(null);

  // Notification Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const loadData = async () => {
    setIsRefreshing(true);
    try {
      // 1. Fetch Empresas
      const resEmpresas = await fetch('/api/v1/empresas');
      const dataEmpresas = await resEmpresas.json();
      const uniqueEmpresas = (Array.isArray(dataEmpresas) ? dataEmpresas : []).filter(
        (e: Empresa, index: number, self: Empresa[]) => index === self.findIndex((t) => t.id_empresa === e.id_empresa)
      );
      setEmpresas(uniqueEmpresas);
      if (uniqueEmpresas.length > 0 && !activeEmpresa) {
        setActiveEmpresa(uniqueEmpresas[0]);
      }

      // 2. Fetch Facturas
      const empId = activeEmpresa ? activeEmpresa.id_empresa : 1;
      const resFacturas = await fetch(`/api/v1/facturas?id_empresa=${empId}`);
      const dataFacturas = await resFacturas.json();
      const uniqueFacturas = (Array.isArray(dataFacturas) ? dataFacturas : []).filter(
        (f: Factura, index: number, self: Factura[]) => index === self.findIndex((t) => t.id_factura === f.id_factura)
      );
      setFacturas(uniqueFacturas);

      // 3. Fetch KPIs
      const resKpis = await fetch(`/api/v1/facturas/kpis/resumen?id_empresa=${empId}`);
      const dataKpis = await resKpis.json();
      setKpis(dataKpis);

      // 4. Fetch Cuentas PUC & Balance
      const resPuc = await fetch(`/api/v1/contabilidad/puc?id_empresa=${empId}`);
      const dataPuc = await resPuc.json();
      setCuentasPUC(Array.isArray(dataPuc) ? dataPuc : []);

      const resBalance = await fetch(`/api/v1/contabilidad/balance?id_empresa=${empId}`);
      const dataBalance = await resBalance.json();
      setBalanceTerceros(Array.isArray(dataBalance) ? dataBalance : []);

      // 5. Fetch F350 Report
      const resF350 = await fetch(`/api/v1/impuestos/f350?id_empresa=${empId}`);
      const dataF350 = await resF350.json();
      setF350Report(dataF350);

      // 6. Fetch Usuarios
      const resUsuarios = await fetch('/api/v1/auth/usuarios');
      const dataUsuarios = await resUsuarios.json();
      const uniqueUsuarios = (Array.isArray(dataUsuarios) ? dataUsuarios : []).filter(
        (u: Usuario, index: number, self: Usuario[]) => index === self.findIndex((t) => t.id_usuario === u.id_usuario)
      );
      setUsuarios(uniqueUsuarios);
      if (uniqueUsuarios.length > 0) {
        const savedId = localStorage.getItem('tlm_current_user_id');
        if (savedId) {
          const match = uniqueUsuarios.find((u: Usuario) => u.id_usuario === Number(savedId));
          if (match) {
            setCurrentUser(match);
            localStorage.setItem('tlm_current_user', JSON.stringify(match));
          }
        }
      }

      // 7. Initial Conciliacion run
      const resConcil = await fetch('/api/v1/conciliacion/ejecutar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tolerancia: 0 })
      });
      const dataConcil = await resConcil.json();
      setConciliacionSummary(dataConcil);

      // 8. Fetch Branding Config & Primary/Sidebar Colors
      try {
        const resBranding = await fetch('/api/v1/sistema/branding');
        if (resBranding.ok) {
          const dataBranding = await resBranding.json();
          if (dataBranding) {
            if (dataBranding.customLogoUrl !== undefined && !localStorage.getItem('tlm_custom_logo')) {
              setCustomLogoUrl(dataBranding.customLogoUrl);
            }
            if (dataBranding.temaAcento && !localStorage.getItem('tlm_primary_color')) {
              setPrimaryColor(dataBranding.temaAcento);
              document.documentElement.style.setProperty('--tlm-primary', dataBranding.temaAcento);
            }
            if (dataBranding.sidebarColor && !localStorage.getItem('tlm_sidebar_color')) {
              setSidebarColor(dataBranding.sidebarColor);
              document.documentElement.style.setProperty('--tlm-sidebar-bg', dataBranding.sidebarColor);
            }
          }
        }
      } catch (e) {
        // Fallback to local storage
      }

    } catch (err) {
      console.error("Error cargando datos de la Consola TLM:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const loadUsuariosOnly = async () => {
    try {
      const resUsuarios = await fetch('/api/v1/auth/usuarios');
      const dataUsuarios = await resUsuarios.json();
      const uniqueUsuarios = (Array.isArray(dataUsuarios) ? dataUsuarios : []).filter(
        (u: Usuario, index: number, self: Usuario[]) => index === self.findIndex((t) => t.id_usuario === u.id_usuario)
      );
      setUsuarios(uniqueUsuarios);
    } catch (err) {
      console.error("Error cargando usuarios para login:", err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadData();
    } else {
      loadUsuariosOnly();
    }
  }, [activeEmpresa?.id_empresa, currentUser?.id_usuario]);

  // Actions
  const handleUploadXml = async (files: FileList): Promise<{ archivos_procesados: number; xmls_extraidos: number; facturas_creadas: number }> => {
    const formData = new FormData();
    formData.append('id_empresa', (activeEmpresa?.id_empresa || 1).toString());
    for (let i = 0; i < files.length; i++) {
      formData.append('archivos', files[i]);
    }

    try {
      const res = await fetch('/api/v1/facturas/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error procesando los archivos.');
      if (data.facturas_creadas > 0) {
        showToast(`¡Se procesaron ${data.archivos_procesados} archivo(s) y se sincronizaron ${data.facturas_creadas} facturas en la base de datos!`);
      } else {
        showToast(`Se procesaron ${data.archivos_procesados} archivo(s), pero no se detectaron nuevas facturas válidas.`, 'info');
      }
      await loadData();
      return {
        archivos_procesados: Number(data.archivos_procesados || files.length),
        xmls_extraidos: Number(data.xmls_extraidos || data.facturas_creadas || 0),
        facturas_creadas: Number(data.facturas_creadas || 0)
      };
    } catch (err) {
      showToast('Error procesando archivos XML / ZIP.', 'error');
      throw err;
    }
  };

  const handleSeedDemo = async () => {
    try {
      const res = await fetch('/api/v1/facturas/seed-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_empresa: activeEmpresa?.id_empresa || 1 })
      });
      const data = await res.json();
      showToast(data.mensaje || 'Facturas demo cargadas con éxito.');
      loadData();
    } catch (err) {
      showToast('Error cargando facturas demo.', 'error');
    }
  };

  const handleImportFromGoogleDrive = async () => {
    try {
      const res = await fetch('/api/v1/sistema/google-drive-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_empresa: activeEmpresa?.id_empresa || 1 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error importando desde Google Drive');
      showToast(data.mensaje || '¡Factura importada exitosamente desde Google Drive!');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Error importando desde Google Drive.', 'error');
    }
  };

  const handleUpdateFactura = async (id: number, field: string, value: any) => {
    try {
      let endpoint = `/api/v1/facturas/${id}/${field}`;
      let body: any = {};

      if (field === 'estado') {
        body = { estado: value };
      } else if (field === 'cuenta') {
        body = { cuenta_gasto: value };
      } else if (field === 'retencion') {
        body = value;
      }

      await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      loadData();
      showToast('Factura actualizada y recalculada en el motor fiscal.');
    } catch (err) {
      showToast('Error al actualizar factura.', 'error');
    }
  };

  const handleDeleteFactura = async (id: number) => {
    if (!confirm('¿Desea eliminar este comprobante contable?')) return;
    try {
      setFacturas(prev => prev.filter(f => f.id_factura !== id));
      const res = await fetch(`/api/v1/facturas/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      showToast('Factura eliminada.');
      await loadData();
    } catch (err) {
      showToast('Error al eliminar factura.', 'error');
      await loadData();
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    try {
      setFacturas(prev => prev.filter(f => !ids.includes(f.id_factura)));
      const res = await fetch('/api/v1/facturas/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });
      if (!res.ok) throw new Error('Error en borrado');
      showToast(`${ids.length} facturas eliminadas.`);
      await loadData();
    } catch (err) {
      showToast('Error en borrado masivo.', 'error');
      await loadData();
    }
  };

  const handleExecuteReconciliation = async (tolerance: number) => {
    setIsConciliating(true);
    try {
      const res = await fetch('/api/v1/conciliacion/ejecutar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tolerancia: tolerance })
      });
      const data = await res.json();
      setConciliacionSummary(data);
      showToast(`Conciliación ejecutada con tolerancia $${tolerance} COP.`);
    } catch (err) {
      showToast('Error ejecutando conciliación.', 'error');
    } finally {
      setIsConciliating(false);
    }
  };

  const handleGenerateFlatFile = async () => {
    try {
      const res = await fetch('/api/v1/conciliacion/generar-plano-gastos', { method: 'POST' });
      const data = await res.json();
      showToast(`¡Plano contable generado con ${data.total_ajustes} asientos para Siigo Nube!`);
    } catch (err) {
      showToast('Error generando plano contable.', 'error');
    }
  };

  const handleUploadExtracto = async (file: File, banco: string, idEmpresa: number) => {
    const formData = new FormData();
    formData.append('extracto', file);
    formData.append('banco', banco);
    formData.append('id_empresa', idEmpresa.toString());
    const res = await fetch('/api/v1/conciliacion/upload-extracto', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error procesando extracto');
    showToast(data.mensaje || `Extracto de ${banco} cargado: ${data.movimientos_importados} movimientos.`);
    loadData();
    return data;
  };

  const handleApproveUser = async (id: number) => {
    try {
      setUsuarios(prev => prev.map(u => u.id_usuario === id ? { ...u, activo: true } : u));
      await fetch(`/api/v1/auth/usuarios/${id}/aprobar`, { method: 'PATCH' });
      showToast('Usuario aprobado y activado en la plataforma.');
      await loadData();
    } catch (err) {
      showToast('Error aprobando usuario.', 'error');
      await loadData();
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('¿Eliminar este usuario de la plataforma?')) return;
    try {
      setUsuarios(prev => prev.filter(u => u.id_usuario !== id));
      const res = await fetch(`/api/v1/auth/usuarios/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error eliminando usuario');
      showToast(data.mensaje || 'Usuario eliminado.');
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Error eliminando usuario.', 'error');
      await loadData();
    }
  };

  const handleToggleAdmin = async (id: number) => {
    try {
      const res = await fetch(`/api/v1/auth/usuarios/${id}/toggle-admin`, { method: 'PATCH' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error modificando permisos de administrador');
      showToast(data.mensaje || 'Estado de administrador actualizado.');
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Error modificando estado de administrador.', 'error');
      await loadData();
    }
  };

  const handleToggleActivo = async (id: number) => {
    try {
      setUsuarios(prev => prev.map(u => u.id_usuario === id ? { ...u, activo: !u.activo } : u));
      const res = await fetch(`/api/v1/auth/usuarios/${id}/toggle-activo`, { method: 'PATCH' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error al cambiar estado de acceso');
      showToast(data.mensaje || 'Estado de acceso actualizado.');
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Error al cambiar estado de acceso.', 'error');
      await loadData();
    }
  };

  const handleChangeRole = async (id: number, rol: 'Administrador' | 'Contador' | 'Analista' | 'Auditor' | 'Desarrollador') => {
    try {
      setUsuarios(prev => prev.map(u => u.id_usuario === id ? { ...u, rol } : u));
      const res = await fetch(`/api/v1/auth/usuarios/${id}/rol`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rol })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error cambiando rol');
      showToast(data.mensaje || `Rol cambiado a ${rol}.`);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Error cambiando rol.', 'error');
      await loadData();
    }
  };

  const handleUpdatePermisos = async (id: number, permisos: PermisosUsuario) => {
    try {
      const res = await fetch(`/api/v1/auth/usuarios/${id}/permisos`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permisos })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error actualizando permisos');
      showToast(data.mensaje || 'Permisos actualizados con éxito.');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Error actualizando permisos.', 'error');
    }
  };

  const handleUpdateEmpresas = async (id: number, empresas_ids: number[]) => {
    try {
      const res = await fetch(`/api/v1/auth/usuarios/${id}/empresas`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresas_ids })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error asignando empresas');
      showToast(data.mensaje || 'Empresas autorizadas actualizadas.');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Error asignando empresas.', 'error');
    }
  };

  const handleSaveSiigoConfig = async (config: { siigo_username: string; siigo_access_key: string; siigo_document_id: number }) => {
    if (!activeEmpresa) return;
    try {
      await fetch(`/api/v1/empresas/${activeEmpresa.id_empresa}/siigo-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      showToast('Configuración de credenciales Siigo guardada.');
      loadData();
    } catch (err) {
      showToast('Error guardando configuración.', 'error');
    }
  };

  const handleUpdateAvatar = async (id: number, avatar_url: string | null) => {
    try {
      const res = await fetch(`/api/v1/auth/usuarios/${id}/avatar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error actualizando imagen');
      showToast(data.mensaje || 'Identidad corporativa actualizada.');
      if (currentUser && currentUser.id_usuario === id) {
        setCurrentUser({ ...currentUser, avatar_url });
      }
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Error al actualizar imagen corporativa.', 'error');
    }
  };

  const pendingInvoices = facturas.filter(f => f.estado_revision === 'PENDIENTE').length;

  if (!currentUser) {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-br from-[#0f0a2e] via-[#1c1343] to-[#271a82] flex items-center justify-center p-4">
        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl text-xs font-bold text-white flex items-center gap-2 animate-in slide-in-from-top duration-200 ${
            toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'
          }`}>
            <span>{toast.message}</span>
          </div>
        )}

        <div className="w-full max-w-md">
          <div className="text-center mb-6 animate-in fade-in slide-in-from-bottom duration-500">
            <div className="inline-flex items-center justify-center mb-4">
              <TlmLogo variant="full" theme="dark" size="lg" />
            </div>
            <h1 className="text-white font-black text-2xl tracking-tight">Consola TLM</h1>
            <p className="text-indigo-200/80 text-sm mt-1">Contabilidad Inteligente · Sociedad BIC</p>
          </div>

          <AuthModal
            isOpen={true}
            onClose={() => {}}
            currentUser={null}
            usuarios={usuarios.length > 0 ? usuarios : (currentUser ? [] : [])}
            onSelectUser={handleSelectUser}
            onLogout={() => handleSelectUser(null)}
            onShowToast={showToast}
            onRefreshUsers={loadData}
            onUpdateAvatar={handleUpdateAvatar}
            initialTab="login"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F8F9FA] text-slate-900 font-sans antialiased overflow-hidden">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl text-xs font-bold text-white flex items-center gap-2 animate-in slide-in-from-top duration-200 ${
          toast.type === 'error' ? 'bg-red-600' : 'bg-[#271A82]'
        }`}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Main Collapsible Navigation Sidebar */}
      <Sidebar
        currentSection={currentSection}
        onSelectSection={setCurrentSection}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        activeEmpresa={activeEmpresa}
        empresas={empresas}
        onSelectEmpresa={setActiveEmpresa}
        pendingInvoicesCount={pendingInvoices}
        customLogoUrl={customLogoUrl}
        currentUser={currentUser}
        primaryColor={primaryColor}
        sidebarColor={sidebarColor}
      />

      {/* Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <Header
          currentSection={currentSection}
          activeEmpresa={activeEmpresa}
          currentUser={currentUser}
          onRefreshData={loadData}
          isRefreshing={isRefreshing}
          onOpenBrandCustomizer={() => setIsBrandModalOpen(true)}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          primaryColor={primaryColor}
        />

        {/* Banner de Advertencia de Cambio Obligatorio de Contraseña */}
        {currentUser?.requiere_cambio_password && (
          <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white px-6 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-bold shadow-md shrink-0 border-b border-amber-500/50">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse shrink-0"></span>
              <span>
                ⚠️ Acción de seguridad obligatoria: Has ingresado con una contraseña provisional asignada por el Administrador Maestro.
              </span>
            </div>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="px-3.5 py-1.5 bg-white text-amber-950 font-black rounded-xl hover:bg-amber-100 transition shadow-xs cursor-pointer active:scale-95 shrink-0 self-start sm:self-auto"
            >
              Cambiar Contraseña Ahora (8+ Alfanumérica) →
            </button>
          </div>
        )}

        {/* Dynamic Main Body */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {currentSection === 'dashboard' && (
            <DashboardView
              facturas={facturas}
              kpis={kpis}
              onNavigate={setCurrentSection}
              onQuickUpload={handleSeedDemo}
              onOpenBrandCustomizer={() => setIsBrandModalOpen(true)}
            />
          )}

          {currentSection === 'facturas' && (
            <FacturasView
              facturas={facturas}
              cuentasPUC={cuentasPUC}
              onUploadXml={handleUploadXml}
              onUploadXmlWithProgress={handleUploadXml}
              onSeedDemo={handleSeedDemo}
              onImportFromDrive={handleImportFromGoogleDrive}
              onUpdateFactura={handleUpdateFactura}
              onDeleteFactura={handleDeleteFactura}
              onBulkDelete={handleBulkDelete}
              onInspectCufe={(f) => setSelectedCufeFactura(f)}
              onOpenSiigoPush={(facts) => setSiigoPushFacturas(facts)}
            />
          )}

          {currentSection === 'centro-fiscal' && (
            <CentroFiscalView
              report={f350Report}
              onNavigateToFacturas={() => setCurrentSection('facturas')}
            />
          )}

          {currentSection === 'conciliacion' && (
            <ConciliacionView
              summary={conciliacionSummary}
              onExecuteReconciliation={handleExecuteReconciliation}
              onGenerateFlatFile={handleGenerateFlatFile}
              isRunning={isConciliating}
              onUploadExtracto={handleUploadExtracto}
              activeEmpresaId={activeEmpresa?.id_empresa || 1}
            />
          )}

          {currentSection === 'cerebro' && (
            <CerebroContableView
              cuentasPUC={cuentasPUC}
              balanceTerceros={balanceTerceros}
            />
          )}

          {currentSection === 'accesos' && (() => {
            const canManage = currentUser?.rol === 'Administrador' || currentUser?.rol === 'Desarrollador' || currentUser?.permisos?.gestion_usuarios;
            if (!canManage) {
              setTimeout(() => setCurrentSection('dashboard'), 0);
              return (
                <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                  No tiene permisos para acceder a la gestión de usuarios.
                </div>
              );
            }
            return (
              <AccesosView
                usuarios={usuarios}
                activeEmpresa={activeEmpresa}
                empresas={empresas}
                currentUser={currentUser}
                onApproveUser={handleApproveUser}
                onDeleteUser={handleDeleteUser}
                onToggleAdmin={handleToggleAdmin}
                onToggleActivo={handleToggleActivo}
                onChangeRole={handleChangeRole}
                onUpdatePermisos={handleUpdatePermisos}
                onUpdateEmpresas={handleUpdateEmpresas}
                onSaveSiigoConfig={handleSaveSiigoConfig}
                onUpdateAvatar={handleUpdateAvatar}
                onRefreshUsers={loadData}
                onShowToast={showToast}
                onSelectUser={handleSelectUser}
                primaryColor={primaryColor}
              />
            );
          })()}

          {currentSection === 'base-datos' && (() => {
            const canAccessRestrictedModules = currentUser?.rol === 'Administrador' || currentUser?.rol === 'Desarrollador';
            if (!canAccessRestrictedModules) {
              setTimeout(() => setCurrentSection('dashboard'), 0);
              return <div className="flex items-center justify-center h-full text-slate-400 text-sm">No tiene permisos para acceder a este módulo.</div>;
            }
            return (
              <BaseDatosCloudView
                currentUser={currentUser}
                onNavigateSection={setCurrentSection}
                onShowToast={showToast}
                primaryColor={primaryColor}
              />
            );
          })()}

          {currentSection === 'arquitectura' && (() => {
            const canAccessRestrictedModules = currentUser?.rol === 'Administrador' || currentUser?.rol === 'Desarrollador';
            if (!canAccessRestrictedModules) {
              setTimeout(() => setCurrentSection('dashboard'), 0);
              return <div className="flex items-center justify-center h-full text-slate-400 text-sm">No tiene permisos para acceder a este módulo.</div>;
            }
            return <ArquitecturaView />;
          })()}
        </main>
      </div>

      {/* CUFE & UBL Inspector Modal */}
      {selectedCufeFactura && (
        <CufeModal
          factura={selectedCufeFactura}
          onClose={() => setSelectedCufeFactura(null)}
        />
      )}

      {/* Siigo Nube API Push Modal */}
      {siigoPushFacturas && (
        <SiigoPushModal
          facturas={siigoPushFacturas}
          onClose={() => setSiigoPushFacturas(null)}
          onSuccess={() => {
            loadData();
            showToast('¡Comprobantes transmitidos exitosamente a Siigo Nube!');
          }}
        />
      )}

      {/* Brand Identity & Logo Customizer Modal */}
      <BrandCustomizerModal
        isOpen={isBrandModalOpen}
        onClose={() => setIsBrandModalOpen(false)}
        customLogoUrl={customLogoUrl}
        onSaveCustomLogo={handleSaveCustomLogo}
        primaryColor={primaryColor}
        sidebarColor={sidebarColor}
        currentUser={currentUser}
        onSwitchToJuan={() => {
          const juan = usuarios.find(u => u.id_usuario === 1 || u.email === 'automatizaciones@tlm.net.co') || usuarios[0];
          if (juan) {
            handleSelectUser(juan);
            showToast('Sesión cambiada a Juan Yaya (Administrador Maestro).');
          }
        }}
      />

      {/* Authentication & User Switcher Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        usuarios={usuarios}
        onSelectUser={handleSelectUser}
        onLogout={() => handleSelectUser(null)}
        onShowToast={showToast}
        onRefreshUsers={loadData}
        onUpdateAvatar={handleUpdateAvatar}
        initialTab={currentUser?.requiere_cambio_password ? 'cambio_obligatorio' : 'login'}
      />
    </div>
  );
}
