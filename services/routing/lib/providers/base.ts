/**
 * Base provider interface and types for routing providers
 */

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export enum RouteProfile {
  WALKING = 'walking',
  CYCLING = 'cycling',
  DRIVING = 'driving',
  PUBLIC_TRANSPORT = 'public-transport',
}

export enum BikeType {
  ROAD = 'road',
  MOUNTAIN = 'mountain',
  EBIKE = 'ebike',
  GENERIC = 'generic',
}

export interface ProviderCapabilities {
  profiles: RouteProfile[];
  bikeTypes?: BikeType[];
  multiModal: boolean;
  requiresPaidPlan: boolean;
}

export interface RouteRequest {
  waypoints: Coordinate[];
  profile: RouteProfile;
  bikeType?: BikeType;
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
  capabilities: ProviderCapabilities;

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
