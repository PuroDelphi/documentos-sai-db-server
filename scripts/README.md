# 📜 Scripts de Gestión del Servicio

Este directorio contiene scripts para gestionar el servicio de Windows y la encriptación de configuración.

## 🔐 Scripts de Encriptación

### encrypt-env.js

Encripta el archivo `.env` para proteger información sensible.

**Uso:**
```bash
node scripts/encrypt-env.js [password]
```

**Interactivo:**
```bash
npm run encrypt-env
```

**Con contraseña en línea de comandos:**
```bash
node scripts/encrypt-env.js "MiContraseñaSegura123!"
```

**Resultado:**
- Crea el archivo `.env.encrypted`
- Usa encriptación AES-256-GCM
- Requiere contraseña para desencriptar

---

### decrypt-env.js

Desencripta el archivo `.env.encrypted` para recuperar la configuración original.

**Uso:**
```bash
node scripts/decrypt-env.js [password]
```

**Interactivo:**
```bash
npm run decrypt-env
```

**Con contraseña en línea de comandos:**
```bash
node scripts/decrypt-env.js "MiContraseñaSegura123!"
```

**Resultado:**
- Restaura el archivo `.env` original
- Requiere la contraseña correcta

---

## 🪟 Scripts de Servicio de Windows

### install-service.js

Instala el servicio de sincronización como un servicio de Windows.

**⚠️ Requiere privilegios de ADMINISTRADOR**

**Uso:**
```bash
npm run install-service
```

**Características:**
- Detecta automáticamente si existe el ejecutable compilado
- Solicita la contraseña del `.env.encrypted` si existe
- Configura el servicio para inicio automático
- Inicia el servicio inmediatamente después de instalar

**Nombre del servicio:**
- Con ejecutable: `SupabaseFirebirdSync`
- Sin ejecutable (desarrollo): `SupabaseFirebirdSyncDev`

---

### uninstall-service.js

Desinstala el servicio de Windows.

**⚠️ Requiere privilegios de ADMINISTRADOR**

**Uso:**
```bash
npm run uninstall-service
```

**Características:**
- Detiene el servicio si está en ejecución
- Elimina el servicio del sistema
- Solicita confirmación antes de desinstalar

---

## 🔄 Flujo de Trabajo Completo

### Instalación Inicial

```bash
# 1. Instalar dependencias
npm install

# 2. Encriptar configuración
npm run encrypt-env

# 3. Compilar ejecutable
npm run build

# 4. Instalar servicio (como Administrador)
npm run install-service
```

### Actualización del Servicio

```bash
# 1. Detener servicio
net stop SupabaseFirebirdSync

# 2. Compilar nueva versión
npm run build

# 3. Iniciar servicio
net start SupabaseFirebirdSync
```

### Cambio de Configuración

```bash
# 1. Detener servicio
net stop SupabaseFirebirdSync

# 2. Desencriptar configuración
npm run decrypt-env

# 3. Editar .env
# ... hacer cambios ...

# 4. Encriptar nuevamente
npm run encrypt-env

# 5. Reiniciar servicio
net start SupabaseFirebirdSync
```

### Desinstalación

```bash
# 1. Desinstalar servicio (como Administrador)
npm run uninstall-service

# 2. Opcional: Desencriptar configuración para backup
npm run decrypt-env
```

---

## 🛡️ Seguridad

### Mejores Prácticas

1. **Contraseñas Fuertes:**
   - Mínimo 12 caracteres
   - Combinar mayúsculas, minúsculas, números y símbolos
   - No usar palabras del diccionario

2. **Gestión de Contraseñas:**
   - Usar un gestor de contraseñas (1Password, LastPass, Bitwarden)
   - No compartir contraseñas por email o chat
   - Cambiar contraseñas periódicamente

3. **Archivos Sensibles:**
   - Nunca subir `.env` a Git
   - `.env.encrypted` es seguro para compartir (sin la contraseña)
   - Mantener backups de `.env` en lugar seguro

4. **Permisos:**
   - Solo administradores deben instalar/desinstalar servicios
   - Limitar acceso al servidor de producción

---

## 📝 Notas Técnicas

### Algoritmo de Encriptación

- **Algoritmo:** AES-256-GCM
- **Derivación de clave:** PBKDF2 con 100,000 iteraciones
- **Hash:** SHA-256
- **Salt:** 32 bytes aleatorios
- **IV:** 12 bytes aleatorios
- **Auth Tag:** 16 bytes

### Estructura del Archivo Encriptado

```
[Salt: 32 bytes][IV: 12 bytes][Auth Tag: 16 bytes][Datos Encriptados: variable]
```

### Variables de Entorno del Servicio

El servicio usa la variable `ENV_PASSWORD` para desencriptar la configuración:
- Se configura automáticamente durante la instalación
- Se almacena en la configuración del servicio de Windows
- No se expone en archivos de texto plano

