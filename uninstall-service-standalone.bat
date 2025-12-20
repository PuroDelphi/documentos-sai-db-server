@echo off
REM ================================================================
REM   DESINSTALADOR STANDALONE DEL SERVICIO WINDOWS
REM   Supabase-Firebird Sync Service
REM ================================================================
REM
REM Este desinstalador NO requiere Node.js instalado en el servidor
REM Solo requiere el ejecutable previamente compilado
REM
REM REQUISITOS:
REM   - Ejecutar como ADMINISTRADOR
REM   - Tener el archivo uninstall-service.exe en la carpeta dist/
REM
REM ================================================================

echo.
echo ================================================================
echo   DESINSTALACION DE SERVICIO SUPABASE-FIREBIRD SYNC
echo   Version: Standalone (Sin Node.js requerido)
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

echo [1/2] Verificando ejecutable del desinstalador...
echo.

REM Verificar que existe el desinstalador de servicio
if not exist "dist\uninstall-service.exe" (
    echo ERROR: No se encuentra el desinstalador de servicio
    echo Archivo faltante: dist\uninstall-service.exe
    echo.
    echo Por favor, compila el proyecto primero ejecutando:
    echo   npm run build:complete
    echo.
    pause
    exit /b 1
)
echo   [OK] uninstall-service.exe encontrado

echo.
echo [2/2] Desinstalando servicio de Windows...
echo.
echo Ejecutando desinstalador...
echo.

REM Ejecutar el desinstalador de servicio
dist\uninstall-service.exe

if %errorLevel% neq 0 (
    echo.
    echo ERROR: Fallo la desinstalacion del servicio
    echo Codigo de error: %errorLevel%
    echo.
    pause
    exit /b 1
)

echo.
echo ================================================================
echo   DESINSTALACION COMPLETADA EXITOSAMENTE
echo ================================================================
echo.
echo El servicio ha sido desinstalado del sistema.
echo.
pause

