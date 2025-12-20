@echo off
REM Script para instalar el servicio de Windows
REM Debe ejecutarse como ADMINISTRADOR

echo ================================================================
echo   INSTALACION DE SERVICIO SUPABASE-FIREBIRD SYNC
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

echo [1/4] Verificando Node.js...
node --version >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Node.js no esta instalado
    echo Por favor instala Node.js desde https://nodejs.org/
    echo.
    pause
    exit /b 1
)
echo OK - Node.js instalado
echo.

echo [2/4] Instalando dependencias...
call npm install
if %errorLevel% neq 0 (
    echo ERROR: Fallo la instalacion de dependencias
    pause
    exit /b 1
)
echo OK - Dependencias instaladas
echo.

echo [3/4] Compilando ejecutable...
call npm run build
if %errorLevel% neq 0 (
    echo ERROR: Fallo la compilacion del ejecutable
    pause
    exit /b 1
)
echo OK - Ejecutable compilado
echo.

echo [4/4] Instalando servicio de Windows...
call npm run install-service
if %errorLevel% neq 0 (
    echo ERROR: Fallo la instalacion del servicio
    pause
    exit /b 1
)

echo.
echo ================================================================
echo   INSTALACION COMPLETADA EXITOSAMENTE
echo ================================================================
echo.
echo El servicio ha sido instalado y esta en ejecucion.
echo.
echo Comandos utiles:
echo   - Ver servicios: services.msc
echo   - Detener: net stop SupabaseFirebirdSync
echo   - Iniciar: net start SupabaseFirebirdSync
echo.
pause

