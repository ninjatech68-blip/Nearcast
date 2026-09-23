import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme';
import { Icon } from './icon';

type SheetHeaderProps = {
  title: string;
  onClose: () => void;
  onConfirm?: () => void;
  /** When set, confirm is disabled and this is announced as the reason. */
  confirmDisabledReason?: string;
};

/**
 * Grabber, close, title and confirm for sheets (06 §6). Detents come from the
 * native form sheet (`presentation: 'formSheet'`, `sheetAllowedDetents`).
 */
export function SheetHeader({ title, onClose, onConfirm, confirmDisabledReason }: SheetHeaderProps) {
  const { colors, tokens } = useTheme();
  const confirmDisabled = confirmDisabledReason !== undefined;
  return (
    <View style={styles.wrap}>
      <View style={[styles.grabber, { backgroundColor: colors.borderSubtle }]} />
      <View style={styles.row}>
        <Pressable accessibilityLabel="Close" accessibilityRole="button" onPress={onClose} style={[styles.round, { backgroundColor: colors.backgroundSurfaceMuted }]}>
          <Icon label={null} name="close" />
        </Pressable>
        <Text accessibilityRole="header" style={[tokens.type.sectionTitle, styles.title, { color: colors.textPrimary }]}>
          {title}
        </Text>
        {onConfirm ? (
          <Pressable
            accessibilityHint={confirmDisabledReason}
            accessibilityLabel="Done"
            accessibilityRole="button"
            accessibilityState={{ disabled: confirmDisabled }}
            disabled={confirmDisabled}
            onPress={onConfirm}
            style={[styles.round, { backgroundColor: colors.actionPrimary }, confirmDisabled && styles.disabled]}>
            <Icon color="onPrimary" label={null} name="confirm" />
          </Pressable>
        ) : (
          <View style={styles.round} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 8, paddingTop: 8, paddingHorizontal: 16 },
  grabber: { width: 40, height: 5, borderRadius: 3 },
  row: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', gap: 12 },
  title: { flex: 1, textAlign: 'center' },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.4 },
});
