create table "bikeshare"."station" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default (now() AT TIME ZONE 'utc'::text),
    "fetched_at" timestamp with time zone not null default (now() AT TIME ZONE 'utc'::text),
    "network_id" uuid not null,
    "name" text not null,
    "location" gis.geography not null,
    "address" text,
    "capacity" integer not null,
    "num_docks_available" integer not null,
    "num_ebikes_available" integer,
    "num_bikes_available" integer,
    "is_operational" boolean,
    "is_renting" boolean,
    "is_returning" boolean,
    "is_virtual" boolean,
    "last_reported" timestamp with time zone not null,
    "raw_data" jsonb not null
);