import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/lib/theme';

/** Brand background: mayo-fe body gradient + safe area. */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <LinearGradient
      colors={[colors.gradientTop, colors.gradientBottom]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.4, y: 1 }}
      style={styles.flex}>
      <SafeAreaView style={styles.flex}>{children}</SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
