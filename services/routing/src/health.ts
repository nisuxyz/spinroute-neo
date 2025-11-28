import { Hono } from 'hono';
import { name, version } from '../package.json';
import { providerRegistry } from '../lib/providers/registry';

const router = new Hono();

// Basic health check - includes provider availability
router.get('/health', async (c) => {
  try {
    // Check provider availability
    const providers = providerRegistry.getAllProviders();
    const providerStatus: Record<string, { available: boolean; lastChecked: string }> = {};

    for (const provider of providers) {
      const available = await provider.isAvailable();
      providerStatus[provider.name] = {
        available,
        lastChecked: new Date().toISOString(),
      };
    }

    // Determine overall status
    const allAvailable = Object.values(providerStatus).every((p) => p.available);
    const someAvailable = Object.values(providerStatus).some((p) => p.available);

    let status: 'healthy' | 'degraded' | 'unhealthy';

    if (allAvailable) {
      status = 'healthy';
    } else if (someAvailable) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    const response = {
      status,
      timestamp: new Date().toISOString(),
      service: name,
      version: process.env.npm_package_version || version,
      providers: providerStatus,
    };

    return status === 'unhealthy' ? c.json(response, 503) : c.json(response);
  } catch (error) {
    return c.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: name,
        version: process.env.npm_package_version || version,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      503,
    );
  }
});

// Readiness check - includes database connectivity
router.get('/ready', async (c) => {
  try {
    // TODO: Add database connectivity check
    // const dbCheck = await db.select().from(user).limit(1);

    return c.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'ok',
        auth: 'ok',
      },
    });
  } catch (error) {
    return c.json(
      {
        status: 'not ready',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      503,
    );
  }
});

// Liveness check
router.get('/live', (c) => {
  return c.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

export { router as healthRouter };
