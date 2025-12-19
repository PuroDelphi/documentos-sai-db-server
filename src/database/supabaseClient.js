const { createClient } = require('@supabase/supabase-js');
const config = require('../config');
const logger = require('../utils/logger');
const { validateAndGetUserUUID } = require('../utils/userValidation');

class SupabaseClient {
  constructor() {
    this.client = createClient(config.supabase.url, config.supabase.anonKey);
    this.userUUID = validateAndGetUserUUID();
    logger.info(`Cliente Supabase inicializado para usuario: ${this.userUUID}`);
  }

  /**
   * Obtiene los datos completos de una factura aprobada
   * @param {number} invoiceId - ID de la factura
   * @returns {Promise<Object>} - Datos completos de la factura
   */
  async getInvoiceData(invoiceId) {
    try {
      // Obtener datos de la factura (filtrado por usuario)
      const { data: invoice, error: invoiceError } = await this.client
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .eq('user_id', this.userUUID)
        .single();

      if (invoiceError) {
        throw new Error(`Error obteniendo factura: ${invoiceError.message}`);
      }

      // Obtener items de la factura (filtrado por usuario)
      // Incluir JOIN con invoice_products para obtener item_code (necesario para EA/OC)
      const { data: items, error: itemsError } = await this.client
        .from('invoice_items')
        .select(`
          *,
          product:invoice_products (
            item_code,
            description
          )
        `)
        .eq('invoice_id', invoiceId)
        .eq('user_id', this.userUUID);

      if (itemsError) {
        throw new Error(`Error obteniendo items: ${itemsError.message}`);
      }

      // Obtener entradas contables (filtrado por usuario)
      const { data: entries, error: entriesError } = await this.client
        .from('accounting_entries')
        .select('*')
        .eq('invoice_id', invoiceId)
        .eq('user_id', this.userUUID);

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
          filter: `user_id=eq.${this.userUUID}`
        },
        async (payload) => {
          const invoice = payload.new;
          const oldInvoice = payload.old;

          // Solo procesar si el estado cambió a APROBADO
          if (invoice.estado !== 'APROBADO') {
            logger.debug(`Factura ${invoice.invoice_number} actualizada pero no está en estado APROBADO (estado: ${invoice.estado}), omitiendo`);
            return;
          }

          // Solo procesar si el estado cambió (no estaba APROBADO antes)
          if (oldInvoice && oldInvoice.estado === 'APROBADO') {
            logger.debug(`Factura ${invoice.invoice_number} ya estaba en estado APROBADO, omitiendo`);
            return;
          }

          logger.info('Factura aprobada detectada:', {
            id: invoice.id,
            invoice_number: invoice.invoice_number,
            estado: invoice.estado,
            estado_anterior: oldInvoice?.estado,
            service_response: invoice.service_response,
            fecha_hora_sync: invoice.fecha_hora_sync
          });

          // Verificar si ya fue procesada exitosamente
          if (invoice.service_response === 'Ok' || invoice.service_response?.includes('tercero creado automáticamente')) {
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
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.info('✅ Listener de Supabase Realtime SUSCRITO exitosamente');
        } else if (status === 'CHANNEL_ERROR') {
          logger.error('❌ Error en el canal de Supabase Realtime');
        } else if (status === 'TIMED_OUT') {
          logger.error('❌ Timeout en la suscripción de Supabase Realtime');
        } else if (status === 'CLOSED') {
          logger.warn('⚠️ Canal de Supabase Realtime cerrado');
        }
      });

    logger.info('Configurando listener de Supabase Realtime...');
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
        .eq('user_id', this.userUUID)
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
        .eq('id', invoiceId)
        .eq('user_id', this.userUUID);

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
