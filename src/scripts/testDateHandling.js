const DataMapper = require('../services/dataMapper');
const logger = require('../utils/logger');

/**
 * Script para probar el manejo correcto de fechas
 */
async function testDateHandling() {
  try {
    logger.info('=== PRUEBA DE MANEJO DE FECHAS ===');
    
    const dataMapper = new DataMapper();
    
    // Casos de prueba con diferentes formatos de fecha
    const testCases = [
      {
        name: 'Fecha simple YYYY-MM-DD',
        date: '2024-01-15',
        expected: '2024-01-15'
      },
      {
        name: 'Fecha con hora ISO',
        date: '2024-01-15T10:30:00Z',
        expected: '2024-01-15'
      },
      {
        name: 'Fecha con hora local',
        date: '2024-01-15T10:30:00',
        expected: '2024-01-15'
      },
      {
        name: 'Fecha límite de mes',
        date: '2024-02-29', // Año bisiesto
        expected: '2024-02-29'
      },
      {
        name: 'Fecha de fin de año',
        date: '2023-12-31',
        expected: '2023-12-31'
      }
    ];

    logger.info('\n1. Probando función parseDate...');
    testCases.forEach((testCase, index) => {
      logger.info(`\n   Caso ${index + 1}: ${testCase.name}`);
      logger.info(`   Input: "${testCase.date}"`);
      
      const parsedDate = dataMapper.parseDate(testCase.date);
      const resultDate = parsedDate?.toISOString().split('T')[0];
      
      logger.info(`   Output: "${resultDate}"`);
      logger.info(`   Esperado: "${testCase.expected}"`);
      
      if (resultDate === testCase.expected) {
        logger.info(`   ✅ CORRECTO`);
      } else {
        logger.error(`   ❌ ERROR - Fecha incorrecta`);
      }
    });

    // Probar con datos de factura completos
    logger.info('\n2. Probando mapeo completo con fechas...');
    
    const mockInvoiceData = {
      invoice: {
        id: 123,
        invoice_number: 'FAC-2024-001',
        date: '2024-01-15', // Fecha crítica a verificar
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
          entry_date: '2024-01-15' // Misma fecha
        },
        {
          id: 2,
          account_code: '41351501',
          description: 'Ingresos por servicios',
          debit: 0,
          credit: 840336,
          entry_date: '2024-01-15' // Misma fecha
        }
      ]
    };

    const mockBatch = 12345;
    const expectedDate = '2024-01-15';

    // Probar CARPROEN
    logger.info('\n   2.1 Probando CARPROEN...');
    const carproenData = dataMapper.mapToCarproen(mockInvoiceData, mockBatch);
    
    const carproenFecha = carproenData.FECHA?.toISOString().split('T')[0];
    const carproenDuedate = carproenData.DUEDATE?.toISOString().split('T')[0];
    
    logger.info(`   FECHA: ${carproenFecha} (esperado: ${expectedDate})`);
    logger.info(`   DUEDATE: ${carproenDuedate} (esperado: ${expectedDate})`);
    
    if (carproenFecha === expectedDate && carproenDuedate === expectedDate) {
      logger.info('   ✅ CARPROEN fechas correctas');
    } else {
      logger.error('   ❌ CARPROEN fechas incorrectas');
    }

    // Probar CARPRODE
    logger.info('\n   2.2 Probando CARPRODE...');
    const carprodeData = dataMapper.mapToCarprode(mockInvoiceData, mockBatch);
    
    let carprodeOk = true;
    carprodeData.forEach((entry, index) => {
      const entryFecha = entry.FECHA?.toISOString().split('T')[0];
      const entryDuedate = entry.DUEDATE?.toISOString().split('T')[0];
      
      logger.info(`   Registro ${index + 1}:`);
      logger.info(`     FECHA: ${entryFecha} (esperado: ${expectedDate})`);
      logger.info(`     DUEDATE: ${entryDuedate} (esperado: ${expectedDate})`);
      
      if (entryFecha !== expectedDate || entryDuedate !== expectedDate) {
        carprodeOk = false;
        logger.error(`     ❌ Fechas incorrectas en registro ${index + 1}`);
      } else {
        logger.info(`     ✅ Fechas correctas en registro ${index + 1}`);
      }
    });

    if (carprodeOk) {
      logger.info('   ✅ CARPRODE fechas correctas');
    } else {
      logger.error('   ❌ CARPRODE fechas incorrectas');
    }

    // Probar casos extremos
    logger.info('\n3. Probando casos extremos...');
    
    const extremeCases = [
      { date: null, name: 'Fecha null' },
      { date: '', name: 'Fecha vacía' },
      { date: 'invalid-date', name: 'Fecha inválida' },
      { date: '2024-13-01', name: 'Mes inválido' },
      { date: '2024-02-30', name: 'Día inválido' }
    ];

    extremeCases.forEach((testCase) => {
      logger.info(`\n   ${testCase.name}: "${testCase.date}"`);
      const result = dataMapper.parseDate(testCase.date);
      logger.info(`   Resultado: ${result ? result.toISOString().split('T')[0] : 'null'}`);
      
      if (result === null) {
        logger.info('   ✅ Manejo correcto de fecha inválida');
      } else {
        logger.warn('   ⚠️  Fecha inválida no detectada correctamente');
      }
    });

    logger.info('\n=== PRUEBA COMPLETADA ===');
    logger.info('\n💡 Puntos importantes:');
    logger.info('   - FECHA en CARPROEN debe ser exactamente la fecha de la factura');
    logger.info('   - DUEDATE en CARPROEN debe ser exactamente la fecha de la factura');
    logger.info('   - FECHA en CARPRODE puede ser la fecha de la entrada contable');
    logger.info('   - DUEDATE en CARPRODE debe ser exactamente la fecha de la factura');
    logger.info('   - No debe haber cambios de zona horaria que alteren el día');

  } catch (error) {
    logger.error('❌ Error durante la prueba:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testDateHandling()
    .then(() => {
      logger.info('Prueba finalizada');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Error en prueba:', error);
      process.exit(1);
    });
}

module.exports = testDateHandling;
