const SupabaseClient = require('../database/supabaseClient');
const SyncService = require('../services/syncService');
const logger = require('../utils/logger');

/**
 * Script para probar la funcionalidad de recuperación de facturas
 */
async function testRecovery() {
  const supabaseClient = new SupabaseClient();
  const syncService = new SyncService();

  try {
    logger.info('=== PRUEBA DE RECUPERACIÓN DE FACTURAS ===');
    
    // 1. Verificar facturas pendientes
    logger.info('1. Verificando facturas aprobadas pendientes...');
    const pendingInvoices = await supabaseClient.getPendingApprovedInvoices();
    
    if (pendingInvoices.length === 0) {
      logger.info('✅ No hay facturas pendientes para probar');
      logger.info('💡 Para probar la recuperación:');
      logger.info('   1. Crea una factura en Supabase');
      logger.info('   2. Cambia su estado a APROBADO');
      logger.info('   3. Asegúrate de que service_response sea null o diferente de "Ok"');
      logger.info('   4. Ejecuta este script nuevamente');
      return;
    }

    logger.info(`📋 Encontradas ${pendingInvoices.length} facturas pendientes:`);
    pendingInvoices.forEach((invoice, index) => {
      logger.info(`   ${index + 1}. ID: ${invoice.id}, Número: ${invoice.invoice_number}, Estado: ${invoice.estado}, Respuesta: ${invoice.service_response || 'null'}`);
    });

    // 2. Probar la función de recuperación
    logger.info('\n2. Ejecutando proceso de recuperación...');
    await syncService.initialize();
    
    const result = await syncService.processPendingApprovedInvoices();
    
    logger.info('\n3. Resultados de la recuperación:');
    logger.info(`   ✅ Facturas procesadas: ${result.processed}`);
    logger.info(`   ❌ Errores: ${result.errors}`);
    
    if (result.processed > 0) {
      logger.info('\n4. Verificando estado final...');
      const remainingPending = await supabaseClient.getPendingApprovedInvoices();
      logger.info(`   📋 Facturas pendientes restantes: ${remainingPending.length}`);
      
      if (remainingPending.length < pendingInvoices.length) {
        logger.info('   ✅ La recuperación funcionó correctamente');
      } else {
        logger.warn('   ⚠️  Algunas facturas no se procesaron correctamente');
      }
    }

    logger.info('\n=== PRUEBA COMPLETADA ===');

  } catch (error) {
    logger.error('❌ Error durante la prueba:', error);
  } finally {
    // Cerrar conexiones
    try {
      await syncService.stop();
    } catch (closeError) {
      logger.error('Error cerrando conexiones:', closeError);
    }
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testRecovery()
    .then(() => {
      logger.info('Prueba finalizada');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Error en prueba:', error);
      process.exit(1);
    });
}

module.exports = testRecovery;
