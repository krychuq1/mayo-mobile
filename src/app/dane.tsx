import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { MayoLogo } from '@/components/mayo-logo';
import { ProfileMenu } from '@/components/profile-menu';
import { Screen } from '@/components/screen';
import { authApi, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { colors, fonts } from '@/lib/theme';

const PRIVACY_POLICY_URL = 'https://mayo-app.com/privacy-policy';
const TERMS_URL = 'https://mayo-app.com/terms-and-conditions';

/**
 * "Moje dane" profile screen — Claude Design template
 * templates/personal-data/PersonalData.dc.html: account e-mail, document
 * links (privacy policy + terms) and account deletion — both required by
 * Google Play (in-app privacy link + in-app account deletion). Deleting does
 * NOT cancel a Play subscription, hence the warning copy.
 */
export default function DaneScreen() {
  const { status, user, token, signOut } = useAuth();
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (status !== 'signedIn') router.replace('/');
  }, [status]);

  const open = (url: string) => () => {
    Linking.openURL(url).catch(() => {});
  };

  const confirmDelete = () => {
    if (deleting) return;
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
        <MayoLogo width={73} />
        <ProfileMenu onSignOut={signOut} />
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.section}>
            <Text style={styles.heading}>Moje dane</Text>
            <View style={styles.emailRow}>
              <Text style={styles.emailLabel}>Email</Text>
              <Text style={styles.emailValue} numberOfLines={1}>
                {user?.email ?? ''}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.heading}>Dokumenty</Text>
            <DocLink
              label="Polityka prywatności"
              onPress={open(PRIVACY_POLICY_URL)}
            />
            <DocLink label="Regulamin" onPress={open(TERMS_URL)} />
          </View>
        </View>

        <View style={styles.danger}>
          <Pressable
            style={[styles.deleteLink, deleting && styles.disabled]}
            onPress={confirmDelete}
            disabled={deleting}
            hitSlop={8}
            accessibilityRole="button">
            <Image
              source={require('../../assets/images/alert-octagon.svg')}
              style={styles.deleteIcon}
            />
            <Text style={styles.deleteText}>
              {deleting ? 'Usuwanie…' : 'Usuń konto'}
            </Text>
          </Pressable>
          <Text style={styles.caption}>
            Usunięcie konta jest nieodwracalne. Subskrypcję anulujesz osobno w
            Google Play (zakładka płatność).
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

function DocLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      style={styles.docLink}
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="link">
      <Text style={styles.docLinkText}>{label}</Text>
      <Image
        source={require('../../assets/images/arrow-up-right.svg')}
        style={styles.docLinkIcon}
      />
    </Pressable>
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
    gap: 20,
    shadowColor: colors.text,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  section: { gap: 14 },
  heading: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: fonts.bold,
    color: colors.heading,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.inputBorder,
    paddingBottom: 16,
  },
  emailLabel: { fontSize: 14, fontFamily: fonts.regular, color: colors.muted },
  emailValue: {
    flexShrink: 1,
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  docLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  docLinkText: { fontSize: 15, fontFamily: fonts.semiBold, color: colors.text },
  docLinkIcon: { width: 14, height: 14 },
  danger: {
    alignItems: 'center',
    gap: 12,
    paddingTop: 32,
    paddingHorizontal: 24,
  },
  deleteLink: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  disabled: { opacity: 0.6 },
  deleteIcon: { width: 18, height: 18 },
  deleteText: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.text,
    textDecorationLine: 'underline',
  },
  caption: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: fonts.regular,
    color: colors.muted,
    textAlign: 'center',
  },
});
