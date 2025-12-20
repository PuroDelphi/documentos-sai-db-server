@echo off
REM Script para desinstalar el servicio de Windows
REM Debe ejecutarse como ADMINISTRADOR

echo ================================================================
echo   DESINSTALACION DE SERVICIO SUPABASE-FIREBIRD SYNC
echo ================================================================
echo.

REM Verificar si se está ejecutando como administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Este script debe ejecutarse como ADMINISTRADOR
    echo.
    echo Haz clic derecho en el archivo y selecciona "Ejecutar como administrador"
    echo.
    pause
    exit /b 1
)

echo Desinstalando servicio de Windows...
echo.

call npm run uninstall-service
if %errorLevel% neq 0 (
    echo ERROR: Fallo la desinstalacion del servicio
    pause
    exit /b 1
)

echo.
echo ================================================================
echo   DESINSTALACION COMPLETADA EXITOSAMENTE
echo ================================================================
echo.
echo El servicio ha sido eliminado del sistema.
echo.
pause

