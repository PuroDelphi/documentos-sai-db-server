# 🎯 Guía Rápida: Crear Instalador con Wizard

**Versión:** 1.0  
**Fecha:** Enero 2026  
**Audiencia:** Administradores del Sistema

---

## 📋 Resumen

Esta guía te muestra cómo crear un instalador profesional con wizard gráfico usando Inno Setup. El instalador resultante simplifica la instalación para los implementadores a solo **3 preguntas**.

---

## ⚡ Instalación Rápida (5 Pasos)

### 1️⃣ Instalar Inno Setup

```
1. Ir a: https://jrsoftware.org/isdl.php
2. Descargar: Inno Setup 6.2.2 (o superior)
3. Ejecutar el instalador
4. Seguir el wizard con opciones por defecto
```

**Tiempo:** 2-3 minutos

---

### 2️⃣ Compilar el Proyecto

```bash
# Instalar dependencias (si no lo has hecho)
npm install

# Compilar todos los ejecutables usando Node.js SEA
npm run build:complete

# O directamente:
.\build-sea.bat
```

**Resultado:**
- ✅ `dist/supabase-firebird-sync.exe` - Servicio principal (~85 MB)
- ✅ `dist/install-service.exe` - Instalador (~85 MB)
- ✅ `dist/uninstall-service.exe` - Desinstalador (~85 MB)
- ✅ `dist/encrypt-env.exe` - Encriptador (~85 MB)

**Método:** Node.js 22+ SEA (Single Executable Applications)
- Cada ejecutable incluye Node.js completo embebido
- No requiere Node.js instalado en el sistema del usuario
- Funciona de forma completamente independiente

**Tiempo:** 2-4 minutos

---

### 3️⃣ Preparar Archivo .env.encrypted

```bash
# Si aún no lo has hecho, encriptar el .env
npm run encrypt-env
```

**Resultado:**
- ✅ `.env.encrypted` creado en la raíz del proyecto
- ✅ `.env` original eliminado (por seguridad)

**⚠️ IMPORTANTE:** Este archivo `.env.encrypted` se empaquetará **dentro** del instalador de Inno Setup. El implementador NO necesitará este archivo por separado.

**Tiempo:** 10 segundos

---

### 4️⃣ Compilar el Instalador

**Opción A: Script Automático (Recomendado)**

```bash
# Ejecutar el script de compilación
.\build-installer.bat
```

**Opción B: Manual**

```
1. Abrir Inno Setup Compiler
2. Archivo > Abrir > installer\setup.iss
3. Build > Compile (o F9)
4. Esperar a que termine
```

**IMPORTANTE:** El script de Inno Setup usa rutas relativas desde la carpeta `installer/`, por lo que los archivos fuente deben estar en:
- `..\dist\supabase-firebird-sync.exe`
- `..\.env.encrypted`
- `..\docs\*.md`

**Tiempo:** 30-60 segundos

---

### 5️⃣ Distribuir el Instalador

El instalador estará en:
```
installer/Output/InstaladorSyncFirebird-v1.0.0.exe
```

**✅ ¿Qué incluye el instalador?**
El archivo `.exe` del instalador contiene TODO lo necesario:
- ✅ Ejecutable del servicio (`supabase-firebird-sync.exe`)
- ✅ Archivo de configuración encriptado (`.env.encrypted`)
- ✅ Documentación para implementadores

**📦 Entregar al implementador:**
- ✅ El archivo `.exe` del instalador (UN SOLO ARCHIVO)
- ✅ Contraseña del .env (en sobre sellado o gestor de contraseñas)
- ✅ URL de la interfaz web
- ✅ Credenciales de acceso a la web

**❌ NO entregar:**
- ❌ El `.env.encrypted` por separado (ya está dentro del instalador)
- ❌ Archivos de código fuente
- ❌ Node.js o dependencias

---

## 🎨 Personalización (Opcional)

### Cambiar Versión

Editar `installer/setup.iss`:

```pascal
AppVersion=1.0.0
```

### Cambiar Nombre de la Empresa

```pascal
AppPublisher=Tu Empresa
AppPublisherURL=https://tu-sitio-web.com
```

### Agregar Ícono Personalizado

1. Crear un archivo `.ico` (48x48 o 256x256 píxeles)
2. Guardarlo como `installer/icon.ico`
3. Recompilar el instalador

---

## 📊 Comparación: Instalador vs Manual

| Aspecto | Con Instalador Wizard | Instalación Manual |
|---------|----------------------|-------------------|
| **Tiempo** | 2-3 minutos | 30-35 minutos |
| **Pasos** | 3 preguntas | 15+ pasos |
| **Conocimientos** | Ninguno | Básicos de Windows |
| **Errores** | Muy bajo | Medio |
| **Profesionalismo** | Alto | Medio |
| **Documentación** | Mínima | Extensa |

---

## ✅ Ventajas del Instalador Wizard

### Para el Implementador:
- ✅ **Muy fácil de usar** - Solo 3 preguntas
- ✅ **Rápido** - 2-3 minutos total
- ✅ **Sin errores** - Validaciones automáticas
- ✅ **Profesional** - Interfaz gráfica moderna
- ✅ **Automático** - Todo se configura solo

### Para el Administrador:
- ✅ **Menos soporte** - Menos llamadas de ayuda
- ✅ **Consistencia** - Todas las instalaciones iguales
- ✅ **Trazabilidad** - Versión del instalador
- ✅ **Actualizable** - Fácil crear nuevas versiones

---

## 🎯 Qué Pide el Instalador

El wizard solo hace **3 preguntas**:

### 1. Nombre del Servicio
```
Por defecto: SupabaseFirebirdSync
Permite: Multi-instancias
Validación: Solo letras, números, guiones
```

### 2. Contraseña del .env
```
Uso: Desencriptar archivo .env.encrypted
Nota: Misma contraseña para acceder a la web
Validación: No puede estar vacía
```

### 3. Contraseña del Caché
```
Uso: Encriptar configuración local
Recomendación: Usar la misma del .env
Validación: No puede estar vacía
```

**Advertencia:** Si las contraseñas son diferentes, el wizard pregunta si desea continuar.

---

## 🔧 Qué Hace el Instalador Automáticamente

1. ✅ **Copia archivos** a `C:\Services\SyncFirebird\`
2. ✅ **Crea variables de entorno** del sistema:
   - `ENV_PASSWORD`
   - `CONFIG_CACHE_PASSWORD`
3. ✅ **Instala el servicio** de Windows
4. ✅ **Configura inicio automático**
5. ✅ **Configura recuperación** ante fallos
6. ✅ **Inicia el servicio** automáticamente
7. ✅ **Crea carpetas** de logs y caché

**Todo en 2-3 minutos sin intervención del usuario.**

---

## 📝 Flujo del Wizard

```
1. Bienvenida
   ↓
2. Licencia (opcional)
   ↓
3. Directorio de instalación
   ↓
4. Nombre del servicio ← PREGUNTA 1
   ↓
5. Contraseña del .env ← PREGUNTA 2
   ↓
6. Contraseña del caché ← PREGUNTA 3
   ↓
7. Resumen
   ↓
8. Instalación (automática)
   ↓
9. Finalización
```

---

## 🚀 Casos de Uso

### Caso 1: Instalación Simple (1 Empresa)

```
1. Compilar instalador
2. Entregar .exe + contraseña
3. Implementador ejecuta instalador
4. Responde 3 preguntas
5. ¡Listo!
```

### Caso 2: Multi-Instancia (Varias Empresas)

**Primera instalación:**
```
Directorio: C:\Services\SyncEmpresa1
Servicio: SupabaseFirebirdSync-Empresa1
Contraseñas: [empresa1]
```

**Segunda instalación:**
```
Directorio: C:\Services\SyncEmpresa2
Servicio: SupabaseFirebirdSync-Empresa2
Contraseñas: [empresa2]
```

**Tercera instalación:**
```
Directorio: C:\Services\SyncEmpresa3
Servicio: SupabaseFirebirdSync-Empresa3
Contraseñas: [empresa3]
```

---

## 📞 Soporte

### Problemas Comunes

**"Ya existe un servicio con ese nombre"**
- Usar un nombre diferente en la pregunta 1

**"No tiene permisos de administrador"**
- Ejecutar instalador como administrador

**"Error al crear variables de entorno"**
- Verificar permisos de administrador
- Reiniciar e intentar nuevamente

---

## 🎓 Próximos Pasos

Después de crear el instalador:

1. ✅ **Probar** en ambiente de prueba
2. ✅ **Documentar** la versión creada
3. ✅ **Distribuir** a implementadores
4. ✅ **Capacitar** en el uso del instalador
5. ✅ **Recopilar** feedback para mejoras

---

## 📚 Recursos Adicionales

- [Documentación completa del instalador](../installer/README.md)
- [Script de Inno Setup](../installer/setup.iss)
- [Documentación de Inno Setup](https://jrsoftware.org/ishelp/)

---

**¡El instalador wizard reduce el tiempo de instalación de 30 minutos a 3 minutos!** 🚀

