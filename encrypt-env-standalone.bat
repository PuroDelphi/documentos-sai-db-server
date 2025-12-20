@echo off
REM ================================================================
REM   ENCRIPTADOR STANDALONE DE ARCHIVO .ENV
REM   Supabase-Firebird Sync Service
REM ================================================================
REM
REM Este script NO requiere Node.js instalado
REM Solo requiere el ejecutable previamente compilado
REM
REM REQUISITOS:
REM   - Tener el archivo encrypt-env.exe en la carpeta dist/
REM   - Tener un archivo .env en la raiz del proyecto
REM
REM ================================================================

echo.
echo ================================================================
echo   ENCRIPTACION DE ARCHIVO .ENV
echo   Version: Standalone (Sin Node.js requerido)
echo ================================================================
echo.

echo [1/2] Verificando ejecutable del encriptador...
echo.

REM Verificar que existe el encriptador
if not exist "dist\encrypt-env.exe" (
    echo ERROR: No se encuentra el encriptador
    echo Archivo faltante: dist\encrypt-env.exe
    echo.
    echo Por favor, compila el proyecto primero ejecutando:
    echo   npm run build:complete
    echo.
    pause
    exit /b 1
)
echo   [OK] encrypt-env.exe encontrado

REM Verificar que existe el archivo .env
if not exist ".env" (
    echo ERROR: No se encuentra el archivo .env
    echo.
    echo Por favor, crea un archivo .env con tu configuracion.
    echo.
    pause
    exit /b 1
)
echo   [OK] Archivo .env encontrado

echo.
echo [2/2] Encriptando archivo .env...
echo.

REM Ejecutar el encriptador
dist\encrypt-env.exe

if %errorLevel% neq 0 (
    echo.
    echo ERROR: Fallo la encriptacion del archivo
    echo Codigo de error: %errorLevel%
    echo.
    pause
    exit /b 1
)

echo.
echo ================================================================
echo   ENCRIPTACION COMPLETADA EXITOSAMENTE
echo ================================================================
echo.
echo El archivo .env.encrypted ha sido creado.
echo.
echo IMPORTANTE: Guarda la contrasena en un lugar seguro.
echo La necesitaras para instalar el servicio.
echo.
pause

