const Firebird = require('node-firebird');
const appConfig = require('../config/appConfig');
const logger = require('../utils/logger');

class FirebirdClient {
  constructor() {
    this.pool = null;
    this.isConnected = false;
  }

  /**
   * Inicializa el pool de conexiones de Firebird
   * Usa credenciales desde Supabase (vía appConfig)
   */
  async initialize() {
    return new Promise((resolve, reject) => {
      // Obtener credenciales desde Supabase (vía appConfig)
      const firebirdConfig = appConfig.getFirebirdCredentials();

      // Validar que la base de datos esté configurada
      if (!firebirdConfig.database) {
        const error = new Error('La ruta de la base de datos Firebird no está configurada en Supabase (invoice_config.firebird_database)');
        logger.error(error.message);
        reject(error);
        return;
      }

      logger.info(`Conectando a Firebird: ${firebirdConfig.database}`);

      Firebird.attach(firebirdConfig, (err, db) => {
        if (err) {
          logger.error('Error conectando a Firebird:', err);
          reject(err);
          return;
        }

        this.pool = db;
        this.isConnected = true;
        logger.info('✅ Conexión a Firebird establecida exitosamente');
        logger.info(`   Base de datos: ${firebirdConfig.database}`);
        logger.info(`   Host: ${firebirdConfig.host}:${firebirdConfig.port}`);
        resolve();
      });
    });
  }

  /**
   * Ejecuta una consulta SQL
   * @param {string} sql - La consulta SQL
   * @param {Array} params - Parámetros de la consulta
   * @returns {Promise<Array>} - Resultados de la consulta
   */
  async query(sql, params = []) {
    if (!this.isConnected) {
      throw new Error('No hay conexión a Firebird');
    }

    return new Promise((resolve, reject) => {
      this.pool.query(sql, params, (err, result) => {
        if (err) {
          logger.error('Error ejecutando consulta:', { sql, params, error: err });
          reject(err);
          return;
        }
        resolve(result);
      });
    });
  }

  /**
   * Ejecuta una transacción
   * @param {Function} callback - Función que contiene las operaciones de la transacción
   * @returns {Promise} - Resultado de la transacción
   */
  async transaction(callback) {
    if (!this.isConnected) {
      throw new Error('No hay conexión a Firebird');
    }

    return new Promise((resolve, reject) => {
      this.pool.transaction(Firebird.ISOLATION_READ_COMMITTED, async (err, transaction) => {
        if (err) {
          logger.error('Error iniciando transacción:', err);
          reject(err);
          return;
        }

        try {
          const result = await callback(transaction);
          
          transaction.commit((commitErr) => {
            if (commitErr) {
              logger.error('Error haciendo commit:', commitErr);
              reject(commitErr);
              return;
            }
            resolve(result);
          });
        } catch (error) {
          transaction.rollback((rollbackErr) => {
            if (rollbackErr) {
              logger.error('Error haciendo rollback:', rollbackErr);
            }
            reject(error);
          });
        }
      });
    });
  }

  /**
   * Cierra la conexión
   */
  async close() {
    if (this.pool) {
      return new Promise((resolve) => {
        this.pool.detach((err) => {
          if (err) {
            logger.error('Error cerrando conexión Firebird:', err);
          } else {
            logger.info('Conexión Firebird cerrada');
          }
          this.isConnected = false;
          resolve();
        });
      });
    }
  }
}

module.exports = FirebirdClient;
