export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '13.0.5';
  };
  public: {
    Tables: {
      profiles: {
        Row: {
          avatar_url: string | null;
          full_name: string | null;
          id: string;
          is_renewing: boolean;
          is_trial: boolean;
          linked_purchase_token: string | null;
          original_transaction_id: string | null;
          product_id: string | null;
          purchase_token: string | null;
          purchase_uuid: string;
          subscription_expires_at: string | null;
          subscription_status: string;
          subscription_tier: string;
          transaction_id: string | null;
          upcoming_product_id: string | null;
          updated_at: string | null;
          username: string | null;
          website: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          full_name?: string | null;
          id: string;
          is_renewing?: boolean;
          is_trial?: boolean;
          linked_purchase_token?: string | null;
          original_transaction_id?: string | null;
          product_id?: string | null;
          purchase_token?: string | null;
          purchase_uuid?: string;
          subscription_expires_at?: string | null;
          subscription_status?: string;
          subscription_tier?: string;
          transaction_id?: string | null;
          upcoming_product_id?: string | null;
          updated_at?: string | null;
          username?: string | null;
          website?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          full_name?: string | null;
          id?: string;
          is_renewing?: boolean;
          is_trial?: boolean;
          linked_purchase_token?: string | null;
          original_transaction_id?: string | null;
          product_id?: string | null;
          purchase_token?: string | null;
          purchase_uuid?: string;
          subscription_expires_at?: string | null;
          subscription_status?: string;
          subscription_tier?: string;
          transaction_id?: string | null;
          upcoming_product_id?: string | null;
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
          preferred_bike_type: string | null;
          preferred_routing_profile: string | null;
          preferred_routing_provider: string | null;
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
          preferred_bike_type?: string | null;
          preferred_routing_profile?: string | null;
          preferred_routing_provider?: string | null;
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
          preferred_bike_type?: string | null;
          preferred_routing_profile?: string | null;
          preferred_routing_provider?: string | null;
          start_recording_on_launch?: boolean;
          units?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      webhook_events: {
        Row: {
          created_at: string;
          environment: string;
          expires_date: string | null;
          id: string;
          notification_subtype: string | null;
          notification_type: string;
          notification_uuid: string;
          original_transaction_id: string | null;
          processed: boolean;
          processing_error: string | null;
          product_id: string | null;
          raw_payload: Json;
          request_id: string | null;
          signature_verified: boolean | null;
          transaction_id: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          environment: string;
          expires_date?: string | null;
          id?: string;
          notification_subtype?: string | null;
          notification_type: string;
          notification_uuid: string;
          original_transaction_id?: string | null;
          processed?: boolean;
          processing_error?: string | null;
          product_id?: string | null;
          raw_payload: Json;
          request_id?: string | null;
          signature_verified?: boolean | null;
          transaction_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          environment?: string;
          expires_date?: string | null;
          id?: string;
          notification_subtype?: string | null;
          notification_type?: string;
          notification_uuid?: string;
          original_transaction_id?: string | null;
          processed?: boolean;
          processing_error?: string | null;
          product_id?: string | null;
          raw_payload?: Json;
          request_id?: string | null;
          signature_verified?: boolean | null;
          transaction_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      debug_whoami: { Args: never; Returns: Json };
      get_subscription_tier: {
        Args: { check_user_id: string };
        Returns: string;
      };
      get_trip_points: {
        Args: { p_trip_id: string };
        Returns: {
          accuracy_m: number;
          altitude_m: number;
          cadence_rpm: number;
          created_at: string;
          heart_rate_bpm: number;
          id: string;
          latitude: number;
          longitude: number;
          power_watts: number;
          recorded_at: string;
          speed_kmh: number;
          trip_id: string;
        }[];
      };
      user_has_premium: { Args: { check_user_id: string }; Returns: boolean };
      user_has_pro: { Args: { check_user_id: string }; Returns: boolean };
    };
    Enums: {
      [_ in never]: never;
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
  public: {
    Enums: {},
  },
} as const;
