import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { MayoLogo } from '@/components/mayo-logo';
import { Screen } from '@/components/screen';
import { authApi, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { colors, fonts } from '@/lib/theme';

const PRIVACY_POLICY_URL = 'https://mayo-app.com/privacy-policy';

/**
 * "dane" profile screen: account e-mail, privacy-policy link and account
 * deletion — both required by Google Play (in-app privacy link + in-app
 * account deletion). Deleting does NOT cancel a Play subscription, hence
 * the warning copy.
 */
export default function DaneScreen() {
  const { status, user, token, signOut } = useAuth();
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (status !== 'signedIn') router.replace('/');
  }, [status]);

  const openPrivacyPolicy = () => {
    Linking.openURL(PRIVACY_POLICY_URL).catch(() => {});
  };

  const confirmDelete = () => {
    Alert.alert(
      'usunąć konto?',
      'to jest nieodwracalne — znikną wszystkie Twoje dane. aktywną subskrypcję anuluj osobno w Google Play.',
      [
        { text: 'nie, zostaję', style: 'cancel' },
        {
          text: 'tak, usuń',
          style: 'destructive',
          onPress: () => void deleteAccount(),
        },
      ],
    );
  };

  const deleteAccount = async () => {
    if (!token || deleting) return;
    setDeleting(true);
    try {
      await authApi.deleteAccount(token);
      Alert.alert('konto usunięte 👋', 'dzięki, że byłaś/eś z nami!');
      await signOut(); // index gate routes back to login
    } catch (e) {
      setDeleting(false);
      const message =
        e instanceof ApiError && e.status !== 0
          ? 'coś poszło nie tak — spróbuj ponownie za chwilę.'
          : 'brak połączenia z serwerem — sprawdź internet i spróbuj ponownie.';
      Alert.alert('ups 😬', message);
    }
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
            <Text style={styles.title}>dane</Text>
            {user?.email && <Text style={styles.subtitle}>{user.email}</Text>}
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>E-mail</Text>
            <Text style={styles.rowValue} numberOfLines={1}>
              {user?.email ?? ''}
            </Text>
          </View>

          <Pressable onPress={openPrivacyPolicy} hitSlop={4}>
            <Text style={styles.link}>polityka prywatności</Text>
          </Pressable>

          <View style={styles.actions}>
            <Pressable
              style={[styles.deleteButton, deleting && styles.buttonDisabled]}
              onPress={confirmDelete}
              disabled={deleting}>
              <Text style={styles.deleteButtonText}>
                {deleting ? 'usuwanie…' : 'usuń konto'}
              </Text>
            </Pressable>
            <Text style={styles.caption}>
              Usunięcie konta jest nieodwracalne. Subskrypcję anulujesz
              osobno w Google Play (zakładka płatność).
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.inputBorder,
    paddingTop: 16,
  },
  rowLabel: { fontSize: 14, fontFamily: fonts.semiBold, color: colors.text },
  rowValue: {
    flexShrink: 1,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.muted,
  },
  link: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.heading,
    textDecorationLine: 'underline',
  },
  actions: { alignItems: 'center', gap: 12 },
  deleteButton: {
    width: '100%',
    backgroundColor: colors.error,
    borderRadius: 28,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.7 },
  deleteButtonText: {
    color: '#FAFAFA',
    fontSize: 16,
    fontFamily: fonts.semiBold,
  },
  caption: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: fonts.regular,
    color: colors.muted,
    textAlign: 'center',
  },
});
