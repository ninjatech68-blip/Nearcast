import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';

import { useColors } from '@/design-system/appearance';
import { findPrivacyViolations } from '@/design-system/privacy';
import { tokens } from '@/design-system/tokens';

import { Button } from './button';

/** The approved composer helper copy from DESIGN.md. */
export const COMPOSER_HELPER_COPY = 'No exact address or contact details shown.';

const WARNINGS = {
  exactLocation: 'Remove the exact location. Use an approximate area instead.',
  contactDetails: 'Remove contact details. They are never shown to other people.',
} as const;

type ComposerProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  helperText?: string;
  maxLength?: number;
  submit: { label: string; onPress: () => void; loading?: boolean };
};

/**
 * The natural-language intent composer.
 *
 * The action bar stays above the keyboard, and the draft is checked for exact
 * locations and contact details so the writer is warned before posting rather
 * than after.
 */
export function Composer({
  label,
  value,
  onChangeText,
  placeholder,
  helperText = COMPOSER_HELPER_COPY,
  maxLength = 500,
  submit,
}: ComposerProps) {
  const color = useColors();
  const violations = findPrivacyViolations(value);
  const remaining = maxLength - value.length;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.wrapper}>
      <Text accessibilityRole="header" style={[styles.label, { color: color.text.primary }]}>
        {label}
      </Text>

      <TextInput
        accessibilityHint={helperText}
        accessibilityLabel={label}
        maxLength={maxLength}
        multiline
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={color.text.secondary}
        style={[
          styles.input,
          {
            backgroundColor: color.background.surface,
            borderColor: violations.length > 0 ? color.status.warning : color.border.subtle,
            color: color.text.primary,
          },
        ]}
        value={value}
      />

      <View style={styles.helperRow}>
        <Text style={[styles.helper, { color: color.text.secondary }]}>{helperText}</Text>
        <Text
          accessibilityLabel={`${remaining} characters remaining`}
          style={[styles.counter, { color: color.text.secondary }]}>
          {remaining}
        </Text>
      </View>

      {violations.map((violation) => (
        <Text key={violation} style={[styles.warning, { color: color.status.warning }]}>
          {WARNINGS[violation]}
        </Text>
      ))}

      <View style={styles.actionBar}>
        <Button
          disabled={value.trim().length === 0 || violations.length > 0}
          label={submit.label}
          loading={submit.loading}
          onPress={submit.onPress}
          unavailableReason={
            violations.length > 0 ? WARNINGS[violations[0]] : 'Write your intent to continue.'
          }
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  actionBar: { paddingTop: tokens.space[2] },
  counter: { ...tokens.type.caption },
  helper: { ...tokens.type.caption, flexShrink: 1 },
  helperRow: { flexDirection: 'row', gap: tokens.space[3], justifyContent: 'space-between' },
  input: {
    ...tokens.type.body,
    borderRadius: tokens.component.input.radius,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: tokens.component.input.minHeight * 2,
    padding: tokens.component.input.padding,
    textAlignVertical: 'top',
  },
  label: { ...tokens.type.sectionTitle },
  warning: { ...tokens.type.caption },
  wrapper: { gap: tokens.space[3] },
});
