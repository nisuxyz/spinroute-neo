export const useEnv = (useDevUrls: boolean = process.env.NODE_ENV === 'development') => {
  // EXPO_PUBLIC_ environment variables are automatically available via process.env
  // in both development and production builds (EAS Build injects them automatically)

  // Define known environment variables
  const prodUrls: Record<string, string> = {};
  const devUrls: Record<string, string> = {};
  const env: Record<string, string> = {};

  // Extract production URLs
  if (process.env.EXPO_PUBLIC_SUPABASE_URL) {
    prodUrls.SUPABASE = process.env.EXPO_PUBLIC_SUPABASE_URL;
  }
  if (process.env.EXPO_PUBLIC_ROUTING_SERVICE_URL) {
    prodUrls.ROUTING_SERVICE = process.env.EXPO_PUBLIC_ROUTING_SERVICE_URL;
  }

  // Extract development URLs
  if (process.env.EXPO_PUBLIC_SUPABASE_DEV_URL) {
    devUrls.SUPABASE = process.env.EXPO_PUBLIC_SUPABASE_DEV_URL;
  }
  if (process.env.EXPO_PUBLIC_ROUTING_SERVICE_DEV_URL) {
    devUrls.ROUTING_SERVICE = process.env.EXPO_PUBLIC_ROUTING_SERVICE_DEV_URL;
  }

  // Extract other environment variables
  if (process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN) {
    env.MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
  }
  if (process.env.EXPO_PUBLIC_SUPABASE_KEY) {
    env.SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;
  }

  // Merge URLs based on useDevUrls flag
  const urls = useDevUrls ? { ...prodUrls, ...devUrls } : prodUrls;

  console.log('useEnv - useDevUrls:', useDevUrls);
  console.log('useEnv - devUrls:', devUrls);
  console.log('useEnv - prodUrls:', prodUrls);
  console.log('useEnv - merged urls:', urls);

  return { ...env, ...urls };
};
