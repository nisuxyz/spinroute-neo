# Requirements Document

## Introduction

The Routing Service provides route calculation capabilities for the SpinRoute Neo platform. It acts as an abstraction layer over multiple routing providers, returning responses in a Mapbox Directions API-compatible format. This enables the platform to switch between providers or implement fallback strategies while maintaining a consistent interface for clients. The service initially supports Mapbox Directions API (as the reference implementation) and OpenRouteService (both free options), with plans to add Apple Maps API, Transitous, and other providers in the future.

## Glossary

- **Routing Service**: The microservice responsible for calculating routes between waypoints
- **Route Provider**: An external routing API service (e.g., Mapbox, OpenRouteService)
- **Waypoint**: A geographic coordinate (latitude, longitude) representing a point along a route
- **Route Response**: A JSON object containing route geometry, distance, duration, and turn-by-turn instructions
- **Mapbox Directions API**: The standard API format used by Mapbox for route responses
- **Profile**: A routing mode such as cycling, walking, driving, or public transport
- **Bike Type**: A specific cycling mode such as road bike, mountain bike, or e-bike
- **Multi-modal Route**: A route that combines multiple transportation modes (e.g., walking + public transport + cycling)
- **User Plan**: A subscription tier (free or paid) that determines which route providers are available
- **Provider Capability**: A feature or profile that a specific route provider supports

## Implementation Priority

To support incremental development, requirements are prioritized as follows:

**Phase 1 - MVP (Mapbox Reference Implementation + Frontend):**
- Requirement 1: Basic route calculation with Mapbox Directions API
- Requirement 6: Single cycling profile support
- Requirement 3: Response normalization (Mapbox passthrough initially)
- Requirement 2.1: Default provider selection
- Requirement 8: Directions display UI (integrate with existing location search)
- Requirement 5.1: Basic health check and logging

**Phase 2 - Multi-Provider (Add OpenRouteService):**
- Requirement 2: Multiple provider support (add OpenRouteService)
- Requirement 3: Full response normalization for OpenRouteService
- Requirement 2.1: User provider selection
- Requirement 9: Provider and profile selection UI
- Requirement 5: Provider capability discovery API

**Phase 3 - Advanced Features:**
- Requirement 6: Multiple bike types support
- Requirement 4: Caching and performance optimization
- Requirement 2.2: Premium provider support (future providers)

**Phase 4 - Multi-Modal:**
- Requirement 7: Multi-modal routing support

**Ongoing:**
- Requirement 5.1: Monitoring and observability (enhanced)

## Requirements

### Requirement 1

**User Story:** As a mobile app user, I want to calculate cycling routes between two or more points, so that I can navigate to bikeshare stations or destinations

#### Acceptance Criteria

1. WHEN a route calculation request is received with valid waypoints and a cycling profile, THE Routing Service SHALL return a route response containing geometry, distance, duration, and turn-by-turn instructions
2. WHEN a route calculation request specifies a provider preference, THE Routing Service SHALL use the specified provider if available
3. IF the specified provider fails or is unavailable, THEN THE Routing Service SHALL return an error response with HTTP status code 503
4. THE Routing Service SHALL return responses in Mapbox Directions API-compatible JSON format
5. WHEN a route calculation request contains invalid waypoints, THE Routing Service SHALL return an error response with HTTP status code 400

### Requirement 2

**User Story:** As a system administrator, I want the routing service to support multiple providers with different capabilities, so that I can offer diverse routing options to users

#### Acceptance Criteria

1. THE Routing Service SHALL support Mapbox Directions API as a route provider
2. THE Routing Service SHALL support OpenRouteService as a route provider
3. WHERE a provider is configured with API credentials, THE Routing Service SHALL enable that provider for route calculations
4. THE Routing Service SHALL maintain a provider registry that tracks provider capabilities including supported profiles and bike types
5. THE Routing Service SHALL support adding future providers including Apple Maps API and Transitous without modifying core routing logic

### Requirement 2.1

**User Story:** As a user, I want to choose between different free routing providers, so that I can select the one that works best for my needs

#### Acceptance Criteria

1. THE Routing Service SHALL make Mapbox Directions API available to all users
2. THE Routing Service SHALL make OpenRouteService available to all users
3. WHEN a user requests a route without specifying a provider, THE Routing Service SHALL use Mapbox Directions API as the default
4. THE Routing Service SHALL allow users to explicitly select their preferred provider in route requests

### Requirement 2.2

**User Story:** As a paid plan user, I want access to premium routing providers, so that I can use advanced features and additional routing options

#### Acceptance Criteria

1. THE Routing Service SHALL support premium providers that require paid plan access
2. WHEN a free plan user requests a premium provider, THE Routing Service SHALL return an error response with HTTP status code 403 indicating upgrade required
3. WHERE a provider supports multiple bike types, THE Routing Service SHALL pass the specific bike type to the provider
4. WHERE a provider supports only a generic cycling profile, THE Routing Service SHALL use the generic cycling profile regardless of requested bike type

### Requirement 3

**User Story:** As a developer, I want the routing service to normalize responses from different providers, so that clients receive consistent data regardless of which provider is used

#### Acceptance Criteria

1. THE Routing Service SHALL return Mapbox Directions API responses without transformation when using Mapbox as the provider
2. THE Routing Service SHALL transform OpenRouteService responses into Mapbox Directions API format
3. THE Routing Service SHALL include route geometry as GeoJSON LineString in all responses
4. THE Routing Service SHALL include total distance in meters in all responses
5. THE Routing Service SHALL include total duration in seconds in all responses

### Requirement 4

**User Story:** As a mobile app user, I want route calculations to complete quickly, so that I can start navigating without delays

#### Acceptance Criteria

1. WHEN a route calculation request is received, THE Routing Service SHALL respond within 3 seconds under normal conditions
2. THE Routing Service SHALL implement request timeouts of 5 seconds per provider
3. THE Routing Service SHALL cache route responses for identical requests for 15 minutes
4. WHEN a cached route is available, THE Routing Service SHALL return the cached response within 100 milliseconds

### Requirement 5

**User Story:** As a mobile app developer, I want to query available routing options for the current user, so that I can display appropriate provider and profile selections in the UI

#### Acceptance Criteria

1. THE Routing Service SHALL expose an endpoint that returns available providers for the authenticated user based on their plan
2. THE Routing Service SHALL expose an endpoint that returns supported profiles and bike types for each available provider
3. WHEN a user queries available options, THE Routing Service SHALL include provider names, display names, and capability lists
4. THE Routing Service SHALL include information about which profiles require a paid plan
5. THE Routing Service SHALL return provider availability status indicating if a provider is currently operational

### Requirement 5.1

**User Story:** As a system operator, I want the routing service to log provider usage and errors, so that I can monitor service health and provider performance

#### Acceptance Criteria

1. WHEN a route calculation request is processed, THE Routing Service SHALL log the provider used, response time, and success status
2. WHEN a provider fails, THE Routing Service SHALL log the error details and provider name
3. THE Routing Service SHALL expose health check endpoints that report provider availability
4. THE Routing Service SHALL expose metrics endpoints that report request counts, error rates, and response times per provider

### Requirement 6

**User Story:** As a mobile app user, I want to calculate routes using different transportation modes, so that I can choose the best way to reach my destination

#### Acceptance Criteria

1. THE Routing Service SHALL support a walking profile for pedestrian routing
2. THE Routing Service SHALL support cycling profiles for different bike types including road bike, mountain bike, and e-bike
3. THE Routing Service SHALL support a public transport profile for transit routing
4. WHEN a profile is not specified in the request, THE Routing Service SHALL default to the road bike cycling profile
5. THE Routing Service SHALL map profile names to provider-specific profile identifiers
6. WHEN a requested bike type is not supported by the selected provider, THE Routing Service SHALL use the provider generic cycling profile and include a warning in the response

### Requirement 7

**User Story:** As a mobile app user, I want to calculate multi-modal routes that combine walking, cycling, and public transport, so that I can plan complex journeys efficiently

#### Acceptance Criteria

1. THE Routing Service SHALL support multi-modal route requests that specify multiple allowed transportation modes
2. WHEN a multi-modal route is requested, THE Routing Service SHALL return a route that may include segments using different transportation modes
3. THE Routing Service SHALL include mode information for each route segment in the response
4. THE Routing Service SHALL calculate transitions between modes (e.g., walking to a bike station, then cycling)
5. WHERE a provider does not support multi-modal routing, THE Routing Service SHALL return an error response indicating the limitation

### Requirement 8

**User Story:** As a mobile app user, I want to get directions to a searched location, so that I can navigate to my destination

#### Acceptance Criteria

1. WHEN a user selects a searched location, THE Mobile App SHALL display an option to get directions
2. WHEN a user requests directions, THE Mobile App SHALL call the Routing Service with the user current location and destination
3. WHEN the route is calculated, THE Mobile App SHALL display the route geometry on the map
4. THE Mobile App SHALL display route distance and duration
5. THE Mobile App SHALL display appropriate error messages when the Routing Service returns an error

### Requirement 9

**User Story:** As a mobile app user, I want to select my preferred routing provider and bike type, so that I can get routes optimized for my needs

#### Acceptance Criteria

1. WHEN a user requests directions, THE Mobile App SHALL query the Routing Service for available providers and profiles
2. THE Mobile App SHALL display available routing providers as selectable options
3. THE Mobile App SHALL display available bike types as selectable options when cycling profile is selected
4. WHEN a user selects a provider and profile, THE Mobile App SHALL remember these preferences for future route requests
5. THE Mobile App SHALL display appropriate error messages when a provider is unavailable or returns an error
