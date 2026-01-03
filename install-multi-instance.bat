@echo off
REM ================================================================
REM   INSTALADOR MULTI-INSTANCIA
REM   Supabase-Firebird Sync Service
REM ================================================================
REM
REM Este script facilita la instalación de múltiples instancias
REM del servicio en la misma máquina.
REM
REM REQUISITOS:
REM   - Ejecutar como ADMINISTRADOR
REM   - Tener Node.js instalado
REM   - Tener el ejecutable compilado en dist/
REM
REM ================================================================

echo.
echo ================================================================
echo   INSTALACION MULTI-INSTANCIA
echo   Supabase-Firebird Sync Service
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

echo [1/3] Verificando Node.js...
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

echo [2/3] Verificando ejecutable...
if not exist "dist\supabase-firebird-sync.exe" (
    echo ERROR: No se encuentra el ejecutable
    echo Archivo faltante: dist\supabase-firebird-sync.exe
    echo.
    echo Por favor, compila el proyecto primero ejecutando:
    echo   npm run build:complete
    echo.
    pause
    exit /b 1
)
echo   [OK] Ejecutable encontrado
echo.

echo [3/3] Ejecutando instalador multi-instancia...
echo.

node scripts\install-multi-instance.js

if %errorLevel% neq 0 (
    echo.
    echo ERROR: Fallo la instalacion del servicio
    echo Codigo de error: %errorLevel%
    echo.
    pause
    exit /b 1
)

echo.
pause

