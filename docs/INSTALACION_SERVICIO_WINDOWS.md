# 🪟 Instalación como Servicio de Windows

Esta guía te ayudará a instalar el servicio de sincronización Supabase-Firebird como un servicio de Windows, con ejecutable compilado y configuración centralizada encriptada.

> 💡 **¿Necesitas instalar múltiples instancias en la misma máquina?**
> Consulta la guía de [Instalación Multi-Instancia](INSTALACION_MULTI_INSTANCIA.md)

## 🎯 Arquitectura de Configuración

El servicio utiliza un **sistema de configuración centralizada** con dos niveles:

### 🔐 Nivel 1: Credenciales (Archivo .env encriptado)
- **Ubicación:** `.env.encrypted` en el servidor
- **Contenido:** Solo credenciales sensibles
  - Credenciales de Supabase (URL, API Key)
  - Credenciales de Firebird (host, usuario, contraseña)
  - UUID del usuario
  - Contraseña del caché de configuración
- **Encriptación:** AES-256-GCM
- **Acceso:** Solo al iniciar el servicio

### ☁️ Nivel 2: Configuración Operativa (Supabase)
- **Ubicación:** Tabla `invoice_config` en Supabase
- **Contenido:** Configuración operativa modificable
  - Intervalos de sincronización
  - Rangos de cuentas contables
  - Preferencias de productos
  - Configuración de Pinecone
  - Configuración de embeddings
  - Tipos de documentos
  - **Configuración de confiabilidad del Realtime** (NUEVO)
- **Caché local:** `.cache/config.encrypted` (encriptado)
- **Actualización:** Automática desde Supabase en cada inicio

### 💡 Ventajas de esta Arquitectura
- ✅ **Seguridad:** Credenciales encriptadas localmente
- ✅ **Flexibilidad:** Configuración modificable desde Supabase sin reiniciar
- ✅ **Multi-tenant:** Cada usuario tiene su propia configuración
- ✅ **Offline:** Caché local permite funcionar sin conexión a Supabase
- ✅ **Centralización:** Gestión de configuración desde un solo lugar
- ✅ **Alta Confiabilidad:** Sistema de triple protección para sincronización de facturas (NUEVO)

---

## � Sistema de Triple Protección para Sincronización (NUEVO)

El servicio incluye un **sistema de triple protección** que garantiza que ninguna factura se pierda y que el servicio NO requiera reinicio manual:

### 1️⃣ Realtime (Principal)
- Procesa facturas en tiempo real cuando se aprueban en Supabase
- Reconexión automática cuando el canal se cierra inesperadamente
- Recuperación automática de facturas pendientes al reconectar

### 2️⃣ Health Check (Cada 2 minutos)
- Verifica el estado del canal Realtime periódicamente
- Detecta estados no saludables (closed, leaving, unknown)
- Reconecta automáticamente si el canal no está saludable
- Ejecuta recuperación de facturas pendientes

### 3️⃣ Polling de Respaldo (Cada 5 minutos - Configurable)
- Verifica facturas pendientes en Supabase como red de seguridad
- Procesa facturas que no fueron capturadas por Realtime
- Configurable desde `invoice_config` en Supabase

### ✅ Beneficios:
- **Ninguna factura se pierde** - Triple capa de protección
- **Sin reinicio manual** - Reconexión automática
- **Alta disponibilidad** - El servicio se recupera automáticamente
- **Configurable** - Ajusta intervalos desde Supabase sin cambiar código

**Documentación completa:** Ver [docs/REALTIME_RELIABILITY_IMPROVEMENTS.md](REALTIME_RELIABILITY_IMPROVEMENTS.md)

---

## �📋 Requisitos del Sistema

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

#### Paso 1.3: Preparar el Archivo .env

**IMPORTANTE:** El archivo `.env` debe contener **SOLO credenciales**, no configuración operativa.

**Ejemplo de .env correcto:**
```env
# Credenciales de Supabase
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_anon_key_aqui

# UUID del usuario (obtenerlo de Supabase tabla invoice_users)
USER_UUID=7d2cb156-b71e-45e0-8863-d5017c6099ff

# Contraseña para encriptar el caché de configuración
CONFIG_CACHE_PASSWORD=tu_password_seguro_para_cache
```

**Nota:** La configuración operativa (intervalos, rangos, etc.) se gestiona desde Supabase en la tabla `invoice_config`.

#### Paso 1.4: Encriptar el Archivo .env (Opcional pero Recomendado)

```bash
npm run encrypt-env
```

O usa el ejecutable:
```bash
dist\encrypt-env.exe
```

**Guarda AMBAS contraseñas en un lugar seguro:**
- Contraseña del .env (para `ENV_PASSWORD`)
- Contraseña del caché (para `CONFIG_CACHE_PASSWORD`)

#### Paso 1.5: Configurar en Supabase (IMPORTANTE)

Antes de instalar en producción, **debes configurar la tabla `invoice_config` en Supabase**:

1. **Crear la tabla** (si no existe):
   - Ejecuta el script: `database/migrations/create_invoice_config_table.sql`

2. **Aplicar migraciones nuevas** (IMPORTANTE):
   - Ejecuta: `supabase/migrations/add_carprode_description_config.sql`
   - Ejecuta: `supabase/migrations/add_invoice_polling_config.sql`

   O ejecuta manualmente en Supabase SQL Editor:
   ```sql
   -- Migración 1: Descripción de CARPRODE
   ALTER TABLE invoice_config
   ADD COLUMN IF NOT EXISTS use_header_description_for_detail BOOLEAN DEFAULT false;

   -- Migración 2: Polling de facturas
   ALTER TABLE invoice_config
   ADD COLUMN IF NOT EXISTS enable_invoice_polling BOOLEAN DEFAULT true;

   ALTER TABLE invoice_config
   ADD COLUMN IF NOT EXISTS invoice_polling_interval INTEGER DEFAULT 5;
   ```

3. **Insertar configuración para tu usuario**:
   - Ejecuta el script: `database/migrations/insert_default_config.sql`
   - O inserta manualmente desde Supabase SQL Editor

4. **Verificar que existe el registro**:
   ```sql
   SELECT * FROM invoice_config WHERE user_id = 'tu-user-uuid';
   ```

**Documentación completa:** Ver [docs/CONFIGURACION_CENTRALIZADA.md](CONFIGURACION_CENTRALIZADA.md)

#### Paso 1.6: Preparar Paquete para Producción

Copia estos archivos/carpetas al servidor de producción:

```
📁 Carpeta del proyecto/
├── 📁 dist/
│   ├── supabase-firebird-sync.exe
│   ├── install-service.exe
│   ├── uninstall-service.exe
│   └── encrypt-env.exe
├── 📁 logs/ (crear carpeta vacía)
├── 📁 .cache/ (crear carpeta vacía - para caché de configuración)
├── .env.encrypted (o .env si no encriptaste)
├── install-service-standalone.bat
└── uninstall-service-standalone.bat
```

**Nota:** La carpeta `.cache/` se usará para almacenar la configuración encriptada desde Supabase.

### Fase 2: Instalación (En servidor de producción)

#### Paso 2.1: Instalar el Servicio

**⚠️ Ejecutar como ADMINISTRADOR:**

Haz clic derecho en `install-service-standalone.bat` → **Ejecutar como administrador**

**Durante la instalación se te solicitará:**
1. **Contraseña del .env** (si usas .env.encrypted)
   - Esta es la contraseña que usaste en `npm run encrypt-env`

2. **Contraseña del caché de configuración** (OBLIGATORIO)
   - Esta es la contraseña definida en `CONFIG_CACHE_PASSWORD` del .env
   - Se usa para encriptar el caché local de configuración desde Supabase

El script:
1. Verifica que existan los ejecutables
2. Verifica la configuración (.env o .env.encrypted)
3. Solicita las contraseñas necesarias
4. Instala el servicio de Windows con las variables de entorno
5. Inicia el servicio automáticamente

**Resultado:**
- Servicio instalado: `SupabaseFirebirdSync`
- Estado: En ejecución
- Inicio automático: Sí
- Variables de entorno configuradas: `ENV_PASSWORD`, `CONFIG_CACHE_PASSWORD`

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

---

## ⚙️ Gestión de Configuración

### Modificar Configuración Operativa

La configuración operativa (intervalos, rangos, preferencias) se gestiona desde Supabase:

1. **Acceder a Supabase:**
   - Ir a tu proyecto en Supabase
   - Abrir el SQL Editor o Table Editor

2. **Modificar configuración:**
   ```sql
   UPDATE invoice_config
   SET
     third_parties_sync_interval = 60,
     account_sync_ranges = '10000000-19999999,20000000-29999999'
   WHERE user_id = 'tu-user-uuid';
   ```

3. **Aplicar cambios:**
   - **Opción A:** Reiniciar el servicio (carga inmediata)
     ```bash
     net stop SupabaseFirebirdSync && net start SupabaseFirebirdSync
     ```

   - **Opción B:** Esperar a la próxima sincronización automática
     - El servicio sincroniza la configuración periódicamente

### Ver Configuración Actual

```sql
SELECT * FROM invoice_config WHERE user_id = 'tu-user-uuid';
```

### Configuraciones Disponibles

Ver documentación completa en [docs/CONFIGURACION_CENTRALIZADA.md](CONFIGURACION_CENTRALIZADA.md)

**Principales configuraciones:**

#### Sincronización de Datos
- `third_parties_sync_interval` - Intervalo de sincronización de terceros (minutos)
- `chart_of_accounts_sync_interval` - Intervalo de sincronización de cuentas (minutos)
- `products_sync_interval` - Intervalo de sincronización de productos (minutos)
- `account_sync_ranges` - Rangos de cuentas a sincronizar
- `account_exclude_ranges` - Rangos de cuentas a excluir
- `sync_only_active_accounts` - Solo sincronizar cuentas activas
- `sync_only_active_products` - Solo sincronizar productos activos

#### Confiabilidad del Realtime (NUEVO)
- `enable_invoice_polling` - Habilitar polling de facturas pendientes (true/false)
- `invoice_polling_interval` - Intervalo de polling en minutos (por defecto: 5)
- `enable_invoice_recovery` - Habilitar recuperación al inicio (true/false)
- `recovery_batch_size` - Tamaño de lote para recuperación (por defecto: 10)

#### Configuración de Facturas
- `use_invoice_number_for_invc` - Usar número de factura en campo INVC (true/false)
- `use_header_description_for_detail` - Usar descripción del encabezado en CARPRODE (true/false)
- `default_project_code` - Código de proyecto predeterminado
- `default_activity_code` - Código de actividad predeterminado
- `document_type` - Tipo de documento (FIA, FIL, etc.)

#### Otros
- `enable_pinecone_sync` - Habilitar sincronización con Pinecone
- `log_level` - Nivel de logs (debug, info, warn, error)

### Modificar Credenciales

Si necesitas cambiar credenciales (Supabase, Firebird):

1. **Editar archivo .env:**
   - Si usas `.env.encrypted`, primero desencríptalo
   - Modifica las credenciales necesarias

2. **Re-encriptar (si usas .env.encrypted):**
   ```bash
   dist\encrypt-env.exe
   ```

3. **Reinstalar el servicio:**
   ```bash
   # Desinstalar
   uninstall-service-standalone.bat

   # Reinstalar con nuevas credenciales
   install-service-standalone.bat
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
├── 📁 .cache/                        ← Caché de configuración (se crea automáticamente)
│   └── config.encrypted              ← Configuración desde Supabase (encriptado)
├── .env.encrypted                    ← Credenciales encriptadas
├── install-service-standalone.bat    ← Script de instalación
└── uninstall-service-standalone.bat  ← Script de desinstalación
```

**Configuración en Supabase:**
- ✅ Tabla `invoice_config` con registro para tu `user_id`
- ✅ Credenciales de Supabase en `.env.encrypted`

**NO necesitas:**
- ❌ Carpeta `node_modules/`
- ❌ Carpeta `src/`
- ❌ Archivo `.env` (ya está encriptado)
- ❌ **Node.js instalado** ✅
- ❌ npm instalado
- ❌ Configuración operativa en archivos locales (está en Supabase)

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

### Sistema de Doble Encriptación

El servicio utiliza **dos niveles de encriptación** para máxima seguridad:

#### 1. Encriptación de Credenciales (.env.encrypted)

**Contraseña:** `ENV_PASSWORD`

- **Contenido protegido:**
  - Credenciales de Supabase (URL, API Key)
  - Credenciales de Firebird (host, usuario, contraseña)
  - UUID del usuario
  - Contraseña del caché

- **Algoritmo:** AES-256-GCM (nivel militar)
- **Derivación de clave:** PBKDF2 con 100,000 iteraciones
- **Almacenamiento:** Variable de entorno del servicio de Windows

#### 2. Encriptación de Configuración (.cache/config.encrypted)

**Contraseña:** `CONFIG_CACHE_PASSWORD`

- **Contenido protegido:**
  - Configuración operativa desde Supabase
  - API Keys de servicios externos (Pinecone, Embeddings)
  - Preferencias del sistema

- **Algoritmo:** AES-256-GCM (nivel militar)
- **Derivación de clave:** PBKDF2 con 100,000 iteraciones
- **Actualización:** Automática desde Supabase

### Variables de Entorno del Servicio

Las contraseñas se pasan al servicio mediante variables de entorno:

- `ENV_PASSWORD` - Para desencriptar `.env.encrypted`
- `CONFIG_CACHE_PASSWORD` - Para encriptar/desencriptar caché de configuración

**Características de seguridad:**
- ✅ Se configuran automáticamente durante la instalación
- ✅ Se almacenan de forma segura en la configuración del servicio de Windows
- ✅ No se guardan en archivos de texto plano
- ✅ Solo accesibles por el servicio de Windows

### Recomendaciones de Seguridad

1. **Contraseñas fuertes:**
   - Mínimo 16 caracteres
   - Combinar mayúsculas, minúsculas, números y símbolos
   - Usar contraseñas diferentes para `ENV_PASSWORD` y `CONFIG_CACHE_PASSWORD`

2. **Gestión de contraseñas:**
   - Guardar en un gestor de contraseñas (1Password, Bitwarden, etc.)
   - Documentar qué contraseña es para qué propósito
   - Mantener backup seguro de las contraseñas

3. **Control de acceso:**
   - Solo personal autorizado debe conocer las contraseñas
   - Limitar acceso al servidor de producción
   - Usar autenticación de dos factores para Supabase

4. **Rotación de credenciales:**
   - Cambiar contraseñas periódicamente (cada 3-6 meses)
   - Rotar API Keys de servicios externos
   - Actualizar credenciales después de cambios de personal

5. **Auditoría:**
   - Revisar logs periódicamente
   - Monitorear accesos a Supabase
   - Verificar integridad de archivos encriptados

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

**Posibles causas:**

1. **Error de contraseña del .env:**
   - Verifica que `ENV_PASSWORD` sea correcta
   - Revisa `logs/error.log` para ver el error específico
   - Mensaje típico: "Contraseña incorrecta o archivo corrupto"

2. **Error de contraseña del caché:**
   - Verifica que `CONFIG_CACHE_PASSWORD` sea correcta
   - Debe coincidir con la definida en el `.env`

3. **Archivo .env.encrypted no existe:**
   - Verifica que el archivo exista en la raíz del proyecto
   - Si no existe, crea el `.env` y encríptalo

4. **Configuración no existe en Supabase:**
   - Verifica que exista un registro en `invoice_config` para tu `user_id`
   - Ejecuta: `SELECT * FROM invoice_config WHERE user_id = 'tu-uuid';`
   - Si no existe, inserta la configuración por defecto

5. **Permisos de carpetas:**
   - Verifica que la carpeta `logs/` exista y tenga permisos de escritura
   - Verifica que la carpeta `.cache/` exista y tenga permisos de escritura

**Solución:**
```bash
# Ver logs detallados
type logs\error.log

# Verificar que el servicio esté instalado
sc query SupabaseFirebirdSync

# Reintentar inicio
net start SupabaseFirebirdSync
```

### Error de contraseña incorrecta

**Si olvidaste la contraseña del .env:**

1. Recupera el archivo `.env` original de tu backup
2. Vuelve a encriptar con una nueva contraseña:
   ```bash
   dist\encrypt-env.exe
   ```
3. Reinstala el servicio con la nueva contraseña:
   ```bash
   uninstall-service-standalone.bat
   install-service-standalone.bat
   ```

**Si olvidaste la contraseña del caché:**

1. Edita el archivo `.env` (o desencríptalo primero)
2. Cambia el valor de `CONFIG_CACHE_PASSWORD`
3. Re-encripta el `.env` (si usas encriptación)
4. Reinstala el servicio

### El servicio se detiene inesperadamente

**Diagnóstico:**

1. **Revisar logs:**
   ```bash
   type logs\error.log
   type logs\combined.log
   ```

2. **Verificar conexiones:**
   - **Firebird:** Verifica que el servidor Firebird esté accesible
   - **Supabase:** Verifica que las credenciales sean correctas
   - **Red:** Verifica conectividad de red

3. **Verificar configuración:**
   ```sql
   -- En Supabase SQL Editor
   SELECT * FROM invoice_config WHERE user_id = 'tu-uuid';
   ```

4. **Verificar caché:**
   - Elimina `.cache/config.encrypted` y reinicia el servicio
   - El servicio recreará el caché desde Supabase

**Soluciones comunes:**

- **Error de conexión a Firebird:**
  ```
  Verifica FIREBIRD_HOST, FIREBIRD_PORT, FIREBIRD_DATABASE en .env
  ```

- **Error de conexión a Supabase:**
  ```
  Verifica SUPABASE_URL y SUPABASE_ANON_KEY en .env
  ```

- **Error de configuración:**
  ```
  Verifica que exista registro en invoice_config para tu user_id
  ```

### No se sincroniza la configuración desde Supabase

**Posibles causas:**

1. **No existe registro en invoice_config:**
   - Inserta configuración por defecto
   - Ver: `database/migrations/insert_default_config.sql`

2. **Caché corrupto:**
   - Elimina `.cache/config.encrypted`
   - Reinicia el servicio

3. **Contraseña del caché incorrecta:**
   - Verifica `CONFIG_CACHE_PASSWORD` en `.env`
   - Debe coincidir con la variable de entorno del servicio

**Solución:**
```bash
# Eliminar caché
del .cache\config.encrypted

# Reiniciar servicio
net stop SupabaseFirebirdSync
net start SupabaseFirebirdSync

# Verificar logs
type logs\combined.log
```

---

## 🔄 Instalación Multi-Instancia

¿Necesitas instalar **múltiples instancias** del servicio en la misma máquina?

### Casos de Uso:
- ✅ Múltiples empresas con bases de datos independientes
- ✅ Múltiples sucursales en el mismo servidor
- ✅ Varios clientes en un servidor compartido
- ✅ Ambientes separados (producción, staging, desarrollo)

### Guía Completa:

📖 **[Ver Guía de Instalación Multi-Instancia](INSTALACION_MULTI_INSTANCIA.md)**

Esta guía incluye:
- Arquitectura recomendada para múltiples instancias
- Instalación paso a paso de cada instancia
- Configuración de nombres únicos de servicio
- Gestión y monitoreo de múltiples servicios
- Solución de problemas específicos
- Ejemplos de configuración

### Script Helper:

Para facilitar la instalación de múltiples instancias, usa:

```bash
# Ejecutar como ADMINISTRADOR
install-multi-instance.bat
```

Este script:
- ✅ Valida que no exista un servicio con el mismo nombre
- ✅ Solicita un nombre único para el servicio
- ✅ Verifica todos los requisitos
- ✅ Instala el servicio con configuración independiente

---

## 📞 Soporte

Para más información, consulta:
- [README.md](../README.md) - Documentación general
- [Instalación Multi-Instancia](INSTALACION_MULTI_INSTANCIA.md) - Múltiples servicios
- [Configuración Centralizada](CONFIGURACION_CENTRALIZADA.md) - Sistema de configuración
- [Mejoras de Confiabilidad](REALTIME_RELIABILITY_IMPROVEMENTS.md) - Sistema de triple protección
- [Logs](../logs/) - Archivos de log del servicio

