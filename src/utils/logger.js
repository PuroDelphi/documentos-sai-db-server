const winston = require('winston');

/**
 * Logger con configuración por defecto
 * NOTA: El nivel de log y nombre del servicio se configuran desde appConfig
 * después de que se inicialice. Aquí usamos valores por defecto seguros.
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: process.env.SERVICE_NAME || 'supabase-firebird-sync' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

/**
 * Actualizar configuración del logger dinámicamente
 * Se llama desde appConfig después de cargar la configuración de Supabase
 * @param {string} logLevel - Nivel de log (debug, info, warn, error)
 * @param {string} serviceName - Nombre del servicio
 */
logger.updateConfig = function(logLevel, serviceName) {
  this.level = logLevel || 'info';
  this.defaultMeta = { service: serviceName || 'supabase-firebird-sync' };
  this.info(`Logger configurado: nivel=${logLevel}, servicio=${serviceName}`);
};

module.exports = logger;
