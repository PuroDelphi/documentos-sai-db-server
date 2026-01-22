/**
 * Migración: Agregar campo firebird_version a invoice_chart_of_accounts
 * 
 * Este campo almacena el número de versión de Firebird para permitir
 * sincronizaciones incrementales de cuentas contables.
 * 
 * INSTRUCCIONES:
 * 1. Ir al SQL Editor de Supabase (https://supabase.com/dashboard/project/ebbkoexgurofeysiueos/sql)
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
        AND table_name = 'invoice_chart_of_accounts'
        AND column_name = 'firebird_version'
    ) THEN
        -- Agregar la columna firebird_version
        ALTER TABLE public.invoice_chart_of_accounts
        ADD COLUMN firebird_version INTEGER DEFAULT 0;

        -- Agregar comentario a la columna
        COMMENT ON COLUMN public.invoice_chart_of_accounts.firebird_version IS 
        'Número de versión de Firebird para sincronización incremental';

        -- Crear índice para mejorar el rendimiento de las consultas
        CREATE INDEX IF NOT EXISTS idx_invoice_chart_of_accounts_firebird_version
        ON public.invoice_chart_of_accounts(user_id, firebird_version DESC);

        RAISE NOTICE 'Campo firebird_version agregado exitosamente a invoice_chart_of_accounts';
    ELSE
        RAISE NOTICE 'Campo firebird_version ya existe en invoice_chart_of_accounts';
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
AND table_name = 'invoice_chart_of_accounts'
AND column_name = 'firebird_version';

-- Ver índices de la tabla
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'invoice_chart_of_accounts'
AND indexname LIKE '%firebird_version%';

/**
 * PRUEBA:
 * 
 * Para probar que el campo funciona correctamente:
 */

-- Ver registros con firebird_version más alto
-- SELECT account_code, account_name, firebird_version
-- FROM public.invoice_chart_of_accounts
-- ORDER BY firebird_version DESC
-- LIMIT 10;

-- Contar registros por versión
-- SELECT firebird_version, COUNT(*) as count
-- FROM public.invoice_chart_of_accounts
-- GROUP BY firebird_version
-- ORDER BY firebird_version DESC;

