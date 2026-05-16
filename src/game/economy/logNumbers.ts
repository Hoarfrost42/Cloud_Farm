export const ENDGAME_WEATHER_EXPONENT = 308;
export const ENDGAME_WEATHER_VALUE = 1e308;
export const MINIMUM_NUMBER_EXPONENT = -324;
export const LOG_SUM_DIRECT_THRESHOLD = 16;

/**
 * Converts a positive finite number into a base-10 exponent.
 */
export function log10Safe(value: number) {
  if (value <= 0 || !Number.isFinite(value)) {
    return Number.NEGATIVE_INFINITY;
  }

  return Math.log10(value);
}

/**
 * Converts a base-10 exponent back into a JS number while clamping v13 endgame bounds.
 */
export function pow10Clamped(exponent: number) {
  if (!Number.isFinite(exponent)) {
    return exponent === Number.NEGATIVE_INFINITY ? 0 : ENDGAME_WEATHER_VALUE;
  }

  if (exponent >= ENDGAME_WEATHER_EXPONENT) {
    return ENDGAME_WEATHER_VALUE;
  }

  if (exponent <= MINIMUM_NUMBER_EXPONENT) {
    return 0;
  }

  return 10 ** exponent;
}

/**
 * Adds two base-10 log-space values without forcing huge intermediate numbers.
 */
export function logSumExp10(leftExponent: number, rightExponent: number) {
  if (!Number.isFinite(leftExponent)) {
    return rightExponent;
  }

  if (!Number.isFinite(rightExponent)) {
    return leftExponent;
  }

  const largerExponent = Math.max(leftExponent, rightExponent);
  const smallerExponent = Math.min(leftExponent, rightExponent);
  if (largerExponent - smallerExponent > LOG_SUM_DIRECT_THRESHOLD) {
    return largerExponent;
  }

  return largerExponent + Math.log10(1 + 10 ** (smallerExponent - largerExponent));
}

