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

- [x] 4. Implement health check and logging
  - [x] 4.1 Update health check endpoint in `src/health.ts`
    - Check Mapbox provider availability
    - Return provider status in health response
    - _Requirements: 5.1_

  - [x] 4.2 Add request logging
    - Log route requests with provider and response time
    - Log errors with full details
    - _Requirements: 5.1_

- [x] 5. Implement frontend directions UI
  
  **Existing Infrastructure:**
  - ✅ Location search UI fully implemented with `SearchButton`, `SearchSheet`, and `LocationCard` components
  - ✅ Mapbox Search API integration with autocomplete suggestions and coordinate retrieval
  - ✅ Session token management for Mapbox Search API
  - ✅ Glass effect UI with bottom sheet modal for search
  - ✅ Location marker display on map with custom pin styling
  - ✅ User location tracking via `useMapLocation` hook
  - ✅ Map camera control via `cameraRef` for animated navigation
  - ✅ Environment configuration via `useEnv` hook for API keys
  
  **Components to Leverage:**
  - `SearchSheet.tsx`: Bottom sheet with search input and results list
  - `LocationCard.tsx`: Displays selected location with expandable details view
  - `MainMapView.tsx`: Main map component with Mapbox integration
  - `MapActionButtons.tsx`: Action button container (can add directions button here)
  
  **Implementation Tasks:**
  
  - [x] 5.1 Create directions hook in `frontend-expo/hooks/use-directions.ts`
    - Implement function to call routing service API at `/api/routing/directions`
    - Handle loading and error states
    - Parse and return route data (geometry, distance, duration, steps)
    - Accept origin (user location), destination, profile, and provider parameters
    - _Requirements: 8_

  - [x] 5.2 Add "Get Directions" button to LocationCard
    - Update `LocationCard.tsx` to include "Get Directions" action button
    - Trigger directions calculation on button press
    - Pass user location (from `useMapLocation`) and selected location to routing service
    - Show loading state during route calculation
    - Handle case when user location is unavailable
    - _Requirements: 8_

  - [x] 5.3 Display route on map
    - Add route state to `MainMapView.tsx` component
    - Create `Mapbox.ShapeSource` and `Mapbox.LineLayer` for route geometry
    - Render route as blue/purple line with appropriate width and styling
    - Add route start/end markers (origin and destination pins)
    - Fit map camera to route bounds when route is displayed
    - _Requirements: 8_

  - [x] 5.4 Create route information component
    - Create new `RouteInfoCard.tsx` component to display route details
    - Show route distance (in km/miles based on user preference)
    - Show estimated duration
    - Display selected profile (cycling, walking, etc.)
    - Show loading indicator during calculation
    - Display error messages when routing fails
    - Position card similar to `LocationCard` (bottom of screen)
    - _Requirements: 8_

  - [x] 5.5 Add route clearing functionality
    - Add "Clear Route" button to `RouteInfoCard` or `MapActionButtons`
    - Clear route state and remove route layers from map
    - Reset camera to user location or previous view
    - Clear route when new location search is performed
    - Clear route when user taps map (optional)
    - _Requirements: 8_
  
  - [x] 5.6 Integrate with existing search flow
    - Update `SearchSheet.tsx` to optionally show "Get Directions" in search results
    - When location is selected, show both location card and directions option
    - Maintain existing search functionality (location marker, camera animation)
    - Ensure smooth transition between search and directions modes
    - _Requirements: 8_

- [x] 6. Implement OpenRouteService provider
  - Make sure you thoroughly analyze and understand the existing implementation and follow the appropriate patterns and practices.
  - OpenRouteService docs are available in docs/openrouteservice. Reference them as often as you need to.
  - [x] 6.1 Create OpenRouteService provider class in `lib/providers/openrouteservice.ts`
    - Implement `calculateRoute` method that calls ORS API
    - Implement `isAvailable` method
    - Define ORS capabilities (profiles, bike types)
    - _Requirements: 2, 6_

  - [x] 6.2 Implement response normalizer in `lib/providers/normalizer.ts`
    - Create function to transform ORS response to Mapbox format
    - Map ORS route geometry to GeoJSON LineString
    - Convert ORS instructions to Mapbox step format
    - Handle ORS-specific fields
    - _Requirements: 3_

  - [x] 6.3 Update provider registry
    - Register OpenRouteService provider
    - Update provider selection logic
    - _Requirements: 2, 2.1_

  - [ ]* 6.4 Write unit tests for ORS provider and normalizer
    - Test ORS route calculation
    - Test response normalization
    - Test error handling
    - _Requirements: 2, 3_

- [x] 7. Implement provider selection UI
  
  **Existing Infrastructure:**
  - ✅ User settings system with `useUserSettings` hook using `useSyncExternalStore` pattern
  - ✅ Settings stored in `public.user_settings` table with optimistic updates
  - ✅ Glass effect UI components (`GlassView` with iOS liquid glass support)
  - ✅ Bottom sheet modal pattern established in `SearchSheet.tsx`
  - ✅ Settings screen at `/settings` route with sections pattern
  - ✅ Existing settings sections: `AccountSection`, `AppSettingsSection`, `DevSettingsSection`, `UserProfileSection`
  - ✅ `useDirections` hook already accepts `provider` and `profile` parameters
  - ✅ `RouteInfoCard` displays route profile with icon and label
  
  **Database Schema:**
  - Current `user_settings` fields: `id`, `units`, `active_bike_id`, `start_recording_on_launch`, `capture_interval_seconds`, `map_style`, `created_at`, `updated_at`
  - Need to add: `preferred_routing_provider` (text), `preferred_routing_profile` (text), `preferred_bike_type` (text)
  
  **Components to Leverage:**
  - `AppSettingsSection.tsx`: Pattern for settings UI with switches and pickers
  - `MapStylePicker.tsx`: Modal picker pattern with radio buttons and preview
  - `useUserSettings`: Hook for reading/writing user preferences with optimistic updates
  - `RouteInfoCard.tsx`: Already displays profile, can be extended to show provider
  
  **Implementation Tasks:**
  
  - [x] 7.1 Add routing preferences to database schema
    - Create migration to add `preferred_routing_provider` (text, nullable, default: null)
    - Add `preferred_routing_profile` (text, nullable, default: 'cycling')
    - Add `preferred_bike_type` (text, nullable, default: 'generic')
    - Update TypeScript types by regenerating with Supabase CLI
    - _Requirements: 9_

  - [x] 7.2 Create routing settings section component
    - Create `RoutingSettingsSection.tsx` following pattern from `AppSettingsSection.tsx`
    - Use glass effect container with section header "Routing Preferences"
    - Include three setting rows: Provider, Profile, and Bike Type
    - Each row should show current value and open picker on tap
    - Use `MaterialIcons` for icons (e.g., 'route', 'directions-bike', 'pedal-bike')
    - _Requirements: 9_

  - [x] 7.3 Create provider picker component
    - Create `ProviderPicker.tsx` following pattern from `MapStylePicker.tsx`
    - Fetch available providers from `GET /api/routing/providers` endpoint
    - Display providers as radio button list with provider name and description
    - Show availability status indicator (green dot for available, red for unavailable)
    - Show "Premium" badge for paid providers (when implemented)
    - Save selection to user settings via `updateSettings({ preferred_routing_provider: value })`
    - Handle loading state while fetching providers
    - _Requirements: 9_

  - [x] 7.4 Create profile picker component
    - Create `ProfilePicker.tsx` similar to `ProviderPicker.tsx`
    - Display profile options: Walking, Cycling, Driving (if supported by provider)
    - Use appropriate `MaterialIcons` for each profile (directions-walk, directions-bike, directions-car)
    - Filter profiles based on selected provider's capabilities
    - Save selection to user settings via `updateSettings({ preferred_routing_profile: value })`
    - _Requirements: 9_

  - [x] 7.5 Create bike type picker component
    - Create `BikeTypePicker.tsx` similar to profile picker
    - Display bike type options: Generic, Road, Mountain, E-Bike
    - Only show when profile is 'cycling'
    - Use bike-related icons from `MaterialIcons`
    - Save selection to user settings via `updateSettings({ preferred_bike_type: value })`
    - Show info message about provider support (some providers may fall back to generic)
    - _Requirements: 9_

  - [x] 7.6 Integrate routing settings into settings screen
    - Add `RoutingSettingsSection` to `app/settings.tsx` screen
    - Position after `AppSettingsSection` and before `DevSettingsSection`
    - Ensure consistent styling with other sections
    - _Requirements: 9_

  - [x] 7.7 Update useDirections hook to use preferences
    - Modify `useDirections` hook to read from `settings.preferred_routing_provider`
    - Use `settings.preferred_routing_profile` as default profile
    - Use `settings.preferred_bike_type` as default bike type
    - Allow override via function parameters (for future multi-route comparison)
    - Fall back to 'cycling' profile and 'generic' bike type if preferences not set
    - _Requirements: 9_

  - [x] 7.8 Update LocationCard to respect preferences
    - Modify `handleGetDirections` in `MainMapView.tsx` to use preferred settings
    - Pass `settings.preferred_routing_profile` and `settings.preferred_bike_type` to `calculateRoute`
    - Pass `settings.preferred_routing_provider` if set
    - _Requirements: 9_

  - [x] 7.9 Update RouteInfoCard to show provider
    - Add provider name display to `RouteInfoCard.tsx` (e.g., "via Mapbox" or "via OpenRouteService")
    - Show provider in collapsed view as small text below profile label
    - Show provider in expanded view header
    - Use muted text color for provider name
    - _Requirements: 9_

  - [x] 7.10 Add provider/profile quick switcher (optional enhancement)
    - Add small button to `RouteInfoCard` to quickly change provider/profile
    - Open picker modal without navigating to settings
    - Recalculate route immediately when selection changes
    - Show loading state during recalculation
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
