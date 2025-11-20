const SupabaseClient = require('../database/supabaseClient');
const logger = require('../utils/logger');

/**
 * Script para diagnosticar problemas de duplicados y facturas pendientes
 */
async function diagnosticIssues() {
  const supabaseClient = new SupabaseClient();
  
  try {
    logger.info('=== DIAGNÓSTICO DE PROBLEMAS ===');
    
    // 1. Verificar facturas aprobadas pendientes
    logger.info('\n1. VERIFICANDO FACTURAS APROBADAS PENDIENTES:');
    const pendingInvoices = await supabaseClient.getPendingApprovedInvoices();
    
    logger.info(`   Total de facturas aprobadas pendientes: ${pendingInvoices.length}`);
    
    if (pendingInvoices.length > 0) {
      logger.info('   Detalles de facturas pendientes:');
      pendingInvoices.forEach((inv, index) => {
        logger.info(`   ${index + 1}. ID: ${inv.id}, Número: ${inv.invoice_number}, Fecha: ${inv.date}`);
        logger.info(`      Estado: ${inv.estado}, Respuesta: ${inv.service_response || 'NULL'}`);
        logger.info(`      User ID: ${inv.user_id}`);
      });
    }
    
    // 2. Verificar duplicados en terceros
    logger.info('\n2. VERIFICANDO DUPLICADOS EN TERCEROS:');
    const { data: thirdPartyDuplicates, error: tpError } = await supabaseClient.client
      .from('invoice_third_parties')
      .select('id_n, user_id, count')
      .limit(1000);
    
    if (tpError) {
      logger.error(`   Error consultando terceros: ${tpError.message}`);
    } else {
      // Agrupar por id_n para encontrar duplicados
      const grouped = {};
      thirdPartyDuplicates.forEach(tp => {
        if (!grouped[tp.id_n]) {
          grouped[tp.id_n] = [];
        }
        grouped[tp.id_n].push(tp.user_id);
      });
      
      const duplicates = Object.entries(grouped).filter(([_, users]) => users.length > 1);
      
      if (duplicates.length > 0) {
        logger.warn(`   ⚠️  Encontrados ${duplicates.length} id_n con múltiples usuarios:`);
        duplicates.slice(0, 10).forEach(([id_n, users]) => {
          logger.warn(`      ${id_n}: ${users.length} usuarios diferentes`);
        });
      } else {
        logger.info('   ✅ No se encontraron duplicados entre usuarios');
      }
    }
    
    // 3. Verificar duplicados en productos
    logger.info('\n3. VERIFICANDO DUPLICADOS EN PRODUCTOS:');
    const { data: productDuplicates, error: prodError } = await supabaseClient.client
      .from('invoice_products')
      .select('item_code, user_id, count')
      .limit(1000);
    
    if (prodError) {
      logger.error(`   Error consultando productos: ${prodError.message}`);
    } else {
      // Agrupar por item_code para encontrar duplicados
      const grouped = {};
      productDuplicates.forEach(prod => {
        if (!grouped[prod.item_code]) {
          grouped[prod.item_code] = [];
        }
        grouped[prod.item_code].push(prod.user_id);
      });
      
      const duplicates = Object.entries(grouped).filter(([_, users]) => users.length > 1);
      
      if (duplicates.length > 0) {
        logger.warn(`   ⚠️  Encontrados ${duplicates.length} item_code con múltiples usuarios:`);
        duplicates.slice(0, 10).forEach(([item_code, users]) => {
          logger.warn(`      ${item_code}: ${users.length} usuarios diferentes`);
        });
      } else {
        logger.info('   ✅ No se encontraron duplicados entre usuarios');
      }
    }
    
    // 4. Verificar configuración de recuperación
    logger.info('\n4. VERIFICANDO CONFIGURACIÓN DE RECUPERACIÓN:');
    logger.info(`   ENABLE_INVOICE_RECOVERY: ${process.env.ENABLE_INVOICE_RECOVERY || 'true (por defecto)'}`);
    logger.info(`   RECOVERY_BATCH_SIZE: ${process.env.RECOVERY_BATCH_SIZE || '10 (por defecto)'}`);
    
    // 5. Verificar USER_UUID
    logger.info('\n5. VERIFICANDO USER_UUID:');
    logger.info(`   USER_UUID configurado: ${process.env.USER_UUID || 'NO CONFIGURADO'}`);
    logger.info(`   UUID en uso: ${supabaseClient.userUUID}`);
    
    logger.info('\n=== DIAGNÓSTICO COMPLETADO ===');
    
    // Recomendaciones
    logger.info('\n💡 RECOMENDACIONES:');
    
    if (pendingInvoices.length > 0) {
      logger.info('\n📋 FACTURAS PENDIENTES:');
      logger.info('   - Hay facturas aprobadas que no se han sincronizado');
      logger.info('   - El sistema debería procesarlas automáticamente al iniciar');
      logger.info('   - Verifica que ENABLE_INVOICE_RECOVERY=true en .env');
      logger.info('   - Reinicia el servicio para que las procese');
    }
    
    logger.info('\n🔑 PROBLEMA DE DUPLICADOS:');
    logger.info('   - Las restricciones UNIQUE en Supabase deben incluir user_id');
    logger.info('   - Ejecuta el siguiente SQL en Supabase SQL Editor:');
    logger.info('');
    logger.info('   -- Para invoice_third_parties:');
    logger.info('   ALTER TABLE invoice_third_parties DROP CONSTRAINT IF EXISTS invoice_third_parties_id_n_key;');
    logger.info('   ALTER TABLE invoice_third_parties ADD CONSTRAINT invoice_third_parties_id_n_user_id_key UNIQUE (id_n, user_id);');
    logger.info('');
    logger.info('   -- Para invoice_products:');
    logger.info('   ALTER TABLE invoice_products DROP CONSTRAINT IF EXISTS invoice_products_item_code_key;');
    logger.info('   ALTER TABLE invoice_products ADD CONSTRAINT invoice_products_item_code_user_id_key UNIQUE (item_code, user_id);');
    logger.info('');
    logger.info('   -- Para invoice_chart_of_accounts:');
    logger.info('   ALTER TABLE invoice_chart_of_accounts DROP CONSTRAINT IF EXISTS invoice_chart_of_accounts_account_code_key;');
    logger.info('   ALTER TABLE invoice_chart_of_accounts ADD CONSTRAINT invoice_chart_of_accounts_account_code_user_id_key UNIQUE (account_code, user_id);');
    
    await supabaseClient.close();
    
  } catch (error) {
    logger.error('Error en diagnóstico:', error);
  }
}

// Ejecutar diagnóstico
if (require.main === module) {
  diagnosticIssues()
    .then(() => {
      logger.info('\nDiagnóstico finalizado');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Error en diagnóstico:', error);
      process.exit(1);
    });
}

module.exports = diagnosticIssues;
