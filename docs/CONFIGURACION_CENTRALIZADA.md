# 🔧 Configuración Centralizada

## 📋 Descripción

El servicio utiliza un sistema de **configuración centralizada** que separa las credenciales sensibles de la configuración operativa:

- **Credenciales sensibles** → Archivo `.env` encriptado (API keys, contraseñas)
- **Configuración operativa** → Tabla `invoice_config` en Supabase (rangos, intervalos, preferencias)
- **Caché local** → Archivo `.cache/config.encrypted` (copia encriptada para acceso rápido)

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    SERVICIO DE SINCRONIZACIÓN                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   AppConfig     │
                    │   (Singleton)   │
                    └─────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
    ┌───────────────────┐       ┌───────────────────┐
    │  Credenciales     │       │  ConfigService    │
    │  (.env encrypted) │       │  (Supabase)       │
    └───────────────────┘       └───────────────────┘
                                          │
                                          ▼
                              ┌───────────────────────┐
                              │  Caché Local          │
                              │  (.cache/config.enc)  │
                              └───────────────────────┘
```

---

## 🔐 Archivo .env (Credenciales)

El archivo `.env` contiene **SOLO credenciales sensibles**:

```env
# Credenciales de Supabase
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_anon_key_aqui

# Credenciales de Firebird
FIREBIRD_HOST=localhost
FIREBIRD_PORT=3050
FIREBIRD_DATABASE=C:/path/to/database.fdb
FIREBIRD_USER=SYSDBA
FIREBIRD_PASSWORD=tu_password_aqui

# Usuario del servicio
USER_UUID=uuid-del-usuario-en-invoice_user

# Contraseña para encriptar caché de configuración
CONFIG_CACHE_PASSWORD=password_seguro_para_cache
```

### Encriptar el .env

```bash
# Desarrollo (con Node.js)
npm run encrypt-env

# Producción (sin Node.js)
dist\encrypt-env.exe
```

---

## 📊 Tabla invoice_config (Configuración Operativa)

Toda la configuración operativa se almacena en Supabase en la tabla `invoice_config`:

### Crear la tabla

```bash
# Ejecutar la migración en Supabase
psql -h db.tu-proyecto.supabase.co -U postgres -d postgres -f database/migrations/create_invoice_config_table.sql
```

O ejecutar el SQL directamente en el SQL Editor de Supabase.

### Configuraciones disponibles

| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `third_parties_sync_interval` | INTEGER | 30 | Intervalo de sincronización de terceros (minutos) |
| `chart_of_accounts_sync_interval` | INTEGER | 60 | Intervalo de sincronización de cuentas (minutos) |
| `account_sync_ranges` | TEXT | '1000-9999' | Rangos de cuentas a sincronizar |
| `account_exclude_ranges` | TEXT | '' | Rangos de cuentas a excluir |
| `sync_only_active_accounts` | BOOLEAN | true | Sincronizar solo cuentas activas |
| `exclude_zero_level_accounts` | BOOLEAN | true | Excluir cuentas de nivel 0 |
| `products_sync_interval` | INTEGER | 45 | Intervalo de sincronización de productos (minutos) |
| `sync_only_active_products` | BOOLEAN | true | Sincronizar solo productos activos |
| `sync_only_inventory_products` | BOOLEAN | false | Sincronizar solo productos de inventario |
| `exclude_product_groups` | TEXT | '' | Grupos de productos a excluir |
| `include_product_groups` | TEXT | '' | Grupos de productos a incluir |
| `initial_sync_delay` | INTEGER | 2 | Delay inicial antes de sincronizar (minutos) |
| `enable_invoice_recovery` | BOOLEAN | true | Habilitar recuperación de facturas |
| `recovery_batch_size` | INTEGER | 10 | Tamaño de lote para recuperación |
| `enable_auto_third_party_creation` | BOOLEAN | true | Crear terceros automáticamente |
| `use_invoice_number_for_invc` | BOOLEAN | false | Usar invoice_number en campo INVC |
| `default_project_code` | VARCHAR(10) | '' | Código de proyecto predeterminado |
| `default_activity_code` | VARCHAR(3) | '' | Código de actividad predeterminado |
| `document_type` | VARCHAR(3) | 'FIA' | Tipo de documento para facturas |
| `sync_ea` | BOOLEAN | true | Sincronizar a Entradas de Almacén |
| `sync_oc` | BOOLEAN | false | Sincronizar a Órdenes de Compra |
| `ea_document_type` | VARCHAR(3) | 'EAI' | Tipo de documento para EA |
| `oc_document_type` | VARCHAR(3) | 'OCI' | Tipo de documento para OC |
| `contabilizar_ea` | BOOLEAN | false | Contabilizar EA automáticamente |
| `pinecone_api_key` | TEXT | '' | API Key de Pinecone |
| `pinecone_index_name` | TEXT | '' | Nombre del índice de Pinecone |
| `pinecone_environment` | TEXT | '' | Entorno de Pinecone |
| `pinecone_namespace` | TEXT | '' | Namespace de Pinecone |
| `embeddings_api_url` | TEXT | 'https://...' | URL del servicio de embeddings |
| `embeddings_api_key` | TEXT | '' | API Key del servicio de embeddings |
| `embeddings_dimension` | INTEGER | 512 | Dimensión de los embeddings |
| `enable_pinecone_sync` | BOOLEAN | true | Habilitar sincronización con Pinecone |
| `pinecone_sync_interval` | INTEGER | 60 | Intervalo de sincronización con Pinecone (minutos) |
| `pinecone_batch_size` | INTEGER | 50 | Tamaño de lote para Pinecone |
| `log_level` | VARCHAR(20) | 'info' | Nivel de logging |
| `service_name` | VARCHAR(100) | 'supabase-firebird-sync' | Nombre del servicio |
| `api_port` | INTEGER | NULL | Puerto para API de control (opcional) |

---

## 🔄 Flujo de Configuración

### 1. Inicio del Servicio

```javascript
// 1. Cargar credenciales desde .env encriptado
const credentials = require('./config/index');

// 2. Inicializar AppConfig
await appConfig.initialize();

// 3. AppConfig carga ConfigService
// 4. ConfigService intenta cargar desde caché local
// 5. Si no hay caché, carga desde Supabase
// 6. Guarda en caché local encriptado
// 7. Sincroniza en segundo plano desde Supabase
```

### 2. Acceso a Configuración

```javascript
// Obtener credenciales
const supabaseUrl = appConfig.getSupabaseCredentials().url;
const firebirdConfig = appConfig.getFirebirdCredentials();

// Obtener configuración operativa
const syncInterval = appConfig.get('third_parties_sync_interval', 30);
const accountRanges = appConfig.get('account_sync_ranges', '1000-9999');
```

### 3. Modificar Configuración

Para modificar la configuración operativa:

1. Actualizar la tabla `invoice_config` en Supabase
2. El servicio sincronizará automáticamente en segundo plano
3. O reiniciar el servicio para forzar la recarga

---

## 🎯 Ventajas del Sistema

✅ **Seguridad**: Credenciales encriptadas, configuración con RLS  
✅ **Multi-tenant**: Cada usuario tiene su propia configuración  
✅ **Centralizado**: Configuración en Supabase, fácil de gestionar  
✅ **Caché local**: Acceso rápido sin depender de Supabase  
✅ **Fallback**: Si Supabase no está disponible, usa caché local  
✅ **Sincronización**: Actualización automática en segundo plano  

---

## 🚀 Próximos Pasos

1. Ejecutar migración SQL en Supabase
2. Crear registro de configuración para tu usuario
3. Configurar `.env` con credenciales
4. Encriptar `.env`
5. Iniciar el servicio

