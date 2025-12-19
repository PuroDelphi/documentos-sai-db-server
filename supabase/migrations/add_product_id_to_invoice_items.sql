-- Agregar campo product_id a invoice_items para relacionar con invoice_products
-- Este campo permitirá vincular cada item de factura con el producto maestro

-- 1. Agregar la columna product_id (permite NULL)
ALTER TABLE invoice_items
ADD COLUMN product_id UUID NULL;

-- 2. Agregar comentario a la columna
COMMENT ON COLUMN invoice_items.product_id IS 'ID del producto en invoice_products. Permite NULL para items sin producto asociado.';

-- 3. Crear índice para mejorar performance en búsquedas
CREATE INDEX idx_invoice_items_product_id ON invoice_items(product_id);

-- 4. Agregar foreign key constraint con ON DELETE SET NULL
-- Esto asegura integridad referencial pero permite NULL
ALTER TABLE invoice_items
ADD CONSTRAINT fk_invoice_items_product
FOREIGN KEY (product_id)
REFERENCES invoice_products(id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- 5. Agregar índice compuesto para búsquedas por usuario y producto
CREATE INDEX idx_invoice_items_user_product ON invoice_items(user_id, product_id);

-- Notas:
-- - El campo permite NULL porque no todos los items tienen que estar relacionados con un producto
-- - ON DELETE SET NULL: Si se elimina el producto, el campo se pone en NULL (no se elimina el item)
-- - ON UPDATE CASCADE: Si cambia el ID del producto, se actualiza automáticamente
-- - Los índices mejoran el performance de búsquedas y joins

