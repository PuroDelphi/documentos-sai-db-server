# 📦 INSTRUCCIONES PARA COMPILAR EL INSTALADOR

## ✅ PROBLEMA RESUELTO

El instalador ahora usa **NSSM (Non-Sucking Service Manager)** para convertir el ejecutable compilado en un servicio de Windows funcional.

### ¿Por qué NSSM?

- ✅ Los ejecutables compilados con `pkg` NO pueden funcionar como servicios de Windows directamente
- ✅ NSSM convierte cualquier `.exe` en un servicio de Windows
- ✅ NO requiere entregar el código fuente (solo el `.exe` compilado)
- ✅ Maneja automáticamente las señales de Windows (START, STOP, etc.)
- ✅ Soporta variables de entorno
- ✅ Reinicia automáticamente el servicio si falla

## 📋 REQUISITOS

1. **Inno Setup 6.x** - Descarga desde: https://jrsoftware.org/isdl.php
2. **Archivos compilados**:
   - `dist/supabase-firebird-sync.exe` (ejecutable compilado)
   - `.env.encrypted` (configuración encriptada)
   - `installer/nssm.exe` (ya incluido)

## 🔨 PASOS PARA COMPILAR EL INSTALADOR

### Opción 1: Usando el script de PowerShell (RECOMENDADO)

```powershell
# Ejecutar el script de compilación
.\scripts\build-installer.ps1
```

El script:
1. Verifica que Inno Setup esté instalado
2. Verifica que todos los archivos necesarios existan
3. Compila el instalador
4. Muestra la ubicación del instalador generado

### Opción 2: Compilar manualmente con Inno Setup

1. Abre **Inno Setup Compiler**
2. Abre el archivo `installer/setup.iss`
3. Presiona **F9** o ve a **Build > Compile**
4. El instalador se generará en `installer/Output/InstaladorSyncFirebird-v1.0.0.exe`

## 🧪 PROBAR EL INSTALADOR

### 1. Desinstalar el servicio de prueba actual

```powershell
# Detener y eliminar el servicio de prueba
Stop-Service -Name SupabaseFirebirdSyncTest -ErrorAction SilentlyContinue
sc.exe delete SupabaseFirebirdSyncTest

# También eliminar el servicio anterior si existe
Stop-Service -Name SupabaseFirebirdSyncPruebas -ErrorAction SilentlyContinue
sc.exe delete SupabaseFirebirdSyncPruebas
```

### 2. Ejecutar el instalador

1. Ejecuta `installer/Output/InstaladorSyncFirebird-v1.0.0.exe` **como Administrador**
2. Sigue el wizard de instalación:
   - **Nombre del servicio**: Ej. `SupabaseFirebirdSyncPrueba`
   - **Contraseña ENV_PASSWORD**: `12345678`
   - **Contraseña CONFIG_CACHE_PASSWORD**: `12345678`
3. El instalador:
   - Copiará los archivos a `C:\Services\SyncFirebird`
   - Instalará el servicio usando NSSM
   - Configurará las variables de entorno
   - Iniciará el servicio automáticamente

### 3. Verificar que el servicio funciona

```powershell
# Ver el estado del servicio
Get-Service -Name SupabaseFirebirdSyncPrueba

# Ver los logs del servicio
Get-Content "C:\Services\SyncFirebird\logs\combined.log" -Tail 50

# Ver si hay errores
Get-Content "C:\Services\SyncFirebird\logs\error.log" -Tail 20
```

### 4. Verificar las variables de entorno

```powershell
# Ver la configuración del servicio con NSSM
C:\Services\SyncFirebird\nssm.exe get SupabaseFirebirdSyncPrueba AppEnvironmentExtra
```

## 🎯 QUÉ ESPERAR

Si todo funciona correctamente:

1. ✅ El servicio se instala sin errores
2. ✅ El servicio inicia automáticamente
3. ✅ El servicio aparece como "En ejecución" en `services.msc`
4. ✅ Los logs muestran que el servicio está funcionando
5. ✅ NO aparece el error 1053

## 🐛 SOLUCIÓN DE PROBLEMAS

### El servicio no inicia

```powershell
# Ver los logs de NSSM
C:\Services\SyncFirebird\nssm.exe get SupabaseFirebirdSyncPrueba AppStdout
C:\Services\SyncFirebird\nssm.exe get SupabaseFirebirdSyncPrueba AppStderr

# Intentar iniciar manualmente
C:\Services\SyncFirebird\nssm.exe start SupabaseFirebirdSyncPrueba
```

### Ver la configuración completa del servicio

```powershell
# Ver toda la configuración de NSSM
C:\Services\SyncFirebird\nssm.exe dump SupabaseFirebirdSyncPrueba
```

### Reinstalar el servicio

```powershell
# Desinstalar
C:\Services\SyncFirebird\nssm.exe stop SupabaseFirebirdSyncPrueba
C:\Services\SyncFirebird\nssm.exe remove SupabaseFirebirdSyncPrueba confirm

# Volver a ejecutar el instalador
```

## 📝 NOTAS IMPORTANTES

1. **El instalador NO entrega código fuente** - Solo incluye:
   - El ejecutable compilado (`.exe`)
   - NSSM (`.exe`)
   - Configuración encriptada (`.env.encrypted`)
   - Documentación (`.md`)

2. **NSSM es open source** - Licencia: Public Domain
   - Puedes incluirlo en tu instalador sin problemas legales
   - Más info: https://nssm.cc/

3. **El servicio se ejecuta con la cuenta LocalSystem** por defecto
   - Tiene permisos para acceder a la base de datos Firebird
   - Puede escribir logs en `C:\Services\SyncFirebird\logs`

## 🚀 SIGUIENTE PASO

Una vez que el instalador funcione correctamente, puedes:

1. Distribuirlo a los implementadores
2. Crear un instalador para múltiples instancias (si es necesario)
3. Agregar más configuraciones al wizard (si es necesario)

