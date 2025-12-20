#!/usr/bin/env node

/**
 * Script para instalar el servicio de Windows
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
    console.log('  INSTALACIÓN DE SERVICIO DE WINDOWS');
    console.log('  Supabase-Firebird Sync Service');
    console.log('='.repeat(70));
    console.log();
    console.log('⚠️  IMPORTANTE: Este script debe ejecutarse como ADMINISTRADOR');
    console.log();

    // Verificar si existe el ejecutable
    const exePath = path.join(process.cwd(), 'dist', 'supabase-firebird-sync.exe');
    const useExecutable = fs.existsSync(exePath);

    let scriptPath;
    let serviceName;
    let serviceDescription;

    if (useExecutable) {
      console.log('✅ Ejecutable encontrado:', exePath);
      scriptPath = exePath;
      serviceName = 'SupabaseFirebirdSync';
      serviceDescription = 'Servicio de sincronización entre Supabase y Firebird';
    } else {
      console.log('ℹ️  Ejecutable no encontrado, usando script Node.js');
      scriptPath = path.join(process.cwd(), 'src', 'index.js');
      serviceName = 'SupabaseFirebirdSyncDev';
      serviceDescription = 'Servicio de sincronización entre Supabase y Firebird (Desarrollo)';
    }

    console.log();
    console.log('Configuración del servicio:');
    console.log(`  Nombre: ${serviceName}`);
    console.log(`  Script: ${scriptPath}`);
    console.log();

    // Solicitar contraseña del .env si existe archivo encriptado
    const encryptedEnvPath = path.join(process.cwd(), '.env.encrypted');
    let envPassword = '';

    if (fs.existsSync(encryptedEnvPath)) {
      console.log('🔐 Archivo .env.encrypted detectado');
      envPassword = await question('Ingresa la contraseña del archivo .env: ');
      
      if (!envPassword) {
        console.error('❌ La contraseña es requerida para usar .env.encrypted');
        process.exit(1);
      }
      console.log();
    }

    const confirm = await question('¿Deseas continuar con la instalación? (s/n): ');
    
    if (confirm.toLowerCase() !== 's' && confirm.toLowerCase() !== 'si') {
      console.log('❌ Instalación cancelada');
      process.exit(0);
    }

    console.log();
    console.log('📦 Instalando servicio...');
    console.log();

    // Crear servicio
    const svc = new Service({
      name: serviceName,
      description: serviceDescription,
      script: scriptPath,
      nodeOptions: [],
      env: envPassword ? [
        {
          name: 'ENV_PASSWORD',
          value: envPassword
        }
      ] : []
    });

    // Evento de instalación
    svc.on('install', () => {
      console.log('✅ Servicio instalado exitosamente');
      console.log();
      console.log('Iniciando servicio...');
      svc.start();
    });

    // Evento de inicio
    svc.on('start', () => {
      console.log('✅ Servicio iniciado exitosamente');
      console.log();
      console.log('='.repeat(70));
      console.log('  SERVICIO INSTALADO Y EN EJECUCIÓN');
      console.log('='.repeat(70));
      console.log();
      console.log('Comandos útiles:');
      console.log(`  - Ver servicios: services.msc`);
      console.log(`  - Detener: net stop ${serviceName}`);
      console.log(`  - Iniciar: net start ${serviceName}`);
      console.log(`  - Desinstalar: node scripts/uninstall-service.js`);
      console.log();
      console.log('Logs del servicio:');
      console.log(`  - ${path.join(process.cwd(), 'logs', 'combined.log')}`);
      console.log(`  - ${path.join(process.cwd(), 'logs', 'error.log')}`);
      console.log();
      
      rl.close();
      process.exit(0);
    });

    // Evento de error
    svc.on('error', (err) => {
      console.error('❌ Error instalando servicio:', err);
      rl.close();
      process.exit(1);
    });

    // Instalar servicio
    svc.install();

  } catch (error) {
    console.error('❌ Error:', error.message);
    rl.close();
    process.exit(1);
  }
}

main();

