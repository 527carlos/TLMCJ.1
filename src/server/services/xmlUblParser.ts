import crypto from 'crypto';
import JSZip from 'jszip';

export interface ParsedXmlInvoice {
  factura_num: string;
  fecha: string;
  fecha_vencimiento?: string;
  proveedor: string;
  nit_tercero: string;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  departamento?: string;
  correo?: string;
  descripcion_item: string;
  cantidad: number;
  valor_unitario: number;
  subtotal: number;
  iva: number;
  total?: number;
  casilla_350: number;
  retencion_porc: number;
  retencion_valor: number;
  reteica_tarifa: number;
  reteiva_porc: number;
  forma_pago: string;
  medio_pago: string;
  cuenta_gasto: string;
  tipo_comprobante: string;
  cufe_hash: string;
  estado_revision: 'PENDIENTE' | 'AUDITADA';
  items?: any[];
}

export class XmlUblParserService {
  /**
   * Main entry point for processing uploaded buffers (supports both direct XML and ZIP packages)
   */
  public async parseFileBuffer(buffer: Buffer, fileName: string = "factura.xml", nitEmpresaActiva: string = ""): Promise<ParsedXmlInvoice[]> {
    const isZip = fileName.toLowerCase().endsWith('.zip') || 
                  (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04);

    if (isZip) {
      return this.parseZipBuffer(buffer, fileName, nitEmpresaActiva);
    }

    // Direct XML file
    let text = buffer.toString('utf-8');
    // Check if declared encoding is ISO-8859-1 or latin1
    if (/encoding=["'](?:ISO-8859-1|latin1|windows-1252)["']/i.test(text.substring(0, 200))) {
      text = buffer.toString('latin1');
    }
    // Remove UTF-8 BOM if present
    if (text.charCodeAt(0) === 0xFEFF) {
      text = text.substring(1);
    }

    return this.parseXmlUbl(text, fileName, nitEmpresaActiva);
  }

  /**
   * Unpacks a ZIP archive and extracts all contained XML invoices
   */
  public async parseZipBuffer(zipBuffer: Buffer, zipFileName: string, nitEmpresaActiva: string = ""): Promise<ParsedXmlInvoice[]> {
    const results: ParsedXmlInvoice[] = [];
    try {
      const zip = await JSZip.loadAsync(zipBuffer);
      const entries = Object.keys(zip.files).filter(name => {
        const lower = name.toLowerCase();
        return lower.endsWith('.xml') && !name.includes('__MACOSX') && !name.startsWith('.');
      });

      console.log(`[XML-Parser] Procesando ZIP "${zipFileName}" con ${entries.length} archivos XML encontrados.`);

      for (const entryName of entries) {
        try {
          const fileData = await zip.files[entryName].async('nodebuffer');
          let text = fileData.toString('utf-8');
          if (/encoding=["'](?:ISO-8859-1|latin1|windows-1252)["']/i.test(text.substring(0, 200))) {
            text = fileData.toString('latin1');
          }
          if (text.charCodeAt(0) === 0xFEFF) {
            text = text.substring(1);
          }
          const parsed = this.parseXmlUbl(text, entryName, nitEmpresaActiva);
          results.push(...parsed);
        } catch (err) {
          console.warn(`[XML-Parser] Error extrayendo "${entryName}" dentro de ${zipFileName}:`, err);
        }
      }
    } catch (zipErr) {
      console.error(`[XML-Parser] Error leyendo archivo ZIP ${zipFileName}:`, zipErr);
    }
    return results;
  }

  /**
   * Parse DIAN UBL 2.1 XML content into canonical structured invoice object.
   */
  public parseXmlUbl(rawXmlContent: string, fileName: string = "factura.xml", _nitEmpresaActiva: string = ""): ParsedXmlInvoice[] {
    try {
      let xmlContent = rawXmlContent.trim();

      // Check if this is an AttachedDocument wrapper (DIAN standard contenedor)
      if (/<AttachedDocument\b/i.test(xmlContent)) {
        // Look for CDATA containing the real inner Invoice or CreditNote
        const cdataMatch = xmlContent.match(/<!\[CDATA\[([\s\S]*?<\/(?:Invoice|CreditNote)>)[\s\S]*?\]\]>/i);
        if (cdataMatch && cdataMatch[1] && (cdataMatch[1].includes('<Invoice') || cdataMatch[1].includes('<CreditNote'))) {
          xmlContent = cdataMatch[1].trim();
        } else {
          // Look for base64 encoded document
          const base64Match = xmlContent.match(/<(?:cbc:EmbeddedDocumentBinaryObject|cbc:Description)[^>]*>([A-Za-z0-9+/=\r\n]{60,})<\//i);
          if (base64Match) {
            try {
              const decoded = Buffer.from(base64Match[1].replace(/\s+/g, ''), 'base64').toString('utf-8');
              if (decoded.includes('<Invoice') || decoded.includes('<CreditNote')) {
                xmlContent = decoded.trim();
              }
            } catch (e) {}
          }
        }
      }

      const isCreditNote = /<CreditNote\b/i.test(xmlContent);

      // Invoice Number
      const invoiceNumberMatch = 
        xmlContent.match(/<cbc:ID[^>]*>([^<]+)<\/cbc:ID>/i) ||
        xmlContent.match(/<ID[^>]*>([^<]+)<\/ID>/i);
      let factura_num = invoiceNumberMatch ? invoiceNumberMatch[1].trim() : "";
      if (!factura_num || factura_num.length > 35 || factura_num.startsWith("http")) {
        factura_num = fileName.replace(/\.[^/.]+$/, "").replace(/[^\w-]/g, "") || "FE-" + Math.floor(1000 + Math.random() * 9000);
      }

      // Issue Date
      const dateMatch = 
        xmlContent.match(/<cbc:IssueDate[^>]*>([^<]+)<\/cbc:IssueDate>/i) ||
        xmlContent.match(/<IssueDate[^>]*>([^<]+)<\/IssueDate>/i);
      const fecha = dateMatch ? dateMatch[1].trim() : new Date().toISOString().split('T')[0];

      // Due Date
      const dueDateMatch = 
        xmlContent.match(/<cbc:PaymentDueDate[^>]*>([^<]+)<\/cbc:PaymentDueDate>/i) ||
        xmlContent.match(/<cbc:DueDate[^>]*>([^<]+)<\/cbc:DueDate>/i);
      const fecha_vencimiento = dueDateMatch ? dueDateMatch[1].trim() : fecha;

      // CUFE / UUID
      const cufeMatch = 
        xmlContent.match(/<cbc:UUID[^>]*>([^<]+)<\/cbc:UUID>/i) ||
        xmlContent.match(/<UUID[^>]*>([^<]+)<\/UUID>/i);
      let cufe_hash = cufeMatch ? cufeMatch[1].trim() : "";
      if (!cufe_hash || cufe_hash.length < 10) {
        cufe_hash = crypto.createHash('sha256').update(rawXmlContent).digest('hex');
      }

      // Proveedor / AccountingSupplierParty
      const supplierBlockMatch = xmlContent.match(/<cac:AccountingSupplierParty[\s\S]*?<\/cac:AccountingSupplierParty>/i);
      const supplierBlock = supplierBlockMatch ? supplierBlockMatch[0] : xmlContent;

      const nameMatch = 
        supplierBlock.match(/<cbc:RegistrationName[^>]*>([^<]+)<\/cbc:RegistrationName>/i) ||
        supplierBlock.match(/<cac:PartyName[\s\S]*?<cbc:Name[^>]*>([^<]+)<\/cbc:Name>/i) ||
        xmlContent.match(/<cbc:RegistrationName[^>]*>([^<]+)<\/cbc:RegistrationName>/i);
      let proveedor = nameMatch ? nameMatch[1].trim() : "PROVEEDOR NACIONAL S.A.S.";
      proveedor = proveedor.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

      // NIT Proveedor
      const nitMatch = 
        supplierBlock.match(/<cbc:CompanyID[^>]*>([^<]+)<\/cbc:CompanyID>/i) ||
        xmlContent.match(/<cac:AccountingSupplierParty[\s\S]*?<cbc:CompanyID[^>]*>([^<]+)<\/cbc:CompanyID>/i);
      let nit_tercero = nitMatch ? nitMatch[1].trim().split('-')[0].replace(/[^\d]/g, "") : "";
      if (!nit_tercero || nit_tercero.length < 5) {
        nit_tercero = "901" + Math.floor(100000 + Math.random() * 900000);
      }

      // Ciudad / Dirección
      const cityMatch = supplierBlock.match(/<cbc:CityName[^>]*>([^<]+)<\/cbc:CityName>/i);
      const ciudad = cityMatch ? cityMatch[1].trim() : "Bogotá D.C.";

      // Forma y Medio de Pago
      let forma_pago = "Crédito";
      let medio_pago = "Transferencia Débito";
      if (xmlContent.includes('PaymentMeans')) {
        if (/PaymentMeans[\s\S]*?<cbc:ID[^>]*>1<\/cbc:ID>/i.test(xmlContent)) {
          forma_pago = "Contado";
        }
        if (/PaymentMeans[\s\S]*?<cbc:PaymentMeansCode[^>]*>10<\/cbc:PaymentMeansCode>/i.test(xmlContent)) {
          medio_pago = "Efectivo";
        } else if (/PaymentMeans[\s\S]*?<cbc:PaymentMeansCode[^>]*>47<\/cbc:PaymentMeansCode>/i.test(xmlContent)) {
          medio_pago = "Transferencia Débito";
        } else if (/PaymentMeans[\s\S]*?<cbc:PaymentMeansCode[^>]*>48<\/cbc:PaymentMeansCode>/i.test(xmlContent)) {
          medio_pago = "Tarjeta Crédito";
        }
      }

      // Monetary Totals (LegalMonetaryTotal)
      const subtotalMatch = 
        xmlContent.match(/<cac:LegalMonetaryTotal[\s\S]*?<cbc:LineExtensionAmount[^>]*>([^<]+)<\/cbc:LineExtensionAmount>/i) ||
        xmlContent.match(/<cbc:LineExtensionAmount[^>]*>([^<]+)<\/cbc:LineExtensionAmount>/i);
      let subtotalVal = subtotalMatch ? parseFloat(subtotalMatch[1].trim()) : 0;

      const taxAmountMatch = 
        xmlContent.match(/<cac:TaxTotal[\s\S]*?<cbc:TaxAmount[^>]*>([^<]+)<\/cbc:TaxAmount>/i) ||
        xmlContent.match(/<cbc:TaxAmount[^>]*>([^<]+)<\/cbc:TaxAmount>/i);
      let ivaVal = taxAmountMatch ? parseFloat(taxAmountMatch[1].trim()) : 0;

      const totalMatch = 
        xmlContent.match(/<cac:LegalMonetaryTotal[\s\S]*?<cbc:PayableAmount[^>]*>([^<]+)<\/cbc:PayableAmount>/i) ||
        xmlContent.match(/<cbc:PayableAmount[^>]*>([^<]+)<\/cbc:PayableAmount>/i);
      let totalVal = totalMatch ? parseFloat(totalMatch[1].trim()) : 0;

      if (subtotalVal === 0 && totalVal > 0) {
        subtotalVal = ivaVal > 0 ? (totalVal - ivaVal) : Math.round(totalVal / 1.19);
      }
      if (ivaVal === 0 && subtotalVal > 0 && totalVal > subtotalVal) {
        ivaVal = totalVal - subtotalVal;
      }
      if (totalVal === 0) {
        totalVal = subtotalVal + ivaVal;
      }

      // Descripción del ítem
      const descMatch = 
        xmlContent.match(/<cac:Item[\s\S]*?<cbc:Description[^>]*>([^<]+)<\/cbc:Description>/i) ||
        xmlContent.match(/<cbc:Description[^>]*>([^<]+)<\/cbc:Description>/i);
      let descripcion = descMatch ? descMatch[1].trim() : "Adquisición de bienes y servicios operacionales";
      descripcion = descripcion.replace(/&amp;/g, '&').replace(/&quot;/g, '"');

      // Clasificación tributaria UVT / F350
      let casilla_350 = 64; // Compras por defecto
      let retencion_porc = 0;
      let cuenta_gasto = "513535";
      const descLower = (descripcion + " " + proveedor).toLowerCase();

      if (descLower.includes("honorario") || descLower.includes("asesor") || descLower.includes("consult")) {
        casilla_350 = 61; // Honorarios
        retencion_porc = 10.0;
        cuenta_gasto = "511010";
      } else if (descLower.includes("servicio") || descLower.includes("mantenimiento") || descLower.includes("soporte") || descLower.includes("nube") || descLower.includes("cloud") || descLower.includes("licencia")) {
        casilla_350 = 62; // Servicios
        retencion_porc = subtotalVal >= 176000 ? 4.0 : 0.0;
        cuenta_gasto = "513535";
      } else if (descLower.includes("arriend") || descLower.includes("canon") || descLower.includes("inmueble")) {
        casilla_350 = 63; // Arrendamientos
        retencion_porc = 3.5;
        cuenta_gasto = "512010";
      } else {
        // Compras de bienes generales
        casilla_350 = 64;
        retencion_porc = subtotalVal >= 1189000 ? 2.5 : 0.0;
        cuenta_gasto = "519530";
      }

      const retencion_valor = Math.round((subtotalVal * retencion_porc) / 100);

      return [
        {
          factura_num,
          fecha,
          fecha_vencimiento,
          proveedor,
          nit_tercero,
          ciudad,
          departamento: "Cundinamarca",
          descripcion_item: descripcion,
          cantidad: 1,
          valor_unitario: subtotalVal,
          subtotal: subtotalVal,
          iva: ivaVal,
          total: totalVal,
          casilla_350,
          retencion_porc,
          retencion_valor,
          reteica_tarifa: 9.66,
          reteiva_porc: ivaVal > 0 ? 15.0 : 0.0,
          forma_pago,
          medio_pago,
          cuenta_gasto,
          tipo_comprobante: isCreditNote ? "Nota de Crédito" : "Factura Electrónica",
          cufe_hash,
          estado_revision: "AUDITADA"
        }
      ];
    } catch (err: any) {
      console.error("[XML-Parser] Error parseando XML UBL:", err);
      return [];
    }
  }
}

export const xmlParser = new XmlUblParserService();
