@echo off
echo.
echo ================================================================
echo   PRUEBA DEL SERVICIO EN MODO CONSOLA
echo   (Recargando variables de entorno del sistema)
echo ================================================================
echo.

REM Ejecutar script de PowerShell que recarga las variables de entorno y ejecuta el servicio
powershell -NoProfile -ExecutionPolicy Bypass -Command "& { . .\scripts\reload-env.ps1; Write-Host ''; Write-Host 'Iniciando servicio...' -ForegroundColor Cyan; Write-Host ''; node src\index.js }"

echo.
echo.
echo El servicio se ha detenido.
echo Presione una tecla para continuar...
pause > nul

