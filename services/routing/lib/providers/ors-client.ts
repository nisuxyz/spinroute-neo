/**
 * OpenRouteService API client utilities
 * Provides HTTP client with timeout handling and error types
 */

/**
 * ORS API error codes
 */
export enum ORSErrorCode {
  INVALID_INPUT = 'INVALID_INPUT',
  ROUTE_NOT_FOUND = 'ROUTE_NOT_FOUND',
  POINT_NOT_FOUND = 'POINT_NOT_FOUND',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Custom error class for ORS API errors
 */
export class ORSApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string,
    public readonly details?: any,
  ) {
    super(message);
    this.name = 'ORSApiError';
  }
}

/**
 * ORS API client configuration
 */
export interface ORSClientConfig {
  apiKey: string;
  baseUrl: string;
  timeout: number;
}

/**
 * ORS Directions API request body
 */
export interface ORSDirectionsRequest {
  coordinates: number[][]; // Array of [longitude, latitude] pairs
  profile?: string; // Will be in URL path
  preference?: 'fastest' | 'shortest' | 'recommended';
  units?: 'km' | 'm' | 'mi';
  language?: string;
  geometry?: boolean;
  geometry_simplify?: boolean;
  instructions?: boolean;
  instructions_format?: 'text' | 'html';
  elevation?: boolean;
  extra_info?: string[];
  options?: {
    avoid_features?: string[];
    profile_params?: {
      weightings?: {
        steepness_difficulty?: number;
      };
    };
  };
}

/**
 * ORS Directions API response
 */
export interface ORSDirectionsResponse {
  type?: string;
  metadata?: {
    attribution: string;
    service: string;
    timestamp: number;
    query: any;
    engine: any;
  };
  bbox?: number[];
  routes: ORSRoute[];
}

export interface ORSRoute {
  summary: {
    distance: number; // meters
    duration: number; // seconds
  };
  geometry?: string | { coordinates: number[][]; type: string }; // Encoded polyline or GeoJSON
  way_points?: number[];
  segments?: ORSSegment[];
  bbox?: number[];
  extras?: any;
  warnings?: any[];
}

export interface ORSSegment {
  distance: number;
  duration: number;
  steps?: ORSStep[];
}

export interface ORSStep {
  distance: number;
  duration: number;
  type: number;
  instruction: string;
  name: string;
  way_points: number[];
  exit_number?: number;
  mode?: string;
}

/**
 * HTTP client for OpenRouteService Directions API
 */
export class ORSClient {
  private readonly config: ORSClientConfig;

  constructor(config: ORSClientConfig) {
    this.config = config;
  }

  /**
   * Call ORS Directions API
   */
  async getDirections(
    profile: string,
    request: ORSDirectionsRequest,
  ): Promise<ORSDirectionsResponse> {
    const url = `${this.config.baseUrl}/v2/directions/${profile}/json`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.config.apiKey,
          'User-Agent': 'SpinRouteNeo/1.0',
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const data = (await response.json()) as ORSDirectionsResponse;

      // Validate response structure
      if (!data.routes || !Array.isArray(data.routes)) {
        throw new ORSApiError(ORSErrorCode.UNKNOWN, 500, 'Invalid response structure from ORS API');
      }

      return data;
    } catch (error) {
      if (error instanceof ORSApiError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new ORSApiError('TIMEOUT', 408, `Request timeout after ${this.config.timeout}ms`);
        }

        // Network or other fetch errors
        throw new ORSApiError(ORSErrorCode.UNKNOWN, 0, error.message);
      }

      throw new ORSApiError(ORSErrorCode.UNKNOWN, 0, 'Unknown error occurred');
    }
  }

  /**
   * Health check - verify API is accessible
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Use a simple test route in Heidelberg, Germany (ORS headquarters)
      const testRequest: ORSDirectionsRequest = {
        coordinates: [
          [8.681495, 49.41461],
          [8.687872, 49.420318],
        ],
      };

      const url = `${this.config.baseUrl}/v2/directions/cycling-regular/json`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout for health check

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.config.apiKey,
        },
        body: JSON.stringify(testRequest),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Handle error responses from ORS API
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    let errorData: any;
    let errorMessage = response.statusText;

    try {
      errorData = await response.json();
      errorMessage = errorData.error?.message || errorData.message || errorMessage;
    } catch {
      // If response is not JSON, use status text
      errorMessage = await response.text().catch(() => response.statusText);
    }

    // Map HTTP status codes to error codes
    let errorCode = ORSErrorCode.UNKNOWN;
    if (response.status === 400) {
      errorCode = ORSErrorCode.INVALID_INPUT;
    } else if (response.status === 401 || response.status === 403) {
      errorCode = 'UNAUTHORIZED';
    } else if (response.status === 404) {
      errorCode = ORSErrorCode.POINT_NOT_FOUND;
    } else if (response.status === 500) {
      errorCode = ORSErrorCode.ROUTE_NOT_FOUND;
    } else if (response.status === 429) {
      errorCode = 'RATE_LIMIT';
    } else if (response.status >= 500) {
      errorCode = 'SERVER_ERROR';
    }

    throw new ORSApiError(errorCode, response.status, errorMessage, errorData);
  }
}
