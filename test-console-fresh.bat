@echo off
echo.
echo ================================================================
echo   PRUEBA DEL SERVICIO EN MODO CONSOLA (NUEVA SESION)
echo ================================================================
echo.
echo Este script abre una NUEVA ventana de PowerShell que leera
echo las variables de entorno actualizadas del sistema.
echo.
echo ================================================================
echo.

REM Abrir una nueva ventana de PowerShell que ejecute el servicio
start powershell -NoExit -Command "cd '%~dp0'; Write-Host 'Variables de entorno del sistema cargadas'; Write-Host 'ENV_PASSWORD =' $env:ENV_PASSWORD; Write-Host ''; Write-Host 'Iniciando servicio...'; Write-Host ''; node src\index.js"

echo.
echo Se ha abierto una nueva ventana de PowerShell.
echo Revisa esa ventana para ver el resultado.
echo.
pause

