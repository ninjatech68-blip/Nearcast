import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

import { haptic } from '@/design-system/haptics';
import { fontFamily, tokens } from '@/design-system/tokens';

/** the confirmation mark. lands scale 1.4→1, rotate −12°→−6°, with overshoot. */
export function Stamp({ label, color, withHaptic = true }: { label: string; color: string; withHaptic?: boolean }) {
  const [scale] = useState(() => new Animated.Value(1.4));
  const [rotate] = useState(() => new Animated.Value(-12));

  useEffect(() => {
    if (withHaptic) haptic('medium');
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, ...tokens.motion.snap }),
      Animated.spring(rotate, { toValue: -6, useNativeDriver: true, ...tokens.motion.snap }),
    ]).start();
  }, [scale, rotate, withHaptic]);

  const spin = rotate.interpolate({ inputRange: [-12, 0], outputRange: ['-12deg', '0deg'] });

  return (
    <Animated.View style={[styles.stamp, { borderColor: color, transform: [{ rotate: spin }, { scale }] }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stamp: {
    alignSelf: 'flex-start',
    borderWidth: 2.5,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  text: { fontFamily: fontFamily.display, fontSize: 15, letterSpacing: 0.3 },
});
