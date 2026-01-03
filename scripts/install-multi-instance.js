#!/usr/bin/env node

/**
 * Script helper para instalar múltiples instancias del servicio
 * Facilita la configuración y validación de múltiples servicios en la misma máquina
 */

const Service = require('node-windows').Service;
const path = require('path');
const readline = require('readline');
const fs = require('fs');
const { execSync } = require('child_process');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

/**
 * Obtener lista de servicios instalados que coincidan con el patrón
 */
function getInstalledServices() {
  try {
    const output = execSync('sc query type= service state= all', { encoding: 'utf8' });
    const services = [];
    const lines = output.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('SERVICE_NAME:')) {
        const serviceName = line.split(':')[1].trim();
        if (serviceName.toLowerCase().includes('supabase') || serviceName.toLowerCase().includes('firebird')) {
          services.push(serviceName);
        }
      }
    }
    
    return services;
  } catch (error) {
    console.warn('⚠️  No se pudo obtener la lista de servicios:', error.message);
    return [];
  }
}

/**
 * Validar que el nombre del servicio no exista
 */
function validateServiceName(serviceName, existingServices) {
  if (!serviceName || serviceName.trim() === '') {
    return { valid: false, error: 'El nombre del servicio no puede estar vacío' };
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(serviceName)) {
    return { valid: false, error: 'El nombre solo puede contener letras, números, guiones y guiones bajos' };
  }

  if (existingServices.includes(serviceName)) {
    return { valid: false, error: `Ya existe un servicio con el nombre "${serviceName}"` };
  }

  return { valid: true };
}

async function main() {
  try {
    console.log('='.repeat(70));
    console.log('  INSTALACIÓN MULTI-INSTANCIA');
    console.log('  Supabase-Firebird Sync Service');
    console.log('='.repeat(70));
    console.log();
    console.log('⚠️  IMPORTANTE: Este script debe ejecutarse como ADMINISTRADOR');
    console.log();

    // Verificar ejecutable
    const exePath = path.join(process.cwd(), 'dist', 'supabase-firebird-sync.exe');
    if (!fs.existsSync(exePath)) {
      console.error('❌ No se encuentra el ejecutable: dist/supabase-firebird-sync.exe');
      console.error('   Por favor, compila el proyecto primero: npm run build:complete');
      process.exit(1);
    }

    console.log('✅ Ejecutable encontrado:', exePath);
    console.log();

    // Obtener servicios existentes
    console.log('🔍 Verificando servicios instalados...');
    const existingServices = getInstalledServices();
    
    if (existingServices.length > 0) {
      console.log();
      console.log('📋 Servicios relacionados ya instalados:');
      existingServices.forEach(svc => console.log(`   - ${svc}`));
      console.log();
    } else {
      console.log('   No se encontraron servicios relacionados instalados');
      console.log();
    }

    // Solicitar nombre del servicio
    console.log('📝 CONFIGURACIÓN DEL SERVICIO');
    console.log();
    console.log('Ejemplos de nombres:');
    console.log('  - SupabaseFirebirdSync-Empresa1');
    console.log('  - SupabaseFirebirdSync-Sucursal2');
    console.log('  - SyncFirebird-Cliente3');
    console.log();

    let serviceName = '';
    let isValid = false;

    while (!isValid) {
      serviceName = await question('Ingresa el nombre del servicio: ');
      serviceName = serviceName.trim();

      const validation = validateServiceName(serviceName, existingServices);
      
      if (validation.valid) {
        isValid = true;
      } else {
        console.error(`❌ ${validation.error}`);
        console.log();
      }
    }

    console.log();
    console.log('✅ Nombre del servicio válido:', serviceName);
    console.log();

    // Verificar archivo .env
    const envPath = path.join(process.cwd(), '.env');
    const envEncryptedPath = path.join(process.cwd(), '.env.encrypted');
    
    if (!fs.existsSync(envPath) && !fs.existsSync(envEncryptedPath)) {
      console.error('❌ No se encuentra archivo .env ni .env.encrypted');
      console.error('   Por favor, configura las credenciales primero');
      process.exit(1);
    }

    if (fs.existsSync(envPath)) {
      console.log('✅ Archivo .env encontrado');
    } else {
      console.log('✅ Archivo .env.encrypted encontrado');
    }
    console.log();

    // Solicitar contraseñas
    let envPassword = '';
    let configCachePassword = '';

    if (fs.existsSync(envEncryptedPath)) {
      console.log('🔐 Archivo .env.encrypted detectado');
      console.log();
      envPassword = await question('Ingresa la contraseña del archivo .env: ');

      if (!envPassword) {
        console.error('❌ La contraseña es requerida para usar .env.encrypted');
        process.exit(1);
      }
      console.log();
    }

    console.log('🔐 Configuración del caché de configuración');
    console.log('   (Se usa para encriptar la configuración local desde Supabase)');
    console.log();
    configCachePassword = await question('Ingresa la contraseña para el caché de configuración: ');

    if (!configCachePassword) {
      console.error('❌ La contraseña del caché de configuración es requerida');
      process.exit(1);
    }
    console.log();

    // Resumen de configuración
    console.log('='.repeat(70));
    console.log('  RESUMEN DE CONFIGURACIÓN');
    console.log('='.repeat(70));
    console.log();
    console.log(`  Nombre del servicio: ${serviceName}`);
    console.log(`  Ejecutable: ${exePath}`);
    console.log(`  Directorio: ${process.cwd()}`);
    console.log(`  Archivo de configuración: ${fs.existsSync(envPath) ? '.env' : '.env.encrypted'}`);
    console.log();

    const confirm = await question('¿Deseas continuar con la instalación? (s/n): ');

    if (confirm.toLowerCase() !== 's' && confirm.toLowerCase() !== 'si') {
      console.log('❌ Instalación cancelada');
      process.exit(0);
    }

    console.log();
    console.log('📦 Instalando servicio...');
    console.log();

    // Preparar variables de entorno
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
      description: `Servicio de sincronización entre Supabase y Firebird - ${serviceName}`,
      script: exePath,
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
      console.log('Información del servicio:');
      console.log(`  Nombre: ${serviceName}`);
      console.log(`  Directorio: ${process.cwd()}`);
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
      console.log('💡 IMPORTANTE: Para instalar otra instancia:');
      console.log('   1. Copia esta carpeta a otra ubicación');
      console.log('   2. Configura un .env diferente (con otro USER_UUID)');
      console.log('   3. Ejecuta este script nuevamente con otro nombre de servicio');
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


