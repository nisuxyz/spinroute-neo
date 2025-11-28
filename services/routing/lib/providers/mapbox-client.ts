/**
 * Mapbox API client utilities
 * Provides HTTP client with timeout handling and error types
 */

import type { MapboxDirectionsResponse } from './base';

/**
 * Mapbox API error codes
 */
export enum MapboxErrorCode {
  INVALID_INPUT = 'InvalidInput',
  PROFILE_NOT_FOUND = 'ProfileNotFound',
  NO_ROUTE = 'NoRoute',
  NO_SEGMENT = 'NoSegment',
  TOO_BIG = 'TooBig',
}

/**
 * Custom error class for Mapbox API errors
 */
export class MapboxApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string,
    public readonly details?: any,
  ) {
    super(message);
    this.name = 'MapboxApiError';
  }
}

/**
 * Mapbox API client configuration
 */
export interface MapboxClientConfig {
  accessToken: string;
  baseUrl: string;
  timeout: number;
}

/**
 * Mapbox Directions API request parameters
 */
export interface MapboxDirectionsRequest {
  profile: string; // e.g., 'cycling', 'walking', 'driving'
  coordinates: string; // semicolon-separated lon,lat pairs
  geometries?: 'geojson' | 'polyline' | 'polyline6';
  overview?: 'full' | 'simplified' | 'false';
  steps?: boolean;
  bannerInstructions?: boolean;
  voiceInstructions?: boolean;
  alternatives?: boolean;
  continueStraight?: boolean;
  waypoints?: string; // semicolon-separated waypoint indices
}

/**
 * HTTP client for Mapbox Directions API
 */
export class MapboxClient {
  private readonly config: MapboxClientConfig;

  constructor(config: MapboxClientConfig) {
    this.config = config;
  }

  /**
   * Call Mapbox Directions API
   */
  async getDirections(params: MapboxDirectionsRequest): Promise<MapboxDirectionsResponse> {
    const url = this.buildUrl(params);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SpinRouteNeo/1.0',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const data = (await response.json()) as MapboxDirectionsResponse;

      // Validate response structure
      if (!data.routes || !Array.isArray(data.routes)) {
        throw new MapboxApiError(
          'INVALID_RESPONSE',
          500,
          'Invalid response structure from Mapbox API',
        );
      }

      return data;
    } catch (error) {
      if (error instanceof MapboxApiError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new MapboxApiError(
            'TIMEOUT',
            408,
            `Request timeout after ${this.config.timeout}ms`,
          );
        }

        // Network or other fetch errors
        throw new MapboxApiError('NETWORK_ERROR', 0, error.message);
      }

      throw new MapboxApiError('UNKNOWN_ERROR', 0, 'Unknown error occurred');
    }
  }

  /**
   * Health check - verify API is accessible
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Use a simple test route in San Francisco
      const testParams: MapboxDirectionsRequest = {
        profile: 'cycling',
        coordinates: '-122.4194,37.7749;-122.4084,37.7849',
        geometries: 'geojson',
      };

      const url = this.buildUrl(testParams);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout for health check

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Build Mapbox Directions API URL with parameters
   */
  private buildUrl(params: MapboxDirectionsRequest): string {
    const url = new URL(
      `/directions/v5/mapbox/${params.profile}/${params.coordinates}`,
      this.config.baseUrl,
    );

    // Add access token
    url.searchParams.set('access_token', this.config.accessToken);

    // Add optional parameters
    if (params.geometries) {
      url.searchParams.set('geometries', params.geometries);
    }
    if (params.overview) {
      url.searchParams.set('overview', params.overview);
    }
    if (params.steps !== undefined) {
      url.searchParams.set('steps', params.steps.toString());
    }
    if (params.bannerInstructions !== undefined) {
      url.searchParams.set('banner_instructions', params.bannerInstructions.toString());
    }
    if (params.voiceInstructions !== undefined) {
      url.searchParams.set('voice_instructions', params.voiceInstructions.toString());
    }
    if (params.alternatives !== undefined) {
      url.searchParams.set('alternatives', params.alternatives.toString());
    }
    if (params.continueStraight !== undefined) {
      url.searchParams.set('continue_straight', params.continueStraight.toString());
    }
    if (params.waypoints) {
      url.searchParams.set('waypoints', params.waypoints);
    }

    return url.toString();
  }

  /**
   * Handle error responses from Mapbox API
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    let errorData: any;
    let errorMessage = response.statusText;

    try {
      errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      // If response is not JSON, use status text
      errorMessage = await response.text().catch(() => response.statusText);
    }

    // Map HTTP status codes to error codes
    let errorCode = 'API_ERROR';
    if (response.status === 400) {
      errorCode = MapboxErrorCode.INVALID_INPUT;
    } else if (response.status === 401 || response.status === 403) {
      errorCode = 'UNAUTHORIZED';
    } else if (response.status === 404) {
      errorCode = MapboxErrorCode.PROFILE_NOT_FOUND;
    } else if (response.status === 422) {
      errorCode = MapboxErrorCode.NO_ROUTE;
    } else if (response.status === 429) {
      errorCode = 'RATE_LIMIT';
    } else if (response.status >= 500) {
      errorCode = 'SERVER_ERROR';
    }

    throw new MapboxApiError(errorCode, response.status, errorMessage, errorData);
  }
}
