@echo off
echo.
echo ================================================================
echo   PRUEBA DEL SERVICIO EN MODO CONSOLA
echo ================================================================
echo.
echo Este script ejecuta el servicio en modo consola para ver
echo los errores en tiempo real (sin instalarlo como servicio).
echo.
echo Presiona Ctrl+C para detener el servicio.
echo.
echo ================================================================
echo.

node src\index.js

echo.
echo.
echo El servicio se ha detenido.
echo Presione una tecla para continuar...
pause > nul

