const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Servicio para generar embeddings usando la API de chatbotstools
 */
class EmbeddingsService {
  constructor() {
    this.apiUrl = process.env.EMBEDDINGS_API_URL || 'https://chatbotstools.asistentesautonomos.com/api/embeddings';
    this.apiKey = process.env.EMBEDDINGS_API_KEY;
    this.dimension = parseInt(process.env.EMBEDDINGS_DIMENSION || '512', 10);
  }

  /**
   * Valida la configuración del servicio
   */
  validateConfig() {
    if (!this.apiKey) {
      throw new Error('EMBEDDINGS_API_KEY no está configurado');
    }
  }

  /**
   * Genera embeddings para un texto
   * @param {String} text - Texto para generar embedding
   * @returns {Array} Vector de embeddings
   */
  async generateEmbedding(text) {
    try {
      this.validateConfig();

      if (!text || text.trim().length === 0) {
        throw new Error('El texto no puede estar vacío');
      }

      logger.debug(`Generando embedding para texto: "${text.substring(0, 50)}..."`);

      const response = await axios.post(
        this.apiUrl,
        {
          input: text.trim(),  // El servicio espera 'input' o 'prompt'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 segundos
        }
      );

      // Validar respuesta
      // El servicio puede retornar diferentes formatos
      logger.debug(`Respuesta del servicio: ${JSON.stringify(response.data).substring(0, 200)}...`);

      let embedding;

      if (response.data.embeddings && Array.isArray(response.data.embeddings)) {
        // Formato Llama/Ollama: { embeddings: [[...]] }
        embedding = response.data.embeddings[0];
      } else if (response.data.embedding) {
        // Formato: { embedding: [...] }
        embedding = response.data.embedding;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        // Formato OpenAI: { data: [{ embedding: [...] }] }
        embedding = response.data.data[0]?.embedding;
      } else if (Array.isArray(response.data)) {
        // Formato directo: [...]
        embedding = response.data;
      } else {
        logger.error(`Formato de respuesta no reconocido: ${JSON.stringify(response.data)}`);
        throw new Error('Respuesta inválida del servicio de embeddings');
      }

      if (!embedding || !Array.isArray(embedding)) {
        logger.error(`Embedding no es un array válido: ${typeof embedding}`);
        throw new Error('El embedding retornado no es un array válido');
      }

      // Validar dimensión
      if (embedding.length !== this.dimension) {
        logger.warn(`Dimensión del embedding (${embedding.length}) no coincide con la esperada (${this.dimension})`);
      }

      logger.debug(`✅ Embedding generado - Dimensión: ${embedding.length}`);

      return embedding;
    } catch (error) {
      if (error.response) {
        logger.error(`Error del servicio de embeddings (${error.response.status}):`, error.response.data);
        throw new Error(`Error del servicio de embeddings: ${error.response.data.detail || error.response.statusText}`);
      } else if (error.request) {
        logger.error('No se recibió respuesta del servicio de embeddings');
        throw new Error('No se pudo conectar con el servicio de embeddings');
      } else {
        logger.error('Error generando embedding:', error.message);
        throw error;
      }
    }
  }

  /**
   * Genera embeddings para múltiples textos en lote
   * @param {Array} texts - Array de textos
   * @returns {Array} Array de vectores de embeddings
   */
  async generateBatchEmbeddings(texts) {
    try {
      this.validateConfig();

      if (!texts || texts.length === 0) {
        return [];
      }

      logger.info(`Generando embeddings para ${texts.length} textos...`);

      // Procesar en lotes para evitar timeouts
      const batchSize = 10;
      const results = [];

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        
        logger.debug(`Procesando lote ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)}`);

        const batchPromises = batch.map(text => this.generateEmbedding(text));
        const batchResults = await Promise.all(batchPromises);
        
        results.push(...batchResults);

        // Pequeña pausa entre lotes para no saturar la API
        if (i + batchSize < texts.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      logger.info(`✅ ${results.length} embeddings generados exitosamente`);

      return results;
    } catch (error) {
      logger.error('Error generando embeddings en lote:', error);
      throw error;
    }
  }

  /**
   * Genera un texto descriptivo para un producto
   * Combina código y descripción para búsqueda semántica
   * @param {Object} product - Objeto producto con item_code y description
   * @returns {String} Texto descriptivo
   */
  generateProductText(product) {
    const parts = [];

    // Código del producto
    if (product.item_code) {
      parts.push(`Código: ${product.item_code}`);
    }

    // Descripción
    if (product.description) {
      parts.push(product.description.trim());
    }

    return parts.join(' - ');
  }
}

module.exports = EmbeddingsService;
