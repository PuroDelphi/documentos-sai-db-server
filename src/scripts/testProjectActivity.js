const DataMapper = require('../services/dataMapper');
const logger = require('../utils/logger');

/**
 * Script para probar la configuración de proyecto y actividad predeterminados
 */
async function testProjectActivity() {
  try {
    logger.info('=== PRUEBA DE CONFIGURACIÓN DE PROYECTO Y ACTIVIDAD ===');
    
    // Mostrar configuración actual
    logger.info(`\n1. Configuración actual:`);
    logger.info(`   DEFAULT_PROJECT_CODE: "${process.env.DEFAULT_PROJECT_CODE || ''}"`);
    logger.info(`   DEFAULT_ACTIVITY_CODE: "${process.env.DEFAULT_ACTIVITY_CODE || ''}"`);
    
    // Crear instancia del DataMapper
    const dataMapper = new DataMapper();
    
    // Datos de prueba
    const mockInvoiceData = {
      invoice: {
        id: 123,
        invoice_number: 'FAC-2024-001',
        date: '2024-01-15',
        billing_name: 'Cliente de Prueba',
        num_identificacion: '12345678-9',
        total: 1000000,
        subtotal: 840336,
        tax: 159664
      },
      entries: [
        {
          id: 1,
          account_code: '11050501',
          description: 'Cuentas por cobrar',
          debit: 1000000,
          credit: 0,
          third_party_nit: '12345678-9',
          entry_date: '2024-01-15'
        },
        {
          id: 2,
          account_code: '41351501',
          description: 'Ingresos por servicios',
          debit: 0,
          credit: 840336,
          entry_date: '2024-01-15'
        },
        {
          id: 3,
          account_code: '24080101',
          description: 'IVA por pagar',
          debit: 0,
          credit: 159664,
          entry_date: '2024-01-15'
        }
      ]
    };

    const mockBatch = 12345;

    // Probar mapeo de CARPRODE
    logger.info('\n2. Probando mapeo de CARPRODE...');
    const carprodeData = dataMapper.mapToCarprode(mockInvoiceData, mockBatch);
    
    logger.info(`\n3. Resultados del mapeo (${carprodeData.length} registros):`);
    carprodeData.forEach((entry, index) => {
      logger.info(`\n   Registro ${index + 1}:`);
      logger.info(`     ACCT: ${entry.ACCT}`);
      logger.info(`     DESCRIPCION: ${entry.DESCRIPCION}`);
      logger.info(`     PROYECTO: "${entry.PROYECTO || ''}" (longitud: ${(entry.PROYECTO || '').length})`);
      logger.info(`     ACTIVIDAD: "${entry.ACTIVIDAD || ''}" (longitud: ${(entry.ACTIVIDAD || '').length})`);
      
      // Verificar longitudes
      if (entry.PROYECTO && entry.PROYECTO.length > 10) {
        logger.warn(`     ⚠️  PROYECTO excede 10 caracteres: ${entry.PROYECTO.length}`);
      }
      
      if (entry.ACTIVIDAD && entry.ACTIVIDAD.length > 3) {
        logger.warn(`     ⚠️  ACTIVIDAD excede 3 caracteres: ${entry.ACTIVIDAD.length}`);
      }
    });

    // Verificar consistencia
    logger.info('\n4. Verificación de consistencia:');
    const proyectos = [...new Set(carprodeData.map(entry => entry.PROYECTO || ''))];
    const actividades = [...new Set(carprodeData.map(entry => entry.ACTIVIDAD || ''))];
    
    logger.info(`   Proyectos únicos: ${proyectos.length === 1 ? '✅' : '❌'} (${proyectos.join(', ')})`);
    logger.info(`   Actividades únicas: ${actividades.length === 1 ? '✅' : '❌'} (${actividades.join(', ')})`);
    
    if (proyectos.length === 1 && actividades.length === 1) {
      logger.info('   ✅ Todos los registros tienen los mismos valores (correcto)');
    } else {
      logger.warn('   ⚠️  Los registros tienen valores diferentes (revisar)');
    }

    // Mostrar esquema de BD para referencia
    logger.info('\n5. Esquema de base de datos:');
    logger.info('   PROYECTO: CHAR(10) - máximo 10 caracteres');
    logger.info('   ACTIVIDAD: CHAR(3) - máximo 3 caracteres');

    // Casos de prueba con diferentes configuraciones
    logger.info('\n6. Casos de prueba sugeridos:');
    logger.info('   Caso 1 - Sin configuración:');
    logger.info('     DEFAULT_PROJECT_CODE=');
    logger.info('     DEFAULT_ACTIVITY_CODE=');
    logger.info('     Resultado: campos vacíos');
    
    logger.info('\n   Caso 2 - Configuración normal:');
    logger.info('     DEFAULT_PROJECT_CODE=PROJ001');
    logger.info('     DEFAULT_ACTIVITY_CODE=ACT');
    logger.info('     Resultado: PROYECTO="PROJ001", ACTIVIDAD="ACT"');
    
    logger.info('\n   Caso 3 - Configuración con truncamiento:');
    logger.info('     DEFAULT_PROJECT_CODE=PROYECTO_MUY_LARGO');
    logger.info('     DEFAULT_ACTIVITY_CODE=ACTIVIDAD');
    logger.info('     Resultado: PROYECTO="PROYECTO_M" (10 chars), ACTIVIDAD="ACT" (3 chars)');

    logger.info('\n=== PRUEBA COMPLETADA ===');
    
    // Sugerencias
    logger.info('\n💡 Para cambiar la configuración:');
    logger.info('   1. Editar archivo .env:');
    logger.info('      DEFAULT_PROJECT_CODE=tu_codigo_proyecto');
    logger.info('      DEFAULT_ACTIVITY_CODE=tu_codigo_actividad');
    logger.info('   2. Reiniciar el servicio');
    logger.info('   3. Ejecutar este script nuevamente para verificar');

  } catch (error) {
    logger.error('❌ Error durante la prueba:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testProjectActivity()
    .then(() => {
      logger.info('Prueba finalizada');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Error en prueba:', error);
      process.exit(1);
    });
}

module.exports = testProjectActivity;
