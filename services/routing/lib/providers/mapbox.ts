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
      console.warn('Mapbox access token not configured');
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

    try {
      const response = await this.client.getDirections(params);

      // Validate response code
      if (response.code !== 'Ok') {
        throw new Error(`Mapbox API returned error code: ${response.code}`);
      }

      return response;
    } catch (error) {
      if (error instanceof MapboxApiError) {
        // Re-throw with more context
        throw new Error(`Mapbox API error (${error.code}): ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Check if Mapbox provider is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      return await this.client.healthCheck();
    } catch (error) {
      console.error('Mapbox availability check failed:', error);
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
