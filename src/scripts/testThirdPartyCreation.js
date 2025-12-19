/**
 * Script de prueba para verificar la creación automática de terceros
 * Este script simula una factura con un tercero que NO existe en Firebird
 * y verifica que se cree automáticamente en CUST y SHIPTO
 */

require('dotenv').config();
const FirebirdClient = require('../database/firebirdClient');
const ThirdPartyCreationService = require('../services/thirdPartyCreationService');
const logger = require('../utils/logger');

async function testThirdPartyCreation() {
  const firebirdClient = new FirebirdClient();
  const creationService = new ThirdPartyCreationService(firebirdClient);

  try {
    logger.info('='.repeat(80));
    logger.info('PRUEBA DE CREACIÓN AUTOMÁTICA DE TERCEROS');
    logger.info('='.repeat(80));

    // Inicializar conexión
    await firebirdClient.initialize();
    logger.info('✓ Conexión a Firebird establecida');

    // Datos de prueba - Factura con tercero que NO existe
    const testInvoiceData = {
      invoice: {
        id: 999999,
        invoice_number: 'TEST-AUTO-001',
        date: '2025-01-15',
        billing_name: 'EMPRESA DE PRUEBA AUTOMATICA S.A.S',
        billing_street: 'Calle 123 # 45-67',
        billing_city: 'Bogotá',
        billing_state: 'Cundinamarca',
        billing_zip_code: '110111',
        billing_country: 'Colombia',
        num_identificacion: '999888777-6', // NIT que NO existe
        subtotal: 1000000,
        tax: 190000,
        total: 1190000
      },
      entries: [],
      items: []
    };

    logger.info('\n📋 Datos de prueba:');
    logger.info(`   NIT: ${testInvoiceData.invoice.num_identificacion}`);
    logger.info(`   Nombre: ${testInvoiceData.invoice.billing_name}`);
    logger.info(`   Dirección: ${testInvoiceData.invoice.billing_street}`);
    logger.info(`   Ciudad: ${testInvoiceData.invoice.billing_city}`);
    logger.info(`   Departamento: ${testInvoiceData.invoice.billing_state}`);

    // Verificar que NO existe antes de crear
    logger.info('\n🔍 Verificando que el tercero NO existe...');
    const existsBefore = await firebirdClient.query(
      'SELECT ID_N FROM CUST WHERE ID_N = ?',
      [testInvoiceData.invoice.num_identificacion]
    );

    if (existsBefore.length > 0) {
      logger.warn('⚠️  El tercero YA EXISTE. Eliminándolo para la prueba...');

      // Orden de eliminación: SHIPTO -> CUST -> TRIBUTARIA
      // (SHIPTO tiene FK a CUST, TRIBUTARIA puede tener FK a CUST)

      // 1. Eliminar de SHIPTO primero (por FK)
      await firebirdClient.query(
        'DELETE FROM SHIPTO WHERE ID_N = ?',
        [testInvoiceData.invoice.num_identificacion]
      );

      // 2. Eliminar de CUST
      await firebirdClient.query(
        'DELETE FROM CUST WHERE ID_N = ?',
        [testInvoiceData.invoice.num_identificacion]
      );

      // 3. Eliminar de TRIBUTARIA (si existe)
      try {
        await firebirdClient.query(
          'DELETE FROM TRIBUTARIA WHERE ID_N = ?',
          [testInvoiceData.invoice.num_identificacion]
        );
      } catch (err) {
        // Ignorar si no existe o si hay error de FK
      }

      logger.info('✓ Tercero eliminado para prueba limpia');
    } else {
      logger.info('✓ Tercero NO existe (correcto para la prueba)');
    }

    // CREAR TERCERO AUTOMÁTICAMENTE
    logger.info('\n🚀 Creando tercero automáticamente...');
    const createdNit = await creationService.createThirdPartyFromInvoice(testInvoiceData);
    logger.info(`✓ Tercero creado: ${createdNit}`);

    // VERIFICAR que se creó en CUST
    logger.info('\n✅ Verificando creación en CUST...');
    const custResult = await firebirdClient.query(
      `SELECT ID_N, NIT, COMPANY, COMPANY_EXTENDIDO, ADDR1, CITY,
              DEPARTAMENTO, PAIS, CLIENTE, PROVEEDOR, E, S, IDVEND, ZONA
       FROM CUST WHERE ID_N = ?`,
      [createdNit]
    );

    if (custResult.length === 0) {
      throw new Error('❌ ERROR: Tercero NO se creó en CUST');
    }

    logger.info('✓ Tercero encontrado en CUST:');
    logger.info(`   ID_N: ${custResult[0].ID_N?.trim()}`);
    logger.info(`   NIT: ${custResult[0].NIT?.trim()}`);
    logger.info(`   COMPANY: ${custResult[0].COMPANY?.trim()}`);
    logger.info(`   COMPANY_EXTENDIDO: ${custResult[0].COMPANY_EXTENDIDO?.trim()}`);
    logger.info(`   ADDR1: ${custResult[0].ADDR1?.trim()}`);
    logger.info(`   CITY: ${custResult[0].CITY?.trim()}`);
    logger.info(`   DEPARTAMENTO: ${custResult[0].DEPARTAMENTO?.trim()}`);
    logger.info(`   PAIS: ${custResult[0].PAIS?.trim()}`);
    logger.info(`   CLIENTE: ${custResult[0].CLIENTE?.trim()}`);
    logger.info(`   PROVEEDOR: ${custResult[0].PROVEEDOR?.trim()}`);
    logger.info(`   E: ${custResult[0].E}`);
    logger.info(`   S: ${custResult[0].S}`);
    logger.info(`   IDVEND: ${custResult[0].IDVEND}`);
    logger.info(`   ZONA: ${custResult[0].ZONA}`);

    // VERIFICAR que se creó en SHIPTO (sucursal 0)
    logger.info('\n✅ Verificando creación en SHIPTO (sucursal 0)...');
    const shiptoResult = await firebirdClient.query(
      `SELECT ID_N, SUCCLIENTE, DESCRIPCION, COMPANY, COMPANY_EXTENDIDO, 
              ADDR1, CITY, DEPARTAMENTO, PAIS, ESTADO
       FROM SHIPTO WHERE ID_N = ? AND SUCCLIENTE = 0`,
      [createdNit]
    );

    if (shiptoResult.length === 0) {
      throw new Error('❌ ERROR: Sucursal 0 NO se creó en SHIPTO');
    }

    logger.info('✓ Sucursal 0 encontrada en SHIPTO:');
    logger.info(`   ID_N: ${shiptoResult[0].ID_N?.trim()}`);
    logger.info(`   SUCCLIENTE: ${shiptoResult[0].SUCCLIENTE}`);
    logger.info(`   DESCRIPCION: ${shiptoResult[0].DESCRIPCION?.trim()}`);
    logger.info(`   COMPANY: ${shiptoResult[0].COMPANY?.trim()}`);
    logger.info(`   COMPANY_EXTENDIDO: ${shiptoResult[0].COMPANY_EXTENDIDO?.trim()}`);
    logger.info(`   ADDR1: ${shiptoResult[0].ADDR1?.trim()}`);
    logger.info(`   CITY: ${shiptoResult[0].CITY?.trim()}`);
    logger.info(`   DEPARTAMENTO: ${shiptoResult[0].DEPARTAMENTO?.trim()}`);
    logger.info(`   PAIS: ${shiptoResult[0].PAIS?.trim()}`);
    logger.info(`   ESTADO: ${shiptoResult[0].ESTADO?.trim()}`);

    logger.info('\n' + '='.repeat(80));
    logger.info('✅ PRUEBA EXITOSA - Tercero creado correctamente en CUST y SHIPTO');
    logger.info('='.repeat(80));

  } catch (error) {
    logger.error('\n' + '='.repeat(80));
    logger.error('❌ ERROR EN LA PRUEBA:', error);
    logger.error('='.repeat(80));
    process.exit(1);
  } finally {
    await firebirdClient.close();
    logger.info('\n✓ Conexión cerrada');
  }
}

// Ejecutar prueba
testThirdPartyCreation();

