interface Config {
  port: number;
  environment: string;
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
  };
  apple: {
    sharedSecret: string;
    bundleId: string;
    environment: 'sandbox' | 'production';
    // Optional: For App Store Server API
    keyId?: string;
    issuerId?: string;
    privateKey?: string;
    appId?: string;
  };
  google: {
    packageName: string;
    clientEmail: string;
    privateKey: string;
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
    apple: {
      sharedSecret: process.env.APPLE_SHARED_SECRET || '',
      bundleId: process.env.APPLE_BUNDLE_ID || 'com.itsnisu.spinrouteneo',
      environment: (process.env.APPLE_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
      keyId: process.env.APPLE_KEY_ID,
      issuerId: process.env.APPLE_ISSUER_ID,
      privateKey: process.env.APPLE_PRIVATE_KEY,
      appId: process.env.APPLE_APP_ID,
    },
    google: {
      packageName: process.env.GOOGLE_PACKAGE_NAME || 'com.itsnisu.spinrouteneo',
      clientEmail: process.env.GOOGLE_CLIENT_EMAIL || '',
      privateKey: process.env.GOOGLE_PRIVATE_KEY || '',
    },
  };
}

export const config = getConfig();
