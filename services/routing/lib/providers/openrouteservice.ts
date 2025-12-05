/**
 * OpenRouteService provider implementation
 */

import type {
  RouteProvider,
  RouteRequest,
  MapboxDirectionsResponse,
  ProfileMetadata,
} from './base';
import { ProfileCategory } from './base';
import { config } from '../config';
import { ORSClient, ORSApiError } from './ors-client';
import type { ORSDirectionsRequest } from './ors-client';
import { createLogger, createRequestLogger } from '../logger';
import { normalizeORSResponse } from './normalizer';

const logger = createLogger('OpenRouteService');

/**
 * OpenRouteService profile definitions with metadata
 * These are the profiles supported by OpenRouteService Directions API
 */
const ORS_PROFILES: ProfileMetadata[] = [
  {
    id: 'driving-car',
    title: 'Car',
    icon: 'directions-car',
    category: ProfileCategory.DRIVING,
    description: 'Standard car routing',
  },
  {
    id: 'driving-hgv',
    title: 'Heavy Vehicle',
    icon: 'local-shipping',
    category: ProfileCategory.DRIVING,
    description: 'Routing for trucks and heavy goods vehicles',
  },
  {
    id: 'cycling-regular',
    title: 'Regular Cycling',
    icon: 'directions-bike',
    category: ProfileCategory.CYCLING,
    description: 'Standard cycling profile',
  },
  {
    id: 'cycling-road',
    title: 'Road Cycling',
    icon: 'directions-bike',
    category: ProfileCategory.CYCLING,
    description: 'Optimized for road bikes',
  },
  {
    id: 'cycling-mountain',
    title: 'Mountain Biking',
    icon: 'terrain',
    category: ProfileCategory.CYCLING,
    description: 'Optimized for mountain bikes and trails',
  },
  {
    id: 'cycling-electric',
    title: 'E-Bike',
    icon: 'electric-bike',
    category: ProfileCategory.CYCLING,
    description: 'Optimized for electric bikes',
  },
  {
    id: 'foot-walking',
    title: 'Walking',
    icon: 'directions-walk',
    category: ProfileCategory.WALKING,
    description: 'Standard walking profile',
  },
  {
    id: 'foot-hiking',
    title: 'Hiking',
    icon: 'hiking',
    category: ProfileCategory.WALKING,
    description: 'Optimized for hiking trails',
  },
  {
    id: 'wheelchair',
    title: 'Wheelchair',
    icon: 'accessible',
    category: ProfileCategory.OTHER,
    description: 'Wheelchair accessible routing',
  },
];

export class OpenRouteServiceProvider implements RouteProvider {
  name = 'openrouteservice';
  displayName = 'OpenRouteService';
  profiles: ProfileMetadata[] = ORS_PROFILES;
  defaultProfile = 'cycling-regular';

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
   * Validate that a profile is supported by this provider
   * @param profile Profile ID to validate
   * @returns true if profile is supported
   */
  private isValidProfile(profile: string): boolean {
    return this.profiles.some((p) => p.id === profile);
  }

  /**
   * Calculate a route using OpenRouteService Directions API
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
        `Profile '${profile}' is not supported by provider 'openrouteservice'. Available profiles: ${availableProfiles.join(', ')}`,
      );
      requestLogger.logError('Invalid profile', error, {
        requestedProfile: profile,
        availableProfiles,
      });
      throw error;
    }

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
      profile,
      waypointCount: request.waypoints.length,
    });

    try {
      // Pass profile directly to ORS API without transformation
      const response = await this.client.getDirections(profile, orsRequest);

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
}
