/**
 * Script de diagnóstico para verificar el mecanismo de versionamiento en ACCT
 * 
 * Este script verifica:
 * 1. Si el campo Version existe en ACCT
 * 2. Si el generador GEN_ACCT_VERSION existe
 * 3. Si el trigger TRG_ACCT_VERSION existe
 * 4. Si el procedimiento SP_INITIALIZE_ACCT_VERSIONS existe
 * 5. Muestra registros de ACCT con y sin Version
 * 
 * USO:
 *   node scripts/diagnose-acct-versioning.js
 */

require('dotenv').config();
const FirebirdClient = require('../src/database/firebirdClient');

const logger = {
  info: (msg) => console.log(`✅ ${msg}`),
  warn: (msg) => console.log(`⚠️  ${msg}`),
  error: (msg) => console.log(`❌ ${msg}`),
  debug: (msg) => console.log(`🔍 ${msg}`)
};

async function diagnoseVersioning() {
  const firebirdClient = new FirebirdClient();

  try {
    logger.info('=== DIAGNÓSTICO DE VERSIONAMIENTO EN ACCT ===\n');

    await firebirdClient.initialize();

    // ========================================
    // 1. Verificar campo Version
    // ========================================
    logger.info('1. Verificando campo Version en ACCT...');
    
    const checkFieldQuery = `
      SELECT RDB$FIELD_NAME
      FROM RDB$RELATION_FIELDS
      WHERE RDB$RELATION_NAME = 'ACCT'
      AND TRIM(RDB$FIELD_NAME) LIKE '%ersion%'
    `;

    const fields = await firebirdClient.query(checkFieldQuery);
    
    if (fields.length > 0) {
      logger.info('Campos encontrados que contienen "ersion":');
      fields.forEach(field => {
        const fieldName = field.RDB$FIELD_NAME.trim();
        logger.info(`  - "${fieldName}"`);
      });
    } else {
      logger.warn('No se encontró ningún campo con "ersion" en ACCT');
    }

    // Verificar específicamente "Version" con comillas
    const checkVersionQuery = `
      SELECT COUNT(*) as field_count
      FROM RDB$RELATION_FIELDS
      WHERE RDB$RELATION_NAME = 'ACCT'
      AND RDB$FIELD_NAME = 'Version'
    `;

    const versionCheck = await firebirdClient.query(checkVersionQuery);
    const versionExists = versionCheck[0].FIELD_COUNT > 0;

    if (versionExists) {
      logger.info('✅ Campo "Version" (con comillas) existe en ACCT');
    } else {
      logger.error('❌ Campo "Version" NO existe en ACCT');
    }

    // ========================================
    // 2. Verificar generador
    // ========================================
    logger.info('\n2. Verificando generador GEN_ACCT_VERSION...');
    
    const checkGenQuery = `
      SELECT RDB$GENERATOR_NAME, RDB$GENERATOR_ID
      FROM RDB$GENERATORS
      WHERE RDB$GENERATOR_NAME = 'GEN_ACCT_VERSION'
    `;

    const generators = await firebirdClient.query(checkGenQuery);
    
    if (generators.length > 0) {
      logger.info('✅ Generador GEN_ACCT_VERSION existe');
      
      // Obtener valor actual del generador
      const genValueQuery = `SELECT GEN_ID(GEN_ACCT_VERSION, 0) as current_value FROM RDB$DATABASE`;
      const genValue = await firebirdClient.query(genValueQuery);
      logger.info(`   Valor actual: ${genValue[0].CURRENT_VALUE}`);
    } else {
      logger.error('❌ Generador GEN_ACCT_VERSION NO existe');
    }

    // ========================================
    // 3. Verificar trigger
    // ========================================
    logger.info('\n3. Verificando trigger TRG_ACCT_VERSION...');
    
    const checkTriggerQuery = `
      SELECT RDB$TRIGGER_NAME, RDB$TRIGGER_TYPE, RDB$TRIGGER_INACTIVE
      FROM RDB$TRIGGERS
      WHERE RDB$TRIGGER_NAME = 'TRG_ACCT_VERSION'
    `;

    const triggers = await firebirdClient.query(checkTriggerQuery);
    
    if (triggers.length > 0) {
      const trigger = triggers[0];
      const isActive = trigger.RDB$TRIGGER_INACTIVE === 0;
      logger.info(`✅ Trigger TRG_ACCT_VERSION existe`);
      logger.info(`   Estado: ${isActive ? 'ACTIVO' : 'INACTIVO'}`);
      logger.info(`   Tipo: ${trigger.RDB$TRIGGER_TYPE}`);
    } else {
      logger.error('❌ Trigger TRG_ACCT_VERSION NO existe');
    }

    // ========================================
    // 4. Verificar procedimiento
    // ========================================
    logger.info('\n4. Verificando procedimiento SP_INITIALIZE_ACCT_VERSIONS...');
    
    const checkProcQuery = `
      SELECT RDB$PROCEDURE_NAME
      FROM RDB$PROCEDURES
      WHERE RDB$PROCEDURE_NAME = 'SP_INITIALIZE_ACCT_VERSIONS'
    `;

    const procedures = await firebirdClient.query(checkProcQuery);
    
    if (procedures.length > 0) {
      logger.info('✅ Procedimiento SP_INITIALIZE_ACCT_VERSIONS existe');
    } else {
      logger.error('❌ Procedimiento SP_INITIALIZE_ACCT_VERSIONS NO existe');
    }

    // ========================================
    // 5. Verificar registros en ACCT
    // ========================================
    logger.info('\n5. Verificando registros en ACCT...');
    
    // Contar total de registros
    const totalQuery = `SELECT COUNT(*) as total FROM ACCT`;
    const total = await firebirdClient.query(totalQuery);
    logger.info(`Total de cuentas en ACCT: ${total[0].TOTAL}`);

    // Intentar consultar con "Version" (con comillas)
    try {
      const withVersionQuery = `
        SELECT COUNT(*) as count_with_version
        FROM ACCT
        WHERE "Version" IS NOT NULL
      `;
      const withVersion = await firebirdClient.query(withVersionQuery);
      logger.info(`Cuentas con Version asignado: ${withVersion[0].COUNT_WITH_VERSION}`);

      const withoutVersionQuery = `
        SELECT COUNT(*) as count_without_version
        FROM ACCT
        WHERE "Version" IS NULL
      `;
      const withoutVersion = await firebirdClient.query(withoutVersionQuery);
      logger.info(`Cuentas sin Version: ${withoutVersion[0].COUNT_WITHOUT_VERSION}`);

      // Mostrar muestra de registros
      const sampleQuery = `
        SELECT FIRST 5 ACCT, DESCRIPCION, "Version"
        FROM ACCT
        ORDER BY ACCT
      `;
      const sample = await firebirdClient.query(sampleQuery);
      
      if (sample.length > 0) {
        logger.info('\nMuestra de registros:');
        sample.forEach(record => {
          logger.info(`  ACCT: ${record.ACCT}, Version: ${record.Version || 'NULL'}, Desc: ${record.DESCRIPCION}`);
        });
      }
    } catch (error) {
      logger.error(`Error consultando campo Version: ${error.message}`);
      logger.warn('Esto confirma que el campo Version NO existe en ACCT');
    }

    // ========================================
    // RESUMEN
    // ========================================
    logger.info('\n=== RESUMEN ===');
    logger.info(`Campo "Version": ${versionExists ? '✅ EXISTE' : '❌ NO EXISTE'}`);
    logger.info(`Generador GEN_ACCT_VERSION: ${generators.length > 0 ? '✅ EXISTE' : '❌ NO EXISTE'}`);
    logger.info(`Trigger TRG_ACCT_VERSION: ${triggers.length > 0 ? '✅ EXISTE' : '❌ NO EXISTE'}`);
    logger.info(`Procedimiento SP_INITIALIZE_ACCT_VERSIONS: ${procedures.length > 0 ? '✅ EXISTE' : '❌ NO EXISTE'}`);

    if (!versionExists) {
      logger.warn('\n⚠️  EL MECANISMO DE VERSIONAMIENTO NO SE CREÓ AUTOMÁTICAMENTE');
      logger.info('\nPosibles causas:');
      logger.info('1. El servicio no se ha iniciado aún');
      logger.info('2. Hubo un error al crear el mecanismo (revisar logs del servicio)');
      logger.info('3. El usuario de Firebird no tiene permisos para ALTER TABLE');
      logger.info('\nSolución:');
      logger.info('Ejecutar manualmente: database/migrations/add_acct_versioning.sql');
    }

  } catch (error) {
    logger.error(`Error en diagnóstico: ${error.message}`);
    console.error(error);
  } finally {
    await firebirdClient.close();
    process.exit(0);
  }
}

// Ejecutar diagnóstico
diagnoseVersioning();

