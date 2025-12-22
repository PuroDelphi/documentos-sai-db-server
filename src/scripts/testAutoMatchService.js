/**
 * Script de prueba para verificar el auto-emparejamiento de product_id
 * en invoice_items de facturas tipo SERVICIO
 * 
 * Este script:
 * 1. Lista productos disponibles en invoice_products
 * 2. Crea una factura de prueba tipo SERVICIO
 * 3. Inserta items con descripciones similares a productos existentes
 * 4. Verifica que product_id se haya asignado automáticamente
 * 
 * Uso:
 *   node src/scripts/testAutoMatchService.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const config = require('../config');
const { validateAndGetUserUUID } = require('../utils/userValidation');

const supabase = createClient(config.supabase.url, config.supabase.anonKey);
const userUUID = validateAndGetUserUUID();

async function main() {
  console.log('\n🧪 PRUEBA DE AUTO-EMPAREJAMIENTO EN FACTURAS DE SERVICIO\n');
  console.log('='.repeat(60));

  try {
    // 1. Listar productos disponibles
    console.log('\n📦 PASO 1: Listar productos disponibles\n');
    
    const { data: products, error: productsError } = await supabase
      .from('invoice_products')
      .select('id, item_code, description')
      .eq('user_id', userUUID)
      .in('sync_status', ['SINCRONIZADO', 'SYNCED'])
      .limit(5);

    if (productsError) {
      throw new Error(`Error al obtener productos: ${productsError.message}`);
    }

    if (!products || products.length === 0) {
      console.log('⚠️  No hay productos sincronizados en invoice_products');
      console.log('   Ejecuta primero la sincronización de productos desde Firebird');
      process.exit(0);
    }

    console.log(`✅ Encontrados ${products.length} productos:`);
    products.forEach((p, i) => {
      console.log(`   ${i + 1}. [${p.item_code}] ${p.description}`);
    });

    // 2. Crear factura de prueba tipo SERVICIO
    console.log('\n📄 PASO 2: Crear factura de prueba tipo SERVICIO\n');

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        user_id: userUUID,
        invoice_type: 'servicio', // ← TIPO SERVICIO
        invoice_number: `TEST-SERVICE-MATCH-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        num_identificacion: '900123456-7',
        billing_name: 'PROVEEDOR DE PRUEBA SERVICIO',
        total: 100000,
        estado: 'PENDIENTE'
      })
      .select()
      .single();

    if (invoiceError) {
      throw new Error(`Error al crear factura: ${invoiceError.message}`);
    }

    console.log(`✅ Factura tipo SERVICIO creada: ${invoice.invoice_number}`);
    console.log(`   ID: ${invoice.id}`);

    // 3. Insertar items con descripciones similares
    console.log('\n🔍 PASO 3: Insertar items con descripciones similares\n');

    const testItems = products.slice(0, 3).map((product, i) => {
      // Crear descripción similar pero no exacta
      const variations = [
        product.description.toUpperCase(), // Todo mayúsculas
        product.description.toLowerCase(), // Todo minúsculas
        product.description.replace(/\s+/g, ' ').trim(), // Espacios normalizados
      ];
      
      return {
        invoice_id: invoice.id,
        user_id: userUUID,
        description: variations[i % variations.length],
        quantity: (i + 1) * 10,
        unit_price: 5000 + (i * 1000),
        total_price: ((i + 1) * 10) * (5000 + (i * 1000)),
        // NO asignamos product_id - debe ser asignado automáticamente por el trigger
      };
    });

    console.log('Insertando items con descripciones similares:');
    testItems.forEach((item, i) => {
      console.log(`   ${i + 1}. "${item.description}"`);
      console.log(`      (Original: "${products[i].description}")`);
    });

    const { data: insertedItems, error: itemsError } = await supabase
      .from('invoice_items')
      .insert(testItems)
      .select('id, description, product_id, invoice_products(item_code, description)');

    if (itemsError) {
      throw new Error(`Error al insertar items: ${itemsError.message}`);
    }

    // 4. Verificar resultados
    console.log('\n✅ PASO 4: Verificar auto-emparejamiento\n');

    let successCount = 0;
    let failCount = 0;

    insertedItems.forEach((item, i) => {
      const matched = item.product_id !== null;
      const icon = matched ? '✅' : '❌';
      
      console.log(`${icon} Item ${i + 1}:`);
      console.log(`   Descripción: "${item.description}"`);
      
      if (matched) {
        console.log(`   ✓ Product ID: ${item.product_id}`);
        console.log(`   ✓ Código: ${item.invoice_products.item_code}`);
        console.log(`   ✓ Producto: "${item.invoice_products.description}"`);
        successCount++;
      } else {
        console.log(`   ✗ No se encontró match automático`);
        failCount++;
      }
      console.log('');
    });

    // 5. Resumen
    console.log('📊 RESUMEN DE PRUEBA:\n');
    console.log(`   Total items insertados: ${insertedItems.length}`);
    console.log(`   ✅ Auto-emparejados: ${successCount}`);
    console.log(`   ❌ Sin emparejar: ${failCount}`);
    console.log(`   📈 Tasa de éxito: ${((successCount / insertedItems.length) * 100).toFixed(1)}%\n`);

    if (successCount === insertedItems.length) {
      console.log('🎉 ¡PRUEBA EXITOSA! Todos los items fueron auto-emparejados correctamente\n');
    } else if (successCount > 0) {
      console.log('⚠️  PRUEBA PARCIAL: Algunos items no fueron auto-emparejados\n');
      console.log('   Posibles causas:');
      console.log('   - Threshold de similitud muy alto (actual: 0.3 = 30%)');
      console.log('   - Descripciones muy diferentes');
      console.log('   - Productos no sincronizados correctamente\n');
    } else {
      console.log('❌ PRUEBA FALLIDA: Ningún item fue auto-emparejado\n');
      console.log('   Verifica que:');
      console.log('   1. El trigger esté creado en Supabase');
      console.log('   2. La extensión pg_trgm esté habilitada');
      console.log('   3. Los productos estén sincronizados\n');
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  }
}

main();

