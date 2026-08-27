import { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fontFamily, tokens } from '@/design-system/tokens';

/**
 * sheet content shell. presentation (detents, grabber, drag-dismiss)
 * comes from the native formSheet route; this renders the inside.
 */
export function SheetShell({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={styles.shell}>
      {title ? (
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

/** the one-line system disclosure that rides at the bottom of a sheet. */
export function SheetNote({ children }: { children: string }) {
  return <Text style={styles.note}>{children}</Text>;
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: tokens.semantic.color.cream,
    paddingHorizontal: tokens.component.sheet.padding,
    paddingTop: 18,
    paddingBottom: 30,
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: 30,
    lineHeight: 32,
    letterSpacing: -0.6,
    color: tokens.semantic.color.ink,
  },
  note: {
    ...tokens.typography.metaSmall,
    color: tokens.semantic.color.textMutedOnCream,
    marginTop: 12,
  },
});
