# Implementation Plan

- [x] 1. Fix coordinate conversion in useBikeshareStations hook
  - Update the coordinate mapping from [lat, lng] to [lng, lat] for proper GeoJSON format
  - Add coordinate validation to ensure values are within valid geographic ranges
  - Add error handling for stations with missing or invalid coordinate data
  - _Requirements: 1.7, 1.8, 5.1, 5.2, 5.3_

- [x] 2. Create MainMapView component structure
  - Create new MainMapView component file in appropriate directory
  - Set up basic Mapbox MapView with full screen styling
  - Implement component state management for station layer visibility
  - Add proper TypeScript interfaces for component state
  - _Requirements: 1.1, 1.4_

- [x] 3. Implement user location and camera setup
  - Add location permission request functionality
  - Implement camera centering on user location with fallback
  - Add Mapbox LocationPuck component for user position display
  - Handle location permission denied scenarios gracefully
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 4. Create StationToggleButton component
  - Design and implement floating action button component
  - Add station/bike icon for inactive state
  - Implement loading spinner state during data fetch
  - Add filled/active state when stations are visible
  - Position button in bottom-right corner with proper margins
  - _Requirements: 6.1, 6.3, 6.5_

- [x] 5. Integrate station data with toggle functionality
  - Connect useBikeshareStations hook to MainMapView component
  - Implement station layer toggle logic (show/hide stations)
  - Add conditional rendering of Mapbox ShapeSource based on toggle state
  - Handle loading states in toggle button during data fetch
  - _Requirements: 1.2, 1.3, 1.5, 6.1, 6.2_

- [ ] 6. Implement station pin rendering
  - Add pin icon asset to Mapbox Images component
  - Create Mapbox SymbolLayer for station pin display
  - Configure pin styling (size, anchor, overlap settings)
  - Ensure pins use the corrected coordinate format
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 7. Add station pin interaction and basic callouts
  - Implement onPress handler for station pins
  - Create basic StationCallout component with station name display
  - Add Mapbox MarkerView for callout positioning
  - Implement callout show/hide logic based on pin selection
  - Handle callout dismissal when tapping other pins or empty areas
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 8. Handle map region changes and data updates
  - Implement map region change event handling with 500ms debouncing
  - Update station data when user pans/zooms (only when layer is active)
  - Maintain existing pins during data refresh without showing loading state
  - Handle data fetch errors gracefully
  - _Requirements: 1.3, 1.6, 6.2, 6.4, 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 9. Enhance callouts with vehicle availability data
  - Update StationCallout component to display vehicle counts (classic bikes, electric bikes, available docks)
  - Add proper TypeScript interfaces for enhanced callout props
  - Implement graceful handling of missing vehicle data with "Data unavailable" fallbacks
  - Style callout with clear information hierarchy and proper spacing
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [x] 10. Implement availability-based visual indicators on pins
  - Update station data processing to calculate availability status
  - Implement color-coded pin styling based on bike/dock availability
  - Create visual indicators for different availability states (green=full, blue=classic-only, yellow=electric-only, red=empty, gray=no-docks)
  - Ensure indicators maintain accessibility and visibility at different zoom levels
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [ ] 11. Add error handling and edge cases
  - Implement error handling for failed station data requests
  - Add validation for required station data fields including vehicle counts
  - Handle network connectivity issues
  - Add logging for debugging coordinate conversion and data issues
  - _Requirements: 1.6, 5.3, 5.4_

- [ ]\* 12. Add comprehensive testing
  - Write unit tests for coordinate conversion accuracy
  - Test station toggle functionality and availability indicator logic
  - Test enhanced callout display with vehicle data
  - Test user location and camera positioning
  - Test map region change debouncing and data updates
  - Test error handling scenarios
  - _Requirements: All requirements validation_

- [ ]\* 13. Performance optimization and cleanup
  - Optimize re-renders with proper React keys and memoization
  - Implement cleanup for map event listeners
  - Add performance monitoring for large station datasets
  - Optimize availability status calculation for better performance
  - Consider pin clustering for high-density areas
  - _Requirements: Performance and scalability_
