# 🧪 Guía de Pruebas - Servicio de Windows

Esta guía te ayudará a probar todas las funcionalidades antes de desplegar en producción.

## ✅ Lista de Verificación

### Pre-requisitos
- [ ] Node.js 18.x instalado
- [ ] Git Bash o PowerShell disponible
- [ ] Permisos de Administrador
- [ ] Archivo `.env` configurado

---

## 🔬 Pruebas Paso a Paso

### 1️⃣ Prueba de Instalación de Dependencias

```bash
npm install
```

**Verificar:**
- ✅ No hay errores en la instalación
- ✅ Se creó la carpeta `node_modules/`
- ✅ Existen los paquetes: `pkg`, `node-windows`, `dotenv`

**Comando de verificación:**
```bash
npm list pkg node-windows dotenv
```

---

### 2️⃣ Prueba de Encriptación

**Paso A: Encriptar**
```bash
npm run encrypt-env
```

**Ingresar:**
- Contraseña: `TestPassword123!`
- Confirmación: `TestPassword123!`

**Verificar:**
- ✅ Se creó el archivo `.env.encrypted`
- ✅ El archivo tiene contenido (no está vacío)
- ✅ El tamaño es mayor a 100 bytes

**Comando de verificación:**
```bash
ls -lh .env.encrypted
```

---

**Paso B: Desencriptar**
```bash
npm run decrypt-env
```

**Ingresar:**
- Contraseña: `TestPassword123!`

**Verificar:**
- ✅ Se restauró el archivo `.env`
- ✅ El contenido es idéntico al original
- ✅ No hay errores de desencriptación

**Comando de verificación:**
```bash
cat .env | head -5
```

---

**Paso C: Prueba de Contraseña Incorrecta**
```bash
npm run decrypt-env
```

**Ingresar:**
- Contraseña incorrecta: `WrongPassword`

**Verificar:**
- ✅ Muestra error: "Contraseña incorrecta o archivo corrupto"
- ✅ No sobrescribe el archivo `.env`

---

### 3️⃣ Prueba de Compilación

```bash
npm run build
```

**Verificar:**
- ✅ El proceso completa sin errores
- ✅ Se crea la carpeta `dist/`
- ✅ Existe el archivo `dist/supabase-firebird-sync.exe`
- ✅ El tamaño del ejecutable es > 50 MB

**Comando de verificación:**
```bash
ls -lh dist/
```

**Tiempo esperado:** 3-5 minutos

---

### 4️⃣ Prueba del Ejecutable (Sin Servicio)

**Paso A: Preparar entorno**
```bash
# Asegúrate de tener .env.encrypted
npm run encrypt-env
```

**Paso B: Ejecutar directamente**
```bash
# Establecer contraseña
export ENV_PASSWORD="TestPassword123!"

# Ejecutar
./dist/supabase-firebird-sync.exe
```

**Verificar:**
- ✅ El ejecutable inicia sin errores
- ✅ Se conecta a Firebird
- ✅ Se conecta a Supabase
- ✅ Muestra logs en consola
- ✅ Se crean archivos en `logs/`

**Detener con:** `Ctrl + C`

---

### 5️⃣ Prueba de Instalación del Servicio

**⚠️ Ejecutar PowerShell como ADMINISTRADOR**

```bash
npm run install-service
```

**Ingresar:**
- Confirmación: `s`
- Contraseña: `TestPassword123!`

**Verificar:**
- ✅ Muestra "Servicio instalado exitosamente"
- ✅ Muestra "Servicio iniciado exitosamente"
- ✅ No hay errores

---

### 6️⃣ Verificación del Servicio en Windows

**Paso A: Abrir Servicios**
1. Presiona `Win + R`
2. Escribe `services.msc`
3. Presiona Enter

**Verificar:**
- ✅ Existe el servicio `SupabaseFirebirdSync`
- ✅ Estado: "En ejecución"
- ✅ Tipo de inicio: "Automático"

---

**Paso B: Verificar con Comandos**
```bash
# Ver estado
sc query SupabaseFirebirdSync

# Ver configuración
sc qc SupabaseFirebirdSync
```

**Verificar:**
- ✅ STATE: RUNNING
- ✅ START_TYPE: AUTO_START

---

### 7️⃣ Prueba de Logs del Servicio

```bash
# Ver últimas líneas del log
tail -20 logs/combined.log

# Ver errores
tail -20 logs/error.log
```

**Verificar:**
- ✅ Logs se están generando
- ✅ Muestra "Servicio iniciado exitosamente"
- ✅ Muestra conexiones a bases de datos
- ✅ No hay errores críticos

---

### 8️⃣ Prueba de Gestión del Servicio

**Detener:**
```bash
net stop SupabaseFirebirdSync
```

**Verificar:**
- ✅ Servicio se detiene correctamente
- ✅ Logs muestran "cerrando servicio"

---

**Iniciar:**
```bash
net start SupabaseFirebirdSync
```

**Verificar:**
- ✅ Servicio inicia correctamente
- ✅ Logs muestran "Servicio iniciado"

---

**Reiniciar:**
```bash
net stop SupabaseFirebirdSync && net start SupabaseFirebirdSync
```

**Verificar:**
- ✅ Servicio se reinicia sin problemas

---

### 9️⃣ Prueba de Desinstalación

**⚠️ Ejecutar PowerShell como ADMINISTRADOR**

```bash
npm run uninstall-service
```

**Ingresar:**
- Confirmación: `s`

**Verificar:**
- ✅ Muestra "Servicio desinstalado exitosamente"
- ✅ El servicio ya no aparece en `services.msc`

---

## 📊 Resumen de Pruebas

| Prueba | Comando | Resultado Esperado |
|--------|---------|-------------------|
| Instalación | `npm install` | ✅ Sin errores |
| Encriptación | `npm run encrypt-env` | ✅ Crea .env.encrypted |
| Desencriptación | `npm run decrypt-env` | ✅ Restaura .env |
| Compilación | `npm run build` | ✅ Crea ejecutable |
| Ejecutable | `./dist/supabase-firebird-sync.exe` | ✅ Inicia correctamente |
| Instalación Servicio | `npm run install-service` | ✅ Servicio instalado |
| Verificación | `services.msc` | ✅ Servicio en ejecución |
| Detener | `net stop` | ✅ Se detiene |
| Iniciar | `net start` | ✅ Se inicia |
| Desinstalación | `npm run uninstall-service` | ✅ Servicio eliminado |

---

## 🐛 Problemas Comunes y Soluciones

### Error: "pkg no encontrado"
```bash
npm install -g pkg
# o
npm install
```

### Error: "node-windows no encontrado"
```bash
npm install
```

### Error: "Acceso denegado" al instalar servicio
- Ejecutar PowerShell como Administrador

### El ejecutable no inicia
- Verificar que existe `.env.encrypted`
- Verificar que `ENV_PASSWORD` esté configurado

### El servicio no aparece en services.msc
- Verificar que se ejecutó como Administrador
- Revisar logs de instalación

---

## ✅ Checklist Final

Antes de desplegar en producción:

- [ ] Todas las pruebas pasaron exitosamente
- [ ] El servicio inicia y se detiene correctamente
- [ ] Los logs se generan correctamente
- [ ] La contraseña está guardada en lugar seguro
- [ ] Hay backup del archivo `.env` original
- [ ] La documentación está actualizada
- [ ] Se probó en un entorno similar a producción

---

## 🚀 Siguiente Paso

Si todas las pruebas pasaron, estás listo para:
1. Desplegar en producción
2. Configurar monitoreo de logs
3. Documentar la contraseña en el gestor de contraseñas corporativo

