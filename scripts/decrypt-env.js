#!/usr/bin/env node

/**
 * Script para desencriptar el archivo .env
 * Uso: node scripts/decrypt-env.js [password]
 */

const EnvEncryption = require('../src/utils/envEncryption');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  try {
    console.log('='.repeat(60));
    console.log('  DESENCRIPTACIÓN DE ARCHIVO .ENV');
    console.log('='.repeat(60));
    console.log();

    // Obtener contraseña
    let password = process.argv[2];
    
    if (!password) {
      password = await question('Ingresa la contraseña maestra: ');
      
      if (!password) {
        console.error('❌ Debes ingresar una contraseña');
        process.exit(1);
      }
    }

    console.log();

    // Rutas
    const encryptedPath = path.join(process.cwd(), '.env.encrypted');
    const envPath = path.join(process.cwd(), '.env');

    // Desencriptar
    const encryption = new EnvEncryption();
    encryption.decrypt(encryptedPath, password, envPath);

    console.log();
    console.log('✅ Archivo .env restaurado exitosamente');
    console.log();

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();

