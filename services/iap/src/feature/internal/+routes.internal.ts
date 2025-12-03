import { Hono } from 'hono';
import { requireAuth } from '../../../lib/auth';

export const basePath = '/api/internal';

export const router = new Hono();

// Example internal endpoint - customize for your service needs
router.get('/example', requireAuth(), async (c) => {
  const user = c.get('user');

  return c.json({
    message: 'Internal endpoint example',
    userId: user?.id,
  });
});
