import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { HomeLogo } from '@/components/home-logo';
import { ProfileMenu } from '@/components/profile-menu';
import { Screen } from '@/components/screen';
import { useAuth } from '@/lib/auth-context';
import {
  getSubscriptionInfo,
  getSubscriptionPrice,
  type SubscriptionInfo,
} from '@/lib/purchases';
import { colors, fonts } from '@/lib/theme';

/**
 * "Subskrypcja" profile screen — Claude Design template
 * templates/my-subscription/MySubscription.dc.html: account, plan + status
 * badge, price, next payment, manage CTA. Store-billed subscriptions are
 * cancelled in the store itself (Play policy), so the CTA deep-links to
 * Google Play's subscription manager. After a cancel, Play → RevenueCat →
 * mayo-ba EXPIRATION webhook revokes access at period end.
 */
const PLAY_SUBSCRIPTIONS_URL =
  'https://play.google.com/store/account/subscriptions?sku=mayo_monthly&package=com.mayoapp.mobile';
// iOS equivalent for later: https://apps.apple.com/account/subscriptions
const IOS_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';

const PLAN_NAME = 'Mayo Standard';
// Shown only while the store price is unknown (Expo Go) — the real,
// VAT-inclusive price comes from the RevenueCat offering (Play base plan).
const FALLBACK_PRICE = '45,00 zł';

const MONTHS_GENITIVE = [
  'stycznia',
  'lutego',
  'marca',
  'kwietnia',
  'maja',
  'czerwca',
  'lipca',
  'sierpnia',
  'września',
  'października',
  'listopada',
  'grudnia',
];

/** "18 września 2026" — Polish genitive month, no Intl dependency. */
function formatDatePl(d: Date): string {
  return `${d.getDate()} ${MONTHS_GENITIVE[d.getMonth()]} ${d.getFullYear()}`;
}

export default function PlatnoscScreen() {
  const { status, user, hasAccess, signOut } = useAuth();
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [price, setPrice] = useState(FALLBACK_PRICE);

  useEffect(() => {
    if (status !== 'signedIn') router.replace('/');
  }, [status]);

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

  // Billing schedule lives in RevenueCat (null in Expo Go → row hidden).
  useEffect(() => {
    let cancelled = false;
    getSubscriptionInfo()
      .then((info) => {
        if (!cancelled) setSub(info);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [hasAccess]);

  const manage = () => {
    Linking.openURL(
      Platform.OS === 'ios' ? IOS_SUBSCRIPTIONS_URL : PLAY_SUBSCRIPTIONS_URL,
    ).catch(() => {});
  };

  const active = hasAccess === true;
  const cancelled = active && sub !== null && !sub.willRenew;
  const badgeLabel = !active ? 'Nieaktywna' : cancelled ? 'Anulowana' : 'Aktywna';
  const dateLabel = cancelled ? 'Dostęp do' : 'Kolejna płatność';

  return (
    <Screen>
      <View style={styles.topBar}>
        <HomeLogo />
        <ProfileMenu onSignOut={signOut} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.card}>
          <View style={styles.intro}>
            <Text style={styles.title}>Subskrypcja</Text>
            <Text style={styles.line} numberOfLines={1}>
              Konto: {user?.email ?? ''}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.line}>Plan: {PLAN_NAME}</Text>
            <View
              style={[
                styles.badge,
                !active && styles.badgeInactive,
                cancelled && styles.badgeCancelled,
              ]}>
              <Text
                style={[
                  styles.badgeText,
                  !active && styles.badgeTextInactive,
                  cancelled && styles.badgeTextCancelled,
                ]}>
                {badgeLabel}
              </Text>
            </View>
          </View>

          <View style={styles.rowBaseline}>
            <Text style={styles.line}>Cena</Text>
            <Text style={styles.line}>
              <Text style={styles.strong}>{price}</Text> / mies.
            </Text>
          </View>

          {sub?.expirationDate && (
            <View style={styles.rowBaseline}>
              <Text style={styles.line}>{dateLabel}</Text>
              <Text style={styles.strong}>{formatDatePl(sub.expirationDate)}</Text>
            </View>
          )}

          <View style={styles.actions}>
            <Pressable style={styles.button} onPress={manage}>
              <Text style={styles.buttonText}>Zarządzaj subskrypcją</Text>
            </Pressable>
            <Text style={styles.caption}>
              Subskrypcją zarządzasz w Google Play — tam możesz ją anulować w
              każdej chwili. Dostęp działa do końca opłaconego okresu.
            </Text>
          </View>
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
  card: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 20,
    gap: 18,
    shadowColor: colors.text,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  intro: {
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.inputBorder,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontFamily: fonts.bold,
    color: colors.heading,
  },
  line: { fontSize: 15, fontFamily: fonts.regular, color: colors.text },
  strong: { fontSize: 15, fontFamily: fonts.bold, color: colors.text },
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
  badge: {
    backgroundColor: '#D9F2DF',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  badgeInactive: { backgroundColor: '#EDEDED' },
  badgeCancelled: { backgroundColor: '#FFECBC' },
  badgeText: { fontSize: 14, fontFamily: fonts.bold, color: '#1A7F37' },
  badgeTextInactive: { color: colors.muted },
  badgeTextCancelled: { color: '#9B7556' },
  actions: { alignItems: 'center', gap: 12 },
  button: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 28,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  buttonText: { color: '#FAFAFA', fontSize: 16, fontFamily: fonts.semiBold },
  caption: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: fonts.regular,
    color: colors.muted,
    textAlign: 'center',
  },
});
