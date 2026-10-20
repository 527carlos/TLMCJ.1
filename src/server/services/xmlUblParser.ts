import crypto from 'crypto';

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
   * Parse DIAN UBL 2.1 XML content into canonical structured invoice object.
   */
  public parseXmlUbl(xmlContent: string, fileName: string = "factura.xml", nitEmpresaActiva: string = ""): ParsedXmlInvoice[] {
    try {
      // Regex-based robust XML extractor without strict heavy DOM failure
      const isCreditNote = /<CreditNote\b/i.test(xmlContent);
      const invoiceNumberMatch = xmlContent.match(/<cbc:ID[^>]*>([^<]+)<\/cbc:ID>/i) ||
                                 xmlContent.match(/<ID[^>]*>([^<]+)<\/ID>/i);
      let factura_num = invoiceNumberMatch ? invoiceNumberMatch[1].trim() : "";
      if (!factura_num || factura_num.length > 30 || factura_num.startsWith("http")) {
        factura_num = fileName.replace(/\.[^/.]+$/, "").replace(/[^\w-]/g, "");
      }
      if (!factura_num) throw new Error("No se encontró el número de factura.");

      // Fecha de Emisión
      const dateMatch = xmlContent.match(/<cbc:IssueDate[^>]*>([^<]+)<\/cbc:IssueDate>/i) ||
                        xmlContent.match(/<IssueDate[^>]*>([^<]+)<\/IssueDate>/i);
      if (!dateMatch) throw new Error("La factura no tiene fecha de emisión.");
      const fecha = dateMatch[1].trim();

      // CUFE: si el XML no lo trae, la huella del contenido sirve para detectar duplicados
      const cufeMatch = xmlContent.match(/<cbc:UUID[^>]*>([^<]+)<\/cbc:UUID>/i) ||
                        xmlContent.match(/<UUID[^>]*>([^<]+)<\/UUID>/i);
      let cufe_hash = cufeMatch ? cufeMatch[1].trim() : crypto.createHash('sha256').update(xmlContent).digest('hex');

      // Proveedor / AccountingSupplierParty
      const nameMatch = xmlContent.match(/<cac:AccountingSupplierParty[\s\S]*?<cbc:RegistrationName[^>]*>([^<]+)<\/cbc:RegistrationName>/i) ||
                        xmlContent.match(/<cac:PartyName[\s\S]*?<cbc:Name[^>]*>([^<]+)<\/cbc:Name>/i) ||
                        xmlContent.match(/<cbc:RegistrationName[^>]*>([^<]+)<\/cbc:RegistrationName>/i);
      if (!nameMatch) throw new Error("La factura no identifica al proveedor (RegistrationName).");
      const proveedor = nameMatch[1].trim();

      // NIT Proveedor
      const nitMatch = xmlContent.match(/<cac:AccountingSupplierParty[\s\S]*?<cbc:CompanyID[^>]*>([^<]+)<\/cbc:CompanyID>/i) ||
                       xmlContent.match(/<cbc:CompanyID[^>]*>([^<]+)<\/cbc:CompanyID>/i);
      if (!nitMatch) throw new Error("La factura no trae el NIT del proveedor.");
      const nit_tercero = nitMatch[1].trim().split('-')[0].replace(/[^\d]/g, "");
      if (nit_tercero.length < 6) throw new Error(`El NIT del proveedor no es válido: "${nitMatch[1].trim()}".`);

      // Ciudad (opcional: si no viene en el XML queda vacía)
      const cityMatch = xmlContent.match(/<cbc:CityName[^>]*>([^<]+)<\/cbc:CityName>/i);
      const ciudad = cityMatch ? cityMatch[1].trim() : undefined;

      // Forma y Medio de Pago
      let forma_pago = "Contado";
      let medio_pago = "47 - Transferencia Bancaria";
      if (xmlContent.includes('PaymentMeans')) {
        if (/PaymentMeans[\s\S]*?<cbc:ID[^>]*>2<\/cbc:ID>/i.test(xmlContent)) {
          forma_pago = "Crédito";
        }
        if (/PaymentMeans[\s\S]*?<cbc:PaymentMeansCode[^>]*>10<\/cbc:PaymentMeansCode>/i.test(xmlContent)) {
          medio_pago = "10 - Efectivo";
        }
      }

      // Totales: el subtotal sale del total de cabecera (LegalMonetaryTotal), no de la primera línea
      const totalesMatch = xmlContent.match(/<cac:LegalMonetaryTotal[\s\S]*?<\/cac:LegalMonetaryTotal>/i);
      const subtotalMatch = totalesMatch ? totalesMatch[0].match(/<cbc:LineExtensionAmount[^>]*>([^<]+)<\/cbc:LineExtensionAmount>/i) : null;
      if (!subtotalMatch) throw new Error("La factura no tiene total de cabecera (LegalMonetaryTotal).");
      const subtotalVal = parseFloat(subtotalMatch[1].trim());
      if (!Number.isFinite(subtotalVal)) throw new Error("El valor total de la factura no es un número.");

      // IVA: solo si el XML lo declara; no se asume una tarifa
      const taxAmountMatch = xmlContent.match(/<cac:TaxTotal[\s\S]*?<cbc:TaxAmount[^>]*>([^<]+)<\/cbc:TaxAmount>/i);
      const ivaVal = taxAmountMatch ? parseFloat(taxAmountMatch[1].trim()) : 0;

      // Descripción del ítem
      const descMatch = xmlContent.match(/<cbc:Description[^>]*>([^<]+)<\/cbc:Description>/i);
      const descripcion = descMatch ? descMatch[1].trim() : "Adquisición de suministros y servicios operacionales";

      // Clasificación tributaria UVT / F350
      let casilla_350 = 64; // Compras por defecto
      let retencion_porc = 0;
      let cuenta_gasto = "51953001";
      const descLower = descripcion.toLowerCase();

      if (descLower.includes("honorario") || descLower.includes("asesor") || descLower.includes("consult")) {
        casilla_350 = 61; // Honorarios
        retencion_porc = 10.0;
        cuenta_gasto = "511010";
      } else if (descLower.includes("servicio") || descLower.includes("mantenimiento") || descLower.includes("soporte") || descLower.includes("nube")) {
        casilla_350 = 62; // Servicios
        retencion_porc = subtotalVal >= 176000 ? 4.0 : 0.0;
        cuenta_gasto = "513505";
      } else if (descLower.includes("arriend") || descLower.includes("canon") || descLower.includes("inmueble")) {
        casilla_350 = 63; // Arrendamientos
        retencion_porc = 3.5;
        cuenta_gasto = "512010";
      } else {
        // Compras de bienes
        casilla_350 = 64;
        retencion_porc = subtotalVal >= 1189000 ? 2.5 : 0.0;
        cuenta_gasto = "51953001";
      }

      const retencion_valor = Math.round((subtotalVal * retencion_porc) / 100);

      return [
        {
          factura_num,
          fecha,
          fecha_vencimiento: fecha,
          proveedor,
          nit_tercero,
          ciudad,
          descripcion_item: descripcion,
          cantidad: 1,
          valor_unitario: subtotalVal,
          subtotal: subtotalVal,
          iva: ivaVal,
          casilla_350,
          retencion_porc,
          retencion_valor,
          reteica_tarifa: 9.66,
          reteiva_porc: ivaVal > 0 ? 15.0 : 0.0,
          forma_pago,
          medio_pago,
          cuenta_gasto,
          tipo_comprobante: isCreditNote ? "NOTA_CREDITO" : "COMPRAS",
          cufe_hash,
          estado_revision: "PENDIENTE"
        }
      ];
    } catch (err: any) {
      // Un XML que no se puede leer se informa al usuario; no se guarda con datos inventados
      throw new Error(`XML no válido: ${err.message}`);
    }
  }
}

export const xmlParser = new XmlUblParserService();
