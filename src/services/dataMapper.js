const { convertToWords } = require('../utils/numberToWords');
const appConfig = require('../config/appConfig');
const logger = require('../utils/logger');

class DataMapper {
  constructor() {
    // Configuración para el campo INVC
    this.useInvoiceNumberForInvc = appConfig.get('use_invoice_number_for_invc', false);

    // Configuración de proyecto y actividad predeterminados
    this.defaultProjectCode = appConfig.get('default_project_code', null);
    this.defaultActivityCode = appConfig.get('default_activity_code', null);

    // Configuración del tipo de documento
    this.documentType = appConfig.get('document_type', 'FIA');

    // Configuración para descripción de CARPRODE
    this.useHeaderDescriptionForDetail = appConfig.get('use_header_description_for_detail', false);

    // Validar longitudes según esquema de BD
    if (this.defaultProjectCode && this.defaultProjectCode.length > 10) {
      logger.warn(`default_project_code truncado de ${this.defaultProjectCode.length} a 10 caracteres`);
      this.defaultProjectCode = this.defaultProjectCode.substring(0, 10);
    }

    if (this.defaultActivityCode && this.defaultActivityCode.length > 3) {
      logger.warn(`default_activity_code truncado de ${this.defaultActivityCode.length} a 3 caracteres`);
      this.defaultActivityCode = this.defaultActivityCode.substring(0, 3);
    }

    // Validar longitud del tipo de documento
    if (this.documentType.length > 3) {
      logger.warn(`document_type truncado de ${this.documentType.length} a 3 caracteres`);
      this.documentType = this.documentType.substring(0, 3);
    }

    logger.info(`Configuración INVC: ${this.useInvoiceNumberForInvc ? 'usar invoice_number de Supabase' : `usar número de batch/${this.documentType}`}`);
    logger.info(`Tipo de documento: ${this.documentType}`);
    logger.info(`Proyecto predeterminado: ${this.defaultProjectCode || 'no configurado'}`);
    logger.info(`Actividad predeterminada: ${this.defaultActivityCode || 'no configurada'}`);
    logger.info(`Descripción CARPRODE: ${this.useHeaderDescriptionForDetail ? 'usar descripción del encabezado (CARPROEN.OBSERV)' : 'usar descripción de la entrada contable'}`);
  }

  /**
   * Extrae el ID_N (sin guión y sin dígito de verificación) de un NIT
   * @param {string} nit - NIT completo (puede tener guión o no)
   * @returns {string} - ID_N sin guión ni dígito de verificación
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
   * Obtiene el tipo de documento configurado
   * @returns {string} - Tipo de documento (ej: 'FIA', 'FAC', etc.)
   */
  getDocumentType() {
    return this.documentType;
  }

  /**
   * Convierte una fecha de string a Date manteniendo la fecha exacta sin cambios de zona horaria
   * @param {string} dateString - Fecha en formato string (YYYY-MM-DD)
   * @returns {Date} - Objeto Date con la fecha exacta
   */
  parseDate(dateString) {
    if (!dateString) return null;

    try {
      // Si es solo fecha (YYYY-MM-DD), agregar hora local para evitar cambios de zona horaria
      if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return new Date(dateString + 'T00:00:00');
      }

      // Si ya tiene hora, usar tal como está
      const date = new Date(dateString);

      // Verificar que la fecha sea válida
      if (isNaN(date.getTime())) {
        logger.warn(`Fecha inválida recibida: ${dateString}`);
        return null;
      }

      logger.debug(`Fecha parseada: ${dateString} -> ${date.toISOString().split('T')[0]}`);
      return date;
    } catch (error) {
      logger.error(`Error parseando fecha: ${dateString}`, error);
      return null;
    }
  }
  /**
   * Mapea los datos de Supabase a la estructura de CARPROEN
   * @param {Object} invoiceData - Datos de la factura de Supabase
   * @param {number} batch - Número de batch para la factura
   * @returns {Object} - Datos mapeados para CARPROEN
   */
  mapToCarproen(invoiceData, batch) {
    const { invoice } = invoiceData;

    try {
      const total = parseFloat(invoice.total) || 0;
      const subtotal = parseFloat(invoice.subtotal) || 0;
      const tax = parseFloat(invoice.tax) || 0;

      // Parsear la fecha de la factura correctamente
      const invoiceDate = this.parseDate(invoice.date);

      // Extraer ID_N y loguear para debugging
      const extractedIdN = this.extractIdN(invoice.num_identificacion);
      logger.debug(`Mapeando CARPROEN: NIT original="${invoice.num_identificacion}", ID_N extraído="${extractedIdN}"`);

      const carproenData = {
        E: 1,
        S: 1,
        TIPO: this.documentType,
        BATCH: batch,
        ID_N: extractedIdN.substring(0, 30),
        FECHA: invoiceDate,
        TOTAL: total,
        USERNAME: 'SYSTEM'.substring(0, 10),
        FECHA_HORA: new Date().toLocaleString('es-CO').substring(0, 20),
        OBSERV: `Factura ${invoice.invoice_number} - ${invoice.billing_name}`.substring(0, 200).toUpperCase(),
        BANCO: ''.substring(0, 30),
        CHEQUE: ''.substring(0, 15),
        DUEDATE: invoiceDate, // Usar la misma fecha de la factura
        LETRAS: convertToWords(total),
        IDVEND: 1,
        SHIPTO: 0,
        EXPORTADA: 'N',
        ENTREGADO: 'N',
        REVISADO: 'N',
        REVISOR: null,
        FECHA_REVISION: null,
        IMPRESO: 'N',
        DOC_FISICO: null,
        CHEQUE_POSTF: 'false'.substring(0, 5),
        FECHA_CHEQUE: null,
        PROYECTO: null,
        SALDO_DEUDA: null,
        SALDO_DEUDA_ABONO: null,
        PONUMBER: (invoice.invoice_number || '').substring(0, 20), // Número de factura de Supabase (máx 20 caracteres)
        INTERES_IMPLICITO: 'N',
        DETALLE: ''.substring(0, 1024),
        FECHA_CONTAB_CONSIG: 'N',
        DETERIORO_ESFA: 'N',
        CONCEPTO_NOTAFE: null,
        ENVIADO: 'N',
        CUFE: null,
        SUBTOTAL: subtotal,
        SALESTAX: tax,
        IMPCONSUMO: 0,
        TOTAL_REAL: total,
        FECHA_RESPUESTA_DIAN: null,
        ID_BINARIO: null,
        SIN_CRUCE: 'N',
        CUDS: null,
        COD_OPERACION: null,
        FORMAPAGO: null,
        ID_RES: 0,
        FECHA_INICIO_PERIODO: null,
        FECHA_FIN_PERIODO: null
      };

      logger.debug('Datos mapeados para CARPROEN:', carproenData);
      return carproenData;
    } catch (error) {
      logger.error('Error mapeando datos para CARPROEN:', error);
      throw error;
    }
  }

  /**
   * Mapea las entradas contables a la estructura de CARPRODE
   * @param {Object} invoiceData - Datos de la factura de Supabase
   * @param {number} batch - Número de batch para la factura
   * @returns {Array} - Array de datos mapeados para CARPRODE
   */
  mapToCarprode(invoiceData, batch) {
    const { invoice, entries } = invoiceData;

    try {
      // Parsear la fecha de la factura una sola vez
      const invoiceDate = this.parseDate(invoice.date);

      // Generar la descripción del encabezado (CARPROEN.OBSERV) para usar en CARPRODE si está configurado
      const headerDescription = `Factura ${invoice.invoice_number} - ${invoice.billing_name}`.substring(0, 40).toUpperCase();

      const carprodeData = entries.map((entry) => {
        const debit = parseFloat(entry.debit) || 0;
        const credit = parseFloat(entry.credit) || 0;
        const saldo = credit - debit;

        // Determinar el valor del campo INVC según la configuración
        const invcValue = this.useInvoiceNumberForInvc
          ? (invoice.invoice_number || '').substring(0, 15)
          : batch.toString().substring(0, 15);

        // Determinar la descripción según la configuración
        const description = this.useHeaderDescriptionForDetail
          ? headerDescription
          : (entry.description || '').substring(0, 40).toUpperCase();

        // Log de configuraciones solo para la primera entrada (evitar spam)
        if (entries.indexOf(entry) === 0) {
          logger.debug(`Campo INVC configurado como: ${invcValue} (${this.useInvoiceNumberForInvc ? 'invoice_number' : 'batch'})`);
          logger.debug(`Fecha de factura para CARPRODE: ${invoice.date} -> ${invoiceDate?.toISOString().split('T')[0]}`);
          logger.debug(`Descripción CARPRODE: ${this.useHeaderDescriptionForDetail ? 'usando descripción del encabezado' : 'usando descripción de la entrada contable'}`);

          if (this.defaultProjectCode) {
            logger.debug(`Proyecto predeterminado aplicado: ${this.defaultProjectCode}`);
          }

          if (this.defaultActivityCode) {
            logger.debug(`Actividad predeterminada aplicada: ${this.defaultActivityCode}`);
          }
        }

        // Parsear fecha de entrada contable
        const entryDate = this.parseDate(entry.entry_date);

        return {
          CONTEO: null, // Se asignará automáticamente por la BD
          TIPO: this.documentType,
          BATCH: batch,
          ID_N: this.extractIdN(entry.third_party_nit || invoice.num_identificacion).substring(0, 30),
          ACCT: parseFloat(entry.account_code) || 0,
          E: 1,
          S: 1,
          CRUCE: this.documentType.substring(0, 3), // Mismo valor que TIPO de CAPROEN
          INVC: invcValue, // Configurable: invoice_number o batch
          FECHA: entryDate, // Fecha de la entrada contable
          DUEDATE: invoiceDate, // Fecha de vencimiento = fecha de la factura
          DPTO: 0,
          CCOST: 0,
          ACTIVIDAD: this.defaultActivityCode || '', // Código de actividad predeterminado
          PROYECTO: this.defaultProjectCode || '', // Código de proyecto predeterminado
          DESCRIPCION: description, // Configurable: descripción del encabezado o de la entrada
          DIAS: 0,
          DESTINO: 1,
          TIPO_REF: null,
          REFERENCIA: null,
          TIPO_IMP: ''.substring(0, 2),
          NRO_IMP: 0,
          CONCEPTO_IMP: 0,
          BANCO: null,
          CHEQUE: null,
          CONCEPTO_PAGO: null,
          ID_TIPOCARTERA: null,
          INVC_ENTERO: 0,
          CHEQUE_POSTF: 'false'.substring(0, 5),
          FECHA_CHEQUE: null,
          SALDO: saldo,
          CREDIT: credit,
          TASA_CAMBIO: 0,
          CREDITO_US: 0,
          DEBITO_US: 0,
          BASE: parseFloat(entry.base_amount) || 0,
          DEBIT: debit,
          CUOTA: 1,
          FECHA_CONSIG: null,
          FECHA_FACTURA: invoiceDate, // Fecha de la factura
          MAYOR_VALOR: null,
          VALOR_IMPUESTO: null,
          IMPORT: 'N',
          COD_FLUJOEFE: 0,
          IDVEND: null,
          PORC_TASA: parseFloat(entry.tax_rate) || null,
          TIEMPO_MESES: null,
          PAGO_DISP: 'N',
          REGISTROELECT: 'N',
          PORC_RETENCION: null,
          BASE_ELECTRONICA: 0
        };
      });

      logger.debug(`Datos mapeados para CARPRODE (${carprodeData.length} registros)`);
      return carprodeData;
    } catch (error) {
      logger.error('Error mapeando datos para CARPRODE:', error);
      throw error;
    }
  }
}

module.exports = DataMapper;
