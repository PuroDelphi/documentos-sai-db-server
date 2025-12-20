const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Utilidad para encriptar y desencriptar archivos .env
 * Usa AES-256-GCM para encriptación segura
 */
class EnvEncryption {
  constructor() {
    // Algoritmo de encriptación
    this.algorithm = 'aes-256-gcm';
    // Longitud de la clave (32 bytes para AES-256)
    this.keyLength = 32;
    // Longitud del IV (12 bytes recomendado para GCM)
    this.ivLength = 12;
    // Longitud del auth tag
    this.authTagLength = 16;
  }

  /**
   * Genera una clave de encriptación desde una contraseña
   * @param {string} password - Contraseña maestra
   * @param {Buffer} salt - Salt para derivación de clave
   * @returns {Buffer} Clave derivada
   */
  deriveKey(password, salt) {
    return crypto.pbkdf2Sync(
      password,
      salt,
      100000, // iteraciones
      this.keyLength,
      'sha256'
    );
  }

  /**
   * Encripta el contenido del archivo .env
   * @param {string} envPath - Ruta al archivo .env
   * @param {string} password - Contraseña maestra
   * @param {string} outputPath - Ruta del archivo encriptado (opcional)
   * @returns {string} Ruta del archivo encriptado
   */
  encrypt(envPath, password, outputPath = null) {
    try {
      // Leer archivo .env
      if (!fs.existsSync(envPath)) {
        throw new Error(`Archivo no encontrado: ${envPath}`);
      }

      const envContent = fs.readFileSync(envPath, 'utf8');

      // Generar salt e IV aleatorios
      const salt = crypto.randomBytes(32);
      const iv = crypto.randomBytes(this.ivLength);

      // Derivar clave desde la contraseña
      const key = this.deriveKey(password, salt);

      // Crear cipher
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);

      // Encriptar
      let encrypted = cipher.update(envContent, 'utf8');
      encrypted = Buffer.concat([encrypted, cipher.final()]);

      // Obtener auth tag
      const authTag = cipher.getAuthTag();

      // Combinar salt + iv + authTag + encrypted
      const result = Buffer.concat([
        salt,
        iv,
        authTag,
        encrypted
      ]);

      // Determinar ruta de salida
      const output = outputPath || envPath + '.encrypted';

      // Guardar archivo encriptado
      fs.writeFileSync(output, result);

      console.log(`✅ Archivo encriptado guardado en: ${output}`);
      console.log(`⚠️  IMPORTANTE: Guarda la contraseña en un lugar seguro`);
      console.log(`⚠️  Sin la contraseña NO podrás recuperar la configuración`);

      return output;
    } catch (error) {
      throw new Error(`Error encriptando archivo: ${error.message}`);
    }
  }

  /**
   * Desencripta el archivo .env
   * @param {string} encryptedPath - Ruta al archivo encriptado
   * @param {string} password - Contraseña maestra
   * @param {string} outputPath - Ruta del archivo desencriptado (opcional)
   * @returns {string} Contenido desencriptado
   */
  decrypt(encryptedPath, password, outputPath = null) {
    try {
      // Leer archivo encriptado
      if (!fs.existsSync(encryptedPath)) {
        throw new Error(`Archivo encriptado no encontrado: ${encryptedPath}`);
      }

      const encryptedData = fs.readFileSync(encryptedPath);

      // Extraer componentes
      const salt = encryptedData.slice(0, 32);
      const iv = encryptedData.slice(32, 32 + this.ivLength);
      const authTag = encryptedData.slice(32 + this.ivLength, 32 + this.ivLength + this.authTagLength);
      const encrypted = encryptedData.slice(32 + this.ivLength + this.authTagLength);

      // Derivar clave desde la contraseña
      const key = this.deriveKey(password, salt);

      // Crear decipher
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(authTag);

      // Desencriptar
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      const content = decrypted.toString('utf8');

      // Si se especifica ruta de salida, guardar archivo
      if (outputPath) {
        fs.writeFileSync(outputPath, content, 'utf8');
        console.log(`✅ Archivo desencriptado guardado en: ${outputPath}`);
      }

      return content;
    } catch (error) {
      if (error.message.includes('Unsupported state or unable to authenticate data')) {
        throw new Error('Contraseña incorrecta o archivo corrupto');
      }
      throw new Error(`Error desencriptando archivo: ${error.message}`);
    }
  }

  /**
   * Carga variables de entorno desde archivo encriptado
   * @param {string} encryptedPath - Ruta al archivo .env.encrypted
   * @param {string} password - Contraseña maestra
   */
  loadEncryptedEnv(encryptedPath, password) {
    try {
      const content = this.decrypt(encryptedPath, password);
      
      // Parsear y cargar variables de entorno
      const lines = content.split('\n');
      lines.forEach(line => {
        line = line.trim();
        
        // Ignorar líneas vacías y comentarios
        if (!line || line.startsWith('#')) {
          return;
        }

        // Parsear variable
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          let value = match[2].trim();
          
          // Remover comillas si existen
          if ((value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          
          // Establecer variable de entorno
          process.env[key] = value;
        }
      });

      console.log('✅ Variables de entorno cargadas desde archivo encriptado');
    } catch (error) {
      throw new Error(`Error cargando variables de entorno: ${error.message}`);
    }
  }
}

module.exports = EnvEncryption;

