import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { colors } from '@/lib/theme';
import { useAuth } from '@/lib/auth-context';

/** Entry gate: route to the right screen based on auth status. */
export default function Index() {
  const { status, hasAccess } = useAuth();

  if (status === 'loading') {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  // Paywall gate: signed in but trial never started → paywall instead of the feed.
  if (status === 'signedIn') {
    return <Redirect href={hasAccess ? '/home' : '/paywall'} />;
  }
  if (status === 'pendingActivation') return <Redirect href="/check-email" />;
  return <Redirect href="/login" />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
