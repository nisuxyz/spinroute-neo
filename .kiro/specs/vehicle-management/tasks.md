# Implementation Tasks

## Summary

**Completed:** Database schema, TypeScript types, Supabase client, authentication middleware

**Remaining Work:** Implement API routes for bikes, parts, kilometrage tracking, maintenance, statistics, and ownership transfers. The core infrastructure is ready - now we need to build the business logic and endpoints.

**Key Implementation Notes:**
- All distances stored as "kilometrage" in kilometers internally
- API supports both km/mi via `unit` parameter
- Use `requireAuth()` middleware for all public routes
- Verify ownership before all operations
- Follow existing route pattern: `+routes.api.ts` files with `router` and `basePath` exports

---

## Phase 1: Database Schema Setup ✅

### Task 1.1: Create Supabase Migration Directory ✅
- [x] Create `services/vehicle/supabase/` directory structure
- [x] Create `services/vehicle/supabase/migrations/` directory
- [x] Create `.gitkeep` or initial README in migrations folder

### Task 1.2: Create Initial Schema Migration ✅
- [x] Create migration using Supabase MCP tool: `mcp_supabase_apply_migration`
  - Migration name: `initial_vehicles_schema`
  - Add `CREATE SCHEMA IF NOT EXISTS vehicles;` statement
  - Define all enum types in vehicles schema
  - Create all tables with proper constraints and indexes
  - Note: Active bike is tracked in public.user_settings.active_bike_id (not in user_bike table)
  - _Requirements: 1.1, 1.4, 2.1, 2.4, 3.1, 4.1, 5.1, 7.1, 8.1_

### Task 1.3: Verify Migration Applied ✅
- [x] Use `mcp_supabase_list_tables` to verify all tables created in vehicles schema
- [x] Check that all indexes and constraints are in place
- [x] _Requirements: 10.1_

### Task 1.4: Generate TypeScript Types ✅
- [x] Use `mcp_supabase_generate_typescript_types` to generate types
- [x] Save generated types to `services/vehicle/lib/db.types.ts`
- [x] Export types for use in route handlers
- [x] _Requirements: 10.1_

## Phase 2: Service Configuration ✅

### Task 2.1: Update Service Configuration ✅
- [x] Review `services/vehicle/lib/config.ts` for required environment variables
- [x] Update `.env.example` with all required variables (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)
- [x] _Requirements: 10.5_

### Task 2.2: Setup Supabase Client ✅
- [x] Create `services/vehicle/lib/db.ts` with Supabase client
- [x] Import `@supabase/supabase-js` and configure client
- [x] Import generated types from `db.types.ts`
- [x] Export typed Supabase client for use in routes
- [x] _Requirements: 10.5_

### Task 2.3: Update Authentication Middleware ✅
- [x] Review `services/vehicle/lib/auth.ts` (consolidated middleware)
- [x] Ensure it extracts user session from Supabase Auth
- [x] Add TypeScript types for Hono context with user/session
- [x] Verify user_id is available in context for authorization
- [x] Provide three middleware options: `supabaseMiddleware()`, `authMiddleware`, `requireAuth()`
- [x] _Requirements: 10.5_

## Phase 3: API Routes - Bike Management

### Task 3.1: Create Bike Routes File and Basic CRUD
- [x] Create `services/vehicle/src/bikes/+routes.api.ts`
- [x] Set up Hono router with base path `/api/bikes`
- [x] Apply `requireAuth()` middleware to all routes
- [x] Export `router` and `basePath`
- [x] Implement `POST /api/bikes` - Create bike
  - Validate required fields (name, type)
  - Support optional `initial_kilometrage` and `unit` (km/mi) parameters
  - Convert kilometrage to km if unit is 'mi'
  - Insert into `vehicles.user_bike` with user_id from context
  - Return created bike with 201 status
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 10.1, 10.2, 10.5_
- [x] Implement `GET /api/bikes` - List user's bikes
  - Query bikes by user_id from context
  - Support `?include_parts=true&unit=km|mi` query parameters
  - Convert kilometrage values based on unit parameter
  - Return array of bikes
  - _Requirements: 1.5_
- [x] Implement `GET /api/bikes/:id` - Get bike details
  - Verify user ownership (return 403 if not owned)
  - Support `?unit=km|mi` query parameter
  - Fetch bike with installed parts
  - Convert kilometrage values based on unit
  - Return 404 if not found
  - _Requirements: 1.5, 10.5_
- [x] Implement `PATCH /api/bikes/:id` - Update bike
  - Verify user ownership
  - Validate partial update fields
  - Update bike record, set updated_at
  - Return updated bike
  - _Requirements: 10.1, 10.5_
- [x] Implement `DELETE /api/bikes/:id` - Delete bike
  - Verify user ownership
  - Delete bike record (cascade deletes handled by DB)
  - Return 204 No Content
  - _Requirements: 10.5_

### Task 3.2: Implement Active Bike Selection Routes
- [x] Implement `GET /api/bikes/active` in `services/vehicle/src/bikes/+routes.api.ts` - Get user's active bike
  - Query public.user_settings.active_bike_id for the user
  - Fetch bike by ID from vehicles.user_bike
  - Support `?unit=km|mi` query parameter
  - Include installed parts in response
  - Convert kilometrage values based on unit
  - Return active bike object or null if no active bike
  - _Requirements: 5.4_
- [x] Implement `POST /api/bikes/:id/set-active` - Set bike as active
  - Verify user owns bike
  - Update public.user_settings.active_bike_id to the selected bike's ID
  - Return updated bike object
  - _Requirements: 5.1, 5.2, 5.3, 10.5_
- [x] Implement `POST /api/bikes/:id/deactivate` - Deactivate bike
  - Verify user owns bike
  - Verify bike is currently active (return 400 if not)
  - Clear public.user_settings.active_bike_id (set to null)
  - Return updated bike object
  - _Requirements: 5.5, 10.5_

## Phase 4: API Routes - Part Management

### Task 4.1: Create Part Routes and CRUD Operations
- [ ] Create `services/vehicle/src/parts/+routes.api.ts`
- [ ] Set up Hono router with base path `/api/parts`
- [ ] Apply `requireAuth()` middleware to all routes
- [ ] Export `router` and `basePath`
- [ ] Implement `POST /api/parts` - Create part
  - Validate required fields (name, type)
  - Support optional `initial_kilometrage` and `unit` parameters
  - Convert kilometrage to km if unit is 'mi'
  - Insert into `vehicles.user_part` with user_id from context
  - Return created part with 201 status
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 10.1, 10.2_
- [ ] Implement `GET /api/parts` - List user's parts
  - Query parts by user_id from context
  - Support `?installed=true|false&unit=km|mi` query parameters
  - Filter by installation status if specified
  - Convert kilometrage values based on unit
  - Return array of parts
  - _Requirements: 2.5_
- [ ] Implement `GET /api/parts/:id` - Get part details
  - Verify user ownership (return 403 if not owned)
  - Support `?unit=km|mi` query parameter
  - Fetch part with installation history
  - Convert kilometrage values based on unit
  - Return 404 if not found
  - _Requirements: 2.5, 10.5_
- [ ] Implement `PATCH /api/parts/:id` - Update part
  - Verify user ownership
  - Validate partial update fields
  - Update part record, set updated_at
  - Return updated part
  - _Requirements: 10.1, 10.5_
- [ ] Implement `DELETE /api/parts/:id` - Delete part
  - Verify user ownership
  - Delete part record (cascade deletes handled by DB)
  - Return 204 No Content
  - _Requirements: 10.5_

### Task 4.2: Implement Part Installation Routes
- [ ] Add to `services/vehicle/src/bikes/+routes.api.ts`:
- [ ] Implement `POST /api/bikes/:bike_id/parts/:part_id/install` - Install part
  - Verify user owns both bike and part
  - Check if part already installed elsewhere (removed_at IS NULL)
  - If yes, mark previous installation as removed (set removed_at)
  - Create new `part_installation` record with removed_at = NULL
  - Return installation record with 201 status
  - _Requirements: 3.1, 3.2, 3.3, 10.5_
- [ ] Implement `POST /api/bikes/:bike_id/parts/:part_id/remove` - Remove part
  - Verify user owns bike and part
  - Find active installation (removed_at IS NULL)
  - Update removed_at to current timestamp
  - Return updated installation record
  - _Requirements: 6.1, 10.5_
- [ ] Implement `GET /api/bikes/:bike_id/parts` - List installed parts
  - Verify user owns bike
  - Query active installations (removed_at IS NULL)
  - Join with user_part table
  - Support `?unit=km|mi` query parameter
  - Return array of parts with installation details
  - _Requirements: 3.4, 3.5_

## Phase 5: Kilometrage Tracking

### Task 5.1: Implement Kilometrage Logging Routes
- [x] Implement `POST /api/bikes/:id/kilometrage` in `services/vehicle/src/bikes/+routes.api.ts` - Log distance
  - Verify user owns bike
  - Validate distance > 0
  - Support `unit` parameter (km/mi), convert to km for storage
  - Increment bike total_kilometrage by distance
  - Create kilometrage_log entry
  - Query all active part installations (removed_at IS NULL)
  - Increment total_kilometrage for each installed part
  - Support `?unit=km|mi` for response
  - Return updated bike and affected parts with converted kilometrage
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 10.1, 10.2, 10.4_
- [x] Implement `GET /api/bikes/:id/kilometrage` in `services/vehicle/src/bikes/+routes.api.ts` - Get distance history
  - Verify user owns bike
  - Query kilometrage_log for bike_id
  - Support `?limit=50&offset=0&unit=km|mi` query parameters
  - Order by logged_at DESC
  - Convert distances based on unit parameter
  - Return paginated kilometrage entries
  - _Requirements: 4.3_

## Phase 6: Maintenance Tracking

### Task 6.1: Implement Maintenance Routes
- [ ] Add to `services/vehicle/src/bikes/+routes.api.ts`:
- [ ] Implement `POST /api/bikes/:id/maintenance` - Log bike maintenance
  - Verify user owns bike
  - Validate required fields (maintenance_type, description, performed_at)
  - Validate maintenance_type enum value
  - Insert into maintenance_record with bike_id and user_id
  - Return created record with 201 status
  - _Requirements: 5.1, 5.2, 5.3, 10.1, 10.2, 10.5_
- [ ] Implement `GET /api/bikes/:id/maintenance` - Get bike maintenance history
  - Verify user owns bike
  - Query maintenance_record where bike_id matches
  - Order by performed_at DESC
  - Return array of maintenance records
  - _Requirements: 5.4, 5.5_
- [ ] Add to `services/vehicle/src/parts/+routes.api.ts`:
- [ ] Implement `POST /api/parts/:id/maintenance` - Log part maintenance
  - Verify user owns part
  - Validate required fields (maintenance_type, description, performed_at)
  - Validate maintenance_type enum value
  - Insert into maintenance_record with part_id and user_id
  - Return created record with 201 status
  - _Requirements: 5.1, 5.2, 5.3, 10.1, 10.2, 10.5_
- [ ] Implement `GET /api/parts/:id/maintenance` - Get part maintenance history
  - Verify user owns part
  - Query maintenance_record where part_id matches
  - Order by performed_at DESC
  - Return array of maintenance records
  - _Requirements: 5.4, 5.5_

## Phase 7: Statistics and Analytics

### Task 7.1: Implement Statistics Endpoints
- [ ] Add to `services/vehicle/src/bikes/+routes.api.ts`:
- [ ] Implement `GET /api/bikes/:id/stats` - Get bike statistics
  - Verify user owns bike
  - Get bike total_kilometrage
  - Query latest maintenance_record for bike
  - Calculate kilometrage_since_last_maintenance
  - Calculate days_owned (current date - created_at)
  - Calculate days_since_last_maintenance
  - Count installed_parts (active installations)
  - Support `?unit=km|mi` query parameter
  - Convert kilometrage values based on unit
  - Return statistics object
  - _Requirements: 9.1, 9.3_
- [ ] Add to `services/vehicle/src/parts/+routes.api.ts`:
- [ ] Implement `GET /api/parts/:id/stats` - Get part statistics
  - Verify user owns part
  - Get part total_kilometrage
  - Query latest maintenance_record for part
  - Calculate days_owned and days_since_last_maintenance
  - Find current_bike (active installation)
  - Count installation_count (all installations)
  - Check replacement_threshold from metadata
  - Calculate needs_replacement flag
  - Support `?unit=km|mi` query parameter
  - Convert kilometrage values based on unit
  - Return statistics object
  - _Requirements: 9.2, 9.3, 9.4, 9.5_

## Phase 8: Ownership Transfers

### Task 8.1: Implement Ownership Transfer Routes
- [ ] Add to `services/vehicle/src/bikes/+routes.api.ts`:
- [ ] Implement `POST /api/bikes/:id/transfer` - Transfer bike ownership
  - Verify user owns bike
  - Validate new_owner_email in request body
  - Query auth.users to get new owner user_id
  - Return 404 if new owner doesn't exist
  - Prevent self-transfer (return 400)
  - Query all active part installations (removed_at IS NULL)
  - Update bike user_id to new owner
  - Update all installed parts user_id to new owner
  - Create ownership_history record for bike (entity_type='bike')
  - Create ownership_history records for each transferred part
  - Return transfer confirmation with parts count
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 10.1, 10.5_
- [ ] Add to `services/vehicle/src/parts/+routes.api.ts`:
- [ ] Implement `POST /api/parts/:id/transfer` - Transfer part ownership
  - Verify user owns part
  - Validate new_owner_email in request body
  - Query auth.users to get new owner user_id
  - Return 404 if new owner doesn't exist
  - Prevent self-transfer (return 400)
  - Check if part is currently installed (removed_at IS NULL)
  - If installed, update part_installation.removed_at to now
  - Update part user_id to new owner
  - Create ownership_history record (entity_type='part')
  - Return transfer confirmation
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 10.1, 10.5_

## Phase 9: Internal Routes

### Task 9.1: Implement Internal Vehicle Summary Endpoint
- [ ] Add to existing `services/vehicle/src/feature/internal/+routes.internal.ts`:
- [ ] Implement `GET /internal/vehicles/user/:user_id/summary` - Get user summary
  - Apply `internalServiceAuth` middleware (already in place)
  - Count total_bikes for user (query vehicles.user_bike)
  - Count total_parts for user (query vehicles.user_part)
  - Sum total_kilometrage across all bikes
  - Return summary object: `{ total_bikes, total_parts, total_kilometrage_km }`
  - Note: Internal endpoints return distances in km only

## Phase 10: Utility Functions and Validation

### Task 10.1: Create Utility Functions
- [ ] Create `services/vehicle/lib/utils.ts`:
- [ ] Implement unit conversion functions:
  - `kmToMiles(km: number): number`
  - `milesToKm(miles: number): number`
  - `convertDistance(distance: number, fromUnit: 'km' | 'mi', toUnit: 'km' | 'mi'): number`
  - `convertKilometrageInObject<T>(obj: T, fields: string[], toUnit: 'km' | 'mi'): T`
- [ ] Implement validation functions:
  - `validateBikeType(type: string): boolean`
  - `validatePartType(type: string): boolean`
  - `validateMaintenanceType(type: string): boolean`
  - `validateUnit(unit: string): unit is 'km' | 'mi'`
  - `validatePositiveNumber(value: number): boolean`
- [ ] Implement ownership verification helper:
  - `verifyOwnership(resourceUserId: string, contextUserId: string): void` (throws 403 if mismatch)
- [ ] Implement error response helper:
  - `errorResponse(error: string, message: string, details?: any)`
- [ ] _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

## Phase 11: Testing and Documentation

### Task 11.1: Manual Testing
- [ ] Test bike CRUD operations via HTTP client
- [ ] Test part CRUD operations
- [ ] Test part installation and removal
- [ ] Test kilometrage logging with unit conversion
- [ ] Test maintenance record creation
- [ ] Test statistics endpoints with unit conversion
- [ ] Test ownership transfers
- [ ] Test authorization (access other user's resources)
- [ ] Test validation errors (invalid enums, negative values)
- [ ] _Requirements: All_

### Task 11.2: Update Service Documentation
- [ ] Update `services/vehicle/README.md`:
  - Document all API endpoints with request/response examples
  - Document unit conversion behavior (km/mi)
  - Document environment variables
  - Add local development setup instructions
  - Document Supabase migration workflow
- [ ] Create `services/vehicle/src/index.http` with example requests for all endpoints

## Phase 12: Deployment (Future)

### Task 12.1: Prepare for Deployment
- [ ] Create `services/vehicle/fly.toml` configuration
- [ ] Update `Containerfile` for production build
- [ ] Verify `compose.yaml` configuration
- [ ] Test container build locally
- [ ] Document deployment process in README

### Task 12.2: Deploy to Fly.io
- [ ] Set up Fly.io app and secrets
- [ ] Deploy service to Fly.io
- [ ] Verify health checks pass
- [ ] Test API endpoints in production
- [ ] Monitor logs and performance

### Task 12.3: Update Project Documentation
- [ ] Update root README with vehicle service info
- [ ] Update `.kiro/steering/structure.md` with vehicle service details
- [ ] Document API endpoints for API gateway integration
