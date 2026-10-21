import { CloudSqlService } from './src/server/services/cloudSqlService.ts';

async function test() {
  console.log("Testing CloudSqlService.createFactura...");
  try {
    const f = await CloudSqlService.createFactura({
      id_empresa: 1,
      factura_num: "TEST-INV-" + Math.floor(1000 + Math.random() * 9000),
      proveedor: "PROVEEDOR PRUEBA S.A.S.",
      nit_tercero: "900123456",
      fecha: "2026-10-21",
      descripcion_item: "Prueba de insercion directa",
      cantidad: 1,
      valor_unitario: 500000,
      subtotal: 500000,
      iva: 95000,
      total: 595000,
      retencion_porc: 2.5,
      retencion_valor: 12500,
      casilla_350: 64,
      forma_pago: "Crédito",
      medio_pago: "Transferencia Débito",
      cuenta_gasto: "513535",
      estado_revision: "PENDIENTE",
      cufe_hash: "cufe-test-" + Date.now(),
    });
    console.log("Created invoice:", f);

    console.log("Listing facturas from CloudSqlService.getFacturas({ idEmpresa: 1 })...");
    const list = await CloudSqlService.getFacturas({ idEmpresa: 1 });
    console.log("Total facturas count for empresa 1:", list.length);
    const found = list.find(x => x.id_factura === f.id_factura);
    console.log("Found inserted invoice in list:", !!found);

    // clean up test invoice
    await CloudSqlService.deleteFactura(f.id_factura);
    console.log("Deleted test invoice successfully.");
  } catch (e) {
    console.error("Test failed:", e);
  }
}

test().catch(console.error);
