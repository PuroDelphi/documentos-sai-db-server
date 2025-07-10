#!/usr/bin/env node

const ThirdPartySyncService = require('../services/thirdPartySyncService');
const logger = require('../utils/logger');

/**
 * Script para sincronización manual de terceros
 * Uso: node src/scripts/syncThirdParties.js [full|incremental|stats]
 */

async function main() {
  const syncService = new ThirdPartySyncService();
  
  try {
    // Obtener comando de los argumentos
    const command = process.argv[2] || 'incremental';
    
    logger.info(`Iniciando script de sincronización de terceros - Comando: ${command}`);
    
    // Inicializar servicio
    await syncService.initialize();
    
    let result;
    
    switch (command.toLowerCase()) {
      case 'full':
        logger.info('Ejecutando sincronización completa...');
        result = await syncService.fullSync();
        logger.info(`Sincronización completa finalizada:`, result);
        break;
        
      case 'incremental':
        logger.info('Ejecutando sincronización incremental...');
        result = await syncService.incrementalSync();
        logger.info(`Sincronización incremental finalizada:`, result);
        break;
        
      case 'stats':
        logger.info('Obteniendo estadísticas de sincronización...');
        result = await syncService.getSyncStats();
        logger.info(`Estadísticas de sincronización:`, result);
        break;
        
      default:
        logger.error(`Comando no reconocido: ${command}`);
        logger.info('Comandos disponibles: full, incremental, stats');
        process.exit(1);
    }
    
    // Mostrar resultado final
    if (result) {
      console.log('\n=== RESULTADO DE SINCRONIZACIÓN ===');
      console.log(JSON.stringify(result, null, 2));
    }
    
    logger.info('Script de sincronización completado exitosamente');
    process.exit(0);
    
  } catch (error) {
    logger.error('Error en script de sincronización:', error);
    process.exit(1);
  } finally {
    await syncService.close();
  }
}

// Manejo de señales del sistema
process.on('SIGINT', async () => {
  logger.info('Recibida señal SIGINT, cerrando script...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Recibida señal SIGTERM, cerrando script...');
  process.exit(0);
});

// Ejecutar script
main().catch(error => {
  logger.error('Error fatal en script:', error);
  process.exit(1);
});
