import { router } from 'expo-router';
import { Pressable } from 'react-native';

import { MayoLogo } from '@/components/mayo-logo';
import { useAuth } from '@/lib/auth-context';

/**
 * Top-bar logo that acts as a "home" link: subscribers go to the feed,
 * everyone else to the paywall (the index gate's rule). `navigate` (not push)
 * so an existing feed screen is reused instead of stacked.
 */
export function HomeLogo({ width = 73 }: { width?: number }) {
  const { hasAccess } = useAuth();
  return (
    <Pressable
      onPress={() => router.navigate(hasAccess ? '/home' : '/paywall')}
      hitSlop={8}
      accessibilityRole="link"
      accessibilityLabel="strona główna">
      <MayoLogo width={width} />
    </Pressable>
  );
}
