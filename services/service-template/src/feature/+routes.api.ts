import { Hono } from 'hono';
import { requireAuth } from '../../lib/auth';

export const basePath = '/api/example';

export const router = new Hono();

// Public endpoint example
router.get('/public', (c) => {
  return c.json({
    message: 'Public endpoint example',
    timestamp: new Date().toISOString(),
  });
});

// Protected endpoint example
router.get('/protected', requireAuth(), async (c) => {
  const user = c.get('user');

  return c.json({
    message: 'Protected endpoint example',
    userId: user?.id,
    email: user?.email,
  });
});
