/**
 * Script de prueba para inserción directa en Firebird (IP/IPDET/ITEMACT)
 * NO usa Supabase, solo prueba la inserción directa en Firebird
 */

const FirebirdClient = require('../database/firebirdClient');
const InventoryMapper = require('../services/inventoryMapper');
const ThirdPartyCreationService = require('../services/thirdPartyCreationService');
const logger = require('../utils/logger');

async function testDirectFirebirdInventory() {
  const firebirdClient = new FirebirdClient();
  const inventoryMapper = new InventoryMapper(firebirdClient);
  const thirdPartyService = new ThirdPartyCreationService(firebirdClient);

  try {
    logger.info('=== PRUEBA DE INSERCIÓN DIRECTA EN FIREBIRD (IP/IPDET/ITEMACT) ===');

    // Conectar a Firebird
    await firebirdClient.initialize();
    logger.info('✓ Conectado a Firebird');

    // 1. Verificar/crear tipo de documento EA (máximo 2 caracteres)
    logger.info('\n1. Verificando tipo de documento EA...');
    const documentType = 'EA'; // Firebird TIPO es VARCHAR(2)
    
    const tipdocExists = await firebirdClient.query(
      'SELECT FIRST 1 TIPO FROM TIPDOC WHERE TIPO = ?',
      [documentType]
    );

    if (tipdocExists.length === 0) {
      logger.info(`Creando tipo de documento ${documentType}...`);
      await firebirdClient.query(
        `INSERT INTO TIPDOC (TIPO, DESCRIPCION, CONSECUTIVO, VALOR_INICIAL)
         VALUES (?, ?, ?, ?)`,
        [documentType, 'Entrada Almacén', 1, 1]
      );
      logger.info(`✓ Tipo de documento ${documentType} creado`);
    } else {
      logger.info(`✓ Tipo de documento ${documentType} ya existe`);
    }

    // 2. Obtener siguiente consecutivo
    logger.info('\n2. Obteniendo siguiente consecutivo...');
    const tipdocData = await firebirdClient.query(
      'SELECT CONSECUTIVO FROM TIPDOC WHERE TIPO = ?',
      [documentType]
    );
    const consecutiveNumber = tipdocData[0].CONSECUTIVO;
    logger.info(`✓ Consecutivo actual: ${consecutiveNumber}`);

    // 2.1. Limpiar registros de prueba anteriores con este consecutivo
    logger.info('\n2.1. Limpiando registros de prueba anteriores...');

    // Eliminar de ITEMACT
    await firebirdClient.query(
      'DELETE FROM ITEMACT WHERE TIPO = ? AND BATCH = ?',
      [documentType, consecutiveNumber]
    );

    // Eliminar de IPDET
    await firebirdClient.query(
      'DELETE FROM IPDET WHERE TIPO = ? AND NUMBER = ?',
      [documentType, consecutiveNumber]
    );

    // Eliminar de IP
    await firebirdClient.query(
      'DELETE FROM IP WHERE TIPO = ? AND NUMBER = ?',
      [documentType, consecutiveNumber]
    );

    logger.info('✓ Registros de prueba anteriores eliminados (si existían)');

    // 3. Obtener productos existentes en Firebird
    logger.info('\n3. Obteniendo productos existentes en Firebird...');
    const existingProducts = await firebirdClient.query(
      'SELECT FIRST 2 ITEM, DESCRIPCION FROM ITEM WHERE ITEM IS NOT NULL ORDER BY ITEM',
      []
    );

    if (existingProducts.length < 2) {
      throw new Error('No hay suficientes productos en Firebird para la prueba');
    }

    logger.info(`✓ Productos encontrados: ${existingProducts.map(p => p.ITEM).join(', ')}`);

    // 4. Datos de prueba (simulando una factura de inventario)
    logger.info('\n4. Preparando datos de prueba...');
    const mockInvoice = {
      invoice_number: `TEST-EA-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      num_identificacion: '900672435', // NIT del proveedor
      billing_name: 'PROVEEDOR DE PRUEBA',
      subtotal: 100000,
      tax: 19000,
      total: 119000
    };

    const mockItems = [
      {
        description: `${existingProducts[0].ITEM} - ${existingProducts[0].DESCRIPCION}`,
        quantity: 10,
        unit_price: 5000,
        total_price: 50000
      },
      {
        description: `${existingProducts[1].ITEM} - ${existingProducts[1].DESCRIPCION}`,
        quantity: 5,
        unit_price: 10000,
        total_price: 50000
      }
    ];

    logger.info(`✓ Factura: ${mockInvoice.invoice_number}`);
    logger.info(`✓ Items: ${mockItems.length}`);
    logger.info(`✓ Total: $${mockInvoice.total}`);

    // 5. Verificar/crear tercero (proveedor)
    logger.info('\n5. Verificando/creando tercero...');
    const idN = mockInvoice.num_identificacion.split('-')[0]; // Extraer ID_N sin guión

    const existingThirdParty = await firebirdClient.query(
      'SELECT FIRST 1 ID_N FROM CUST WHERE ID_N = ?',
      [idN]
    );

    if (existingThirdParty.length === 0) {
      logger.info(`Tercero ${idN} no existe, creando...`);
      const invoiceData = {
        invoice: mockInvoice
      };

      await thirdPartyService.createThirdPartyFromInvoice(invoiceData);
      logger.info(`✓ Tercero ${idN} creado como proveedor`);
    } else {
      logger.info(`✓ Tercero ${idN} ya existe`);
    }

    // 6. Obtener valores por defecto
    logger.info('\n6. Obteniendo valores por defecto...');
    const ipDefaults = await inventoryMapper.getDefaultValuesForIP();
    const ipdetDefaults = await inventoryMapper.getDefaultValuesForIPDET();
    logger.info('✓ Valores por defecto obtenidos');

    // 7. Mapear datos a IP (encabezado)
    logger.info('\n7. Mapeando datos a IP (encabezado)...');
    const ipData = await inventoryMapper.mapToIP(
      mockInvoice,
      consecutiveNumber,
      documentType,
      ipDefaults
    );
    logger.info(`✓ IP mapeado: TIPO=${ipData.TIPO}, NUMBER=${ipData.NUMBER}, ID_N=${ipData.ID_N}`);

    // 8. Insertar en IP
    logger.info('\n8. Insertando en IP...');
    const ipFields = Object.keys(ipData).join(', ');
    const ipPlaceholders = Object.keys(ipData).map(() => '?').join(', ');
    const ipValues = Object.values(ipData);

    await firebirdClient.query(
      `INSERT INTO IP (${ipFields}) VALUES (${ipPlaceholders})`,
      ipValues
    );
    logger.info('✓ Registro insertado en IP');

    // 9. Insertar items en IPDET e ITEMACT
    logger.info('\n9. Insertando items en IPDET e ITEMACT...');
    
    for (let i = 0; i < mockItems.length; i++) {
      const item = mockItems[i];
      const conteo = i + 1;

      // Mapear a IPDET
      const ipdetData = await inventoryMapper.mapToIPDET(
        item,
        conteo,
        consecutiveNumber,
        documentType,
        ipdetDefaults
      );

      // Insertar en IPDET
      const ipdetFields = Object.keys(ipdetData).join(', ');
      const ipdetPlaceholders = Object.keys(ipdetData).map(() => '?').join(', ');
      const ipdetValues = Object.values(ipdetData);

      await firebirdClient.query(
        `INSERT INTO IPDET (${ipdetFields}) VALUES (${ipdetPlaceholders})`,
        ipdetValues
      );
      logger.info(`  ✓ Item ${conteo} insertado en IPDET: ${item.description}`);

      // Mapear a ITEMACT
      const itemactData = await inventoryMapper.mapToITEMACT(
        item,
        mockInvoice,
        consecutiveNumber,
        documentType,
        ipDefaults,
        ipdetDefaults
      );

      // Insertar en ITEMACT
      const itemactFields = Object.keys(itemactData).join(', ');
      const itemactPlaceholders = Object.keys(itemactData).map(() => '?').join(', ');
      const itemactValues = Object.values(itemactData);

      await firebirdClient.query(
        `INSERT INTO ITEMACT (${itemactFields}) VALUES (${itemactPlaceholders})`,
        itemactValues
      );
      logger.info(`  ✓ Item ${conteo} insertado en ITEMACT (Kardex)`);
    }

    logger.info(`✓ ${mockItems.length} items insertados correctamente`);

    // 10. Actualizar consecutivo
    logger.info('\n10. Actualizando consecutivo...');
    await firebirdClient.query(
      'UPDATE TIPDOC SET CONSECUTIVO = ? WHERE TIPO = ?',
      [consecutiveNumber + 1, documentType]
    );
    logger.info(`✓ Consecutivo actualizado a ${consecutiveNumber + 1}`);

    // 11. Verificar datos insertados
    logger.info('\n11. Verificando datos insertados en Firebird...');
    
    const ipVerify = await firebirdClient.query(
      'SELECT * FROM IP WHERE TIPO = ? AND NUMBER = ?',
      [documentType, consecutiveNumber]
    );
    logger.info(`✓ IP: ${ipVerify.length} registro(s) encontrado(s)`);

    const ipdetVerify = await firebirdClient.query(
      'SELECT * FROM IPDET WHERE TIPO = ? AND NUMBER = ?',
      [documentType, consecutiveNumber]
    );
    logger.info(`✓ IPDET: ${ipdetVerify.length} registro(s) encontrado(s)`);

    const itemactVerify = await firebirdClient.query(
      'SELECT * FROM ITEMACT WHERE TIPO = ? AND BATCH = ?',
      [documentType, consecutiveNumber]
    );
    logger.info(`✓ ITEMACT: ${itemactVerify.length} registro(s) encontrado(s)`);

    logger.info('\n=== ✅ PRUEBA COMPLETADA EXITOSAMENTE ===');
    logger.info(`\nDatos insertados:`);
    logger.info(`- Tipo de documento: ${documentType}`);
    logger.info(`- Número consecutivo: ${consecutiveNumber}`);
    logger.info(`- Factura: ${mockInvoice.invoice_number}`);
    logger.info(`- Items: ${mockItems.length}`);
    logger.info(`- Total: $${mockInvoice.total}`);

  } catch (error) {
    logger.error('❌ ERROR EN PRUEBA:', error);
    throw error;
  } finally {
    await firebirdClient.close();
    logger.info('\nConexión a Firebird cerrada');
  }
}

// Ejecutar prueba
testDirectFirebirdInventory()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error('Error fatal:', error);
    process.exit(1);
  });

