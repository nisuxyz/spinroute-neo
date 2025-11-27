---

# Vehicle Service - Bun + Hono + Supabase

Default to using Bun instead of Node.js for this microservice.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <### 4. **Configuration Management**
- Environment-based configuration
- Kubernetes ConfigMaps and Secrets
- Production-ready Docker images

## Development Workflow

### Daily Development
```bash
# Start everything
bun run compose:up

# Make code changes (hot reload enabled)
# Database changes are managed via Supabase migrations in supabase/migrations/

# View logs
bun run compose:logs

# Stop when done
bun run compose:down
```

### Production Deployment
```bash
# Build production image
bun run container:build:prod

# Deploy with Helm
helm install spinroute-auth-service ./helm

# Or with kubectl
kubectl apply -f k8s/
```.html|file.ts|file.css>` instead of `webpack` or `esbuild`
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

# Database operations
# Managed via Supabase CLI and migrations in supabase/migrations/
# Use Supabase Studio for database management

# Docker Compose development
bun run compose:up
bun run compose:down
bun run compose:logs

# Container development
bun run container:build
bun run container:dev

# Kubernetes deployment with Kustomize
bun run kustomize:build:dev     # Build dev manifests
bun run kustomize:build:prod    # Build prod manifests
bun run kustomize:deploy:dev    # Deploy to dev
bun run kustomize:deploy:prod   # Deploy to prod

# Helm deployment
bun run helm:lint
bun run helm:install
bun run helm:upgrade
```

## Tech Stack

- **Framework**: Hono (lightweight web framework)
- **Auth**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **Runtime**: Bun

## APIs

- Use `Hono` instead of `express` for web framework
- Use `@supabase/ssr` for server-side authentication with Hono
- Use `@supabase/supabase-js` for database operations
- `WebSocket` is built-in in Bun. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Database Schema

Using Supabase for database management. Schema is managed via SQL migrations in `supabase/migrations/`.

The vehicle service uses the `fleet` schema with tables for vehicles and components. See `lib/db/schema.ts` for documentation.

## Database Connection

Using Supabase JS client:

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

### Supabase Benefits for Microservices
- **Managed PostgreSQL**: No infrastructure management needed
- **Real-time Subscriptions**: Built-in real-time capabilities
- **Row Level Security**: Fine-grained access control
- **Auto-generated APIs**: REST and GraphQL endpoints
- **Connection Pooling**: Built-in Supavisor connection pooler
- **Backups & HA**: Automated backups and high availability

### Production Considerations
- **Connection Pooling**: Use Supabase connection pooler for serverless environments
- **RLS Policies**: Implement proper Row Level Security policies
- **API Keys**: Use service role key for backend, anon key for frontend
- **Performance**: Use appropriate indexes and optimize queries

## Authentication Setup

Using Supabase Auth with Hono middleware:

```ts#lib/auth.ts
import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Context, MiddlewareHandler } from 'hono';
import { setCookie } from 'hono/cookie';

export const supabaseMiddleware = (): MiddlewareHandler => {
  return async (c, next) => {
    const supabase = createServerClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return parseCookieHeader(c.req.header('Cookie') ?? '');
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => 
              setCookie(c, name, value, options)
            );
          },
        },
      }
    );

    c.set('supabase', supabase);
    await next();
  };
};
```

## Server Setup

Using Hono with auto-route discovery:

```ts#src/index.ts
import { Hono } from 'hono'
import { showRoutes } from 'hono/dev';
import { Glob } from "bun";
import { auth } from '../lib/auth';

const app = new Hono()

app.get('/', (c) => c.text('hello auth-service'))
  .get('/health', (c) => c.json({ status: 'ok' }))
  .on(["POST", "GET"], "/api/auth/**", (c) => auth.handler(c.req.raw));

// Auto-import routes from feature/**/+routes.*.ts
async function loadRoutes() {
  const glob = new Glob('./feature/**/+routes.*.ts');
  for await (const file of glob.scan(".")) {
    const module = await import(file);
    if (module.router && module.basePath) {
      app.route(module.basePath, module.router);
    }
  }
}

await loadRoutes();
showRoutes(app);
```

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("auth service health", async () => {
  const response = await fetch("http://localhost:3000/health");
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.status).toBe("ok");
});
```

## Docker Development

The service includes Docker setup for containerized development:

```dockerfile#Dockerfile.dev
# Uses Bun's official Docker image
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
bun run container:build
bun run container:dev
```

## Environment Variables

Required environment variables:

```env
# Database (PostgreSQL connection string)
DATABASE_URL=postgresql://userlocaldevpasswordpostgres-service:5432/auth_db

# Auth
BETTER_AUTH_SECRET=your_production_secret
BETTER_AUTH_URL=http://auth-service:3000

# Service Communication (for microservice security)
API_GATEWAY_SECRET=shared_secret_with_gateway
INTERNAL_SERVICE_SECRET=shared_secret_for_services

# CORS
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com
```

## API Endpoints

### Public Endpoints
- `GET /` - Service welcome message
- `GET /health` - Health check endpoint (for K8s liveness probe)
- `GET /ready` - Readiness check (for K8s readiness probe)
- `GET /live` - Liveness check
- Authentication is handled by Supabase Auth (not exposed through this service)

### Internal Service Endpoints (require service auth)
- `POST /api/internal/validate` - Validate JWT token (used by API gateway)
- `GET /api/internal/user` - Get user info from token (for service-to-service)

### Auto-discovered Routes
- Routes from `src/feature/**/+routes.*.ts`

## Microservice Architecture Setup

This auth service is designed for a microservice architecture with:

### 1. **API Gateway Integration**
- Gateway validates requests using `/api/internal/validate` endpoint
- Uses `x-gateway-auth` header for service authentication
- Other services trust requests from gateway

### 2. **Service-to-Service Communication**
- Internal endpoints protected with `x-service-auth` header
- Rate limiting and validation middleware
- JWT token validation for service requests

### 3. **Kubernetes Deployment Options**

#### Kustomize (Recommended)
```bash
# Development deployment (1 replica + embedded postgres)
kubectl apply -k kustomize/overlays/dev

# Production deployment (3 replicas + external postgres)
kubectl apply -k kustomize/overlays/prod

# Preview changes
kubectl kustomize kustomize/overlays/dev
```

#### Helm Charts
```bash
# Deploy with Helm
helm install auth-service ./helm

# Production values
helm install auth-service ./helm -f values-prod.yaml
```

### 4. **Health Checks**
- `/health` - Basic service health
- `/ready` - Database connectivity check
- `/live` - Service liveness
- Configured for Kubernetes probes

### 5. **Configuration Management**
- Environment-based configuration
- Kubernetes ConfigMaps and Secrets
- Production-ready Docker images

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.md`.

## Local Development Setup

### Using Docker Compose (Recommended)

The easiest way to get started is with Docker Compose, which includes PostgreSQL:

```bash
# Start all services (auth-service + PostgreSQL)
bun run compose:up

# View logs
bun run compose:logs

# Stop services
bun run compose:down
```

Your compose setup includes:
- `spinroute-auth-service` - The auth service container
- `db` - PostgreSQL 16 container with persistent storage
- Automatic dependency management and health checks

### Using Local PostgreSQL

If you prefer to run PostgreSQL locally:

1. Install and start PostgreSQL
2. Set up Supabase project and get credentials
3. Update `.env` with Supabase URL and keys
4. Run migrations: Apply SQL migrations from `supabase/migrations/`
5. Start dev server: `bun run start:dev:hot`

### Database Migrations

Database schema is managed via Supabase SQL migrations in the `supabase/migrations/` directory.

```bash
# Create a new migration
supabase migration new <migration_name>

# Apply migrations locally
supabase db push

# Generate TypeScript types
supabase gen types typescript --project-id <id> --schema fleet > lib/db.types.ts
```
