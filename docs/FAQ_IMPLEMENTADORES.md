# ❓ Preguntas Frecuentes - Implementadores

**Versión:** 1.0  
**Fecha:** Enero 2026

---

## 📋 General

### ¿Qué hace este servicio?

El servicio sincroniza automáticamente datos desde una base de datos Firebird local hacia la nube, permitiendo:
- Consulta de facturas en tiempo real desde cualquier lugar
- Sincronización de terceros (clientes/proveedores)
- Sincronización de productos
- Sincronización de plan de cuentas
- Respaldos automáticos en la nube

### ¿Necesito conocimientos de programación para instalarlo?

No. La instalación solo requiere:
- Conocimientos básicos de Windows
- Permisos de administrador
- Seguir los pasos del documento de instalación

### ¿Cuánto tiempo toma la instalación?

- **Instalación básica:** 15-20 minutos
- **Configuración y pruebas:** 10-15 minutos
- **Total:** Aproximadamente 30-35 minutos

---

## 🔧 Instalación

### ¿Puedo instalar el servicio en cualquier carpeta?

Sí, pero se recomienda usar `C:\Services\SyncFirebird\` para mantener consistencia y facilitar el soporte.

### ¿Qué pasa si ya existe un servicio con el mismo nombre?

Debe desinstalar el servicio existente primero o usar un nombre diferente durante la instalación. Contacte al administrador para instrucciones.

### ¿Necesito reiniciar el servidor después de la instalación?

No es obligatorio, pero se recomienda si:
- La variable de entorno `ENV_PASSWORD` no se reconoce
- El servicio no inicia correctamente

### ¿Puedo instalar múltiples instancias del servicio?

Sí, es posible instalar múltiples instancias para diferentes bases de datos. Cada instancia debe:
- Estar en una carpeta diferente
- Tener un nombre de servicio diferente
- Tener su propia configuración

Contacte al administrador para instrucciones específicas.

---

## ⚙️ Configuración

### ¿Dónde configuro las credenciales de Firebird?

Las credenciales de Firebird se configuran en la **interfaz web de configuración**, NO en archivos locales.

### ¿Qué intervalos de sincronización debo usar?

**Recomendaciones estándar:**
- **Terceros:** 30 minutos
- **Productos:** 60 minutos
- **Plan de cuentas:** 120 minutos
- **Facturas:** 5 minutos

Puede ajustar según las necesidades del cliente.

### ¿Cómo aplico cambios de configuración?

Después de cambiar la configuración en la interfaz web, debe **reiniciar el servicio**:

```powershell
Restart-Service -Name "SupabaseFirebirdSync"
```

### ¿Puedo cambiar la configuración sin detener el servicio?

No. Los cambios de configuración requieren reiniciar el servicio para aplicarse.

---

## 🔐 Seguridad

### ¿Dónde se almacenan las contraseñas?

- La contraseña de configuración (`ENV_PASSWORD`) se almacena como variable de entorno del sistema
- Las credenciales de Firebird se almacenan encriptadas en la nube
- El archivo `.env.encrypted` está encriptado

### ¿Es seguro almacenar la contraseña como variable de entorno?

Sí, las variables de entorno del sistema solo son accesibles por:
- Administradores del sistema
- El servicio que se ejecuta con permisos del sistema

### ¿Qué hago con el archivo ENV_PASSWORD.txt después de la instalación?

**Guárdelo en un lugar seguro** (caja fuerte, gestor de contraseñas) y **elimínelo del servidor**. Lo necesitará si:
- Necesita reinstalar el servicio
- Necesita migrar a otro servidor
- Necesita recuperar la configuración

---

## 🌐 Red y Conectividad

### ¿Qué puertos necesita el servicio?

**Salida (desde el servidor):**
- Puerto 443 (HTTPS) - Para sincronización con la nube
- Puerto 3050 (Firebird) - Para conexión a Firebird (puede variar)

**Entrada:**
- Ninguno (el servicio no acepta conexiones entrantes)

### ¿Funciona detrás de un firewall corporativo?

Sí, siempre que permita conexiones HTTPS salientes (puerto 443).

### ¿Qué pasa si se pierde la conexión a Internet?

El servicio:
1. Detecta la pérdida de conexión
2. Reintenta automáticamente
3. Continúa sincronizando cuando se restablece la conexión
4. No pierde datos durante la desconexión

### ¿Necesito una IP pública?

No. El servicio solo requiere conexión a Internet saliente.

---

## 📊 Rendimiento

### ¿Cuántos recursos consume el servicio?

**Consumo típico:**
- **CPU:** Bajo (picos durante sincronización)
- **RAM:** 50-100 MB
- **Disco:** Logs y caché (~100-500 MB)
- **Red:** Bajo (solo durante sincronización)

### ¿Afecta el rendimiento de Firebird?

No significativamente. El servicio:
- Usa consultas optimizadas
- Solo lee datos (no modifica)
- Sincroniza en intervalos configurables
- No bloquea operaciones normales

### ¿Cuántas facturas puede sincronizar?

El servicio puede manejar bases de datos con:
- Miles de terceros
- Miles de productos
- Cientos de miles de facturas

El rendimiento depende de:
- Velocidad de conexión a Internet
- Rendimiento del servidor Firebird
- Intervalos de sincronización configurados

---

## 📝 Logs y Monitoreo

### ¿Dónde están los logs?

```
C:\Services\SyncFirebird\logs\
├── combined.log    # Todos los eventos
└── error.log       # Solo errores
```

### ¿Cómo veo los logs en tiempo real?

```powershell
Get-Content C:\Services\SyncFirebird\logs\combined.log -Tail 50 -Wait
```

Presione `Ctrl+C` para detener.

### ¿Los logs ocupan mucho espacio?

No. Los logs se rotan automáticamente:
- Máximo 10 archivos de respaldo
- Máximo 10 MB por archivo
- Archivos antiguos se eliminan automáticamente

### ¿Cómo sé si la sincronización está funcionando?

1. **Revisar logs:** Buscar mensajes de sincronización exitosa
2. **Interfaz web:** Ver "Última sincronización" y contadores
3. **Crear dato de prueba:** Crear un tercero en Firebird y verificar que aparece en la web

---

## ❌ Problemas Comunes

### El servicio se detiene solo

**Causas comunes:**
1. Variable `ENV_PASSWORD` incorrecta o no configurada
2. Archivo `.env.encrypted` corrupto o faltante
3. Problemas de conectividad

**Solución:**
1. Verificar variable de entorno
2. Revisar logs de error
3. Contactar soporte si persiste

### No sincroniza datos nuevos

**Causas comunes:**
1. Intervalos de sincronización muy largos
2. Configuración de Firebird incorrecta
3. Servicio no reiniciado después de cambiar configuración

**Solución:**
1. Verificar intervalos en interfaz web
2. Probar conexión a Firebird
3. Reiniciar servicio

### Error "No se puede conectar a Firebird"

**Verificar:**
1. Firebird está ejecutándose
2. Credenciales correctas en interfaz web
3. Ruta de base de datos correcta
4. Firewall permite conexión

---

## 🔄 Mantenimiento

### ¿Necesita mantenimiento regular?

No. El servicio es autónomo y requiere mínimo mantenimiento:
- Logs se rotan automáticamente
- Caché se gestiona automáticamente
- Actualizaciones se notifican al administrador

### ¿Cómo actualizo el servicio?

El administrador proporcionará:
1. Nuevo ejecutable
2. Instrucciones de actualización

**Proceso típico:**
1. Detener servicio
2. Reemplazar ejecutable
3. Iniciar servicio

### ¿Puedo mover el servicio a otro servidor?

Sí. Necesitará:
1. Archivo `.env.encrypted`
2. Contraseña `ENV_PASSWORD`
3. Seguir el proceso de instalación en el nuevo servidor

---

## 📞 Soporte

### ¿Cuándo debo contactar soporte?

Contacte soporte si:
- El servicio no inicia después de seguir la guía
- Hay errores persistentes en los logs
- La sincronización no funciona después de verificar configuración
- Necesita configuraciones especiales

### ¿Qué información debo proporcionar al soporte?

1. Versión de Windows
2. Estado del servicio
3. Últimas 100 líneas de `combined.log`
4. Contenido completo de `error.log`
5. Captura de pantalla de configuración web

---

**¿Más preguntas?** Contacte al administrador del sistema o soporte técnico.

