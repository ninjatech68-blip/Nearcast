import { SymbolView } from 'expo-symbols';
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/design-system/components/button';
import { useColors, useThemedStyles } from '@/design-system/appearance';
import { type ColorScheme } from '@/design-system/tokens';

type SymbolName = Parameters<typeof SymbolView>[0]['name'];

export function ScreenTitle({ children }: { children: ReactNode }) {
  const styles = useThemedStyles(createStyles);
  return <Text accessibilityRole="header" style={styles.screenTitle}>{children}</Text>;
}

export function Group({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  const styles = useThemedStyles(createStyles);
  return <View style={[styles.group, compact && styles.groupCompact]}>{children}</View>;
}

export function Section({ children, title }: { children: ReactNode; title?: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.section}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      {children}
    </View>
  );
}

export function TopBar({ title, onBack }: { title: string; onBack?: () => void }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.topBar}>
      <Pressable accessibilityLabel="Go back" accessibilityRole="button" hitSlop={12} onPress={onBack} style={styles.iconButton}>
        <SymbolIcon fallback="<" name="chevron.left" />
      </Pressable>
      <Text style={styles.topBarTitle}>{title}</Text>
      <View style={styles.topActions}>
        <SymbolIcon fallback="B" name="bookmark" />
        <SymbolIcon fallback="S" name="square.and.arrow.up" />
      </View>
    </View>
  );
}

export function PrimitiveChip({ label }: { label: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.primitiveChip}>
      <Text style={styles.primitiveText}>{label}</Text>
    </View>
  );
}

type IntentSummary = {
  action: string;
  expiry: string;
  id: string;
  metadata: string;
  primitive: string;
  reason: string;
  title: string;
  trust: string;
};

export function IntentCard({ intent, onOpen }: { intent: IntentSummary; onOpen: () => void }) {
  const styles = useThemedStyles(createStyles);
  const color = useColors();
  return (
    <Pressable accessibilityLabel={`Open intent: ${intent.title}`} accessibilityRole="button" onPress={onOpen} style={styles.intentCard}>
      <View style={styles.cardTopRow}>
        <PrimitiveChip label={intent.primitive} />
        <SymbolIcon color={color.text.secondary} fallback="S" name="bookmark" />
      </View>
      <Text style={styles.intentTitle}>{intent.title}</Text>
      <Text style={styles.intentMeta}>{intent.metadata}</Text>
      <Text style={styles.intentTrust}>{intent.trust}</Text>
      <View style={styles.reasonPill}>
        <SymbolIcon fallback="W" name="sparkles" size={16} />
        <Text style={styles.reasonText}>Why this reached you: {intent.reason}</Text>
      </View>
      <View style={styles.cardBottomRow}>
        <Text style={styles.intentMeta}>{intent.expiry}</Text>
        <Text style={styles.textAction}>{intent.action}</Text>
      </View>
    </Pressable>
  );
}

export function MiniIntentRow({ title, metadata, status, tone = 'default' }: { metadata: string; status?: string; title: string; tone?: 'default' | 'muted' }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.miniIntentRow}>
      <View style={[styles.intentGlyph, tone === 'muted' && styles.intentGlyphMuted]}>
        <SymbolIcon fallback="B" name="figure.badminton" />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowMeta}>{metadata}</Text>
        {status ? <Text style={styles.statusText}>{status}</Text> : null}
      </View>
    </View>
  );
}

export function ProfileBlock({ initials, name, area, context, hiddenContact, onOpen }: { area: string; context: string; hiddenContact: string; initials: string; name: string; onOpen?: () => void }) {
  const styles = useThemedStyles(createStyles);
  const content = (
    <>
      <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
      <View style={styles.profileCopy}>
        <Text style={styles.profileName}>{name}</Text>
        <Text style={styles.rowMeta}>{area}</Text>
        <IconLine fallback="T" icon="shield" text={context} />
        <IconLine fallback="L" icon="lock" text={hiddenContact} />
      </View>
    </>
  );

  if (!onOpen) {
    return <View style={styles.profileBlock}>{content}</View>;
  }

  return (
    <Pressable accessibilityLabel={`Open broadcaster profile for ${name}`} accessibilityRole="button" onPress={onOpen} style={styles.profileBlock}>
      {content}
    </Pressable>
  );
}

export function IconLine({ fallback, icon, text }: { fallback: string; icon: SymbolName; text: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.iconLine}>
      <SymbolIcon fallback={fallback} name={icon} size={16} />
      <Text style={styles.iconLineText}>{text}</Text>
    </View>
  );
}

export function PrivacyStrip() {
  const styles = useThemedStyles(createStyles);
  const items: { fallback: string; icon: SymbolName; label: string }[] = [
    { fallback: 'A', icon: 'mappin.and.ellipse', label: 'Area approximate' },
    { fallback: 'H', icon: 'location.slash', label: 'Exact place hidden' },
    { fallback: 'C', icon: 'phone.down', label: 'Contact hidden' },
    { fallback: 'O', icon: 'person.2.badge.key', label: 'Origin private' },
  ];

  return (
    <View style={styles.privacyStrip}>
      {items.map((item) => (
        <View key={item.label} style={styles.privacyItem}>
          <SymbolIcon fallback={item.fallback} name={item.icon} />
          <Text style={styles.privacyLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

export function ActionTray({ primaryLabel, secondaryLabel, onPrimary }: { onPrimary: () => void; primaryLabel: string; secondaryLabel?: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.actionTray}>
      <Button label={primaryLabel} onPress={onPrimary} />
      {secondaryLabel ? <Text style={styles.secondaryAction}>{secondaryLabel}</Text> : null}
    </View>
  );
}

export function NoteInput({ placeholder }: { placeholder: string }) {
  const styles = useThemedStyles(createStyles);
  const color = useColors();
  return (
    <TextInput
      accessibilityLabel={placeholder}
      multiline
      placeholder={placeholder}
      placeholderTextColor={color.text.secondary}
      style={styles.noteInput}
      textAlignVertical="top"
    />
  );
}

export function SymbolIcon({ color, fallback, name, size = 20 }: { color?: string; fallback: string; name: SymbolName; size?: number }) {
  const styles = useThemedStyles(createStyles);
  const palette = useColors();
  const tint = color ?? palette.action.primary;
  return <SymbolView fallback={<Text style={[styles.symbolFallback, { color: tint }]}>{fallback}</Text>} name={name} size={size} tintColor={tint} />;
}

const createStyles = (color: ColorScheme) =>
  StyleSheet.create({
  actionTray: { gap: 10, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10, borderTopWidth: 1, borderTopColor: color.border.subtle, backgroundColor: color.background.surface },
  avatar: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: color.background.surfaceMuted },
  avatarText: { fontWeight: '700', fontSize: 30, color: color.on.success },
  cardBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  group: { overflow: 'hidden', borderWidth: 1, borderColor: color.border.subtle, borderRadius: 16, backgroundColor: color.background.surface },
  groupCompact: { borderRadius: 14 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  iconLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  iconLineText: { flex: 1, fontWeight: '400', fontSize: 14, lineHeight: 20, color: color.text.secondary },
  intentCard: { gap: 10, padding: 14, borderWidth: 1, borderColor: color.border.subtle, borderRadius: 16, backgroundColor: color.background.surface },
  intentGlyph: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: color.background.success },
  intentGlyphMuted: { backgroundColor: color.background.surfaceMuted },
  intentMeta: { fontWeight: '400', fontSize: 13, lineHeight: 18, color: color.text.secondary },
  intentTitle: { fontWeight: '700', fontSize: 18, lineHeight: 23, color: color.text.primary },
  intentTrust: { fontWeight: '400', fontSize: 13, lineHeight: 18, color: color.text.secondary },
  miniIntentRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  noteInput: { minHeight: 116, padding: 14, borderWidth: 1, borderColor: color.border.subtle, borderRadius: 12, fontWeight: '400', fontSize: 15, lineHeight: 22, color: color.text.primary, backgroundColor: color.background.surface },
  primitiveChip: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9, backgroundColor: color.background.success },
  primitiveText: { fontWeight: '600', fontSize: 13, color: color.on.success },
  privacyItem: { flex: 1, alignItems: 'center', gap: 6 },
  privacyLabel: { textAlign: 'center', fontWeight: '400', fontSize: 12, lineHeight: 16, color: color.text.secondary },
  privacyStrip: { flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 10 },
  profileBlock: { flexDirection: 'row', gap: 16, padding: 16 },
  profileCopy: { flex: 1 },
  profileName: { fontWeight: '700', fontSize: 24, lineHeight: 30, color: color.text.primary },
  reasonPill: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', padding: 12, borderRadius: 12, backgroundColor: color.background.success },
  reasonText: { flex: 1, fontWeight: '400', fontSize: 13, lineHeight: 18, color: color.on.success },
  rowCopy: { flex: 1 },
  rowMeta: { marginTop: 2, fontWeight: '400', fontSize: 14, lineHeight: 20, color: color.text.secondary },
  rowTitle: { fontWeight: '600', fontSize: 15, lineHeight: 21, color: color.text.primary },
  screenTitle: { fontWeight: '700', fontSize: 34, lineHeight: 41, color: color.text.primary },
  secondaryAction: { textAlign: 'center', fontWeight: '600', fontSize: 14, lineHeight: 20, color: color.action.primary },
  section: { marginTop: 22 },
  sectionTitle: { marginBottom: 8, paddingHorizontal: 2, fontWeight: '600', fontSize: 13, lineHeight: 18, color: color.text.secondary },
  statusText: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9, overflow: 'hidden', fontWeight: '600', fontSize: 12, color: color.on.success, backgroundColor: color.background.success },
  symbolFallback: { fontWeight: '700', fontSize: 12 },
  textAction: { fontWeight: '700', fontSize: 13, color: color.action.primary },
  topActions: { flexDirection: 'row', width: 88, justifyContent: 'space-around' },
  topBar: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  topBarTitle: { fontWeight: '700', fontSize: 17, color: color.text.primary },
});
