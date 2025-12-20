const express = require('express');
const logger = require('../utils/logger');

/**
 * Middleware para manejo de errores consistente
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

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
  router.get('/status', asyncHandler(async (req, res) => {
    const [thirdPartiesStats, chartOfAccountsStats, productsStats] = await Promise.all([
      syncService.getThirdPartiesStats(),
      syncService.getChartOfAccountsStats(),
      syncService.getProductsStats()
    ]);

    const chartOfAccountsConfig = syncService.getChartOfAccountsConfig();
    const productsConfig = syncService.getProductsConfig();

    res.json({
      success: true,
      data: {
        service: 'running',
        thirdParties: thirdPartiesStats || { total: 0, synced: 0, pending: 0, error: 0 },
        chartOfAccounts: chartOfAccountsStats || { total: 0, synced: 0, pending: 0, error: 0 },
        chartOfAccountsConfig: chartOfAccountsConfig || {},
        products: productsStats || { total: 0, synced: 0, pending: 0, error: 0 },
        productsConfig: productsConfig || {},
        timestamp: new Date().toISOString()
      }
    });
  }));

  /**
   * POST /api/sync/third-parties
   * Ejecuta sincronización manual de terceros
   */
  router.post('/third-parties', asyncHandler(async (req, res) => {
    const { fullSync = false } = req.body;

    logger.info(`📡 API: Sincronización manual de terceros solicitada (completa: ${fullSync})`);

    const result = await syncService.manualThirdPartiesSync(fullSync);

    res.json({
      success: true,
      data: result,
      message: `Sincronización completada: ${result.processed} procesados, ${result.errors} errores`
    });
  }));

  /**
   * POST /api/sync/chart-of-accounts
   * Ejecuta sincronización manual de cuentas contables
   */
  router.post('/chart-of-accounts', asyncHandler(async (req, res) => {
    const { fullSync = false } = req.body;

    logger.info(`📡 API: Sincronización manual de cuentas solicitada (completa: ${fullSync})`);

    const result = await syncService.manualChartOfAccountsSync(fullSync);

    res.json({
      success: true,
      data: result,
      message: `Sincronización de cuentas completada: ${result.processed} procesadas, ${result.errors} errores`
    });
  }));

  /**
   * GET /api/sync/third-parties/stats
   * Obtiene estadísticas de sincronización de terceros
   */
  router.get('/third-parties/stats', asyncHandler(async (req, res) => {
    const stats = await syncService.getThirdPartiesStats();

    res.json({
      success: true,
      data: stats || { total: 0, synced: 0, pending: 0, error: 0, lastSync: null }
    });
  }));

  /**
   * GET /api/sync/chart-of-accounts/stats
   * Obtiene estadísticas de sincronización de cuentas contables
   */
  router.get('/chart-of-accounts/stats', asyncHandler(async (req, res) => {
    const stats = await syncService.getChartOfAccountsStats();

    res.json({
      success: true,
      data: stats || { total: 0, synced: 0, pending: 0, error: 0, lastSync: null }
    });
  }));

  /**
   * GET /api/sync/chart-of-accounts/config
   * Obtiene configuración de sincronización de cuentas contables
   */
  router.get('/chart-of-accounts/config', asyncHandler(async (req, res) => {
    const config = syncService.getChartOfAccountsConfig();

    res.json({
      success: true,
      data: config || {}
    });
  }));

  /**
   * POST /api/sync/products
   * Ejecuta sincronización manual de productos
   */
  router.post('/products', asyncHandler(async (req, res) => {
    const { fullSync = false } = req.body;

    logger.info(`📡 API: Sincronización manual de productos solicitada (completa: ${fullSync})`);

    const result = await syncService.manualProductsSync(fullSync);

    res.json({
      success: true,
      data: result,
      message: `Sincronización de productos completada: ${result.processed} procesados, ${result.errors} errores`
    });
  }));

  /**
   * GET /api/sync/products/stats
   * Obtiene estadísticas de sincronización de productos
   */
  router.get('/products/stats', asyncHandler(async (req, res) => {
    const stats = await syncService.getProductsStats();

    res.json({
      success: true,
      data: stats || { total: 0, synced: 0, pending: 0, error: 0, lastSync: null }
    });
  }));

  /**
   * GET /api/sync/products/config
   * Obtiene configuración de sincronización de productos
   */
  router.get('/products/config', asyncHandler(async (req, res) => {
    const config = syncService.getProductsConfig();

    res.json({
      success: true,
      data: config || {}
    });
  }));

  /**
   * Middleware de manejo de errores global
   */
  router.use((error, req, res, _next) => {
    logger.error('Error en API:', error);

    res.status(error.status || 500).json({
      success: false,
      error: error.message || 'Error interno del servidor',
      timestamp: new Date().toISOString()
    });
  });

  return router;
}

module.exports = createSyncEndpoints;
