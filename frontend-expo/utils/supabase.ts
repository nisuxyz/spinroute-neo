import 'expo-sqlite/localStorage/install';
import { createClient } from '@supabase/supabase-js';

// Note: This file is initialized at module load time, before React hooks can be used.
// For dynamic environment switching, consider creating a context provider.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY!;

console.log('[Supabase] Initializing client with URL:', supabaseUrl);
console.log('[Supabase] Key present:', !!supabaseKey, 'Length:', supabaseKey?.length);

if (!supabaseUrl || !supabaseKey) {
  console.error('[Supabase] Missing configuration!', { supabaseUrl, hasKey: !!supabaseKey });
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

console.log('[Supabase] Client initialized');
