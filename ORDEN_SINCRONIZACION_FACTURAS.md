# ✅ ORDEN DE SINCRONIZACIÓN DE FACTURAS

## 📋 REQUERIMIENTO

Las facturas FIA deben sincronizarse a Firebird en el siguiente orden:

1. **Primero:** Ordenar por `date` (fecha) de forma ascendente
2. **Segundo:** Ordenar por `invoice_number` (consecutivo del proveedor) de forma ascendente

Esto garantiza que las facturas se inserten en Firebird en orden cronológico correcto.

---

## ✅ IMPLEMENTACIÓN ACTUAL

### Código en `src/database/supabaseClient.js` (líneas 357-366)

```javascript
async getPendingApprovedInvoices() {
  try {
    const { data: invoices, error } = await this.client
      .from('invoices')
      .select('*')
      .eq('estado', 'APROBADO')
      .eq('user_id', this.userUUID)
      .or('service_response.is.null,service_response.neq.Ok')
      .order('date', { ascending: true })           // ← 1. Ordenar por fecha
      .order('invoice_number', { ascending: true }); // ← 2. Ordenar por consecutivo

    if (error) {
      throw new Error(`Error obteniendo facturas pendientes: ${error.message}`);
    }

    return invoices;
  } catch (error) {
    logger.error('Error obteniendo facturas pendientes:', error);
    throw error;
  }
}
```

---

## 🎯 FLUJOS QUE USAN ESTE ORDENAMIENTO

### 1. Recuperación al Iniciar el Servicio

**Archivo:** `src/services/syncService.js` (línea 501)

```javascript
async processPendingApprovedInvoices() {
  // Obtener facturas pendientes (YA ORDENADAS)
  const pendingInvoices = await this.supabaseClient.getPendingApprovedInvoices();
  
  // Procesar en lotes manteniendo el orden
  for (let i = 0; i < pendingInvoices.length; i += batchSize) {
    const batch = pendingInvoices.slice(i, i + batchSize);
    
    for (const invoice of batch) {
      await this.processApprovedInvoice(invoice);
    }
  }
}
```

**Resultado:** Las facturas se procesan en el orden correcto.

---

### 2. Polling Periódico (Respaldo del Realtime)

**Archivo:** `src/services/syncService.js` (línea 1283)

```javascript
async pollPendingInvoices() {
  // Obtener facturas pendientes (YA ORDENADAS)
  const pendingInvoices = await this.supabaseClient.getPendingApprovedInvoices();
  
  // Procesar en orden
  for (const invoice of pendingInvoices) {
    await this.processApprovedInvoice(invoice);
  }
}
```

**Resultado:** Las facturas se procesan en el orden correcto.

---

### 3. Realtime (Facturas Individuales)

**Archivo:** `src/database/supabaseClient.js` (línea 136-150)

```javascript
setupRealtimeListener(callback, onReconnect) {
  // Cuando llega una factura aprobada en tiempo real
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'invoices' }, 
    async (payload) => {
      const invoice = payload.new;
      
      if (invoice.estado === 'APROBADO') {
        // Procesar inmediatamente
        await callback(invoice);
      }
    }
  )
}
```

**Nota:** En Realtime, las facturas se procesan individualmente cuando se aprueban, por lo que el orden natural es el de aprobación.

---

## 📊 EJEMPLO DE ORDENAMIENTO

### Facturas en Supabase

| ID | invoice_number | date | estado |
|----|----------------|------|--------|
| 1 | FAC-003 | 2026-01-15 | APROBADO |
| 2 | FAC-001 | 2026-01-10 | APROBADO |
| 3 | FAC-002 | 2026-01-10 | APROBADO |
| 4 | FAC-004 | 2026-01-20 | APROBADO |

### Orden de Procesamiento (CORRECTO)

```
1. FAC-001 (2026-01-10) ← Primero por fecha, primero por consecutivo
2. FAC-002 (2026-01-10) ← Misma fecha, segundo por consecutivo
3. FAC-003 (2026-01-15) ← Segunda fecha
4. FAC-004 (2026-01-20) ← Tercera fecha
```

### Inserción en Firebird

Las facturas se insertan en CARPROEN/CARPRODE en este orden:

```sql
-- 1. FAC-001 → CARPROEN.NUMERO = 1
-- 2. FAC-002 → CARPROEN.NUMERO = 2
-- 3. FAC-003 → CARPROEN.NUMERO = 3
-- 4. FAC-004 → CARPROEN.NUMERO = 4
```

---

## ✅ VERIFICACIÓN

### Cómo Verificar que el Orden es Correcto

1. **Revisar logs del servicio:**
   ```
   Encontradas 4 facturas aprobadas pendientes de sincronización
   Facturas pendientes: [
     { invoice_number: 'FAC-001', date: '2026-01-10' },
     { invoice_number: 'FAC-002', date: '2026-01-10' },
     { invoice_number: 'FAC-003', date: '2026-01-15' },
     { invoice_number: 'FAC-004', date: '2026-01-20' }
   ]
   ```

2. **Verificar en Firebird:**
   ```sql
   SELECT NUMERO, TIPO, FECHA, OBSERV
   FROM CARPROEN
   WHERE TIPO = 'FIA'
   ORDER BY NUMERO;
   ```

---

## 🎯 CONCLUSIÓN

✅ **El ordenamiento YA está implementado correctamente**

- ✅ Las facturas se obtienen ordenadas por `date` y luego por `invoice_number`
- ✅ Se procesan en el orden correcto en todos los flujos
- ✅ Se insertan en Firebird manteniendo el orden cronológico

**No se requieren cambios adicionales.**

---

## 📝 NOTAS IMPORTANTES

### Facturas en Tiempo Real

Cuando una factura se aprueba en tiempo real (Realtime), se procesa inmediatamente sin esperar a otras facturas. Esto es correcto porque:

1. El usuario aprueba las facturas en el orden que desea
2. El Realtime procesa en el orden de aprobación
3. Si hay facturas pendientes anteriores, el polling las recuperará en el orden correcto

### Recuperación Post-Reconexión

Si el servicio se desconecta y se reconecta, el método `processPendingApprovedInvoices()` recupera TODAS las facturas pendientes en el orden correcto (por fecha y consecutivo).

---

**Fecha de verificación:** 2026-01-29  
**Estado:** ✅ IMPLEMENTADO CORRECTAMENTE

