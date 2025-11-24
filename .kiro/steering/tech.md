# Technology Stack

## Build System & Package Management

- **Package Manager**: Bun (primary), npm/pnpm for specific packages
- **Monorepo**: Bun workspaces with workspace catalogs for dependency management
- **Formatter/Linter**: Biome (configured in `biome.json`)
- **Git Hooks**: Husky for pre-commit formatting
- **Version Manager**: mise (configured in `mise.toml`)

## Backend Services

### TypeScript/Bun Services
- **Framework**: Hono (lightweight web framework)
- **Runtime**: Bun
- **Database ORM**: Drizzle ORM
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Better Auth with Supabase integration
- **Shared Utilities**: `shared-utils` workspace package

### Go Services
- **Language**: Go (for GBFS real-time data service)
- **WebSocket**: CityBikes API consumer
- **Database**: Supabase client

## Frontend

### Mobile (frontend-expo)
- **Framework**: React Native with Expo (~54.0)
- **Router**: Expo Router (file-based routing)
- **Maps**: @rnmapbox/maps
- **State**: React hooks with use-debounce
- **Backend**: Supabase JS client

### Web (frontend)
- **Framework**: Astro (~5.13)
- **Routing**: File-based

## Database & Backend Services

- **Database**: Supabase (PostgreSQL)
- **Schema Management**: Drizzle Kit for migrations
- **Type Generation**: Supabase CLI for TypeScript types

## Containerization & Deployment

- **Container Runtime**: Podman (not Docker)
- **Container Files**: `Containerfile` and `Containerfile.dev`
- **Orchestration**: Docker Compose (via `compose.yaml`)
- **Deployment**: Fly.io (for Go services), Kubernetes with Kustomize

## Common Commands

### Root Level
```bash
bun install              # Install all workspace dependencies
bun run format          # Format code with Biome
```

### Backend/Services (TypeScript)
```bash
bun install             # Install dependencies
bun run start:dev       # Run with watch mode
bun run start:dev:hot   # Run with hot reload
bun test                # Run tests
bun run drizzle:generate # Generate database migrations
bun run drizzle:push    # Push schema changes
bun run drizzle:studio  # Open Drizzle Studio
```

### Container Operations
```bash
podman build -f Containerfile.dev -t <service>:dev .
podman compose up -d    # Start services
podman compose down     # Stop services
podman compose logs -f  # View logs
```

### Frontend Expo
```bash
bun install             # Install dependencies
bun run start           # Start Expo dev server
bun run android         # Run on Android
bun run ios             # Run on iOS
bun run ios:build       # Build iOS with EAS
```

### Supabase
```bash
supabase gen types typescript --project-id <id> --schema <schema> > lib/db.types.ts
```

## Code Style

- **Indentation**: 2 spaces
- **Line Width**: 100 characters
- **Quotes**: Single quotes for JavaScript/TypeScript
- **Formatting**: Automated via Biome, enforced by Husky pre-commit hooks
