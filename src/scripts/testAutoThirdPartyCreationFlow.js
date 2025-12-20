/**
 * Script de prueba para verificar el flujo completo de creación automática de terceros
 * y actualización del service_response en Supabase
 */

require('dotenv').config();
const logger = require('../utils/logger');
const FirebirdClient = require('../database/firebirdClient');
const SupabaseClient = require('../database/supabaseClient');
const SyncService = require('../services/syncService');
const { initAppConfig } = require('./helpers/initAppConfig');

async function testAutoThirdPartyCreationFlow() {
  const firebirdClient = new FirebirdClient();
  const supabaseClient = new SupabaseClient();
  let testInvoiceId = null;

  try {
    logger.info('================================================================================');
    logger.info('PRUEBA DE FLUJO COMPLETO: CREACIÓN AUTOMÁTICA DE TERCEROS');
    logger.info('================================================================================');

    // Inicializar configuración de la aplicación
    await initAppConfig();

    // Conectar a Firebird
    await firebirdClient.initialize();
    logger.info('✓ Conexión a Firebird establecida');

    // Limpiar datos de prueba anteriores en Firebird
    logger.info('\n🧹 Limpiando datos de prueba anteriores en Firebird...');
    await firebirdClient.query("DELETE FROM SHIPTO WHERE ID_N = '999888777'");
    await firebirdClient.query("DELETE FROM TRIBUTARIA WHERE ID_N = '999888777'");
    await firebirdClient.query("DELETE FROM CUST WHERE ID_N = '999888777'");
    logger.info('✓ Datos de prueba limpiados en Firebird');

    // Crear factura de prueba en Supabase
    logger.info('\n📝 Creando factura de prueba en Supabase...');
    const testInvoice = {
      user_id: process.env.USER_UUID,
      invoice_number: 'TEST-AUTO-' + Date.now(),
      num_identificacion: '999888777-6', // NIT que NO existe en Firebird
      billing_name: 'EMPRESA DE PRUEBA AUTOMATICA S.A.S',
      billing_street: 'Calle 123 # 45-67',
      billing_city: 'Bogotá',
      billing_state: 'Cundinamarca',
      billing_country: 'Colombia',
      date: new Date().toISOString().split('T')[0], // Fecha actual en formato YYYY-MM-DD
      estado: 'BORRADOR',
      service_response: null,
      subtotal: 1000000,
      tax: 0,
      total: 1000000
    };

    const { data: invoiceData, error: invoiceError } = await supabaseClient.client
      .from('invoices')
      .insert(testInvoice)
      .select()
      .single();

    if (invoiceError) {
      throw new Error(`Error creando factura de prueba: ${invoiceError.message}`);
    }

    testInvoiceId = invoiceData.id;
    logger.info(`✓ Factura de prueba creada: ${invoiceData.invoice_number} (ID: ${testInvoiceId})`);

    // Crear entrada contable de prueba
    logger.info('\n📊 Creando entrada contable de prueba...');
    const { error: entryError } = await supabaseClient.client
      .from('accounting_entries')
      .insert({
        user_id: process.env.USER_UUID,
        invoice_id: testInvoiceId,
        account_code: '11050501',
        account_name: 'Cuentas por cobrar',
        description: 'Prueba de creación automática',
        debit: 1000000,
        credit: 0,
        third_party_nit: '999888777-6'
      });

    if (entryError) {
      throw new Error(`Error creando entrada contable: ${entryError.message}`);
    }
    logger.info('✓ Entrada contable creada');

    // Verificar que el tercero NO existe en Firebird
    logger.info('\n🔍 Verificando que el tercero NO existe en Firebird...');
    const existingThird = await firebirdClient.query(
      "SELECT ID_N FROM CUST WHERE ID_N = '999888777' OR NIT = '999888777-6'"
    );
    
    if (existingThird.length > 0) {
      throw new Error('El tercero ya existe en Firebird, la prueba no es válida');
    }
    logger.info('✓ Tercero NO existe (correcto para la prueba)');

    // Aprobar la factura y procesarla directamente
    logger.info('\n✅ Aprobando factura para sincronización...');
    const { error: approveError } = await supabaseClient.client
      .from('invoices')
      .update({ estado: 'APROBADA' })
      .eq('id', testInvoiceId);

    if (approveError) {
      throw new Error(`Error aprobando factura: ${approveError.message}`);
    }
    logger.info('✓ Factura aprobada');

    // Procesar la factura directamente usando SyncService
    logger.info('\n🚀 Procesando factura con SyncService...');
    const syncService = new SyncService(firebirdClient, supabaseClient);

    // Obtener la factura actualizada
    const { data: approvedInvoice, error: fetchApprovedError } = await supabaseClient.client
      .from('invoices')
      .select('*')
      .eq('id', testInvoiceId)
      .single();

    if (fetchApprovedError) {
      throw new Error(`Error obteniendo factura aprobada: ${fetchApprovedError.message}`);
    }

    // Procesar la factura
    await syncService.processApprovedInvoice(approvedInvoice);
    logger.info('✓ Factura procesada');

    // Verificar que el tercero fue creado en Firebird
    logger.info('\n✅ Verificando creación del tercero en Firebird...');
    const createdThird = await firebirdClient.query(
      "SELECT ID_N, NIT, COMPANY, CLIENTE FROM CUST WHERE ID_N = '999888777'"
    );

    if (createdThird.length === 0) {
      throw new Error('El tercero NO fue creado en Firebird');
    }

    logger.info('✓ Tercero creado en CUST:');
    logger.info(`   ID_N: ${createdThird[0].ID_N?.trim()}`);
    logger.info(`   NIT: ${createdThird[0].NIT?.trim()}`);
    logger.info(`   COMPANY: ${createdThird[0].COMPANY?.trim()}`);
    logger.info(`   CLIENTE: ${createdThird[0].CLIENTE?.trim()}`);

    // Verificar el service_response en Supabase
    logger.info('\n✅ Verificando service_response en Supabase...');
    const { data: updatedInvoice, error: fetchError } = await supabaseClient.client
      .from('invoices')
      .select('estado, service_response, fecha_hora_sync')
      .eq('id', testInvoiceId)
      .single();

    if (fetchError) {
      throw new Error(`Error obteniendo factura actualizada: ${fetchError.message}`);
    }

    logger.info('✓ Estado de la factura en Supabase:');
    logger.info(`   Estado: ${updatedInvoice.estado}`);
    logger.info(`   Service Response: ${updatedInvoice.service_response}`);
    logger.info(`   Fecha/Hora Sync: ${updatedInvoice.fecha_hora_sync}`);

    // Verificar que el mensaje es el esperado
    const expectedMessage = 'Ok, tercero creado automáticamente, por favor revise en el sistema';
    if (updatedInvoice.service_response === expectedMessage) {
      logger.info('\n✅ ¡PRUEBA EXITOSA! El service_response tiene el mensaje correcto');
    } else {
      logger.warn(`\n⚠️ El service_response no coincide con el esperado:`);
      logger.warn(`   Esperado: "${expectedMessage}"`);
      logger.warn(`   Recibido: "${updatedInvoice.service_response}"`);
    }

    logger.info('\n================================================================================');
    logger.info('✅ PRUEBA COMPLETADA');
    logger.info('================================================================================');

  } catch (error) {
    logger.error('\n❌ ERROR EN LA PRUEBA:', error);
    throw error;
  } finally {
    // Limpiar datos de prueba
    logger.info('\n🧹 Limpiando datos de prueba...');
    
    if (testInvoiceId) {
      try {
        await supabaseClient.client.from('accounting_entries').delete().eq('invoice_id', testInvoiceId);
        await supabaseClient.client.from('invoices').delete().eq('id', testInvoiceId);
        logger.info('✓ Factura de prueba eliminada de Supabase');
      } catch (cleanupError) {
        logger.error('Error limpiando factura de prueba:', cleanupError);
      }
    }

    try {
      await firebirdClient.query("DELETE FROM SHIPTO WHERE ID_N = '999888777'");
      await firebirdClient.query("DELETE FROM TRIBUTARIA WHERE ID_N = '999888777'");
      await firebirdClient.query("DELETE FROM CUST WHERE ID_N = '999888777'");
      logger.info('✓ Tercero de prueba eliminado de Firebird');
    } catch (cleanupError) {
      logger.error('Error limpiando tercero de prueba:', cleanupError);
    }

    await firebirdClient.close();
    logger.info('\n✓ Conexión cerrada');
  }
}

// Ejecutar prueba
testAutoThirdPartyCreationFlow()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error('Error fatal:', error);
    process.exit(1);
  });

