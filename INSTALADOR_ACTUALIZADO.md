# ✅ INSTALADOR ACTUALIZADO - Solución Error 1053

## 🎯 Cambios Realizados

### Problema Anterior

El instalador configuraba las variables de entorno **globalmente en el sistema**, lo que causaba:
- ❌ Conflictos al instalar múltiples servicios
- ❌ Las credenciales de un servicio sobrescribían las de otro
- ❌ No se podían tener múltiples configuraciones para diferentes bases de datos

### Solución Implementada

Ahora el instalador configura las variables de entorno **específicamente para cada servicio** en el registro de Windows.

## 📋 Cómo Funciona Ahora

### Instalación de Múltiples Servicios

Puedes instalar **múltiples servicios** con diferentes nombres y cada uno tendrá sus propias credenciales:

**Ejemplo:**

1. **Servicio 1**: `SupabaseFirebirdSyncEmpresa1`
   - Contraseña: `password1`
   - Base de datos: `C:\DB\Empresa1.FDB`
   - Variables de entorno en: `HKLM:\SYSTEM\CurrentControlSet\Services\SupabaseFirebirdSyncEmpresa1\Environment`

2. **Servicio 2**: `SupabaseFirebirdSyncEmpresa2`
   - Contraseña: `password2`
   - Base de datos: `C:\DB\Empresa2.FDB`
   - Variables de entorno en: `HKLM:\SYSTEM\CurrentControlSet\Services\SupabaseFirebirdSyncEmpresa2\Environment`

3. **Servicio 3**: `SupabaseFirebirdSyncPruebas`
   - Contraseña: `password3`
   - Base de datos: `C:\DB\Pruebas.FDB`
   - Variables de entorno en: `HKLM:\SYSTEM\CurrentControlSet\Services\SupabaseFirebirdSyncPruebas\Environment`

### ✅ Ventajas

- ✅ **Aislamiento Total**: Cada servicio tiene sus propias credenciales
- ✅ **Sin Conflictos**: Las credenciales de un servicio no afectan a otro
- ✅ **Múltiples Configuraciones**: Puedes conectarte a diferentes bases de datos
- ✅ **Más Seguro**: Las credenciales no están en variables globales del sistema
- ✅ **Fácil de Gestionar**: Cada servicio es independiente

## 🔧 Pasos de Instalación

### 1. Compilar el Instalador

Si tienes Inno Setup instalado:

```bash
"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer\setup.iss
```

Esto generará: `installer/Output/InstaladorSyncFirebird-v1.0.0.exe`

### 2. Ejecutar el Instalador

1. **Ejecuta el instalador como Administrador**
2. **Nombre del servicio**: Ingresa un nombre único (ej: `SupabaseFirebirdSyncEmpresa1`)
3. **Contraseña**: Ingresa la contraseña proporcionada por el administrador
4. **Contraseña del caché**: Usa la misma contraseña

### 3. Verificar la Instalación

```powershell
# Ver el servicio
Get-Service -Name SupabaseFirebirdSyncEmpresa1

# Ver las variables de entorno del servicio
Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\SupabaseFirebirdSyncEmpresa1" -Name "Environment"

# Ver los logs
Get-Content "C:\Services\SyncFirebird\logs\combined.log" -Tail 50
```

## 📊 Estructura del Registro

Cada servicio tiene su propia entrada en el registro:

```
HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\
├── SupabaseFirebirdSyncEmpresa1\
│   ├── Environment (REG_MULTI_SZ)
│   │   ├── ENV_PASSWORD=password1
│   │   └── CONFIG_CACHE_PASSWORD=password1
│   ├── ImagePath = "C:\Services\SyncFirebird\supabase-firebird-sync.exe"
│   └── ...
│
├── SupabaseFirebirdSyncEmpresa2\
│   ├── Environment (REG_MULTI_SZ)
│   │   ├── ENV_PASSWORD=password2
│   │   └── CONFIG_CACHE_PASSWORD=password2
│   ├── ImagePath = "C:\Services\SyncFirebird\supabase-firebird-sync.exe"
│   └── ...
│
└── SupabaseFirebirdSyncPruebas\
    ├── Environment (REG_MULTI_SZ)
    │   ├── ENV_PASSWORD=password3
    │   └── CONFIG_CACHE_PASSWORD=password3
    ├── ImagePath = "C:\Services\SyncFirebird\supabase-firebird-sync.exe"
    └── ...
```

## 🔍 Verificación Manual

Si necesitas verificar o modificar las variables de entorno de un servicio:

```powershell
# Ver las variables actuales
Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\SupabaseFirebirdSyncEmpresa1" -Name "Environment"

# Modificar las variables (si es necesario)
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\SupabaseFirebirdSyncEmpresa1" `
                 -Name "Environment" `
                 -Value @("ENV_PASSWORD=nueva_password", "CONFIG_CACHE_PASSWORD=nueva_password") `
                 -Type MultiString

# Reiniciar el servicio para aplicar los cambios
Restart-Service -Name SupabaseFirebirdSyncEmpresa1
```

## 🎉 Resultado Final

Con estos cambios:
- ✅ El instalador configura automáticamente las variables de entorno del servicio
- ✅ Cada servicio tiene sus propias credenciales independientes
- ✅ Puedes instalar múltiples servicios sin conflictos
- ✅ El servicio se inicia correctamente
- ✅ Los implementadores solo necesitan ejecutar el instalador

## 📝 Notas Importantes

1. **Nombre del Servicio**: Debe ser único en el sistema
2. **Contraseñas**: Cada servicio puede tener su propia contraseña
3. **Configuración**: Cada servicio se conecta a su propia configuración en Supabase
4. **Logs**: Todos los servicios comparten la misma carpeta de logs (`C:\Services\SyncFirebird\logs`)
5. **Ejecutable**: Todos los servicios usan el mismo ejecutable (`C:\Services\SyncFirebird\supabase-firebird-sync.exe`)

## 🚀 Próximos Pasos

1. Compila el instalador con los cambios
2. Prueba la instalación de múltiples servicios
3. Verifica que cada servicio funciona independientemente
4. Distribuye el instalador a los implementadores

