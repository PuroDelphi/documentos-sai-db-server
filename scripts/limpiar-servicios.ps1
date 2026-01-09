# Script para limpiar servicios antes de instalar
# Ejecutar como Administrador

Write-Host "Limpiando servicios existentes..." -ForegroundColor Yellow
Write-Host ""

# Lista de servicios a eliminar
$servicios = @(
    "SupabaseFirebirdSyncPrueba",
    "SupabaseFirebirdSyncPruebas",
    "SupabaseFirebirdSyncTest"
)

foreach ($servicio in $servicios) {
    Write-Host "Procesando: $servicio" -ForegroundColor Cyan
    
    # Intentar detener el servicio
    try {
        Stop-Service -Name $servicio -Force -ErrorAction SilentlyContinue
        Write-Host "  - Servicio detenido" -ForegroundColor Green
    } catch {
        Write-Host "  - Servicio no estaba corriendo" -ForegroundColor Gray
    }
    
    # Intentar eliminar con NSSM si existe
    if (Test-Path "C:\Services\SyncFirebird\nssm.exe") {
        Write-Host "  - Intentando eliminar con NSSM..." -ForegroundColor Yellow
        & "C:\Services\SyncFirebird\nssm.exe" stop $servicio 2>$null
        & "C:\Services\SyncFirebird\nssm.exe" remove $servicio confirm 2>$null
    }
    
    # Eliminar con sc.exe
    Write-Host "  - Eliminando con sc.exe..." -ForegroundColor Yellow
    sc.exe delete $servicio 2>$null
    
    Write-Host ""
}

Write-Host "Limpieza completada!" -ForegroundColor Green
Write-Host ""
Write-Host "Ahora puedes ejecutar el instalador." -ForegroundColor Cyan
Write-Host ""
Write-Host "Presiona cualquier tecla para continuar..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

