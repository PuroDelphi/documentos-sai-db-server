require('dotenv').config();

const config = {
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY
  },
  firebird: {
    host: process.env.FIREBIRD_HOST || 'localhost',
    port: parseInt(process.env.FIREBIRD_PORT) || 3050,
    database: process.env.FIREBIRD_DATABASE,
    user: process.env.FIREBIRD_USER || 'SYSDBA',
    password: process.env.FIREBIRD_PASSWORD,
    lowercase_keys: false,
    role: null,
    pageSize: 4096
  },
  service: {
    logLevel: process.env.LOG_LEVEL || 'info',
    name: process.env.SERVICE_NAME || 'supabase-firebird-sync'
  }
};

// Validar configuración requerida
const requiredConfig = [
  'supabase.url',
  'supabase.anonKey',
  'firebird.database',
  'firebird.password'
];

for (const key of requiredConfig) {
  const value = key.split('.').reduce((obj, k) => obj && obj[k], config);
  if (!value) {
    throw new Error(`Configuración requerida faltante: ${key}`);
  }
}

module.exports = config;
