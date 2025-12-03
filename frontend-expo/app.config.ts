import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'spinroute-neo',
  slug: 'spinroute-neo',
  owner: 'itsnisu',
  version: '0.0.1',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'spinroute-neo',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'xyz.itsnisu.spinroute',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
    entitlements: {
      'com.apple.developer.applesignin': ['Default'],
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    permissions: [
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
    ],
    package: 'xyz.itsnisu.spinroute',
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
        dark: {
          backgroundColor: '#000000',
        },
      },
    ],
    'expo-sqlite',
    [
      '@rnmapbox/maps',
      {
        // RNMapboxMapsDownloadToken:
        //   "sk.eyJ1IjoibmlzYXJnajk1IiwiYSI6ImNtZ2hpeWJqbzA4YWgybW9vcmlqNnpjMHcifQ.3a2MPSgWmXdjfqPqW6YD3w",
        RNMapboxMapsDownloadToken: process.env.MAPBOX_DOWNLOAD_TOKEN,
        RNMapboxMapsVersion: '11.8.0',
        RNMapboxMapsImpl: 'mapbox',
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission: 'Show current location on map.',
      },
    ],
    'expo-font',
    'expo-web-browser',
    'expo-iap',
    // build config for android iap
    [
      'expo-build-properties',
      {
        android: {
          kotlinVersion: '2.1.20',
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    router: {},
    eas: {
      projectId: '8c134337-7111-4fa9-851c-e81b063c4d4b',
    },
  },
});
