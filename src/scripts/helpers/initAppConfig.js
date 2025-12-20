/**
 * Helper para inicializar appConfig en scripts de prueba
 * Esto es necesario porque FirebirdClient ahora obtiene credenciales desde appConfig
 */

const appConfig = require('../../config/appConfig');
const logger = require('../../utils/logger');

/**
 * Inicializa appConfig para scripts de prueba
 * @returns {Promise<void>}
 */
async function initAppConfig() {
  try {
    logger.info('🔧 Inicializando configuración de la aplicación...');
    await appConfig.initialize();
    logger.info('✅ Configuración inicializada correctamente');
  } catch (error) {
    logger.error('❌ Error inicializando configuración:', error);
    throw error;
  }
}

module.exports = { initAppConfig };

