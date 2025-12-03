# Technology Stack

## Architectural Approach

**Database-First, Microservices Only When Essential**

- **Primary Pattern**: Direct Supabase access from frontend with RLS policies
- **Business Logic**: Postgres functions, triggers, and RPCs
- **Microservices**: Only for data ingestion (GBFS) and complex computation (Routing)
- **Security**: Row-level security (RLS) enforced at database level

## Build System & Package Management

- **Package Manager**: Bun (primary), npm/pnpm for specific packages
- **Monorepo**: Bun workspaces with workspace catalogs for dependency management
- **Formatter/Linter**: Biome (configured in `biome.json`)
- **Git Hooks**: Husky for pre-commit formatting
- **Version Manager**: mise (configured in `mise.toml`)

## Database & Backend (Supabase PostgreSQL)

### Primary Data Layer
- **Database**: Supabase (PostgreSQL with PostGIS)
- **Security**: Row-Level Security (RLS) policies
- **Business Logic**: Postgres functions, triggers, RPCs
- **Real-time**: Supabase real-time subscriptions
- **Storage**: Supabase Storage (for profile/bike pictures)
- **Type Generation**: Supabase CLI for TypeScript types
  - Never manually edit the supabase types. Since we are using multiple schemas, you have to use the supabase cli to generate the types.

### Schemas
- **public**: User profiles, auth, subscriptions, profile pictures
- **bikeshare**: Station data, availability, free-floating bikeshare vehicles (from citybik.es via GBFS service)
- **vehicles**: User-owned bikes (personal bikes), maintenance records, bike pictures
- **recording**: Trip recordings, analytics, sensor data, health sync
- **safety**: Location sharing, emergency contacts, crash detection, alerts
- **social**: Achievements, leaderboards, social graph, activity feed, challenges

**Important Distinction**: 
- `bikeshare` schema = public bikeshare data (stations + free-floating vehicles from citybik.es)
- `vehicles` schema = user-owned personal bikes

## Microservices (Minimal)

### GBFS Service (Go)
- **Language**: Go
- **Purpose**: Continuous ingestion from 400+ city feeds
- **Data Source**: citybik.es (stations + free-floating bikeshare vehicles)
- **Data Storage**: `bikeshare` schema in Supabase
- **Deployment**: Fly.io
- **Database**: Supabase client
- **Note**: citybik.es already provides both docked and free-floating data; service will be extended to consume both

### Routing Service (TypeScript/Bun)
- **Framework**: Hono (lightweight web framework)
- **Runtime**: Bun
- **Purpose**: Complex route calculation, provider normalization
- **Database**: Supabase client
- **Shared Utilities**: `shared-utils` workspace package

## Frontend

### Mobile (frontend-expo) - Primary Interface
- **Framework**: React Native with Expo (~54.0)
- **Router**: Expo Router (file-based routing)
- **Maps**: @rnmapbox/maps
- **State**: React hooks with use-debounce
- **Backend**: Direct Supabase JS client access
- **Security**: RLS policies enforce data access
- **Real-time**: Supabase subscriptions for live updates

### Web (frontend) - Planned
- **Framework**: Astro (~5.13)
- **Routing**: File-based
- **Backend**: Same Supabase instance as mobile

## Containerization & Deployment

- **Container Runtime**: Podman (not Docker)
- **Container Files**: `Containerfile` and `Containerfile.dev`
- **Orchestration**: Docker Compose (via `compose.yaml`) for local dev
- **Deployment**: Fly.io (for GBFS and Routing services)

## Common Commands

### Root Level
```bash
bun install              # Install all workspace dependencies
bun run format          # Format code with Biome
```

### Microservices (TypeScript/Bun)
```bash
bun install             # Install dependencies
bun run start:dev       # Run with watch mode
bun run start:dev:hot   # Run with hot reload
bun test                # Run tests

# Migrations managed via Supabase CLI or MCP tools
```

### Container Operations (Local Dev)
```bash
podman build -f Containerfile.dev -t <service>:dev .
podman compose up -d    # Start services
podman compose down     # Stop services
podman compose logs -f  # View logs
```

### Frontend Expo (Primary Development)
```bash
bun install             # Install dependencies
bun run start           # Start Expo dev server
bun run android         # Run on Android
bun run ios             # Run on iOS
bun run ios:build       # Build iOS with EAS
```

### Supabase (Database Operations)
```bash
# Type generation (multiple schemas)
supabase gen types typescript --project-id ftvjoeosbmwedpeekupl --schema=public,bikeshare,vehicles,recording,social > supabase/types.ts

# Migrations (use MCP tools or CLI)
supabase migration new <migration_name>
supabase db push
```

## Code Style

- **Indentation**: 2 spaces
- **Line Width**: 100 characters
- **Quotes**: Single quotes for JavaScript/TypeScript
- **Formatting**: Automated via Biome, enforced by Husky pre-commit hooks

## Development Patterns

### Frontend Data Access
```typescript
// Direct Supabase queries with RLS
const { data, error } = await supabase
  .from('bikeshare.stations')
  .select('*')
  .eq('city', 'Toronto');

// Real-time subscriptions
const subscription = supabase
  .channel('stations')
  .on('postgres_changes', { event: '*', schema: 'bikeshare' }, handleChange)
  .subscribe();

// File uploads (profile/bike pictures)
const { data, error } = await supabase.storage
  .from('bike-pictures')
  .upload(`${userId}/${bikeId}/${filename}`, file);
```

### Database Business Logic
```sql
-- Postgres functions for complex logic
CREATE OR REPLACE FUNCTION calculate_trip_stats(user_id UUID)
RETURNS TABLE(...) AS $$
  -- Business logic here
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for automated processing
CREATE TRIGGER update_maintenance_reminder
  AFTER INSERT ON recording.trips
  FOR EACH ROW EXECUTE FUNCTION check_maintenance_due();

-- RLS policies for premium features
CREATE POLICY "premium_users_unlimited_bikes"
  ON vehicles.bikes
  FOR INSERT
  TO authenticated
  USING (
    (SELECT subscription_tier FROM public.profiles WHERE id = auth.uid()) = 'premium'
    OR
    (SELECT COUNT(*) FROM vehicles.bikes WHERE user_id = auth.uid()) < 3
  );
```

### Feature Gating Implementation
```typescript
// RLS-based feature gating
// Database policies enforce limits based on subscription_tier

// Frontend checks for UI/UX
const { data: profile } = await supabase
  .from('profiles')
  .select('subscription_tier')
  .single();

const isPremium = profile?.subscription_tier === 'premium';

// Conditional feature access
if (isPremium) {
  // Show all route providers, advanced stats, safety features
} else {
  // Show limited features, upgrade prompts
}
```

### Safety Features Implementation
```typescript
// Crash detection (frontend accelerometer)
import { Accelerometer } from 'expo-sensors';

Accelerometer.addListener(({ x, y, z }) => {
  const magnitude = Math.sqrt(x*x + y*y + z*z);
  if (magnitude > CRASH_THRESHOLD) {
    // Trigger crash detection flow
    await supabase.from('safety.safety_events').insert({
      event_type: 'crash_detected',
      location: currentLocation,
      severity: calculateSeverity(magnitude)
    });
  }
});

// Location sharing with route info
const { data } = await supabase
  .from('safety.location_shares')
  .select(`
    *,
    sharer:profiles!sharer_id(*),
    active_trip:recording.trips!trip_id(route, current_bike)
  `)
  .eq('viewer_id', currentUserId)
  .eq('active', true);
```

### Health & Sensor Integration
```typescript
// HealthKit integration (iOS)
import AppleHealthKit from 'react-native-health';

// Sync trip to HealthKit
AppleHealthKit.saveCyclingWorkout({
  startDate: trip.start_time,
  endDate: trip.end_time,
  distance: trip.distance_km * 1000, // meters
  energyBurned: trip.calories
});

// Sensor data during ride
const { data } = await supabase
  .from('recording.sensor_data')
  .insert({
    trip_id: currentTripId,
    timestamp: new Date(),
    heart_rate: heartRateMonitor.value,
    cadence: cadenceSensor.value,
    power: powerMeter.value
  });
```

## Important Notes

- **Database-First**: Most features implemented directly in Supabase with RLS
- **Type Safety**: Always regenerate types after schema changes: `supabase gen types typescript --project-id ftvjoeosbmwedpeekupl --schema=public,bikeshare,vehicles,recording,social`
- **Migrations**: Use Supabase MCP tools or CLI for all database changes
- **Security**: RLS policies enforce all data access control
- **Microservices**: Only use for data ingestion (GBFS) or complex computation (Routing)
- **Never manually edit** generated Supabase types