# 📦 Instalador Wizard - Inno Setup

Este directorio contiene el script de Inno Setup para crear un instalador profesional con wizard para el Servicio de Sincronización Firebird.

---

## 🎯 Características del Instalador

### ✅ Wizard Profesional
- Interfaz gráfica moderna y profesional
- Guía paso a paso al usuario
- Validaciones en tiempo real
- Mensajes de error claros

### ✅ Configuración Simplificada
El instalador solo pide **3 datos esenciales**:

1. **Nombre del servicio** (para multi-instancias)
   - Por defecto: `SupabaseFirebirdSync`
   - Permite instalar múltiples instancias

2. **Contraseña del .env** (ENV_PASSWORD)
   - Proporcionada por el administrador
   - Misma contraseña para acceder a la interfaz web

3. **Contraseña del caché** (CONFIG_CACHE_PASSWORD)
   - Se recomienda usar la misma contraseña del .env
   - Encripta la configuración local

### ✅ Instalación Automática
- Copia archivos al directorio de instalación
- Crea variables de entorno del sistema
- Instala el servicio de Windows
- Configura inicio automático
- Configura recuperación ante fallos
- Inicia el servicio automáticamente

---

## 📋 Requisitos

### Para Compilar el Instalador

1. **Node.js 22+**
   - Descargar desde: https://nodejs.org/
   - Versión recomendada: 22.15.1 o superior
   - Necesario para compilar los ejecutables

2. **Inno Setup 6.x**
   - Descargar desde: https://jrsoftware.org/isdl.php
   - Versión recomendada: 6.2.2 o superior
   - Instalación gratuita

3. **Archivos del Proyecto**
   - `dist/supabase-firebird-sync.exe` (ejecutable compilado con SEA)
   - `.env.encrypted` (archivo de configuración)
   - Documentación en `docs/`

### Para Usar el Instalador

- Windows Server 2012 R2 o superior / Windows 10/11 (64 bits)
- Permisos de administrador
- Conexión a Internet

---

## 🚀 Cómo Compilar el Instalador

### Paso 1: Preparar Archivos

Asegúrate de tener todos los archivos necesarios:

```bash
# 1. Instalar dependencias (si no lo has hecho)
npm install

# 2. Compilar los ejecutables usando Node.js SEA (Single Executable Application)
npm run build:complete
# O directamente:
.\build-sea.bat

# 3. Crear el archivo .env.encrypted (si no existe)
npm run encrypt-env

# 4. Verificar que existen TODOS los archivos necesarios
dir dist\supabase-firebird-sync.exe
dir .env.encrypted
```

**⚠️ IMPORTANTE:** El archivo `.env.encrypted` debe existir en la raíz del proyecto **ANTES** de compilar el instalador, ya que se empaquetará dentro del instalador.

**Nota:** Los ejecutables se compilan usando la funcionalidad nativa de Node.js 22+ (SEA - Single Executable Applications). Cada ejecutable incluye Node.js completo embebido (~85 MB cada uno).

### Paso 2: Instalar Inno Setup

1. Descargar Inno Setup desde: https://jrsoftware.org/isdl.php
2. Ejecutar el instalador
3. Seguir el wizard de instalación
4. Instalar con opciones por defecto

### Paso 3: Compilar el Instalador

**Opción A: Usando la Interfaz Gráfica**

1. Abrir Inno Setup Compiler
2. Archivo > Abrir > Seleccionar `installer/setup.iss`
3. Build > Compile (o presionar F9)
4. Esperar a que termine la compilación
5. El instalador se generará en `installer/Output/`

**Opción B: Usando Línea de Comandos**

```bash
# Navegar al directorio del proyecto
cd d:\serverN8N\Webs\ServicioSAIDB

# Compilar (ajustar ruta de ISCC.exe según instalación)
"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer\setup.iss
```

### Paso 4: Verificar el Instalador

El instalador generado estará en:
```
installer/Output/InstaladorSyncFirebird-v1.0.0.exe
```

Tamaño aproximado: 15-25 MB (incluye todo lo necesario)

---

## 📦 Distribución del Instalador

### Archivos a Entregar al Implementador

**Solo necesitas entregar 1 archivo:**

```
📄 InstaladorSyncFirebird-v1.0.0.exe
```

**✅ ¿Qué incluye el instalador?**
- ✅ Ejecutable del servicio (`supabase-firebird-sync.exe`)
- ✅ Archivo de configuración encriptado (`.env.encrypted`)
- ✅ Documentación para implementadores

**❌ ¿Qué NO necesita el implementador?**
- ❌ NO necesita el `.env.encrypted` por separado (ya está dentro del instalador)
- ❌ NO necesita Node.js instalado
- ❌ NO necesita archivos adicionales

**Información adicional a proporcionar:**

1. **Contraseña del .env** (en sobre sellado o gestor de contraseñas)
2. **URL de la interfaz web** de configuración
3. **Credenciales de acceso** a la interfaz web

---

## 🎓 Uso del Instalador (Para Implementadores)

### Proceso de Instalación

1. **Ejecutar el instalador**
   - Doble clic en `InstaladorSyncFirebird-v1.0.0.exe`
   - Clic derecho > "Ejecutar como administrador"

2. **Seguir el wizard**
   - Pantalla de bienvenida
   - Seleccionar directorio de instalación
   - Ingresar nombre del servicio
   - Ingresar contraseña del .env
   - Ingresar contraseña del caché
   - Confirmar instalación

3. **Esperar instalación**
   - El instalador copia archivos
   - Configura variables de entorno
   - Instala el servicio
   - Inicia el servicio

4. **Finalización**
   - Mensaje de instalación completada
   - El servicio está en ejecución

**Tiempo total:** 2-3 minutos

---

## 🔧 Personalización del Instalador

### Cambiar Información de la Aplicación

Editar `installer/setup.iss`:

```pascal
[Setup]
AppName=Servicio de Sincronización Firebird
AppVersion=1.0.0
AppPublisher=Tu Empresa
AppPublisherURL=https://tu-sitio-web.com
```

### Cambiar Directorio de Instalación por Defecto

```pascal
DefaultDirName=C:\Services\SyncFirebird
```

### Cambiar Nombre del Instalador Generado

```pascal
OutputBaseFilename=InstaladorSyncFirebird-v1.0.0
```

### Agregar Ícono Personalizado

1. Crear o conseguir un archivo `.ico` (32x32 o 48x48 píxeles)
2. Guardarlo como `installer/icon.ico`
3. El script ya está configurado para usarlo

---

## 📝 Notas Importantes

### Variables de Entorno

El instalador crea las siguientes variables de entorno **del sistema** (Machine):

- `ENV_PASSWORD` - Contraseña para desencriptar .env
- `CONFIG_CACHE_PASSWORD` - Contraseña para encriptar caché

**IMPORTANTE:** Estas variables requieren **reiniciar** aplicaciones para que las reconozcan, pero el servicio las usa inmediatamente.

### Servicio de Windows

El instalador:
- ✅ Crea el servicio con el nombre especificado
- ✅ Configura inicio automático
- ✅ Configura recuperación ante fallos (reiniciar cada 60 segundos)
- ✅ Inicia el servicio automáticamente

### Multi-Instancia

Para instalar múltiples instancias:
1. Ejecutar el instalador
2. Cambiar el directorio de instalación (ej: `C:\Services\SyncEmpresa2`)
3. Usar un nombre de servicio diferente (ej: `SupabaseFirebirdSync-Empresa2`)
4. Usar las credenciales correspondientes a esa instancia

---

## ❓ Solución de Problemas

### Error: "Ya existe un servicio con ese nombre"

**Causa:** Ya hay un servicio instalado con el mismo nombre.

**Solución:**
- Usar un nombre de servicio diferente durante la instalación
- O desinstalar el servicio existente primero

### Error: "No tiene permisos de administrador"

**Causa:** El instalador no se ejecutó como administrador.

**Solución:**
- Clic derecho en el instalador
- Seleccionar "Ejecutar como administrador"

### El servicio no inicia automáticamente

**Causa:** Puede haber un problema con las credenciales o archivos.

**Solución:**
1. Abrir `services.msc`
2. Buscar el servicio
3. Intentar iniciarlo manualmente
4. Revisar logs en `C:\Services\SyncFirebird\logs\error.log`

---

## 📚 Documentación Relacionada

- [¿Qué Recibe el Implementador?](../docs/QUE_RECIBE_EL_IMPLEMENTADOR.md) ⭐ **NUEVO**
- [Guía de Instalación para Implementadores](../docs/GUIA_INSTALACION_IMPLEMENTADORES.md)
- [Instrucciones del Instalador](../docs/INSTRUCCIONES_INSTALADOR_IMPLEMENTADOR.md)
- [FAQ para Implementadores](../docs/FAQ_IMPLEMENTADORES.md)
- [Instalación Multi-Instancia](../docs/INSTALACION_MULTI_INSTANCIA.md)

---

## 📚 Recursos Adicionales

- **Documentación de Inno Setup:** https://jrsoftware.org/ishelp/
- **Ejemplos de scripts:** `C:\Program Files (x86)\Inno Setup 6\Examples\`
- **Foro de soporte:** https://groups.google.com/g/innosetup

---

**Última actualización:** Enero 2026

