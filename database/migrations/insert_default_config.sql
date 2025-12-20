-- ================================================================
-- INSERTAR CONFIGURACIÓN POR DEFECTO
-- ================================================================
-- Este script inserta una configuración por defecto para un usuario
-- IMPORTANTE: Reemplazar 'TU_USER_UUID_AQUI' con el UUID real del usuario

-- Verificar que el usuario existe
DO $$
DECLARE
  v_user_uuid UUID := 'TU_USER_UUID_AQUI'; -- REEMPLAZAR CON UUID REAL
  v_user_exists BOOLEAN;
BEGIN
  -- Verificar si el usuario existe
  SELECT EXISTS(SELECT 1 FROM invoice_user WHERE id = v_user_uuid) INTO v_user_exists;
  
  IF NOT v_user_exists THEN
    RAISE EXCEPTION 'El usuario con UUID % no existe en invoice_user', v_user_uuid;
  END IF;
  
  -- Insertar configuración por defecto
  INSERT INTO invoice_config (
    user_id,
    config_version,

    -- Configuración de Firebird
    firebird_host,
    firebird_port,
    firebird_database,
    firebird_user,
    firebird_password,

    -- Sincronización de terceros
    third_parties_sync_interval,
    
    -- Sincronización de cuentas contables
    chart_of_accounts_sync_interval,
    account_sync_ranges,
    account_exclude_ranges,
    sync_only_active_accounts,
    exclude_zero_level_accounts,
    
    -- Sincronización de productos
    products_sync_interval,
    sync_only_active_products,
    sync_only_inventory_products,
    exclude_product_groups,
    include_product_groups,
    
    -- Sincronización inicial
    initial_sync_delay,
    
    -- Recuperación de facturas
    enable_invoice_recovery,
    recovery_batch_size,
    
    -- Creación automática de terceros
    enable_auto_third_party_creation,
    
    -- Campo INVC
    use_invoice_number_for_invc,
    
    -- Proyecto y actividad
    default_project_code,
    default_activity_code,
    
    -- Tipo de documento
    document_type,
    
    -- Sincronización de inventario
    sync_ea,
    sync_oc,
    ea_document_type,
    oc_document_type,
    contabilizar_ea,
    
    -- Pinecone (dejar vacío si no se usa)
    pinecone_api_key,
    pinecone_index_name,
    pinecone_environment,
    pinecone_namespace,
    
    -- Embeddings (dejar vacío si no se usa)
    embeddings_api_url,
    embeddings_api_key,
    embeddings_dimension,
    
    -- Sincronización de embeddings
    enable_pinecone_sync,
    pinecone_sync_interval,
    pinecone_batch_size,
    
    -- Servicio
    log_level,
    service_name,
    api_port
  ) VALUES (
    v_user_uuid,
    '1.0.0',

    -- Configuración de Firebird (DEBE SER CONFIGURADO POR EL USUARIO)
    'localhost', -- firebird_host
    3050, -- firebird_port
    '', -- firebird_database (VACÍO - debe configurarse desde la web)
    'SYSDBA', -- firebird_user
    '', -- firebird_password (VACÍO - debe configurarse desde la web)

    -- Sincronización de terceros (cada 30 minutos)
    30,
    
    -- Sincronización de cuentas contables (cada 60 minutos)
    60,
    '1000-9999', -- Rangos de cuentas a sincronizar
    '', -- Sin exclusiones
    true, -- Solo cuentas activas
    true, -- Excluir cuentas de nivel 0
    
    -- Sincronización de productos (cada 45 minutos)
    45,
    true, -- Solo productos activos
    false, -- Todos los productos (no solo inventario)
    '', -- Sin exclusiones de grupos
    '', -- Sin inclusiones específicas
    
    -- Sincronización inicial (2 minutos de delay)
    2,
    
    -- Recuperación de facturas
    true, -- Habilitada
    10, -- Procesar de a 10 facturas
    
    -- Creación automática de terceros
    true, -- Habilitada
    
    -- Campo INVC
    false, -- Usar consecutivo de Firebird
    
    -- Proyecto y actividad (vacío por defecto)
    '',
    '',
    
    -- Tipo de documento
    'FIA', -- Facturas de Inventario Automáticas
    
    -- Sincronización de inventario
    true, -- Sincronizar a EA
    false, -- No sincronizar a OC
    'EAI', -- Tipo de documento para EA
    'OCI', -- Tipo de documento para OC
    false, -- No contabilizar EA automáticamente
    
    -- Pinecone (vacío por defecto - configurar si se usa)
    '',
    '',
    '',
    '',
    
    -- Embeddings (configurar si se usa)
    'https://chatbotstools.asistentesautonomos.com/api/embeddings',
    '',
    512,
    
    -- Sincronización de embeddings
    false, -- Deshabilitada por defecto (habilitar si se configura Pinecone)
    60,
    50,
    
    -- Servicio
    'info', -- Nivel de logging
    'supabase-firebird-sync',
    NULL -- Sin API de control por defecto
  )
  ON CONFLICT (user_id) DO NOTHING; -- No sobrescribir si ya existe
  
  RAISE NOTICE 'Configuración por defecto insertada para usuario %', v_user_uuid;
END $$;

