# Design Document

## Overview

The station map pins feature integrates React Native Mapbox with the existing bikeshare station data service to display interactive station markers. The design builds upon the existing `useBikeshareStations` hook and follows the established pattern from the Mapbox custom callout example, while addressing critical coordinate format conversion issues.

## Architecture

### Component Hierarchy
```
MainMapView (new)
├── Mapbox.MapView
│   ├── Mapbox.Camera (centered on user location)
│   ├── Mapbox.LocationPuck (user location display)
│   ├── Mapbox.Images (pin assets)
│   ├── Mapbox.ShapeSource (station data - conditionally rendered)
│   │   └── Mapbox.SymbolLayer (station pin rendering)
│   └── Mapbox.MarkerView (callout positioning - when station selected)
│       └── StationCallout (custom callout component)
│   // Future: Additional ShapeSource/Layers for other map features
├── StationToggleButton (floating action button)
```

### Data Flow
```
useBikeshareStations hook → coordinate conversion → GeoJSON FeatureCollection → Mapbox ShapeSource → rendered pins
```

## Components and Interfaces

### MainMapView Component

**Purpose**: Root map component that serves as the main container for all map-based features including station pins, with potential for future map layers and interactions.

**Props Interface**:
```typescript
// No props - this is a root view component
interface MainMapViewProps {}
```

**Key Responsibilities**:
- Initialize Mapbox map with camera centered on user location
- Display user location puck on the map
- Manage station layer visibility toggle state
- Integrate with `useBikeshareStations` hook when stations are enabled
- Handle station pin tap interactions when layer is active
- Manage station callout visibility state with enhanced vehicle data
- Handle map region changes for dynamic station data updates with debouncing
- Implement availability-based visual indicators on station pins
- Provide foundation for future map features (routes, user location, etc.)
- Fill the entire screen as the primary map interface

### StationCallout Component

**Purpose**: Custom callout component that displays comprehensive station information including vehicle availability when a pin is selected.

**Props Interface**:
```typescript
interface StationCalloutProps {
  stationName: string;
  classicBikes?: number;
  electricBikes?: number;
  availableDocks?: number;
  onClose?: () => void;
}
```

**Design**: 
- White background with rounded corners and subtle shadow
- Black text for contrast with clear information hierarchy
- Minimum 16pt font size for accessibility
- Structured layout with station name as header
- Vehicle counts displayed with clear labels and icons
- Graceful handling of missing data with "Data unavailable" fallbacks
- Responsive sizing to accommodate variable content length

### StationToggleButton Component

**Purpose**: Floating action button that allows users to toggle the station layer on/off and shows loading state during data fetching.

**Props Interface**:
```typescript
interface StationToggleButtonProps {
  isStationsVisible: boolean;
  isLoading: boolean;
  onToggle: () => void;
}
```

**Design**:
- Circular floating action button positioned in bottom-right corner
- Station/bike icon when layer is off
- Filled/highlighted state when layer is on
- Loading spinner replaces icon when fetching data
- Subtle shadow for depth
- Accessible touch target (minimum 44pt)
- Smooth animation transitions between states

### Enhanced useBikeshareStations Hook

**Current Issue**: The existing hook maps coordinates as `[station.lat, station.lng]` but GeoJSON requires `[longitude, latitude]` format.

**Solution**: Update the coordinate mapping in the feature creation:

```typescript
// Current (incorrect):
coordinates: [station.lat, station.lng]

// Fixed (correct GeoJSON format):
coordinates: [station.lng, station.lat]
```

**Additional Enhancements**:
- Add coordinate validation
- Add error handling for missing coordinate data
- Preserve existing interface for backward compatibility

## Data Models

### Station Feature Type
```typescript
interface StationFeature extends GeoJSON.Feature<GeoJSON.Point> {
  id: string;
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  properties: {
    message: string;        // station name
    icon: string;          // 'pin'
    id: string;            // station id
    classicBikes?: number; // available classic bikes
    electricBikes?: number; // available electric bikes
    availableDocks?: number; // available docking spaces
    availabilityStatus: 'full' | 'mixed' | 'classic-only' | 'electric-only' | 'empty' | 'no-docks';
  };
}
```

### Station Data Type (from database)
```typescript
interface StationData {
  id: string;
  name: string;
  lat: number;           // latitude
  lng: number;           // longitude
  classicBikes?: number; // available classic bikes
  electricBikes?: number; // available electric bikes
  availableDocks?: number; // available docking spaces
  // other station properties...
}
```

### Availability Status Logic
```typescript
type AvailabilityStatus = 
  | 'full'          // Both classic and electric bikes available
  | 'mixed'         // Some bikes and some docks available
  | 'classic-only'  // Only classic bikes available
  | 'electric-only' // Only electric bikes available
  | 'empty'         // No bikes, but docks available
  | 'no-docks';     // Station full, no available docks
```

## Error Handling

### Coordinate Validation
- Validate longitude range: -180 to 180
- Validate latitude range: -90 to 90
- Log and skip invalid coordinates
- Maintain partial functionality with valid stations

### Asset Management
- Check for pin icon in `assets/images/pin.png`
- Fallback to default Mapbox marker if asset missing
- Log asset loading errors

### Data Loading States
- Station layer starts disabled (no pins visible)
- Show loading spinner in toggle button when user enables stations
- Display pins immediately when data loads successfully
- On subsequent map movements, update pins without showing loading state
- Handle network errors gracefully by keeping button in previous state
- Maintain last known good station data on failures
- Auto-retry failed requests with exponential backoff

## Testing Strategy

### Unit Tests
- Coordinate conversion accuracy
- GeoJSON format validation
- Error handling for invalid data
- Component prop validation

### Integration Tests
- Map rendering with station data
- Pin tap interactions
- Callout display and positioning
- Data refresh on map movement

### Manual Testing
- Visual verification of pin positions
- Touch interaction responsiveness
- Callout readability and positioning
- Performance with large datasets

## Implementation Notes

### Mapbox Integration
- Use existing Mapbox setup patterns from the codebase
- Follow the custom callout example structure
- Implement proper cleanup for map event listeners
- Design for extensibility to support additional map layers

### Performance Considerations
- Debounce map region change events with 500ms delay to prevent excessive API calls
- Limit maximum number of displayed pins for performance (consider viewport-based filtering)
- Optimize re-renders with proper React keys and memoization
- Cache station data to avoid unnecessary re-fetches for recently viewed areas
- Consider clustering for high-density station areas (future enhancement)
- Implement efficient availability status calculation to minimize processing overhead

### Root View Design
- Component fills entire screen (flex: 1)
- No external props to maintain simplicity
- Self-contained state management for map interactions
- Default camera position suitable for typical use cases

### Accessibility
- Ensure pins are large enough for touch targets (minimum 44pt)
- Use semantic labels for screen readers
- Maintain sufficient color contrast in callouts

## Dependencies

### Required Packages
- `@rnmapbox/maps` (already in use)
- `@turf/helpers` (for GeoJSON utilities)
- `use-debounce` (already in use)

### Assets Required
- Base pin icon: `frontend-expo/assets/images/pin.png`
- Alternative: Use existing dock-pin.png or create new asset
- Availability indicator assets or programmatic color overlays for different states
#
## User Location Integration

**Location Services**:
- Request location permissions on component mount
- Handle permission denied gracefully with fallback location
- Use device GPS for initial camera positioning
- Display user location puck with appropriate styling

**Camera Behavior**:
- Initial camera centers on user location with appropriate zoom level
- Fallback to default location (e.g., city center) if location unavailable
- Smooth animation to user location when permission granted
- User can manually pan/zoom after initial positioning

**Privacy Considerations**:
- Request location permission with clear explanation
- Graceful degradation when location services disabled
- No persistent storage of location data

## Availability Indicators Design

**Visual Design Strategy**:
- Use color-coded indicators overlaid on or integrated with the base pin design
- Maintain accessibility with sufficient color contrast and alternative indicators
- Ensure indicators are visible at various zoom levels

**Color Scheme**:
- Green: Full availability (both classic and electric bikes)
- Blue: Classic bikes only available
- Yellow: Electric bikes only available  
- Red: No bikes available (empty station with docks)
- Gray: Station full (no available docks)

**Implementation Options**:
1. **Programmatic Overlays**: Use Mapbox expression-based styling to dynamically color pins
2. **Multiple Pin Assets**: Create separate pin images for each availability state
3. **Badge System**: Add small colored badges to the base pin icon

## Dynamic Map Updates

**Update Triggers**:
- Map pan/zoom events with debounced handling (500ms delay)
- Station layer toggle activation
- Periodic refresh for real-time data accuracy (optional future enhancement)

**Data Management**:
- Maintain current map bounds state for efficient API queries
- Cache recently fetched station data to reduce redundant requests
- Implement smart diffing to update only changed stations

**User Experience**:
- Smooth transitions when stations appear/disappear during map movement
- Maintain selected callout state during minor map adjustments
- Clear loading indicators only for initial station layer activation