require('dotenv').config();
const FirebirdClient = require('../database/firebirdClient');
const SupabaseClient = require('../database/supabaseClient');
const SyncService = require('../services/syncService');
const logger = require('../utils/logger');

/**
 * Script para probar que el NIT retornado por createThirdPartyFromInvoice
 * sea el correcto para usar en CARPROEN.ID_N
 */

async function testThirdPartyNitReturn() {
  const firebirdClient = new FirebirdClient();
  const supabaseClient = new SupabaseClient();
  let testInvoiceId = null;
  let testEntryId = null;

  try {
    logger.info('='.repeat(80));
    logger.info('PRUEBA: NIT RETORNADO POR CREACIÓN AUTOMÁTICA DE TERCEROS');
    logger.info('='.repeat(80));

    await firebirdClient.initialize();

    // NIT de prueba con guión
    const testNit = '888777666-5';
    const testNitWithoutDash = '888777666';

    logger.info(`\n📋 NIT de prueba: ${testNit}`);
    logger.info(`   ID_N esperado en CUST: ${testNitWithoutDash} (sin guión)`);
    logger.info(`   NIT esperado en CUST: ${testNit} (con guión)`);
    logger.info(`   ID_N esperado en CARPROEN: ${testNitWithoutDash} (sin guión, FK a CUST.ID_N)`);

    // Limpiar cualquier registro previo del tercero de prueba
    logger.info('\n🧹 Limpiando registros previos del tercero de prueba...');
    try {
      // Eliminar en orden: CARPRODE -> CARPROEN -> GL -> SHIPTO -> TRIBUTARIA -> CUST
      await firebirdClient.query("DELETE FROM CARPRODE WHERE ID_N = ?", [testNitWithoutDash]);
      await firebirdClient.query("DELETE FROM CARPROEN WHERE ID_N = ?", [testNitWithoutDash]);
      await firebirdClient.query("DELETE FROM GL WHERE ID_N = ?", [testNitWithoutDash]);
      await firebirdClient.query("DELETE FROM SHIPTO WHERE ID_N = ?", [testNitWithoutDash]);
      await firebirdClient.query("DELETE FROM TRIBUTARIA WHERE ID_N = ?", [testNitWithoutDash]);
      await firebirdClient.query("DELETE FROM CUST WHERE ID_N = ?", [testNitWithoutDash]);
      logger.info('✓ Registros previos eliminados');
    } catch (cleanupError) {
      // Ignorar errores si no existen registros
      logger.debug('No había registros previos para eliminar');
    }

    // Verificar que el tercero NO existe
    logger.info('\n🔍 Verificando que el tercero NO existe...');
    const existing = await firebirdClient.query(
      "SELECT ID_N, NIT FROM CUST WHERE ID_N = ? OR NIT = ?",
      [testNitWithoutDash, testNit]
    );

    if (existing.length > 0) {
      throw new Error('El tercero aún existe después de la limpieza');
    }
    logger.info('✓ Tercero NO existe (correcto para la prueba)');

    // Crear factura de prueba en Supabase
    logger.info('\n📝 Creando factura de prueba en Supabase...');
    const { data: invoice, error: invoiceError } = await supabaseClient.client
      .from('invoices')
      .insert({
        user_id: supabaseClient.userUUID,
        invoice_number: `TEST-NIT-${Date.now()}`,
        num_identificacion: testNit,
        billing_name: 'EMPRESA PRUEBA NIT S.A.S',
        billing_street: 'Calle 123',
        billing_city: 'Bogotá',
        billing_state: 'Cundinamarca',
        billing_country: 'Colombia',
        date: new Date().toISOString().split('T')[0],
        subtotal: 100000,
        tax: 19000,
        total: 119000,
        estado: 'BORRADOR'
      })
      .select()
      .single();

    if (invoiceError) throw new Error(`Error creando factura: ${invoiceError.message}`);
    testInvoiceId = invoice.id;
    logger.info(`✓ Factura creada: ID=${testInvoiceId}`);

    // Crear entrada contable
    logger.info('\n📊 Creando entrada contable...');
    const { data: entry, error: entryError } = await supabaseClient.client
      .from('accounting_entries')
      .insert({
        user_id: supabaseClient.userUUID,
        invoice_id: testInvoiceId,
        account_code: '41359501',
        account_name: 'Ingresos por servicios',
        debit: 0,
        credit: 100000,
        description: 'Venta de prueba',
        third_party_nit: testNit
      })
      .select()
      .single();

    if (entryError) throw new Error(`Error creando entrada: ${entryError.message}`);
    testEntryId = entry.id;
    logger.info('✓ Entrada contable creada');

    // Aprobar y procesar la factura
    logger.info('\n✅ Aprobando factura...');
    const { error: approveError } = await supabaseClient.client
      .from('invoices')
      .update({ estado: 'APROBADO' })
      .eq('id', testInvoiceId);

    if (approveError) throw new Error(`Error aprobando factura: ${approveError.message}`);

    // Procesar con SyncService
    logger.info('\n🚀 Procesando factura con SyncService...');
    const syncService = new SyncService(firebirdClient, supabaseClient);
    await syncService.initialize();

    const { data: approvedInvoice } = await supabaseClient.client
      .from('invoices')
      .select('*')
      .eq('id', testInvoiceId)
      .single();

    await syncService.processApprovedInvoice(approvedInvoice);

    // Verificar que el tercero se creó correctamente en CUST
    logger.info('\n✅ Verificando tercero en CUST...');
    const custRecord = await firebirdClient.query(
      "SELECT ID_N, NIT, COMPANY FROM CUST WHERE ID_N = ?",
      [testNitWithoutDash]
    );

    if (custRecord.length === 0) {
      throw new Error('❌ El tercero NO se creó en CUST');
    }

    logger.info('✓ Tercero creado en CUST:');
    logger.info(`   ID_N: "${custRecord[0].ID_N?.trim()}"`);
    logger.info(`   NIT: "${custRecord[0].NIT?.trim()}"`);
    logger.info(`   COMPANY: "${custRecord[0].COMPANY?.trim()}"`);

    // Verificar que la factura se insertó en CARPROEN
    logger.info('\n✅ Verificando factura en CARPROEN...');
    const carproenRecord = await firebirdClient.query(
      "SELECT BATCH, ID_N, TOTAL FROM CARPROEN WHERE TIPO = 'FIA' ORDER BY BATCH DESC ROWS 1"
    );

    if (carproenRecord.length === 0) {
      throw new Error('❌ La factura NO se insertó en CARPROEN');
    }

    logger.info('✓ Factura insertada en CARPROEN:');
    logger.info(`   BATCH: ${carproenRecord[0].BATCH}`);
    logger.info(`   ID_N: "${carproenRecord[0].ID_N?.trim()}"`);
    logger.info(`   TOTAL: ${carproenRecord[0].TOTAL}`);

    // Verificar que los NITs coinciden
    logger.info('\n🔍 Verificando coincidencia de NITs...');
    const carproenIdN = carproenRecord[0].ID_N?.trim();

    if (carproenIdN === testNitWithoutDash) {
      logger.info('✅ ¡ÉXITO! El ID_N en CARPROEN coincide con CUST.ID_N (sin guión)');
      logger.info(`   CUST.ID_N: "${testNitWithoutDash}"`);
      logger.info(`   CUST.NIT: "${testNit}"`);
      logger.info(`   CARPROEN.ID_N: "${carproenIdN}"`);
      logger.info('   ✅ La FK FK_CARPROEN_CUST funciona correctamente');
    } else {
      throw new Error(`❌ ERROR: ID_N en CARPROEN "${carproenIdN}" no coincide con "${testNitWithoutDash}"`);
    }

    logger.info('\n' + '='.repeat(80));
    logger.info('✅ PRUEBA EXITOSA - CREACIÓN AUTOMÁTICA DE TERCEROS FUNCIONA CORRECTAMENTE');
    logger.info('='.repeat(80));

  } catch (error) {
    logger.error('\n❌ ERROR EN LA PRUEBA:', error);
    if (error.message) logger.error('Mensaje:', error.message);
    if (error.stack) logger.error('Stack:', error.stack);
  } finally {
    // Limpiar datos de prueba
    logger.info('\n🧹 Limpiando datos de prueba...');
    
    if (testInvoiceId) {
      await supabaseClient.client.from('invoices').delete().eq('id', testInvoiceId);
      logger.info('✓ Factura de prueba eliminada de Supabase');
    }

    await firebirdClient.close();
    logger.info('✓ Conexión cerrada');
  }
}

testThirdPartyNitReturn()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error('Error fatal:', error);
    process.exit(1);
  });

