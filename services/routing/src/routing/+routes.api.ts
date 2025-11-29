import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireAuth } from '../../lib/auth';
import { providerRegistry, initializeProviders } from '../../lib/providers';
import { config } from '../../lib/config';
import { RouteProfile, BikeType } from '../../lib/providers/base';
import type { RouteRequest } from '../../lib/providers/base';
import { createLogger, createRequestLogger } from '../../lib/logger';

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
  profile: z.nativeEnum(RouteProfile).optional().default(RouteProfile.CYCLING),
  bikeType: z.nativeEnum(BikeType).optional(),
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
      bikeType: body.bikeType,
      provider: body.provider,
      userId: user?.id,
      userPlan: 'free', // TODO: Get actual user plan from database
    };

    // Log incoming request
    requestLogger.logStart('Route request received', {
      waypointCount: body.waypoints.length,
      profile: body.profile,
      bikeType: body.bikeType,
      requestedProvider: body.provider,
    });

    // Select provider
    try {
      provider = providerRegistry.selectProvider(routeRequest);
      providerName = provider.name;
      requestLogger.addContext({ provider: providerName });
    } catch (error) {
      if (error instanceof Error) {
        // Log provider selection error
        requestLogger.logError('Provider selection failed', error, {
          requestedProvider: body.provider,
        });

        // Check if it's a paid plan error
        if (error.message.includes('requires a paid plan')) {
          return c.json(
            {
              code: 'Forbidden',
              message: error.message,
            },
            403,
          );
        }
        // Provider not found
        return c.json(
          {
            code: 'NotFound',
            message: error.message,
          },
          404,
        );
      }
      throw error;
    }

    // Calculate route
    const response = await provider.calculateRoute(routeRequest);

    // Add provider info and warnings to response
    const warnings: string[] = [];

    // Check if bike type fallback occurred
    if (
      body.bikeType &&
      body.bikeType !== BikeType.GENERIC &&
      provider.capabilities.bikeTypes &&
      !provider.capabilities.bikeTypes.includes(body.bikeType)
    ) {
      warnings.push(
        `Provider '${provider.displayName}' does not support bike type '${body.bikeType}'. Using generic cycling profile.`,
      );
    }

    // Log successful request
    requestLogger.logSuccess('Route calculated successfully', {
      profile: body.profile,
      bikeType: body.bikeType,
      waypointCount: body.waypoints.length,
      distance: response.routes?.[0]?.distance,
      duration: response.routes?.[0]?.duration,
      warnings: warnings.length > 0 ? warnings : undefined,
    });

    return c.json({
      ...response,
      provider: provider.name,
      ...(warnings.length > 0 && { warnings }),
    });
  } catch (error) {
    // Log error with full details
    requestLogger.logError('Route calculation error', error, {
      provider: providerName,
    });

    // Handle provider-specific errors
    if (error instanceof Error) {
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
 * Get available routing providers and their capabilities
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
          capabilities: provider.capabilities,
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
