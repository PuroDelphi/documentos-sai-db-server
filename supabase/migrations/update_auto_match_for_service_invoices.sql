-- ============================================================================
-- ACTUALIZACIÓN: Auto-emparejamiento para TODOS los tipos de factura
-- ============================================================================
--
-- CAMBIO: Modificar el trigger de auto-emparejamiento para que funcione
-- con TODOS los tipos de factura (inventario, servicio, libre)
--
-- ANTES: Solo funcionaba con invoice_type = 'inventario'
-- DESPUÉS: Funcionaba con invoice_type IN ('inventario', 'servicio')
-- AHORA: Funciona con TODOS los tipos (sin validación de tipo)
--
-- Fecha: 2025-12-22
-- ============================================================================

-- Primero, eliminar el trigger existente si existe
DROP TRIGGER IF EXISTS trigger_auto_match_product_id_on_insert ON invoice_items;
DROP TRIGGER IF EXISTS trigger_auto_match_product_id_on_update ON invoice_items;

-- Eliminar la función existente si existe
DROP FUNCTION IF EXISTS auto_match_product_id();

-- ============================================================================
-- FUNCIÓN: auto_match_product_id()
-- ============================================================================
-- Trigger function que auto-empareja product_id basándose en:
-- 1. APRENDIZAJE: Busca en invoice_items del mismo usuario con la misma descripción
-- 2. SIMILITUD: Busca en invoice_products por similitud de texto (trigram)
--
-- MODIFICACIÓN: Ahora funciona con TODOS los tipos de factura (sin validación)
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_match_product_id()
RETURNS TRIGGER AS $$
DECLARE
  v_learned_product_id UUID;
  v_similar_product_id UUID;
  v_similar_product_code TEXT;
  v_similar_product_desc TEXT;
  v_similarity_score NUMERIC;
BEGIN
  -- Solo procesar si product_id es NULL y hay descripción
  IF NEW.product_id IS NOT NULL OR NEW.description IS NULL OR TRIM(NEW.description) = '' THEN
    RETURN NEW;
  END IF;

  -- ========================================================================
  -- PASO 1: APRENDIZAJE - Buscar en invoice_items del mismo usuario
  -- ========================================================================
  -- Busca items con la MISMA descripción que ya tengan product_id asignado
  -- (correcciones manuales del usuario)
  
  SELECT product_id INTO v_learned_product_id
  FROM invoice_items
  WHERE user_id = NEW.user_id
    AND description = NEW.description
    AND product_id IS NOT NULL
  ORDER BY id DESC
  LIMIT 1;

  IF v_learned_product_id IS NOT NULL THEN
    -- Encontró un producto aprendido de correcciones anteriores
    NEW.product_id := v_learned_product_id;
    
    RAISE NOTICE 'LEARNED match: item_id=%, description="%", learned_product_id=%',
      NEW.id, NEW.description, v_learned_product_id;
    
    RETURN NEW;
  END IF;

  -- ========================================================================
  -- PASO 2: SIMILITUD - Buscar en invoice_products por similitud
  -- ========================================================================
  -- Solo si NO encontró en el paso 1
  
  SELECT fp.product_id, fp.item_code, fp.description, fp.similarity_score
  INTO v_similar_product_id, v_similar_product_code, v_similar_product_desc, v_similarity_score
  FROM find_similar_product(NEW.description, NEW.user_id, 0.3) fp;

  IF v_similar_product_id IS NOT NULL THEN
    -- Encontró un producto similar
    NEW.product_id := v_similar_product_id;
    
    RAISE NOTICE 'SIMILARITY match: item_id=%, description="%", matched_product_id=%, code=%, product_desc="%", similarity=%',
      NEW.id, NEW.description, v_similar_product_id, v_similar_product_code, v_similar_product_desc, v_similarity_score;
    
    RETURN NEW;
  END IF;

  -- No se encontró ningún match
  RAISE WARNING 'NO MATCH: item_id=%, description="%"',
    NEW.id, NEW.description;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS: Ejecutar auto-emparejamiento en INSERT y UPDATE
-- ============================================================================

-- Trigger para INSERT
CREATE TRIGGER trigger_auto_match_product_id_on_insert
  BEFORE INSERT ON invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION auto_match_product_id();

-- Trigger para UPDATE (solo si cambia la descripción o product_id se pone en NULL)
CREATE TRIGGER trigger_auto_match_product_id_on_update
  BEFORE UPDATE ON invoice_items
  FOR EACH ROW
  WHEN (
    (NEW.product_id IS NULL AND OLD.product_id IS NOT NULL) OR
    (NEW.description IS DISTINCT FROM OLD.description AND NEW.product_id IS NULL)
  )
  EXECUTE FUNCTION auto_match_product_id();

-- ============================================================================
-- COMENTARIOS
-- ============================================================================

COMMENT ON FUNCTION auto_match_product_id() IS
'Auto-empareja product_id en invoice_items basándose en aprendizaje y similitud.
Funciona con TODOS los tipos de factura (inventario, servicio, libre).
Paso 1: Busca en invoice_items del mismo usuario con la misma descripción (aprendizaje).
Paso 2: Busca en invoice_products por similitud de texto usando pg_trgm (threshold 0.3).';

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================

