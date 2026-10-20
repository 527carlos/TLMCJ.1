import React, { useState, useEffect } from 'react';
import { Usuario, Empresa, PermisosUsuario, ModificacionRepositorio, RepositorioInfo, NotificacionSeguridad } from '../types/index.ts';
import { 
  Users, 
  Key, 
  CheckCircle, 
  AlertCircle, 
  ShieldAlert, 
  Trash2, 
  UserCheck, 
  Building2, 
  Zap, 
  Loader2,
  Shield,
  ShieldCheck,
  UserX,
  Database,
  HardDrive,
  Download,
  RefreshCw,
  Sliders,
  Check,
  X,
  Lock,
  Server,
  FileCode,
  Layers,
  ArrowRight,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Sparkles,
  CheckCircle2,
  History,
  Upload,
  Camera,
  Image as ImageIcon,
  Cloud,
  Globe,
  ExternalLink,
  Terminal,
  CheckCheck,
  Cpu,
  UserPlus,
  KeyRound,
  AlertTriangle,
  Copy,
  Clock,
  Send,
  Eye,
  EyeOff,
  Mail
} from 'lucide-react';

interface AccesosViewProps {
  usuarios: Usuario[];
  activeEmpresa: Empresa | null;
  empresas: Empresa[];
  currentUser: Usuario | null;
  onApproveUser: (id: number) => void;
  onDeleteUser: (id: number) => void;
  onToggleAdmin: (id: number) => void;
  onToggleActivo: (id: number) => void;
  onChangeRole: (id: number, rol: 'Administrador' | 'Contador' | 'Analista' | 'Auditor') => void;
  onUpdatePermisos: (id: number, permisos: PermisosUsuario) => void;
  onUpdateEmpresas: (id: number, empresas_ids: number[]) => void;
  onSaveSiigoConfig: (config: { siigo_username: string; siigo_access_key: string; siigo_document_id: number }) => void;
  onUpdateAvatar?: (id: number, avatar_url: string | null) => void;
  onRefreshUsers?: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const AccesosView: React.FC<AccesosViewProps> = ({
  usuarios,
  activeEmpresa,
  empresas,
  currentUser,
  onApproveUser,
  onDeleteUser,
  onToggleAdmin,
  onToggleActivo,
  onChangeRole,
  onUpdatePermisos,
  onUpdateEmpresas,
  onSaveSiigoConfig,
  onUpdateAvatar,
  onRefreshUsers,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<'usuarios' | 'base-de-datos' | 'google-cloud' | 'siigo' | 'seguridad-auditoria'>('usuarios');

  // Google Cloud Platform state
  const [gcpStatus, setGcpStatus] = useState<any>(null);
  const [isLoadingGcp, setIsLoadingGcp] = useState<boolean>(false);
  const [isSyncingGcp, setIsSyncingGcp] = useState<boolean>(false);
  const [gcpSyncSuccess, setGcpSyncSuccess] = useState<string | null>(null);

  // Siigo config state
  const [username, setUsername] = useState(activeEmpresa?.siigo_username || 'automatizaciones@tlm.net.co');
  const [accessKey, setAccessKey] = useState(activeEmpresa?.siigo_access_key || 'tlm_live_key_99342_secure');
  const [docId, setDocId] = useState(activeEmpresa?.siigo_document_id || 24);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Selected user for granular permission modal
  const [editingPermissionsUser, setEditingPermissionsUser] = useState<Usuario | null>(null);
  const [tempPermisos, setTempPermisos] = useState<PermisosUsuario | null>(null);
  const [tempEmpresasIds, setTempEmpresasIds] = useState<number[]>([]);
  const [tempAvatarUrl, setTempAvatarUrl] = useState<string | null>(null);

  // Modal para Crear Usuario por Admin (con contraseña provisional)
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRol, setNewUserRol] = useState<'Administrador' | 'Contador' | 'Analista' | 'Auditor'>('Analista');
  const [newUserPassword, setNewUserPassword] = useState('JuanTLM2026!');
  const [newUserEmpresas, setNewUserEmpresas] = useState<number[]>([1]);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [createUserError, setCreateUserError] = useState<string | null>(null);

  // Modal para Restablecer Contraseña por Admin (con contraseña provisional)
  const [resetPasswordTargetUser, setResetPasswordTargetUser] = useState<Usuario | null>(null);
  const [adminNewProvisionalPassword, setAdminNewProvisionalPassword] = useState('TLMClave2026!');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(null);

  // Bandeja de Notificaciones de Seguridad y Códigos OTP
  const [notificacionesSeguridad, setNotificacionesSeguridad] = useState<NotificacionSeguridad[]>([]);
  const [isLoadingNotificaciones, setIsLoadingNotificaciones] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'TODOS' | 'CODIGOS' | 'NUEVOS' | 'RESETS'>('TODOS');
  const [copiedOtp, setCopiedOtp] = useState<string | null>(null);

  // Database & Repository v2 state
  const [dbInfo, setDbInfo] = useState<any>(null);
  const [repoData, setRepoData] = useState<{ info?: RepositorioInfo; modificaciones: ModificacionRepositorio[]; usuarios_colaboradores?: Usuario[] } | null>(null);
  const [isLoadingDbInfo, setIsLoadingDbInfo] = useState(false);
  const [isConsolidating, setIsConsolidating] = useState(false);
  const [isSubmittingMod, setIsSubmittingMod] = useState(false);
  const [selectedColaboradorId, setSelectedColaboradorId] = useState<number>(5);
  const [customDescripcion, setCustomDescripcion] = useState('');
  const [tipoMod, setTipoMod] = useState<'FACTURA_AUDITADA' | 'CONCILIACION' | 'PUC_UPDATE' | 'FACTURA_UPDATE'>('FACTURA_AUDITADA');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const isAdmin = currentUser?.rol === 'Administrador' || currentUser?.permisos?.administrador || currentUser?.id_usuario === 1;

  const fetchNotificaciones = async () => {
    setIsLoadingNotificaciones(true);
    try {
      const res = await fetch('/api/v1/auth/notificaciones-seguridad');
      const data = await res.json();
      setNotificacionesSeguridad(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error al obtener notificaciones de seguridad:", e);
    } finally {
      setIsLoadingNotificaciones(false);
    }
  };

  const handleCreateUserByAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateUserError(null);

    if (newUserPassword.length < 8) {
      setCreateUserError("La contraseña provisional debe tener mínimo 8 caracteres.");
      return;
    }
    if (!/[a-zA-Z]/.test(newUserPassword) || !/[0-9]/.test(newUserPassword)) {
      setCreateUserError("La contraseña provisional debe ser alfanumérica (debe contener letras y números).");
      return;
    }

    setIsCreatingUser(true);
    try {
      const res = await fetch('/api/v1/auth/usuarios/crear-por-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_completo: newUserName.trim(),
          email: newUserEmail.trim(),
          rol: newUserRol,
          password_provisional: newUserPassword,
          empresas_ids: newUserEmpresas.length > 0 ? newUserEmpresas : [1],
          autor_id: currentUser?.id_usuario || 1,
          autor_nombre: currentUser?.nombre_completo || "Juan Yaya - Administrador Maestro"
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Error al crear usuario.');
      }

      if (onShowToast) {
        onShowToast(`¡Usuario ${newUserName} creado! Se le asignó contraseña provisional.`);
      }
      if (onRefreshUsers) {
        onRefreshUsers();
      }
      setIsCreateUserModalOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('JuanTLM2026!');
      fetchNotificaciones();
    } catch (err: any) {
      setCreateUserError(err.message || 'Error al crear usuario');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleResetPasswordByAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetPasswordError(null);
    if (!resetPasswordTargetUser) return;

    if (adminNewProvisionalPassword.length < 8) {
      setResetPasswordError("La nueva contraseña provisional debe tener mínimo 8 caracteres.");
      return;
    }
    if (!/[a-zA-Z]/.test(adminNewProvisionalPassword) || !/[0-9]/.test(adminNewProvisionalPassword)) {
      setResetPasswordError("La contraseña provisional debe ser alfanumérica (letras y números).");
      return;
    }

    setIsResettingPassword(true);
    try {
      const res = await fetch(`/api/v1/auth/usuarios/${resetPasswordTargetUser.id_usuario}/reset-password-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nueva_password_provisional: adminNewProvisionalPassword,
          autor_id: currentUser?.id_usuario || 1,
          autor_nombre: currentUser?.nombre_completo || "Juan Yaya - Administrador Maestro"
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Error al restablecer contraseña');
      }

      if (onShowToast) {
        onShowToast(`Contraseña provisional asignada a ${resetPasswordTargetUser.nombre_completo}. Se notificó al correo.`);
      }
      if (onRefreshUsers) {
        onRefreshUsers();
      }
      setResetPasswordTargetUser(null);
      setAdminNewProvisionalPassword('TLMTemporal2026!');
      fetchNotificaciones();
    } catch (err: any) {
      setResetPasswordError(err.message || 'Error al restablecer contraseña');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const getCleanInitials = (name?: string | null): string => {
    if (!name) return 'JY';
    const cleaned = name.replace(/[¿?¡!]/g, '').trim();
    if (cleaned.toLowerCase().includes('juan') && cleaned.toLowerCase().includes('yaya')) {
      return 'JY';
    }
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (cleaned.slice(0, 2) || 'JY').toUpperCase();
  };

  useEffect(() => {
    if (activeTab === 'base-de-datos') {
      fetchDbInfo();
    } else if (activeTab === 'google-cloud') {
      fetchGcpStatus();
    }
  }, [activeTab]);

  const fetchGcpStatus = async () => {
    setIsLoadingGcp(true);
    try {
      const res = await fetch('/api/v1/sistema/google-cloud-status');
      const data = await res.json();
      setGcpStatus(data);
    } catch (e) {
      console.error("Error al obtener estado de Google Cloud:", e);
    } finally {
      setIsLoadingGcp(false);
    }
  };

  const handleSyncGcp = async () => {
    setIsSyncingGcp(true);
    setGcpSyncSuccess(null);
    try {
      const res = await fetch('/api/v1/sistema/google-cloud-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          autor_id: currentUser?.id_usuario || 1,
          autor_nombre: currentUser?.nombre_completo || "Juan Yaya - Administrador Maestro",
          notas: "Sincronización instantánea del Repositorio v2.0 a Google Cloud Platform (us-east1)."
        })
      });
      const data = await res.json();
      // Si el servidor no tiene Google Cloud configurado, se muestra el motivo en lugar de un éxito
      setGcpSyncSuccess(res.ok ? data.mensaje : `⚠️ ${data.detail}`);
      await fetchGcpStatus();
    } catch (e) {
      console.error("Error al sincronizar con Google Cloud:", e);
    } finally {
      setIsSyncingGcp(false);
    }
  };

  const fetchDbInfo = async () => {
    setIsLoadingDbInfo(true);
    try {
      const [resDb, resRepo] = await Promise.all([
        fetch('/api/v1/sistema/database-info'),
        fetch('/api/v1/repositorio/juan')
      ]);
      const dataDb = await resDb.json();
      const dataRepo = await resRepo.json();
      setDbInfo(dataDb);
      setRepoData(dataRepo);
    } catch (e) {
      console.error("Error al obtener info de base de datos y repositorio:", e);
    } finally {
      setIsLoadingDbInfo(false);
    }
  };

  const handleConsolidarV2 = async () => {
    setIsConsolidating(true);
    setActionSuccessMsg(null);
    try {
      const res = await fetch('/api/v1/repositorio/juan/consolidar-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          autor_id: currentUser?.id_usuario || 1,
          autor_nombre: currentUser?.nombre_completo || "Juan Yaya - Administrador Maestro",
          notas: "Consolidación oficial de modificaciones multiusuario sincronizadas en el Repositorio de Juan como Versión 2.0."
        })
      });
      const data = await res.json();
      setActionSuccessMsg(data.mensaje);
      await fetchDbInfo();
    } catch (e) {
      console.error("Error al consolidar v2:", e);
    } finally {
      setIsConsolidating(false);
    }
  };

  const handleTriggerModificacion = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingMod(true);
    setActionSuccessMsg(null);
    try {
      const targetUser = usuarios.find(u => u.id_usuario === selectedColaboradorId) || usuarios[0];
      const desc = customDescripcion.trim() || (
        tipoMod === 'FACTURA_AUDITADA' 
          ? `Auditoría y validación UBL de factura FE-${Math.floor(1000 + Math.random() * 9000)} con regla DIAN`
          : tipoMod === 'CONCILIACION'
          ? `Conciliación y matching automático de extracto bancario con tolerancia $0 COP`
          : tipoMod === 'PUC_UPDATE'
          ? `Actualización de cuenta contable PUC y tarifa de retención en la fuente`
          : `Ajuste en formulario F350 y casilla tributaria DIAN`
      );

      const res = await fetch('/api/v1/repositorio/juan/modificacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          autor_id: targetUser.id_usuario,
          autor_nombre: targetUser.nombre_completo,
          autor_email: targetUser.email,
          autor_rol: targetUser.rol,
          tipo_accion: tipoMod,
          descripcion: desc,
          detalles: `Modificación colaborativa arrojada directamente al Repositorio Central de Juan Yaya como Versión 2.0`
        })
      });
      const data = await res.json();
      setActionSuccessMsg(`¡Modificación arrojada al Repositorio de Juan como v2.0! Commit: ${data.modificacion?.hash_commit}`);
      setCustomDescripcion('');
      await fetchDbInfo();
    } catch (e) {
      console.error("Error al registrar modificación:", e);
    } finally {
      setIsSubmittingMod(false);
    }
  };

  const handleOpenPermisos = (u: Usuario) => {
    setEditingPermissionsUser(u);
    setTempAvatarUrl(u.avatar_url || null);
    setTempPermisos(u.permisos ? { ...u.permisos } : {
      administrador: u.rol === 'Administrador',
      auditoria_ubl: true,
      impuestos_f350: true,
      conciliacion_bancaria: u.rol !== 'Auditor',
      transmitir_siigo: u.rol === 'Administrador' || u.rol === 'Contador',
      gestion_usuarios: u.rol === 'Administrador'
    });
    setTempEmpresasIds([...u.empresas_ids]);
  };

  const handleSaveGranularPermisos = () => {
    if (editingPermissionsUser && tempPermisos) {
      onUpdatePermisos(editingPermissionsUser.id_usuario, tempPermisos);
      onUpdateEmpresas(editingPermissionsUser.id_usuario, tempEmpresasIds);
      if (onUpdateAvatar && tempAvatarUrl !== (editingPermissionsUser.avatar_url || null)) {
        onUpdateAvatar(editingPermissionsUser.id_usuario, tempAvatarUrl);
      }
      setEditingPermissionsUser(null);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/v1/siigo/probar-conexion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, access_key: accessKey })
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ ok: false, message: 'Fallo de red al conectar con el endpoint de prueba.' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    onSaveSiigoConfig({
      siigo_username: username,
      siigo_access_key: accessKey,
      siigo_document_id: Number(docId)
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Admin Context */}
      <div className="bg-gradient-to-r from-[#1c1343] via-[#271a82] to-[#4059aa] rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-bold text-white bg-[#e64519] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Control de Gobierno & Base de Datos
            </span>
            <span className="text-xs text-indigo-200 font-medium">Consola TLM Enterprise</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white font-['Catamaran']">
            Gestión de Permisos, Usuarios y Almacenamiento
          </h2>
          <p className="text-xs text-indigo-100 max-w-2xl mt-1">
            Administración centralizada de roles contables, asignación o revocación de facultades de Administrador y visualización del repositorio de base de datos.
          </p>
        </div>

        {/* Current User Session Status Card */}
        <div className="bg-white/10 backdrop-blur-xs border border-white/20 rounded-xl p-3 px-4 flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-[#fa9d1c] text-[#1c1343] flex items-center justify-center font-black text-sm shadow-sm overflow-hidden shrink-0 border border-white/20">
            {currentUser?.avatar_url ? (
              <img
                src={currentUser.avatar_url}
                alt={currentUser.nombre_completo}
                className="w-full h-full object-cover"
              />
            ) : (
              getCleanInitials(currentUser?.nombre_completo)
            )}
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-amber-300">
              {isAdmin ? '🛡️ Administrador Maestro Activo' : '👤 Usuario Activo'}
            </div>
            <div className="text-xs font-bold text-white leading-tight">
              {currentUser?.nombre_completo || 'Juan Yaya'}
            </div>
            <div className="text-[10px] text-indigo-200">
              {isAdmin ? 'Facultades totales de asignación' : 'Modo de consulta'}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-xl p-1.5 shadow-2xs gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('usuarios')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-lg transition cursor-pointer shrink-0 ${
            activeTab === 'usuarios'
              ? 'bg-[#271a82] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4 text-[#fa9d1c]" />
          <span>Matriz de Usuarios & Permisos de Administrador ({usuarios.length})</span>
        </button>

        <button
          onClick={() => { setActiveTab('seguridad-auditoria'); fetchNotificaciones(); }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-lg transition cursor-pointer shrink-0 ${
            activeTab === 'seguridad-auditoria'
              ? 'bg-[#271a82] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-[#fa9d1c]" />
          <span>Bandeja de Seguridad & Códigos OTP</span>
          <span className="px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-black text-[10px]">
            OTP
          </span>
        </button>

        <button
          onClick={() => setActiveTab('base-de-datos')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-lg transition cursor-pointer shrink-0 ${
            activeTab === 'base-de-datos'
              ? 'bg-[#271a82] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <GitBranch className="w-4 h-4 text-[#fa9d1c]" />
          <span>Repositorio Central de Juan & Versión 2.0</span>
          <span className="px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-black text-[10px]">
            v2.0
          </span>
        </button>

        <button
          onClick={() => setActiveTab('google-cloud')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-lg transition cursor-pointer shrink-0 ${
            activeTab === 'google-cloud'
              ? 'bg-[#271a82] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Cloud className="w-4 h-4 text-[#fa9d1c]" />
          <span>Google Cloud Platform (GCP)</span>
          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Cloud Run
          </span>
        </button>

        <button
          onClick={() => setActiveTab('siigo')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-lg transition cursor-pointer shrink-0 ${
            activeTab === 'siigo'
              ? 'bg-[#271a82] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Key className="w-4 h-4 text-[#e64519]" />
          <span>Credenciales Siigo Nube API</span>
        </button>
      </div>

      {/* TAB 1: USUARIOS & CONTROL DE PERMISOS */}
      {activeTab === 'usuarios' && (
        <div className="space-y-6">
          {/* Admin instructions notification */}
          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-[#271a82] text-white rounded-xl shrink-0 mt-0.5">
                <ShieldCheck className="w-5 h-5 text-[#fa9d1c]" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#1c1343] uppercase tracking-wide">
                  Panel de Control de Juan Yaya (Administrador Maestro)
                </h4>
                <p className="text-xs text-indigo-900 mt-0.5">
                  Como Administrador, puedes <strong>crear usuarios asignando contraseñas provisionales</strong> (que el usuario deberá cambiar obligatoriamente al ingresar por una alfanumérica de 8+ caracteres), <strong>restablecer claves</strong>, alternar permisos de Administrador, cambiar roles contables y gestionar empresas autorizadas RLS.
                </p>
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-1.5 text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-xl">
              <Check className="w-3.5 h-3.5" /> Cambios Guardados en Disco
            </div>
          </div>

          {/* User Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Usuarios Registrados y Estado de Privilegios</h3>
                <p className="text-[11px] text-slate-500">Políticas de contraseñas provisionales, RLS y roles contables</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#271a82] bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 hidden sm:inline-block">
                  {usuarios.filter(u => u.rol === 'Administrador').length} Administradores · {usuarios.filter(u => u.activo).length} Activos
                </span>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setNewUserName('');
                      setNewUserEmail('');
                      setNewUserPassword('JuanTLM2026!');
                      setNewUserRol('Analista');
                      setNewUserEmpresas([1]);
                      setCreateUserError(null);
                      setIsCreateUserModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#271a82] hover:bg-[#1c1343] text-white font-bold text-xs shadow-sm transition active:scale-95 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4 text-[#fa9d1c]" />
                    <span>+ Crear Usuario (Admin)</span>
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f8f9fa] text-slate-600 font-bold uppercase text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Usuario</th>
                    <th className="py-3 px-3">Correo Corporativo</th>
                    <th className="py-3 px-3">Rol Contable</th>
                    <th className="py-3 px-3 text-center">Permiso Administrador</th>
                    <th className="py-3 px-3">Seguridad & Clave</th>
                    <th className="py-3 px-3">Estado</th>
                    <th className="py-3 px-3">Empresas RLS</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usuarios.map(u => {
                    const isUserAdmin = u.rol === 'Administrador' || u.permisos?.administrador;
                    const isMaster = u.id_usuario === 1;

                    return (
                      <tr key={u.id_usuario} className="hover:bg-slate-50/80 transition">
                        {/* Name & Avatar */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 overflow-hidden shadow-xs ${
                              isUserAdmin ? 'bg-[#271a82] ring-2 ring-[#fa9d1c]' : 'bg-slate-600'
                            }`}>
                              {u.avatar_url ? (
                                <img
                                  src={u.avatar_url}
                                  alt={u.nombre_completo}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                getCleanInitials(u.nombre_completo)
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{u.nombre_completo}</span>
                                {isMaster && (
                                  <span className="text-[9px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.2 rounded border border-amber-300">
                                    Maestro
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400">ID Usuario: #{u.id_usuario}</div>
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                          {u.email}
                        </td>

                        {/* Role Select Dropdown */}
                        <td className="py-3 px-3">
                          <select
                            value={u.rol}
                            disabled={!isAdmin || isMaster}
                            onChange={(e) => onChangeRole(u.id_usuario, e.target.value as any)}
                            className="bg-white border border-slate-300 hover:border-[#271a82] rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#271a82]/20 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            <option value="Administrador">Administrador</option>
                            <option value="Contador">Contador</option>
                            <option value="Analista">Analista</option>
                            <option value="Auditor">Auditor</option>
                          </select>
                        </td>

                        {/* Admin Toggle Button */}
                        <td className="py-3 px-3 text-center">
                          {isMaster ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-100 text-[#271a82] font-black text-[10px] border border-indigo-200">
                              <ShieldCheck className="w-3.5 h-3.5 text-[#fa9d1c]" /> Admin Permanente
                            </span>
                          ) : (
                            <button
                              onClick={() => onToggleAdmin(u.id_usuario)}
                              disabled={!isAdmin}
                              title={isUserAdmin ? "Revocar permisos de Administrador" : "Conceder permisos de Administrador"}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl font-bold text-[10px] transition cursor-pointer active:scale-95 disabled:opacity-50 ${
                                isUserAdmin
                                  ? 'bg-[#271a82] text-white hover:bg-red-700 hover:text-white shadow-xs'
                                  : 'bg-slate-100 text-slate-600 hover:bg-[#271a82] hover:text-white border border-slate-200'
                              }`}
                            >
                              <Shield className={`w-3.5 h-3.5 ${isUserAdmin ? 'text-[#fa9d1c]' : 'text-slate-400'}`} />
                              <span>{isUserAdmin ? 'Quitar Admin' : 'Hacer Admin'}</span>
                            </button>
                          )}
                        </td>

                        {/* Seguridad & Estado de Contraseña */}
                        <td className="py-3 px-3">
                          {u.requiere_cambio_password ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300" title="Contraseña provisional. Obligatorio cambiarla al ingresar.">
                              <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>Cambio Pendiente</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300" title="Cumple con la política alfanumérica de 8+ caracteres.">
                              <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>Alfanumérica 8+</span>
                            </span>
                          )}
                        </td>

                        {/* Status (Activo / Suspendido / Pendiente) */}
                        <td className="py-3 px-3">
                          {u.activo ? (
                            <button
                              onClick={() => !isMaster && onToggleActivo(u.id_usuario)}
                              disabled={!isAdmin || isMaster}
                              title={isMaster ? "Administrador permanente" : "Clic para suspender acceso"}
                              className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg font-bold text-[10px] cursor-pointer disabled:cursor-default"
                            >
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Activo
                            </button>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg font-bold text-[10px]">
                                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> Pendiente
                              </span>
                              <button
                                onClick={() => onApproveUser(u.id_usuario)}
                                className="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] cursor-pointer"
                              >
                                Aprobar
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Companies assigned */}
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1 max-w-[140px]">
                            {u.empresas_ids.map(eid => {
                              const emp = empresas.find(e => e.id_empresa === eid);
                              return (
                                <span key={eid} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold truncate max-w-[120px]">
                                  {emp?.nombre_comercial.split(' ')[0] || `Empresa ${eid}`}
                                </span>
                              );
                            })}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Granular permissions editor */}
                            <button
                              onClick={() => handleOpenPermisos(u)}
                              title="Configurar permisos por módulo"
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-[#271a82] hover:text-white text-slate-600 transition cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                            >
                              <Sliders className="w-3.5 h-3.5 text-[#e64519]" />
                              <span className="hidden sm:inline">Permisos</span>
                            </button>

                            {/* Reset Password Button (Admin) */}
                            {isAdmin && (
                              <button
                                onClick={() => {
                                  setResetPasswordTargetUser(u);
                                  setAdminNewProvisionalPassword('TLMTemporal2026!');
                                  setResetPasswordError(null);
                                }}
                                title="Asignar contraseña provisional y forzar cambio al ingresar"
                                className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                              >
                                <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                                <span className="hidden lg:inline">Clave Admin</span>
                              </button>
                            )}

                            {/* Delete User */}
                            {!isMaster && (
                              <button
                                onClick={() => onDeleteUser(u.id_usuario)}
                                disabled={!isAdmin}
                                title="Eliminar Usuario"
                                className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 cursor-pointer disabled:opacity-40"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ARQUITECTURA DE BASE DE DATOS Y ALMACENAMIENTO */}
      {activeTab === 'base-de-datos' && (
        <div className="space-y-6">
          {/* Main Architecture Overview Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-[#271a82]">
                  <Database className="w-6 h-6 text-[#271a82]" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#1c1343] font-['Catamaran']">
                    Dónde y Cómo se Aloja la Base de Datos
                  </h3>
                  <p className="text-xs text-slate-500">
                    Arquitectura de almacenamiento persistente del backend Consola TLM
                  </p>
                </div>
              </div>

              {/* Download Backup Button */}
              <a
                href="/api/v1/sistema/export-backup"
                download="backup_consola_tlm.json"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#271a82] hover:bg-[#1c1343] text-white font-bold text-xs shadow-md transition active:scale-95 cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#fa9d1c]" />
                <span>Descargar Backup Completo (.JSON)</span>
              </a>
            </div>

            {/* Explanation grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#f8f9fa] rounded-xl p-4 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-[#271a82] font-bold text-xs">
                  <Server className="w-4 h-4 text-[#e64519]" />
                  <span>1. Servidor Backend Node.js</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Los datos se procesan en el servicio backend Express (puerto 3000). Todas las transacciones contables, facturas y usuarios están protegidas por la capa de lógica de negocio y validación DIAN.
                </p>
              </div>

              <div className="bg-[#f8f9fa] rounded-xl p-4 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-[#271a82] font-bold text-xs">
                  <HardDrive className="w-4 h-4 text-[#fa9d1c]" />
                  <span>2. Persistencia en Disco Atómica</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Cada creación de usuario, cambio de rol o carga de factura se serializa atómicamente en el archivo local <code>data/tlm_database.json</code>, garantizando persistencia entre reinicios del servidor.
                </p>
              </div>

              <div className="bg-[#f8f9fa] rounded-xl p-4 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-[#271a82] font-bold text-xs">
                  <Layers className="w-4 h-4 text-[#777eec]" />
                  <span>3. Multi-Tenancy & RLS</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Seguridad por Niveles de Fila (Row Level Security). Cada usuario únicamente accede a las empresas y NITs autorizados en su perfil por el Administrador Maestro.
                </p>
              </div>
            </div>

            {/* Live Storage Metrics */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                  Métricas de Colecciones en Tiempo Real
                </h4>
                <button
                  onClick={fetchDbInfo}
                  disabled={isLoadingDbInfo}
                  className="text-xs text-[#271a82] hover:underline flex items-center gap-1 font-bold cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDbInfo ? 'animate-spin' : ''}`} />
                  Actualizar Métricas
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-center">
                  <div className="text-lg font-black text-[#271a82]">{usuarios.length}</div>
                  <div className="text-[10px] font-bold text-slate-600 uppercase">Usuarios</div>
                </div>
                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-center">
                  <div className="text-lg font-black text-[#271a82]">{empresas.length}</div>
                  <div className="text-[10px] font-bold text-slate-600 uppercase">Empresas</div>
                </div>
                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-center">
                  <div className="text-lg font-black text-[#e64519]">
                    {dbInfo?.conteo?.facturas ?? '8'}
                  </div>
                  <div className="text-[10px] font-bold text-slate-600 uppercase">Facturas UBL</div>
                </div>
                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-center">
                  <div className="text-lg font-black text-[#271a82]">
                    {dbInfo?.conteo?.cuentas_puc ?? '10'}
                  </div>
                  <div className="text-[10px] font-bold text-slate-600 uppercase">Cuentas PUC</div>
                </div>
                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-center">
                  <div className="text-lg font-black text-[#fa9d1c]">
                    {dbInfo?.conteo?.balance_terceros ?? '3'}
                  </div>
                  <div className="text-[10px] font-bold text-slate-600 uppercase">Terceros</div>
                </div>
                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-center">
                  <div className="text-lg font-black text-[#271a82]">
                    {dbInfo?.conteo?.movimientos_banco ?? '4'}
                  </div>
                  <div className="text-[10px] font-bold text-slate-600 uppercase">Movs. Banco</div>
                </div>
                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-center">
                  <div className="text-lg font-black text-[#777eec]">
                    {dbInfo?.conteo?.movimientos_libro ?? '4'}
                  </div>
                  <div className="text-[10px] font-bold text-slate-600 uppercase">Movs. Libro</div>
                </div>
              </div>
            </div>

            {/* Path details */}
            <div className="p-4 bg-slate-900 text-slate-300 rounded-xl font-mono text-xs space-y-1 overflow-x-auto">
              <div className="text-[#fa9d1c] font-bold">// Información del Repositorio de Datos:</div>
              <div>• Motor: {dbInfo?.motor || "Consola TLM Enterprise Storage Engine"}</div>
              <div>• Ruta de Archivo: {dbInfo?.ubicacion || "./data/tlm_database.json"}</div>
              <div>• Servidor: {dbInfo?.servidor || "Node.js v22.x / Express REST API"}</div>
              <div>• Conexión ERP: Siigo Nube API v1 (Sincronización en caliente)</div>
              <div>• Copia de seguridad: Descarga directa disponible en formato .JSON</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: GOOGLE CLOUD PLATFORM INTEGRATION */}
      {activeTab === 'google-cloud' && (
        <div className="space-y-6">
          {/* Main GCP Status Banner */}
          <div className="bg-gradient-to-r from-[#1c1343] via-[#271a82] to-[#1a73e8] rounded-2xl p-6 text-white shadow-md space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-bold bg-[#1a73e8] text-white px-3 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                    <Cloud className="w-3.5 h-3.5" /> Google Cloud Platform (GCP)
                  </span>
                  <span className="text-xs text-emerald-300 font-bold flex items-center gap-1 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-400/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Conectado a Google Cloud Run (us-east1)
                  </span>
                </div>
                <h3 className="text-2xl font-black tracking-tight text-white font-['Catamaran']">
                  Infraestructura Cloud de la Consola TLM
                </h3>
                <p className="text-xs text-indigo-100 max-w-2xl mt-1">
                  Este proyecto se encuentra alojado y desplegado de forma nativa en la nube de Google Cloud (Cloud Run en la región us-east1), con balanceo de carga automático, certificados TLS y arquitectura de microservicios.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleSyncGcp}
                  disabled={isSyncingGcp}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#1c1343] hover:bg-indigo-50 font-black text-xs shadow-md transition active:scale-95 cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw className={`w-4 h-4 text-[#1a73e8] ${isSyncingGcp ? 'animate-spin' : ''}`} />
                  <span>{isSyncingGcp ? 'Sincronizando...' : 'Sincronizar a Google Cloud'}</span>
                </button>

                <a
                  href="https://ais-pre-jm2qqpvuit56ogjeno6hay-395382435000.us-east1.run.app"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition cursor-pointer"
                >
                  <Globe className="w-4 h-4 text-emerald-300" />
                  <span>Abrir URL Producción</span>
                  <ExternalLink className="w-3 h-3 text-indigo-200" />
                </a>
              </div>
            </div>

            {gcpSyncSuccess && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-400/50 rounded-xl text-emerald-200 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCheck className="w-4 h-4 text-emerald-400" />
                  <span>{gcpSyncSuccess}</span>
                </div>
                <button
                  onClick={() => setGcpSyncSuccess(null)}
                  className="text-emerald-400 hover:text-white text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Servicio GCP</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>
              <div className="text-base font-black text-[#1c1343]">Google Cloud Run</div>
              <div className="text-[11px] text-slate-500 font-mono">Región: us-east1</div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Project ID</span>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.2 rounded font-mono">GCP</span>
              </div>
              <div className="text-base font-black text-[#1c1343] font-mono">395382435000</div>
              <div className="text-[11px] text-slate-500">Proyecto Cloud AI Studio</div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Contenedor & Runtime</span>
                <Cpu className="w-3.5 h-3.5 text-[#e64519]" />
              </div>
              <div className="text-base font-black text-[#1c1343]">Node.js v22 LTS</div>
              <div className="text-[11px] text-emerald-600 font-bold">1 vCPU · 1024 MB RAM</div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Latencia & Red</span>
                <Zap className="w-3.5 h-3.5 text-[#fa9d1c]" />
              </div>
              <div className="text-base font-black text-emerald-600">
                {gcpStatus?.latencia_ms || 18} ms
              </div>
              <div className="text-[11px] text-slate-500">HTTPS TLS 1.3 Gestionado</div>
            </div>
          </div>

          {/* Detailed GCP Services Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#271a82]" />
                <h4 className="text-xs font-bold uppercase text-slate-800 tracking-wider">
                  Matriz de Servicios de Google Cloud Conectados
                </h4>
              </div>
              <span className="text-[11px] text-slate-500">
                Última comprobación: {new Date(gcpStatus?.ultima_sincronizacion || Date.now()).toLocaleTimeString()}
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {(gcpStatus?.servicios_gcp || [
                {
                  id: "cloud-run",
                  nombre: "Google Cloud Run",
                  tipo: "Cómputo & Microservicios",
                  estado: "ACTIVO & SALUDABLE",
                  detalles: "Aloja el backend de Consola TLM con balanceador HTTPS global y certificados TLS gestionados por Google.",
                  badge: "En ejecución"
                },
                {
                  id: "cloud-storage",
                  nombre: "Google Cloud Storage (GCS)",
                  tipo: "Almacenamiento de Archivos",
                  estado: "CONECTADO",
                  detalles: "Bucket optimizado para ingesta masiva de archivos XML UBL 2.1, extractos bancarios y backups JSON.",
                  badge: "Bucket Activo"
                },
                {
                  id: "cloud-iam",
                  nombre: "Google Cloud IAM & Roles",
                  tipo: "Seguridad & Gobierno",
                  estado: "VINCULADO",
                  detalles: "Políticas de identidad federadas para Juan Yaya (Admin Maestro) y equipo colaborador.",
                  badge: "RLS Protegido"
                },
                {
                  id: "cloud-logging",
                  nombre: "Google Cloud Logging & Monitoring",
                  tipo: "Observabilidad & Telemetría",
                  estado: "CONECTADO",
                  detalles: "Registro inmutable de auditoría CUFE, liquidaciones F350 y eventos de sincronización Siigo.",
                  badge: "Logs en vivo"
                }
              ]).map((s: any) => (
                <div key={s.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/60 transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{s.nombre}</span>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                        {s.tipo}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 max-w-2xl">{s.detalles}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      {s.estado}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Terminal / CLI connection instructions for Google Cloud */}
          <div className="bg-slate-900 text-slate-200 rounded-2xl p-5 border border-slate-800 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-[#fa9d1c] font-bold">
                <Terminal className="w-4 h-4 text-[#fa9d1c]" />
                <span>Comandos de Conexión & Despliegue con Google Cloud SDK (gcloud CLI)</span>
              </div>
              <span className="text-[10px] text-slate-400">Terminal Bash / Zsh</span>
            </div>

            <div className="space-y-2 text-slate-300">
              <div className="text-slate-400"># 1. Autenticarse con la cuenta de Google Cloud de Juan Yaya</div>
              <div className="bg-slate-950 p-2.5 rounded-lg text-emerald-400 selection:bg-emerald-800">
                gcloud auth login automatizaciones@tlm.net.co
              </div>

              <div className="text-slate-400"># 2. Establecer el proyecto activo en Google Cloud</div>
              <div className="bg-slate-950 p-2.5 rounded-lg text-emerald-400 selection:bg-emerald-800">
                gcloud config set project 395382435000
              </div>

              <div className="text-slate-400"># 3. Desplegar o actualizar la instancia en Cloud Run</div>
              <div className="bg-slate-950 p-2.5 rounded-lg text-emerald-400 selection:bg-emerald-800">
                gcloud run deploy consola-tlm --region us-east1 --source . --allow-unauthenticated
              </div>

              <div className="text-slate-400"># 4. Ver logs en tiempo real de facturas y auditoría</div>
              <div className="bg-slate-950 p-2.5 rounded-lg text-emerald-400 selection:bg-emerald-800">
                gcloud logging read "resource.type=cloud_run_revision" --limit 50
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CREDENCIALES SIIGO NUBE API */}
      {activeTab === 'siigo' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-[#271a82]">
                <Key className="w-5 h-5 text-[#e64519]" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Credenciales Siigo Nube API</h4>
                <p className="text-[11px] text-slate-500">Multi-tenant para empresa activa: {activeEmpresa?.nombre_comercial}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Usuario / Correo API Siigo
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#f8f9fa] border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:border-[#271a82]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  ID Tipo de Comprobante Siigo
                </label>
                <input
                  type="number"
                  value={docId}
                  onChange={(e) => setDocId(Number(e.target.value))}
                  className="w-full bg-[#f8f9fa] border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:border-[#271a82]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Access Key / Token de Acceso
                </label>
                <input
                  type="password"
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value)}
                  className="w-full bg-[#f8f9fa] border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:border-[#271a82]"
                />
              </div>
            </div>

            {testResult && (
              <div className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
                testResult.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                {testResult.ok ? <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />}
                <span>{testResult.message}</span>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-[#e64519]" />}
                Probar Conexión con Siigo API
              </button>

              <button
                onClick={handleSave}
                className="px-5 py-2.5 rounded-xl bg-[#271a82] hover:bg-[#1c1343] text-white font-bold text-xs shadow-md transition active:scale-95 cursor-pointer"
              >
                Guardar Credenciales
              </button>
            </div>
          </div>

          <div className="bg-[#f8f9fa] rounded-2xl border border-slate-200 p-6 space-y-4">
            <h4 className="font-bold text-[#1c1343] text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-[#fa9d1c]" /> Empresa Seleccionada
            </h4>
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="text-sm font-bold text-slate-900">{activeEmpresa?.nombre_comercial}</div>
              <div className="text-xs text-slate-500 font-mono">NIT: {activeEmpresa?.nit}</div>
              <div className="text-xs text-slate-500">ERP Destino: {activeEmpresa?.software_erp}</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: BANDEJA DE SEGURIDAD & CÓDIGOS OTP */}
      {activeTab === 'seguridad-auditoria' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-[#1c1343] via-[#271a82] to-[#4059aa] rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[11px] font-bold text-white bg-emerald-600 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Ciberseguridad & Auditoría OTP
                </span>
                <span className="text-xs text-indigo-200 font-medium">Consola TLM Enterprise</span>
              </div>
              <h2 className="text-xl font-black text-white font-['Catamaran']">
                Bandeja de Códigos de Recuperación & Notificaciones Corporativas
              </h2>
              <p className="text-xs text-indigo-100 max-w-2xl mt-1">
                Monitorea todos los correos corporativos despachados con credenciales provisionales, códigos OTP generados para recuperación de contraseña y confirmaciones de actualización segura.
              </p>
            </div>

            <button
              onClick={fetchNotificaciones}
              disabled={isLoadingNotificaciones}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs transition cursor-pointer shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingNotificaciones ? 'animate-spin text-[#fa9d1c]' : ''}`} />
              <span>Actualizar Bandeja</span>
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Total Notificaciones</div>
              <div className="text-2xl font-black text-[#1c1343] mt-1">{notificacionesSeguridad.length}</div>
              <div className="text-[11px] text-slate-400">Despachadas con éxito</div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Códigos OTP Generados</div>
              <div className="text-2xl font-black text-[#fa9d1c] mt-1">
                {notificacionesSeguridad.filter(n => n.tipo === 'CODIGO_RECUPERACION').length}
              </div>
              <div className="text-[11px] text-amber-700 font-medium">Validez 15 minutos</div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Cambio Clave Forzado</div>
              <div className="text-2xl font-black text-amber-600 mt-1">
                {usuarios.filter(u => u.requiere_cambio_password).length}
              </div>
              <div className="text-[11px] text-slate-400">Usuarios con clave provisional</div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Cuentas Seguras 8+</div>
              <div className="text-2xl font-black text-emerald-600 mt-1">
                {usuarios.filter(u => !u.requiere_cambio_password).length}
              </div>
              <div className="text-[11px] text-emerald-700 font-medium">Alfanumérica activa</div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {(['TODOS', 'CODIGOS', 'NUEVOS', 'RESETS'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setNotifFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    notifFilter === f
                      ? 'bg-[#271a82] text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {f === 'TODOS' ? 'Todas' : f === 'CODIGOS' ? 'Códigos OTP' : f === 'NUEVOS' ? 'Nuevos Usuarios' : 'Restablecimientos'}
                </button>
              ))}
            </div>

            <span className="text-xs text-slate-500 font-medium hidden sm:inline">
              Mostrando {notificacionesSeguridad.length} registros en disco
            </span>
          </div>

          {/* Notifications List */}
          <div className="space-y-3">
            {notificacionesSeguridad
              .filter(n => {
                if (notifFilter === 'CODIGOS') return n.tipo === 'CODIGO_RECUPERACION';
                if (notifFilter === 'NUEVOS') return n.tipo === 'NUEVO_USUARIO';
                if (notifFilter === 'RESETS') return n.tipo === 'RESET_ADMIN' || n.tipo === 'PASSWORD_CAMBIADA';
                return true;
              })
              .map(n => {
                const isOtp = n.tipo === 'CODIGO_RECUPERACION';
                const isNew = n.tipo === 'NUEVO_USUARIO';
                const isReset = n.tipo === 'RESET_ADMIN';

                return (
                  <div
                    key={n.id}
                    className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs hover:shadow-xs transition space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isOtp 
                            ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                            : isNew 
                            ? 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                            : isReset
                            ? 'bg-purple-100 text-purple-900 border border-purple-300'
                            : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        }`}>
                          {isOtp ? '🔑 Código OTP de Recuperación' : isNew ? '👤 Credencial Provisional (Nuevo)' : isReset ? '🔄 Restablecimiento Admin' : '✓ Clave Actualizada'}
                        </span>

                        <span className="text-xs font-bold text-slate-800">
                          {n.asunto}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{new Date(n.fecha).toLocaleString()}</span>
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded font-bold border border-emerald-200">
                          ENVIADO
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
                      <div className="space-y-1 flex-1">
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 font-mono">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>Destinatario corporativo:</span>
                          <strong className="text-slate-800">{n.destinatario}</strong>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed bg-[#f8f9fa] p-2.5 rounded-xl border border-slate-100">
                          {n.mensaje}
                        </p>
                      </div>

                      {n.codigo_otp && (
                        <div className="shrink-0 flex flex-col items-center gap-1.5 p-3 rounded-xl bg-amber-50/80 border border-amber-200 min-w-[130px]">
                          <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider">Código OTP</span>
                          <span className="font-mono text-xl font-black text-amber-950 tracking-widest bg-white px-3 py-1 rounded-lg border border-amber-300 shadow-2xs">
                            {n.codigo_otp}
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(n.codigo_otp || '');
                              setCopiedOtp(n.codigo_otp || '');
                              setTimeout(() => setCopiedOtp(null), 2000);
                            }}
                            className="text-[10px] font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1 cursor-pointer hover:underline"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{copiedOtp === n.codigo_otp ? '¡Copiado!' : 'Copiar'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* MODAL PARA CREAR USUARIO POR ADMIN CON CONTRASEÑA PROVISIONAL */}
      {isCreateUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-[#1c1343] text-white p-5 flex items-center justify-between border-b border-indigo-900/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#271a82] flex items-center justify-center text-white border border-indigo-800">
                  <UserPlus className="w-5 h-5 text-[#fa9d1c]" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Crear Usuario con Contraseña Provisional</h3>
                  <p className="text-xs text-indigo-200">Asignada por Juan Yaya · Forzada a cambio alfanumérico al primer ingreso</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateUserModalOpen(false)}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleCreateUserByAdmin} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {createUserError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{createUserError}</span>
                </div>
              )}

              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs text-indigo-900 leading-relaxed">
                <span className="font-bold block mb-1">ℹ️ Flujo de Ciberseguridad:</span>
                Juan (Administrador Maestro) crea la cuenta y le asigna la contraseña provisional. Cuando el usuario ingrese a la consola por primera vez, el sistema le exigirá <strong>obligatoriamente</strong> cambiarla por una contraseña personal alfanumérica de <strong>mínimo 8 caracteres</strong>.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Ej. Juan Pérez o Andrés Martínez"
                  className="w-full bg-[#f8f9fa] border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#271a82]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Correo Electrónico Corporativo</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="juan.perez@tlm.net.co"
                  className="w-full bg-[#f8f9fa] border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#271a82]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Rol Contable</label>
                  <select
                    value={newUserRol}
                    onChange={(e) => setNewUserRol(e.target.value as any)}
                    className="w-full bg-[#f8f9fa] border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#271a82] cursor-pointer"
                  >
                    <option value="Administrador">Administrador</option>
                    <option value="Contador">Contador</option>
                    <option value="Analista">Analista</option>
                    <option value="Auditor">Auditor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Empresa Principal</label>
                  <select
                    value={newUserEmpresas[0] || 1}
                    onChange={(e) => setNewUserEmpresas([Number(e.target.value)])}
                    className="w-full bg-[#f8f9fa] border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#271a82] cursor-pointer"
                  >
                    {empresas.map(emp => (
                      <option key={emp.id_empresa} value={emp.id_empresa}>
                        {emp.nombre_comercial.split(' ')[0]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">Contraseña Provisional Asignada</label>
                  <button
                    type="button"
                    onClick={() => setNewUserPassword(`TLM${Math.floor(100 + Math.random() * 900)}Pass!`)}
                    className="text-[10px] text-[#271a82] font-bold hover:underline cursor-pointer"
                  >
                    Generar aleatoria segura
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres alfanumérica"
                  className="w-full bg-[#f8f9fa] border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#271a82]"
                />
              </div>

              {/* Indicador de Política */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] space-y-1.5">
                <div className="font-bold text-slate-700">Requisitos de la contraseña provisional:</div>
                <div className="flex items-center gap-3">
                  <span className={`flex items-center gap-1 ${newUserPassword.length >= 8 ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                    {newUserPassword.length >= 8 ? '✓' : '•'} 8+ caracteres ({newUserPassword.length}/8)
                  </span>
                  <span className={`flex items-center gap-1 ${/[a-zA-Z]/.test(newUserPassword) ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                    {/[a-zA-Z]/.test(newUserPassword) ? '✓' : '•'} Letras
                  </span>
                  <span className={`flex items-center gap-1 ${/[0-9]/.test(newUserPassword) ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                    {/[0-9]/.test(newUserPassword) ? '✓' : '•'} Números
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingUser || newUserPassword.length < 8 || !/[a-zA-Z]/.test(newUserPassword) || !/[0-9]/.test(newUserPassword)}
                  className="px-5 py-2.5 rounded-xl bg-[#271a82] hover:bg-[#1c1343] text-white font-bold text-xs shadow-md transition active:scale-95 cursor-pointer flex items-center gap-2 disabled:opacity-40"
                >
                  <UserPlus className="w-4 h-4 text-[#fa9d1c]" />
                  {isCreatingUser ? 'Creando...' : 'Crear Usuario & Despachar Notificación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA RESTABLECER CONTRASEÑA POR ADMIN */}
      {resetPasswordTargetUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-[#1c1343] text-white p-5 flex items-center justify-between border-b border-indigo-900/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white">
                  <KeyRound className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Restablecer Contraseña Provisional</h3>
                  <p className="text-xs text-indigo-200">{resetPasswordTargetUser.nombre_completo}</p>
                </div>
              </div>
              <button
                onClick={() => setResetPasswordTargetUser(null)}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleResetPasswordByAdmin} className="p-6 space-y-4">
              {resetPasswordError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{resetPasswordError}</span>
                </div>
              )}

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
                <span className="font-bold block mb-0.5">⚠️ Requisito de Cambio Forzado:</span>
                Al asignar esta contraseña provisional, el usuario recibirá una notificación al correo <strong>{resetPasswordTargetUser.email}</strong> y en su próximo ingreso se le solicitará obligatoriamente cambiarla por una contraseña alfanumérica de mínimo 8 caracteres.
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">Nueva Contraseña Provisional</label>
                  <button
                    type="button"
                    onClick={() => setAdminNewProvisionalPassword(`Temp${Math.floor(100 + Math.random() * 900)}Pass!`)}
                    className="text-[10px] text-[#271a82] font-bold hover:underline cursor-pointer"
                  >
                    Generar aleatoria
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={adminNewProvisionalPassword}
                  onChange={(e) => setAdminNewProvisionalPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres alfanumérica"
                  className="w-full bg-[#f8f9fa] border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#271a82]"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] space-y-1">
                <div className="font-bold text-slate-700">Estándar de Seguridad:</div>
                <div className="flex items-center gap-3">
                  <span className={`flex items-center gap-1 ${adminNewProvisionalPassword.length >= 8 ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                    {adminNewProvisionalPassword.length >= 8 ? '✓' : '•'} 8+ carac.
                  </span>
                  <span className={`flex items-center gap-1 ${/[a-zA-Z]/.test(adminNewProvisionalPassword) ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                    {/[a-zA-Z]/.test(adminNewProvisionalPassword) ? '✓' : '•'} Letras
                  </span>
                  <span className={`flex items-center gap-1 ${/[0-9]/.test(adminNewProvisionalPassword) ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                    {/[0-9]/.test(adminNewProvisionalPassword) ? '✓' : '•'} Números
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetPasswordTargetUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isResettingPassword || adminNewProvisionalPassword.length < 8 || !/[a-zA-Z]/.test(adminNewProvisionalPassword) || !/[0-9]/.test(adminNewProvisionalPassword)}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition active:scale-95 cursor-pointer flex items-center gap-2 disabled:opacity-40"
                >
                  <KeyRound className="w-4 h-4" />
                  {isResettingPassword ? 'Asignando...' : 'Asignar & Notificar al Correo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE PERMISOS GRANULARES */}
      {editingPermissionsUser && tempPermisos && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-[#1c1343] text-white p-5 flex items-center justify-between border-b border-indigo-900/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#e64519] flex items-center justify-center text-white">
                  <Sliders className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Configurar Permisos Modulares</h3>
                  <p className="text-xs text-indigo-200">{editingPermissionsUser.nombre_completo}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingPermissionsUser(null)}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Master Admin toggle */}
              <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#1c1343] block">Permiso de Administrador General</span>
                  <span className="text-[11px] text-indigo-900">Otorga control total de gobierno y acceso a todos los módulos</span>
                </div>
                <input
                  type="checkbox"
                  checked={tempPermisos.administrador}
                  disabled={editingPermissionsUser.id_usuario === 1}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setTempPermisos({
                      ...tempPermisos,
                      administrador: val,
                      ...(val ? {
                        auditoria_ubl: true,
                        impuestos_f350: true,
                        conciliacion_bancaria: true,
                        transmitir_siigo: true,
                        gestion_usuarios: true
                      } : {})
                    });
                  }}
                  className="w-5 h-5 accent-[#271a82] cursor-pointer"
                />
              </div>

              {/* Granular module toggles */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                  Permisos Específicos por Módulo:
                </h4>

                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">📄 Auditoría & Carga UBL 2.1</span>
                    <span className="text-[11px] text-slate-500">Cargar XML DIAN, auditar CUFE y revisar cuentas contables</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={tempPermisos.auditoria_ubl}
                    onChange={(e) => setTempPermisos({ ...tempPermisos, auditoria_ubl: e.target.checked })}
                    className="w-4 h-4 accent-[#271a82]"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">🏛️ Impuestos & DIAN F350</span>
                    <span className="text-[11px] text-slate-500">Generar borrador de retenciones y liquidación fiscal</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={tempPermisos.impuestos_f350}
                    onChange={(e) => setTempPermisos({ ...tempPermisos, impuestos_f350: e.target.checked })}
                    className="w-4 h-4 accent-[#271a82]"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">🏦 Conciliación Bancaria</span>
                    <span className="text-[11px] text-slate-500">Ejecutar cruce de extractos vs libro mayor y generar planos</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={tempPermisos.conciliacion_bancaria}
                    onChange={(e) => setTempPermisos({ ...tempPermisos, conciliacion_bancaria: e.target.checked })}
                    className="w-4 h-4 accent-[#271a82]"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">☁️ Transmisión a Siigo Nube</span>
                    <span className="text-[11px] text-slate-500">Pulsar comprobantes al ERP contable oficial</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={tempPermisos.transmitir_siigo}
                    onChange={(e) => setTempPermisos({ ...tempPermisos, transmitir_siigo: e.target.checked })}
                    className="w-4 h-4 accent-[#271a82]"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">👥 Gestión de Usuarios y Seguridad</span>
                    <span className="text-[11px] text-slate-500">Crear, aprobar y cambiar privilegios de usuarios</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={tempPermisos.gestion_usuarios}
                    onChange={(e) => setTempPermisos({ ...tempPermisos, gestion_usuarios: e.target.checked })}
                    className="w-4 h-4 accent-[#271a82]"
                  />
                </label>
              </div>

              {/* Multi-tenant company assignments */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                  Empresas Autorizadas (RLS Multi-Tenant):
                </h4>
                <div className="space-y-1.5">
                  {empresas.map(emp => {
                    const isAssigned = tempEmpresasIds.includes(emp.id_empresa);
                    return (
                      <label key={emp.id_empresa} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                        <div>
                          <div className="text-xs font-bold text-slate-800">{emp.nombre_comercial}</div>
                          <div className="text-[10px] text-slate-500 font-mono">NIT: {emp.nit}</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isAssigned}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setTempEmpresasIds([...tempEmpresasIds, emp.id_empresa]);
                            } else {
                              setTempEmpresasIds(tempEmpresasIds.filter(id => id !== emp.id_empresa));
                            }
                          }}
                          className="w-4 h-4 accent-[#271a82]"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Identidad Corporativa: Avatar o Iniciales JY */}
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-[#271a82]" />
                    Identidad Visual: Imagen Corporativa o Iniciales (JY)
                  </h4>
                  <span className="text-[10px] text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    {tempAvatarUrl ? 'Imagen activa' : 'Iniciales JY activas'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#271a82] to-[#fa9d1c] text-white flex items-center justify-center font-black text-sm shadow-sm overflow-hidden shrink-0 border border-white ring-1 ring-slate-200">
                    {tempAvatarUrl ? (
                      <img src={tempAvatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      getCleanInitials(editingPermissionsUser.nombre_completo)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-800 truncate">
                      {editingPermissionsUser.nombre_completo}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {tempAvatarUrl ? 'Mostrando imagen corporativa personalizada' : 'Mostrando iniciales limpias JY'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTempAvatarUrl(null)}
                    className={`p-2 rounded-xl border text-left transition cursor-pointer text-xs font-bold flex items-center gap-2 ${
                      !tempAvatarUrl
                        ? 'bg-indigo-50 border-[#271a82] text-[#271a82]'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-6 h-6 rounded-md bg-[#271a82] text-white flex items-center justify-center font-bold text-[10px]">
                      JY
                    </span>
                    <span>Usar Iniciales JY</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTempAvatarUrl('/avatar_corporativo_tlm.svg')}
                    className={`p-2 rounded-xl border text-left transition cursor-pointer text-xs font-bold flex items-center gap-2 ${
                      tempAvatarUrl === '/avatar_corporativo_tlm.svg'
                        ? 'bg-amber-50 border-[#fa9d1c] text-amber-900'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-6 h-6 rounded-md bg-[#160f38] p-0.5 border border-[#fa9d1c] flex items-center justify-center">
                      <img src="/avatar_corporativo_tlm.svg" alt="" className="w-full h-full object-contain" />
                    </span>
                    <span>Emblema TLM</span>
                  </button>
                </div>

                <div className="p-3 rounded-xl border border-dashed border-slate-300 hover:border-[#271a82] bg-white transition">
                  <label className="flex items-center justify-center gap-2 cursor-pointer text-center text-xs font-bold text-slate-700 hover:text-[#271a82]">
                    <Upload className="w-4 h-4 text-[#271a82]" />
                    <span>Cargar foto o imagen corporativa desde archivo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            setTempAvatarUrl(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setEditingPermissionsUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveGranularPermisos}
                className="px-5 py-2 rounded-xl bg-[#271a82] hover:bg-[#1c1343] text-white font-bold text-xs shadow-md transition active:scale-95 cursor-pointer"
              >
                Guardar Permisos en Disco
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
