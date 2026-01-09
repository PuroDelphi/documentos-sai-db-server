# 📦 Instrucciones para el Implementador

**Servicio de Sincronización Firebird**  
**Versión del Instalador:** 1.0.0

---

## 🎯 Bienvenido

Este documento te guiará en la instalación del **Servicio de Sincronización Firebird** usando el instalador wizard.

**Tiempo estimado:** 2-3 minutos  
**Dificultad:** Muy fácil  
**Conocimientos requeridos:** Ninguno

---

## 📋 Antes de Comenzar

### ✅ Requisitos del Sistema

- **Sistema Operativo:** Windows Server 2012 R2 o superior / Windows 10/11 (64 bits)
- **Permisos:** Administrador del sistema
- **Espacio en disco:** 100 MB libres
- **Conexión:** Internet (para sincronización)

### 📦 Archivos Recibidos

Deberías haber recibido:

1. ✅ **InstaladorSyncFirebird-v1.0.0.exe** - El instalador
2. ✅ **URL de la interfaz web** - Para configuración
3. ✅ **Credenciales de acceso** - Usuario y contraseña de la web

**IMPORTANTE:** La contraseña del .env es la **misma** que usarás para acceder a la interfaz web.

---

## 🚀 Instalación Paso a Paso

### Paso 1: Ejecutar el Instalador

1. Localiza el archivo `InstaladorSyncFirebird-v1.0.0.exe`
2. **Clic derecho** sobre el archivo
3. Selecciona **"Ejecutar como administrador"**
4. Si aparece un mensaje de seguridad, haz clic en **"Sí"**

---

### Paso 2: Seguir el Wizard

#### Pantalla 1: Bienvenida

- Lee el mensaje de bienvenida
- Haz clic en **"Siguiente"**

#### Pantalla 2: Directorio de Instalación

- **Por defecto:** `C:\Services\SyncFirebird`
- **Recomendación:** Dejar el directorio por defecto
- Si necesitas cambiarlo, usa el botón **"Examinar"**
- Haz clic en **"Siguiente"**

#### Pantalla 3: Nombre del Servicio ⭐

```
┌─────────────────────────────────────────┐
│ Nombre del Servicio                     │
├─────────────────────────────────────────┤
│                                         │
│ Nombre del servicio:                    │
│ [SupabaseFirebirdSync            ]      │
│                                         │
│ Para múltiples instancias, usa un       │
│ nombre único (ej: SyncEmpresa2)         │
└─────────────────────────────────────────┘
```

**¿Qué poner?**

- **Una sola instalación:** Deja el nombre por defecto
- **Múltiples instalaciones:** Usa un nombre único (ej: `SyncEmpresa2`, `SyncSucursal3`)

**Reglas:**

- Solo letras, números, guiones (-) y guiones bajos (_)
- Sin espacios ni caracteres especiales

Haz clic en **"Siguiente"**

---

#### Pantalla 4: Contraseña del .env ⭐

```
┌─────────────────────────────────────────┐
│ Contraseña de Configuración             │
├─────────────────────────────────────────┤
│                                         │
│ Contraseña del .env:                    │
│ [••••••••••••••••••••••••]              │
│                                         │
│ Esta es la misma contraseña para        │
│ acceder a la interfaz web               │
└─────────────────────────────────────────┘
```

**¿Qué poner?**

- Ingresa la **contraseña proporcionada** por el administrador
- Esta contraseña está en el sobre sellado o gestor de contraseñas

**IMPORTANTE:** Esta es la **misma contraseña** que usarás para acceder a la interfaz web de configuración.

Haz clic en **"Siguiente"**

---

#### Pantalla 5: Contraseña del Caché ⭐

```
┌─────────────────────────────────────────┐
│ Contraseña del Caché                    │
├─────────────────────────────────────────┤
│                                         │
│ Contraseña del caché:                   │
│ [••••••••••••••••••••••••]              │
│                                         │
│ Recomendación: Usar la misma            │
│ contraseña que ingresaste antes         │
└─────────────────────────────────────────┘
```

**¿Qué poner?**

- **Recomendación:** Ingresa la **misma contraseña** que pusiste en el paso anterior
- Esto simplifica la gestión de contraseñas

**Nota:** Si usas una contraseña diferente, el instalador te preguntará si deseas continuar.

Haz clic en **"Siguiente"**

---

#### Pantalla 6: Resumen

- Revisa la configuración
- Si todo está correcto, haz clic en **"Instalar"**
- Si necesitas cambiar algo, haz clic en **"Atrás"**

---

#### Pantalla 7: Instalación

```
┌─────────────────────────────────────────┐
│ Instalando Servicio                     │
├─────────────────────────────────────────┤
│                                         │
│ [████████████████████░░░░] 80%          │
│                                         │
│ Configurando variables de entorno...    │
└─────────────────────────────────────────┘
```

**Espera mientras el instalador:**

1. Copia archivos
2. Configura variables de entorno
3. Instala el servicio de Windows
4. Inicia el servicio

**Tiempo:** 30-60 segundos

---

#### Pantalla 8: Finalización

```
┌─────────────────────────────────────────┐
│ ✅ Instalación Completada               │
├─────────────────────────────────────────┤
│                                         │
│ El servicio ha sido instalado           │
│ exitosamente y está en ejecución.       │
│                                         │
│ [Finalizar]                             │
└─────────────────────────────────────────┘
```

Haz clic en **"Finalizar"**

---

## ✅ Verificación de la Instalación

### 1. Verificar que el Servicio Está Corriendo

1. Presiona **Win + R**
2. Escribe: `services.msc`
3. Presiona **Enter**
4. Busca el servicio (ej: `SupabaseFirebirdSync`)
5. Verifica que el **Estado** sea **"En ejecución"**

### 2. Verificar los Logs

1. Abre el Explorador de Windows
2. Navega a: `C:\Services\SyncFirebird\logs\`
3. Abre el archivo `combined.log`
4. Deberías ver mensajes de inicio del servicio

### 3. Acceder a la Interfaz Web

1. Abre un navegador web
2. Ingresa la **URL proporcionada** (ej: `https://aaa-documentos-sai.nyejnm.easypanel.host/`)
3. Ingresa las **credenciales de acceso**
4. Deberías ver el panel de configuración en el icono de la esquina superior derecha y en Configuración del servicio Local.

---

## 🎉 ¡Instalación Completada!

El servicio está ahora:

- ✅ Instalado
- ✅ Configurado
- ✅ En ejecución
- ✅ Sincronizando datos

---

## 🔧 Gestión del Servicio

### Detener el Servicio

```
1. Win + R
2. services.msc
3. Buscar el servicio
4. Clic derecho > Detener
```

### Iniciar el Servicio

```
1. Win + R
2. services.msc
3. Buscar el servicio
4. Clic derecho > Iniciar
```

### Reiniciar el Servicio

```
1. Win + R
2. services.msc
3. Buscar el servicio
4. Clic derecho > Reiniciar
```

---

## ❓ Problemas Comunes

### "Ya existe un servicio con ese nombre"

**Solución:** Ejecuta el instalador nuevamente y usa un nombre de servicio diferente.

### "No tiene permisos de administrador"

**Solución:** Clic derecho en el instalador > "Ejecutar como administrador"

### El servicio no inicia

**Solución:**

1. Revisa los logs en `C:\Services\SyncFirebird\logs\error.log`
2. Verifica que la contraseña del .env sea correcta
3. Contacta al soporte técnico

### No puedo acceder a la interfaz web

**Solución:**

1. Verifica que el servicio esté corriendo
2. Verifica la URL proporcionada
3. Verifica las credenciales de acceso
4. Verifica la conexión a Internet

---

## 📞 Soporte Técnico

Si tienes problemas durante la instalación:

1. **Revisa los logs:**
   
   - `C:\Services\SyncFirebird\logs\combined.log`
   - `C:\Services\SyncFirebird\logs\error.log`

2. **Contacta al soporte:**
   
   - Email: soporte@asistentesautonomos.com
   - Teléfono: +57 321 227 9702

3. **Información a proporcionar:**
   
   - Versión del instalador
   - Sistema operativo
   - Mensaje de error (si aplica)
   - Contenido de los logs

---

**¡Gracias por usar nuestro servicio!** 🚀
