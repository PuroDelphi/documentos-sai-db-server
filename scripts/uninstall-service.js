#!/usr/bin/env node

/**
 * Script para desinstalar el servicio de Windows
 * Debe ejecutarse con privilegios de administrador
 */

const Service = require('node-windows').Service;
const path = require('path');
const readline = require('readline');
const fs = require('fs');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  try {
    console.log('='.repeat(70));
    console.log('  DESINSTALACIÓN DE SERVICIO DE WINDOWS');
    console.log('  Supabase-Firebird Sync Service');
    console.log('='.repeat(70));
    console.log();
    console.log('⚠️  IMPORTANTE: Este script debe ejecutarse como ADMINISTRADOR');
    console.log();

    // Verificar si existe el ejecutable
    const exePath = path.join(process.cwd(), 'dist', 'supabase-firebird-sync.exe');
    const useExecutable = fs.existsSync(exePath);

    let scriptPath;
    let defaultServiceName;

    if (useExecutable) {
      scriptPath = exePath;
      defaultServiceName = 'SupabaseFirebirdSync';
    } else {
      scriptPath = path.join(process.cwd(), 'src', 'index.js');
      defaultServiceName = 'SupabaseFirebirdSyncDev';
    }

    console.log('📝 NOMBRE DEL SERVICIO A DESINSTALAR');
    console.log();
    console.log(`Nombre por defecto: ${defaultServiceName}`);
    console.log();

    const customServiceName = await question(`Ingresa el nombre del servicio (Enter para usar "${defaultServiceName}"): `);
    const serviceName = customServiceName.trim() || defaultServiceName;

    console.log();
    console.log('Servicio a desinstalar:');
    console.log(`  Nombre: ${serviceName}`);
    console.log(`  Script: ${scriptPath}`);
    console.log();

    const confirm = await question('¿Deseas continuar con la desinstalación? (s/n): ');
    
    if (confirm.toLowerCase() !== 's' && confirm.toLowerCase() !== 'si') {
      console.log('❌ Desinstalación cancelada');
      rl.close();
      process.exit(0);
    }

    console.log();
    console.log('📦 Desinstalando servicio...');
    console.log();

    // Crear referencia al servicio
    const svc = new Service({
      name: serviceName,
      script: scriptPath
    });

    // Evento de desinstalación
    svc.on('uninstall', () => {
      console.log('✅ Servicio desinstalado exitosamente');
      console.log();
      console.log('El servicio ha sido eliminado del sistema');
      console.log();
      
      rl.close();
      process.exit(0);
    });

    // Evento de error
    svc.on('error', (err) => {
      console.error('❌ Error desinstalando servicio:', err);
      rl.close();
      process.exit(1);
    });

    // Desinstalar servicio
    svc.uninstall();

  } catch (error) {
    console.error('❌ Error:', error.message);
    rl.close();
    process.exit(1);
  }
}

main();

