---
inclusion: always
---

# Project Structure

## Monorepo Layout

```
spinroute-neo/
├── frontend-expo/    # Mobile app (React Native + Expo) - Primary interface
├── frontend/         # Web frontend (Astro) - Planned
├── services/         # Microservices (GBFS, Routing, IAP)
├── shared/           # Shared utilities workspace package
├── scripts/          # Maintenance scripts
└── docs/             # Documentation and reference implementations
```

## Architecture: Database-First

Most features use direct Supabase access with:
- **RLS Policies**: Row-level security for access control
- **Postgres Functions/RPCs**: Business logic in database
- **Triggers**: Automated data processing
- **Real-time Subscriptions**: Live updates to frontend

Microservices exist only for: external API polling (GBFS), complex computation (Routing), payment processing (IAP).

## Services

### GBFS Service (Go)
Continuous data ingestion from citybik.es for bikeshare stations and vehicles.

```
services/gbfs/
├── cmd/gbfs-service/       # Entry point
├── internal/
│   ├── citybikes-poller/   # Polling logic
│   ├── station-mapper/     # Station data mapping
│   ├── vehicle-mapper/     # Free-floating vehicle mapping
│   ├── supabase/           # Database client
│   ├── batch-queue/        # Batch processing
│   └── uuidfy/             # Deterministic UUID generation
├── Containerfile
└── fly.toml
```

### Routing Service (TypeScript/Hono)
Route calculation and provider normalization.

```
services/routing/
├── lib/
│   ├── config.ts           # Configuration
│   ├── db.ts               # Supabase client
│   ├── auth.ts             # Authentication
│   └── providers/          # Route provider integrations
├── src/
│   ├── index.ts            # Entry point
│   ├── routing/            # Route calculation
│   └── feature/            # Feature endpoints
└── Containerfile
```

### IAP Service (TypeScript/Hono)
In-app purchase verification and subscription management.

```
services/iap/
├── src/                    # IAP verification logic
├── certs/                  # Apple certificates
├── keys/                   # API keys
└── Containerfile
```

## Frontend Expo (Mobile)

Direct Supabase access with RLS policies.

```
frontend-expo/
├── app/                    # Expo Router (file-based)
│   ├── _layout.tsx         # Root layout
│   ├── index.tsx           # Home/Map screen
│   ├── auth.tsx            # Authentication
│   ├── settings.tsx        # Settings
│   ├── bikes.tsx           # Bike list
│   ├── bikes/              # Bike detail routes
│   ├── trips.tsx           # Trip list
│   └── trip/               # Trip detail routes
├── components/             # UI components
├── hooks/                  # Custom hooks (use-*.ts)
├── utils/                  # Utilities
├── contexts/               # React contexts
├── constants/              # Theme, config
├── lib/                    # Shared utilities
└── supabase/
    ├── types.ts            # Generated types (never edit manually)
    └── migrations/         # Local migrations
```

## Database Schemas

| Schema | Purpose | Status |
|--------|---------|--------|
| `public` | User profiles, auth, subscriptions | ✅ Active |
| `bikeshare` | Public bikeshare stations & vehicles | ✅ Active |
| `vehicles` | User-owned personal bikes | ✅ Active |
| `recording` | Trip recordings & analytics | ✅ Active |
| `safety` | Location sharing, emergency contacts | Planned |
| `social` | Achievements, leaderboards, challenges | Planned |

**Important**: `bikeshare` = public bikeshare data; `vehicles` = user-owned bikes.

## File Conventions

### Microservice Routing (TypeScript)
SvelteKit-inspired file-based routing with `+` prefix:
- `+routes.api.ts`: Public API routes
- Export `router` (Hono instance) and `basePath` (string)

### Frontend Hooks
- Prefix: `use-*.ts` (e.g., `use-bikeshare-stations.ts`)
- Direct Supabase queries with RLS enforcement

### Type Generation
Never manually edit `supabase/types.ts`. Regenerate with:
```bash
supabase gen types typescript --project-id <id> --schema=public,bikeshare,vehicles,recording,social > supabase/types.ts
```

## Key Files

| File | Purpose |
|------|---------|
| `compose.yaml` | Podman Compose for local dev |
| `fly.toml` | Fly.io deployment config |
| `Containerfile` | Production container |
| `Containerfile.dev` | Development container |
| `.env.example` | Environment template |

## Development Workflow

1. Frontend-first: Implement features directly with Supabase
2. RLS Security: Database policies enforce access control
3. Real-time: Use Supabase subscriptions for live updates
4. Microservices: Only for external APIs or complex computation
5. Shared utilities: Import via `shared-utils: workspace:*`
6. Type safety: Always regenerate types after schema changes
