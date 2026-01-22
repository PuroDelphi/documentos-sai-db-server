# 📋 INSTRUCCIONES DE COMPILACIÓN Y DISTRIBUCIÓN

## ✅ Cambios Completados

Todos los cambios necesarios para solucionar el Error 1053 han sido implementados:

1. ✅ Código del servicio mejorado con reintentos y modo degradado
2. ✅ Instalador actualizado para configurar variables de entorno por servicio
3. ✅ Documentación completa creada
4. ✅ Scripts de diagnóstico y herramientas

## 🔧 Pasos para Compilar y Distribuir

### Paso 1: Compilar el Instalador

Necesitas tener **Inno Setup 6** instalado. Si no lo tienes, descárgalo de:
https://jrsoftware.org/isdl.php

**Opción A: Desde Inno Setup Compiler (GUI)**
1. Abre Inno Setup Compiler
2. File > Open > Selecciona `installer/setup.iss`
3. Build > Compile (o presiona F9)
4. El instalador se generará en `installer/Output/InstaladorSyncFirebird-v1.0.0.exe`

**Opción B: Desde la línea de comandos**
```bash
# Si Inno Setup está en el PATH
iscc installer\setup.iss

# Si no está en el PATH, usa la ruta completa
"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer\setup.iss
```

### Paso 2: Verificar que el Instalador se Compiló Correctamente

Deberías ver el archivo:
```
installer/Output/InstaladorSyncFirebird-v1.0.0.exe
```

Tamaño aproximado: ~15-20 MB

### Paso 3: Probar el Instalador Localmente

**IMPORTANTE**: Antes de distribuir, prueba el instalador en tu máquina.

1. **Desinstala cualquier servicio existente** (si lo tienes):
   ```powershell
   # Ver servicios instalados
   Get-Service | Where-Object {$_.Name -like "*Supabase*"}
   
   # Detener y eliminar
   sc stop SupabaseFirebirdSyncPruebas
   sc delete SupabaseFirebirdSyncPruebas
   ```

2. **Ejecuta el instalador como Administrador**:
   - Clic derecho en `InstaladorSyncFirebird-v1.0.0.exe`
   - "Ejecutar como administrador"

3. **Completa el wizard**:
   - Nombre del servicio: `SupabaseFirebirdSyncPrueba`
   - Contraseña: `12345678` (o la que uses)
   - Contraseña del caché: `12345678` (la misma)

4. **Verifica que el servicio se instaló**:
   ```powershell
   # Ver el servicio
   Get-Service -Name SupabaseFirebirdSyncPrueba
   
   # Ver las variables de entorno del servicio
   Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\SupabaseFirebirdSyncPrueba" -Name "Environment"
   
   # Ver los logs
   Get-Content "C:\Services\SyncFirebird\logs\combined.log" -Tail 50
   ```

5. **Verifica que el servicio está funcionando**:
   ```powershell
   # Estado del servicio
   Get-Service -Name SupabaseFirebirdSyncPrueba
   
   # Debería mostrar: Status = Running
   ```

### Paso 4: Probar Múltiples Servicios (Opcional pero Recomendado)

Para verificar que no hay conflictos entre servicios:

1. **Instala un segundo servicio**:
   - Ejecuta el instalador nuevamente
   - Nombre del servicio: `SupabaseFirebirdSyncPrueba2`
   - Contraseña: `87654321` (diferente)

2. **Verifica que ambos servicios funcionan**:
   ```powershell
   Get-Service -Name SupabaseFirebirdSyncPrueba
   Get-Service -Name SupabaseFirebirdSyncPrueba2
   
   # Ambos deberían estar en Running
   ```

3. **Verifica que tienen variables diferentes**:
   ```powershell
   Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\SupabaseFirebirdSyncPrueba" -Name "Environment"
   Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\SupabaseFirebirdSyncPrueba2" -Name "Environment"
   
   # Deberían mostrar contraseñas diferentes
   ```

### Paso 5: Preparar el Paquete de Distribución

Crea una carpeta con todo lo necesario para los implementadores:

```
DistribucionSyncFirebird/
├── InstaladorSyncFirebird-v1.0.0.exe
├── docs/
│   ├── GUIA_INSTALACION_IMPLEMENTADORES.md
│   ├── REFERENCIA_RAPIDA_INSTALACION.md
│   └── FAQ_IMPLEMENTADORES.md
└── README.txt
```

**Contenido de README.txt**:
```
SERVICIO DE SINCRONIZACIÓN FIREBIRD
===================================

INSTALACIÓN:
1. Ejecutar InstaladorSyncFirebird-v1.0.0.exe como Administrador
2. Seguir el asistente de instalación
3. Ingresar la contraseña proporcionada por el administrador

DOCUMENTACIÓN:
- GUIA_INSTALACION_IMPLEMENTADORES.md: Guía completa paso a paso
- REFERENCIA_RAPIDA_INSTALACION.md: Referencia rápida
- FAQ_IMPLEMENTADORES.md: Preguntas frecuentes

SOPORTE:
- Email: soporte@tu-empresa.com
- Teléfono: +XX XXX XXX XXXX
```

### Paso 6: Distribuir

Opciones de distribución:

**Opción A: Compartir por red**
- Copia la carpeta `DistribucionSyncFirebird` a una ubicación de red compartida
- Envía el enlace a los implementadores

**Opción B: Crear un archivo ZIP**
```bash
# Comprimir la carpeta
Compress-Archive -Path DistribucionSyncFirebird -DestinationPath DistribucionSyncFirebird.zip
```

**Opción C: Subir a la nube**
- Sube el instalador a Google Drive, Dropbox, OneDrive, etc.
- Comparte el enlace con los implementadores

## 📋 Checklist Final

Antes de distribuir, verifica:

- [ ] El instalador compila sin errores
- [ ] El instalador se ejecuta correctamente
- [ ] El servicio se instala correctamente
- [ ] El servicio se inicia automáticamente
- [ ] Las variables de entorno están configuradas en el registro del servicio
- [ ] El servicio puede leer las variables de entorno
- [ ] Los logs muestran que el servicio está funcionando
- [ ] Se pueden instalar múltiples servicios sin conflictos
- [ ] La documentación está incluida en el paquete
- [ ] El README.txt tiene la información de contacto correcta

## 🎉 ¡Listo para Distribuir!

Una vez completados todos los pasos, el instalador está listo para ser distribuido a los implementadores.

Los implementadores solo necesitan:
1. Ejecutar el instalador como Administrador
2. Ingresar el nombre del servicio
3. Ingresar la contraseña
4. ¡Listo!

El servicio se instalará, configurará y iniciará automáticamente.

