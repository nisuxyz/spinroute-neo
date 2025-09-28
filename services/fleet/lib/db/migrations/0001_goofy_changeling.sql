CREATE SCHEMA "bikeshare";
--> statement-breakpoint
CREATE TABLE "bikeshare"."station" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
	"network_id" uuid NOT NULL,
	"name" text NOT NULL,
	"location" gis.geography NOT NULL,
	"address" text NOT NULL,
	"capacity" integer NOT NULL,
	"num_vehicles_available" integer NOT NULL,
	"num_docks_available" integer NOT NULL,
	"is_renting" boolean NOT NULL,
	"is_returning" boolean NOT NULL,
	"last_reported" timestamp with time zone NOT NULL,
	"vehicle_types_available" jsonb NOT NULL,
	"raw_data" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bikeshare"."vehicle" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
	"network_id" uuid NOT NULL,
	"location" gis.geography NOT NULL,
	"vehicle_type" text,
	"is_reserved" boolean,
	"is_disabled" boolean,
	"battery_level" integer,
	"last_reported" timestamp with time zone,
	"pricing_plan_id" text,
	"rental_uris" jsonb,
	"raw_data" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "public"."bikeshare_api_source" SET SCHEMA "bikeshare";
--> statement-breakpoint
ALTER TABLE "public"."bikeshare_network" SET SCHEMA "bikeshare";
--> statement-breakpoint
ALTER TABLE "bikeshare"."bikeshare_api_source" RENAME TO "api_source";--> statement-breakpoint
ALTER TABLE "bikeshare"."bikeshare_network" RENAME TO "network";--> statement-breakpoint
ALTER TABLE "bikeshare"."station" ADD CONSTRAINT "station_network_id_network_id_fk" FOREIGN KEY ("network_id") REFERENCES "bikeshare"."network"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bikeshare"."vehicle" ADD CONSTRAINT "vehicle_network_id_network_id_fk" FOREIGN KEY ("network_id") REFERENCES "bikeshare"."network"("id") ON DELETE cascade ON UPDATE no action;