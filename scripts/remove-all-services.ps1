# Script para eliminar todos los servicios relacionados con SupabaseFirebird/SyncFirebird
# Ejecutar como Administrador

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ELIMINADOR DE SERVICIOS SYNCFIREBIRD" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Buscar todos los servicios relacionados
Write-Host "Buscando servicios relacionados..." -ForegroundColor Yellow
$services = Get-Service | Where-Object {
    $_.Name -like "*SupabaseFirebird*" -or 
    $_.Name -like "*SyncFirebird*"
}

if ($services.Count -eq 0) {
    Write-Host "No se encontraron servicios para eliminar." -ForegroundColor Green
    Write-Host ""
    Write-Host "Presiona cualquier tecla para salir..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 0
}

Write-Host "Se encontraron $($services.Count) servicio(s):" -ForegroundColor Yellow
Write-Host ""

foreach ($service in $services) {
    Write-Host "  - $($service.Name) [$($service.Status)]" -ForegroundColor White
}

Write-Host ""
Write-Host "¿Deseas eliminar TODOS estos servicios? (S/N): " -ForegroundColor Red -NoNewline
$confirmation = Read-Host

if ($confirmation -ne "S" -and $confirmation -ne "s") {
    Write-Host "Operación cancelada." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Presiona cualquier tecla para salir..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 0
}

Write-Host ""
Write-Host "Eliminando servicios..." -ForegroundColor Yellow
Write-Host ""

$nssmPath = "C:\Services\SyncFirebird\nssm.exe"
$nssmExists = Test-Path $nssmPath

foreach ($service in $services) {
    $serviceName = $service.Name
    Write-Host "Procesando: $serviceName" -ForegroundColor Cyan
    
    # Detener el servicio
    Write-Host "  1. Deteniendo servicio..." -ForegroundColor Gray
    try {
        if ($service.Status -eq "Running") {
            Stop-Service -Name $serviceName -Force -ErrorAction Stop
            Write-Host "     ✓ Servicio detenido" -ForegroundColor Green
        } else {
            Write-Host "     - Servicio ya estaba detenido" -ForegroundColor Gray
        }
    } catch {
        Write-Host "     ✗ Error deteniendo servicio: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Start-Sleep -Seconds 1
    
    # Eliminar el servicio
    Write-Host "  2. Eliminando servicio..." -ForegroundColor Gray
    
    # Intentar con NSSM primero si existe
    $removed = $false
    if ($nssmExists) {
        try {
            $result = & $nssmPath remove $serviceName confirm 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "     ✓ Servicio eliminado con NSSM" -ForegroundColor Green
                $removed = $true
            }
        } catch {
            # Continuar con sc.exe
        }
    }
    
    # Si NSSM no funcionó, usar sc.exe
    if (-not $removed) {
        try {
            $result = sc.exe delete $serviceName 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "     ✓ Servicio eliminado con sc.exe" -ForegroundColor Green
                $removed = $true
            } else {
                Write-Host "     ✗ Error eliminando servicio: $result" -ForegroundColor Red
            }
        } catch {
            Write-Host "     ✗ Error eliminando servicio: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PROCESO COMPLETADO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar servicios restantes
Write-Host "Verificando servicios restantes..." -ForegroundColor Yellow
$remainingServices = Get-Service | Where-Object {
    $_.Name -like "*SupabaseFirebird*" -or 
    $_.Name -like "*SyncFirebird*"
}

if ($remainingServices.Count -eq 0) {
    Write-Host "✓ Todos los servicios fueron eliminados exitosamente." -ForegroundColor Green
} else {
    Write-Host "⚠ Aún quedan $($remainingServices.Count) servicio(s):" -ForegroundColor Yellow
    foreach ($service in $remainingServices) {
        Write-Host "  - $($service.Name) [$($service.Status)]" -ForegroundColor White
    }
    Write-Host ""
    Write-Host "Puede que necesites reiniciar el sistema para eliminarlos completamente." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Presiona cualquier tecla para salir..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

