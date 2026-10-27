/**
 * Catálogos contingentes de retenciones (norma DIAN / territoriales Colombia).
 * Se usan cuando la empresa no tiene Siigo conectado; con Siigo se usan los IDs reales de /v1/taxes.
 * Compartido entre el servidor y la interfaz.
 */
export interface TarifaCatalogo {
  id: string;
  nombre: string;
  porcentaje: number;
  /** Casilla del Formulario 350 a la que suma (solo ReteFuente) */
  casilla?: number;
}

export const CATALOGO_RTEFTE: TarifaCatalogo[] = [
  { id: 'porc_0', nombre: 'Sin Retención (0%)', porcentaje: 0, casilla: 64 },
  { id: 'porc_1.5', nombre: 'Compras Agrícolas / Combustibles (1.5%)', porcentaje: 1.5, casilla: 64 },
  { id: 'porc_2.5', nombre: 'Compras Generales - Declarante (2.5%)', porcentaje: 2.5, casilla: 64 },
  { id: 'porc_3.5', nombre: 'Compras Generales - No Declarante (3.5%)', porcentaje: 3.5, casilla: 64 },
  { id: 'porc_4', nombre: 'Servicios Generales - Declarante (4.0%)', porcentaje: 4, casilla: 62 },
  { id: 'porc_6', nombre: 'Servicios Generales - No Declarante (6.0%)', porcentaje: 6, casilla: 62 },
  { id: 'porc_10', nombre: 'Honorarios / Consultoría - P. Natural (10.0%)', porcentaje: 10, casilla: 61 },
  { id: 'porc_11', nombre: 'Honorarios / Consultoría - P. Jurídica (11.0%)', porcentaje: 11, casilla: 61 }
];

/** Tarifas por mil (‰) */
export const CATALOGO_RTEICA: TarifaCatalogo[] = [
  { id: 'porc_0', nombre: 'Sin ReteICA (0‰)', porcentaje: 0 },
  { id: 'porc_2', nombre: 'Tarifa Especial (2.0‰)', porcentaje: 2 },
  { id: 'porc_4.14', nombre: 'Industria y Comercio (4.14‰)', porcentaje: 4.14 },
  { id: 'porc_6.9', nombre: 'Industria y Comercio (6.90‰)', porcentaje: 6.9 },
  { id: 'porc_9.66', nombre: 'Servicios Especiales (9.66‰)', porcentaje: 9.66 },
  { id: 'porc_11.04', nombre: 'Comercial / Servicios (11.04‰)', porcentaje: 11.04 },
  { id: 'porc_13.8', nombre: 'Honorarios / Financiero (13.80‰)', porcentaje: 13.8 }
];

export const CATALOGO_RTEIVA: TarifaCatalogo[] = [
  { id: 'porc_0', nombre: 'Sin ReteIVA (0%)', porcentaje: 0 },
  { id: 'porc_15', nombre: 'ReteIVA Estándar DIAN (15.0%)', porcentaje: 15 },
  { id: 'porc_100', nombre: 'ReteIVA Total (100.0%)', porcentaje: 100 }
];

export const ERP_DESTINO = ['Siigo Nube', 'Siigo Pyme (Desktop)', 'World Office', 'Aliaddo', 'Alegra', 'SAP Business One', 'Odoo ERP'];

export const BANCOS_EXTRACTO = ['AUTO', 'DAVIVIENDA', 'BANCOLOMBIA', 'BANCO DE BOGOTÁ', 'BANCO CAJA SOCIAL', 'GLOBAL66', 'BBVA', 'BANCO DE OCCIDENTE', 'BANCO POPULAR', 'AV VILLAS', 'SCOTIABANK COLPATRIA', 'ITAÚ', 'NEQUI'];

/** Casilla F350 según la tarifa de ReteFuente aplicada */
export function casillaPorTarifa(porcentaje: number): number {
  if (porcentaje >= 10) return 61;
  if (porcentaje >= 4) return 62;
  return 64;
}
