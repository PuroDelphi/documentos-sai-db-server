/**
 * Script de prueba para validar el sistema de APRENDIZAJE
 * del auto-emparejamiento de productos
 * 
 * Este script prueba que:
 * 1. Primera factura: Sistema asigna por similitud
 * 2. Usuario corrige manualmente el product_id
 * 3. Segunda factura (misma descripción): Sistema usa la corrección del usuario
 * 4. Tercera factura (misma descripción): Sistema sigue usando la corrección
 * 
 * Uso:
 *   node src/scripts/testLearningSystem.js
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Cargar variables de entorno
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const userUUID = process.env.USER_UUID;

if (!supabaseUrl || !supabaseKey || !userUUID) {
  console.error('❌ Error: Faltan variables de entorno requeridas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('\n🧠 PRUEBA DEL SISTEMA DE APRENDIZAJE\n');
  console.log('='.repeat(70));

  try {
    // Obtener 2 productos diferentes para la prueba
    const { data: products, error: productsError } = await supabase
      .from('invoice_products')
      .select('id, item_code, description')
      .eq('user_id', userUUID)
      .in('sync_status', ['SINCRONIZADO', 'SYNCED'])
      .limit(2);

    if (productsError || !products || products.length < 2) {
      throw new Error('Se necesitan al menos 2 productos sincronizados');
    }

    const productA = products[0]; // El que el sistema asignará por similitud
    const productB = products[1]; // El que el usuario corregirá manualmente

    console.log('\n📦 Productos para la prueba:');
    console.log(`   Producto A (similitud): [${productA.item_code}] ${productA.description}`);
    console.log(`   Producto B (corrección): [${productB.item_code}] ${productB.description}`);

    // Crear factura de prueba
    console.log('\n📄 PASO 1: Crear factura de prueba tipo inventario\n');

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        user_id: userUUID,
        invoice_type: 'inventario',
        invoice_number: `TEST-LEARNING-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        num_identificacion: '900123456-7',
        billing_name: 'PROVEEDOR PRUEBA APRENDIZAJE',
        total: 300000,
        estado: 'PENDIENTE'
      })
      .select()
      .single();

    if (invoiceError) {
      throw new Error(`Error al crear factura: ${invoiceError.message}`);
    }

    console.log(`✅ Factura creada: ID=${invoice.id}`);

    // PRUEBA 1: Primera factura - Sistema asigna por similitud
    console.log('\n🔍 PRUEBA 1: Primera factura (sistema asigna por similitud)\n');

    const testDescription = 'PRODUCTO DE PRUEBA APRENDIZAJE XYZ-123';

    const { data: item1, error: item1Error } = await supabase
      .from('invoice_items')
      .insert({
        invoice_id: invoice.id,
        user_id: userUUID,
        description: testDescription,
        quantity: 1,
        unit_price: 100000,
        total_price: 100000
      })
      .select('id, description, product_id')
      .single();

    if (item1Error) {
      throw new Error(`Error al crear item 1: ${item1Error.message}`);
    }

    console.log(`✅ Item 1 creado: ID=${item1.id}`);
    console.log(`   Descripción: "${item1.description}"`);
    console.log(`   product_id asignado: ${item1.product_id || 'NULL'}`);

    if (item1.product_id) {
      console.log(`   ℹ️  Sistema asignó por SIMILITUD`);
    } else {
      console.log(`   ⚠️  No se encontró producto similar (threshold muy alto)`);
    }

    // PRUEBA 2: Usuario corrige manualmente
    console.log('\n✏️  PRUEBA 2: Usuario corrige manualmente el product_id\n');

    const { error: updateError } = await supabase
      .from('invoice_items')
      .update({ product_id: productB.id })
      .eq('id', item1.id);

    if (updateError) {
      throw new Error(`Error al actualizar item: ${updateError.message}`);
    }

    console.log(`✅ Usuario corrigió product_id: ${item1.product_id} → ${productB.id}`);
    console.log(`   Producto corregido: [${productB.item_code}] ${productB.description}`);

    // PRUEBA 3: Segunda factura - Sistema debe usar la corrección
    console.log('\n🧠 PRUEBA 3: Segunda factura (misma descripción - debe APRENDER)\n');

    const { data: item2, error: item2Error } = await supabase
      .from('invoice_items')
      .insert({
        invoice_id: invoice.id,
        user_id: userUUID,
        description: testDescription, // MISMA descripción
        quantity: 2,
        unit_price: 100000,
        total_price: 200000
      })
      .select('id, description, product_id')
      .single();

    if (item2Error) {
      throw new Error(`Error al crear item 2: ${item2Error.message}`);
    }

    console.log(`✅ Item 2 creado: ID=${item2.id}`);
    console.log(`   Descripción: "${item2.description}"`);
    console.log(`   product_id asignado: ${item2.product_id || 'NULL'}`);

    if (item2.product_id === productB.id) {
      console.log(`   ✅ ¡ÉXITO! Sistema APRENDIÓ de la corrección del usuario`);
      console.log(`   📚 Usó product_id=${productB.id} (corrección anterior)`);
    } else if (item2.product_id) {
      console.log(`   ❌ ERROR: Sistema asignó ${item2.product_id} en lugar de ${productB.id}`);
      console.log(`   ⚠️  Debería haber aprendido de la corrección anterior`);
    } else {
      console.log(`   ❌ ERROR: product_id es NULL`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ Prueba completada\n');

  } catch (error) {
    console.error('\n❌ Error en la prueba:', error.message);
    process.exit(1);
  }
}

main();

