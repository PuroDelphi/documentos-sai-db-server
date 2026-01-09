#!/usr/bin/env node

/**
 * Script de diagnóstico para el servicio de sincronización
 * Verifica todas las dependencias y configuraciones necesarias
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(70));
console.log('DIAGNÓSTICO DEL SERVICIO DE SINCRONIZACIÓN');
console.log('='.repeat(70));
console.log();

// 1. Verificar Node.js
console.log('1. Verificando Node.js...');
console.log(`   Versión: ${process.version}`);
console.log(`   Plataforma: ${process.platform}`);
console.log(`   Arquitectura: ${process.arch}`);
console.log(`   Directorio de trabajo: ${process.cwd()}`);
console.log('   ✅ Node.js OK');
console.log();

// 2. Verificar archivo .env
console.log('2. Verificando archivo .env...');
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  console.log(`   ✅ Archivo .env encontrado en: ${envPath}`);
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
  console.log(`   Variables encontradas: ${lines.length}`);
  
  // Verificar variables críticas (sin mostrar valores)
  const criticalVars = [
    'FIREBIRD_HOST',
    'FIREBIRD_PORT',
    'FIREBIRD_DATABASE',
    'FIREBIRD_USER',
    'FIREBIRD_PASSWORD',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_KEY'
  ];
  
  criticalVars.forEach(varName => {
    const found = lines.some(line => line.startsWith(`${varName}=`));
    if (found) {
      console.log(`   ✅ ${varName} configurado`);
    } else {
      console.log(`   ❌ ${varName} NO configurado`);
    }
  });
} else {
  console.log(`   ❌ Archivo .env NO encontrado en: ${envPath}`);
  console.log('   Crea un archivo .env basado en .env.example');
}
console.log();

// 3. Verificar módulos de Node.js
console.log('3. Verificando módulos de Node.js...');
const requiredModules = [
  'dotenv',
  'node-firebird',
  '@supabase/supabase-js',
  'winston',
  'node-windows'
];

requiredModules.forEach(moduleName => {
  try {
    require.resolve(moduleName);
    console.log(`   ✅ ${moduleName}`);
  } catch (error) {
    console.log(`   ❌ ${moduleName} NO instalado`);
  }
});
console.log();

// 4. Verificar estructura de directorios
console.log('4. Verificando estructura de directorios...');
const requiredDirs = ['src', 'logs', 'config'];
requiredDirs.forEach(dir => {
  const dirPath = path.join(process.cwd(), dir);
  if (fs.existsSync(dirPath)) {
    console.log(`   ✅ ${dir}/`);
  } else {
    console.log(`   ❌ ${dir}/ NO existe`);
  }
});
console.log();

// 5. Intentar cargar configuración
console.log('5. Intentando cargar configuración...');
try {
  require('dotenv').config();
  console.log('   ✅ dotenv cargado');
  
  const appConfig = require('../src/config/appConfig');
  console.log('   ✅ appConfig cargado');
  
  // Intentar inicializar (esto puede fallar)
  appConfig.initialize()
    .then(() => {
      console.log('   ✅ Configuración inicializada correctamente');
      console.log();
      
      // 6. Verificar conexión a Firebird
      console.log('6. Verificando conexión a Firebird...');
      const firebirdConfig = appConfig.get('firebird');
      console.log(`   Host: ${firebirdConfig.host}`);
      console.log(`   Puerto: ${firebirdConfig.port}`);
      console.log(`   Base de datos: ${firebirdConfig.database}`);
      console.log(`   Usuario: ${firebirdConfig.user}`);

      // Verificar si el archivo de base de datos existe (solo para conexiones locales)
      if (firebirdConfig.host === 'localhost' || firebirdConfig.host === '127.0.0.1') {
        if (fs.existsSync(firebirdConfig.database)) {
          console.log(`   ✅ Archivo de base de datos encontrado: ${firebirdConfig.database}`);
        } else {
          console.log(`   ❌ Archivo de base de datos NO encontrado: ${firebirdConfig.database}`);
          console.log('   💡 Verifica que la ruta sea correcta y que el archivo exista');
        }
      }

      const Firebird = require('node-firebird');
      Firebird.attach(firebirdConfig, (err, db) => {
        if (err) {
          console.log('   ❌ Error conectando a Firebird:', err.message);
          if (err.message.includes('I/O error')) {
            console.log('   💡 El archivo de base de datos no existe o no tiene permisos de acceso');
            console.log('   💡 Verifica que la ruta sea correcta en la configuración de Supabase');
          }
        } else {
          console.log('   ✅ Conexión a Firebird exitosa');
          db.detach();
        }
        
        // 7. Verificar conexión a Supabase
        console.log();
        console.log('7. Verificando conexión a Supabase...');
        const supabaseConfig = appConfig.get('supabase');
        console.log(`   URL: ${supabaseConfig.url}`);
        
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey);
        
        supabase.from('third_parties').select('count', { count: 'exact', head: true })
          .then(({ error, count }) => {
            if (error) {
              console.log('   ❌ Error conectando a Supabase:', error.message);
            } else {
              console.log('   ✅ Conexión a Supabase exitosa');
              console.log(`   Registros en third_parties: ${count || 0}`);
            }
            
            console.log();
            console.log('='.repeat(70));
            console.log('DIAGNÓSTICO COMPLETADO');
            console.log('='.repeat(70));
          });
      });
    })
    .catch(error => {
      console.log('   ❌ Error inicializando configuración:', error.message);
      console.log('   Stack:', error.stack);
      console.log();
      console.log('='.repeat(70));
      console.log('DIAGNÓSTICO COMPLETADO CON ERRORES');
      console.log('='.repeat(70));
    });
} catch (error) {
  console.log('   ❌ Error cargando módulos:', error.message);
  console.log('   Stack:', error.stack);
  console.log();
  console.log('='.repeat(70));
  console.log('DIAGNÓSTICO COMPLETADO CON ERRORES');
  console.log('='.repeat(70));
}

