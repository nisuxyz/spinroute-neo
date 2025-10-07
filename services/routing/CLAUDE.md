---

# Auth Service - Bun + Hono + Drizzle + Better Auth + PostgreSQL

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
# Database changes
bun run drizzle:push

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
bun run drizzle:generate
bun run drizzle:migrate
bun run drizzle:push
bun run drizzle:studio

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
- **Auth**: Better Auth with OpenAPI plugin
- **Database**: PostgreSQL with Bun's built-in SQL connector
- **ORM**: Drizzle ORM
- **Runtime**: Bun

## APIs

- Use `Hono` instead of `express` for web framework
- Use `better-auth` for authentication with Drizzle adapter
- Use `drizzle-orm/bun-sql` with Bun's native PostgreSQL support
- Use `Bun.sql` for the database engine (built-in PostgreSQL connector)
- `WebSocket` is built-in in Bun. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Database Schema

Using Drizzle ORM with PostgreSQL for the auth service. Main tables:

```ts#lib/db/auth-schema.ts
import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().$defaultFn(() => false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at").notNull().$defaultFn(() => new Date()),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  userId: text("user_id").notNull().references(() => user.id),
  // ...other fields
});
```

## Database Connection

Using Bun's native PostgreSQL connector with Drizzle:

```ts#lib/drizzle.ts
import { drizzle } from 'drizzle-orm/bun-sql';
import { SQL } from 'bun';

const sql = new SQL(process.env.DATABASE_URL!);
export const db = drizzle({ client: sql });
```

### PostgreSQL Benefits for Microservices
- **Multi-Replica Support**: Perfect for horizontal scaling with multiple auth service replicas
- **ACID Transactions**: Full consistency for authentication operations
- **Concurrent Access**: Excellent performance with multiple readers/writers
- **Production Ready**: Battle-tested for high-load production environments
- **Connection Pooling**: Built-in support for efficient connection management
- **Data Consistency**: Shared state across all service replicas

### Production Considerations
- **High Availability**: Use PostgreSQL clustering or cloud managed services
- **Backup Strategy**: Regular automated backups with point-in-time recovery
- **Connection Limits**: Monitor and configure appropriate connection pools
- **Performance**: Optimize queries and use appropriate indexes

## Authentication Setup

Using Better Auth with Drizzle adapter for PostgreSQL:

```ts#lib/auth.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { openAPI } from "better-auth/plugins";
import { db } from "~lib/drizzle";
import { user, session, account, verification } from "./db/schema";

export const auth = betterAuth({
  plugins: [openAPI()],
  database: drizzleAdapter(db, { 
    provider: "pg",
    schema: { user, session, account, verification }
  }),
  emailAndPassword: { enabled: true },
});
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
- `POST|GET /api/auth/**` - Better Auth endpoints (sign-up, sign-in, etc.)

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
2. Create database: `createdb auth_db`
3. Update `.env` with your local connection string
4. Run migrations: `bun run drizzle:push`
5. Start dev server: `bun run start:dev:hot`

### Database Migrations

```bash
# Generate migration from schema changes
bun run drizzle:generate

# Apply migrations
bun run drizzle:migrate

# Push schema directly (development)
bun run drizzle:push

# Open Drizzle Studio
bun run drizzle:studio
```
