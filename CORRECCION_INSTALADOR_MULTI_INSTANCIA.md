# 🔧 CORRECCIÓN CRÍTICA: INSTALADOR MULTI-INSTANCIA

## ❌ PROBLEMA DETECTADO

**Descripción:** El instalador Inno Setup instalaba TODAS las instancias en el mismo directorio (`C:\Services\SyncFirebird`), causando que:

1. ❌ Cada nueva instalación sobrescribía los archivos de la anterior
2. ❌ El archivo `.env.encrypted` se reemplazaba, rompiendo servicios anteriores
3. ❌ No se podía cambiar el directorio de instalación
4. ❌ Múltiples servicios no podían coexistir

**Impacto:** CRÍTICO - Imposibilita la instalación de múltiples instancias del servicio.

---

## ✅ SOLUCIÓN IMPLEMENTADA

### Cambios Realizados en `installer/setup.iss`

#### 1. Directorio Dinámico Basado en Nombre del Servicio

**ANTES (línea 28):**
```pascal
DefaultDirName=C:\Services\SyncFirebird
```

**DESPUÉS (líneas 28-34):**
```pascal
; NOTA: El directorio se establece dinámicamente en GetDefaultDirName()
DefaultDirName={code:GetDefaultDirName}
DefaultGroupName=Sincronización Firebird
AllowNoIcons=yes
; Permitir que el usuario cambie el directorio
DisableDirPage=no
UsePreviousAppDir=no
```

**Cambios:**
- ✅ `DefaultDirName` ahora usa una función dinámica
- ✅ `DisableDirPage=no` permite al usuario cambiar el directorio
- ✅ `UsePreviousAppDir=no` evita reutilizar directorios anteriores

---

#### 2. Función `GetDefaultDirName()` (líneas 93-110)

```pascal
function GetDefaultDirName(Param: String): String;
var
  ServiceName: String;
begin
  // Si ya se ingresó el nombre del servicio, usarlo para el directorio
  if ServiceNamePage <> nil then
  begin
    ServiceName := ServiceNamePage.Values[0];
    if ServiceName <> '' then
      Result := 'C:\Services\' + ServiceName
    else
      Result := 'C:\Services\SupabaseFirebirdSync';
  end
  else
  begin
    // Valor por defecto antes de que se cree la página
    Result := 'C:\Services\SupabaseFirebirdSync';
  end;
end;
```

**Funcionalidad:**
- ✅ Genera el directorio basado en el nombre del servicio
- ✅ Usa valor por defecto si no hay nombre aún
- ✅ Cada servicio tiene su propio directorio único

---

#### 3. Actualización Automática del Directorio (línea 211)

**Agregado en `NextButtonClick()`:**
```pascal
// Actualizar el directorio de instalación basado en el nombre del servicio
WizardForm.DirEdit.Text := 'C:\Services\' + ServiceName;
```

**Funcionalidad:**
- ✅ Cuando el usuario ingresa el nombre del servicio, el directorio se actualiza automáticamente
- ✅ El usuario ve el directorio correcto en la siguiente página
- ✅ Puede modificarlo si lo desea

---

## 🎯 RESULTADO

### Comportamiento Anterior (INCORRECTO)
```
Instalación 1: C:\Services\SyncFirebird  ← .env.encrypted para servicio 1
Instalación 2: C:\Services\SyncFirebird  ← SOBRESCRIBE .env.encrypted ❌
Instalación 3: C:\Services\SyncFirebird  ← SOBRESCRIBE .env.encrypted ❌
```

### Comportamiento Nuevo (CORRECTO)
```
Instalación 1 (Servicio: ClienteA):     C:\Services\ClienteA     ← .env.encrypted único ✅
Instalación 2 (Servicio: ClienteB):     C:\Services\ClienteB     ← .env.encrypted único ✅
Instalación 3 (Servicio: Sucursal01):   C:\Services\Sucursal01   ← .env.encrypted único ✅
```

---

## 📋 EJEMPLO DE USO

### Instalación de Múltiples Instancias

**Instalación 1:**
1. Ejecutar `InstaladorSyncFirebird-v1.0.0.exe`
2. Ingresar nombre del servicio: `ClienteA`
3. Directorio sugerido: `C:\Services\ClienteA` ✅
4. Continuar con la instalación

**Instalación 2:**
1. Ejecutar `InstaladorSyncFirebird-v1.0.0.exe` (mismo instalador)
2. Ingresar nombre del servicio: `ClienteB`
3. Directorio sugerido: `C:\Services\ClienteB` ✅
4. Continuar con la instalación

**Resultado:**
```
C:\Services\
├── ClienteA\
│   ├── supabase-firebird-sync.exe
│   ├── .env.encrypted  ← Configuración de ClienteA
│   └── logs\
└── ClienteB\
    ├── supabase-firebird-sync.exe
    ├── .env.encrypted  ← Configuración de ClienteB
    └── logs\
```

---

## ✅ VERIFICACIÓN

### Checklist de Corrección

- ✅ Cada instalación crea un directorio único
- ✅ El directorio se basa en el nombre del servicio
- ✅ El usuario puede cambiar el directorio si lo desea
- ✅ No se sobrescriben archivos `.env.encrypted` de otras instalaciones
- ✅ Múltiples servicios pueden coexistir sin conflictos

---

## 🚀 PRÓXIMOS PASOS

1. **Recompilar el instalador:**
   ```bash
   powershell -ExecutionPolicy Bypass -File scripts/build-all.ps1
   ```

2. **Probar instalación múltiple:**
   - Instalar con nombre `Test1`
   - Verificar directorio: `C:\Services\Test1`
   - Instalar con nombre `Test2`
   - Verificar directorio: `C:\Services\Test2`
   - Confirmar que ambos servicios funcionan independientemente

3. **Distribuir nuevo instalador:**
   - Archivo: `installer/Output/InstaladorSyncFirebird-v1.0.0.exe`
   - Versión: 1.0.0 (con corrección multi-instancia)

---

## 📝 NOTAS TÉCNICAS

### Archivos Modificados
- `installer/setup.iss` (líneas 28-34, 93-110, 211)

### Funciones Agregadas
- `GetDefaultDirName()` - Genera directorio dinámico

### Configuraciones Cambiadas
- `DefaultDirName` - Ahora dinámico
- `DisableDirPage` - Ahora `no` (permite cambiar directorio)
- `UsePreviousAppDir` - Ahora `no` (no reutiliza directorios)

---

**Fecha de corrección:** 2026-01-29  
**Versión del instalador:** 1.0.0 (pendiente recompilación)  
**Estado:** ✅ CORREGIDO - Pendiente de compilación y pruebas

