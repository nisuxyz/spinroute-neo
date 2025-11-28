/**
 * Generated Supabase types
 *
 * Generate with:
 * supabase gen types typescript --project-id <project-id> --schema <schema-name> > lib/db.types.ts
 *
 * Example:
 * supabase gen types typescript --project-id ftvjoeosbmwedpeekupl --schema=your_schema > lib/db.types.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Add your schema types here after generating them
  public: {
    Tables: {};
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
};
