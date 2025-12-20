# 🎯 Métodos de Instalación del Servicio

## ¿Qué método debo usar?

Esta guía te ayudará a elegir el método correcto de instalación según tu escenario.

---

## 📊 Comparación de Métodos

| Característica | Método A: Standalone | Método B: Con Node.js |
|----------------|---------------------|----------------------|
| **Node.js en producción** | ❌ NO requerido | ✅ Requerido |
| **Tamaño del paquete** | ~50-70 MB | ~200-300 MB |
| **Complejidad** | Media | Baja |
| **Seguridad** | Alta (menos dependencias) | Media |
| **Facilidad de actualización** | Media | Alta |
| **Recomendado para** | Servidores de producción | Desarrollo/Testing |

---

## 🟢 Método A: Instalación Standalone

### ✅ Ventajas

- **No requiere Node.js** en el servidor de producción
- **Menor superficie de ataque** (menos software instalado)
- **Más ligero** en el servidor de producción
- **Ideal para producción** en servidores dedicados
- **Ejecutables autocontenidos** con todas las dependencias

### ❌ Desventajas

- Requiere **compilación previa** en un servidor con Node.js
- Proceso de actualización **ligeramente más complejo**
- Necesitas **transferir archivos** entre servidores

### 🎯 Cuándo usar este método

- ✅ Servidor de producción sin Node.js
- ✅ Ambiente corporativo con restricciones de software
- ✅ Quieres minimizar dependencias en producción
- ✅ Tienes un servidor de desarrollo separado
- ✅ Seguridad es una prioridad

### 📦 Archivos necesarios en producción

```
📁 Servidor de Producción
├── dist/
│   ├── supabase-firebird-sync.exe
│   ├── install-service.exe
│   ├── uninstall-service.exe
│   └── encrypt-env.exe
├── logs/ (carpeta vacía)
├── .env.encrypted
├── install-service-standalone.bat
└── uninstall-service-standalone.bat
```

**Tamaño aproximado:** 50-70 MB

---

## 🔵 Método B: Instalación con Node.js

### ✅ Ventajas

- **Proceso más simple** (todo en un solo servidor)
- **Fácil de actualizar** (solo recompilar)
- **Ideal para desarrollo** y testing
- **No requiere transferencia** de archivos

### ❌ Desventajas

- **Requiere Node.js** instalado en producción
- **Mayor tamaño** (incluye node_modules)
- **Más dependencias** en el servidor
- **Posible conflicto** con otras versiones de Node.js

### 🎯 Cuándo usar este método

- ✅ Servidor de desarrollo/testing
- ✅ Ya tienes Node.js instalado en producción
- ✅ Quieres simplicidad sobre seguridad
- ✅ Actualizaciones frecuentes
- ✅ Mismo servidor para desarrollo y producción

### 📦 Archivos necesarios en producción

```
📁 Servidor de Producción
├── dist/
│   └── supabase-firebird-sync.exe
├── scripts/
│   ├── install-service.js
│   └── uninstall-service.js
├── node_modules/
│   └── node-windows/
├── logs/
├── .env.encrypted
├── package.json
└── install-windows-service.bat
```

**Tamaño aproximado:** 200-300 MB

---

## 🚀 Guías de Instalación

### Para Método A (Standalone)
👉 Ver [INSTALACION_SERVICIO_WINDOWS.md](./INSTALACION_SERVICIO_WINDOWS.md#-método-a-instalación-standalone-sin-nodejs)

### Para Método B (Con Node.js)
👉 Ver [INSTALACION_SERVICIO_WINDOWS.md](./INSTALACION_SERVICIO_WINDOWS.md#-método-b-instalación-con-nodejs)

---

## ❓ Preguntas Frecuentes

### ¿Puedo cambiar de método después?

Sí, puedes desinstalar el servicio y reinstalarlo con el otro método sin problemas.

### ¿El servicio funciona igual con ambos métodos?

Sí, el servicio funciona exactamente igual. La única diferencia es cómo se instala.

### ¿Cuál es más rápido?

- **Instalación:** Método B es más rápido (todo en un paso)
- **Ejecución:** Ambos tienen el mismo rendimiento
- **Actualización:** Método B es más rápido

### ¿Cuál es más seguro?

Método A es más seguro porque:
- Menos software instalado en producción
- Menor superficie de ataque
- No expone Node.js en producción

### ¿Necesito Node.js para EJECUTAR el servicio?

**Método A:** NO, el servicio se ejecuta sin Node.js
**Método B:** SÍ, Node.js debe estar instalado (pero solo para instalar/desinstalar)

**Aclaración importante:** En ambos métodos, el ejecutable `.exe` puede correr sin Node.js. La diferencia es que en el Método B, los scripts de instalación/desinstalación requieren Node.js.

---

## 📞 ¿Necesitas ayuda?

Si no estás seguro de qué método usar, considera:

1. **¿Tienes Node.js en producción?**
   - NO → Método A
   - SÍ → Puedes usar cualquiera

2. **¿Es un servidor de producción crítico?**
   - SÍ → Método A (más seguro)
   - NO → Método B (más simple)

3. **¿Actualizarás frecuentemente?**
   - SÍ → Método B (más fácil)
   - NO → Método A (más limpio)

Para más información, consulta la [documentación completa](./INSTALACION_SERVICIO_WINDOWS.md).

