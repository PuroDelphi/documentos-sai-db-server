const FirebirdClient = require('../database/firebirdClient');
const SupabaseClient = require('../database/supabaseClient');
const appConfig = require('../config/appConfig');
const logger = require('../utils/logger');

class ChartOfAccountsSyncService {
  constructor() {
    this.firebirdClient = new FirebirdClient();
    this.supabaseClient = new SupabaseClient();
    this.userUUID = appConfig.getUserUUID();

    // Configuración de rangos de cuentas (se carga en initialize)
    this.syncConfig = null;
  }

  /**
   * Cargar configuración desde appConfig
   */
  loadConfig() {
    this.syncConfig = {
      // Rangos configurables desde Supabase
      accountRanges: this.parseAccountRanges(appConfig.get('account_sync_ranges', '1-99999999')),
      accountExcludeRanges: this.parseAccountRanges(appConfig.get('account_exclude_ranges', '')),
      onlyActiveAccounts: appConfig.get('sync_only_active_accounts', true),
      excludeZeroLevel: appConfig.get('exclude_zero_level_accounts', true),
    };
  }

  /**
   * Parsea los rangos de cuentas desde configuración
   * @param {string} rangesStr - String con rangos separados por comas (ej: "1000-1999,4000-4999")
   * @returns {Array} - Array de objetos con start y end
   */
  parseAccountRanges(rangesStr) {
    try {
      // Si la cadena está vacía, retornar array vacío
      if (!rangesStr || rangesStr.trim() === '') {
        return [];
      }

      const ranges = rangesStr.split(',').map(range => {
        const [start, end] = range.trim().split('-').map(num => parseInt(num));
        return { start: start || 1, end: end || start || 99999999 };
      });

      logger.info('Rangos de cuentas parseados:', ranges);
      return ranges;
    } catch (error) {
      logger.warn('Error parseando rangos de cuentas:', error);
      return [];
    }
  }

  /**
   * Inicializa el servicio de sincronización
   */
  async initialize() {
    try {
      // Cargar configuración
      this.loadConfig();

      await this.firebirdClient.initialize();

      // Verificar y crear mecanismo de versionamiento si no existe
      await this.ensureVersioningMechanism();

      logger.info('Servicio de sincronización de cuentas contables inicializado');
      logger.info('Configuración de sincronización:', this.syncConfig);
    } catch (error) {
      logger.error('Error inicializando servicio de cuentas:', error);
      throw error;
    }
  }

  /**
   * Verifica y crea el mecanismo de versionamiento en ACCT si no existe
   */
  async ensureVersioningMechanism() {
    try {
      // Verificar si el campo Version existe en ACCT
      const checkFieldQuery = `
        SELECT COUNT(*) as field_count
        FROM RDB$RELATION_FIELDS
        WHERE RDB$RELATION_NAME = 'ACCT'
        AND RDB$FIELD_NAME = 'Version'
      `;

      const fieldCheck = await this.firebirdClient.query(checkFieldQuery);
      const fieldExists = fieldCheck[0].FIELD_COUNT > 0;

      if (!fieldExists) {
        logger.info('Campo Version no existe en ACCT, creando mecanismo de versionamiento...');

        // Crear campo Version
        await this.firebirdClient.query('ALTER TABLE ACCT ADD "Version" INTEGER');
        logger.info('✅ Campo Version creado en ACCT');

        // Verificar si el generador existe
        const checkGenQuery = `
          SELECT COUNT(*) as gen_count
          FROM RDB$GENERATORS
          WHERE RDB$GENERATOR_NAME = 'GEN_ACCT_VERSION'
        `;

        const genCheck = await this.firebirdClient.query(checkGenQuery);
        const genExists = genCheck[0].GEN_COUNT > 0;

        if (!genExists) {
          // Crear generador
          await this.firebirdClient.query('CREATE GENERATOR GEN_ACCT_VERSION');
          await this.firebirdClient.query('SET GENERATOR GEN_ACCT_VERSION TO 0');
          logger.info('✅ Generador GEN_ACCT_VERSION creado');
        }

        // Crear trigger
        const createTriggerSQL = `
          CREATE OR ALTER TRIGGER TRG_ACCT_VERSION FOR ACCT
          ACTIVE BEFORE INSERT OR UPDATE POSITION 0
          AS
          BEGIN
            NEW."Version" = GEN_ID(GEN_ACCT_VERSION, 1);
          END
        `;

        await this.firebirdClient.query(createTriggerSQL);
        logger.info('✅ Trigger TRG_ACCT_VERSION creado');

        // Crear procedimiento de inicialización
        const createProcedureSQL = `
          CREATE OR ALTER PROCEDURE SP_INITIALIZE_ACCT_VERSIONS
          AS
          DECLARE VARIABLE v_acct INTEGER;
          DECLARE VARIABLE v_version INTEGER;
          BEGIN
            v_version = 0;
            FOR SELECT ACCT
                FROM ACCT
                WHERE "Version" IS NULL
                ORDER BY ACCT
                INTO :v_acct
            DO
            BEGIN
              v_version = v_version + 1;
              UPDATE ACCT
              SET "Version" = :v_version
              WHERE ACCT = :v_acct;
            END
            IF (v_version > 0) THEN
            BEGIN
              EXECUTE STATEMENT 'SET GENERATOR GEN_ACCT_VERSION TO ' || :v_version;
            END
          END
        `;

        await this.firebirdClient.query(createProcedureSQL);
        logger.info('✅ Procedimiento SP_INITIALIZE_ACCT_VERSIONS creado');

        // Marcar que necesitamos inicializar versiones en la primera sincronización
        this.needsVersionInitialization = true;
      } else {
        logger.info('✅ Mecanismo de versionamiento ya existe en ACCT');
        this.needsVersionInitialization = false;
      }
    } catch (error) {
      logger.error('');
      logger.error('═══════════════════════════════════════════════════════════════');
      logger.error('❌ ADVERTENCIA: No se pudo crear el mecanismo de versionamiento en ACCT');
      logger.error('═══════════════════════════════════════════════════════════════');
      logger.error('');
      logger.error('Detalles del error:', error.message);
      logger.error('');
      logger.error('IMPACTO:');
      logger.error('  ⚠️  La sincronización de cuentas será COMPLETA en cada ciclo');
      logger.error('  ⚠️  Esto puede ser MUY LENTO si hay muchas cuentas');
      logger.error('  ⚠️  Se recomienda corregir este problema lo antes posible');
      logger.error('');
      logger.error('SOLUCIÓN:');
      logger.error('  1. Verificar que el usuario de Firebird tenga permisos para:');
      logger.error('     - ALTER TABLE (para agregar campo Version)');
      logger.error('     - CREATE GENERATOR (para crear GEN_ACCT_VERSION)');
      logger.error('     - CREATE TRIGGER (para crear TRG_ACCT_VERSION)');
      logger.error('     - CREATE PROCEDURE (para crear SP_INITIALIZE_ACCT_VERSIONS)');
      logger.error('');
      logger.error('  2. O ejecutar manualmente el script:');
      logger.error('     database/migrations/add_acct_versioning.sql');
      logger.error('');
      logger.error('El servicio continuará funcionando con sincronización completa.');
      logger.error('═══════════════════════════════════════════════════════════════');
      logger.error('');

      // NO lanzar error, continuar con sincronización completa
      this.needsVersionInitialization = false;
    }
  }

  /**
   * Obtiene la última versión sincronizada desde Supabase
   * @returns {Promise<number>} - Última versión sincronizada
   */
  async getLastSyncedVersion() {
    try {
      const { data, error } = await this.supabaseClient.client
        .from('invoice_chart_of_accounts')
        .select('firebird_version')
        .eq('user_id', this.userUUID)
        .order('firebird_version', { ascending: false })
        .limit(1);

      if (error) {
        throw new Error(`Error obteniendo última versión: ${error.message}`);
      }

      const lastVersion = data && data.length > 0 ? data[0].firebird_version : 0;
      logger.info(`Última versión de cuentas sincronizada: ${lastVersion}`);
      return lastVersion || 0;
    } catch (error) {
      logger.error('Error obteniendo última versión sincronizada de cuentas:', error);
      return 0; // Si hay error, sincronizar desde el inicio
    }
  }

  /**
   * Sincroniza cuentas contables desde Firebird a Supabase
   * @param {boolean} fullSync - Si es true, sincroniza todas las cuentas en los rangos
   */
  async syncFromFirebird(fullSync = false) {
    try {
      logger.info(`Iniciando sincronización de cuentas contables (fullSync: ${fullSync})`);

      // Obtener última versión sincronizada
      const lastVersion = fullSync ? 0 : await this.getLastSyncedVersion();

      // Construir consulta con filtros configurados
      const whereConditions = this.buildWhereConditions(lastVersion);
      const query = `
        SELECT
          ACCT, DESCRIPCION, TIPO, CLASS, NVEL,
          CDGOTTL, CDGOGRPO, CDGOCNTA, CDGOSBCNTA, CDGOAUX,
          BASERTNCION, PORCENRETENCION, PLANTILLA_RETENCION,
          MONETARIO, DPRTMNTOCSTO, CNCLCION, VNCMNTO, CTAS,
          FEFECTIVO, MODELO, NORMA, COD_FORMATO, COD_CONCEPTO,
          ACTIVIDADES, APLI_IMPUESTO, ACTIVO, PRIORIDAD, MATERIALIDAD,
          "Version"
        FROM ACCT
        WHERE ${whereConditions}
        ORDER BY "Version" NULLS FIRST
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

      // Procesar cuentas en lotes con batch upsert (optimizado)
      const batchSize = 100; // Aumentado de 20 a 100 para mejor rendimiento
      let processed = 0;
      let errors = 0;

      for (let i = 0; i < accounts.length; i += batchSize) {
        const batch = accounts.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(accounts.length / batchSize);

        logger.info(`Procesando lote ${batchNumber} de ${totalBatches} (${batch.length} registros)`);

        try {
          // Mapear todos los registros del batch
          const mappedRecords = batch.map(account => ({
            ...this.mapAcctToSupabase(account),
            user_id: this.userUUID,
            last_sync_at: new Date().toISOString(),
            sync_status: 'SYNCED',
            sync_error: null
          }));

          // Batch upsert - mucho más rápido que uno por uno
          const { error } = await this.supabaseClient.client
            .from('invoice_chart_of_accounts')
            .upsert(mappedRecords, {
              onConflict: 'account_code,user_id',
              ignoreDuplicates: false
            });

          if (error) throw error;

          processed += batch.length;
          logger.info(`✅ Lote ${batchNumber} procesado exitosamente: ${batch.length} cuentas`);

        } catch (error) {
          logger.error(`❌ Error en lote ${batchNumber}, procesando registros individualmente:`, error.message);

          // Fallback: procesar uno por uno para identificar registros problemáticos
          for (const account of batch) {
            try {
              await this.upsertAccount(account);
              processed++;
            } catch (err) {
              logger.error(`Error procesando cuenta ${account.ACCT}:`, err.message);
              errors++;
            }
          }
        }

        // Pausa pequeña entre lotes
        if (i + batchSize < accounts.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      logger.info(`✅ Sincronización de cuentas completada: ${processed} procesadas, ${errors} errores`);

      // Si necesitamos inicializar versiones, ejecutar el procedimiento
      if (this.needsVersionInitialization && processed > 0) {
        logger.info('Inicializando números de versión para registros existentes...');
        try {
          await this.firebirdClient.query('EXECUTE PROCEDURE SP_INITIALIZE_ACCT_VERSIONS');
          logger.info('✅ Versiones inicializadas correctamente');
          this.needsVersionInitialization = false;
        } catch (error) {
          logger.error('Error inicializando versiones:', error);
          // No lanzar error, la próxima sincronización lo intentará de nuevo
        }
      }

      return { processed, errors };

    } catch (error) {
      logger.error('Error en sincronización de cuentas contables:', error);
      throw error;
    }
  }

  /**
   * Construye las condiciones WHERE para la consulta
   */
  buildWhereConditions(lastVersion = 0) {
    const conditions = [];

    // Filtro por versión (solo para sincronización incremental)
    if (lastVersion > 0) {
      conditions.push(`("Version" > ${lastVersion} OR "Version" IS NULL)`);
    }

    // Filtro por rangos de cuentas a incluir
    if (this.syncConfig.accountRanges.length > 0) {
      const rangeConditions = this.syncConfig.accountRanges.map(range =>
        `(ACCT >= ${range.start} AND ACCT <= ${range.end})`
      );
      conditions.push(`(${rangeConditions.join(' OR ')})`);
    }

    // Filtro por rangos de cuentas a excluir
    if (this.syncConfig.accountExcludeRanges.length > 0) {
      const excludeConditions = this.syncConfig.accountExcludeRanges.map(range =>
        `NOT (ACCT >= ${range.start} AND ACCT <= ${range.end})`
      );
      conditions.push(`(${excludeConditions.join(' AND ')})`);
    }

    // Filtro por cuentas activas
    if (this.syncConfig.onlyActiveAccounts) {
      conditions.push("ACTIVO = 'S'");
    }

    // Excluir cuentas de nivel 0 (títulos principales) - ajustado para ser más permisivo
    if (this.syncConfig.excludeZeroLevel) {
      conditions.push('(NVEL IS NULL OR NVEL >= 0)'); // Cambiado de > 0 a >= 0
    }

    const whereClause = conditions.length > 0 ? conditions.join(' AND ') : '1=1';
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
        .eq('user_id', this.userUUID)
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
          .eq('account_code', mappedData.account_code)
          .eq('user_id', this.userUUID);

        if (error) throw error;
        result = data;
        logger.debug(`Cuenta actualizada: ${mappedData.account_code}`);
      } else {
        // Insertar nuevo registro
        const { data, error } = await this.supabaseClient.client
          .from('invoice_chart_of_accounts')
          .insert({
            ...mappedData,
            user_id: this.userUUID,
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
      account_range_end: range ? range.end : null,

      // Control de sincronización
      firebird_version: acctRecord.Version || 0
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
      // Obtener todos los registros del usuario (solo sync_status para eficiencia)
      const { data, error } = await this.supabaseClient.client
        .from('invoice_chart_of_accounts')
        .select('sync_status')
        .eq('user_id', this.userUUID);

      if (error) throw error;

      // Contar por estado en JavaScript
      const stats = {
        total: data.length,
        synced: 0,
        pending: 0,
        error: 0,
        lastSync: null
      };

      data.forEach(row => {
        const status = (row.sync_status || 'pending').toLowerCase();
        if (stats.hasOwnProperty(status)) {
          stats[status]++;
        }
      });

      // Obtener fecha de última sincronización
      const { data: lastSyncData } = await this.supabaseClient.client
        .from('invoice_chart_of_accounts')
        .select('last_sync_at')
        .eq('user_id', this.userUUID)
        .not('last_sync_at', 'is', null)
        .order('last_sync_at', { ascending: false })
        .limit(1)
        .single();

      if (lastSyncData) {
        stats.lastSync = lastSyncData.last_sync_at;
      }

      return stats;
    } catch (error) {
      logger.error('Error obteniendo estadísticas de cuentas:', error);
      return {
        total: 0,
        synced: 0,
        pending: 0,
        error: 0,
        lastSync: null
      };
    }
  }

  /**
   * Obtiene configuración actual de sincronización
   */
  getConfig() {
    return {
      accountRanges: this.syncConfig.accountRanges,
      accountExcludeRanges: this.syncConfig.accountExcludeRanges,
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
