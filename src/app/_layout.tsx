import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';

import { AuthProvider } from '@/lib/auth-context';

SplashScreen.preventAutoHideAsync();

/** Max time the splash may wait for an OTA update check + download. */
const UPDATE_WAIT_MS = 8000;

/**
 * Check for an EAS Update while the splash is up and reload into it, so a
 * fresh install (or any launch after a publish) shows the newest JS on the
 * FIRST open instead of the second. Native auto-check is ON_ERROR_RECOVERY
 * (app.json) so it doesn't race this. Gives up after UPDATE_WAIT_MS; a
 * download still finishing afterwards applies on the next launch.
 */
function useLaunchUpdate(): boolean {
  const [done, setDone] = useState(!Updates.isEnabled);

  useEffect(() => {
    if (Updates.isEnabled === false) return;
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      setDone(true);
    }, UPDATE_WAIT_MS);

    (async () => {
      try {
        const check = await Updates.checkForUpdateAsync();
        if (check.isAvailable) {
          await Updates.fetchUpdateAsync();
          if (!timedOut) {
            await Updates.reloadAsync();
            return;
          }
        }
      } catch {
        // offline / server hiccup → just launch the bundle we have
      }
      clearTimeout(timer);
      setDone(true);
    })();

    return () => clearTimeout(timer);
  }, []);

  return done;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const updateChecked = useLaunchUpdate();
  const ready = fontsLoaded && updateChecked;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <AuthProvider>
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="check-email" />
        <Stack.Screen name="paywall" />
        <Stack.Screen name="home" />
        <Stack.Screen name="platnosc" />
      </Stack>
    </AuthProvider>
  );
}
