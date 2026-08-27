import { SymbolView } from 'expo-symbols';
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';

import { Button } from '@/design-system/components/button';
import { tokens } from '@/design-system/tokens';

type SymbolName = Parameters<typeof SymbolView>[0]['name'];

export function ScreenTitle({ children }: { children: ReactNode }) {
  return <Text accessibilityRole="header" style={styles.screenTitle}>{children}</Text>;
}

export function ScreenHeader({
  title,
  actionIcon,
  actionFallback,
  actionLabel,
  onAction,
}: {
  title: string;
  actionIcon?: SymbolName;
  actionFallback?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.screenHeader}>
      <ScreenTitle>{title}</ScreenTitle>
      {actionIcon && onAction ? (
        <Pressable
          accessibilityLabel={actionLabel ?? 'Action'}
          accessibilityRole="button"
          hitSlop={10}
          onPress={onAction}
          style={styles.circleButton}
        >
          <SymbolIcon color={tokens.semantic.color.textPrimary} fallback={actionFallback ?? '·'} name={actionIcon} size={22} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Group({
  children,
  compact = false,
  padded = false,
  style,
}: {
  children: ReactNode;
  compact?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.group, compact && styles.groupCompact, padded && styles.groupPadded, style]}>{children}</View>;
}

export function Section({ children, title, action }: { children: ReactNode; title?: string; action?: ReactNode }) {
  return (
    <View style={styles.section}>
      {title || action ? (
        <View style={styles.sectionHead}>
          {title ? <Text style={styles.sectionTitle}>{title}</Text> : <View />}
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function TopBar({
  title,
  onBack,
  rightAction,
}: {
  title?: string;
  onBack?: () => void;
  rightAction?: ReactNode;
}) {
  return (
    <View style={styles.topBar}>
      {onBack ? (
        <Pressable accessibilityLabel="Go back" accessibilityRole="button" hitSlop={12} onPress={onBack} style={styles.iconButton}>
          <SymbolIcon color={tokens.semantic.color.textPrimary} fallback="<" name="chevron.left" size={22} />
        </Pressable>
      ) : (
        <View style={styles.iconButton} />
      )}
      {title ? <Text style={styles.topBarTitle}>{title}</Text> : <View />}
      {rightAction ?? <View style={styles.iconButton} />}
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

export function TimeChip({ label, tone = 'warning' }: { label: string; tone?: 'warning' | 'trust' | 'muted' }) {
  const color =
    tone === 'trust'
      ? tokens.semantic.color.trustText
      : tone === 'muted'
        ? tokens.semantic.color.textMuted
        : tokens.semantic.color.warningText;
  return (
    <View style={styles.timeChip}>
      <SymbolIcon color={color} fallback="⏱" name="clock" size={14} />
      <Text style={[styles.timeText, { color }]}>{label}</Text>
    </View>
  );
}

export type IntentSummary = {
  action: string;
  expiry: string;
  id: string;
  metadata: string;
  primitive: string;
  reason: string;
  reasonBody?: string;
  title: string;
  trust: string;
  area: string;
  confirmations: string;
  summary?: string;
  chips?: readonly string[];
  status?: string;
};

export function IntentCard({ intent, onPrimaryPress, onOpen }: { intent: IntentSummary; onPrimaryPress: () => void; onOpen?: () => void }) {
  const body = (
    <>
      <View style={styles.intentHead}>
        <Text style={styles.kindLabel}>{intent.primitive}</Text>
        <TimeChip label={intent.expiry} />
      </View>
      <Text style={styles.intentTitle}>{intent.title}</Text>
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <SymbolIcon color={tokens.semantic.color.textSecondary} fallback="📍" name="mappin.and.ellipse" size={15} />
          <Text style={styles.metaText}>{intent.area}</Text>
        </View>
        <View style={styles.metaItem}>
          <SymbolIcon color={tokens.semantic.color.textSecondary} fallback="✓" name="checkmark.seal" size={15} />
          <Text style={styles.metaText}>{intent.confirmations}</Text>
        </View>
      </View>
      <View style={styles.reasonRow}>
        <SymbolIcon color={tokens.semantic.color.reasonText} fallback="?" name="questionmark.circle" size={18} />
        <View style={styles.reasonCopy}>
          <Text style={styles.reasonLabel}>Why you’re seeing this</Text>
          <Text style={styles.reasonText}>{intent.reason}</Text>
        </View>
      </View>
      <Button
        label={intent.action}
        onPress={onPrimaryPress}
        leadingIcon={<SymbolIcon color="#FFFFFF" fallback="+" name="plus.circle" size={18} />}
      />
    </>
  );

  if (onOpen) {
    return (
      <Pressable accessibilityLabel={`Open intent: ${intent.title}`} accessibilityRole="button" onPress={onOpen} style={styles.intentCard}>
        {body}
      </Pressable>
    );
  }

  return <View style={styles.intentCard}>{body}</View>;
}

export function ProgressBar({ steps, currentStep }: { steps: number; currentStep: number }) {
  return (
    <View accessibilityLabel={`Step ${currentStep} of ${steps}`} style={styles.progress}>
      {Array.from({ length: steps }).map((_, i) => (
        <View key={i} style={[styles.progressBar, i < currentStep && styles.progressBarActive]} />
      ))}
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
}) {
  return (
    <View accessibilityLabel={label} accessibilityRole="radiogroup" style={styles.segmented}>
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={opt.label}
            onPress={() => onChange(opt.value)}
            style={[styles.segmentedItem, selected && styles.segmentedItemActive]}
          >
            <Text style={[styles.segmentedText, selected && styles.segmentedTextActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

export function TextArea({
  value,
  onChange,
  placeholder,
  maxLength = 280,
  autoFocus,
  accessibilityLabel,
}: {
  value: string;
  onChange: (text: string) => void;
  placeholder: string;
  maxLength?: number;
  autoFocus?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <View>
      <TextInput
        accessibilityLabel={accessibilityLabel ?? placeholder}
        autoFocus={autoFocus}
        multiline
        maxLength={maxLength}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={tokens.semantic.color.textMuted}
        style={styles.textArea}
        textAlignVertical="top"
      />
      <Text style={styles.counter}>{value.length} / {maxLength}</Text>
    </View>
  );
}

export function DetailRow({
  icon,
  fallback,
  label,
  value,
  onPress,
  disabled,
}: {
  icon: SymbolName;
  fallback: string;
  label: string;
  value?: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const content = (
    <View style={styles.detailRow}>
      <SymbolIcon color={tokens.semantic.color.actionPrimary} fallback={fallback} name={icon} size={19} />
      <View style={styles.detailCopy}>
        <Text style={styles.detailLabel}>{label}</Text>
        {value ? <Text style={styles.detailValue}>{value}</Text> : null}
      </View>
      {onPress ? (
        <SymbolIcon color={tokens.semantic.color.textMuted} fallback=">" name="chevron.right" size={17} />
      ) : null}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
    >
      {content}
    </Pressable>
  );
}

export function SavedNote({ label }: { label: string }) {
  return (
    <View style={styles.savedNote}>
      <SymbolIcon color={tokens.semantic.color.actionPrimary} fallback="✓" name="checkmark" size={16} />
      <Text style={styles.savedText}>{label}</Text>
    </View>
  );
}

export function FilterPills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.filters}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(opt.value)}
            style={[styles.filterPill, active && styles.filterPillActive]}
          >
            <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
              {opt.label}
              {typeof opt.count === 'number' ? ` · ${opt.count}` : ''}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Avatar({
  initials,
  size = 44,
  tone = 'trust',
}: {
  initials: string;
  size?: number;
  tone?: 'trust' | 'muted';
}) {
  return (
    <View
      style={[
        styles.avatarCircle,
        { width: size, height: size, borderRadius: size / 2 },
        tone === 'muted' && styles.avatarMuted,
      ]}
    >
      <Text style={[styles.avatarText, size >= 72 && styles.avatarTextLarge]}>{initials}</Text>
    </View>
  );
}

export function ActivityRow({
  initials,
  title,
  body,
  time,
  badge,
  status,
  onPress,
}: {
  initials: string;
  title: string;
  body: string;
  time: string;
  badge?: number;
  status?: string;
  onPress?: () => void;
}) {
  const content = (
    <View style={styles.activityRow}>
      <Avatar initials={initials} size={44} />
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text numberOfLines={1} style={styles.rowBody}>{body}</Text>
        <Text style={styles.rowTime}>{time}</Text>
      </View>
      {badge && badge > 0 ? (
        <View accessibilityLabel={`${badge} new`} style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      {status ? <Text style={styles.quietStatus}>{status}</Text> : null}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress}>
      {content}
    </Pressable>
  );
}

export function IntentRow({
  title,
  meta,
  onPress,
  iconName = 'antenna.radiowaves.left.and.right',
  iconFallback = '📡',
}: {
  title: string;
  meta: string;
  onPress?: () => void;
  iconName?: SymbolName;
  iconFallback?: string;
}) {
  const body = (
    <View style={styles.intentRow}>
      <View style={styles.broadcastIcon}>
        <SymbolIcon color={tokens.semantic.color.actionPrimary} fallback={iconFallback} name={iconName} size={20} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.intentRowTitle}>{title}</Text>
        <Text style={styles.rowBody}>{meta}</Text>
      </View>
      <SymbolIcon color={tokens.semantic.color.textMuted} fallback=">" name="chevron.right" size={18} />
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress}>
      {body}
    </Pressable>
  );
}

export function IconLine({ fallback, icon, text }: { fallback: string; icon: SymbolName; text: string }) {
  return (
    <View style={styles.iconLine}>
      <SymbolIcon color={tokens.semantic.color.actionPrimary} fallback={fallback} name={icon} size={16} />
      <Text style={styles.iconLineText}>{text}</Text>
    </View>
  );
}

export function ProfileBlock({
  initials,
  name,
  area,
  context,
  hiddenContact,
  onOpen,
}: {
  area: string;
  context: string;
  hiddenContact: string;
  initials: string;
  name: string;
  onOpen?: () => void;
}) {
  const content = (
    <View style={styles.profileBlock}>
      <Avatar initials={initials} size={72} />
      <View style={styles.profileCopy}>
        <Text style={styles.profileName}>{name}</Text>
        <Text style={styles.profileMeta}>{area}</Text>
        <IconLine fallback="🛡" icon="checkmark.shield" text={context} />
        <IconLine fallback="🔒" icon="lock" text={hiddenContact} />
      </View>
    </View>
  );

  if (!onOpen) return content;
  return (
    <Pressable accessibilityLabel={`Open broadcaster profile for ${name}`} accessibilityRole="button" onPress={onOpen}>
      {content}
    </Pressable>
  );
}

export function PrivacyStrip() {
  const items: { fallback: string; icon: SymbolName; label: string }[] = [
    { fallback: '📍', icon: 'mappin.and.ellipse', label: 'Area approximate' },
    { fallback: '🚫', icon: 'location.slash', label: 'Exact place hidden' },
    { fallback: '📵', icon: 'phone.down', label: 'Contact hidden' },
    { fallback: '👥', icon: 'person.2.slash', label: 'Origin private' },
  ];

  return (
    <View style={styles.privacyStrip}>
      {items.map((item) => (
        <View key={item.label} style={styles.privacyItem}>
          <SymbolIcon color={tokens.semantic.color.actionPrimary} fallback={item.fallback} name={item.icon} size={18} />
          <Text style={styles.privacyLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

export function ActionTray({
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
  primaryLoading,
  primaryDisabled,
  leadingIcon,
}: {
  onPrimary: () => void;
  primaryLabel: string;
  secondaryLabel?: string;
  onSecondary?: () => void;
  primaryLoading?: boolean;
  primaryDisabled?: boolean;
  leadingIcon?: ReactNode;
}) {
  return (
    <View style={styles.actionTray}>
      <Button
        label={primaryLabel}
        onPress={onPrimary}
        loading={primaryLoading}
        disabled={primaryDisabled}
        leadingIcon={leadingIcon}
      />
      {secondaryLabel ? (
        <Pressable accessibilityRole="button" accessibilityLabel={secondaryLabel} onPress={onSecondary} style={styles.secondaryTap}>
          <Text style={styles.secondaryAction}>{secondaryLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function NoteInput({ placeholder, value, onChange, maxLength = 240 }: { placeholder: string; value?: string; onChange?: (t: string) => void; maxLength?: number }) {
  return (
    <View>
      <TextInput
        accessibilityLabel={placeholder}
        multiline
        maxLength={maxLength}
        placeholder={placeholder}
        placeholderTextColor={tokens.semantic.color.textMuted}
        style={styles.noteInput}
        textAlignVertical="top"
        value={value}
        onChangeText={onChange}
      />
      {typeof value === 'string' ? <Text style={styles.counter}>{value.length} / {maxLength}</Text> : null}
    </View>
  );
}

export function EmptyState({
  icon = 'tray',
  fallback = '·',
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon?: SymbolName;
  fallback?: string;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <SymbolIcon color={tokens.semantic.color.actionPrimary} fallback={fallback} name={icon} size={26} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {actionLabel && onAction ? (
        <View style={styles.emptyAction}>
          <Button label={actionLabel} onPress={onAction} variant="secondary" fullWidth={false} />
        </View>
      ) : null}
    </View>
  );
}

export function StatusBanner({
  tone = 'info',
  title,
  body,
  icon,
  fallback,
}: {
  tone?: 'info' | 'warning' | 'danger' | 'trust';
  title: string;
  body?: string;
  icon?: SymbolName;
  fallback?: string;
}) {
  const bg =
    tone === 'warning'
      ? tokens.semantic.color.warningSurface
      : tone === 'danger'
        ? tokens.semantic.color.dangerSurface
        : tone === 'trust'
          ? tokens.semantic.color.trustSurface
          : tokens.semantic.color.infoSurface;
  const fg =
    tone === 'warning'
      ? tokens.semantic.color.warningText
      : tone === 'danger'
        ? tokens.semantic.color.dangerText
        : tone === 'trust'
          ? tokens.semantic.color.trustText
          : tokens.semantic.color.infoText;
  return (
    <View style={[styles.banner, { backgroundColor: bg }]}>
      {icon ? (
        <SymbolIcon color={fg} fallback={fallback ?? '·'} name={icon} size={20} />
      ) : null}
      <View style={styles.bannerCopy}>
        <Text style={[styles.bannerTitle, { color: fg }]}>{title}</Text>
        {body ? <Text style={[styles.bannerBody, { color: fg }]}>{body}</Text> : null}
      </View>
    </View>
  );
}

export function CardSkeleton() {
  return (
    <View style={styles.skeletonCard}>
      <View style={[styles.skeletonBlock, { width: 90, height: 12 }]} />
      <View style={[styles.skeletonBlock, { width: '80%', height: 22, marginTop: 12 }]} />
      <View style={[styles.skeletonBlock, { width: '60%', height: 14, marginTop: 10 }]} />
      <View style={[styles.skeletonBlock, { width: '100%', height: 48, marginTop: 18, borderRadius: 14 }]} />
    </View>
  );
}

export function ListSkeletonRow() {
  return (
    <View style={styles.skeletonRow}>
      <View style={styles.skeletonAvatar} />
      <View style={{ flex: 1 }}>
        <View style={[styles.skeletonBlock, { width: '60%', height: 12 }]} />
        <View style={[styles.skeletonBlock, { width: '85%', height: 10, marginTop: 8 }]} />
      </View>
    </View>
  );
}

export function DividerHairline({ inset = 0 }: { inset?: number }) {
  return <View style={[styles.hairline, { marginLeft: inset }]} />;
}

export function SymbolIcon({
  color = tokens.semantic.color.actionPrimary,
  fallback,
  name,
  size = 20,
}: {
  color?: string;
  fallback: string;
  name: SymbolName;
  size?: number;
}) {
  return (
    <SymbolView
      fallback={<Text style={[styles.symbolFallback, { color, fontSize: size * 0.8 }]}>{fallback}</Text>}
      name={name}
      size={size}
      tintColor={color}
    />
  );
}

const styles = StyleSheet.create({
  actionTray: {
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: tokens.semantic.color.borderTabs,
    backgroundColor: tokens.semantic.color.backgroundSurface,
  },
  avatarCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.semantic.color.trustSurface,
  },
  avatarMuted: { backgroundColor: tokens.semantic.color.backgroundSubtle },
  avatarText: { fontFamily: 'Manrope_700Bold', fontSize: 11, color: tokens.semantic.color.trustText },
  avatarTextLarge: { fontSize: 22 },

  activityRow: {
    minHeight: 82,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },

  banner: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 14, alignItems: 'flex-start' },
  bannerCopy: { flex: 1 },
  bannerTitle: { fontFamily: 'Manrope_700Bold', fontSize: 13, lineHeight: 18 },
  bannerBody: { marginTop: 3, fontFamily: 'Manrope_400Regular', fontSize: 12, lineHeight: 17 },

  badge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: tokens.semantic.color.actionPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#FFFFFF', fontFamily: 'Manrope_700Bold', fontSize: 10 },

  broadcastIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: tokens.semantic.color.trustSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  circleButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  counter: {
    marginTop: 6,
    textAlign: 'right',
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    color: tokens.semantic.color.textMuted,
  },

  detailRow: {
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: tokens.semantic.color.borderStrong,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  detailCopy: { flex: 1 },
  detailLabel: { fontFamily: 'Manrope_700Bold', fontSize: 13, color: tokens.semantic.color.textPrimary },
  detailValue: { marginTop: 2, fontFamily: 'Manrope_400Regular', fontSize: 12, color: tokens.semantic.color.textMuted },

  emptyState: {
    padding: 22,
    alignItems: 'center',
    gap: 8,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.semantic.color.trustSurface,
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    color: tokens.semantic.color.textPrimary,
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 19,
    color: tokens.semantic.color.textSecondary,
    textAlign: 'center',
    maxWidth: 260,
  },
  emptyAction: { marginTop: 8 },

  filterPill: {
    height: tokens.component.filterChip.height,
    paddingHorizontal: 14,
    borderRadius: tokens.component.filterChip.radius,
    borderWidth: 1,
    borderColor: tokens.semantic.color.borderFilter,
    justifyContent: 'center',
  },
  filterPillActive: {
    backgroundColor: tokens.semantic.color.actionInverseBackground,
    borderColor: tokens.semantic.color.actionInverseBackground,
  },
  filterPillText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: tokens.semantic.color.textSecondary,
  },
  filterPillTextActive: { color: '#FFFFFF' },
  filters: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },

  fieldLabel: {
    marginTop: 20,
    marginBottom: 8,
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    color: tokens.semantic.color.textPrimary,
  },

  group: {
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: tokens.semantic.color.backgroundSurface,
  },
  groupCompact: { borderRadius: 14 },
  groupPadded: { padding: 16 },

  hairline: { height: 1, backgroundColor: tokens.semantic.color.borderDefault },

  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  iconLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  iconLineText: {
    flex: 1,
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 19,
    color: tokens.semantic.color.textSecondary,
  },

  intentCard: {
    padding: 17,
    borderRadius: 16,
    backgroundColor: tokens.semantic.color.backgroundSurface,
    gap: 12,
  },
  intentHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  intentRow: {
    minHeight: 66,
    paddingHorizontal: 4,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: tokens.semantic.color.borderStrong,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  intentRowTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: tokens.semantic.color.textPrimary,
  },
  intentTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 19,
    lineHeight: 25,
    letterSpacing: -0.4,
    color: tokens.semantic.color.textPrimary,
  },
  kindLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    color: tokens.semantic.color.trustText,
  },

  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaRow: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  metaText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: tokens.semantic.color.textSecondary,
  },

  noteInput: {
    minHeight: 116,
    padding: 14,
    borderRadius: 14,
    fontFamily: 'Manrope_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: tokens.semantic.color.textPrimary,
    backgroundColor: tokens.semantic.color.backgroundSurface,
    borderWidth: 1.5,
    borderColor: tokens.semantic.color.actionPrimary,
  },

  primitiveChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: tokens.semantic.color.trustSurface,
  },
  primitiveText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    color: tokens.semantic.color.trustText,
  },

  privacyItem: { flex: 1, alignItems: 'center', gap: 6 },
  privacyLabel: {
    textAlign: 'center',
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    lineHeight: 15,
    color: tokens.semantic.color.textSecondary,
  },
  privacyStrip: { flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 10 },

  profileBlock: { flexDirection: 'row', gap: 16, padding: 16, alignItems: 'flex-start' },
  profileCopy: { flex: 1 },
  profileName: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 22,
    lineHeight: 28,
    color: tokens.semantic.color.textPrimary,
  },
  profileMeta: {
    marginTop: 2,
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    color: tokens.semantic.color.textMuted,
  },

  progress: { flexDirection: 'row', gap: 6, marginBottom: 20 },
  progressBar: {
    flex: 1,
    height: 3,
    borderRadius: 4,
    backgroundColor: tokens.semantic.color.borderStrong,
  },
  progressBarActive: { backgroundColor: tokens.semantic.color.actionPrimary },

  quietStatus: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    color: tokens.semantic.color.warningText,
  },

  reasonCopy: { flex: 1 },
  reasonLabel: { fontFamily: 'Manrope_700Bold', fontSize: 12, color: tokens.semantic.color.reasonText },
  reasonRow: {
    flexDirection: 'row',
    gap: 9,
    alignItems: 'flex-start',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: tokens.semantic.color.borderDefault,
  },
  reasonText: {
    marginTop: 2,
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    lineHeight: 17,
    color: tokens.semantic.color.reasonText,
  },

  rowBody: {
    marginTop: 2,
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    lineHeight: 15,
    color: tokens.semantic.color.textSecondary,
  },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTime: {
    marginTop: 4,
    fontFamily: 'Manrope_400Regular',
    fontSize: 10,
    color: tokens.semantic.color.textMuted,
  },
  rowTitle: { fontFamily: 'Manrope_700Bold', fontSize: 13, color: tokens.semantic.color.textPrimary },

  savedNote: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  savedText: { fontFamily: 'Manrope_400Regular', fontSize: 11, color: tokens.semantic.color.textSecondary },

  screenHeader: {
    paddingHorizontal: 18,
    paddingTop: 5,
    paddingBottom: 8,
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  screenTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.9,
    color: tokens.semantic.color.textPrimary,
  },
  section: { marginTop: 18 },
  sectionHead: {
    marginBottom: 8,
    paddingHorizontal: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    color: tokens.semantic.color.textSecondary,
    letterSpacing: 0.2,
  },
  secondaryAction: {
    textAlign: 'center',
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: tokens.semantic.color.textSecondary,
  },
  secondaryTap: { paddingVertical: 8 },

  segmented: {
    height: 48,
    borderRadius: 14,
    backgroundColor: tokens.semantic.color.backgroundSubtle,
    padding: 4,
    flexDirection: 'row',
    gap: 3,
  },
  segmentedItem: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedItemActive: { backgroundColor: tokens.semantic.color.backgroundSurface },
  segmentedText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    color: tokens.semantic.color.textSecondary,
  },
  segmentedTextActive: { color: tokens.semantic.color.actionPrimary },

  skeletonAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: tokens.semantic.color.backgroundSubtle,
  },
  skeletonBlock: {
    backgroundColor: tokens.semantic.color.backgroundSubtle,
    borderRadius: 6,
  },
  skeletonCard: {
    padding: 17,
    borderRadius: 16,
    backgroundColor: tokens.semantic.color.backgroundSurface,
    gap: 4,
  },
  skeletonRow: {
    minHeight: 82,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },

  symbolFallback: { fontFamily: 'Manrope_700Bold' },

  textArea: {
    minHeight: 144,
    padding: 14,
    borderRadius: 14,
    fontFamily: 'Manrope_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: tokens.semantic.color.textPrimary,
    backgroundColor: tokens.semantic.color.backgroundSurface,
    borderWidth: 1.5,
    borderColor: tokens.semantic.color.actionPrimary,
  },

  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  timeText: { fontFamily: 'Manrope_700Bold', fontSize: 11 },

  topActions: { flexDirection: 'row', width: 88, justifyContent: 'space-around' },
  topBar: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  topBarTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: tokens.semantic.color.textPrimary,
  },
});
