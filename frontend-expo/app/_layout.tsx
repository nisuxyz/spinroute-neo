import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { UserSettingsProvider } from '@/contexts/user-settings-context';
import { IAPProvider } from '@/hooks/use-iap';
import { EnvProvider, useEnv } from '@/hooks/use-env';
import { PaywallProvider, usePaywall } from '@/hooks/use-paywall';
import { Provider as SupabaseProvider } from 'react-supabase';
import { supabase } from '@/utils/supabase';
import { Paywall } from '@/components/Paywall';
import Mapbox from '@rnmapbox/maps';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MenuProvider } from 'react-native-popup-menu';
import { PortalHost } from '@rn-primitives/portal';
import * as SplashScreen from 'expo-splash-screen';
import '../global.css';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

// function RootLayoutNav() {
//   const { user, loading } = useAuth();
//   const { isVisible, hidePaywall } = usePaywall();
//   const segments = useSegments();
//   const router = useRouter();

//   useEffect(() => {
//     if (loading) return;

//     const inAuthGroup = segments[0] === 'auth';

//     if (!user && !inAuthGroup) {
//       // Redirect to auth if not signed in
//       router.replace('/auth');
//     } else if (user && inAuthGroup) {
//       // Redirect to app if signed in
//       router.replace('/');
//     }
//   }, [user, loading, segments, router]);

//   if (loading) {
//     return (
//       <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
//         <ActivityIndicator size="large" />
//       </View>
//     );
//   }

//   return (
//     <GestureHandlerRootView style={{ flex: 1 }}>
//       <MenuProvider>
//         <Stack>
//           <Stack.Screen name="auth" options={{ headerShown: false }} />
//           <Stack.Screen name="" options={{ headerShown: false, title: 'Map' }} />
//           <Stack.Screen name="settings" options={{ title: 'Settings' }} />
//           <Stack.Screen
//             name="trip/[id]"
//             options={{
//               presentation: 'card',
//               animation: 'slide_from_right',
//             }}
//           />
//         </Stack>
//         {/* Global Paywall - controlled by context */}
//         <Paywall visible={isVisible} onClose={hidePaywall} />
//       </MenuProvider>
//     </GestureHandlerRootView>
//   );
// }

function MapboxInitializer() {
  const env = useEnv();

  useEffect(() => {
    if (!env.MAPBOX_ACCESS_TOKEN) {
      console.warn('Mapbox access token not configured');
      return;
    }

    // Initialize the map view
    Mapbox.setAccessToken(env.MAPBOX_ACCESS_TOKEN);
    Mapbox.setTelemetryEnabled(false);
  }, [env.MAPBOX_ACCESS_TOKEN]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  // const [loaded] = useFonts({
  //   SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  // });
  const loaded = true;

  useEffect(() => {
    if (loaded) {
      SplashScreen.hide();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <SupabaseProvider value={supabase}>
      <AuthProvider>
        <UserSettingsProvider>
          <EnvProvider>
            <MapboxInitializer />
            <IAPProvider>
              <PaywallProvider>
                <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                  <Stack>
                    <Stack.Screen name="index" options={{ headerShown: false, title: 'Map' }} />
                  </Stack>
                  <StatusBar style="auto" />
                  <PortalHost />
                </ThemeProvider>
              </PaywallProvider>
            </IAPProvider>
          </EnvProvider>
        </UserSettingsProvider>
      </AuthProvider>
    </SupabaseProvider>
  );
}
