import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { HomeLogo } from '@/components/home-logo';
import { ProfileMenu } from '@/components/profile-menu';
import { Screen } from '@/components/screen';
import { authApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  describePurchaseError,
  getSubscriptionPrice,
  nativeBillingAvailable,
  purchaseSubscription,
} from '@/lib/purchases';
import { colors, fonts } from '@/lib/theme';

const POLL_MS = 3000;
// Shown only while the store price is unknown (Expo Go) — the real,
// VAT-inclusive price comes from the RevenueCat offering (Play base plan).
const FALLBACK_PRICE = '45,00 zł';

const BENEFITS = [
  'Pełny dostęp do wszystkich rzeczy i filtrów',
  'Co miesiąc minimum 15 nowych rzeczy',
  'Anulujesz jednym kliknięciem bez ukrytych opłat',
];

/**
 * Trial paywall (Claude Design templates/paywall/Paywall.dc.html): shown to a
 * signed-in user who never started the 7-day trial. "Wypróbuj za 0 zł" opens
 * the native store payment sheet via RevenueCat; the RevenueCat → mayo-ba
 * webhook records the purchase and the 3s poll here lets the user through to
 * the feed. Store billing only — in Expo Go (no native module) grant dev
 * access by inserting an app-subscription Purchase row into the local DB.
 */
export default function PaywallScreen() {
  const { status, token, hasAccess, refreshAccess, signOut } = useAuth();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [price, setPrice] = useState(FALLBACK_PRICE);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSubscriptionPrice()
      .then((p) => {
        if (!cancelled && p) setPrice(p.priceString);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

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

  // Poll for the recorded purchase; also re-check on app foreground
  // (the user comes back from the store payment sheet).
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
      <View style={styles.topBar}>
        <HomeLogo />
        <ProfileMenu onSignOut={signOut} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.card}>
          <View style={styles.intro}>
            <Text style={styles.title}>
              Rozpocznij 7-dniowy okres próbny za 0 zł
            </Text>
            <View style={styles.benefits}>
              {BENEFITS.map((b) => (
                <View key={b} style={styles.benefit}>
                  <Image
                    source={require('../../assets/images/check-muted.svg')}
                    style={styles.benefitIcon}
                  />
                  <Text style={styles.benefitText}>{b}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.nowBlock}>
            <View style={styles.row}>
              <Text style={styles.line}>Aktualnie</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>0,00 zł</Text>
              </View>
            </View>
            <Text style={styles.note}>
              Dziś pobieramy 0 zł. Przypomnimy Ci o końcu okresu próbnego 2 dni
              wcześniej
            </Text>
          </View>

          <View style={styles.rowBaseline}>
            <Text style={styles.line}>Po okresie próbnym</Text>
            <Text style={styles.line}>{price} / mies.</Text>
          </View>

          <View style={styles.actions}>
            <Pressable
              style={[styles.button, starting && styles.buttonDisabled]}
              onPress={startTrial}
              disabled={starting}>
              {starting ? (
                <ActivityIndicator color={colors.fontWhite} />
              ) : (
                <Text style={styles.buttonText}>Wypróbuj za 0 zł</Text>
              )}
            </Pressable>
            {error && <Text style={styles.error}>{error}</Text>}
            <Text style={styles.caption}>
              Brak ukrytych opłat. Anuluj w dowolnym momencie.
            </Text>
          </View>
        </View>

        <View style={styles.dismiss}>
          <Pressable onPress={signOut} hitSlop={8} accessibilityRole="link">
            <Text style={styles.dismissText}>Nie teraz, dzięki</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
    zIndex: 30,
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
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
    gap: 20,
    shadowColor: colors.text,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  intro: {
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.inputBorder,
    paddingBottom: 18,
  },
  title: {
    fontSize: 24,
    lineHeight: 31,
    fontFamily: fonts.bold,
    color: colors.heading,
  },
  benefits: { gap: 6 },
  benefit: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  benefitIcon: { width: 16, height: 16, marginTop: 3 },
  benefitText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  nowBlock: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowBaseline: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  line: { fontSize: 15, fontFamily: fonts.regular, color: colors.text },
  badge: {
    backgroundColor: '#D9F2DF',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  badgeText: { fontSize: 14, fontFamily: fonts.bold, color: '#1A7F37' },
  note: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: fonts.regular,
    color: colors.muted,
  },
  actions: { alignItems: 'center', gap: 12 },
  // DS .btn: orange pill, semibold, full width
  button: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 28,
    paddingVertical: 12,
    paddingHorizontal: 24,
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
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.muted,
    textAlign: 'center',
  },
  dismiss: { alignItems: 'center', paddingTop: 28 },
  dismissText: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.text,
    textDecorationLine: 'underline',
  },
});
