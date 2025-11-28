# Design Document

## Overview

The Trip Recording feature provides a comprehensive system for capturing, storing, and analyzing cycling trip data. The design leverages PostGIS spatial database capabilities for efficient geographic data storage and querying, enabling users to record detailed ride information including location tracks, elevation profiles, and performance metrics.

The system follows a microservices architecture with the Recording Service handling all trip-related operations, the Mobile App capturing sensor data during rides, and the API Gateway managing authentication and request routing.

## Architecture

### System Components

```
┌─────────────┐         ┌──────────────┐         ┌──────────────────┐
│             │         │              │         │                  │
│  Mobile App │────────▶│ API Gateway  │────────▶│ Recording Service│
│   (Expo)    │         │ (Better Auth)│         │     (Hono)       │
│             │         │              │         │                  │
└─────────────┘         └──────────────┘         └──────────────────┘
                                                           │
                                                           ▼
                                                  ┌─────────────────┐
                                                  │   Supabase      │
                                                  │   (PostgreSQL   │
                                                  │    + PostGIS)   │
                                                  └─────────────────┘
```

### Data Flow

1. **Trip Start**: User initiates recording → Mobile App creates trip record directly in Supabase (RLS enforces user_id)
2. **Location Capture**: Mobile App captures GPS data at configured interval → Batches points → Inserts directly to Supabase trip_points table (RLS enforces ownership)
3. **Trip Stop**: User stops recording → Mobile App updates trip status → Database trigger calculates basic statistics → Advanced statistics calculated asynchronously by Recording Service
4. **Trip Retrieval**: Mobile App queries Supabase directly with RLS filtering → Returns trip list with summary data
5. **Route Visualization**: Mobile App queries Supabase for trip points → Generates GeoJSON LineString client-side or via database function

### Technology Stack

- **Backend Service**: Hono (TypeScript/Bun runtime)
- **Database**: Supabase (PostgreSQL 15+ with PostGIS extension)
- **Authentication**: Supabase Auth (JWT tokens)
- **Mobile Client**: React Native with Expo
- **API Protocol**: REST with JSON payloads
- **Spatial Data**: PostGIS GEOGRAPHY type with SRID 4326

## Components and Interfaces

### Database Schema

#### recording Schema

All tables will be created in a dedicated `recording` schema to namespace the service data.

```sql
create schema if not exists recording;
```

#### trips Table

Stores trip metadata.

```sql
create table recording.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Status tracking
  status text not null check (status in ('in_progress', 'paused', 'completed')),
  
  -- Timestamps
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  
  -- Optional metadata
  title text check (char_length(title) <= 200),
  notes text check (char_length(notes) <= 2000),
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for efficient querying
create index idx_trips_user_id_started_at on recording.trips(user_id, started_at desc);
create index idx_trips_status on recording.trips(status);
create index idx_trips_user_id_status on recording.trips(user_id, status);

-- Row Level Security
alter table recording.trips enable row level security;

-- Users can only see their own trips
create policy "Users can view own trips"
  on recording.trips for select
  using (auth.uid() = user_id);

-- Users can insert their own trips
create policy "Users can insert own trips"
  on recording.trips for insert
  with check (auth.uid() = user_id);

-- Users can update their own trips
create policy "Users can update own trips"
  on recording.trips for update
  using (auth.uid() = user_id);

-- Users can delete their own trips
create policy "Users can delete own trips"
  on recording.trips for delete
  using (auth.uid() = user_id);
```

#### trip_basic_stats Table

Stores basic statistics available to all users (free tier).

```sql
create table recording.trip_basic_stats (
  trip_id uuid primary key references recording.trips(id) on delete cascade,
  
  -- Basic metrics
  distance_km numeric(10, 3), -- kilometers with 3 decimal precision
  duration_seconds integer, -- total duration in seconds
  moving_duration_seconds integer, -- duration excluding pauses
  avg_speed_kmh numeric(6, 2), -- km/h with 2 decimal precision
  max_speed_kmh numeric(6, 2),
  
  -- Route geometry (computed from trip_points)
  route_geom geography(LineString, 4326),
  
  calculated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Spatial index on route geometry
create index idx_trip_basic_stats_route_geom on recording.trip_basic_stats using gist(route_geom);

-- Row Level Security
alter table recording.trip_basic_stats enable row level security;

-- Users can view stats for their own trips
create policy "Users can view own trip basic stats"
  on recording.trip_basic_stats for select
  using (
    exists (
      select 1 from recording.trips
      where trips.id = trip_basic_stats.trip_id
      and trips.user_id = auth.uid()
    )
  );
```

#### trip_advanced_stats Table

Stores advanced statistics available to paid users.

```sql
create table recording.trip_advanced_stats (
  trip_id uuid primary key references recording.trips(id) on delete cascade,
  
  -- Elevation metrics
  elevation_gain_m numeric(8, 2), -- meters with 2 decimal precision
  elevation_loss_m numeric(8, 2),
  max_elevation_m numeric(8, 2),
  min_elevation_m numeric(8, 2),
  
  -- Speed analysis
  avg_moving_speed_kmh numeric(6, 2),
  speed_percentile_50_kmh numeric(6, 2), -- median speed
  speed_percentile_95_kmh numeric(6, 2),
  
  -- Sensor data averages (when available)
  avg_heart_rate_bpm integer,
  max_heart_rate_bpm integer,
  avg_cadence_rpm integer,
  avg_power_watts integer,
  
  -- Time analysis
  stopped_time_seconds integer, -- time with speed < 1 km/h
  pause_count integer,
  
  calculated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Row Level Security
alter table recording.trip_advanced_stats enable row level security;

-- Users can view advanced stats for their own trips (will add subscription check later)
create policy "Users can view own trip advanced stats"
  on recording.trip_advanced_stats for select
  using (
    exists (
      select 1 from recording.trips
      where trips.id = trip_advanced_stats.trip_id
      and trips.user_id = auth.uid()
    )
  );
```

#### trip_points Table

Stores individual GPS location samples captured during a trip. This table will be partitioned by month for optimal performance with large datasets.

```sql
create table recording.trip_points (
  id uuid default gen_random_uuid(),
  trip_id uuid not null references recording.trips(id) on delete cascade,
  
  -- Location data
  location geography(Point, 4326) not null,
  altitude_m numeric(8, 2), -- meters above sea level
  accuracy_m numeric(6, 2), -- GPS accuracy in meters
  
  -- Timestamp
  recorded_at timestamptz not null,
  
  -- Speed (can be calculated or provided by device)
  speed_kmh numeric(6, 2),
  
  -- Optional sensor data (post-MVP)
  heart_rate_bpm integer,
  cadence_rpm integer,
  power_watts integer,
  
  created_at timestamptz not null default now(),
  
  primary key (trip_id, recorded_at, id)
) partition by range (recorded_at);

-- Create initial partitions (example for 2025)
create table recording.trip_points_2025_01 partition of recording.trip_points
  for values from ('2025-01-01') to ('2025-02-01');

create table recording.trip_points_2025_02 partition of recording.trip_points
  for values from ('2025-02-01') to ('2025-03-01');

-- Indexes on partitioned table
create index idx_trip_points_trip_id on recording.trip_points(trip_id);
create index idx_trip_points_recorded_at on recording.trip_points(recorded_at);
create index idx_trip_points_location on recording.trip_points using gist(location);

-- Row Level Security
alter table recording.trip_points enable row level security;

-- Users can view points for their own trips
create policy "Users can view own trip points"
  on recording.trip_points for select
  using (
    exists (
      select 1 from recording.trips
      where trips.id = trip_points.trip_id
      and trips.user_id = auth.uid()
    )
  );

-- Users can insert points for their own active trips
create policy "Users can insert points for own active trips"
  on recording.trip_points for insert
  with check (
    exists (
      select 1 from recording.trips
      where trips.id = trip_points.trip_id
      and trips.user_id = auth.uid()
      and trips.status in ('in_progress', 'paused')
    )
  );
```

#### pause_events Table

Tracks pause and resume events for accurate moving time calculation.

```sql
create table recording.pause_events (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references recording.trips(id) on delete cascade,
  
  paused_at timestamptz not null,
  resumed_at timestamptz,
  
  created_at timestamptz not null default now()
);

create index idx_pause_events_trip_id on recording.pause_events(trip_id);

-- Row Level Security
alter table recording.pause_events enable row level security;

-- Users can view pause events for their own trips
create policy "Users can view own pause events"
  on recording.pause_events for select
  using (
    exists (
      select 1 from recording.trips
      where trips.id = pause_events.trip_id
      and trips.user_id = auth.uid()
    )
  );

-- Users can insert pause events for their own trips
create policy "Users can insert own pause events"
  on recording.pause_events for insert
  with check (
    exists (
      select 1 from recording.trips
      where trips.id = pause_events.trip_id
      and trips.user_id = auth.uid()
    )
  );

-- Users can update pause events for their own trips
create policy "Users can update own pause events"
  on recording.pause_events for update
  using (
    exists (
      select 1 from recording.trips
      where trips.id = pause_events.trip_id
      and trips.user_id = auth.uid()
    )
  );
```

### API Endpoints

#### Direct Supabase Access (Mobile App)

The Mobile App will interact directly with Supabase using the Supabase JS client. RLS policies enforce data access control.

**Trip Operations:**
- `supabase.from('trips').insert()` - Start new trip
- `supabase.from('trips').update()` - Update trip status, title, notes
- `supabase.from('trips').select()` - Query trips with filters
- `supabase.from('trips').delete()` - Delete trip

**Point Operations:**
- `supabase.from('trip_points').insert()` - Batch insert location points
- `supabase.from('trip_points').select()` - Query points for route visualization

**Statistics Operations:**
- `supabase.from('trip_basic_stats').select()` - Get basic stats (all users)
- `supabase.from('trip_advanced_stats').select()` - Get advanced stats (paid users)

**Pause Operations:**
- `supabase.from('pause_events').insert()` - Record pause/resume events

#### Recording Service API Routes

The Recording Service is hosted on Fly.io with a publicly accessible URL. It monitors the database for completed trips and automatically calculates advanced statistics.

**POST /api/webhooks/trip-completed**
- Description: Webhook endpoint called by database trigger when trip is completed
- Authentication: Webhook secret validation
- Request Body:
  ```json
  {
    "trip_id": "uuid",
    "user_id": "uuid",
    "completed_at": "2025-01-15T11:30:00Z"
  }
  ```
- Response (200):
  ```json
  {
    "advanced_stats_calculated": true
  }
  ```

**POST /api/internal/trips/:id/calculate-advanced-stats**
- Description: Calculate advanced statistics for a specific trip (manual trigger or retry)
- Authentication: Internal service auth
- Response (200):
  ```json
  {
    "trip_id": "uuid",
    "calculated": true,
    "stats": {
      "elevation_gain_m": 120.50,
      "elevation_loss_m": 115.30
    }
  }
  ```

**POST /api/internal/trips/batch-calculate**
- Description: Batch calculate advanced statistics for multiple trips (scheduled job for backfill)
- Authentication: Internal service auth
- Request Body:
  ```json
  {
    "trip_ids": ["uuid1", "uuid2"]
  }
  ```
- Response (200):
  ```json
  {
    "processed": 2,
    "failed": 0,
    "errors": []
  }
  ```

**GET /api/health**
- Description: Health check endpoint
- Authentication: None
- Response (200):
  ```json
  {
    "status": "healthy",
    "service": "recording",
    "version": "1.0.0"
  }
  ```

## Data Models

### TypeScript Interfaces

```typescript
// Core trip model
interface Trip {
  id: string;
  user_id: string;
  status: 'in_progress' | 'paused' | 'completed';
  started_at: string; // ISO 8601
  completed_at?: string;
  title?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Basic statistics (free tier)
interface TripBasicStats {
  trip_id: string;
  distance_km?: number;
  duration_seconds?: number;
  moving_duration_seconds?: number;
  avg_speed_kmh?: number;
  max_speed_kmh?: number;
  route_geom?: string; // PostGIS geography as text
  calculated_at: string;
  updated_at: string;
}

// Advanced statistics (paid tier)
interface TripAdvancedStats {
  trip_id: string;
  elevation_gain_m?: number;
  elevation_loss_m?: number;
  max_elevation_m?: number;
  min_elevation_m?: number;
  avg_moving_speed_kmh?: number;
  speed_percentile_50_kmh?: number;
  speed_percentile_95_kmh?: number;
  avg_heart_rate_bpm?: number;
  max_heart_rate_bpm?: number;
  avg_cadence_rpm?: number;
  avg_power_watts?: number;
  stopped_time_seconds?: number;
  pause_count?: number;
  calculated_at: string;
  updated_at: string;
}

// Trip point model
interface TripPoint {
  id: string;
  trip_id: string;
  location: string; // PostGIS geography as text (POINT)
  altitude_m?: number;
  accuracy_m?: number;
  speed_kmh?: number;
  recorded_at: string;
  heart_rate_bpm?: number; // post-MVP
  cadence_rpm?: number; // post-MVP
  power_watts?: number; // post-MVP
  created_at: string;
}

// Pause event model
interface PauseEvent {
  id: string;
  trip_id: string;
  paused_at: string;
  resumed_at?: string;
  created_at: string;
}

// Combined trip with stats (for display)
interface TripWithStats extends Trip {
  basic_stats?: TripBasicStats;
  advanced_stats?: TripAdvancedStats;
}

// GeoJSON types for route visualization
interface RouteGeometry {
  type: 'LineString';
  coordinates: [number, number, number?][]; // [longitude, latitude, altitude?]
}

interface RouteFeature {
  type: 'Feature';
  geometry: RouteGeometry;
  properties: {
    trip_id: string;
    point_count: number;
  };
}
```

## Error Handling

### Error Response Format

All errors follow a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {} // Optional additional context
  }
}
```

### Error Codes

- `TRIP_NOT_FOUND` (404): Trip does not exist
- `TRIP_NOT_OWNED` (403): User does not own the trip
- `ACTIVE_TRIP_EXISTS` (409): User already has an active trip
- `INVALID_TRIP_STATUS` (400): Operation not valid for current trip status
- `INVALID_COORDINATES` (400): Latitude/longitude out of valid range
- `INVALID_TIMESTAMP` (400): Timestamp is before trip start time
- `UNAUTHORIZED` (401): Missing or invalid authentication token
- `VALIDATION_ERROR` (400): Request body validation failed

### Database Error Handling

- Connection errors: Retry with exponential backoff (max 3 attempts)
- Constraint violations: Return appropriate 400/409 error
- Transaction failures: Rollback and return 500 error
- Timeout errors: Return 504 Gateway Timeout

## Testing Strategy

### Unit Tests

- **Service Layer**: Test business logic for trip lifecycle, statistics calculation, and data validation
- **Database Functions**: Test PostGIS functions for distance calculation, route generation, and elevation analysis
- **Validation**: Test input validation for coordinates, timestamps, and text fields
- **Error Handling**: Test error scenarios and edge cases

### Integration Tests

- **API Endpoints**: Test complete request/response cycles for all endpoints
- **Authentication**: Test JWT validation and user authorization
- **Database Operations**: Test CRUD operations with real database
- **PostGIS Queries**: Test spatial queries and geometry generation

### Performance Tests

- **Load Testing**: Simulate concurrent trip recordings and point submissions
- **Query Performance**: Measure response times for trip list and route retrieval
- **Index Effectiveness**: Verify spatial and B-tree indexes improve query performance
- **Partition Performance**: Test query performance across multiple time partitions

### Test Data

- Generate realistic GPS tracks with varying characteristics:
  - Short trips (< 5km)
  - Medium trips (5-20km)
  - Long trips (> 20km)
  - Trips with elevation changes
  - Trips with pauses
- Test edge cases:
  - Trips crossing date boundaries
  - Trips with GPS signal loss
  - Trips with invalid coordinates
  - Concurrent trip operations

## Implementation Notes

### Database Triggers for Statistics Calculation

When a trip status changes to 'completed', database triggers will automatically calculate basic statistics and notify the Recording Service to calculate advanced statistics.

```sql
-- Function to calculate basic statistics
CREATE OR REPLACE FUNCTION recording.calculate_basic_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_route_geom geography;
  v_distance_km numeric;
  v_duration_seconds integer;
  v_moving_duration_seconds integer;
  v_avg_speed_kmh numeric;
  v_max_speed_kmh numeric;
  v_pause_duration_seconds integer;
BEGIN
  -- Only calculate when trip is completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    
    -- Generate route geometry from points
    SELECT ST_MakeLine(location::geometry ORDER BY recorded_at)::geography
    INTO v_route_geom
    FROM recording.trip_points
    WHERE trip_id = NEW.id;
    
    -- Calculate distance
    v_distance_km := ST_Length(v_route_geom) / 1000;
    
    -- Calculate total duration
    v_duration_seconds := EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at));
    
    -- Calculate pause duration
    SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (resumed_at - paused_at))), 0)
    INTO v_pause_duration_seconds
    FROM recording.pause_events
    WHERE trip_id = NEW.id AND resumed_at IS NOT NULL;
    
    -- Calculate moving duration
    v_moving_duration_seconds := v_duration_seconds - v_pause_duration_seconds;
    
    -- Calculate average speed
    IF v_moving_duration_seconds > 0 THEN
      v_avg_speed_kmh := (v_distance_km / v_moving_duration_seconds) * 3600;
    END IF;
    
    -- Get max speed
    SELECT MAX(speed_kmh)
    INTO v_max_speed_kmh
    FROM recording.trip_points
    WHERE trip_id = NEW.id;
    
    -- Insert or update basic stats
    INSERT INTO recording.trip_basic_stats (
      trip_id,
      distance_km,
      duration_seconds,
      moving_duration_seconds,
      avg_speed_kmh,
      max_speed_kmh,
      route_geom
    ) VALUES (
      NEW.id,
      v_distance_km,
      v_duration_seconds,
      v_moving_duration_seconds,
      v_avg_speed_kmh,
      v_max_speed_kmh,
      v_route_geom
    )
    ON CONFLICT (trip_id) DO UPDATE SET
      distance_km = EXCLUDED.distance_km,
      duration_seconds = EXCLUDED.duration_seconds,
      moving_duration_seconds = EXCLUDED.moving_duration_seconds,
      avg_speed_kmh = EXCLUDED.avg_speed_kmh,
      max_speed_kmh = EXCLUDED.max_speed_kmh,
      route_geom = EXCLUDED.route_geom,
      updated_at = now();
      
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for basic stats
CREATE TRIGGER trigger_calculate_basic_stats
  AFTER UPDATE ON recording.trips
  FOR EACH ROW
  EXECUTE FUNCTION recording.calculate_basic_stats();

-- Function to notify Recording Service for advanced stats calculation
CREATE OR REPLACE FUNCTION recording.notify_trip_completed()
RETURNS TRIGGER AS $$
DECLARE
  v_webhook_url text;
  v_webhook_secret text;
  v_payload jsonb;
BEGIN
  -- Only notify when trip is completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    
    -- Get webhook configuration from environment or settings table
    -- For now, we'll use pg_net extension to make HTTP request
    v_payload := jsonb_build_object(
      'trip_id', NEW.id,
      'user_id', NEW.user_id,
      'completed_at', NEW.completed_at
    );
    
    -- Make async HTTP request to Recording Service webhook
    -- This requires pg_net extension
    PERFORM net.http_post(
      url := current_setting('app.recording_service_url') || '/api/webhooks/trip-completed',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Webhook-Secret', current_setting('app.recording_webhook_secret')
      ),
      body := v_payload
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to notify Recording Service
CREATE TRIGGER trigger_notify_trip_completed
  AFTER UPDATE ON recording.trips
  FOR EACH ROW
  EXECUTE FUNCTION recording.notify_trip_completed();
```

**Note**: The webhook trigger uses Supabase's `pg_net` extension for async HTTP requests. Configuration values are stored in Supabase settings:
- `app.recording_service_url`: The Fly.io URL of the Recording Service
- `app.recording_webhook_secret`: Shared secret for webhook authentication

### PostGIS Functions for Advanced Statistics

The Recording Service will calculate advanced statistics asynchronously:

```sql
-- Calculate elevation gain/loss
WITH elevation_changes AS (
  SELECT
    altitude_m,
    LAG(altitude_m) OVER (ORDER BY recorded_at) as prev_altitude
  FROM recording.trip_points
  WHERE trip_id = $1 AND altitude_m IS NOT NULL
)
SELECT
  SUM(CASE WHEN altitude_m > prev_altitude THEN altitude_m - prev_altitude ELSE 0 END) as gain,
  SUM(CASE WHEN altitude_m < prev_altitude THEN prev_altitude - altitude_m ELSE 0 END) as loss,
  MAX(altitude_m) as max_elevation,
  MIN(altitude_m) as min_elevation
FROM elevation_changes
WHERE prev_altitude IS NOT NULL;

-- Calculate speed percentiles
SELECT
  percentile_cont(0.5) WITHIN GROUP (ORDER BY speed_kmh) as median_speed,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY speed_kmh) as p95_speed
FROM recording.trip_points
WHERE trip_id = $1 AND speed_kmh IS NOT NULL AND speed_kmh > 0;

-- Calculate sensor averages
SELECT
  AVG(heart_rate_bpm) as avg_hr,
  MAX(heart_rate_bpm) as max_hr,
  AVG(cadence_rpm) as avg_cadence,
  AVG(power_watts) as avg_power
FROM recording.trip_points
WHERE trip_id = $1;
```

### Batch Point Insertion

To optimize performance, the mobile app should batch location points and send them in groups (e.g., every 30 seconds or every 10 points). The service will validate and insert points in a single transaction.

### Partition Management

A scheduled job (or database function) should automatically create new monthly partitions for `trip_points` table:

```sql
-- Function to create next month's partition
CREATE OR REPLACE FUNCTION recording.create_next_partition()
RETURNS void AS $$
DECLARE
  next_month date;
  partition_name text;
BEGIN
  next_month := date_trunc('month', now() + interval '1 month');
  partition_name := 'trip_points_' || to_char(next_month, 'YYYY_MM');
  
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS recording.%I PARTITION OF recording.trip_points
     FOR VALUES FROM (%L) TO (%L)',
    partition_name,
    next_month,
    next_month + interval '1 month'
  );
END;
$$ LANGUAGE plpgsql;
```

### Mobile App Considerations

- **Location Permissions**: Request "Always" or "When In Use" location permissions
- **Background Location**: Enable background location updates for continuous tracking
- **Battery Optimization**: Use configurable capture intervals to balance accuracy and battery life
- **Offline Support**: Queue points locally if network unavailable, sync when connected using Supabase offline-first capabilities
- **Data Compression**: Batch insert points (e.g., 10-20 points at a time) to reduce network requests
- **Supabase Client**: Use `@supabase/supabase-js` for all database operations
- **Real-time Updates**: Consider using Supabase Realtime for live trip updates (optional)

### Security Considerations

- **Row Level Security**: All data access controlled by RLS policies at database level
- **JWT Authentication**: Supabase Auth provides JWT tokens for user authentication
- **User Isolation**: RLS policies ensure users can only access their own data
- **Input Validation**: Database constraints validate coordinates, timestamps, and text lengths
- **Rate Limiting**: Supabase provides built-in rate limiting
- **No Direct SQL**: All queries go through Supabase client, preventing SQL injection
- **Service Authentication**: Internal Recording Service endpoints use service role key

### Subscription Tier Handling

- **Free Tier**: Access to `trip_basic_stats` table
- **Paid Tier**: Access to both `trip_basic_stats` and `trip_advanced_stats` tables
- **Proactive Calculation**: Recording Service calculates advanced stats for ALL completed trips, regardless of user subscription tier. This ensures stats are immediately available if a user upgrades their plan.
- **RLS Enhancement**: Add subscription check to advanced stats policy:
  ```sql
  create policy "Paid users can view advanced stats"
    on recording.trip_advanced_stats for select
    using (
      exists (
        select 1 from recording.trips t
        join auth.users u on u.id = t.user_id
        where t.id = trip_advanced_stats.trip_id
        and u.id = auth.uid()
        -- Add subscription check here when subscription system is implemented
        -- and u.subscription_tier in ('premium', 'pro')
      )
    );
  ```

### Recording Service Architecture

The Recording Service runs on Fly.io and operates in two modes:

1. **Real-time Mode**: Receives webhook notifications from database triggers when trips are completed. Immediately calculates advanced statistics.

2. **Batch Mode**: Scheduled job (e.g., every 5 minutes) that queries for completed trips without advanced stats and processes them. This provides redundancy in case webhooks fail.

```typescript
// Pseudo-code for service logic
class RecordingService {
  // Webhook handler - real-time processing
  async handleTripCompleted(tripId: string) {
    await this.calculateAdvancedStats(tripId);
  }
  
  // Scheduled job - batch processing
  async processPendingTrips() {
    const pendingTrips = await this.findTripsWithoutAdvancedStats();
    for (const trip of pendingTrips) {
      await this.calculateAdvancedStats(trip.id);
    }
  }
  
  // Core calculation logic
  async calculateAdvancedStats(tripId: string) {
    // Query trip points
    // Calculate elevation metrics
    // Calculate speed percentiles
    // Calculate sensor averages
    // Insert into trip_advanced_stats table
  }
}
```
