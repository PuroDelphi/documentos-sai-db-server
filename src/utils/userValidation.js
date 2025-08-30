const logger = require('./logger');

/**
 * Valida que un UUID tenga el formato correcto
 * @param {string} uuid - UUID a validar
 * @returns {boolean} - true si es válido, false si no
 */
function isValidUUID(uuid) {
  if (!uuid || typeof uuid !== 'string') {
    return false;
  }
  
  // Regex para validar UUID v4
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Valida y obtiene el USER_UUID de las variables de entorno
 * @returns {string} - UUID del usuario validado
 * @throws {Error} - Si el UUID no está configurado o es inválido
 */
function validateAndGetUserUUID() {
  const userUUID = process.env.USER_UUID;
  
  if (!userUUID) {
    throw new Error(
      'USER_UUID es obligatorio. Por favor configura un UUID válido en el archivo .env\n' +
      'Ejemplo: USER_UUID=550e8400-e29b-41d4-a716-446655440000'
    );
  }
  
  if (!isValidUUID(userUUID)) {
    throw new Error(
      `USER_UUID tiene un formato inválido: "${userUUID}"\n` +
      'Debe ser un UUID válido. Ejemplo: 550e8400-e29b-41d4-a716-446655440000'
    );
  }
  
  logger.info(`Sistema configurado para usuario: ${userUUID}`);
  return userUUID;
}

/**
 * Genera un filtro SQL para user_id
 * @param {string} tableAlias - Alias de la tabla (opcional)
 * @returns {string} - Condición SQL para filtrar por user_id
 */
function getUserFilter(tableAlias = '') {
  const userUUID = validateAndGetUserUUID();
  const prefix = tableAlias ? `${tableAlias}.` : '';
  return `${prefix}user_id = '${userUUID}'`;
}

/**
 * Genera parámetros para consultas preparadas
 * @returns {object} - Objeto con el UUID del usuario
 */
function getUserParams() {
  const userUUID = validateAndGetUserUUID();
  return { user_id: userUUID };
}

module.exports = {
  isValidUUID,
  validateAndGetUserUUID,
  getUserFilter,
  getUserParams
};
