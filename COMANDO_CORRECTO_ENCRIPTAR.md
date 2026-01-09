# 🔐 COMANDO CORRECTO PARA ENCRIPTAR .env

## ✅ COMANDO CORRECTO

```bash
node scripts/encrypt-env.js
```

## ❌ COMANDO INCORRECTO (NO USAR)

```bash
node src/utils/encryptEnv.js  # ❌ Este archivo NO existe
```

---

## 📝 NOTAS

- El archivo correcto está en: `scripts/encrypt-env.js`
- Este comando solo se ejecuta UNA VEZ cuando:
  - Creas el proyecto por primera vez
  - Cambias las credenciales en el archivo `.env`

---

## 🔄 PROCESO COMPLETO

1. **Editar `.env`** con las credenciales correctas
2. **Ejecutar**: `node scripts/encrypt-env.js`
3. **Ingresar contraseña** cuando se solicite
4. **Verificar** que se creó `.env.encrypted`

---

## 📚 DOCUMENTACIÓN ACTUALIZADA

Todos los documentos han sido actualizados con el comando correcto:

- ✅ `docs/GUIA_COMPILACION_COMPLETA.md`
- ✅ `README.md`
- ✅ `INSTRUCCIONES_RAPIDAS.md`
- ✅ `RESUMEN_FINAL.md`

