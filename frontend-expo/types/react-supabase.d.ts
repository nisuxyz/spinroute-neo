declare module 'react-supabase' {
  import { SupabaseClient } from '@supabase/supabase-js';
  import { ReactNode } from 'react';

  export function Provider(props: { value: SupabaseClient; children: ReactNode }): JSX.Element;
  export function useClient(): SupabaseClient;
  export function useAuthStateChange(callback: (event: string, session: any) => void): void;
}
