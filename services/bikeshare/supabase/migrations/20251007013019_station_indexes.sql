CREATE UNIQUE INDEX station_pkey ON bikeshare.station USING btree (id);

alter table "bikeshare"."station" add constraint "station_pkey" PRIMARY KEY using index "station_pkey";

alter table "bikeshare"."station" add constraint "station_network_id_network_id_fk" FOREIGN KEY (network_id) REFERENCES bikeshare.network(id) ON DELETE CASCADE not valid;

alter table "bikeshare"."station" validate constraint "station_network_id_network_id_fk";