import { sql } from "drizzle-orm";
import { text, timestamp, boolean, uuid, jsonb, integer, pgSchema, index } from "drizzle-orm/pg-core";
import { geographyPointColumnType } from 'shared-utils';

export const bikeshareSchema = pgSchema("bikeshare");

export const bikeshareApiSource = bikeshareSchema.table("api_source", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`(now() AT TIME ZONE 'utc'::text)`).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`(now() AT TIME ZONE 'utc'::text)`).notNull(),
  name: text("name").notNull(),
  isGbfs: boolean("is_gbfs")
    .$defaultFn(() => !1)
    .notNull(),
  discoveryUrl: text("discovery_url").notNull(),
  active: boolean("active")
    .$defaultFn(() => !0)
    .notNull()
});

export const bikeshareNetwork = bikeshareSchema.table("network", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`(now() AT TIME ZONE 'utc'::text)`).notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true, mode: 'string' }).default(sql`(now() AT TIME ZONE 'utc'::text)`).notNull(),
  name: text().notNull(),
  company: text().notNull(),
  location: geographyPointColumnType("location").notNull(),
  city: text().notNull(),
  country: text().notNull(),
  stationStatusUrl: text("station_status_url").notNull(),
  stationInformationUrl: text("station_information_url").notNull(),
  vehicleStatusUrl: text("vehicle_status_url").notNull(),
  rawData: jsonb("raw_data").notNull()
});

export const bikeshareStation = bikeshareSchema.table("station", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`(now() AT TIME ZONE 'utc'::text)`).notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true, mode: 'string' }).default(sql`(now() AT TIME ZONE 'utc'::text)`).notNull(),
  networkId: uuid("network_id")
    .references(() => bikeshareNetwork.id, { onDelete: "cascade" })
    .notNull(),
  name: text().notNull(),
  location: geographyPointColumnType("location").notNull(),
  address: text().notNull(),
  capacity: integer("capacity").notNull(),
  numVehiclesAvailable: integer("num_vehicles_available").notNull(),
  numDocksAvailable: integer("num_docks_available").notNull(),
  isRenting: boolean("is_renting").notNull(),
  isReturning: boolean("is_returning").notNull(),
  lastReported: timestamp("last_reported", { withTimezone: true, mode: 'string' }).notNull(),
  vehicleTypesAvailable: jsonb("vehicle_types_available").notNull(),
  // e.g. {"ebike": 3, "classic_bike": 5}
  rawData: jsonb("raw_data").notNull()
}, (table) => [
  index("station_network_id_index").on(table.networkId),
  index("station_location_index").on(table.location)
]);

export const bikeshareVehicle = bikeshareSchema.table("vehicle", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`(now() AT TIME ZONE 'utc'::text)`).notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true, mode: 'string' }).default(sql`(now() AT TIME ZONE 'utc'::text)`).notNull(),
  networkId: uuid("network_id")
    .references(() => bikeshareNetwork.id, { onDelete: "cascade" })
    .notNull(),
  location: geographyPointColumnType("location").notNull(),
  vehicleType: text("vehicle_type"),
  isReserved: boolean("is_reserved"),
  isDisabled: boolean("is_disabled"),
  batteryLevel: integer("battery_level"),
  lastReported: timestamp("last_reported", { withTimezone: true, mode: 'string' }),
  pricingPlanId: text("pricing_plan_id"),
  rentalUris: jsonb("rental_uris"),
  // e.g. {"android": "uri", "ios": "uri", "web": "uri"}
  rawData: jsonb("raw_data").notNull()
}, (table) => [
  index("vehicle_network_id_index").on(table.networkId),
  index("vehicle_location_index").on(table.location),
  index("vehicle_type_index").on(table.vehicleType)
]);