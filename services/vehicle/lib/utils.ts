// Unit conversion constants
const KM_TO_MI = 0.621371;
const MI_TO_KM = 1.60934;

/**
 * Convert kilometers to miles
 */
export function kmToMiles(km: number): number {
  return km * KM_TO_MI;
}

/**
 * Convert miles to kilometers
 */
export function milesToKm(miles: number): number {
  return miles * MI_TO_KM;
}

/**
 * Convert distance based on unit
 */
export function convertDistance(
  distance: number,
  fromUnit: 'km' | 'mi',
  toUnit: 'km' | 'mi',
): number {
  if (fromUnit === toUnit) return distance;
  return fromUnit === 'km' ? kmToMiles(distance) : milesToKm(distance);
}

/**
 * Convert mileage values in object
 */
export function convertMileageInObject<T extends Record<string, any>>(
  obj: T,
  fields: string[],
  toUnit: 'km' | 'mi',
): T {
  const result = { ...obj } as any;
  for (const field of fields) {
    if (result[field] !== undefined && result[field] !== null) {
      result[field] = toUnit === 'mi' ? kmToMiles(result[field]) : result[field];
    }
  }
  return result as T;
}

/**
 * Validate bike type enum
 */
export function validateBikeType(type: string): boolean {
  const validTypes = ['road', 'mountain', 'hybrid', 'gravel', 'ebike', 'other'];
  return validTypes.includes(type);
}

/**
 * Validate part type enum
 */
export function validatePartType(type: string): boolean {
  const validTypes = [
    'chain',
    'tires',
    'brake_pads',
    'cassette',
    'derailleur',
    'crankset',
    'saddle',
    'handlebar',
    'pedals',
    'other',
  ];
  return validTypes.includes(type);
}

/**
 * Validate maintenance type enum
 */
export function validateMaintenanceType(type: string): boolean {
  const validTypes = ['repair', 'replacement', 'adjustment', 'cleaning', 'inspection', 'other'];
  return validTypes.includes(type);
}

/**
 * Validate unit parameter
 */
export function validateUnit(unit: string): unit is 'km' | 'mi' {
  return unit === 'km' || unit === 'mi';
}

/**
 * Validate positive number
 */
export function validatePositiveNumber(value: number): boolean {
  return typeof value === 'number' && value > 0 && !isNaN(value);
}

/**
 * Verify ownership - throws 403 if mismatch
 */
export function verifyOwnership(resourceUserId: string, contextUserId: string): void {
  if (resourceUserId !== contextUserId) {
    throw new Error('FORBIDDEN');
  }
}

/**
 * Create error response
 */
export function errorResponse(error: string, message: string, details?: any) {
  return {
    error,
    message,
    ...(details && { details }),
  };
}
