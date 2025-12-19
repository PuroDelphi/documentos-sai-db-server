/**
 * Script de prueba para sincronización de inventario (EA) usando product_id amarrado
 * 
 * REQUISITOS PREVIOS:
 * 1. Tener productos sincronizados en Supabase (tabla invoice_products)
 * 2. Crear una factura tipo "inventario" en Supabase
 * 3. Crear items con product_id amarrado a invoice_products
 * 4. Aprobar la factura para que se sincronice
 * 
 * USO:
 * node src/scripts/testInventoryWithProducts.js
 */

require('dotenv').config();
const SupabaseClient = require('../database/supabaseClient');
const logger = require('../utils/logger');

async function testInventoryWithProducts() {
  const supabaseClient = new SupabaseClient();

  try {
    logger.info('=== PRUEBA DE SINCRONIZACIÓN DE INVENTARIO CON PRODUCT_ID ===\n');

    // 1. Listar productos disponibles en Supabase
    logger.info('1. Listando productos disponibles en Supabase...');
    const { data: products, error: productsError } = await supabaseClient.client
      .from('invoice_products')
      .select('id, item_code, description, sync_status')
      .eq('user_id', supabaseClient.userUUID)
      .eq('sync_status', 'SINCRONIZADO')
      .limit(5);

    if (productsError) {
      throw new Error(`Error obteniendo productos: ${productsError.message}`);
    }

    if (!products || products.length === 0) {
      logger.warn('⚠️ No hay productos sincronizados en Supabase');
      logger.info('\nPara ejecutar esta prueba:');
      logger.info('1. Ejecute primero la sincronización de productos desde Firebird');
      logger.info('2. Asegúrese de que existan productos con sync_status = "SINCRONIZADO"');
      return;
    }

    logger.info(`✓ Productos encontrados: ${products.length}`);
    products.forEach((p, i) => {
      logger.info(`  ${i + 1}. ${p.item_code} - ${p.description}`);
    });

    // 2. Crear factura de prueba tipo "inventario"
    logger.info('\n2. Creando factura de prueba tipo "inventario"...');
    
    const testInvoice = {
      user_id: supabaseClient.userUUID,
      invoice_number: `TEST-EA-PROD-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      num_identificacion: '900672435',
      third_party_nit: '900672435',
      third_party_name: 'PROVEEDOR DE PRUEBA CON PRODUCTOS',
      billing_name: 'PROVEEDOR DE PRUEBA CON PRODUCTOS',
      invoice_type: 'inventario', // ← Tipo inventario para EA
      subtotal: 100000,
      tax: 19000,
      total: 119000,
      estado: 'PENDIENTE'
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

    // 3. Crear items con product_id amarrado
    logger.info('\n3. Creando items con product_id amarrado...');

    const testItems = [
      {
        user_id: supabaseClient.userUUID,
        invoice_id: invoice.id,
        product_id: products[0].id, // ← product_id amarrado
        description: `${products[0].item_code} - ${products[0].description}`,
        quantity: 10,
        unit_price: 5000,
        total_price: 50000
      },
      {
        user_id: supabaseClient.userUUID,
        invoice_id: invoice.id,
        product_id: products[1]?.id || products[0].id, // ← product_id amarrado
        description: `${products[1]?.item_code || products[0].item_code} - ${products[1]?.description || products[0].description}`,
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

    logger.info(`✓ Items creados: ${items.length}`);
    items.forEach((item, i) => {
      logger.info(`  ${i + 1}. Product ID: ${item.product_id} - ${item.description}`);
    });

    // 4. Aprobar factura para que se sincronice
    logger.info('\n4. Aprobando factura para sincronización...');

    const { error: approveError } = await supabaseClient.client
      .from('invoices')
      .update({ estado: 'APROBADO' })
      .eq('id', invoice.id);

    if (approveError) {
      throw new Error(`Error aprobando factura: ${approveError.message}`);
    }

    logger.info('✓ Factura aprobada');

    // 5. Esperar a que se sincronice
    logger.info('\n5. Esperando sincronización (10 segundos)...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // 6. Verificar estado de sincronización
    logger.info('\n6. Verificando estado de sincronización...');

    const { data: syncedInvoice, error: syncError } = await supabaseClient.client
      .from('invoices')
      .select('estado, service_response')
      .eq('id', invoice.id)
      .single();

    if (syncError) {
      throw new Error(`Error verificando sincronización: ${syncError.message}`);
    }

    logger.info(`Estado: ${syncedInvoice.estado}`);
    logger.info(`Respuesta: ${syncedInvoice.service_response || 'Sin respuesta aún'}`);

    logger.info('\n=== ✅ PRUEBA COMPLETADA ===');
    logger.info('\nPróximos pasos:');
    logger.info('1. Verificar en Firebird que se crearon registros en IP/IPDET/ITEMACT');
    logger.info('2. Verificar que el campo ITEM tenga el código correcto del producto');
    logger.info('3. Si hay errores, revisar los logs del servicio');

  } catch (error) {
    logger.error('❌ ERROR EN PRUEBA:', error);
    throw error;
  }
}

// Ejecutar prueba
testInventoryWithProducts()
  .then(() => {
    logger.info('\nPrueba finalizada');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Error fatal:', error);
    process.exit(1);
  });

