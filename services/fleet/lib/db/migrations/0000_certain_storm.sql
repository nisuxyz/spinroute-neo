CREATE TABLE "bikeshare_api_source" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
	"name" text NOT NULL,
	"is_gbfs" boolean NOT NULL,
	"discovery_url" text NOT NULL,
	"active" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bikeshare_network" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
	"name" text NOT NULL,
	"company" text NOT NULL,
	"location" gis.geography NOT NULL,
	"city" text NOT NULL,
	"country" text NOT NULL,
	"station_status_url" text NOT NULL,
	"station_information_url" text NOT NULL,
	"vehicle_status_url" text NOT NULL,
	"raw_data" jsonb NOT NULL
);
