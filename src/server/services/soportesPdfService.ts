/**
 * Representación gráfica en PDF de facturas electrónicas UBL 2.1 y empaquetado en ZIP.
 */
import PDFDocument from 'pdfkit';
import JSZip from 'jszip';
import type { Factura, ParteFactura } from '../domain/types.ts';
import { retenciones } from './contabilidadService.ts';

const COLOR_PRIMARIO = '#271a82';
const COLOR_LINEA = '#9be3c0';
const COLOR_TEXTO = '#1f2937';
const COLOR_SUAVE = '#6b7280';

const cop = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 2 }).format(n || 0);

export const nombreSoporte = (indice: number, f: Factura) => {
  const tercero = (f.proveedor || 'TERCERO').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim().substring(0, 60);
  const numero = (f.factura_num || 'SN').replace(/[^\w-]/g, '');
  return `${indice}_${numero}_${tercero}.pdf`;
};

function partes(f: Factura, empresa: { nit: string; nombre_comercial: string }): { emisor: ParteFactura; adquiriente: ParteFactura } {
  const tercero: ParteFactura = {
    nit: f.nit_tercero,
    razon_social: f.proveedor,
    telefono: f.telefono,
    direccion: f.direccion,
    ciudad: f.ciudad,
    departamento: f.departamento,
    correo: f.correo
  };
  const propia: ParteFactura = { nit: empresa.nit, razon_social: empresa.nombre_comercial };
  const emisor = f.datos_ubl?.emisor || (f.tipo_operacion === 'VENTA' ? propia : tercero);
  const adquiriente = f.datos_ubl?.adquiriente || (f.tipo_operacion === 'VENTA' ? tercero : propia);
  return { emisor, adquiriente };
}

export function generarPdfFactura(f: Factura, empresa: { nit: string; nombre_comercial: string }): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margins: { top: 40, bottom: 40, left: 46, right: 46 }, info: { Title: `Factura ${f.factura_num}`, Author: 'Consola TLM' } });
    const trozos: Buffer[] = [];
    doc.on('data', c => trozos.push(c));
    doc.on('end', () => resolve(Buffer.concat(trozos)));
    doc.on('error', reject);

    const ancho = doc.page.width - 92;
    const x0 = 46;
    const esNota = /nota/i.test(f.tipo_comprobante || '');
    const { emisor, adquiriente } = partes(f, empresa);

    // Encabezado
    doc.fillColor(COLOR_PRIMARIO).font('Helvetica-Bold').fontSize(15)
      .text(esNota ? 'NOTA CRÉDITO ELECTRÓNICA' : 'FACTURA ELECTRÓNICA DE VENTA', x0, 44, { width: ancho, align: 'center' });
    doc.fillColor(COLOR_TEXTO).font('Helvetica-Bold').fontSize(11).text('Representación Gráfica', { width: ancho, align: 'center' });
    doc.moveDown(0.4);
    doc.rect(x0, doc.y, ancho, 3).fill(COLOR_LINEA);
    doc.moveDown(0.8);

    const seccion = (titulo: string) => {
      doc.moveDown(0.5);
      doc.fillColor(COLOR_PRIMARIO).font('Helvetica-Bold').fontSize(10.5).text(titulo, x0 + 10, doc.y);
      doc.rect(x0, doc.y + 2, ancho, 1.2).fill(COLOR_LINEA);
      doc.moveDown(0.6);
    };

    const dosColumnas = (izq: [string, string | undefined][], der: [string, string | undefined][]) => {
      const yInicio = doc.y;
      const colW = ancho / 2 - 10;
      const pintar = (pares: [string, string | undefined][], x: number) => {
        doc.y = yInicio;
        for (const [k, v] of pares) {
          doc.font('Helvetica-Bold').fontSize(8).fillColor(COLOR_TEXTO).text(`${k}: `, x, doc.y, { continued: true, width: colW })
            .font('Helvetica').fillColor(COLOR_TEXTO).text(v || '—', { width: colW });
        }
        return doc.y;
      };
      const yIzq = pintar(izq, x0 + 16);
      const yDer = pintar(der, x0 + ancho / 2 + 6);
      doc.y = Math.max(yIzq, yDer);
      doc.x = x0;
    };

    seccion('Datos del Documento');
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLOR_TEXTO).text('Código Único de Factura - CUFE:', x0 + 16, doc.y);
    doc.font('Helvetica').fontSize(7.5).text(f.cufe_hash || '—', x0 + 16, doc.y, { width: ancho - 32 });
    doc.moveDown(0.3);
    dosColumnas(
      [
        ['Número de Factura', f.factura_num],
        ['Fecha de Emisión', f.fecha],
        ['Fecha de Vencimiento', f.fecha_vencimiento],
        ['Tipo de Operación', f.datos_ubl?.tipo_operacion_dian || '10 - Estándar']
      ],
      [
        ['Forma de pago', f.forma_pago],
        ['Medio de Pago', f.medio_pago],
        ['Moneda', f.datos_ubl?.moneda || 'COP'],
        ['Orden de pedido', (f.datos_ubl as any)?.orden_pedido]
      ]
    );

    const bloqueParte = (titulo: string, p: ParteFactura) => {
      seccion(titulo);
      dosColumnas(
        [
          ['Razón Social', p.razon_social],
          ['Nombre Comercial', p.nombre_comercial],
          ['NIT / Documento', p.nit],
          ['Tipo de Contribuyente', p.tipo_contribuyente],
          ['Régimen Fiscal', p.regimen_fiscal],
          ['Responsabilidad tributaria', p.responsabilidad_tributaria]
        ],
        [
          ['País', p.pais || 'Colombia'],
          ['Departamento', p.departamento],
          ['Municipio / Ciudad', p.ciudad],
          ['Dirección', p.direccion],
          ['Teléfono / Móvil', p.telefono],
          ['Correo', p.correo]
        ]
      );
    };
    bloqueParte('Datos del Emisor / Vendedor', emisor);
    bloqueParte('Datos del Adquiriente / Comprador', adquiriente);

    // Detalle de productos
    seccion('Detalle de Productos');
    const columnas = [
      { t: 'Nro.', w: 26, a: 'center' },
      { t: 'Código', w: 50, a: 'left' },
      { t: 'Descripción', w: 120, a: 'left' },
      { t: 'U/M', w: 28, a: 'center' },
      { t: 'Cant.', w: 34, a: 'right' },
      { t: 'Precio unit.', w: 64, a: 'right' },
      { t: 'Desc.', w: 40, a: 'right' },
      { t: 'IVA', w: 54, a: 'right' },
      { t: '%', w: 24, a: 'right' },
      { t: 'Total', w: ancho - 440, a: 'right' }
    ] as const;
    const filaTabla = (valores: string[], negrita = false, fondo?: string) => {
      const y = doc.y;
      let alto = 0;
      doc.font(negrita ? 'Helvetica-Bold' : 'Helvetica').fontSize(7.5);
      valores.forEach((v, i) => { alto = Math.max(alto, doc.heightOfString(v, { width: columnas[i].w - 6 })); });
      alto += 8;
      if (y + alto > doc.page.height - 60) { doc.addPage(); return filaTabla(valores, negrita, fondo); }
      if (fondo) doc.rect(x0, y, ancho, alto).fill(fondo);
      let x = x0;
      valores.forEach((v, i) => {
        doc.fillColor(COLOR_TEXTO).font(negrita ? 'Helvetica-Bold' : 'Helvetica').fontSize(7.5)
          .text(v, x + 3, y + 4, { width: columnas[i].w - 6, align: columnas[i].a as any });
        x += columnas[i].w;
      });
      doc.rect(x0, y, ancho, alto).lineWidth(0.5).stroke(COLOR_LINEA);
      doc.y = y + alto;
      doc.x = x0;
    };
    filaTabla(columnas.map(c => c.t), true, '#e8f8f0');
    const lineas = f.items && f.items.length ? f.items : [{ linea: 1, descripcion_item: f.descripcion_item, cantidad: f.cantidad, valor_unitario: f.valor_unitario, subtotal: Math.abs(f.subtotal), iva: Math.abs(f.iva), iva_porc: f.subtotal ? Math.round((f.iva / f.subtotal) * 100) : 0 } as any];
    for (const l of lineas) {
      filaTabla([
        String(l.linea),
        l.codigo || '',
        l.descripcion_item,
        l.unidad || '',
        String(l.cantidad),
        cop(l.valor_unitario),
        cop(l.descuento || 0),
        cop(l.iva),
        String(l.iva_porc ?? ''),
        cop((l.subtotal || 0) + (l.iva || 0))
      ]);
    }

    // Totales
    const ret = retenciones(f);
    doc.moveDown(0.8);
    const totales: [string, number][] = [
      ['Subtotal', f.subtotal],
      ['IVA', f.iva],
      ['Total factura', f.total ?? f.subtotal + f.iva]
    ];
    if (ret.total) {
      totales.push(['ReteFuente', -ret.retefuente], ['ReteICA', -ret.reteica], ['ReteIVA', -ret.reteiva], ['Neto', (f.total ?? f.subtotal + f.iva) - ret.total]);
    }
    for (const [k, v] of totales) {
      if (doc.y > doc.page.height - 60) doc.addPage();
      const y = doc.y;
      doc.font(k.startsWith('Total') || k === 'Neto' ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5).fillColor(COLOR_TEXTO)
        .text(k, x0 + ancho - 220, y, { width: 110, align: 'right' })
        .text(cop(v), x0 + ancho - 105, y, { width: 105, align: 'right' });
      doc.y = y + 13;
    }

    // Pie
    doc.moveDown(1.2);
    doc.x = x0;
    doc.font('Helvetica').fontSize(7).fillColor(COLOR_SUAVE)
      .text(`Verificación DIAN: https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${f.cufe_hash}`, x0, doc.y, { width: ancho })
      .text(`Generado por Consola TLM el ${new Date().toISOString().substring(0, 10)} a partir del XML UBL 2.1. Esta representación no reemplaza el documento electrónico original.`, { width: ancho });

    doc.end();
  });
}

export async function generarZipSoportes(
  facturas: Factura[],
  empresa: { nit: string; nombre_comercial: string }
): Promise<{ buffer: Buffer; cantidad: number; nombres: string[] }> {
  const zip = new JSZip();
  const nombres: string[] = [];
  let i = 1;
  for (const f of facturas) {
    const nombre = nombreSoporte(i++, f);
    zip.file(nombre, await generarPdfFactura(f, empresa));
    nombres.push(nombre);
  }
  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  return { buffer, cantidad: facturas.length, nombres };
}
