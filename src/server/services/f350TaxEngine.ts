import { Factura, F350Casilla } from '../domain/types.ts';

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
  public calculateF350(facturas: Factura[]): F350TaxLiquidationResult {
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
      if (f.tipo_comprobante === 'NOTA_CREDITO') continue;

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

    // Año gravable tomado de las facturas (el más reciente); si no hay facturas, el año en curso
    const anos = facturas.map(f => new Date(f.fecha).getFullYear()).filter(a => Number.isFinite(a));
    const anoGravable = anos.length > 0 ? Math.max(...anos) : new Date().getFullYear();

    return {
      periodo: `Año gravable ${anoGravable}`,
      anoGravable,
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
