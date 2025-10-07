export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  bikeshare: {
    Tables: {
      api_source: {
        Row: {
          active: boolean
          created_at: string
          discovery_url: string
          id: string
          is_gbfs: boolean
          name: string
          updated_at: string
        }
        Insert: {
          active: boolean
          created_at?: string
          discovery_url: string
          id?: string
          is_gbfs: boolean
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          discovery_url?: string
          id?: string
          is_gbfs?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      network: {
        Row: {
          city: string
          company: string
          country: string
          created_at: string
          fetched_at: string
          id: string
          location: unknown
          name: string
          raw_data: Json
          station_information_url: string
          station_status_url: string
          vehicle_status_url: string
        }
        Insert: {
          city: string
          company: string
          country: string
          created_at?: string
          fetched_at?: string
          id?: string
          location: unknown
          name: string
          raw_data: Json
          station_information_url: string
          station_status_url: string
          vehicle_status_url: string
        }
        Update: {
          city?: string
          company?: string
          country?: string
          created_at?: string
          fetched_at?: string
          id?: string
          location?: unknown
          name?: string
          raw_data?: Json
          station_information_url?: string
          station_status_url?: string
          vehicle_status_url?: string
        }
        Relationships: []
      }
      station: {
        Row: {
          address: string | null
          capacity: number
          created_at: string
          fetched_at: string
          id: string
          is_operational: boolean | null
          is_renting: boolean | null
          is_returning: boolean | null
          is_virtual: boolean | null
          last_reported: string
          location: unknown
          name: string
          network_id: string
          num_bikes_available: number | null
          num_docks_available: number
          num_ebikes_available: number | null
          raw_data: Json
        }
        Insert: {
          address?: string | null
          capacity: number
          created_at?: string
          fetched_at?: string
          id?: string
          is_operational?: boolean | null
          is_renting?: boolean | null
          is_returning?: boolean | null
          is_virtual?: boolean | null
          last_reported: string
          location: unknown
          name: string
          network_id: string
          num_bikes_available?: number | null
          num_docks_available: number
          num_ebikes_available?: number | null
          raw_data: Json
        }
        Update: {
          address?: string | null
          capacity?: number
          created_at?: string
          fetched_at?: string
          id?: string
          is_operational?: boolean | null
          is_renting?: boolean | null
          is_returning?: boolean | null
          is_virtual?: boolean | null
          last_reported?: string
          location?: unknown
          name?: string
          network_id?: string
          num_bikes_available?: number | null
          num_docks_available?: number
          num_ebikes_available?: number | null
          raw_data?: Json
        }
        Relationships: []
      }
      station_old: {
        Row: {
          address: string | null
          capacity: number
          created_at: string
          fetched_at: string
          id: string
          is_renting: boolean | null
          is_returning: boolean | null
          last_reported: string
          location: unknown
          name: string
          network_id: string
          num_docks_available: number
          num_vehicles_available: number
          raw_data: Json
          vehicle_types_available: Json
        }
        Insert: {
          address?: string | null
          capacity: number
          created_at?: string
          fetched_at?: string
          id?: string
          is_renting?: boolean | null
          is_returning?: boolean | null
          last_reported: string
          location: unknown
          name: string
          network_id: string
          num_docks_available: number
          num_vehicles_available: number
          raw_data: Json
          vehicle_types_available: Json
        }
        Update: {
          address?: string | null
          capacity?: number
          created_at?: string
          fetched_at?: string
          id?: string
          is_renting?: boolean | null
          is_returning?: boolean | null
          last_reported?: string
          location?: unknown
          name?: string
          network_id?: string
          num_docks_available?: number
          num_vehicles_available?: number
          raw_data?: Json
          vehicle_types_available?: Json
        }
        Relationships: [
          {
            foreignKeyName: "station_network_id_network_id_fk"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "network"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle: {
        Row: {
          battery_level: number | null
          created_at: string
          fetched_at: string
          id: string
          is_disabled: boolean | null
          is_reserved: boolean | null
          last_reported: string | null
          location: unknown
          network_id: string
          pricing_plan_id: string | null
          raw_data: Json
          rental_uris: Json | null
          vehicle_type: string | null
        }
        Insert: {
          battery_level?: number | null
          created_at?: string
          fetched_at?: string
          id?: string
          is_disabled?: boolean | null
          is_reserved?: boolean | null
          last_reported?: string | null
          location: unknown
          network_id: string
          pricing_plan_id?: string | null
          raw_data: Json
          rental_uris?: Json | null
          vehicle_type?: string | null
        }
        Update: {
          battery_level?: number | null
          created_at?: string
          fetched_at?: string
          id?: string
          is_disabled?: boolean | null
          is_reserved?: boolean | null
          last_reported?: string | null
          location?: unknown
          network_id?: string
          pricing_plan_id?: string | null
          raw_data?: Json
          rental_uris?: Json | null
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_network_id_network_id_fk"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "network"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      debug_whoami: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  bikeshare: {
    Enums: {},
  },
} as const
