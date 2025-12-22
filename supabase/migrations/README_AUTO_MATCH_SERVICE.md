# Migración: Auto-emparejamiento para Facturas de Servicio

## 📋 Descripción

Esta migración actualiza el sistema de auto-emparejamiento de productos para que funcione tanto en facturas de **inventario** como de **servicio**.

### Cambio Principal

**ANTES:**
- ✅ Auto-emparejamiento solo en facturas tipo `"inventario"`
- ❌ NO funcionaba en facturas tipo `"servicio"`

**AHORA:**
- ✅ Auto-emparejamiento en facturas tipo `"inventario"`
- ✅ Auto-emparejamiento en facturas tipo `"servicio"` ← **NUEVO**
- ❌ NO funciona en facturas tipo `"libre"`

---

## 🚀 Cómo Aplicar la Migración

### Opción 1: Desde Supabase Dashboard (Recomendado)

1. Ir a tu proyecto en Supabase: https://supabase.com/dashboard
2. Ir a **SQL Editor**
3. Copiar el contenido del archivo `update_auto_match_for_service_invoices.sql`
4. Pegar en el editor SQL
5. Hacer clic en **Run**

### Opción 2: Desde CLI de Supabase

```bash
# Si tienes Supabase CLI instalado
supabase db push

# O ejecutar directamente el archivo
psql -h your-db-host -U postgres -d postgres -f supabase/migrations/update_auto_match_for_service_invoices.sql
```

---

## 🧪 Cómo Probar

### Prueba Rápida (Facturas de Servicio)

```bash
npm run test-auto-match-service
```

Este script:
1. Lista productos disponibles
2. Crea una factura tipo **servicio**
3. Inserta items con descripciones similares
4. Verifica que `product_id` se asigne automáticamente

### Prueba Completa (Inventario + Servicio)

```bash
# Probar con facturas de inventario
npm run test-auto-match

# Probar con facturas de servicio
npm run test-auto-match-service

# Probar sistema de aprendizaje
npm run test-learning
```

---

## 📊 Casos de Uso

### Caso 1: Factura de Servicio con Productos

**Escenario:** Una empresa de servicios que también vende productos

```javascript
// Factura de servicio
{
  invoice_type: 'servicio',
  invoice_number: 'SRV-001',
  items: [
    { description: 'Instalación de equipo' },      // ← Sin product_id (servicio puro)
    { description: 'Cable UTP Cat 6 x 100m' },     // ← Auto-emparejado con producto
    { description: 'Conector RJ45 x 50 unidades' } // ← Auto-emparejado con producto
  ]
}
```

**Resultado:**
- ✅ Items de servicio puro: `product_id = NULL`
- ✅ Items de productos: `product_id` auto-emparejado

### Caso 2: Factura de Inventario (Sin cambios)

```javascript
// Factura de inventario
{
  invoice_type: 'inventario',
  invoice_number: 'EA-001',
  items: [
    { description: 'Tornillo acero inox 1/4' },  // ← Auto-emparejado
    { description: 'Tuerca hexagonal 1/2' }      // ← Auto-emparejado
  ]
}
```

**Resultado:**
- ✅ Todos los items auto-emparejados (como antes)

---

## 🔍 Verificación

### Verificar que el trigger está actualizado

```sql
-- Ver la definición del trigger
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'auto_match_product_id';
```

Debe contener:
```sql
IF v_invoice_type NOT IN ('inventario', 'servicio') THEN
```

### Verificar que los triggers están activos

```sql
-- Listar triggers en invoice_items
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'invoice_items'
  AND trigger_name LIKE '%auto_match%';
```

Debe mostrar:
- `trigger_auto_match_product_id_on_insert` (BEFORE INSERT)
- `trigger_auto_match_product_id_on_update` (BEFORE UPDATE)

---

## 📝 Notas Técnicas

### Función `find_similar_product()`

Esta función debe existir previamente en la base de datos. Si no existe, créala:

```sql
CREATE OR REPLACE FUNCTION find_similar_product(
  p_description TEXT,
  p_user_id UUID,
  p_threshold NUMERIC DEFAULT 0.3
)
RETURNS TABLE (
  product_id UUID,
  item_code VARCHAR,
  description TEXT,
  similarity_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ip.id,
    ip.item_code,
    ip.description,
    similarity(ip.description, p_description) AS similarity_score
  FROM invoice_products ip
  WHERE ip.user_id = p_user_id
    AND ip.sync_status IN ('SYNCED', 'SINCRONIZADO')
    AND similarity(ip.description, p_description) >= p_threshold
  ORDER BY similarity_score DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;
```

### Extensión `pg_trgm`

Debe estar habilitada:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### Índice GIN

Debe existir en `invoice_products.description`:

```sql
CREATE INDEX IF NOT EXISTS idx_invoice_products_description_trgm 
ON invoice_products 
USING GIN (description gin_trgm_ops);
```

---

## 🎯 Beneficios

1. **Mayor flexibilidad:** Facturas de servicio pueden incluir productos
2. **Consistencia:** Mismo comportamiento en inventario y servicio
3. **Aprendizaje:** El sistema aprende de correcciones en ambos tipos
4. **Eficiencia:** Reduce trabajo manual de emparejamiento

---

## ⚠️ Consideraciones

- El auto-emparejamiento **NO** se aplica a facturas tipo `"libre"`
- El threshold de similitud es **0.3 (30%)** por defecto
- Solo se auto-emparejan items con `product_id = NULL`
- El sistema respeta correcciones manuales del usuario

---

## 📚 Documentación Relacionada

- [AUTO_MATCH_PRODUCTS.md](../../docs/AUTO_MATCH_PRODUCTS.md) - Documentación completa del sistema
- [INVENTORY_SYNC_WITH_PRODUCTS.md](../../docs/INVENTORY_SYNC_WITH_PRODUCTS.md) - Sincronización de inventario

---

**Fecha de creación:** 2025-12-22  
**Versión:** 1.0.0  
**Autor:** Sistema de Sincronización Supabase-Firebird

