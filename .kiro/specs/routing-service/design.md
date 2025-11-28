# Routing Service Design Document

## Overview

The Routing Service is a microservice that provides route calculation capabilities for the SpinRoute Neo platform. It abstracts multiple routing providers behind a unified API that returns Mapbox Directions API-compatible responses. The service is built using Hono (lightweight web framework) on Bun runtime, following the established SpinRoute Neo service architecture pattern.

The service will be implemented incrementally, starting with Mapbox Directions API as the reference implementation, then adding OpenRouteService and other providers. The frontend integration will be developed alongside the backend to enable immediate user value.

## Architecture

### High-Level Architecture

```
┌─────────────────┐
│  Mobile App     │
│  (Expo)         │
└────────┬────────┘
         │ HTTP/REST
         ▼
┌─────────────────┐
│  API Gateway    │
│  (Backend)      │
└────────┬────────┘
         │ Internal HTTP
         ▼
┌─────────────────────────────────────────┐
│         Routing Service                 │
│  ┌───────────────────────────────────┐  │
│  │     Provider Registry             │  │
│  │  - Mapbox Directions API          │  │
│  │  - OpenRouteService               │  │
│  │  - Future: Apple Maps, Transitous │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │     Response Normalizer           │  │
│  │  - Transform to Mapbox format     │  │
│  └───────────────────────────────────┘  │
└────────┬────────────────────────────────┘
         │ External API Calls
         ▼
┌─────────────────────────────────────────┐
│     External Routing Providers          │
│  - Mapbox Directions API                │
│  - OpenRouteService API                 │
└─────────────────────────────────────────┘
```

### Service Structure

Following the SpinRoute Neo service template pattern:

```
services/routing/
├── lib/
│   ├── auth.ts                    # Supabase Auth middleware
│   ├── config.ts                  # Environment configuration
│   ├── db.ts                      # Supabase client (if needed)
│   └── providers/
│       ├── base.ts                # Base provider interface
│       ├── mapbox.ts              # Mapbox provider implementation
│       ├── openrouteservice.ts    # OpenRouteService implementation
│       ├── registry.ts            # Provider registry
│       └── normalizer.ts          # Response normalization
├── src/
│   ├── index.ts                   # Service entry point
│   ├── health.ts                  # Health check endpoints
│   └── routing/
│       └── +routes.api.ts         # Public routing API
├── Containerfile                  # Production container
├── Containerfile.dev              # Development container
└── compose.yaml                   # Podman compose config
```

## Components and Interfaces

### 1. Provider Interface

Base interface that all routing providers must implement:

```typescript
interface RouteProvider {
  name: string;
  displayName: string;
  capabilities: ProviderCapabilities;
  
  calculateRoute(request: RouteRequest): Promise<MapboxDirectionsResponse>;
  isAvailable(): Promise<boolean>;
}

interface ProviderCapabilities {
  profiles: RouteProfile[];
  bikeTypes?: BikeType[];
  multiModal: boolean;
  requiresPaidPlan: boolean;
}

enum RouteProfile {
  WALKING = 'walking',
  CYCLING = 'cycling',
  DRIVING = 'driving',
  PUBLIC_TRANSPORT = 'public-transport'
}

enum BikeType {
  ROAD = 'road',
  MOUNTAIN = 'mountain',
  EBIKE = 'ebike',
  GENERIC = 'generic'
}

interface RouteRequest {
  waypoints: Coordinate[];
  profile: RouteProfile;
  bikeType?: BikeType;
  provider?: string;
  userId?: string;
  userPlan?: 'free' | 'paid';
}

interface Coordinate {
  latitude: number;
  longitude: number;
}
```

### 2. Mapbox Provider

Implements the `RouteProvider` interface for Mapbox Directions API:

```typescript
class MapboxProvider implements RouteProvider {
  name = 'mapbox';
  displayName = 'Mapbox';
  capabilities = {
    profiles: [RouteProfile.WALKING, RouteProfile.CYCLING, RouteProfile.DRIVING],
    bikeTypes: [BikeType.GENERIC], // Mapbox only has generic cycling
    multiModal: false,
    requiresPaidPlan: false
  };
  
  async calculateRoute(request: RouteRequest): Promise<MapboxDirectionsResponse> {
    // Call Mapbox Directions API
    // Return response directly (no transformation needed)
  }
  
  async isAvailable(): Promise<boolean> {
    // Check if API key is configured and service is reachable
  }
}
```

### 3. OpenRouteService Provider

Implements the `RouteProvider` interface for OpenRouteService:

```typescript
class OpenRouteServiceProvider implements RouteProvider {
  name = 'openrouteservice';
  displayName = 'OpenRouteService';
  capabilities = {
    profiles: [RouteProfile.WALKING, RouteProfile.CYCLING, RouteProfile.DRIVING],
    bikeTypes: [BikeType.ROAD, BikeType.MOUNTAIN, BikeType.EBIKE],
    multiModal: false,
    requiresPaidPlan: false
  };
  
  async calculateRoute(request: RouteRequest): Promise<MapboxDirectionsResponse> {
    // Call OpenRouteService API
    // Transform response to Mapbox format using normalizer
  }
  
  async isAvailable(): Promise<boolean> {
    // Check if API key is configured and service is reachable
  }
}
```

### 4. Provider Registry

Manages available providers and selects the appropriate one for requests:

```typescript
class ProviderRegistry {
  private providers: Map<string, RouteProvider>;
  
  registerProvider(provider: RouteProvider): void;
  getProvider(name: string): RouteProvider | undefined;
  getAvailableProviders(userPlan: 'free' | 'paid'): RouteProvider[];
  selectProvider(request: RouteRequest): RouteProvider;
}
```

### 5. Response Normalizer

Transforms provider-specific responses to Mapbox Directions API format:

```typescript
class ResponseNormalizer {
  normalizeOpenRouteService(response: ORSResponse): MapboxDirectionsResponse;
  // Future: normalizeAppleMaps, normalizeTransitous, etc.
}
```

### 6. Routing API Endpoints

Public API routes exposed by the service:

```typescript
// GET /api/routing/providers
// Returns available providers and their capabilities
interface ProvidersResponse {
  providers: {
    name: string;
    displayName: string;
    capabilities: ProviderCapabilities;
    available: boolean;
  }[];
}

// POST /api/routing/directions
// Calculate a route
interface DirectionsRequest {
  waypoints: Coordinate[];
  profile?: RouteProfile;
  bikeType?: BikeType;
  provider?: string;
}

interface DirectionsResponse extends MapboxDirectionsResponse {
  provider: string;
  warnings?: string[];
}

// GET /api/routing/health
// Health check endpoint
interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  providers: {
    [key: string]: {
      available: boolean;
      lastChecked: string;
    };
  };
}
```

## Data Models

### Mapbox Directions API Response Format

The service returns responses in Mapbox Directions API v5 format:

```typescript
interface MapboxDirectionsResponse {
  code: string; // 'Ok' or error code
  routes: Route[];
  waypoints: Waypoint[];
  uuid?: string;
}

interface Route {
  distance: number; // meters
  duration: number; // seconds
  geometry: GeoJSON.LineString | string; // GeoJSON or polyline
  legs: RouteLeg[];
  weight: number;
  weight_name: string;
}

interface RouteLeg {
  distance: number;
  duration: number;
  steps: RouteStep[];
  summary: string;
}

interface RouteStep {
  distance: number;
  duration: number;
  geometry: GeoJSON.LineString | string;
  name: string;
  mode: string;
  maneuver: Maneuver;
  voiceInstructions?: VoiceInstruction[];
  bannerInstructions?: BannerInstruction[];
}

interface Maneuver {
  type: string;
  instruction: string;
  bearing_after: number;
  bearing_before: number;
  location: [number, number]; // [longitude, latitude]
  modifier?: string;
}

interface Waypoint {
  name: string;
  location: [number, number]; // [longitude, latitude]
  distance?: number;
}
```

### Configuration Model

Environment configuration for the service:

```typescript
interface RoutingConfig {
  mapbox: {
    accessToken: string;
    baseUrl: string;
  };
  openrouteservice: {
    apiKey: string;
    baseUrl: string;
  };
  defaultProvider: string;
  requestTimeout: number; // milliseconds
  cacheEnabled: boolean;
  cacheTTL: number; // seconds
}
```

## Error Handling

### Error Response Format

All errors follow a consistent format:

```typescript
interface ErrorResponse {
  code: string;
  message: string;
  details?: any;
  provider?: string;
}
```

### Error Codes

- `400` - Invalid request (bad waypoints, invalid profile, etc.)
- `403` - Forbidden (feature requires paid plan)
- `404` - Provider not found
- `503` - Service unavailable (provider down or timeout)
- `500` - Internal server error

### Error Handling Strategy

1. **Validation Errors**: Return 400 with clear message about what's invalid
2. **Provider Errors**: Return 503 with provider name and error details
3. **Authentication Errors**: Return 403 with upgrade message if applicable
4. **Timeout Errors**: Return 503 after 5-second timeout per provider
5. **No Fallback**: Do not attempt alternative providers automatically

## Testing Strategy

### Unit Tests

- Provider implementations (mock external API calls)
- Response normalizer (test transformations)
- Provider registry (test selection logic)
- Request validation

### Integration Tests

- End-to-end route calculation with real providers (using test API keys)
- Error handling scenarios
- Provider availability checks

### Frontend Tests

- Route display on map
- Provider selection UI
- Error message display
- Loading states

### Test Data

- Use fixed coordinates for consistent testing
- Mock provider responses for unit tests
- Use test API keys for integration tests

## Implementation Phases

### Phase 1: MVP (Mapbox + Basic Frontend)

**Backend:**
1. Set up routing service structure
2. Implement base provider interface
3. Implement Mapbox provider (passthrough)
4. Implement `/api/routing/directions` endpoint
5. Implement basic health check
6. Add authentication middleware

**Frontend:**
7. Add "Get Directions" button to location search results
8. Implement route display on map (Mapbox GL JS layer)
9. Display route distance and duration
10. Handle loading and error states

### Phase 2: Multi-Provider (OpenRouteService)

**Backend:**
1. Implement OpenRouteService provider
2. Implement response normalizer for ORS
3. Implement provider registry
4. Implement `/api/routing/providers` endpoint
5. Add provider selection logic

**Frontend:**
6. Add provider selection UI
7. Add profile/bike type selection UI
8. Save user preferences
9. Display provider-specific errors

### Phase 3: Advanced Features

**Backend:**
1. Implement caching layer
2. Add multiple bike type support
3. Implement premium provider checks
4. Add detailed logging and metrics
5. Optimize performance

**Frontend:**
6. Add turn-by-turn instructions display
7. Add route alternatives
8. Improve error messaging
9. Add route sharing

### Phase 4: Multi-Modal

**Backend:**
1. Add multi-modal routing support
2. Implement mode transitions
3. Add public transport providers

**Frontend:**
4. Display multi-modal routes with mode indicators
5. Show mode transitions
6. Add mode preferences

## Configuration

### Environment Variables

```bash
# Mapbox
MAPBOX_ACCESS_TOKEN=pk.xxx
MAPBOX_BASE_URL=https://api.mapbox.com

# OpenRouteService
ORS_API_KEY=xxx
ORS_BASE_URL=https://api.openrouteservice.org

# Service
DEFAULT_PROVIDER=mapbox
REQUEST_TIMEOUT=5000
CACHE_ENABLED=true
CACHE_TTL=900

# Supabase (for auth)
SUPABASE_URL=xxx
SUPABASE_ANON_KEY=xxx
```

### Provider Configuration

Providers are configured in code with their capabilities:

```typescript
const providers = [
  new MapboxProvider(config.mapbox),
  new OpenRouteServiceProvider(config.openrouteservice),
  // Future providers...
];
```

## Security Considerations

1. **API Key Protection**: Store provider API keys in environment variables, never expose to clients
2. **Authentication**: Require Supabase auth for all routing requests
3. **Rate Limiting**: Implement rate limiting to prevent abuse
4. **Input Validation**: Validate all waypoints and parameters
5. **CORS**: Configure appropriate CORS headers for frontend access

## Performance Considerations

1. **Caching**: Cache identical route requests for 15 minutes
2. **Timeouts**: 5-second timeout per provider request
3. **Connection Pooling**: Reuse HTTP connections to providers
4. **Response Compression**: Enable gzip compression for responses
5. **Lazy Loading**: Load provider modules only when needed

## Monitoring and Observability

### Metrics

- Request count per provider
- Response time per provider
- Error rate per provider
- Cache hit rate
- Provider availability status

### Logging

- Log all route requests with provider, profile, and response time
- Log provider errors with full details
- Log cache hits/misses
- Log provider availability checks

### Health Checks

- `/health` endpoint returns overall service health
- Check each provider availability
- Report degraded status if any provider is down
- Report unhealthy if all providers are down

## Future Enhancements

1. **Route Alternatives**: Return multiple route options
2. **Real-time Traffic**: Integrate traffic data for better ETAs
3. **Offline Routing**: Cache routes for offline use
4. **Route Optimization**: Multi-waypoint optimization
5. **Custom Routing Profiles**: User-defined routing preferences
6. **Route History**: Save and replay past routes
7. **Social Features**: Share routes with other users
8. **Integration with Trip Recording**: Auto-start recording when following a route
