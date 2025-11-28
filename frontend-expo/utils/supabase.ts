import 'expo-sqlite/localStorage/install';
import { createClient } from '@supabase/supabase-js';

// Note: This file is initialized at module load time, before React hooks can be used.
// For dynamic environment switching, consider creating a context provider.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
