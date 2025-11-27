# Design Document

## Overview

The Vehicle Management Service is a microservice within the SpinRoute Neo platform that enables users to track personal bikes and bike parts with comprehensive mileage and maintenance management. The service leverages the existing vehicle service skeleton, extending it with user-owned bike tracking, part lifecycle management, and ownership transfer capabilities.

The service uses Supabase PostgreSQL with the Supabase JS client, following the established monorepo patterns. It provides RESTful APIs for bike/part CRUD operations, mileage logging, maintenance tracking, and ownership transfers.

## Design Rationale

### Key Design Decisions

**1. Separate Schema for Vehicle Data**
- Decision: Create a dedicated `vehicles` schema instead of using the public schema
- Rationale: Provides clear namespace separation, easier to manage permissions, and allows for independent scaling/backup strategies

**2. Part Kilometrage Tracking**
- Decision: Track kilometrage at both bike and part level, with automatic propagation
- Rationale: Enables accurate maintenance scheduling for individual components, especially when parts are transferred between bikes (Requirement 6.3)

**3. Installation History Model**
- Decision: Use `removed_at` timestamp instead of boolean flag for tracking active installations
- Rationale: Maintains complete history of part installations while allowing efficient queries for currently installed parts (WHERE removed_at IS NULL)

**4. Ownership Transfer with Cascading**
- Decision: Automatically transfer all installed parts when transferring a bike
- Rationale: Reflects real-world bike sales where parts stay with the bike; prevents orphaned parts (Requirement 7.3)

**5. Automatic Part Removal on Transfer**
- Decision: Automatically remove parts from bikes before ownership transfer
- Rationale: Prevents ownership conflicts where a part would be installed on a bike owned by a different user (Requirement 8.2)

**6. Kilometrage Storage and Unit Support**
- Decision: Store all distances internally in kilometers (as "kilometrage"), but support both kilometers and miles in user-facing features
- Rationale: Ensures consistency in database and simplifies calculations, while providing flexibility for users in different regions. API accepts and returns values in user's preferred unit with automatic conversion.

**7. JSONB Metadata Fields**
- Decision: Use JSONB for extensible attributes instead of fixed columns
- Rationale: Allows users to store custom attributes (color, weight, notes) without schema changes, supports future extensibility

**8. Supabase Auth Integration**
- Decision: Use Supabase Auth for authentication instead of Better Auth
- Rationale: Consistent with other microservices in the platform, leverages Supabase's built-in RLS capabilities

**9. Active Bike Selection**
- Decision: Use `active_bike_id` field in `public.user_settings` table to track the user's active bike
- Rationale: Centralizes user preferences in one location, allows for easy querying and updating, and maintains separation between bike data and user settings (Requirement 5.1-5.5)

## Architecture

### Service Structure

The service follows the standard SpinRoute Neo microservice pattern:

```
services/vehicle/
├── lib/
│   ├── auth.ts                    # Supabase Auth middleware
│   ├── config.ts                  # Environment configuration
│   ├── db.ts                      # Supabase client setup
│   ├── db.types.ts                # Generated TypeScript types from Supabase
│   └── service-middleware.ts      # Internal service auth
├── supabase/
│   └── migrations/                # Supabase SQL migrations
├── src/
│   ├── index.ts                   # Service entry point
│   ├── health.ts                  # Health check endpoints
│   └── bikes/
│       ├── +routes.api.ts         # Public bike management routes
│       └── internal/
│           └── +routes.internal.ts # Internal service routes
└── package.json
```

### Database Schema Design

The service creates a new `vehicles` schema in Supabase for user-owned bikes and parts management:

**Schema: `vehicles`** (new schema to be created)

#### Tables

**1. `user_bike`** - User-owned bikes with kilometrage tracking
- `id` (uuid, PK)
- `created_at` (timestamp)
- `updated_at` (timestamp)
- `user_id` (uuid, FK to auth.users) - Current owner
- `name` (text) - User-defined bike name
- `type` (enum: road, mountain, hybrid, gravel, ebike, other)
- `brand` (text, nullable)
- `model` (text, nullable)
- `purchase_date` (date, nullable)
- `total_kilometrage` (numeric, default 0) - Total distance stored in kilometers
- `metadata` (jsonb) - Additional attributes (color, weight, etc.)
- Indexes: `user_id`, `type`
- Note: All distances stored in kilometers internally; API supports both km and miles via unit parameter
- Note: Active bike is tracked in `public.user_settings.active_bike_id`

**2. `user_part`** - User-owned bike parts with individual kilometrage
- `id` (uuid, PK)
- `created_at` (timestamp)
- `updated_at` (timestamp)
- `user_id` (uuid, FK to auth.users) - Current owner
- `name` (text) - User-defined part name
- `type` (enum: chain, tires, brake_pads, cassette, derailleur, crankset, saddle, handlebar, pedals, other)
- `brand` (text, nullable)
- `model` (text, nullable)
- `purchase_date` (date, nullable)
- `total_kilometrage` (numeric, default 0) - Total distance stored in kilometers
- `metadata` (jsonb) - Additional attributes (size, weight, replacement_threshold_km, etc.)
- Indexes: `user_id`, `type`
- Note: All distances stored in kilometers internally; API supports both km and miles via unit parameter

**3. `part_installation`** - Association between parts and bikes
- `id` (uuid, PK)
- `created_at` (timestamp)
- `part_id` (uuid, FK to user_part)
- `bike_id` (uuid, FK to user_bike)
- `installed_at` (timestamp) - Installation date
- `removed_at` (timestamp, nullable) - Removal date (null = currently installed)
- Indexes: `part_id`, `bike_id`, `removed_at`
- Unique constraint: `(part_id, removed_at IS NULL)` - One active installation per part

**4. `kilometrage_log`** - Distance entries for bikes
- `id` (uuid, PK)
- `created_at` (timestamp)
- `bike_id` (uuid, FK to user_bike)
- `user_id` (uuid, FK to auth.users)
- `distance` (numeric) - Distance stored in kilometers
- `logged_at` (timestamp) - When the ride occurred
- `notes` (text, nullable)
- Indexes: `bike_id`, `user_id`, `logged_at`

**5. `maintenance_record`** - Maintenance and service history
- `id` (uuid, PK)
- `created_at` (timestamp)
- `updated_at` (timestamp)
- `user_id` (uuid, FK to auth.users)
- `bike_id` (uuid, FK to user_bike, nullable)
- `part_id` (uuid, FK to user_part, nullable)
- `maintenance_type` (enum: repair, replacement, adjustment, cleaning, inspection, other)
- `description` (text)
- `performed_at` (timestamp)
- `cost` (numeric, nullable)
- `metadata` (jsonb) - Additional details (mechanic, shop, etc.)
- Indexes: `bike_id`, `part_id`, `user_id`, `performed_at`
- Check constraint: `bike_id IS NOT NULL OR part_id IS NOT NULL`

**6. `ownership_history`** - Track ownership transfers
- `id` (uuid, PK)
- `created_at` (timestamp)
- `entity_type` (enum: bike, part)
- `entity_id` (uuid) - References bike_id or part_id
- `previous_owner_id` (uuid, FK to auth.users)
- `new_owner_id` (uuid, FK to auth.users)
- `transferred_at` (timestamp)
- `notes` (text, nullable)
- Indexes: `entity_type`, `entity_id`, `previous_owner_id`, `new_owner_id`

### Data Flow

**Kilometrage Logging Flow:**
1. User logs distance for a bike via API
2. Service validates user owns the bike
3. Service increments bike's `total_kilometrage`
4. Service creates `kilometrage_log` entry
5. Service queries active `part_installation` records for the bike
6. Service increments `total_kilometrage` for all installed parts
7. Service returns updated bike and part kilometrage

**Part Transfer Flow:**
1. User removes part from bike A
2. Service updates `part_installation.removed_at` for current installation
3. User installs part on bike B
4. Service creates new `part_installation` record with `removed_at = NULL`
5. Part's `total_kilometrage` is preserved across transfers

**Ownership Transfer Flow (Bike):**
1. User initiates bike transfer with recipient email
2. Service validates current ownership and recipient exists
3. Service transfers all installed parts to new owner (updates `user_id`)
4. Service updates bike `user_id` to new owner
5. Service creates `ownership_history` records for bike and all transferred parts
6. Service returns confirmation with count of transferred items

**Ownership Transfer Flow (Part):**
1. User initiates part transfer with recipient email
2. Service validates current ownership and recipient exists
3. If part is currently installed, service automatically removes it (sets `removed_at`)
4. Service updates part `user_id` to new owner
5. Service creates `ownership_history` record
6. Service returns confirmation

**Active Bike Selection Flow:**
1. User selects a bike to set as active via API
2. Service validates user owns the bike
3. Service updates `public.user_settings.active_bike_id` to the selected bike's ID
4. Service returns updated bike object
5. Recording service can query active bike via `GET /api/bikes/active` to automatically log mileage

## Components and Interfaces

### Unit Handling

**Distance Unit Support:**

The API supports both kilometers and miles for all distance-related operations:

- **Storage:** All distances stored in kilometers in the database
- **Input:** API accepts distance values with optional `unit` parameter (default: `km`)
- **Output:** API returns distances in requested unit via query parameter `?unit=mi` or `?unit=km` (default: `km`)
- **Conversion:** 1 mile = 1.60934 kilometers

**API Conventions:**
- All POST/PATCH endpoints accept optional `unit` field in request body (values: `km` or `mi`)
- All GET endpoints accept optional `?unit=km|mi` query parameter
- If unit is `mi`, input values are converted to km before storage
- If unit is `mi`, output values are converted from km to mi before response
- Default unit is `km` if not specified
- Conversion factor: `km = mi × 1.60934`, `mi = km × 0.621371`

**Example Requests:**

```typescript
// Log mileage in miles
POST /api/bikes/:id/mileage
{
  "distance": 10.5,
  "unit": "mi",  // Will be stored as 16.898 km
  "logged_at": "2024-01-15T10:00:00Z"
}

// Get bike stats in miles
GET /api/bikes/:id/stats?unit=mi
// Returns: { total_mileage: 125.5, ... } (converted from km)

// Create bike with initial mileage in miles
POST /api/bikes
{
  "name": "Road Bike",
  "type": "road",
  "initial_mileage": 500,
  "unit": "mi"  // Will be stored as 804.67 km
}
```

### API Routes

**Public API Routes (`src/bikes/+routes.api.ts`)**

Base path: `/api/bikes`

#### Bike Management
- `POST /api/bikes` - Create a new bike
  - Body: `{ name, type, brand?, model?, purchase_date?, initial_kilometrage?, unit?, metadata? }`
  - Note: `initial_kilometrage` allows users to set starting distance (e.g., for bikes purchased used)
  - Note: `unit` specifies if initial_kilometrage is in 'km' or 'mi' (default: 'km')
  - Returns: Created bike object with kilometrage in requested unit
  
- `GET /api/bikes` - List user's bikes
  - Query: `?include_parts=true&unit=km|mi` (optional)
  - Returns: Array of bike objects with optional installed parts, kilometrage in requested unit
  
- `GET /api/bikes/active` - Get user's active bike
  - Query: `?unit=km|mi` (optional)
  - Returns: Active bike object with installed parts and kilometrage in requested unit, or null if no active bike
  
- `GET /api/bikes/:id` - Get bike details
  - Query: `?unit=km|mi` (optional)
  - Returns: Bike object with installed parts and recent maintenance, kilometrage in requested unit
  
- `PATCH /api/bikes/:id` - Update bike
  - Body: Partial bike fields
  - Returns: Updated bike object
  
- `POST /api/bikes/:id/set-active` - Set bike as active
  - Note: Updates `public.user_settings.active_bike_id` to the selected bike's ID
  - Returns: Updated bike object
  
- `POST /api/bikes/:id/deactivate` - Deactivate bike
  - Note: Only works if the bike is currently active; clears `public.user_settings.active_bike_id`
  - Returns: Updated bike object
  
- `DELETE /api/bikes/:id` - Delete bike
  - Returns: Success confirmation

#### Part Management
- `POST /api/parts` - Create a new part
  - Body: `{ name, type, brand?, model?, purchase_date?, initial_kilometrage?, unit?, metadata? }`
  - Note: `initial_kilometrage` allows users to set starting distance (e.g., for parts transferred from another bike)
  - Note: `unit` specifies if initial_kilometrage is in 'km' or 'mi' (default: 'km')
  - Returns: Created part object with kilometrage in requested unit
  
- `GET /api/parts` - List user's parts
  - Query: `?installed=true|false&unit=km|mi` (optional)
  - Returns: Array of part objects with kilometrage in requested unit
  
- `GET /api/parts/:id` - Get part details
  - Query: `?unit=km|mi` (optional)
  - Returns: Part object with installation history and maintenance, kilometrage in requested unit
  
- `PATCH /api/parts/:id` - Update part
  - Body: Partial part fields
  - Returns: Updated part object
  
- `DELETE /api/parts/:id` - Delete part
  - Returns: Success confirmation

#### Part Installation
- `POST /api/bikes/:bike_id/parts/:part_id/install` - Install part on bike
  - Body: `{ installed_at? }`
  - Returns: Installation record
  
- `POST /api/bikes/:bike_id/parts/:part_id/remove` - Remove part from bike
  - Body: `{ removed_at? }`
  - Returns: Updated installation record
  
- `GET /api/bikes/:bike_id/parts` - List parts installed on bike
  - Returns: Array of part objects with installation details

#### Kilometrage Logging
- `POST /api/bikes/:id/kilometrage` - Log distance for bike
  - Body: `{ distance, unit?, logged_at?, notes? }`
  - Note: `unit` specifies if distance is in 'km' or 'mi' (default: 'km')
  - Note: Automatically increments kilometrage for all parts currently installed on the bike
  - Returns: Updated bike with new kilometrage and list of affected parts with their updated kilometrage (in requested unit)
  
- `GET /api/bikes/:id/kilometrage` - Get distance history
  - Query: `?limit=50&offset=0&unit=km|mi` (optional)
  - Returns: Paginated kilometrage log entries with distances in requested unit

#### Maintenance
- `POST /api/bikes/:id/maintenance` - Log bike maintenance
  - Body: `{ maintenance_type, description, performed_at?, cost?, metadata? }`
  - Returns: Created maintenance record
  
- `POST /api/parts/:id/maintenance` - Log part maintenance
  - Body: Same as bike maintenance
  - Returns: Created maintenance record
  
- `GET /api/bikes/:id/maintenance` - Get bike maintenance history
  - Returns: Array of maintenance records
  
- `GET /api/parts/:id/maintenance` - Get part maintenance history
  - Returns: Array of maintenance records

#### Statistics
- `GET /api/bikes/:id/stats` - Get bike statistics
  - Query: `?unit=km|mi` (optional)
  - Returns: `{ total_kilometrage, kilometrage_since_last_maintenance, days_owned, days_since_last_maintenance, installed_parts_count, unit }`
  - Note: All distance values returned in requested unit
  
- `GET /api/parts/:id/stats` - Get part statistics
  - Query: `?unit=km|mi` (optional)
  - Returns: `{ total_kilometrage, days_owned, days_since_last_maintenance, current_bike?, installation_count, replacement_threshold?, needs_replacement?, unit }`
  - Note: `replacement_threshold` stored in part metadata as km; converted to requested unit in response
  - Note: `needs_replacement` calculated by comparing total_kilometrage to threshold (both in same unit)

#### Ownership Transfer
- `POST /api/bikes/:id/transfer` - Transfer bike ownership
  - Body: `{ new_owner_email, notes? }`
  - Note: Automatically transfers all installed parts to new owner
  - Returns: Transfer confirmation with count of transferred parts
  
- `POST /api/parts/:id/transfer` - Transfer part ownership
  - Body: `{ new_owner_email, notes? }`
  - Note: Automatically removes part from bike if currently installed before transfer
  - Returns: Transfer confirmation

### Internal Routes

**Internal Service Routes (`src/bikes/internal/+routes.internal.ts`)**

Base path: `/internal/bikes`

- `GET /internal/bikes/user/:user_id/summary` - Get user's bike summary (for dashboard)
  - Returns: `{ total_bikes, total_parts, total_kilometrage_km, bikes_needing_maintenance }`
  - Note: Internal endpoints always return distances in kilometers

### Utility Functions

**Unit Conversion:**

```typescript
// Conversion constants
const KM_TO_MI = 0.621371;
const MI_TO_KM = 1.60934;

// Convert kilometers to miles
function kmToMiles(km: number): number {
  return km * KM_TO_MI;
}

// Convert miles to kilometers
function milesToKm(miles: number): number {
  return miles * MI_TO_KM;
}

// Convert distance based on unit
function convertDistance(distance: number, fromUnit: 'km' | 'mi', toUnit: 'km' | 'mi'): number {
  if (fromUnit === toUnit) return distance;
  return fromUnit === 'km' ? kmToMiles(distance) : milesToKm(distance);
}

// Convert kilometrage values in object
function convertKilometrageInObject<T extends Record<string, any>>(
  obj: T,
  fields: string[],
  toUnit: 'km' | 'mi'
): T {
  const result = { ...obj };
  for (const field of fields) {
    if (result[field] !== undefined && result[field] !== null) {
      result[field] = toUnit === 'mi' ? kmToMiles(result[field]) : result[field];
    }
  }
  return result;
}
```

### Data Models

**TypeScript Interfaces:**

```typescript
interface UserBike {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  name: string;
  type: BikeType;
  brand?: string;
  model?: string;
  purchase_date?: string;
  total_kilometrage: number;
  metadata: Record<string, any>;
}

// Note: Active bike is tracked in public.user_settings.active_bike_id

interface UserPart {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  name: string;
  type: PartType;
  brand?: string;
  model?: string;
  purchase_date?: string;
  total_kilometrage: number;
  metadata: Record<string, any>;
}

interface PartInstallation {
  id: string;
  created_at: string;
  part_id: string;
  bike_id: string;
  installed_at: string;
  removed_at?: string;
}

interface KilometrageLog {
  id: string;
  created_at: string;
  bike_id: string;
  user_id: string;
  distance: number;
  logged_at: string;
  notes?: string;
}

interface MaintenanceRecord {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  bike_id?: string;
  part_id?: string;
  maintenance_type: MaintenanceType;
  description: string;
  performed_at: string;
  cost?: number;
  metadata: Record<string, any>;
}

type BikeType = 'road' | 'mountain' | 'hybrid' | 'gravel' | 'ebike' | 'other';
type PartType = 'chain' | 'tires' | 'brake_pads' | 'cassette' | 'derailleur' | 'crankset' | 'saddle' | 'handlebar' | 'pedals' | 'other';
type MaintenanceType = 'repair' | 'replacement' | 'adjustment' | 'cleaning' | 'inspection' | 'other';
```

## Error Handling

### Error Response Format

All errors follow a consistent JSON structure:

```typescript
{
  error: string;           // Error type/code
  message: string;         // Human-readable message
  details?: any;          // Additional context
}
```

### Error Scenarios

1. **Authentication Errors (401)**
   - Missing or invalid auth token
   - Response: `{ error: 'unauthorized', message: 'Authentication required' }`

2. **Authorization Errors (403)**
   - User doesn't own the resource
   - Response: `{ error: 'forbidden', message: 'You do not have permission to access this resource' }`

3. **Validation Errors (400)**
   - Missing required fields
   - Invalid data types or formats
   - Negative distance values
   - Response: `{ error: 'validation_error', message: 'Invalid input', details: { field: 'error description' } }`

4. **Not Found Errors (404)**
   - Bike, part, or record doesn't exist
   - Response: `{ error: 'not_found', message: 'Resource not found' }`

5. **Conflict Errors (409)**
   - Part already installed on another bike
   - Transfer to non-existent user
   - Response: `{ error: 'conflict', message: 'Operation conflicts with current state' }`

6. **Database Errors (500)**
   - Connection failures
   - Constraint violations
   - Response: `{ error: 'internal_error', message: 'An unexpected error occurred' }`

### Error Handling Strategy

- Use Hono's error handling middleware for consistent responses
- Log all errors with context (user_id, resource_id, operation)
- Validate input at route handler level before database operations
- Use database transactions for multi-step operations (kilometrage logging, transfers)
- Return specific error messages for validation failures
- Sanitize error messages to avoid exposing internal details

## Testing Strategy

### Unit Tests

**Database Operations:**
- Test CRUD operations for bikes and parts
- Test kilometrage increment logic
- Test part installation/removal state transitions
- Test ownership transfer logic
- Test query filters and pagination

**Validation:**
- Test input validation for all endpoints
- Test negative distance rejection
- Test required field validation
- Test enum value validation

**Business Logic:**
- Test kilometrage propagation to installed parts
- Test part transfer between bikes
- Test ownership transfer with cascading updates
- Test statistics calculations

### Integration Tests

**API Endpoints:**
- Test complete bike lifecycle (create, update, log distance, maintain, delete)
- Test part lifecycle with installations
- Test multi-user scenarios for ownership transfers
- Test authentication and authorization
- Test error responses for invalid operations

**Database Transactions:**
- Test kilometrage logging with multiple parts
- Test bike transfer with installed parts
- Test rollback on partial failures

### Test Data

- Create test fixtures for bikes, parts, and users
- Use factory functions for generating test data
- Clean up test data after each test run
- Use separate test database schema

### Testing Tools

- Bun test runner for unit and integration tests
- Drizzle ORM for database test setup
- Mock authentication middleware for testing
- Test coverage target: >80% for business logic

## Performance Considerations

### Database Optimization

- Index on `user_id` for all user-owned tables
- Index on `bike_id` and `part_id` for related tables
- Index on `removed_at IS NULL` for active installations query
- Use database transactions for mileage logging to ensure consistency
- Implement pagination for list endpoints (default 50 items)

### Caching Strategy

- Cache user bike/part lists for 5 minutes
- Invalidate cache on create/update/delete operations
- Use Redis if available, fallback to in-memory cache

### Query Optimization

- Use `SELECT` with specific columns instead of `SELECT *`
- Batch part mileage updates in single transaction
- Use `JOIN` queries to fetch related data in single query
- Implement cursor-based pagination for large datasets

### API Rate Limiting

- Implement rate limiting per user (100 requests/minute)
- Higher limits for read operations vs. write operations
- Return `429 Too Many Requests` with retry-after header

## Security Considerations

### Authentication & Authorization

- All routes require valid Supabase Auth session
- Verify user ownership before any read/write operation
- Use Row Level Security (RLS) policies in Supabase as backup layer
- Validate user_id from session, never trust client input
- Session validation handled by Supabase Auth middleware in `lib/auth.ts`

### Data Validation

- Sanitize all user inputs
- Validate enum values against allowed types (bike_type, part_type, maintenance_type)
- Prevent SQL injection via parameterized queries (Supabase client)
- Limit string lengths to prevent DoS
- Validate numeric ranges (kilometrage >= 0, distance > 0)
- Validate date formats (ISO 8601)
- Reject requests with missing required fields

### Ownership Transfer Security

- Require email verification for transfers
- Log all ownership changes in `ownership_history`
- Prevent self-transfers
- Validate recipient user exists before transfer

### API Security

- Use HTTPS only in production
- Implement CORS restrictions
- Add request size limits
- Sanitize error messages to avoid information leakage
- Log security-relevant events (failed auth, unauthorized access)

## Deployment Considerations

### Fly.io Deployment

The vehicle service deploys to Fly.io using a multi-stage Docker build process. The deployment configuration follows the same pattern as the gbfs service.

### Fly.io Configuration (`fly.toml`)

```toml
app = 'vehicles-service'
primary_region = 'iad'

[build]
  dockerfile = "./Containerfile"

[env]
  PORT = "3003"

[[services]]
  internal_port = 3003
  protocol = "tcp"

  [[services.ports]]
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443

  [services.concurrency]
    type = "connections"
    hard_limit = 25
    soft_limit = 20

  [[services.tcp_checks]]
    interval = "15s"
    timeout = "2s"
    grace_period = "5s"
    restart_limit = 0

  [[services.http_checks]]
    interval = "10s"
    timeout = "2s"
    grace_period = "5s"
    method = "get"
    path = "/health"
    protocol = "http"
    restart_limit = 0

[[vm]]
  size = 'shared-cpu-1x'
```

### Environment Variables

Set via Fly.io secrets:

```bash
fly secrets set SUPABASE_URL=https://...
fly secrets set SUPABASE_ANON_KEY=...
fly secrets set SUPABASE_SERVICE_ROLE_KEY=...
```

Environment variables in app:
- `PORT=3003` (set in fly.toml)
- `NODE_ENV=production` (set in Containerfile)

### Container Configuration

**Production Containerfile:**
- Multi-stage build using `oven/bun:latest` and `oven/bun:alpine`
- Install dependencies and build in builder stage
- Copy artifacts to minimal alpine runner stage
- Expose port 3003
- Health check endpoint: `GET /health`
- Start command: `bun run start`

**Development Containerfile:**
- Single stage with hot reload support
- Mount source code as volume
- Use `bun run start:dev:hot` for development

### Database Migrations

- Supabase migrations managed via Supabase CLI or MCP tools
- Migrations applied before deployment using CI/CD or manually
- Migration files in `services/vehicle/supabase/migrations/`
- Use Supabase branching for testing migrations
- Backup database before major schema changes

### Deployment Process

1. **Pre-deployment:**
   - Apply Supabase migrations to production database
   - Verify migrations successful
   - Run tests locally

2. **Deploy to Fly.io:**
   ```bash
   cd services/vehicle
   fly deploy
   ```

3. **Post-deployment:**
   - Verify health check passes
   - Test API endpoints
   - Monitor logs for errors
   - Check database connections

### Monitoring

- Use Fly.io metrics dashboard for service health
- Log all API requests with response times
- Monitor database query performance via Supabase dashboard
- Track error rates by endpoint
- Alert on high error rates or slow queries
- Monitor distance logging frequency for anomalies
- Use Fly.io logs: `fly logs -a vehicles-service`

### Scaling

- Fly.io auto-scaling based on load
- Start with `shared-cpu-1x` VM size
- Scale up VM size if needed: `fly scale vm shared-cpu-2x`
- Scale horizontally: `fly scale count 2`
- Monitor resource usage and adjust accordingly
