# 🔧 Troubleshooting: Supabase Realtime

## Problema: Las facturas no se sincronizan automáticamente al cambiar a estado APROBADO

Si las facturas no se procesan inmediatamente cuando cambias su estado a `APROBADO` en Supabase, sigue estos pasos:

---

## ✅ Paso 1: Verificar que Supabase Realtime esté habilitado

### En el Dashboard de Supabase:

1. Ve a tu proyecto en [https://app.supabase.com](https://app.supabase.com)
2. Navega a **Database** → **Replication**
3. Busca la tabla `invoices`
4. Asegúrate de que **Realtime** esté **HABILITADO** (toggle en verde)

Si no está habilitado:
- Haz clic en el toggle para habilitarlo
- Espera unos segundos a que se aplique el cambio
- Reinicia el servicio de sincronización

---

## ✅ Paso 2: Verificar la conexión del WebSocket

Ejecuta el script de prueba:

```bash
npm run test-realtime
```

Este script:
1. Se conecta al canal de Realtime
2. Espera 30 segundos detectando cambios
3. Te indica si la conexión está funcionando

**Durante la prueba:**
- Cambia el estado de una factura a `APROBADO` en Supabase
- Deberías ver un mensaje `🎉 ¡CAMBIO DETECTADO EN TIEMPO REAL!`

---

## ✅ Paso 3: Verificar los logs del servicio

Cuando el servicio inicia, deberías ver:

```
✅ Listener de Supabase Realtime SUSCRITO exitosamente
```

Si ves alguno de estos mensajes de error:
- `❌ Error en el canal de Supabase Realtime`
- `❌ Timeout en la suscripción de Supabase Realtime`
- `⚠️ Canal de Supabase Realtime cerrado`

Entonces hay un problema con la conexión.

---

## ✅ Paso 4: Verificar el filtro de usuario

El listener solo detecta cambios en facturas del usuario configurado en `.env`:

```env
USER_UUID=tu-uuid-aqui
```

Asegúrate de que:
1. El `USER_UUID` en `.env` sea correcto
2. Las facturas que estás aprobando tengan el mismo `user_id`

---

## ✅ Paso 5: Verificar políticas RLS (Row Level Security)

En Supabase, ve a **Authentication** → **Policies** y verifica que:

1. La tabla `invoices` tenga políticas que permitan:
   - **SELECT** para el usuario anónimo (anon key)
   - **UPDATE** para el usuario anónimo (anon key)

2. Las políticas deben filtrar por `user_id`:
   ```sql
   user_id = auth.uid() OR user_id = current_setting('request.jwt.claims')::json->>'user_id'
   ```

---

## ✅ Paso 6: Verificar firewall/proxy

Si estás detrás de un firewall o proxy corporativo:

1. Verifica que los **WebSockets** estén permitidos
2. Supabase Realtime usa el protocolo `wss://` (WebSocket Secure)
3. Puerto: **443** (HTTPS/WSS)

---

## ✅ Paso 7: Reiniciar el servicio

Después de hacer cambios:

1. Detén el servicio (Ctrl+C)
2. Reinicia con:
   ```bash
   npm start
   ```

3. Verifica los logs de inicio:
   ```
   Servicio de sincronización iniciado y escuchando cambios...
   ✅ Listener de Supabase Realtime SUSCRITO exitosamente
   ```

---

## 🔍 Diagnóstico Avanzado

### Ver estado del canal en tiempo real

Agrega este código temporal en `src/database/supabaseClient.js`:

```javascript
// Después de .subscribe()
channel.on('system', {}, (payload) => {
  logger.debug('Estado del canal:', payload);
});
```

### Verificar eventos recibidos

```javascript
// En el callback del listener
logger.debug('Evento recibido:', {
  event: payload.eventType,
  table: payload.table,
  new: payload.new,
  old: payload.old
});
```

---

## 📞 Soporte

Si después de seguir todos estos pasos el problema persiste:

1. Revisa los logs completos del servicio
2. Verifica la consola del navegador en Supabase Dashboard
3. Contacta al soporte de Supabase si es un problema de su infraestructura

---

## 🎯 Solución Temporal: Recuperación Automática

Mientras resuelves el problema de Realtime, el servicio tiene un mecanismo de recuperación:

```env
ENABLE_INVOICE_RECOVERY=true
RECOVERY_BATCH_SIZE=10
```

Esto procesará facturas pendientes cada cierto tiempo, aunque no sea en tiempo real.

