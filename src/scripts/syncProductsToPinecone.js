require('dotenv').config();
const ProductEmbeddingsSyncService = require('../services/productEmbeddingsSyncService');
const logger = require('../utils/logger');

/**
 * Script para sincronizar todos los productos a Pinecone
 */
async function syncProductsToPinecone() {
  const syncService = new ProductEmbeddingsSyncService();

  try {
    logger.info('Iniciando sincronización de productos a Pinecone...');
    
    await syncService.syncAllProducts();
    
    logger.info('✅ Sincronización completada exitosamente');
    
  } catch (error) {
    logger.error('❌ Error en sincronización:', error);
    process.exit(1);
  }
}

// Ejecutar sincronización
if (require.main === module) {
  syncProductsToPinecone()
    .then(() => {
      logger.info('Proceso finalizado');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Error:', error);
      process.exit(1);
    });
}

module.exports = syncProductsToPinecone;
