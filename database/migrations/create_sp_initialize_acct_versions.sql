/**
 * Script para crear el procedimiento SP_INITIALIZE_ACCT_VERSIONS
 * 
 * Este procedimiento debe ejecutarse manualmente en Firebird porque el MCP
 * no permite crear procedimientos almacenados por razones de seguridad.
 * 
 * INSTRUCCIONES:
 * 1. Conectarse a Firebird con FlameRobin, IBExpert o similar
 * 2. Ejecutar este script completo
 * 3. Verificar que el procedimiento se creó correctamente
 */

SET TERM ^ ;

CREATE OR ALTER PROCEDURE SP_INITIALIZE_ACCT_VERSIONS
AS
DECLARE VARIABLE v_acct INTEGER;
DECLARE VARIABLE v_version INTEGER;
BEGIN
  v_version = 0;
  
  -- Recorrer todas las cuentas sin versión
  FOR SELECT ACCT
      FROM ACCT
      WHERE "Version" IS NULL
      ORDER BY ACCT
      INTO :v_acct
  DO
  BEGIN
    v_version = v_version + 1;
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

/**
 * VERIFICACIÓN:
 * 
 * Para verificar que el procedimiento se creó correctamente:
 */

-- Ver el procedimiento
SELECT RDB$PROCEDURE_NAME
FROM RDB$PROCEDURES
WHERE RDB$PROCEDURE_NAME = 'SP_INITIALIZE_ACCT_VERSIONS';

/**
 * EJECUCIÓN:
 * 
 * Para ejecutar el procedimiento y inicializar las versiones:
 */

-- EXECUTE PROCEDURE SP_INITIALIZE_ACCT_VERSIONS;

/**
 * VERIFICAR RESULTADOS:
 * 
 * Después de ejecutar el procedimiento, verificar:
 */

-- Ver valor del generador
-- SELECT GEN_ID(GEN_ACCT_VERSION, 0) as current_value FROM RDB$DATABASE;

-- Ver muestra de cuentas con versión
-- SELECT FIRST 10 ACCT, DESCRIPCION, "Version"
-- FROM ACCT
-- ORDER BY "Version" DESC NULLS LAST;

-- Contar cuentas sin versión (debería ser 0)
-- SELECT COUNT(*) as sin_version
-- FROM ACCT
-- WHERE "Version" IS NULL;

