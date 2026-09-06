import { Image } from 'expo-image';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RangeSlider } from '@/components/range-slider';
import { VINTED_ITEM_TAGS, type VintedItemTag } from '@/lib/api';
import { colors, fonts } from '@/lib/theme';

/** "88,63" / "5 400,00" — pl-PL money without relying on Intl. */
function formatPln(value: number): string {
  const [int, frac] = value.toFixed(2).split('.');
  return `${int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')},${frac}`;
}

/** Full-screen filter overlay from the Claude Design product-detail template:
 *  price range (dual slider) + tag toggles, WYCZYŚĆ / ZOBACZ at the bottom. */
export function FilterSheet({
  visible,
  min,
  max,
  low,
  high,
  selected,
  onChangeRange,
  onToggleTag,
  onClear,
  onClose,
}: {
  visible: boolean;
  min: number;
  max: number;
  low: number;
  high: number;
  selected: ReadonlySet<VintedItemTag>;
  onChangeRange: (low: number, high: number) => void;
  onToggleTag: (tag: VintedItemTag) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  // Draw the modal edge-to-edge on every device (real phones did so anyway,
  // the emulator did not) and pad with the safe-area insets ourselves.
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}>
      <View style={styles.sheet}>
        <View
          style={[
            styles.inner,
            {
              paddingTop: 20 + insets.top,
              paddingBottom: 40 + insets.bottom,
            },
          ]}>
          <View style={styles.header}>
            <View style={styles.headerSide} />
            <Text style={styles.headerTitle}>FILTRUJ</Text>
            <Pressable
              style={styles.headerSide}
              onPress={onClose}
              hitSlop={16}
              accessibilityLabel="zamknij">
              <Image
                source={require('../../assets/images/close-x.svg')}
                style={styles.closeIcon}
              />
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ZAKRES CEN</Text>
            <View style={styles.priceLabels}>
              <Text style={styles.priceLabel}>{formatPln(low)} PLN</Text>
              <Text style={styles.priceLabel}>{formatPln(high)} PLN</Text>
            </View>
            <RangeSlider
              min={min}
              max={max}
              low={low}
              high={high}
              onChange={onChangeRange}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>TAGI</Text>
            <View style={styles.tagRow}>
              {VINTED_ITEM_TAGS.map((tag) => {
                const on = selected.has(tag);
                return (
                  <Pressable
                    key={tag}
                    style={[styles.tagPill, on && styles.tagPillOn]}
                    onPress={() => onToggleTag(tag)}>
                    <Text style={[styles.tagPillText, on && styles.tagPillTextOn]}>
                      {tag}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.clearBtn} onPress={onClear}>
              <Text style={styles.clearBtnText}>WYCZYŚĆ</Text>
            </Pressable>
            <Pressable style={styles.applyBtn} onPress={onClose}>
              <Text style={styles.applyBtnText}>ZOBACZ</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
  },
  inner: {
    flex: 1,
    width: '100%',
    maxWidth: 400,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSide: {
    width: 24,
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    letterSpacing: 1.1,
    color: colors.text,
  },
  closeIcon: { width: 18, height: 18 },
  section: { gap: 14 },
  sectionTitle: {
    fontSize: 13,
    fontFamily: fonts.bold,
    letterSpacing: 1,
    color: colors.text,
  },
  priceLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priceLabel: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagPill: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 14,
  },
  tagPillOn: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  tagPillText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: colors.muted,
  },
  tagPillTextOn: {
    color: '#FAFAFA',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 'auto',
  },
  clearBtn: {
    flex: 1,
    backgroundColor: colors.gradientBottom,
    paddingVertical: 14,
    alignItems: 'center',
  },
  clearBtnText: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    letterSpacing: 1,
    color: colors.muted,
  },
  applyBtn: {
    flex: 1,
    backgroundColor: colors.text,
    paddingVertical: 14,
    alignItems: 'center',
  },
  applyBtnText: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    letterSpacing: 1,
    color: '#FAFAFA',
  },
});
