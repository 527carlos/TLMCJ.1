import { MovimientoBancario, MovimientoLibro, CruceConciliacion } from '../domain/types.ts';

export interface ReconciliationSummary {
  totalBanco: number;
  totalLibros: number;
  partidasConciliadas: number;
  partidasPendientesBanco: number;
  partidasPendientesLibros: number;
  diferenciaNeta: number;
  tasaCoincidencia: number;
  cruces: CruceConciliacion[];
  pendientesBanco: MovimientoBancario[];
  pendientesLibro: MovimientoLibro[];
}

export class ReconciliationEngineService {
  /**
   * Execute algorithmic reconciliation between bank extract records and accounting book ledger.
   */
  public executeReconciliation(
    bancoRows: MovimientoBancario[],
    libroRows: MovimientoLibro[],
    toleranciaMonto: number = 0.0
  ): ReconciliationSummary {
    const cruces: CruceConciliacion[] = [];
    const matchedBancoIds = new Set<string>();
    const matchedLibroIds = new Set<string>();

    let totalBancoSum = 0;
    bancoRows.forEach(b => { totalBancoSum += (b.tipo === 'DEBITO' ? -b.monto : b.monto); });

    let totalLibrosSum = 0;
    libroRows.forEach(l => { totalLibrosSum += (l.tipo === 'DEBITO' ? -l.monto : l.monto); });

    // Step 1: Exact Amount & Date match
    for (const b of bancoRows) {
      if (matchedBancoIds.has(b.id)) continue;

      for (const l of libroRows) {
        if (matchedLibroIds.has(l.id)) continue;

        const diff = Math.abs(b.monto - l.monto);
        const sameType = b.tipo === l.tipo;
        const sameDate = b.fecha === l.fecha;

        if (diff === 0 && sameType && sameDate) {
          matchedBancoIds.add(b.id);
          matchedLibroIds.add(l.id);
          b.conciliado = true;
          l.conciliado = true;
          b.match_id = l.id;
          l.match_id = b.id;

          cruces.push({
            id_cruce: `CRUCE-${cruces.length + 1}`,
            banco: { ...b },
            libro: { ...l },
            diferencia: 0,
            puntaje_coincidencia: 100,
            metodo_match: 'EXACTO'
          });
          break;
        }
      }
    }

    // Step 2: Amount within tolerance and +/- 7 days
    for (const b of bancoRows) {
      if (matchedBancoIds.has(b.id)) continue;

      for (const l of libroRows) {
        if (matchedLibroIds.has(l.id)) continue;

        const diff = Math.abs(b.monto - l.monto);
        const sameType = b.tipo === l.tipo;

        if (diff <= toleranciaMonto && sameType) {
          const bTime = new Date(b.fecha).getTime();
          const lTime = new Date(l.fecha).getTime();
          const dayDiff = Math.abs(bTime - lTime) / (1000 * 3600 * 24);

          if (dayDiff <= 7) {
            matchedBancoIds.add(b.id);
            matchedLibroIds.add(l.id);
            b.conciliado = true;
            l.conciliado = true;
            b.match_id = l.id;
            l.match_id = b.id;

            cruces.push({
              id_cruce: `CRUCE-${cruces.length + 1}`,
              banco: { ...b },
              libro: { ...l },
              diferencia: diff,
              puntaje_coincidencia: Math.max(70, Math.round(95 - dayDiff * 3 - diff)),
              metodo_match: diff === 0 ? 'APROX_FECHA_VALOR' : 'TOLERANCIA_VALOR'
            });
            break;
          }
        }
      }
    }

    const pendientesBanco = bancoRows.filter(b => !matchedBancoIds.has(b.id));
    const pendientesLibro = libroRows.filter(l => !matchedLibroIds.has(l.id));

    const totalTransacciones = bancoRows.length + libroRows.length;
    const tasa = totalTransacciones > 0
      ? Math.round(((cruces.length * 2) / totalTransacciones) * 100)
      : 0;

    return {
      totalBanco: totalBancoSum,
      totalLibros: totalLibrosSum,
      partidasConciliadas: cruces.length,
      partidasPendientesBanco: pendientesBanco.length,
      partidasPendientesLibros: pendientesLibro.length,
      diferenciaNeta: Math.abs(totalBancoSum - totalLibrosSum),
      tasaCoincidencia: tasa,
      cruces,
      pendientesBanco,
      pendientesLibro
    };
  }

  /**
   * Generates accounting adjustment layout file for Siigo Nube from unmatched bank transactions
   * (e.g. 4x1000 GMF -> 511595, Bancarias -> 530515).
   */
  public generateSiigoAdjustmentFlatFile(pendientesBanco: MovimientoBancario[]): any[] {
    return pendientesBanco.map((mov, idx) => {
      let cuentaAjuste = "530515"; // Comisiones financieras
      let concepto = mov.concepto;
      const lower = concepto.toLowerCase();

      if (lower.includes("4x1000") || lower.includes("gravamen") || lower.includes("gmf")) {
        cuentaAjuste = "511595"; // Gravamen a los movimientos financieros
      } else if (lower.includes("interes") || lower.includes("rendimiento")) {
        cuentaAjuste = "421005"; // Rendimientos financieros
      }

      return {
        linea: idx + 1,
        comprobante: "CC-99", // Comprobante Contable de Ajuste
        fecha: mov.fecha,
        cuenta: cuentaAjuste,
        nit: "890903938", // Banco
        descripcion: `Ajuste extracto: ${mov.concepto}`,
        debito: mov.tipo === 'DEBITO' ? mov.monto : 0,
        credito: mov.tipo === 'CREDITO' ? mov.monto : 0
      };
    });
  }
}

export const reconciliationEngine = new ReconciliationEngineService();
