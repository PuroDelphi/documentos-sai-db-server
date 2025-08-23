const { createClient } = require('@supabase/supabase-js');
const config = require('../config');
const logger = require('../utils/logger');

class SupabaseClient {
  constructor() {
    this.client = createClient(config.supabase.url, config.supabase.anonKey);
    logger.info('Cliente Supabase inicializado');
  }

  /**
   * Obtiene los datos completos de una factura aprobada
   * @param {number} invoiceId - ID de la factura
   * @returns {Promise<Object>} - Datos completos de la factura
   */
  async getInvoiceData(invoiceId) {
    try {
      // Obtener datos de la factura
      const { data: invoice, error: invoiceError } = await this.client
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (invoiceError) {
        throw new Error(`Error obteniendo factura: ${invoiceError.message}`);
      }

      // Obtener items de la factura
      const { data: items, error: itemsError } = await this.client
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceId);

      if (itemsError) {
        throw new Error(`Error obteniendo items: ${itemsError.message}`);
      }

      // Obtener entradas contables
      const { data: entries, error: entriesError } = await this.client
        .from('accounting_entries')
        .select('*')
        .eq('invoice_id', invoiceId);

      if (entriesError) {
        throw new Error(`Error obteniendo entradas contables: ${entriesError.message}`);
      }

      return {
        invoice,
        items,
        entries
      };
    } catch (error) {
      logger.error('Error obteniendo datos de factura:', { invoiceId, error: error.message });
      throw error;
    }
  }

  /**
   * Configura el listener de cambios en tiempo real
   * @param {Function} callback - Función a ejecutar cuando hay cambios
   */
  setupRealtimeListener(callback) {
    const channel = this.client
      .channel('invoices-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'invoices',
          filter: 'estado=eq.APROBADO'
        },
        async (payload) => {
          const invoice = payload.new;

          logger.info('Factura aprobada detectada:', {
            id: invoice.id,
            invoice_number: invoice.invoice_number,
            estado: invoice.estado,
            service_response: invoice.service_response,
            fecha_hora_sync: invoice.fecha_hora_sync
          });

          // Verificar si ya fue procesada exitosamente
          if (invoice.service_response === 'Ok') {
            logger.info(`Factura ${invoice.invoice_number} ya fue sincronizada exitosamente, omitiendo procesamiento`);
            return;
          }

          try {
            await callback(invoice);
          } catch (error) {
            logger.error('Error procesando factura aprobada:', error);
          }
        }
      )
      .subscribe();

    logger.info('Listener de Supabase Realtime configurado');
    return channel;
  }

  /**
   * Obtiene facturas aprobadas que no han sido sincronizadas
   * @returns {Promise<Array>} - Array de facturas pendientes de sincronización
   */
  async getPendingApprovedInvoices() {
    try {
      const { data: invoices, error } = await this.client
        .from('invoices')
        .select('*')
        .eq('estado', 'APROBADO')
        .or('service_response.is.null,service_response.neq.Ok')
        .order('date', { ascending: true });

      if (error) {
        throw new Error(`Error obteniendo facturas pendientes: ${error.message}`);
      }

      logger.info(`Encontradas ${invoices.length} facturas aprobadas pendientes de sincronización`);

      if (invoices.length > 0) {
        logger.info('Facturas pendientes:', invoices.map(inv => ({
          id: inv.id,
          invoice_number: inv.invoice_number,
          estado: inv.estado,
          service_response: inv.service_response,
          fecha_hora_sync: inv.fecha_hora_sync,
          date: inv.date
        })));
      }

      return invoices;
    } catch (error) {
      logger.error('Error obteniendo facturas pendientes:', error);
      throw error;
    }
  }

  /**
   * Actualiza el estado y respuesta de una factura
   * @param {number} invoiceId - ID de la factura
   * @param {string} estado - Nuevo estado ('SINCRONIZADO' o 'ERROR')
   * @param {string} serviceResponse - Respuesta del servicio ('Ok' o mensaje de error)
   */
  async updateInvoiceStatus(invoiceId, estado, serviceResponse) {
    try {
      const { data, error } = await this.client
        .from('invoices')
        .update({
          estado: estado,
          service_response: serviceResponse
          // fecha_hora_sync se actualiza automáticamente por trigger cuando estado = 'SINCRONIZADO'
        })
        .eq('id', invoiceId);

      if (error) {
        throw new Error(`Error actualizando estado de factura: ${error.message}`);
      }

      logger.info(`Estado de factura ${invoiceId} actualizado:`, {
        estado,
        serviceResponse
      });
      return data;
    } catch (error) {
      logger.error('Error actualizando estado de factura:', { invoiceId, estado, serviceResponse, error: error.message });
      throw error;
    }
  }

  /**
   * Cierra las conexiones
   */
  async close() {
    // Supabase maneja las conexiones automáticamente
    logger.info('Cliente Supabase cerrado');
  }
}

module.exports = SupabaseClient;
