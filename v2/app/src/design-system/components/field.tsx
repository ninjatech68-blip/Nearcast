import { useState } from 'react';
import { Animated, StyleSheet, TextInput, View } from 'react-native';

import { haptic } from '@/design-system/haptics';
import { fontFamily, tokens } from '@/design-system/tokens';

/**
 * display-size text input. typing looks like the poster it becomes.
 * hard cap 140: a cast is one breath. counter tints orange at 120,
 * shakes once at the cap. no red, no error line.
 */
export function Field({
  value,
  onChange,
  placeholder,
  accessibilityLabel,
  autoFocus = false,
  color = tokens.semantic.color.ink,
  fontSize = tokens.component.field.fontSize,
}: {
  value: string;
  onChange: (text: string) => void;
  placeholder: string;
  accessibilityLabel: string;
  autoFocus?: boolean;
  color?: string;
  fontSize?: number;
}) {
  const [shake] = useState(() => new Animated.Value(0));
  const max = tokens.component.field.maxLength;
  const warn = value.length >= tokens.component.field.warnAt;

  function handleChange(text: string) {
    if (text.length >= max && value.length < max) {
      haptic('warning');
      Animated.sequence([
        Animated.timing(shake, { toValue: -4, duration: 60, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 4, duration: 60, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -4, duration: 60, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
    }
    onChange(text);
  }

  return (
    <View>
      <TextInput
        accessibilityLabel={accessibilityLabel}
        autoFocus={autoFocus}
        multiline
        maxLength={max}
        value={value}
        onChangeText={handleChange}
        placeholder={placeholder}
        placeholderTextColor={tokens.semantic.color.hairlineOnCream}
        selectionColor={tokens.semantic.color.accent}
        style={[styles.input, { color, fontSize, lineHeight: Math.round(fontSize * 1.08) }]}
        textAlignVertical="top"
      />
      <Animated.Text
        style={[
          styles.counter,
          warn && styles.counterWarn,
          { transform: [{ translateX: shake }] },
        ]}
      >
        {value.length}/{max}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    fontFamily: fontFamily.display,
    letterSpacing: -0.7,
    padding: 0,
    minHeight: 120,
  },
  counter: {
    ...tokens.typography.metaSmall,
    color: tokens.semantic.color.textMutedOnCream,
    textAlign: 'right',
    marginTop: 8,
  },
  counterWarn: { color: tokens.semantic.color.accent },
});
