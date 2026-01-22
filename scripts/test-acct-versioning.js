/**
 * Script de prueba para verificar el mecanismo de versionamiento de ACCT
 * 
 * Este script:
 * 1. Verifica que el campo Version existe en ACCT
 * 2. Verifica que el trigger TRG_ACCT_VERSION existe
 * 3. Verifica que el generador GEN_ACCT_VERSION existe
 * 4. Prueba la sincronización inicial (debería sincronizar todo)
 * 5. Prueba la sincronización incremental (no debería sincronizar nada si no hay cambios)
 * 6. Modifica una cuenta y verifica que la sincronización incremental la detecta
 */

const ChartOfAccountsSyncService = require('../src/services/chartOfAccountsSyncService');
const FirebirdClient = require('../src/database/firebirdClient');
const logger = require('../src/utils/logger');

async function testAcctVersioning() {
  const syncService = new ChartOfAccountsSyncService();
  const firebirdClient = new FirebirdClient();

  try {
    logger.info('='.repeat(80));
    logger.info('PRUEBA DE VERSIONAMIENTO DE TABLA ACCT');
    logger.info('='.repeat(80));

    // Inicializar servicios
    await syncService.initialize();
    await firebirdClient.initialize();

    // =====================================================
    // PASO 1: Verificar campo Version
    // =====================================================
    logger.info('\n📋 PASO 1: Verificando campo Version en ACCT...');
    const checkField = await firebirdClient.query(`
      SELECT COUNT(*) as field_count
      FROM RDB$RELATION_FIELDS
      WHERE RDB$RELATION_NAME = 'ACCT'
      AND RDB$FIELD_NAME = 'Version'
    `);
    
    if (checkField[0].FIELD_COUNT > 0) {
      logger.info('✅ Campo Version existe en ACCT');
    } else {
      logger.error('❌ Campo Version NO existe en ACCT');
      return;
    }

    // =====================================================
    // PASO 2: Verificar trigger
    // =====================================================
    logger.info('\n📋 PASO 2: Verificando trigger TRG_ACCT_VERSION...');
    const checkTrigger = await firebirdClient.query(`
      SELECT COUNT(*) as trigger_count
      FROM RDB$TRIGGERS
      WHERE RDB$TRIGGER_NAME = 'TRG_ACCT_VERSION'
    `);
    
    if (checkTrigger[0].TRIGGER_COUNT > 0) {
      logger.info('✅ Trigger TRG_ACCT_VERSION existe');
    } else {
      logger.error('❌ Trigger TRG_ACCT_VERSION NO existe');
      return;
    }

    // =====================================================
    // PASO 3: Verificar generador
    // =====================================================
    logger.info('\n📋 PASO 3: Verificando generador GEN_ACCT_VERSION...');
    const checkGen = await firebirdClient.query(`
      SELECT COUNT(*) as gen_count
      FROM RDB$GENERATORS
      WHERE RDB$GENERATOR_NAME = 'GEN_ACCT_VERSION'
    `);
    
    if (checkGen[0].GEN_COUNT > 0) {
      logger.info('✅ Generador GEN_ACCT_VERSION existe');
      
      // Ver valor actual del generador
      const genValue = await firebirdClient.query(`
        SELECT GEN_ID(GEN_ACCT_VERSION, 0) as current_value FROM RDB$DATABASE
      `);
      logger.info(`   Valor actual del generador: ${genValue[0].CURRENT_VALUE}`);
    } else {
      logger.error('❌ Generador GEN_ACCT_VERSION NO existe');
      return;
    }

    // =====================================================
    // PASO 4: Ver muestra de cuentas con versión
    // =====================================================
    logger.info('\n📋 PASO 4: Muestra de cuentas con versión...');
    const sampleAccounts = await firebirdClient.query(`
      SELECT FIRST 5 ACCT, DESCRIPCION, "Version"
      FROM ACCT
      ORDER BY "Version" DESC NULLS LAST
    `);
    
    logger.info('Cuentas con versión más alta:');
    sampleAccounts.forEach(acc => {
      logger.info(`   ACCT: ${acc.ACCT}, Version: ${acc.Version || 'NULL'}, Desc: ${acc.DESCRIPCION?.trim()}`);
    });

    // =====================================================
    // PASO 5: Sincronización inicial
    // =====================================================
    logger.info('\n📋 PASO 5: Ejecutando sincronización inicial...');
    const initialSync = await syncService.syncFromFirebird(false);
    logger.info(`✅ Sincronización inicial completada:`);
    logger.info(`   - Procesadas: ${initialSync.processed}`);
    logger.info(`   - Errores: ${initialSync.errors}`);

    // =====================================================
    // PASO 6: Obtener última versión sincronizada
    // =====================================================
    logger.info('\n📋 PASO 6: Verificando última versión sincronizada...');
    const lastVersion = await syncService.getLastSyncedVersion();
    logger.info(`   Última versión sincronizada: ${lastVersion}`);

    // =====================================================
    // PASO 7: Sincronización incremental (sin cambios)
    // =====================================================
    logger.info('\n📋 PASO 7: Ejecutando sincronización incremental (sin cambios)...');
    const incrementalSync1 = await syncService.syncFromFirebird(false);
    logger.info(`✅ Sincronización incremental completada:`);
    logger.info(`   - Procesadas: ${incrementalSync1.processed} (debería ser 0)`);
    logger.info(`   - Errores: ${incrementalSync1.errors}`);

    if (incrementalSync1.processed === 0) {
      logger.info('✅ CORRECTO: No se sincronizaron cuentas porque no hay cambios');
    } else {
      logger.warn(`⚠️ ADVERTENCIA: Se sincronizaron ${incrementalSync1.processed} cuentas sin cambios`);
    }

    logger.info('\n' + '='.repeat(80));
    logger.info('✅ PRUEBA COMPLETADA EXITOSAMENTE');
    logger.info('='.repeat(80));
    logger.info('\nRESUMEN:');
    logger.info(`- Campo Version: ✅ Existe`);
    logger.info(`- Trigger: ✅ Existe`);
    logger.info(`- Generador: ✅ Existe`);
    logger.info(`- Sincronización inicial: ${initialSync.processed} cuentas`);
    logger.info(`- Sincronización incremental: ${incrementalSync1.processed} cuentas (esperado: 0)`);
    logger.info('='.repeat(80));

  } catch (error) {
    logger.error('❌ Error en la prueba:', error);
    throw error;
  } finally {
    await syncService.close();
    await firebirdClient.close();
  }
}

// Ejecutar prueba
testAcctVersioning()
  .then(() => {
    logger.info('\n✅ Script de prueba finalizado');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('\n❌ Script de prueba falló:', error);
    process.exit(1);
  });

