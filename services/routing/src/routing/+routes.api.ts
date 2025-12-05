import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireAuth } from '../../lib/auth';
import {
  providerRegistry,
  initializeProviders,
  ProviderNotFoundError,
  InvalidProfileError,
} from '../../lib/providers';
import { config } from '../../lib/config';
import type { RouteRequest, ProfileMetadata } from '../../lib/providers/base';
import { ProfileCategory } from '../../lib/providers/base';
import { createLogger, createRequestLogger } from '../../lib/logger';

/**
 * Category sort order for profile sorting
 * Profiles are sorted by category in this order, then alphabetically by title
 */
const CATEGORY_SORT_ORDER: Record<ProfileCategory, number> = {
  [ProfileCategory.CYCLING]: 0,
  [ProfileCategory.WALKING]: 1,
  [ProfileCategory.DRIVING]: 2,
  [ProfileCategory.OTHER]: 3,
};

/**
 * Sort profiles by category (cycling, walking, driving, other) then by title
 * @param profiles Array of profile metadata to sort
 * @returns Sorted array of profiles
 */
function sortProfiles(profiles: ProfileMetadata[]): ProfileMetadata[] {
  return [...profiles].sort((a, b) => {
    // First sort by category order
    const categoryDiff = CATEGORY_SORT_ORDER[a.category] - CATEGORY_SORT_ORDER[b.category];
    if (categoryDiff !== 0) {
      return categoryDiff;
    }
    // Then sort alphabetically by title within the same category
    return a.title.localeCompare(b.title);
  });
}

// Initialize logger
const logger = createLogger('Routing');

// Initialize provider registry with all providers
initializeProviders();

export const basePath = '/api/routing';
export const router = new Hono();

// Apply authentication middleware to all routing endpoints
router.use('*', requireAuth());

// Request validation schemas
const coordinateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const directionsRequestSchema = z.object({
  waypoints: z.array(coordinateSchema).min(2, 'At least 2 waypoints required'),
  profile: z.string().optional(),
  provider: z.string().optional(),
});

type DirectionsRequest = z.infer<typeof directionsRequestSchema>;

/**
 * POST /api/routing/directions
 * Calculate a route between waypoints
 */
router.post('/directions', zValidator('json', directionsRequestSchema), async (c) => {
  const body = c.req.valid('json') as DirectionsRequest;
  const user = c.get('user');

  const requestLogger = createRequestLogger(logger, {
    userId: user?.id,
    endpoint: 'POST /api/routing/directions',
  });

  let provider;
  let providerName = 'unknown';

  try {
    // Build route request
    const routeRequest: RouteRequest = {
      waypoints: body.waypoints,
      profile: body.profile,
      provider: body.provider,
      userId: user?.id,
      userPlan: 'free', // TODO: Get actual user plan from database
    };

    // Log incoming request
    requestLogger.logStart('Route request received', {
      waypointCount: body.waypoints.length,
      profile: body.profile,
      requestedProvider: body.provider,
    });

    // Select provider (also validates profile if specified)
    try {
      provider = providerRegistry.selectProvider(routeRequest);
      providerName = provider.name;
      requestLogger.addContext({ provider: providerName });
    } catch (error) {
      // Log provider selection error
      requestLogger.logError('Provider selection failed', error, {
        requestedProvider: body.provider,
        requestedProfile: body.profile,
      });

      // Handle specific error types
      if (error instanceof ProviderNotFoundError) {
        return c.json(
          {
            code: 'ProviderNotFound',
            message: error.message,
          },
          404,
        );
      }

      if (error instanceof InvalidProfileError) {
        return c.json(
          {
            code: 'InvalidProfile',
            message: error.message,
            availableProfiles: error.availableProfiles,
          },
          400,
        );
      }

      throw error;
    }

    // Calculate route
    const response = await provider.calculateRoute(routeRequest);

    // Log successful request
    requestLogger.logSuccess('Route calculated successfully', {
      profile: body.profile || provider.defaultProfile,
      waypointCount: body.waypoints.length,
      distance: response.routes?.[0]?.distance,
      duration: response.routes?.[0]?.duration,
    });

    return c.json({
      ...response,
      provider: provider.name,
    });
  } catch (error) {
    // Log error with full details
    requestLogger.logError('Route calculation error', error, {
      provider: providerName,
    });

    // Handle provider-specific errors
    if (error instanceof Error) {
      // Check for invalid profile error from provider
      if (error.message.includes('is not supported by provider')) {
        return c.json(
          {
            code: 'InvalidProfile',
            message: error.message,
            provider: providerName,
          },
          400,
        );
      }

      // Check for timeout or service unavailable
      if (
        error.message.includes('timeout') ||
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('fetch failed')
      ) {
        return c.json(
          {
            code: 'ServiceUnavailable',
            message: 'Routing provider is currently unavailable. Please try again later.',
            details: error.message,
            provider: providerName,
          },
          503,
        );
      }

      // Generic error response
      return c.json(
        {
          code: 'Error',
          message: error.message,
          provider: providerName,
        },
        500,
      );
    }

    return c.json(
      {
        code: 'Error',
        message: 'An unexpected error occurred',
        provider: providerName,
      },
      500,
    );
  }
});

/**
 * GET /api/routing/providers
 * Get available routing providers and their profiles
 */
router.get('/providers', async (c) => {
  const user = c.get('user');
  const requestLogger = createRequestLogger(logger, {
    userId: user?.id,
    endpoint: 'GET /api/routing/providers',
  });

  try {
    const userPlan: 'free' | 'paid' = 'free'; // TODO: Get actual user plan from database

    requestLogger.logStart('Providers query received', {
      userPlan,
    });

    // Get available providers for user's plan
    const availableProviders = providerRegistry.getAvailableProviders(userPlan);

    // Check availability status for each provider
    const providersWithStatus = await Promise.all(
      availableProviders.map(async (provider) => {
        const available = await provider.isAvailable();
        return {
          name: provider.name,
          displayName: provider.displayName,
          profiles: provider.profiles,
          defaultProfile: provider.defaultProfile,
          available,
        };
      }),
    );

    requestLogger.logSuccess('Providers query successful', {
      providerCount: providersWithStatus.length,
      availableCount: providersWithStatus.filter((p) => p.available).length,
    });

    return c.json({
      providers: providersWithStatus,
      defaultProvider: config.routing.defaultProvider,
    });
  } catch (error) {
    requestLogger.logError('Error fetching providers', error);

    return c.json(
      {
        code: 'Error',
        message: error instanceof Error ? error.message : 'Failed to fetch providers',
      },
      500,
    );
  }
});

/**
 * GET /api/routing/providers/:provider/profiles
 * Get available profiles for a specific routing provider
 */
router.get('/providers/:provider/profiles', async (c) => {
  const user = c.get('user');
  const providerName = c.req.param('provider');

  const requestLogger = createRequestLogger(logger, {
    userId: user?.id,
    endpoint: `GET /api/routing/providers/${providerName}/profiles`,
  });

  try {
    requestLogger.logStart('Provider profiles query received', {
      provider: providerName,
    });

    // Get profiles for the specified provider
    const profiles = providerRegistry.getProviderProfiles(providerName);
    const provider = providerRegistry.getProvider(providerName);

    // Sort profiles by category then by title
    const sortedProfiles = sortProfiles(profiles);

    requestLogger.logSuccess('Provider profiles query successful', {
      provider: providerName,
      profileCount: sortedProfiles.length,
    });

    return c.json({
      provider: providerName,
      profiles: sortedProfiles,
      defaultProfile: provider?.defaultProfile,
    });
  } catch (error) {
    // Handle provider not found error
    if (error instanceof ProviderNotFoundError) {
      requestLogger.logError('Provider not found', error, {
        provider: providerName,
      });

      return c.json(
        {
          code: 'ProviderNotFound',
          message: error.message,
        },
        404,
      );
    }

    requestLogger.logError('Error fetching provider profiles', error, {
      provider: providerName,
    });

    return c.json(
      {
        code: 'Error',
        message: error instanceof Error ? error.message : 'Failed to fetch provider profiles',
      },
      500,
    );
  }
});
