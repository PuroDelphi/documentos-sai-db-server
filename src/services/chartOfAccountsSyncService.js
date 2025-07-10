const FirebirdClient = require('../database/firebirdClient');
const SupabaseClient = require('../database/supabaseClient');
const logger = require('../utils/logger');

class ChartOfAccountsSyncService {
  constructor() {
    this.firebirdClient = new FirebirdClient();
    this.supabaseClient = new SupabaseClient();
    
    // Configuración de rangos de cuentas a sincronizar
    this.syncConfig = {
      // Rangos configurables por variables de entorno
      accountRanges: this.parseAccountRanges(process.env.ACCOUNT_SYNC_RANGES || '1-99999999'),
      onlyActiveAccounts: process.env.SYNC_ONLY_ACTIVE_ACCOUNTS !== 'false', // true por defecto
      excludeZeroLevel: process.env.EXCLUDE_ZERO_LEVEL_ACCOUNTS !== 'false', // true por defecto
    };
  }

  /**
   * Parsea los rangos de cuentas desde configuración
   * @param {string} rangesStr - String con rangos separados por comas (ej: "1000-1999,4000-4999")
   * @returns {Array} - Array de objetos con start y end
   */
  parseAccountRanges(rangesStr) {
    try {
      const ranges = rangesStr.split(',').map(range => {
        const [start, end] = range.trim().split('-').map(num => parseInt(num));
        return { start: start || 1, end: end || 99999999 };
      });

      logger.info('Rangos de cuentas parseados:', ranges);
      return ranges;
    } catch (error) {
      logger.warn('Error parseando rangos de cuentas, usando rango completo:', error);
      return [{ start: 1, end: 99999999 }];
    }
  }

  /**
   * Inicializa el servicio de sincronización
   */
  async initialize() {
    try {
      await this.firebirdClient.initialize();
      logger.info('Servicio de sincronización de cuentas contables inicializado');
      logger.info('Configuración de sincronización:', this.syncConfig);
    } catch (error) {
      logger.error('Error inicializando servicio de cuentas:', error);
      throw error;
    }
  }

  /**
   * Sincroniza cuentas contables desde Firebird a Supabase
   * @param {boolean} fullSync - Si es true, sincroniza todas las cuentas en los rangos
   */
  async syncFromFirebird(fullSync = false) {
    try {
      logger.info(`Iniciando sincronización de cuentas contables (completa: ${fullSync})`);

      // Construir consulta con filtros configurados
      const whereConditions = this.buildWhereConditions();
      const query = `
        SELECT 
          ACCT, DESCRIPCION, TIPO, CLASS, NVEL,
          CDGOTTL, CDGOGRPO, CDGOCNTA, CDGOSBCNTA, CDGOAUX,
          BASERTNCION, PORCENRETENCION, PLANTILLA_RETENCION,
          MONETARIO, DPRTMNTOCSTO, CNCLCION, VNCMNTO, CTAS,
          FEFECTIVO, MODELO, NORMA, COD_FORMATO, COD_CONCEPTO,
          ACTIVIDADES, APLI_IMPUESTO, ACTIVO, PRIORIDAD, MATERIALIDAD
        FROM ACCT 
        WHERE ${whereConditions}
        ORDER BY ACCT
      `;

      logger.info('Ejecutando consulta SQL:', query);
      const accounts = await this.firebirdClient.query(query);

      logger.info(`Encontradas ${accounts.length} cuentas para sincronizar`);

      // Log de muestra de cuentas encontradas
      if (accounts.length > 0) {
        logger.info('Muestra de cuentas encontradas:', accounts.slice(0, 5).map(acc => ({
          ACCT: acc.ACCT,
          DESCRIPCION: acc.DESCRIPCION?.trim(),
          ACTIVO: acc.ACTIVO
        })));
      }

      if (accounts.length === 0) {
        logger.info('No hay cuentas para sincronizar con la configuración actual');
        return { processed: 0, errors: 0 };
      }

      // Procesar cuentas en lotes
      const batchSize = 20;
      let processed = 0;
      let errors = 0;

      for (let i = 0; i < accounts.length; i += batchSize) {
        const batch = accounts.slice(i, i + batchSize);
        logger.info(`Procesando lote ${Math.floor(i / batchSize) + 1} de ${Math.ceil(accounts.length / batchSize)}`);

        for (const account of batch) {
          try {
            await this.upsertAccount(account);
            processed++;
          } catch (error) {
            logger.error(`Error procesando cuenta ${account.ACCT}:`, error);
            errors++;
          }
        }

        // Pausa pequeña entre lotes
        if (i + batchSize < accounts.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      logger.info(`Sincronización de cuentas completada: ${processed} procesadas, ${errors} errores`);
      return { processed, errors };

    } catch (error) {
      logger.error('Error en sincronización de cuentas contables:', error);
      throw error;
    }
  }

  /**
   * Construye las condiciones WHERE para la consulta
   */
  buildWhereConditions() {
    const conditions = [];

    // Filtro por rangos de cuentas
    const rangeConditions = this.syncConfig.accountRanges.map(range =>
      `(ACCT >= ${range.start} AND ACCT <= ${range.end})`
    );
    conditions.push(`(${rangeConditions.join(' OR ')})`);

    // Filtro por cuentas activas
    if (this.syncConfig.onlyActiveAccounts) {
      conditions.push("ACTIVO = 'S'");
    }

    // Excluir cuentas de nivel 0 (títulos principales) - ajustado para ser más permisivo
    if (this.syncConfig.excludeZeroLevel) {
      conditions.push('(NVEL IS NULL OR NVEL >= 0)'); // Cambiado de > 0 a >= 0
    }

    const whereClause = conditions.join(' AND ');
    logger.info('Condiciones WHERE construidas:', whereClause);

    return whereClause;
  }

  /**
   * Inserta o actualiza una cuenta en Supabase
   * @param {Object} acctRecord - Registro de ACCT
   */
  async upsertAccount(acctRecord) {
    try {
      const mappedData = this.mapAcctToSupabase(acctRecord);
      
      logger.debug(`Procesando cuenta: ${acctRecord.ACCT}`);

      // Verificar si existe
      const { data: existing, error: selectError } = await this.supabaseClient.client
        .from('invoice_chart_of_accounts')
        .select('id')
        .eq('account_code', mappedData.account_code)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        throw new Error(`Error verificando existencia: ${selectError.message}`);
      }

      let result;
      if (existing) {
        // Actualizar registro existente
        const { data, error } = await this.supabaseClient.client
          .from('invoice_chart_of_accounts')
          .update({
            ...mappedData,
            last_sync_at: new Date().toISOString(),
            sync_status: 'SYNCED',
            sync_error: null
          })
          .eq('account_code', mappedData.account_code);

        if (error) throw error;
        result = data;
        logger.debug(`Cuenta actualizada: ${mappedData.account_code}`);
      } else {
        // Insertar nuevo registro
        const { data, error } = await this.supabaseClient.client
          .from('invoice_chart_of_accounts')
          .insert({
            ...mappedData,
            last_sync_at: new Date().toISOString(),
            sync_status: 'SYNCED',
            sync_error: null
          });

        if (error) throw error;
        result = data;
        logger.debug(`Cuenta insertada: ${mappedData.account_code}`);
      }

      return result;
    } catch (error) {
      // Marcar como error en caso de fallo
      try {
        await this.supabaseClient.client
          .from('invoice_chart_of_accounts')
          .upsert({
            account_code: acctRecord.ACCT,
            description: acctRecord.DESCRIPCION?.trim() || 'ERROR EN SINCRONIZACIÓN',
            sync_status: 'ERROR',
            sync_error: error.message,
            last_sync_at: new Date().toISOString()
          });
      } catch (updateError) {
        logger.error('Error marcando cuenta como error:', updateError);
      }
      
      throw error;
    }
  }

  /**
   * Mapea un registro de ACCT a la estructura de invoice_chart_of_accounts
   * @param {Object} acctRecord - Registro de ACCT
   * @returns {Object} - Datos mapeados para Supabase
   */
  mapAcctToSupabase(acctRecord) {
    // Función auxiliar para convertir string boolean de Firebird
    const parseBool = (value) => {
      if (!value) return false;
      const str = value.toString().trim().toLowerCase();
      return str === 'true' || str === 's' || str === 'si' || str === '1';
    };

    // Función auxiliar para limpiar strings
    const cleanString = (value, maxLength = null) => {
      if (!value) return null;
      const cleaned = value.toString().trim();
      return maxLength ? cleaned.substring(0, maxLength) : cleaned;
    };

    // Función auxiliar para limpiar números
    const cleanNumber = (value) => {
      if (!value || isNaN(value)) return null;
      return parseFloat(value);
    };

    // Determinar rango de cuenta para configuración
    const accountCode = parseInt(acctRecord.ACCT);
    const range = this.syncConfig.accountRanges.find(r =>
      accountCode >= r.start && accountCode <= r.end
    );

    return {
      // Identificación principal
      account_code: accountCode,
      description: cleanString(acctRecord.DESCRIPCION, 100) || 'SIN DESCRIPCIÓN',

      // Clasificación contable
      account_type: cleanString(acctRecord.TIPO, 10),
      account_class: cleanString(acctRecord.CLASS, 5),
      account_level: cleanNumber(acctRecord.NVEL),

      // Estructura jerárquica del PUC
      title_code: cleanNumber(acctRecord.CDGOTTL),
      group_code: cleanNumber(acctRecord.CDGOGRPO),
      account_group_code: cleanNumber(acctRecord.CDGOCNTA),
      subaccount_code: cleanNumber(acctRecord.CDGOSBCNTA),
      auxiliary_code: cleanNumber(acctRecord.CDGOAUX),

      // Configuración de retenciones
      is_withholding_base: parseBool(acctRecord.BASERTNCION),
      withholding_percentage: cleanNumber(acctRecord.PORCENRETENCION),
      withholding_template: cleanString(acctRecord.PLANTILLA_RETENCION, 10),

      // Configuración contable
      is_monetary: parseBool(acctRecord.MONETARIO),
      requires_cost_center: parseBool(acctRecord.DPRTMNTOCSTO),
      requires_reconciliation: parseBool(acctRecord.CNCLCION),
      requires_due_date: parseBool(acctRecord.VNCMNTO),
      requires_third_party: parseBool(acctRecord.CTAS),

      // Flujo de efectivo
      cash_flow_code: cleanNumber(acctRecord.FEFECTIVO),

      // NIIF/Normativa colombiana
      accounting_model: cleanNumber(acctRecord.MODELO),
      accounting_standard: cleanNumber(acctRecord.NORMA),
      format_code: cleanString(acctRecord.COD_FORMATO, 10),
      concept_code: cleanString(acctRecord.COD_CONCEPTO, 20),
      activities: cleanString(acctRecord.ACTIVIDADES, 50),

      // Impuestos
      tax_application: cleanString(acctRecord.APLI_IMPUESTO, 200),

      // Control y estado
      is_active: parseBool(acctRecord.ACTIVO),
      priority: cleanNumber(acctRecord.PRIORIDAD),
      materiality_threshold: cleanNumber(acctRecord.MATERIALIDAD),

      // Configuración de sincronización
      account_range_start: range ? range.start : null,
      account_range_end: range ? range.end : null
    };
  }

  /**
   * Ejecuta sincronización completa
   */
  async fullSync() {
    logger.info('Iniciando sincronización completa de cuentas contables...');
    return await this.syncFromFirebird(true);
  }

  /**
   * Ejecuta sincronización incremental (mismo que completa para cuentas)
   */
  async incrementalSync() {
    logger.info('Iniciando sincronización de cuentas contables...');
    return await this.syncFromFirebird(false);
  }

  /**
   * Obtiene estadísticas de sincronización
   */
  async getSyncStats() {
    try {
      const { data, error } = await this.supabaseClient.client
        .from('invoice_chart_of_accounts')
        .select('sync_status, count(*)')
        .group('sync_status');

      if (error) throw error;

      const stats = {
        total: 0,
        synced: 0,
        pending: 0,
        error: 0
      };

      data.forEach(row => {
        stats.total += row.count;
        stats[row.sync_status.toLowerCase()] = row.count;
      });

      return stats;
    } catch (error) {
      logger.error('Error obteniendo estadísticas de cuentas:', error);
      return null;
    }
  }

  /**
   * Obtiene configuración actual de sincronización
   */
  getConfig() {
    return {
      accountRanges: this.syncConfig.accountRanges,
      onlyActiveAccounts: this.syncConfig.onlyActiveAccounts,
      excludeZeroLevel: this.syncConfig.excludeZeroLevel
    };
  }

  /**
   * Cierra las conexiones
   */
  async close() {
    try {
      await this.firebirdClient.close();
      await this.supabaseClient.close();
      logger.info('Servicio de sincronización de cuentas cerrado');
    } catch (error) {
      logger.error('Error cerrando servicio de cuentas:', error);
    }
  }
}

module.exports = ChartOfAccountsSyncService;
