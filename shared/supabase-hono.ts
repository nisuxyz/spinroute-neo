import { SupabaseClient } from '@supabase/supabase-js';
import type { Context, MiddlewareHandler } from 'hono';
import { env } from 'hono/adapter';
import { getCookie } from 'hono/cookie';
import { HTTPException } from 'hono/http-exception';

declare module 'hono' {
  interface ContextVariableMap {
    supabase: SupabaseClient;
  }
}

export const getSupabase = (c: Context) => {
  return c.get('supabase') as SupabaseClient;
};

type SupabaseEnv = {
  SUPABASE_URL: string;
  SUPABASE_KEY: string;
};

export const supabaseMiddleware = <
  SN extends string,
  CS extends (c: Context) => SupabaseClient<any, SN, SN, any, any>,
>(
  createSupabaseClient: CS,
  protectRoutes?: boolean | string[],
): MiddlewareHandler => {
  return async (c, next) => {
    const supabaseEnv = env<SupabaseEnv>(c);
    const supabaseUrl = supabaseEnv.SUPABASE_URL;
    const supabaseAnonKey = supabaseEnv.SUPABASE_KEY;

    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL missing!');
    }

    if (!supabaseAnonKey) {
      throw new Error('SUPABASE_KEY missing!');
    }

    const supabase = createSupabaseClient(c);

    // @ts-expect-error
    c.set('supabase', supabase);

    console.log(supabase);

    if (
      protectRoutes === true ||
      (Array.isArray(protectRoutes) && protectRoutes.includes(c.req.path))
    ) {
      const refresh_token = getCookie(c, 'refresh_token');
      const access_token = getCookie(c, 'access_token');
      const { data, error } = await supabase.auth.getUser(access_token);

      if (data.user) {
        c.set('user', {
          id: data.user.id,
          email: data.user.email,
          created_at: data.user.created_at,
          updated_at: data.user.updated_at,
        });
      }
      //TODO: handle error properly
      if (error) {
        console.error('Error while getting user by access_token ', error);
        if (!refresh_token) {
          throw new HTTPException(403, { message: 'No refresh token' });
        }

        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession({
          refresh_token,
        });

        if (refreshError) {
          console.error('Error while refreshing token', refreshError);
          throw new HTTPException(403, { message: ' Error while refreshing token' });
        }

        if (refreshed.user) {
          c.set('user', {
            id: refreshed.user.id,
            email: refreshed.user.email,
            created_at: refreshed.user.created_at,
            updated_at: refreshed.user.updated_at,
          });
        }
      }
    }
    await next();
  };
};
