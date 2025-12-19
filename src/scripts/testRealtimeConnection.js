require('dotenv').config();
const SupabaseClient = require('../database/supabaseClient');
const logger = require('../utils/logger');

/**
 * Script para probar la conexión de Supabase Realtime
 * Verifica que el websocket se conecte correctamente y detecte cambios
 */

async function testRealtimeConnection() {
  logger.info('='.repeat(80));
  logger.info('PRUEBA DE CONEXIÓN SUPABASE REALTIME');
  logger.info('='.repeat(80));

  try {
    const supabaseClient = new SupabaseClient();
    logger.info(`✓ Cliente Supabase inicializado para usuario: ${supabaseClient.userUUID}`);

    logger.info('\n📡 Configurando listener de Realtime...');
    
    let changeDetected = false;
    
    const channel = supabaseClient.setupRealtimeListener(async (invoice) => {
      changeDetected = true;
      logger.info('\n🎉 ¡CAMBIO DETECTADO EN TIEMPO REAL!');
      logger.info('Datos de la factura:');
      logger.info(`   ID: ${invoice.id}`);
      logger.info(`   Número: ${invoice.invoice_number}`);
      logger.info(`   Estado: ${invoice.estado}`);
      logger.info(`   Service Response: ${invoice.service_response}`);
      logger.info(`   Fecha/Hora Sync: ${invoice.fecha_hora_sync}`);
    });

    logger.info('\n⏳ Esperando 30 segundos para detectar cambios...');
    logger.info('   💡 Cambia el estado de una factura a "APROBADO" en Supabase para probar');
    logger.info('   💡 Asegúrate de que la factura pertenezca al usuario configurado');
    
    // Esperar 30 segundos
    await new Promise(resolve => setTimeout(resolve, 30000));

    if (changeDetected) {
      logger.info('\n✅ PRUEBA EXITOSA: El listener detectó cambios en tiempo real');
    } else {
      logger.warn('\n⚠️ ADVERTENCIA: No se detectaron cambios en 30 segundos');
      logger.warn('   Posibles causas:');
      logger.warn('   1. No se cambió ninguna factura a estado APROBADO');
      logger.warn('   2. Supabase Realtime no está habilitado en el proyecto');
      logger.warn('   3. El filtro de user_id no coincide');
      logger.warn('   4. Problemas de red/firewall bloqueando websockets');
    }

    // Desuscribir
    logger.info('\n🔌 Cerrando conexión...');
    await supabaseClient.client.removeChannel(channel);
    logger.info('✓ Conexión cerrada');

    logger.info('\n' + '='.repeat(80));
    logger.info('PRUEBA COMPLETADA');
    logger.info('='.repeat(80));

  } catch (error) {
    logger.error('\n❌ ERROR EN LA PRUEBA:', error);
    logger.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Ejecutar la prueba
testRealtimeConnection()
  .then(() => {
    logger.info('\n✓ Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Error fatal:', error);
    process.exit(1);
  });

