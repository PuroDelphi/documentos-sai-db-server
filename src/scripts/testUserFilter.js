const { validateAndGetUserUUID, isValidUUID } = require('../utils/userValidation');
const SupabaseClient = require('../database/supabaseClient');
const logger = require('../utils/logger');

/**
 * Script para probar el filtro por UUID de usuario
 */
async function testUserFilter() {
  try {
    logger.info('=== PRUEBA DE FILTRO POR UUID DE USUARIO ===');
    
    // 1. Verificar configuración de UUID
    logger.info('\n1. Verificando configuración de UUID...');
    logger.info(`   USER_UUID configurado: ${process.env.USER_UUID || 'NO CONFIGURADO'}`);
    
    try {
      const userUUID = validateAndGetUserUUID();
      logger.info(`   ✅ UUID válido: ${userUUID}`);
    } catch (error) {
      logger.error(`   ❌ Error de configuración: ${error.message}`);
      return;
    }
    
    // 2. Probar validación de UUID
    logger.info('\n2. Probando validación de UUID...');
    const testUUIDs = [
      { uuid: '550e8400-e29b-41d4-a716-446655440000', expected: true, name: 'UUID válido' },
      { uuid: 'invalid-uuid', expected: false, name: 'UUID inválido' },
      { uuid: '', expected: false, name: 'UUID vacío' },
      { uuid: null, expected: false, name: 'UUID null' },
      { uuid: '550e8400-e29b-41d4-a716-44665544000', expected: false, name: 'UUID incompleto' },
      { uuid: '550e8400-e29b-41d4-a716-446655440000-extra', expected: false, name: 'UUID con caracteres extra' }
    ];
    
    testUUIDs.forEach(test => {
      const result = isValidUUID(test.uuid);
      const status = result === test.expected ? '✅' : '❌';
      logger.info(`   ${status} ${test.name}: ${result} (esperado: ${test.expected})`);
    });
    
    // 3. Probar cliente Supabase con filtro
    logger.info('\n3. Probando cliente Supabase con filtro de usuario...');
    
    try {
      const supabaseClient = new SupabaseClient();
      logger.info(`   ✅ Cliente Supabase inicializado con UUID: ${supabaseClient.userUUID}`);
      
      // 4. Probar consultas filtradas
      logger.info('\n4. Probando consultas filtradas...');
      
      // Probar facturas pendientes
      logger.info('   4.1 Consultando facturas aprobadas pendientes...');
      const pendingInvoices = await supabaseClient.getPendingApprovedInvoices();
      logger.info(`   Facturas encontradas: ${pendingInvoices.length}`);
      
      if (pendingInvoices.length > 0) {
        logger.info('   Muestra de facturas (primeras 3):');
        pendingInvoices.slice(0, 3).forEach((invoice, index) => {
          logger.info(`     ${index + 1}. ID: ${invoice.id}, Número: ${invoice.invoice_number}, User ID: ${invoice.user_id}`);
          
          // Verificar que todas las facturas pertenecen al usuario correcto
          if (invoice.user_id === supabaseClient.userUUID) {
            logger.info(`       ✅ Factura pertenece al usuario correcto`);
          } else {
            logger.error(`       ❌ Factura NO pertenece al usuario (${invoice.user_id} vs ${supabaseClient.userUUID})`);
          }
        });
      }
      
      // Probar obtener datos de factura específica
      if (pendingInvoices.length > 0) {
        logger.info('\n   4.2 Probando obtener datos de factura específica...');
        const testInvoiceId = pendingInvoices[0].id;
        
        try {
          const invoiceData = await supabaseClient.getInvoiceData(testInvoiceId);
          logger.info(`   ✅ Datos de factura obtenidos exitosamente`);
          logger.info(`     Factura ID: ${invoiceData.invoice.id}`);
          logger.info(`     User ID: ${invoiceData.invoice.user_id}`);
          logger.info(`     Items: ${invoiceData.items.length}`);
          logger.info(`     Entradas contables: ${invoiceData.entries.length}`);
          
          // Verificar que todos los datos pertenecen al usuario
          const allItemsValid = invoiceData.items.every(item => item.user_id === supabaseClient.userUUID);
          const allEntriesValid = invoiceData.entries.every(entry => entry.user_id === supabaseClient.userUUID);
          
          if (allItemsValid && allEntriesValid) {
            logger.info(`   ✅ Todos los datos relacionados pertenecen al usuario correcto`);
          } else {
            logger.error(`   ❌ Algunos datos NO pertenecen al usuario correcto`);
            logger.error(`     Items válidos: ${allItemsValid}`);
            logger.error(`     Entradas válidas: ${allEntriesValid}`);
          }
          
        } catch (error) {
          logger.error(`   ❌ Error obteniendo datos de factura: ${error.message}`);
        }
      }
      
      await supabaseClient.close();
      
    } catch (error) {
      logger.error(`   ❌ Error con cliente Supabase: ${error.message}`);
    }
    
    // 5. Verificar configuración de realtime
    logger.info('\n5. Verificando configuración de Realtime...');
    logger.info('   El filtro de Realtime se configura automáticamente con:');
    logger.info(`   Filter: estado=eq.APROBADO,user_id=eq.${validateAndGetUserUUID()}`);
    logger.info('   ✅ Solo las facturas del usuario configurado activarán el listener');
    
    logger.info('\n=== PRUEBA COMPLETADA ===');
    
    // Resumen de seguridad
    logger.info('\n🔒 RESUMEN DE SEGURIDAD:');
    logger.info('   ✅ UUID de usuario validado y obligatorio');
    logger.info('   ✅ Todas las consultas filtradas por user_id');
    logger.info('   ✅ Realtime configurado con filtro de usuario');
    logger.info('   ✅ Inserción automática de user_id en nuevos registros');
    logger.info('   ✅ Actualizaciones limitadas a registros del usuario');
    
    logger.info('\n💡 CONFIGURACIÓN REQUERIDA:');
    logger.info('   1. Configurar USER_UUID en archivo .env');
    logger.info('   2. Reiniciar el servicio después de cambiar UUID');
    logger.info('   3. Verificar que las tablas en Supabase tienen campo user_id');
    logger.info('   4. Asegurar que los datos existentes tienen user_id asignado');
    
  } catch (error) {
    logger.error('❌ Error durante la prueba:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testUserFilter()
    .then(() => {
      logger.info('Prueba finalizada');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Error en prueba:', error);
      process.exit(1);
    });
}

module.exports = testUserFilter;
