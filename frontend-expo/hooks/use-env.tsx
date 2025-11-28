export const useEnv = (useDevUrls: boolean = process.env.NODE_ENV === 'development') => {
  const env: Record<string, string> = {};
  const devUrls: Record<string, string> = {};
  const prodUrls: Record<string, string> = {};

  for (const key in process.env) {
    if (key.includes('_DEV_URL')) {
      devUrls[key.replace('EXPO_PUBLIC_', '').replace('_DEV_URL', '')] = process.env[key]!;
      continue;
    }
    if (key.includes('_URL')) {
      prodUrls[key.replace('EXPO_PUBLIC_', '').replace('_URL', '')] = process.env[key]!;
      continue;
    }
    env[key.replace('EXPO_PUBLIC_', '')] = process.env[key]!;
  }

  // Merge URLs based on useDevUrls flag
  const urls = useDevUrls ? { ...prodUrls, ...devUrls } : prodUrls;

  console.log('useEnv - useDevUrls:', useDevUrls);
  console.log('useEnv - devUrls:', devUrls);
  console.log('useEnv - prodUrls:', prodUrls);
  console.log('useEnv - merged urls:', urls);

  return { ...env, ...urls };
};
