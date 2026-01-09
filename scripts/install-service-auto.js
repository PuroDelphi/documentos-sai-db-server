#!/usr/bin/env node

/**
 * Script para instalar el servicio de Windows AUTOMÁTICAMENTE
 * Lee las contraseñas desde las variables de entorno del sistema
 * Debe ejecutarse con privilegios de administrador
 */

const Service = require('node-windows').Service;
const path = require('path');
const fs = require('fs');

async function main() {
  try {
    console.log('='.repeat(70));
    console.log('  INSTALACIÓN AUTOMÁTICA DE SERVICIO DE WINDOWS');
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
    console.log('📝 Configuración del servicio:');
    console.log(`  Nombre: ${serviceName}`);
    console.log(`  Script: ${scriptPath}`);
    console.log();

    // Leer contraseñas desde variables de entorno del sistema
    const envPassword = process.env.ENV_PASSWORD;
    const configCachePassword = process.env.CONFIG_CACHE_PASSWORD || envPassword;

    console.log('🔍 Verificando variables de entorno...');
    console.log(`  ENV_PASSWORD: ${envPassword ? '✅ Configurado (longitud: ' + envPassword.length + ')' : '❌ NO configurado'}`);
    console.log(`  CONFIG_CACHE_PASSWORD: ${configCachePassword ? '✅ Configurado (longitud: ' + configCachePassword.length + ')' : '❌ NO configurado'}`);
    console.log();

    if (!envPassword) {
      console.error('❌ ERROR: ENV_PASSWORD no está configurado');
      console.error();
      console.error('Configura la variable de entorno ejecutando:');
      console.error('  [System.Environment]::SetEnvironmentVariable(\'ENV_PASSWORD\', \'TU_CONTRASEÑA\', \'Machine\')');
      console.error();
      console.error('Luego reinicia la terminal o ejecuta:');
      console.error('  .\\scripts\\reload-env.ps1');
      process.exit(1);
    }

    if (!configCachePassword) {
      console.error('❌ ERROR: CONFIG_CACHE_PASSWORD no está configurado');
      console.error();
      console.error('Configura la variable de entorno ejecutando:');
      console.error('  [System.Environment]::SetEnvironmentVariable(\'CONFIG_CACHE_PASSWORD\', \'TU_CONTRASEÑA\', \'Machine\')');
      console.error();
      console.error('O usa la misma contraseña que ENV_PASSWORD');
      process.exit(1);
    }

    console.log('📦 Instalando servicio...');
    console.log();

    // Preparar variables de entorno para el servicio
    const envVars = [
      {
        name: 'ENV_PASSWORD',
        value: envPassword
      },
      {
        name: 'CONFIG_CACHE_PASSWORD',
        value: configCachePassword
      }
    ];

    // Crear servicio
    const svc = new Service({
      name: serviceName,
      description: serviceDescription,
      script: scriptPath,
      nodeOptions: [],
      env: envVars
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
      console.log(`  - Desinstalar: dist\\uninstall-service.exe`);
      console.log();
      console.log('Logs del servicio:');
      console.log(`  - ${path.join(process.cwd(), 'logs', 'combined.log')}`);
      console.log(`  - ${path.join(process.cwd(), 'logs', 'error.log')}`);
      console.log();
      
      process.exit(0);
    });

    // Evento de error
    svc.on('error', (err) => {
      console.error('❌ Error instalando servicio:', err);
      process.exit(1);
    });

    // Instalar servicio
    svc.install();

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();

