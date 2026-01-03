# 📘 Guía de Instalación - Servicio de Sincronización Firebird

**Versión:** 1.0  
**Fecha:** Enero 2026  
**Audiencia:** Implementadores y Técnicos de Campo

---

## 📋 Descripción General

Este documento describe los pasos necesarios para instalar y configurar el **Servicio de Sincronización Firebird** en un servidor Windows.

El servicio sincroniza automáticamente datos desde una base de datos Firebird local hacia la nube, permitiendo:
- ✅ Consulta de facturas en tiempo real
- ✅ Sincronización automática de terceros, productos y cuentas contables
- ✅ Acceso remoto a información de facturación
- ✅ Respaldos automáticos en la nube

---

## 🎯 Requisitos Previos

### Sistema Operativo
- ✅ Windows Server 2012 R2 o superior
- ✅ Windows 10/11 (64 bits)

### Permisos
- ✅ Acceso como **Administrador** del sistema
- ✅ Permisos para instalar servicios de Windows

### Red
- ✅ Conexión a Internet estable
- ✅ Acceso al servidor Firebird (local o red)
- ✅ Puertos de salida HTTPS (443) abiertos

### Firebird
- ✅ Servidor Firebird instalado y funcionando
- ✅ Base de datos accesible
- ✅ Credenciales de acceso (usuario y contraseña)

---

## 📦 Archivos Proporcionados

El administrador del sistema le proporcionará los siguientes archivos:

```
📁 ServicioSync/
├── 📄 supabase-firebird-sync.exe    # Ejecutable del servicio
├── 📄 .env.encrypted                # Archivo de configuración encriptado
└── 📄 ENV_PASSWORD.txt              # Contraseña para desencriptar configuración
```

**IMPORTANTE:** 
- ⚠️ Guarde estos archivos en un lugar seguro
- ⚠️ NO comparta el archivo `ENV_PASSWORD.txt`
- ⚠️ NO modifique los archivos proporcionados

---

## 🚀 Proceso de Instalación

### Paso 1: Preparar el Directorio de Instalación

1. **Crear carpeta del servicio:**
   ```
   C:\Services\SyncFirebird\
   ```

2. **Copiar archivos proporcionados:**
   - Copiar `supabase-firebird-sync.exe` a `C:\Services\SyncFirebird\`
   - Copiar `.env.encrypted` a `C:\Services\SyncFirebird\`

3. **Verificar estructura:**
   ```
   C:\Services\SyncFirebird\
   ├── supabase-firebird-sync.exe
   └── .env.encrypted
   ```

---

### Paso 2: Configurar Variable de Entorno

La contraseña de configuración debe establecerse como variable de entorno del sistema.

**Opción A: Usando PowerShell (Recomendado)**

1. Abrir **PowerShell como Administrador**

2. Ejecutar el siguiente comando (reemplazar `TU_PASSWORD_AQUI` con la contraseña del archivo `ENV_PASSWORD.txt`):
   ```powershell
   [System.Environment]::SetEnvironmentVariable('ENV_PASSWORD', 'TU_PASSWORD_AQUI', 'Machine')
   ```

3. Verificar que se creó correctamente:
   ```powershell
   [System.Environment]::GetEnvironmentVariable('ENV_PASSWORD', 'Machine')
   ```

**Opción B: Usando la Interfaz Gráfica**

1. Presionar `Win + R` y escribir: `sysdm.cpl`
2. Ir a la pestaña **"Opciones avanzadas"**
3. Clic en **"Variables de entorno"**
4. En **"Variables del sistema"**, clic en **"Nueva"**
5. Configurar:
   - **Nombre:** `ENV_PASSWORD`
   - **Valor:** (pegar la contraseña del archivo `ENV_PASSWORD.txt`)
6. Clic en **"Aceptar"** en todas las ventanas

---

### Paso 3: Instalar el Servicio de Windows

1. **Abrir PowerShell como Administrador**

2. **Navegar al directorio de instalación:**
   ```powershell
   cd C:\Services\SyncFirebird
   ```

3. **Instalar el servicio:**
   ```powershell
   .\supabase-firebird-sync.exe install
   ```

4. **Verificar instalación:**
   ```powershell
   Get-Service -Name "SupabaseFirebirdSync"
   ```

   Debe mostrar:
   ```
   Status   Name                     DisplayName
   ------   ----                     -----------
   Stopped  SupabaseFirebirdSync     Supabase Firebird Sync Service
   ```

---

### Paso 4: Configurar el Servicio

1. **Abrir Servicios de Windows:**
   - Presionar `Win + R`
   - Escribir: `services.msc`
   - Presionar Enter

2. **Buscar el servicio:**
   - Buscar **"Supabase Firebird Sync Service"**
   - Doble clic para abrir propiedades

3. **Configurar inicio automático:**
   - En **"Tipo de inicio"**, seleccionar: **"Automático"**
   - Clic en **"Aplicar"**

4. **Configurar recuperación ante fallos:**
   - Ir a la pestaña **"Recuperación"**
   - Configurar:
     - **Primer error:** Reiniciar el servicio
     - **Segundo error:** Reiniciar el servicio
     - **Errores posteriores:** Reiniciar el servicio
     - **Reiniciar servicio después de:** 1 minuto
   - Clic en **"Aplicar"**

---

### Paso 5: Iniciar el Servicio

1. **En la ventana de propiedades del servicio:**
   - Clic en **"Iniciar"**
   - Esperar a que el estado cambie a **"En ejecución"**

2. **Verificar que inició correctamente:**
   ```powershell
   Get-Service -Name "SupabaseFirebirdSync"
   ```

   Debe mostrar:
   ```
   Status   Name                     DisplayName
   ------   ----                     -----------
   Running  SupabaseFirebirdSync     Supabase Firebird Sync Service
   ```

---

## ⚙️ Configuración del Sistema

Una vez instalado el servicio, debe configurar los parámetros operativos desde la **interfaz web de configuración**.

### Acceder a la Interfaz de Configuración

1. **Solicitar al administrador:**
   - URL de la interfaz web
   - Credenciales de acceso

2. **Iniciar sesión en la interfaz web**

3. **Configurar parámetros de Firebird:**
   - **Host:** Dirección IP o nombre del servidor Firebird
   - **Puerto:** Puerto del servidor (generalmente 3050)
   - **Base de datos:** Ruta completa al archivo .FDB
   - **Usuario:** Usuario de Firebird (generalmente SYSDBA)
   - **Contraseña:** Contraseña del usuario Firebird

4. **Configurar intervalos de sincronización:**
   - Terceros (clientes/proveedores)
   - Productos
   - Plan de cuentas
   - Facturas

5. **Guardar configuración**

6. **Reiniciar el servicio** para aplicar cambios:
   ```powershell
   Restart-Service -Name "SupabaseFirebirdSync"
   ```

---

## 📊 Verificación de Funcionamiento

### Verificar Logs del Servicio

Los logs se generan automáticamente en:
```
C:\Services\SyncFirebird\logs\
├── combined.log    # Todos los eventos
└── error.log       # Solo errores
```

**Revisar logs:**

1. **Abrir el archivo de logs:**
   ```powershell
   notepad C:\Services\SyncFirebird\logs\combined.log
   ```

2. **Buscar mensajes de inicio exitoso:**
   ```
   ✅ Conexión a Firebird establecida exitosamente
   ✅ Configuración de la aplicación inicializada
   🚀 Servicio iniciado correctamente
   ```

3. **Si hay errores, revisar:**
   ```powershell
   notepad C:\Services\SyncFirebird\logs\error.log
   ```

### Verificar Sincronización

1. **Acceder a la interfaz web de configuración**

2. **Ir a la sección "Estado del Sistema"**

3. **Verificar:**
   - ✅ Estado del servicio: **Activo**
   - ✅ Última sincronización: Fecha y hora reciente
   - ✅ Registros sincronizados: Números mayores a 0
   - ✅ Errores: 0

---

## 🔧 Comandos Útiles

### Gestión del Servicio

```powershell
# Ver estado del servicio
Get-Service -Name "SupabaseFirebirdSync"

# Iniciar servicio
Start-Service -Name "SupabaseFirebirdSync"

# Detener servicio
Stop-Service -Name "SupabaseFirebirdSync"

# Reiniciar servicio
Restart-Service -Name "SupabaseFirebirdSync"

# Ver logs en tiempo real (últimas 50 líneas)
Get-Content C:\Services\SyncFirebird\logs\combined.log -Tail 50 -Wait
```

### Desinstalar el Servicio (si es necesario)

```powershell
# 1. Detener el servicio
Stop-Service -Name "SupabaseFirebirdSync"

# 2. Desinstalar
cd C:\Services\SyncFirebird
.\supabase-firebird-sync.exe uninstall

# 3. Eliminar archivos (opcional)
Remove-Item -Path "C:\Services\SyncFirebird" -Recurse -Force
```

---

## ❓ Solución de Problemas Comunes

### El servicio no inicia

**Síntoma:** El servicio se detiene inmediatamente después de iniciarlo.

**Soluciones:**

1. **Verificar variable de entorno:**
   ```powershell
   [System.Environment]::GetEnvironmentVariable('ENV_PASSWORD', 'Machine')
   ```
   - Si está vacía, configurarla nuevamente (Paso 2)

2. **Verificar archivos:**
   - Confirmar que existe `C:\Services\SyncFirebird\.env.encrypted`
   - Confirmar que existe `C:\Services\SyncFirebird\supabase-firebird-sync.exe`

3. **Revisar logs de error:**
   ```powershell
   notepad C:\Services\SyncFirebird\logs\error.log
   ```

4. **Reiniciar el servidor** (a veces es necesario para que las variables de entorno se apliquen)

---

### Error de conexión a Firebird

**Síntoma:** En los logs aparece "Error conectando a Firebird"

**Soluciones:**

1. **Verificar que Firebird esté ejecutándose:**
   ```powershell
   Get-Service -Name "FirebirdServer*"
   ```

2. **Verificar configuración en la interfaz web:**
   - Host correcto (IP o nombre del servidor)
   - Puerto correcto (generalmente 3050)
   - Ruta de base de datos correcta
   - Credenciales correctas

3. **Probar conexión manual a Firebird:**
   - Usar herramientas como FlameRobin o IBExpert
   - Confirmar que se puede conectar con las mismas credenciales

4. **Verificar firewall:**
   - Asegurar que el puerto de Firebird esté abierto
   - Permitir conexiones desde el servidor donde está el servicio

---

### El servicio funciona pero no sincroniza datos

**Síntoma:** El servicio está activo pero no se ven datos sincronizados

**Soluciones:**

1. **Verificar configuración en la interfaz web:**
   - Confirmar que los intervalos de sincronización estén configurados
   - Confirmar que las opciones de sincronización estén habilitadas

2. **Revisar logs:**
   ```powershell
   Get-Content C:\Services\SyncFirebird\logs\combined.log -Tail 100
   ```
   - Buscar mensajes de sincronización
   - Buscar errores específicos

3. **Reiniciar el servicio:**
   ```powershell
   Restart-Service -Name "SupabaseFirebirdSync"
   ```

4. **Contactar al administrador del sistema**

---

### Logs muy grandes

**Síntoma:** Los archivos de log ocupan mucho espacio en disco

**Solución:**

Los logs se rotan automáticamente:
- Máximo 10 archivos de respaldo
- Máximo 10 MB por archivo
- Los archivos antiguos se eliminan automáticamente

Si necesita limpiar logs manualmente:
```powershell
# Detener servicio
Stop-Service -Name "SupabaseFirebirdSync"

# Eliminar logs antiguos
Remove-Item C:\Services\SyncFirebird\logs\*.log

# Iniciar servicio
Start-Service -Name "SupabaseFirebirdSync"
```

---

## 📞 Soporte y Contacto

### Antes de Contactar Soporte

Prepare la siguiente información:

1. **Información del sistema:**
   ```powershell
   # Versión de Windows
   systeminfo | findstr /B /C:"OS Name" /C:"OS Version"

   # Estado del servicio
   Get-Service -Name "SupabaseFirebirdSync"
   ```

2. **Logs recientes:**
   - Copiar las últimas 100 líneas de `combined.log`
   - Copiar todo el contenido de `error.log` (si existe)

3. **Configuración:**
   - Captura de pantalla de la interfaz web de configuración
   - Versión de Firebird instalada

### Información de Contacto

- **Administrador del Sistema:** [Proporcionado por su organización]
- **Soporte Técnico:** [Proporcionado por su organización]

---

## 📝 Lista de Verificación Post-Instalación

Marque cada ítem al completarlo:

- [ ] Archivos copiados a `C:\Services\SyncFirebird\`
- [ ] Variable de entorno `ENV_PASSWORD` configurada
- [ ] Servicio instalado correctamente
- [ ] Servicio configurado como inicio automático
- [ ] Recuperación ante fallos configurada
- [ ] Servicio iniciado y en ejecución
- [ ] Configuración completada en interfaz web
- [ ] Logs revisados sin errores
- [ ] Sincronización verificada en interfaz web
- [ ] Documentación archivada para referencia futura

---

## 📚 Anexos

### Anexo A: Estructura de Directorios

```
C:\Services\SyncFirebird\
├── supabase-firebird-sync.exe    # Ejecutable del servicio
├── .env.encrypted                # Configuración encriptada
├── logs\                         # Logs del servicio (se crea automáticamente)
│   ├── combined.log              # Todos los eventos
│   ├── error.log                 # Solo errores
│   └── combined-YYYY-MM-DD.log   # Logs rotados
└── .cache\                       # Caché del sistema (se crea automáticamente)
    └── config.encrypted          # Caché de configuración
```

### Anexo B: Puertos y Conectividad

**Puertos de salida requeridos:**
- **443 (HTTPS):** Para sincronización con la nube
- **3050 (Firebird):** Para conexión a base de datos Firebird (puede variar)

**Dominios que deben ser accesibles:**
- `*.supabase.co` (sincronización de datos)
- `chatbotstools.asistentesautonomos.com` (servicios adicionales)

### Anexo C: Requisitos de Hardware

**Mínimos:**
- CPU: 2 núcleos
- RAM: 2 GB
- Disco: 500 MB libres (para logs y caché)

**Recomendados:**
- CPU: 4 núcleos
- RAM: 4 GB
- Disco: 2 GB libres
- SSD para mejor rendimiento

---

## 📄 Historial de Versiones

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | Enero 2026 | Versión inicial del documento |

---

## ✅ Fin del Documento

**¡Instalación completada!**

Si tiene alguna pregunta o problema durante la instalación, no dude en contactar al administrador del sistema o al soporte técnico.

---

**Documento preparado para:** Implementadores y Técnicos de Campo
**Última actualización:** Enero 2026

