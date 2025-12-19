require('dotenv').config();
const SupabaseClient = require('../database/supabaseClient');
const logger = require('../utils/logger');

/**
 * Script de prueba para sincronización de inventario
 * Crea una factura de prueba tipo "inventario" y verifica que se sincronice correctamente
 */

async function testInventorySync() {
  const supabaseClient = new SupabaseClient();
  const userUUID = supabaseClient.userUUID;

  try {
    logger.info('=== INICIANDO PRUEBA DE SINCRONIZACIÓN DE INVENTARIO ===');
    logger.info(`Usuario: ${userUUID}`);

    // 1. Crear factura de prueba tipo "inventario"
    logger.info('\n1. Creando factura de prueba tipo "inventario"...');

    const testInvoice = {
      user_id: userUUID,
      invoice_number: `TEST-INV-${Date.now()}`,
      date: new Date().toISOString().split('T')[0], // Formato YYYY-MM-DD
      invoice_type: 'inventario', // IMPORTANTE: tipo inventario
      num_identificacion: '900672435', // NIT de prueba
      billing_name: 'PROVEEDOR DE PRUEBA INVENTARIO',
      billing_street: 'Calle 123 # 45-67',
      billing_city: 'Bogotá',
      billing_state: 'Cundinamarca',
      billing_country: 'Colombia',
      subtotal: 100000,
      tax: 19000,
      total: 119000,
      estado: 'BORRADOR'
    };

    const { data: invoice, error: invoiceError } = await supabaseClient.client
      .from('invoices')
      .insert(testInvoice)
      .select()
      .single();

    if (invoiceError) {
      throw new Error(`Error creando factura: ${invoiceError.message}`);
    }

    logger.info(`✓ Factura creada: ${invoice.invoice_number} (ID: ${invoice.id})`);

    // 2. Crear items de la factura
    logger.info('\n2. Creando items de la factura...');

    const testItems = [
      {
        user_id: userUUID,
        invoice_id: invoice.id,
        description: 'PROD001 - Producto de prueba 1',
        quantity: 10,
        unit_price: 5000,
        total_price: 50000
      },
      {
        user_id: userUUID,
        invoice_id: invoice.id,
        description: 'PROD002 - Producto de prueba 2',
        quantity: 5,
        unit_price: 10000,
        total_price: 50000
      }
    ];

    const { data: items, error: itemsError } = await supabaseClient.client
      .from('invoice_items')
      .insert(testItems)
      .select();

    if (itemsError) {
      throw new Error(`Error creando items: ${itemsError.message}`);
    }

    logger.info(`✓ ${items.length} items creados`);

    // 3. Crear entradas contables (requeridas)
    logger.info('\n3. Creando entradas contables...');

    const testEntries = [
      {
        user_id: userUUID,
        invoice_id: invoice.id,
        account_code: '22050101', // Cuenta de inventario
        account_name: 'Inventarios',
        debit: 119000,
        credit: 0,
        description: 'Entrada de inventario',
        third_party_nit: '900672435'
      },
      {
        user_id: userUUID,
        invoice_id: invoice.id,
        account_code: '11050501', // Cuenta de bancos
        account_name: 'Bancos',
        debit: 0,
        credit: 119000,
        description: 'Pago de inventario',
        third_party_nit: '900672435'
      }
    ];

    const { data: entries, error: entriesError } = await supabaseClient.client
      .from('accounting_entries')
      .insert(testEntries)
      .select();

    if (entriesError) {
      throw new Error(`Error creando entradas: ${entriesError.message}`);
    }

    logger.info(`✓ ${entries.length} entradas contables creadas`);

    // 4. Aprobar la factura para que se sincronice
    logger.info('\n4. Aprobando factura para sincronización...');

    const { error: updateError } = await supabaseClient.client
      .from('invoices')
      .update({ estado: 'APROBADO' })
      .eq('id', invoice.id);

    if (updateError) {
      throw new Error(`Error aprobando factura: ${updateError.message}`);
    }

    logger.info(`✓ Factura aprobada. El servicio debería procesarla automáticamente.`);

    // 5. Esperar y verificar sincronización
    logger.info('\n5. Esperando sincronización (30 segundos)...');
    await new Promise(resolve => setTimeout(resolve, 30000));

    const { data: syncedInvoice } = await supabaseClient.client
      .from('invoices')
      .select('*')
      .eq('id', invoice.id)
      .single();

    logger.info('\n=== RESULTADO DE LA SINCRONIZACIÓN ===');
    logger.info(`Estado: ${syncedInvoice.estado}`);
    logger.info(`Respuesta del servicio: ${syncedInvoice.service_response || 'N/A'}`);

    if (syncedInvoice.estado === 'SINCRONIZADO') {
      logger.info('\n✅ PRUEBA EXITOSA: Factura de inventario sincronizada correctamente');
    } else if (syncedInvoice.estado === 'ERROR') {
      logger.error('\n❌ ERROR EN SINCRONIZACIÓN');
      logger.error(`Mensaje: ${syncedInvoice.service_response}`);
    } else {
      logger.warn('\n⚠️  Factura aún no procesada. Verifique que el servicio esté corriendo.');
    }

  } catch (error) {
    logger.error('\n❌ ERROR EN PRUEBA:', error);
  } finally {
    await supabaseClient.close();
  }
}

// Ejecutar prueba
testInventorySync();

