/**
 * Script de prueba para verificar la recuperación de facturas después de reconexión
 * 
 * Este script simula:
 * 1. Conexión inicial al Realtime
 * 2. Desconexión forzada
 * 3. Reconexión automática
 * 4. Verificación de que se ejecuta la recuperación de facturas pendientes
 * 
 * Uso:
 *   node src/scripts/testReconnectRecovery.js
 */

const logger = require('../utils/logger');
const SupabaseClient = require('../database/supabaseClient');

async function testReconnectRecovery() {
  logger.info('='.repeat(80));
  logger.info('PRUEBA DE RECUPERACIÓN POST-RECONEXIÓN');
  logger.info('='.repeat(80));

  try {
    const supabaseClient = new SupabaseClient();
    logger.info(`✓ Cliente Supabase inicializado para usuario: ${supabaseClient.userUUID}`);

    // Contador de reconexiones
    let reconnectCount = 0;
    let changeCount = 0;

    logger.info('\n📡 Configurando listener de Realtime con callback de reconexión...');
    
    const channel = supabaseClient.setupRealtimeListener(
      async (invoice) => {
        changeCount++;
        logger.info(`\n🎉 CAMBIO DETECTADO #${changeCount}`);
        logger.info(`   Factura: ${invoice.invoice_number}`);
        logger.info(`   Estado: ${invoice.estado}`);
      },
      async () => {
        reconnectCount++;
        logger.info(`\n🔄 RECONEXIÓN DETECTADA #${reconnectCount}`);
        logger.info('   Ejecutando recuperación de facturas pendientes...');
        
        // Simular recuperación (en producción esto llama a processPendingApprovedInvoices)
        const { data: pendingInvoices, error } = await supabaseClient.client
          .from('invoices')
          .select('id, invoice_number, estado, service_response')
          .eq('user_id', supabaseClient.userUUID)
          .eq('estado', 'APROBADO')
          .is('service_response', null);

        if (error) {
          logger.error('   ❌ Error obteniendo facturas pendientes:', error.message);
        } else {
          logger.info(`   ✅ Facturas pendientes encontradas: ${pendingInvoices.length}`);
          if (pendingInvoices.length > 0) {
            logger.info('   Facturas que se sincronizarían:');
            pendingInvoices.forEach((inv, i) => {
              logger.info(`      ${i + 1}. ${inv.invoice_number} (ID: ${inv.id})`);
            });
          }
        }
      }
    );

    logger.info('✓ Listener configurado con callback de reconexión');

    // Esperar 5 segundos para que se establezca la conexión inicial
    logger.info('\n⏳ Esperando 5 segundos para conexión inicial...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    logger.info('\n📊 Estado del canal:');
    logger.info(`   Estado: ${channel.state}`);
    logger.info(`   Reconexiones detectadas: ${reconnectCount}`);
    logger.info(`   Cambios detectados: ${changeCount}`);

    logger.info('\n💡 INSTRUCCIONES PARA PROBAR RECONEXIÓN:');
    logger.info('   1. Deja este script corriendo');
    logger.info('   2. Ve a Supabase Dashboard → Settings → API');
    logger.info('   3. Desactiva temporalmente Realtime (o reinicia el servicio)');
    logger.info('   4. Vuelve a activar Realtime');
    logger.info('   5. Observa que se ejecuta el callback de reconexión');
    logger.info('');
    logger.info('   Alternativamente:');
    logger.info('   - Cambia una factura a estado APROBADO para ver detección de cambios');
    logger.info('   - Presiona Ctrl+C para salir');

    // Mantener el script corriendo
    logger.info('\n⏳ Escuchando cambios y reconexiones (presiona Ctrl+C para salir)...\n');

    // Verificar estado cada 10 segundos
    const healthCheckInterval = setInterval(() => {
      const health = supabaseClient.getChannelHealth(channel);
      logger.debug(`📊 Estado del canal: ${health.state || 'unknown'} (healthy: ${health.healthy})`);
      
      if (!health.healthy) {
        logger.warn(`⚠️ Canal no saludable: ${health.reason}`);
      }
    }, 10000);

    // Manejar cierre graceful
    process.on('SIGINT', async () => {
      logger.info('\n\n🔌 Cerrando conexión...');
      clearInterval(healthCheckInterval);
      
      try {
        await supabaseClient.client.removeChannel(channel);
        logger.info('✓ Conexión cerrada');
      } catch (error) {
        logger.error('Error cerrando conexión:', error.message);
      }

      logger.info('\n📊 RESUMEN DE LA PRUEBA:');
      logger.info(`   Reconexiones detectadas: ${reconnectCount}`);
      logger.info(`   Cambios detectados: ${changeCount}`);
      logger.info('\n' + '='.repeat(80));
      logger.info('PRUEBA COMPLETADA');
      logger.info('='.repeat(80));
      
      process.exit(0);
    });

  } catch (error) {
    logger.error('❌ Error en la prueba:', error);
    process.exit(1);
  }
}

// Ejecutar prueba
testReconnectRecovery().catch(error => {
  logger.error('Error fatal:', error);
  process.exit(1);
});

