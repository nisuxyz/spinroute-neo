# Requirements Document

## Introduction

This feature refactors the existing card-based UI components (RoutePreferencesCard, RouteInfoCard, StationCard, LocationCard) to use TrueSheet bottom sheets instead of custom modal/card implementations. The current implementation has scrolling issues with popup menus and inconsistent UX patterns. TrueSheet provides native bottom sheet behavior with proper scrolling support, Liquid Glass effects on iOS 26+, and a consistent interaction pattern across the app.

## Glossary

- **TrueSheet**: A React Native library (`@lodev09/react-native-true-sheet`) that provides native bottom sheet functionality with support for detents, scrolling, and iOS Liquid Glass effects
- **Detent**: A snap point for the bottom sheet height (e.g., 'auto', 0.5, 1 for collapsed, half-screen, full-screen)
- **Bottom Sheet**: A UI pattern where content slides up from the bottom of the screen, allowing users to interact with it while still seeing the underlying content
- **Collapsed State**: The minimized view of a card showing essential information
- **Expanded State**: The full view of a card showing all details and actions
- **Profile**: A routing configuration (e.g., "cycling-road", "foot-walking") that determines how routes are calculated

## Requirements

### Requirement 1

**User Story:** As a user, I want to select routing profiles from a scrollable list, so that I can access all available options regardless of how many profiles exist.

#### Acceptance Criteria

1. WHEN the Route Preferences sheet is presented THEN the System SHALL display all available routing profiles in a scrollable list grouped by category
2. WHEN the profile list exceeds the visible area THEN the System SHALL enable smooth scrolling within the sheet
3. WHEN a user selects a profile THEN the System SHALL update the selected profile and provide visual feedback
4. WHEN the user confirms their selection THEN the System SHALL dismiss the sheet and apply the routing preferences

### Requirement 2

**User Story:** As a user, I want consistent bottom sheet interactions across all card types, so that I can have a predictable and intuitive experience.

#### Acceptance Criteria

1. WHEN any card-type component is displayed THEN the System SHALL present it as a TrueSheet bottom sheet
2. WHEN a sheet is in collapsed state THEN the System SHALL display essential information with a compact layout
3. WHEN a user drags the sheet upward THEN the System SHALL expand to show full details
4. WHEN a user drags the sheet downward from collapsed state THEN the System SHALL dismiss the sheet
5. WHEN the sheet is expanded THEN the System SHALL allow scrolling for content that exceeds the visible area

### Requirement 3

**User Story:** As a user, I want the bottom sheets to have a modern glass effect on supported devices, so that the UI feels native and polished.

#### Acceptance Criteria

1. WHEN running on iOS 26+ THEN the System SHALL display sheets with Liquid Glass visual effect
2. WHEN running on older iOS versions or Android THEN the System SHALL display sheets with a blur effect fallback
3. WHEN the sheet is presented THEN the System SHALL apply consistent corner radius and styling

### Requirement 4

**User Story:** As a user, I want to view station details in an expandable bottom sheet, so that I can see availability information and get directions.

#### Acceptance Criteria

1. WHEN a station is selected on the map THEN the System SHALL present a StationSheet in collapsed state showing station name and bike availability
2. WHEN the StationSheet is expanded THEN the System SHALL display full station details including classic bikes, electric bikes, available docks, status, capacity, and last updated time
3. WHEN the user taps "Get Directions" THEN the System SHALL present the RoutePreferencesSheet for profile selection
4. WHEN the station data changes THEN the System SHALL update the displayed information in real-time

### Requirement 5

**User Story:** As a user, I want to view location details in an expandable bottom sheet, so that I can see address information and get directions.

#### Acceptance Criteria

1. WHEN a location is selected from search THEN the System SHALL present a LocationSheet in collapsed state showing location name and address
2. WHEN the LocationSheet is expanded THEN the System SHALL display full location details including coordinates and location type
3. WHEN the user taps "Get Directions" THEN the System SHALL present the RoutePreferencesSheet for profile selection

### Requirement 6

**User Story:** As a user, I want to view route information in an expandable bottom sheet, so that I can see turn-by-turn directions and route statistics.

#### Acceptance Criteria

1. WHEN a route is calculated THEN the System SHALL present a RouteInfoSheet in collapsed state showing distance, duration, and profile
2. WHEN the RouteInfoSheet is expanded THEN the System SHALL display turn-by-turn instructions in a scrollable list
3. WHEN the user taps the recalculate button THEN the System SHALL present the RoutePreferencesSheet for profile selection
4. WHEN the user taps close THEN the System SHALL dismiss the sheet and clear the route

### Requirement 7

**User Story:** As a developer, I want a reusable base sheet component, so that I can maintain consistent behavior across all sheet implementations.

#### Acceptance Criteria

1. WHEN creating a new sheet component THEN the Developer SHALL extend or compose from a BaseSheet component
2. WHEN the BaseSheet is configured THEN the System SHALL support customizable detents for collapsed and expanded states
3. WHEN the BaseSheet is used THEN the System SHALL handle presentation and dismissal through a consistent API
4. WHEN multiple sheets need to be shown THEN the System SHALL support named sheets for programmatic control via `TrueSheet.present('sheetName')`
