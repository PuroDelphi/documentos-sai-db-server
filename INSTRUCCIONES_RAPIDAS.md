# ⚡ INSTRUCCIONES RÁPIDAS

## 🔐 ENCRIPTAR .env (SOLO UNA VEZ)

**Cuándo**: Solo cuando creas el proyecto o cambias credenciales.

```bash
node scripts/encrypt-env.js
```

Esto genera `.env.encrypted` que se incluye en el instalador.

---

## 📦 COMPILAR INSTALADOR

### Opción 1: Todo en Uno (Recomendado)

```powershell
.\scripts\build-all.ps1
```

Compila:
- Ejecutable: `dist/supabase-firebird-sync.exe`
- Instalador: `installer/Output/InstaladorSyncFirebird-v1.0.0.exe`

### Opción 2: Paso a Paso

```bash
# 1. Compilar ejecutable
npm run build:legacy

# 2. Compilar instalador
.\scripts\build-installer.ps1
```

---

## 🧹 ELIMINAR SERVICIOS ANTIGUOS

```powershell
# Ejecutar como Administrador
.\scripts\remove-all-services.ps1
```

Elimina TODOS los servicios relacionados con SupabaseFirebird/SyncFirebird.

---

## 📋 CHECKLIST ANTES DE DISTRIBUIR

- [ ] `.env.encrypted` está actualizado
- [ ] Ejecutable compilado: `dist/supabase-firebird-sync.exe`
- [ ] Instalador compilado: `installer/Output/InstaladorSyncFirebird-v1.0.0.exe`
- [ ] Probado en entorno limpio
- [ ] Documentación actualizada

---

## 🚀 DISTRIBUIR

Entregar a los implementadores:

```
installer\Output\InstaladorSyncFirebird-v1.0.0.exe
```

Junto con las contraseñas:
- `ENV_PASSWORD`
- `CONFIG_CACHE_PASSWORD`

---

## 📚 DOCUMENTACIÓN COMPLETA

- **Compilación**: `docs/GUIA_COMPILACION_COMPLETA.md`
- **Instalación**: `docs/GUIA_INSTALACION_IMPLEMENTADORES.md`
- **Referencia**: `docs/REFERENCIA_RAPIDA_INSTALACION.md`
- **FAQ**: `docs/FAQ_IMPLEMENTADORES.md`

