@echo off
REM ================================================================
REM   COMPILADOR DE EJECUTABLES - NODE.JS SEA (Single Executable)
REM   Servicio de Sincronización Firebird
REM ================================================================
REM
REM Este script crea ejecutables usando la funcionalidad nativa
REM de Node.js 22+ (Single Executable Applications)
REM
REM REQUISITOS:
REM   - Node.js 22+ instalado
REM   - Dependencias instaladas (npm install)
REM
REM ================================================================

echo.
echo ================================================================
echo   COMPILACION DE EJECUTABLES - NODE.JS SEA
echo   Servicio de Sincronizacion Firebird
echo ================================================================
echo.

REM Verificar versión de Node.js
echo [1/6] Verificando version de Node.js...
node --version
if %errorLevel% neq 0 (
    echo ERROR: Node.js no esta instalado
    pause
    exit /b 1
)
echo   [OK] Node.js encontrado
echo.

REM Crear directorio dist si no existe
if not exist "dist" mkdir dist

REM ================================================================
REM COMPILAR SERVICIO PRINCIPAL
REM ================================================================
echo [2/6] Compilando servicio principal...
echo.

REM Generar el blob
echo   - Generando blob de preparacion...
node --experimental-sea-config sea-config.json
if %errorLevel% neq 0 (
    echo ERROR: Fallo la generacion del blob
    pause
    exit /b 1
)

REM Copiar el ejecutable de Node.js
echo   - Copiando ejecutable base de Node.js...
node -e "require('fs').copyFileSync(process.execPath, 'dist/supabase-firebird-sync.exe')"
if %errorLevel% neq 0 (
    echo ERROR: Fallo la copia del ejecutable
    pause
    exit /b 1
)

REM Inyectar el blob en el ejecutable
echo   - Inyectando aplicacion en el ejecutable...
call npx postject dist/supabase-firebird-sync.exe NODE_SEA_BLOB sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2

echo   [OK] Servicio principal compilado
echo.

REM Limpiar archivo temporal
if exist sea-prep.blob del sea-prep.blob

REM ================================================================
REM COMPILAR SCRIPT DE INSTALACION
REM ================================================================
echo [3/6] Compilando script de instalacion...
echo.

REM Crear configuración temporal para install-service
echo {"main": "scripts/install-service.js", "output": "sea-prep-install.blob", "disableExperimentalSEAWarning": true, "useSnapshot": false, "useCodeCache": true} > sea-config-install.json

call node --experimental-sea-config sea-config-install.json
call node -e "require('fs').copyFileSync(process.execPath, 'dist/install-service.exe')"
call npx postject dist/install-service.exe NODE_SEA_BLOB sea-prep-install.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2

if exist sea-prep-install.blob del sea-prep-install.blob
if exist sea-config-install.json del sea-config-install.json

echo   [OK] Script de instalacion compilado
echo.

REM ================================================================
REM COMPILAR SCRIPT DE DESINSTALACION
REM ================================================================
echo [4/6] Compilando script de desinstalacion...
echo.

REM Crear configuración temporal para uninstall-service
echo {"main": "scripts/uninstall-service.js", "output": "sea-prep-uninstall.blob", "disableExperimentalSEAWarning": true, "useSnapshot": false, "useCodeCache": true} > sea-config-uninstall.json

call node --experimental-sea-config sea-config-uninstall.json
call node -e "require('fs').copyFileSync(process.execPath, 'dist/uninstall-service.exe')"
call npx postject dist/uninstall-service.exe NODE_SEA_BLOB sea-prep-uninstall.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2

if exist sea-prep-uninstall.blob del sea-prep-uninstall.blob
if exist sea-config-uninstall.json del sea-config-uninstall.json

echo   [OK] Script de desinstalacion compilado
echo.

REM ================================================================
REM COMPILAR SCRIPT DE ENCRIPTACION
REM ================================================================
echo [5/6] Compilando script de encriptacion...
echo.

REM Crear configuración temporal para encrypt-env
echo {"main": "scripts/encrypt-env.js", "output": "sea-prep-encrypt.blob", "disableExperimentalSEAWarning": true, "useSnapshot": false, "useCodeCache": true} > sea-config-encrypt.json

call node --experimental-sea-config sea-config-encrypt.json
call node -e "require('fs').copyFileSync(process.execPath, 'dist/encrypt-env.exe')"
call npx postject dist/encrypt-env.exe NODE_SEA_BLOB sea-prep-encrypt.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2

if exist sea-prep-encrypt.blob del sea-prep-encrypt.blob
if exist sea-config-encrypt.json del sea-config-encrypt.json

echo   [OK] Script de encriptacion compilado
echo.

REM ================================================================
REM VERIFICAR EJECUTABLES
REM ================================================================
echo [6/6] Verificando ejecutables creados...
echo.

dir dist\*.exe

echo.
echo ================================================================
echo   COMPILACION COMPLETADA EXITOSAMENTE
echo ================================================================
echo.
echo Ejecutables creados en dist/:
echo   - supabase-firebird-sync.exe (Servicio principal)
echo   - install-service.exe (Instalador)
echo   - uninstall-service.exe (Desinstalador)
echo   - encrypt-env.exe (Encriptador)
echo.
echo Tamano aproximado de cada ejecutable: 80-100 MB
echo (Incluye Node.js completo embebido)
echo.
echo Proximos pasos:
echo   1. Probar los ejecutables
echo   2. Compilar el instalador Inno Setup
echo   3. Distribuir a los implementadores
echo.
pause

