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

---

## 🏗️ Arquitectura

### Componentes Implementados

1. **Extensión `pg_trgm`** - Búsqueda por similitud de texto (trigram)
2. **Índice GIN** - Acelera búsquedas por similitud en `invoice_products.description`
3. **Función `find_similar_product()`** - Busca producto más similar por descripción
4. **Función `auto_match_product_id()`** - Trigger function que auto-empareja
5. **Triggers** - Ejecutan auto-emparejamiento en INSERT/UPDATE

### Flujo de Datos

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Usuario inserta invoice_item (desde PDF/XML)            │
│    - description: "tornillo hexagonal 1/2x2 acero inox"    │
│    - product_id: NULL                                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. TRIGGER: trigger_auto_match_product_id_on_insert         │
│    - Se ejecuta BEFORE INSERT                               │
│    - Llama a auto_match_product_id()                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Verificar condiciones:                                   │
│    ✓ product_id es NULL                                     │
│    ✓ Factura es tipo EA u OC (inventario)                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Buscar producto similar:                                 │
│    - Llama a find_similar_product()                         │
│    - Usa similarity() con threshold 0.3 (30%)               │
│    - Busca en invoice_products del mismo user_id            │
│    - Solo productos SINCRONIZADO                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Resultado:                                               │
│    ✅ Match encontrado → Asigna product_id automáticamente  │
│    ❌ No match → product_id queda NULL                      │
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

El auto-emparejamiento **SOLO** se aplica a facturas de tipo inventario:

- ✅ **EA** (Entrada de Almacén)
- ✅ **OC** (Orden de Compra)
- ❌ **FIA** (Factura por Pagar) - NO se auto-empareja

---

## 🧪 Pruebas

### Ejecutar Prueba

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

## ⚠️ Limitaciones Actuales

1. **Solo búsqueda por texto** - Usa trigram similarity, no embeddings vectoriales
2. **Threshold fijo** - Requiere modificar función SQL para cambiar threshold
3. **Sin aprendizaje** - No mejora con el tiempo
4. **Idioma único** - Optimizado para español

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

