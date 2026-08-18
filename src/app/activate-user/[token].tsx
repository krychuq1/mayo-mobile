import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { MayoLogo } from '@/components/mayo-logo';
import { Screen } from '@/components/screen';
import { authApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  colors,
  fonts,
  primaryButtonStyle,
  primaryButtonTextStyle,
} from '@/lib/theme';

const POLL_MS = 1000;

/**
 * Android App Link target for the magic-link email
 * (https://server.mayo-app.com/activate-user/<token> opens the app here
 * instead of the browser). Activates the token against the backend, then
 * waits for the auth context to pick the sign-in up and routes to the feed.
 */
export default function ActivateUserScreen() {
  const { token: linkToken } = useLocalSearchParams<{ token: string }>();
  const { status, refreshActivation } = useAuth();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    authApi.activateToken(String(linkToken)).catch(() => {
      if (!cancelled) setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [linkToken]);

  // The auth context doesn't know activation just happened — nudge it until
  // the status flips (cold-start bootstrap may also flip it on its own).
  useEffect(() => {
    if (failed) return;
    if (status === 'signedIn') {
      router.replace('/');
      return;
    }
    if (status === 'signedOut') {
      // No stored token on THIS device (link requested elsewhere) — the other
      // device's polling picks the activation up; here we go to login.
      router.replace('/login');
      return;
    }
    const interval = setInterval(() => {
      refreshActivation().catch(() => {});
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [status, failed, refreshActivation]);

  return (
    <Screen>
      <View style={styles.header}>
        <MayoLogo />
      </View>
      <View style={styles.container}>
        {failed ? (
          <>
            <Text style={styles.emoji}>😬</Text>
            <Text style={styles.title}>Ups!</Text>
            <Text style={styles.subtitle}>
              Link jest nieprawidłowy albo wygasł.{'\n'}Poproś o nowy w
              aplikacji.
            </Text>
            <Pressable
              style={styles.button}
              onPress={() => router.replace('/')}>
              <Text style={styles.buttonText}>wróć</Text>
            </Pressable>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.title}>Logujemy Cię… 🎉</Text>
            <Text style={styles.subtitle}>Sekundka, już wpuszczamy.</Text>
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 24, paddingTop: 12 },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 14,
  },
  emoji: { fontSize: 56 },
  title: { fontSize: 24, fontFamily: fonts.bold, color: colors.heading },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: fonts.regular,
    color: colors.text,
    textAlign: 'center',
  },
  button: {
    ...primaryButtonStyle,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  buttonText: primaryButtonTextStyle,
});
