require('dotenv').config();
const PineconeClient = require('../database/pineconeClient');
const EmbeddingsService = require('../services/embeddingsService');
const logger = require('../utils/logger');

/**
 * Script para buscar productos por similitud semántica
 */
async function searchProducts() {
  const pineconeClient = new PineconeClient();
  const embeddingsService = new EmbeddingsService();

  try {
    // Obtener query de los argumentos de línea de comandos
    const query = process.argv.slice(2).join(' ');

    if (!query) {
      logger.error('❌ Debes proporcionar un texto de búsqueda');
      logger.info('Uso: npm run search-products -- <texto de búsqueda>');
      logger.info('Ejemplo: npm run search-products -- tornillo acero inoxidable');
      process.exit(1);
    }

    logger.info(`🔍 Buscando productos similares a: "${query}"\n`);

    // Conectar a Pinecone
    await pineconeClient.connect();

    // Generar embedding para la query
    logger.info('Generando embedding para la búsqueda...');
    const queryEmbedding = await embeddingsService.generateEmbedding(query);

    // Buscar en Pinecone
    logger.info('Buscando en Pinecone...\n');
    const results = await pineconeClient.query(queryEmbedding, 10);

    if (results.length === 0) {
      logger.info('❌ No se encontraron productos similares');
    } else {
      logger.info(`✅ Encontrados ${results.length} productos similares:\n`);
      
      results.forEach((result, index) => {
        const score = (result.score * 100).toFixed(2);
        const metadata = result.metadata || {};
        
        logger.info(`${index + 1}. Código: ${metadata.item_code || 'N/A'}`);
        logger.info(`   Descripción: ${metadata.description || 'N/A'}`);
        logger.info(`   Similitud: ${score}%`);
        logger.info(`   Sincronizado: ${metadata.synced_at || 'N/A'}`);
        logger.info('');
      });
    }

    await pineconeClient.close();

  } catch (error) {
    logger.error('❌ Error en búsqueda:', error);
    process.exit(1);
  }
}

// Ejecutar búsqueda
if (require.main === module) {
  searchProducts()
    .then(() => {
      logger.info('Búsqueda finalizada');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Error:', error);
      process.exit(1);
    });
}

module.exports = searchProducts;
