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
   * Configura el listener de cambios en tiempo real con reconexión automática
   * @param {Function} callback - Función a ejecutar cuando hay cambios
   */
  setupRealtimeListener(callback) {
    let channel = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 10;
    const reconnectDelay = 5000; // 5 segundos

    const createChannel = () => {
      // Desuscribir del canal anterior si existe
      if (channel) {
        try {
          logger.debug('Desuscribiendo del canal anterior...');
          channel.unsubscribe();
        } catch (error) {
          logger.debug('Error desuscribiendo del canal anterior:', error.message);
        }
      }

      logger.info('Creando canal de Supabase Realtime...');

      // Usar un nombre de canal único con timestamp para evitar conflictos
      const channelName = `invoices-changes-${Date.now()}`;

      channel = this.client
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'invoices',
            filter: `user_id=eq.${this.userUUID}`
          },
          async (payload) => {
            try {
              logger.debug('📨 Evento Realtime recibido:', {
                eventType: payload.eventType,
                table: payload.table,
                hasNew: !!payload.new,
                hasOld: !!payload.old
              });

              const invoice = payload.new;
              const oldInvoice = payload.old;

              if (!invoice) {
                logger.warn('⚠️ Payload sin datos de factura nueva, omitiendo');
                return;
              }

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

              logger.info('✅ Factura aprobada detectada:', {
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

              // Procesar factura en background para no bloquear el canal
              logger.info(`🔄 Iniciando procesamiento de factura ${invoice.invoice_number}...`);

              // Usar setImmediate para procesar en el siguiente tick del event loop
              setImmediate(async () => {
                try {
                  await callback(invoice);
                  logger.info(`✅ Factura ${invoice.invoice_number} procesada exitosamente`);
                } catch (callbackError) {
                  logger.error(`❌ Error procesando factura ${invoice.invoice_number}:`, {
                    error: callbackError.message,
                    stack: callbackError.stack
                  });
                }
              });

            } catch (error) {
              logger.error('❌ Error crítico en el handler del evento Realtime:', {
                error: error.message,
                stack: error.stack,
                payload: payload
              });
              // No lanzar el error para evitar que se cierre el canal
            }
          }
        )
        .subscribe((status, err) => {
          logger.debug(`📡 Estado de suscripción Realtime: ${status}`, { error: err });

          if (status === 'SUBSCRIBED') {
            logger.info('✅ Listener de Supabase Realtime SUSCRITO exitosamente');
            reconnectAttempts = 0; // Reset contador de reconexiones
          } else if (status === 'CHANNEL_ERROR') {
            logger.error('❌ Error en el canal de Supabase Realtime', {
              error: err?.message || err,
              errorDetails: err,
              reconnectAttempts: reconnectAttempts + 1,
              maxAttempts: maxReconnectAttempts
            });

            // NO reconectar automáticamente en CHANNEL_ERROR
            // Esto suele indicar un problema de configuración
            logger.error('⚠️ CHANNEL_ERROR detectado. Verifique:');
            logger.error('   1. Que Realtime esté habilitado en Supabase para la tabla "invoices"');
            logger.error('   2. Que el user_id en el filtro sea correcto');
            logger.error('   3. Que no haya problemas de permisos RLS');

          } else if (status === 'TIMED_OUT') {
            logger.error('❌ Timeout en la suscripción de Supabase Realtime');

            // Intentar reconectar solo si no es un problema persistente
            if (reconnectAttempts < maxReconnectAttempts) {
              reconnectAttempts++;
              const delay = reconnectDelay * reconnectAttempts; // Backoff exponencial
              logger.info(`🔄 Intentando reconectar en ${delay / 1000} segundos... (intento ${reconnectAttempts}/${maxReconnectAttempts})`);
              setTimeout(() => {
                createChannel();
              }, delay);
            } else {
              logger.error('❌ Máximo de intentos de reconexión alcanzado. Por favor reinicie el servicio.');
            }
          } else if (status === 'CLOSED') {
            logger.warn('⚠️ Canal de Supabase Realtime cerrado');

            // NO reconectar automáticamente si se cerró intencionalmente
            // Solo reconectar si fue un cierre inesperado
            logger.warn('   El canal se cerró. Esto puede ser normal al apagar el servicio.');
            logger.warn('   Si el servicio sigue corriendo, puede haber un problema.');

          } else {
            logger.debug(`📊 Estado del canal Realtime: ${status}`);
          }
        });

      return channel;
    };

    // Crear canal inicial
    return createChannel();
  }

  /**
   * Verifica el estado de salud del canal de Realtime
   * @param {Object} channel - Canal de Supabase
   * @returns {Object} - Estado del canal
   */
  getChannelHealth(channel) {
    if (!channel) {
      return { healthy: false, reason: 'Canal no inicializado' };
    }

    const state = channel.state;

    if (state === 'joined') {
      return { healthy: true, state: 'joined' };
    } else if (state === 'joining') {
      return { healthy: true, state: 'joining', warning: 'Conectando...' };
    } else if (state === 'leaving') {
      return { healthy: false, state: 'leaving', reason: 'Canal cerrándose' };
    } else if (state === 'closed') {
      return { healthy: false, state: 'closed', reason: 'Canal cerrado' };
    } else {
      return { healthy: false, state: state || 'unknown', reason: 'Estado desconocido' };
    }
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
