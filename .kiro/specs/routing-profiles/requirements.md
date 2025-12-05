# Requirements Document

## Introduction

This feature enhances the Routing Service to support provider-specific routing profiles with rich metadata. Instead of maintaining a generic set of profiles (walking, cycling, driving) with a separate "bike type" concept, each routing provider will define its own supported profiles with display names and icons. The frontend will query available profiles from the backend for the selected provider, enabling dynamic profile selection that accurately reflects each provider's capabilities.

## Glossary

- **Routing Service**: The microservice responsible for calculating routes between waypoints
- **Route Provider**: An external routing API service (e.g., Mapbox, OpenRouteService)
- **Profile**: A provider-specific routing mode identifier (e.g., "cycling-road", "foot-walking", "driving-traffic")
- **Profile Metadata**: Display information for a profile including title, icon identifier, and description
- **Profile Category**: A grouping of related profiles (e.g., "cycling", "walking", "driving")
- **Provider Profile Registry**: A mapping of provider names to their supported profiles with metadata

## Requirements

### Requirement 1

**User Story:** As a mobile app developer, I want to query available routing profiles for a specific provider, so that I can display accurate profile options to users based on their selected provider.

#### Acceptance Criteria

1. WHEN a client requests profiles for a specific provider, THE Routing Service SHALL return a list of all profiles supported by that provider
2. THE Routing Service SHALL include profile metadata containing a display title for each profile
3. THE Routing Service SHALL include profile metadata containing an icon identifier for each profile
4. THE Routing Service SHALL include profile metadata containing a category for each profile
5. WHEN a client requests profiles for a non-existent provider, THE Routing Service SHALL return an error response with HTTP status code 404

### Requirement 2

**User Story:** As a system administrator, I want each routing provider to define its own supported profiles, so that the system accurately reflects the capabilities of each external routing API.

#### Acceptance Criteria

1. THE Routing Service SHALL define Mapbox profiles including driving, driving-traffic, walking, and cycling
2. THE Routing Service SHALL define OpenRouteService profiles including driving-car, driving-hgv, cycling-regular, cycling-road, cycling-mountain, cycling-electric, foot-walking, foot-hiking, and wheelchair
3. THE Routing Service SHALL store profile definitions with the provider implementation
4. THE Routing Service SHALL validate that requested profiles exist for the selected provider before making API calls
5. WHEN a route request specifies an unsupported profile for the selected provider, THE Routing Service SHALL return an error response with HTTP status code 400

### Requirement 3

**User Story:** As a mobile app user, I want to see human-readable profile names and icons, so that I can easily understand and select my preferred routing mode.

#### Acceptance Criteria

1. THE Routing Service SHALL provide a formatted display title for each profile (e.g., "Road Cycling" for cycling-road)
2. THE Routing Service SHALL provide an icon identifier for each profile that maps to a standard icon set
3. THE Routing Service SHALL group profiles by category (cycling, walking, driving, other) for UI organization
4. THE Routing Service SHALL include an optional description field for profiles that require additional explanation

### Requirement 4

**User Story:** As a mobile app developer, I want route requests to use provider-specific profile identifiers directly, so that the routing logic is simplified and provider capabilities are accurately utilized.

#### Acceptance Criteria

1. WHEN a route calculation request is received, THE Routing Service SHALL accept the provider-specific profile identifier directly
2. THE Routing Service SHALL pass the profile identifier to the provider API without transformation
3. THE Routing Service SHALL remove the separate bike type parameter from route requests
4. WHEN a profile is not specified in the request, THE Routing Service SHALL use a default profile appropriate for the selected provider

### Requirement 5

**User Story:** As a mobile app user, I want to select a routing profile from a list specific to my chosen provider, so that I can use the full range of routing options available.

#### Acceptance Criteria

1. WHEN a user selects a routing provider, THE Mobile App SHALL query the Routing Service for available profiles
2. THE Mobile App SHALL display profiles grouped by category with icons and display titles
3. THE Mobile App SHALL remember the user selected profile per provider for future route requests
4. WHEN the user switches providers, THE Mobile App SHALL update the profile selection to show profiles available for the new provider
5. THE Mobile App SHALL select a sensible default profile when the user previously selected profile is not available for the new provider

### Requirement 6

**User Story:** As a developer, I want profile metadata to be serializable to JSON, so that the frontend can easily consume and display profile information.

#### Acceptance Criteria

1. THE Routing Service SHALL serialize profile metadata as JSON with consistent field names
2. THE Routing Service SHALL include the profile identifier, display title, icon, category, and optional description in the JSON response
3. THE Routing Service SHALL return profiles as an array ordered by category then by display title

