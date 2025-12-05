# Design Document: Provider-Specific Routing Profiles

## Overview

This feature refactors the routing service to use provider-specific profiles instead of a generic profile + bike type combination. Each routing provider (Mapbox, OpenRouteService) will define its own set of supported profiles with rich metadata including display titles, icons, and categories. The frontend will dynamically query available profiles for the selected provider and display them appropriately.

### Key Changes

1. **Remove BikeType enum** - No longer needed as providers define their own cycling variants
2. **Provider-specific profiles** - Each provider defines its exact API profile identifiers with metadata
3. **New profiles endpoint** - `GET /api/routing/providers/:provider/profiles` returns available profiles
4. **Simplified route requests** - Profile field accepts provider-specific identifiers directly

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Mobile App                                │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │ Provider Picker │───▶│ Profile Picker  │                     │
│  └─────────────────┘    └────────┬────────┘                     │
│                                  │                               │
│                    GET /providers/:provider/profiles             │
└──────────────────────────────────┼──────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Routing Service                             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   Provider Registry                      │    │
│  │  ┌─────────────┐         ┌─────────────────────────┐    │    │
│  │  │   Mapbox    │         │   OpenRouteService      │    │    │
│  │  │  Provider   │         │      Provider           │    │    │
│  │  │             │         │                         │    │    │
│  │  │ profiles:   │         │ profiles:               │    │    │
│  │  │ - driving   │         │ - driving-car           │    │    │
│  │  │ - driving-  │         │ - driving-hgv           │    │    │
│  │  │   traffic   │         │ - cycling-regular       │    │    │
│  │  │ - walking   │         │ - cycling-road          │    │    │
│  │  │ - cycling   │         │ - cycling-mountain      │    │    │
│  │  └─────────────┘         │ - cycling-electric      │    │    │
│  │                          │ - foot-walking          │    │    │
│  │                          │ - foot-hiking           │    │    │
│  │                          │ - wheelchair            │    │    │
│  │                          └─────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Profile Metadata Interface

```typescript
interface ProfileMetadata {
  id: string;           // Provider-specific profile identifier (e.g., "cycling-road")
  title: string;        // Human-readable display title (e.g., "Road Cycling")
  icon: string;         // Icon identifier for UI (e.g., "directions-bike")
  category: ProfileCategory;  // Grouping category
  description?: string; // Optional detailed description
}

enum ProfileCategory {
  CYCLING = 'cycling',
  WALKING = 'walking',
  DRIVING = 'driving',
  OTHER = 'other',
}
```

### Updated Provider Interface

```typescript
interface RouteProvider {
  name: string;
  displayName: string;
  profiles: ProfileMetadata[];  // Replaces capabilities.profiles and capabilities.bikeTypes
  defaultProfile: string;       // Default profile ID for this provider
  
  calculateRoute(request: RouteRequest): Promise<MapboxDirectionsResponse>;
  isAvailable(): Promise<boolean>;
}
```

### Updated Route Request

```typescript
interface RouteRequest {
  waypoints: Coordinate[];
  profile?: string;      // Provider-specific profile ID (e.g., "cycling-road")
  provider?: string;     // Provider name (e.g., "openrouteservice")
  userId?: string;
  userPlan?: 'free' | 'paid';
  // Removed: bikeType field
}
```

### New API Endpoint

```
GET /api/routing/providers/:provider/profiles

Response:
{
  "provider": "openrouteservice",
  "profiles": [
    {
      "id": "cycling-regular",
      "title": "Regular Cycling",
      "icon": "directions-bike",
      "category": "cycling",
      "description": "Standard cycling profile for general use"
    },
    ...
  ],
  "defaultProfile": "cycling-regular"
}
```

## Data Models

### Mapbox Profile Definitions

| Profile ID | Title | Icon | Category |
|------------|-------|------|----------|
| driving | Driving | directions-car | driving |
| driving-traffic | Driving (Traffic) | traffic | driving |
| walking | Walking | directions-walk | walking |
| cycling | Cycling | directions-bike | cycling |

### OpenRouteService Profile Definitions

| Profile ID | Title | Icon | Category | Description |
|------------|-------|------|----------|-------------|
| driving-car | Car | directions-car | driving | Standard car routing |
| driving-hgv | Heavy Vehicle | local-shipping | driving | Routing for trucks and heavy goods vehicles |
| cycling-regular | Regular Cycling | directions-bike | cycling | Standard cycling profile |
| cycling-road | Road Cycling | directions-bike | cycling | Optimized for road bikes |
| cycling-mountain | Mountain Biking | terrain | cycling | Optimized for mountain bikes and trails |
| cycling-electric | E-Bike | electric-bike | cycling | Optimized for electric bikes |
| foot-walking | Walking | directions-walk | walking | Standard walking profile |
| foot-hiking | Hiking | hiking | walking | Optimized for hiking trails |
| wheelchair | Wheelchair | accessible | other | Wheelchair accessible routing |

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Profile Metadata Completeness

*For any* profile returned by the profiles endpoint, the profile object SHALL contain a non-empty id, a non-empty title, a non-empty icon identifier, and a valid category from the ProfileCategory enum.

**Validates: Requirements 1.2, 1.3, 1.4, 6.2**

### Property 2: Non-Existent Provider Returns 404

*For any* provider name that is not registered in the provider registry, a request to get profiles for that provider SHALL return HTTP status code 404.

**Validates: Requirements 1.5**

### Property 3: Unsupported Profile Returns 400

*For any* route request where the specified profile is not in the selected provider's profile list, the Routing Service SHALL return HTTP status code 400 before making any external API calls.

**Validates: Requirements 2.4, 2.5**

### Property 4: Default Profile Selection

*For any* route request that does not specify a profile, the Routing Service SHALL use the provider's default profile and the route calculation SHALL succeed (assuming valid waypoints and available provider).

**Validates: Requirements 4.4**

### Property 5: Profiles Sorted by Category Then Title

*For any* provider's profiles response, the profiles array SHALL be sorted first by category (in order: cycling, walking, driving, other) and then alphabetically by title within each category.

**Validates: Requirements 6.3**

### Property 6: Valid Profile Requests Succeed

*For any* route request with a profile that exists in the selected provider's profile list and valid waypoints, the route calculation SHALL not fail due to profile validation (may still fail due to external API issues).

**Validates: Requirements 4.1**

### Property 7: Provider Profiles Match API Capabilities

*For any* profile defined for a provider, that profile identifier SHALL be accepted by the provider's external API without transformation.

**Validates: Requirements 4.2**

## Error Handling

### Profile Validation Errors

| Error Condition | HTTP Status | Error Code | Message |
|-----------------|-------------|------------|---------|
| Provider not found | 404 | ProviderNotFound | Provider '{name}' not found |
| Profile not supported | 400 | InvalidProfile | Profile '{profile}' is not supported by provider '{provider}' |
| Missing waypoints | 400 | InvalidRequest | At least 2 waypoints required |

### Error Response Format

```typescript
interface ErrorResponse {
  code: string;
  message: string;
  provider?: string;
  availableProfiles?: string[];  // Included for InvalidProfile errors
}
```

## Testing Strategy

### Unit Tests

1. **Profile metadata validation** - Verify all providers have complete profile metadata
2. **Mapbox profiles** - Verify Mapbox provider has exactly: driving, driving-traffic, walking, cycling
3. **ORS profiles** - Verify ORS provider has all 9 expected profiles
4. **Profile sorting** - Verify profiles are sorted by category then title
5. **Error responses** - Verify correct HTTP status codes for invalid inputs

### Property-Based Tests

The testing strategy uses **fast-check** as the property-based testing library for TypeScript.

Each property-based test MUST:
- Run a minimum of 100 iterations
- Be tagged with a comment referencing the correctness property: `**Feature: routing-profiles, Property {number}: {property_text}**`
- Generate random but valid inputs using smart generators

#### Property Test Generators

```typescript
// Generator for valid provider names
const validProviderGen = fc.constantFrom('mapbox', 'openrouteservice');

// Generator for invalid provider names (not in registry)
const invalidProviderGen = fc.string({ minLength: 1 })
  .filter(s => !['mapbox', 'openrouteservice'].includes(s));

// Generator for valid profile IDs per provider
const validProfileGen = (provider: string) => {
  const profiles = getProviderProfiles(provider);
  return fc.constantFrom(...profiles.map(p => p.id));
};

// Generator for invalid profile IDs for a provider
const invalidProfileGen = (provider: string) => {
  const validIds = getProviderProfiles(provider).map(p => p.id);
  return fc.string({ minLength: 1 }).filter(s => !validIds.includes(s));
};

// Generator for valid waypoints
const waypointGen = fc.record({
  latitude: fc.double({ min: -90, max: 90 }),
  longitude: fc.double({ min: -180, max: 180 }),
});

const waypointsGen = fc.array(waypointGen, { minLength: 2, maxLength: 10 });
```

#### Property Tests to Implement

1. **Property 1 Test**: For all providers and all their profiles, verify metadata completeness
2. **Property 2 Test**: For all invalid provider names, verify 404 response
3. **Property 3 Test**: For all providers and invalid profiles, verify 400 response
4. **Property 4 Test**: For all providers with valid waypoints and no profile, verify success
5. **Property 5 Test**: For all providers, verify profile sorting order
6. **Property 6 Test**: For all providers with valid profiles and waypoints, verify no validation error

### Integration Tests

1. **End-to-end profile query** - Query profiles for each provider and verify response structure
2. **Route with provider profile** - Calculate route using provider-specific profile
3. **Provider switching** - Verify profile lists update when switching providers

