# 📦 GUÍA DE COMPILACIÓN COMPLETA

Esta guía explica cómo compilar el ejecutable y el instalador del servicio de sincronización Firebird-Supabase.

---

## 🎯 REQUISITOS PREVIOS

### Software Necesario

1. **Node.js 18+** - Para compilar el ejecutable
   - Descargar: https://nodejs.org/

2. **Inno Setup 6** - Para compilar el instalador
   - Descargar: https://jrsoftware.org/isdl.php
   - Instalar en: `C:\Program Files (x86)\Inno Setup 6\`

3. **Git Bash** (opcional) - Para ejecutar comandos de Git
   - Incluido con Git for Windows

### Dependencias del Proyecto

Instalar las dependencias de Node.js:

```bash
npm install
```

---

## 🔐 PASO 0: ENCRIPTAR ARCHIVO .env (SOLO PRIMERA VEZ)

**IMPORTANTE**: Este paso solo se hace UNA VEZ cuando se crea el proyecto o cuando se cambian las credenciales.

### Comando para Encriptar

```bash
node scripts/encrypt-env.js
```

### ¿Qué hace este comando?

1. Lee el archivo `.env` (que contiene las credenciales en texto plano)
2. Lo encripta usando AES-256-CBC
3. Genera el archivo `.env.encrypted` (que se incluye en el instalador)

### Variables que se Encriptan

El archivo `.env` debe contener:

```env
# Supabase
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu-clave-anonima
SUPABASE_SERVICE_ROLE_KEY=tu-clave-de-servicio

# Configuración
USER_ID=9ea5c283-11c8-49c7-8d91-5d63ce25c0f2
API_PORT=3002
```

### Contraseñas de Encriptación

Durante la instalación, el usuario debe proporcionar DOS contraseñas:

1. **ENV_PASSWORD**: Para desencriptar el archivo `.env.encrypted`
2. **CONFIG_CACHE_PASSWORD**: Para desencriptar la configuración descargada de Supabase

**IMPORTANTE**: Estas contraseñas deben ser las mismas que se usaron para encriptar los archivos.

---

## 🚀 COMPILACIÓN RÁPIDA (TODO EN UNO)

### Comando Único

```powershell
.\scripts\build-all.ps1
```

Este script ejecuta automáticamente:
1. Compilación del ejecutable con PKG
2. Compilación del instalador con Inno Setup

### Opciones Avanzadas

```powershell
# Solo compilar el ejecutable
.\scripts\build-all.ps1 -SkipInstaller

# Solo compilar el instalador (si el ejecutable ya existe)
.\scripts\build-all.ps1 -SkipExecutable
```

---

## 🔧 COMPILACIÓN PASO A PASO

### PASO 1: Compilar el Ejecutable

```bash
npm run build:legacy
```

**¿Qué hace?**
- Usa `pkg` para compilar el código Node.js en un ejecutable standalone
- Genera: `dist/supabase-firebird-sync.exe` (~50 MB)
- Incluye Node.js 18 embebido

**Tecnología Usada**: PKG (no Node.js SEA)
- PKG es más maduro y estable
- Mejor compatibilidad con servicios de Windows
- Node.js SEA causaba problemas de compatibilidad

### PASO 2: Compilar el Instalador

```powershell
.\scripts\build-installer.ps1
```

**¿Qué hace?**
- Usa Inno Setup para crear el instalador
- Genera: `installer/Output/InstaladorSyncFirebird-v1.0.0.exe` (~50 MB)
- Incluye:
  - Ejecutable compilado
  - NSSM (Non-Sucking Service Manager)
  - fbclient.dll (cliente de Firebird 2.5)
  - .env.encrypted (configuración encriptada)
  - Documentación para implementadores

---

## 📂 ARCHIVOS GENERADOS

### Ejecutable

```
dist/supabase-firebird-sync.exe
```

- Tamaño: ~50 MB
- Incluye: Node.js 18 + código de la aplicación
- Standalone: No requiere Node.js instalado

### Instalador

```
installer/Output/InstaladorSyncFirebird-v1.0.0.exe
```

- Tamaño: ~50 MB
- Incluye: Ejecutable + NSSM + fbclient.dll + configuración + docs
- Instalador gráfico con wizard en español

---

## 🧪 VERIFICACIÓN

### Verificar el Ejecutable

```powershell
# Ver información del archivo
Get-Item dist\supabase-firebird-sync.exe | Select-Object Name, Length, LastWriteTime

# Probar ejecución manual (requiere variables de entorno)
cd dist
$env:ENV_PASSWORD="tu-contraseña"
$env:CONFIG_CACHE_PASSWORD="tu-contraseña"
.\supabase-firebird-sync.exe
```

### Verificar el Instalador

```powershell
# Ver información del archivo
Get-Item installer\Output\InstaladorSyncFirebird-v1.0.0.exe | Select-Object Name, Length, LastWriteTime

# Probar instalación (requiere permisos de administrador)
# Ejecutar el instalador manualmente
```

---

## 🔄 FLUJO COMPLETO DE DESARROLLO A PRODUCCIÓN

### 1. Desarrollo

```bash
# Ejecutar en modo desarrollo
npm run dev
```

### 2. Pruebas

```bash
# Ejecutar pruebas
npm test
```

### 3. Compilación

```powershell
# Compilar todo
.\scripts\build-all.ps1
```

### 4. Distribución

```
Entregar: installer\Output\InstaladorSyncFirebird-v1.0.0.exe
```

---

## 📝 NOTAS IMPORTANTES

### Sobre PKG vs Node.js SEA

**Usamos PKG** porque:
- ✅ Más maduro y estable
- ✅ Mejor compatibilidad con servicios de Windows
- ✅ Ampliamente usado en producción

**NO usamos Node.js SEA** porque:
- ❌ Tecnología muy nueva (Node.js 22+)
- ❌ Problemas de compatibilidad con servicios de Windows
- ❌ No encuentra módulos internos correctamente

### Sobre fbclient.dll

El instalador incluye `fbclient.dll` de Firebird 2.5 porque:
- Es necesario para conectarse a bases de datos Firebird 2.5
- No está incluido en el ejecutable compilado
- Debe estar en el mismo directorio que el ejecutable

---

## 🆘 SOLUCIÓN DE PROBLEMAS

### Error: "pkg: command not found"

```bash
npm install -g pkg
```

### Error: "Inno Setup no encontrado"

Instalar Inno Setup 6 en: `C:\Program Files (x86)\Inno Setup 6\`

### Error: "fbclient.dll no encontrado"

Copiar `fbclient.dll` desde la instalación de Firebird:

```powershell
Copy-Item "C:\Program Files (x86)\Firebird\Firebird_2_5\bin\fbclient.dll" -Destination "installer\fbclient.dll"
```

### El ejecutable no inicia

Verificar que las variables de entorno estén configuradas:
- `ENV_PASSWORD`
- `CONFIG_CACHE_PASSWORD`

---

## 📚 DOCUMENTOS RELACIONADOS

- `GUIA_INSTALACION_IMPLEMENTADORES.md` - Para implementadores
- `REFERENCIA_RAPIDA_INSTALACION.md` - Referencia rápida
- `FAQ_IMPLEMENTADORES.md` - Preguntas frecuentes

