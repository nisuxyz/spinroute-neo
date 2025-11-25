import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import Mapbox from '@rnmapbox/maps';
import { useEffect } from 'react';

export const unstable_settings = {
  anchor: '(tabs)',
};

// Mapbox.setWellKnownTileServer("https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json");
// Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN!);
// Mapbox.setTelemetryEnabled(false);

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Initialize the map view
    console.log({ env: process.env, token: process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN });
    Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN!);
    Mapbox.setTelemetryEnabled(false);
    // Mapbox.setAccessToken('YOUR_MAPBOX_ACCESS_TOKEN');
    // const mapboxMap = new Mapbox({
    //   style: 'mapbox://styles/mapbox/streets-v11',
    //   center: [-122.084051, 37.385348],
    //   zoom: 12,
    // });
    // setMap(mapboxMap);
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
