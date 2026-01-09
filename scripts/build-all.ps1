# ========================================
# SCRIPT DE COMPILACION COMPLETA
# ========================================
param(
    [switch]$SkipExecutable = $false,
    [switch]$SkipInstaller = $false
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "COMPILACION COMPLETA - SYNCFIREBIRD" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path "package.json")) {
    Write-Host "ERROR: Este script debe ejecutarse desde la raiz del proyecto" -ForegroundColor Red
    exit 1
}

# PASO 1: COMPILAR EJECUTABLE
if (-not $SkipExecutable) {
    Write-Host "PASO 1: Compilando ejecutable con PKG..." -ForegroundColor Yellow
    Write-Host ""
    
    npm run build:legacy
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Fallo la compilacion del ejecutable" -ForegroundColor Red
        exit 1
    }
    
    if (Test-Path "dist\supabase-firebird-sync.exe") {
        $exeInfo = Get-Item "dist\supabase-firebird-sync.exe"
        Write-Host ""
        Write-Host "OK - Ejecutable compilado exitosamente" -ForegroundColor Green
        Write-Host "  Ubicacion: dist\supabase-firebird-sync.exe" -ForegroundColor Gray
        Write-Host "  Tamano: $([math]::Round($exeInfo.Length / 1MB, 2)) MB" -ForegroundColor Gray
    } else {
        Write-Host "ERROR: El ejecutable no se creo" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "PASO 1: Omitiendo compilacion del ejecutable" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# PASO 2: COMPILAR INSTALADOR
if (-not $SkipInstaller) {
    Write-Host "PASO 2: Compilando instalador con Inno Setup..." -ForegroundColor Yellow
    Write-Host ""
    
    & ".\scripts\build-installer.ps1"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Fallo la compilacion del instalador" -ForegroundColor Red
        exit 1
    }
    
    if (Test-Path "installer\Output\InstaladorSyncFirebird-v1.0.0.exe") {
        $installerInfo = Get-Item "installer\Output\InstaladorSyncFirebird-v1.0.0.exe"
        Write-Host ""
        Write-Host "OK - Instalador compilado exitosamente" -ForegroundColor Green
        Write-Host "  Ubicacion: installer\Output\InstaladorSyncFirebird-v1.0.0.exe" -ForegroundColor Gray
        Write-Host "  Tamano: $([math]::Round($installerInfo.Length / 1MB, 2)) MB" -ForegroundColor Gray
    } else {
        Write-Host "ERROR: El instalador no se creo" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "PASO 2: Omitiendo compilacion del instalador" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "COMPILACION COMPLETADA EXITOSAMENTE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
