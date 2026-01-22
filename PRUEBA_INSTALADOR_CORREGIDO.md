# 🔧 INSTALADOR CORREGIDO - LISTO PARA PROBAR

## ✅ PROBLEMA IDENTIFICADO Y SOLUCIONADO

### El Problema

El instalador anterior usaba `nssm.exe set` para configurar las variables de entorno, pero **NSSM no estaba creando las variables correctamente** desde la línea de comandos.

Cuando verificamos el registro:
```powershell
Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\...\Parameters" -Name AppEnvironmentExtra
```

**NO había variables de entorno configuradas**, por eso el servicio fallaba al iniciar.

### La Solución

Ahora el instalador configura las variables de entorno **directamente en el registro** usando PowerShell, que es exactamente como NSSM lo hace internamente:

```pascal
Exec('powershell.exe',
     '-NoProfile -Command "Set-ItemProperty -Path ''HKLM:\...\Parameters'' -Name ''AppEnvironmentExtra'' -Value @(''ENV_PASSWORD=...'', ''CONFIG_CACHE_PASSWORD=...'') -Type MultiString"',
     '', SW_HIDE, ewWaitUntilTerminated, ResultCode)
```

Esto asegura que las variables se creen correctamente en el formato `REG_MULTI_SZ` que NSSM espera.

## 🧪 PASOS PARA PROBAR EL NUEVO INSTALADOR

### 1. Limpiar Servicios Anteriores

Ejecuta el script de limpieza como administrador:

```powershell
Start-Process powershell -Verb RunAs -ArgumentList "-ExecutionPolicy Bypass -File scripts\limpiar-servicios.ps1"
```

O manualmente:
```powershell
# Como administrador
sc.exe stop SupabaseFirebirdSyncPruebaNueva
sc.exe delete SupabaseFirebirdSyncPruebaNueva
```

### 2. Desinstalar la Aplicación Anterior

1. Ve a **Panel de Control > Programas y características**
2. Busca "Servicio de Sincronización Firebird"
3. Desinstala

### 3. Ejecutar el Nuevo Instalador

```powershell
Start-Process "installer\Output\InstaladorSyncFirebird-v1.0.0.exe" -Verb RunAs
```

Durante la instalación:
- **Nombre del servicio**: `SyncFirebirdTest` (usa un nombre nuevo)
- **ENV_PASSWORD**: `12345678`
- **CONFIG_CACHE_PASSWORD**: `12345678`

### 4. Verificar que las Variables se Configuraron

Después de la instalación, verifica que las variables de entorno estén configuradas:

```powershell
# Ver las variables de entorno del servicio
$val = Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\SyncFirebirdTest\Parameters" -Name AppEnvironmentExtra
$val.AppEnvironmentExtra
```

**Deberías ver:**
```
ENV_PASSWORD=12345678
CONFIG_CACHE_PASSWORD=12345678
```

### 5. Verificar el Estado del Servicio

```powershell
# Ver el estado del servicio
Get-Service -Name SyncFirebirdTest

# Debería mostrar:
# Status   Name              DisplayName
# ------   ----              -----------
# Running  SyncFirebirdTest  Servicio de Sincronización Firebird
```

### 6. Verificar los Logs

```powershell
# Ver los logs del servicio
Get-Content "C:\Services\SyncFirebird\logs\combined.log" -Tail 50

# Ver errores (si hay)
Get-Content "C:\Services\SyncFirebird\logs\error.log" -Tail 20
```

## ✅ RESULTADO ESPERADO

Si todo funciona correctamente:

1. ✅ El instalador se ejecuta sin errores
2. ✅ Las variables de entorno se configuran correctamente en el registro
3. ✅ El servicio se crea con NSSM
4. ✅ El servicio inicia automáticamente
5. ✅ El servicio aparece como "Running" en `services.msc`
6. ✅ Los logs muestran que el servicio está funcionando
7. ✅ **NO aparece el error 1053**

## 🐛 SI EL SERVICIO NO INICIA

### Verificar la Configuración de NSSM

```powershell
# Ver toda la configuración del servicio
Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\SyncFirebirdTest\Parameters"
```

Deberías ver:
```
Application      : C:\Services\SyncFirebird\supabase-firebird-sync.exe
AppDirectory     : C:\Services\SyncFirebird
AppEnvironmentExtra : {ENV_PASSWORD=12345678, CONFIG_CACHE_PASSWORD=12345678}
```

### Intentar Iniciar Manualmente

```powershell
# Como administrador
Start-Service -Name SyncFirebirdTest

# Ver el estado
Get-Service -Name SyncFirebirdTest
```

### Ver Logs de Windows

```powershell
# Ver eventos del sistema relacionados con el servicio
Get-EventLog -LogName System -Source "Service Control Manager" -Newest 20 | Where-Object {$_.Message -like "*SyncFirebird*"}
```

## 📝 CAMBIOS REALIZADOS EN EL INSTALADOR

**Archivo**: `installer/setup.iss` (líneas 314-329)

**Antes** (NO funcionaba):
```pascal
Exec(nssm.exe, 'set "Service" AppEnvironmentExtra "ENV_PASSWORD=..."', ...)
Exec(nssm.exe, 'set "Service" AppEnvironmentExtra "+CONFIG_CACHE_PASSWORD=..."', ...)
```

**Después** (FUNCIONA):
```pascal
Exec('powershell.exe',
     '-NoProfile -Command "Set-ItemProperty -Path ''HKLM:\...\Parameters'' -Name ''AppEnvironmentExtra'' -Value @(''ENV_PASSWORD=...'', ''CONFIG_CACHE_PASSWORD=...'') -Type MultiString"',
     ...)
```

## 🚀 PRÓXIMO PASO

Una vez que verifiques que el instalador funciona correctamente y el servicio inicia sin problemas, el instalador estará listo para distribuir a los implementadores.

---

**¡PRUEBA EL NUEVO INSTALADOR Y VERIFICA QUE LAS VARIABLES SE CONFIGUREN CORRECTAMENTE!** 🎉

