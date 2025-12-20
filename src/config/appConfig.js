const ConfigService = require('../services/configService');
const credentials = require('./index');
const logger = require('../utils/logger');

/**
 * Configuración global de la aplicación
 * Singleton que combina credenciales y configuración operativa
 */
class AppConfig {
  constructor() {
    this.configService = null;
    this.initialized = false;
  }

  /**
   * Inicializar configuración de la aplicación
   */
  async initialize() {
    if (this.initialized) {
      return this;
    }

    try {
      logger.info('🚀 Inicializando configuración de la aplicación...');

      // Crear instancia del servicio de configuración
      this.configService = new ConfigService();

      // Inicializar con credenciales
      await this.configService.initialize(
        credentials.supabase.url,
        credentials.supabase.anonKey,
        credentials.user.uuid,
        credentials.cache.password
      );

      this.initialized = true;
      logger.info('✅ Configuración de la aplicación inicializada');

      return this;
    } catch (error) {
      logger.error('❌ Error inicializando configuración de la aplicación:', error);
      throw error;
    }
  }

  /**
   * Obtener credenciales de Supabase
   */
  getSupabaseCredentials() {
    return credentials.supabase;
  }

  /**
   * Obtener credenciales de Firebird desde Supabase
   * (en lugar de desde .env)
   */
  getFirebirdCredentials() {
    if (!this.initialized) {
      throw new Error('AppConfig no ha sido inicializado. Llama a initialize() primero.');
    }

    // Leer desde configuración de Supabase
    return {
      host: this.configService.get('firebird_host', 'localhost'),
      port: this.configService.get('firebird_port', 3050),
      database: this.configService.get('firebird_database', ''),
      user: this.configService.get('firebird_user', 'SYSDBA'),
      password: this.configService.get('firebird_password', ''),
      lowercase_keys: false,
      role: null,
      pageSize: 4096
    };
  }

  /**
   * Obtener UUID del usuario
   */
  getUserUUID() {
    return credentials.user.uuid;
  }

  /**
   * Obtener configuración operativa
   */
  get(key, defaultValue = null) {
    if (!this.initialized) {
      throw new Error('AppConfig no ha sido inicializado. Llama a initialize() primero.');
    }
    return this.configService.get(key, defaultValue);
  }

  /**
   * Obtener toda la configuración operativa
   */
  getAll() {
    if (!this.initialized) {
      throw new Error('AppConfig no ha sido inicializado. Llama a initialize() primero.');
    }
    return this.configService.getAll();
  }

  /**
   * Sincronizar configuración desde Supabase
   */
  async sync() {
    if (!this.initialized) {
      throw new Error('AppConfig no ha sido inicializado. Llama a initialize() primero.');
    }
    await this.configService.syncFromSupabase();
  }

  /**
   * Verificar si está inicializado
   */
  isInitialized() {
    return this.initialized;
  }
}

// Exportar singleton
const appConfig = new AppConfig();
module.exports = appConfig;

