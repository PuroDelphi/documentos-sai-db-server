require('dotenv').config();
const ProductEmbeddingsSyncService = require('../services/productEmbeddingsSyncService');
const PineconeClient = require('../database/pineconeClient');
const EmbeddingsService = require('../services/embeddingsService');
const logger = require('../utils/logger');

/**
 * Script para probar la sincronización de productos a Pinecone
 */
async function testPineconeSync() {
  try {
    logger.info('=== TEST DE SINCRONIZACIÓN A PINECONE ===\n');

    // 1. Verificar configuración
    logger.info('1. VERIFICANDO CONFIGURACIÓN:');
    logger.info(`   PINECONE_API_KEY: ${process.env.PINECONE_API_KEY ? '✅ Configurado' : '❌ No configurado'}`);
    logger.info(`   PINECONE_INDEX_NAME: ${process.env.PINECONE_INDEX_NAME || '❌ No configurado'}`);
    logger.info(`   PINECONE_ENVIRONMENT: ${process.env.PINECONE_ENVIRONMENT || '❌ No configurado'}`);
    logger.info(`   PINECONE_NAMESPACE: ${process.env.PINECONE_NAMESPACE || process.env.USER_UUID || '❌ No configurado'}`);
    logger.info(`   EMBEDDINGS_API_KEY: ${process.env.EMBEDDINGS_API_KEY ? '✅ Configurado' : '❌ No configurado'}`);
    logger.info(`   EMBEDDINGS_API_URL: ${process.env.EMBEDDINGS_API_URL || 'https://chatbotstools.asistentesautonomos.com/api/embeddings'}`);
    logger.info(`   EMBEDDINGS_DIMENSION: ${process.env.EMBEDDINGS_DIMENSION || '512'}`);
    logger.info(`   PINECONE_BATCH_SIZE: ${process.env.PINECONE_BATCH_SIZE || '50'}`);

    // 2. Probar servicio de embeddings
    logger.info('\n2. PROBANDO SERVICIO DE EMBEDDINGS:');
    const embeddingsService = new EmbeddingsService();
    
    try {
      const testText = 'Código: 12345 - Producto de prueba para embeddings';
      logger.info(`   Generando embedding para: "${testText}"`);
      
      const embedding = await embeddingsService.generateEmbedding(testText);
      
      logger.info(`   ✅ Embedding generado exitosamente`);
      logger.info(`   Dimensión: ${embedding.length}`);
      logger.info(`   Primeros 5 valores: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
    } catch (error) {
      logger.error(`   ❌ Error generando embedding: ${error.message}`);
      return;
    }

    // 3. Probar conexión a Pinecone
    logger.info('\n3. PROBANDO CONEXIÓN A PINECONE:');
    const pineconeClient = new PineconeClient();
    
    try {
      await pineconeClient.connect();
      logger.info('   ✅ Conexión a Pinecone exitosa');
    } catch (error) {
      logger.error(`   ❌ Error conectando a Pinecone: ${error.message}`);
      return;
    }

    // 4. Probar inserción de vector de prueba
    logger.info('\n4. PROBANDO INSERCIÓN DE VECTOR:');
    try {
      const userUUID = process.env.USER_UUID;
      const testVector = {
        id: `product_${userUUID}_12345`,
        values: await embeddingsService.generateEmbedding('Código: 12345 - Producto de prueba'),
        metadata: {
          item_code: '12345',
          description: 'Producto de prueba',
          user_id: userUUID,
          test: true,
          synced_at: new Date().toISOString(),
        },
      };

      await pineconeClient.upsert([testVector]);
      logger.info('   ✅ Vector de prueba insertado exitosamente');
    } catch (error) {
      logger.error(`   ❌ Error insertando vector: ${error.message}`);
      await pineconeClient.close();
      return;
    }

    // 5. Probar búsqueda
    logger.info('\n5. PROBANDO BÚSQUEDA:');
    try {
      const queryEmbedding = await embeddingsService.generateEmbedding('producto prueba');
      const results = await pineconeClient.query(queryEmbedding, 5);
      
      logger.info(`   ✅ Búsqueda exitosa - ${results.length} resultados encontrados`);
      
      if (results.length > 0) {
        logger.info('   Resultados:');
        results.forEach((result, index) => {
          logger.info(`   ${index + 1}. ID: ${result.id}, Score: ${result.score?.toFixed(4)}`);
          logger.info(`      Metadata: ${JSON.stringify(result.metadata)}`);
        });
      }
    } catch (error) {
      logger.error(`   ❌ Error en búsqueda: ${error.message}`);
    }

    // 6. Limpiar vector de prueba
    logger.info('\n6. LIMPIANDO VECTOR DE PRUEBA:');
    try {
      const userUUID = process.env.USER_UUID;
      await pineconeClient.delete([`product_${userUUID}_12345`]);
      logger.info('   ✅ Vector de prueba eliminado');
    } catch (error) {
      logger.error(`   ❌ Error eliminando vector: ${error.message}`);
    }

    await pineconeClient.close();

    // 7. Preguntar si desea sincronizar todos los productos
    logger.info('\n7. SINCRONIZACIÓN COMPLETA:');
    logger.info('   Para sincronizar todos los productos, ejecuta:');
    logger.info('   npm run sync-products-to-pinecone');

    logger.info('\n=== TEST COMPLETADO EXITOSAMENTE ===');

  } catch (error) {
    logger.error('Error en test de Pinecone:', error);
    process.exit(1);
  }
}

// Ejecutar test
if (require.main === module) {
  testPineconeSync()
    .then(() => {
      logger.info('\nTest finalizado');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Error en test:', error);
      process.exit(1);
    });
}

module.exports = testPineconeSync;
