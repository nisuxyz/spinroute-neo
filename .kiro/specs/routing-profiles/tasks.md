# Implementation Plan

- [x] 1. Define profile metadata types and constants
  - [x] 1.1 Create ProfileMetadata interface and ProfileCategory enum in base.ts
    - Add ProfileMetadata interface with id, title, icon, category, and optional description fields
    - Add ProfileCategory enum with CYCLING, WALKING, DRIVING, OTHER values
    - Remove BikeType enum from base.ts
    - _Requirements: 1.2, 1.3, 1.4, 3.1, 3.2, 3.3_

  - [ ]* 1.2 Write property test for profile metadata completeness
    - **Property 1: Profile Metadata Completeness**
    - **Validates: Requirements 1.2, 1.3, 1.4, 6.2**
    - Test that all profiles from all providers have non-empty id, title, icon, and valid category

- [x] 2. Update Mapbox provider with profile definitions
  - [x] 2.1 Define Mapbox profile metadata array
    - Add profiles array with: driving, driving-traffic, walking, cycling
    - Include display titles, icons, and categories for each profile
    - Set defaultProfile to 'cycling'
    - Remove capabilities.bikeTypes
    - _Requirements: 2.1, 2.3_

  - [x] 2.2 Update Mapbox calculateRoute to use profile directly
    - Remove mapProfileToMapbox method that mapped RouteProfile enum
    - Accept profile string directly from request
    - Validate profile exists in provider's profile list before API call
    - _Requirements: 4.1, 4.2, 2.4_

- [x] 3. Update OpenRouteService provider with profile definitions
  - [x] 3.1 Define OpenRouteService profile metadata array
    - Add profiles array with all 9 profiles: driving-car, driving-hgv, cycling-regular, cycling-road, cycling-mountain, cycling-electric, foot-walking, foot-hiking, wheelchair
    - Include display titles, icons, categories, and descriptions for each profile
    - Set defaultProfile to 'cycling-regular'
    - Remove capabilities.bikeTypes
    - _Requirements: 2.2, 2.3_

  - [x] 3.2 Update ORS calculateRoute to use profile directly
    - Remove mapProfileToORS method that mapped RouteProfile + BikeType
    - Accept profile string directly from request
    - Validate profile exists in provider's profile list before API call
    - _Requirements: 4.1, 4.2, 2.4_

  - [ ]* 3.3 Write property test for unsupported profile validation
    - **Property 3: Unsupported Profile Returns 400**
    - **Validates: Requirements 2.4, 2.5**
    - Test that invalid profiles for each provider return 400 before external API call

- [x] 4. Update RouteProvider interface and registry
  - [x] 4.1 Update RouteProvider interface in base.ts
    - Add profiles: ProfileMetadata[] property
    - Add defaultProfile: string property
    - Remove ProviderCapabilities type (no longer needed)
    - _Requirements: 2.3_

  - [x] 4.2 Update ProviderRegistry to support profile queries
    - Add getProviderProfiles(providerName: string) method
    - Add validateProfile(providerName: string, profile: string) method
    - Update selectProvider to validate profile if specified
    - _Requirements: 1.1, 2.4_

  - [ ]* 4.3 Write property test for non-existent provider
    - **Property 2: Non-Existent Provider Returns 404**
    - **Validates: Requirements 1.5**
    - Test that querying profiles for non-existent providers returns 404

- [x] 5. Update route request handling
  - [x] 5.1 Update RouteRequest interface
    - Change profile field from RouteProfile enum to string type
    - Remove bikeType field entirely
    - _Requirements: 4.3_

  - [x] 5.2 Update directions endpoint validation schema
    - Change profile validation from nativeEnum to string
    - Remove bikeType from schema
    - Add profile validation against provider's supported profiles
    - _Requirements: 2.5, 4.1_

  - [x] 5.3 Update route calculation logic
    - Use provider's defaultProfile when profile not specified
    - Remove bike type fallback warning logic
    - _Requirements: 4.4_

  - [ ]* 5.4 Write property test for default profile selection
    - **Property 4: Default Profile Selection**
    - **Validates: Requirements 4.4**
    - Test that requests without profile use provider's default and succeed

- [x] 6. Add profiles endpoint
  - [x] 6.1 Create GET /api/routing/providers/:provider/profiles endpoint
    - Return profiles array with metadata for specified provider
    - Return defaultProfile for the provider
    - Return 404 for non-existent providers
    - _Requirements: 1.1, 1.5_

  - [x] 6.2 Implement profile sorting
    - Sort profiles by category (cycling, walking, driving, other) then by title
    - _Requirements: 6.3_

  - [ ]* 6.3 Write property test for profile sorting
    - **Property 5: Profiles Sorted by Category Then Title**
    - **Validates: Requirements 6.3**
    - Test that profiles are sorted by category order then alphabetically by title

- [ ] 7. Checkpoint - Backend tests passing
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Update frontend types and hooks
  - [x] 8.1 Update use-directions hook
    - Remove BikeType enum and bikeType from DirectionsRequest
    - Change profile type from RouteProfile enum to string
    - Remove preferred_bike_type from settings usage
    - _Requirements: 4.3_

  - [x] 8.2 Create useProviderProfiles hook
    - Fetch profiles from /api/routing/providers/:provider/profiles
    - Cache profiles per provider
    - Return loading, error, and profiles state
    - _Requirements: 5.1_

- [x] 9. Update frontend components
  - [x] 9.1 Update RoutePreferencesCard component
    - Replace hardcoded profile options with dynamic profiles from useProviderProfiles
    - Group profiles by category in the menu
    - Show profile icons and titles
    - _Requirements: 5.2_

  - [x] 9.2 Update user settings context
    - Change preferred_routing_profile to store provider-specific profile ID
    - Store profile preference per provider (e.g., preferred_profile_mapbox, preferred_profile_openrouteservice)
    - _Requirements: 5.3_

  - [x] 9.3 Handle provider switching
    - When provider changes, load new profiles and select appropriate default
    - If previous profile exists for new provider, use it; otherwise use provider default
    - _Requirements: 5.4, 5.5_

  - [ ]* 9.4 Write property test for default profile fallback logic
    - **Property 6: Valid Profile Requests Succeed**
    - **Validates: Requirements 4.1**
    - Test that valid profile/provider combinations don't fail validation

- [x] 10. Update database schema (if needed)
  - [x] 10.1 Update user_settings table
    - Add columns for per-provider profile preferences or use JSON field
    - Migrate existing preferred_routing_profile and preferred_bike_type data
    - _Requirements: 5.3_
  - [x] 10.2 Update frontend
    - Update frontend components to use new database schema
    - _Requirements: 5.3_

- [ ] 11. Final Checkpoint - All tests passing
  - Ensure all tests pass, ask the user if questions arise.

