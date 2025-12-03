# Service Template - Bun + Hono + Supabase

Default to using Bun instead of Node.js for this microservice.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Bun automatically loads .env, so don't use dotenv.

## Development Commands

```bash
# Local development with hot reload
bun run start:dev:hot

# Local development with watch mode
bun run start:dev

# Production server
bun run start

# Container development
bun run container:build:dev
bun run compose:up
bun run compose:down
bun run compose:logs
```

## Tech Stack

- **Framework**: Hono (lightweight web framework)
- **Auth**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **Runtime**: Bun

## APIs

- Use `Hono` instead of `express` for web framework
- Use `@supabase/supabase-js` for database and authentication
- Use `@supabase/ssr` for server-side rendering support
- `WebSocket` is built-in in Bun. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Use `Bun.spawn` instead of execa.

## Database Schema

Using Supabase with SQL migrations. Migrations are stored in `supabase/migrations/`.

Generate TypeScript types:
```bash
supabase gen types typescript --project-id <id> --schema <schema> > lib/db.types.ts
```

## Database Connection

Using Supabase client:

```ts#lib/db.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './db.types';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
```

## Authentication Setup

Using Supabase Auth with middleware:

```ts#lib/auth.ts
import { createServerClient } from '@supabase/ssr';
import { supabaseMiddleware, authMiddleware, requireAuth } from 'shared-utils';

// Apply globally
app.use('*', supabaseMiddleware());

// Optional: extract user/session
app.use('*', authMiddleware);

// Require authentication
app.use('/protected/*', requireAuth());
```

## Server Setup

Using Hono with auto-route discovery:

```ts#src/index.ts
import { Hono } from 'hono';
import { showRoutes } from 'hono/dev';
import { Glob } from 'bun';
import { supabaseMiddleware } from '../lib/auth';
import { healthRouter } from './health';

const app = new Hono();

// Apply Supabase middleware globally
app.use('*', supabaseMiddleware());

// Health check routes
app.route('/', healthRouter);

// Auto-import routes from **/+routes.*.ts
async function loadRoutes() {
  const glob = new Glob('./**/+routes.*.ts');
  const files = glob.scanSync('./src');

  for (const file of files) {
    const module = await import(file);
    if (module.router && module.basePath) {
      app.route(module.basePath, module.router);
    }
  }
}

await loadRoutes();
showRoutes(app);

export default {
  port: 3000,
  hostname: '0.0.0.0',
  fetch: app.fetch,
};
```

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("service health", async () => {
  const response = await fetch("http://localhost:3000/health");
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.status).toBe("ok");
});
```

## Container Development

The service includes container setup for development:

```dockerfile#Containerfile.dev
FROM oven/bun:1 as base
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install
COPY . .
EXPOSE 3000
CMD ["bun", "run", "start:dev"]
```

Build and run:
```bash
bun run container:build:dev
bun run compose:up
```

## Environment Variables

Required environment variables:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Server
PORT=3000
NODE_ENV=development
```

## API Endpoints

### Public Endpoints
- `GET /health` - Health check endpoint
- `GET /ready` - Readiness check (includes database connectivity)
- `GET /live` - Liveness check
- `GET /api/hello` - Example endpoint

### Auto-discovered Routes
- Routes from `src/**/+routes.api.ts` - Public API routes
- Routes from `src/**/+routes.internal.ts` - Internal routes

## Routing Convention

Services use a **SvelteKit-inspired file-based routing** with `+` prefix:

- `+routes.api.ts`: Public API routes (exposed externally)
- `+routes.internal.ts`: Internal service routes
- Routes are auto-discovered and registered via Bun's Glob API
- Each route file exports `router` (Hono instance) and `basePath` (string)

Example:
```typescript
// src/feature/+routes.api.ts
import { Hono } from 'hono';
import { requireAuth } from '../../lib/auth';

export const basePath = '/api/feature';
export const router = new Hono();

// Public endpoint
router.get('/public', (c) => c.json({ data: 'value' }));

// Protected endpoint
router.get('/protected', requireAuth(), (c) => {
  const user = c.get('user');
  return c.json({ userId: user?.id });
});
```

## Health Checks

The service includes three health check endpoints:

- `/health` - Basic service health
- `/ready` - Database connectivity check
- `/live` - Service liveness

These are configured for container orchestration (Kubernetes, Docker Compose).

## Local Development Setup

### Using Docker Compose (Recommended)

```bash
# Start service
bun run compose:up

# View logs
bun run compose:logs

# Stop service
bun run compose:down
```

### Using Local Bun

1. Copy `.env.example` to `.env` and configure Supabase credentials
2. Start dev server: `bun run start:dev:hot`

## Supabase Migrations

Create and apply migrations using Supabase CLI or MCP tools:

```bash
# Using Supabase CLI
supabase migration new <migration_name>
supabase db push

# Generate types after schema changes
supabase gen types typescript --project-id <id> --schema <schema> > lib/db.types.ts
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.md`.
