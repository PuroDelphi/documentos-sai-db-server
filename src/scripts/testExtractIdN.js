/**
 * Script de prueba para verificar la función extractIdN
 */

const DataMapper = require('../services/dataMapper');
const logger = require('../utils/logger');

function testExtractIdN() {
  logger.info('='.repeat(80));
  logger.info('PRUEBA: Función extractIdN');
  logger.info('='.repeat(80));

  const dataMapper = new DataMapper();

  const testCases = [
    { input: '888777666-5', expected: '888777666', description: 'NIT con guión y DV' },
    { input: '888777666', expected: '888777666', description: 'NIT sin guión' },
    { input: '14676263-8', expected: '14676263', description: 'NIT persona natural con guión' },
    { input: '14676263', expected: '14676263', description: 'NIT persona natural sin guión' },
    { input: '900123456-7', expected: '900123456', description: 'NIT empresa con guión' },
    { input: '900123456', expected: '900123456', description: 'NIT empresa sin guión' },
    { input: '', expected: '', description: 'String vacío' },
    { input: null, expected: '', description: 'Null' },
    { input: undefined, expected: '', description: 'Undefined' },
    { input: '123-456-789', expected: '123', description: 'Múltiples guiones (toma solo antes del primer guión)' },
  ];

  let passed = 0;
  let failed = 0;

  logger.info('\nEjecutando casos de prueba:\n');

  for (const testCase of testCases) {
    const result = dataMapper.extractIdN(testCase.input);
    const success = result === testCase.expected;

    if (success) {
      logger.info(`✅ PASS: ${testCase.description}`);
      logger.info(`   Input: "${testCase.input}" -> Output: "${result}"`);
      passed++;
    } else {
      logger.error(`❌ FAIL: ${testCase.description}`);
      logger.error(`   Input: "${testCase.input}"`);
      logger.error(`   Expected: "${testCase.expected}"`);
      logger.error(`   Got: "${result}"`);
      failed++;
    }
  }

  logger.info('\n' + '='.repeat(80));
  logger.info(`RESULTADOS: ${passed} pasaron, ${failed} fallaron`);
  logger.info('='.repeat(80));

  if (failed > 0) {
    process.exit(1);
  }
}

testExtractIdN();

