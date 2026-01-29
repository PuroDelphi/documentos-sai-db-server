/**
 * Migración: Agregar campo cc_document_type a invoice_config
 * 
 * Este campo almacena el tipo de documento para facturas de Cuenta Cobro.
 * Por defecto es 'CCI' pero el usuario puede configurarlo.
 * 
 * INSTRUCCIONES:
 * 1. Ir al SQL Editor de Supabase: https://supabase.com/dashboard/project/ebbkoexgurofeysiueos/sql
 * 2. Copiar y pegar este script
 * 3. Ejecutar
 */

-- Verificar si la columna ya existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'invoice_config'
        AND column_name = 'cc_document_type'
    ) THEN
        -- Agregar la columna cc_document_type
        ALTER TABLE public.invoice_config
        ADD COLUMN cc_document_type VARCHAR(10) DEFAULT 'CCI';

        -- Agregar comentario a la columna
        COMMENT ON COLUMN public.invoice_config.cc_document_type IS 
        'Tipo de documento para facturas de Cuenta Cobro (por defecto CCI)';

        RAISE NOTICE 'Campo cc_document_type agregado exitosamente a invoice_config';
    ELSE
        RAISE NOTICE 'Campo cc_document_type ya existe en invoice_config';
    END IF;
END $$;

/**
 * VERIFICACIÓN:
 * 
 * Para verificar que el campo se creó correctamente:
 */

-- Ver estructura de la tabla
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'invoice_config'
AND column_name = 'cc_document_type';

/**
 * ACTUALIZAR REGISTROS EXISTENTES (OPCIONAL):
 * 
 * Si ya tienes registros en invoice_config y quieres asegurarte de que tengan el valor por defecto:
 */

-- UPDATE public.invoice_config
-- SET cc_document_type = 'CCI'
-- WHERE cc_document_type IS NULL;

/**
 * PRUEBA:
 * 
 * Para probar que el campo funciona correctamente:
 */

-- Ver configuración actual
-- SELECT user_id, document_type, ea_document_type, oc_document_type, cc_document_type
-- FROM public.invoice_config;

