# 🔄 Instalación Multi-Instancia del Servicio de Windows

Esta guía explica cómo instalar **múltiples instancias** del servicio Supabase-Firebird Sync en la **misma máquina**.

---

## 📋 Casos de Uso

### ¿Cuándo necesitas múltiples instancias?

- ✅ **Múltiples empresas:** Sincronizar varias bases de datos Firebird independientes
- ✅ **Múltiples sucursales:** Cada sucursal con su propia base de datos
- ✅ **Múltiples clientes:** Servidor compartido que atiende a varios clientes
- ✅ **Ambientes separados:** Producción, staging, desarrollo en la misma máquina

---

## 🎯 Arquitectura Multi-Instancia

### Estructura Recomendada

```
📁 C:\Services\
├── 📁 SyncEmpresa1\
│   ├── 📁 dist\
│   │   └── supabase-firebird-sync.exe
│   ├── 📁 logs\
│   │   ├── combined.log
│   │   └── error.log
│   ├── 📁 .cache\
│   │   └── config.encrypted
│   ├── .env.encrypted
│   └── package.json
│
├── 📁 SyncEmpresa2\
│   ├── 📁 dist\
│   │   └── supabase-firebird-sync.exe
│   ├── 📁 logs\
│   ├── 📁 .cache\
│   ├── .env.encrypted
│   └── package.json
│
└── 📁 SyncEmpresa3\
    ├── 📁 dist\
    ├── 📁 logs\
    ├── 📁 .cache\
    ├── .env.encrypted
    └── package.json
```

### Servicios de Windows

Cada instancia se registra como un servicio independiente:

- `SupabaseFirebirdSync-Empresa1`
- `SupabaseFirebirdSync-Empresa2`
- `SupabaseFirebirdSync-Empresa3`

---

## 🚀 Instalación Paso a Paso

### Requisitos Previos

- ✅ Windows 10 o superior
- ✅ Node.js 18.x o superior (solo para compilar)
- ✅ Privilegios de administrador
- ✅ Configuración en Supabase para cada usuario/empresa

---

### Paso 1: Preparar la Primera Instancia

#### 1.1. Compilar el Proyecto

En tu máquina de desarrollo:

```bash
# Clonar el repositorio
git clone <repo-url>
cd ServicioSAIDB

# Instalar dependencias
npm install

# Compilar ejecutable
npm run build:complete
```

#### 1.2. Configurar Credenciales

Crear archivo `.env` con las credenciales de la **primera empresa**:

```env
# Supabase
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key

# Usuario en Supabase - Empresa 1
USER_UUID=uuid-empresa-1

# Contraseña del caché
CONFIG_CACHE_PASSWORD=tu-password-cache
```

**IMPORTANTE:** Las credenciales de Firebird (host, puerto, base de datos, usuario, contraseña) se configuran en Supabase en la tabla `invoice_config`, NO en el archivo `.env`.

#### 1.3. Encriptar el .env

```bash
npm run encrypt-env
```

Esto creará `.env.encrypted` y eliminará el `.env` original.

---

### Paso 2: Copiar a la Ubicación de Producción

Copiar la carpeta completa al servidor:

```
📁 C:\Services\SyncEmpresa1\
├── 📁 dist\
│   └── supabase-firebird-sync.exe
├── .env.encrypted
└── (otros archivos necesarios)
```

---

### Paso 3: Instalar el Primer Servicio

**Ejecutar como ADMINISTRADOR:**

```bash
cd C:\Services\SyncEmpresa1
install-multi-instance.bat
```

El script te solicitará:

1. **Nombre del servicio:** `SupabaseFirebirdSync-Empresa1`
2. **Contraseña del .env:** (la que usaste en encrypt-env)
3. **Contraseña del caché:** (la del CONFIG_CACHE_PASSWORD)

---

### Paso 4: Preparar la Segunda Instancia

#### 4.1. Copiar la Carpeta Base

```bash
# Copiar toda la carpeta
xcopy C:\Services\SyncEmpresa1 C:\Services\SyncEmpresa2 /E /I
```

#### 4.2. Configurar Credenciales de la Segunda Empresa

En tu máquina de desarrollo, crear un nuevo `.env` para la **segunda empresa**:

```env
# Supabase (mismo proyecto)
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key

# Usuario en Supabase - Empresa 2 (DIFERENTE)
USER_UUID=uuid-empresa-2

# Contraseña del caché
CONFIG_CACHE_PASSWORD=tu-password-cache
```

**IMPORTANTE:** Las credenciales de Firebird para la Empresa 2 se configuran en Supabase en la tabla `invoice_config` para el `USER_UUID` de la Empresa 2.

#### 4.3. Encriptar y Copiar

```bash
npm run encrypt-env
```

Copiar el `.env.encrypted` generado a `C:\Services\SyncEmpresa2\`

---

### Paso 5: Instalar el Segundo Servicio

**Ejecutar como ADMINISTRADOR:**

```bash
cd C:\Services\SyncEmpresa2
install-multi-instance.bat
```

Nombre del servicio: `SupabaseFirebirdSync-Empresa2`

---

### Paso 6: Repetir para Más Instancias

Para cada instancia adicional:

1. Copiar la carpeta base
2. Crear `.env` con credenciales únicas
3. Encriptar el `.env`
4. Copiar `.env.encrypted` a la nueva carpeta
5. Ejecutar `install-multi-instance.bat` con un nombre único

---

## ⚙️ Configuración en Supabase

### Crear Usuario y Configuración para Cada Instancia

Cada instancia necesita su propio registro en `invoice_config` con sus credenciales de Firebird:

```sql
-- Empresa 1
INSERT INTO invoice_config (
  user_id,
  service_name,
  -- Credenciales de Firebird para Empresa 1
  firebird_host,
  firebird_port,
  firebird_database,
  firebird_user,
  firebird_password
  -- ... otras configuraciones
) VALUES (
  'uuid-empresa-1',
  'SupabaseFirebirdSync-Empresa1',
  '192.168.1.10',
  3050,
  'C:\Databases\Empresa1.FDB',
  'SYSDBA',
  'password-empresa-1'
  -- ... valores por defecto
);

-- Empresa 2
INSERT INTO invoice_config (
  user_id,
  service_name,
  firebird_host,
  firebird_port,
  firebird_database,
  firebird_user,
  firebird_password
) VALUES (
  'uuid-empresa-2',
  'SupabaseFirebirdSync-Empresa2',
  '192.168.1.20',
  3050,
  'C:\Databases\Empresa2.FDB',
  'SYSDBA',
  'password-empresa-2'
);

-- Empresa 3
INSERT INTO invoice_config (
  user_id,
  service_name,
  firebird_host,
  firebird_port,
  firebird_database,
  firebird_user,
  firebird_password
) VALUES (
  'uuid-empresa-3',
  'SupabaseFirebirdSync-Empresa3',
  '192.168.1.30',
  3050,
  'C:\Databases\Empresa3.FDB',
  'SYSDBA',
  'password-empresa-3'
);
```

### Puntos Importantes:

1. **Credenciales de Firebird en Supabase:**
   - ✅ Las credenciales de Firebird se configuran en `invoice_config`
   - ✅ Cada `USER_UUID` tiene sus propias credenciales
   - ✅ NO se configuran en el archivo `.env`

2. **Campo `service_name`:**
   - ℹ️ Es solo para identificación en logs
   - ℹ️ El nombre real del servicio de Windows se define durante la instalación

3. **Archivo `.env`:**
   - ✅ Solo contiene: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, USER_UUID, CONFIG_CACHE_PASSWORD
   - ❌ NO contiene credenciales de Firebird

---

## 🔧 Gestión de Múltiples Servicios

### Ver Todos los Servicios

```bash
# Abrir administrador de servicios
services.msc
```

Buscar servicios que contengan "Supabase" o "Firebird".

### Comandos Útiles

#### Iniciar un Servicio Específico

```bash
net start SupabaseFirebirdSync-Empresa1
```

#### Detener un Servicio Específico

```bash
net stop SupabaseFirebirdSync-Empresa1
```

#### Reiniciar un Servicio

```bash
net stop SupabaseFirebirdSync-Empresa1 && net start SupabaseFirebirdSync-Empresa1
```

#### Ver Estado de Todos los Servicios

```bash
sc query type= service state= all | findstr /i "supabase firebird"
```

### Desinstalar un Servicio

**Ejecutar como ADMINISTRADOR:**

```bash
cd C:\Services\SyncEmpresa1
node scripts\uninstall-service.js
```

El script te pedirá el nombre del servicio a desinstalar.

---

## 📊 Monitoreo de Múltiples Instancias

### Logs Separados

Cada instancia tiene sus propios logs:

```
C:\Services\SyncEmpresa1\logs\
├── combined.log
└── error.log

C:\Services\SyncEmpresa2\logs\
├── combined.log
└── error.log

C:\Services\SyncEmpresa3\logs\
├── combined.log
└── error.log
```

### Verificar Logs

```bash
# Ver logs de Empresa 1
type C:\Services\SyncEmpresa1\logs\combined.log

# Ver últimas líneas
powershell Get-Content C:\Services\SyncEmpresa1\logs\combined.log -Tail 50
```

---

## ⚠️ Consideraciones Importantes

### 1. Recursos del Sistema

Cada instancia consume:
- **Memoria:** ~50-100 MB por instancia
- **CPU:** Bajo (picos durante sincronización)
- **Disco:** Logs y caché

**Recomendación:** Monitorear recursos si tienes más de 5 instancias.

### 2. Puertos

Si usas la API REST (opcional), cada instancia necesita un puerto diferente:

```env
# Empresa 1
API_PORT=3001

# Empresa 2
API_PORT=3002

# Empresa 3
API_PORT=3003
```

### 3. Bases de Datos Firebird

Asegúrate de que:
- ✅ Cada instancia apunta a una base de datos diferente
- ✅ Las credenciales son correctas
- ✅ El servidor Firebird permite múltiples conexiones

### 4. Configuración en Supabase

Cada `USER_UUID` debe tener:
- ✅ Su propio registro en `invoice_config`
- ✅ Configuración independiente
- ✅ Permisos RLS configurados

---

## 🐛 Solución de Problemas

### Error: "El servicio ya existe"

**Causa:** Ya existe un servicio con ese nombre.

**Solución:**
1. Verificar servicios instalados: `services.msc`
2. Usar un nombre diferente
3. O desinstalar el servicio existente primero

### Error: "No se puede conectar a Firebird"

**Causa:** Credenciales incorrectas o base de datos no accesible.

**Solución:**
1. Verificar que el archivo `.env.encrypted` sea el correcto
2. Verificar conectividad a la base de datos Firebird
3. Revisar logs: `C:\Services\SyncEmpresaX\logs\error.log`

### Error: "No se encuentra configuración en Supabase"

**Causa:** No existe registro en `invoice_config` para ese `USER_UUID`.

**Solución:**
1. Verificar que el `USER_UUID` en `.env` sea correcto
2. Crear registro en Supabase:
   ```sql
   INSERT INTO invoice_config (user_id, ...) VALUES ('uuid-correcto', ...);
   ```

### Servicio no inicia automáticamente

**Solución:**
1. Abrir `services.msc`
2. Buscar el servicio
3. Clic derecho → Propiedades
4. Tipo de inicio: **Automático**
5. Aplicar y reiniciar

---

## 📚 Ejemplos de Configuración

### Ejemplo 1: Tres Empresas en el Mismo Servidor

```
Empresa A → Firebird: 192.168.1.10:3050/empresa_a.fdb
Empresa B → Firebird: 192.168.1.20:3050/empresa_b.fdb
Empresa C → Firebird: 192.168.1.30:3050/empresa_c.fdb

Servicios:
- SupabaseFirebirdSync-EmpresaA
- SupabaseFirebirdSync-EmpresaB
- SupabaseFirebirdSync-EmpresaC
```

### Ejemplo 2: Múltiples Sucursales

```
Sucursal Norte → Firebird: localhost:3050/sucursal_norte.fdb
Sucursal Sur → Firebird: localhost:3050/sucursal_sur.fdb
Sucursal Este → Firebird: localhost:3050/sucursal_este.fdb

Servicios:
- SyncFirebird-Norte
- SyncFirebird-Sur
- SyncFirebird-Este
```

### Ejemplo 3: Ambientes Separados

```
Producción → Firebird: prod-server:3050/prod.fdb
Staging → Firebird: staging-server:3050/staging.fdb
Desarrollo → Firebird: localhost:3050/dev.fdb

Servicios:
- SupabaseFirebirdSync-Prod
- SupabaseFirebirdSync-Staging
- SupabaseFirebirdSync-Dev
```

---

## ✅ Checklist de Instalación Multi-Instancia

Para cada nueva instancia:

- [ ] Crear carpeta independiente en `C:\Services\`
- [ ] Copiar ejecutable y archivos necesarios
- [ ] Crear `.env` con credenciales únicas
- [ ] Encriptar el `.env` → `.env.encrypted`
- [ ] Copiar `.env.encrypted` a la carpeta de la instancia
- [ ] Crear registro en `invoice_config` en Supabase
- [ ] Ejecutar `install-multi-instance.bat` como administrador
- [ ] Ingresar nombre único del servicio
- [ ] Ingresar contraseñas requeridas
- [ ] Verificar que el servicio inicie correctamente
- [ ] Revisar logs para confirmar funcionamiento
- [ ] Configurar inicio automático en `services.msc`

---

## 🔗 Referencias

- [Instalación Normal](INSTALACION_SERVICIO_WINDOWS.md)
- [Configuración Centralizada](CONFIGURACION_CENTRALIZADA.md)
- [Mejoras de Confiabilidad](REALTIME_RELIABILITY_IMPROVEMENTS.md)

---

## 💡 Consejos Finales

1. **Nombres descriptivos:** Usa nombres que identifiquen claramente cada instancia
2. **Documentar:** Mantén un registro de qué servicio corresponde a qué empresa/sucursal
3. **Monitoreo:** Configura alertas para detectar servicios detenidos
4. **Backups:** Respalda los archivos `.env.encrypted` de cada instancia
5. **Actualizaciones:** Al actualizar, hazlo instancia por instancia para minimizar riesgos

---

**¿Necesitas ayuda?** Revisa la documentación completa o contacta al equipo de soporte.


