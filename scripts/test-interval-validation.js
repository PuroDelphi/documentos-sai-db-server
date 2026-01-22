#!/usr/bin/env node

/**
 * Script de prueba para validación de intervalos de sincronización
 * 
 * Este script prueba que la validación de intervalos funciona correctamente
 * tanto en el servicio como en la base de datos.
 * 
 * Uso: node scripts/test-interval-validation.js
 */

const ConfigService = require('../src/services/configService');

async function testIntervalValidation() {
  console.log('='.repeat(60));
  console.log('  PRUEBA DE VALIDACIÓN DE INTERVALOS');
  console.log('='.repeat(60));
  console.log();

  // Crear instancia del servicio de configuración
  const configService = new ConfigService();

  // Casos de prueba
  const testCases = [
    {
      name: 'Valores menores a 60',
      config: {
        chart_of_accounts_sync_interval: 30,
        products_sync_interval: 45,
        third_parties_sync_interval: 15
      },
      expected: {
        chart_of_accounts_sync_interval: 60,
        products_sync_interval: 60,
        third_parties_sync_interval: 60
      }
    },
    {
      name: 'Valores iguales a 60',
      config: {
        chart_of_accounts_sync_interval: 60,
        products_sync_interval: 60,
        third_parties_sync_interval: 60
      },
      expected: {
        chart_of_accounts_sync_interval: 60,
        products_sync_interval: 60,
        third_parties_sync_interval: 60
      }
    },
    {
      name: 'Valores mayores a 60',
      config: {
        chart_of_accounts_sync_interval: 120,
        products_sync_interval: 90,
        third_parties_sync_interval: 180
      },
      expected: {
        chart_of_accounts_sync_interval: 120,
        products_sync_interval: 90,
        third_parties_sync_interval: 180
      }
    },
    {
      name: 'Valores mixtos',
      config: {
        chart_of_accounts_sync_interval: 30,
        products_sync_interval: 60,
        third_parties_sync_interval: 120
      },
      expected: {
        chart_of_accounts_sync_interval: 60,
        products_sync_interval: 60,
        third_parties_sync_interval: 120
      }
    },
    {
      name: 'Valores null',
      config: {
        chart_of_accounts_sync_interval: null,
        products_sync_interval: null,
        third_parties_sync_interval: null
      },
      expected: {
        chart_of_accounts_sync_interval: null,
        products_sync_interval: null,
        third_parties_sync_interval: null
      }
    },
    {
      name: 'Valores undefined',
      config: {
        chart_of_accounts_sync_interval: undefined,
        products_sync_interval: undefined,
        third_parties_sync_interval: undefined
      },
      expected: {
        chart_of_accounts_sync_interval: undefined,
        products_sync_interval: undefined,
        third_parties_sync_interval: undefined
      }
    }
  ];

  let passed = 0;
  let failed = 0;

  // Ejecutar casos de prueba
  for (const testCase of testCases) {
    console.log(`Probando: ${testCase.name}`);
    console.log(`  Entrada:`, testCase.config);

    const result = configService.validateSyncIntervals({ ...testCase.config });

    console.log(`  Resultado:`, {
      chart_of_accounts_sync_interval: result.chart_of_accounts_sync_interval,
      products_sync_interval: result.products_sync_interval,
      third_parties_sync_interval: result.third_parties_sync_interval
    });

    // Verificar resultados
    const chartMatch = result.chart_of_accounts_sync_interval === testCase.expected.chart_of_accounts_sync_interval;
    const productsMatch = result.products_sync_interval === testCase.expected.products_sync_interval;
    const thirdPartiesMatch = result.third_parties_sync_interval === testCase.expected.third_parties_sync_interval;

    if (chartMatch && productsMatch && thirdPartiesMatch) {
      console.log(`  ✅ PASÓ`);
      passed++;
    } else {
      console.log(`  ❌ FALLÓ`);
      console.log(`  Esperado:`, testCase.expected);
      failed++;
    }

    console.log();
  }

  // Resumen
  console.log('='.repeat(60));
  console.log('  RESUMEN');
  console.log('='.repeat(60));
  console.log(`  Total de pruebas: ${testCases.length}`);
  console.log(`  ✅ Pasaron: ${passed}`);
  console.log(`  ❌ Fallaron: ${failed}`);
  console.log();

  if (failed === 0) {
    console.log('🎉 ¡Todas las pruebas pasaron exitosamente!');
    process.exit(0);
  } else {
    console.log('⚠️ Algunas pruebas fallaron');
    process.exit(1);
  }
}

// Ejecutar pruebas
testIntervalValidation().catch(error => {
  console.error('❌ Error ejecutando pruebas:', error);
  process.exit(1);
});

