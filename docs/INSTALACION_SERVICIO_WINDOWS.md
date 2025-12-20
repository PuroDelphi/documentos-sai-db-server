# 🪟 Instalación como Servicio de Windows

Esta guía te ayudará a instalar el servicio de sincronización Supabase-Firebird como un servicio de Windows, con ejecutable compilado y configuración encriptada.

## 📋 Requisitos del Sistema

### En el Servidor de Desarrollo (donde compilas)
- Windows 10 o superior
- **Node.js 18.x o superior** (requerido para compilar)
- npm (viene con Node.js)
- Privilegios de Administrador
- Archivo `.env` configurado correctamente

### En el Servidor de Producción (donde instalas)
- Windows 10 o superior
- Privilegios de Administrador
- **NO requiere Node.js instalado** ✅

## 🎯 Dos Métodos de Instalación

Hay dos formas de instalar el servicio, dependiendo de si tienes Node.js instalado en el servidor de producción:

### 🟢 Método A: Instalación Standalone (Recomendado)
**Sin Node.js en producción** - Usa ejecutables precompilados

### 🔵 Método B: Instalación con Node.js
**Con Node.js en producción** - Compila e instala en el mismo servidor

---

## 🟢 MÉTODO A: Instalación Standalone (Sin Node.js)

Este método te permite instalar el servicio en un servidor **sin Node.js instalado**.

### Fase 1: Compilación (En servidor de desarrollo)

#### Paso 1.1: Instalar Dependencias

```bash
npm install
```

#### Paso 1.2: Compilar TODOS los Ejecutables

```bash
npm run build:complete
```

O usa el script batch:
```bash
build-complete.bat
```

Este comando compila:
- ✅ `dist/supabase-firebird-sync.exe` - Servicio principal
- ✅ `dist/install-service.exe` - Instalador del servicio
- ✅ `dist/uninstall-service.exe` - Desinstalador del servicio
- ✅ `dist/encrypt-env.exe` - Encriptador de configuración

**Tiempo estimado:** 3-7 minutos

#### Paso 1.3: Encriptar el Archivo .env (Opcional pero Recomendado)

```bash
npm run encrypt-env
```

O usa el ejecutable:
```bash
dist\encrypt-env.exe
```

**Guarda la contraseña en un lugar seguro** - la necesitarás en producción.

#### Paso 1.4: Preparar Paquete para Producción

Copia estos archivos/carpetas al servidor de producción:

```
📁 Carpeta del proyecto/
├── 📁 dist/
│   ├── supabase-firebird-sync.exe
│   ├── install-service.exe
│   ├── uninstall-service.exe
│   └── encrypt-env.exe
├── 📁 logs/ (crear carpeta vacía)
├── .env.encrypted (o .env si no encriptaste)
├── install-service-standalone.bat
└── uninstall-service-standalone.bat
```

### Fase 2: Instalación (En servidor de producción)

#### Paso 2.1: Instalar el Servicio

**⚠️ Ejecutar como ADMINISTRADOR:**

Haz clic derecho en `install-service-standalone.bat` → **Ejecutar como administrador**

El script:
1. Verifica que existan los ejecutables
2. Verifica la configuración (.env o .env.encrypted)
3. Instala el servicio de Windows
4. Inicia el servicio automáticamente

**Resultado:**
- Servicio instalado: `SupabaseFirebirdSync`
- Estado: En ejecución
- Inicio automático: Sí

#### Paso 2.2: Verificar la Instalación

1. **Abrir Servicios de Windows:**
   - Presiona `Win + R`
   - Escribe `services.msc`
   - Busca `SupabaseFirebirdSync`

2. **Verificar logs:**
   ```
   logs/combined.log
   logs/error.log
   ```

---

## 🔵 MÉTODO B: Instalación con Node.js

Este método requiere Node.js instalado en el servidor de producción.

### Paso 1: Instalar Dependencias

```bash
npm install
```

### Paso 2: Encriptar el Archivo .env (Opcional)

```bash
npm run encrypt-env
```

### Paso 3: Compilar el Ejecutable

```bash
npm run build
```

### Paso 4: Instalar el Servicio

**⚠️ Ejecutar como ADMINISTRADOR:**

```bash
npm run install-service
```

O usa el script batch:
```bash
install-windows-service.bat
```

### Paso 5: Verificar la Instalación

1. **Abrir Servicios de Windows:**
   - Presiona `Win + R`
   - Escribe `services.msc`
   - Busca `SupabaseFirebirdSync`

2. **Verificar logs:**
   ```
   logs/combined.log
   logs/error.log
   ```

## 🎮 Comandos de Gestión del Servicio

### Detener el Servicio
```bash
net stop SupabaseFirebirdSync
```

### Iniciar el Servicio
```bash
net start SupabaseFirebirdSync
```

### Reiniciar el Servicio
```bash
net stop SupabaseFirebirdSync && net start SupabaseFirebirdSync
```

### Desinstalar el Servicio

**Método A (Standalone):**
```bash
# Ejecutar como administrador
uninstall-service-standalone.bat
```

**Método B (Con Node.js):**
```bash
npm run uninstall-service
```

## 📁 Estructura de Archivos en Producción

### Método A: Instalación Standalone

Archivos necesarios en el servidor de producción:

```
📦 Servidor de Producción (SIN Node.js)
├── 📁 dist/
│   ├── supabase-firebird-sync.exe    ← Servicio principal
│   ├── install-service.exe           ← Instalador (opcional después de instalar)
│   ├── uninstall-service.exe         ← Desinstalador
│   └── encrypt-env.exe               ← Encriptador (opcional)
├── 📁 logs/                          ← Logs del servicio
│   ├── combined.log
│   └── error.log
├── .env.encrypted                    ← Configuración encriptada
├── install-service-standalone.bat    ← Script de instalación
└── uninstall-service-standalone.bat  ← Script de desinstalación
```

**NO necesitas:**
- ❌ Carpeta `node_modules/`
- ❌ Carpeta `src/`
- ❌ Archivo `.env` (ya está encriptado)
- ❌ **Node.js instalado** ✅
- ❌ npm instalado

### Método B: Instalación con Node.js

Archivos necesarios en el servidor de producción:

```
📦 Servidor de Producción (CON Node.js)
├── 📁 dist/
│   └── supabase-firebird-sync.exe    ← Ejecutable compilado
├── 📁 scripts/
│   ├── install-service.js
│   └── uninstall-service.js
├── 📁 logs/                          ← Logs del servicio
│   ├── combined.log
│   └── error.log
├── .env.encrypted                    ← Configuración encriptada
├── package.json
└── node_modules/                     ← Dependencias (solo node-windows)
```

## 🔐 Seguridad

### Contraseña del .env

La contraseña se pasa al servicio mediante la variable de entorno `ENV_PASSWORD`:
- Se configura automáticamente durante la instalación
- Se almacena de forma segura en la configuración del servicio
- No se guarda en archivos de texto plano

### Recomendaciones

1. **Contraseña fuerte:** Usa al menos 12 caracteres con mayúsculas, minúsculas, números y símbolos
2. **Backup:** Guarda la contraseña en un gestor de contraseñas
3. **Acceso:** Solo personal autorizado debe conocer la contraseña
4. **Rotación:** Cambia la contraseña periódicamente

## 🔄 Actualización del Servicio

### Método A: Actualización Standalone

1. **En el servidor de desarrollo:**
   ```bash
   # Compilar nueva versión
   npm run build:complete
   ```

2. **Copiar al servidor de producción:**
   - Copia el nuevo `dist/supabase-firebird-sync.exe`

3. **En el servidor de producción:**
   ```bash
   # Detener el servicio
   net stop SupabaseFirebirdSync

   # Reemplazar el ejecutable en dist/
   # (copia el nuevo archivo)

   # Iniciar el servicio
   net start SupabaseFirebirdSync
   ```

### Método B: Actualización con Node.js

1. **Detener el servicio:**
   ```bash
   net stop SupabaseFirebirdSync
   ```

2. **Compilar nueva versión:**
   ```bash
   npm run build
   ```

3. **Iniciar el servicio:**
   ```bash
   net start SupabaseFirebirdSync
   ```

## ❓ Solución de Problemas

### El servicio no inicia

1. Verifica los logs en `logs/error.log`
2. Verifica que la contraseña sea correcta
3. Verifica que el archivo `.env.encrypted` exista
4. Verifica permisos de la carpeta `logs/`

### Error de contraseña incorrecta

Si olvidaste la contraseña:
1. Recupera el archivo `.env` original de tu backup
2. Vuelve a encriptar con una nueva contraseña
3. Reinstala el servicio

### El servicio se detiene inesperadamente

1. Revisa `logs/error.log` para ver el error
2. Verifica la conexión a Firebird
3. Verifica la conexión a Supabase
4. Verifica que todas las variables de entorno estén configuradas

## 📞 Soporte

Para más información, consulta:
- [README.md](../README.md) - Documentación general
- [Logs](../logs/) - Archivos de log del servicio

