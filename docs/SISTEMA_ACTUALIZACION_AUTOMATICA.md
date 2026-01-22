# 🔄 SISTEMA DE ACTUALIZACIÓN AUTOMÁTICA Y TRANSPARENTE

## 📋 Análisis de Arquitectura Actual

Tu servicio tiene:
- ✅ Ejecutable compilado con PKG (`supabase-firebird-sync.exe`)
- ✅ Instalador con Inno Setup
- ✅ Configuración centralizada en Supabase
- ✅ Sistema de caché local encriptado
- ✅ Servicio de Windows con NSSM
- ✅ Versión actual: 1.0.0 (en `package.json`)

---

## 🎯 ESTRATEGIA RECOMENDADA: Sistema de Actualización en 3 Capas

### **CAPA 1: Verificación de Versiones (Supabase)**
### **CAPA 2: Descarga Automática**
### **CAPA 3: Instalación Transparente**

---

## 🏗️ ARQUITECTURA PROPUESTA

### 1️⃣ **Tabla de Versiones en Supabase**

```sql
CREATE TABLE public.app_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version VARCHAR(20) NOT NULL,
  release_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  download_url TEXT NOT NULL,
  checksum_sha256 VARCHAR(64) NOT NULL,
  is_critical BOOLEAN DEFAULT FALSE,
  min_version_required VARCHAR(20),
  changelog TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsqueda rápida
CREATE INDEX idx_app_versions_active ON public.app_versions(is_active, version DESC);
```

**Campos importantes:**
- `version`: Versión del ejecutable (ej: "1.0.1")
- `download_url`: URL de descarga del instalador
- `checksum_sha256`: Hash SHA256 para verificar integridad
- `is_critical`: Si es true, fuerza actualización inmediata
- `min_version_required`: Versión mínima compatible (para rollback)

---

### 2️⃣ **Configuración de Actualización por Usuario**

```sql
CREATE TABLE public.user_update_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  auto_update_enabled BOOLEAN DEFAULT TRUE,
  update_check_interval INTEGER DEFAULT 3600, -- segundos
  maintenance_window_start TIME DEFAULT '02:00:00',
  maintenance_window_end TIME DEFAULT '04:00:00',
  allow_beta_versions BOOLEAN DEFAULT FALSE,
  last_update_check TIMESTAMP WITH TIME ZONE,
  current_version VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Permite configurar:**
- Activar/desactivar actualizaciones automáticas
- Intervalo de verificación (por defecto cada hora)
- Ventana de mantenimiento (horario permitido para actualizar)
- Versiones beta o solo estables

---

### 3️⃣ **Servicio de Verificación de Actualizaciones**

**Archivo:** `src/services/updateService.js`

```javascript
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class UpdateService {
  constructor(supabaseClient, currentVersion) {
    this.supabaseClient = supabaseClient;
    this.currentVersion = currentVersion; // Desde package.json
    this.updateCheckInterval = null;
  }

  /**
   * Inicia el servicio de verificación de actualizaciones
   */
  async start() {
    // Obtener configuración del usuario
    const settings = await this.getUserUpdateSettings();
    
    if (!settings.auto_update_enabled) {
      logger.info('Actualizaciones automáticas desactivadas');
      return;
    }

    // Verificar inmediatamente al iniciar
    await this.checkForUpdates();

    // Programar verificaciones periódicas
    this.updateCheckInterval = setInterval(
      () => this.checkForUpdates(),
      settings.update_check_interval * 1000
    );
  }

  /**
   * Verifica si hay actualizaciones disponibles
   */
  async checkForUpdates() {
    try {
      const { data, error } = await this.supabaseClient.client
        .from('app_versions')
        .select('*')
        .eq('is_active', true)
        .order('version', { ascending: false })
        .limit(1);

      if (error || !data || data.length === 0) {
        return null;
      }

      const latestVersion = data[0];

      // Comparar versiones
      if (this.isNewerVersion(latestVersion.version, this.currentVersion)) {
        logger.info(`Nueva versión disponible: ${latestVersion.version}`);
        
        // Verificar si estamos en ventana de mantenimiento
        if (await this.isInMaintenanceWindow()) {
          await this.downloadAndInstallUpdate(latestVersion);
        } else if (latestVersion.is_critical) {
          // Si es crítica, actualizar inmediatamente
          logger.warn('Actualización crítica detectada, instalando inmediatamente');
          await this.downloadAndInstallUpdate(latestVersion);
        } else {
          logger.info('Actualización programada para ventana de mantenimiento');
        }
      }
    } catch (error) {
      logger.error('Error verificando actualizaciones:', error);
    }
  }

  /**
   * Descarga e instala la actualización
   */
  async downloadAndInstallUpdate(versionInfo) {
    try {
      logger.info(`Descargando versión ${versionInfo.version}...`);

      // 1. Descargar el instalador
      const installerPath = await this.downloadInstaller(versionInfo.download_url);

      // 2. Verificar checksum
      const isValid = await this.verifyChecksum(installerPath, versionInfo.checksum_sha256);
      if (!isValid) {
        throw new Error('Checksum inválido, actualización abortada');
      }

      // 3. Crear backup del ejecutable actual
      await this.createBackup();

      // 4. Detener el servicio
      logger.info('Deteniendo servicio para actualización...');
      await execPromise('net stop "Supabase-Firebird Sync"');

      // 5. Ejecutar instalador en modo silencioso
      logger.info('Instalando actualización...');
      await execPromise(`"${installerPath}" /VERYSILENT /NORESTART /SUPPRESSMSGBOXES`);

      // 6. Esperar a que termine la instalación
      await this.sleep(10000);

      // 7. Reiniciar el servicio
      logger.info('Reiniciando servicio...');
      await execPromise('net start "Supabase-Firebird Sync"');

      logger.info(`✅ Actualización a versión ${versionInfo.version} completada`);

      // 8. Limpiar archivos temporales
      await fs.unlink(installerPath);

    } catch (error) {
      logger.error('Error durante la actualización:', error);
      
      // Intentar rollback
      await this.rollback();
    }
  }

  /**
   * Descarga el instalador
   */
  async downloadInstaller(url) {
    const tempDir = path.join(process.env.TEMP || 'C:\\Temp', 'supabase-updates');
    await fs.mkdir(tempDir, { recursive: true });

    const installerPath = path.join(tempDir, `installer-${Date.now()}.exe`);
    const writer = fs.createWriteStream(installerPath);

    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream'
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(installerPath));
      writer.on('error', reject);
    });
  }

  /**
   * Verifica el checksum SHA256
   */
  async verifyChecksum(filePath, expectedChecksum) {
    const fileBuffer = await fs.readFile(filePath);
    const hash = crypto.createHash('sha256');
    hash.update(fileBuffer);
    const actualChecksum = hash.digest('hex');

    return actualChecksum === expectedChecksum;
  }

  // ... más métodos
}
```

---

## 📦 OPCIONES DE HOSTING PARA INSTALADORES

### **OPCIÓN 1: GitHub Releases (RECOMENDADO)**

**Ventajas:**
- ✅ Gratis
- ✅ CDN global
- ✅ Versionamiento automático
- ✅ Checksums automáticos
- ✅ Changelog integrado

**Cómo usarlo:**
1. Crear release en GitHub
2. Subir instalador como asset
3. URL: `https://github.com/usuario/repo/releases/download/v1.0.1/installer.exe`

### **OPCIÓN 2: Supabase Storage**

**Ventajas:**
- ✅ Ya tienes Supabase
- ✅ Control total
- ✅ Políticas de acceso RLS

**Cómo usarlo:**
```javascript
// Subir instalador
const { data, error } = await supabase.storage
  .from('app-updates')
  .upload(`v1.0.1/installer.exe`, file);

// Obtener URL pública
const { data: { publicUrl } } = supabase.storage
  .from('app-updates')
  .getPublicUrl(`v1.0.1/installer.exe`);
```

### **OPCIÓN 3: CDN Propio**
- Cloudflare R2
- AWS S3 + CloudFront
- Azure Blob Storage

---

## ⚡ VENTAJAS DE ESTE SISTEMA

1. ✅ **Transparente**: Usuario no interviene
2. ✅ **Seguro**: Checksums + HTTPS + Firma digital
3. ✅ **Configurable**: Ventanas de mantenimiento
4. ✅ **Rollback**: Backup automático
5. ✅ **Centralizado**: Control desde Supabase
6. ✅ **Multi-tenant**: Configuración por usuario
7. ✅ **Auditable**: Logs de todas las actualizaciones

---

## 🚨 RECOMENDACIONES FINALES

1. **Empezar Simple**: Implementa verificación de versiones primero
2. **Probar Exhaustivamente**: En ambiente de desarrollo
3. **Rollout Gradual**: Actualiza 10% de usuarios primero
4. **Monitoreo**: Logs detallados de cada actualización
5. **Plan B**: Siempre tener rollback automático
6. **Comunicación**: Notificar a usuarios sobre actualizaciones críticas

---

¿Te gustaría que profundice en alguna de estas estrategias o que te ayude a implementar alguna en específico?

