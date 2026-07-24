import { useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';

import { colors } from '@/lib/theme';

const THUMB = 14;

/** Dual-thumb price slider from the Claude Design product-detail template:
 *  2px dark track, 14px square dark thumbs (design removes the round thumb). */
export function RangeSlider({
  min,
  max,
  low,
  high,
  onChange,
}: {
  min: number;
  max: number;
  low: number;
  high: number;
  onChange: (low: number, high: number) => void;
}) {
  const [width, setWidth] = useState(0);

  // PanResponder callbacks are created once — read live values from a ref.
  const live = useRef({ min, max, low, high, width, onChange });
  live.current = { min, max, low, high, width, onChange };

  const toX = (value: number) => {
    const { min: mn, max: mx, width: w } = live.current;
    const usable = Math.max(w - THUMB, 0);
    return mx > mn ? ((value - mn) / (mx - mn)) * usable : 0;
  };
  const toValue = (x: number) => {
    const { min: mn, max: mx, width: w } = live.current;
    const usable = Math.max(w - THUMB, 1);
    return Math.round(mn + (Math.min(Math.max(x, 0), usable) / usable) * (mx - mn));
  };

  const makeResponder = (thumb: 'low' | 'high') => {
    const startX = { current: 0 };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startX.current = toX(thumb === 'low' ? live.current.low : live.current.high);
      },
      onPanResponderMove: (_, gesture) => {
        const value = toValue(startX.current + gesture.dx);
        const { low: lo, high: hi, onChange: emit } = live.current;
        if (thumb === 'low') {
          emit(Math.min(value, hi), hi);
        } else {
          emit(lo, Math.max(value, lo));
        }
      },
    });
  };

  const lowResponder = useRef(makeResponder('low')).current;
  const highResponder = useRef(makeResponder('high')).current;

  return (
    <View
      style={styles.container}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={styles.track} />
      {width > 0 && (
        <>
          <View
            style={[styles.thumb, { left: toX(low) }]}
            hitSlop={12}
            {...lowResponder.panHandlers}
          />
          <View
            style={[styles.thumb, { left: toX(high) }]}
            hitSlop={12}
            {...highResponder.panHandlers}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 24,
    justifyContent: 'center',
  },
  track: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 11,
    height: 2,
    backgroundColor: colors.text,
  },
  thumb: {
    position: 'absolute',
    top: 5,
    width: THUMB,
    height: THUMB,
    backgroundColor: colors.text,
  },
});
