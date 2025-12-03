import { Hono } from 'hono';
import { requireAuth } from '../../lib/auth';
import { createLogger, createRequestLogger } from '../../lib/logger';

export const basePath = '/api/example';

export const router = new Hono();

// Initialize logger for this feature
const logger = createLogger('Example');

// Public endpoint example
router.get('/public', (c) => {
  const requestLogger = createRequestLogger(logger, {
    endpoint: 'GET /api/example/public',
  });

  requestLogger.logStart('Public endpoint accessed');

  const response = {
    message: 'Public endpoint example',
    timestamp: new Date().toISOString(),
  };

  requestLogger.logSuccess('Public endpoint response sent');

  return c.json(response);
});

// Protected endpoint example with error handling
router.get('/protected', requireAuth(), async (c) => {
  const user = c.get('user');
  const requestLogger = createRequestLogger(logger, {
    endpoint: 'GET /api/example/protected',
    userId: user?.id,
  });

  try {
    requestLogger.logStart('Protected endpoint accessed');

    // Simulate some async operation
    const response = {
      message: 'Protected endpoint example',
      userId: user?.id,
      email: user?.email,
    };

    requestLogger.logSuccess('Protected endpoint response sent', {
      email: user?.email,
    });

    return c.json(response);
  } catch (error) {
    requestLogger.logError('Error processing protected endpoint', error);

    return c.json(
      {
        code: 'Error',
        message: error instanceof Error ? error.message : 'An error occurred',
      },
      500,
    );
  }
});
