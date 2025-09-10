const ChartOfAccountsSyncService = require('../services/chartOfAccountsSyncService');
const FirebirdClient = require('../database/firebirdClient');
const logger = require('../utils/logger');

/**
 * Script para probar la funcionalidad de exclusión de rangos de cuentas
 */
async function testAccountExclusion() {
  const syncService = new ChartOfAccountsSyncService();
  const firebirdClient = new FirebirdClient();
  
  try {
    logger.info('=== PRUEBA DE EXCLUSIÓN DE RANGOS DE CUENTAS ===');
    
    // Inicializar servicios
    await syncService.initialize();
    await firebirdClient.initialize();
    
    // Mostrar configuración actual
    const config = syncService.getConfig();
    logger.info('\n1. Configuración actual:');
    logger.info(`   Rangos de inclusión: ${JSON.stringify(config.accountRanges)}`);
    logger.info(`   Rangos de exclusión: ${JSON.stringify(config.accountExcludeRanges)}`);
    logger.info(`   Solo cuentas activas: ${config.onlyActiveAccounts}`);
    logger.info(`   Excluir nivel cero: ${config.excludeZeroLevel}`);
    
    // Mostrar variables de entorno
    logger.info('\n2. Variables de entorno:');
    logger.info(`   ACCOUNT_SYNC_RANGES: ${process.env.ACCOUNT_SYNC_RANGES || 'NO CONFIGURADO'}`);
    logger.info(`   ACCOUNT_EXCLUDE_RANGES: ${process.env.ACCOUNT_EXCLUDE_RANGES || 'NO CONFIGURADO'}`);
    
    // Construir y mostrar la consulta WHERE
    logger.info('\n3. Consulta WHERE generada:');
    const whereConditions = syncService.buildWhereConditions();
    logger.info(`   ${whereConditions}`);
    
    // Probar la consulta completa
    logger.info('\n4. Probando consulta completa...');
    const fullQuery = `
      SELECT COUNT(*) as total
      FROM ACCT 
      WHERE ${whereConditions}
    `;
    
    const fullResult = await firebirdClient.query(fullQuery);
    logger.info(`   Total de cuentas que coinciden: ${fullResult[0].TOTAL}`);
    
    // Mostrar muestra de cuentas que coinciden
    if (fullResult[0].TOTAL > 0) {
      const sampleQuery = `
        SELECT FIRST 10 ACCT, DESCRIPCION, NVEL, ACTIVO
        FROM ACCT 
        WHERE ${whereConditions}
        ORDER BY ACCT
      `;
      
      const samples = await firebirdClient.query(sampleQuery);
      logger.info('\n5. Muestra de cuentas que SÍ se sincronizarán:');
      samples.forEach((acc, index) => {
        logger.info(`   ${index + 1}. ${acc.ACCT} - ${acc.DESCRIPCION?.trim()} (Nivel: ${acc.NVEL}, Activo: ${acc.ACTIVO})`);
      });
    }
    
    // Si hay rangos de exclusión, mostrar qué cuentas se están excluyendo
    if (config.accountExcludeRanges.length > 0) {
      logger.info('\n6. Análisis de exclusiones:');
      
      for (const excludeRange of config.accountExcludeRanges) {
        logger.info(`\n   Rango de exclusión: ${excludeRange.start} - ${excludeRange.end}`);
        
        // Contar cuentas en el rango de exclusión
        const excludeQuery = `
          SELECT COUNT(*) as total
          FROM ACCT 
          WHERE ACCT >= ${excludeRange.start} AND ACCT <= ${excludeRange.end}
          ${config.onlyActiveAccounts ? "AND ACTIVO = 'S'" : ''}
        `;
        
        const excludeResult = await firebirdClient.query(excludeQuery);
        logger.info(`   Cuentas excluidas en este rango: ${excludeResult[0].TOTAL}`);
        
        if (excludeResult[0].TOTAL > 0) {
          // Mostrar muestra de cuentas excluidas
          const excludeSampleQuery = `
            SELECT FIRST 5 ACCT, DESCRIPCION, NVEL, ACTIVO
            FROM ACCT 
            WHERE ACCT >= ${excludeRange.start} AND ACCT <= ${excludeRange.end}
            ${config.onlyActiveAccounts ? "AND ACTIVO = 'S'" : ''}
            ORDER BY ACCT
          `;
          
          const excludeSamples = await firebirdClient.query(excludeSampleQuery);
          logger.info('   Muestra de cuentas EXCLUIDAS:');
          excludeSamples.forEach((acc, index) => {
            logger.info(`     ${index + 1}. ${acc.ACCT} - ${acc.DESCRIPCION?.trim()} (Nivel: ${acc.NVEL}, Activo: ${acc.ACTIVO})`);
          });
        }
      }
    }
    
    // Comparación con y sin exclusiones
    if (config.accountExcludeRanges.length > 0) {
      logger.info('\n7. Comparación con y sin exclusiones:');
      
      // Consulta sin exclusiones (solo rangos de inclusión)
      let conditionsWithoutExclusion = [];
      
      if (config.accountRanges.length > 0) {
        const rangeConditions = config.accountRanges.map(range =>
          `(ACCT >= ${range.start} AND ACCT <= ${range.end})`
        );
        conditionsWithoutExclusion.push(`(${rangeConditions.join(' OR ')})`);
      }
      
      if (config.onlyActiveAccounts) {
        conditionsWithoutExclusion.push("ACTIVO = 'S'");
      }
      
      if (config.excludeZeroLevel) {
        conditionsWithoutExclusion.push('(NVEL IS NULL OR NVEL >= 0)');
      }
      
      const whereWithoutExclusion = conditionsWithoutExclusion.length > 0 ? 
        conditionsWithoutExclusion.join(' AND ') : '1=1';
      
      const queryWithoutExclusion = `
        SELECT COUNT(*) as total
        FROM ACCT 
        WHERE ${whereWithoutExclusion}
      `;
      
      const resultWithoutExclusion = await firebirdClient.query(queryWithoutExclusion);
      
      logger.info(`   Sin exclusiones: ${resultWithoutExclusion[0].TOTAL} cuentas`);
      logger.info(`   Con exclusiones: ${fullResult[0].TOTAL} cuentas`);
      logger.info(`   Cuentas excluidas: ${resultWithoutExclusion[0].TOTAL - fullResult[0].TOTAL}`);
    }
    
    logger.info('\n=== PRUEBA COMPLETADA ===');
    
    // Sugerencias de configuración
    logger.info('\n💡 EJEMPLOS DE CONFIGURACIÓN:');
    logger.info('   # Excluir cuentas específicas:');
    logger.info('   ACCOUNT_EXCLUDE_RANGES=53159502-53159502,53959501-53959501');
    logger.info('');
    logger.info('   # Excluir rangos completos:');
    logger.info('   ACCOUNT_EXCLUDE_RANGES=60000000-69999999,80000000-89999999');
    logger.info('');
    logger.info('   # Mezcla de cuentas individuales y rangos:');
    logger.info('   ACCOUNT_EXCLUDE_RANGES=12345678-12345678,50000000-59999999');
    logger.info('');
    logger.info('   # Para no excluir nada (por defecto):');
    logger.info('   ACCOUNT_EXCLUDE_RANGES=');
    
  } catch (error) {
    logger.error('Error en prueba de exclusión:', error);
  } finally {
    await syncService.close();
    await firebirdClient.close();
  }
}

// Ejecutar prueba
if (require.main === module) {
  testAccountExclusion()
    .then(() => {
      logger.info('Prueba finalizada');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Error en prueba:', error);
      process.exit(1);
    });
}

module.exports = testAccountExclusion;
