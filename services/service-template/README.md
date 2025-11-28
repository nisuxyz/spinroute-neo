# Service Template

A template for creating new microservices in the SpinRoute Neo monorepo.

## Tech Stack

- **Runtime**: Bun
- **Framework**: Hono
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth

## Quick Start

### Install Dependencies
```sh
bun install
```

### Configure Environment
```sh
cp .env.example .env
# Edit .env with your Supabase credentials
```

### Run Development Server
```sh
bun run start:dev:hot  # With hot reload
bun run start:dev      # With watch mode
```

### Using Docker Compose
```sh
bun run compose:up     # Start service
bun run compose:logs   # View logs
bun run compose:down   # Stop service
```

Open http://localhost:3000

## Project Structure

```
service-template/
├── lib/
│   ├── auth.ts          # Supabase auth middleware
│   ├── config.ts        # Configuration
│   ├── db.ts            # Supabase client
│   └── db.types.ts      # Generated types
├── src/
│   ├── index.ts         # Main entry point
│   ├── health.ts        # Health check endpoints
│   └── feature/
│       └── +routes.api.ts    # Auto-loaded routes
├── supabase/
│   └── migrations/      # Database migrations
└── compose.yaml         # Docker Compose config
```

## Creating Routes

Routes use a SvelteKit-inspired convention with `+` prefix:

```typescript
// src/feature/+routes.api.ts
import { Hono } from 'hono';
import { requireAuth } from '../../lib/auth';

export const basePath = '/api/feature';
export const router = new Hono();

router.get('/endpoint', requireAuth(), (c) => {
  const user = c.get('user');
  return c.json({ userId: user?.id });
});
```

## Database Migrations

```bash
# Create migration (using Supabase CLI or MCP tools)
supabase migration new <name>

# Apply migrations
supabase db push

# Generate types
supabase gen types typescript --project-id <id> --schema <schema> > lib/db.types.ts
```

## Available Scripts

- `bun run start` - Production server
- `bun run start:dev` - Development with watch mode
- `bun run start:dev:hot` - Development with hot reload
- `bun run compose:up` - Start with Docker Compose
- `bun run compose:down` - Stop Docker Compose
- `bun run compose:logs` - View logs
- `bun test` - Run tests

## Health Endpoints

- `GET /health` - Basic health check
- `GET /ready` - Readiness check (includes DB connectivity)
- `GET /live` - Liveness check
