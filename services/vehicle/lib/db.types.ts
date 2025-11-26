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
          created_at: string;
          id: string;
          start_recording_on_launch: boolean;
          units: string;
          updated_at: string;
        };
        Insert: {
          active_bike_id?: string | null;
          created_at?: string;
          id: string;
          start_recording_on_launch?: boolean;
          units?: string;
          updated_at?: string;
        };
        Update: {
          active_bike_id?: string | null;
          created_at?: string;
          id?: string;
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
  public: {
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
