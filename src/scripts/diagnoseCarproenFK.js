/**
 * Script de diagnóstico para el error de FK en CARPROEN
 * 
 * Este script verifica:
 * 1. Que el tercero existe en CUST
 * 2. Que el ID_N se extrae correctamente
 * 3. Que la FK de CARPROEN está configurada correctamente
 * 
 * Uso:
 *   node src/scripts/diagnoseCarproenFK.js <NIT>
 * 
 * Ejemplo:
 *   node src/scripts/diagnoseCarproenFK.js "890399003-4"
 */

const logger = require('../utils/logger');
const FirebirdClient = require('../database/firebirdClient');
const DataMapper = require('../services/dataMapper');

async function diagnoseCarproenFK() {
  logger.info('='.repeat(80));
  logger.info('DIAGNÓSTICO DE FK CARPROEN → CUST');
  logger.info('='.repeat(80));

  const nit = process.argv[2];

  if (!nit) {
    logger.error('❌ Debe proporcionar un NIT como argumento');
    logger.info('Uso: node src/scripts/diagnoseCarproenFK.js <NIT>');
    logger.info('Ejemplo: node src/scripts/diagnoseCarproenFK.js "890399003-4"');
    process.exit(1);
  }

  try {
    const firebirdClient = new FirebirdClient();
    await firebirdClient.connect();
    logger.info(`✓ Conectado a Firebird`);

    const dataMapper = new DataMapper();

    // 1. Extraer ID_N usando el mismo método que usa el sistema
    logger.info(`\n1. Extrayendo ID_N del NIT: "${nit}"`);
    const extractedIdN = dataMapper.extractIdN(nit);
    logger.info(`   ID_N extraído: "${extractedIdN}"`);
    logger.info(`   Longitud: ${extractedIdN.length} caracteres`);

    // 2. Buscar el tercero en CUST
    logger.info(`\n2. Buscando tercero en CUST con ID_N="${extractedIdN}"...`);
    const custResult = await firebirdClient.query(
      'SELECT ID_N, NIT, COMPANY FROM CUST WHERE ID_N = ?',
      [extractedIdN]
    );

    if (custResult.length === 0) {
      logger.error(`   ❌ Tercero NO encontrado en CUST con ID_N="${extractedIdN}"`);
      
      // Buscar con variaciones
      logger.info(`\n   Buscando con variaciones...`);
      
      // Buscar por NIT completo
      const custByNit = await firebirdClient.query(
        'SELECT ID_N, NIT, COMPANY FROM CUST WHERE NIT = ?',
        [nit]
      );
      
      if (custByNit.length > 0) {
        logger.warn(`   ⚠️ Encontrado por NIT completo:`);
        logger.info(`      ID_N en CUST: "${custByNit[0].ID_N}"`);
        logger.info(`      NIT en CUST: "${custByNit[0].NIT}"`);
        logger.info(`      COMPANY: "${custByNit[0].COMPANY}"`);
        logger.warn(`   ⚠️ PROBLEMA: El ID_N extraído (${extractedIdN}) NO coincide con el ID_N en CUST (${custByNit[0].ID_N})`);
      } else {
        logger.error(`   ❌ Tercero NO existe en CUST (ni por ID_N ni por NIT)`);
        logger.info(`\n   El tercero debe ser creado antes de insertar en CARPROEN`);
      }
    } else {
      logger.info(`   ✅ Tercero encontrado en CUST:`);
      logger.info(`      ID_N: "${custResult[0].ID_N}"`);
      logger.info(`      NIT: "${custResult[0].NIT}"`);
      logger.info(`      COMPANY: "${custResult[0].COMPANY}"`);
    }

    // 3. Verificar la FK de CARPROEN
    logger.info(`\n3. Verificando constraint FK_CARPROEN_CUST...`);
    const fkInfo = await firebirdClient.query(`
      SELECT 
        RC.RDB$CONSTRAINT_NAME,
        RC.RDB$CONSTRAINT_TYPE,
        RC.RDB$RELATION_NAME,
        I.RDB$FIELD_NAME,
        RC2.RDB$RELATION_NAME AS REFERENCED_TABLE
      FROM RDB$RELATION_CONSTRAINTS RC
      LEFT JOIN RDB$INDEX_SEGMENTS I ON RC.RDB$INDEX_NAME = I.RDB$INDEX_NAME
      LEFT JOIN RDB$REF_CONSTRAINTS REF ON RC.RDB$CONSTRAINT_NAME = REF.RDB$CONSTRAINT_NAME
      LEFT JOIN RDB$RELATION_CONSTRAINTS RC2 ON REF.RDB$CONST_NAME_UQ = RC2.RDB$CONSTRAINT_NAME
      WHERE RC.RDB$CONSTRAINT_NAME = 'FK_CARPROEN_CUST'
    `);

    if (fkInfo.length === 0) {
      logger.warn(`   ⚠️ Constraint FK_CARPROEN_CUST NO encontrado`);
    } else {
      logger.info(`   ✅ Constraint encontrado:`);
      fkInfo.forEach(fk => {
        logger.info(`      Tabla: ${fk.RDB$RELATION_NAME?.trim()}`);
        logger.info(`      Campo: ${fk.RDB$FIELD_NAME?.trim()}`);
        logger.info(`      Referencia: ${fk.REFERENCED_TABLE?.trim()}`);
      });
    }

    // 4. Verificar si hay registros en CARPROEN con este ID_N
    logger.info(`\n4. Verificando registros en CARPROEN con ID_N="${extractedIdN}"...`);
    const carproenResult = await firebirdClient.query(
      'SELECT BATCH, TIPO, ID_N, FECHA FROM CARPROEN WHERE ID_N = ?',
      [extractedIdN]
    );

    if (carproenResult.length === 0) {
      logger.info(`   ✓ No hay registros en CARPROEN con este ID_N (correcto para nueva inserción)`);
    } else {
      logger.info(`   ℹ️ Registros existentes en CARPROEN: ${carproenResult.length}`);
      carproenResult.slice(0, 3).forEach((rec, i) => {
        logger.info(`      ${i + 1}. BATCH=${rec.BATCH}, TIPO="${rec.TIPO}", FECHA=${rec.FECHA}`);
      });
    }

    await firebirdClient.close();

    logger.info('\n' + '='.repeat(80));
    logger.info('DIAGNÓSTICO COMPLETADO');
    logger.info('='.repeat(80));

  } catch (error) {
    logger.error('❌ Error en diagnóstico:', error);
    process.exit(1);
  }
}

// Ejecutar diagnóstico
diagnoseCarproenFK().catch(error => {
  logger.error('Error fatal:', error);
  process.exit(1);
});

