import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireAuth } from '../../lib/auth';
import { providerRegistry } from '../../lib/providers/registry';
import { MapboxProvider } from '../../lib/providers/mapbox';
import { config } from '../../lib/config';
import { RouteProfile, BikeType } from '../../lib/providers/base';
import type { RouteRequest } from '../../lib/providers/base';

// Initialize provider registry
providerRegistry.registerProvider(new MapboxProvider());

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
  try {
    const body = c.req.valid('json') as DirectionsRequest;
    const user = c.get('user');

    // Build route request
    const routeRequest: RouteRequest = {
      waypoints: body.waypoints,
      profile: body.profile,
      bikeType: body.bikeType,
      provider: body.provider,
      userId: user?.id,
      userPlan: 'free', // TODO: Get actual user plan from database
    };

    // Select provider
    let provider;
    try {
      provider = providerRegistry.selectProvider(routeRequest);
    } catch (error) {
      if (error instanceof Error) {
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

    return c.json({
      ...response,
      provider: provider.name,
      ...(warnings.length > 0 && { warnings }),
    });
  } catch (error) {
    console.error('Route calculation error:', error);

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
          },
          503,
        );
      }

      // Generic error response
      return c.json(
        {
          code: 'Error',
          message: error.message,
        },
        500,
      );
    }

    return c.json(
      {
        code: 'Error',
        message: 'An unexpected error occurred',
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
  try {
    const user = c.get('user');
    const userPlan: 'free' | 'paid' = 'free'; // TODO: Get actual user plan from database

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

    return c.json({
      providers: providersWithStatus,
      defaultProvider: config.routing.defaultProvider,
    });
  } catch (error) {
    console.error('Error fetching providers:', error);

    return c.json(
      {
        code: 'Error',
        message: error instanceof Error ? error.message : 'Failed to fetch providers',
      },
      500,
    );
  }
});
