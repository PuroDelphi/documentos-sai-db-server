/**
 * Script de diagnóstico para verificar el flujo de creación de terceros
 * y la inserción en CARPROEN
 */

require('dotenv').config();
const logger = require('../config/logger');
const FirebirdClient = require('../database/firebirdClient');
const SupabaseClient = require('../database/supabaseClient');

async function diagnoseIssue() {
  const firebirdClient = new FirebirdClient();
  const supabaseClient = new SupabaseClient();

  try {
    logger.info('='.repeat(80));
    logger.info('DIAGNÓSTICO: Verificación de NITs en facturas con error');
    logger.info('='.repeat(80));

    // Conectar a Firebird
    await firebirdClient.connect();
    logger.info('✓ Conectado a Firebird');

    // Obtener facturas en estado ERROR
    const { data: errorInvoices, error } = await supabaseClient.client
      .from('invoices')
      .select('*')
      .eq('estado', 'ERROR')
      .eq('user_id', process.env.USER_UUID)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      throw new Error(`Error obteniendo facturas: ${error.message}`);
    }

    if (!errorInvoices || errorInvoices.length === 0) {
      logger.info('No hay facturas en estado ERROR');
      return;
    }

    logger.info(`\nEncontradas ${errorInvoices.length} facturas en ERROR\n`);

    for (const invoice of errorInvoices) {
      logger.info('-'.repeat(80));
      logger.info(`Factura: ${invoice.invoice_number}`);
      logger.info(`NIT en Supabase: "${invoice.num_identificacion}"`);
      logger.info(`Error: ${invoice.service_response}`);

      // Verificar si el error es de FK_CARPROEN_CUST
      if (invoice.service_response && invoice.service_response.includes('FK_CARPROEN_CUST')) {
        logger.info('\n🔍 Este es un error de FK_CARPROEN_CUST');

        const nit = invoice.num_identificacion;
        
        // Generar variaciones del NIT
        const variations = [];
        variations.push(nit); // Original
        
        if (nit.includes('-')) {
          variations.push(nit.split('-')[0].trim()); // Sin DV
        } else if (nit.length > 1) {
          variations.push(nit.substring(0, nit.length - 1)); // Sin último dígito
        }

        logger.info(`\nVariaciones a buscar: ${variations.join(', ')}`);

        // Buscar en CUST con cada variación
        for (const variation of variations) {
          const result = await firebirdClient.query(
            "SELECT ID_N, NIT, COMPANY FROM CUST WHERE ID_N = ? OR NIT = ?",
            [variation, variation]
          );

          if (result.length > 0) {
            logger.info(`\n✅ ENCONTRADO con variación "${variation}":`);
            logger.info(`   ID_N: "${result[0].ID_N}"`);
            logger.info(`   NIT: "${result[0].NIT}"`);
            logger.info(`   COMPANY: "${result[0].COMPANY}"`);
          } else {
            logger.info(`\n❌ NO encontrado con variación "${variation}"`);
          }
        }

        // Verificar si existe en CARPROEN
        const carproenResult = await firebirdClient.query(
          "SELECT BATCH, ID_N, TIPO FROM CARPROEN WHERE PONUMBER = ?",
          [invoice.invoice_number.substring(0, 20)]
        );

        if (carproenResult.length > 0) {
          logger.info(`\n⚠️ La factura YA EXISTE en CARPROEN:`);
          logger.info(`   BATCH: ${carproenResult[0].BATCH}`);
          logger.info(`   ID_N: "${carproenResult[0].ID_N}"`);
          logger.info(`   TIPO: "${carproenResult[0].TIPO}"`);
        } else {
          logger.info(`\n✓ La factura NO existe en CARPROEN (correcto para inserción)`);
        }
      }
    }

    logger.info('\n' + '='.repeat(80));
    logger.info('DIAGNÓSTICO COMPLETADO');
    logger.info('='.repeat(80));

  } catch (error) {
    logger.error('Error en diagnóstico:', error);
  } finally {
    await firebirdClient.close();
    logger.info('\n✓ Conexión cerrada');
  }
}

// Ejecutar diagnóstico
diagnoseIssue().catch(error => {
  logger.error('Error fatal:', error);
  process.exit(1);
});

