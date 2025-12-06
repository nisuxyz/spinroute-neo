import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'spinroute',
  slug: 'spinroute-neo',
  owner: 'itsnisu',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'spinroute',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'xyz.itsnisu.spinroute',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      UIBackgroundModes: ['location'],
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
      'android.permission.ACCESS_BACKGROUND_LOCATION',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_LOCATION',
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
        locationAlwaysAndWhenInUsePermission:
          'Allow SpinRoute to access your location to record trips and track your rides, even when the app is in the background.',
        locationAlwaysPermission:
          'Allow SpinRoute to access your location in the background to continue recording your trip when the app is not in use.',
        locationWhenInUsePermission:
          'Allow SpinRoute to access your location to show your position on the map and record trips.',
        isIosBackgroundLocationEnabled: true,
        isAndroidBackgroundLocationEnabled: true,
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
