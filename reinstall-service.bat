@echo off
echo.
echo ================================================================
echo   REINSTALACION DEL SERVICIO DE WINDOWS
echo ================================================================
echo.
echo Este script desinstalara el servicio actual y lo reinstalara
echo con las variables de entorno actualizadas.
echo.
echo IMPORTANTE: Debes ejecutar este script como ADMINISTRADOR
echo.
echo ================================================================
echo.

REM Verificar si el servicio existe
sc query SupabaseFirebirdSync >nul 2>&1
if %errorlevel% == 0 (
    echo Servicio encontrado. Desinstalando...
    echo.
    dist\uninstall-service.exe
    echo.
    echo Esperando 5 segundos...
    timeout /t 5 /nobreak >nul
) else (
    echo No se encontro el servicio instalado.
    echo.
)

echo.
echo Instalando servicio con variables de entorno actualizadas...
echo.
dist\install-service.exe

echo.
echo.
echo Presione una tecla para continuar...
pause > nul

