# Script para descargar NSSM (Non-Sucking Service Manager)
# NSSM es una herramienta que convierte cualquier ejecutable en un servicio de Windows

$nssmVersion = "2.24"
$nssmUrl = "https://nssm.cc/release/nssm-$nssmVersion.zip"
$downloadPath = "installer\nssm.zip"
$extractPath = "installer\nssm"
$targetPath = "installer\nssm.exe"

Write-Host "Descargando NSSM $nssmVersion..." -ForegroundColor Yellow

# Descargar NSSM
Invoke-WebRequest -Uri $nssmUrl -OutFile $downloadPath

Write-Host "Extrayendo NSSM..." -ForegroundColor Yellow

# Extraer el archivo ZIP
Expand-Archive -Path $downloadPath -DestinationPath $extractPath -Force

# Copiar el ejecutable de 64 bits
Copy-Item "$extractPath\nssm-$nssmVersion\win64\nssm.exe" -Destination $targetPath -Force

# Limpiar archivos temporales
Remove-Item $downloadPath -Force
Remove-Item $extractPath -Recurse -Force

Write-Host "✅ NSSM descargado correctamente en: $targetPath" -ForegroundColor Green

