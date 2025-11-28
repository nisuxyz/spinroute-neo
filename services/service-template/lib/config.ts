interface Config {
  port: number;
  environment: string;
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
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
  };
}

export const config = getConfig();
