const FirebirdClient = require('../database/firebirdClient');
const SupabaseClient = require('../database/supabaseClient');
const appConfig = require('../config/appConfig');
const logger = require('../utils/logger');

class ThirdPartySyncService {
  constructor() {
    this.firebirdClient = new FirebirdClient();
    this.supabaseClient = new SupabaseClient();
    this.userUUID = appConfig.getUserUUID();
  }

  /**
   * Inicializa el servicio de sincronización
   */
  async initialize() {
    try {
      await this.firebirdClient.initialize();
      logger.info('Servicio de sincronización de terceros inicializado');
    } catch (error) {
      logger.error('Error inicializando servicio de terceros:', error);
      throw error;
    }
  }

  /**
   * Obtiene la última versión sincronizada desde Supabase
   * @returns {Promise<number>} - Última versión sincronizada
   */
  async getLastSyncedVersion() {
    try {
      const { data, error } = await this.supabaseClient.client
        .from('invoice_third_parties')
        .select('firebird_version')
        .eq('user_id', this.userUUID)
        .order('firebird_version', { ascending: false })
        .limit(1);

      if (error) {
        throw new Error(`Error obteniendo última versión: ${error.message}`);
      }

      const lastVersion = data && data.length > 0 ? data[0].firebird_version : 0;
      logger.info(`Última versión sincronizada: ${lastVersion}`);
      return lastVersion || 0;
    } catch (error) {
      logger.error('Error obteniendo última versión sincronizada:', error);
      return 0; // Si hay error, sincronizar desde el inicio
    }
  }

  /**
   * Sincroniza terceros desde Firebird a Supabase
   * @param {boolean} fullSync - Si es true, sincroniza todos los registros
   */
  async syncFromFirebird(fullSync = false) {
    try {
      logger.info(`Iniciando sincronización de terceros (fullSync: ${fullSync})`);

      // Obtener última versión sincronizada
      const lastVersion = fullSync ? 0 : await this.getLastSyncedVersion();

      // Consultar registros nuevos/modificados en CUST
      const query = `
        SELECT 
          ID_N, NIT, COMPANY, COMPANY_EXTENDIDO, EMAIL,
          PHONE1, PHONE2, ADDR1, CITY, DEPARTAMENTO,
          CIUDAD_EXT, DEPARTAMENTO_EXT, PAIS,
          ACCT, ACCTP, GRAVABLE, RETENEDOR, RETIVA, 
          APLICA_RETEFUENTE, AUTORET, REGIMEN, RETEICA, 
          TIPORETEICA, CLIENTE, PROVEEDOR, EMPLEADO, OTRO,
          TERMS, TERMSP, CREDITLMT, CREDITLMTPROV, DESCUENTO,
          "Version", FECHA_CREACION
        FROM CUST 
        WHERE ("Version" > ? OR "Version" IS NULL)
        ORDER BY "Version" NULLS FIRST
      `;

      const records = await this.firebirdClient.query(query, [lastVersion]);
      
      logger.info(`Encontrados ${records.length} terceros para sincronizar`);

      if (records.length === 0) {
        logger.info('No hay terceros nuevos para sincronizar');
        return { processed: 0, errors: 0 };
      }

      // Procesar registros en lotes con batch upsert (optimizado)
      const batchSize = 100; // Aumentado de 10 a 100 para mejor rendimiento
      let processed = 0;
      let errors = 0;

      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(records.length / batchSize);

        logger.info(`Procesando lote ${batchNumber} de ${totalBatches} (${batch.length} registros)`);

        try {
          // Mapear todos los registros del batch
          const mappedRecords = batch.map(record => ({
            ...this.mapCustToSupabase(record),
            user_id: this.userUUID,
            last_sync_at: new Date().toISOString(),
            sync_status: 'SYNCED',
            sync_error: null
          }));

          // Batch upsert - mucho más rápido que uno por uno
          const { error } = await this.supabaseClient.client
            .from('invoice_third_parties')
            .upsert(mappedRecords, {
              onConflict: 'id_n,user_id',
              ignoreDuplicates: false
            });

          if (error) throw error;

          processed += batch.length;
          logger.info(`✅ Lote ${batchNumber} procesado exitosamente: ${batch.length} terceros`);

        } catch (error) {
          logger.error(`❌ Error en lote ${batchNumber}, procesando registros individualmente:`, error.message);

          // Fallback: procesar uno por uno para identificar registros problemáticos
          for (const record of batch) {
            try {
              await this.upsertThirdParty(record);
              processed++;
            } catch (err) {
              logger.error(`Error procesando tercero ${record.ID_N}:`, err.message);
              errors++;
            }
          }
        }

        // Pausa pequeña entre lotes para no sobrecargar
        if (i + batchSize < records.length) {
          await new Promise(resolve => setTimeout(resolve, 50)); // Reducido de 100ms a 50ms
        }
      }

      logger.info(`✅ Sincronización completada: ${processed} procesados, ${errors} errores`);
      return { processed, errors };

    } catch (error) {
      logger.error('Error en sincronización de terceros:', error);
      throw error;
    }
  }

  /**
   * Inserta o actualiza un tercero en Supabase
   * @param {Object} custRecord - Registro de CUST
   */
  async upsertThirdParty(custRecord) {
    try {
      const mappedData = this.mapCustToSupabase(custRecord);
      
      logger.debug(`Procesando tercero: ${custRecord.ID_N?.trim()}`);

      // Verificar si existe
      const { data: existing, error: selectError } = await this.supabaseClient.client
        .from('invoice_third_parties')
        .select('id')
        .eq('id_n', mappedData.id_n)
        .eq('user_id', this.userUUID)
        .single();

      if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = no rows found
        throw new Error(`Error verificando existencia: ${selectError.message}`);
      }

      let result;
      if (existing) {
        // Actualizar registro existente
        const { data, error } = await this.supabaseClient.client
          .from('invoice_third_parties')
          .update({
            ...mappedData,
            last_sync_at: new Date().toISOString(),
            sync_status: 'SYNCED',
            sync_error: null
          })
          .eq('id_n', mappedData.id_n)
          .eq('user_id', this.userUUID);

        if (error) throw error;
        result = data;
        logger.debug(`Tercero actualizado: ${mappedData.id_n}`);
      } else {
        // Insertar nuevo registro
        const { data, error } = await this.supabaseClient.client
          .from('invoice_third_parties')
          .insert({
            ...mappedData,
            user_id: this.userUUID,
            last_sync_at: new Date().toISOString(),
            sync_status: 'SYNCED',
            sync_error: null
          });

        if (error) throw error;
        result = data;
        logger.debug(`Tercero insertado: ${mappedData.id_n}`);
      }

      return result;
    } catch (error) {
      // Marcar como error en caso de fallo
      try {
        await this.supabaseClient.client
          .from('invoice_third_parties')
          .upsert({
            id_n: custRecord.ID_N?.trim(),
            company: custRecord.COMPANY?.trim() || 'ERROR EN SINCRONIZACIÓN',
            sync_status: 'ERROR',
            sync_error: error.message,
            firebird_version: custRecord.Version || 0,
            last_sync_at: new Date().toISOString()
          });
      } catch (updateError) {
        logger.error('Error marcando tercero como error:', updateError);
      }
      
      throw error;
    }
  }

  /**
   * Mapea un registro de CUST a la estructura de invoice_third_parties
   * @param {Object} custRecord - Registro de CUST
   * @returns {Object} - Datos mapeados para Supabase
   */
  mapCustToSupabase(custRecord) {
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

    return {
      // Identificación
      id_n: cleanString(custRecord.ID_N, 30),
      nit: cleanString(custRecord.NIT, 30),
      company: cleanString(custRecord.COMPANY_EXTENDIDO || custRecord.COMPANY, 200) || 'SIN NOMBRE',
      company_short: cleanString(custRecord.COMPANY, 35),

      // Información de contacto
      email: cleanString(custRecord.EMAIL, 250),
      phone1: cleanString(custRecord.PHONE1, 40),
      phone2: cleanString(custRecord.PHONE2, 40),
      address: cleanString(custRecord.ADDR1, 80),
      city: cleanString(custRecord.CIUDAD_EXT || custRecord.CITY, 80),
      department: cleanString(custRecord.DEPARTAMENTO_EXT || custRecord.DEPARTAMENTO, 80),
      country: cleanString(custRecord.PAIS, 30) || 'Colombia',

      // Cuentas contables
      account_receivable: cleanNumber(custRecord.ACCT),
      account_payable: cleanNumber(custRecord.ACCTP),

      // Configuración tributaria
      is_taxable: parseBool(custRecord.GRAVABLE),
      is_withholding_agent: parseBool(custRecord.RETENEDOR),
      applies_vat_withholding: parseBool(custRecord.RETIVA),
      applies_source_withholding: parseBool(custRecord.APLICA_RETEFUENTE),
      is_self_withholding: parseBool(custRecord.AUTORET),
      tax_regime: cleanString(custRecord.REGIMEN, 10),

      // Configuración ICA
      applies_ica_withholding: parseBool(custRecord.RETEICA),
      ica_withholding_type: cleanString(custRecord.TIPORETEICA, 10),

      // Tipo de entidad
      is_customer: parseBool(custRecord.CLIENTE),
      is_supplier: parseBool(custRecord.PROVEEDOR),
      is_employee: parseBool(custRecord.EMPLEADO),
      is_other: parseBool(custRecord.OTRO),

      // Condiciones comerciales
      payment_terms: cleanString(custRecord.TERMSP || custRecord.TERMS, 15),
      credit_limit: cleanNumber(custRecord.CREDITLMTPROV || custRecord.CREDITLMT),
      discount_percentage: cleanNumber(custRecord.DESCUENTO),

      // Control de sincronización
      firebird_version: custRecord.Version || 0
    };
  }

  /**
   * Ejecuta sincronización manual completa
   */
  async fullSync() {
    logger.info('Iniciando sincronización completa de terceros...');
    return await this.syncFromFirebird(true);
  }

  /**
   * Ejecuta sincronización incremental
   */
  async incrementalSync() {
    logger.info('Iniciando sincronización incremental de terceros...');
    return await this.syncFromFirebird(false);
  }

  /**
   * Obtiene estadísticas de sincronización
   */
  async getSyncStats() {
    try {
      const { data, error } = await this.supabaseClient.client
        .from('invoice_third_parties')
        .select('sync_status, count(*)')
        .eq('user_id', this.userUUID)
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
      logger.error('Error obteniendo estadísticas:', error);
      return null;
    }
  }

  /**
   * Cierra las conexiones
   */
  async close() {
    try {
      await this.firebirdClient.close();
      await this.supabaseClient.close();
      logger.info('Servicio de sincronización de terceros cerrado');
    } catch (error) {
      logger.error('Error cerrando servicio de terceros:', error);
    }
  }
}

module.exports = ThirdPartySyncService;
