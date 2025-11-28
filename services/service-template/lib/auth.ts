import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import type { SupabaseClient, User, Session } from '@supabase/supabase-js';
import type { Context, MiddlewareHandler } from 'hono';
import { createMiddleware } from 'hono/factory';
import { setCookie } from 'hono/cookie';
import type { Database } from './db.types';

declare module 'hono' {
  interface ContextVariableMap {
    supabase: SupabaseClient;
    user: User | null;
    session: Session | null;
  }
}

/**
 * Get the Supabase client from the request context.
 * Must be used after supabaseMiddleware() is applied.
 */
export const getSupabase = (c: Context): SupabaseClient<Database> => {
  return c.get('supabase') as SupabaseClient<Database>;
};

/**
 * Primary middleware: Creates a Supabase client for each request.
 * Apply this globally with: app.use('*', supabaseMiddleware())
 */
export const supabaseMiddleware = (): MiddlewareHandler => {
  return async (c, next) => {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL missing!');
    }

    if (!supabaseAnonKey) {
      throw new Error('SUPABASE_ANON_KEY missing!');
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return parseCookieHeader(c.req.header('Cookie') ?? '').map((cookie) => ({
            name: cookie.name,
            value: cookie.value ?? '',
          }));
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            setCookie(c, name, value, options as any);
          });
        },
      },
    });

    c.set('supabase', supabase as any);

    await next();
  };
};

/**
 * Optional middleware: Extracts user and session from Supabase and adds to context.
 * Use this on routes that need user info readily available.
 * Supports both Bearer token (Authorization header) and cookie-based auth.
 *
 * Example:
 *   router.use('*', requireAuth());  // For protected routes
 *   router.use('*', authMiddleware); // For routes that may or may not have auth
 */
export const authMiddleware = createMiddleware(async (c, next) => {
  const supabase = getSupabase(c);

  // Check for Bearer token in Authorization header
  const authHeader = c.req.header('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (!error && user) {
      c.set('user', user);
      c.set('session', { user, access_token: token } as Session);
      return next();
    }
  }

  // Fall back to cookie-based session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    c.set('user', null);
    c.set('session', null);
    return next();
  }

  c.set('user', session.user);
  c.set('session', session);
  return next();
});

/**
 * Middleware that requires authentication.
 * Returns 401 if user is not authenticated.
 * Supports both Bearer token (Authorization header) and cookie-based auth.
 */
export const requireAuth = () =>
  createMiddleware(async (c, next) => {
    const supabase = getSupabase(c);

    // Check for Bearer token in Authorization header
    const authHeader = c.req.header('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      // Verify the token with Supabase
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token);

      if (error || !user) {
        console.log('Invalid Bearer token:', error?.message);
        return c.json({ error: 'Unauthorized' }, 401);
      }

      // Create a minimal session object for compatibility
      c.set('user', user);
      c.set('session', { user, access_token: token } as Session);

      return next();
    }

    // Fall back to cookie-based session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      console.log('No session found');
      return c.json({ error: 'Unauthorized' }, 401);
    }

    c.set('user', session.user);
    c.set('session', session);
    return next();
  });
