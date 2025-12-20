const fs = require('fs');
const path = require('path');

// Intentar cargar .env encriptado si existe
const encryptedEnvPath = path.join(process.cwd(), '.env.encrypted');
const envPassword = process.env.ENV_PASSWORD;

if (fs.existsSync(encryptedEnvPath) && envPassword) {
  // Cargar desde archivo encriptado
  const EnvEncryption = require('../utils/envEncryption');
  const encryption = new EnvEncryption();

  try {
    encryption.loadEncryptedEnv(encryptedEnvPath, envPassword);
    console.log('✅ Credenciales cargadas desde archivo encriptado');
  } catch (error) {
    console.error('❌ Error cargando credenciales encriptadas:', error.message);
    console.error('💡 Verifica que la variable ENV_PASSWORD sea correcta');
    process.exit(1);
  }
} else {
  // Cargar desde .env normal
  require('dotenv').config();
}

/**
 * Configuración de credenciales (solo credenciales sensibles)
 *
 * IMPORTANTE: Las credenciales de Firebird se cargan desde Supabase (invoice_config)
 * Los valores del .env son opcionales y solo se usan para desarrollo/pruebas.
 *
 * La configuración operativa se carga desde ConfigService.
 */
const config = {
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY
  },
  firebird: {
    // DEPRECATED: Estos valores ya NO se usan en producción
    // Se mantienen solo para compatibilidad con scripts de prueba
    host: process.env.FIREBIRD_HOST || 'localhost',
    port: parseInt(process.env.FIREBIRD_PORT) || 3050,
    database: process.env.FIREBIRD_DATABASE || '',
    user: process.env.FIREBIRD_USER || 'SYSDBA',
    password: process.env.FIREBIRD_PASSWORD || '',
    lowercase_keys: false,
    role: null,
    pageSize: 4096
  },
  user: {
    uuid: process.env.USER_UUID
  },
  cache: {
    password: process.env.CONFIG_CACHE_PASSWORD
  }
};

// Validar configuración requerida (solo Supabase, usuario y caché)
const requiredConfig = [
  'supabase.url',
  'supabase.anonKey',
  'user.uuid',
  'cache.password'
];

for (const key of requiredConfig) {
  const value = key.split('.').reduce((obj, k) => obj && obj[k], config);
  if (!value) {
    throw new Error(`Configuración requerida faltante: ${key}`);
  }
}

module.exports = config;
