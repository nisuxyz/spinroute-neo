/**
 * Mapbox Directions API provider implementation
 */

import type {
  RouteProvider,
  RouteRequest,
  MapboxDirectionsResponse,
  ProfileMetadata,
} from './base';
import { ProfileCategory } from './base';
import { config } from '../config';
import { MapboxClient, MapboxApiError } from './mapbox-client';
import type { MapboxDirectionsRequest } from './mapbox-client';
import { createLogger, createRequestLogger } from '../logger';

const logger = createLogger('Mapbox');

/**
 * Mapbox profile definitions with metadata
 * These are the profiles supported by Mapbox Directions API
 */
const MAPBOX_PROFILES: ProfileMetadata[] = [
  {
    id: 'cycling',
    title: 'Cycling',
    icon: 'directions-bike',
    category: ProfileCategory.CYCLING,
  },
  {
    id: 'walking',
    title: 'Walking',
    icon: 'directions-walk',
    category: ProfileCategory.WALKING,
  },
  {
    id: 'driving',
    title: 'Driving',
    icon: 'directions-car',
    category: ProfileCategory.DRIVING,
  },
  {
    id: 'driving-traffic',
    title: 'Driving (Traffic)',
    icon: 'traffic',
    category: ProfileCategory.DRIVING,
  },
];

export class MapboxProvider implements RouteProvider {
  name = 'mapbox';
  displayName = 'Mapbox';
  profiles: ProfileMetadata[] = MAPBOX_PROFILES;
  defaultProfile = 'cycling';

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
   * Validate that a profile is supported by this provider
   * @param profile Profile ID to validate
   * @returns true if profile is supported
   */
  private isValidProfile(profile: string): boolean {
    return this.profiles.some((p) => p.id === profile);
  }

  /**
   * Calculate a route using Mapbox Directions API
   */
  async calculateRoute(request: RouteRequest): Promise<MapboxDirectionsResponse> {
    const requestLogger = createRequestLogger(logger, {
      userId: request.userId,
    });

    // Use provided profile or default
    const profile = request.profile || this.defaultProfile;

    // Validate profile exists in provider's profile list
    if (!this.isValidProfile(profile)) {
      const availableProfiles = this.profiles.map((p) => p.id);
      const error = new Error(
        `Profile '${profile}' is not supported by provider 'mapbox'. Available profiles: ${availableProfiles.join(', ')}`,
      );
      requestLogger.logError('Invalid profile', error, {
        requestedProfile: profile,
        availableProfiles,
      });
      throw error;
    }

    // Build coordinates string (longitude,latitude pairs)
    const coordinates = request.waypoints.map((wp) => `${wp.longitude},${wp.latitude}`).join(';');

    // Build request parameters - profile is passed directly to Mapbox API
    const params: MapboxDirectionsRequest = {
      profile,
      coordinates,
      geometries: 'geojson',
      overview: 'full',
      steps: true,
      bannerInstructions: true,
      voiceInstructions: true,
    };

    requestLogger.logStart('Calculating route', {
      profile,
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
}
