// import { createClient } from '@supabase/supabase-js'
import type { Database } from './db.types';
import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import { setCookie } from 'hono/cookie';
import type { Context } from 'hono';

// export const createSupabaseClient = () => createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!, {
//   // Provide a custom schema. Defaults to "public".
//   db: { schema: 'bikeshare' }
// });

export const createSupabaseClient = (c: Context) =>
  createServerClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!, {
    cookies: {
      getAll() {
        return parseCookieHeader(c.req.header('cookie') || '');
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          setCookie(c, name, value, options as any);
        });
      },
    },
    db: { schema: 'bikeshare' },
  });
