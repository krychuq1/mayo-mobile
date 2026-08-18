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
import { authApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  describePurchaseError,
  nativeBillingAvailable,
  purchaseSubscription,
} from '@/lib/purchases';
import { colors, fonts } from '@/lib/theme';

const POLL_MS = 3000;

/**
 * Trial paywall (Claude Design templates/paywall/Paywall.dc.html): shown to a
 * signed-in user who never started the 7-day trial. "zaczynamy!" opens the
 * native store payment sheet via RevenueCat; the RevenueCat → mayo-ba webhook
 * records the purchase and the 3s poll here lets the user through to the feed.
 * Store billing only — in Expo Go (no native module) grant dev access by
 * inserting an app-subscription Purchase row into the local DB.
 */
export default function PaywallScreen() {
  const { status, token, hasAccess, refreshAccess, signOut } = useAuth();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Guards: lost session → gate; trial started (webhook landed) → feed.
  useEffect(() => {
    if (status !== 'signedIn') router.replace('/');
    else if (hasAccess) router.replace('/home');
  }, [status, hasAccess]);

  const check = useCallback(async () => {
    try {
      await refreshAccess();
    } catch {
      // ignore transient errors; keep polling
    }
  }, [refreshAccess]);

  // Poll for the completed checkout; also re-check on app foreground
  // (the user comes back from the Stripe browser tab).
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

  const startTrial = useCallback(async () => {
    if (!token) return;
    if (!nativeBillingAvailable()) {
      setError('Płatności działają w aplikacji z Google Play 😅');
      return;
    }
    // Breadcrumbs to the server log — store billing runs entirely on-device,
    // so this is the only way to see remotely where a purchase gets stuck.
    const log = (message: string) => {
      authApi.clientLog(token, `paywall: ${message}`).catch(() => {});
    };
    setStarting(true);
    setError(null);
    log('CTA pressed');
    try {
      // Native Google/Apple payment sheet via RevenueCat. The RevenueCat →
      // mayo-ba webhook records the purchase; the poll below flips hasAccess
      // and routes to the feed.
      const result = await purchaseSubscription(log);
      log(`result: ${result}`);
      if (result === 'purchased') check();
    } catch (e) {
      log(`error: ${describePurchaseError(e)}`);
      setError('Nie udało się otworzyć płatności 😕 Spróbuj ponownie.');
    } finally {
      setStarting(false);
    }
  }, [token, check]);

  return (
    <Screen>
      <View style={styles.header}>
        <MayoLogo width={73} />
      </View>

      <View style={styles.body}>
        <View style={styles.card}>
          <View style={styles.intro}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>7 DNI ZA 0 ZŁ</Text>
            </View>
            <Text style={styles.title}>Rozpocznij 7 dniowy trial</Text>
            <Text style={styles.subtitle}>
              Pełny dostęp do wszystkich fitów i filtrów. Możesz zrezygnować w
              każdej chwili — bez pytań, bez haczyków.
            </Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Po trialu</Text>
            <Text>
              <Text style={styles.priceValue}>45,00 zł</Text>
              <Text style={styles.priceUnit}>/mies.</Text>
            </Text>
          </View>

          <View style={styles.actions}>
            <Pressable
              style={[styles.button, starting && styles.buttonDisabled]}
              onPress={startTrial}
              disabled={starting}>
              {starting ? (
                <ActivityIndicator color={colors.fontWhite} />
              ) : (
                <Text style={styles.buttonText}>zaczynamy!</Text>
              )}
            </Pressable>
            {error && <Text style={styles.error}>{error}</Text>}
            <Text style={styles.caption}>
              Bez zobowiązań. Anulujesz kiedy chcesz.
            </Text>
            <Pressable onPress={signOut} hitSlop={8}>
              <Text style={styles.link}>nie teraz, dzięki</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // row + justifyContent so MayoLogo's own alignSelf can't win — design centers it
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: 24,
    paddingBottom: 20,
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 32,
    justifyContent: 'center',
  },
  // DS .card: white, radius 16, soft shadow
  card: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 20,
    gap: 22,
    shadowColor: colors.text,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  intro: { gap: 8 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  badgeText: {
    color: colors.fontWhite,
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.88,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontFamily: fonts.bold,
    color: colors.heading,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: fonts.regular,
    color: colors.muted,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.inputBorder,
    paddingTop: 16,
  },
  priceLabel: { fontSize: 14, fontFamily: fonts.semiBold, color: colors.text },
  priceValue: { fontSize: 20, fontFamily: fonts.bold, color: colors.primary },
  priceUnit: { fontSize: 13, fontFamily: fonts.regular, color: colors.muted },
  actions: { alignItems: 'center', gap: 10 },
  // DS .btn: orange pill, semibold, full width
  button: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 28,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#FAFAFA', fontSize: 16, fontFamily: fonts.semiBold },
  error: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.error,
    textAlign: 'center',
  },
  caption: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.muted,
    textAlign: 'center',
  },
  link: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.heading,
    textDecorationLine: 'underline',
  },
});
