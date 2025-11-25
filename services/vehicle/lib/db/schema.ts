/**
 * Database Schema Documentation
 *
 * This file documents the database schema for the vehicle service.
 * The actual schema is managed via Supabase migrations in the supabase/migrations/ directory.
 *
 * Schema: fleet
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
