# Implementation Plan

- [x] 1. Set up routing service core structure
  - Create provider base interface and types in `lib/providers/base.ts`
  - Create provider registry in `lib/providers/registry.ts`
  - Update service configuration in `lib/config.ts` to include Mapbox credentials
  - _Requirements: 2, 2.1_

- [x] 2. Implement Mapbox Directions API provider
  - [x] 2.1 Create Mapbox provider class in `lib/providers/mapbox.ts`
    - Implement `calculateRoute` method that calls Mapbox Directions API
    - Implement `isAvailable` method for health checks
    - Define Mapbox capabilities (profiles, bike types)
    - _Requirements: 1, 2, 2.1, 6_

  - [x] 2.2 Add Mapbox API client utilities
    - Create HTTP client with timeout handling
    - Add request/response type definitions for Mapbox API
    - Implement error handling for Mapbox API errors
    - _Requirements: 1, 4_

  - [ ]* 2.3 Write unit tests for Mapbox provider
    - Test successful route calculation
    - Test error handling scenarios
    - Test availability checks
    - _Requirements: 1, 2_

- [x] 3. Implement routing API endpoints
  - [x] 3.1 Create routing API routes in `src/routing/+routes.api.ts`
    - Implement `POST /api/routing/directions` endpoint
    - Add request validation for waypoints and parameters
    - Integrate with provider registry
    - Return Mapbox-compatible responses
    - _Requirements: 1, 3, 6_

  - [x] 3.2 Implement provider query endpoint
    - Create `GET /api/routing/providers` endpoint
    - Return available providers with capabilities
    - Include provider availability status
    - _Requirements: 5_

  - [x] 3.3 Add authentication middleware
    - Apply Supabase auth middleware to routing endpoints
    - Extract user information from auth context
    - _Requirements: 1_

  - [ ]* 3.4 Write integration tests for routing endpoints
    - Test directions endpoint with valid requests
    - Test error responses for invalid requests
    - Test provider query endpoint
    - _Requirements: 1, 5_

- [ ] 4. Implement health check and logging
  - [ ] 4.1 Update health check endpoint in `src/health.ts`
    - Check Mapbox provider availability
    - Return provider status in health response
    - _Requirements: 5.1_

  - [ ] 4.2 Add request logging
    - Log route requests with provider and response time
    - Log errors with full details
    - _Requirements: 5.1_

- [ ] 5. Implement frontend directions UI
  - [ ] 5.1 Create directions hook in `frontend-expo/hooks/use-directions.ts`
    - Implement function to call routing service API
    - Handle loading and error states
    - Parse and return route data
    - _Requirements: 8_

  - [ ] 5.2 Add "Get Directions" button to location search
    - Update search result UI to include directions button
    - Trigger directions calculation on button press
    - Pass user location and destination to routing service
    - _Requirements: 8_

  - [ ] 5.3 Display route on map
    - Add route layer to MainMapView component
    - Render route geometry as line on map
    - Style route line appropriately
    - _Requirements: 8_

  - [ ] 5.4 Display route information
    - Show route distance and duration
    - Display loading indicator during calculation
    - Show error messages when routing fails
    - _Requirements: 8_

  - [ ]* 5.5 Add route clearing functionality
    - Add button to clear displayed route
    - Reset route state when new search is performed
    - _Requirements: 8_

- [ ] 6. Implement OpenRouteService provider
  - [ ] 6.1 Create OpenRouteService provider class in `lib/providers/openrouteservice.ts`
    - Implement `calculateRoute` method that calls ORS API
    - Implement `isAvailable` method
    - Define ORS capabilities (profiles, bike types)
    - _Requirements: 2, 6_

  - [ ] 6.2 Implement response normalizer in `lib/providers/normalizer.ts`
    - Create function to transform ORS response to Mapbox format
    - Map ORS route geometry to GeoJSON LineString
    - Convert ORS instructions to Mapbox step format
    - Handle ORS-specific fields
    - _Requirements: 3_

  - [ ] 6.3 Update provider registry
    - Register OpenRouteService provider
    - Update provider selection logic
    - _Requirements: 2, 2.1_

  - [ ]* 6.4 Write unit tests for ORS provider and normalizer
    - Test ORS route calculation
    - Test response normalization
    - Test error handling
    - _Requirements: 2, 3_

- [ ] 7. Implement provider selection UI
  - [ ] 7.1 Create provider selection component
    - Fetch available providers from API
    - Display provider options as radio buttons or dropdown
    - Save selected provider to user preferences
    - _Requirements: 9_

  - [ ] 7.2 Create profile/bike type selection component
    - Display available profiles based on selected provider
    - Show bike type options when cycling profile is selected
    - Save selections to user preferences
    - _Requirements: 9_

  - [ ] 7.3 Integrate selections with directions hook
    - Pass selected provider and profile to routing API
    - Update route when selections change
    - _Requirements: 9_

  - [ ] 7.4 Add user preferences storage
    - Store provider and profile preferences in user settings
    - Load preferences on app start
    - _Requirements: 9_

- [ ] 8. Implement caching layer
  - [ ] 8.1 Add caching to routing service
    - Implement in-memory cache for route responses
    - Use waypoints + profile + provider as cache key
    - Set 15-minute TTL for cached routes
    - _Requirements: 4_

  - [ ] 8.2 Add cache configuration
    - Add cache enable/disable environment variable
    - Add configurable cache TTL
    - _Requirements: 4_

  - [ ]* 8.3 Add cache metrics
    - Log cache hits and misses
    - Track cache hit rate
    - _Requirements: 4, 5.1_

- [ ] 9. Implement multiple bike types support
  - [ ] 9.1 Update provider interface for bike types
    - Add bike type parameter to route requests
    - Update Mapbox provider to handle generic cycling
    - Update ORS provider to map bike types to ORS profiles
    - _Requirements: 6_

  - [ ] 9.2 Add bike type fallback logic
    - When provider doesn't support specific bike type, use generic cycling
    - Add warning to response when fallback occurs
    - _Requirements: 6_

  - [ ] 9.3 Update frontend to support bike type selection
    - Add bike type selector to UI
    - Pass bike type to routing API
    - Display warnings when fallback occurs
    - _Requirements: 6, 9_

- [ ] 10. Implement premium provider support
  - [ ] 10.1 Add user plan detection
    - Extract user plan from auth context
    - Pass plan information to provider registry
    - _Requirements: 2.2_

  - [ ] 10.2 Add provider access control
    - Check user plan before allowing premium providers
    - Return 403 error for unauthorized provider access
    - Include upgrade message in error response
    - _Requirements: 2.2_

  - [ ] 10.3 Update frontend to handle premium features
    - Display premium badge on paid providers
    - Show upgrade prompt when free user selects premium provider
    - _Requirements: 2.2_
