const { Pinecone } = require('@pinecone-database/pinecone');
const logger = require('../utils/logger');

/**
 * Cliente para interactuar con Pinecone
 * Maneja la conexión y operaciones con el índice de vectores
 */
class PineconeClient {
  constructor() {
    this.apiKey = process.env.PINECONE_API_KEY;
    this.indexName = process.env.PINECONE_INDEX_NAME;
    this.environment = process.env.PINECONE_ENVIRONMENT;
    this.namespace = process.env.PINECONE_NAMESPACE || process.env.USER_UUID;
    
    this.client = null;
    this.index = null;
    this.isConnected = false;
  }

  /**
   * Valida la configuración de Pinecone
   */
  validateConfig() {
    const errors = [];

    if (!this.apiKey) {
      errors.push('PINECONE_API_KEY no está configurado');
    }

    if (!this.indexName) {
      errors.push('PINECONE_INDEX_NAME no está configurado');
    }

    if (!this.namespace) {
      errors.push('PINECONE_NAMESPACE no está configurado y USER_UUID tampoco');
    }

    if (errors.length > 0) {
      throw new Error(`Configuración de Pinecone inválida:\n${errors.join('\n')}`);
    }
  }

  /**
   * Conecta con Pinecone
   */
  async connect() {
    try {
      this.validateConfig();

      logger.info('Conectando a Pinecone...');
      
      this.client = new Pinecone({
        apiKey: this.apiKey,
      });

      // Obtener el índice
      this.index = this.client.index(this.indexName);

      this.isConnected = true;
      logger.info(`✅ Conectado a Pinecone - Índice: ${this.indexName}, Namespace: ${this.namespace}`);
      
      return true;
    } catch (error) {
      logger.error('Error conectando a Pinecone:', error);
      throw error;
    }
  }

  /**
   * Inserta o actualiza vectores en Pinecone
   * @param {Array} vectors - Array de objetos con id, values, metadata
   */
  async upsert(vectors) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      if (!vectors || vectors.length === 0) {
        logger.warn('No hay vectores para insertar en Pinecone');
        return { upsertedCount: 0 };
      }

      logger.info(`Insertando ${vectors.length} vectores en Pinecone...`);

      const result = await this.index.namespace(this.namespace).upsert(vectors);

      // La respuesta puede ser undefined o un objeto con upsertedCount
      const count = result?.upsertedCount || vectors.length;
      logger.info(`✅ ${count} vectores insertados en Pinecone`);

      return { upsertedCount: count };
    } catch (error) {
      logger.error('Error insertando vectores en Pinecone:', error);
      throw error;
    }
  }

  /**
   * Busca vectores similares en Pinecone
   * @param {Array} vector - Vector de búsqueda
   * @param {Number} topK - Número de resultados a retornar
   * @param {Object} filter - Filtros de metadata
   */
  async query(vector, topK = 10, filter = {}) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const queryRequest = {
        vector,
        topK,
        includeMetadata: true,
        includeValues: false,
      };

      if (Object.keys(filter).length > 0) {
        queryRequest.filter = filter;
      }

      const result = await this.index.namespace(this.namespace).query(queryRequest);

      logger.info(`✅ Búsqueda en Pinecone completada - ${result.matches?.length || 0} resultados`);
      
      return result.matches || [];
    } catch (error) {
      logger.error('Error buscando en Pinecone:', error);
      throw error;
    }
  }

  /**
   * Elimina vectores de Pinecone
   * @param {Array} ids - Array de IDs a eliminar
   */
  async delete(ids) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      if (!ids || ids.length === 0) {
        logger.warn('No hay IDs para eliminar de Pinecone');
        return;
      }

      await this.index.namespace(this.namespace).deleteMany(ids);

      logger.info(`✅ ${ids.length} vectores eliminados de Pinecone`);
    } catch (error) {
      logger.error('Error eliminando vectores de Pinecone:', error);
      throw error;
    }
  }

  /**
   * Cierra la conexión con Pinecone
   */
  async close() {
    if (this.isConnected) {
      this.client = null;
      this.index = null;
      this.isConnected = false;
      logger.info('Conexión con Pinecone cerrada');
    }
  }
}

module.exports = PineconeClient;
