# 🔒 VALIDACIÓN DE INTERVALOS DE SINCRONIZACIÓN

## 📋 DESCRIPCIÓN

Este sistema garantiza que los intervalos de sincronización nunca sean menores a 60 segundos, tanto en la base de datos de Supabase como en el servicio de Node.js.

---

## 🎯 CAMPOS VALIDADOS

Los siguientes campos tienen un valor mínimo de **60 segundos**:

- `chart_of_accounts_sync_interval` - Intervalo de sincronización de cuentas contables
- `products_sync_interval` - Intervalo de sincronización de productos
- `third_parties_sync_interval` - Intervalo de sincronización de terceros

---

## 🔧 IMPLEMENTACIÓN

### 1. Validación en Supabase (Base de Datos)

**Ubicación**: Triggers en la tabla `invoice_config`

**Funcionamiento**:
- Se ejecutan automáticamente antes de INSERT y UPDATE
- Si un valor es menor a 60, se ajusta automáticamente a 60
- No genera errores, solo corrige el valor silenciosamente

**Triggers creados**:
```sql
-- Trigger para INSERT
CREATE TRIGGER validate_sync_intervals_insert
  BEFORE INSERT ON invoice_config
  FOR EACH ROW
  EXECUTE FUNCTION validate_sync_intervals();

-- Trigger para UPDATE
CREATE TRIGGER validate_sync_intervals_update
  BEFORE UPDATE ON invoice_config
  FOR EACH ROW
  EXECUTE FUNCTION validate_sync_intervals();
```

**Migración**: `database/migrations/add_sync_intervals_validation.sql`

### 2. Validación en el Servicio (Node.js)

**Ubicación**: `src/services/configService.js`

**Funcionamiento**:
- Se ejecuta cuando se carga la configuración desde Supabase
- Se ejecuta cuando se carga la configuración desde caché local
- Si un valor es menor a 60, se ajusta automáticamente a 60
- Registra un warning en los logs

**Método**: `validateSyncIntervals(config)`

```javascript
validateSyncIntervals(config) {
  const MIN_INTERVAL = 60;
  
  if (config.chart_of_accounts_sync_interval < MIN_INTERVAL) {
    config.chart_of_accounts_sync_interval = MIN_INTERVAL;
  }
  
  if (config.products_sync_interval < MIN_INTERVAL) {
    config.products_sync_interval = MIN_INTERVAL;
  }
  
  if (config.third_parties_sync_interval < MIN_INTERVAL) {
    config.third_parties_sync_interval = MIN_INTERVAL;
  }
  
  return config;
}
```

---

## 📝 EJEMPLOS DE USO

### Ejemplo 1: Actualizar desde Supabase SQL Editor

```sql
-- Intentar establecer un valor menor a 60
UPDATE invoice_config 
SET chart_of_accounts_sync_interval = 30 
WHERE user_id = '9ea5c283-11c8-49c7-8d91-5d63ce25c0f2';

-- Verificar el valor (debería ser 60, no 30)
SELECT chart_of_accounts_sync_interval 
FROM invoice_config 
WHERE user_id = '9ea5c283-11c8-49c7-8d91-5d63ce25c0f2';
-- Resultado: 60
```

### Ejemplo 2: Actualizar desde la API de Supabase

```javascript
// Intentar actualizar con un valor menor a 60
const { data, error } = await supabase
  .from('invoice_config')
  .update({ products_sync_interval: 45 })
  .eq('user_id', userId);

// El valor guardado será 60, no 45
```

### Ejemplo 3: Logs del Servicio

Cuando el servicio detecta un valor menor a 60:

```
⚠️ chart_of_accounts_sync_interval (30) es menor a 60, ajustando a 60
⚠️ products_sync_interval (45) es menor a 60, ajustando a 60
✅ Intervalos de sincronización validados y corregidos
```

---

## 🔍 VERIFICACIÓN

### Verificar Triggers en Supabase

```sql
-- Listar triggers de la tabla invoice_config
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'invoice_config'
ORDER BY trigger_name;
```

### Verificar Validación en el Servicio

1. Modificar un intervalo en Supabase con un valor menor a 60
2. Reiniciar el servicio
3. Revisar los logs en `C:\Services\SyncFirebird\logs\`
4. Buscar mensajes de warning sobre intervalos corregidos

---

## 🎯 VENTAJAS

1. **Protección Doble**: Validación tanto en BD como en el servicio
2. **Sin Errores**: No genera errores, solo corrige automáticamente
3. **Transparente**: Registra warnings en los logs para debugging
4. **Consistente**: Garantiza que los intervalos siempre sean >= 60 segundos
5. **Automático**: No requiere intervención manual

---

## 📚 ARCHIVOS RELACIONADOS

- `database/migrations/add_sync_intervals_validation.sql` - Migración de triggers
- `src/services/configService.js` - Validación en el servicio
- `docs/CONFIGURACION_CENTRALIZADA.md` - Documentación de configuración

---

## 🔄 FLUJO DE VALIDACIÓN

```
Usuario actualiza intervalo en Supabase
         ↓
Trigger valida y corrige (si < 60)
         ↓
Valor guardado en BD (>= 60)
         ↓
Servicio carga configuración
         ↓
Servicio valida y corrige (si < 60)
         ↓
Configuración en memoria (>= 60)
         ↓
Sincronización ejecutada con intervalo válido
```

---

## ⚠️ NOTAS IMPORTANTES

1. **Valor Mínimo**: 60 segundos (1 minuto)
2. **Sin Máximo**: No hay límite superior para los intervalos
3. **Valores NULL**: Los valores NULL no se validan (se usan defaults)
4. **Retroactivo**: Los triggers NO corrigen valores existentes automáticamente
5. **Manual**: Para corregir valores existentes, ejecutar un UPDATE

---

## 🛠️ CORRECCIÓN DE VALORES EXISTENTES

Si hay valores menores a 60 en la base de datos:

```sql
-- Corregir todos los intervalos menores a 60
UPDATE invoice_config
SET 
  chart_of_accounts_sync_interval = GREATEST(chart_of_accounts_sync_interval, 60),
  products_sync_interval = GREATEST(products_sync_interval, 60),
  third_parties_sync_interval = GREATEST(third_parties_sync_interval, 60)
WHERE 
  chart_of_accounts_sync_interval < 60 
  OR products_sync_interval < 60 
  OR third_parties_sync_interval < 60;
```

