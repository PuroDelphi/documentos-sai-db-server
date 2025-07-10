/**
 * Convierte un número a su representación en letras en español colombiano
 * @param {number} amount - El monto a convertir
 * @returns {string} - El monto en letras
 */
function convertToWords(amount) {
  try {
    if (!amount || isNaN(amount)) {
      return 'CERO PESOS M/CTE';
    }

    // Implementación simple de conversión a letras
    const integerPart = Math.floor(amount);
    const decimalPart = Math.round((amount - integerPart) * 100);

    let result = convertNumberToWords(integerPart).toUpperCase();

    // Agregar centavos si existen
    if (decimalPart > 0) {
      result += ` PESOS CON ${convertNumberToWords(decimalPart).toUpperCase()} CENTAVOS. M/CTE`;
    } else {
      result += ' PESOS M/CTE';
    }

    // Limitar longitud para evitar truncamiento
    return result.substring(0, 200);
  } catch (error) {
    console.error('Error convirtiendo número a letras:', error);
    return 'ERROR EN CONVERSION PESOS M/CTE';
  }
}

/**
 * Convierte un número entero a palabras
 * @param {number} num - Número a convertir
 * @returns {string} - Número en palabras
 */
function convertNumberToWords(num) {
  if (num === 0) return 'cero';

  const ones = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
  const teens = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
  const tens = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
  const hundreds = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

  if (num < 10) return ones[num];
  if (num < 20) return teens[num - 10];
  if (num < 100) {
    const ten = Math.floor(num / 10);
    const one = num % 10;
    if (ten === 2 && one > 0) return 'veinti' + ones[one];
    return tens[ten] + (one > 0 ? ' y ' + ones[one] : '');
  }
  if (num < 1000) {
    const hundred = Math.floor(num / 100);
    const rest = num % 100;
    if (num === 100) return 'cien';
    return hundreds[hundred] + (rest > 0 ? ' ' + convertNumberToWords(rest) : '');
  }
  if (num < 1000000) {
    const thousand = Math.floor(num / 1000);
    const rest = num % 1000;
    const thousandText = thousand === 1 ? 'mil' : convertNumberToWords(thousand) + ' mil';
    return thousandText + (rest > 0 ? ' ' + convertNumberToWords(rest) : '');
  }
  if (num < 1000000000) {
    const million = Math.floor(num / 1000000);
    const rest = num % 1000000;
    const millionText = million === 1 ? 'un millón' : convertNumberToWords(million) + ' millones';
    return millionText + (rest > 0 ? ' ' + convertNumberToWords(rest) : '');
  }

  return 'número muy grande';
}

module.exports = {
  convertToWords
};
