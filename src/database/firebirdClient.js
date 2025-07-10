const Firebird = require('node-firebird');
const config = require('../config');
const logger = require('../utils/logger');

class FirebirdClient {
  constructor() {
    this.pool = null;
    this.isConnected = false;
  }

  /**
   * Inicializa el pool de conexiones de Firebird
   */
  async initialize() {
    return new Promise((resolve, reject) => {
      Firebird.attach(config.firebird, (err, db) => {
        if (err) {
          logger.error('Error conectando a Firebird:', err);
          reject(err);
          return;
        }
        
        this.pool = db;
        this.isConnected = true;
        logger.info('Conexión a Firebird establecida exitosamente');
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
