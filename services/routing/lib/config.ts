interface Config {
  port: number;
  environment: string;
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
  };
  mapbox: {
    accessToken: string;
    baseUrl: string;
  };
  openrouteservice: {
    apiKey: string;
    baseUrl: string;
  };
  routing: {
    defaultProvider: string;
    requestTimeout: number; // milliseconds
    cacheEnabled: boolean;
    cacheTTL: number; // seconds
  };
}

function getConfig(): Config {
  return {
    port: parseInt(process.env.PORT || '3000'),
    environment: process.env.NODE_ENV || 'development',
    supabase: {
      url: process.env.SUPABASE_URL || '',
      anonKey: process.env.SUPABASE_ANON_KEY || '',
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    },
    mapbox: {
      accessToken: process.env.MAPBOX_ACCESS_TOKEN || '',
      baseUrl: 'https://api.mapbox.com',
    },
    openrouteservice: {
      apiKey: process.env.ORS_API_KEY || '',
      baseUrl: process.env.ORS_BASE_URL || 'https://api.openrouteservice.org',
    },
    routing: {
      defaultProvider: process.env.DEFAULT_PROVIDER || 'mapbox',
      requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '5000'),
      cacheEnabled: process.env.CACHE_ENABLED === 'true',
      cacheTTL: parseInt(process.env.CACHE_TTL || '900'), // 15 minutes
    },
  };
}

export const config = getConfig();
