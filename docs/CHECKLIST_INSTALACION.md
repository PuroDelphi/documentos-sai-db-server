# ✅ Checklist de Instalación - Servicio de Sincronización Firebird

**Versión:** 1.0  
**Fecha:** Enero 2026

---

## 📋 Información del Cliente

| Campo | Valor |
|-------|-------|
| **Nombre del Cliente:** | _________________________________ |
| **Ubicación:** | _________________________________ |
| **Fecha de Instalación:** | _________________________________ |
| **Técnico Responsable:** | _________________________________ |
| **Contacto en Sitio:** | _________________________________ |
| **Teléfono de Contacto:** | _________________________________ |

---

## 🔍 Pre-Instalación

### Verificación del Sistema

- [ ] Sistema operativo: Windows Server 2012 R2 o superior / Windows 10/11 (64 bits)
- [ ] Permisos de administrador disponibles
- [ ] Conexión a Internet estable
- [ ] Firebird instalado y funcionando
- [ ] Versión de Firebird: _______________

### Información de Firebird

| Campo | Valor |
|-------|-------|
| **Host/IP:** | _________________________________ |
| **Puerto:** | _________________________________ |
| **Ruta Base de Datos:** | _________________________________ |
| **Usuario:** | _________________________________ |
| **Contraseña:** | _________________________________ |

### Archivos Recibidos

- [ ] `supabase-firebird-sync.exe` recibido
- [ ] `.env.encrypted` recibido
- [ ] `ENV_PASSWORD.txt` recibido
- [ ] Credenciales de interfaz web recibidas

---

## 🚀 Instalación

### Paso 1: Preparar Directorio

- [ ] Carpeta creada: `C:\Services\SyncFirebird\`
- [ ] Archivo `supabase-firebird-sync.exe` copiado
- [ ] Archivo `.env.encrypted` copiado
- [ ] Estructura de carpetas verificada

### Paso 2: Variable de Entorno

- [ ] PowerShell abierto como Administrador
- [ ] Variable `ENV_PASSWORD` configurada
- [ ] Variable verificada con comando Get

**Comando usado:**
```powershell
[System.Environment]::SetEnvironmentVariable('ENV_PASSWORD', 'PASSWORD_AQUI', 'Machine')
```

### Paso 3: Instalar Servicio

- [ ] PowerShell navegado a `C:\Services\SyncFirebird\`
- [ ] Comando de instalación ejecutado: `.\supabase-firebird-sync.exe install`
- [ ] Servicio verificado con `Get-Service`
- [ ] Servicio aparece en la lista

### Paso 4: Configurar Servicio

- [ ] Servicios de Windows abierto (`services.msc`)
- [ ] Servicio "Supabase Firebird Sync Service" localizado
- [ ] Tipo de inicio configurado: **Automático**
- [ ] Recuperación configurada:
  - [ ] Primer error: Reiniciar el servicio
  - [ ] Segundo error: Reiniciar el servicio
  - [ ] Errores posteriores: Reiniciar el servicio
  - [ ] Reiniciar después de: 1 minuto

### Paso 5: Iniciar Servicio

- [ ] Servicio iniciado desde la interfaz de servicios
- [ ] Estado cambiado a "En ejecución"
- [ ] Verificado con `Get-Service`

---

## ⚙️ Configuración

### Interfaz Web

- [ ] URL de interfaz web recibida: _________________________________
- [ ] Credenciales de acceso recibidas
- [ ] Inicio de sesión exitoso

### Configuración de Firebird

- [ ] Host configurado
- [ ] Puerto configurado
- [ ] Ruta de base de datos configurada
- [ ] Usuario configurado
- [ ] Contraseña configurada
- [ ] Conexión probada exitosamente

### Intervalos de Sincronización

- [ ] Intervalo de terceros configurado: _______ minutos
- [ ] Intervalo de productos configurado: _______ minutos
- [ ] Intervalo de plan de cuentas configurado: _______ minutos
- [ ] Intervalo de facturas configurado: _______ minutos

### Aplicar Cambios

- [ ] Configuración guardada en interfaz web
- [ ] Servicio reiniciado: `Restart-Service -Name "SupabaseFirebirdSync"`

---

## ✅ Verificación

### Logs del Servicio

- [ ] Carpeta de logs existe: `C:\Services\SyncFirebird\logs\`
- [ ] Archivo `combined.log` existe
- [ ] Logs revisados
- [ ] Mensaje encontrado: "✅ Conexión a Firebird establecida exitosamente"
- [ ] Mensaje encontrado: "✅ Configuración de la aplicación inicializada"
- [ ] Mensaje encontrado: "🚀 Servicio iniciado correctamente"
- [ ] Sin errores en `error.log`

### Estado en Interfaz Web

- [ ] Estado del servicio: **Activo**
- [ ] Última sincronización: Fecha y hora reciente
- [ ] Terceros sincronizados: _______ registros
- [ ] Productos sincronizados: _______ registros
- [ ] Facturas sincronizadas: _______ registros
- [ ] Errores reportados: **0**

### Pruebas Funcionales

- [ ] Crear un tercero en Firebird
- [ ] Esperar intervalo de sincronización
- [ ] Verificar que aparece en interfaz web
- [ ] Crear una factura en Firebird
- [ ] Esperar intervalo de sincronización
- [ ] Verificar que aparece en interfaz web

---

## 📝 Notas y Observaciones

### Problemas Encontrados

```
_____________________________________________________________________________

_____________________________________________________________________________

_____________________________________________________________________________

_____________________________________________________________________________
```

### Soluciones Aplicadas

```
_____________________________________________________________________________

_____________________________________________________________________________

_____________________________________________________________________________

_____________________________________________________________________________
```

### Configuraciones Especiales

```
_____________________________________________________________________________

_____________________________________________________________________________

_____________________________________________________________________________

_____________________________________________________________________________
```

---

## 📞 Información de Soporte

### Contactos

| Rol | Nombre | Teléfono | Email |
|-----|--------|----------|-------|
| **Administrador del Sistema** | _____________ | _____________ | _____________ |
| **Soporte Técnico** | _____________ | _____________ | _____________ |
| **Contacto del Cliente** | _____________ | _____________ | _____________ |

---

## ✍️ Firmas

### Técnico Instalador

**Nombre:** _________________________________  
**Firma:** _________________________________  
**Fecha:** _________________________________

### Cliente / Responsable en Sitio

**Nombre:** _________________________________  
**Firma:** _________________________________  
**Fecha:** _________________________________

---

## 📎 Anexos

### Información Adicional Entregada al Cliente

- [ ] Copia de este checklist
- [ ] Documento "GUIA_INSTALACION_IMPLEMENTADORES.md"
- [ ] Credenciales de acceso a interfaz web (en sobre sellado)
- [ ] Información de contacto de soporte

### Archivos de Respaldo

- [ ] Copia de seguridad de logs guardada
- [ ] Captura de pantalla de configuración guardada
- [ ] Captura de pantalla de servicio funcionando guardada

---

**Instalación completada exitosamente:** [ ] SÍ  [ ] NO

**Observaciones finales:**
```
_____________________________________________________________________________

_____________________________________________________________________________

_____________________________________________________________________________
```

---

**Documento preparado para:** Implementadores y Técnicos de Campo  
**Última actualización:** Enero 2026

