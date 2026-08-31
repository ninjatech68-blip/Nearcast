import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tokens } from '@/design-system/tokens';
import { broadcaster, featuredIntent, ownCast } from '@/features/native-demo/nearcast-fixtures';
import { Group, ScreenTitle, Section, SymbolIcon } from '@/features/native-demo/native-ui';

type Confirming = 'none' | 'withdraw' | 'cancel';

export default function ActivityScreen() {
  const [confirming, setConfirming] = useState<Confirming>('none');

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenTitle>Activity</ScreenTitle>

        <Section title="Requests you sent">
          <Group>
            <View style={styles.row}>
              <Text style={styles.title}>{featuredIntent.title}</Text>
              <Text style={styles.summary}>
                You asked to join. You can withdraw until {broadcaster.name} responds.
              </Text>
              <Pressable
                accessibilityLabel="Withdraw request"
                accessibilityRole="button"
                onPress={() => setConfirming(confirming === 'withdraw' ? 'none' : 'withdraw')}
                style={styles.rowAction}>
                <Text style={styles.rowActionText}>Withdraw request</Text>
              </Pressable>
            </View>

            {confirming === 'withdraw' ? (
              <View style={styles.confirmBlock}>
                <Text style={styles.confirmTitle}>Withdraw your request?</Text>
                <Text style={styles.confirmBody}>
                  {broadcaster.name} will no longer see it. You can ask again while the cast is open.
                </Text>
                <View style={styles.confirmActions}>
                  <Pressable accessibilityRole="button" onPress={() => setConfirming('none')} style={styles.confirmCancel}>
                    <Text style={styles.confirmCancelText}>Keep it</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={() => undefined} style={styles.confirmProceed}>
                    <Text style={styles.confirmProceedText}>Withdraw</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </Group>
        </Section>

        <Section title="Requests you received">
          <Group>
            <View style={styles.emptyRow}>
              <View style={styles.emptyIcon}><SymbolIcon fallback="R" name="tray" /></View>
              <View style={styles.emptyCopy}>
                <Text style={styles.title}>No one has asked to join yet</Text>
                <Text style={styles.body}>When someone asks to join a cast, it appears here.</Text>
              </View>
            </View>
          </Group>
        </Section>

        <Section title="Your casts">
          <Group>
            <View style={styles.row}>
              <Text style={styles.title}>{ownCast.title}</Text>
              <Text style={styles.summary}>Open for another 7 hours. Nobody has asked to join yet.</Text>
              <Pressable
                accessibilityLabel="Cancel cast"
                accessibilityRole="button"
                onPress={() => setConfirming(confirming === 'cancel' ? 'none' : 'cancel')}
                style={styles.rowAction}>
                <Text style={styles.destructiveActionText}>Cancel cast</Text>
              </Pressable>
            </View>

            {confirming === 'cancel' ? (
              <View style={styles.confirmBlock}>
                <Text style={styles.confirmTitle}>Cancel this cast?</Text>
                <Text style={styles.confirmBody}>
                  It stops reaching anyone new. People who already saw it keep what they saw.
                </Text>
                <View style={styles.confirmActions}>
                  <Pressable accessibilityRole="button" onPress={() => setConfirming('none')} style={styles.confirmCancel}>
                    <Text style={styles.confirmCancelText}>Keep it open</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={() => undefined} style={styles.confirmProceed}>
                    <Text style={styles.confirmProceedText}>Cancel cast</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.title}>Coffee this weekend</Text>
              <Text style={styles.summary}>Only you can see this. It has not been posted.</Text>
            </View>
          </Group>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: tokens.semantic.color.backgroundCanvas },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 },
  row: { padding: 16, gap: 4 },
  rowAction: { minHeight: 44, justifyContent: 'center' },
  rowActionText: { fontFamily: 'Manrope_700Bold', fontSize: 14, lineHeight: 20, color: tokens.semantic.color.actionPrimary },
  destructiveActionText: { fontFamily: 'Manrope_700Bold', fontSize: 14, lineHeight: 20, color: tokens.semantic.color.dangerText },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  emptyIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.semantic.color.backgroundSubtle },
  emptyCopy: { flex: 1 },
  title: { fontFamily: 'Manrope_600SemiBold', fontSize: 15, lineHeight: 21, color: tokens.semantic.color.textPrimary },
  summary: { fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 19, color: tokens.semantic.color.textSecondary },
  body: { marginTop: 2, fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 19, color: tokens.semantic.color.textSecondary },
  divider: { height: 1, marginLeft: 16, backgroundColor: tokens.semantic.color.borderDefault },
  confirmBlock: { gap: 8, marginHorizontal: 16, marginBottom: 16, padding: 14, borderRadius: 12, backgroundColor: tokens.semantic.color.backgroundSubtle },
  confirmTitle: { fontFamily: 'Manrope_600SemiBold', fontSize: 15, lineHeight: 21, color: tokens.semantic.color.textPrimary },
  confirmBody: { fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 19, color: tokens.semantic.color.textSecondary },
  confirmActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  confirmCancel: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: tokens.semantic.color.borderDefault, borderRadius: 12, backgroundColor: tokens.semantic.color.backgroundSurface },
  confirmCancelText: { fontFamily: 'Manrope_600SemiBold', fontSize: 15, color: tokens.semantic.color.textPrimary },
  confirmProceed: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: tokens.semantic.color.actionPrimary },
  confirmProceedText: { fontFamily: 'Manrope_700Bold', fontSize: 15, color: '#FFFFFF' },
});
