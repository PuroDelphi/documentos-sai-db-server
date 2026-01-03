# ⚡ Referencia Rápida - Instalación del Servicio

**Versión:** 1.0 | **Fecha:** Enero 2026

---

## 🎯 Instalación en 5 Pasos

### 1️⃣ Copiar Archivos

```
Copiar a: C:\Services\SyncFirebird\
  ✅ supabase-firebird-sync.exe
  ✅ .env.encrypted
```

---

### 2️⃣ Configurar Variable de Entorno

**PowerShell como Administrador:**

```powershell
[System.Environment]::SetEnvironmentVariable('ENV_PASSWORD', 'TU_PASSWORD', 'Machine')
```

**Verificar:**
```powershell
[System.Environment]::GetEnvironmentVariable('ENV_PASSWORD', 'Machine')
```

---

### 3️⃣ Instalar Servicio

```powershell
cd C:\Services\SyncFirebird
.\supabase-firebird-sync.exe install
```

---

### 4️⃣ Configurar Servicio

1. Abrir: `services.msc`
2. Buscar: "Supabase Firebird Sync Service"
3. Tipo de inicio: **Automático**
4. Recuperación: **Reiniciar el servicio** (1 minuto)

---

### 5️⃣ Iniciar y Configurar

```powershell
Start-Service -Name "SupabaseFirebirdSync"
```

Luego configurar en la **interfaz web**.

---

## 🔧 Comandos Esenciales

### Gestión del Servicio

```powershell
# Ver estado
Get-Service -Name "SupabaseFirebirdSync"

# Iniciar
Start-Service -Name "SupabaseFirebirdSync"

# Detener
Stop-Service -Name "SupabaseFirebirdSync"

# Reiniciar
Restart-Service -Name "SupabaseFirebirdSync"
```

### Ver Logs

```powershell
# Ver últimas líneas
Get-Content C:\Services\SyncFirebird\logs\combined.log -Tail 50

# Ver en tiempo real
Get-Content C:\Services\SyncFirebird\logs\combined.log -Tail 50 -Wait

# Ver errores
notepad C:\Services\SyncFirebird\logs\error.log
```

---

## ✅ Verificación Rápida

### Mensajes de Éxito en Logs

```
✅ Conexión a Firebird establecida exitosamente
✅ Configuración de la aplicación inicializada
🚀 Servicio iniciado correctamente
```

### Estado del Servicio

```powershell
Get-Service -Name "SupabaseFirebirdSync"
# Debe mostrar: Running
```

---

## ❌ Solución Rápida de Problemas

### El servicio no inicia

```powershell
# 1. Verificar variable de entorno
[System.Environment]::GetEnvironmentVariable('ENV_PASSWORD', 'Machine')

# 2. Verificar archivos
dir C:\Services\SyncFirebird

# 3. Ver errores
notepad C:\Services\SyncFirebird\logs\error.log

# 4. Reiniciar servidor (si es necesario)
```

### Error de conexión a Firebird

1. ✅ Verificar que Firebird esté ejecutándose
2. ✅ Verificar configuración en interfaz web
3. ✅ Probar conexión manual con FlameRobin/IBExpert
4. ✅ Verificar firewall

---

## 📁 Estructura de Archivos

```
C:\Services\SyncFirebird\
├── supabase-firebird-sync.exe    # Ejecutable
├── .env.encrypted                # Configuración
├── logs\                         # Logs (auto-creado)
│   ├── combined.log
│   └── error.log
└── .cache\                       # Caché (auto-creado)
    └── config.encrypted
```

---

## 🌐 Configuración Web

### Parámetros de Firebird

- **Host:** IP o nombre del servidor
- **Puerto:** 3050 (generalmente)
- **Base de datos:** Ruta completa al .FDB
- **Usuario:** SYSDBA (generalmente)
- **Contraseña:** Contraseña de Firebird

### Intervalos de Sincronización

- **Terceros:** 30 minutos (recomendado)
- **Productos:** 60 minutos (recomendado)
- **Plan de cuentas:** 120 minutos (recomendado)
- **Facturas:** 5 minutos (recomendado)

**⚠️ Reiniciar servicio después de cambiar configuración**

---

## 📞 Contactos de Emergencia

| Contacto | Información |
|----------|-------------|
| **Administrador** | _________________________ |
| **Soporte Técnico** | _________________________ |

---

## 🔄 Desinstalación Rápida

```powershell
# 1. Detener servicio
Stop-Service -Name "SupabaseFirebirdSync"

# 2. Desinstalar
cd C:\Services\SyncFirebird
.\supabase-firebird-sync.exe uninstall

# 3. Eliminar archivos (opcional)
Remove-Item -Path "C:\Services\SyncFirebird" -Recurse -Force
```

---

**💡 Tip:** Imprime esta página para tenerla a mano durante la instalación.

