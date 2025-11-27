# Authentication with Supabase

The vehicle service uses Supabase Auth for authentication. Authentication is handled entirely by Supabase, not by this service.

## How It Works

1. **Client Authentication**: Clients (web/mobile apps) authenticate directly with Supabase Auth
2. **Session Management**: Supabase manages sessions via cookies using `@supabase/ssr`
3. **Token Validation**: The service validates JWTs from Supabase on each request
4. **User Context**: Authenticated user information is available in route handlers via the Supabase client

## Middleware

The service provides three middleware options in `lib/auth.ts`:

### 1. `supabaseMiddleware()` - Required, apply globally
Creates a Supabase client for each request and handles cookie-based session management.

```typescript
// In src/index.ts
app.use('*', supabaseMiddleware());
```

### 2. `authMiddleware` - Optional, for routes that may have auth
Extracts user and session from Supabase and adds them to context. User/session will be `null` if not authenticated.

```typescript
router.use('*', authMiddleware);

router.get('/profile', (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ message: 'Not logged in' });
  }
  return c.json({ userId: user.id });
});
```

### 3. `requireAuth()` - Optional, for protected routes
Returns 401 if user is not authenticated. Adds user and session to context.

```typescript
router.use('*', requireAuth());

router.get('/protected', (c) => {
  const user = c.get('user'); // Always present here
  return c.json({ userId: user.id });
});
```

## Usage Patterns

### Pattern 1: Manual auth check (most flexible)
```typescript
import { getSupabase } from '../lib/auth';

router.get('/data', async (c) => {
  const supabase = getSupabase(c);
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  return c.json({ userId: user.id });
});
```

### Pattern 2: Using requireAuth middleware (cleanest for protected routes)
```typescript
import { requireAuth } from '../lib/auth';

const router = new Hono();
router.use('*', requireAuth());

router.get('/data', (c) => {
  const user = c.get('user'); // Guaranteed to exist
  return c.json({ userId: user.id });
});
```

### Pattern 3: Using authMiddleware (for optional auth)
```typescript
import { authMiddleware } from '../lib/auth';

const router = new Hono();
router.use('*', authMiddleware);

router.get('/data', (c) => {
  const user = c.get('user');
  if (user) {
    return c.json({ message: 'Hello ' + user.email });
  }
  return c.json({ message: 'Hello guest' });
});
```

## Authentication Endpoints

Authentication endpoints are provided by Supabase directly:

- Sign up: `POST https://<project>.supabase.co/auth/v1/signup`
- Sign in: `POST https://<project>.supabase.co/auth/v1/token?grant_type=password`
- Sign out: `POST https://<project>.supabase.co/auth/v1/logout`
- Refresh token: `POST https://<project>.supabase.co/auth/v1/token?grant_type=refresh_token`

Clients should use the Supabase client libraries which handle these endpoints automatically.

## Internal Service Endpoints

The vehicle service provides internal endpoints for other services:

- `POST /api/internal/validate` - Validate a JWT token
- `GET /api/internal/user` - Get user info from a token

These endpoints require internal service authentication via the `x-service-auth` header.

## Environment Variables

Required environment variables:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Row Level Security (RLS)

Database access control is managed via Supabase Row Level Security policies. The JWT token contains user information that RLS policies can use to restrict data access.

Example RLS policy:

```sql
CREATE POLICY "Users can only see their own vehicles"
ON fleet.vehicle
FOR SELECT
USING (auth.uid() = user_id);
```
