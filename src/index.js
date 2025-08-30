const SyncService = require('./services/syncService');
const logger = require('./utils/logger');
const { validateAndGetUserUUID } = require('./utils/userValidation');

// Importar Express solo si se necesita
let express = null;
let createSyncEndpoints = null;

try {
  express = require('express');
  createSyncEndpoints = require('./api/syncEndpoints');
} catch (error) {
  // Express no está instalado, continuar sin API
  logger.debug('Express no disponible, API de control deshabilitada');
}

// Crear directorio de logs si no existe
const fs = require('fs');
if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs');
}

const syncService = new SyncService();

// Manejo de señales del sistema
process.on('SIGINT', async () => {
  logger.info('Recibida señal SIGINT, cerrando servicio...');
  await syncService.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Recibida señal SIGTERM, cerrando servicio...');
  await syncService.stop();
  process.exit(0);
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  logger.error('Error no capturado:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Promesa rechazada no manejada:', { reason, promise });
  process.exit(1);
});

// Iniciar el servicio
async function main() {
  try {
    logger.info('Iniciando servicio de sincronización Supabase-Firebird...');

    // Validar configuración de usuario (obligatorio)
    validateAndGetUserUUID();

    await syncService.start();

    // Iniciar servidor API opcional (solo si se especifica puerto y Express está disponible)
    const apiPort = process.env.API_PORT;
    if (apiPort && express && createSyncEndpoints) {
      const app = express();
      app.use(express.json());

      // Configurar endpoints de sincronización
      app.use('/api/sync', createSyncEndpoints(syncService));

      // Endpoint de salud
      app.get('/health', (req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
      });

      app.listen(apiPort, () => {
        logger.info(`API de control disponible en http://localhost:${apiPort}`);
        logger.info('Endpoints disponibles:');
        logger.info('  GET  /health - Estado del servicio');
        logger.info('  GET  /api/sync/status - Estado de sincronización');
        logger.info('  POST /api/sync/third-parties - Sincronización manual de terceros');
        logger.info('  GET  /api/sync/third-parties/stats - Estadísticas de terceros');
        logger.info('  POST /api/sync/chart-of-accounts - Sincronización manual de cuentas');
        logger.info('  GET  /api/sync/chart-of-accounts/stats - Estadísticas de cuentas');
        logger.info('  GET  /api/sync/chart-of-accounts/config - Configuración de cuentas');
        logger.info('  POST /api/sync/products - Sincronización manual de productos');
        logger.info('  GET  /api/sync/products/stats - Estadísticas de productos');
        logger.info('  GET  /api/sync/products/config - Configuración de productos');
      });
    } else if (apiPort && !express) {
      logger.warn('API_PORT configurado pero Express no está instalado. Ejecuta: npm install express');
    }

    logger.info('Servicio iniciado exitosamente. Presiona Ctrl+C para detener.');
  } catch (error) {
    logger.error('Error fatal iniciando servicio:', error);
    process.exit(1);
  }
}

main();
