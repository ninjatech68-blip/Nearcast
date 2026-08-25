import { SymbolView } from 'expo-symbols';
import { type Href, router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/design-system/components/button';
import { tokens } from '@/design-system/tokens';

const createIntentRoute = '/create' as Href;

const feedStates = [
  ['Finite feed', 'Nearcast shows active intents that are relevant now, then stops.'],
  ["Why you're seeing this", 'Every delivered intent will explain the trust or relevance reason.'],
  ['Private by design', 'Origin circles, exact locations, and contact details stay hidden until permission changes.'],
] as const;

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.wordmark}>nearcast</Text>
            <Text style={styles.kicker}>For You</Text>
          </View>
          <View style={styles.statusPill}>
            <Text style={styles.statusText}>Private alpha</Text>
          </View>
        </View>

        <View style={styles.feedIntro}>
          <Text style={styles.title}>What is happening around you</Text>
          <Text style={styles.subtitle}>Relevant needs, offers, and plans from nearby trusted networks will appear here with clear context before you respond.</Text>
        </View>

        <View style={styles.emptyFeed}>
          <View style={styles.signalMark}>
            <View style={styles.signalRing}>
              <View style={styles.signalDot} />
            </View>
          </View>
          <Text style={styles.emptyTitle}>Nothing relevant is active right now. Adjust your preferences or broadcast an intent.</Text>
          <Text style={styles.emptyBody}>{"Every future intent here will include a reason under Why you're seeing this."}</Text>
          <Button label="Broadcast an intent" onPress={() => router.push(createIntentRoute)} />
        </View>

        <View style={styles.stateList}>
          {feedStates.map(([title, body]) => (
            <View key={title} style={styles.stateRow}>
              <View style={styles.stateBullet} />
              <View style={styles.stateCopy}>
                <Text style={styles.stateTitle}>{title}</Text>
                <Text style={styles.stateBody}>{body}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.bottomNav} accessibilityRole="tablist">
        <NavItem label="For You" symbol="sparkles" fallback="FY" selected />
        <NavItem label="Broadcast" symbol="plus.circle.fill" fallback="+" onPress={() => router.push(createIntentRoute)} />
        <NavItem label="Activity" symbol="bubble.left.and.bubble.right" fallback="A" disabled />
        <NavItem label="You" symbol="person.crop.circle" fallback="Y" disabled />
      </View>
    </SafeAreaView>
  );
}

type NavItemProps = {
  disabled?: boolean;
  fallback: string;
  label: string;
  onPress?: () => void;
  selected?: boolean;
  symbol: Parameters<typeof SymbolView>[0]['name'];
};

function NavItem({ disabled = false, fallback, label, onPress, selected = false, symbol }: NavItemProps) {
  const color = selected ? tokens.semantic.color.actionPrimary : disabled ? tokens.semantic.color.textMuted : tokens.semantic.color.textSecondary;
  const accessibilityLabel = disabled ? `${label} unavailable in this build` : label;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.navItem, selected && styles.navItemSelected]}>
      <SymbolView fallback={<Text style={[styles.navFallback, { color }]}>{fallback}</Text>} name={symbol} size={22} tintColor={color} />
      <Text style={[styles.navLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: tokens.semantic.color.backgroundCanvas },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 116 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wordmark: { fontFamily: 'Manrope_700Bold', fontSize: 20, color: tokens.semantic.color.textPrimary },
  kicker: { marginTop: 4, fontFamily: 'Manrope_700Bold', fontSize: 13, color: tokens.semantic.color.actionPrimary },
  statusPill: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 999, backgroundColor: tokens.semantic.color.infoSurface },
  statusText: { fontFamily: 'Manrope_600SemiBold', fontSize: 12, color: tokens.semantic.color.infoText },
  feedIntro: { marginTop: 28 },
  title: { fontFamily: 'Manrope_700Bold', fontSize: 30, lineHeight: 36, color: tokens.semantic.color.textPrimary },
  subtitle: { marginTop: 12, fontFamily: 'Manrope_400Regular', fontSize: 16, lineHeight: 24, color: tokens.semantic.color.textSecondary },
  emptyFeed: { marginTop: 28, gap: 16, padding: 18, borderWidth: 1, borderColor: tokens.semantic.color.borderDefault, borderRadius: 16, backgroundColor: tokens.semantic.color.backgroundSurface },
  signalMark: { width: 56, height: 56, borderRadius: 28, backgroundColor: tokens.semantic.color.trustSurface, alignItems: 'center', justifyContent: 'center' },
  signalRing: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: tokens.semantic.color.actionPrimary, alignItems: 'center', justifyContent: 'center' },
  signalDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: tokens.semantic.color.actionPrimary },
  emptyTitle: { fontFamily: 'Manrope_700Bold', fontSize: 19, lineHeight: 25, color: tokens.semantic.color.textPrimary },
  emptyBody: { fontFamily: 'Manrope_400Regular', fontSize: 14, lineHeight: 21, color: tokens.semantic.color.textSecondary },
  stateList: { marginTop: 24, gap: 12 },
  stateRow: { flexDirection: 'row', gap: 12, padding: 14, borderWidth: 1, borderColor: tokens.semantic.color.borderDefault, borderRadius: 14, backgroundColor: tokens.semantic.color.backgroundCanvas },
  stateBullet: { marginTop: 7, width: 8, height: 8, borderRadius: 4, backgroundColor: tokens.semantic.color.actionPrimary },
  stateCopy: { flex: 1 },
  stateTitle: { fontFamily: 'Manrope_600SemiBold', fontSize: 14, lineHeight: 20, color: tokens.semantic.color.textPrimary },
  stateBody: { marginTop: 2, fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 19, color: tokens.semantic.color.textMuted },
  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 4,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: tokens.semantic.color.borderDefault,
    backgroundColor: tokens.semantic.color.backgroundSurface,
  },
  navItem: { minHeight: 56, minWidth: 72, alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: 12 },
  navItemSelected: { backgroundColor: tokens.semantic.color.trustSurface },
  navFallback: { fontFamily: 'Manrope_700Bold', fontSize: 13 },
  navLabel: { fontFamily: 'Manrope_600SemiBold', fontSize: 12, lineHeight: 16 },
});
