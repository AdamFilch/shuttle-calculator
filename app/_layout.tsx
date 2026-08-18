import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import "../global.css";

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { setupDatabase } from '@/services/database';
import { OverlayProvider } from '@gluestack-ui/core/overlay/creator';
import { SQLiteProvider } from 'expo-sqlite';
import { Suspense, useEffect } from 'react';
import { ActivityIndicator } from 'react-native';

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    setupDatabase();
  }, []);

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <GluestackUIProvider mode='light'>
      <OverlayProvider>
        <Suspense fallback={<ActivityIndicator size="large" />}>
          <SQLiteProvider databaseName='db.db' useSuspense>
            <ThemeProvider value={DefaultTheme}>
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="+not-found" />
              </Stack>
              <StatusBar style="auto" />
            </ThemeProvider>
          </SQLiteProvider>
        </Suspense>
      </OverlayProvider>
    </GluestackUIProvider>
  );
}
