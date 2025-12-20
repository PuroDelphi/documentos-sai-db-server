@echo off
REM ================================================================
REM   COMPILACION COMPLETA DEL PROYECTO
REM   Supabase-Firebird Sync Service
REM ================================================================
REM
REM Este script compila TODOS los ejecutables necesarios:
REM   1. Servicio principal (supabase-firebird-sync.exe)
REM   2. Instalador de servicio (install-service.exe)
REM   3. Desinstalador de servicio (uninstall-service.exe)
REM   4. Encriptador de .env (encrypt-env.exe)
REM
REM REQUISITOS:
REM   - Node.js instalado (solo para compilar)
REM   - npm instalado
REM
REM NOTA: Una vez compilado, los ejecutables NO requieren Node.js
REM       para funcionar en el servidor de produccion.
REM
REM ================================================================

echo.
echo ================================================================
echo   COMPILACION COMPLETA DEL PROYECTO
echo   Supabase-Firebird Sync Service
echo ================================================================
echo.

REM Verificar Node.js
echo [1/5] Verificando Node.js...
node --version >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Node.js no esta instalado
    echo Por favor instala Node.js desde https://nodejs.org/
    echo.
    pause
    exit /b 1
)
echo   [OK] Node.js instalado
echo.

REM Instalar dependencias
echo [2/5] Instalando dependencias...
call npm install
if %errorLevel% neq 0 (
    echo ERROR: Fallo la instalacion de dependencias
    pause
    exit /b 1
)
echo   [OK] Dependencias instaladas
echo.

REM Compilar servicio principal
echo [3/5] Compilando servicio principal...
call npm run build
if %errorLevel% neq 0 (
    echo ERROR: Fallo la compilacion del servicio principal
    pause
    exit /b 1
)
echo   [OK] Servicio principal compilado
echo.

REM Compilar instaladores
echo [4/5] Compilando instaladores y utilidades...
call npm run build:installers
if %errorLevel% neq 0 (
    echo ERROR: Fallo la compilacion de instaladores
    pause
    exit /b 1
)
echo   [OK] Instaladores compilados
echo.

REM Verificar archivos generados
echo [5/5] Verificando archivos generados...
echo.

set ALL_OK=1

if exist "dist\supabase-firebird-sync.exe" (
    echo   [OK] supabase-firebird-sync.exe
) else (
    echo   [ERROR] supabase-firebird-sync.exe NO ENCONTRADO
    set ALL_OK=0
)

if exist "dist\install-service.exe" (
    echo   [OK] install-service.exe
) else (
    echo   [ERROR] install-service.exe NO ENCONTRADO
    set ALL_OK=0
)

if exist "dist\uninstall-service.exe" (
    echo   [OK] uninstall-service.exe
) else (
    echo   [ERROR] uninstall-service.exe NO ENCONTRADO
    set ALL_OK=0
)

if exist "dist\encrypt-env.exe" (
    echo   [OK] encrypt-env.exe
) else (
    echo   [ERROR] encrypt-env.exe NO ENCONTRADO
    set ALL_OK=0
)

echo.

if %ALL_OK%==0 (
    echo ================================================================
    echo   COMPILACION INCOMPLETA - FALTAN ARCHIVOS
    echo ================================================================
    echo.
    pause
    exit /b 1
)

echo ================================================================
echo   COMPILACION COMPLETADA EXITOSAMENTE
echo ================================================================
echo.
echo Todos los ejecutables han sido generados en la carpeta dist/
echo.
echo Archivos generados:
echo   - dist\supabase-firebird-sync.exe    (Servicio principal)
echo   - dist\install-service.exe           (Instalador)
echo   - dist\uninstall-service.exe         (Desinstalador)
echo   - dist\encrypt-env.exe               (Encriptador de .env)
echo.
echo Proximos pasos:
echo   1. Copia la carpeta completa al servidor de produccion
echo   2. Ejecuta install-service-standalone.bat como administrador
echo.
echo IMPORTANTE: El servidor de produccion NO necesita Node.js instalado
echo.
pause

