const DataMapper = require('../services/dataMapper');
const logger = require('../utils/logger');

/**
 * Script para probar la configuración del campo INVC
 */
async function testInvcConfiguration() {
  try {
    logger.info('=== PRUEBA DE CONFIGURACIÓN DEL CAMPO INVC ===');
    
    // Datos de prueba simulando una factura de Supabase
    const mockInvoiceData = {
      invoice: {
        id: 123,
        invoice_number: 'FAC-2024-001',
        date: '2024-01-15', // Fecha que debe mantenerse exacta
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

    // Crear instancia del DataMapper
    const dataMapper = new DataMapper();
    
    // Mostrar configuración actual
    logger.info(`Configuración USE_INVOICE_NUMBER_FOR_INVC: ${process.env.USE_INVOICE_NUMBER_FOR_INVC || 'no definida (false por defecto)'}`);
    logger.info(`Configuración DEFAULT_PROJECT_CODE: ${process.env.DEFAULT_PROJECT_CODE || 'no definida'}`);
    logger.info(`Configuración DEFAULT_ACTIVITY_CODE: ${process.env.DEFAULT_ACTIVITY_CODE || 'no definida'}`);
    logger.info(`Configuración DOCUMENT_TYPE: ${process.env.DOCUMENT_TYPE || 'no definida (FIA por defecto)'}`);

    // Probar mapeo de CARPROEN
    logger.info('\n1. Probando mapeo de CARPROEN...');
    const carproenData = dataMapper.mapToCarproen(mockInvoiceData, mockBatch);
    logger.info('CARPROEN mapeado exitosamente');

    // Verificar fechas y tipo en CARPROEN
    logger.info(`   TIPO: ${carproenData.TIPO} (tipo de documento configurado)`);
    logger.info(`   FECHA: ${carproenData.FECHA?.toISOString().split('T')[0]} (debe ser ${mockInvoiceData.invoice.date})`);
    logger.info(`   DUEDATE: ${carproenData.DUEDATE?.toISOString().split('T')[0]} (debe ser ${mockInvoiceData.invoice.date})`);

    if (carproenData.FECHA?.toISOString().split('T')[0] === mockInvoiceData.invoice.date) {
      logger.info('   ✅ FECHA correcta en CARPROEN');
    } else {
      logger.warn('   ⚠️  FECHA incorrecta en CARPROEN');
    }

    if (carproenData.DUEDATE?.toISOString().split('T')[0] === mockInvoiceData.invoice.date) {
      logger.info('   ✅ DUEDATE correcta en CARPROEN');
    } else {
      logger.warn('   ⚠️  DUEDATE incorrecta en CARPROEN');
    }
    
    // Probar mapeo de CARPRODE
    logger.info('\n2. Probando mapeo de CARPRODE...');
    const carprodeData = dataMapper.mapToCarprode(mockInvoiceData, mockBatch);
    
    logger.info(`\n3. Resultados del mapeo CARPRODE (${carprodeData.length} registros):`);
    carprodeData.forEach((entry, index) => {
      logger.info(`   Registro ${index + 1}:`);
      logger.info(`     TIPO: ${entry.TIPO} (tipo de documento)`);
      logger.info(`     CRUCE: ${entry.CRUCE} (debe ser igual a TIPO)`);
      logger.info(`     BATCH: ${entry.BATCH}`);
      logger.info(`     INVC: ${entry.INVC} ← ${dataMapper.useInvoiceNumberForInvc ? 'invoice_number' : 'batch'}`);
      logger.info(`     ACCT: ${entry.ACCT}`);
      logger.info(`     DESCRIPCION: ${entry.DESCRIPCION}`);
      logger.info(`     DEBIT: ${entry.DEBIT}`);
      logger.info(`     CREDIT: ${entry.CREDIT}`);
      logger.info(`     FECHA: ${entry.FECHA?.toISOString().split('T')[0]} (fecha entrada)`);
      logger.info(`     DUEDATE: ${entry.DUEDATE?.toISOString().split('T')[0]} (debe ser ${mockInvoiceData.invoice.date})`);
      logger.info(`     PROYECTO: "${entry.PROYECTO || ''}" (${entry.PROYECTO ? 'configurado' : 'vacío'})`);
      logger.info(`     ACTIVIDAD: "${entry.ACTIVIDAD || ''}" (${entry.ACTIVIDAD ? 'configurado' : 'vacío'})`);

      // Verificar DUEDATE
      if (entry.DUEDATE?.toISOString().split('T')[0] === mockInvoiceData.invoice.date) {
        logger.info(`     ✅ DUEDATE correcta`);
      } else {
        logger.warn(`     ⚠️  DUEDATE incorrecta`);
      }

      // Verificar consistencia TIPO/CRUCE
      if (entry.TIPO === entry.CRUCE) {
        logger.info(`     ✅ TIPO y CRUCE consistentes`);
      } else {
        logger.warn(`     ⚠️  TIPO y CRUCE inconsistentes`);
      }
      logger.info('');
    });

    // Mostrar comparación de valores
    logger.info('4. Comparación de valores INVC:');
    logger.info(`   invoice_number: "${mockInvoiceData.invoice.invoice_number}"`);
    logger.info(`   batch: ${mockBatch}`);
    logger.info(`   INVC usado: "${carprodeData[0].INVC}"`);
    logger.info(`   Configuración activa: ${dataMapper.useInvoiceNumberForInvc ? 'invoice_number' : 'batch'}`);

    // Verificar que todos los registros tienen el mismo INVC
    const invcValues = carprodeData.map(entry => entry.INVC);
    const uniqueInvcValues = [...new Set(invcValues)];
    
    if (uniqueInvcValues.length === 1) {
      logger.info('✅ Todos los registros CARPRODE tienen el mismo valor INVC (correcto)');
    } else {
      logger.warn('⚠️  Los registros CARPRODE tienen diferentes valores INVC (revisar)');
      logger.warn('   Valores encontrados:', uniqueInvcValues);
    }

    logger.info('\n=== PRUEBA COMPLETADA ===');
    
    // Sugerencias para cambiar configuración
    logger.info('\n💡 Para cambiar la configuración:');
    if (dataMapper.useInvoiceNumberForInvc) {
      logger.info('   - Para usar batch/FIA: USE_INVOICE_NUMBER_FOR_INVC=false');
    } else {
      logger.info('   - Para usar invoice_number: USE_INVOICE_NUMBER_FOR_INVC=true');
    }
    logger.info('   - Reiniciar el servicio después del cambio');

  } catch (error) {
    logger.error('❌ Error durante la prueba:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testInvcConfiguration()
    .then(() => {
      logger.info('Prueba finalizada');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Error en prueba:', error);
      process.exit(1);
    });
}

module.exports = testInvcConfiguration;
