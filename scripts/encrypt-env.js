#!/usr/bin/env node

/**
 * Script para encriptar el archivo .env
 * Uso: node scripts/encrypt-env.js [password]
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
    console.log('  ENCRIPTACIÓN DE ARCHIVO .ENV');
    console.log('='.repeat(60));
    console.log();

    // Obtener contraseña
    let password = process.argv[2];
    
    if (!password) {
      password = await question('Ingresa la contraseña maestra: ');
      
      if (!password || password.length < 8) {
        console.error('❌ La contraseña debe tener al menos 8 caracteres');
        process.exit(1);
      }

      const confirmPassword = await question('Confirma la contraseña: ');
      
      if (password !== confirmPassword) {
        console.error('❌ Las contraseñas no coinciden');
        process.exit(1);
      }
    }

    console.log();

    // Rutas
    const envPath = path.join(process.cwd(), '.env');
    const encryptedPath = path.join(process.cwd(), '.env.encrypted');

    // Encriptar
    const encryption = new EnvEncryption();
    encryption.encrypt(envPath, password, encryptedPath);

    console.log();
    console.log('='.repeat(60));
    console.log('  INSTRUCCIONES IMPORTANTES');
    console.log('='.repeat(60));
    console.log();
    console.log('1. Guarda la contraseña en un lugar SEGURO');
    console.log('2. El archivo .env.encrypted contiene tu configuración encriptada');
    console.log('3. Puedes eliminar el archivo .env original si lo deseas');
    console.log('4. Para usar el servicio, necesitarás la contraseña');
    console.log();
    console.log('Archivos generados:');
    console.log(`  - ${encryptedPath}`);
    console.log();

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();

