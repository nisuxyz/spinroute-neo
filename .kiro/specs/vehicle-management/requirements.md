# Requirements Document

## Introduction

The Vehicle Management System enables users to track their bikes and bike parts, including mileage, maintenance history, and ownership transfers. The system supports swapping parts between bikes and transferring bikes between users, providing comprehensive lifecycle management for cycling equipment.

## Glossary

- **Vehicle_Service**: The microservice responsible for managing bikes, parts, and maintenance records
- **Bike**: A bicycle entity owned by a user with tracked kilometrage and maintenance history
- **Part**: A bicycle component (e.g., chain, tires, brake pads) with individual kilometrage tracking
- **User**: An authenticated person who owns bikes and parts
- **Kilometrage**: Distance traveled stored in kilometers (API supports conversion to/from miles)
- **Maintenance_Record**: A logged service or repair event for a bike or part
- **Part_Installation**: The association of a part to a specific bike with installation date
- **Ownership_Transfer**: The process of reassigning a bike or part to a different user

## Requirements

### Requirement 1

**User Story:** As a cyclist, I want to register my bikes in the system, so that I can track their usage and maintenance history

#### Acceptance Criteria

1. WHEN a user submits bike registration data, THE Vehicle_Service SHALL create a new bike record with user ownership
2. THE Vehicle_Service SHALL store bike attributes including name, type, brand, model, and purchase date
3. THE Vehicle_Service SHALL initialize bike kilometrage to zero or a user-specified starting value (stored in kilometers)
4. THE Vehicle_Service SHALL assign a unique identifier to each bike upon creation
5. WHEN a user requests their bikes, THE Vehicle_Service SHALL return all bikes owned by that user

### Requirement 2

**User Story:** As a cyclist, I want to register bike parts with kilometrage tracking, so that I know when components need replacement

#### Acceptance Criteria

1. WHEN a user submits part registration data, THE Vehicle_Service SHALL create a new part record with user ownership
2. THE Vehicle_Service SHALL store part attributes including name, type, brand, model, and purchase date
3. THE Vehicle_Service SHALL initialize part kilometrage to zero or a user-specified starting value (stored in kilometers)
4. THE Vehicle_Service SHALL support part types including chain, tires, brake_pads, cassette, and custom types
5. WHEN a user requests their parts, THE Vehicle_Service SHALL return all parts owned by that user

### Requirement 3

**User Story:** As a cyclist, I want to install parts on my bikes, so that the system tracks which components are currently on each bike

#### Acceptance Criteria

1. WHEN a user installs a part on a bike, THE Vehicle_Service SHALL create a part installation record with installation date
2. THE Vehicle_Service SHALL verify that both the part and bike are owned by the requesting user
3. WHEN a part is installed on a bike, THE Vehicle_Service SHALL mark any previous installation of that part as removed
4. THE Vehicle_Service SHALL allow querying which parts are currently installed on a specific bike
5. THE Vehicle_Service SHALL allow querying which bike a specific part is currently installed on

### Requirement 4

**User Story:** As a cyclist, I want to log distance for my bikes, so that the system automatically updates kilometrage for all installed parts

#### Acceptance Criteria

1. WHEN a user logs distance for a bike, THE Vehicle_Service SHALL increment the bike total kilometrage by the logged amount (stored in kilometers)
2. WHEN bike distance is logged, THE Vehicle_Service SHALL increment kilometrage for all parts currently installed on that bike
3. THE Vehicle_Service SHALL record the timestamp of each distance entry
4. THE Vehicle_Service SHALL prevent negative distance values
5. THE Vehicle_Service SHALL return updated kilometrage totals after logging

### Requirement 5

**User Story:** As a cyclist, I want to select one of my bikes as my active bike, so that trip recordings automatically increment kilometrage for that bike and its installed parts

#### Acceptance Criteria

1. WHEN a user selects a bike as active, THE Vehicle_Service SHALL mark that bike as the user's active bike
2. THE Vehicle_Service SHALL ensure only one bike per user is marked as active at any time
3. WHEN a user selects a different bike as active, THE Vehicle_Service SHALL deactivate the previously active bike
4. WHEN a user requests their active bike, THE Vehicle_Service SHALL return the currently active bike with all installed parts
5. THE Vehicle_Service SHALL allow users to deactivate their active bike without selecting a replacement

### Requirement 6

**User Story:** As a cyclist, I want to record maintenance events for bikes and parts, so that I have a complete service history

#### Acceptance Criteria

1. WHEN a user submits a maintenance record, THE Vehicle_Service SHALL store the event with description, date, and cost
2. THE Vehicle_Service SHALL associate maintenance records with either a bike or a part
3. THE Vehicle_Service SHALL allow attaching maintenance type categories including repair, replacement, adjustment, and cleaning
4. WHEN a user requests maintenance history, THE Vehicle_Service SHALL return all records for the specified bike or part
5. THE Vehicle_Service SHALL order maintenance records by date in descending order

### Requirement 7

**User Story:** As a cyclist, I want to transfer parts between my bikes, so that I can reuse components when upgrading or changing bikes

#### Acceptance Criteria

1. WHEN a user removes a part from a bike, THE Vehicle_Service SHALL mark the current installation as removed with removal date
2. WHEN a user installs a previously used part on a different bike, THE Vehicle_Service SHALL create a new installation record
3. THE Vehicle_Service SHALL preserve part kilometrage across bike transfers
4. THE Vehicle_Service SHALL maintain installation history showing all bikes a part has been installed on
5. THE Vehicle_Service SHALL verify user ownership of both bikes during part transfers

### Requirement 8

**User Story:** As a cyclist, I want to transfer ownership of bikes to other users, so that I can sell or gift my equipment

#### Acceptance Criteria

1. WHEN a user initiates a bike transfer, THE Vehicle_Service SHALL verify the user owns the bike
2. WHEN a bike transfer is completed, THE Vehicle_Service SHALL update the bike owner to the new user
3. WHEN a bike is transferred, THE Vehicle_Service SHALL transfer all parts currently installed on that bike to the new owner
4. THE Vehicle_Service SHALL record the transfer date and previous owner in the bike history
5. THE Vehicle_Service SHALL prevent access to the bike by the previous owner after transfer

### Requirement 9

**User Story:** As a cyclist, I want to transfer ownership of parts to other users, so that I can sell or gift individual components

#### Acceptance Criteria

1. WHEN a user initiates a part transfer, THE Vehicle_Service SHALL verify the user owns the part
2. IF the part is currently installed on a bike, THEN THE Vehicle_Service SHALL remove it from the bike before transfer
3. WHEN a part transfer is completed, THE Vehicle_Service SHALL update the part owner to the new user
4. THE Vehicle_Service SHALL record the transfer date and previous owner in the part history
5. THE Vehicle_Service SHALL prevent access to the part by the previous owner after transfer

### Requirement 10

**User Story:** As a cyclist, I want to view distance statistics for my bikes and parts, so that I can make informed maintenance decisions

#### Acceptance Criteria

1. WHEN a user requests bike statistics, THE Vehicle_Service SHALL return total kilometrage and distance since last maintenance (with unit conversion support)
2. WHEN a user requests part statistics, THE Vehicle_Service SHALL return total kilometrage and recommended replacement threshold (with unit conversion support)
3. THE Vehicle_Service SHALL calculate time-based metrics including days since purchase and days since last maintenance
4. THE Vehicle_Service SHALL identify parts approaching replacement thresholds based on kilometrage
5. THE Vehicle_Service SHALL return statistics in a structured format with all relevant metrics

### Requirement 11

**User Story:** As a system administrator, I want the service to validate all data inputs, so that data integrity is maintained

#### Acceptance Criteria

1. THE Vehicle_Service SHALL reject requests with missing required fields
2. THE Vehicle_Service SHALL validate that distance values are non-negative numbers
3. THE Vehicle_Service SHALL validate that dates are in valid ISO 8601 format
4. THE Vehicle_Service SHALL return descriptive error messages for validation failures
5. THE Vehicle_Service SHALL verify user authentication tokens before processing any request
