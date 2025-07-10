const { convertToWords } = require('../utils/numberToWords');
const logger = require('../utils/logger');

class DataMapper {
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

      const carproenData = {
        E: 1,
        S: 1,
        TIPO: 'FIA',
        BATCH: batch,
        ID_N: (invoice.num_identificacion || '').substring(0, 30),
        FECHA: new Date(invoice.date),
        TOTAL: total,
        USERNAME: 'SYSTEM'.substring(0, 10),
        FECHA_HORA: new Date().toLocaleString('es-CO').substring(0, 20),
        OBSERV: `Factura ${invoice.invoice_number} - ${invoice.billing_name}`.substring(0, 200),
        BANCO: ''.substring(0, 30),
        CHEQUE: ''.substring(0, 15),
        DUEDATE: new Date(invoice.date),
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
      const carprodeData = entries.map((entry, index) => {
        const debit = parseFloat(entry.debit) || 0;
        const credit = parseFloat(entry.credit) || 0;
        const saldo = credit - debit;

        return {
          CONTEO: null, // Se asignará automáticamente por la BD
          TIPO: 'FIA',
          BATCH: batch,
          ID_N: (entry.third_party_nit || invoice.num_identificacion || '').substring(0, 30),
          ACCT: parseFloat(entry.account_code) || 0,
          E: 1,
          S: 1,
          CRUCE: 'FIA'.substring(0, 3), // Mismo valor que TIPO de CAPROEN
          INVC: batch.toString().substring(0, 15), // Mismo valor que BATCH de CAPROEN
          FECHA: new Date(entry.entry_date),
          DUEDATE: new Date(entry.entry_date),
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
          FECHA_FACTURA: new Date(invoice.date),
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
