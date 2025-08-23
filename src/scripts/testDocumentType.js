const DataMapper = require('../services/dataMapper');
const logger = require('../utils/logger');

/**
 * Script para probar la configuración del tipo de documento
 */
async function testDocumentType() {
  try {
    logger.info('=== PRUEBA DE CONFIGURACIÓN DE TIPO DE DOCUMENTO ===');
    
    // Mostrar configuración actual
    logger.info(`\n1. Configuración actual:`);
    logger.info(`   DOCUMENT_TYPE: "${process.env.DOCUMENT_TYPE || 'FIA (por defecto)'}"`);
    
    // Crear instancia del DataMapper
    const dataMapper = new DataMapper();
    
    // Mostrar tipo de documento configurado
    const documentType = dataMapper.getDocumentType();
    logger.info(`   Tipo de documento activo: "${documentType}"`);
    
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

    // Probar mapeo de CARPROEN
    logger.info('\n2. Probando mapeo de CARPROEN...');
    const carproenData = dataMapper.mapToCarproen(mockInvoiceData, mockBatch);
    
    logger.info(`   TIPO en CARPROEN: "${carproenData.TIPO}" (debe ser "${documentType}")`);
    
    if (carproenData.TIPO === documentType) {
      logger.info('   ✅ TIPO correcto en CARPROEN');
    } else {
      logger.error('   ❌ TIPO incorrecto en CARPROEN');
    }

    // Probar mapeo de CARPRODE
    logger.info('\n3. Probando mapeo de CARPRODE...');
    const carprodeData = dataMapper.mapToCarprode(mockInvoiceData, mockBatch);
    
    logger.info(`\n4. Resultados del mapeo CARPRODE (${carprodeData.length} registros):`);
    
    let allTypesCorrect = true;
    let allCruceCorrect = true;
    
    carprodeData.forEach((entry, index) => {
      logger.info(`\n   Registro ${index + 1}:`);
      logger.info(`     ACCT: ${entry.ACCT}`);
      logger.info(`     DESCRIPCION: ${entry.DESCRIPCION}`);
      logger.info(`     TIPO: "${entry.TIPO}" (debe ser "${documentType}")`);
      logger.info(`     CRUCE: "${entry.CRUCE}" (debe ser "${documentType}")`);
      
      if (entry.TIPO !== documentType) {
        allTypesCorrect = false;
        logger.error(`     ❌ TIPO incorrecto en registro ${index + 1}`);
      }
      
      if (entry.CRUCE !== documentType) {
        allCruceCorrect = false;
        logger.error(`     ❌ CRUCE incorrecto en registro ${index + 1}`);
      }
    });

    // Verificar consistencia
    logger.info('\n5. Verificación de consistencia:');
    
    if (allTypesCorrect) {
      logger.info('   ✅ Todos los campos TIPO son correctos');
    } else {
      logger.error('   ❌ Algunos campos TIPO son incorrectos');
    }
    
    if (allCruceCorrect) {
      logger.info('   ✅ Todos los campos CRUCE son correctos');
    } else {
      logger.error('   ❌ Algunos campos CRUCE son incorrectos');
    }

    // Verificar tipos únicos
    const tipos = [...new Set(carprodeData.map(entry => entry.TIPO))];
    const cruces = [...new Set(carprodeData.map(entry => entry.CRUCE))];
    
    logger.info(`   Tipos únicos: ${tipos.length === 1 ? '✅' : '❌'} (${tipos.join(', ')})`);
    logger.info(`   Cruces únicos: ${cruces.length === 1 ? '✅' : '❌'} (${cruces.join(', ')})`);

    // Mostrar esquema de BD para referencia
    logger.info('\n6. Esquema de base de datos:');
    logger.info('   CARPROEN.TIPO: CHAR(3) - Tipo de documento');
    logger.info('   CARPRODE.TIPO: CHAR(3) - Tipo de documento');
    logger.info('   CARPRODE.CRUCE: CHAR(3) - Referencia cruzada (mismo que TIPO)');
    logger.info('   TIPDOC.CLASE: CHAR(3) - Clasificación del documento');

    // Casos de prueba sugeridos
    logger.info('\n7. Casos de prueba sugeridos:');
    logger.info('   Caso 1 - FIA (por defecto):');
    logger.info('     DOCUMENT_TYPE=FIA');
    logger.info('     Resultado: Facturas por pagar IA');
    
    logger.info('\n   Caso 2 - FAC (Facturas de venta):');
    logger.info('     DOCUMENT_TYPE=FAC');
    logger.info('     Resultado: Facturas de venta');
    
    logger.info('\n   Caso 3 - CXP (Cuentas por pagar):');
    logger.info('     DOCUMENT_TYPE=CXP');
    logger.info('     Resultado: Cuentas por pagar');
    
    logger.info('\n   Caso 4 - Tipo personalizado:');
    logger.info('     DOCUMENT_TYPE=MIS');
    logger.info('     Resultado: Documento tipo MIS');

    // Verificar longitud
    logger.info('\n8. Verificación de longitud:');
    if (documentType.length <= 3) {
      logger.info(`   ✅ Longitud correcta: ${documentType.length}/3 caracteres`);
    } else {
      logger.warn(`   ⚠️  Longitud excesiva: ${documentType.length}/3 caracteres (se truncará)`);
    }

    logger.info('\n=== PRUEBA COMPLETADA ===');
    
    // Sugerencias
    logger.info('\n💡 Para cambiar el tipo de documento:');
    logger.info('   1. Editar archivo .env:');
    logger.info('      DOCUMENT_TYPE=tu_tipo_documento');
    logger.info('   2. Reiniciar el servicio');
    logger.info('   3. El sistema creará automáticamente el tipo en TIPDOC si no existe');
    logger.info('   4. Ejecutar este script nuevamente para verificar');
    
    logger.info('\n⚠️  Importante:');
    logger.info('   - El tipo de documento debe tener máximo 3 caracteres');
    logger.info('   - Se creará automáticamente en TIPDOC si no existe');
    logger.info('   - Todos los documentos nuevos usarán este tipo');
    logger.info('   - Los documentos existentes no se modifican');

  } catch (error) {
    logger.error('❌ Error durante la prueba:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testDocumentType()
    .then(() => {
      logger.info('Prueba finalizada');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Error en prueba:', error);
      process.exit(1);
    });
}

module.exports = testDocumentType;
