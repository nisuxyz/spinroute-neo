/**
 * Base provider interface and types for routing providers
 */

export interface Coordinate {
  latitude: number;
  longitude: number;
}

/**
 * Profile category for grouping related profiles in the UI
 */
export enum ProfileCategory {
  CYCLING = 'cycling',
  WALKING = 'walking',
  DRIVING = 'driving',
  OTHER = 'other',
}

/**
 * Metadata for a provider-specific routing profile
 * Used for displaying profile options in the UI
 */
export interface ProfileMetadata {
  /** Provider-specific profile identifier (e.g., "cycling-road") */
  id: string;
  /** Human-readable display title (e.g., "Road Cycling") */
  title: string;
  /** Icon identifier for UI (e.g., "directions-bike") */
  icon: string;
  /** Grouping category for UI organization */
  category: ProfileCategory;
  /** Optional detailed description */
  description?: string;
}

export interface RouteRequest {
  waypoints: Coordinate[];
  /** Provider-specific profile identifier (e.g., "cycling-road", "driving-traffic") */
  profile?: string;
  provider?: string;
  userId?: string;
  userPlan?: 'free' | 'paid';
}

/**
 * Mapbox Directions API v5 response format
 * This is the standard format that all providers must return
 */
export interface MapboxDirectionsResponse {
  code: string; // 'Ok' or error code
  routes: Route[];
  waypoints: Waypoint[];
  uuid?: string;
}

export interface Route {
  distance: number; // meters
  duration: number; // seconds
  geometry: GeoJSON.LineString | string; // GeoJSON or polyline
  legs: RouteLeg[];
  weight: number;
  weight_name: string;
}

export interface RouteLeg {
  distance: number;
  duration: number;
  steps: RouteStep[];
  summary: string;
}

export interface RouteStep {
  distance: number;
  duration: number;
  geometry: GeoJSON.LineString | string;
  name: string;
  mode: string;
  maneuver: Maneuver;
  voiceInstructions?: VoiceInstruction[];
  bannerInstructions?: BannerInstruction[];
}

export interface Maneuver {
  type: string;
  instruction: string;
  bearing_after: number;
  bearing_before: number;
  location: [number, number]; // [longitude, latitude]
  modifier?: string;
}

export interface VoiceInstruction {
  distanceAlongGeometry: number;
  announcement: string;
  ssmlAnnouncement?: string;
}

export interface BannerInstruction {
  distanceAlongGeometry: number;
  primary: InstructionComponent;
  secondary?: InstructionComponent;
  sub?: InstructionComponent;
}

export interface InstructionComponent {
  text: string;
  type: string;
  modifier?: string;
}

export interface Waypoint {
  name: string;
  location: [number, number]; // [longitude, latitude]
  distance?: number;
}

/**
 * Base interface that all routing providers must implement
 */
export interface RouteProvider {
  name: string;
  displayName: string;
  /** Provider-specific profiles with metadata */
  profiles: ProfileMetadata[];
  /** Default profile ID for this provider */
  defaultProfile: string;

  /**
   * Calculate a route between waypoints
   * @param request Route calculation request
   * @returns Mapbox Directions API-compatible response
   */
  calculateRoute(request: RouteRequest): Promise<MapboxDirectionsResponse>;

  /**
   * Check if the provider is available and operational
   * @returns true if provider is available, false otherwise
   */
  isAvailable(): Promise<boolean>;
}
