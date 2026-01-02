-- ================================================================
-- AGREGAR CONFIGURACIÓN PARA DESCRIPCIÓN DE CARPRODE
-- ================================================================

-- Agregar campo para configurar si la descripción del detalle (CARPRODE)
-- debe ser la misma del encabezado (CARPROEN.OBSERV) o usar la descripción
-- de la entrada contable

ALTER TABLE invoice_config
ADD COLUMN use_header_description_for_detail BOOLEAN DEFAULT false;

-- Agregar comentario
COMMENT ON COLUMN invoice_config.use_header_description_for_detail IS 
'Si es true, la descripción del detalle (CARPRODE.DESCRIPCION) será la misma del encabezado (CARPROEN.OBSERV). Si es false, usará la descripción de la entrada contable.';

