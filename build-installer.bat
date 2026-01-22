@echo off
REM ================================================================
REM   COMPILADOR DE INSTALADOR INNO SETUP
REM   Servicio de Sincronización Firebird
REM ================================================================
REM
REM Este script compila el instalador usando Inno Setup.
REM
REM REQUISITOS:
REM   - Inno Setup 6.x instalado
REM   - Archivos compilados en dist/
REM   - Archivo .env.encrypted en la raíz
REM
REM ================================================================

echo.
echo ================================================================
echo   COMPILACION DE INSTALADOR INNO SETUP
echo   Servicio de Sincronizacion Firebird
echo ================================================================
echo.

REM Verificar que existe Inno Setup
set ISCC="C:\Program Files (x86)\Inno Setup 6\ISCC.exe"

if not exist %ISCC% (
    echo ERROR: No se encuentra Inno Setup
    echo.
    echo Por favor instala Inno Setup 6.x desde:
    echo https://jrsoftware.org/isdl.php
    echo.
    echo O ajusta la ruta en este script si esta instalado en otra ubicacion.
    echo.
    pause
    exit /b 1
)

echo [1/4] Verificando Inno Setup...
echo   [OK] Inno Setup encontrado
echo.

REM Verificar que existe el ejecutable del servicio
echo [2/4] Verificando archivos del proyecto...

if not exist "dist\supabase-firebird-sync.exe" (
    echo ERROR: No se encuentra el ejecutable del servicio
    echo Archivo faltante: dist\supabase-firebird-sync.exe
    echo.
    echo Por favor, compila el proyecto primero ejecutando:
    echo   npm run build:complete
    echo.
    pause
    exit /b 1
)
echo   [OK] Ejecutable del servicio encontrado

if not exist ".env.encrypted" (
    echo ADVERTENCIA: No se encuentra el archivo .env.encrypted
    echo Archivo faltante: .env.encrypted
    echo.
    echo El instalador se compilara, pero necesitaras agregar este archivo
    echo antes de distribuirlo.
    echo.
    pause
)

if exist ".env.encrypted" (
    echo   [OK] Archivo .env.encrypted encontrado
)

echo.

REM Verificar que existe el script de Inno Setup
echo [3/4] Verificando script de Inno Setup...

if not exist "installer\setup.iss" (
    echo ERROR: No se encuentra el script de Inno Setup
    echo Archivo faltante: installer\setup.iss
    echo.
    pause
    exit /b 1
)
echo   [OK] Script de Inno Setup encontrado
echo.

REM Compilar el instalador
echo [4/4] Compilando instalador...
echo.
echo Ejecutando Inno Setup Compiler...
echo.

%ISCC% "installer\setup.iss"

if %errorLevel% neq 0 (
    echo.
    echo ERROR: Fallo la compilacion del instalador
    echo Codigo de error: %errorLevel%
    echo.
    echo Revisa los mensajes de error anteriores para mas detalles.
    echo.
    pause
    exit /b 1
)

echo.
echo ================================================================
echo   COMPILACION COMPLETADA EXITOSAMENTE
echo ================================================================
echo.
echo El instalador ha sido generado en:
echo   installer\Output\InstaladorSyncFirebird-v1.0.0.exe
echo.
echo Tamano aproximado: 15-25 MB
echo.
echo Proximos pasos:
echo   1. Prueba el instalador en un ambiente de prueba
echo   2. Distribuye el instalador a los implementadores
echo   3. Proporciona la contrasena del .env por separado
echo.
echo IMPORTANTE: Recuerda proporcionar al implementador:
echo   - El instalador (.exe)
echo   - La contrasena del .env (en sobre sellado)
echo   - URL de la interfaz web de configuracion
echo   - Credenciales de acceso a la interfaz web
echo.
pause

