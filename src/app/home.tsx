import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { FilterSheet } from '@/components/filter-sheet';
import { MayoLogo } from '@/components/mayo-logo';
import { ProfileMenu } from '@/components/profile-menu';
import { Screen } from '@/components/screen';
import { VintedItemCard } from '@/components/vinted-item-card';
import { vintedApi, type VintedItem, type VintedItemTag } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { colors, fonts } from '@/lib/theme';

export default function HomeScreen() {
  const { status, hasAccess, signOut } = useAuth();

  const [items, setItems] = useState<VintedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Each feed card fills the whole list viewport; measured via onLayout.
  const [listHeight, setListHeight] = useState(0);

  // Filters (Claude Design product-detail template): price range + tags.
  const [filterOpen, setFilterOpen] = useState(false);
  // null = no price filter (full range)
  const [priceRange, setPriceRange] = useState<{ low: number; high: number } | null>(null);
  const [selectedTags, setSelectedTags] = useState<ReadonlySet<VintedItemTag>>(
    new Set(),
  );

  // Guard: if we ever lose the session, bounce back to the gate;
  // no started trial → paywall.
  useEffect(() => {
    if (status !== 'signedIn') router.replace('/');
    else if (hasAccess === false) router.replace('/paywall');
  }, [status, hasAccess]);

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

  const bounds = useMemo(() => {
    if (items.length === 0) return { min: 0, max: 0 };
    const prices = items.map((item) => item.priceWithShipping);
    return {
      min: Math.floor(Math.min(...prices)),
      max: Math.ceil(Math.max(...prices)),
    };
  }, [items]);

  const low = Math.max(bounds.min, priceRange?.low ?? bounds.min);
  const high = Math.min(bounds.max, priceRange?.high ?? bounds.max);

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        const price = item.priceWithShipping;
        const priceOk =
          priceRange == null || (price >= low && price <= high);
        const tagOk =
          selectedTags.size === 0 ||
          item.tags?.some((tag) => selectedTags.has(tag));
        return priceOk && tagOk;
      }),
    [items, priceRange, low, high, selectedTags],
  );

  const clearFilters = () => {
    setPriceRange(null);
    setSelectedTags(new Set());
  };

  const toggleTag = (tag: VintedItemTag) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  };

  return (
    <Screen>
      <View style={styles.topBar}>
        <MayoLogo width={73} />
        <ProfileMenu onSignOut={signOut} />
      </View>

      <View style={styles.filterRow}>
        <Pressable
          style={styles.filterBtn}
          onPress={() => setFilterOpen(true)}
          hitSlop={8}
          accessibilityLabel="filtry">
          <Text style={styles.filterText}>FILTRUJ</Text>
          <Image
            source={require('../../assets/images/filter-sliders.svg')}
            style={styles.filterIcon}
          />
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
        ) : filtered.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.stateText}>
              nic nie pasuje do filtrów 😢
            </Text>
            <Pressable onPress={clearFilters} hitSlop={8}>
              <Text style={styles.retry}>wyczyść filtry</Text>
            </Pressable>
          </View>
        ) : (
          listHeight > 0 && (
            <FlatList
              data={filtered}
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

      <FilterSheet
        visible={filterOpen}
        min={bounds.min}
        max={bounds.max}
        low={low}
        high={high}
        selected={selectedTags}
        onChangeRange={(nextLow, nextHigh) =>
          setPriceRange({ low: nextLow, high: nextHigh })
        }
        onToggleTag={toggleTag}
        onClear={clearFilters}
        onClose={() => setFilterOpen(false)}
      />
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
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterText: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    letterSpacing: 0.84,
    color: colors.text,
  },
  filterIcon: { width: 18, height: 18 },
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
