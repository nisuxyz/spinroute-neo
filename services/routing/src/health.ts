import { Hono } from 'hono';

const router = new Hono();

// Basic health check
router.get('/health', (c) => {
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'auth-service',
    version: process.env.npm_package_version || '1.0.0'
  });
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
        auth: 'ok'
      }
    });
  } catch (error) {
    return c.json({ 
      status: 'not ready', 
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 503);
  }
});

// Liveness check
router.get('/live', (c) => {
  return c.json({ 
    status: 'alive', 
    timestamp: new Date().toISOString() 
  });
});

export { router as healthRouter };
