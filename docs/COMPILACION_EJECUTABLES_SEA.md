# 🔨 Compilación de Ejecutables con Node.js SEA

**Versión:** 1.0  
**Fecha:** Enero 2026  
**Método:** Node.js Single Executable Applications (SEA)

---

## 📋 ¿Qué es Node.js SEA?

**SEA (Single Executable Applications)** es una funcionalidad nativa de Node.js 21+ que permite crear ejecutables independientes que incluyen:

- ✅ Node.js completo embebido
- ✅ Tu código JavaScript
- ✅ Todas las dependencias
- ✅ Sin necesidad de Node.js instalado en el sistema

**Ventajas sobre `pkg` (método antiguo):**
- ✅ Soporta Node.js 22+ (versiones modernas)
- ✅ Funcionalidad nativa (no requiere herramientas de terceros)
- ✅ Mejor compatibilidad con módulos nativos
- ✅ Mantenido oficialmente por el equipo de Node.js

---

## 🚀 Compilación Rápida

### Método 1: Script Automático (Recomendado)

```bash
# Compilar todos los ejecutables
.\build-sea.bat
```

Este script compila automáticamente:
1. `supabase-firebird-sync.exe` - Servicio principal
2. `install-service.exe` - Instalador del servicio
3. `uninstall-service.exe` - Desinstalador del servicio
4. `encrypt-env.exe` - Encriptador de .env

**Tiempo total:** 2-4 minutos

---

### Método 2: NPM Script

```bash
npm run build:complete
```

Ejecuta el mismo script `build-sea.bat` internamente.

---

## 🔧 Requisitos

### Software Necesario

1. **Node.js 22+**
   - Versión mínima: 22.0.0
   - Versión recomendada: 22.15.1 o superior
   - Descargar: https://nodejs.org/

2. **Postject**
   - Se instala automáticamente con `npm install`
   - Herramienta para inyectar el código en el ejecutable

3. **Dependencias del Proyecto**
   ```bash
   npm install
   ```

---

## 📝 Proceso de Compilación (Manual)

Si necesitas compilar manualmente un ejecutable individual:

### Paso 1: Crear Configuración SEA

Crear archivo `sea-config.json`:

```json
{
  "main": "src/index.js",
  "output": "sea-prep.blob",
  "disableExperimentalSEAWarning": true,
  "useSnapshot": false,
  "useCodeCache": true
}
```

### Paso 2: Generar el Blob

```bash
node --experimental-sea-config sea-config.json
```

Esto genera `sea-prep.blob` con tu aplicación empaquetada.

### Paso 3: Copiar Ejecutable Base

```bash
node -e "require('fs').copyFileSync(process.execPath, 'dist/mi-app.exe')"
```

Esto copia el ejecutable de Node.js como base.

### Paso 4: Inyectar el Blob

```bash
npx postject dist/mi-app.exe NODE_SEA_BLOB sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
```

Esto inyecta tu aplicación en el ejecutable.

### Paso 5: Limpiar

```bash
del sea-prep.blob
del sea-config.json
```

---

## 📊 Tamaño de los Ejecutables

Cada ejecutable incluye Node.js completo:

| Ejecutable | Tamaño Aproximado |
|-----------|-------------------|
| `supabase-firebird-sync.exe` | ~85 MB |
| `install-service.exe` | ~85 MB |
| `uninstall-service.exe` | ~85 MB |
| `encrypt-env.exe` | ~85 MB |

**Total:** ~340 MB para los 4 ejecutables

**Nota:** El tamaño es grande porque incluye Node.js completo, pero esto garantiza que funcione en cualquier sistema Windows sin dependencias.

---

## ⚠️ Advertencias Comunes

### Warning: "The signature seems corrupted!"

```
warning: The signature seems corrupted!
💉 Injection done!
```

**Esto es NORMAL.** El ejecutable de Node.js está firmado digitalmente, y al inyectar código, la firma se invalida. El ejecutable funciona perfectamente.

**Solución (opcional):** Firmar el ejecutable con tu propio certificado después de la compilación.

---

## 🔍 Verificación

### Verificar que los Ejecutables se Crearon

```bash
dir dist\*.exe
```

Deberías ver:
```
supabase-firebird-sync.exe
install-service.exe
uninstall-service.exe
encrypt-env.exe
```

### Probar un Ejecutable

```bash
.\dist\supabase-firebird-sync.exe --version
```

---

## 🐛 Solución de Problemas

### Error: "Cannot read asset ... illegal operation on a directory"

**Causa:** Intentaste incluir un directorio completo en `assets` del `sea-config.json`.

**Solución:** SEA no soporta directorios en assets. Solo archivos individuales.

### Error: "postject not found"

**Causa:** Postject no está instalado.

**Solución:**
```bash
npm install --save-dev postject
# O globalmente:
npm install -g postject
```

### Error: "node: command not found"

**Causa:** Node.js no está instalado o no está en el PATH.

**Solución:**
1. Instalar Node.js desde https://nodejs.org/
2. Reiniciar la terminal
3. Verificar: `node --version`

---

## 📚 Recursos Adicionales

- **Documentación oficial de Node.js SEA:**  
  https://nodejs.org/api/single-executable-applications.html

- **Postject (herramienta de inyección):**  
  https://github.com/postject/postject

- **Script de compilación:**  
  `build-sea.bat` en la raíz del proyecto

---

## 🔄 Actualizar Ejecutables

Cuando hagas cambios en el código:

```bash
# 1. Hacer cambios en src/ o scripts/
# 2. Recompilar ejecutables
.\build-sea.bat

# 3. Recompilar instalador (si es necesario)
.\build-installer.bat
```

---

**¡Los ejecutables SEA son la forma moderna y oficial de distribuir aplicaciones Node.js!** 🚀

