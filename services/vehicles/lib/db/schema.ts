/**
 * Database Schema Documentation
 *
 * This file documents the database schema for the vehicle service.
 * The actual schema is managed via Supabase migrations in the supabase/migrations/ directory.
 *
 * Schema: vehicles (user-owned bikes and parts)
 *
 * Tables:
 *
 * 1. vehicles.user_bike
 *    - id: uuid (primary key)
 *    - created_at: timestamptz
 *    - updated_at: timestamptz
 *    - user_id: uuid (not null, references auth.users)
 *    - name: text (not null)
 *    - type: bike_type enum (road, mountain, hybrid, gravel, ebike, other)
 *    - brand: text
 *    - model: text
 *    - purchase_date: date
 *    - total_kilometrage: numeric (default 0) - Total distance in kilometers
 *    - metadata: jsonb (color, weight, etc.)
 *
 *    Indexes:
 *    - user_bike_user_id_index on user_id
 *    - user_bike_type_index on type
 *
 *    Note: Active bike is tracked in public.user_settings.active_bike_id
 *
 * 2. vehicles.user_part
 *    - id: uuid (primary key)
 *    - created_at: timestamptz
 *    - updated_at: timestamptz
 *    - user_id: uuid (not null, references auth.users)
 *    - name: text (not null)
 *    - type: part_type enum (chain, tires, brake_pads, cassette, etc.)
 *    - brand: text
 *    - model: text
 *    - purchase_date: date
 *    - total_kilometrage: numeric (default 0) - Total distance in kilometers
 *    - metadata: jsonb (size, weight, replacement_threshold_km, etc.)
 *
 *    Indexes:
 *    - user_part_user_id_index on user_id
 *    - user_part_type_index on type
 *
 * 3. vehicles.part_installation
 *    - id: uuid (primary key)
 *    - created_at: timestamptz
 *    - part_id: uuid (references vehicles.user_part)
 *    - bike_id: uuid (references vehicles.user_bike)
 *    - installed_at: timestamptz
 *    - removed_at: timestamptz (nullable)
 *
 *    Indexes:
 *    - part_installation_part_id_index on part_id
 *    - part_installation_bike_id_index on bike_id
 *    - part_installation_removed_at_index on removed_at
 *
 *    Unique constraint: (part_id, removed_at IS NULL)
 *
 * 4. vehicles.kilometrage_log
 *    - id: uuid (primary key)
 *    - created_at: timestamptz
 *    - bike_id: uuid (references vehicles.user_bike)
 *    - user_id: uuid (references auth.users)
 *    - distance: numeric - Distance in kilometers
 *    - logged_at: timestamptz
 *    - notes: text
 *
 *    Indexes:
 *    - kilometrage_log_bike_id_index on bike_id
 *    - kilometrage_log_user_id_index on user_id
 *    - kilometrage_log_logged_at_index on logged_at
 *
 * 5. vehicles.maintenance_record
 *    - id: uuid (primary key)
 *    - created_at: timestamptz
 *    - updated_at: timestamptz
 *    - user_id: uuid (references auth.users)
 *    - bike_id: uuid (references vehicles.user_bike, nullable)
 *    - part_id: uuid (references vehicles.user_part, nullable)
 *    - maintenance_type: maintenance_type enum
 *    - description: text
 *    - performed_at: timestamptz
 *    - cost: numeric
 *    - metadata: jsonb
 *
 *    Check constraint: bike_id IS NOT NULL OR part_id IS NOT NULL
 *
 * 6. vehicles.ownership_history
 *    - id: uuid (primary key)
 *    - created_at: timestamptz
 *    - entity_type: entity_type enum (bike, part)
 *    - entity_id: uuid
 *    - previous_owner_id: uuid (references auth.users)
 *    - new_owner_id: uuid (references auth.users)
 *    - transferred_at: timestamptz
 *    - notes: text
 *
 * Note: All distance values stored in kilometers. API supports both km and miles via unit parameter.
 *
 * Schema: fleet (shared bikeshare vehicles - separate from user bikes)
 *
 * Tables:
 *
 * 1. fleet.vehicle
 *    - id: uuid (primary key)
 *    - created_at: timestamptz
 *    - updated_at: timestamptz
 *    - user_id: uuid (not null)
 *    - name: text (not null)
 *    - type: vehicle_type enum (default: 'bike')
 *    - brand: text
 *    - model: text
 *    - year: text
 *    - metadata: jsonb (color, weight, max_speed, range, tire_size, motor_power, battery_capacity, etc.)
 *
 *    Indexes:
 *    - vehicle_user_id_index on user_id
 *    - vehicle_type_index on type
 *
 * 2. fleet.component
 *    - id: uuid (primary key)
 *    - created_at: timestamptz
 *    - updated_at: timestamptz
 *    - vehicle_id: uuid (references fleet.vehicle.id, on delete set null)
 *    - name: text (not null)
 *    - type: component_type enum
 *    - position: component_position enum
 *    - brand: text
 *    - model: text
 *    - serial_number: text
 *    - metadata: jsonb
 *
 *    Indexes:
 *    - component_vehicle_id_index on vehicle_id
 *    - component_type_index on type
 *    - component_position_index on position
 *
 * Enums:
 *
 * - vehicle_type: 'bike', 'ebike', 'scooter', 'mo'
 *
 * - component_type: 'chain', 'cassette', 'saddle', 'tire', 'brake_pad', 'brake_rotor',
 *   'brake_lever', 'brake_caliper', 'derailleur', 'shifter', 'crankset', 'bottom_bracket',
 *   'hub', 'rim', 'spoke', 'handlebar', 'stem', 'seatpost', 'fork', 'frame', 'motor',
 *   'battery', 'display', 'throttle', 'light', 'fender', 'rack'
 *
 * - component_position: 'front', 'rear', 'left', 'right', 'top', 'bottom', 'center'
 */

export {};
