const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const logger = require('./logger');

/**
 * Sistema de caché local encriptado para configuración
 * Almacena la configuración de Supabase localmente con encriptación AES-256-GCM
 */
class ConfigCache {
  constructor() {
    this.cacheDir = path.join(process.cwd(), '.cache');
    this.cacheFile = path.join(this.cacheDir, 'config.encrypted');
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16; // 128 bits
    this.saltLength = 64;
    this.tagLength = 16;
    this.iterations = 100000;
  }

  /**
   * Asegurar que el directorio de caché existe
   */
  ensureCacheDir() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Derivar clave de encriptación desde password
   */
  deriveKey(password, salt) {
    return crypto.pbkdf2Sync(
      password,
      salt,
      this.iterations,
      this.keyLength,
      'sha512'
    );
  }

  /**
   * Guardar configuración en caché encriptado
   * @param {Object} config - Configuración a guardar
   * @param {string} password - Contraseña para encriptar
   */
  save(config, password) {
    try {
      this.ensureCacheDir();

      // Generar salt e IV aleatorios
      const salt = crypto.randomBytes(this.saltLength);
      const iv = crypto.randomBytes(this.ivLength);

      // Derivar clave
      const key = this.deriveKey(password, salt);

      // Crear cipher
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);

      // Encriptar
      const configJson = JSON.stringify(config, null, 2);
      let encrypted = cipher.update(configJson, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Obtener auth tag
      const authTag = cipher.getAuthTag();

      // Crear estructura del archivo
      const fileData = {
        version: '1.0.0',
        algorithm: this.algorithm,
        iterations: this.iterations,
        salt: salt.toString('hex'),
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        data: encrypted,
        timestamp: new Date().toISOString()
      };

      // Guardar archivo
      fs.writeFileSync(this.cacheFile, JSON.stringify(fileData, null, 2), 'utf8');

      logger.info('✅ Configuración guardada en caché local encriptado');
      return true;
    } catch (error) {
      logger.error('❌ Error guardando configuración en caché:', error);
      throw error;
    }
  }

  /**
   * Cargar configuración desde caché encriptado
   * @param {string} password - Contraseña para desencriptar
   * @returns {Object|null} Configuración o null si no existe
   */
  load(password) {
    try {
      // Verificar que existe el archivo
      if (!fs.existsSync(this.cacheFile)) {
        logger.debug('No existe caché de configuración');
        return null;
      }

      // Leer archivo
      const fileContent = fs.readFileSync(this.cacheFile, 'utf8');
      const fileData = JSON.parse(fileContent);

      // Validar versión
      if (fileData.version !== '1.0.0') {
        logger.warn('Versión de caché no compatible');
        return null;
      }

      // Extraer componentes
      const salt = Buffer.from(fileData.salt, 'hex');
      const iv = Buffer.from(fileData.iv, 'hex');
      const authTag = Buffer.from(fileData.authTag, 'hex');
      const encrypted = fileData.data;

      // Derivar clave
      const key = this.deriveKey(password, salt);

      // Crear decipher
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(authTag);

      // Desencriptar
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      // Parsear JSON
      const config = JSON.parse(decrypted);

      logger.info('✅ Configuración cargada desde caché local');
      return config;
    } catch (error) {
      logger.error('❌ Error cargando configuración desde caché:', error.message);
      return null;
    }
  }

  /**
   * Verificar si existe caché
   */
  exists() {
    return fs.existsSync(this.cacheFile);
  }

  /**
   * Eliminar caché
   */
  clear() {
    try {
      if (fs.existsSync(this.cacheFile)) {
        fs.unlinkSync(this.cacheFile);
        logger.info('✅ Caché de configuración eliminado');
      }
    } catch (error) {
      logger.error('❌ Error eliminando caché:', error);
      throw error;
    }
  }
}

module.exports = ConfigCache;

