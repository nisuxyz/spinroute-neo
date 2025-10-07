import { sql } from "drizzle-orm";
import {
  text,
  timestamp,
  uuid,
  jsonb,
  pgSchema,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";

export const fleetSchema = pgSchema("fleet");

export const fleetVehicleType = pgEnum("vehicle_type", [
  "bike",
  "ebike",
  "scooter",
  "mo",
]);

export const fleetVehicle = fleetSchema.table(
  "vehicle",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .default(sql`(now() AT TIME ZONE 'utc'::text)`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .default(sql`(now() AT TIME ZONE 'utc'::text)`)
      .notNull(),
    userId: uuid("user_id").notNull(),
    name: text("name").notNull(),
    type: fleetVehicleType().default("bike").notNull(),
    brand: text("brand"),
    model: text("model"),
    year: text("year"),
    // color, weight, max_speed, range, tire_size, motor_power, battery_capacity etc.
    metadata: jsonb("metadata").notNull(),
  },
  (table) => [
    index("vehicle_user_id_index").on(table.userId),
    index("vehicle_type_index").on(table.type),
  ]
);

export const fleetComponentType = pgEnum("component_type", [
  "chain",
  "cassette",
  "saddle",
  "tire",
  "brake_pad",
  "brake_rotor",
  "brake_lever",
  "brake_caliper",
  "derailleur",
  "shifter",
  "crankset",
  "bottom_bracket",
  "hub",
  "rim",
  "spoke",
  "handlebar",
  "stem",
  "seatpost",
  "fork",
  "frame",
  "motor",
  "battery",
  "display",
  "throttle",
  "light",
  "fender",
  "rack",
]);

export const fleetComponentPosition = pgEnum("component_position", [
  "front",
  "rear",
  "left",
  "right",
  "top",
  "bottom",
  "center",
]);

export const fleetComponent = fleetSchema.table(
  "component",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .default(sql`(now() AT TIME ZONE 'utc'::text)`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .default(sql`(now() AT TIME ZONE 'utc'::text)`)
      .notNull(),
    vehicleId: uuid("vehicle_id").references(() => fleetVehicle.id, { onDelete: 'set null' }),
    name: text("name").notNull(),
    type: fleetComponentType(),
    position: fleetComponentPosition(),
    brand: text("brand"),
    model: text("model"),
    serialNumber: text("serial_number"),
    metadata: jsonb("metadata").notNull(),
  },
  (table) => [
    index("component_vehicle_id_index").on(table.vehicleId),
    index("component_type_index").on(table.type),
    index("component_position_index").on(table.position),
  ]
);
