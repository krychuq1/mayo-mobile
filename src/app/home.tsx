import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { MayoLogo } from '@/components/mayo-logo';
import { Screen } from '@/components/screen';
import { VintedItemCard } from '@/components/vinted-item-card';
import { vintedApi, type VintedItem } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { colors, fonts } from '@/lib/theme';

export default function HomeScreen() {
  const { status, signOut } = useAuth();

  const [items, setItems] = useState<VintedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Each feed card fills the whole list viewport; measured via onLayout.
  const [listHeight, setListHeight] = useState(0);

  // Guard: if we ever lose the session, bounce back to the gate.
  useEffect(() => {
    if (status !== 'signedIn') router.replace('/');
  }, [status]);

  const load = useCallback(async () => {
    setError(null);
    try {
      setItems(await vintedApi.getGeneral());
    } catch {
      setError('Nie udało się pobrać przedmiotów 😕');
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <Screen>
      <View style={styles.topBar}>
        <MayoLogo />
        <Pressable onPress={signOut} hitSlop={8}>
          <Text style={styles.signOut}>Wyloguj się</Text>
        </Pressable>
      </View>

      <View
        style={styles.feed}
        onLayout={(e) => setListHeight(e.nativeEvent.layout.height)}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.stateText}>{error}</Text>
            <Pressable onPress={refresh} hitSlop={8}>
              <Text style={styles.retry}>spróbuj ponownie</Text>
            </Pressable>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.stateText}>
              na razie pusto 👀 wpadnij później
            </Text>
          </View>
        ) : (
          listHeight > 0 && (
            <FlatList
              data={items}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <VintedItemCard item={item} height={listHeight} />
              )}
              pagingEnabled
              decelerationRate="fast"
              showsVerticalScrollIndicator={false}
              getItemLayout={(_, index) => ({
                length: listHeight,
                offset: listHeight * index,
                index,
              })}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={refresh}
                  tintColor={colors.primary}
                  colors={[colors.primary]}
                />
              }
            />
          )
        )}
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
  signOut: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.heading,
  },
  feed: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  stateText: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.text,
    textAlign: 'center',
  },
  retry: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: colors.primary,
  },
});
