import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { MayoLogo } from '@/components/mayo-logo';
import { Screen } from '@/components/screen';
import { useAuth } from '@/lib/auth-context';
import { colors, fonts } from '@/lib/theme';

/**
 * "płatność" profile screen: subscription status + management. Store-billed
 * subscriptions are cancelled in the store itself (Play policy), so the CTA
 * deep-links to Google Play's subscription manager. After a cancel, Play →
 * RevenueCat → mayo-ba EXPIRATION webhook revokes access at period end.
 */
const PLAY_SUBSCRIPTIONS_URL =
  'https://play.google.com/store/account/subscriptions?sku=mayo_monthly&package=com.mayoapp.mobile';
// iOS equivalent for later: https://apps.apple.com/account/subscriptions
const IOS_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';

export default function PlatnoscScreen() {
  const { status, user, hasAccess } = useAuth();

  useEffect(() => {
    if (status !== 'signedIn') router.replace('/');
  }, [status]);

  const manage = () => {
    Linking.openURL(
      Platform.OS === 'ios' ? IOS_SUBSCRIPTIONS_URL : PLAY_SUBSCRIPTIONS_URL,
    ).catch(() => {});
  };

  return (
    <Screen>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Image
            source={require('../../assets/images/arrow-back.svg')}
            style={styles.backIcon}
          />
        </Pressable>
        <MayoLogo width={73} />
        <View style={styles.backIcon} />
      </View>

      <View style={styles.body}>
        <View style={styles.card}>
          <View style={styles.intro}>
            <Text style={styles.title}>płatność</Text>
            {user?.email && <Text style={styles.subtitle}>{user.email}</Text>}
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Subskrypcja Mayo</Text>
            <View
              style={[styles.badge, !hasAccess && styles.badgeInactive]}>
              <Text style={styles.badgeText}>
                {hasAccess ? 'AKTYWNA' : 'NIEAKTYWNA'}
              </Text>
            </View>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Cena</Text>
            <Text>
              <Text style={styles.priceValue}>45,00 zł</Text>
              <Text style={styles.priceUnit}>/mies.</Text>
            </Text>
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.button} onPress={manage}>
              <Text style={styles.buttonText}>zarządzaj subskrypcją</Text>
            </Pressable>
            <Text style={styles.caption}>
              Subskrypcją zarządzasz w Google Play — tam możesz ją anulować w
              każdej chwili. Dostęp działa do końca opłaconego okresu.
            </Text>
          </View>
        </View>
      </View>
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
  },
  backIcon: { width: 22, height: 22 },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 32,
    justifyContent: 'center',
  },
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
  intro: { gap: 4 },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontFamily: fonts.bold,
    color: colors.heading,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.muted,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.inputBorder,
    paddingTop: 16,
  },
  statusLabel: { fontSize: 14, fontFamily: fonts.semiBold, color: colors.text },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  badgeInactive: { backgroundColor: colors.muted },
  badgeText: {
    color: colors.fontWhite,
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.88,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  priceLabel: { fontSize: 14, fontFamily: fonts.semiBold, color: colors.text },
  priceValue: { fontSize: 20, fontFamily: fonts.bold, color: colors.primary },
  priceUnit: { fontSize: 13, fontFamily: fonts.regular, color: colors.muted },
  actions: { alignItems: 'center', gap: 12 },
  button: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 28,
    padding: 16,
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
