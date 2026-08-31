import { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fontFamily, tokens } from '@/design-system/tokens';

/**
 * sheet content shell. presentation (drag-dismiss) comes from the native
 * pageSheet route; this renders the inside, grabber included.
 */
export function SheetShell({
  title,
  accessory,
  children,
}: {
  title?: string;
  accessory?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={styles.shell}>
      <View style={styles.grabber} />
      {title || accessory ? (
        <View style={styles.head}>
          {title ? (
            <Text accessibilityRole="header" style={styles.title}>
              {title}
            </Text>
          ) : null}
          {accessory}
        </View>
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
    paddingTop: 10,
    paddingBottom: 30,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: tokens.semantic.color.hairlineOnCream,
    marginBottom: 18,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
  title: {
    fontFamily: fontFamily.display,
    fontSize: 30,
    lineHeight: 32,
    letterSpacing: -0.6,
    color: tokens.semantic.color.ink,
    flexShrink: 1,
  },
  note: {
    ...tokens.typography.metaSmall,
    color: tokens.semantic.color.textMutedOnCream,
    marginTop: 12,
  },
});
