#!/usr/bin/env node

const ChartOfAccountsSyncService = require('../services/chartOfAccountsSyncService');
const FirebirdClient = require('../database/firebirdClient');
const logger = require('../utils/logger');

/**
 * Script para probar y diagnosticar la configuración de rangos de cuentas
 */

async function testAccountRanges() {
  const syncService = new ChartOfAccountsSyncService();
  const firebirdClient = new FirebirdClient();
  
  try {
    logger.info('=== DIAGNÓSTICO DE RANGOS DE CUENTAS ===');
    
    // Inicializar servicios
    await syncService.initialize();
    await firebirdClient.initialize();
    
    // Mostrar configuración actual
    const config = syncService.getConfig();
    logger.info('Configuración actual:', config);

    // Probar cada rango de inclusión individualmente
    if (config.accountRanges.length > 0) {
      logger.info('\n=== RANGOS DE INCLUSIÓN ===');
      for (const range of config.accountRanges) {
        logger.info(`\n--- Probando rango de inclusión: ${range.start} - ${range.end} ---`);

        const query = `
          SELECT COUNT(*) as total
          FROM ACCT
          WHERE ACCT >= ${range.start} AND ACCT <= ${range.end} AND ACTIVO = 'S'
        `;

        const result = await firebirdClient.query(query);
        logger.info(`Cuentas encontradas en rango: ${result[0].TOTAL}`);

        if (result[0].TOTAL > 0) {
          // Mostrar algunas cuentas de muestra
          const sampleQuery = `
            SELECT FIRST 5 ACCT, DESCRIPCION, NVEL, ACTIVO
            FROM ACCT
            WHERE ACCT >= ${range.start} AND ACCT <= ${range.end} AND ACTIVO = 'S'
            ORDER BY ACCT
          `;

          const samples = await firebirdClient.query(sampleQuery);
          logger.info('Muestra de cuentas:', samples.map(acc => ({
            ACCT: acc.ACCT,
            DESCRIPCION: acc.DESCRIPCION?.trim(),
            NVEL: acc.NVEL,
            ACTIVO: acc.ACTIVO
          })));
        }
      }
    }

    // Probar cada rango de exclusión individualmente
    if (config.accountExcludeRanges.length > 0) {
      logger.info('\n=== RANGOS DE EXCLUSIÓN ===');
      for (const range of config.accountExcludeRanges) {
        logger.info(`\n--- Probando rango de exclusión: ${range.start} - ${range.end} ---`);

        const query = `
          SELECT COUNT(*) as total
          FROM ACCT
          WHERE ACCT >= ${range.start} AND ACCT <= ${range.end} AND ACTIVO = 'S'
        `;

        const result = await firebirdClient.query(query);
        logger.info(`Cuentas que serán EXCLUIDAS en este rango: ${result[0].TOTAL}`);

        if (result[0].TOTAL > 0) {
          // Mostrar algunas cuentas que serán excluidas
          const sampleQuery = `
            SELECT FIRST 5 ACCT, DESCRIPCION, NVEL, ACTIVO
            FROM ACCT
            WHERE ACCT >= ${range.start} AND ACCT <= ${range.end} AND ACTIVO = 'S'
            ORDER BY ACCT
          `;

          const samples = await firebirdClient.query(sampleQuery);
          logger.info('Muestra de cuentas que serán EXCLUIDAS:', samples.map(acc => ({
            ACCT: acc.ACCT,
            DESCRIPCION: acc.DESCRIPCION?.trim(),
            NVEL: acc.NVEL,
            ACTIVO: acc.ACTIVO
          })));
        }
      }
    }
    
    // Probar la consulta completa que usa el servicio
    logger.info('\n--- Probando consulta completa del servicio ---');
    const whereConditions = syncService.buildWhereConditions();
    logger.info('Condiciones WHERE:', whereConditions);
    
    const fullQuery = `
      SELECT COUNT(*) as total
      FROM ACCT 
      WHERE ${whereConditions}
    `;
    
    const fullResult = await firebirdClient.query(fullQuery);
    logger.info(`Total de cuentas que coinciden con la configuración: ${fullResult[0].TOTAL}`);
    
    // Mostrar muestra de la consulta completa
    if (fullResult[0].TOTAL > 0) {
      const fullSampleQuery = `
        SELECT FIRST 10 ACCT, DESCRIPCION, NVEL, ACTIVO
        FROM ACCT 
        WHERE ${whereConditions}
        ORDER BY ACCT
      `;
      
      const fullSamples = await firebirdClient.query(fullSampleQuery);
      logger.info('Muestra de cuentas de la consulta completa:', fullSamples.map(acc => ({
        ACCT: acc.ACCT,
        DESCRIPCION: acc.DESCRIPCION?.trim(),
        NVEL: acc.NVEL,
        ACTIVO: acc.ACTIVO
      })));
    }
    
    logger.info('\n=== DIAGNÓSTICO COMPLETADO ===');
    
  } catch (error) {
    logger.error('Error en diagnóstico:', error);
  } finally {
    await syncService.close();
    await firebirdClient.close();
  }
}

// Ejecutar diagnóstico
testAccountRanges().catch(error => {
  logger.error('Error fatal en diagnóstico:', error);
  process.exit(1);
});
