create schema if not exists "bikeshare";

create table "bikeshare"."api_source" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default (now() AT TIME ZONE 'utc'::text),
    "updated_at" timestamp with time zone not null default (now() AT TIME ZONE 'utc'::text),
    "name" text not null,
    "is_gbfs" boolean not null,
    "discovery_url" text not null,
    "active" boolean not null
);


create table "bikeshare"."network" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default (now() AT TIME ZONE 'utc'::text),
    "fetched_at" timestamp with time zone not null default (now() AT TIME ZONE 'utc'::text),
    "name" text not null,
    "company" text not null,
    "location" gis.geography not null,
    "city" text not null,
    "country" text not null,
    "station_status_url" text not null,
    "station_information_url" text not null,
    "vehicle_status_url" text not null,
    "raw_data" jsonb not null
);

create table "bikeshare"."vehicle" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default (now() AT TIME ZONE 'utc'::text),
    "fetched_at" timestamp with time zone not null default (now() AT TIME ZONE 'utc'::text),
    "network_id" uuid not null,
    "location" gis.geography not null,
    "vehicle_type" text,
    "is_reserved" boolean,
    "is_disabled" boolean,
    "battery_level" integer,
    "last_reported" timestamp with time zone,
    "pricing_plan_id" text,
    "rental_uris" jsonb,
    "raw_data" jsonb not null
);


CREATE UNIQUE INDEX bikeshare_api_source_pkey ON bikeshare.api_source USING btree (id);

CREATE UNIQUE INDEX bikeshare_network_pkey ON bikeshare.network USING btree (id);

CREATE UNIQUE INDEX vehicle_pkey ON bikeshare.vehicle USING btree (id);

alter table "bikeshare"."api_source" add constraint "bikeshare_api_source_pkey" PRIMARY KEY using index "bikeshare_api_source_pkey";

alter table "bikeshare"."network" add constraint "bikeshare_network_pkey" PRIMARY KEY using index "bikeshare_network_pkey";

alter table "bikeshare"."vehicle" add constraint "vehicle_pkey" PRIMARY KEY using index "vehicle_pkey";

alter table "bikeshare"."vehicle" add constraint "vehicle_network_id_network_id_fk" FOREIGN KEY (network_id) REFERENCES bikeshare.network(id) ON DELETE CASCADE not valid;

alter table "bikeshare"."vehicle" validate constraint "vehicle_network_id_network_id_fk";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION bikeshare.debug_whoami()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  select jsonb_build_object(
    'current_user', current_user,
    'session_user', session_user,
    'auth_uid', (select auth.uid()),
    'jwt_role', current_setting('jwt.claims.role', true)
  );
$function$
;


