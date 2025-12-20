const FirebirdClient = require('../database/firebirdClient');
const SupabaseClient = require('../database/supabaseClient');
const appConfig = require('../config/appConfig');
const logger = require('../utils/logger');

class ProductSyncService {
  constructor() {
    this.firebirdClient = new FirebirdClient();
    this.supabaseClient = new SupabaseClient();
    this.userUUID = appConfig.getUserUUID();

    // Configuración de sincronización (se carga en initialize)
    this.syncConfig = null;
  }

  /**
   * Cargar configuración desde appConfig
   */
  loadConfig() {
    this.syncConfig = {
      // Filtros configurables desde Supabase
      onlyActiveProducts: appConfig.get('sync_only_active_products', true),
      onlyInventoryProducts: appConfig.get('sync_only_inventory_products', false),
      excludeGroups: this.parseExcludeGroups(appConfig.get('exclude_product_groups', '')),
      includeGroups: this.parseIncludeGroups(appConfig.get('include_product_groups', '')),
    };
  }

  /**
   * Parsea grupos a excluir desde configuración
   * @param {string} groupsStr - String con grupos separados por comas
   * @returns {Array} - Array de grupos a excluir
   */
  parseExcludeGroups(groupsStr) {
    try {
      return groupsStr ? groupsStr.split(',').map(g => g.trim()) : [];
    } catch (error) {
      logger.warn('Error parseando grupos a excluir:', error);
      return [];
    }
  }

  /**
   * Parsea grupos a incluir desde configuración
   * @param {string} groupsStr - String con grupos separados por comas
   * @returns {Array} - Array de grupos a incluir
   */
  parseIncludeGroups(groupsStr) {
    try {
      return groupsStr ? groupsStr.split(',').map(g => g.trim()) : [];
    } catch (error) {
      logger.warn('Error parseando grupos a incluir:', error);
      return [];
    }
  }

  /**
   * Inicializa el servicio de sincronización
   */
  async initialize() {
    try {
      // Cargar configuración
      this.loadConfig();

      await this.firebirdClient.initialize();
      logger.info('Servicio de sincronización de productos inicializado');
      logger.info('Configuración de sincronización:', this.syncConfig);
    } catch (error) {
      logger.error('Error inicializando servicio de productos:', error);
      throw error;
    }
  }

  /**
   * Obtiene la última versión sincronizada desde Supabase
   * @returns {Promise<number>} - Última versión sincronizada
   */
  async getLastSyncedVersion() {
    try {
      const { data, error } = await this.supabaseClient.client
        .from('invoice_products')
        .select('firebird_version')
        .eq('user_id', this.userUUID)
        .order('firebird_version', { ascending: false })
        .limit(1);

      if (error) {
        throw new Error(`Error obteniendo última versión: ${error.message}`);
      }

      const lastVersion = data && data.length > 0 ? data[0].firebird_version : 0;
      logger.info(`Última versión de productos sincronizada: ${lastVersion}`);
      return lastVersion || 0;
    } catch (error) {
      logger.error('Error obteniendo última versión sincronizada de productos:', error);
      return 0; // Si hay error, sincronizar desde el inicio
    }
  }

  /**
   * Sincroniza productos desde Firebird a Supabase
   * @param {boolean} fullSync - Si es true, sincroniza todos los productos
   */
  async syncFromFirebird(fullSync = false) {
    try {
      logger.info(`Iniciando sincronización de productos (fullSync: ${fullSync})`);

      // Obtener última versión sincronizada
      const lastVersion = fullSync ? 0 : await this.getLastSyncedVersion();

      // Construir consulta con filtros configurados
      const whereConditions = this.buildWhereConditions(lastVersion);
      const query = `
        SELECT 
          ITEM, DESCRIPCION, TIPO, CLASS, GRUPO, REF, ITEMMSTR,
          MARCA, MODELO, COD_BARRAS, VENDOR,
          COST, COSTP, COSTU, PRICE, PRICE1, PRICE2, PRICE3, PRICE4, PRICE5, PRECIOIVA,
          IMPOVENTA, IVA, IMPSTOCONSUMO, IMPCONSUMO2, IMPCONSUMO3,
          REVACCT, INVACCT, COSACCT, DEVACCT,
          UOFMSALES, UOFMORDERS, FACTOR,
          INVENTORY, PHYSICAL, MINIMO, MAXIMO, ONORDER,
          PESO, PESO_PROMEDIO, ALTO, ANCHO, LARGO, DIMENSION,
          MARGEN, DESC_MAXP, PORC_COMI, SERIALES,
          PROMOCION, FECHAPROMD, FECHAPROMC, PRECIOPROM, PRECIONORM,
          NOTAS, PROCEDENCIA, DIAS_GARANTIA_PROVEEDOR, DIAS_GARANTIA_CLIENTE,
          ESTADO, "Version", FECHA_CREACION
        FROM ITEM 
        WHERE ${whereConditions}
        ORDER BY "Version" NULLS FIRST
      `;

      logger.info('Ejecutando consulta SQL:', query);
      const products = await this.firebirdClient.query(query);
      
      logger.info(`Encontrados ${products.length} productos para sincronizar`);
      
      // Log de muestra de productos encontrados
      if (products.length > 0) {
        logger.info('Muestra de productos encontrados:', products.slice(0, 3).map(prod => ({
          ITEM: prod.ITEM?.trim(),
          DESCRIPCION: prod.DESCRIPCION?.trim(),
          TIPO: prod.TIPO,
          ESTADO: prod.ESTADO?.trim(),
          Version: prod.Version
        })));
      }

      if (products.length === 0) {
        logger.info('No hay productos nuevos para sincronizar');
        return { processed: 0, errors: 0 };
      }

      // Procesar productos en lotes con batch upsert (optimizado)
      const batchSize = 100; // Aumentado de 15 a 100 para mejor rendimiento
      let processed = 0;
      let errors = 0;

      for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(products.length / batchSize);

        logger.info(`Procesando lote ${batchNumber} de ${totalBatches} (${batch.length} registros)`);

        try {
          // Mapear todos los registros del batch
          const mappedRecords = batch.map(product => ({
            ...this.mapItemToSupabase(product),
            user_id: this.userUUID,
            last_sync_at: new Date().toISOString(),
            sync_status: 'SYNCED',
            sync_error: null
          }));

          // Batch upsert - mucho más rápido que uno por uno
          const { error } = await this.supabaseClient.client
            .from('invoice_products')
            .upsert(mappedRecords, {
              onConflict: 'item_code,user_id',
              ignoreDuplicates: false
            });

          if (error) throw error;

          processed += batch.length;
          logger.info(`✅ Lote ${batchNumber} procesado exitosamente: ${batch.length} productos`);

        } catch (error) {
          logger.error(`❌ Error en lote ${batchNumber}, procesando registros individualmente:`, error.message);

          // Fallback: procesar uno por uno para identificar registros problemáticos
          for (const product of batch) {
            try {
              await this.upsertProduct(product);
              processed++;
            } catch (err) {
              logger.error(`Error procesando producto ${product.ITEM}:`, err.message);
              errors++;
            }
          }
        }

        // Pausa pequeña entre lotes para no sobrecargar
        if (i + batchSize < products.length) {
          await new Promise(resolve => setTimeout(resolve, 50)); // Reducido de 100ms a 50ms
        }
      }

      logger.info(`✅ Sincronización de productos completada: ${processed} procesados, ${errors} errores`);
      return { processed, errors };

    } catch (error) {
      logger.error('Error en sincronización de productos:', error);
      throw error;
    }
  }

  /**
   * Construye las condiciones WHERE para la consulta
   */
  buildWhereConditions(lastVersion) {
    const conditions = [];

    // Filtro por versión (solo para sincronización incremental)
    if (lastVersion > 0) {
      conditions.push(`("Version" > ${lastVersion} OR "Version" IS NULL)`);
    }

    // Filtro por productos activos
    if (this.syncConfig.onlyActiveProducts) {
      conditions.push("(ESTADO IS NULL OR ESTADO = '' OR ESTADO = 'ACT')");
    }

    // Filtro por productos de inventario
    if (this.syncConfig.onlyInventoryProducts) {
      conditions.push("INVENTORY = 'True'");
    }

    // Excluir grupos específicos
    if (this.syncConfig.excludeGroups.length > 0) {
      const excludeConditions = this.syncConfig.excludeGroups.map(group => 
        `GRUPO != '${group}'`
      );
      conditions.push(`(${excludeConditions.join(' AND ')})`);
    }

    // Incluir solo grupos específicos
    if (this.syncConfig.includeGroups.length > 0) {
      const includeConditions = this.syncConfig.includeGroups.map(group => 
        `GRUPO = '${group}'`
      );
      conditions.push(`(${includeConditions.join(' OR ')})`);
    }

    const whereClause = conditions.length > 0 ? conditions.join(' AND ') : '1=1';
    logger.info('Condiciones WHERE para productos:', whereClause);
    
    return whereClause;
  }

  /**
   * Inserta o actualiza un producto en Supabase
   * @param {Object} itemRecord - Registro de ITEM
   */
  async upsertProduct(itemRecord) {
    try {
      const mappedData = this.mapItemToSupabase(itemRecord);

      logger.debug(`Procesando producto: ${itemRecord.ITEM?.trim()}`);

      // Verificar si existe
      const { data: existing, error: selectError } = await this.supabaseClient.client
        .from('invoice_products')
        .select('id')
        .eq('item_code', mappedData.item_code)
        .eq('user_id', this.userUUID)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        throw new Error(`Error verificando existencia: ${selectError.message}`);
      }

      let result;
      if (existing) {
        // Actualizar registro existente
        const { data, error } = await this.supabaseClient.client
          .from('invoice_products')
          .update({
            ...mappedData,
            last_sync_at: new Date().toISOString(),
            sync_status: 'SYNCED',
            sync_error: null
          })
          .eq('item_code', mappedData.item_code)
          .eq('user_id', this.userUUID);

        if (error) throw error;
        result = data;
        logger.debug(`Producto actualizado: ${mappedData.item_code}`);
      } else {
        // Insertar nuevo registro
        const { data, error } = await this.supabaseClient.client
          .from('invoice_products')
          .insert({
            ...mappedData,
            user_id: this.userUUID,
            last_sync_at: new Date().toISOString(),
            sync_status: 'SYNCED',
            sync_error: null
          });

        if (error) throw error;
        result = data;
        logger.debug(`Producto insertado: ${mappedData.item_code}`);
      }

      return result;
    } catch (error) {
      // Marcar como error en caso de fallo
      try {
        await this.supabaseClient.client
          .from('invoice_products')
          .upsert({
            item_code: itemRecord.ITEM?.trim(),
            description: itemRecord.DESCRIPCION?.trim() || 'ERROR EN SINCRONIZACIÓN',
            sync_status: 'ERROR',
            sync_error: error.message,
            firebird_version: itemRecord.Version || 0,
            last_sync_at: new Date().toISOString()
          });
      } catch (updateError) {
        logger.error('Error marcando producto como error:', updateError);
      }

      throw error;
    }
  }

  /**
   * Mapea un registro de ITEM a la estructura de invoice_products
   * @param {Object} itemRecord - Registro de ITEM
   * @returns {Object} - Datos mapeados para Supabase
   */
  mapItemToSupabase(itemRecord) {
    // Función auxiliar para convertir string boolean de Firebird
    const parseBool = (value) => {
      if (!value) return false;
      const str = value.toString().trim().toLowerCase();
      return str === 'true' || str === 's' || str === 'si' || str === '1';
    };

    // Función auxiliar para limpiar strings
    const cleanString = (value, maxLength = null) => {
      if (!value) return null;
      const cleaned = value.toString().trim();
      return maxLength ? cleaned.substring(0, maxLength) : cleaned;
    };

    // Función auxiliar para limpiar números
    const cleanNumber = (value) => {
      if (!value || isNaN(value)) return null;
      return parseFloat(value);
    };

    // Función auxiliar para fechas
    const cleanDate = (value) => {
      if (!value) return null;
      try {
        return new Date(value).toISOString();
      } catch (error) {
        return null;
      }
    };

    return {
      // Identificación principal
      item_code: cleanString(itemRecord.ITEM, 30),
      description: cleanString(itemRecord.DESCRIPCION, 200) || 'SIN DESCRIPCIÓN',

      // Clasificación del producto
      item_type: cleanString(itemRecord.TIPO, 5),
      item_class: cleanString(itemRecord.CLASS, 20),
      item_group: cleanString(itemRecord.GRUPO, 20),
      reference: cleanString(itemRecord.REF, 20),
      master_item: cleanString(itemRecord.ITEMMSTR, 20),

      // Información comercial
      brand: cleanString(itemRecord.MARCA, 30),
      model: cleanString(itemRecord.MODELO, 30),
      barcode: cleanString(itemRecord.COD_BARRAS, 30),
      vendor_code: cleanString(itemRecord.VENDOR, 30),

      // Precios y costos
      cost: cleanNumber(itemRecord.COST),
      average_cost: cleanNumber(itemRecord.COSTP),
      unit_cost: cleanNumber(itemRecord.COSTU),
      price: cleanNumber(itemRecord.PRICE),
      price_1: cleanNumber(itemRecord.PRICE1),
      price_2: cleanNumber(itemRecord.PRICE2),
      price_3: cleanNumber(itemRecord.PRICE3),
      price_4: cleanNumber(itemRecord.PRICE4),
      price_5: cleanNumber(itemRecord.PRICE5),
      price_with_tax: cleanNumber(itemRecord.PRECIOIVA),

      // Configuración de impuestos
      tax_code: cleanString(itemRecord.IMPOVENTA, 20),
      vat_percentage: cleanNumber(itemRecord.IVA),
      consumption_tax_1: cleanNumber(itemRecord.IMPSTOCONSUMO),
      consumption_tax_2: cleanNumber(itemRecord.IMPCONSUMO2),
      consumption_tax_3: cleanNumber(itemRecord.IMPCONSUMO3),

      // Cuentas contables
      revenue_account: cleanNumber(itemRecord.REVACCT),
      inventory_account: cleanNumber(itemRecord.INVACCT),
      cost_account: cleanNumber(itemRecord.COSACCT),
      return_account: cleanNumber(itemRecord.DEVACCT),

      // Unidades de medida
      sales_unit: cleanString(itemRecord.UOFMSALES, 30),
      order_unit: cleanString(itemRecord.UOFMORDERS, 30),
      conversion_factor: cleanNumber(itemRecord.FACTOR),

      // Inventario
      manages_inventory: parseBool(itemRecord.INVENTORY),
      physical_quantity: cleanNumber(itemRecord.PHYSICAL),
      minimum_stock: cleanNumber(itemRecord.MINIMO),
      maximum_stock: cleanNumber(itemRecord.MAXIMO),
      on_order_quantity: cleanNumber(itemRecord.ONORDER),

      // Características físicas
      weight: cleanNumber(itemRecord.PESO),
      average_weight: cleanNumber(itemRecord.PESO_PROMEDIO),
      height: cleanNumber(itemRecord.ALTO),
      width: cleanNumber(itemRecord.ANCHO),
      length: cleanNumber(itemRecord.LARGO),
      dimensions: cleanString(itemRecord.DIMENSION, 30),

      // Configuración comercial
      margin_percentage: cleanNumber(itemRecord.MARGEN),
      max_discount: cleanNumber(itemRecord.DESC_MAXP),
      commission_percentage: cleanNumber(itemRecord.PORC_COMI),
      manages_serials: parseBool(itemRecord.SERIALES),

      // Promociones
      is_promotion: parseBool(itemRecord.PROMOCION),
      promotion_start_date: cleanDate(itemRecord.FECHAPROMD),
      promotion_end_date: cleanDate(itemRecord.FECHAPROMC),
      promotion_price: cleanNumber(itemRecord.PRECIOPROM),
      normal_price: cleanNumber(itemRecord.PRECIONORM),

      // Información adicional
      notes: cleanString(itemRecord.NOTAS, 100),
      origin_country: cleanString(itemRecord.PROCEDENCIA, 30),
      warranty_days_supplier: cleanNumber(itemRecord.DIAS_GARANTIA_PROVEEDOR),
      warranty_days_customer: cleanNumber(itemRecord.DIAS_GARANTIA_CLIENTE),

      // Estado y control
      is_active: !itemRecord.ESTADO || itemRecord.ESTADO.trim() === '' || itemRecord.ESTADO.trim() === 'ACT',
      status: cleanString(itemRecord.ESTADO, 10),

      // Control de sincronización
      firebird_version: itemRecord.Version || 0
    };
  }

  /**
   * Ejecuta sincronización completa
   */
  async fullSync() {
    logger.info('Iniciando sincronización completa de productos...');
    return await this.syncFromFirebird(true);
  }

  /**
   * Ejecuta sincronización incremental
   */
  async incrementalSync() {
    logger.info('Iniciando sincronización incremental de productos...');
    return await this.syncFromFirebird(false);
  }

  /**
   * Obtiene estadísticas de sincronización
   */
  async getSyncStats() {
    try {
      // Obtener todos los registros del usuario (solo sync_status para eficiencia)
      const { data, error } = await this.supabaseClient.client
        .from('invoice_products')
        .select('sync_status')
        .eq('user_id', this.userUUID);

      if (error) throw error;

      // Contar por estado en JavaScript
      const stats = {
        total: data.length,
        synced: 0,
        pending: 0,
        error: 0,
        lastSync: null
      };

      data.forEach(row => {
        const status = (row.sync_status || 'pending').toLowerCase();
        if (stats.hasOwnProperty(status)) {
          stats[status]++;
        }
      });

      // Obtener fecha de última sincronización
      const { data: lastSyncData } = await this.supabaseClient.client
        .from('invoice_products')
        .select('last_sync_at')
        .eq('user_id', this.userUUID)
        .not('last_sync_at', 'is', null)
        .order('last_sync_at', { ascending: false })
        .limit(1)
        .single();

      if (lastSyncData) {
        stats.lastSync = lastSyncData.last_sync_at;
      }

      return stats;
    } catch (error) {
      logger.error('Error obteniendo estadísticas de productos:', error);
      return {
        total: 0,
        synced: 0,
        pending: 0,
        error: 0,
        lastSync: null
      };
    }
  }

  /**
   * Obtiene configuración actual de sincronización
   */
  getConfig() {
    return {
      onlyActiveProducts: this.syncConfig.onlyActiveProducts,
      onlyInventoryProducts: this.syncConfig.onlyInventoryProducts,
      excludeGroups: this.syncConfig.excludeGroups,
      includeGroups: this.syncConfig.includeGroups
    };
  }

  /**
   * Cierra las conexiones
   */
  async close() {
    try {
      await this.firebirdClient.close();
      await this.supabaseClient.close();
      logger.info('Servicio de sincronización de productos cerrado');
    } catch (error) {
      logger.error('Error cerrando servicio de productos:', error);
    }
  }
}

module.exports = ProductSyncService;
