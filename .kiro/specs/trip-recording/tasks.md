# Implementation Plan

## Core Trip Recording (MVP)

- [x] 1. Set up database schema and migrations
- [x] 1.1 Create recording schema and enable PostGIS extension
  - Create `recording` schema in Supabase
  - Enable PostGIS extension if not already enabled
  - _Requirements: 1.1, 2.1, 2.2, 8.1_

- [x] 1.2 Create trips table with RLS policies
  - Define trips table structure with status, timestamps, and metadata fields
  - Create indexes on user_id, started_at, and status columns
  - Implement RLS policies for select, insert, update, and delete operations
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 1.3 Create trip_basic_stats table with RLS policies
  - Define basic stats table with distance, duration, speed metrics
  - Include route_geom geography column for LineString storage
  - Create spatial index on route_geom
  - Implement RLS policy for viewing own trip stats
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 1.4 Create trip_advanced_stats table with RLS policies
  - Define advanced stats table with elevation, speed percentiles, sensor data
  - Implement RLS policy with subscription tier check placeholder
  - _Requirements: 4.1, 4.4, 6.3, 6.4_

- [x] 1.5 Create trip_points partitioned table with RLS policies
  - Define trip_points table with location geography column
  - Set up monthly partitioning by recorded_at timestamp
  - Create initial partitions for current and next month
  - Create indexes on trip_id, recorded_at, and location (spatial)
  - Implement RLS policies for viewing and inserting points
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 8.4, 8.5_

- [x] 1.6 Create pause_events table with RLS policies
  - Define pause_events table for tracking pause/resume timestamps
  - Create index on trip_id
  - Implement RLS policies for viewing, inserting, and updating events
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 2. Implement database triggers for basic statistics
- [x] 2.1 Create function to calculate basic statistics
  - Write PL/pgSQL function to generate route geometry from trip points
  - Calculate distance using ST_Length on route geography
  - Calculate duration and moving duration (excluding pauses)
  - Calculate average and max speed from trip points
  - Insert or update trip_basic_stats table
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 2.2 Create trigger to calculate basic stats on trip completion
  - Create AFTER UPDATE trigger on trips table
  - Trigger only when status changes to 'completed'
  - Call calculate_basic_stats function
  - _Requirements: 1.3, 4.1_

- [x] 2.3 Create function to notify Recording Service via webhook
  - Write PL/pgSQL function using pg_net extension
  - Build JSON payload with trip_id, user_id, completed_at
  - Make async HTTP POST to Recording Service webhook endpoint
  - Include webhook secret in headers for authentication
  - _Requirements: 1.3_

- [x] 2.4 Create trigger to notify Recording Service on trip completion
  - Create AFTER UPDATE trigger on trips table
  - Trigger only when status changes to 'completed'
  - Call notify_trip_completed function
  - _Requirements: 1.3_

- [x] 3. Create partition management function
- [x] 3.1 Implement automatic partition creation function
  - Write function to create next month's partition for trip_points
  - Use dynamic SQL to generate partition table
  - Set up scheduled job to run monthly (via pg_cron or external scheduler)
  - _Requirements: 8.5_

- [x] 4. Set up Recording Service infrastructure
- [x] 4.1 Initialize Recording Service project structure
  - Create service directory following monorepo structure
    - Check vehicles service for proper service structure/code patterns/architecture
  - Set up package.json with Hono, Bun, and Supabase dependencies
  - Configure TypeScript with tsconfig.json
  - Create Containerfile and Containerfile.dev
  - _Requirements: 1.1_

- [x] 4.2 Configure Supabase client for Recording Service
  - Set up Supabase client with service role key
  - Create database connection utilities
  - Configure environment variables for Supabase URL and keys
  - _Requirements: 1.1_

- [x] 4.3 Implement webhook endpoint for trip completion
  - Create POST /api/webhooks/trip-completed endpoint
  - Validate webhook secret from request headers
  - Parse trip_id, user_id, completed_at from request body
  - Queue advanced stats calculation job
  - Return success response
  - _Requirements: 1.3_

- [x] 4.4 Implement advanced statistics calculation logic
  - Query trip_points for the completed trip
  - Calculate elevation gain/loss using window functions
  - Calculate max/min elevation
  - Calculate speed percentiles (median, 95th)
  - Calculate sensor data averages (heart rate, cadence, power)
  - Calculate stopped time and pause count
  - Insert results into trip_advanced_stats table
  - _Requirements: 6.3, 6.4_

- [x] 4.5 Implement batch processing for pending trips
  - Create scheduled job to find trips without advanced stats
  - Query trips with status='completed' that don't have advanced stats
  - Process each trip using advanced stats calculation logic
  - Log successes and failures
  - _Requirements: 1.3_

- [x] 4.6 Add health check endpoint
  - Create GET /api/health endpoint
  - Return service status, name, and version from package.json
  - _Requirements: 1.1_

- [x] 4.7 Configure Fly.io deployment
  - Create fly.toml configuration file
  - Set up environment variables in Fly.io
  - Configure webhook URL in Supabase settings
  - Deploy service to Fly.io
  - _Requirements: 1.1_

- [x] 5. Implement mobile app trip recording features
- [x] 5.1 Set up Supabase client in mobile app
  - Configure Supabase client with project URL and anon key
  - Set up authentication context
  - _Requirements: 1.1_

- [x] 5.2 Create trip recording hook (use-trip-recording.ts)
  - Implement startTrip function to insert into trips table
  - Implement stopTrip function to update trip status to 'completed'
  - Implement pauseTrip function to update status and insert pause event
  - Implement resumeTrip function to update status and update pause event
  - Handle active trip check before starting new trip
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 10.1, 10.2, 10.3_

- [x] 5.3 Implement location tracking service
  - Request location permissions (foreground and background)
  - Set up location subscription with configurable interval
  - Batch location points (e.g., every 10 points or 30 seconds)
  - Insert batched points into trip_points table via Supabase
  - Handle offline queueing and sync when connection restored
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.4_

- [x] 5.4 Create trip recording UI component
  - Display start/stop/pause/resume buttons
  - Show real-time stats (distance, duration, speed) during recording
  - Display current capture interval setting
  - Handle trip status changes and button states
  - _Requirements: 1.1, 1.2, 1.3, 3.5, 10.1, 10.3_

- [x] 5.5 Implement settings for capture interval configuration
  - Add capture interval slider/picker (1-60 seconds)
  - Store preference in AsyncStorage or user settings
  - Default to 5 seconds
  - Apply setting to location tracking service
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 6. Implement trip history and viewing features
- [x] 6.1 Create trip list hook (use-trips.ts)
  - Query trips table with pagination
  - Join with trip_basic_stats for summary data
  - Support date range filtering
  - Order by started_at descending
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 6.2 Create trip list UI component
  - Display list of trips with title, date, distance, duration
  - Implement pagination controls
  - Add date range filter UI
  - Handle empty state
  - Navigate to trip detail on tap
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 6.3 Create trip detail hook (use-trip-detail.ts)
  - Query trip with basic stats
  - Query trip_advanced_stats if user has paid subscription
  - Query trip_points for route visualization
  - Generate GeoJSON LineString from points
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 6.4 Create trip detail UI component
  - Display trip metadata (title, notes, dates)
  - Show basic statistics (distance, duration, speeds)
  - Show advanced statistics if available (elevation, percentiles)
  - Render route on map using Mapbox
  - Display elevation profile chart if altitude data available
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 7. Implement trip management features
- [ ] 7.1 Add trip title and notes editing
  - Create edit form for title and notes
  - Validate title length (max 200 chars)
  - Validate notes length (max 2000 chars)
  - Update trips table via Supabase
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 7.2 Implement trip deletion
  - Add delete button with confirmation dialog
  - Delete trip via Supabase (cascade deletes points and stats)
  - Navigate back to trip list after deletion
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 7.3 Add default title generation
  - Generate title from start time and location when not provided
  - Use reverse geocoding to get location name
  - Format as "Ride on [Date] at [Location]"
  - _Requirements: 9.5_

## Enhanced Features (Post-MVP)

- [ ] 8. Add sensor data support
- [ ] 8.1 Extend trip_points table with sensor columns
  - Add heart_rate_bpm, cadence_rpm, power_watts columns
  - Update mobile app to capture sensor data if available
  - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [ ] 8.2 Update advanced stats calculation for sensor data
  - Calculate average and max heart rate
  - Calculate average cadence
  - Calculate average power
  - _Requirements: 11.5_

- [ ] 8.3 Display sensor data in trip detail UI
  - Show sensor averages in statistics section
  - Create charts for sensor data over time
  - _Requirements: 11.5_

- [ ] 9. Implement route export and sharing
- [ ] 9.1 Add GPX export functionality
  - Generate GPX file from trip points
  - Include metadata and track points
  - Allow user to download or share file
  - _Requirements: 6.2_

- [ ] 9.2 Add route sharing to social media
  - Generate route image with map and stats
  - Integrate with share sheet
  - _Requirements: 6.1_

- [ ] 10. Add trip comparison and analytics
- [ ] 10.1 Create analytics dashboard
  - Show total distance, time, trips over time periods
  - Display charts for trends
  - Compare current period to previous
  - _Requirements: 5.1, 5.5_

- [ ] 10.2 Implement trip comparison feature
  - Allow selecting multiple trips to compare
  - Show side-by-side statistics
  - Overlay routes on map
  - _Requirements: 6.1, 6.2_
