import { supabase } from '@/utils/supabase';

export function useSupabase(schema?: string) {
  // You can add any custom hooks or logic related to Supabase here
  console.log('Using Supabase schema:', schema, process.env);
  return schema ? supabase.schema(schema) : supabase;
}
