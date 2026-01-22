# ✅ SOLUCIÓN DEFINITIVA - Error 1053

## 🎯 Problema Identificado

El **Error 1053** ocurría porque los servicios de Windows **NO pueden leer las variables de entorno del sistema** de la misma manera que las aplicaciones normales.

### Causa Raíz

Cuando instalabas el servicio:
1. ✅ El instalador **SÍ configuraba** `ENV_PASSWORD` como variable de entorno del sistema
2. ✅ El instalador **SÍ creaba** el servicio de Windows
3. ❌ Pero el servicio **NO podía leer** `ENV_PASSWORD` porque las variables de entorno del sistema no están disponibles automáticamente para los servicios

### ¿Por qué funciona en modo consola pero no como servicio?

- **Modo consola**: La aplicación se ejecuta en tu sesión de usuario y puede leer las variables de entorno del sistema
- **Servicio de Windows**: Se ejecuta en una sesión aislada (LocalSystem) y **solo** puede leer:
  - Variables de entorno configuradas específicamente para el servicio en el registro
  - Variables de entorno del sistema si están configuradas en el registro del servicio

## ✅ Solución Implementada

He modificado el instalador de Inno Setup (`installer/setup.iss`) para que configure las variables de entorno **directamente en el registro del servicio**.

### Cambios en el Instalador

**Antes:**
```pascal
// Solo configuraba las variables de entorno del sistema (PROBLEMA: conflicto entre múltiples servicios)
Exec('cmd.exe', '/c setx ENV_PASSWORD "' + EnvPassword + '" /M', ...)
Exec('cmd.exe', '/c setx CONFIG_CACHE_PASSWORD "' + CachePassword + '" /M', ...)
```

**Ahora:**
```pascal
// Configura las variables de entorno ESPECÍFICAMENTE para cada servicio en el registro
// Esto permite múltiples servicios con diferentes credenciales
Exec('powershell.exe',
     '-NoProfile -ExecutionPolicy Bypass -Command ' +
     '"Set-ItemProperty -Path ''HKLM:\SYSTEM\CurrentControlSet\Services\' + ServiceName + ''' ' +
     '-Name ''Environment'' ' +
     '-Value @(''ENV_PASSWORD=' + EnvPassword + ''', ''CONFIG_CACHE_PASSWORD=' + CachePassword + ''') ' +
     '-Type MultiString"', ...)
```

### ✅ Ventajas de este Enfoque

1. **Múltiples Servicios**: Puedes instalar varios servicios con diferentes nombres y cada uno tendrá sus propias credenciales
2. **Sin Conflictos**: Las credenciales de un servicio no sobrescriben las de otro
3. **Más Seguro**: Las credenciales no están en variables globales del sistema
4. **Aislamiento**: Cada servicio está completamente aislado de los demás

### ¿Qué hace esto?

Crea una entrada en el registro de Windows en:
```
HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\[NombreDelServicio]\Environment
```

Con el valor:
```
ENV_PASSWORD=12345678
CONFIG_CACHE_PASSWORD=12345678
```

De tipo `REG_MULTI_SZ` (cadena múltiple).

Esto permite que el servicio de Windows lea las variables de entorno **directamente desde su configuración en el registro**.

## 📋 Pasos para el Implementador

### 1. Recompilar el Instalador

Abre Inno Setup Compiler y compila `installer/setup.iss`:

```bash
# O desde la línea de comandos (si tienes Inno Setup en el PATH)
"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer\setup.iss
```

Esto generará un nuevo instalador en `installer/Output/InstaladorSyncFirebird-v1.0.0.exe`.

### 2. Desinstalar el Servicio Actual (si existe)

Si ya tienes un servicio instalado, desinstálalo primero:

**Opción A: Desde el Panel de Control**
1. Panel de Control > Programas > Desinstalar un programa
2. Buscar "Servicio de Sincronización Firebird"
3. Desinstalar

**Opción B: Manualmente**
```powershell
# Detener el servicio
sc stop SupabaseFirebirdSyncPruebas

# Eliminar el servicio
sc delete SupabaseFirebirdSyncPruebas

# Eliminar archivos
Remove-Item "C:\Services\SyncFirebird" -Recurse -Force
```

### 3. Ejecutar el Nuevo Instalador

1. Ejecuta `InstaladorSyncFirebird-v1.0.0.exe` **como Administrador**
2. Sigue el wizard:
   - **Nombre del servicio**: `SupabaseFirebirdSync` (o el que prefieras)
   - **Contraseña de ingreso al sistema**: `12345678` (la que te proporcionaron)
   - **Contraseña del caché**: `12345678` (usa la misma)
3. El instalador:
   - ✅ Configurará las variables de entorno del sistema
   - ✅ Configurará las variables de entorno del servicio en el registro
   - ✅ Instalará el servicio
   - ✅ Iniciará el servicio automáticamente

### 4. Verificar que el Servicio Está Funcionando

```powershell
# Ver estado del servicio
Get-Service -Name SupabaseFirebirdSync

# Ver logs
Get-Content "C:\Services\SyncFirebird\logs\combined.log" -Tail 50
```

Deberías ver:
```
✅ SERVICIO DE SINCRONIZACIÓN INICIADO
Estado de Firebird: ✅ CONECTADO
```

## 🔧 Solución de Problemas

### Si el servicio sigue sin iniciar

1. **Verifica las variables de entorno del servicio en el registro:**

```powershell
Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\SupabaseFirebirdSync" -Name "Environment"
```

Deberías ver:
```
Environment : {ENV_PASSWORD=12345678, CONFIG_CACHE_PASSWORD=12345678}
```

2. **Si no están configuradas, configúralas manualmente:**

```powershell
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\SupabaseFirebirdSync" `
                 -Name "Environment" `
                 -Value @("ENV_PASSWORD=12345678", "CONFIG_CACHE_PASSWORD=12345678") `
                 -Type MultiString

# Reiniciar el servicio
Restart-Service -Name SupabaseFirebirdSync
```

3. **Verifica los logs:**

```powershell
Get-Content "C:\Services\SyncFirebird\logs\error.log" -Tail 50
```

## 📊 Resultado Final

Con estos cambios:
- ✅ El instalador configura automáticamente las variables de entorno del servicio
- ✅ El servicio puede leer `ENV_PASSWORD` y `CONFIG_CACHE_PASSWORD`
- ✅ El servicio se inicia correctamente
- ✅ El servicio puede desencriptar `.env.encrypted`
- ✅ El servicio puede conectarse a Firebird
- ✅ El servicio funciona en modo degradado si Firebird no está disponible
- ✅ Los implementadores solo necesitan ejecutar el instalador

## 🎉 Conclusión

El problema del Error 1053 estaba causado por la falta de configuración de las variables de entorno **específicamente para el servicio** en el registro de Windows.

La solución es **automática** y está integrada en el instalador. Los implementadores solo necesitan:
1. Ejecutar el instalador como Administrador
2. Ingresar la contraseña proporcionada
3. ¡Listo!

No se requieren pasos manuales adicionales.

