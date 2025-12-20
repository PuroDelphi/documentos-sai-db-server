# 🔄 Migración de Credenciales de Firebird a Supabase

## 📋 Resumen

Las credenciales de Firebird ahora se configuran desde la **interfaz web del cliente** y se almacenan en **Supabase** (tabla `invoice_config`), en lugar de estar en el archivo `.env`.

---

## 🎯 Objetivo

Permitir que los clientes configuren sus credenciales de Firebird desde una interfaz web, sin necesidad de editar archivos `.env` en el servidor.

---

## 🏗️ Arquitectura Anterior vs Nueva

### ❌ Arquitectura Anterior

```
.env (local)
├── SUPABASE_URL
├── SUPABASE_ANON_KEY
├── FIREBIRD_HOST ← En .env
├── FIREBIRD_PORT ← En .env
├── FIREBIRD_DATABASE ← En .env
├── FIREBIRD_USER ← En .env
├── FIREBIRD_PASSWORD ← En .env
├── USER_UUID
└── CONFIG_CACHE_PASSWORD
```

**Problema:** Cliente debe editar `.env` para configurar Firebird.

### ✅ Arquitectura Nueva

```
.env (local)
├── SUPABASE_URL
├── SUPABASE_ANON_KEY
├── USER_UUID
└── CONFIG_CACHE_PASSWORD

Supabase (invoice_config)
├── firebird_host ← Desde interfaz web
├── firebird_port ← Desde interfaz web
├── firebird_database ← Desde interfaz web
├── firebird_user ← Desde interfaz web
└── firebird_password ← Desde interfaz web
```

**Ventaja:** Cliente configura Firebird desde interfaz web.

---

## 📦 Cambios Realizados

### 1. **Base de Datos (Supabase)**

#### `database/migrations/create_invoice_config_table.sql`
- ✅ Documentados campos de Firebird
- ✅ Referencia corregida: `invoice_users` (plural)

#### `database/migrations/insert_default_config.sql`
- ✅ Agregados campos de Firebird con valores por defecto
- ✅ `firebird_database` y `firebird_password` vacíos (deben configurarse desde web)

### 2. **Código de Aplicación**

#### `src/config/appConfig.js`
- ✅ `getFirebirdCredentials()` ahora lee desde Supabase vía `ConfigService`
- ✅ Retorna configuración completa de Firebird desde `invoice_config`

#### `src/database/firebirdClient.js`
- ✅ Usa `appConfig.getFirebirdCredentials()` en lugar de `config.firebird`
- ✅ Valida que `firebird_database` esté configurado
- ✅ Logs mejorados con información de conexión

#### `src/services/configService.js`
- ✅ Agregados campos de Firebird a `createDefaultConfig()`

#### `src/config/index.js`
- ✅ Campos de Firebird marcados como **DEPRECATED**
- ✅ Solo se validan: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `USER_UUID`, `CONFIG_CACHE_PASSWORD`
- ✅ Valores de Firebird opcionales (solo para desarrollo/pruebas)

### 3. **Configuración y Documentación**

#### `.env.example`
- ✅ Credenciales de Firebird marcadas como **OPCIONALES**
- ✅ Solo requerido: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `USER_UUID`, `CONFIG_CACHE_PASSWORD`
- ✅ Campos de Firebird comentados (solo para desarrollo)

#### `docs/CONFIGURACION_CENTRALIZADA.md`
- ✅ Sección actualizada sobre credenciales de Firebird
- ✅ Documentación de campos de Firebird en `invoice_config`
- ✅ Aclaración: credenciales de Firebird se configuran desde web

### 4. **Scripts de Prueba**

#### `src/scripts/helpers/initAppConfig.js` (NUEVO)
- ✅ Helper para inicializar `appConfig` en scripts de prueba

#### Scripts actualizados:
- ✅ `testDirectFirebirdInventory.js`
- ✅ `testAutoThirdPartyCreationFlow.js`
- ✅ `testThirdPartyCreation.js`
- ✅ `diagnoseThirdPartyIssue.js`

**Cambio:** Todos los scripts ahora llaman a `initAppConfig()` antes de `firebirdClient.initialize()`

---

## 🚀 Flujo de Configuración

### Para el Cliente (Usuario Final)

1. **Registrarse en la interfaz web**
   - Se crea `user_id` en Supabase Auth
   - Se crea registro en `invoice_config` con valores por defecto

2. **Configurar Firebird desde la web**
   - Ingresar: host, puerto, ruta de base de datos, usuario, contraseña
   - Se guarda en `invoice_config` (con RLS)

3. **Instalar servicio en su servidor**
   - Solo necesita `.env` con: `USER_UUID` y `CONFIG_CACHE_PASSWORD`
   - Ejecutar: `npm run install-service`

4. **Servicio inicia automáticamente**
   - Lee `USER_UUID` del `.env`
   - Descarga configuración de Supabase (incluyendo Firebird)
   - Conecta a Firebird con credenciales de Supabase
   - Sincroniza datos

5. **Modificar configuración**
   - Cambiar valores desde la web
   - Reiniciar el servicio
   - Servicio carga nueva configuración

---

## ✅ Beneficios

1. **Cliente NO necesita editar `.env`** para configurar Firebird
2. **Configuración centralizada** y fácil de modificar
3. **Multi-tenant:** cada usuario tiene su propia configuración de Firebird
4. **Seguridad:** credenciales encriptadas en Supabase y caché local
5. **Flexibilidad:** cambios de configuración sin reinstalar servicio

---

## 🔒 Seguridad

- **Row Level Security (RLS):** Cada usuario solo ve su propia configuración
- **Caché encriptado:** Configuración local encriptada con AES-256-GCM
- **Credenciales en Supabase:** Protegidas por RLS y HTTPS
- **Sin exposición:** Cliente nunca ve credenciales de Supabase del proveedor

---

## 📝 Commits Relacionados

```bash
96cbd2d - fix: Actualizar scripts de prueba para inicializar appConfig
1d825bc - feat: Mover credenciales de Firebird a configuración centralizada en Supabase
c9cda5b - feat: Actualizar servicio de Windows para configuración centralizada
2e2e521 - feat: Implementar configuración centralizada en Supabase
```

