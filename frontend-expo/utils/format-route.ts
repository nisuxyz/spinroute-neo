/**
 * Route formatting utilities for distance and duration
 * Used by RouteInfoSheet to display route information
 */

/**
 * Format distance in meters to human-readable string
 * @param meters - Distance in meters
 * @param units - Unit system ('metric' or 'imperial')
 * @returns Formatted distance string (e.g., "1.5 km", "0.9 mi", "150 m", "500 ft")
 */
export function formatDistance(meters: number, units: 'metric' | 'imperial' = 'metric'): string {
  if (units === 'imperial') {
    const miles = meters * 0.000621371;
    return miles < 0.1 ? `${Math.round(meters * 3.28084)} ft` : `${miles.toFixed(1)} mi`;
  }
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Format duration in seconds to human-readable string
 * @param seconds - Duration in seconds
 * @returns Formatted duration string (e.g., "2h 30m", "45m")
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
