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
    let defaultServiceName;
    let serviceDescription;

    if (useExecutable) {
      console.log('✅ Ejecutable encontrado:', exePath);
      scriptPath = exePath;
      defaultServiceName = 'SupabaseFirebirdSync';
      serviceDescription = 'Servicio de sincronización entre Supabase y Firebird';
    } else {
      console.log('ℹ️  Ejecutable no encontrado, usando script Node.js');
      scriptPath = path.join(process.cwd(), 'src', 'index.js');
      defaultServiceName = 'SupabaseFirebirdSyncDev';
      serviceDescription = 'Servicio de sincronización entre Supabase y Firebird (Desarrollo)';
    }

    console.log();
    console.log('📝 CONFIGURACIÓN DEL NOMBRE DEL SERVICIO');
    console.log();
    console.log('Para instalar múltiples instancias en la misma máquina,');
    console.log('cada servicio debe tener un nombre único.');
    console.log();
    console.log(`Nombre por defecto: ${defaultServiceName}`);
    console.log();

    const customServiceName = await question(`Ingresa el nombre del servicio (Enter para usar "${defaultServiceName}"): `);
    const serviceName = customServiceName.trim() || defaultServiceName;

    // Validar que el nombre del servicio no contenga caracteres inválidos
    if (!/^[a-zA-Z0-9_-]+$/.test(serviceName)) {
      console.error('❌ El nombre del servicio solo puede contener letras, números, guiones y guiones bajos');
      process.exit(1);
    }

    console.log();
    console.log('Configuración del servicio:');
    console.log(`  Nombre: ${serviceName}`);
    console.log(`  Script: ${scriptPath}`);
    console.log();

    // Solicitar contraseñas si existe archivo encriptado
    const encryptedEnvPath = path.join(process.cwd(), '.env.encrypted');
    let envPassword = '';
    let configCachePassword = '';

    if (fs.existsSync(encryptedEnvPath)) {
      console.log('🔐 Archivo .env.encrypted detectado');
      console.log();
      envPassword = await question('Ingresa la contraseña del archivo .env: ');

      if (!envPassword) {
        console.error('❌ La contraseña es requerida para usar .env.encrypted');
        process.exit(1);
      }
      console.log();
    }

    // Solicitar contraseña para el caché de configuración
    console.log('🔐 Configuración del caché de configuración');
    console.log('   (Se usa para encriptar la configuración local desde Supabase)');
    console.log();
    configCachePassword = await question('Ingresa la contraseña para el caché de configuración: ');

    if (!configCachePassword) {
      console.error('❌ La contraseña del caché de configuración es requerida');
      process.exit(1);
    }
    console.log();

    const confirm = await question('¿Deseas continuar con la instalación? (s/n): ');

    if (confirm.toLowerCase() !== 's' && confirm.toLowerCase() !== 'si') {
      console.log('❌ Instalación cancelada');
      process.exit(0);
    }

    console.log();
    console.log('📦 Instalando servicio...');
    console.log();

    // Preparar variables de entorno para el servicio
    const envVars = [];

    if (envPassword) {
      envVars.push({
        name: 'ENV_PASSWORD',
        value: envPassword
      });
    }

    if (configCachePassword) {
      envVars.push({
        name: 'CONFIG_CACHE_PASSWORD',
        value: configCachePassword
      });
    }

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

