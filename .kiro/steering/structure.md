# Project Structure

## Monorepo Organization

SpinRoute Neo uses a Bun workspace monorepo with a **database-first architecture**:

```
spinroute-neo/
├── frontend-expo/        # Mobile app (React Native + Expo) - Primary interface
├── frontend/             # Web frontend (Astro) - Planned
├── services/             # Minimal microservices (GBFS, Routing only)
├── shared/               # Shared utilities workspace package
└── docs/                 # Documentation
```

## Architecture Overview

### Database-First Approach
Most features are implemented directly in Supabase with:
- **RLS Policies**: Row-level security for data access control
- **Postgres Functions/RPCs**: Business logic in database
- **Triggers**: Automated data processing and updates
- **Real-time Subscriptions**: Live data updates to frontend

### Microservices (Minimal - Only When Essential)

#### GBFS Service (Go)
**Purpose**: Continuous data ingestion from 400+ city feeds
**Why microservice**: External API polling at scale, Supabase limitation
**Data**: Stations + free-floating bikeshare vehicles from citybik.es
**Storage**: All data stored in `bikeshare` schema

```
services/gbfs/
├── main.go                  # WebSocket consumer
├── handlers/                # Data processing (stations + free-floating vehicles)
├── Containerfile
└── fly.toml                 # Fly.io deployment
```

Note: citybik.es already provides both docked station and free-floating vehicle data. The GBFS service will be extended to consume both data types.

#### Routing Service (TypeScript/Hono)
**Purpose**: Complex route calculation, provider normalization, API aggregation
**Why microservice**: Computationally intensive, multiple external API coordination

```
services/routing/
├── lib/
│   ├── config.ts
│   ├── db.ts                # Supabase client
│   └── db.types.ts          # Generated types
├── src/
│   ├── index.ts
│   └── +routes.api.ts       # Route calculation endpoints
└── Containerfile
```

## Frontend Expo (Mobile) - Primary Interface

**Architecture**: Direct Supabase access with RLS policies

```
frontend-expo/
├── app/
│   ├── (tabs)/              # Tab-based navigation
│   │   ├── _layout.tsx      # Tab layout
│   │   ├── index.tsx        # Home/Map screen
│   │   └── explore.tsx      # Explore screen
│   ├── _layout.tsx          # Root layout
│   └── modal.tsx            # Modal screens
├── components/
│   ├── MainMapView.tsx      # Main map component
│   ├── StationCallout.tsx   # Station info callout
│   ├── StationToggleButton.tsx
│   └── ui/                  # Reusable UI components
├── hooks/
│   ├── use-bikeshare-stations.ts  # Direct Supabase queries
│   ├── use-supabase.ts
│   └── use-theme-color.ts
├── utils/
│   └── supabase.ts          # Supabase client setup
├── constants/
│   └── theme.ts             # Theme configuration
├── assets/
│   └── images/              # App icons and images
└── supabase/
    ├── types.ts             # Generated types
    └── migrations/          # Local migrations
```

**Key Pattern**: Frontend makes direct Supabase calls, security enforced by RLS policies

## Shared Package

```
shared/
├── index.ts                 # Main exports
├── drizzle-geography.ts     # PostGIS/geography helpers
├── supabase-hono.ts         # Supabase middleware for Hono
└── package.json
```

## Database Schemas

Current schemas in Supabase PostgreSQL:

### public
- User profiles
- Authentication (Supabase Auth)
- **Planned**: subscription_status, subscription_tier, profile_pictures

### bikeshare
- Station data and availability ✅
- **Planned**: free_floating_vehicles table (public bikeshare vehicles from citybik.es)
- GBFS service will be extended to consume and store free-floating vehicle data
- Note: This schema is for public bikeshare data, not user-owned bikes

### vehicles
- User-owned bikes ✅ (personal bikes, not public bikeshare)
- **Planned**: 
  - maintenance_records (scheduled maintenance, completed maintenance)
  - bike_pictures (Supabase Storage references for user bike photos)
  - maintenance_reminders (trigger-based calculations)
- Note: This schema is for personal bikes that users own, not public bikeshare vehicles

### recording
- Trip recordings & analytics ✅ (fully implemented)
- **Planned**:
  - sensor_data (heart rate, cadence, power)
  - health_sync_log (HealthKit/Google Fit sync status)

### safety
- **NEW (planned)**:
  - location_shares (active location sharing sessions)
  - emergency_contacts (user emergency contact list)
  - safety_events (crash detections, route deviations)
  - safety_alerts (notifications sent to emergency contacts)

### social
- **NEW (planned)**:
  - achievements (user achievement unlocks)
  - leaderboards (rankings, segments)
  - social_graph (follows, friendships)
  - activity_feed (ride shares, kudos, comments)
  - challenges (monthly challenges, participation)

## Routing Convention (Microservices Only)

Minimal services use **SvelteKit-inspired file-based routing** with `+` prefix:

- `+routes.api.ts`: Public API routes (exposed externally)
- Routes are auto-discovered and registered via Bun's Glob API
- Each route file exports `router` (Hono instance) and `basePath` (string)

Example:
```typescript
// src/feature/+routes.api.ts
import { Hono } from 'hono';

export const basePath = '/api/feature';
export const router = new Hono();

router.get('/endpoint', (c) => c.json({ data: 'value' }));
```

## Configuration Files

- `.env.example`: Environment variable templates (per service)
- `tsconfig.json`: TypeScript configuration
- `compose.yaml`: Podman Compose service definitions (local dev)
- `fly.toml`: Fly.io deployment configs (GBFS service)

## Database Migrations

- **Supabase**: Primary migration system for all schemas
- Migration files are timestamped SQL
- Migrations created via Supabase CLI or MCP tools
- RLS policies defined in migrations

## Development Workflow

1. **Frontend-first**: Most features implemented directly in frontend with Supabase
2. **RLS Security**: Database policies enforce access control
3. **Real-time**: Supabase subscriptions for live data updates
4. **Microservices**: Only GBFS (data ingestion) and Routing (complex computation)
5. **Shared utilities**: Imported via workspace protocol: `shared-utils: workspace:*`
6. **Type safety**: Generated TypeScript types from Supabase schemas
