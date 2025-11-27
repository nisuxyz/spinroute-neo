import { Hono } from 'hono';
import { getSupabase } from '../../../lib/auth';
import { internalServiceAuth } from '../../../lib/service-middleware';

export const basePath = '/api/internal';

export const router = new Hono();

// Apply internal service authentication to all routes
router.use('*', internalServiceAuth);

// Validate JWT token - used by API gateway and other services
router.post('/validate', async (c) => {
  try {
    const { token } = await c.req.json();

    if (!token) {
      return c.json({ valid: false, error: 'Token required' }, 400);
    }

    const supabase = getSupabase(c);

    // Validate the JWT token
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return c.json({ valid: false, error: 'Invalid token' }, 401);
    }

    return c.json({
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        emailVerified: !!user.email_confirmed_at,
      },
    });
  } catch (error) {
    return c.json(
      {
        valid: false,
        error: error instanceof Error ? error.message : 'Validation failed',
      },
      500,
    );
  }
});

// Get user info from token (for internal service use)
router.get('/user', async (c) => {
  try {
    const authHeader = c.req.header('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Bearer token required' }, 401);
    }

    const token = authHeader.substring(7);
    const supabase = getSupabase(c);

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return c.json({ error: 'Invalid token' }, 401);
    }

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        emailVerified: !!user.email_confirmed_at,
      },
    });
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get user',
      },
      500,
    );
  }
});
