-- ================================================================
-- AGREGAR MECANISMO DE VERSIONAMIENTO A TABLA ACCT
-- ================================================================
-- Este script agrega el campo Version y el trigger de versionamiento
-- a la tabla ACCT en Firebird, siguiendo el mismo patrón que existe
-- en las tablas ITEM y CUST.
--
-- IMPORTANTE: Este script se ejecuta automáticamente desde el servicio
-- de sincronización si detecta que el campo Version no existe.
-- ================================================================

-- =====================================================
-- PASO 1: Verificar y crear campo Version
-- =====================================================
-- Nota: En Firebird, no existe IF NOT EXISTS para ALTER TABLE
-- El servicio verificará primero si el campo existe antes de ejecutar esto

-- Agregar campo Version (INTEGER, permite NULL inicialmente)
ALTER TABLE ACCT ADD "Version" INTEGER;

-- =====================================================
-- PASO 2: Crear generador (secuencia) para Version
-- =====================================================
-- Verificar si el generador ya existe antes de crearlo
-- El servicio manejará esto con lógica condicional

CREATE GENERATOR GEN_ACCT_VERSION;
SET GENERATOR GEN_ACCT_VERSION TO 0;

-- =====================================================
-- PASO 3: Crear trigger para auto-incrementar Version
-- =====================================================
-- Este trigger se ejecuta ANTES de INSERT o UPDATE
-- y asigna automáticamente el siguiente número de versión

SET TERM ^ ;

CREATE OR ALTER TRIGGER TRG_ACCT_VERSION FOR ACCT
ACTIVE BEFORE INSERT OR UPDATE POSITION 0
AS
BEGIN
  -- Asignar siguiente versión del generador
  NEW."Version" = GEN_VALUE(GEN_ACCT_VERSION, 1);
END^

SET TERM ; ^

-- =====================================================
-- PASO 4: Procedimiento para inicializar versiones
-- =====================================================
-- Este procedimiento asigna números consecutivos a todos
-- los registros existentes que tienen Version NULL

SET TERM ^ ;

CREATE OR ALTER PROCEDURE SP_INITIALIZE_ACCT_VERSIONS
AS
DECLARE VARIABLE v_acct INTEGER;
DECLARE VARIABLE v_version INTEGER;
BEGIN
  -- Inicializar contador
  v_version = 0;
  
  -- Recorrer todas las cuentas sin versión
  FOR SELECT ACCT
      FROM ACCT
      WHERE "Version" IS NULL
      ORDER BY ACCT
      INTO :v_acct
  DO
  BEGIN
    -- Incrementar versión
    v_version = v_version + 1;
    
    -- Actualizar registro (sin disparar el trigger)
    UPDATE ACCT
    SET "Version" = :v_version
    WHERE ACCT = :v_acct;
  END
  
  -- Actualizar el generador al último valor usado
  IF (v_version > 0) THEN
  BEGIN
    EXECUTE STATEMENT 'SET GENERATOR GEN_ACCT_VERSION TO ' || :v_version;
  END
END^

SET TERM ; ^

-- =====================================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================

COMMENT ON COLUMN ACCT."Version" IS 
'Número de versión para sincronización incremental. Se auto-incrementa con cada INSERT/UPDATE.';

COMMENT ON TRIGGER TRG_ACCT_VERSION IS 
'Auto-incrementa el campo Version en cada INSERT/UPDATE para permitir sincronización incremental.';

COMMENT ON PROCEDURE SP_INITIALIZE_ACCT_VERSIONS IS 
'Inicializa números de versión consecutivos para registros existentes. Ejecutar solo una vez después de crear el campo Version.';

-- =====================================================
-- INSTRUCCIONES DE USO
-- =====================================================
-- 
-- 1. El servicio de sincronización ejecutará automáticamente:
--    - Verificación de existencia del campo Version
--    - Creación del campo si no existe
--    - Creación del generador y trigger
--
-- 2. Después de la primera sincronización, el servicio ejecutará:
--    EXECUTE PROCEDURE SP_INITIALIZE_ACCT_VERSIONS;
--
-- 3. Las siguientes sincronizaciones serán incrementales:
--    SELECT * FROM ACCT WHERE ("Version" > ? OR "Version" IS NULL)
--
-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- Para verificar que todo funciona correctamente:
--
-- 1. Ver el valor actual del generador:
--    SELECT GEN_ID(GEN_ACCT_VERSION, 0) FROM RDB$DATABASE;
--
-- 2. Ver cuentas con versión:
--    SELECT ACCT, DESCRIPCION, "Version" 
--    FROM ACCT 
--    ORDER BY "Version" DESC 
--    ROWS 10;
--
-- 3. Probar el trigger (insertar/actualizar una cuenta):
--    UPDATE ACCT SET DESCRIPCION = DESCRIPCION WHERE ACCT = 1;
--    -- Debería incrementar automáticamente el Version
--
-- =====================================================

