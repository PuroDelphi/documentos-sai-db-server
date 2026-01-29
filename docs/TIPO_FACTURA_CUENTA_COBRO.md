# Tipo de Factura: Cuenta Cobro

## 📋 Descripción General

El servicio de sincronización ahora soporta un nuevo tipo de factura llamado **"Cuenta Cobro"** que se procesa de manera idéntica a las facturas de servicio (FIA), pero utiliza su propio tipo de documento configurable en Firebird.

---

## 🎯 Características

### Tipos de Factura Soportados

El servicio ahora soporta **3 tipos de facturas**:

| Tipo | Valor en Supabase | Tipo de Documento Firebird | Tablas Firebird |
|------|-------------------|----------------------------|-----------------|
| **Inventario** | `inventario` | EAI (configurable) | IP, IPDET, ITEMACT |
| **Servicio** | `servicio` | FIA (configurable) | CARPROEN, CARPRODE |
| **Cuenta Cobro** | `cuenta cobro` o `cuenta_cobro` | CCI (configurable) | CARPROEN, CARPRODE |

---

## ⚙️ Configuración

### 1. Campo en Supabase

El tipo de documento para Cuenta Cobro se configura en la tabla `invoice_config`:

```sql
-- Campo agregado a invoice_config
cc_document_type VARCHAR(10) DEFAULT 'CCI'
```

**Ubicación:** `database/supabase_migrations/add_cc_document_type.sql`

### 2. Configuración por Defecto

Si no se especifica, el tipo de documento por defecto es **`CCI`** (Cuenta de Cobro IA).

### 3. Personalización

El usuario puede cambiar el tipo de documento en Supabase:

```sql
UPDATE invoice_config
SET cc_document_type = 'CCO' -- O cualquier otro código de 3 caracteres
WHERE user_id = 'tu-user-id';
```

---

## 🔄 Comportamiento

### Detección del Tipo de Factura

El servicio detecta el tipo de factura desde el campo `invoice_type` en la tabla `invoices` de Supabase:

```javascript
// Valores aceptados (case-insensitive):
- "inventario"           → Procesa como Entrada de Almacén (EA)
- "servicio"             → Procesa como Factura de Servicio (FIA)
- "cuenta cobro"         → Procesa como Cuenta Cobro (CCI)
- "cuenta_cobro"         → Procesa como Cuenta Cobro (CCI)
```

### Procesamiento

**Cuenta Cobro se procesa EXACTAMENTE igual que las facturas de servicio (FIA):**

1. ✅ Usa las mismas tablas: `CARPROEN` y `CARPRODE`
2. ✅ Usa el mismo sistema de consecutivos
3. ✅ Valida cuentas contables de la misma manera
4. ✅ Valida y crea terceros automáticamente
5. ✅ Usa el mismo formato de datos

**La ÚNICA diferencia es el tipo de documento en TIPDOC.**

---

## 📊 Estructura en Firebird

### Tabla TIPDOC

El servicio crea automáticamente el tipo de documento CCI en TIPDOC si no existe:

```sql
-- Ejemplo de registro creado automáticamente
INSERT INTO TIPDOC (
  TIPO,        -- 'FP' (Factura por Pagar)
  CLASE,       -- 'CCI' (o el configurado)
  E,           -- 1
  S,           -- 1
  CONSECUTIVO, -- 1 (se auto-incrementa)
  DESCRIPCION, -- 'CUENTA DE COBRO IA'
  ...
)
```

### Consecutivos

Cada tipo de documento tiene su propio consecutivo independiente:

- **FIA**: Consecutivo 1, 2, 3, ...
- **CCI**: Consecutivo 1, 2, 3, ... (independiente de FIA)
- **EAI**: Consecutivo 1, 2, 3, ... (independiente de FIA y CCI)

---

## 🚀 Uso

### Ejemplo 1: Crear Factura de Cuenta Cobro en Supabase

```sql
-- Insertar factura con tipo "cuenta cobro"
INSERT INTO invoices (
  user_id,
  invoice_number,
  invoice_type,  -- ← IMPORTANTE: Especificar "cuenta cobro"
  date,
  billing_name,
  billing_nit,
  status
) VALUES (
  'tu-user-id',
  'CC-001',
  'cuenta cobro',  -- ← Puede ser "cuenta cobro" o "cuenta_cobro"
  '2026-01-29',
  'CLIENTE EJEMPLO S.A.S.',
  '900123456-1',
  'APROBADO'
);
```

### Ejemplo 2: Verificar Tipo de Documento Configurado

```sql
-- Ver configuración actual
SELECT 
  user_id,
  document_type,      -- FIA (facturas de servicio)
  ea_document_type,   -- EAI (entradas de almacén)
  cc_document_type    -- CCI (cuenta cobro)
FROM invoice_config
WHERE user_id = 'tu-user-id';
```

---

## 🔍 Logs del Servicio

Cuando el servicio procesa una Cuenta Cobro, genera logs como estos:

```
[INFO] Tipo de documento para Cuenta Cobro: CCI
[INFO] Tipo de factura detectado: cuenta cobro
[INFO] Procesando factura aprobada: CC-001 (ID: abc123...)
[INFO] Factura CC-001 procesada exitosamente
```

---

## ✅ Validaciones

El servicio realiza las mismas validaciones que para facturas de servicio:

1. **Validación de Terceros:**
   - Verifica que el NIT exista en CUST
   - Crea automáticamente si está habilitado `enable_auto_third_party_creation`

2. **Validación de Cuentas Contables:**
   - Verifica que todas las cuentas existan en ACCT
   - Rechaza la factura si alguna cuenta no existe

3. **Validación de Datos:**
   - Verifica que tenga entradas contables
   - Valida formato de fechas
   - Valida totales

---

## 🛠️ Archivos Modificados

### 1. Migración de Supabase
**Archivo:** `database/supabase_migrations/add_cc_document_type.sql`
- Agrega campo `cc_document_type` a `invoice_config`

### 2. ConfigService
**Archivo:** `src/services/configService.js`
- Agrega `cc_document_type: 'CCI'` a configuración por defecto

### 3. SyncService
**Archivo:** `src/services/syncService.js`
- Agrega `ccDocumentType` a `loadConfig()`
- Crea tipo de documento CCI en `initialize()`
- Agrega 'CCI' a `generateDocumentDescription()`
- Detecta y rutea facturas "cuenta cobro" en `processApprovedInvoice()`
- Modifica `processServiceInvoice()` para aceptar tipo de documento opcional
- Agrega método `createMapperWithDocumentType()`

---

## 📝 Notas Importantes

1. **Case-Insensitive:** El tipo de factura se detecta sin importar mayúsculas/minúsculas
2. **Guión bajo o espacio:** Acepta tanto "cuenta cobro" como "cuenta_cobro"
3. **Mismo código que FIA:** No hay diferencia en el procesamiento, solo en el tipo de documento
4. **Consecutivos independientes:** Cada tipo de documento tiene su propio consecutivo
5. **Configuración flexible:** El usuario puede cambiar el tipo de documento en Supabase

---

## 🧪 Pruebas

Para probar el nuevo tipo de factura:

1. Ejecutar migración en Supabase
2. Crear una factura con `invoice_type = 'cuenta cobro'`
3. Aprobar la factura
4. Verificar en logs que se procesa con tipo CCI
5. Verificar en Firebird que se creó en CARPROEN/CARPRODE con TIPO='CCI'

---

## 🔄 Migración de Datos Existentes

Si tienes facturas existentes que deberían ser Cuenta Cobro:

```sql
-- Cambiar tipo de facturas existentes
UPDATE invoices
SET invoice_type = 'cuenta cobro'
WHERE invoice_number LIKE 'CC-%'
AND status = 'PENDIENTE';
```

---

## 📞 Soporte

Para más información sobre:
- Configuración general: Ver `docs/GUIA_INSTALACION_IMPLEMENTADORES.md`
- Tipos de documento: Ver `docs/FAQ_IMPLEMENTADORES.md`
- Sincronización: Ver `README.md`

