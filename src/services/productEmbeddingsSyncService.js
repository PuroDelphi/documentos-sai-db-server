const PineconeClient = require('../database/pineconeClient');
const EmbeddingsService = require('./embeddingsService');
const SupabaseClient = require('../database/supabaseClient');
const logger = require('../utils/logger');

/**
 * Servicio para sincronizar productos con Pinecone
 * Genera embeddings y los almacena en el índice vectorial
 */
class ProductEmbeddingsSyncService {
  constructor() {
    this.pineconeClient = new PineconeClient();
    this.embeddingsService = new EmbeddingsService();
    this.supabaseClient = new SupabaseClient();
    this.userUUID = process.env.USER_UUID;
    this.batchSize = parseInt(process.env.PINECONE_BATCH_SIZE || '50', 10);
    this.isRunning = false;
  }

  /**
   * Sincroniza todos los productos con Pinecone
   */
  async syncAllProducts() {
    if (this.isRunning) {
      logger.warn('Sincronización de embeddings ya está en ejecución');
      return;
    }

    try {
      this.isRunning = true;
      logger.info('=== INICIANDO SINCRONIZACIÓN DE PRODUCTOS A PINECONE ===');

      // Conectar a Pinecone
      await this.pineconeClient.connect();

      // Obtener todos los productos del usuario desde Supabase
      const { data: products, error } = await this.supabaseClient.client
        .from('invoice_products')
        .select('item_code, description, id')
        .eq('user_id', this.userUUID)
        .order('item_code');

      if (error) {
        throw new Error(`Error obteniendo productos: ${error.message}`);
      }

      if (!products || products.length === 0) {
        logger.info('No hay productos para sincronizar');
        return;
      }

      logger.info(`Encontrados ${products.length} productos para sincronizar`);

      // Procesar en lotes
      let totalSynced = 0;
      let totalErrors = 0;

      for (let i = 0; i < products.length; i += this.batchSize) {
        const batch = products.slice(i, i + this.batchSize);
        const batchNumber = Math.floor(i / this.batchSize) + 1;
        const totalBatches = Math.ceil(products.length / this.batchSize);

        logger.info(`Procesando lote ${batchNumber}/${totalBatches} (${batch.length} productos)...`);

        try {
          const synced = await this.syncProductBatch(batch);
          totalSynced += synced;
        } catch (error) {
          logger.error(`Error en lote ${batchNumber}:`, error);
          totalErrors += batch.length;
        }

        // Pausa entre lotes
        if (i + this.batchSize < products.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      logger.info('=== SINCRONIZACIÓN COMPLETADA ===');
      logger.info(`Total sincronizados: ${totalSynced}`);
      logger.info(`Total errores: ${totalErrors}`);

    } catch (error) {
      logger.error('Error en sincronización de productos a Pinecone:', error);
      throw error;
    } finally {
      this.isRunning = false;
      await this.pineconeClient.close();
    }
  }

  /**
   * Sincroniza un lote de productos
   * @param {Array} products - Lote de productos
   * @returns {Number} Cantidad de productos sincronizados
   */
  async syncProductBatch(products) {
    try {
      // Generar textos descriptivos
      const texts = products.map(product => 
        this.embeddingsService.generateProductText(product)
      );

      // Generar embeddings
      const embeddings = await this.embeddingsService.generateBatchEmbeddings(texts);

      // Preparar vectores para Pinecone
      const vectors = products.map((product, index) => ({
        id: `product_${product.item_code}`,
        values: embeddings[index],
        metadata: {
          item_code: product.item_code,
          description: product.description || '',
          supabase_id: product.id,
          user_id: this.userUUID,
          synced_at: new Date().toISOString(),
        },
      }));

      // Insertar en Pinecone
      await this.pineconeClient.upsert(vectors);

      return products.length;
    } catch (error) {
      logger.error('Error sincronizando lote de productos:', error);
      throw error;
    }
  }

  /**
   * Sincroniza un solo producto
   * @param {Object} product - Producto a sincronizar
   */
  async syncSingleProduct(product) {
    try {
      logger.info(`Sincronizando producto ${product.item_code} a Pinecone...`);

      // Conectar a Pinecone si no está conectado
      if (!this.pineconeClient.isConnected) {
        await this.pineconeClient.connect();
      }

      // Generar texto descriptivo
      const text = this.embeddingsService.generateProductText(product);

      // Generar embedding
      const embedding = await this.embeddingsService.generateEmbedding(text);

      // Preparar vector
      const vector = {
        id: `product_${product.item_code}`,
        values: embedding,
        metadata: {
          item_code: product.item_code,
          description: product.description || '',
          supabase_id: product.id,
          user_id: this.userUUID,
          synced_at: new Date().toISOString(),
        },
      };

      // Insertar en Pinecone
      await this.pineconeClient.upsert([vector]);

      logger.info(`✅ Producto ${product.item_code} sincronizado a Pinecone`);
    } catch (error) {
      logger.error(`Error sincronizando producto ${product.item_code}:`, error);
      throw error;
    }
  }
}

module.exports = ProductEmbeddingsSyncService;
