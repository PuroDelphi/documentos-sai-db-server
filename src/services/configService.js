const { createClient } = require('@supabase/supabase-js');
const ConfigCache = require('../utils/configCache');
const logger = require('../utils/logger');

/**
 * Servicio de configuración centralizado
 * Lee configuración desde Supabase y mantiene caché local encriptado
 */
class ConfigService {
  constructor() {
    this.cache = new ConfigCache();
    this.config = null;
    this.supabaseClient = null;
    this.userId = null;
    this.cachePassword = null;
  }

  /**
   * Inicializar servicio de configuración
   * @param {string} supabaseUrl - URL de Supabase
   * @param {string} supabaseKey - API Key de Supabase
   * @param {string} userId - UUID del usuario
   * @param {string} cachePassword - Contraseña para encriptar caché local
   */
  async initialize(supabaseUrl, supabaseKey, userId, cachePassword) {
    try {
      this.supabaseClient = createClient(supabaseUrl, supabaseKey);
      this.userId = userId;
      this.cachePassword = cachePassword;

      logger.info('🔧 Inicializando servicio de configuración...');

      // Intentar cargar desde caché primero
      const cachedConfig = this.cache.load(cachePassword);

      if (cachedConfig) {
        // Validar y corregir intervalos del caché
        this.config = this.validateSyncIntervals(cachedConfig);
        logger.info('✅ Configuración cargada desde caché local');

        // Validar que el caché tenga datos críticos
        const hasCriticalData = this.validateCriticalData(this.config);

        if (!hasCriticalData) {
          logger.warn('⚠️ Caché incompleto (faltan datos críticos de Firebird), sincronizando desde Supabase...');
          // Sincronizar INMEDIATAMENTE (con await) si faltan datos críticos
          await this.syncFromSupabase();
        } else {
          // Solo sincronizar en segundo plano si el caché tiene datos críticos
          this.syncFromSupabase().catch(err => {
            logger.warn('⚠️ Error sincronizando configuración desde Supabase:', err.message);
          });
        }
      } else {
        // No hay caché, cargar desde Supabase
        logger.info('📭 No hay caché local, descargando configuración desde Supabase...');
        await this.syncFromSupabase();
      }

      return this.config;
    } catch (error) {
      logger.error('❌ Error inicializando servicio de configuración:', error);
      throw error;
    }
  }

  /**
   * Validar y corregir intervalos de sincronización
   * Asegura que los intervalos no sean menores a 60 segundos
   */
  validateSyncIntervals(config) {
    const MIN_INTERVAL = 60;
    let corrected = false;

    // Validar chart_of_accounts_sync_interval
    if (config.chart_of_accounts_sync_interval !== null &&
        config.chart_of_accounts_sync_interval !== undefined &&
        config.chart_of_accounts_sync_interval < MIN_INTERVAL) {
      logger.warn(`⚠️ chart_of_accounts_sync_interval (${config.chart_of_accounts_sync_interval}) es menor a ${MIN_INTERVAL}, ajustando a ${MIN_INTERVAL}`);
      config.chart_of_accounts_sync_interval = MIN_INTERVAL;
      corrected = true;
    }

    // Validar products_sync_interval
    if (config.products_sync_interval !== null &&
        config.products_sync_interval !== undefined &&
        config.products_sync_interval < MIN_INTERVAL) {
      logger.warn(`⚠️ products_sync_interval (${config.products_sync_interval}) es menor a ${MIN_INTERVAL}, ajustando a ${MIN_INTERVAL}`);
      config.products_sync_interval = MIN_INTERVAL;
      corrected = true;
    }

    // Validar third_parties_sync_interval
    if (config.third_parties_sync_interval !== null &&
        config.third_parties_sync_interval !== undefined &&
        config.third_parties_sync_interval < MIN_INTERVAL) {
      logger.warn(`⚠️ third_parties_sync_interval (${config.third_parties_sync_interval}) es menor a ${MIN_INTERVAL}, ajustando a ${MIN_INTERVAL}`);
      config.third_parties_sync_interval = MIN_INTERVAL;
      corrected = true;
    }

    if (corrected) {
      logger.info('✅ Intervalos de sincronización validados y corregidos');
    }

    return config;
  }

  /**
   * Sincronizar configuración desde Supabase
   */
  async syncFromSupabase() {
    try {
      logger.info('🔄 Sincronizando configuración desde Supabase...');

      const { data, error } = await this.supabaseClient
        .from('invoice_config')
        .select('*')
        .eq('user_id', this.userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No existe configuración, crear una por defecto
          logger.info('📝 No existe configuración, creando configuración por defecto...');
          await this.createDefaultConfig();
          return;
        }
        throw error;
      }

      // Validar y corregir intervalos antes de guardar
      this.config = this.validateSyncIntervals(data);

      // Guardar en caché
      this.cache.save(this.config, this.cachePassword);

      logger.info('✅ Configuración sincronizada desde Supabase');
    } catch (error) {
      logger.error('❌ Error sincronizando desde Supabase:', error);

      // Si hay caché, usarlo como fallback
      if (this.config) {
        logger.warn('⚠️ Usando configuración en caché como fallback');
      } else {
        throw error;
      }
    }
  }

  /**
   * Crear configuración por defecto en Supabase
   */
  async createDefaultConfig() {
    try {
      const defaultConfig = {
        user_id: this.userId,
        config_version: '1.0.0',

        // Configuración de Firebird
        firebird_host: 'localhost',
        firebird_port: 3050,
        firebird_database: '',
        firebird_user: 'SYSDBA',
        firebird_password: '',

        // Sincronización
        third_parties_sync_interval: 30,
        chart_of_accounts_sync_interval: 60,
        products_sync_interval: 45,
        initial_sync_delay: 2,

        // Cuentas contables
        account_sync_ranges: '1000-9999',
        account_exclude_ranges: '',
        sync_only_active_accounts: true,
        exclude_zero_level_accounts: true,

        // Productos
        sync_only_active_products: true,
        sync_only_inventory_products: false,
        exclude_product_groups: '',
        include_product_groups: '',

        // Facturas
        enable_invoice_recovery: true,
        recovery_batch_size: 10,
        enable_auto_third_party_creation: true,
        use_invoice_number_for_invc: false,
        enable_invoice_polling: true, // Polling de respaldo habilitado por defecto
        invoice_polling_interval: 5, // Cada 5 minutos
        use_header_description_for_detail: false, // Usar descripción de entrada contable por defecto

        // Documentos
        default_project_code: '',
        default_activity_code: '',
        document_type: 'FIA',

        // Inventario
        sync_ea: true,
        sync_oc: false,
        ea_document_type: 'EAI',
        oc_document_type: 'OCI',
        contabilizar_ea: false,

        // Pinecone
        pinecone_api_key: '',
        pinecone_index_name: '',
        pinecone_environment: '',
        pinecone_namespace: '',

        // Embeddings
        embeddings_api_url: 'https://chatbotstools.asistentesautonomos.com/api/embeddings',
        embeddings_api_key: '',
        embeddings_dimension: 512,
        enable_pinecone_sync: true,
        pinecone_sync_interval: 60,
        pinecone_batch_size: 50,

        // Servicio
        log_level: 'info',
        service_name: 'supabase-firebird-sync',
        api_port: null
      };

      const { data, error } = await this.supabaseClient
        .from('invoice_config')
        .insert(defaultConfig)
        .select()
        .single();

      if (error) throw error;

      this.config = data;
      this.cache.save(data, this.cachePassword);

      logger.info('✅ Configuración por defecto creada');
    } catch (error) {
      logger.error('❌ Error creando configuración por defecto:', error);
      throw error;
    }
  }

  /**
   * Validar que la configuración tenga datos críticos
   * Datos críticos son aquellos necesarios para que el servicio funcione
   * @param {Object} config - Configuración a validar
   * @returns {boolean} - true si tiene todos los datos críticos
   */
  validateCriticalData(config) {
    if (!config) {
      return false;
    }

    // Validar credenciales de Firebird (críticas para conectar a la base de datos)
    const hasFirebirdDatabase = config.firebird_database &&
                                 config.firebird_database.trim() !== '';
    const hasFirebirdHost = config.firebird_host &&
                            config.firebird_host.trim() !== '';
    const hasFirebirdUser = config.firebird_user &&
                            config.firebird_user.trim() !== '';

    // Log de validación para debugging
    if (!hasFirebirdDatabase) {
      logger.debug('⚠️ Validación: falta firebird_database');
    }
    if (!hasFirebirdHost) {
      logger.debug('⚠️ Validación: falta firebird_host');
    }
    if (!hasFirebirdUser) {
      logger.debug('⚠️ Validación: falta firebird_user');
    }

    // Retornar true solo si TODOS los datos críticos están presentes
    return hasFirebirdDatabase && hasFirebirdHost && hasFirebirdUser;
  }

  /**
   * Obtener valor de configuración
   */
  get(key, defaultValue = null) {
    if (!this.config) {
      logger.warn(`⚠️ Configuración no inicializada, usando valor por defecto para ${key}`);
      return defaultValue;
    }
    return this.config[key] !== undefined ? this.config[key] : defaultValue;
  }

  /**
   * Obtener toda la configuración
   */
  getAll() {
    return this.config;
  }
}

module.exports = ConfigService;

