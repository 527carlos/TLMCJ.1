import type { Factura, F350Casilla } from '../domain/types.ts';

export interface F350TaxLiquidationResult {
  periodo: string;
  anoGravable: number;
  totalBasesGravables: number;
  totalRetenciones: number;
  totalReteIva: number;
  totalReteIca: number;
  granTotalRetenido: number;
  casillas: F350Casilla[];
}

export class F350TaxEngineService {
  /**
   * Generates DIAN Formulario 350 tax liquidation for withholding taxes (Retención en la Fuente).
   */
  public calculateF350(todas: Factura[], filtro: { desde?: string; hasta?: string } = {}): F350TaxLiquidationResult {
    // Solo compras (las ventas no generan retenciones practicadas por la empresa) y dentro del periodo
    const facturas = todas.filter(f =>
      f.tipo_operacion !== 'VENTA' &&
      (!filtro.desde || (f.fecha || '') >= filtro.desde) &&
      (!filtro.hasta || (f.fecha || '') <= filtro.hasta)
    );
    const fechas = facturas.map(f => f.fecha).filter(x => /^\d{4}-\d{2}/.test(x || '')).sort();
    const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const etiquetaMes = (iso: string) => `${MESES[Number(iso.substring(5, 7)) - 1]} ${iso.substring(0, 4)}`;
    const inicio = filtro.desde || fechas[0];
    const fin = filtro.hasta || fechas[fechas.length - 1];
    const periodo = !inicio ? 'Sin facturas de compra' : inicio.substring(0, 7) === (fin || inicio).substring(0, 7) ? etiquetaMes(inicio) : `${etiquetaMes(inicio)} – ${etiquetaMes(fin || inicio)}`;
    const casillaMap = new Map<number, {
      concepto: string;
      base: number;
      retencion: number;
      tarifa: number;
      facturas: string[];
    }>();

    // Default casillas standard in DIAN F350
    casillaMap.set(61, { concepto: "Honorarios (Personas Jurídicas / Declarantes)", base: 0, retencion: 0, tarifa: 10.0, facturas: [] });
    casillaMap.set(62, { concepto: "Servicios Generales (Declarantes 4%)", base: 0, retencion: 0, tarifa: 4.0, facturas: [] });
    casillaMap.set(63, { concepto: "Arrendamientos (Bienes Raíces / Muebles)", base: 0, retencion: 0, tarifa: 3.5, facturas: [] });
    casillaMap.set(64, { concepto: "Compras Generales (Bienes y Mercancías)", base: 0, retencion: 0, tarifa: 2.5, facturas: [] });
    casillaMap.set(80, { concepto: "Retención en la Fuente a Título de IVA (ReteIVA 15%)", base: 0, retencion: 0, tarifa: 15.0, facturas: [] });

    let totalBases = 0;
    let totalRet = 0;
    let totalReteIva = 0;
    let totalReteIca = 0;

    for (const f of facturas) {
      if (/nota/i.test(f.tipo_comprobante || '')) continue;

      const subtotal = f.subtotal || 0;
      const cNum = f.casilla_350 || 64;
      const retValor = f.retencion_valor || ((subtotal * (f.retencion_porc || 0)) / 100);

      totalBases += subtotal;
      totalRet += retValor;

      if (!casillaMap.has(cNum)) {
        casillaMap.set(cNum, {
          concepto: `Otros Conceptos Casilla ${cNum}`,
          base: 0,
          retencion: 0,
          tarifa: f.retencion_porc || 0,
          facturas: []
        });
      }

      const item = casillaMap.get(cNum)!;
      item.base += subtotal;
      item.retencion += retValor;
      item.facturas.push(f.factura_num);

      // ReteIVA
      if (f.reteiva_porc && f.reteiva_porc > 0 && f.iva > 0) {
        const valReteIva = (f.iva * f.reteiva_porc) / 100;
        totalReteIva += valReteIva;

        const c80 = casillaMap.get(80)!;
        c80.base += f.iva;
        c80.retencion += valReteIva;
        if (!c80.facturas.includes(f.factura_num)) c80.facturas.push(f.factura_num);
      }

      // ReteICA
      if (f.reteica_tarifa && f.reteica_tarifa > 0) {
        totalReteIca += (subtotal * f.reteica_tarifa) / 1000;
      }
    }

    const casillasResult: F350Casilla[] = [];
    casillaMap.forEach((val, key) => {
      casillasResult.push({
        casilla: key,
        concepto: val.concepto,
        base_gravable: Math.round(val.base),
        tarifa_sugerida: val.tarifa,
        retencion_calculada: Math.round(val.retencion),
        cantidad_facturas: val.facturas.length,
        facturas_asociadas: val.facturas
      });
    });

    casillasResult.sort((a, b) => a.casilla - b.casilla);

    return {
      periodo,
      anoGravable: Number((fin || inicio || new Date().toISOString()).substring(0, 4)),
      totalBasesGravables: Math.round(totalBases),
      totalRetenciones: Math.round(totalRet),
      totalReteIva: Math.round(totalReteIva),
      totalReteIca: Math.round(totalReteIca),
      granTotalRetenido: Math.round(totalRet + totalReteIva + totalReteIca),
      casillas: casillasResult
    };
  }
}

export const f350TaxEngine = new F350TaxEngineService();
