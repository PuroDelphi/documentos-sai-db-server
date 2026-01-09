# Script para recargar las variables de entorno del sistema sin reiniciar
# Útil después de configurar ENV_PASSWORD

Write-Host "Recargando variables de entorno del sistema..." -ForegroundColor Cyan
Write-Host ""

# Obtener variables de entorno del sistema (Machine)
$machineEnv = [System.Environment]::GetEnvironmentVariables('Machine')

# Obtener variables de entorno del usuario
$userEnv = [System.Environment]::GetEnvironmentVariables('User')

# Guardar el PATH actual del proceso (que incluye Node.js)
$currentPath = $env:Path

# Aplicar variables del sistema al proceso actual (excepto PATH)
foreach ($key in $machineEnv.Keys) {
    if ($key -ne 'Path') {
        [System.Environment]::SetEnvironmentVariable($key, $machineEnv[$key], 'Process')
    }
}

# Aplicar variables del usuario al proceso actual (excepto PATH)
foreach ($key in $userEnv.Keys) {
    if ($key -ne 'Path') {
        [System.Environment]::SetEnvironmentVariable($key, $userEnv[$key], 'Process')
    }
}

# Reconstruir PATH combinando Machine + User + PATH actual del proceso
$machinePath = $machineEnv['Path']
$userPath = $userEnv['Path']
$newPath = "$machinePath;$userPath"

# Si el PATH actual tiene rutas adicionales (como Node.js), preservarlas
if ($currentPath) {
    $env:Path = "$newPath;$currentPath"
} else {
    $env:Path = $newPath
}

Write-Host "Variables de entorno recargadas exitosamente" -ForegroundColor Green
Write-Host ""
Write-Host "Verificando ENV_PASSWORD:" -ForegroundColor Yellow
Write-Host "  Valor actual: $env:ENV_PASSWORD"
Write-Host ""

if ($env:ENV_PASSWORD) {
    Write-Host "✅ ENV_PASSWORD está configurado" -ForegroundColor Green
} else {
    Write-Host "❌ ENV_PASSWORD NO está configurado" -ForegroundColor Red
    Write-Host ""
    Write-Host "Para configurarlo, ejecuta:" -ForegroundColor Yellow
    Write-Host "  [System.Environment]::SetEnvironmentVariable('ENV_PASSWORD', 'TU_CONTRASEÑA', 'Machine')" -ForegroundColor Cyan
}

