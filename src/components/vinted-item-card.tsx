import { Image } from 'expo-image';
import { useState } from 'react';
import {
  FlatList,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { VintedItem, VintedItemTag } from '@/lib/api';
import { colors, fonts, primaryButtonStyle } from '@/lib/theme';

// Per-tag chip colors from the Claude Design product-detail template
// (templates/product-detail/ProductDetail.dc.html).
const TAG_CHIP: Record<
  VintedItemTag,
  { bg: string; text: string; border?: string }
> = {
  tag1: { bg: colors.primary, text: '#FAFAFA' },
  tag2: { bg: colors.heading, text: '#FAFAFA' },
  tag3: { bg: colors.gradientBottom, text: colors.text },
  tag4: { bg: colors.text, text: '#FAFAFA' },
  tag5: { bg: '#FAFAFA', text: colors.text, border: colors.inputBorder },
};

// Flip physics ported from mayo-fe calendar-day.scss: 4.5 spins, fast start / slow stop.
const FLIP_DEG = 1620;
const FLIP_TIMING = {
  duration: 2500,
  easing: Easing.bezier(0.1, 0.9, 0.2, 1),
};

function formatPln(value: number): string {
  return `${value.toFixed(2).replace('.', ',')} zł`;
}

/** Swipeable photo carousel with position dots (single photo → no dots). */
function PhotoCarousel({
  photos,
  placeholder = '🧥',
}: {
  photos: string[];
  placeholder?: string;
}) {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width > 0) {
      setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
    }
  };

  if (photos.length === 0) {
    return (
      <View style={styles.photoPlaceholder}>
        <Text style={styles.photoPlaceholderText}>{placeholder}</Text>
      </View>
    );
  }

  return (
    <View
      style={styles.carousel}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <FlatList
          data={photos}
          keyExtractor={(url, i) => `${i}-${url}`}
          renderItem={({ item: url }) => (
            <Image
              source={{ uri: url }}
              style={{ width, height: '100%' }}
              contentFit="cover"
              transition={200}
            />
          )}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollEnd}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        />
      )}
      {photos.length > 1 && (
        <View style={styles.dots} pointerEvents="none">
          {photos.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === index && styles.dotActive]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

/** One full-height feed slide — Claude Design "Product detail" template:
 *  everything inside a white card (photo carousel, title, meta, CTAs).
 *  "dodaj sosu" flips the whole card (mayo-fe calendar-day spin) to a
 *  full-card sauce carousel with a back arrow. */
export function VintedItemCard({
  item,
  height,
}: {
  item: VintedItem;
  height: number;
}) {
  // 0 = product front, 1 = sauce back
  const spin = useSharedValue(0);
  const [showSauce, setShowSauce] = useState(false);
  // design template: expanding the description hides photo/tags/title/meta
  // so the full text takes over the card ("więcej" / "mniej" chevron toggle)
  const [descOpen, setDescOpen] = useState(false);
  const [descLines, setDescLines] = useState(0);

  const frontStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { rotateY: `${interpolate(spin.value, [0, 1], [0, FLIP_DEG])}deg` },
    ],
  }));
  const backStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { rotateY: `${interpolate(spin.value, [0, 1], [180, 180 + FLIP_DEG])}deg` },
    ],
  }));

  const openSauce = () => {
    setShowSauce(true);
    spin.value = withTiming(1, FLIP_TIMING);
  };
  const closeSauce = () => {
    setShowSauce(false);
    spin.value = withTiming(0, FLIP_TIMING);
  };

  return (
    <View style={[styles.slide, { height }]}>
      <View style={styles.scene}>
        <Animated.View
          style={[styles.face, frontStyle]}
          pointerEvents={showSauce ? 'none' : 'auto'}>
          <View style={styles.card}>
            {!descOpen && (
              <View style={styles.photoWrap}>
                <PhotoCarousel photos={item.vintedItemUrls} />
              </View>
            )}

            {!descOpen && !!item.tags?.length && (
              <View style={styles.tagsRow}>
                {item.tags.map((tag) => (
                  <View
                    key={tag}
                    style={[
                      styles.tagChip,
                      { backgroundColor: TAG_CHIP[tag].bg },
                      TAG_CHIP[tag].border != null && {
                        borderWidth: 1,
                        borderColor: TAG_CHIP[tag].border,
                      },
                    ]}>
                    <Text style={[styles.tagChipText, { color: TAG_CHIP[tag].text }]}>
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View style={[styles.details, descOpen && styles.detailsExpanded]}>
              {!descOpen && (
                <>
                  <Text style={styles.title} numberOfLines={1}>
                    {item.title}
                  </Text>

                  <View style={styles.metaRow}>
                    <Text style={styles.size} numberOfLines={1}>
                      {item.size}
                    </Text>
                    {/* design: blue price "w tym" + shield = shipping included */}
                    <View style={styles.priceRow}>
                      <Text style={styles.price}>
                        {formatPln(item.priceWithShipping)}
                      </Text>
                      <Text style={styles.priceIncluded}>w tym</Text>
                      <Image
                        source={require('../../assets/images/shield-check-blue.svg')}
                        style={styles.priceIcon}
                      />
                    </View>
                  </View>
                </>
              )}

              {!!item.description && (
                <View style={descOpen && styles.descBlockExpanded}>
                  {descOpen ? (
                    <ScrollView
                      style={styles.descScroll}
                      nestedScrollEnabled
                      showsVerticalScrollIndicator={false}>
                      <Text style={styles.description}>{item.description}</Text>
                    </ScrollView>
                  ) : (
                    <>
                      <Text style={styles.description} numberOfLines={2}>
                        {item.description}
                      </Text>
                      {/* invisible unclamped copy — measures the real line count */}
                      <Text
                        style={[styles.description, styles.descMeasure]}
                        onTextLayout={(e) =>
                          setDescLines(e.nativeEvent.lines.length)
                        }>
                        {item.description}
                      </Text>
                    </>
                  )}
                  {(descOpen || descLines > 2) && (
                    <Pressable
                      style={styles.descToggle}
                      onPress={() => setDescOpen((o) => !o)}
                      hitSlop={8}>
                      <Text style={styles.descToggleText}>
                        {descOpen ? 'mniej' : 'więcej'}
                      </Text>
                      <Image
                        source={
                          descOpen
                            ? require('../../assets/images/chevron-up-dark.svg')
                            : require('../../assets/images/chevron-down-dark.svg')
                        }
                        style={styles.descToggleIcon}
                      />
                    </Pressable>
                  )}
                </View>
              )}
            </View>

            <View style={styles.actions}>
              <Pressable
                style={[styles.primaryBtn, item.isSold && styles.btnDisabled]}
                disabled={item.isSold}
                onPress={openSauce}>
                <Text style={styles.primaryBtnText}>
                  {item.isSold ? 'Sprzedane' : 'Dodaj sosu, żeby wystylizować'}
                </Text>
              </Pressable>
              <Pressable
                style={styles.vintedLink}
                onPress={() => Linking.openURL(item.link)}
                hitSlop={8}>
                <Image
                  source={require('../../assets/images/link-dark.svg')}
                  style={styles.vintedLinkIcon}
                />
                <Text style={styles.vintedLinkText}>Zobacz na Vinted</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>

        <Animated.View
          style={[styles.face, backStyle]}
          pointerEvents={showSauce ? 'auto' : 'none'}>
          <View style={styles.sauceCard}>
            <PhotoCarousel photos={item.sauceUrls} placeholder="🥫" />
            <Pressable style={styles.backBtn} onPress={closeSauce} hitSlop={8}>
              <Image
                source={require('../../assets/images/arrow-back.svg')}
                style={styles.backIcon}
              />
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slide: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  scene: {
    flex: 1,
  },
  face: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backfaceVisibility: 'hidden',
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    gap: 16,
    shadowColor: colors.text,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  // sauce face: the carousel IS the whole card
  sauceCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.text,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  backBtn: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    width: 20,
    height: 20,
  },
  photoWrap: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  carousel: { flex: 1 },
  dots: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 14,
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: { fontSize: 64 },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 8,
  },
  tagChip: {
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  tagChipText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
  },
  details: {
    paddingHorizontal: 8,
    gap: 12,
  },
  // expanded description takes over the card (photo/tags/title/meta hidden)
  detailsExpanded: {
    flex: 1,
  },
  descBlockExpanded: {
    flex: 1,
  },
  descScroll: {
    flex: 1,
  },
  descMeasure: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    opacity: 0,
    zIndex: -1,
  },
  descToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 6,
  },
  // design: underlined dark "więcej"/"mniej" (weight 500 → regular here)
  descToggleText: {
    color: colors.text,
    fontSize: 15,
    fontFamily: fonts.regular,
    textDecorationLine: 'underline',
  },
  descToggleIcon: {
    width: 14,
    height: 14,
  },
  title: {
    fontSize: 18,
    lineHeight: 23,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12,
  },
  size: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.text,
    flexShrink: 1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 0,
  },
  price: {
    fontSize: 17,
    fontFamily: fonts.bold,
    color: colors.heading,
  },
  priceIncluded: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.heading,
  },
  priceIcon: { width: 16, height: 16 },
  description: {
    fontSize: 15,
    lineHeight: 23,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  actions: {
    gap: 12,
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  // DS .btn: 16px semibold, padding 12/24, full width
  primaryBtn: {
    ...primaryButtonStyle,
    alignSelf: 'stretch',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  primaryBtnText: {
    color: '#FAFAFA',
    fontSize: 16,
    fontFamily: fonts.semiBold,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  // design: plain dark text + link icon, no underline
  vintedLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vintedLinkIcon: { width: 16, height: 16 },
  vintedLinkText: {
    color: colors.text,
    fontSize: 15,
    fontFamily: fonts.regular,
  },
});
