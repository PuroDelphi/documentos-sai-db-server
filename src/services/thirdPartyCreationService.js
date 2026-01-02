const logger = require('../utils/logger');

/**
 * Servicio para crear terceros automáticamente en Firebird (CUST y SHIPTO)
 * cuando no existen durante la sincronización de facturas
 */
class ThirdPartyCreationService {
  constructor(firebirdClient) {
    this.firebirdClient = firebirdClient;
  }

  /**
   * Crea un tercero en Firebird basándose en los datos de la factura de Supabase
   * @param {Object} invoiceData - Datos de la factura de Supabase
   * @returns {Promise<string>} - ID_N del tercero creado
   */
  async createThirdPartyFromInvoice(invoiceData) {
    const { invoice } = invoiceData;

    logger.info(`Creando tercero automáticamente: ${invoice.num_identificacion}`);

    try {
      // Obtener valores por defecto de la BD
      const defaults = await this.getDefaultValues();

      // Preparar datos para CUST
      const custData = this.mapInvoiceToCust(invoice, defaults);

      // Preparar datos para SHIPTO (sucursal 0)
      const shiptoData = this.mapInvoiceToShipto(invoice, defaults);

      // Insertar en transacción
      await this.firebirdClient.transaction(async (transaction) => {
        // Insertar en CUST
        await this.insertCust(transaction, custData);

        // Insertar en SHIPTO (sucursal 0 - obligatoria)
        // Nota: Ahora ID_N no contiene guión, por lo que el trigger SHIPTO_AIU0 no debería fallar
        await this.insertShipto(transaction, shiptoData);
      });

      logger.info(`Tercero creado exitosamente: ID_N=${custData.ID_N}, NIT=${custData.NIT}`);

      // IMPORTANTE: Retornar el ID_N (sin guión)
      // porque CARPROEN.ID_N tiene FK a CUST.ID_N (sin guión)
      // El sistema luego buscará el tercero y encontrará el ID_N correcto
      return custData.ID_N;

    } catch (error) {
      logger.error(`Error creando tercero ${invoice.num_identificacion}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene valores por defecto de registros existentes en CUST
   * @returns {Promise<Object>} - Valores por defecto
   */
  async getDefaultValues() {
    try {
      const result = await this.firebirdClient.query(`
        SELECT FIRST 1
          E, S, GRAVABLE, RETENEDOR, CLIENTE, PROVEEDOR, OTRO, EMPLEADO,
          ZONA, PAIS, DEPARTAMENTO, CITY, EMAIL, PHONE1, IDVEND
        FROM CUST
        WHERE PROVEEDOR = 'S'
        ORDER BY ID_N
      `);

      if (result.length > 0) {
        return {
          E: result[0].E || 1,
          S: result[0].S || 1,
          GRAVABLE: result[0].GRAVABLE || 'True',
          RETENEDOR: result[0].RETENEDOR || 'False',
          CLIENTE: 'False',
          PROVEEDOR: 'True',
          OTRO: 'False',
          EMPLEADO: 'False',
          ZONA: result[0].ZONA || 1,
          PAIS: result[0].PAIS?.trim() || 'COLOMBIA',
          DEPARTAMENTO: result[0].DEPARTAMENTO?.trim() || 'VALLE DEL CAUCA',
          CITY: result[0].CITY?.trim() || 'CALI',
          EMAIL: result[0].EMAIL?.trim() || 'usuariosincorreo@gmail.com',
          PHONE1: result[0].PHONE1?.trim() || '0000000000',
          ID_VEND: result[0].IDVEND || 12
        };
      }

      // Valores por defecto si no hay registros
      return {
        E: 1,
        S: 1,
        GRAVABLE: 'True',
        RETENEDOR: 'False',
        CLIENTE: 'False',
        PROVEEDOR: 'True',
        OTRO: 'False',
        EMPLEADO: 'False',
        ZONA: 1,
        PAIS: 'COLOMBIA',
        DEPARTAMENTO: 'VALLE DEL CAUCA',
        CITY: 'CALI',
        EMAIL: 'usuariosincorreo@gmail.com',
        PHONE1: '0000000000',
        ID_VEND: 1
      };
    } catch (error) {
      logger.error('Error obteniendo valores por defecto:', error);
      throw error;
    }
  }

  /**
   * Mapea datos de factura de Supabase a estructura de CUST
   * @param {Object} invoice - Datos de la factura
   * @param {Object} defaults - Valores por defecto
   * @returns {Object} - Datos para insertar en CUST
   */
  mapInvoiceToCust(invoice, defaults) {
    const cleanString = (value, maxLength) => {
      if (!value) return '';
      return value.toString().trim().substring(0, maxLength).toUpperCase();
    };

    // Separar NIT del dígito de verificación
    // Ejemplo: "14676263-8" -> ID_N: "14676263", NIT: "14676263-8"
    const nitCompleto = cleanString(invoice.num_identificacion, 30);
    let idN = nitCompleto;

    // Si el NIT contiene guión, separar la parte antes del guión para ID_N
    if (nitCompleto.includes('-')) {
      idN = nitCompleto.split('-')[0].trim();
    }

    // Intentar obtener teléfono de la factura, si no usar default
    const phone = cleanString(invoice.billing_phone || invoice.phone, 40) || defaults.PHONE1;

    return {
      ID_N: idN, // Solo números, sin guión ni dígito de verificación
      NIT: nitCompleto, // NIT completo con guión (si lo tiene)
      COMPANY: cleanString(invoice.billing_name, 35) || 'CLIENTE NUEVO',
      COMPANY_EXTENDIDO: cleanString(invoice.billing_name, 80) || 'CLIENTE NUEVO',
      ADDR1: cleanString(invoice.billing_street, 80) || 'SIN DIRECCIÓN',
      CITY: cleanString(invoice.billing_city, 30) || defaults.CITY,
      DEPARTAMENTO: cleanString(invoice.billing_state, 40) || defaults.DEPARTAMENTO,
      PAIS: cleanString(invoice.billing_country, 30) || defaults.PAIS,
      EMAIL: cleanString(invoice.billing_email || invoice.email, 250) || defaults.EMAIL,
      PHONE1: phone,
      PHONE3: phone, // Usar el mismo teléfono para PHONE3 (campo requerido por trigger)
      E: defaults.E,
      S: defaults.S,
      GRAVABLE: defaults.GRAVABLE,
      RETENEDOR: defaults.RETENEDOR,
      CLIENTE: defaults.CLIENTE,
      PROVEEDOR: defaults.PROVEEDOR,
      OTRO: defaults.OTRO,
      EMPLEADO: defaults.EMPLEADO,
      ZONA: defaults.ZONA,
      IDVEND: 99, // Vendedor por defecto: 99
      FECHA_CREACION: new Date(),

      // Nuevos campos según especificaciones
      CLITIP: 0, // Tipo Contribuyente: 0 = Persona Jurídica
      ID_TIPOCARTERA: 'CC', // Tipo Cartera: CC
      REGIMEN: '48', // Tipo Régimen: 48
      ACTIVIDAD: 1, // Actividad económica por defecto (se puede mejorar según factura)
      RESIDENTE: 'S', // Tipo procedencia: Residente
      INACTIVO: 'N' // Inactivo: False
    };
  }

  /**
   * Mapea datos de factura de Supabase a estructura de SHIPTO
   * @param {Object} invoice - Datos de la factura
   * @param {Object} defaults - Valores por defecto
   * @returns {Object} - Datos para insertar en SHIPTO
   */
  mapInvoiceToShipto(invoice, defaults) {
    const cleanString = (value, maxLength) => {
      if (!value) return '';
      return value.toString().trim().substring(0, maxLength).toUpperCase();
    };

    // Separar NIT del dígito de verificación (igual que en CUST)
    // Ejemplo: "14676263-8" -> ID_N: "14676263"
    const nitCompleto = cleanString(invoice.num_identificacion, 30);
    let idN = nitCompleto;

    // Si el NIT contiene guión, separar la parte antes del guión para ID_N
    if (nitCompleto.includes('-')) {
      idN = nitCompleto.split('-')[0].trim();
    }

    // Intentar obtener teléfono de la factura, si no usar default
    const phone = cleanString(invoice.billing_phone || invoice.phone, 40) || defaults.PHONE1;

    return {
      ID_N: idN, // Solo números, sin guión ni dígito de verificación (debe coincidir con CUST.ID_N)
      SUCCLIENTE: 0, // Sucursal principal siempre es 0
      DESCRIPCION: 'OFICINA PRINCIPAL',
      COMPANY: cleanString(invoice.billing_name, 35) || 'CLIENTE NUEVO',
      COMPANY_EXTENDIDO: cleanString(invoice.billing_name, 80) || 'CLIENTE NUEVO',
      ADDR1: cleanString(invoice.billing_street, 80) || 'SIN DIRECCIÓN',
      CITY: cleanString(invoice.billing_city, 30) || defaults.CITY,
      DEPARTAMENTO: cleanString(invoice.billing_state, 40) || defaults.DEPARTAMENTO,
      PAIS: cleanString(invoice.billing_country, 30) || defaults.PAIS,
      EMAIL: cleanString(invoice.billing_email || invoice.email, 250) || defaults.EMAIL,
      PHONE1: phone,
      PHONE3: phone, // Usar el mismo teléfono para PHONE3
      ZONA: defaults.ZONA,
      ID_VEND: 99, // Vendedor por defecto: 99
      ESTADO: 'ACTIVO',
      TIPO_ID: '31' // Tipo documento: 31 = NIT
    };
  }

  /**
   * Inserta un registro en CUST
   * @param {Object} transaction - Transacción de Firebird
   * @param {Object} data - Datos a insertar
   */
  async insertCust(transaction, data) {
    try {
      const fields = Object.keys(data).join(', ');
      const placeholders = Object.keys(data).map(() => '?').join(', ');
      const values = Object.values(data);

      const sql = `INSERT INTO CUST (${fields}) VALUES (${placeholders})`;

      logger.debug('Insertando en CUST:', { sql, id_n: data.ID_N });

      return new Promise((resolve, reject) => {
        transaction.query(sql, values, (err, result) => {
          if (err) {
            logger.error('Error insertando en CUST:', {
              error: err.message,
              sql,
              id_n: data.ID_N
            });
            reject(err);
          } else {
            logger.info(`Tercero insertado en CUST: ${data.ID_N}`);
            resolve(result);
          }
        });
      });
    } catch (error) {
      logger.error('Error preparando inserción CUST:', error);
      throw error;
    }
  }

  /**
   * Inserta un registro en SHIPTO
   * @param {Object} transaction - Transacción de Firebird
   * @param {Object} data - Datos a insertar
   */
  async insertShipto(transaction, data) {
    try {
      const fields = Object.keys(data).join(', ');
      const placeholders = Object.keys(data).map(() => '?').join(', ');
      const values = Object.values(data);

      const sql = `INSERT INTO SHIPTO (${fields}) VALUES (${placeholders})`;

      logger.debug('Insertando en SHIPTO:', { sql, id_n: data.ID_N, sucursal: data.SUCCLIENTE });

      return new Promise((resolve, reject) => {
        transaction.query(sql, values, (err, result) => {
          if (err) {
            logger.error('Error insertando en SHIPTO:', {
              error: err.message,
              sql,
              id_n: data.ID_N,
              sucursal: data.SUCCLIENTE
            });
            reject(err);
          } else {
            logger.info(`Sucursal insertada en SHIPTO: ${data.ID_N} - Sucursal ${data.SUCCLIENTE}`);
            resolve(result);
          }
        });
      });
    } catch (error) {
      logger.error('Error preparando inserción SHIPTO:', error);
      throw error;
    }
  }
}

module.exports = ThirdPartyCreationService;

