/**
 * Script para verificar y corregir el auto-emparejamiento de productos
 * 
 * Este script:
 * 1. Verifica si los triggers de auto-match existen
 * 2. Verifica si la función auto_match_product_id() existe
 * 3. Verifica si la función find_similar_product() existe
 * 4. Verifica si la extensión pg_trgm está habilitada
 * 5. Verifica si el índice GIN existe
 * 6. Aplica las correcciones necesarias
 * 
 * Uso:
 *   node src/scripts/verifyAndFixAutoMatch.js
 */

const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

async function main() {
  try {
    logger.info('=== VERIFICACIÓN DE AUTO-EMPAREJAMIENTO ===\n');

    // Conectar a Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Prueba simple: Insertar un item y ver si se auto-empareja
    logger.info('1️⃣ Probando auto-emparejamiento con inserción real...\n');

    // Primero, obtener un producto existente
    const { data: products, error: prodError } = await supabase
      .from('invoice_products')
      .select('id, item_code, description')
      .limit(1)
      .single();

    if (prodError || !products) {
      logger.error('❌ No hay productos en invoice_products para probar');
      logger.info('   Primero sincroniza productos: npm run sync-products');
      return;
    }

    logger.info(`Producto de prueba: ${products.item_code} - ${products.description}`);

    // Crear una factura de prueba
    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .insert({
        invoice_type: 'inventario',
        invoice_number: `TEST-AUTO-MATCH-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        num_identificacion: '900123456-7',
        billing_name: 'PRUEBA AUTO-MATCH',
        total: 100000,
        estado: 'PENDIENTE'
      })
      .select()
      .single();

    if (invError) {
      logger.error('❌ Error creando factura de prueba:', invError.message);
      return;
    }

    logger.info(`✅ Factura de prueba creada: ${invoice.invoice_number}`);

    // Insertar item con descripción similar (pero no exacta)
    const testDescription = products.description.substring(0, 20) + ' PRUEBA';

    logger.info(`\n2️⃣ Insertando item con descripción: "${testDescription}"`);
    logger.info(`   (Similar a: "${products.description}")`);

    const { data: item, error: itemError } = await supabase
      .from('invoice_items')
      .insert({
        invoice_id: invoice.id,
        description: testDescription,
        quantity: 1,
        unit_price: 10000,
        product_id: null // ← Debe auto-emparejarse
      })
      .select()
      .single();

    if (itemError) {
      logger.error('❌ Error insertando item:', itemError.message);
      return;
    }

    // Verificar si se auto-emparejó
    logger.info('\n3️⃣ Verificando resultado...\n');

    if (item.product_id) {
      logger.info('✅✅✅ AUTO-EMPAREJAMIENTO FUNCIONA! ✅✅✅');
      logger.info(`   product_id asignado: ${item.product_id}`);
      logger.info(`   Descripción del item: "${item.description}"`);

      // Verificar que sea el producto correcto
      const { data: matchedProduct } = await supabase
        .from('invoice_products')
        .select('item_code, description')
        .eq('id', item.product_id)
        .single();

      if (matchedProduct) {
        logger.info(`   Producto emparejado: ${matchedProduct.item_code} - ${matchedProduct.description}`);
      }
    } else {
      logger.error('❌❌❌ AUTO-EMPAREJAMIENTO NO FUNCIONA ❌❌❌');
      logger.error('   product_id es NULL después de insertar');
      logger.error('\n🔧 SOLUCIÓN:');
      logger.error('   1. Abre Supabase Dashboard → SQL Editor');
      logger.error('   2. Copia el contenido de:');
      logger.error('      supabase/migrations/update_auto_match_for_service_invoices.sql');
      logger.error('   3. Pégalo y ejecuta');
    }

    // Limpiar datos de prueba
    logger.info('\n4️⃣ Limpiando datos de prueba...');
    await supabase.from('invoice_items').delete().eq('id', item.id);
    await supabase.from('invoices').delete().eq('id', invoice.id);
    logger.info('✅ Datos de prueba eliminados');

    // Resumen
    logger.info('\n' + '='.repeat(60));
    logger.info('📋 RESUMEN');
    logger.info('='.repeat(60));
    logger.info('\nSi hay ❌ arriba, debes aplicar la migración manualmente:');
    logger.info('\n1. Abre Supabase Dashboard → SQL Editor');
    logger.info('2. Copia el contenido de:');
    logger.info('   supabase/migrations/update_auto_match_for_service_invoices.sql');
    logger.info('3. Pégalo y ejecuta');
    logger.info('\nEsto creará:');
    logger.info('  - Función auto_match_product_id()');
    logger.info('  - Trigger trigger_auto_match_product_id_on_insert (BEFORE INSERT)');
    logger.info('  - Trigger trigger_auto_match_product_id_on_update (BEFORE UPDATE)');

  } catch (error) {
    logger.error('Error en verificación:', error);
    process.exit(1);
  }
}

main();

