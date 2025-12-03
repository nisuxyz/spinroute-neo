import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useUserSettings } from './use-user-settings';

interface EnvConfig {
  SUPABASE: string;
  ROUTING_SERVICE: string;
  IAP_SERVICE_URL: string;
  MAPBOX_ACCESS_TOKEN: string;
  SUPABASE_KEY: string;
}

const EnvContext = createContext<EnvConfig | null>(null);

export function EnvProvider({ children }: { children: ReactNode }) {
  const { settings } = useUserSettings();

  const env = useMemo(() => {
    const useDevUrls = settings?.useDevUrls ?? process.env.NODE_ENV === 'development';

    // Extract production URLs
    const prodUrls = {
      SUPABASE: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
      ROUTING_SERVICE: process.env.EXPO_PUBLIC_ROUTING_SERVICE_URL || '',
      IAP_SERVICE_URL: process.env.EXPO_PUBLIC_IAP_SERVICE_URL || '',
    };

    // Extract development URLs (fallback to prod if not set)
    const devUrls = {
      SUPABASE: process.env.EXPO_PUBLIC_SUPABASE_DEV_URL || prodUrls.SUPABASE,
      ROUTING_SERVICE: process.env.EXPO_PUBLIC_ROUTING_SERVICE_DEV_URL || prodUrls.ROUTING_SERVICE,
      IAP_SERVICE_URL: process.env.EXPO_PUBLIC_IAP_SERVICE_DEV_URL || prodUrls.IAP_SERVICE_URL,
    };

    // Merge URLs based on useDevUrls flag
    const urls = useDevUrls ? devUrls : prodUrls;

    // Keep console logs for analysis
    console.log('[EnvProvider] useDevUrls:', useDevUrls);
    console.log('[EnvProvider] devUrls:', devUrls);
    console.log('[EnvProvider] prodUrls:', prodUrls);
    console.log('[EnvProvider] merged urls:', urls);

    return {
      ...urls,
      MAPBOX_ACCESS_TOKEN: process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '',
      SUPABASE_KEY: process.env.EXPO_PUBLIC_SUPABASE_KEY || '',
    };
  }, [settings?.useDevUrls]);

  return <EnvContext.Provider value={env}>{children}</EnvContext.Provider>;
}

export function useEnv() {
  const context = useContext(EnvContext);
  if (!context) {
    throw new Error('useEnv must be used within EnvProvider');
  }
  return context;
}
