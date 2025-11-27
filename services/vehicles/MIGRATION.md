# Migration from Drizzle + Better Auth to Supabase

This document outlines the changes made to migrate the vehicle service from Drizzle ORM and Better Auth to Supabase.

## Files Removed

- `drizzle.config.ts` - Drizzle configuration
- `lib/drizzle.ts` - Drizzle client setup
- `lib/db/seed.ts` - Drizzle seed file (was commented out)

## Files Created

- `lib/db.ts` - Supabase client setup
- `AUTH.md` - Documentation for authentication with Supabase

## Files Modified

### `lib/auth.ts`
- Completely replaced Better Auth with Supabase Auth
- Changed from `betterAuth()` to `supabaseMiddleware()` for Hono
- Now uses `@supabase/ssr` for server-side authentication
- Implements cookie-based session management

### `lib/db/schema.ts`
- Converted from Drizzle schema definitions to documentation
- Schema is now managed via Supabase SQL migrations in `supabase/migrations/`

### `lib/auth-middleware.ts`
- **DELETED** - Consolidated into `lib/auth.ts`
- All middleware now in one file for clarity

### `src/index.ts`
- Removed Better Auth handler routes
- Added global Supabase middleware
- Simplified authentication setup

### `src/feature/internal/+routes.internal.ts`
- Updated token validation to use Supabase Auth
- Changed from Better Auth session API to `supabase.auth.getUser()`
- Simplified user info retrieval

### `package.json`
- Removed `drizzle-orm` and `drizzle-kit` dependencies
- Removed `pg` dev dependency
- Removed `better-auth` and `@better-auth/cli` dependencies
- Removed all `drizzle:*` scripts
- Fixed service name references (bikeshare -> vehicle)

### `.env.example`
- Removed `DATABASE_URL`
- Added `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

### `Containerfile`
- Removed Drizzle config and migration steps
- Simplified build process

### `CLAUDE.md`
- Updated service description (removed Better Auth reference)
- Replaced Drizzle documentation with Supabase documentation
- Replaced Better Auth examples with Supabase Auth examples
- Updated code examples
- Updated migration instructions

## Environment Variables

The service now requires:

```env
SUPABASE_URL="https://instance.supabase.co"
SUPABASE_ANON_KEY="anon key"
SUPABASE_SERVICE_ROLE_KEY="service role key"
```

## Database Schema Management

Database schema is now managed via Supabase SQL migrations in the `supabase/migrations/` directory.

To generate TypeScript types:
```bash
supabase gen types typescript --project-id <id> --schema fleet > lib/db.types.ts
```

## Authentication Changes

The service now uses Supabase Auth instead of Better Auth:

- Authentication is handled via Supabase's built-in auth system
- Session management uses cookies via `@supabase/ssr`
- JWT validation is done through Supabase's `getUser()` method
- No separate auth routes needed - handled by Supabase

## Next Steps

1. Ensure Supabase project is set up with Auth enabled
2. Apply migrations from `supabase/migrations/`
3. Update environment variables (remove Better Auth vars if any)
4. Run `bun install` to update dependencies
5. Test authentication flows
6. Test the service
