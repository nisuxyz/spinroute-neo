interface Config {
  port: number;
  environment: string;
  database: {
    url: string;
  };
  auth: {
    secret: string;
    url: string;
    tokenExpiry: string;
  };
  cors: {
    origins: string[];
  };
}

function getConfig(): Config {
  return {
    port: parseInt(process.env.PORT || '3000'),
    environment: process.env.NODE_ENV || 'development',
    database: {
      url: process.env.DATABASE_URL || './pglite',
    },
    auth: {
      secret: process.env.BETTER_AUTH_SECRET || 'dev-secret-change-in-production',
      url: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
      tokenExpiry: process.env.AUTH_TOKEN_EXPIRY || '7d',
    },
    cors: {
      origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    },
  };
}

export const config = getConfig();
