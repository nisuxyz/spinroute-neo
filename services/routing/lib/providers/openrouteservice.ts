/**
 * OpenRouteService provider implementation
 */

import type {
  RouteProvider,
  RouteRequest,
  MapboxDirectionsResponse,
  ProviderCapabilities,
} from './base';
import { RouteProfile, BikeType } from './base';
import { config } from '../config';
import { ORSClient, ORSApiError } from './ors-client';
import type { ORSDirectionsRequest } from './ors-client';
import { createLogger, createRequestLogger } from '../logger';
import { normalizeORSResponse } from './normalizer';

const logger = createLogger('OpenRouteService');

export class OpenRouteServiceProvider implements RouteProvider {
  name = 'openrouteservice';
  displayName = 'OpenRouteService';
  capabilities: ProviderCapabilities = {
    profiles: [RouteProfile.WALKING, RouteProfile.CYCLING, RouteProfile.DRIVING],
    bikeTypes: [BikeType.ROAD, BikeType.MOUNTAIN, BikeType.EBIKE, BikeType.GENERIC],
    multiModal: false,
    requiresPaidPlan: false,
  };

  private readonly client: ORSClient;

  constructor() {
    const apiKey = config.openrouteservice.apiKey;

    if (!apiKey) {
      logger.warn('OpenRouteService API key not configured');
    }

    this.client = new ORSClient({
      apiKey: apiKey || '',
      baseUrl: config.openrouteservice.baseUrl,
      timeout: config.routing.requestTimeout,
    });
  }

  /**
   * Calculate a route using OpenRouteService Directions API
   */
  async calculateRoute(request: RouteRequest): Promise<MapboxDirectionsResponse> {
    const requestLogger = createRequestLogger(logger, {
      userId: request.userId,
    });

    // Map profile and bike type to ORS profile
    const orsProfile = this.mapProfileToORS(request.profile, request.bikeType);

    // Build request body
    const orsRequest: ORSDirectionsRequest = {
      coordinates: request.waypoints.map((wp) => [wp.longitude, wp.latitude]),
      preference: 'fastest',
      units: 'm',
      language: 'en',
      geometry: true,
      instructions: true,
      instructions_format: 'text',
      elevation: false,
    };

    requestLogger.logStart('Calculating route', {
      profile: orsProfile,
      waypointCount: request.waypoints.length,
      bikeType: request.bikeType,
    });

    try {
      const response = await this.client.getDirections(orsProfile, orsRequest);

      // Validate response has routes
      if (!response.routes || response.routes.length === 0) {
        const error = new Error('ORS API returned no routes');
        requestLogger.logError('No routes found', error);
        throw error;
      }

      requestLogger.logSuccess('Route calculated successfully', {
        routeCount: response.routes.length,
        distance: response.routes[0]?.summary.distance,
        duration: response.routes[0]?.summary.duration,
      });

      // Normalize ORS response to Mapbox format
      const normalizedResponse = normalizeORSResponse(response, request.waypoints);

      return normalizedResponse;
    } catch (error) {
      if (error instanceof ORSApiError) {
        requestLogger.logError('API error', error, {
          code: error.code,
        });
        // Re-throw with more context
        throw new Error(`OpenRouteService API error (${error.code}): ${error.message}`);
      }

      requestLogger.logError('Unexpected error', error);
      throw error;
    }
  }

  /**
   * Check if OpenRouteService provider is available
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
   * Map RouteProfile and BikeType to ORS profile identifier
   */
  private mapProfileToORS(profile: RouteProfile, bikeType?: BikeType): string {
    switch (profile) {
      case RouteProfile.WALKING:
        return 'foot-walking';
      case RouteProfile.CYCLING:
        // Map bike type to specific ORS cycling profile
        switch (bikeType) {
          case BikeType.ROAD:
            return 'cycling-road';
          case BikeType.MOUNTAIN:
            return 'cycling-mountain';
          case BikeType.EBIKE:
            return 'cycling-electric';
          case BikeType.GENERIC:
          default:
            return 'cycling-regular';
        }
      case RouteProfile.DRIVING:
        return 'driving-car';
      case RouteProfile.PUBLIC_TRANSPORT:
        throw new Error('OpenRouteService does not support public transport routing');
      default:
        return 'cycling-regular'; // Default to regular cycling
    }
  }
}
