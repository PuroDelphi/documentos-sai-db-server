# Sincronización de Inventario con Product_ID

## 📋 Descripción

Este documento explica cómo funciona la sincronización de inventario (EA/OC) usando `product_id` amarrado a `invoice_products`.

## 🎯 Objetivo

Para las facturas tipo "inventario" (EA - Entradas de Almacén, OC - Órdenes de Compra), el sistema necesita el código exacto del producto (`item_code`) que existe en Firebird para poder insertar correctamente en las tablas `IPDET` e `ITEMACT`.

## 🔄 Flujo de Datos

### Antes (Facturas de Servicio/Libre)
```
invoice_items.description = "CODIGO - Descripción"
                             ↓
                    extractProductCode()
                             ↓
                    IPDET.ITEM = "CODIGO"
```

### Ahora (Facturas de Inventario EA/OC)
```
invoice_items.product_id → invoice_products.item_code
                                    ↓
                           extractProductCode()
                                    ↓
                           IPDET.ITEM = item_code
```

## 📊 Estructura de Datos

### Tabla `invoice_products` (Supabase)
```sql
CREATE TABLE invoice_products (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  item_code VARCHAR(30) NOT NULL,  -- ← Código del producto en Firebird
  description TEXT,
  sync_status VARCHAR(20),
  firebird_version INTEGER,
  ...
);
```

### Tabla `invoice_items` (Supabase)
```sql
CREATE TABLE invoice_items (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  invoice_id UUID NOT NULL,
  product_id UUID,  -- ← Relación con invoice_products
  description TEXT,
  quantity DECIMAL,
  unit_price DECIMAL,
  ...
);
```

## 🔧 Implementación

### 1. Modificación en `supabaseClient.js`

Se agregó JOIN con `invoice_products` para obtener el `item_code`:

```javascript
const { data: items, error: itemsError } = await this.client
  .from('invoice_items')
  .select(`
    *,
    product:invoice_products (
      item_code,
      description
    )
  `)
  .eq('invoice_id', invoiceId)
  .eq('user_id', this.userUUID);
```

### 2. Modificación en `inventoryMapper.js`

Se actualizó `extractProductCode()` para usar `item_code` cuando esté disponible:

```javascript
extractProductCode(item) {
  // PRIORIDAD 1: Si tiene product_id amarrado (para EA/OC), usar item_code del producto
  if (item.product && item.product.item_code) {
    return item.product.item_code.trim();
  }

  // PRIORIDAD 2: Si la descripción tiene formato "CODIGO - Descripción", extraer el código
  if (item.description && item.description.includes(' - ')) {
    const parts = item.description.split(' - ');
    return parts[0].trim();
  }

  // Si no hay formato especial, retornar vacío
  return '';
}
```

## 📝 Uso

### Requisitos Previos

1. **Sincronizar productos desde Firebird:**
   ```bash
   npm run sync-products
   ```

2. **Verificar productos sincronizados:**
   ```bash
   npm run sync-products-stats
   ```

### Crear Factura de Inventario

1. **Crear factura tipo "inventario":**
   ```javascript
   const invoice = {
     user_id: 'uuid-del-usuario',
     invoice_number: 'EA-001',
     invoice_type: 'inventario',  // ← Importante
     date: '2024-01-15',
     num_identificacion: '900123456',
     ...
   };
   ```

2. **Crear items con product_id amarrado:**
   ```javascript
   const items = [
     {
       user_id: 'uuid-del-usuario',
       invoice_id: 'uuid-de-la-factura',
       product_id: 'uuid-del-producto',  // ← Amarrado a invoice_products
       description: 'PROD001 - Producto 1',
       quantity: 10,
       unit_price: 5000,
       total_price: 50000
     }
   ];
   ```

3. **Aprobar factura:**
   ```javascript
   await supabase
     .from('invoices')
     .update({ estado: 'APROBADO' })
     .eq('id', invoiceId);
   ```

### Script de Prueba

```bash
npm run test-inventory-products
```

Este script:
1. Lista productos disponibles en Supabase
2. Crea una factura tipo "inventario"
3. Crea items con `product_id` amarrado
4. Aprueba la factura
5. Espera la sincronización
6. Verifica el resultado

## ⚠️ Importante

- **Para EA/OC:** Los items DEBEN tener `product_id` amarrado
- **Para Facturas de Servicio/Libre:** Pueden usar el formato "CODIGO - Descripción" en la descripción
- **Validación:** Si un item no tiene `product_id` ni formato especial, se registrará un warning en los logs

## 🧪 Pruebas

### Prueba Manual

1. Sincronizar productos:
   ```bash
   npm run sync-products
   ```

2. Ejecutar prueba:
   ```bash
   npm run test-inventory-products
   ```

3. Verificar en Firebird:
   ```sql
   SELECT * FROM IP WHERE TIPO = 'EAI' ORDER BY FECHA DESC;
   SELECT * FROM IPDET WHERE TIPO = 'EAI' ORDER BY NUMBER DESC;
   SELECT * FROM ITEMACT WHERE TIPO = 'EAI' ORDER BY FECHA DESC;
   ```

## 📚 Referencias

- [Sincronización de Productos](./PRODUCT_SYNC.md)
- [Sincronización de Inventario](./INVENTORY_SYNC.md)
- [Configuración de Variables de Entorno](../.env.example)

