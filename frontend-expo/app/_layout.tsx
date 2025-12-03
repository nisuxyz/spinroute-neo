import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { SubscriptionProvider } from '@/hooks/use-subscription';
import { IAPProvider } from '@/hooks/use-iap';
import { EnvProvider, useEnv } from '@/hooks/use-env';
import Mapbox from '@rnmapbox/maps';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { MenuProvider } from 'react-native-popup-menu';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!user && !inAuthGroup) {
      // Redirect to auth if not signed in
      router.replace('/auth');
    } else if (user && inAuthGroup) {
      // Redirect to app if signed in
      router.replace('/(tabs)');
    }
  }, [user, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <MenuProvider>
        <BottomSheetModalProvider>
          <Stack>
            <Stack.Screen name="auth" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Map' }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            <Stack.Screen name="settings" options={{ title: 'Settings' }} />
            <Stack.Screen
              name="paywall"
              options={{
                presentation: 'modal',
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="trip/[id]"
              options={{
                presentation: 'card',
                animation: 'slide_from_right',
              }}
            />
          </Stack>
        </BottomSheetModalProvider>
      </MenuProvider>
    </GestureHandlerRootView>
  );
}

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

  return (
    <AuthProvider>
      <EnvProvider>
        <MapboxInitializer />
        <SubscriptionProvider>
          <IAPProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <RootLayoutNav />
              <StatusBar style="auto" />
            </ThemeProvider>
          </IAPProvider>
        </SubscriptionProvider>
      </EnvProvider>
    </AuthProvider>
  );
}
