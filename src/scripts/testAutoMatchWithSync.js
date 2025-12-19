/**
 * Script de prueba completo para auto-emparejamiento de productos
 * 
 * Este script:
 * 1. Sincroniza productos desde Firebird a Supabase
 * 2. Crea factura de prueba tipo EA
 * 3. Inserta items con descripciones similares
 * 4. Verifica auto-emparejamiento
 * 
 * Uso:
 *   node src/scripts/testAutoMatchWithSync.js
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import Firebird from 'node-firebird';

// Cargar variables de entorno
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const userUUID = process.env.USER_UUID;

const firebirdConfig = {
  host: process.env.FIREBIRD_HOST || 'localhost',
  port: parseInt(process.env.FIREBIRD_PORT) || 3050,
  database: process.env.FIREBIRD_DATABASE,
  user: process.env.FIREBIRD_USER || 'SYSDBA',
  password: process.env.FIREBIRD_PASSWORD || 'masterkey',
  lowercase_keys: false,
  role: null,
  pageSize: 4096
};

if (!supabaseUrl || !supabaseKey || !userUUID || !firebirdConfig.database) {
  console.error('❌ Error: Faltan variables de entorno requeridas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncProductsFromFirebird() {
  return new Promise((resolve, reject) => {
    console.log('\n📦 PASO 1: Sincronizar productos desde Firebird\n');
    
    Firebird.attach(firebirdConfig, (err, db) => {
      if (err) {
        reject(new Error(`Error conectando a Firebird: ${err.message}`));
        return;
      }

      // Obtener primeros 5 productos
      const query = `
        SELECT FIRST 5
          ID_N,
          CODIGO,
          DESCRIPCION,
          VERSION
        FROM ITEM
        WHERE CODIGO IS NOT NULL
        ORDER BY ID_N
      `;

      db.query(query, [], async (err, result) => {
        db.detach();

        if (err) {
          reject(new Error(`Error consultando productos: ${err.message}`));
          return;
        }

        if (!result || result.length === 0) {
          reject(new Error('No se encontraron productos en Firebird'));
          return;
        }

        console.log(`✅ Encontrados ${result.length} productos en Firebird`);

        // Insertar en Supabase
        const products = result.map(row => ({
          id_n: row.ID_N,
          item_code: row.CODIGO,
          description: row.DESCRIPCION,
          firebird_version: row.VERSION,
          user_id: userUUID,
          sync_status: 'SINCRONIZADO',
          last_sync: new Date().toISOString()
        }));

        const { data, error } = await supabase
          .from('invoice_products')
          .upsert(products, { onConflict: 'id_n,user_id' })
          .select('id, item_code, description');

        if (error) {
          reject(new Error(`Error insertando productos en Supabase: ${error.message}`));
          return;
        }

        console.log(`✅ ${data.length} productos sincronizados en Supabase:`);
        data.forEach((p, i) => {
          console.log(`   ${i + 1}. [${p.item_code}] ${p.description}`);
        });

        resolve(data);
      });
    });
  });
}

async function testAutoMatch(products) {
  console.log('\n📄 PASO 2: Crear factura de prueba tipo inventario\n');

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      user_id: userUUID,
      invoice_type: 'inventario',
      invoice_number: `TEST-AUTO-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      num_identificacion: '900123456-7',
      billing_name: 'PROVEEDOR PRUEBA AUTO-MATCH',
      total: 100000,
      estado: 'PENDIENTE'
    })
    .select()
    .single();

  if (invoiceError) {
    throw new Error(`Error creando factura: ${invoiceError.message}`);
  }

  console.log(`✅ Factura creada: ID=${invoice.id}, Número=${invoice.invoice_number}`);

  console.log('\n🔍 PASO 3: Insertar items con descripciones similares\n');

  const testItems = products.slice(0, 3).map((product, i) => {
    const variations = [
      product.description.toUpperCase(),
      product.description.toLowerCase(),
      product.description.replace(/\s+/g, ' ').trim(),
    ];
    
    return {
      invoice_id: invoice.id,
      user_id: userUUID,
      description: variations[i % variations.length],
      quantity: (i + 1) * 10,
      unit_price: 5000,
      total_price: (i + 1) * 10 * 5000,
    };
  });

  console.log('Items a insertar:');
  testItems.forEach((item, i) => {
    console.log(`   ${i + 1}. "${item.description}"`);
  });

  const { data: insertedItems, error: itemsError } = await supabase
    .from('invoice_items')
    .insert(testItems)
    .select('id, description, product_id, invoice_products(item_code, description)');

  if (itemsError) {
    throw new Error(`Error insertando items: ${itemsError.message}`);
  }

  console.log('\n✅ PASO 4: Verificar auto-emparejamiento\n');

  let successCount = 0;
  insertedItems.forEach((item, i) => {
    const matched = item.product_id !== null;
    console.log(`${matched ? '✅' : '❌'} Item ${i + 1}:`);
    console.log(`   Descripción: "${item.description}"`);
    if (matched) {
      console.log(`   ✓ Product ID: ${item.product_id}`);
      console.log(`   ✓ Código: ${item.invoice_products.item_code}`);
      successCount++;
    }
  });

  console.log(`\n📊 Tasa de éxito: ${((successCount / insertedItems.length) * 100).toFixed(1)}%\n`);
}

async function main() {
  try {
    const products = await syncProductsFromFirebird();
    await testAutoMatch(products);
    console.log('🎉 Prueba completada exitosamente\n');
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  }
}

main();

