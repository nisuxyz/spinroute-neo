/**
 * Response normalizer
 * Transforms provider-specific responses to Mapbox Directions API format
 */

import type {
  MapboxDirectionsResponse,
  Route,
  RouteLeg,
  RouteStep,
  Maneuver,
  Waypoint,
  Coordinate,
} from './base';
import type { ORSDirectionsResponse, ORSRoute, ORSSegment, ORSStep } from './ors-client';
import polyline from '@mapbox/polyline';

/**
 * Normalize OpenRouteService response to Mapbox Directions API format
 */
export function normalizeORSResponse(
  orsResponse: ORSDirectionsResponse,
  waypoints: Coordinate[],
): MapboxDirectionsResponse {
  const routes: Route[] = orsResponse.routes.map((orsRoute) =>
    normalizeORSRoute(orsRoute, waypoints),
  );

  const waypointObjects: Waypoint[] = waypoints.map((wp, index) => ({
    name:
      index === 0 ? 'Origin' : index === waypoints.length - 1 ? 'Destination' : `Waypoint ${index}`,
    location: [wp.longitude, wp.latitude],
  }));

  return {
    code: 'Ok',
    routes,
    waypoints: waypointObjects,
  };
}

/**
 * Normalize a single ORS route to Mapbox format
 */
function normalizeORSRoute(orsRoute: ORSRoute, waypoints: Coordinate[]): Route {
  // Parse geometry
  let geometry: GeoJSON.LineString;

  if (typeof orsRoute.geometry === 'string') {
    // Encoded polyline - decode it
    const coordinates = polyline.decode(orsRoute.geometry);
    geometry = {
      type: 'LineString',
      coordinates: coordinates.map(([lat, lon]) => [lon, lat]), // Convert [lat, lon] to [lon, lat]
    };
  } else if (orsRoute.geometry && typeof orsRoute.geometry === 'object') {
    // Already GeoJSON
    geometry = orsRoute.geometry as GeoJSON.LineString;
  } else {
    // No geometry provided - create a simple line between waypoints
    geometry = {
      type: 'LineString',
      coordinates: waypoints.map((wp) => [wp.longitude, wp.latitude]),
    };
  }

  // Convert segments to legs
  const legs: RouteLeg[] = (orsRoute.segments || []).map((segment) =>
    normalizeORSSegment(segment, geometry),
  );

  // If no segments, create a single leg
  if (legs.length === 0) {
    legs.push({
      distance: orsRoute.summary.distance,
      duration: orsRoute.summary.duration,
      steps: [],
      summary: 'Route',
    });
  }

  return {
    distance: orsRoute.summary.distance,
    duration: orsRoute.summary.duration,
    geometry,
    legs,
    weight: orsRoute.summary.duration, // Use duration as weight
    weight_name: 'duration',
  };
}

/**
 * Normalize an ORS segment to Mapbox leg format
 */
function normalizeORSSegment(orsSegment: ORSSegment, routeGeometry: GeoJSON.LineString): RouteLeg {
  const steps: RouteStep[] = (orsSegment.steps || []).map((step) =>
    normalizeORSStep(step, routeGeometry),
  );

  return {
    distance: orsSegment.distance,
    duration: orsSegment.duration,
    steps,
    summary:
      steps
        .map((s) => s.name)
        .filter(Boolean)
        .join(', ') || 'Route segment',
  };
}

/**
 * Normalize an ORS step to Mapbox step format
 */
function normalizeORSStep(orsStep: ORSStep, routeGeometry: GeoJSON.LineString): RouteStep {
  // Extract geometry for this step based on way_points indices
  let stepGeometry: GeoJSON.LineString;

  if (orsStep.way_points && orsStep.way_points.length >= 2) {
    const startIdx = orsStep.way_points[0]!;
    const endIdx = orsStep.way_points[1]!;
    stepGeometry = {
      type: 'LineString',
      coordinates: routeGeometry.coordinates.slice(startIdx, endIdx + 1),
    };
  } else {
    // Fallback to empty geometry
    stepGeometry = {
      type: 'LineString',
      coordinates: [],
    };
  }

  // Get the location for the maneuver (start of the step)
  const location: [number, number] =
    stepGeometry.coordinates.length > 0
      ? (stepGeometry.coordinates[0] as [number, number])
      : [0, 0];

  // Calculate bearings
  const bearing_before = calculateBearing(stepGeometry.coordinates, 0, true);
  const bearing_after = calculateBearing(stepGeometry.coordinates, 0, false);

  // Map ORS instruction type to Mapbox maneuver
  const maneuver = normalizeORSManeuver(
    orsStep.type,
    orsStep.instruction,
    location,
    bearing_before,
    bearing_after,
    orsStep.exit_number,
  );

  return {
    distance: orsStep.distance,
    duration: orsStep.duration,
    geometry: stepGeometry,
    name: orsStep.name || '',
    mode: orsStep.mode || 'cycling',
    maneuver,
  };
}

/**
 * Map ORS instruction type to Mapbox maneuver format
 */
function normalizeORSManeuver(
  orsType: number,
  instruction: string,
  location: [number, number],
  bearing_before: number,
  bearing_after: number,
  exit_number?: number,
): Maneuver {
  // Map ORS instruction types to Mapbox maneuver types
  // ORS types: 0=Left, 1=Right, 2=Sharp left, 3=Sharp right, 4=Slight left, 5=Slight right,
  // 6=Straight, 7=Enter roundabout, 8=Exit roundabout, 9=U-turn, 10=Goal, 11=Depart, 12=Keep left, 13=Keep right

  let type: string;
  let modifier: string | undefined;

  switch (orsType) {
    case 0: // Left
      type = 'turn';
      modifier = 'left';
      break;
    case 1: // Right
      type = 'turn';
      modifier = 'right';
      break;
    case 2: // Sharp left
      type = 'turn';
      modifier = 'sharp left';
      break;
    case 3: // Sharp right
      type = 'turn';
      modifier = 'sharp right';
      break;
    case 4: // Slight left
      type = 'turn';
      modifier = 'slight left';
      break;
    case 5: // Slight right
      type = 'turn';
      modifier = 'slight right';
      break;
    case 6: // Straight
      type = 'continue';
      modifier = 'straight';
      break;
    case 7: // Enter roundabout
      type = 'roundabout';
      modifier = undefined;
      break;
    case 8: // Exit roundabout
      type = 'exit roundabout';
      modifier = exit_number ? `exit ${exit_number}` : undefined;
      break;
    case 9: // U-turn
      type = 'turn';
      modifier = 'uturn';
      break;
    case 10: // Goal
      type = 'arrive';
      modifier = undefined;
      break;
    case 11: // Depart
      type = 'depart';
      modifier = undefined;
      break;
    case 12: // Keep left
      type = 'fork';
      modifier = 'left';
      break;
    case 13: // Keep right
      type = 'fork';
      modifier = 'right';
      break;
    default:
      type = 'turn';
      modifier = undefined;
  }

  return {
    type,
    instruction,
    bearing_after,
    bearing_before,
    location,
    modifier,
  };
}

/**
 * Calculate bearing from a coordinate array
 * @param coordinates Array of [lon, lat] coordinates
 * @param index Index of the point to calculate bearing from
 * @param before If true, calculate bearing to previous point; if false, to next point
 * @returns Bearing in degrees (0-360)
 */
function calculateBearing(coordinates: number[][], index: number, before: boolean): number {
  if (coordinates.length < 2) {
    return 0;
  }

  let point1: number[];
  let point2: number[];

  if (before) {
    // Bearing from previous point to current point
    if (index === 0) {
      return 0;
    }
    point1 = coordinates[index - 1]!;
    point2 = coordinates[index]!;
  } else {
    // Bearing from current point to next point
    if (index >= coordinates.length - 1) {
      return 0;
    }
    point1 = coordinates[index]!;
    point2 = coordinates[index + 1]!;
  }

  const lon1 = (point1[0]! * Math.PI) / 180;
  const lat1 = (point1[1]! * Math.PI) / 180;
  const lon2 = (point2[0]! * Math.PI) / 180;
  const lat2 = (point2[1]! * Math.PI) / 180;

  const dLon = lon2 - lon1;

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  let bearing = (Math.atan2(y, x) * 180) / Math.PI;

  // Normalize to 0-360
  bearing = (bearing + 360) % 360;

  return Math.round(bearing);
}
