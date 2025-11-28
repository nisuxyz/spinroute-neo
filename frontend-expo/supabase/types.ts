export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '13.0.5';
  };
  bikeshare: {
    Tables: {
      api_source: {
        Row: {
          active: boolean;
          created_at: string;
          discovery_url: string;
          id: string;
          is_gbfs: boolean;
          name: string;
          updated_at: string;
        };
        Insert: {
          active: boolean;
          created_at?: string;
          discovery_url: string;
          id?: string;
          is_gbfs: boolean;
          name: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          discovery_url?: string;
          id?: string;
          is_gbfs?: boolean;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      network: {
        Row: {
          city: string;
          company: string;
          country: string;
          created_at: string;
          fetched_at: string;
          id: string;
          location: unknown;
          name: string;
          raw_data: Json;
          station_information_url: string;
          station_status_url: string;
          vehicle_status_url: string;
        };
        Insert: {
          city: string;
          company: string;
          country: string;
          created_at?: string;
          fetched_at?: string;
          id?: string;
          location: unknown;
          name: string;
          raw_data: Json;
          station_information_url: string;
          station_status_url: string;
          vehicle_status_url: string;
        };
        Update: {
          city?: string;
          company?: string;
          country?: string;
          created_at?: string;
          fetched_at?: string;
          id?: string;
          location?: unknown;
          name?: string;
          raw_data?: Json;
          station_information_url?: string;
          station_status_url?: string;
          vehicle_status_url?: string;
        };
        Relationships: [];
      };
      station: {
        Row: {
          address: string | null;
          capacity: number;
          created_at: string;
          fetched_at: string;
          id: string;
          is_operational: boolean | null;
          is_renting: boolean | null;
          is_returning: boolean | null;
          is_virtual: boolean | null;
          last_reported: string;
          location: unknown;
          name: string;
          network_id: string;
          num_bikes_available: number | null;
          num_docks_available: number;
          num_ebikes_available: number | null;
          raw_data: Json;
        };
        Insert: {
          address?: string | null;
          capacity: number;
          created_at?: string;
          fetched_at?: string;
          id?: string;
          is_operational?: boolean | null;
          is_renting?: boolean | null;
          is_returning?: boolean | null;
          is_virtual?: boolean | null;
          last_reported: string;
          location: unknown;
          name: string;
          network_id: string;
          num_bikes_available?: number | null;
          num_docks_available: number;
          num_ebikes_available?: number | null;
          raw_data: Json;
        };
        Update: {
          address?: string | null;
          capacity?: number;
          created_at?: string;
          fetched_at?: string;
          id?: string;
          is_operational?: boolean | null;
          is_renting?: boolean | null;
          is_returning?: boolean | null;
          is_virtual?: boolean | null;
          last_reported?: string;
          location?: unknown;
          name?: string;
          network_id?: string;
          num_bikes_available?: number | null;
          num_docks_available?: number;
          num_ebikes_available?: number | null;
          raw_data?: Json;
        };
        Relationships: [
          {
            foreignKeyName: 'station_network_id_network_id_fk';
            columns: ['network_id'];
            isOneToOne: false;
            referencedRelation: 'network';
            referencedColumns: ['id'];
          },
        ];
      };
      station_old: {
        Row: {
          address: string | null;
          capacity: number;
          created_at: string;
          fetched_at: string;
          id: string;
          is_renting: boolean | null;
          is_returning: boolean | null;
          last_reported: string;
          location: unknown;
          name: string;
          network_id: string;
          num_docks_available: number;
          num_vehicles_available: number;
          raw_data: Json;
          vehicle_types_available: Json;
        };
        Insert: {
          address?: string | null;
          capacity: number;
          created_at?: string;
          fetched_at?: string;
          id?: string;
          is_renting?: boolean | null;
          is_returning?: boolean | null;
          last_reported: string;
          location: unknown;
          name: string;
          network_id: string;
          num_docks_available: number;
          num_vehicles_available: number;
          raw_data: Json;
          vehicle_types_available: Json;
        };
        Update: {
          address?: string | null;
          capacity?: number;
          created_at?: string;
          fetched_at?: string;
          id?: string;
          is_renting?: boolean | null;
          is_returning?: boolean | null;
          last_reported?: string;
          location?: unknown;
          name?: string;
          network_id?: string;
          num_docks_available?: number;
          num_vehicles_available?: number;
          raw_data?: Json;
          vehicle_types_available?: Json;
        };
        Relationships: [];
      };
      vehicle: {
        Row: {
          battery_level: number | null;
          created_at: string;
          fetched_at: string;
          id: string;
          is_disabled: boolean | null;
          is_reserved: boolean | null;
          last_reported: string | null;
          location: unknown;
          network_id: string;
          pricing_plan_id: string | null;
          raw_data: Json;
          rental_uris: Json | null;
          vehicle_type: string | null;
        };
        Insert: {
          battery_level?: number | null;
          created_at?: string;
          fetched_at?: string;
          id?: string;
          is_disabled?: boolean | null;
          is_reserved?: boolean | null;
          last_reported?: string | null;
          location: unknown;
          network_id: string;
          pricing_plan_id?: string | null;
          raw_data: Json;
          rental_uris?: Json | null;
          vehicle_type?: string | null;
        };
        Update: {
          battery_level?: number | null;
          created_at?: string;
          fetched_at?: string;
          id?: string;
          is_disabled?: boolean | null;
          is_reserved?: boolean | null;
          last_reported?: string | null;
          location?: unknown;
          network_id?: string;
          pricing_plan_id?: string | null;
          raw_data?: Json;
          rental_uris?: Json | null;
          vehicle_type?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'vehicle_network_id_network_id_fk';
            columns: ['network_id'];
            isOneToOne: false;
            referencedRelation: 'network';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      debug_whoami: { Args: never; Returns: Json };
      get_stations_in_radius: {
        Args: { center_lat: number; center_lng: number; radius_meters: number };
        Returns: {
          address: string;
          capacity: number;
          created_at: string;
          distance_m: number;
          fetched_at: string;
          id: string;
          is_operational: boolean;
          is_renting: boolean;
          is_returning: boolean;
          is_virtual: boolean;
          last_reported: string;
          location: unknown;
          name: string;
          network_id: string;
          num_bikes_available: number;
          num_docks_available: number;
          num_ebikes_available: number;
          raw_data: Json;
        }[];
      };
      get_stations_in_view: {
        Args: { ne_lat: number; ne_lng: number; sw_lat: number; sw_lng: number };
        Returns: {
          address: string;
          capacity: number;
          created_at: string;
          fetched_at: string;
          id: string;
          is_operational: boolean;
          is_renting: boolean;
          is_returning: boolean;
          is_virtual: boolean;
          last_reported: string;
          lat: number;
          lng: number;
          location: unknown;
          name: string;
          network_id: string;
          num_bikes_available: number;
          num_docks_available: number;
          num_ebikes_available: number;
          raw_data: Json;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      profiles: {
        Row: {
          avatar_url: string | null;
          full_name: string | null;
          id: string;
          updated_at: string | null;
          username: string | null;
          website: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          full_name?: string | null;
          id: string;
          updated_at?: string | null;
          username?: string | null;
          website?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          full_name?: string | null;
          id?: string;
          updated_at?: string | null;
          username?: string | null;
          website?: string | null;
        };
        Relationships: [];
      };
      user_settings: {
        Row: {
          active_bike_id: string | null;
          capture_interval_seconds: number | null;
          created_at: string;
          id: string;
          map_style: string;
          start_recording_on_launch: boolean;
          units: string;
          updated_at: string;
        };
        Insert: {
          active_bike_id?: string | null;
          capture_interval_seconds?: number | null;
          created_at?: string;
          id: string;
          map_style?: string;
          start_recording_on_launch?: boolean;
          units?: string;
          updated_at?: string;
        };
        Update: {
          active_bike_id?: string | null;
          capture_interval_seconds?: number | null;
          created_at?: string;
          id?: string;
          map_style?: string;
          start_recording_on_launch?: boolean;
          units?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      debug_whoami: { Args: never; Returns: Json };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  recording: {
    Tables: {
      pause_events: {
        Row: {
          created_at: string;
          id: string;
          paused_at: string;
          resumed_at: string | null;
          trip_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          paused_at: string;
          resumed_at?: string | null;
          trip_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          paused_at?: string;
          resumed_at?: string | null;
          trip_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'pause_events_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
        ];
      };
      trip_advanced_stats: {
        Row: {
          avg_cadence_rpm: number | null;
          avg_heart_rate_bpm: number | null;
          avg_moving_speed_kmh: number | null;
          avg_power_watts: number | null;
          calculated_at: string;
          elevation_gain_m: number | null;
          elevation_loss_m: number | null;
          max_elevation_m: number | null;
          max_heart_rate_bpm: number | null;
          min_elevation_m: number | null;
          pause_count: number | null;
          speed_percentile_50_kmh: number | null;
          speed_percentile_95_kmh: number | null;
          stopped_time_seconds: number | null;
          trip_id: string;
          updated_at: string;
        };
        Insert: {
          avg_cadence_rpm?: number | null;
          avg_heart_rate_bpm?: number | null;
          avg_moving_speed_kmh?: number | null;
          avg_power_watts?: number | null;
          calculated_at?: string;
          elevation_gain_m?: number | null;
          elevation_loss_m?: number | null;
          max_elevation_m?: number | null;
          max_heart_rate_bpm?: number | null;
          min_elevation_m?: number | null;
          pause_count?: number | null;
          speed_percentile_50_kmh?: number | null;
          speed_percentile_95_kmh?: number | null;
          stopped_time_seconds?: number | null;
          trip_id: string;
          updated_at?: string;
        };
        Update: {
          avg_cadence_rpm?: number | null;
          avg_heart_rate_bpm?: number | null;
          avg_moving_speed_kmh?: number | null;
          avg_power_watts?: number | null;
          calculated_at?: string;
          elevation_gain_m?: number | null;
          elevation_loss_m?: number | null;
          max_elevation_m?: number | null;
          max_heart_rate_bpm?: number | null;
          min_elevation_m?: number | null;
          pause_count?: number | null;
          speed_percentile_50_kmh?: number | null;
          speed_percentile_95_kmh?: number | null;
          stopped_time_seconds?: number | null;
          trip_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'trip_advanced_stats_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: true;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
        ];
      };
      trip_basic_stats: {
        Row: {
          avg_speed_kmh: number | null;
          calculated_at: string;
          distance_km: number | null;
          duration_seconds: number | null;
          max_speed_kmh: number | null;
          moving_duration_seconds: number | null;
          route_geom: unknown;
          trip_id: string;
          updated_at: string;
        };
        Insert: {
          avg_speed_kmh?: number | null;
          calculated_at?: string;
          distance_km?: number | null;
          duration_seconds?: number | null;
          max_speed_kmh?: number | null;
          moving_duration_seconds?: number | null;
          route_geom?: unknown;
          trip_id: string;
          updated_at?: string;
        };
        Update: {
          avg_speed_kmh?: number | null;
          calculated_at?: string;
          distance_km?: number | null;
          duration_seconds?: number | null;
          max_speed_kmh?: number | null;
          moving_duration_seconds?: number | null;
          route_geom?: unknown;
          trip_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'trip_basic_stats_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: true;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
        ];
      };
      trip_points: {
        Row: {
          accuracy_m: number | null;
          altitude_m: number | null;
          cadence_rpm: number | null;
          created_at: string;
          heart_rate_bpm: number | null;
          id: string;
          location: unknown;
          power_watts: number | null;
          recorded_at: string;
          speed_kmh: number | null;
          trip_id: string;
        };
        Insert: {
          accuracy_m?: number | null;
          altitude_m?: number | null;
          cadence_rpm?: number | null;
          created_at?: string;
          heart_rate_bpm?: number | null;
          id?: string;
          location: unknown;
          power_watts?: number | null;
          recorded_at: string;
          speed_kmh?: number | null;
          trip_id: string;
        };
        Update: {
          accuracy_m?: number | null;
          altitude_m?: number | null;
          cadence_rpm?: number | null;
          created_at?: string;
          heart_rate_bpm?: number | null;
          id?: string;
          location?: unknown;
          power_watts?: number | null;
          recorded_at?: string;
          speed_kmh?: number | null;
          trip_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'trip_points_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
        ];
      };
      trip_points_2025_11: {
        Row: {
          accuracy_m: number | null;
          altitude_m: number | null;
          cadence_rpm: number | null;
          created_at: string;
          heart_rate_bpm: number | null;
          id: string;
          location: unknown;
          power_watts: number | null;
          recorded_at: string;
          speed_kmh: number | null;
          trip_id: string;
        };
        Insert: {
          accuracy_m?: number | null;
          altitude_m?: number | null;
          cadence_rpm?: number | null;
          created_at?: string;
          heart_rate_bpm?: number | null;
          id?: string;
          location: unknown;
          power_watts?: number | null;
          recorded_at: string;
          speed_kmh?: number | null;
          trip_id: string;
        };
        Update: {
          accuracy_m?: number | null;
          altitude_m?: number | null;
          cadence_rpm?: number | null;
          created_at?: string;
          heart_rate_bpm?: number | null;
          id?: string;
          location?: unknown;
          power_watts?: number | null;
          recorded_at?: string;
          speed_kmh?: number | null;
          trip_id?: string;
        };
        Relationships: [];
      };
      trip_points_2025_12: {
        Row: {
          accuracy_m: number | null;
          altitude_m: number | null;
          cadence_rpm: number | null;
          created_at: string;
          heart_rate_bpm: number | null;
          id: string;
          location: unknown;
          power_watts: number | null;
          recorded_at: string;
          speed_kmh: number | null;
          trip_id: string;
        };
        Insert: {
          accuracy_m?: number | null;
          altitude_m?: number | null;
          cadence_rpm?: number | null;
          created_at?: string;
          heart_rate_bpm?: number | null;
          id?: string;
          location: unknown;
          power_watts?: number | null;
          recorded_at: string;
          speed_kmh?: number | null;
          trip_id: string;
        };
        Update: {
          accuracy_m?: number | null;
          altitude_m?: number | null;
          cadence_rpm?: number | null;
          created_at?: string;
          heart_rate_bpm?: number | null;
          id?: string;
          location?: unknown;
          power_watts?: number | null;
          recorded_at?: string;
          speed_kmh?: number | null;
          trip_id?: string;
        };
        Relationships: [];
      };
      trip_points_2026_01: {
        Row: {
          accuracy_m: number | null;
          altitude_m: number | null;
          cadence_rpm: number | null;
          created_at: string;
          heart_rate_bpm: number | null;
          id: string;
          location: unknown;
          power_watts: number | null;
          recorded_at: string;
          speed_kmh: number | null;
          trip_id: string;
        };
        Insert: {
          accuracy_m?: number | null;
          altitude_m?: number | null;
          cadence_rpm?: number | null;
          created_at?: string;
          heart_rate_bpm?: number | null;
          id?: string;
          location: unknown;
          power_watts?: number | null;
          recorded_at: string;
          speed_kmh?: number | null;
          trip_id: string;
        };
        Update: {
          accuracy_m?: number | null;
          altitude_m?: number | null;
          cadence_rpm?: number | null;
          created_at?: string;
          heart_rate_bpm?: number | null;
          id?: string;
          location?: unknown;
          power_watts?: number | null;
          recorded_at?: string;
          speed_kmh?: number | null;
          trip_id?: string;
        };
        Relationships: [];
      };
      trip_points_2026_02: {
        Row: {
          accuracy_m: number | null;
          altitude_m: number | null;
          cadence_rpm: number | null;
          created_at: string;
          heart_rate_bpm: number | null;
          id: string;
          location: unknown;
          power_watts: number | null;
          recorded_at: string;
          speed_kmh: number | null;
          trip_id: string;
        };
        Insert: {
          accuracy_m?: number | null;
          altitude_m?: number | null;
          cadence_rpm?: number | null;
          created_at?: string;
          heart_rate_bpm?: number | null;
          id?: string;
          location: unknown;
          power_watts?: number | null;
          recorded_at: string;
          speed_kmh?: number | null;
          trip_id: string;
        };
        Update: {
          accuracy_m?: number | null;
          altitude_m?: number | null;
          cadence_rpm?: number | null;
          created_at?: string;
          heart_rate_bpm?: number | null;
          id?: string;
          location?: unknown;
          power_watts?: number | null;
          recorded_at?: string;
          speed_kmh?: number | null;
          trip_id?: string;
        };
        Relationships: [];
      };
      trips: {
        Row: {
          completed_at: string | null;
          created_at: string;
          id: string;
          notes: string | null;
          started_at: string;
          status: string;
          title: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          notes?: string | null;
          started_at?: string;
          status: string;
          title?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          notes?: string | null;
          started_at?: string;
          status?: string;
          title?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_future_partitions: {
        Args: { months_ahead?: number };
        Returns: undefined;
      };
      create_next_partition: { Args: never; Returns: undefined };
      drop_old_partitions: {
        Args: { months_to_keep?: number };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  vehicles: {
    Tables: {
      kilometrage_log: {
        Row: {
          bike_id: string;
          created_at: string;
          distance: number;
          id: string;
          logged_at: string;
          notes: string | null;
          user_id: string;
        };
        Insert: {
          bike_id: string;
          created_at?: string;
          distance: number;
          id?: string;
          logged_at?: string;
          notes?: string | null;
          user_id: string;
        };
        Update: {
          bike_id?: string;
          created_at?: string;
          distance?: number;
          id?: string;
          logged_at?: string;
          notes?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'mileage_log_bike_id_fkey';
            columns: ['bike_id'];
            isOneToOne: false;
            referencedRelation: 'user_bike';
            referencedColumns: ['id'];
          },
        ];
      };
      maintenance_record: {
        Row: {
          bike_id: string | null;
          cost: number | null;
          created_at: string;
          description: string;
          id: string;
          maintenance_type: Database['vehicles']['Enums']['maintenance_type'];
          metadata: Json | null;
          part_id: string | null;
          performed_at: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          bike_id?: string | null;
          cost?: number | null;
          created_at?: string;
          description: string;
          id?: string;
          maintenance_type: Database['vehicles']['Enums']['maintenance_type'];
          metadata?: Json | null;
          part_id?: string | null;
          performed_at: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          bike_id?: string | null;
          cost?: number | null;
          created_at?: string;
          description?: string;
          id?: string;
          maintenance_type?: Database['vehicles']['Enums']['maintenance_type'];
          metadata?: Json | null;
          part_id?: string | null;
          performed_at?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'maintenance_record_bike_id_fkey';
            columns: ['bike_id'];
            isOneToOne: false;
            referencedRelation: 'user_bike';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_record_part_id_fkey';
            columns: ['part_id'];
            isOneToOne: false;
            referencedRelation: 'user_part';
            referencedColumns: ['id'];
          },
        ];
      };
      ownership_history: {
        Row: {
          created_at: string;
          entity_id: string;
          entity_type: Database['vehicles']['Enums']['entity_type'];
          id: string;
          new_owner_id: string;
          notes: string | null;
          previous_owner_id: string;
          transferred_at: string;
        };
        Insert: {
          created_at?: string;
          entity_id: string;
          entity_type: Database['vehicles']['Enums']['entity_type'];
          id?: string;
          new_owner_id: string;
          notes?: string | null;
          previous_owner_id: string;
          transferred_at?: string;
        };
        Update: {
          created_at?: string;
          entity_id?: string;
          entity_type?: Database['vehicles']['Enums']['entity_type'];
          id?: string;
          new_owner_id?: string;
          notes?: string | null;
          previous_owner_id?: string;
          transferred_at?: string;
        };
        Relationships: [];
      };
      part_installation: {
        Row: {
          bike_id: string;
          created_at: string;
          id: string;
          installed_at: string;
          part_id: string;
          removed_at: string | null;
        };
        Insert: {
          bike_id: string;
          created_at?: string;
          id?: string;
          installed_at?: string;
          part_id: string;
          removed_at?: string | null;
        };
        Update: {
          bike_id?: string;
          created_at?: string;
          id?: string;
          installed_at?: string;
          part_id?: string;
          removed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'part_installation_bike_id_fkey';
            columns: ['bike_id'];
            isOneToOne: false;
            referencedRelation: 'user_bike';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'part_installation_part_id_fkey';
            columns: ['part_id'];
            isOneToOne: false;
            referencedRelation: 'user_part';
            referencedColumns: ['id'];
          },
        ];
      };
      user_bike: {
        Row: {
          brand: string | null;
          created_at: string;
          id: string;
          metadata: Json | null;
          model: string | null;
          name: string;
          purchase_date: string | null;
          total_kilometrage: number;
          type: Database['vehicles']['Enums']['bike_type'];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          brand?: string | null;
          created_at?: string;
          id?: string;
          metadata?: Json | null;
          model?: string | null;
          name: string;
          purchase_date?: string | null;
          total_kilometrage?: number;
          type: Database['vehicles']['Enums']['bike_type'];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          brand?: string | null;
          created_at?: string;
          id?: string;
          metadata?: Json | null;
          model?: string | null;
          name?: string;
          purchase_date?: string | null;
          total_kilometrage?: number;
          type?: Database['vehicles']['Enums']['bike_type'];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_part: {
        Row: {
          brand: string | null;
          created_at: string;
          id: string;
          metadata: Json | null;
          model: string | null;
          name: string;
          purchase_date: string | null;
          total_kilometrage: number;
          type: Database['vehicles']['Enums']['part_type'];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          brand?: string | null;
          created_at?: string;
          id?: string;
          metadata?: Json | null;
          model?: string | null;
          name: string;
          purchase_date?: string | null;
          total_kilometrage?: number;
          type: Database['vehicles']['Enums']['part_type'];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          brand?: string | null;
          created_at?: string;
          id?: string;
          metadata?: Json | null;
          model?: string | null;
          name?: string;
          purchase_date?: string | null;
          total_kilometrage?: number;
          type?: Database['vehicles']['Enums']['part_type'];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      bike_type: 'road' | 'mountain' | 'hybrid' | 'gravel' | 'ebike' | 'other';
      entity_type: 'bike' | 'part';
      maintenance_type:
        | 'repair'
        | 'replacement'
        | 'adjustment'
        | 'cleaning'
        | 'inspection'
        | 'other';
      part_type:
        | 'chain'
        | 'tires'
        | 'brake_pads'
        | 'cassette'
        | 'derailleur'
        | 'crankset'
        | 'saddle'
        | 'handlebar'
        | 'pedals'
        | 'other';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  bikeshare: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
  recording: {
    Enums: {},
  },
  vehicles: {
    Enums: {
      bike_type: ['road', 'mountain', 'hybrid', 'gravel', 'ebike', 'other'],
      entity_type: ['bike', 'part'],
      maintenance_type: ['repair', 'replacement', 'adjustment', 'cleaning', 'inspection', 'other'],
      part_type: [
        'chain',
        'tires',
        'brake_pads',
        'cassette',
        'derailleur',
        'crankset',
        'saddle',
        'handlebar',
        'pedals',
        'other',
      ],
    },
  },
} as const;
