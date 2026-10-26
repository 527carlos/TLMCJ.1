import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import type { Factura, Empresa } from '../domain/types.ts';

export class DianPdfService {
  public static generarFacturaPdfBuffer(factura: Factura, empresa?: Empresa | null): Buffer {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    const contentWidth = pageWidth - (margin * 2);

    const formatCOP = (num: number) => {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
      }).format(num || 0);
    };

    const primaryColor = [39, 26, 130];
    const accentGreen = [16, 185, 129];
    const darkGray = [30, 41, 59];
    const lightBg = [248, 250, 252];
    const borderColor = [203, 213, 225];

    let y = 14;

    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(margin, y, contentWidth, 3, 'F');
    y += 7;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('DIAN', margin, y + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text('FACTURA ELECTRÓNICA DE VENTA', margin + 30, y + 2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Representación Gráfica según Decreto 2242 y Resolución DIAN 000042', margin + 30, y + 6.5);

    const badgeWidth = 48;
    const badgeHeight = 12;
    const badgeX = pageWidth - margin - badgeWidth;
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.roundedRect(badgeX, y - 2, badgeWidth, badgeHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('FACTURA N°', badgeX + 4, y + 2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(factura.factura_num || 'FE-000', badgeX + 4, y + 7.5);

    y += 16;

    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Datos del Documento', margin + 4, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);

    const col1X = margin + 4;
    const col2X = margin + 55;
    const col3X = margin + 115;

    doc.text(`Fecha Emisión: `, col1X, y + 10);
    doc.setFont('helvetica', 'bold');
    doc.text(`${factura.fecha || 'N/A'}`, col1X + 22, y + 10);

    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha Vencimiento: `, col1X, y + 15);
    doc.setFont('helvetica', 'bold');
    doc.text(`${factura.fecha_vencimiento || factura.fecha || 'N/A'}`, col1X + 28, y + 15);

    doc.setFont('helvetica', 'normal');
    doc.text(`Forma de Pago: `, col2X, y + 10);
    doc.setFont('helvetica', 'bold');
    doc.text(`${factura.forma_pago || 'Contado'}`, col2X + 22, y + 10);

    doc.setFont('helvetica', 'normal');
    doc.text(`Medio de Pago: `, col2X, y + 15);
    doc.setFont('helvetica', 'bold');
    doc.text(`${factura.medio_pago || 'Transferencia Débito Bancaria'}`, col2X + 22, y + 15);

    doc.setFont('helvetica', 'normal');
    doc.text(`Tipo Comprobante: `, col3X, y + 10);
    doc.setFont('helvetica', 'bold');
    doc.text(`${factura.tipo_comprobante || 'Factura Electrónica'}`, col3X + 26, y + 10);

    doc.setFont('helvetica', 'normal');
    doc.text(`Estado Auditoría: `, col3X, y + 15);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(accentGreen[0], accentGreen[1], accentGreen[2]);
    doc.text(`${factura.estado_revision || 'AUDITADA'}`, col3X + 24, y + 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('CUFE:', col1X, y + 20.5);
    doc.setFont('courier', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(30, 41, 59);
    const cufeText = factura.cufe_hash || 'Sin CUFE registrado en XML UBL 2.1';
    doc.text(cufeText.length > 95 ? cufeText.substring(0, 95) + '...' : cufeText, col1X + 11, y + 20.5);

    y += 28;

    const boxW = (contentWidth - 4) / 2;
    const boxH = 34;

    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.roundedRect(margin, y, boxW, boxH, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Datos del Emisor / Vendedor', margin + 4, y + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    const provName = factura.proveedor || 'Proveedor No Identificado';
    doc.text(provName.substring(0, 36), margin + 4, y + 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`NIT: ${factura.nit_tercero || 'N/A'}`, margin + 4, y + 14.5);
    doc.text(`Dirección: ${factura.direccion || 'Calle Principal # 10-20'}`, margin + 4, y + 19);
    doc.text(`Ciudad: ${factura.ciudad || 'Bogotá D.C.'} - ${factura.departamento || 'Cundinamarca'}`, margin + 4, y + 23.5);
    doc.text(`Tel: ${factura.telefono || 'N/A'} | Correo: ${factura.correo || 'facturacion@dian.gov.co'}`, margin + 4, y + 28);
    doc.text(`Régimen: Responsable de IVA (R-99-PN)`, margin + 4, y + 32);

    const adqX = margin + boxW + 4;
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.roundedRect(adqX, y, boxW, boxH, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Datos del Adquiriente / Comprador', adqX + 4, y + 5);

    const empNombre = empresa?.nombre_comercial || 'TECNOLOGÍA Y LOGÍSTICA MODERNA S.A.S. BIC';
    const empNit = empresa?.nit || '900.543.210-9';

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text(empNombre.substring(0, 36), adqX + 4, y + 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`NIT: ${empNit}`, adqX + 4, y + 14.5);
    doc.text(`Dirección: Carrera 15 # 93-75 Oficina 602`, adqX + 4, y + 19);
    doc.text(`Ciudad: Bogotá D.C. - Cundinamarca`, adqX + 4, y + 23.5);
    doc.text(`Correo: contabilidad@tlm.net.co`, adqX + 4, y + 28);
    doc.text(`Responsabilidad: Autorretenedor / Régimen Común`, adqX + 4, y + 32);

    y += boxH + 6;

    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(margin, y, contentWidth, 7, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);

    const th1 = margin + 3;
    const th2 = margin + 12;
    const th3 = margin + 85;
    const th4 = margin + 105;
    const th5 = margin + 130;
    const th6 = margin + 155;

    doc.text('N°', th1, y + 4.5);
    doc.text('Descripción del Producto / Servicio', th2, y + 4.5);
    doc.text('Cant.', th3, y + 4.5);
    doc.text('Vr. Unitario', th4, y + 4.5);
    doc.text('IVA (19%)', th5, y + 4.5);
    doc.text('Subtotal', th6, y + 4.5);

    y += 7;

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.rect(margin, y, contentWidth, 12, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);

    doc.text('1', th1, y + 5);
    const desc = factura.descripcion_item || 'Bienes o servicios según contrato comercial UBL 2.1';
    doc.text(desc.substring(0, 48), th2, y + 5);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Cuenta Contable PUC Sugerida: ${factura.cuenta_gasto || '513535'}`, th2, y + 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text(`${factura.cantidad || 1}`, th3, y + 5);
    doc.text(formatCOP(factura.valor_unitario || factura.subtotal), th4, y + 5);
    doc.text(formatCOP(factura.iva), th5, y + 5);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCOP(factura.subtotal), th6, y + 5);

    y += 16;

    const totalsBoxW = 75;
    const totalsBoxX = pageWidth - margin - totalsBoxW;
    const totalsBoxH = 46;

    const notesBoxW = contentWidth - totalsBoxW - 4;
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.roundedRect(margin, y, notesBoxW, totalsBoxH, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Información Tributaria & Retenciones', margin + 4, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`• Casilla Formulario 350 DIAN: Casilla ${factura.casilla_350 || 83}`, margin + 4, y + 11);
    doc.text(`• Tarifa Retención Fuente: ${factura.retencion_porc || 0}%`, margin + 4, y + 16);
    doc.text(`• Tarifa Retención ICA: ${factura.reteica_tarifa || 0} por mil`, margin + 4, y + 21);
    doc.text(`• Tarifa Retención IVA (ReteIVA): ${factura.reteiva_porc || 0}%`, margin + 4, y + 26);
    doc.text(`• Transmisión a ERP: Sincronización automática a Siigo Nube`, margin + 4, y + 31);
    doc.text(`• Firma Digital: Generada y validada contra catálogo DIAN`, margin + 4, y + 36);

    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.roundedRect(totalsBoxX, y, totalsBoxW, totalsBoxH, 2, 2, 'FD');

    const tLabelX = totalsBoxX + 4;
    const tValX = totalsBoxX + totalsBoxW - 4;

    const retefuenteVal = factura.retencion_valor || 0;
    const reteicaVal = factura.reteica_tarifa ? (factura.subtotal * factura.reteica_tarifa) / 1000 : 0;
    const reteivaVal = factura.reteiva_porc ? (factura.iva * factura.reteiva_porc) / 100 : 0;
    const totalPagar = (factura.subtotal + factura.iva) - retefuenteVal - reteicaVal - reteivaVal;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);

    doc.text('Subtotal:', tLabelX, y + 6);
    doc.text(formatCOP(factura.subtotal), tValX, y + 6, { align: 'right' });

    doc.text('IVA (19%):', tLabelX, y + 11);
    doc.text(formatCOP(factura.iva), tValX, y + 11, { align: 'right' });

    doc.text('(-) Retención Fuente:', tLabelX, y + 16);
    doc.text(`-${formatCOP(retefuenteVal)}`, tValX, y + 16, { align: 'right' });

    doc.text('(-) ReteICA:', tLabelX, y + 21);
    doc.text(`-${formatCOP(reteicaVal)}`, tValX, y + 21, { align: 'right' });

    doc.text('(-) ReteIVA:', tLabelX, y + 26);
    doc.text(`-${formatCOP(reteivaVal)}`, tValX, y + 26, { align: 'right' });

    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.roundedRect(totalsBoxX + 2, y + 31, totalsBoxW - 4, 12, 1.5, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL A PAGAR:', tLabelX + 2, y + 38.5);
    doc.setFontSize(9.5);
    doc.text(formatCOP(totalPagar), tValX - 2, y + 38.5, { align: 'right' });

    y += totalsBoxH + 10;

    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.line(margin, y, margin + contentWidth, y);
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      'Documento equivalente generado según normatividad DIAN UBL 2.1 - Anexo Técnico de Factura Electrónica de Venta.',
      margin,
      y
    );
    doc.text(
      'Consola TLM Enterprise Fiscal Engine • Valide este comprobante escaneando el código QR o en el portal oficial de la DIAN.',
      margin,
      y + 3.5
    );

    const pdfArrayBuffer = doc.output('arraybuffer');
    return Buffer.from(pdfArrayBuffer);
  }

  public static async generarSoportesZipBuffer(facturas: Factura[], empresa?: Empresa | null): Promise<Buffer> {
    const zip = new JSZip();

    facturas.forEach((factura, index) => {
      const padNum = String(index + 1).padStart(2, '0');
      const safeProv = (factura.proveedor || 'PROVEEDOR')
        .replace(/[^\w\s-]/g, '')
        .trim()
        .toUpperCase()
        .substring(0, 35);
      const safeFactNum = (factura.factura_num || 'FE')
        .replace(/[^\w-]/g, '')
        .trim()
        .toUpperCase();

      const fileName = `${padNum}_${safeFactNum}_${safeProv}.pdf`;
      const pdfBuffer = this.generarFacturaPdfBuffer(factura, empresa);
      zip.file(fileName, pdfBuffer);
    });

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    return zipBuffer;
  }
}
