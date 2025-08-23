const FirebirdClient = require('../database/firebirdClient');
const SupabaseClient = require('../database/supabaseClient');
const DataMapper = require('./dataMapper');
const ThirdPartySyncService = require('./thirdPartySyncService');
const ChartOfAccountsSyncService = require('./chartOfAccountsSyncService');
const ProductSyncService = require('./productSyncService');
const logger = require('../utils/logger');

class SyncService {
  constructor() {
    this.firebirdClient = new FirebirdClient();
    this.supabaseClient = new SupabaseClient();
    this.dataMapper = new DataMapper();
    this.thirdPartySyncService = new ThirdPartySyncService();
    this.chartOfAccountsSyncService = new ChartOfAccountsSyncService();
    this.productSyncService = new ProductSyncService();

    // Configuración de intervalos de sincronización
    this.syncIntervals = {
      thirdParties: null, // Intervalo para sincronización de terceros
      chartOfAccounts: null, // Intervalo para sincronización de cuentas
      products: null, // Intervalo para sincronización de productos
    };

    // Configuración de tiempos (en milisegundos)
    this.syncConfig = {
      thirdPartiesInterval: (parseInt(process.env.THIRD_PARTIES_SYNC_INTERVAL) || 30) * 60 * 1000,
      chartOfAccountsInterval: (parseInt(process.env.CHART_OF_ACCOUNTS_SYNC_INTERVAL) || 60) * 60 * 1000,
      productsInterval: (parseInt(process.env.PRODUCTS_SYNC_INTERVAL) || 45) * 60 * 1000,
      initialDelay: (parseInt(process.env.INITIAL_SYNC_DELAY) || 2) * 60 * 1000,
      enableRecovery: process.env.ENABLE_INVOICE_RECOVERY !== 'false', // Por defecto habilitado
      recoveryBatchSize: parseInt(process.env.RECOVERY_BATCH_SIZE) || 10, // Procesar de a 10 facturas
    };
  }

  /**
   * Inicializa el servicio
   */
  async initialize() {
    try {
      await this.firebirdClient.initialize();
      await this.ensureTipdocExists();
      logger.info('Servicio de sincronización inicializado');
    } catch (error) {
      logger.error('Error inicializando servicio:', error);
      throw error;
    }
  }

  /**
   * Verifica que el tipo de documento configurado exista en TIPDOC, si no lo crea
   */
  async ensureTipdocExists() {
    try {
      const documentType = this.dataMapper.getDocumentType();

      const existingType = await this.firebirdClient.query(
        'SELECT * FROM TIPDOC WHERE CLASE = ? AND E = ? AND S = ?',
        [documentType, 1, 1]
      );

      if (existingType.length === 0) {
        logger.info(`Tipo ${documentType} no existe en TIPDOC, creándolo...`);

        // Generar descripción basada en el tipo de documento
        const description = this.generateDocumentDescription(documentType);

        await this.firebirdClient.query(`
          INSERT INTO TIPDOC (
            TIPO, CLASE, E, S, CONSECUTIVO, DESCRIPCION, SIGLA, USERNAME,
            RUTA_FORMATO, OPERAR, NR1, NR2, RES_DIAN, NO_APLICA_NIIF,
            ENVIAFACELECT, PREFIJO_DIAN, RDESDE, RHASTA, CONTINGENCIA_FACT_ELECT,
            APLICA_RESTAURANTE, RUTA_DOC_ELECTRONICO, ESCENARIO_SALUD,
            TIPOCONSUMO, DOC_ELEC_POS, DIST_MANDANTE, ID_N
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          'FP', documentType, 1, 1, 1, description, null, null,
          null, null, null, null, null, 'N', 'N', '', 0, 0, 'N',
          null, null, 0, 'N', 'N', null, null
        ]);

        logger.info(`Tipo ${documentType} creado exitosamente en TIPDOC con consecutivo inicial 1`);
      } else {
        logger.info(`Tipo ${documentType} ya existe en TIPDOC`);
        // Verificar que el consecutivo sea válido
        const currentConsecutive = existingType[0]?.CONSECUTIVO || 1;
        logger.info(`Consecutivo actual en TIPDOC para ${documentType}: ${currentConsecutive}`);
      }
    } catch (error) {
      const documentType = this.dataMapper.getDocumentType();
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
      'NOT': 'NOTA CONTABLE'
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

    // Primero buscar en la tabla sincronizada de Supabase (más rápido)
    for (const nitVariation of variations) {
      try {
        const { data, error } = await this.supabaseClient.client
          .from('invoice_third_parties')
          .select('id_n')
          .eq('id_n', nitVariation)
          .single();

        if (!error && data) {
          logger.info(`Tercero encontrado en tabla sincronizada: ${originalNit} -> ${nitVariation}`);
          return nitVariation;
        }
      } catch (error) {
        logger.debug(`Tercero ${nitVariation} no encontrado en tabla sincronizada`);
      }
    }

    // Si no se encuentra en Supabase, buscar directamente en Firebird como fallback
    for (const nitVariation of variations) {
      try {
        const result = await this.firebirdClient.query(
          'SELECT ID_N FROM CUST WHERE ID_N = ?',
          [nitVariation]
        );

        if (result.length > 0) {
          logger.info(`Tercero encontrado en Firebird (fallback): ${originalNit} -> ${nitVariation}`);
          return nitVariation;
        }
      } catch (error) {
        logger.warn(`Error buscando tercero ${nitVariation} en Firebird:`, error.message);
      }
    }

    logger.warn(`Tercero no encontrado con ninguna variación de: ${originalNit}`);
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

      // Verificar y ajustar NITs de terceros
      const validatedInvoiceData = await this.validateAndFixThirdParties(invoiceData);

      // Obtener próximo batch
      const batch = await this.getNextBatch();

      // Mapear datos con NITs validados
      const carproenData = this.dataMapper.mapToCarproen(validatedInvoiceData, batch);
      const carprodeData = this.dataMapper.mapToCarprode(validatedInvoiceData, batch);

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

      // Actualizar estado en Supabase como exitoso
      await this.supabaseClient.updateInvoiceStatus(invoice.id, 'SINCRONIZADO', 'Ok');

      logger.info(`Factura ${invoice.invoice_number} procesada exitosamente con batch ${batch}`);

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
   * Valida y corrige los NITs de terceros en los datos de la factura
   * @param {Object} invoiceData - Datos de la factura
   * @returns {Promise<Object>} - Datos de la factura con NITs corregidos
   */
  async validateAndFixThirdParties(invoiceData) {
    const { invoice, entries } = invoiceData;

    // Validar NIT principal de la factura
    if (invoice.num_identificacion) {
      const validNit = await this.findExistingThird(invoice.num_identificacion);
      if (validNit) {
        invoice.num_identificacion = validNit;
        logger.info(`NIT principal corregido: ${invoice.num_identificacion} -> ${validNit}`);
      } else {
        logger.warn(`NIT principal no encontrado en CUST: ${invoice.num_identificacion}`);
        throw new Error(`Tercero no encontrado en CUST: ${invoice.num_identificacion}`);
      }
    }

    // Validar NITs en entradas contables
    for (const entry of entries) {
      if (entry.third_party_nit) {
        const validNit = await this.findExistingThird(entry.third_party_nit);
        if (validNit) {
          if (validNit !== entry.third_party_nit) {
            logger.info(`NIT de entrada contable corregido: ${entry.third_party_nit} -> ${validNit}`);
            entry.third_party_nit = validNit;
          }
        } else {
          // Si no se encuentra, usar el NIT principal de la factura
          logger.warn(`NIT de entrada contable no encontrado: ${entry.third_party_nit}, usando NIT principal`);
          entry.third_party_nit = invoice.num_identificacion;
        }
      } else {
        // Si no tiene NIT, usar el de la factura
        entry.third_party_nit = invoice.num_identificacion;
      }
    }

    return { invoice, entries, items: invoiceData.items };
  }

  /**
   * Inserta un registro en CARPROEN
   */
  async insertCarproen(transaction, data) {
    try {
      const fields = Object.keys(data).join(', ');
      const placeholders = Object.keys(data).map(() => '?').join(', ');
      const values = Object.values(data);

      const sql = `INSERT INTO CARPROEN (${fields}) VALUES (${placeholders})`;

      logger.debug('Insertando en CARPROEN:', { sql, values });

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
   * Inicia el servicio de escucha y sincronizaciones en segundo plano
   */
  async start() {
    try {
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
      this.supabaseClient.setupRealtimeListener(async (invoice) => {
        await this.processApprovedInvoice(invoice);
      });

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
