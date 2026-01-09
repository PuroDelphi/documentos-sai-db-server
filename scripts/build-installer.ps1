# Script para compilar el instalador con Inno Setup
# Requiere Inno Setup 6.x instalado en el sistema

Write-Host "Compilando instalador con Inno Setup..." -ForegroundColor Yellow

# Buscar ISCC.exe en las ubicaciones comunes
$isccPaths = @(
    "D:\Program Files (x86)\Inno Setup 6\ISCC.exe",
    "C:\Program Files (x86)\Inno Setup 6\ISCC.exe",
    "C:\Program Files\Inno Setup 6\ISCC.exe",
    "C:\Program Files (x86)\Inno Setup 5\ISCC.exe",
    "C:\Program Files\Inno Setup 5\ISCC.exe"
)

$isccPath = $null
foreach ($path in $isccPaths) {
    if (Test-Path $path) {
        $isccPath = $path
        break
    }
}

if (-not $isccPath) {
    Write-Host "ERROR: Inno Setup no esta instalado" -ForegroundColor Red
    Write-Host ""
    Write-Host "Por favor, descarga e instala Inno Setup desde:" -ForegroundColor Yellow
    Write-Host "https://jrsoftware.org/isdl.php" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Despues de instalarlo, ejecuta este script nuevamente." -ForegroundColor Yellow
    exit 1
}

Write-Host "OK - Inno Setup encontrado en: $isccPath" -ForegroundColor Green

# Verificar que existen los archivos necesarios
$requiredFiles = @(
    "installer\setup.iss",
    "installer\nssm.exe",
    "dist\supabase-firebird-sync.exe",
    ".env.encrypted"
)

foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
        Write-Host "ERROR: Archivo requerido no encontrado: $file" -ForegroundColor Red
        exit 1
    }
}

Write-Host "OK - Todos los archivos requeridos estan presentes" -ForegroundColor Green

# Compilar el instalador
Write-Host ""
Write-Host "Compilando instalador..." -ForegroundColor Yellow

& $isccPath "installer\setup.iss"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "OK - Instalador compilado exitosamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "El instalador se encuentra en:" -ForegroundColor Yellow
    Write-Host "installer\Output\InstaladorSyncFirebird-v1.0.0.exe" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "ERROR: Fallo la compilacion del instalador" -ForegroundColor Red
    Write-Host "Codigo de error:" $LASTEXITCODE -ForegroundColor Red
    exit 1
}

