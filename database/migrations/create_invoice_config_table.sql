-- ================================================================
-- TABLA DE CONFIGURACIÓN CENTRALIZADA
-- invoice_config: Almacena configuración operativa del servicio
-- ================================================================

-- Crear tabla de configuración
CREATE TABLE IF NOT EXISTS invoice_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES invoice_users(id) ON DELETE CASCADE,

  -- Metadatos
  config_version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Configuración de Firebird (credenciales del cliente)
  firebird_host TEXT DEFAULT 'localhost',
  firebird_port INTEGER DEFAULT 3050,
  firebird_database TEXT DEFAULT '',
  firebird_user TEXT DEFAULT 'SYSDBA',
  firebird_password TEXT DEFAULT '',
  
  -- Configuración de sincronización de terceros
  third_parties_sync_interval INTEGER DEFAULT 30, -- minutos
  
  -- Configuración de sincronización de cuentas contables
  chart_of_accounts_sync_interval INTEGER DEFAULT 60, -- minutos
  account_sync_ranges TEXT DEFAULT '1000-9999',
  account_exclude_ranges TEXT DEFAULT '',
  sync_only_active_accounts BOOLEAN DEFAULT true,
  exclude_zero_level_accounts BOOLEAN DEFAULT true,
  
  -- Configuración de sincronización de productos
  products_sync_interval INTEGER DEFAULT 45, -- minutos
  sync_only_active_products BOOLEAN DEFAULT true,
  sync_only_inventory_products BOOLEAN DEFAULT false,
  exclude_product_groups TEXT DEFAULT '',
  include_product_groups TEXT DEFAULT '',
  
  -- Configuración de sincronización inicial
  initial_sync_delay INTEGER DEFAULT 2, -- minutos
  
  -- Configuración de recuperación de facturas
  enable_invoice_recovery BOOLEAN DEFAULT true,
  recovery_batch_size INTEGER DEFAULT 10,
  
  -- Configuración de creación automática de terceros
  enable_auto_third_party_creation BOOLEAN DEFAULT true,
  
  -- Configuración del campo INVC en Firebird
  use_invoice_number_for_invc BOOLEAN DEFAULT false,
  
  -- Configuración de proyecto y actividad predeterminados
  default_project_code VARCHAR(10) DEFAULT '',
  default_activity_code VARCHAR(3) DEFAULT '',
  
  -- Configuración del tipo de documento
  document_type VARCHAR(3) DEFAULT 'FIA',
  
  -- Configuración de sincronización de inventario
  sync_ea BOOLEAN DEFAULT true,
  sync_oc BOOLEAN DEFAULT false,
  ea_document_type VARCHAR(3) DEFAULT 'EAI',
  oc_document_type VARCHAR(3) DEFAULT 'OCI',
  contabilizar_ea BOOLEAN DEFAULT false,
  
  -- Configuración de Pinecone
  pinecone_api_key TEXT DEFAULT '',
  pinecone_index_name TEXT DEFAULT '',
  pinecone_environment TEXT DEFAULT '',
  pinecone_namespace TEXT DEFAULT '',
  
  -- Configuración del servicio de embeddings
  embeddings_api_url TEXT DEFAULT 'https://chatbotstools.asistentesautonomos.com/api/embeddings',
  embeddings_api_key TEXT DEFAULT '',
  embeddings_dimension INTEGER DEFAULT 512,
  
  -- Configuración de sincronización de embeddings
  enable_pinecone_sync BOOLEAN DEFAULT true,
  pinecone_sync_interval INTEGER DEFAULT 60, -- minutos
  pinecone_batch_size INTEGER DEFAULT 50,
  
  -- Configuración del servicio
  log_level VARCHAR(20) DEFAULT 'info',
  service_name VARCHAR(100) DEFAULT 'supabase-firebird-sync',
  
  -- Configuración de API (opcional)
  api_port INTEGER DEFAULT NULL,
  
  -- Constraint: Un solo registro de configuración por usuario
  CONSTRAINT unique_user_config UNIQUE (user_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_invoice_config_user_id ON invoice_config(user_id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_invoice_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invoice_config_updated_at
  BEFORE UPDATE ON invoice_config
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_config_updated_at();

-- RLS (Row Level Security)
ALTER TABLE invoice_config ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo pueden ver su propia configuración
CREATE POLICY "Users can view their own config"
  ON invoice_config
  FOR SELECT
  USING (user_id = auth.uid());

-- Política: Los usuarios solo pueden insertar su propia configuración
CREATE POLICY "Users can insert their own config"
  ON invoice_config
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Política: Los usuarios solo pueden actualizar su propia configuración
CREATE POLICY "Users can update their own config"
  ON invoice_config
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Política: Los usuarios solo pueden eliminar su propia configuración
CREATE POLICY "Users can delete their own config"
  ON invoice_config
  FOR DELETE
  USING (user_id = auth.uid());

-- Comentarios de documentación
COMMENT ON TABLE invoice_config IS 'Configuración operativa del servicio de sincronización por usuario';
COMMENT ON COLUMN invoice_config.user_id IS 'Usuario propietario de esta configuración';
COMMENT ON COLUMN invoice_config.config_version IS 'Versión del esquema de configuración';
COMMENT ON COLUMN invoice_config.third_parties_sync_interval IS 'Intervalo de sincronización de terceros en minutos';
COMMENT ON COLUMN invoice_config.chart_of_accounts_sync_interval IS 'Intervalo de sincronización de cuentas en minutos';
COMMENT ON COLUMN invoice_config.account_sync_ranges IS 'Rangos de cuentas a sincronizar (ej: 1000-9999,20000-29999)';
COMMENT ON COLUMN invoice_config.account_exclude_ranges IS 'Rangos de cuentas a excluir (ej: 5000-5999)';
COMMENT ON COLUMN invoice_config.products_sync_interval IS 'Intervalo de sincronización de productos en minutos';
COMMENT ON COLUMN invoice_config.enable_invoice_recovery IS 'Habilitar recuperación automática de facturas fallidas';
COMMENT ON COLUMN invoice_config.recovery_batch_size IS 'Cantidad de facturas a procesar por lote en recuperación';
COMMENT ON COLUMN invoice_config.enable_auto_third_party_creation IS 'Crear automáticamente terceros que no existen en Firebird';
COMMENT ON COLUMN invoice_config.use_invoice_number_for_invc IS 'Usar invoice_number de Supabase en campo INVC de Firebird';
COMMENT ON COLUMN invoice_config.document_type IS 'Tipo de documento para facturas (máx 3 caracteres)';
COMMENT ON COLUMN invoice_config.sync_ea IS 'Sincronizar facturas de inventario a Entradas de Almacén';
COMMENT ON COLUMN invoice_config.sync_oc IS 'Sincronizar facturas de inventario a Órdenes de Compra';
COMMENT ON COLUMN invoice_config.contabilizar_ea IS 'Contabilizar automáticamente las Entradas de Almacén';
COMMENT ON COLUMN invoice_config.pinecone_api_key IS 'API Key de Pinecone para búsqueda vectorial';
COMMENT ON COLUMN invoice_config.embeddings_api_key IS 'API Key del servicio de embeddings';
COMMENT ON COLUMN invoice_config.enable_pinecone_sync IS 'Habilitar sincronización automática de productos a Pinecone';
COMMENT ON COLUMN invoice_config.log_level IS 'Nivel de logging (debug, info, warn, error)';
COMMENT ON COLUMN invoice_config.api_port IS 'Puerto para API de control (opcional)';

