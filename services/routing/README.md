# Routing Service

The Routing Service provides route calculation capabilities for the SpinRoute Neo platform. It abstracts multiple routing providers behind a unified API that returns Mapbox Directions API-compatible responses.

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

## API Endpoints

### POST /api/routing/directions

Calculate a route between waypoints.

**Authentication**: Required (Bearer token)

**Request Body**:
```json
{
  "waypoints": [
    { "latitude": 40.7128, "longitude": -74.0060 },
    { "latitude": 40.7589, "longitude": -73.9851 }
  ],
  "profile": "cycling",
  "bikeType": "road",
  "provider": "mapbox"
}
```

**Response**:
```json
{
  "code": "Ok",
  "routes": [...],
  "waypoints": [...],
  "provider": "mapbox",
  "warnings": []
}
```

### GET /api/routing/providers

Get available routing providers and their capabilities.

**Authentication**: Required (Bearer token)

**Response**:
```json
{
  "providers": [
    {
      "name": "mapbox",
      "displayName": "Mapbox",
      "capabilities": {
        "profiles": ["walking", "cycling", "driving"],
        "bikeTypes": ["generic"],
        "multiModal": false,
        "requiresPaidPlan": false
      },
      "available": true
    }
  ],
  "defaultProvider": "mapbox"
}
```

## Health Endpoints

- `GET /health` - Health check with provider availability status
- `GET /ready` - Readiness check (includes DB connectivity)
- `GET /live` - Liveness check

## Supported Providers

### Mapbox Directions API
- **Profiles**: Walking, Cycling, Driving
- **Bike Types**: Generic cycling only
- **Multi-modal**: No
- **Plan**: Free (included for all users)

## Configuration

Environment variables in `.env`:

```bash
# Mapbox
MAPBOX_ACCESS_TOKEN=your_mapbox_token

# Routing Configuration
DEFAULT_PROVIDER=mapbox
REQUEST_TIMEOUT=5000
CACHE_ENABLED=true
CACHE_TTL=900
```

## Testing

Run the test script to verify endpoints:

```bash
bun run test-endpoints.ts
```

Note: You'll need a valid Supabase auth token to test authenticated endpoints.
