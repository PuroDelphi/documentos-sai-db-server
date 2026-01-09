const appConfig = require('./config/appConfig');
const SyncService = require('./services/syncService');
const logger = require('./utils/logger');

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

let syncService = null;

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
  logger.error('Stack trace:', error.stack);
  // NO cerrar el servicio inmediatamente, solo registrar el error
  // El servicio puede seguir funcionando para otros procesos
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Promesa rechazada no manejada:', { reason, promise });
  // NO cerrar el servicio inmediatamente, solo registrar el error
});

// Iniciar el servicio
async function main() {
  try {
    logger.info('='.repeat(70));
    logger.info('INICIANDO SERVICIO DE SINCRONIZACIÓN SUPABASE-FIREBIRD');
    logger.info('='.repeat(70));
    logger.info(`Directorio de trabajo: ${process.cwd()}`);
    logger.info(`Versión de Node.js: ${process.version}`);
    logger.info(`Plataforma: ${process.platform}`);
    logger.info(`Arquitectura: ${process.arch}`);
    logger.info('='.repeat(70));

    // Inicializar configuración de la aplicación
    logger.info('Paso 1/3: Inicializando configuración...');
    await appConfig.initialize();
    logger.info('✅ Configuración inicializada correctamente');

    // Crear instancia del servicio de sincronización
    logger.info('Paso 2/3: Creando instancia del servicio de sincronización...');
    const SyncService = require('./services/syncService');
    syncService = new SyncService();
    logger.info('✅ Instancia del servicio creada');

    logger.info('Paso 3/3: Iniciando servicio de sincronización...');
    await syncService.start();
    logger.info('✅ Servicio de sincronización iniciado');

    // Iniciar servidor API opcional (solo si se especifica puerto y Express está disponible)
    const apiPort = appConfig.get('api_port');
    if (apiPort && express && createSyncEndpoints) {
      logger.info(`Iniciando API de control en puerto ${apiPort}...`);
      const app = express();
      app.use(express.json());

      // Configurar endpoints de sincronización
      app.use('/api/sync', createSyncEndpoints(syncService));

      // Endpoint de salud
      app.get('/health', (req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
      });

      // Intentar iniciar el servidor con puertos alternativos
      const alternativePorts = [apiPort, apiPort + 1, apiPort + 2, apiPort + 3];
      let serverStarted = false;

      for (const port of alternativePorts) {
        try {
          await new Promise((resolve, reject) => {
            const server = app.listen(port)
              .on('listening', () => {
                serverStarted = true;
                logger.info(`✅ API de control disponible en http://localhost:${port}`);
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
                resolve();
              })
              .on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                  logger.warn(`⚠️  Puerto ${port} ya está en uso, intentando con el siguiente...`);
                  reject(err);
                } else {
                  logger.error(`Error iniciando API en puerto ${port}:`, err);
                  reject(err);
                }
              });
          });
          break; // Si llegamos aquí, el servidor se inició correctamente
        } catch (error) {
          // Continuar con el siguiente puerto
          continue;
        }
      }

      if (!serverStarted) {
        logger.warn('⚠️  No se pudo iniciar la API de control después de intentar con 4 puertos');
        logger.warn('⚠️  El servicio continuará funcionando sin API de control');
      }
    } else if (apiPort && !express) {
      logger.warn('⚠️  API_PORT configurado pero Express no está instalado. Ejecuta: npm install express');
    }

    logger.info('='.repeat(70));
    logger.info('✅ SERVICIO INICIADO EXITOSAMENTE');
    logger.info('='.repeat(70));
    logger.info('El servicio está ejecutándose en segundo plano.');
    logger.info('Presiona Ctrl+C para detener (solo en modo consola).');
    logger.info('='.repeat(70));
  } catch (error) {
    logger.error('='.repeat(70));
    logger.error('❌ ERROR FATAL INICIANDO SERVICIO');
    logger.error('='.repeat(70));
    logger.error('Error:', error.message);
    logger.error('Stack trace:', error.stack);
    logger.error('='.repeat(70));
    logger.error('El servicio se cerrará en 5 segundos...');
    logger.error('Revisa los logs en la carpeta logs/ para más detalles.');
    logger.error('='.repeat(70));

    // Esperar 5 segundos antes de cerrar para que Windows pueda leer el error
    setTimeout(() => {
      process.exit(1);
    }, 5000);
  }
}

main();
