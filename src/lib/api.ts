/**
 * Ayudantes de API del cliente: envían la identidad del usuario activo (para permisos por empresa)
 * y gestionan descargas informando si el archivo quedó guardado en el almacenamiento de la empresa.
 */

export function usuarioActualId(): string {
  try {
    return localStorage.getItem('tlm_current_user_id') || '';
  } catch {
    return '';
  }
}

export function encabezadosTlm(extra: Record<string, string> = {}): Record<string, string> {
  const id = usuarioActualId();
  return id ? { 'x-tlm-user-id': id, ...extra } : { ...extra };
}

export async function apiJson<T = any>(url: string, init: RequestInit = {}): Promise<T> {
  const esFormData = typeof FormData !== 'undefined' && init.body instanceof FormData;
  const res = await fetch(url, {
    ...init,
    headers: encabezadosTlm({
      ...(init.body && !esFormData ? { 'Content-Type': 'application/json' } : {}),
      ...((init.headers as Record<string, string>) || {})
    })
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const err: any = new Error(data?.detail || `Error ${res.status}`);
    err.data = data;
    throw err;
  }
  return data as T;
}

export interface ResultadoDescarga {
  nombre: string;
  archivado: 'ok' | 'omitido' | 'error' | 'desconocido';
  detalleArchivado: string;
  encabezados: Headers;
}

/** Descarga un archivo generado por el servidor (GET o POST con JSON / FormData). */
export async function descargarArchivo(url: string, init: RequestInit = {}, nombrePorDefecto = 'archivo'): Promise<ResultadoDescarga> {
  const esFormData = typeof FormData !== 'undefined' && init.body instanceof FormData;
  const res = await fetch(url, {
    ...init,
    headers: encabezadosTlm({
      ...(init.body && !esFormData ? { 'Content-Type': 'application/json' } : {}),
      ...((init.headers as Record<string, string>) || {})
    })
  });
  if (!res.ok) {
    let detalle = `Error ${res.status}`;
    try {
      const j = await res.json();
      detalle = j.detail || detalle;
    } catch {}
    throw new Error(detalle);
  }
  const disp = res.headers.get('Content-Disposition') || '';
  const m = disp.match(/filename\*=UTF-8''([^;]+)/i) || disp.match(/filename="?([^";]+)"?/i);
  const nombre = m ? decodeURIComponent(m[1]) : nombrePorDefecto;
  const blob = await res.blob();
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(blob);
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(enlace.href), 4000);
  const archivado = (res.headers.get('X-TLM-Archivado') as ResultadoDescarga['archivado']) || 'desconocido';
  return {
    nombre,
    archivado,
    detalleArchivado: decodeURIComponent(res.headers.get('X-TLM-Archivado-Detalle') || ''),
    encabezados: res.headers
  };
}

/** Texto corto para el aviso (toast) según el resultado del archivado. */
export function textoArchivado(r: ResultadoDescarga): string {
  if (r.archivado === 'ok') return ' y se guardó en la carpeta de la empresa';
  if (r.archivado === 'error') return `, pero no se pudo guardar en la carpeta de la empresa (${r.detalleArchivado})`;
  return '';
}

export const formatoCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);

export const formatoBytes = (b: number) => {
  if (!b) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(b) / Math.log(1024)), u.length - 1);
  return `${(b / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${u[i]}`;
};
