const FirebirdClient = require('../database/firebirdClient');
const SupabaseClient = require('../database/supabaseClient');
const DataMapper = require('./dataMapper');
const InventoryMapper = require('./inventoryMapper');
const ThirdPartySyncService = require('./thirdPartySyncService');
const ThirdPartyCreationService = require('./thirdPartyCreationService');
const ChartOfAccountsSyncService = require('./chartOfAccountsSyncService');
const ProductSyncService = require('./productSyncService');
const appConfig = require('../config/appConfig');
const logger = require('../utils/logger');

class SyncService {
  constructor(firebirdClient = null, supabaseClient = null) {
    this.firebirdClient = firebirdClient || new FirebirdClient();
    this.supabaseClient = supabaseClient || new SupabaseClient();
    this.dataMapper = new DataMapper();
    this.inventoryMapper = new InventoryMapper(this.firebirdClient);
    this.thirdPartySyncService = new ThirdPartySyncService();
    this.thirdPartyCreationService = new ThirdPartyCreationService(this.firebirdClient);
    this.chartOfAccountsSyncService = new ChartOfAccountsSyncService();
    this.productSyncService = new ProductSyncService();

    // Configuración de intervalos de sincronización
    this.syncIntervals = {
      thirdParties: null, // Intervalo para sincronización de terceros
      chartOfAccounts: null, // Intervalo para sincronización de cuentas
      products: null, // Intervalo para sincronización de productos
    };

    // Configuración de tiempos (se carga desde appConfig)
    this.syncConfig = null;
  }

  /**
   * Cargar configuración desde appConfig
   */
  loadConfig() {
    this.syncConfig = {
      thirdPartiesInterval: (appConfig.get('third_parties_sync_interval', 30)) * 60 * 1000,
      chartOfAccountsInterval: (appConfig.get('chart_of_accounts_sync_interval', 60)) * 60 * 1000,
      productsInterval: (appConfig.get('products_sync_interval', 45)) * 60 * 1000,
      initialDelay: (appConfig.get('initial_sync_delay', 2)) * 60 * 1000,
      enableRecovery: appConfig.get('enable_invoice_recovery', true),
      recoveryBatchSize: appConfig.get('recovery_batch_size', 10),
      enableAutoThirdPartyCreation: appConfig.get('enable_auto_third_party_creation', true),
      // Configuración de sincronización de inventario
      syncEA: appConfig.get('sync_ea', true),
      syncOC: appConfig.get('sync_oc', false),
      eaDocumentType: appConfig.get('ea_document_type', 'EAI'),
      ocDocumentType: appConfig.get('oc_document_type', 'OCI'),
      contabilizarEA: appConfig.get('contabilizar_ea', false),
    };
  }

  /**
   * Inicializa el servicio
   */
  async initialize() {
    try {
      await this.firebirdClient.initialize();
      await this.ensureTipdocExists();

      // Crear tipos de documento para inventario si están habilitados
      if (this.syncConfig.syncEA) {
        await this.ensureTipdocExists(this.syncConfig.eaDocumentType);
        logger.info(`Sincronización EA habilitada con tipo de documento: ${this.syncConfig.eaDocumentType}`);
        logger.info(`Contabilización automática de EA: ${this.syncConfig.contabilizarEA ? 'HABILITADA' : 'DESHABILITADA'}`);
      }

      if (this.syncConfig.syncOC) {
        await this.ensureTipdocExists(this.syncConfig.ocDocumentType);
        logger.info(`Sincronización OC habilitada con tipo de documento: ${this.syncConfig.ocDocumentType}`);
      }

      logger.info('Servicio de sincronización inicializado');
      logger.info(`Creación automática de terceros: ${this.syncConfig.enableAutoThirdPartyCreation ? 'HABILITADA' : 'DESHABILITADA'}`);
    } catch (error) {
      logger.error('Error inicializando servicio:', error);
      throw error;
    }
  }

  /**
   * Verifica que el tipo de documento configurado exista en TIPDOC, si no lo crea
   * @param {string} customDocType - Tipo de documento personalizado (opcional)
   */
  async ensureTipdocExists(customDocType = null) {
    try {
      const documentType = customDocType || this.dataMapper.getDocumentType();

      const existingType = await this.firebirdClient.query(
        'SELECT * FROM TIPDOC WHERE CLASE = ? AND E = ? AND S = ?',
        [documentType, 1, 1]
      );

      if (existingType.length === 0) {
        logger.info(`Tipo ${documentType} no existe en TIPDOC, creándolo...`);

        // Generar descripción basada en el tipo de documento
        const description = this.generateDocumentDescription(documentType);

        // Determinar el TIPO según el documento
        // Para inventario (EAI, OCI, etc.) usar 'EA' u 'OC'
        // Para facturas (FIA, etc.) usar 'FP'
        let tipoField = 'FP'; // Por defecto para facturas
        if (documentType.startsWith('EA')) {
          tipoField = 'EA'; // Entradas de Almacén
        } else if (documentType.startsWith('OC')) {
          tipoField = 'OC'; // Órdenes de Compra
        }

        await this.firebirdClient.query(`
          INSERT INTO TIPDOC (
            TIPO, CLASE, E, S, CONSECUTIVO, DESCRIPCION, SIGLA, USERNAME,
            RUTA_FORMATO, OPERAR, NR1, NR2, RES_DIAN, NO_APLICA_NIIF,
            ENVIAFACELECT, PREFIJO_DIAN, RDESDE, RHASTA, CONTINGENCIA_FACT_ELECT,
            APLICA_RESTAURANTE, RUTA_DOC_ELECTRONICO, ESCENARIO_SALUD,
            TIPOCONSUMO, DOC_ELEC_POS, DIST_MANDANTE, ID_N
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          tipoField, documentType, 1, 1, 1, description, null, null,
          null, null, null, null, null, 'N', 'N', '', 0, 0, 'N',
          null, null, 0, 'N', 'N', null, null
        ]);

        logger.info(`Tipo ${documentType} creado exitosamente en TIPDOC (TIPO=${tipoField}, CLASE=${documentType}) con consecutivo inicial 1`);
      } else {
        logger.info(`Tipo ${documentType} ya existe en TIPDOC`);
        // Verificar que el consecutivo sea válido
        const currentConsecutive = existingType[0]?.CONSECUTIVO || 1;
        logger.info(`Consecutivo actual en TIPDOC para ${documentType}: ${currentConsecutive}`);
      }
    } catch (error) {
      const documentType = customDocType || this.dataMapper.getDocumentType();
      logger.error(`Error verificando/creando tipo ${documentType}:`, error);
      throw error;
    }
  }

  /**
   * Genera una descripción para el tipo de documento
   */
  generateDocumentDescription(documentType) {
    const descriptions = {
      'FIA': 'FACTURA POR PAGAR IA',
      'FAC': 'FACTURA DE VENTA',
      'CXP': 'CUENTA POR PAGAR',
      'CXC': 'CUENTA POR COBRAR',
      'REC': 'RECIBO DE CAJA',
      'COM': 'COMPROBANTE',
      'NOT': 'NOTA CONTABLE',
      'EAI': 'ENTRADA DE ALMACEN IA',
      'OCI': 'ORDEN DE COMPRA IA'
    };

    return descriptions[documentType] || `DOCUMENTO TIPO ${documentType}`;
  }

  /**
   * Busca un tercero en la tabla sincronizada de Supabase usando diferentes variaciones del NIT
   * @param {string} originalNit - NIT original de Supabase
   * @returns {Promise<string|null>} - NIT encontrado o null
   */
  async findExistingThird(originalNit) {
    if (!originalNit) return null;

    const variations = this.generateNitVariations(originalNit);

    logger.debug(`Buscando tercero con variaciones:`, variations);

    // Buscar DIRECTAMENTE en Firebird (fuente de verdad)
    // No usar Supabase porque puede estar desactualizado
    for (const nitVariation of variations) {
      try {
        const result = await this.firebirdClient.query(
          'SELECT ID_N FROM CUST WHERE ID_N = ?',
          [nitVariation]
        );

        if (result.length > 0) {
          logger.info(`✓ Tercero encontrado en Firebird: ${originalNit} -> ${nitVariation}`);
          return nitVariation;
        }
      } catch (error) {
        // Si hay error en la consulta, NO asumir que no existe
        // Lanzar el error para que se maneje correctamente
        logger.error(`❌ Error crítico buscando tercero ${nitVariation} en Firebird:`, error.message);
        throw new Error(`Error consultando CUST en Firebird: ${error.message}`);
      }
    }

    logger.warn(`⚠️ Tercero NO encontrado con ninguna variación de: ${originalNit}`);
    logger.info(`   Variaciones buscadas: ${variations.join(', ')}`);
    return null;
  }

  /**
   * Genera variaciones del NIT para búsqueda
   * @param {string} nit - NIT original
   * @returns {Array<string>} - Array de variaciones del NIT
   */
  generateNitVariations(nit) {
    const variations = [];
    const cleanNit = nit.toString().trim();

    logger.debug(`Generando variaciones para NIT: ${cleanNit}`);

    // 1. NIT original
    variations.push(cleanNit);
    logger.debug(`Variación 1 (original): ${cleanNit}`);

    // 2. Si tiene guión, quitar todo después del guión
    if (cleanNit.includes('-')) {
      const nitWithoutDV = cleanNit.split('-')[0];
      variations.push(nitWithoutDV);
      logger.debug(`Variación 2 (sin DV después de guión): ${nitWithoutDV}`);
    }

    // 3. Si no tiene guión, quitar último dígito (posible DV)
    if (!cleanNit.includes('-') && cleanNit.length > 1) {
      const nitWithoutLastDigit = cleanNit.slice(0, -1);
      variations.push(nitWithoutLastDigit);
      logger.debug(`Variación 3 (sin último dígito): ${nitWithoutLastDigit}`);
    }

    // 4. Remover duplicados y mantener orden
    const uniqueVariations = [...new Set(variations)];
    logger.debug(`Variaciones finales: ${uniqueVariations.join(', ')}`);

    return uniqueVariations;
  }

  /**
   * Obtiene el próximo número de batch desde TIPDOC
   */
  async getNextBatch() {
    try {
      const documentType = this.dataMapper.getDocumentType();

      const result = await this.firebirdClient.query(
        'SELECT CONSECUTIVO FROM TIPDOC WHERE CLASE = ? AND E = ? AND S = ?',
        [documentType, 1, 1]
      );

      if (result.length === 0) {
        throw new Error(`Tipo ${documentType} no encontrado en TIPDOC`);
      }

      const consecutivo = result[0]?.CONSECUTIVO || 1;

      // Verificar que el consecutivo sea coherente con los datos existentes
      const validatedConsecutivo = await this.validateConsecutive(consecutivo);

      logger.info(`Próximo consecutivo validado: ${validatedConsecutivo}`);
      return validatedConsecutivo;
    } catch (error) {
      logger.error('Error obteniendo próximo batch desde TIPDOC:', error);
      throw error;
    }
  }

  /**
   * Valida que el consecutivo de TIPDOC sea coherente con los datos existentes
   */
  async validateConsecutive(consecutivo) {
    try {
      const documentType = this.dataMapper.getDocumentType();

      // Verificar el máximo BATCH usado en CARPROEN para el tipo de documento configurado
      const result = await this.firebirdClient.query(
        'SELECT MAX(BATCH) as MAX_BATCH FROM CARPROEN WHERE TIPO = ?',
        [documentType]
      );

      const maxUsedBatch = result[0]?.MAX_BATCH || 0;

      if (maxUsedBatch >= consecutivo) {
        // El consecutivo debe ser mayor que el último batch usado
        const correctedConsecutive = maxUsedBatch + 1;

        logger.warn(`Consecutivo en TIPDOC (${consecutivo}) es menor o igual al último batch usado (${maxUsedBatch}). Corrigiendo a ${correctedConsecutive}`);

        await this.firebirdClient.query(`
          UPDATE TIPDOC
          SET CONSECUTIVO = ?
          WHERE CLASE = ? AND E = 1 AND S = 1
        `, [correctedConsecutive, documentType]);

        return correctedConsecutive;
      }

      return consecutivo;
    } catch (error) {
      logger.error('Error validando consecutivo:', error);
      // No lanzar error, continuar con el consecutivo original
      return consecutivo;
    }
  }

  /**
   * Ejecuta el procedimiento CXCXP_RECONTABILIZAR_DOC
   */
  async executeRecontabilizarDoc(carproenData) {
    try {
      const { E, S, TIPO, BATCH } = carproenData;

      logger.info(`Ejecutando CXCXP_RECONTABILIZAR_DOC con parámetros: E=${E}, S=${S}, TIPO='${TIPO}', BATCH=${BATCH}`);

      // Verificar que el procedimiento existe antes de ejecutarlo
      const procedureExists = await this.firebirdClient.query(`
        SELECT COUNT(*) as PROCEDURE_COUNT
        FROM RDB$PROCEDURES
        WHERE RDB$PROCEDURE_NAME = 'CXCXP_RECONTABILIZAR_DOC'
      `);

      if (procedureExists[0]?.PROCEDURE_COUNT === 0) {
        logger.warn('Procedimiento CXCXP_RECONTABILIZAR_DOC no existe en la base de datos');
        return;
      }

      await this.firebirdClient.query(`
        EXECUTE PROCEDURE CXCXP_RECONTABILIZAR_DOC(?, ?, ?, ?)
      `, [E, S, TIPO, BATCH]);

      logger.info(`Procedimiento CXCXP_RECONTABILIZAR_DOC ejecutado exitosamente para batch ${BATCH}`);
    } catch (error) {
      logger.error('Error ejecutando procedimiento CXCXP_RECONTABILIZAR_DOC:', error);
      logger.error('Detalles del error:', {
        message: error.message,
        code: error.code,
        sqlState: error.sqlState
      });
      throw error;
    }
  }

  /**
   * Ejecuta el procedimiento CONTABILIZAR_EA
   * @param {number} number - Número del documento (consecutivo)
   * @param {string} tipo - Tipo de documento (EAI)
   * @param {number} e - Empresa
   * @param {number} s - Sucursal
   */
  async executeContabilizarEA(number, tipo, e, s) {
    try {
      // Determinar el DOCUMENTO basado en el tipo
      // Para EAI, el documento es 'EA'
      const documento = tipo.startsWith('EA') ? 'EA' : tipo.substring(0, 2);

      logger.info(`Ejecutando CONTABILIZAR_EA con parámetros: NUMBER=${number}, TIPO='${tipo}', E=${e}, S=${s}, DOCUMENTO='${documento}'`);

      // Verificar que el procedimiento existe antes de ejecutarlo
      const procedureExists = await this.firebirdClient.query(`
        SELECT COUNT(*) as PROCEDURE_COUNT
        FROM RDB$PROCEDURES
        WHERE RDB$PROCEDURE_NAME = 'CONTABILIZAR_EA'
      `);

      if (procedureExists[0]?.PROCEDURE_COUNT === 0) {
        logger.warn('Procedimiento CONTABILIZAR_EA no existe en la base de datos');
        return;
      }

      // Ejecutar procedimiento con los 5 parámetros
      await this.firebirdClient.query(`
        EXECUTE PROCEDURE CONTABILIZAR_EA(?, ?, ?, ?, ?)
      `, [number, tipo, e, s, documento]);

      logger.info(`Procedimiento CONTABILIZAR_EA ejecutado exitosamente para EA ${number}`);
    } catch (error) {
      // Manejar error de cuentas contables no configuradas
      if (error.message && (error.message.includes('GL') || error.message.includes('ACCT'))) {
        logger.warn(`Procedimiento CONTABILIZAR_EA falló para EA ${number}: Cuentas contables no configuradas`);
        logger.warn('La EA fue creada correctamente pero no se pudo contabilizar. Configure las cuentas contables en el sistema.');
        // No lanzar error, la EA se creó correctamente
        return;
      }

      // Para otros errores, registrar y lanzar
      logger.error('Error ejecutando procedimiento CONTABILIZAR_EA:', error);
      logger.error('Detalles del error:', {
        message: error.message,
        code: error.code,
        sqlState: error.sqlState
      });
      throw error;
    }
  }

  /**
   * Valida que todas las cuentas contables existan en Firebird
   * @param {Array} carprodeData - Array de entradas contables
   * @param {string} invoiceId - ID de la factura en Supabase
   * @throws {Error} Si alguna cuenta no existe
   */
  async validateAccountCodes(carprodeData, invoiceId) {
    try {
      // Extraer códigos de cuenta únicos
      const accountCodes = [...new Set(carprodeData.map(entry => entry.ACCT))];

      logger.info(`Validando ${accountCodes.length} cuentas contables únicas...`);

      // Verificar cada cuenta en Firebird
      const invalidAccounts = [];

      for (const accountCode of accountCodes) {
        const result = await this.firebirdClient.query(`
          SELECT COUNT(*) as CUENTA_EXISTE
          FROM ACCT
          WHERE ACCT = ?
        `, [accountCode]);

        if (result[0]?.CUENTA_EXISTE === 0) {
          invalidAccounts.push(accountCode);
        }
      }

      // Si hay cuentas inválidas, lanzar error
      if (invalidAccounts.length > 0) {
        const errorMessage = `Las siguientes cuentas contables no existen en Firebird: ${invalidAccounts.join(', ')}. Por favor, sincronice las cuentas contables o verifique los códigos de cuenta en la factura.`;

        logger.error(errorMessage);

        // Actualizar estado en Supabase con error específico
        await this.supabaseClient.updateInvoiceStatus(
          invoiceId,
          'ERROR',
          errorMessage
        );

        throw new Error(errorMessage);
      }

      logger.info(`✅ Todas las cuentas contables son válidas`);
    } catch (error) {
      if (error.message.includes('no existen en Firebird')) {
        throw error; // Re-lanzar error de validación
      }

      logger.error('Error validando cuentas contables:', error);
      throw new Error(`Error validando cuentas contables: ${error.message}`);
    }
  }

  /**
   * Actualiza el consecutivo en TIPDOC incrementándolo en 1
   */
  async updateConsecutive(usedBatch) {
    try {
      const documentType = this.dataMapper.getDocumentType();
      const nextConsecutive = usedBatch + 1;

      await this.firebirdClient.query(`
        UPDATE TIPDOC
        SET CONSECUTIVO = ?
        WHERE CLASE = ? AND E = 1 AND S = 1
      `, [nextConsecutive, documentType]);

      logger.info(`Consecutivo actualizado de ${usedBatch} a ${nextConsecutive} para tipo ${documentType}`);
    } catch (error) {
      logger.error('Error actualizando consecutivo:', error);
      throw error;
    }
  }

  /**
   * Procesa facturas aprobadas pendientes de sincronización
   * Se ejecuta al iniciar el servicio para recuperar facturas que no se procesaron
   */
  async processPendingApprovedInvoices() {
    if (!this.syncConfig.enableRecovery) {
      logger.info('Recuperación de facturas deshabilitada por configuración');
      return { processed: 0, errors: 0 };
    }

    try {
      logger.info('Iniciando recuperación de facturas aprobadas pendientes...');

      // Obtener facturas pendientes
      const pendingInvoices = await this.supabaseClient.getPendingApprovedInvoices();

      if (pendingInvoices.length === 0) {
        logger.info('No hay facturas aprobadas pendientes de sincronización');
        return { processed: 0, errors: 0 };
      }

      let processed = 0;
      let errors = 0;
      const batchSize = this.syncConfig.recoveryBatchSize;

      // Procesar en lotes para evitar sobrecargar el sistema
      for (let i = 0; i < pendingInvoices.length; i += batchSize) {
        const batch = pendingInvoices.slice(i, i + batchSize);
        logger.info(`Procesando lote ${Math.floor(i / batchSize) + 1} de ${Math.ceil(pendingInvoices.length / batchSize)} (${batch.length} facturas)`);

        for (const invoice of batch) {
          try {
            await this.processApprovedInvoice(invoice);
            processed++;
            logger.info(`Factura recuperada exitosamente: ${invoice.invoice_number} (${processed}/${pendingInvoices.length})`);
          } catch (error) {
            errors++;
            logger.error(`Error recuperando factura ${invoice.invoice_number}:`, error.message);
          }
        }

        // Pausa entre lotes para no sobrecargar el sistema
        if (i + batchSize < pendingInvoices.length) {
          logger.info('Pausa entre lotes de recuperación...');
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 segundos de pausa
        }
      }

      logger.info(`Recuperación completada: ${processed} facturas procesadas, ${errors} errores`);
      return { processed, errors };

    } catch (error) {
      logger.error('Error en proceso de recuperación de facturas:', error);
      return { processed: 0, errors: 1 };
    }
  }

  /**
   * Procesa una factura aprobada
   */
  async processApprovedInvoice(invoice) {
    try {
      logger.info(`Procesando factura aprobada: ${invoice.invoice_number} (ID: ${invoice.id})`);

      // Obtener datos completos de la factura
      const invoiceData = await this.supabaseClient.getInvoiceData(invoice.id);

      // Verificar que tenga entradas contables
      if (!invoiceData.entries || invoiceData.entries.length === 0) {
        throw new Error('La factura no tiene entradas contables');
      }

      // Detectar tipo de factura y rutear según corresponda
      const invoiceType = invoiceData.invoice?.invoice_type || 'servicio'; // Por defecto 'servicio'

      logger.info(`Tipo de factura detectado: ${invoiceType}`);

      if (invoiceType === 'inventario') {
        // Procesar como factura de inventario
        await this.processInventoryInvoice(invoiceData);
      } else {
        // Procesar como factura de servicio/libre (lógica actual)
        await this.processServiceInvoice(invoiceData);
      }

      logger.info(`Factura ${invoice.invoice_number} procesada exitosamente`);

    } catch (error) {
      logger.error(`Error procesando factura ${invoice.invoice_number}:`, error);

      // Actualizar estado en Supabase como error
      try {
        await this.supabaseClient.updateInvoiceStatus(invoice.id, 'ERROR', error.message);
      } catch (updateError) {
        logger.error(`Error actualizando estado de factura ${invoice.invoice_number}:`, updateError);
      }

      throw error;
    }
  }

  /**
   * Procesa una factura de servicio/libre (lógica original)
   * @param {Object} invoiceData - Datos completos de la factura
   */
  async processServiceInvoice(invoiceData) {
    // Verificar y ajustar NITs de terceros
    const validatedInvoiceData = await this.validateAndFixThirdParties(invoiceData);

    // Obtener próximo batch
    const batch = await this.getNextBatch();

    // Mapear datos con NITs validados
    const carproenData = this.dataMapper.mapToCarproen(validatedInvoiceData, batch);
    const carprodeData = this.dataMapper.mapToCarprode(validatedInvoiceData, batch);

    // VALIDAR CUENTAS CONTABLES ANTES DE INSERTAR
    await this.validateAccountCodes(carprodeData, validatedInvoiceData.invoice.id);

    // Ejecutar inserción en transacción
    await this.firebirdClient.transaction(async (transaction) => {
      // Insertar en CARPROEN
      await this.insertCarproen(transaction, carproenData);

      // Insertar en CARPRODE
      for (const entry of carprodeData) {
        await this.insertCarprode(transaction, entry);
      }
    });

    // Ejecutar procedimiento de recontabilización
    await this.executeRecontabilizarDoc(carproenData);

    // Actualizar consecutivo
    await this.updateConsecutive(batch);

    // Determinar mensaje de respuesta según si se creó un tercero
    const serviceResponse = validatedInvoiceData.thirdPartyCreated
      ? 'Ok, tercero creado automáticamente, por favor revise en el sistema'
      : 'Ok';

    // Actualizar estado en Supabase como exitoso
    await this.supabaseClient.updateInvoiceStatus(validatedInvoiceData.invoice.id, 'SINCRONIZADO', serviceResponse);
  }

  /**
   * Procesa una factura de inventario
   * @param {Object} invoiceData - Datos completos de la factura
   */
  async processInventoryInvoice(invoiceData) {
    // Verificar configuración
    if (!this.syncConfig.syncEA && !this.syncConfig.syncOC) {
      throw new Error('Sincronización de inventario no habilitada. Configure SYNC_EA o SYNC_OC en .env');
    }

    // Verificar y ajustar NITs de terceros
    const validatedInvoiceData = await this.validateAndFixThirdParties(invoiceData);

    // Procesar según configuración
    if (this.syncConfig.syncEA) {
      await this.processWarehouseEntry(validatedInvoiceData);
    }

    // OC se implementará en el futuro
    if (this.syncConfig.syncOC) {
      logger.warn('Sincronización a Órdenes de Compra (OC) aún no implementada');
    }
  }

  /**
   * Procesa una Entrada de Almacén (EA)
   * @param {Object} invoiceData - Datos validados de la factura
   */
  async processWarehouseEntry(invoiceData) {
    try {
      const { invoice, items } = invoiceData;

      // Verificar que tenga items
      if (!items || items.length === 0) {
        throw new Error('La factura de inventario no tiene items');
      }

      // Obtener próximo consecutivo para EA
      const consecutiveNumber = await this.getNextBatchForDocType(this.syncConfig.eaDocumentType);

      // Obtener valores por defecto
      const ipDefaults = await this.inventoryMapper.getDefaultValuesForIP();
      const ipdetDefaults = await this.inventoryMapper.getDefaultValuesForIPDET();

      // ✅ CRÍTICO: Asegurar que E y S sean iguales en IP e IPDET
      // La clave foránea FK_IPDET_IP requiere que (NUMBER, TIPO, E, S) coincidan
      ipdetDefaults.E = ipDefaults.E;
      ipdetDefaults.S = ipDefaults.S;

      logger.info(`Usando E=${ipDefaults.E}, S=${ipDefaults.S} para IP e IPDET`);

      // Mapear datos a IP (encabezado)
      const ipData = await this.inventoryMapper.mapToIP(
        invoice,
        consecutiveNumber,
        this.syncConfig.eaDocumentType,
        ipDefaults
      );

      // Mapear items a IPDET (detalle) e ITEMACT (kardex)
      const ipdetDataArray = [];
      const itemactDataArray = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const conteo = i + 1; // Contador de línea

        // Mapear a IPDET
        const ipdetData = await this.inventoryMapper.mapToIPDET(
          item,
          conteo,
          consecutiveNumber,
          this.syncConfig.eaDocumentType,
          ipdetDefaults
        );
        ipdetDataArray.push(ipdetData);

        // Mapear a ITEMACT (Kardex)
        const itemactData = await this.inventoryMapper.mapToITEMACT(
          item,
          invoice,
          consecutiveNumber,
          this.syncConfig.eaDocumentType,
          ipDefaults,
          ipdetDefaults
        );
        itemactDataArray.push(itemactData);
      }

      // Ejecutar inserción en transacción
      await this.firebirdClient.transaction(async (transaction) => {
        // Insertar en IP (encabezado)
        await this.insertIP(transaction, ipData);

        // Insertar en IPDET (detalle)
        for (const ipdetData of ipdetDataArray) {
          await this.insertIPDET(transaction, ipdetData);
        }

        // Insertar en ITEMACT (kardex)
        for (const itemactData of itemactDataArray) {
          await this.insertITEMACT(transaction, itemactData);
        }
      });

      // Actualizar consecutivo
      await this.updateConsecutiveForDocType(this.syncConfig.eaDocumentType, consecutiveNumber);

      // Contabilizar EA si está habilitado
      if (this.syncConfig.contabilizarEA) {
        await this.executeContabilizarEA(consecutiveNumber, this.syncConfig.eaDocumentType, ipDefaults.E, ipDefaults.S);
      }

      // Determinar mensaje de respuesta
      const serviceResponse = invoiceData.thirdPartyCreated
        ? 'Ok, tercero creado automáticamente, por favor revise en el sistema'
        : 'Ok';

      // Actualizar estado en Supabase como exitoso
      await this.supabaseClient.updateInvoiceStatus(invoice.id, 'SINCRONIZADO', serviceResponse);

      logger.info(`Entrada de Almacén procesada exitosamente con consecutivo ${consecutiveNumber}`);

    } catch (error) {
      logger.error('Error procesando Entrada de Almacén:', error);
      throw error;
    }
  }

  /**
   * Obtiene el próximo consecutivo para un tipo de documento específico
   * @param {string} documentType - Tipo de documento
   * @returns {Promise<number>} - Próximo consecutivo
   */
  async getNextBatchForDocType(documentType) {
    try {
      const result = await this.firebirdClient.query(
        'SELECT CONSECUTIVO FROM TIPDOC WHERE CLASE = ? AND E = ? AND S = ?',
        [documentType, 1, 1]
      );

      if (result.length === 0) {
        throw new Error(`Tipo ${documentType} no encontrado en TIPDOC`);
      }

      const consecutivo = result[0]?.CONSECUTIVO || 1;
      logger.info(`Próximo consecutivo para ${documentType}: ${consecutivo}`);
      return consecutivo;
    } catch (error) {
      logger.error(`Error obteniendo próximo consecutivo para ${documentType}:`, error);
      throw error;
    }
  }

  /**
   * Actualiza el consecutivo para un tipo de documento específico
   * @param {string} documentType - Tipo de documento
   * @param {number} usedConsecutive - Consecutivo usado
   */
  async updateConsecutiveForDocType(documentType, usedConsecutive) {
    try {
      const nextConsecutive = usedConsecutive + 1;

      await this.firebirdClient.query(`
        UPDATE TIPDOC
        SET CONSECUTIVO = ?
        WHERE CLASE = ? AND E = 1 AND S = 1
      `, [nextConsecutive, documentType]);

      logger.info(`Consecutivo actualizado de ${usedConsecutive} a ${nextConsecutive} para tipo ${documentType}`);
    } catch (error) {
      logger.error(`Error actualizando consecutivo para ${documentType}:`, error);
      throw error;
    }
  }

  /**
   * Valida y corrige los NITs de terceros en los datos de la factura
   * @param {Object} invoiceData - Datos de la factura
   * @returns {Promise<Object>} - Datos de la factura con NITs corregidos
   */
  async validateAndFixThirdParties(invoiceData) {
    const { invoice, entries } = invoiceData;
    let thirdPartyCreated = false; // Flag para indicar si se creó un tercero

    // Validar NIT principal de la factura
    if (invoice.num_identificacion) {
      let validIdN = null;
      let searchError = null;

      // Intentar buscar el tercero
      try {
        validIdN = await this.findExistingThird(invoice.num_identificacion);
      } catch (error) {
        searchError = error;
        logger.error(`❌ Error buscando tercero en Firebird:`, error.message);
      }

      if (validIdN) {
        // Tercero encontrado en Firebird
        logger.info(`✓ Tercero encontrado en Firebird: NIT original=${invoice.num_identificacion}, ID_N=${validIdN}`);

        // CRÍTICO: Sobrescribir el NIT en invoice con el ID_N encontrado
        // para que mapToCarproen use el ID_N correcto
        invoice.num_identificacion = validIdN;
        logger.info(`✓ NIT actualizado a ID_N de Firebird: ${validIdN}`);
      } else {
        // Tercero NO encontrado (o hubo error en la búsqueda)
        if (searchError) {
          logger.warn(`⚠️ Hubo error buscando tercero, se intentará crear de todas formas`);
        } else {
          logger.warn(`⚠️ NIT principal no encontrado en CUST: ${invoice.num_identificacion}`);
        }

        // Verificar si la creación automática está habilitada
        if (!this.syncConfig.enableAutoThirdPartyCreation) {
          throw new Error(`El tercero ${invoice.num_identificacion} no existe en Firebird. Creación automática deshabilitada (ENABLE_AUTO_THIRD_PARTY_CREATION=false)`);
        }

        logger.info(`🔧 Creando tercero automáticamente desde datos de factura...`);

        try {
          // Crear tercero en CUST y SHIPTO
          const createdIdN = await this.thirdPartyCreationService.createThirdPartyFromInvoice(invoiceData);
          thirdPartyCreated = true;
          logger.info(`✓ Tercero creado exitosamente: ID_N=${createdIdN}, NIT original=${invoice.num_identificacion}`);

          // CRÍTICO: Esperar para asegurar que el commit se complete
          await new Promise(resolve => setTimeout(resolve, 200)); // 200ms de espera

          // Verificar que el tercero realmente existe
          const verifyThird = await this.firebirdClient.query(
            'SELECT ID_N, NIT, COMPANY FROM CUST WHERE ID_N = ?',
            [createdIdN]
          );

          if (verifyThird.length === 0) {
            throw new Error(`El tercero ${createdIdN} fue creado pero no se encuentra en CUST. Posible problema de commit.`);
          }

          logger.info(`✓ Tercero verificado en CUST: ID_N=${createdIdN}, NIT=${verifyThird[0].NIT}, COMPANY=${verifyThird[0].COMPANY}`);

          // CRÍTICO: Actualizar el NIT en invoice con el ID_N creado
          invoice.num_identificacion = createdIdN;
          logger.info(`✓ NIT actualizado a ID_N creado: ${createdIdN}`);

        } catch (creationError) {
          logger.error(`❌ Error creando tercero automáticamente:`, creationError);
          throw new Error(`No se pudo crear el tercero ${invoice.num_identificacion}: ${creationError.message}`);
        }
      }
    }

    // Validar NITs en entradas contables
    for (const entry of entries) {
      if (entry.third_party_nit) {
        const validIdN = await this.findExistingThird(entry.third_party_nit);
        if (validIdN) {
          // Tercero encontrado en Firebird
          logger.info(`✓ Tercero de entrada contable encontrado: NIT original=${entry.third_party_nit}, ID_N=${validIdN}`);

          // CRÍTICO: Sobrescribir el NIT con el ID_N encontrado
          entry.third_party_nit = validIdN;
          logger.info(`✓ NIT de entrada actualizado a ID_N de Firebird: ${validIdN}`);
        } else {
          // Si no se encuentra, usar el NIT principal de la factura (que ya fue validado arriba)
          logger.warn(`⚠️ NIT de entrada contable no encontrado: ${entry.third_party_nit}, usando NIT principal`);
          entry.third_party_nit = invoice.num_identificacion;
        }
      } else {
        // Si no tiene NIT, usar el de la factura (que ya fue validado arriba)
        entry.third_party_nit = invoice.num_identificacion;
      }
    }

    return { invoice, entries, items: invoiceData.items, thirdPartyCreated };
  }

  /**
   * Inserta un registro en CARPROEN
   */
  async insertCarproen(transaction, data) {
    try {
      // Log detallado del ID_N que se va a insertar
      logger.info(`Insertando en CARPROEN con ID_N="${data.ID_N}", TIPO="${data.TIPO}", BATCH=${data.BATCH}`);

      const fields = Object.keys(data).join(', ');
      const placeholders = Object.keys(data).map(() => '?').join(', ');
      const values = Object.values(data);

      const sql = `INSERT INTO CARPROEN (${fields}) VALUES (${placeholders})`;

      logger.debug('SQL CARPROEN:', { sql, id_n: data.ID_N, tipo: data.TIPO, batch: data.BATCH });

      return new Promise((resolve, reject) => {
        transaction.query(sql, values, (err, result) => {
          if (err) {
            logger.error('Error insertando en CARPROEN:', {
              error: err.message,
              sql,
              data: Object.keys(data).map(key => ({
                field: key,
                value: data[key],
                length: typeof data[key] === 'string' ? data[key].length : 'N/A'
              }))
            });
            reject(err);
          } else {
            resolve(result);
          }
        });
      });
    } catch (error) {
      logger.error('Error preparando inserción CARPROEN:', error);
      throw error;
    }
  }

  /**
   * Inserta un registro en CARPRODE
   */
  async insertCarprode(transaction, data) {
    try {
      const fields = Object.keys(data).filter(key => key !== 'CONTEO').join(', ');
      const placeholders = Object.keys(data).filter(key => key !== 'CONTEO').map(() => '?').join(', ');
      const values = Object.values(data).filter((_, index) => Object.keys(data)[index] !== 'CONTEO');

      const sql = `INSERT INTO CARPRODE (${fields}) VALUES (${placeholders})`;

      logger.debug('Insertando en CARPRODE:', { sql, values });

      return new Promise((resolve, reject) => {
        transaction.query(sql, values, (err, result) => {
          if (err) {
            logger.error('Error insertando en CARPRODE:', {
              error: err.message,
              sql,
              data: Object.keys(data).filter(key => key !== 'CONTEO').map(key => ({
                field: key,
                value: data[key],
                length: typeof data[key] === 'string' ? data[key].length : 'N/A'
              }))
            });
            reject(err);
          } else {
            resolve(result);
          }
        });
      });
    } catch (error) {
      logger.error('Error preparando inserción CARPRODE:', error);
      throw error;
    }
  }

  /**
   * Inserta un registro en IP (Entrada de Almacén - Encabezado)
   */
  async insertIP(transaction, data) {
    try {
      const fields = Object.keys(data).join(', ');
      const placeholders = Object.keys(data).map(() => '?').join(', ');
      const values = Object.values(data);

      const sql = `INSERT INTO IP (${fields}) VALUES (${placeholders})`;

      logger.debug('Insertando en IP:', { sql, values });

      return new Promise((resolve, reject) => {
        transaction.query(sql, values, (err, result) => {
          if (err) {
            logger.error('Error insertando en IP:', {
              error: err.message,
              sql,
              data: Object.keys(data).map(key => ({
                field: key,
                value: data[key],
                length: typeof data[key] === 'string' ? data[key].length : 'N/A'
              }))
            });
            reject(err);
          } else {
            resolve(result);
          }
        });
      });
    } catch (error) {
      logger.error('Error preparando inserción IP:', error);
      throw error;
    }
  }

  /**
   * Inserta un registro en IPDET (Entrada de Almacén - Detalle)
   */
  async insertIPDET(transaction, data) {
    try {
      const fields = Object.keys(data).join(', ');
      const placeholders = Object.keys(data).map(() => '?').join(', ');
      const values = Object.values(data);

      const sql = `INSERT INTO IPDET (${fields}) VALUES (${placeholders})`;

      logger.debug('Insertando en IPDET:', { sql, values });

      return new Promise((resolve, reject) => {
        transaction.query(sql, values, (err, result) => {
          if (err) {
            logger.error('Error insertando en IPDET:', {
              error: err.message,
              sql,
              data: Object.keys(data).map(key => ({
                field: key,
                value: data[key],
                length: typeof data[key] === 'string' ? data[key].length : 'N/A'
              }))
            });
            reject(err);
          } else {
            resolve(result);
          }
        });
      });
    } catch (error) {
      logger.error('Error preparando inserción IPDET:', error);
      throw error;
    }
  }

  /**
   * Inserta un registro en ITEMACT (Kardex)
   */
  async insertITEMACT(transaction, data) {
    try {
      // CONTEO es auto-increment, no se debe incluir en el INSERT
      const fields = Object.keys(data).filter(key => key !== 'CONTEO').join(', ');
      const placeholders = Object.keys(data).filter(key => key !== 'CONTEO').map(() => '?').join(', ');
      const values = Object.values(data).filter((_, index) => Object.keys(data)[index] !== 'CONTEO');

      const sql = `INSERT INTO ITEMACT (${fields}) VALUES (${placeholders})`;

      logger.debug('Insertando en ITEMACT:', { sql, values });

      return new Promise((resolve, reject) => {
        transaction.query(sql, values, (err, result) => {
          if (err) {
            logger.error('Error insertando en ITEMACT:', {
              error: err.message,
              sql,
              data: Object.keys(data).filter(key => key !== 'CONTEO').map(key => ({
                field: key,
                value: data[key],
                length: typeof data[key] === 'string' ? data[key].length : 'N/A'
              }))
            });
            reject(err);
          } else {
            resolve(result);
          }
        });
      });
    } catch (error) {
      logger.error('Error preparando inserción ITEMACT:', error);
      throw error;
    }
  }

  /**
   * Inicia el servicio de escucha y sincronizaciones en segundo plano
   */
  async start() {
    try {
      // Cargar configuración desde appConfig
      this.loadConfig();

      await this.initialize();

      // Inicializar servicios de sincronización
      await this.thirdPartySyncService.initialize();
      await this.chartOfAccountsSyncService.initialize();
      await this.productSyncService.initialize();

      // Procesar facturas aprobadas pendientes (recuperación)
      logger.info('Verificando facturas aprobadas pendientes de sincronización...');
      const recoveryResult = await this.processPendingApprovedInvoices();

      if (recoveryResult.processed > 0) {
        logger.info(`Recuperación completada: ${recoveryResult.processed} facturas sincronizadas, ${recoveryResult.errors} errores`);
      }

      // Configurar listener de facturas para nuevos cambios
      // Incluir callback de reconexión para recuperar facturas pendientes
      this.supabaseClient.setupRealtimeListener(
        async (invoice) => {
          await this.processApprovedInvoice(invoice);
        },
        async () => {
          // Callback ejecutado cuando se reconecta después de una caída
          logger.info('🔄 Reconexión de Realtime detectada, verificando facturas pendientes...');
          const recoveryResult = await this.processPendingApprovedInvoices();

          if (recoveryResult.processed > 0) {
            logger.info(`✅ Recuperación post-reconexión: ${recoveryResult.processed} facturas sincronizadas, ${recoveryResult.errors} errores`);
          } else {
            logger.info('✅ Recuperación post-reconexión: sin facturas pendientes');
          }
        }
      );

      // Iniciar sincronizaciones en segundo plano
      await this.startBackgroundSync();

      logger.info('Servicio de sincronización iniciado y escuchando cambios...');
      logger.info(`Recuperación de facturas: ${this.syncConfig.enableRecovery ? 'HABILITADA' : 'DESHABILITADA'}`);
      logger.info(`Sincronización de terceros programada cada ${this.syncConfig.thirdPartiesInterval / 60000} minutos`);
      logger.info(`Sincronización de cuentas programada cada ${this.syncConfig.chartOfAccountsInterval / 60000} minutos`);
      logger.info(`Sincronización de productos programada cada ${this.syncConfig.productsInterval / 60000} minutos`);
    } catch (error) {
      logger.error('Error iniciando servicio:', error);
      throw error;
    }
  }

  /**
   * Inicia las sincronizaciones en segundo plano
   */
  async startBackgroundSync() {
    try {
      // Sincronización inicial después del delay configurado
      setTimeout(async () => {
        logger.info('Ejecutando sincronizaciones iniciales...');
        await this.syncThirdPartiesBackground();

        // Delays adicionales entre sincronizaciones para no sobrecargar
        setTimeout(async () => {
          await this.syncChartOfAccountsBackground();
        }, 30000); // 30 segundos después

        setTimeout(async () => {
          await this.syncProductsBackground();
        }, 60000); // 60 segundos después
      }, this.syncConfig.initialDelay);

      // Programar sincronizaciones periódicas
      this.syncIntervals.thirdParties = setInterval(async () => {
        await this.syncThirdPartiesBackground();
      }, this.syncConfig.thirdPartiesInterval);

      this.syncIntervals.chartOfAccounts = setInterval(async () => {
        await this.syncChartOfAccountsBackground();
      }, this.syncConfig.chartOfAccountsInterval);

      this.syncIntervals.products = setInterval(async () => {
        await this.syncProductsBackground();
      }, this.syncConfig.productsInterval);

      logger.info('Sincronizaciones en segundo plano configuradas');
    } catch (error) {
      logger.error('Error configurando sincronizaciones en segundo plano:', error);
    }
  }

  /**
   * Ejecuta sincronización de terceros en segundo plano
   */
  async syncThirdPartiesBackground() {
    try {
      logger.info('Iniciando sincronización automática de terceros...');
      const result = await this.thirdPartySyncService.incrementalSync();

      if (result.processed > 0 || result.errors > 0) {
        logger.info(`Sincronización de terceros completada: ${result.processed} procesados, ${result.errors} errores`);
      } else {
        logger.debug('Sincronización de terceros: sin cambios detectados');
      }

      return result;
    } catch (error) {
      logger.error('Error en sincronización automática de terceros:', error);
    }
  }

  /**
   * Ejecuta sincronización de cuentas contables en segundo plano
   */
  async syncChartOfAccountsBackground() {
    try {
      logger.info('Iniciando sincronización automática de cuentas contables...');
      const result = await this.chartOfAccountsSyncService.incrementalSync();

      if (result.processed > 0 || result.errors > 0) {
        logger.info(`Sincronización de cuentas completada: ${result.processed} procesadas, ${result.errors} errores`);
      } else {
        logger.debug('Sincronización de cuentas: sin cambios detectados');
      }

      return result;
    } catch (error) {
      logger.error('Error en sincronización automática de cuentas:', error);
    }
  }

  /**
   * Ejecuta sincronización de productos en segundo plano
   */
  async syncProductsBackground() {
    try {
      logger.info('Iniciando sincronización automática de productos...');
      const result = await this.productSyncService.incrementalSync();

      if (result.processed > 0 || result.errors > 0) {
        logger.info(`Sincronización de productos completada: ${result.processed} procesados, ${result.errors} errores`);
      } else {
        logger.debug('Sincronización de productos: sin cambios detectados');
      }

      return result;
    } catch (error) {
      logger.error('Error en sincronización automática de productos:', error);
    }
  }

  /**
   * Detiene el servicio y limpia los intervalos
   */
  async stop() {
    try {
      // Limpiar intervalos de sincronización
      this.stopBackgroundSync();

      // Cerrar conexiones
      await this.firebirdClient.close();
      await this.supabaseClient.close();
      await this.thirdPartySyncService.close();
      await this.chartOfAccountsSyncService.close();
      await this.productSyncService.close();

      logger.info('Servicio de sincronización detenido');
    } catch (error) {
      logger.error('Error deteniendo servicio:', error);
    }
  }

  /**
   * Detiene las sincronizaciones en segundo plano
   */
  stopBackgroundSync() {
    try {
      // Limpiar intervalos de sincronización
      if (this.syncIntervals.thirdParties) {
        clearInterval(this.syncIntervals.thirdParties);
        this.syncIntervals.thirdParties = null;
        logger.info('Intervalo de sincronización de terceros detenido');
      }

      if (this.syncIntervals.chartOfAccounts) {
        clearInterval(this.syncIntervals.chartOfAccounts);
        this.syncIntervals.chartOfAccounts = null;
        logger.info('Intervalo de sincronización de cuentas detenido');
      }

      if (this.syncIntervals.products) {
        clearInterval(this.syncIntervals.products);
        this.syncIntervals.products = null;
        logger.info('Intervalo de sincronización de productos detenido');
      }
    } catch (error) {
      logger.error('Error deteniendo sincronizaciones en segundo plano:', error);
    }
  }

  /**
   * Ejecuta sincronización manual de terceros
   */
  async manualThirdPartiesSync(fullSync = false) {
    try {
      logger.info(`Ejecutando sincronización manual de terceros (completa: ${fullSync})`);
      const result = fullSync
        ? await this.thirdPartySyncService.fullSync()
        : await this.thirdPartySyncService.incrementalSync();

      logger.info(`Sincronización manual completada: ${result.processed} procesados, ${result.errors} errores`);
      return result;
    } catch (error) {
      logger.error('Error en sincronización manual de terceros:', error);
      throw error;
    }
  }

  /**
   * Ejecuta sincronización manual de cuentas contables
   */
  async manualChartOfAccountsSync(fullSync = false) {
    try {
      logger.info(`Ejecutando sincronización manual de cuentas (completa: ${fullSync})`);
      const result = fullSync
        ? await this.chartOfAccountsSyncService.fullSync()
        : await this.chartOfAccountsSyncService.incrementalSync();

      logger.info(`Sincronización manual de cuentas completada: ${result.processed} procesadas, ${result.errors} errores`);
      return result;
    } catch (error) {
      logger.error('Error en sincronización manual de cuentas:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de sincronización de terceros
   */
  async getThirdPartiesStats() {
    try {
      return await this.thirdPartySyncService.getSyncStats();
    } catch (error) {
      logger.error('Error obteniendo estadísticas de terceros:', error);
      return null;
    }
  }

  /**
   * Obtiene estadísticas de sincronización de cuentas contables
   */
  async getChartOfAccountsStats() {
    try {
      return await this.chartOfAccountsSyncService.getSyncStats();
    } catch (error) {
      logger.error('Error obteniendo estadísticas de cuentas:', error);
      return null;
    }
  }

  /**
   * Ejecuta sincronización manual de productos
   */
  async manualProductsSync(fullSync = false) {
    try {
      logger.info(`Ejecutando sincronización manual de productos (completa: ${fullSync})`);
      const result = fullSync
        ? await this.productSyncService.fullSync()
        : await this.productSyncService.incrementalSync();

      logger.info(`Sincronización manual de productos completada: ${result.processed} procesados, ${result.errors} errores`);
      return result;
    } catch (error) {
      logger.error('Error en sincronización manual de productos:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de sincronización de productos
   */
  async getProductsStats() {
    try {
      return await this.productSyncService.getSyncStats();
    } catch (error) {
      logger.error('Error obteniendo estadísticas de productos:', error);
      return null;
    }
  }

  /**
   * Obtiene configuración de sincronización de productos
   */
  getProductsConfig() {
    try {
      return this.productSyncService.getConfig();
    } catch (error) {
      logger.error('Error obteniendo configuración de productos:', error);
      return null;
    }
  }

  /**
   * Obtiene configuración de sincronización de cuentas
   */
  getChartOfAccountsConfig() {
    try {
      return this.chartOfAccountsSyncService.getConfig();
    } catch (error) {
      logger.error('Error obteniendo configuración de cuentas:', error);
      return null;
    }
  }
}

module.exports = SyncService;
