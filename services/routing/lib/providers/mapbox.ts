/**
 * Mapbox Directions API provider implementation
 */

import type {
  RouteProvider,
  RouteRequest,
  MapboxDirectionsResponse,
  ProviderCapabilities,
} from './base';
import { RouteProfile, BikeType } from './base';
import { config } from '../config';
import { MapboxClient, MapboxApiError } from './mapbox-client';
import type { MapboxDirectionsRequest } from './mapbox-client';
import { createLogger, createRequestLogger } from '../logger';

const logger = createLogger('Mapbox');

export class MapboxProvider implements RouteProvider {
  name = 'mapbox';
  displayName = 'Mapbox';
  capabilities: ProviderCapabilities = {
    profiles: [RouteProfile.WALKING, RouteProfile.CYCLING, RouteProfile.DRIVING],
    bikeTypes: [BikeType.GENERIC], // Mapbox only has generic cycling
    multiModal: false,
    requiresPaidPlan: false,
  };

  private readonly client: MapboxClient;

  constructor() {
    const accessToken = config.mapbox.accessToken;

    if (!accessToken) {
      logger.warn('Mapbox access token not configured');
    }

    this.client = new MapboxClient({
      accessToken: accessToken || '',
      baseUrl: config.mapbox.baseUrl,
      timeout: config.routing.requestTimeout,
    });
  }

  /**
   * Calculate a route using Mapbox Directions API
   */
  async calculateRoute(request: RouteRequest): Promise<MapboxDirectionsResponse> {
    const requestLogger = createRequestLogger(logger, {
      userId: request.userId,
    });

    // Map profile to Mapbox profile
    const mapboxProfile = this.mapProfileToMapbox(request.profile);

    // Build coordinates string (longitude,latitude pairs)
    const coordinates = request.waypoints.map((wp) => `${wp.longitude},${wp.latitude}`).join(';');

    // Build request parameters
    const params: MapboxDirectionsRequest = {
      profile: mapboxProfile,
      coordinates,
      geometries: 'geojson',
      overview: 'full',
      steps: true,
      bannerInstructions: true,
      voiceInstructions: true,
    };

    requestLogger.logStart('Calculating route', {
      profile: mapboxProfile,
      waypointCount: request.waypoints.length,
    });

    try {
      const response = await this.client.getDirections(params);

      // Validate response code
      if (response.code !== 'Ok') {
        const error = new Error(`Mapbox API returned error code: ${response.code}`);
        requestLogger.logError('API returned error code', error, {
          code: response.code,
        });
        throw error;
      }

      requestLogger.logSuccess('Route calculated successfully', {
        routeCount: response.routes?.length || 0,
        distance: response.routes?.[0]?.distance,
        duration: response.routes?.[0]?.duration,
      });

      return response;
    } catch (error) {
      if (error instanceof MapboxApiError) {
        requestLogger.logError('API error', error, {
          code: error.code,
        });
        // Re-throw with more context
        throw new Error(`Mapbox API error (${error.code}): ${error.message}`);
      }

      requestLogger.logError('Unexpected error', error);
      throw error;
    }
  }

  /**
   * Check if Mapbox provider is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const available = await this.client.healthCheck();
      logger.info('Availability check', { available });
      return available;
    } catch (error) {
      logger.error('Availability check failed', error);
      return false;
    }
  }

  /**
   * Map RouteProfile to Mapbox profile identifier
   */
  private mapProfileToMapbox(profile: RouteProfile): string {
    switch (profile) {
      case RouteProfile.WALKING:
        return 'walking';
      case RouteProfile.CYCLING:
        return 'cycling';
      case RouteProfile.DRIVING:
        return 'driving';
      case RouteProfile.PUBLIC_TRANSPORT:
        throw new Error('Mapbox does not support public transport routing');
      default:
        return 'cycling'; // Default to cycling
    }
  }
}
