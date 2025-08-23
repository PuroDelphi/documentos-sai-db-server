const { convertToWords } = require('../utils/numberToWords');
const logger = require('../utils/logger');

class DataMapper {
  constructor() {
    // Configuración para el campo INVC
    this.useInvoiceNumberForInvc = process.env.USE_INVOICE_NUMBER_FOR_INVC === 'true';

    logger.info(`Configuración INVC: ${this.useInvoiceNumberForInvc ? 'usar invoice_number de Supabase' : 'usar número de batch/FIA'}`);
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

      const carproenData = {
        E: 1,
        S: 1,
        TIPO: 'FIA',
        BATCH: batch,
        ID_N: (invoice.num_identificacion || '').substring(0, 30),
        FECHA: invoiceDate,
        TOTAL: total,
        USERNAME: 'SYSTEM'.substring(0, 10),
        FECHA_HORA: new Date().toLocaleString('es-CO').substring(0, 20),
        OBSERV: `Factura ${invoice.invoice_number} - ${invoice.billing_name}`.substring(0, 200),
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
        PONUMBER: (invoice.invoice_number || '').substring(0, 30), // Número de factura de Supabase
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

      const carprodeData = entries.map((entry) => {
        const debit = parseFloat(entry.debit) || 0;
        const credit = parseFloat(entry.credit) || 0;
        const saldo = credit - debit;

        // Determinar el valor del campo INVC según la configuración
        const invcValue = this.useInvoiceNumberForInvc
          ? (invoice.invoice_number || '').substring(0, 15)
          : batch.toString().substring(0, 15);

        // Log del valor INVC solo para la primera entrada (evitar spam)
        if (entries.indexOf(entry) === 0) {
          logger.debug(`Campo INVC configurado como: ${invcValue} (${this.useInvoiceNumberForInvc ? 'invoice_number' : 'batch'})`);
          logger.debug(`Fecha de factura para CARPRODE: ${invoice.date} -> ${invoiceDate?.toISOString().split('T')[0]}`);
        }

        // Parsear fecha de entrada contable
        const entryDate = this.parseDate(entry.entry_date);

        return {
          CONTEO: null, // Se asignará automáticamente por la BD
          TIPO: 'FIA',
          BATCH: batch,
          ID_N: (entry.third_party_nit || invoice.num_identificacion || '').substring(0, 30),
          ACCT: parseFloat(entry.account_code) || 0,
          E: 1,
          S: 1,
          CRUCE: 'FIA'.substring(0, 3), // Mismo valor que TIPO de CAPROEN
          INVC: invcValue, // Configurable: invoice_number o batch
          FECHA: entryDate, // Fecha de la entrada contable
          DUEDATE: invoiceDate, // Fecha de vencimiento = fecha de la factura
          DPTO: 0,
          CCOST: 0,
          ACTIVIDAD: ''.substring(0, 3),
          DESCRIPCION: (entry.description || '').substring(0, 40),
          DIAS: 0,
          DESTINO: 1,
          TIPO_REF: null,
          REFERENCIA: null,
          TIPO_IMP: ''.substring(0, 2),
          NRO_IMP: 0,
          CONCEPTO_IMP: 0,
          BANCO: null,
          CHEQUE: null,
          PROYECTO: ''.substring(0, 10),
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
