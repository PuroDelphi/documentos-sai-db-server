-- ================================================================
-- AGREGAR CONFIGURACIÓN PARA POLLING DE FACTURAS PENDIENTES
-- ================================================================

-- Agregar campos para configurar el polling de facturas pendientes
-- como respaldo del sistema Realtime

ALTER TABLE invoice_config
ADD COLUMN enable_invoice_polling BOOLEAN DEFAULT true;

ALTER TABLE invoice_config
ADD COLUMN invoice_polling_interval INTEGER DEFAULT 5; -- minutos

-- Agregar comentarios
COMMENT ON COLUMN invoice_config.enable_invoice_polling IS 
'Si es true, el servicio verificará periódicamente si hay facturas pendientes (respaldo del Realtime). Si es false, solo dependerá del Realtime.';

COMMENT ON COLUMN invoice_config.invoice_polling_interval IS 
'Intervalo en minutos para verificar facturas pendientes. Por defecto 5 minutos. Este polling actúa como respaldo del Realtime.';

