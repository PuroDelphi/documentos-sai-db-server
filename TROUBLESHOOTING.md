# Guía de Solución de Problemas

## Error 1053: El servicio no respondió a tiempo

Este error ocurre cuando el servicio de Windows no puede iniciarse en el tiempo esperado (30 segundos por defecto).

### Causas comunes:

1. **Error en la configuración** - El archivo `.env` tiene valores incorrectos
2. **No puede conectar a Firebird** - El servidor Firebird no está accesible
3. **No puede conectar a Supabase** - La URL o clave de Supabase son incorrectas
4. **Módulos faltantes** - Faltan dependencias de Node.js

### Pasos para diagnosticar:

#### 1. Ejecutar el diagnóstico automático

```bash
diagnose.bat
```

Este script verificará:
- Versión de Node.js
- Archivo .env y variables configuradas
- Módulos de Node.js instalados
- Estructura de directorios
- Conexión a Firebird
- Conexión a Supabase

#### 2. Probar el servicio en modo consola

```bash
test-console.bat
```

Esto ejecutará el servicio en modo consola (sin instalarlo como servicio de Windows) para que puedas ver los errores en tiempo real.

#### 3. Revisar los logs

Los logs se guardan en la carpeta `logs/`:
- `combined.log` - Todos los logs
- `error.log` - Solo errores

```bash
type logs\error.log
```

#### 4. Verificar el archivo .env

Asegúrate de que el archivo `.env` existe y tiene todas las variables necesarias:

```env
# Firebird
FIREBIRD_HOST=localhost
FIREBIRD_PORT=3050
FIREBIRD_DATABASE=C:\path\to\database.fdb
FIREBIRD_USER=SYSDBA
FIREBIRD_PASSWORD=masterkey

# Supabase
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_KEY=tu-clave-de-servicio

# Sincronización
SYNC_INTERVAL_MINUTES=5
```

### Soluciones comunes:

#### Error: "Cannot find module 'dotenv'"

Los módulos no están instalados. Ejecuta:

```bash
npm install
```

#### Error: "Error connecting to Firebird"

1. Verifica que el servidor Firebird esté ejecutándose
2. Verifica que el host y puerto sean correctos
3. Verifica que la ruta de la base de datos sea correcta
4. Verifica que el usuario y contraseña sean correctos

#### Error: "Error connecting to Supabase"

1. Verifica que la URL de Supabase sea correcta
2. Verifica que la clave de servicio sea correcta
3. Verifica que tengas conexión a Internet

#### El servicio se instala pero no inicia

1. Desinstala el servicio:
   ```bash
   dist\uninstall-service.exe
   ```

2. Ejecuta el diagnóstico:
   ```bash
   diagnose.bat
   ```

3. Corrige los errores encontrados

4. Prueba en modo consola:
   ```bash
   test-console.bat
   ```

5. Si funciona en consola, reinstala el servicio:
   ```bash
   dist\install-service.exe
   ```

### Aumentar el timeout del servicio

Si el servicio necesita más tiempo para iniciar, puedes aumentar el timeout:

1. Abre el Editor del Registro (regedit)
2. Navega a: `HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control`
3. Busca o crea el valor `ServicesPipeTimeout` (DWORD)
4. Establece el valor en milisegundos (ej: 60000 para 60 segundos)
5. Reinicia el equipo

### Contacto

Si el problema persiste, revisa los logs en `logs/error.log` y contacta al soporte técnico.

