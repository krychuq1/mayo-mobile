import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { MayoLogo } from '@/components/mayo-logo';
import { Screen } from '@/components/screen';
import { useAuth } from '@/lib/auth-context';
import {
  colors,
  fonts,
  primaryButtonStyle,
  primaryButtonTextStyle,
} from '@/lib/theme';

const POLL_MS = 3000;

export default function CheckEmailScreen() {
  const { status, refreshActivation, signOut } = useAuth();
  const [checking, setChecking] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      await refreshActivation();
    } catch {
      // ignore transient errors; keep polling
    } finally {
      setChecking(false);
    }
  }, [refreshActivation]);

  // Poll while waiting; also re-check when the app returns to the foreground.
  useEffect(() => {
    pollRef.current = setInterval(check, POLL_MS);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') check();
    });
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      sub.remove();
    };
  }, [check]);

  // When activation flips to signedIn, leave this screen.
  // Back through the index gate — it decides between the feed and the paywall.
  useEffect(() => {
    if (status === 'signedIn') router.replace('/');
    if (status === 'signedOut') router.replace('/login');
  }, [status]);

  return (
    <Screen>
      <View style={styles.header}>
        <MayoLogo />
      </View>
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.title}>Sprawdź swoją skrzynkę 📬</Text>
        <Text style={styles.subtitle}>
          Wysłaliśmy Ci magic link do logowania. Otwórz go na tym (lub innym)
          urządzeniu — ekran odświeży się automatycznie.
        </Text>

        <Pressable style={styles.button} onPress={check} disabled={checking}>
          <Text style={styles.buttonText}>
            {checking ? 'Sprawdzam…' : 'Kliknęłam/-ąłem link'}
          </Text>
        </Pressable>

        <Pressable style={styles.linkButton} onPress={signOut}>
          <Text style={styles.linkText}>Użyj innego adresu email</Text>
        </Pressable>
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
  linkButton: { paddingVertical: 10 },
  linkText: {
    color: colors.heading,
    fontSize: 15,
    fontFamily: fonts.semiBold,
  },
});
