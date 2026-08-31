import { SymbolView } from 'expo-symbols';
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/design-system/components/button';
import { tokens } from '@/design-system/tokens';

type SymbolName = Parameters<typeof SymbolView>[0]['name'];

export function ScreenTitle({ children }: { children: ReactNode }) {
  return <Text accessibilityRole="header" style={styles.screenTitle}>{children}</Text>;
}

export function Group({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return <View style={[styles.group, compact && styles.groupCompact]}>{children}</View>;
}

export function Section({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <View style={styles.section}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      {children}
    </View>
  );
}

export function TopBar({ title, onBack }: { title: string; onBack?: () => void }) {
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
  requestNote?: string;
  title: string;
  trust: string;
};

export function IntentCard({ intent, onOpen }: { intent: IntentSummary; onOpen: () => void }) {
  return (
    <Pressable accessibilityLabel={`Open cast: ${intent.title}`} accessibilityRole="button" onPress={onOpen} style={styles.intentCard}>
      <View style={styles.cardTopRow}>
        <PrimitiveChip label={intent.primitive} />
        <SymbolIcon color={tokens.semantic.color.textMuted} fallback="S" name="bookmark" />
      </View>
      <Text style={styles.intentTitle}>{intent.title}</Text>
      <Text style={styles.intentMeta}>{intent.metadata}</Text>
      <Text style={styles.intentTrust}>{intent.trust}</Text>
      <View style={styles.reasonPill}>
        <SymbolIcon fallback="W" name="sparkles" size={16} />
        <Text style={styles.reasonText}>{intent.reason}</Text>
      </View>
      <View style={styles.cardBottomRow}>
        <Text style={styles.intentMeta}>{intent.expiry}</Text>
        <Text style={styles.textAction}>{intent.action}</Text>
      </View>
      {intent.requestNote ? <Text style={styles.requestNote}>{intent.requestNote}</Text> : null}
    </Pressable>
  );
}

export function TeachingNote({ body, onDismiss, title }: { body: string; onDismiss: () => void; title: string }) {
  return (
    <View style={styles.teachingNote}>
      <View style={styles.teachingHeader}>
        <SymbolIcon fallback="i" name="info.circle" size={16} />
        <Text accessibilityRole="header" style={styles.teachingTitle}>{title}</Text>
        <Pressable
          accessibilityLabel="Dismiss explanation"
          accessibilityRole="button"
          hitSlop={{ bottom: 12, left: 12, right: 12, top: 12 }}
          onPress={onDismiss}>
          <SymbolIcon color={tokens.semantic.color.textSecondary} fallback="X" name="xmark" size={16} />
        </Pressable>
      </View>
      <Text style={styles.teachingBody}>{body}</Text>
    </View>
  );
}

export function MiniIntentRow({ title, metadata, status, tone = 'default' }: { metadata: string; status?: string; title: string; tone?: 'default' | 'muted' }) {
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
    <Pressable accessibilityLabel={`Open ${name}'s profile`} accessibilityRole="button" onPress={onOpen} style={styles.profileBlock}>
      {content}
    </Pressable>
  );
}

export function IconLine({ fallback, icon, text }: { fallback: string; icon: SymbolName; text: string }) {
  return (
    <View style={styles.iconLine}>
      <SymbolIcon fallback={fallback} name={icon} size={16} />
      <Text style={styles.iconLineText}>{text}</Text>
    </View>
  );
}

export function PrivacyStrip() {
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
  return (
    <View style={styles.actionTray}>
      <Button label={primaryLabel} onPress={onPrimary} />
      {secondaryLabel ? <Text style={styles.secondaryAction}>{secondaryLabel}</Text> : null}
    </View>
  );
}

export function NoteInput({ placeholder }: { placeholder: string }) {
  return (
    <TextInput
      accessibilityLabel={placeholder}
      multiline
      placeholder={placeholder}
      placeholderTextColor={tokens.semantic.color.textMuted}
      style={styles.noteInput}
      textAlignVertical="top"
    />
  );
}

export function SymbolIcon({ color = tokens.semantic.color.actionPrimary, fallback, name, size = 20 }: { color?: string; fallback: string; name: SymbolName; size?: number }) {
  return <SymbolView fallback={<Text style={[styles.symbolFallback, { color }]}>{fallback}</Text>} name={name} size={size} tintColor={color} />;
}

const styles = StyleSheet.create({
  actionTray: { gap: 10, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10, borderTopWidth: 1, borderTopColor: tokens.semantic.color.borderDefault, backgroundColor: tokens.semantic.color.backgroundSurface },
  avatar: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.semantic.color.backgroundSubtle },
  avatarText: { fontFamily: 'Manrope_700Bold', fontSize: 30, color: tokens.semantic.color.trustText },
  cardBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  group: { overflow: 'hidden', borderWidth: 1, borderColor: tokens.semantic.color.borderDefault, borderRadius: 16, backgroundColor: tokens.semantic.color.backgroundSurface },
  groupCompact: { borderRadius: 14 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  iconLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  iconLineText: { flex: 1, fontFamily: 'Manrope_400Regular', fontSize: 14, lineHeight: 20, color: tokens.semantic.color.textSecondary },
  intentCard: { gap: 10, padding: 14, borderWidth: 1, borderColor: tokens.semantic.color.borderDefault, borderRadius: 16, backgroundColor: tokens.semantic.color.backgroundSurface },
  intentGlyph: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.semantic.color.trustSurface },
  intentGlyphMuted: { backgroundColor: tokens.semantic.color.backgroundSubtle },
  intentMeta: { fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 18, color: tokens.semantic.color.textMuted },
  intentTitle: { fontFamily: 'Manrope_700Bold', fontSize: 18, lineHeight: 23, color: tokens.semantic.color.textPrimary },
  intentTrust: { fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 18, color: tokens.semantic.color.textSecondary },
  miniIntentRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  noteInput: { minHeight: 116, padding: 14, borderWidth: 1, borderColor: tokens.semantic.color.borderDefault, borderRadius: 12, fontFamily: 'Manrope_400Regular', fontSize: 15, lineHeight: 22, color: tokens.semantic.color.textPrimary, backgroundColor: tokens.semantic.color.backgroundSurface },
  primitiveChip: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9, backgroundColor: tokens.semantic.color.trustSurface },
  primitiveText: { fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: tokens.semantic.color.trustText },
  privacyItem: { flex: 1, alignItems: 'center', gap: 6 },
  privacyLabel: { textAlign: 'center', fontFamily: 'Manrope_400Regular', fontSize: 12, lineHeight: 16, color: tokens.semantic.color.textSecondary },
  privacyStrip: { flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 10 },
  profileBlock: { flexDirection: 'row', gap: 16, padding: 16 },
  profileCopy: { flex: 1 },
  profileName: { fontFamily: 'Manrope_700Bold', fontSize: 24, lineHeight: 30, color: tokens.semantic.color.textPrimary },
  reasonPill: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', padding: 12, borderRadius: 12, backgroundColor: tokens.semantic.color.trustSurface },
  reasonText: { flex: 1, fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 18, color: tokens.semantic.color.trustText },
  requestNote: { fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 18, color: tokens.semantic.color.textSecondary },
  teachingNote: { gap: 8, padding: 14, borderWidth: 1, borderColor: tokens.semantic.color.borderDefault, borderRadius: 14, backgroundColor: tokens.semantic.color.backgroundSurface },
  teachingHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  teachingTitle: { flex: 1, fontFamily: 'Manrope_600SemiBold', fontSize: 14, lineHeight: 20, color: tokens.semantic.color.textPrimary },
  teachingBody: { fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 19, color: tokens.semantic.color.textSecondary },
  rowCopy: { flex: 1 },
  rowMeta: { marginTop: 2, fontFamily: 'Manrope_400Regular', fontSize: 14, lineHeight: 20, color: tokens.semantic.color.textMuted },
  rowTitle: { fontFamily: 'Manrope_600SemiBold', fontSize: 15, lineHeight: 21, color: tokens.semantic.color.textPrimary },
  screenTitle: { fontFamily: 'Manrope_700Bold', fontSize: 34, lineHeight: 41, color: tokens.semantic.color.textPrimary },
  secondaryAction: { textAlign: 'center', fontFamily: 'Manrope_600SemiBold', fontSize: 14, lineHeight: 20, color: tokens.semantic.color.actionPrimary },
  section: { marginTop: 22 },
  sectionTitle: { marginBottom: 8, paddingHorizontal: 2, fontFamily: 'Manrope_600SemiBold', fontSize: 13, lineHeight: 18, color: tokens.semantic.color.textSecondary },
  statusText: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9, overflow: 'hidden', fontFamily: 'Manrope_600SemiBold', fontSize: 12, color: tokens.semantic.color.trustText, backgroundColor: tokens.semantic.color.trustSurface },
  symbolFallback: { fontFamily: 'Manrope_700Bold', fontSize: 12 },
  textAction: { fontFamily: 'Manrope_700Bold', fontSize: 13, color: tokens.semantic.color.actionPrimary },
  topActions: { flexDirection: 'row', width: 88, justifyContent: 'space-around' },
  topBar: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  topBarTitle: { fontFamily: 'Manrope_700Bold', fontSize: 17, color: tokens.semantic.color.textPrimary },
});
