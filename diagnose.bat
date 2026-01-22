@echo off
echo.
echo ================================================================
echo   DIAGNOSTICO DEL SERVICIO DE SINCRONIZACION
echo ================================================================
echo.

node scripts\diagnose-service.js

echo.
echo.
echo Presione una tecla para continuar...
pause > nul

