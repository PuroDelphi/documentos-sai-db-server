# Script para probar NSSM manualmente
# Ejecutar como Administrador

$serviceName = "SyncFirebirdManual"
$exePath = "C:\Services\SyncFirebird\supabase-firebird-sync.exe"
$nssmPath = "C:\Services\SyncFirebird\nssm.exe"
$appDir = "C:\Services\SyncFirebird"

Write-Host "Creando servicio manualmente con NSSM..." -ForegroundColor Yellow
Write-Host ""

# 1. Instalar servicio
Write-Host "1. Instalando servicio..." -ForegroundColor Cyan
& $nssmPath install $serviceName $exePath
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Fallo la instalacion del servicio" -ForegroundColor Red
    pause
    exit 1
}
Write-Host "   OK - Servicio instalado" -ForegroundColor Green

# 2. Configurar directorio de trabajo
Write-Host "2. Configurando directorio de trabajo..." -ForegroundColor Cyan
& $nssmPath set $serviceName AppDirectory $appDir
Write-Host "   OK - Directorio configurado" -ForegroundColor Green

# 3. Configurar variables de entorno usando PowerShell
Write-Host "3. Configurando variables de entorno..." -ForegroundColor Cyan
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\$serviceName\Parameters" `
                 -Name "AppEnvironmentExtra" `
                 -Value @("ENV_PASSWORD=12345678", "CONFIG_CACHE_PASSWORD=12345678") `
                 -Type MultiString
Write-Host "   OK - Variables configuradas" -ForegroundColor Green

# 4. Configurar logs de NSSM
Write-Host "4. Configurando logs de NSSM..." -ForegroundColor Cyan
& $nssmPath set $serviceName AppStdout "$appDir\logs\nssm-stdout.log"
& $nssmPath set $serviceName AppStderr "$appDir\logs\nssm-stderr.log"
Write-Host "   OK - Logs configurados" -ForegroundColor Green

# 5. Configurar inicio automático
Write-Host "5. Configurando inicio automatico..." -ForegroundColor Cyan
& $nssmPath set $serviceName Start SERVICE_AUTO_START
Write-Host "   OK - Inicio automatico configurado" -ForegroundColor Green

# 6. Verificar configuración
Write-Host ""
Write-Host "Configuracion del servicio:" -ForegroundColor Yellow
Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\$serviceName\Parameters" | Format-List

# 7. Iniciar servicio
Write-Host ""
Write-Host "6. Iniciando servicio..." -ForegroundColor Cyan
& $nssmPath start $serviceName
Start-Sleep -Seconds 3

# 8. Verificar estado
Write-Host ""
Write-Host "Estado del servicio:" -ForegroundColor Yellow
Get-Service -Name $serviceName | Format-List Name, Status, DisplayName

# 9. Ver logs
Write-Host ""
Write-Host "Logs de NSSM (stderr):" -ForegroundColor Yellow
if (Test-Path "$appDir\logs\nssm-stderr.log") {
    Get-Content "$appDir\logs\nssm-stderr.log" -Tail 20
} else {
    Write-Host "   No hay logs de error" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Logs de la aplicacion:" -ForegroundColor Yellow
if (Test-Path "$appDir\logs\combined.log") {
    Get-Content "$appDir\logs\combined.log" -Tail 20
} else {
    Write-Host "   No hay logs de la aplicacion" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Presiona cualquier tecla para continuar..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

