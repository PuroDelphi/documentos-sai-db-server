# Auto-Emparejamiento Automático de Productos

## 📋 Descripción

Sistema de auto-emparejamiento automático de productos en `invoice_items` basándose en **búsqueda semántica por similitud de descripción**.

Cuando se inserta un nuevo item de factura (desde PDF/XML) sin `product_id`, el sistema automáticamente busca el producto más similar en `invoice_products` y lo asigna.

---

## 🎯 Objetivo

Resolver el problema de que las facturas de proveedores (PDF/XML) tienen descripciones de productos diferentes a las de Firebird, haciendo imposible el emparejamiento exacto.

**Ejemplo:**
- **Firebird:** `"TORNILLO HEXAGONAL 1/2 X 2 ACERO INOXIDABLE"`
- **Proveedor:** `"tornillo hexagonal 1/2x2 acero inox"`
- **Sistema:** Detecta similitud del 85% y auto-empareja ✅

## 🧠 Sistema de Aprendizaje

El sistema **aprende de las correcciones del usuario** y las recuerda para futuras facturas:

**Primera vez:**
1. Usuario recibe factura con descripción: `"tornillo hexagonal 1/2x2 acero inox"`
2. Sistema busca por similitud → Encuentra producto `"TORNILLO HEXAGONAL 1/2 X 2 ACERO INOXIDABLE"`
3. Usuario **corrige** manualmente y asigna otro producto: `"TORNILLO ESPECIAL 1/2X2"`

**Segunda vez (misma descripción):**
1. Usuario recibe otra factura con: `"tornillo hexagonal 1/2x2 acero inox"`
2. Sistema **recuerda** la corrección anterior
3. Asigna automáticamente: `"TORNILLO ESPECIAL 1/2X2"` ✅ (sin buscar por similitud)

**Ventajas:**
- ✅ Aprende de las decisiones del usuario
- ✅ Mejora con el tiempo
- ✅ Respeta las correcciones manuales
- ✅ Cada usuario tiene su propia "memoria"

---

## 🏗️ Arquitectura

### Componentes Implementados

1. **Extensión `pg_trgm`** - Búsqueda por similitud de texto (trigram)
2. **Índice GIN** - Acelera búsquedas por similitud en `invoice_products.description`
3. **Función `find_similar_product()`** - Busca producto más similar por descripción
4. **Función `auto_match_product_id()`** - Trigger function que auto-empareja
5. **Triggers** - Ejecutan auto-emparejamiento en INSERT/UPDATE

### Flujo de Datos (con Aprendizaje)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Usuario inserta/actualiza invoice_item (desde PDF/XML)  │
│    - description: "tornillo hexagonal 1/2x2 acero inox"    │
│    - product_id: NULL                                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. TRIGGER: auto_match_product_id()                         │
│    - Verifica que invoice_type IN ('inventario', 'servicio')│
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. PASO 1: APRENDIZAJE (Búsqueda Exacta)                   │
│    - Busca en invoice_items del mismo user_id               │
│    - Con la MISMA descripción (exacta)                      │
│    - Que ya tengan product_id asignado                      │
│    - Ordena por más reciente (id DESC)                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    ¿Encontró match?
                    ↙           ↘
                  SÍ             NO
                   ↓              ↓
    ┌──────────────────┐   ┌─────────────────────────────────┐
    │ USA producto     │   │ 4. PASO 2: SIMILITUD            │
    │ aprendido        │   │    - find_similar_product()     │
    │ (corrección      │   │    - Búsqueda por trigram       │
    │  del usuario)    │   │    - Threshold: 0.3 (30%)       │
    └──────────────────┘   └─────────────────────────────────┘
                   ↓              ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Resultado                                                │
│    - Si encontró: Asigna product_id automáticamente         │
│    - Si no encontró: product_id queda NULL                  │
│    - Log: LEARNED o SIMILARITY según el método usado        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Configuración

### Threshold de Similitud

Por defecto: **0.3 (30%)**

Puedes ajustarlo modificando la función `auto_match_product_id()`:

```sql
SELECT ... FROM find_similar_product(NEW.description, NEW.user_id, 0.3) fp;
                                                                    ^^^
                                                            Cambiar aquí
```

**Recomendaciones:**
- `0.3` (30%) - Muy permisivo, puede dar falsos positivos
- `0.5` (50%) - Balance entre precisión y recall
- `0.7` (70%) - Muy estricto, solo matches muy similares

---

## 📊 Tipos de Factura Soportados

El auto-emparejamiento se aplica a facturas de tipo **inventario** y **servicio**:

- ✅ **"inventario"** - Facturas de inventario (EA, OC en Firebird)
- ✅ **"servicio"** - Facturas de servicio (FIA en Firebird) - **ACTUALIZADO 2025-12-22**
- ❌ **"libre"** - Facturas libres - NO se auto-empareja

**Nota:** En Supabase los tipos son diferentes a Firebird:
- Supabase: `"inventario"`, `"servicio"`, `"libre"`
- Firebird: `EA`, `OC`, `FIA`

**Cambio reciente:** Antes solo funcionaba con `"inventario"`, ahora también funciona con `"servicio"` para permitir auto-emparejamiento en facturas de servicios que incluyen productos.

---

## 🧪 Pruebas

### 🧠 Prueba del Sistema de Aprendizaje (RECOMENDADA)

```bash
npm run test-learning
```

Esta prueba valida que el sistema **aprende de las correcciones del usuario**:

1. Crea primera factura con descripción de prueba
2. Sistema asigna product_id por similitud (o NULL)
3. **Usuario corrige manualmente** el product_id
4. Crea segunda factura con la **MISMA descripción**
5. ✅ Verifica que el sistema use la corrección del usuario (aprendizaje)

**Resultado esperado:** La segunda factura debe usar el product_id corregido por el usuario, no buscar por similitud.

---

### Ejecutar Prueba Completa (con sincronización)

```bash
npm run test-auto-match-full
```

Esta prueba:
1. Sincroniza productos desde Firebird
2. Crea factura de prueba
3. Inserta items y verifica auto-emparejamiento

### Ejecutar Prueba Simple (requiere datos existentes)

```bash
npm run test-auto-match
```

### Qué Hace la Prueba

1. Lista productos disponibles en `invoice_products`
2. Crea factura de prueba tipo EA
3. Inserta items con descripciones similares (pero no exactas)
4. Verifica que `product_id` se haya asignado automáticamente
5. Muestra tasa de éxito del auto-emparejamiento

### Ejemplo de Salida

```
🧪 PRUEBA DE AUTO-EMPAREJAMIENTO DE PRODUCTOS

📦 PASO 1: Listar productos disponibles

✅ Encontrados 5 productos:
   1. [PROD001] TORNILLO HEXAGONAL 1/2 X 2 ACERO INOXIDABLE
   2. [PROD002] TUERCA HEXAGONAL 1/2 ACERO GALVANIZADO
   3. [PROD003] ARANDELA PLANA 1/2 ACERO

📄 PASO 2: Crear factura de prueba tipo EA

✅ Factura creada: ID=123, Número=TEST-AUTO-MATCH-1734567890

🔍 PASO 3: Insertar items con descripciones similares

Insertando items con descripciones similares:
   1. "TORNILLO HEXAGONAL 1/2 X 2 ACERO INOXIDABLE"
      (Original: "TORNILLO HEXAGONAL 1/2 X 2 ACERO INOXIDABLE")
   2. "tuerca hexagonal 1/2 acero galvanizado"
      (Original: "TUERCA HEXAGONAL 1/2 ACERO GALVANIZADO")
   3. "arandela plana 1/2 acero"
      (Original: "ARANDELA PLANA 1/2 ACERO")

✅ PASO 4: Verificar auto-emparejamiento

✅ Item 1:
   Descripción: "TORNILLO HEXAGONAL 1/2 X 2 ACERO INOXIDABLE"
   ✓ Product ID: 45
   ✓ Código: PROD001
   ✓ Producto: "TORNILLO HEXAGONAL 1/2 X 2 ACERO INOXIDABLE"

✅ Item 2:
   Descripción: "tuerca hexagonal 1/2 acero galvanizado"
   ✓ Product ID: 46
   ✓ Código: PROD002
   ✓ Producto: "TUERCA HEXAGONAL 1/2 ACERO GALVANIZADO"

✅ Item 3:
   Descripción: "arandela plana 1/2 acero"
   ✓ Product ID: 47
   ✓ Código: PROD003
   ✓ Producto: "ARANDELA PLANA 1/2 ACERO"

📊 RESUMEN DE PRUEBA:

   Total items insertados: 3
   ✅ Auto-emparejados: 3
   ❌ Sin emparejar: 0
   📈 Tasa de éxito: 100.0%

🎉 ¡PRUEBA EXITOSA! Todos los items fueron auto-emparejados correctamente
```

---

## 🔍 Debugging

### Ver Logs de Auto-Emparejamiento

Los triggers generan logs con `RAISE NOTICE` y `RAISE WARNING`:

```sql
-- Ver logs en PostgreSQL
SHOW log_min_messages;

-- Habilitar logs de NOTICE
SET log_min_messages = 'notice';
```

### Verificar Manualmente Similitud

```sql
-- Probar similitud entre dos textos
SELECT similarity(
  'TORNILLO HEXAGONAL 1/2 X 2 ACERO INOXIDABLE',
  'tornillo hexagonal 1/2x2 acero inox'
);
-- Resultado: 0.75 (75% similar)
```

### Buscar Producto Manualmente

```sql
-- Buscar producto más similar
SELECT * FROM find_similar_product(
  'tornillo hexagonal 1/2x2 acero inox',  -- descripción a buscar
  'your-user-uuid-here',                   -- user_id
  0.3                                      -- threshold (30%)
);
```

---

## 🎓 Cómo Funciona el Aprendizaje

### Prioridad de Búsqueda

El sistema usa un enfoque de **2 pasos** con prioridad:

**PASO 1: APRENDIZAJE (Prioridad Alta)**
- Busca en `invoice_items` del mismo `user_id`
- Con la **misma descripción exacta**
- Que ya tengan `product_id` asignado (corrección manual del usuario)
- Toma el más reciente (`ORDER BY id DESC LIMIT 1`)

**PASO 2: SIMILITUD (Prioridad Baja)**
- Solo si NO encontró en el paso 1
- Busca en `invoice_products` por similitud de texto (trigram)
- Threshold: 0.3 (30% de similitud mínima)

### Ejemplo Práctico

**Escenario:**

1. **Primera factura** (ID: 1001)
   - Item: `"tornillo hexagonal 1/2x2 acero inox"`
   - Sistema asigna por similitud: `product_id = 123` (TORNILLO HEXAGONAL 1/2 X 2)
   - Usuario **corrige** manualmente: `product_id = 456` (TORNILLO ESPECIAL 1/2X2)

2. **Segunda factura** (ID: 1002)
   - Item: `"tornillo hexagonal 1/2x2 acero inox"` (misma descripción)
   - Sistema busca en facturas anteriores
   - **Encuentra** la corrección del usuario en factura 1001
   - Asigna automáticamente: `product_id = 456` ✅ (sin buscar por similitud)

3. **Tercera factura** (ID: 1003)
   - Item: `"tornillo hexagonal 1/2x2 acero inox"` (misma descripción)
   - Sistema busca en facturas anteriores
   - **Encuentra** la corrección en factura 1001 (o 1002)
   - Asigna automáticamente: `product_id = 456` ✅

**Resultado:** El usuario solo corrige UNA VEZ, el sistema aprende para siempre.

### Logs del Sistema

El sistema genera logs diferentes según el método usado:

**Log de Aprendizaje:**
```
NOTICE: LEARNED match: item_id=2115, description="tornillo hexagonal 1/2x2 acero inox",
        learned_product_id=456, code=TORN-ESP, product_desc="TORNILLO ESPECIAL 1/2X2"
        (from previous user correction)
```

**Log de Similitud:**
```
NOTICE: SIMILARITY match: item_id=2114, description="tanque plastico",
        matched_product_id=123, code=TANQ-1000, product_desc="TANQUE PLASTICO 1000L",
        similarity=0.85
```

## ⚠️ Limitaciones Actuales

1. **Búsqueda por texto en similitud** - Usa trigram similarity, no embeddings vectoriales
2. **Threshold fijo** - Requiere modificar función SQL para cambiar threshold (actualmente 0.3 = 30%)
3. **Aprendizaje por descripción exacta** - Solo aprende si la descripción es idéntica (case-sensitive)
4. **Idioma único** - Optimizado para español
5. **Precisión variable en similitud** - Con threshold 0.3 puede dar falsos positivos

## 🔧 Problemas Comunes

### El auto-emparejamiento no funciona

**Verificar:**

1. **Tipo de factura:** Debe ser `invoice_type = 'inventario'`
   ```sql
   SELECT invoice_type FROM invoices WHERE id = YOUR_INVOICE_ID;
   ```

2. **Productos sincronizados:** Debe haber productos con `sync_status IN ('SYNCED', 'SINCRONIZADO')`
   ```sql
   SELECT COUNT(*) FROM invoice_products
   WHERE user_id = YOUR_USER_ID
   AND sync_status IN ('SYNCED', 'SINCRONIZADO');
   ```

3. **Similitud suficiente:** La descripción debe tener al menos 30% de similitud
   ```sql
   SELECT * FROM find_similar_product('TU DESCRIPCION', 'YOUR_USER_ID', 0.3);
   ```

---

## 🚀 Mejoras Futuras

### Fase 2: Embeddings Vectoriales (Opcional)

Si se requiere mayor precisión, se puede implementar:

1. Generar embeddings con OpenAI para `invoice_products.description`
2. Almacenar en columna `embedding vector(1536)`
3. Usar búsqueda vectorial con `<=>` (cosine distance)
4. Implementar Automatic Embeddings con Edge Functions

**Ventajas:**
- Mayor precisión semántica
- Maneja sinónimos mejor
- Multiidioma

**Desventajas:**
- Requiere API de OpenAI (costo)
- Mayor complejidad
- Latencia adicional

---

## 📝 Notas Técnicas

### Índice GIN

```sql
CREATE INDEX idx_invoice_products_description_trgm 
ON invoice_products 
USING GIN (description gin_trgm_ops);
```

Este índice acelera las búsquedas por similitud usando trigram.

### Función de Similitud

La función `similarity()` de `pg_trgm` calcula similitud basándose en:
- Trigramas (secuencias de 3 caracteres)
- Retorna valor entre 0.0 (0%) y 1.0 (100%)

**Ejemplo:**
```sql
SELECT similarity('ABC', 'ABC');  -- 1.0 (100%)
SELECT similarity('ABC', 'XYZ');  -- 0.0 (0%)
SELECT similarity('ABC', 'ABD');  -- 0.5 (50%)
```

---

## 🎯 Conclusión

El sistema de auto-emparejamiento permite sincronizar facturas de inventario (EA/OC) automáticamente, incluso cuando las descripciones de productos no coinciden exactamente con Firebird.

**Estado:** ✅ Implementado y listo para pruebas
**Próximo paso:** Ejecutar `npm run test-auto-match` cuando tengas datos

