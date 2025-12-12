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

### Prueba de Tipo de Documento
```bash
# Probar la configuración del tipo de documento
npm run test-document-type
```

### Prueba de Filtro por Usuario
```bash
# Probar el filtro por UUID de usuario
npm run test-user-filter
```

### Prueba de Exclusión de Cuentas
```bash
# Probar la exclusión de rangos de cuentas
npm run test-account-exclusion
```

### Diagnóstico de Problemas
```bash
# Diagnosticar problemas de duplicados y facturas pendientes
npm run diagnostic
```

### Sincronización con Pinecone (Búsqueda Vectorial)
```bash
# Probar configuración de Pinecone y embeddings
npm run test-pinecone

# Sincronizar todos los productos a Pinecone
npm run sync-products-to-pinecone

# Buscar productos por similitud semántica
npm run search-products -- tornillo acero inoxidable
```

## 📊 Mapeo de Datos

### CARPROEN ← invoices
- `E, S = 1, 1` (valores fijos)
- `TIPO = configurable` (tipo de documento, por defecto "FIA")
- `BATCH = secuencial automático`
- `ID_N = num_identificacion`
- `FECHA = date` (fecha exacta de la factura, sin cambios de zona horaria)
- `DUEDATE = date` (fecha de vencimiento = fecha de la factura)
- `TOTAL = total`
- `LETRAS = conversión automática a letras`

### CARPRODE ← accounting_entries
- `TIPO = configurable` (tipo de documento, por defecto "FIA")
- `CRUCE = configurable` (mismo valor que TIPO)
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

## 👤 Configuración de Filtro por Usuario (OBLIGATORIO)

El sistema requiere configurar un UUID de usuario para filtrar todos los datos y operaciones:

### Configuración Obligatoria

```env
# UUID del usuario para filtrar todos los datos del sistema
# Este campo es OBLIGATORIO y debe ser un UUID válido
USER_UUID=550e8400-e29b-41d4-a716-446655440000
```

### Comportamiento del Sistema

- **Validación al inicio**: El sistema valida que el UUID esté configurado y sea válido
- **Filtro automático**: Todas las consultas se filtran automáticamente por `user_id`
- **Inserción automática**: Todos los nuevos registros incluyen el `user_id` configurado
- **Realtime filtrado**: Solo las facturas del usuario configurado activan el listener
- **Aislamiento completo**: Cada usuario ve únicamente sus propios datos

### Tablas Afectadas

Todas las tablas principales incluyen el campo `user_id`:
- `invoices` - Facturas
- `invoice_items` - Items de facturas
- `accounting_entries` - Entradas contables
- `invoice_third_parties` - Terceros sincronizados
- `invoice_chart_of_accounts` - Plan de cuentas sincronizado
- `invoice_products` - Productos sincronizados

### Seguridad

- **Obligatorio**: El sistema no inicia sin un UUID válido configurado
- **Validación**: Se valida el formato UUID v4
- **Filtro automático**: Imposible acceder a datos de otros usuarios
- **Logging**: Se registra el UUID configurado al iniciar

### Configuración Inicial

1. **Obtener UUID del usuario** desde tu sistema de autenticación
2. **Configurar en .env**:
   ```env
   USER_UUID=tu-uuid-de-usuario-aqui
   ```
3. **Reiniciar el servicio** para aplicar la configuración
4. **Verificar** con el script de prueba:
   ```bash
   npm run test-user-filter
   ```

## 📄 Configuración de Tipo de Documento

El tipo de documento determina cómo se clasifican las facturas en el sistema Firebird:

### Configuración Disponible

```env
# Tipo de documento para CARPROEN, CARPRODE y TIPDOC
DOCUMENT_TYPE=FIA                   # Por defecto: FIA (Factura IA)
```

### Comportamiento

- **Creación automática**: Si el tipo no existe en TIPDOC, se crea automáticamente
- **Consecutivos independientes**: Cada tipo tiene su propio consecutivo
- **Validación**: Se trunca automáticamente a 3 caracteres máximo
- **Consistencia**: TIPO y CRUCE en CARPRODE siempre tienen el mismo valor

### Tipos Comunes

| Código | Descripción | Uso Típico |
|--------|-------------|------------|
| `FIA` | Factura IA | Facturas por pagar (por defecto) |
| `FAC` | Factura de Venta | Facturas de venta |
| `CXP` | Cuenta por Pagar | Cuentas por pagar |
| `CXC` | Cuenta por Cobrar | Cuentas por cobrar |
| `REC` | Recibo de Caja | Recibos |
| `COM` | Comprobante | Comprobantes contables |
| `NOT` | Nota Contable | Notas contables |

### Esquema de Base de Datos

- `CARPROEN.TIPO`: CHAR(3) - Tipo de documento
- `CARPRODE.TIPO`: CHAR(3) - Tipo de documento (mismo que CARPROEN)
- `CARPRODE.CRUCE`: CHAR(3) - Referencia cruzada (mismo que TIPO)
- `TIPDOC.CLASE`: CHAR(3) - Clasificación en tabla de tipos

### Ejemplos

```env
# Ejemplo 1: Facturas IA (por defecto)
DOCUMENT_TYPE=FIA
# Resultado: Facturas por pagar IA

# Ejemplo 2: Facturas de venta
DOCUMENT_TYPE=FAC
# Resultado: Facturas de venta

# Ejemplo 3: Tipo personalizado
DOCUMENT_TYPE=MIS
# Resultado: Documento tipo MIS (se crea automáticamente)
```

## ⚙️ Configuración de Proyecto y Actividad

Los campos `PROYECTO` y `ACTIVIDAD` en la tabla `CARPRODE` pueden configurarse con valores predeterminados:

### Configuración Disponible

```env
# Códigos predeterminados para todos los registros CARPRODE
DEFAULT_PROJECT_CODE=PROJ001        # Máximo 10 caracteres
DEFAULT_ACTIVITY_CODE=ACT           # Máximo 3 caracteres
```

## 🚫 Configuración de Exclusión de Cuentas

Además de los rangos de inclusión (`ACCOUNT_SYNC_RANGES`), puedes configurar rangos de cuentas que deseas **excluir** de la sincronización:

### Configuración de Exclusión

```env
# Rangos de cuentas a EXCLUIR de la sincronización
# Formato: cuenta1-cuenta2,cuenta3-cuenta4 o cuenta_individual-cuenta_individual
ACCOUNT_EXCLUDE_RANGES=
```

### Ejemplos de Uso

```env
# Excluir cuentas específicas individuales
ACCOUNT_EXCLUDE_RANGES=53159502-53159502,53959501-53959501

# Excluir rangos completos
ACCOUNT_EXCLUDE_RANGES=60000000-69999999,80000000-89999999

# Mezcla de cuentas individuales y rangos
ACCOUNT_EXCLUDE_RANGES=12345678-12345678,50000000-59999999,70000000-79999999

# No excluir nada (por defecto)
ACCOUNT_EXCLUDE_RANGES=
```

### Funcionamiento

1. **Primero se aplican los rangos de inclusión** (`ACCOUNT_SYNC_RANGES`)
2. **Después se excluyen las cuentas** especificadas en `ACCOUNT_EXCLUDE_RANGES`
3. **El resultado final** son las cuentas que están en los rangos de inclusión PERO NO en los rangos de exclusión

### Ejemplo Práctico

```env
# Incluir cuentas del 11000000 al 11999999
ACCOUNT_SYNC_RANGES=11000000-11999999

# Pero excluir algunas cuentas específicas de ese rango
ACCOUNT_EXCLUDE_RANGES=11050000-11059999,11500000-11500000
```

**Resultado**: Se sincronizarán todas las cuentas del 11000000 al 11999999, EXCEPTO las del 11050000 al 11059999 y la cuenta 11500000.

### Validación

```bash
# Probar la configuración de exclusión
npm run test-account-exclusion

# Ver análisis completo de rangos
npm run test-account-ranges
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

## 🔍 Búsqueda Vectorial con Pinecone

### Descripción

El sistema incluye integración con **Pinecone** para búsqueda semántica de productos usando embeddings vectoriales. Esto permite:

- 🔎 **Búsqueda por similitud**: Encuentra productos similares aunque no coincidan exactamente las palabras
- 🤖 **Embeddings con IA**: Usa el servicio de embeddings de chatbotstools.asistentesautonomos.com
- 📊 **Sincronización automática**: Los productos se sincronizan automáticamente a Pinecone
- 🎯 **Búsqueda inteligente**: "tornillo acero" encuentra "tornillos de acero inoxidable"

### Configuración

#### 1. Crear cuenta en Pinecone

1. Regístrate en [https://app.pinecone.io/](https://app.pinecone.io/)
2. Crea un nuevo índice con estas configuraciones:
   - **Dimensión**: 512 (para embeddings CLIP)
   - **Métrica**: cosine
   - **Nombre**: elige un nombre descriptivo (ej: `saidb-products`)

#### 2. Obtener API Key de Pinecone

1. En Pinecone Dashboard → API Keys
2. Copia tu API Key
3. Anota el Environment (ej: `us-east-1-aws`)

#### 3. Obtener API Key del servicio de embeddings

1. Regístrate en [https://chatbotstools.asistentesautonomos.com/](https://chatbotstools.asistentesautonomos.com/)
2. Crea una API Key en tu dashboard
3. Suscríbete al servicio de "CLIP Embeddings"

#### 4. Configurar variables de entorno

```env
# Pinecone
PINECONE_API_KEY=tu-api-key-de-pinecone
PINECONE_INDEX_NAME=saidb-products
PINECONE_ENVIRONMENT=us-east-1-aws
PINECONE_NAMESPACE=  # Opcional, usa USER_UUID por defecto

# Servicio de Embeddings
EMBEDDINGS_API_KEY=tu-api-key-de-embeddings
EMBEDDINGS_API_URL=https://chatbotstools.asistentesautonomos.com/api/embeddings
EMBEDDINGS_DIMENSION=512

# Sincronización
ENABLE_PINECONE_SYNC=true
PINECONE_SYNC_INTERVAL=60  # minutos
PINECONE_BATCH_SIZE=50
```

### Uso

#### Probar configuración

```bash
npm run test-pinecone
```

Este comando:
- ✅ Verifica que todas las variables estén configuradas
- ✅ Prueba la conexión con el servicio de embeddings
- ✅ Prueba la conexión con Pinecone
- ✅ Inserta un vector de prueba
- ✅ Realiza una búsqueda de prueba
- ✅ Limpia el vector de prueba

#### Sincronizar productos

```bash
npm run sync-products-to-pinecone
```

Este comando:
- Obtiene todos los productos del usuario desde Supabase
- Genera embeddings para cada producto (código + descripción)
- Los almacena en Pinecone con metadata completa
- Procesa en lotes para optimizar rendimiento

#### Buscar productos

```bash
npm run search-products -- <texto de búsqueda>
```

Ejemplos:
```bash
# Buscar tornillos
npm run search-products -- tornillo acero inoxidable

# Buscar cables
npm run search-products -- cable electrico calibre 12

# Buscar por código
npm run search-products -- 12345
```

### Cómo funciona

1. **Generación de embeddings**:
   - Se combina el código y descripción del producto
   - Se envía al servicio de embeddings
   - Se obtiene un vector de 512 dimensiones

2. **Almacenamiento en Pinecone**:
   - Cada producto se almacena con ID único: `product_{item_code}`
   - Se incluye metadata: código, descripción, user_id, fecha
   - Se usa namespace por usuario para aislamiento

3. **Búsqueda**:
   - Se genera embedding para el texto de búsqueda
   - Se buscan los vectores más similares en Pinecone
   - Se retornan los productos ordenados por similitud

### Metadata almacenada

Cada vector en Pinecone incluye:

```json
{
  "item_code": "12345",
  "description": "Tornillo acero inoxidable 1/4",
  "supabase_id": "uuid-del-registro",
  "user_id": "uuid-del-usuario",
  "synced_at": "2025-12-12T10:30:00Z"
}
```

### Sincronización automática

Si `ENABLE_PINECONE_SYNC=true`, el sistema:
- Sincroniza productos nuevos automáticamente
- Actualiza productos modificados
- Ejecuta sincronización cada `PINECONE_SYNC_INTERVAL` minutos

### Costos

- **Pinecone**: Plan gratuito incluye 1 índice y 100K vectores
- **Embeddings**: $10/mes por servicio en chatbotstools.asistentesautonomos.com

## 🔧 Troubleshooting

### Problema 1: Errores de Clave Duplicada

Si ves errores como estos:
```
Error: duplicate key value violates unique constraint "invoice_third_parties_id_n_key"
Error: duplicate key value violates unique constraint "invoice_products_item_code_key"
```

**Causa**: Las restricciones UNIQUE en Supabase no incluyen el `user_id`, causando conflictos entre usuarios.

**Solución**:
1. Ejecuta el script de diagnóstico:
   ```bash
   npm run diagnostic
   ```

2. Ejecuta el SQL de corrección en Supabase SQL Editor:
   - Abre el archivo `database/fix_unique_constraints.sql`
   - Copia todo el contenido
   - Pégalo en Supabase SQL Editor y ejecútalo

3. Reinicia el servicio

**Qué hace el script SQL**:
- Elimina restricciones UNIQUE simples (`id_n`, `item_code`, `account_code`)
- Crea restricciones UNIQUE compuestas (`id_n + user_id`, etc.)
- Permite que múltiples usuarios tengan los mismos códigos

### Problema 2: Facturas Aprobadas No Se Sincronizaron

Si había facturas en estado `APROBADO` antes de iniciar el servicio y no se sincronizaron:

**Causa**: El sistema tiene recuperación automática pero puede estar deshabilitada o fallar.

**Diagnóstico**:
```bash
npm run diagnostic
```

**Soluciones**:

1. **Verificar configuración**:
   ```env
   ENABLE_INVOICE_RECOVERY=true
   RECOVERY_BATCH_SIZE=10
   ```

2. **Reiniciar el servicio**: Al iniciar, el sistema busca y procesa facturas pendientes automáticamente

3. **Verificar logs**: Busca mensajes como:
   ```
   Verificando facturas aprobadas pendientes de sincronización...
   Encontradas X facturas aprobadas pendientes
   ```

4. **Procesar manualmente**: Si la recuperación automática falla, usa:
   ```bash
   npm run test-recovery
   ```

**Cómo funciona la recuperación**:
- Al iniciar, el sistema busca facturas con `estado=APROBADO` y `service_response != 'Ok'`
- Las procesa en lotes (tamaño configurable)
- Actualiza el estado a `SINCRONIZADO` o `ERROR` según el resultado

### Problema 3: Filtro por Usuario No Funciona

**Síntomas**:
- Ves datos de otros usuarios
- Errores de permisos

**Solución**:
1. Verifica que `USER_UUID` esté configurado en `.env`
2. Ejecuta el test de filtro:
   ```bash
   npm run test-user-filter
   ```
3. Verifica que todas las tablas tengan el campo `user_id`
4. Reinicia el servicio

### Comandos Útiles de Diagnóstico

```bash
# Diagnóstico completo
npm run diagnostic

# Verificar filtro de usuario
npm run test-user-filter

# Probar recuperación de facturas
npm run test-recovery

# Ver estadísticas de sincronización
npm run sync-third-parties-stats
npm run sync-accounts-stats
npm run sync-products-stats
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
