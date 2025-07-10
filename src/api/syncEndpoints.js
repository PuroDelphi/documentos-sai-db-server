const express = require('express');
const logger = require('../utils/logger');

/**
 * Crea endpoints de API para control manual de sincronización
 * @param {Object} syncService - Instancia del servicio de sincronización
 * @returns {express.Router} - Router con endpoints configurados
 */
function createSyncEndpoints(syncService) {
  const router = express.Router();

  /**
   * GET /api/sync/status
   * Obtiene el estado general del servicio
   */
  router.get('/status', async (req, res) => {
    try {
      const thirdPartiesStats = await syncService.getThirdPartiesStats();
      const chartOfAccountsStats = await syncService.getChartOfAccountsStats();
      const chartOfAccountsConfig = syncService.getChartOfAccountsConfig();
      const productsStats = await syncService.getProductsStats();
      const productsConfig = syncService.getProductsConfig();

      res.json({
        success: true,
        data: {
          service: 'running',
          thirdParties: thirdPartiesStats,
          chartOfAccounts: chartOfAccountsStats,
          chartOfAccountsConfig: chartOfAccountsConfig,
          products: productsStats,
          productsConfig: productsConfig,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error obteniendo estado:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/sync/third-parties
   * Ejecuta sincronización manual de terceros
   */
  router.post('/third-parties', async (req, res) => {
    try {
      const { fullSync = false } = req.body;
      
      logger.info(`Sincronización manual solicitada (completa: ${fullSync})`);
      
      const result = await syncService.manualThirdPartiesSync(fullSync);
      
      res.json({
        success: true,
        data: result,
        message: `Sincronización completada: ${result.processed} procesados, ${result.errors} errores`
      });
    } catch (error) {
      logger.error('Error en sincronización manual:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/sync/chart-of-accounts
   * Ejecuta sincronización manual de cuentas contables
   */
  router.post('/chart-of-accounts', async (req, res) => {
    try {
      const { fullSync = false } = req.body;

      logger.info(`Sincronización manual de cuentas solicitada (completa: ${fullSync})`);

      const result = await syncService.manualChartOfAccountsSync(fullSync);

      res.json({
        success: true,
        data: result,
        message: `Sincronización de cuentas completada: ${result.processed} procesadas, ${result.errors} errores`
      });
    } catch (error) {
      logger.error('Error en sincronización manual de cuentas:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/sync/third-parties/stats
   * Obtiene estadísticas de sincronización de terceros
   */
  router.get('/third-parties/stats', async (req, res) => {
    try {
      const stats = await syncService.getThirdPartiesStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error obteniendo estadísticas:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/sync/chart-of-accounts/stats
   * Obtiene estadísticas de sincronización de cuentas contables
   */
  router.get('/chart-of-accounts/stats', async (req, res) => {
    try {
      const stats = await syncService.getChartOfAccountsStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error obteniendo estadísticas de cuentas:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/sync/chart-of-accounts/config
   * Obtiene configuración de sincronización de cuentas contables
   */
  router.get('/chart-of-accounts/config', async (req, res) => {
    try {
      const config = syncService.getChartOfAccountsConfig();

      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      logger.error('Error obteniendo configuración de cuentas:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/sync/products
   * Ejecuta sincronización manual de productos
   */
  router.post('/products', async (req, res) => {
    try {
      const { fullSync = false } = req.body;

      logger.info(`Sincronización manual de productos solicitada (completa: ${fullSync})`);

      const result = await syncService.manualProductsSync(fullSync);

      res.json({
        success: true,
        data: result,
        message: `Sincronización de productos completada: ${result.processed} procesados, ${result.errors} errores`
      });
    } catch (error) {
      logger.error('Error en sincronización manual de productos:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/sync/products/stats
   * Obtiene estadísticas de sincronización de productos
   */
  router.get('/products/stats', async (req, res) => {
    try {
      const stats = await syncService.getProductsStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error obteniendo estadísticas de productos:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/sync/products/config
   * Obtiene configuración de sincronización de productos
   */
  router.get('/products/config', async (req, res) => {
    try {
      const config = syncService.getProductsConfig();

      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      logger.error('Error obteniendo configuración de productos:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  return router;
}

module.exports = createSyncEndpoints;
