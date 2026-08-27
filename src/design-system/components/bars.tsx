import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { tokens } from '@/design-system/tokens';

type BarsSize = 'small' | 'big';

/**
 * the one data visual: five signal bars, filled by attendance facts only.
 * lit bars grow in with a 60ms left-to-right stagger on first appearance.
 */
export function SignalBars({
  lit,
  size = 'small',
  trackColor,
  animated = true,
}: {
  lit: number;
  size?: BarsSize;
  trackColor: string;
  animated?: boolean;
}) {
  const spec = tokens.component.bars[size];
  const label = `signal: ${lit} of 5`;

  return (
    <View accessibilityLabel={label} style={[styles.row, { gap: spec.gap }]}>
      {spec.heights.map((height, index) => (
        <Bar
          key={index}
          height={height}
          width={spec.widths}
          radius={spec.radius}
          on={index < lit}
          delay={index * 60}
          trackColor={trackColor}
          animated={animated}
        />
      ))}
    </View>
  );
}

function Bar({
  height,
  width,
  radius,
  on,
  delay,
  trackColor,
  animated,
}: {
  height: number;
  width: number;
  radius: number;
  on: boolean;
  delay: number;
  trackColor: string;
  animated: boolean;
}) {
  const [grow] = useState(() => new Animated.Value(animated && on ? 4 / height : 1));

  useEffect(() => {
    if (animated && on) {
      Animated.sequence([
        Animated.delay(delay),
        Animated.spring(grow, { toValue: 1, useNativeDriver: true, ...tokens.motion.snap }),
      ]).start();
    }
  }, [animated, on, delay, grow]);

  return (
    <View style={{ height, width, justifyContent: 'flex-end' }}>
      <Animated.View
        style={{
          height,
          width,
          borderRadius: radius,
          backgroundColor: on ? tokens.semantic.color.accent : trackColor,
          opacity: on ? 1 : 0.16,
          transform: [{ scaleY: grow }],
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end' },
});
