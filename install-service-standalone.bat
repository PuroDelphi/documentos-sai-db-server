@echo off
REM ================================================================
REM   INSTALADOR STANDALONE DEL SERVICIO WINDOWS
REM   Supabase-Firebird Sync Service
REM ================================================================
REM
REM Este instalador NO requiere Node.js instalado en el servidor
REM Solo requiere los ejecutables previamente compilados
REM
REM REQUISITOS:
REM   - Ejecutar como ADMINISTRADOR
REM   - Tener los archivos .exe en la carpeta dist/
REM
REM ================================================================

echo.
echo ================================================================
echo   INSTALACION DE SERVICIO SUPABASE-FIREBIRD SYNC
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

echo [1/3] Verificando ejecutables requeridos...
echo.

REM Verificar que existe el ejecutable principal
if not exist "dist\supabase-firebird-sync.exe" (
    echo ERROR: No se encuentra el ejecutable principal
    echo Archivo faltante: dist\supabase-firebird-sync.exe
    echo.
    echo Por favor, compila el proyecto primero ejecutando:
    echo   npm run build:complete
    echo.
    pause
    exit /b 1
)
echo   [OK] supabase-firebird-sync.exe encontrado

REM Verificar que existe el instalador de servicio
if not exist "dist\install-service.exe" (
    echo ERROR: No se encuentra el instalador de servicio
    echo Archivo faltante: dist\install-service.exe
    echo.
    echo Por favor, compila el proyecto primero ejecutando:
    echo   npm run build:complete
    echo.
    pause
    exit /b 1
)
echo   [OK] install-service.exe encontrado

echo.
echo [2/3] Verificando configuracion...
echo.

REM Verificar si existe .env o .env.encrypted
if not exist ".env" (
    if not exist ".env.encrypted" (
        echo ADVERTENCIA: No se encuentra archivo .env ni .env.encrypted
        echo.
        echo El servicio necesita configuracion para funcionar.
        echo Por favor, crea un archivo .env con la configuracion necesaria.
        echo.
        set /p continue="Deseas continuar de todas formas? (S/N): "
        if /i not "%continue%"=="S" (
            echo.
            echo Instalacion cancelada.
            pause
            exit /b 0
        )
    ) else (
        echo   [OK] Archivo .env.encrypted encontrado
    )
) else (
    echo   [OK] Archivo .env encontrado
)

echo.
echo [3/3] Instalando servicio de Windows...
echo.
echo Ejecutando instalador...
echo.

REM Ejecutar el instalador de servicio
dist\install-service.exe

if %errorLevel% neq 0 (
    echo.
    echo ERROR: Fallo la instalacion del servicio
    echo Codigo de error: %errorLevel%
    echo.
    pause
    exit /b 1
)

echo.
echo ================================================================
echo   INSTALACION COMPLETADA EXITOSAMENTE
echo ================================================================
echo.
echo El servicio ha sido instalado.
echo.
echo Comandos utiles:
echo   - Ver servicios:     services.msc
echo   - Detener servicio:  net stop SupabaseFirebirdSync
echo   - Iniciar servicio:  net start SupabaseFirebirdSync
echo   - Desinstalar:       uninstall-service-standalone.bat
echo.
echo Logs del servicio:
echo   - logs\combined.log
echo   - logs\error.log
echo.
pause

