-- =====================================================
-- VALIDACIÓN DE INTERVALOS DE SINCRONIZACIÓN
-- =====================================================
-- Este script crea triggers para validar que los intervalos
-- de sincronización no sean menores a 60 segundos.
-- Si un valor es menor a 60, se ajusta automáticamente a 60.
--
-- Campos validados:
-- - chart_of_accounts_sync_interval
-- - products_sync_interval
-- - third_parties_sync_interval
--
-- Ejecutar en: Supabase SQL Editor
-- =====================================================

-- Función para validar intervalos mínimos
CREATE OR REPLACE FUNCTION validate_sync_intervals()
RETURNS TRIGGER AS $$
BEGIN
  -- Validar chart_of_accounts_sync_interval
  IF NEW.chart_of_accounts_sync_interval IS NOT NULL AND NEW.chart_of_accounts_sync_interval < 60 THEN
    NEW.chart_of_accounts_sync_interval := 60;
  END IF;
  
  -- Validar products_sync_interval
  IF NEW.products_sync_interval IS NOT NULL AND NEW.products_sync_interval < 60 THEN
    NEW.products_sync_interval := 60;
  END IF;
  
  -- Validar third_parties_sync_interval
  IF NEW.third_parties_sync_interval IS NOT NULL AND NEW.third_parties_sync_interval < 60 THEN
    NEW.third_parties_sync_interval := 60;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Comentario de la función
COMMENT ON FUNCTION validate_sync_intervals() IS 
'Valida que los intervalos de sincronización no sean menores a 60 segundos. Si un valor es menor, se ajusta automáticamente a 60.';

-- Crear trigger para INSERT
DROP TRIGGER IF EXISTS validate_sync_intervals_insert ON invoice_config;
CREATE TRIGGER validate_sync_intervals_insert
  BEFORE INSERT ON invoice_config
  FOR EACH ROW
  EXECUTE FUNCTION validate_sync_intervals();

COMMENT ON TRIGGER validate_sync_intervals_insert ON invoice_config IS 
'Valida intervalos de sincronización antes de insertar un nuevo registro';

-- Crear trigger para UPDATE
DROP TRIGGER IF EXISTS validate_sync_intervals_update ON invoice_config;
CREATE TRIGGER validate_sync_intervals_update
  BEFORE UPDATE ON invoice_config
  FOR EACH ROW
  EXECUTE FUNCTION validate_sync_intervals();

COMMENT ON TRIGGER validate_sync_intervals_update ON invoice_config IS 
'Valida intervalos de sincronización antes de actualizar un registro existente';

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- Para verificar que los triggers funcionan correctamente:
--
-- 1. Intentar insertar un valor menor a 60:
--    UPDATE invoice_config 
--    SET chart_of_accounts_sync_interval = 30 
--    WHERE user_id = 'tu-user-uuid';
--
-- 2. Verificar que se ajustó a 60:
--    SELECT chart_of_accounts_sync_interval 
--    FROM invoice_config 
--    WHERE user_id = 'tu-user-uuid';
--    -- Debería retornar 60
-- =====================================================

