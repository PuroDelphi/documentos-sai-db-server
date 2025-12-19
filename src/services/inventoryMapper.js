const logger = require('../utils/logger');

/**
 * Servicio para mapear datos de facturas de inventario a tablas IP/IPDET/ITEMACT de Firebird
 */
class InventoryMapper {
  constructor(firebirdClient) {
    this.firebirdClient = firebirdClient;
  }

  /**
   * Extrae el ID_N (NIT sin guión ni dígito de verificación)
   * @param {string} nit - NIT completo (puede tener guión)
   * @returns {string} - ID_N sin guión
   */
  extractIdN(nit) {
    if (!nit) return '';
    
    const nitStr = nit.toString().trim();
    
    // Si tiene guión, tomar solo la parte antes del guión
    if (nitStr.includes('-')) {
      return nitStr.split('-')[0].trim();
    }
    
    // Si no tiene guión, retornar tal cual
    return nitStr;
  }

  /**
   * Obtiene valores por defecto de IP buscando recursivamente en registros existentes
   * @returns {Object} - Valores por defecto
   */
  async getDefaultValuesForIP() {
    try {
      const result = await this.firebirdClient.query(`
        SELECT FIRST 1
          E, S, SUCCLIENTE, POSTED, CLOSED, CLOSEPO, PRINTED, 
          ENTPAR, RECTOT, ANUL, ENTORDEN, CONTABIL, ENTFACT, 
          ENTCDEV, DEVUELTO, PORDESC, VALORDCT, VALORFLETE,
          TOTALOTROS, TOTALRETEN, DOCASC, ENTMC, REVISADO,
          IMPORTACION, EA_AUTO_LEGALIZADA, CCOSTO, DEPTO,
          PROYECTO, ACTIVIDAD, RETECREE, CODCREE, TIPO_IMP,
          NRO_IMP, ESTADO, TOTAL_BONO, DIFERENCIA, ENVIADO,
          FORMAPAGO, ID_RES, TOTAL_IMPTO_SALUDABLE
        FROM IP
        WHERE TIPO LIKE 'E%'
        ORDER BY FECHA DESC
      `);

      if (result.length > 0) {
        const defaults = result[0];
        logger.debug('Valores por defecto obtenidos de IP:', defaults);
        return defaults;
      }

      // Valores fallback si no hay registros
      return {
        E: 1,
        S: 1,
        SUCCLIENTE: 0,
        POSTED: 'False',
        CLOSED: 'False',
        CLOSEPO: 'False',
        PRINTED: 'False',
        ENTPAR: 'False',
        RECTOT: 'True',
        ANUL: 'False',
        ENTORDEN: '',
        CONTABIL: 'False',
        ENTFACT: '',
        ENTCDEV: 'False',
        DEVUELTO: 'False',
        PORDESC: 0,
        VALORDCT: 0,
        VALORFLETE: 0,
        TOTALOTROS: 0,
        TOTALRETEN: 0,
        DOCASC: 'EA',
        ENTMC: '',
        REVISADO: 'N',
        IMPORTACION: 'False',
        EA_AUTO_LEGALIZADA: 'N',
        CCOSTO: 0,
        DEPTO: 0,
        PROYECTO: '',
        ACTIVIDAD: '',
        RETECREE: 0,
        CODCREE: '',
        TIPO_IMP: '',
        NRO_IMP: 0,
        ESTADO: null,
        TOTAL_BONO: 0,
        DIFERENCIA: 0,
        ENVIADO: 'N',
        FORMAPAGO: '',
        ID_RES: 0,
        TOTAL_IMPTO_SALUDABLE: 0
      };
    } catch (error) {
      logger.error('Error obteniendo valores por defecto de IP:', error);
      throw error;
    }
  }

  /**
   * Obtiene valores por defecto de IPDET buscando recursivamente en registros existentes
   * @returns {Object} - Valores por defecto
   */
  async getDefaultValuesForIPDET() {
    try {
      const result = await this.firebirdClient.query(`
        SELECT FIRST 1
          QTYREC, QTYPEND, PESO, REFOC, REFREC, CLOSEDOC,
          QTYDEV, CC, PB, QTYB, QTYBDEV, PORCDCT, VALORDCT,
          E, DESTINO, S, COSTMC, NODOCR, TPDOCR, EDOCR, SDOCR,
          FECHA_VENCIMIENTO, COLOR, COSTO_AJUSTE, NUMERO_AUTO,
          CADENA_ADICIONAL, E_AUTO, S_AUTO, TIPO_AUTO, CODOCR,
          CONTEO_AUTO, DEPTO, CCOSTO, ACTIVIDAD, PROY,
          COD_TALLA, COD_COLOR, FACTOR, CUBX, CUBY, CUBZ,
          CUBFACTOR, CAJA_SET, MANIFIESTOID, TOTAL_BONO,
          BONO, CODBARRASCURVA, VALOR_IVA_MAYOR, VALOR_BASE_MAYOR,
          DEVUELTO
        FROM IPDET
        WHERE TIPO LIKE 'E%'
        ORDER BY TIPO DESC, NUMBER DESC
      `);

      if (result.length > 0) {
        const defaults = result[0];
        logger.debug('Valores por defecto obtenidos de IPDET:', defaults);
        return defaults;
      }

      // Valores fallback si no hay registros
      return this.getIPDETFallbackDefaults();
    } catch (error) {
      logger.error('Error obteniendo valores por defecto de IPDET:', error);
      throw error;
    }
  }

  /**
   * Valores fallback para IPDET
   * @returns {Object}
   */
  getIPDETFallbackDefaults() {
    return {
      QTYREC: 0,
      QTYPEND: 0,
      PESO: 0,
      REFOC: '',
      REFREC: '',
      CLOSEDOC: '',
      QTYDEV: 0,
      CC: 0,
      PB: 0,
      QTYB: 0,
      QTYBDEV: 0,
      PORCDCT: 0,
      VALORDCT: 0,
      E: 1,
      DESTINO: 1,
      S: 1,
      COSTMC: 0,
      NODOCR: 0,
      TPDOCR: '',
      EDOCR: 0,
      SDOCR: 0,
      FECHA_VENCIMIENTO: new Date('1899-12-30'),
      COLOR: null,
      COSTO_AJUSTE: 0,
      NUMERO_AUTO: null,
      CADENA_ADICIONAL: null,
      E_AUTO: null,
      S_AUTO: null,
      TIPO_AUTO: null,
      CODOCR: 0,
      CONTEO_AUTO: null,
      DEPTO: 0,
      CCOSTO: 0,
      ACTIVIDAD: '',
      PROY: '',
      COD_TALLA: '',
      COD_COLOR: '',
      FACTOR: 1,
      CUBX: 0,
      CUBY: 0,
      CUBZ: 0,
      CUBFACTOR: 0,
      CAJA_SET: 0,
      MANIFIESTOID: '',
      TOTAL_BONO: 0,
      BONO: ' ',
      CODBARRASCURVA: '',
      VALOR_IVA_MAYOR: 0,
      VALOR_BASE_MAYOR: 0,
      DEVUELTO: 'False'
    };
  }

  /**
   * Mapea datos de factura a estructura IP (Entrada de Almacén - Encabezado)
   * @param {Object} invoice - Datos de la factura desde Supabase
   * @param {number} consecutiveNumber - Número consecutivo del documento
   * @param {string} documentType - Tipo de documento (ej: 'EAI')
   * @param {Object} defaults - Valores por defecto
   * @returns {Object} - Datos mapeados para IP
   */
  async mapToIP(invoice, consecutiveNumber, documentType, defaults) {
    const idN = this.extractIdN(invoice.third_party_nit || invoice.num_identificacion);

    // Calcular totales
    const subtotal = parseFloat(invoice.subtotal || 0);
    const totalIva = parseFloat(invoice.total_iva || 0);
    const total = parseFloat(invoice.total || 0);

    return {
      TIPO: documentType.substring(0, 3),
      NUMBER: consecutiveNumber,
      ID_N: idN.substring(0, 30),
      ACCT: defaults.ACCT || null,
      PONUMBER: (invoice.invoice_number || '').substring(0, 15),
      FECHA: invoice.date ? new Date(invoice.date) : new Date(),
      COST: total,
      POSTED: defaults.POSTED,
      CLOSED: defaults.CLOSED,
      CLOSEPO: defaults.CLOSEPO,
      PRINTED: defaults.PRINTED,
      ENTPAR: defaults.ENTPAR,
      RECTOT: defaults.RECTOT,
      ANUL: defaults.ANUL,
      ENTORDEN: defaults.ENTORDEN,
      CONTABIL: defaults.CONTABIL,
      ENTFACT: defaults.ENTFACT,
      ENTCDEV: defaults.ENTCDEV,
      DEVUELTO: defaults.DEVUELTO,
      PORDESC: defaults.PORDESC,
      VALORDCT: defaults.VALORDCT,
      VALORFLETE: defaults.VALORFLETE,
      EMPRESA: (invoice.third_party_name || '').substring(0, 40),
      TOTALOTROS: defaults.TOTALOTROS,
      TOTALRETEN: defaults.TOTALRETEN,
      TOTALITEMS: subtotal,
      VALORIVA: totalIva,
      VALORICA: 0,
      VALORRTIVA: 0,
      VALORRTICA: 0,
      TOTALSDCT: 0,
      TOTALCDCT: 0,
      DUEDATE: invoice.date ? new Date(invoice.date) : new Date(),
      E: defaults.E,
      S: defaults.S,
      SUCCLIENTE: defaults.SUCCLIENTE,
      DOCASC: defaults.DOCASC,
      ENTMC: defaults.ENTMC,
      REVISADO: defaults.REVISADO,
      FECHA_ENTREGA: invoice.date ? new Date(invoice.date) : new Date(),
      FECHA_REQUISICION: invoice.date ? new Date(invoice.date) : new Date(),
      ID_USUARIO: 'SYSTEM',
      OCNUMERO: '',
      IMPORTACION: defaults.IMPORTACION,
      E_CRUCE: null,
      S_CRUCE: null,
      TIPO_CRUCE: null,
      NUMBER_CRUCE: null,
      EA_AUTO_LEGALIZADA: defaults.EA_AUTO_LEGALIZADA,
      VALIVABIEN: 0,
      VALIVASER: 0,
      DOC_EXTERNO: '',
      CCOSTO: defaults.CCOSTO,
      DEPTO: defaults.DEPTO,
      PROYECTO: defaults.PROYECTO,
      ACTIVIDAD: defaults.ACTIVIDAD,
      RETECREE: defaults.RETECREE,
      CODCREE: defaults.CODCREE,
      TIPO_IMP: defaults.TIPO_IMP,
      NRO_IMP: defaults.NRO_IMP,
      ESTADO: defaults.ESTADO,
      TOTAL_BONO: defaults.TOTAL_BONO,
      DIFERENCIA: defaults.DIFERENCIA,
      CUDS: null,
      ID_BINARIO: null,
      CONCEPTO_DV: null,
      ENVIADO: defaults.ENVIADO,
      FECHA_RESPUESTA_DIAN: null,
      FORMAPAGO: defaults.FORMAPAGO,
      ID_RES: defaults.ID_RES,
      TOTAL_IMPTO_SALUDABLE: defaults.TOTAL_IMPTO_SALUDABLE
    };
  }

  /**
   * Extrae el código del producto de la descripción
   * @param {Object} item - Item de la factura
   * @returns {string} - Código del producto
   */
  extractProductCode(item) {
    // Si la descripción tiene formato "CODIGO - Descripción", extraer el código
    if (item.description && item.description.includes(' - ')) {
      const parts = item.description.split(' - ');
      return parts[0].trim();
    }

    // Si no hay formato especial, retornar vacío
    return '';
  }

  /**
   * Mapea items de factura a estructura IPDET (Entrada de Almacén - Detalle)
   * @param {Object} item - Item de la factura desde Supabase
   * @param {number} conteo - Número de línea (contador)
   * @param {number} consecutiveNumber - Número consecutivo del documento
   * @param {string} documentType - Tipo de documento (ej: 'EAI')
   * @param {Object} defaults - Valores por defecto
   * @returns {Object} - Datos mapeados para IPDET
   */
  async mapToIPDET(item, conteo, consecutiveNumber, documentType, defaults) {
    const quantity = parseFloat(item.quantity || 0);
    const unitPrice = parseFloat(item.unit_price || 0);
    const subtotal = quantity * unitPrice; // Calcular subtotal

    // Extraer código del producto
    const productCode = this.extractProductCode(item);

    return {
      TIPO: documentType.substring(0, 3),
      NUMBER: consecutiveNumber,
      CONTEO: conteo,
      ITEM: productCode.substring(0, 30),
      LOCATION: (defaults.LOCATION || '01').substring(0, 3),
      COST: unitPrice,
      QTY: quantity,
      QTYREC: defaults.QTYREC,
      QTYPEND: quantity, // Cantidad pendiente = cantidad total
      EXTEND: subtotal,
      PESO: defaults.PESO,
      COSTCDESC: unitPrice,
      COSTCFLETE: 0,
      REFOC: defaults.REFOC,
      REFREC: defaults.REFREC,
      CLOSEDOC: defaults.CLOSEDOC,
      QTYDEV: defaults.QTYDEV,
      CC: defaults.CC,
      PB: defaults.PB,
      QTYB: defaults.QTYB,
      QTYBDEV: defaults.QTYBDEV,
      PORCDCT: defaults.PORCDCT,
      VALORDCT: defaults.VALORDCT,
      E: defaults.E,
      DESTINO: defaults.DESTINO,
      S: defaults.S,
      LOTE: (item.lote || '').substring(0, 30),
      COSTMC: defaults.COSTMC,
      NODOCR: defaults.NODOCR,
      TPDOCR: defaults.TPDOCR,
      EDOCR: defaults.EDOCR,
      SDOCR: defaults.SDOCR,
      FECHA_VENCIMIENTO: defaults.FECHA_VENCIMIENTO,
      COLOR: defaults.COLOR,
      IVA: ivaAmount,
      COSTO_AJUSTE: defaults.COSTO_AJUSTE,
      NUMERO_AUTO: defaults.NUMERO_AUTO,
      CADENA_ADICIONAL: defaults.CADENA_ADICIONAL,
      E_AUTO: defaults.E_AUTO,
      S_AUTO: defaults.S_AUTO,
      TIPO_AUTO: defaults.TIPO_AUTO,
      CODOCR: defaults.CODOCR,
      CONTEO_AUTO: defaults.CONTEO_AUTO,
      DEPTO: defaults.DEPTO,
      CCOSTO: defaults.CCOSTO,
      ACTIVIDAD: defaults.ACTIVIDAD,
      PROY: defaults.PROY,
      COD_TALLA: defaults.COD_TALLA,
      COD_COLOR: defaults.COD_COLOR,
      FACTOR: defaults.FACTOR,
      PRECIO_UNITARIO_IVA: priceWithIva,
      VALIVA: ivaRate,
      VALOR_IVA: ivaAmount / quantity, // IVA por unidad
      CUBX: defaults.CUBX,
      CUBY: defaults.CUBY,
      CUBZ: defaults.CUBZ,
      CUBFACTOR: defaults.CUBFACTOR,
      CAJA_SET: defaults.CAJA_SET,
      MANIFIESTOID: defaults.MANIFIESTOID,
      COSTOEXT: unitPrice,
      TOTAL_BONO: defaults.TOTAL_BONO,
      BONO: defaults.BONO,
      CODBARRASCURVA: defaults.CODBARRASCURVA,
      VALOR_IVA_MAYOR: defaults.VALOR_IVA_MAYOR,
      VALOR_BASE_MAYOR: defaults.VALOR_BASE_MAYOR,
      DEVUELTO: defaults.DEVUELTO,
      PRECIO: unitPrice,
      PORCENUTIL: 0,
      VLRUTIL: 0,
      VLRFOB: 0,
      VLRFLETE: 0,
      VLRSEGURO: 0,
      PRECIOIVA: priceWithIva,
      TAR_IMPTO_IBUA: 0,
      TAR_IMPTO_INPP: 0,
      TAR_IMPTO_ICUI: 0,
      BASE_IMPTO_IBUA: 0,
      BASE_IMPTO_INPP: 0,
      BASE_IMPTO_ICUI: 0,
      TOTAL_IMPTO_IBUA: 0,
      TOTAL_IMPTO_INPP: 0,
      TOTAL_IMPTO_ICUI: 0,
      CODIMPTOIBUA: '',
      CODIMPTOINPP: '',
      CODIMPTOICUI: ''
    };
  }

  /**
   * Mapea item de factura a estructura ITEMACT (Kardex)
   * @param {Object} item - Item de la factura desde Supabase
   * @param {Object} invoice - Datos de la factura
   * @param {number} consecutiveNumber - Número consecutivo del documento
   * @param {string} documentType - Tipo de documento (ej: 'EAI')
   * @param {Object} ipDefaults - Valores por defecto de IP
   * @param {Object} ipdetDefaults - Valores por defecto de IPDET
   * @returns {Object} - Datos mapeados para ITEMACT
   */
  async mapToITEMACT(item, invoice, consecutiveNumber, documentType, ipDefaults, ipdetDefaults) {
    const idN = this.extractIdN(invoice.num_identificacion);
    const quantity = parseFloat(item.quantity || 0);
    const unitPrice = parseFloat(item.unit_price || 0);
    const subtotal = quantity * unitPrice; // Calcular subtotal

    // Extraer código del producto
    const productCode = this.extractProductCode(item);

    return {
      // CONTEO se auto-genera en Firebird (auto-increment)
      LOCATION: (ipdetDefaults.LOCATION || '01').substring(0, 3),
      ITEM: productCode.substring(0, 30),
      ID_N: idN.substring(0, 30),
      TIPO: documentType.substring(0, 3),
      BATCH: consecutiveNumber,
      FECHA: invoice.date ? new Date(invoice.date) : new Date(),
      QTY: quantity, // Cantidad positiva para entradas
      VALUNIT: unitPrice,
      VALCDCT: 0,
      VALCFLE: 0,
      QTYB: 0,
      E: ipDefaults.E,
      S: ipDefaults.S,
      LOTE: (item.lote || '').substring(0, 30),
      TOTPARCIAL: subtotal,
      PRIORIDAD: 6, // Prioridad estándar para entradas
      COLOR: null,
      AJUSTE: 0,
      COSTPAJUSTADO: 0,
      TOTALAJUSTADO: 0,
      COSTOP: unitPrice,
      SALDOU: 0,
      SALDOPESOS: null,
      NUMITEM: 1,
      COD_TALLA: ipdetDefaults.COD_TALLA || 'N/A',
      COD_COLOR: ipdetDefaults.COD_COLOR || 'N/A',
      QTYREM: 0,
      QTYPED: 0,
      BO: 0,
      RESERVA: 0,
      TIPOORIGEN: null,
      NUMBERORIGEN: null,
      NOSERIE: '',
      LOTEFVENCE: null,
      NOSERIE2: null,
      CRUNUM: 0,
      CRUTIP: null,
      CRUREM: 0,
      REMTIP: null,
      CRUFAC: 0,
      FACTIP: null
    };
  }
}

module.exports = InventoryMapper;

