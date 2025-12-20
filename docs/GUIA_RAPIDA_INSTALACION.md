# 🚀 Guía Rápida de Instalación

Esta guía te llevará paso a paso para instalar el servicio de Windows en menos de 10 minutos.

## ✅ Pre-requisitos

Antes de comenzar, asegúrate de tener:

- [ ] Windows 10 o superior
- [ ] Node.js 18.x instalado ([Descargar aquí](https://nodejs.org/))
- [ ] Acceso de Administrador en Windows
- [ ] Archivo `.env` configurado con tus credenciales

## 📝 Pasos de Instalación

### 1️⃣ Preparar el Proyecto

Abre **Git Bash** o **PowerShell** en la carpeta del proyecto:

```bash
# Instalar todas las dependencias
npm install
```

⏱️ **Tiempo estimado:** 2-3 minutos

---

### 2️⃣ Encriptar la Configuración

Protege tu archivo `.env` con encriptación:

```bash
npm run encrypt-env
```

**El script te pedirá:**
1. Una contraseña maestra (mínimo 8 caracteres)
2. Confirmación de la contraseña

**⚠️ IMPORTANTE:** 
- Guarda esta contraseña en un lugar seguro
- Sin ella NO podrás recuperar tu configuración
- Usa un gestor de contraseñas (recomendado)

**Resultado:**
- ✅ Se crea el archivo `.env.encrypted`
- ✅ Tu configuración está protegida

⏱️ **Tiempo estimado:** 1 minuto

---

### 3️⃣ Compilar el Ejecutable

Convierte el proyecto Node.js en un ejecutable standalone:

```bash
npm run build
```

**Qué hace este comando:**
- Compila todo el código en un solo archivo `.exe`
- Incluye todas las dependencias necesarias
- Genera `dist/supabase-firebird-sync.exe`

**Resultado:**
- ✅ Ejecutable listo en `dist/supabase-firebird-sync.exe`
- ✅ No necesitarás Node.js en producción

⏱️ **Tiempo estimado:** 3-5 minutos

---

### 4️⃣ Instalar el Servicio

**⚠️ IMPORTANTE:** Ejecuta como **ADMINISTRADOR**

**Opción A - Script Batch (Recomendado):**

1. Haz clic derecho en `install-windows-service.bat`
2. Selecciona "Ejecutar como administrador"
3. Sigue las instrucciones en pantalla

**Opción B - Línea de Comandos:**

Abre **PowerShell como Administrador** y ejecuta:

```bash
npm run install-service
```

**El script te pedirá:**
1. Confirmación para continuar
2. La contraseña del `.env.encrypted`

**Resultado:**
- ✅ Servicio instalado: `SupabaseFirebirdSync`
- ✅ Servicio iniciado automáticamente
- ✅ Configurado para inicio automático con Windows

⏱️ **Tiempo estimado:** 1-2 minutos

---

## 🎉 ¡Instalación Completada!

### Verificar que el Servicio Está Funcionando

1. **Abrir Servicios de Windows:**
   - Presiona `Win + R`
   - Escribe `services.msc`
   - Presiona Enter

2. **Buscar el servicio:**
   - Busca `SupabaseFirebirdSync`
   - Verifica que el estado sea "En ejecución"

3. **Revisar los logs:**
   ```
   logs/combined.log  ← Todos los logs
   logs/error.log     ← Solo errores
   ```

---

## 🎮 Comandos Útiles

### Gestión del Servicio

```bash
# Ver estado
sc query SupabaseFirebirdSync

# Detener servicio
net stop SupabaseFirebirdSync

# Iniciar servicio
net start SupabaseFirebirdSync

# Reiniciar servicio
net stop SupabaseFirebirdSync && net start SupabaseFirebirdSync
```

### Desinstalar el Servicio

**Opción A - Script Batch:**
```bash
uninstall-windows-service.bat
```

**Opción B - Línea de Comandos:**
```bash
npm run uninstall-service
```

---

## 🔧 Solución de Problemas Rápida

### ❌ Error: "npm no se reconoce como comando"

**Solución:** Node.js no está instalado o no está en el PATH
1. Instala Node.js desde https://nodejs.org/
2. Reinicia la terminal
3. Verifica: `node --version`

---

### ❌ Error: "Contraseña incorrecta"

**Solución:** La contraseña del `.env.encrypted` es incorrecta
1. Si la olvidaste, recupera el `.env` original de tu backup
2. Vuelve a encriptar: `npm run encrypt-env`
3. Reinstala el servicio

---

### ❌ Error: "Acceso denegado"

**Solución:** No tienes permisos de administrador
1. Cierra la terminal
2. Abre PowerShell como Administrador
3. Vuelve a ejecutar el comando

---

### ❌ El servicio no inicia

**Solución:** Revisa los logs
1. Abre `logs/error.log`
2. Busca el último error
3. Verifica:
   - Conexión a Firebird
   - Conexión a Supabase
   - Variables de entorno correctas

---

## 📚 Documentación Adicional

- [Instalación Completa](INSTALACION_SERVICIO_WINDOWS.md) - Guía detallada
- [Scripts](../scripts/README.md) - Documentación de scripts
- [README Principal](../README.md) - Documentación general

---

## 💡 Consejos

1. **Backup:** Siempre guarda una copia del `.env` original
2. **Contraseñas:** Usa un gestor de contraseñas
3. **Logs:** Revisa los logs regularmente
4. **Actualizaciones:** Detén el servicio antes de actualizar
5. **Pruebas:** Prueba en desarrollo antes de producción

