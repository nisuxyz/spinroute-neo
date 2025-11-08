import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import Mapbox from '@rnmapbox/maps';

export const unstable_settings = {
  anchor: '(tabs)',
};

console.log({ env: process.env });
// Mapbox.setWellKnownTileServer("https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json");
Mapbox.setAccessToken(process.env.MAPBOX_TOKEN!);
Mapbox.setTelemetryEnabled(false);

export default function RootLayout() {
  const colorScheme = useColorScheme();

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
