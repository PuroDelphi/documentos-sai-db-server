# Servicio de Sincronización Supabase-Firebird

Este servicio sincroniza automáticamente las facturas aprobadas desde Supabase hacia la base de datos Firebird SAIDB.

## 🚀 Características

- **Sincronización en tiempo real** usando Supabase Realtime
- **Recuperación automática** de facturas pendientes al iniciar el servicio
- **Mapeo automático** de datos entre estructuras diferentes
- **Manejo de transacciones** para garantizar integridad de datos
- **Gestión automática de consecutivos** en TIPDOC
- **Sincronización automática de terceros** en segundo plano
- **API de control** para monitoreo y sincronización manual
- **Logging completo** para monitoreo y debugging
- **Manejo robusto de errores**

## 📋 Requisitos

- Node.js 16 o superior
- Acceso a base de datos Supabase
- Acceso a base de datos Firebird SAIDB
- Permisos de lectura en Supabase y escritura en Firebird

## 🛠️ Instalación

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd supabase-firebird-sync
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env
# Editar .env con tus credenciales
```

4. **Configurar variables de entorno**
```env
# Supabase
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_clave_anonima

# Firebird
FIREBIRD_HOST=localhost
FIREBIRD_PORT=3050
FIREBIRD_DATABASE=ruta/a/tu/base.fdb
FIREBIRD_USER=SYSDBA
FIREBIRD_PASSWORD=tu_password

# Servicio
LOG_LEVEL=info
SERVICE_NAME=supabase-firebird-sync

# Sincronización automática (en minutos)
THIRD_PARTIES_SYNC_INTERVAL=30
CHART_OF_ACCOUNTS_SYNC_INTERVAL=60
PRODUCTS_SYNC_INTERVAL=45
INITIAL_SYNC_DELAY=2

# Configuración de cuentas contables
ACCOUNT_SYNC_RANGES=1000-9999
SYNC_ONLY_ACTIVE_ACCOUNTS=true
EXCLUDE_ZERO_LEVEL_ACCOUNTS=true

# Configuración de productos
SYNC_ONLY_ACTIVE_PRODUCTS=true
SYNC_ONLY_INVENTORY_PRODUCTS=false
EXCLUDE_PRODUCT_GROUPS=
INCLUDE_PRODUCT_GROUPS=

# API de control (opcional)
API_PORT=3001
```

## 🚀 Uso

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
npm start
```

### Sincronización de Terceros
```bash
# Sincronización incremental (solo cambios nuevos)
npm run sync-thirds

# Sincronización completa (todos los registros)
npm run sync-thirds-full

# Ver estadísticas de sincronización
npm run sync-thirds-stats
```

### Sincronización de Cuentas Contables
```bash
# Sincronización de cuentas (según rangos configurados)
npm run sync-accounts

# Sincronización completa de cuentas
npm run sync-accounts-full

# Ver estadísticas de sincronización de cuentas
npm run sync-accounts-stats

# Ver configuración de sincronización de cuentas
npm run sync-accounts-config
```

### Sincronización de Productos
```bash
# Sincronización incremental de productos (solo cambios nuevos)
npm run sync-products

# Sincronización completa de productos
npm run sync-products-full

# Ver estadísticas de sincronización de productos
npm run sync-products-stats

# Ver configuración de sincronización de productos
npm run sync-products-config
```

### Prueba de Recuperación de Facturas
```bash
# Probar la funcionalidad de recuperación de facturas pendientes
npm run test-recovery
```

### Prueba de Configuración INVC
```bash
# Probar la configuración del campo INVC en CARPRODE
npm run test-invc-config
```

### Prueba de Manejo de Fechas
```bash
# Probar el manejo correcto de fechas sin cambios de zona horaria
npm run test-dates
```

### Prueba de Proyecto y Actividad
```bash
# Probar la configuración de códigos predeterminados de proyecto y actividad
npm run test-project-activity
```

## 📊 Mapeo de Datos

### CARPROEN ← invoices
- `E, S = 1, 1` (valores fijos)
- `TIPO = "FIA"` (Factura IA)
- `BATCH = secuencial automático`
- `ID_N = num_identificacion`
- `FECHA = date` (fecha exacta de la factura, sin cambios de zona horaria)
- `DUEDATE = date` (fecha de vencimiento = fecha de la factura)
- `TOTAL = total`
- `LETRAS = conversión automática a letras`

### CARPRODE ← accounting_entries
- `TIPO = "FIA"`
- `BATCH = mismo del encabezado`
- `ACCT = account_code`
- `DEBIT = debit`
- `CREDIT = credit`
- `DESCRIPCION = description`
- `INVC = configurable` (ver configuración INVC)
- `FECHA = entry_date` (fecha de la entrada contable)
- `DUEDATE = invoice.date` (fecha de vencimiento = fecha de la factura)
- `PROYECTO = configurable` (código de proyecto predeterminado)
- `ACTIVIDAD = configurable` (código de actividad predeterminado)

## ⚙️ Configuración del Campo INVC

El campo `INVC` en la tabla `CARPRODE` de Firebird puede configurarse para usar diferentes valores:

### Opciones Disponibles

**Opción 1: Usar número de batch/FIA (por defecto)**
```env
USE_INVOICE_NUMBER_FOR_INVC=false
```
- Envía el número consecutivo de FIA generado automáticamente
- Comportamiento actual del sistema
- Garantiza unicidad numérica secuencial

**Opción 2: Usar invoice_number de Supabase**
```env
USE_INVOICE_NUMBER_FOR_INVC=true
```
- Envía el número de factura original de Supabase
- Mantiene la referencia directa al número de factura
- Útil para trazabilidad y reconciliación

### Consideraciones

- El campo `INVC` tiene un límite de 15 caracteres
- Los valores se truncan automáticamente si exceden este límite
- El cambio de configuración afecta solo a las nuevas facturas procesadas
- Se recomienda mantener consistencia en la configuración

## ⚙️ Configuración de Proyecto y Actividad

Los campos `PROYECTO` y `ACTIVIDAD` en la tabla `CARPRODE` pueden configurarse con valores predeterminados:

### Configuración Disponible

```env
# Códigos predeterminados para todos los registros CARPRODE
DEFAULT_PROJECT_CODE=PROJ001        # Máximo 10 caracteres
DEFAULT_ACTIVITY_CODE=ACT           # Máximo 3 caracteres
```

### Comportamiento

- **Si están configurados**: Todos los registros CARPRODE tendrán estos valores
- **Si están vacíos**: Los campos se envían como cadenas vacías
- **Truncamiento automático**: Los valores se truncan si exceden los límites
- **Consistencia**: Todos los registros de una factura tendrán los mismos valores

### Esquema de Base de Datos

- `PROYECTO`: CHAR(10) - Código de proyecto (máximo 10 caracteres)
- `ACTIVIDAD`: CHAR(3) - Código de actividad (máximo 3 caracteres)

### Ejemplos

```env
# Ejemplo 1: Sin configuración
DEFAULT_PROJECT_CODE=
DEFAULT_ACTIVITY_CODE=
# Resultado: campos vacíos

# Ejemplo 2: Configuración normal
DEFAULT_PROJECT_CODE=PROJ001
DEFAULT_ACTIVITY_CODE=ACT
# Resultado: PROYECTO="PROJ001", ACTIVIDAD="ACT"

# Ejemplo 3: Con truncamiento
DEFAULT_PROJECT_CODE=PROYECTO_MUY_LARGO
DEFAULT_ACTIVITY_CODE=ACTIVIDAD_LARGA
# Resultado: PROYECTO="PROYECTO_M", ACTIVIDAD="ACT"
```

## 🔄 Flujo de Procesamiento

### Sincronización en Tiempo Real
1. **Detección**: Supabase Realtime detecta cambio en `invoices.estado = "APROBADO"`
2. **Obtención**: Se obtienen datos completos (invoice + items + entries)
3. **Validación**: Se verifica que exista tipo FIA en TIPDOC
4. **Mapeo**: Se transforman los datos al formato Firebird
5. **Inserción**: Se insertan datos en CARPROEN y CARPRODE
6. **Actualización**: Se actualiza consecutivo en TIPDOC si es necesario

### Recuperación de Facturas Pendientes
Al iniciar el servicio, se ejecuta automáticamente un proceso de recuperación que:

1. **Búsqueda**: Identifica facturas con `estado = "APROBADO"` y `service_response != "Ok"`
2. **Procesamiento por lotes**: Procesa las facturas en grupos configurables (por defecto 10)
3. **Sincronización**: Aplica el mismo flujo de procesamiento que las facturas en tiempo real
4. **Pausa entre lotes**: Incluye pausas para no sobrecargar el sistema
5. **Reporte**: Genera un reporte final con facturas procesadas y errores

**Configuración de recuperación:**
```env
ENABLE_INVOICE_RECOVERY=true    # Habilitar/deshabilitar recuperación
RECOVERY_BATCH_SIZE=10          # Número de facturas por lote
```

## 📝 Logs

Los logs se guardan en:
- `logs/combined.log` - Todos los logs
- `logs/error.log` - Solo errores
- Consola - Logs con colores para desarrollo

## 🛡️ Manejo de Errores

- **Transacciones**: Rollback automático en caso de error
- **Reconexión**: Reintentos automáticos de conexión
- **Logging**: Registro detallado de todos los errores
- **Graceful shutdown**: Cierre limpio con Ctrl+C

## 🔧 Estructura del Proyecto

```
src/
├── config/           # Configuración
├── database/         # Clientes de BD
├── services/         # Lógica de negocio
├── utils/           # Utilidades
└── index.js         # Punto de entrada
```

## 📈 Monitoreo

El servicio registra:
- Facturas procesadas exitosamente
- Errores de conexión o procesamiento
- Estadísticas de rendimiento
- Estado de las conexiones

## 🚨 Troubleshooting

### Error de conexión a Firebird
- Verificar credenciales en `.env`
- Confirmar que el puerto 3050 esté abierto
- Validar permisos del usuario

### Error de conexión a Supabase
- Verificar URL y clave anónima
- Confirmar que Realtime esté habilitado
- Validar permisos en la tabla invoices

### Facturas no se procesan
- Verificar que el estado sea exactamente "APROBADO"
- Confirmar que existan entradas contables
- Revisar logs para errores específicos

## 📄 Licencia

MIT License - Ver archivo LICENSE para detalles.
