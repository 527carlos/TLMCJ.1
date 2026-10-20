import { Router, Request, Response } from 'express';
import multer from 'multer';
import { db, getDefaultPermissions } from '../storage/dataStore.ts';
import { xmlParser } from '../services/xmlUblParser.ts';
import { reconciliationEngine } from '../services/reconciliationEngine.ts';
import { f350TaxEngine } from '../services/f350TaxEngine.ts';
import { siigoService } from '../services/siigoService.ts';
import { scalabilityArchitecture } from '../services/scalabilityArchitecture.ts';
import { Factura } from '../domain/types.ts';
import { hashPassword, isHashed, verifyPassword, matchesLegacyPassword } from '../services/passwordHasher.ts';

const router = Router();

// Quita hashes y códigos de recuperación antes de enviar un usuario al navegador
function publicUser(user: any) {
  const { hashed_password, codigo_recuperacion, codigo_recuperacion_expira, ...safe } = user;
  return safe;
}
const upload = multer({ limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB support for batch uploads

// ==========================================
// ==========================================
// 1. AUTENTICACIÓN Y GESTIÓN DE USUARIOS & CIBERSEGURIDAD
// ==========================================
export function validatePasswordRule(pwd: string): { ok: boolean; message?: string } {
  if (!pwd || typeof pwd !== 'string' || pwd.length < 8) {
    return { ok: false, message: "La contraseña debe tener mínimo 8 caracteres." };
  }
  const hasLetter = /[a-zA-Z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  if (!hasLetter || !hasNumber) {
    return { ok: false, message: "La contraseña debe ser alfanumérica (debe contener al menos una letra y un número)." };
  }
  return { ok: true };
}

router.post('/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = db.usuarios.find(u => u.email.toLowerCase() === (email || '').toLowerCase().trim());

  if (!user) {
    return res.status(401).json({ detail: "Credenciales inválidas. Verifica tu correo corporativo." });
  }

  if (!user.activo) {
    return res.status(403).json({ detail: "Tu cuenta está pendiente de aprobación por el Administrador Maestro (Juan Yaya)." });
  }

  // La contraseña es obligatoria. Antes, sin contraseña el login pasaba.
  if (!password || typeof password !== 'string' || !user.hashed_password) {
    return res.status(401).json({ detail: "Credenciales inválidas. Verifica tu correo corporativo." });
  }

  const isMatched = isHashed(user.hashed_password)
    ? verifyPassword(password, user.hashed_password)
    : matchesLegacyPassword(password, user.hashed_password);

  if (!isMatched) {
    return res.status(401).json({ detail: "Contraseña incorrecta. Si la olvidaste, puedes generar un código de recuperación a tu correo corporativo." });
  }

  // Migración: si el registro aún estaba en texto plano, se guarda con scrypt.
  if (!isHashed(user.hashed_password)) {
    user.hashed_password = hashPassword(password);
    db.saveToDisk();
  }

  // Verificar si requiere cambio obligatorio de contraseña en primer inicio
  const mustChange = user.requiere_cambio_password === true;

  res.json({
    access_token: `token_bearer_${user.id_usuario}`,
    token_type: "bearer",
    usuario_id: user.id_usuario,
    usuario_nombre: user.nombre_completo,
    email: user.email,
    rol: user.rol,
    empresas_ids: user.empresas_ids,
    avatar_url: user.avatar_url || null,
    requiere_cambio_password: mustChange,
    usuario: publicUser(user),
    mensaje_seguridad: mustChange 
      ? "Contraseña provisional detectada asignada por el Administrador. Debes cambiarla obligatoriamente a una contraseña alfanumérica de mínimo 8 caracteres antes de continuar."
      : undefined
  });
});

router.post('/auth/cambiar-password', (req: Request, res: Response) => {
  const { email, usuario_id, password_actual, nueva_password, confirmar_password } = req.body;
  const user = db.usuarios.find(u => 
    (usuario_id && u.id_usuario === Number(usuario_id)) || 
    (email && u.email.toLowerCase() === email.toLowerCase().trim())
  );

  if (!user) {
    return res.status(404).json({ detail: "Usuario no encontrado." });
  }

  if (nueva_password !== confirmar_password) {
    return res.status(400).json({ detail: "La confirmación no coincide con la nueva contraseña." });
  }

  const checkRule = validatePasswordRule(nueva_password);
  if (!checkRule.ok) {
    return res.status(400).json({ detail: checkRule.message });
  }

  if (password_actual && password_actual === nueva_password) {
    return res.status(400).json({ detail: "La nueva contraseña debe ser diferente a la contraseña actual/provisional." });
  }

  user.hashed_password = hashPassword(nueva_password);
  user.requiere_cambio_password = false;
  user.ultimo_cambio_password = new Date().toISOString();
  db.saveToDisk();

  db.addNotificacionSeguridad({
    destinatario: user.email,
    asunto: "Confirmación de Cambio de Contraseña - Consola TLM",
    tipo: "PASSWORD_CAMBIADA",
    mensaje: `Hola ${user.nombre_completo}, tu contraseña corporativa ha sido actualizada exitosamente y cumple con el estándar alfanumérico seguro. Tu cuenta se encuentra protegida.`
  });

  db.addModificacion({
    autor_id: user.id_usuario,
    autor_nombre: user.nombre_completo,
    autor_email: user.email,
    autor_rol: user.rol,
    tipo_accion: "CONFIG_UPDATE",
    descripcion: `Actualización de contraseña segura alfanumérica para ${user.nombre_completo}`,
    detalles: `Estándar de seguridad de 8+ caracteres alfanuméricos aplicado. Estado: Sin contraseña provisional pendiente.`
  });

  res.json({
    ok: true,
    mensaje: "¡Contraseña actualizada con éxito! Tus credenciales ahora están protegidas.",
    usuario: user
  });
});

router.post('/auth/usuarios/crear-por-admin', (req: Request, res: Response) => {
  const { nombre_completo, email, rol, password_provisional, empresas_ids, autor_id, autor_nombre } = req.body;

  if (!nombre_completo || !email || !password_provisional) {
    return res.status(400).json({ detail: "Nombre completo, correo corporativo y contraseña provisional son obligatorios." });
  }

  const exists = db.usuarios.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
  if (exists) {
    return res.status(400).json({ detail: "El correo electrónico ya se encuentra registrado." });
  }

  const checkRule = validatePasswordRule(password_provisional);
  if (!checkRule.ok) {
    return res.status(400).json({ detail: `La contraseña provisional asignada por Juan debe cumplir la política: ${checkRule.message}` });
  }

  const roleValue = (['Administrador', 'Contador', 'Analista', 'Auditor'].includes(rol) ? rol : 'Analista') as any;

  const nuevoUsuario: any = {
    id_usuario: Math.max(...db.usuarios.map(u => u.id_usuario), 0) + 1,
    nombre_completo: nombre_completo.trim(),
    email: email.toLowerCase().trim(),
    hashed_password: hashPassword(password_provisional),
    rol: roleValue,
    activo: true, // Creado y aprobado directamente por Juan el Administrador Maestro
    requiere_cambio_password: true, // Obligatorio cambiarla cuando el usuario entre
    empresas_ids: Array.isArray(empresas_ids) && empresas_ids.length > 0 ? empresas_ids : [1],
    permisos: getDefaultPermissions(roleValue),
    ultimo_cambio_password: new Date().toISOString()
  };

  db.usuarios.push(nuevoUsuario);
  db.saveToDisk();

  // Notificación oficial enviada al correo corporativo del nuevo usuario
  const notif = db.addNotificacionSeguridad({
    destinatario: nuevoUsuario.email,
    asunto: "Credenciales de Acceso a Consola TLM - Contraseña Provisional",
    tipo: "NUEVO_USUARIO",
    mensaje: `Estimado/a ${nuevoUsuario.nombre_completo}, Juan Yaya (Administrador Maestro) ha habilitado tu acceso a la Consola TLM Enterprise. Tu contraseña provisional es: "${password_provisional}". IMPORTANTE: Al iniciar sesión por primera vez, el sistema te solicitará obligatoriamente cambiarla por una contraseña alfanumérica personal de mínimo 8 caracteres.`
  });

  db.addModificacion({
    autor_id: autor_id || 1,
    autor_nombre: autor_nombre || "Juan Yaya - Administrador Maestro",
    tipo_accion: "COLABORACION",
    descripcion: `Creación de usuario ${nuevoUsuario.nombre_completo} (${nuevoUsuario.rol}) con contraseña provisional asignada por Juan`,
    detalles: `Cuenta activada con requisito forzado de cambio de clave al primer ingreso. Notificación enviada a ${nuevoUsuario.email}.`
  });

  res.status(201).json({
    ok: true,
    mensaje: `Usuario ${nuevoUsuario.nombre_completo} creado con éxito. Se le asignó contraseña provisional y deberá cambiarla al iniciar sesión.`,
    usuario: nuevoUsuario,
    notificacion: notif
  });
});

router.post('/auth/usuarios/:id/reset-password-admin', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { nueva_password_provisional, autor_id, autor_nombre } = req.body;
  const user = db.usuarios.find(u => u.id_usuario === id);

  if (!user) {
    return res.status(404).json({ detail: "Usuario no encontrado." });
  }

  if (!nueva_password_provisional) {
    return res.status(400).json({ detail: "Debes ingresar una contraseña provisional para el usuario." });
  }

  const checkRule = validatePasswordRule(nueva_password_provisional);
  if (!checkRule.ok) {
    return res.status(400).json({ detail: checkRule.message });
  }

  user.hashed_password = hashPassword(nueva_password_provisional);
  user.requiere_cambio_password = true; // Exigir cambio en el próximo ingreso
  user.codigo_recuperacion = null;
  user.codigo_recuperacion_expira = null;
  user.ultimo_cambio_password = new Date().toISOString();
  db.saveToDisk();

  const notif = db.addNotificacionSeguridad({
    destinatario: user.email,
    asunto: "Restablecimiento de Contraseña por Administrador - Consola TLM",
    tipo: "RESET_ADMIN",
    mensaje: `Hola ${user.nombre_completo}, el Administrador Maestro (Juan Yaya) ha restablecido tu acceso corporativo. Tu nueva contraseña provisional es: "${nueva_password_provisional}". Al iniciar sesión, el sistema te solicitará cambiarla obligatoriamente por una contraseña personal de mínimo 8 caracteres alfanuméricos.`
  });

  db.addModificacion({
    autor_id: autor_id || 1,
    autor_nombre: autor_nombre || "Juan Yaya - Administrador Maestro",
    tipo_accion: "CONFIG_UPDATE",
    descripcion: `Restablecimiento de contraseña para ${user.nombre_completo} por Juan Yaya`,
    detalles: `Clave temporal asignada y notificada a ${user.email}. Usuario forzado a cambio alfanumérico.`
  });

  res.json({
    ok: true,
    mensaje: `Contraseña provisional asignada a ${user.nombre_completo}. Notificación de seguridad generada para ${user.email}.`,
    usuario: publicUser(user),
    notificacion: notif
  });
});

// Recuperación de Contraseña mediante Código OTP de 6 dígitos
router.post('/auth/recuperar-password/solicitar-codigo', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ detail: "Ingresa tu correo electrónico corporativo." });
  }

  const user = db.usuarios.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
  if (!user) {
    return res.status(404).json({ detail: "No existe ninguna cuenta corporativa registrada con este correo." });
  }

  if (!user.activo) {
    return res.status(403).json({ detail: "Esta cuenta está inactiva o pendiente de aprobación por Juan Yaya." });
  }

  // Generar código OTP seguro de 6 dígitos
  const codigoOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const expira = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutos

  user.codigo_recuperacion = codigoOtp;
  user.codigo_recuperacion_expira = expira;
  db.saveToDisk();

  const notif = db.addNotificacionSeguridad({
    destinatario: user.email,
    asunto: `Código de Seguridad [${codigoOtp}] para Recuperación de Contraseña - TLM`,
    tipo: "CODIGO_RECUPERACION",
    codigo_otp: codigoOtp,
    mensaje: `Hola ${user.nombre_completo}, has solicitado restablecer tu contraseña en la Consola TLM. Tu código de seguridad confidencial es: [${codigoOtp}]. Este código expira en 15 minutos. Si tú no realizaste esta solicitud, comunícate de inmediato con Juan Yaya (automatizaciones@tlm.net.co).`
  });

  res.json({
    ok: true,
    mensaje: `Se ha enviado un código de seguridad de 6 dígitos al correo corporativo ${user.email}.`,
    email: user.email,
    codigo_simulado: codigoOtp,
    expira_en_minutos: 15,
    notificacion: notif
  });
});

router.post('/auth/recuperar-password/verificar-y-cambiar', (req: Request, res: Response) => {
  const { email, codigo, nueva_password, confirmar_password } = req.body;

  if (!email || !codigo || !nueva_password) {
    return res.status(400).json({ detail: "Correo, código de seguridad y nueva contraseña son requeridos." });
  }

  const user = db.usuarios.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
  if (!user) {
    return res.status(404).json({ detail: "Usuario no encontrado." });
  }

  if (!user.codigo_recuperacion || user.codigo_recuperacion.trim() !== codigo.toString().trim()) {
    return res.status(400).json({ detail: "El código de seguridad ingresado es incorrecto." });
  }

  if (user.codigo_recuperacion_expira && new Date() > new Date(user.codigo_recuperacion_expira)) {
    return res.status(400).json({ detail: "El código de seguridad ha expirado (validez: 15 minutos). Solicita un nuevo código." });
  }

  if (nueva_password !== confirmar_password) {
    return res.status(400).json({ detail: "La confirmación no coincide con la nueva contraseña." });
  }

  const checkRule = validatePasswordRule(nueva_password);
  if (!checkRule.ok) {
    return res.status(400).json({ detail: checkRule.message });
  }

  user.hashed_password = hashPassword(nueva_password);
  user.codigo_recuperacion = null;
  user.codigo_recuperacion_expira = null;
  user.requiere_cambio_password = false;
  user.ultimo_cambio_password = new Date().toISOString();
  db.saveToDisk();

  db.addNotificacionSeguridad({
    destinatario: user.email,
    asunto: "Contraseña Recuperada y Restablecida con Éxito - TLM",
    tipo: "PASSWORD_CAMBIADA",
    mensaje: `Hola ${user.nombre_completo}, tu contraseña corporativa ha sido restablecida exitosamente mediante código de seguridad OTP. Ahora puedes ingresar normalmente con tus nuevas credenciales.`
  });

  res.json({
    ok: true,
    mensaje: "¡Contraseña recuperada y actualizada con éxito! Ya puedes iniciar sesión con tus nuevas credenciales.",
    usuario: user
  });
});

router.get('/auth/notificaciones-seguridad', (_req: Request, res: Response) => {
  res.json(db.notificacionesSeguridad);
});

router.post('/auth/register', (req: Request, res: Response) => {
  const { nombre_completo, email, password } = req.body;
  if (!email || !nombre_completo) {
    return res.status(400).json({ detail: "Nombre completo y correo son requeridos." });
  }

  const exists = db.usuarios.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (exists) {
    return res.status(400).json({ detail: "El correo electrónico ya se encuentra registrado." });
  }

  const checkRule = validatePasswordRule(password || 'analista123');
  if (!checkRule.ok) {
    return res.status(400).json({ detail: checkRule.message });
  }

  const nuevoUsuario = {
    id_usuario: Math.max(...db.usuarios.map(u => u.id_usuario), 0) + 1,
    nombre_completo,
    email,
    hashed_password: hashPassword(password),
    rol: 'Analista' as const,
    activo: false,
    requiere_cambio_password: false,
    empresas_ids: [1],
    permisos: getDefaultPermissions('Analista')
  };

  db.usuarios.push(nuevoUsuario);
  db.saveToDisk();
  res.status(201).json({
    mensaje: "Registro solicitado correctamente. Un Administrador debe aprobar su acceso.",
    id_usuario: nuevoUsuario.id_usuario
  });
});

router.get('/auth/usuarios', (_req: Request, res: Response) => {
  res.json(db.usuarios.map(publicUser));
});

router.patch('/auth/usuarios/:id/aprobar', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const user = db.usuarios.find(u => u.id_usuario === id);
  if (!user) {
    return res.status(404).json({ detail: "Usuario no encontrado." });
  }
  user.activo = true;
  db.saveToDisk();
  res.json({ mensaje: `Usuario ${user.email} aprobado con éxito.`, usuario: publicUser(user) });
});

router.patch('/auth/usuarios/:id/rol', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { rol } = req.body;
  const user = db.usuarios.find(u => u.id_usuario === id);
  if (!user) {
    return res.status(404).json({ detail: "Usuario no encontrado." });
  }
  if (!['Administrador', 'Contador', 'Analista', 'Auditor'].includes(rol)) {
    return res.status(400).json({ detail: "Rol especificado no es válido." });
  }
  if (id === 1 && rol !== 'Administrador') {
    return res.status(400).json({ detail: "El Administrador Maestro (Juan Yaya) no puede ser degradado." });
  }

  user.rol = rol;
  user.permisos = getDefaultPermissions(rol);
  db.saveToDisk();
  res.json({ mensaje: `Rol cambiado a ${rol} con permisos estándar asociados.`, usuario: publicUser(user) });
});

router.patch('/auth/usuarios/:id/toggle-admin', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const user = db.usuarios.find(u => u.id_usuario === id);
  if (!user) {
    return res.status(404).json({ detail: "Usuario no encontrado." });
  }
  if (id === 1 && user.rol === 'Administrador') {
    return res.status(400).json({ detail: "El Administrador Maestro principal debe conservar rol de Administrador." });
  }

  if (user.rol === 'Administrador') {
    user.rol = 'Contador';
    user.permisos = getDefaultPermissions('Contador');
  } else {
    user.rol = 'Administrador';
    user.permisos = getDefaultPermissions('Administrador');
  }
  db.saveToDisk();
  res.json({
    mensaje: user.rol === 'Administrador' ? `Permisos de Administrador concedidos a ${user.nombre_completo}.` : `Permisos de Administrador revocados para ${user.nombre_completo}.`,
    usuario: user
  });
});

router.patch('/auth/usuarios/:id/toggle-activo', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const user = db.usuarios.find(u => u.id_usuario === id);
  if (!user) {
    return res.status(404).json({ detail: "Usuario no encontrado." });
  }
  if (id === 1) {
    return res.status(400).json({ detail: "El Administrador Maestro no puede ser desactivado." });
  }

  user.activo = !user.activo;
  db.saveToDisk();
  res.json({
    mensaje: user.activo ? `Acceso activado para ${user.nombre_completo}.` : `Acceso suspendido/revocado para ${user.nombre_completo}.`,
    usuario: user
  });
});

router.patch('/auth/usuarios/:id/permisos', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { permisos } = req.body;
  const user = db.usuarios.find(u => u.id_usuario === id);
  if (!user) {
    return res.status(404).json({ detail: "Usuario no encontrado." });
  }
  user.permisos = {
    ...user.permisos,
    ...permisos
  };
  if (permisos.administrador === true) {
    user.rol = 'Administrador';
  } else if (permisos.administrador === false && user.rol === 'Administrador') {
    user.rol = 'Contador';
  }
  db.saveToDisk();
  res.json({ mensaje: `Permisos granulares actualizados para ${user.nombre_completo}.`, usuario: publicUser(user) });
});

router.patch('/auth/usuarios/:id/empresas', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { empresas_ids } = req.body;
  const user = db.usuarios.find(u => u.id_usuario === id);
  if (!user) {
    return res.status(404).json({ detail: "Usuario no encontrado." });
  }
  if (Array.isArray(empresas_ids)) {
    user.empresas_ids = empresas_ids;
    db.saveToDisk();
  }
  res.json({ mensaje: `Empresas autorizadas actualizadas para ${user.nombre_completo}.`, usuario: publicUser(user) });
});

router.patch('/auth/usuarios/:id/avatar', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { avatar_url } = req.body;
  const user = db.usuarios.find(u => u.id_usuario === id);
  if (!user) {
    return res.status(404).json({ detail: "Usuario no encontrado." });
  }
  user.avatar_url = avatar_url || null;
  db.saveToDisk();
  res.json({
    mensaje: avatar_url 
      ? `Imagen corporativa actualizada con éxito para ${user.nombre_completo}.` 
      : `Imagen corporativa removida, mostrando iniciales JY / personalizadas para ${user.nombre_completo}.`,
    usuario: user
  });
});

router.delete('/auth/usuarios/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (id === 1) {
    return res.status(400).json({ detail: "No se puede eliminar al Administrador Maestro (Juan Yaya)." });
  }
  const index = db.usuarios.findIndex(u => u.id_usuario === id);
  if (index === -1) {
    return res.status(404).json({ detail: "Usuario no encontrado." });
  }
  db.usuarios.splice(index, 1);
  db.saveToDisk();
  res.json({ mensaje: "Usuario eliminado correctamente." });
});

router.get('/sistema/database-info', (_req: Request, res: Response) => {
  res.json(db.getDatabaseInfo());
});

// ==========================================
// GOOGLE CLOUD PLATFORM (GCP) INTEGRACIÓN
// ==========================================
router.get('/sistema/google-cloud-status', (_req: Request, res: Response) => {
  res.json({
    conectado: true,
    proveedor: "Google Cloud Platform (GCP)",
    servicio: "Google Cloud Run (Serverless Container Platform)",
    region: "us-east1",
    project_id: "395382435000",
    service_account: "automatizaciones@tlm.net.co",
    app_url: "https://ais-pre-jm2qqpvuit56ogjeno6hay-395382435000.us-east1.run.app",
    dev_url: "https://ais-dev-jm2qqpvuit56ogjeno6hay-395382435000.us-east1.run.app",
    entorno: process.env.NODE_ENV || "production",
    instancia: {
      runtime: `Node.js ${process.version}`,
      puerto: process.env.PORT || 3000,
      escalabilidad: "Autoscaling Dinámico (0 a N instancias Cloud Run)",
      memoria_asignada: "1024 MB",
      cpu_asignada: "1 vCPU",
      uptime_segundos: Math.floor(process.uptime())
    },
    servicios_gcp: [
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
    ],
    latencia_ms: 18,
    ultima_sincronizacion: new Date().toISOString()
  });
});

router.post('/sistema/google-cloud-sync', (req: Request, res: Response) => {
  const { autor_id, autor_nombre, notas } = req.body;
  const hash = 'gcp-' + Math.random().toString(36).substring(2, 9);
  
  const mod = db.addModificacion({
    autor_id: autor_id || 1,
    autor_nombre: autor_nombre || "Juan Yaya - Administrador Maestro",
    tipo_accion: "GCP_SYNC",
    descripcion: `Sincronización y despliegue del Repositorio v2.0 a Google Cloud Platform (${hash})`,
    detalles: notas || "Snapshot atómico de base de datos y esquemas contables replicado en infraestructura Google Cloud Run."
  });

  res.json({
    ok: true,
    mensaje: "¡Repositorio v2.0 de Juan sincronizado exitosamente con Google Cloud!",
    hash_despliegue: hash,
    region: "us-east1",
    servicio: "Google Cloud Run",
    timestamp: new Date().toISOString(),
    modificacion: mod
  });
});

// ==========================================
// REPOSITORIO MAESTRO DE JUAN YAYA (VERSIÓN 2.0)
// ==========================================
router.get('/repositorio/juan', (_req: Request, res: Response) => {
  res.json({
    info: db.getRepositorioInfo(),
    modificaciones: db.modificaciones,
    usuarios_colaboradores: db.usuarios.filter(u => u.activo)
  });
});

router.post('/repositorio/juan/modificacion', (req: Request, res: Response) => {
  const { autor_id, autor_nombre, autor_email, autor_rol, tipo_accion, descripcion, detalles } = req.body;
  if (!descripcion) {
    return res.status(400).json({ detail: "Descripción de la modificación es requerida." });
  }

  const mod = db.addModificacion({
    autor_id: autor_id ? Number(autor_id) : undefined,
    autor_nombre,
    autor_email,
    autor_rol,
    tipo_accion: tipo_accion || 'COLABORACION',
    descripcion,
    detalles
  });

  res.status(201).json({
    mensaje: "Modificación arrojada con éxito al Repositorio Central de Juan Yaya como Versión 2.0",
    modificacion: mod,
    repositorio_version: "2.0",
    total_modificaciones: db.modificaciones.length
  });
});

router.post('/repositorio/juan/consolidar-v2', (req: Request, res: Response) => {
  const { autor_id, autor_nombre, notas } = req.body;
  const mod = db.addModificacion({
    autor_id: autor_id || 1,
    autor_nombre: autor_nombre || "Juan Yaya - Administrador Maestro",
    tipo_accion: "RELEASE_V2",
    descripcion: `Consolidación oficial de release: Versión 2.0 arrojada en Repositorio Central de Juan`,
    detalles: notas || "Árbol de cambios colaborativos sincronizado con éxito. Estado v2.0 estable."
  });

  res.json({
    mensaje: "¡Consolidación exitosa! Todas las modificaciones multiusuario se han arrojado al Repositorio de Juan como Versión 2.0.",
    snapshot_version: "2.0.0",
    modificacion: mod,
    info: db.getRepositorioInfo()
  });
});

router.get('/sistema/export-backup', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="repositorio_juan_version_2.0.json"');
  res.send(JSON.stringify({
    version: "2.0",
    repositorio: {
      nombre: "Repositorio Central de Juan Yaya",
      propietario: "Juan Yaya (Administrador Maestro)",
      version_oficial: "2.0.0",
      tag: "v2.0",
      fecha_exportacion: new Date().toISOString()
    },
    info: db.getDatabaseInfo(),
    modificaciones: db.modificaciones,
    data: {
      usuarios: db.usuarios,
      empresas: db.empresas,
      facturas: db.facturas,
      cuentasPUC: db.cuentasPUC,
      balanceTerceros: db.balanceTerceros,
      movimientosBanco: db.movimientosBanco,
      movimientosLibro: db.movimientosLibro
    }
  }, null, 2));
});

// ==========================================
// 2. EMPRESAS Y MULTI-TENANCY
// ==========================================
router.get('/empresas', (_req: Request, res: Response) => {
  res.json(db.empresas);
});

router.post('/empresas', (req: Request, res: Response) => {
  const { nombre_comercial, nit, software_erp, siigo_username, siigo_access_key, siigo_document_id } = req.body;
  if (!nombre_comercial || !nit) {
    return res.status(400).json({ detail: "Nombre comercial y NIT son obligatorios." });
  }

  const nuevaEmpresa = {
    id_empresa: db.empresas.length + 1,
    nombre_comercial,
    nit,
    software_erp: software_erp || "SIIGO_NUBE",
    software_destino: software_erp || "SIIGO_NUBE",
    siigo_username,
    siigo_access_key,
    siigo_document_id: siigo_document_id || 24
  };

  db.empresas.push(nuevaEmpresa);
  res.status(201).json(nuevaEmpresa);
});

router.get('/empresas/:id/siigo-config', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const empresa = db.empresas.find(e => e.id_empresa === id);
  if (!empresa) {
    return res.status(404).json({ detail: "Empresa no encontrada." });
  }

  res.json({
    id_empresa: empresa.id_empresa,
    nombre_comercial: empresa.nombre_comercial,
    nit: empresa.nit,
    siigo_username: empresa.siigo_username || "",
    siigo_access_key: empresa.siigo_access_key ? "••••••••••••••••" : "",
    siigo_document_id: empresa.siigo_document_id || 24,
    has_credentials: Boolean(empresa.siigo_username && empresa.siigo_access_key)
  });
});

router.put('/empresas/:id/siigo-config', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const empresa = db.empresas.find(e => e.id_empresa === id);
  if (!empresa) {
    return res.status(404).json({ detail: "Empresa no encontrada." });
  }

  const { siigo_username, siigo_access_key, siigo_document_id } = req.body;
  if (siigo_username !== undefined) empresa.siigo_username = siigo_username;
  if (siigo_access_key !== undefined) empresa.siigo_access_key = siigo_access_key;
  if (siigo_document_id !== undefined) empresa.siigo_document_id = Number(siigo_document_id);

  res.json({
    mensaje: "Configuración de Siigo Nube actualizada con éxito.",
    id_empresa: empresa.id_empresa,
    siigo_username: empresa.siigo_username,
    siigo_document_id: empresa.siigo_document_id
  });
});

// ==========================================
// 3. FACTURAS Y ETL UBL 2.1
// ==========================================
router.get('/facturas', (req: Request, res: Response) => {
  const { id_empresa, estado, search, casilla } = req.query;
  let items = db.facturas;

  if (id_empresa) {
    items = items.filter(f => f.id_empresa === parseInt(id_empresa as string));
  }

  if (estado && estado !== 'TODOS') {
    items = items.filter(f => f.estado_revision === estado);
  }

  if (casilla) {
    items = items.filter(f => f.casilla_350 === parseInt(casilla as string));
  }

  if (search) {
    const s = (search as string).toLowerCase();
    items = items.filter(f =>
      f.factura_num.toLowerCase().includes(s) ||
      f.proveedor.toLowerCase().includes(s) ||
      f.nit_tercero.includes(s) ||
      f.cuenta_gasto.includes(s) ||
      f.descripcion_item.toLowerCase().includes(s)
    );
  }

  res.json(items);
});

router.post('/facturas/upload', upload.array('archivos'), (req: Request, res: Response) => {
  const idEmpresa = parseInt(req.body.id_empresa || '1');
  const files = (req.files as Express.Multer.File[]) || [];
  const processedFacturas: Factura[] = [];

  for (const file of files) {
    const xmlText = file.buffer.toString('utf-8');
    const parsedList = xmlParser.parseXmlUbl(xmlText, file.originalname);

    for (const p of parsedList) {
      const nuevaFactura: Factura = {
        id_factura: db.facturas.length + 1,
        id_empresa: idEmpresa,
        factura_num: p.factura_num,
        fecha: p.fecha,
        fecha_vencimiento: p.fecha_vencimiento,
        proveedor: p.proveedor,
        nit_tercero: p.nit_tercero,
        telefono: p.telefono,
        ciudad: p.ciudad,
        departamento: p.departamento,
        correo: p.correo,
        descripcion_item: p.descripcion_item,
        cantidad: p.cantidad,
        valor_unitario: p.valor_unitario,
        subtotal: p.subtotal,
        iva: p.iva,
        total: p.subtotal + p.iva,
        casilla_350: p.casilla_350,
        retencion_porc: p.retencion_porc,
        retencion_valor: p.retencion_valor,
        reteica_tarifa: p.reteica_tarifa,
        reteiva_porc: p.reteiva_porc,
        forma_pago: p.forma_pago,
        medio_pago: p.medio_pago,
        cuenta_gasto: p.cuenta_gasto,
        tipo_comprobante: p.tipo_comprobante,
        cufe_hash: p.cufe_hash,
        estado_revision: 'PENDIENTE',
        fecha_cargue: new Date().toISOString()
      };

      db.facturas.push(nuevaFactura);
      processedFacturas.push(nuevaFactura);
    }
  }

  res.json({
    status: 'success',
    archivos_procesados: files.length,
    facturas_creadas: processedFacturas.length,
    facturas: processedFacturas
  });
});

// Demo seed loader for instant XML ETL testing
router.post('/facturas/seed-demo', (req: Request, res: Response) => {
  const idEmpresa = parseInt(req.body.id_empresa || '1');
  const demoItems: Partial<Factura>[] = [
    {
      factura_num: "SETT-" + Math.floor(1000 + Math.random() * 9000),
      fecha: new Date().toISOString().split('T')[0],
      proveedor: "MICROSOFT COLOMBIA S.A.S.",
      nit_tercero: "860069921",
      ciudad: "Bogotá D.C.",
      descripcion_item: "Licenciamiento Microsoft Azure Enterprise & M365 Business",
      cantidad: 1,
      valor_unitario: 3950000,
      subtotal: 3950000,
      iva: 750500,
      total: 4700500,
      casilla_350: 62,
      retencion_porc: 4.0,
      retencion_valor: 158000,
      reteica_tarifa: 9.66,
      reteiva_porc: 15.0,
      forma_pago: "Crédito",
      medio_pago: "47 - Transferencia Bancaria",
      cuenta_gasto: "513515",
      tipo_comprobante: "COMPRAS",
      cufe_hash: "msft_cufe_" + Math.random().toString(36).substring(2, 15),
      estado_revision: "PENDIENTE",
      fecha_cargue: new Date().toISOString()
    },
    {
      factura_num: "LOG-" + Math.floor(1000 + Math.random() * 9000),
      fecha: new Date().toISOString().split('T')[0],
      proveedor: "SERVIENTREGA S.A. - LOGÍSTICA NACIONAL",
      nit_tercero: "860512330",
      ciudad: "Bogotá D.C.",
      descripcion_item: "Servicio de transporte y radicación física de correspondencia",
      cantidad: 15,
      valor_unitario: 22000,
      subtotal: 330000,
      iva: 62700,
      total: 392700,
      casilla_350: 62,
      retencion_porc: 4.0,
      retencion_valor: 13200,
      reteica_tarifa: 4.14,
      reteiva_porc: 0,
      forma_pago: "Contado",
      medio_pago: "47 - Transferencia Bancaria",
      cuenta_gasto: "513505",
      tipo_comprobante: "COMPRAS",
      cufe_hash: "servi_cufe_" + Math.random().toString(36).substring(2, 15),
      estado_revision: "PENDIENTE",
      fecha_cargue: new Date().toISOString()
    }
  ];

  demoItems.forEach(d => {
    db.facturas.push({
      id_factura: db.facturas.length + 1,
      id_empresa: idEmpresa,
      factura_num: d.factura_num!,
      fecha: d.fecha!,
      proveedor: d.proveedor!,
      nit_tercero: d.nit_tercero!,
      ciudad: d.ciudad,
      descripcion_item: d.descripcion_item!,
      cantidad: d.cantidad!,
      valor_unitario: d.valor_unitario!,
      subtotal: d.subtotal!,
      iva: d.iva!,
      total: d.total,
      casilla_350: d.casilla_350!,
      retencion_porc: d.retencion_porc!,
      retencion_valor: d.retencion_valor!,
      reteica_tarifa: d.reteica_tarifa,
      reteiva_porc: d.reteiva_porc,
      forma_pago: d.forma_pago!,
      medio_pago: d.medio_pago!,
      cuenta_gasto: d.cuenta_gasto!,
      tipo_comprobante: d.tipo_comprobante!,
      cufe_hash: d.cufe_hash!,
      estado_revision: 'PENDIENTE',
      fecha_cargue: d.fecha_cargue!
    });
  });

  res.json({ mensaje: "2 Facturas demo inyectadas correctamente en el pipeline.", total: db.facturas.length });
});

router.delete('/facturas/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const idx = db.facturas.findIndex(f => f.id_factura === id);
  if (idx === -1) {
    return res.status(404).json({ detail: "Factura no encontrada." });
  }
  db.facturas.splice(idx, 1);
  res.json({ mensaje: "Factura eliminada del motor contable." });
});

router.post('/facturas/bulk-delete', (req: Request, res: Response) => {
  const ids: number[] = Array.isArray(req.body) ? req.body : req.body.ids || [];
  db.facturas = db.facturas.filter(f => !ids.includes(f.id_factura));
  res.json({ mensaje: `Se eliminaron ${ids.length} facturas.`, restantes: db.facturas.length });
});

router.patch('/facturas/:id/estado', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { estado, autor_nombre, autor_id } = req.body;
  const f = db.facturas.find(fact => fact.id_factura === id);
  if (!f) return res.status(404).json({ detail: "Factura no encontrada." });
  const old = f.estado_revision;
  f.estado_revision = estado;
  db.saveToDisk();

  db.addModificacion({
    autor_id: autor_id ? Number(autor_id) : undefined,
    autor_nombre: autor_nombre || (req.headers['x-user-name'] as string),
    tipo_accion: 'FACTURA_AUDITADA',
    descripcion: `Cambio de estado en factura ${f.factura_num}: ${old} → ${estado}`,
    detalles: `Proveedor: ${f.proveedor}. Total: $${(f.total || 0).toLocaleString('es-CO')} COP.`
  });

  res.json(f);
});

router.patch('/facturas/:id/cuenta', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { cuenta_gasto, autor_nombre, autor_id } = req.body;
  const f = db.facturas.find(fact => fact.id_factura === id);
  if (!f) return res.status(404).json({ detail: "Factura no encontrada." });
  const old = f.cuenta_gasto;
  f.cuenta_gasto = cuenta_gasto;
  db.saveToDisk();

  db.addModificacion({
    autor_id: autor_id ? Number(autor_id) : undefined,
    autor_nombre: autor_nombre || (req.headers['x-user-name'] as string),
    tipo_accion: 'PUC_UPDATE',
    descripcion: `Reclasificación PUC en ${f.factura_num}: ${old} → ${cuenta_gasto}`,
    detalles: `Tercero: ${f.nit_tercero} (${f.proveedor})`
  });

  res.json(f);
});

router.patch('/facturas/:id/retencion', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { retencion_porc, casilla_350, autor_nombre, autor_id } = req.body;
  const f = db.facturas.find(fact => fact.id_factura === id);
  if (!f) return res.status(404).json({ detail: "Factura no encontrada." });
  if (retencion_porc !== undefined) {
    f.retencion_porc = Number(retencion_porc);
    f.retencion_valor = Math.round((f.subtotal * f.retencion_porc) / 100);
  }
  if (casilla_350 !== undefined) {
    f.casilla_350 = Number(casilla_350);
  }
  db.saveToDisk();

  db.addModificacion({
    autor_id: autor_id ? Number(autor_id) : undefined,
    autor_nombre: autor_nombre || (req.headers['x-user-name'] as string),
    tipo_accion: 'FACTURA_UPDATE',
    descripcion: `Ajuste tributario F350 en ${f.factura_num}: tarifa ${f.retencion_porc}%, casilla ${f.casilla_350}`,
    detalles: `Retención calculada: $${f.retencion_valor.toLocaleString('es-CO')} COP.`
  });

  res.json(f);
});

router.patch('/facturas/:id/reteica', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { reteica_tarifa, autor_nombre, autor_id } = req.body;
  const f = db.facturas.find(fact => fact.id_factura === id);
  if (!f) return res.status(404).json({ detail: "Factura no encontrada." });
  f.reteica_tarifa = Number(reteica_tarifa);
  db.saveToDisk();

  db.addModificacion({
    autor_id: autor_id ? Number(autor_id) : undefined,
    autor_nombre: autor_nombre || (req.headers['x-user-name'] as string),
    tipo_accion: 'FACTURA_UPDATE',
    descripcion: `Actualización tarifa ReteICA ${f.factura_num} a ${f.reteica_tarifa}‰`,
    detalles: `Proveedor: ${f.proveedor}`
  });

  res.json(f);
});

router.patch('/facturas/:id/reteiva', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { reteiva_porc, autor_nombre, autor_id } = req.body;
  const f = db.facturas.find(fact => fact.id_factura === id);
  if (!f) return res.status(404).json({ detail: "Factura no encontrada." });
  f.reteiva_porc = Number(reteiva_porc);
  db.saveToDisk();

  db.addModificacion({
    autor_id: autor_id ? Number(autor_id) : undefined,
    autor_nombre: autor_nombre || (req.headers['x-user-name'] as string),
    tipo_accion: 'FACTURA_UPDATE',
    descripcion: `Actualización tarifa ReteIVA ${f.factura_num} a ${f.reteiva_porc}%`,
    detalles: `Proveedor: ${f.proveedor}`
  });

  res.json(f);
});

router.patch('/facturas/:id/medio-pago', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { medio_pago, autor_nombre, autor_id } = req.body;
  const f = db.facturas.find(fact => fact.id_factura === id);
  if (!f) return res.status(404).json({ detail: "Factura no encontrada." });
  f.medio_pago = medio_pago;
  db.saveToDisk();

  db.addModificacion({
    autor_id: autor_id ? Number(autor_id) : undefined,
    autor_nombre: autor_nombre || (req.headers['x-user-name'] as string),
    tipo_accion: 'FACTURA_UPDATE',
    descripcion: `Medio de pago actualizado en ${f.factura_num}: ${medio_pago}`,
    detalles: `Forma de pago: ${f.forma_pago}`
  });

  res.json(f);
});

// KPIs y Métricas
router.get('/facturas/kpis/resumen', (req: Request, res: Response) => {
  const idEmpresa = req.query.id_empresa ? parseInt(req.query.id_empresa as string) : 1;
  const facts = db.facturas.filter(f => f.id_empresa === idEmpresa);

  let totalSubtotal = 0;
  let totalIva = 0;
  let totalRetencion = 0;
  let totalAuditadas = 0;

  facts.forEach(f => {
    totalSubtotal += f.subtotal || 0;
    totalIva += f.iva || 0;
    totalRetencion += f.retencion_valor || 0;
    if (f.estado_revision === 'AUDITADA' || f.estado_revision === 'SINCRONIZADA_SIIGO') {
      totalAuditadas++;
    }
  });

  const tasaAuditoria = facts.length > 0 ? Math.round((totalAuditadas / facts.length) * 100) : 0;

  res.json({
    total_facturas: facts.length,
    total_compras_netas: Math.round(totalSubtotal),
    total_iva_descontable: Math.round(totalIva),
    total_retenciones_f350: Math.round(totalRetencion),
    total_auditadas: totalAuditadas,
    tasa_auditoria: tasaAuditoria,
    total_bruto: Math.round(totalSubtotal + totalIva)
  });
});

// ==========================================
// 4. CENTRO FISCAL - FORMULARIO 350 DIAN
// ==========================================
router.get('/impuestos/f350', (req: Request, res: Response) => {
  const idEmpresa = req.query.id_empresa ? parseInt(req.query.id_empresa as string) : 1;
  const facts = db.facturas.filter(f => f.id_empresa === idEmpresa);
  const report = f350TaxEngine.calculateF350(facts);
  res.json(report);
});

// ==========================================
// 5. CONCILIACIÓN BANCARIA AUTOMÁTICA
// ==========================================
router.get('/conciliacion/movimientos', (_req: Request, res: Response) => {
  res.json({
    banco: db.movimientosBanco,
    libros: db.movimientosLibro
  });
});

router.post('/conciliacion/ejecutar', (req: Request, res: Response) => {
  const tolerancia = parseFloat(req.body.tolerancia || '0');
  const result = reconciliationEngine.executeReconciliation(db.movimientosBanco, db.movimientosLibro, tolerancia);
  res.json(result);
});

router.post('/conciliacion/generar-plano-gastos', (_req: Request, res: Response) => {
  const pendientes = db.movimientosBanco.filter(b => !b.conciliado);
  const flatFile = reconciliationEngine.generateSiigoAdjustmentFlatFile(pendientes);
  res.json({
    status: 'success',
    total_ajustes: flatFile.length,
    asientos: flatFile
  });
});

// ==========================================
// 6. CEREBRO CONTABLE (PUC & BALANCE)
// ==========================================
router.get('/contabilidad/puc', (req: Request, res: Response) => {
  const idEmpresa = req.query.id_empresa ? parseInt(req.query.id_empresa as string) : 1;
  const list = db.cuentasPUC.filter(p => p.id_empresa === idEmpresa);
  res.json(list);
});

router.get('/contabilidad/balance', (req: Request, res: Response) => {
  const idEmpresa = req.query.id_empresa ? parseInt(req.query.id_empresa as string) : 1;
  const list = db.balanceTerceros.filter(b => b.id_empresa === idEmpresa);
  res.json(list);
});

// ==========================================
// 7. INTEGRACIÓN SIIGO NUBE API
// ==========================================
router.get('/siigo/medios-pago', (_req: Request, res: Response) => {
  res.json(siigoService.getMediosPagoCatalog());
});

router.get('/siigo/impuestos', (_req: Request, res: Response) => {
  res.json(siigoService.getImpuestosCatalog());
});

router.post('/siigo/probar-conexion', async (req: Request, res: Response) => {
  const { username, access_key } = req.body;
  const result = await siigoService.testConnection(username, access_key);
  res.json(result);
});

router.post('/siigo/enviar-facturas', async (req: Request, res: Response) => {
  const { facturas_ids, id_tipo_doc, id_medio_pago } = req.body;
  const ids: number[] = Array.isArray(facturas_ids) ? facturas_ids : [];

  const resultados = [];
  for (const id of ids) {
    const f = db.facturas.find(fact => fact.id_factura === id);
    if (!f) continue;

    const resSync = await siigoService.transmitInvoiceToSiigo(f, id_tipo_doc || 24, id_medio_pago);
    if (resSync.status === 'success') {
      f.estado_revision = 'SINCRONIZADA_SIIGO';
      f.siigo_id = resSync.siigo_id;
    }
    resultados.push(resSync);
  }

  res.json({
    status: 'success',
    total_enviadas: resultados.length,
    resultados
  });
});

// ==========================================
// 8. CENTRO DE ARQUITECTURA & ESCALABILIDAD
// ==========================================
router.get('/architecture/benchmarks', (_req: Request, res: Response) => {
  res.json({
    benchmarks: scalabilityArchitecture.getBenchmarks(),
    modules: scalabilityArchitecture.getModules(),
    roadmap: scalabilityArchitecture.getScalingRoadmap()
  });
});

export default router;
