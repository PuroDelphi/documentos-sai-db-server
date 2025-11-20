-- ============================================================================
-- FIX UNIQUE CONSTRAINTS PARA SOPORTE MULTI-USUARIO
-- ============================================================================
-- Este script corrige las restricciones UNIQUE en las tablas de Supabase
-- para permitir que múltiples usuarios tengan los mismos códigos (id_n, 
-- item_code, account_code) pero con diferentes user_id.
--
-- IMPORTANTE: Ejecutar este script en Supabase SQL Editor
-- ============================================================================

-- 1. TABLA: invoice_third_parties
-- Problema: id_n debe ser único solo dentro del mismo usuario
-- Solución: Cambiar UNIQUE(id_n) por UNIQUE(id_n, user_id)

-- Eliminar restricción antigua
ALTER TABLE invoice_third_parties 
DROP CONSTRAINT IF EXISTS invoice_third_parties_id_n_key;

-- Crear nueva restricción compuesta
ALTER TABLE invoice_third_parties 
ADD CONSTRAINT invoice_third_parties_id_n_user_id_key 
UNIQUE (id_n, user_id);

-- Comentario para documentación
COMMENT ON CONSTRAINT invoice_third_parties_id_n_user_id_key 
ON invoice_third_parties IS 
'Permite que diferentes usuarios tengan terceros con el mismo id_n';


-- 2. TABLA: invoice_products
-- Problema: item_code debe ser único solo dentro del mismo usuario
-- Solución: Cambiar UNIQUE(item_code) por UNIQUE(item_code, user_id)

-- Eliminar restricción antigua
ALTER TABLE invoice_products 
DROP CONSTRAINT IF EXISTS invoice_products_item_code_key;

-- Crear nueva restricción compuesta
ALTER TABLE invoice_products 
ADD CONSTRAINT invoice_products_item_code_user_id_key 
UNIQUE (item_code, user_id);

-- Comentario para documentación
COMMENT ON CONSTRAINT invoice_products_item_code_user_id_key 
ON invoice_products IS 
'Permite que diferentes usuarios tengan productos con el mismo item_code';


-- 3. TABLA: invoice_chart_of_accounts
-- Problema: account_code debe ser único solo dentro del mismo usuario
-- Solución: Cambiar UNIQUE(account_code) por UNIQUE(account_code, user_id)

-- Eliminar restricción antigua
ALTER TABLE invoice_chart_of_accounts 
DROP CONSTRAINT IF EXISTS invoice_chart_of_accounts_account_code_key;

-- Crear nueva restricción compuesta
ALTER TABLE invoice_chart_of_accounts 
ADD CONSTRAINT invoice_chart_of_accounts_account_code_user_id_key 
UNIQUE (account_code, user_id);

-- Comentario para documentación
COMMENT ON CONSTRAINT invoice_chart_of_accounts_account_code_user_id_key 
ON invoice_chart_of_accounts IS 
'Permite que diferentes usuarios tengan cuentas con el mismo account_code';


-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
-- Ejecuta estas consultas para verificar que las restricciones se aplicaron correctamente

-- Verificar restricciones de invoice_third_parties
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'invoice_third_parties'::regclass
  AND contype = 'u'
ORDER BY conname;

-- Verificar restricciones de invoice_products
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'invoice_products'::regclass
  AND contype = 'u'
ORDER BY conname;

-- Verificar restricciones de invoice_chart_of_accounts
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'invoice_chart_of_accounts'::regclass
  AND contype = 'u'
ORDER BY conname;


-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================
-- 
-- 1. Este script es IDEMPOTENTE: Puede ejecutarse múltiples veces sin problemas
--    gracias al uso de "IF EXISTS" en los DROP CONSTRAINT
--
-- 2. Si ya existen datos duplicados en la base de datos, este script FALLARÁ
--    En ese caso, primero debes limpiar los duplicados manualmente:
--
--    -- Encontrar duplicados en invoice_third_parties:
--    SELECT id_n, user_id, COUNT(*) 
--    FROM invoice_third_parties 
--    GROUP BY id_n, user_id 
--    HAVING COUNT(*) > 1;
--
--    -- Encontrar duplicados en invoice_products:
--    SELECT item_code, user_id, COUNT(*) 
--    FROM invoice_products 
--    GROUP BY item_code, user_id 
--    HAVING COUNT(*) > 1;
--
--    -- Encontrar duplicados en invoice_chart_of_accounts:
--    SELECT account_code, user_id, COUNT(*) 
--    FROM invoice_chart_of_accounts 
--    GROUP BY account_code, user_id 
--    HAVING COUNT(*) > 1;
--
-- 3. Después de ejecutar este script, el sistema podrá:
--    - Permitir que múltiples usuarios tengan los mismos códigos
--    - Evitar errores de "duplicate key value violates unique constraint"
--    - Mantener la integridad de datos por usuario
--
-- ============================================================================
