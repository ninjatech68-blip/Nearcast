import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text } from 'react-native';

import { fontFamily, tokens } from '@/design-system/tokens';

/**
 * The "yes, something is happening" pill.
 *
 * The platform's own pull spinner is drawn behind the list, in a single
 * tint — on a full-bleed poster it lands on a coloured field and is
 * effectively invisible, which is how a pull could look like it had
 * done nothing at all. This rides ON TOP, in ink on cream, so it reads
 * the same over every category colour and over the cream chrome.
 *
 * It fades rather than pops: an indicator that appears instantly and
 * vanishes instantly is hard to be sure you saw.
 */
export function Refreshing({ visible, label = 'refreshing…' }: { visible: boolean; label?: string }) {
  const [fade] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(fade, {
      toValue: visible ? 1 : 0,
      duration: visible ? 140 : 220,
      useNativeDriver: true,
    }).start();
  }, [visible, fade]);

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      accessibilityLabel={visible ? label : undefined}
      style={[styles.pill, { opacity: fade }]}
    >
      <ActivityIndicator size="small" color={tokens.semantic.color.cream} />
      <Text style={styles.text}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    alignSelf: 'center',
    top: 0,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: tokens.primitive.radius.pill,
    backgroundColor: tokens.semantic.color.ink,
  },
  text: { fontFamily: fontFamily.monoSemi, fontSize: 11, letterSpacing: 0.5, color: tokens.semantic.color.cream },
});
