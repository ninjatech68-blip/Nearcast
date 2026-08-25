import { type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useColors, useReducedMotion } from '@/design-system/appearance';
import { tokens } from '@/design-system/tokens';

type NativeSheetProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  closeLabel?: string;
  children: ReactNode;
};

/**
 * The sheet used for focused, reversible decisions: reach selection, offering
 * help, resolving an intent, reporting, and privacy explanations.
 *
 * Reduced motion swaps the slide for an immediate presentation rather than a
 * shortened one.
 */
export function NativeSheet({
  visible,
  title,
  onClose,
  closeLabel = 'Close',
  children,
}: NativeSheetProps) {
  const color = useColors();
  const reducedMotion = useReducedMotion();

  return (
    <Modal
      animationType={reducedMotion ? 'none' : 'slide'}
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      transparent={false}
      visible={visible}>
      <View
        accessibilityViewIsModal
        style={[styles.sheet, { backgroundColor: color.background.surface }]}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={[styles.title, { color: color.text.primary }]}>
            {title}
          </Text>
          <Pressable
            accessibilityLabel={closeLabel}
            accessibilityRole="button"
            hitSlop={tokens.space[2]}
            onPress={onClose}
            style={styles.close}>
            <Text style={[styles.closeLabel, { color: color.action.secondary }]}>{closeLabel}</Text>
          </Pressable>
        </View>
        {children}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  close: { justifyContent: 'center', minHeight: tokens.touchTarget.ios },
  closeLabel: { ...tokens.type.bodyStrong },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sheet: {
    borderTopLeftRadius: tokens.component.sheet.radius,
    borderTopRightRadius: tokens.component.sheet.radius,
    flex: 1,
    gap: tokens.component.sheet.gap,
    padding: tokens.component.sheet.padding,
  },
  title: { ...tokens.type.sectionTitle },
});
