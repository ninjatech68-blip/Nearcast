import { type Href, router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/design-system/components/button';
import { tokens } from '@/design-system/tokens';

const createIntentRoute = '/create' as Href;

const feedPrinciples = [
  ['Why you see it', "Every intent will show Why you're seeing this before you respond."],
  ['Finite feed', 'Active intents appear here when they are relevant, then the list ends.'],
  ['Private context', 'Origin circles, exact places, and contact details stay hidden until permission changes.'],
] as const;

export default function HomeScreen() {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.largeTitle}>For You</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Around you</Text>
          <View style={styles.group}>
            <View style={styles.emptyRow}>
              <View style={styles.signalMark}>
                <View style={styles.signalDot} />
              </View>
              <View style={styles.emptyCopy}>
                <Text style={styles.emptyTitle}>Nothing relevant is active right now. Adjust your preferences or broadcast an intent.</Text>
                <Text style={styles.emptyBody}>Nearcast will stay quiet until there is a real need, offer, or plan worth showing.</Text>
              </View>
            </View>
            <View style={styles.groupDivider} />
            <View style={styles.actionRow}>
              <Button label="Broadcast an intent" onPress={() => router.push(createIntentRoute)} />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How this feed works</Text>
          <View style={styles.group}>
            {feedPrinciples.map(([title, body], index) => (
              <View key={title}>
                <View style={styles.infoRow}>
                  <View style={styles.infoCopy}>
                    <Text style={styles.infoTitle}>{title}</Text>
                    <Text style={styles.infoBody}>{body}</Text>
                  </View>
                </View>
                {index < feedPrinciples.length - 1 ? <View style={styles.groupDivider} /> : null}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: tokens.semantic.color.backgroundCanvas },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 },
  largeTitle: { fontFamily: 'Manrope_700Bold', fontSize: 34, lineHeight: 41, color: tokens.semantic.color.textPrimary },
  section: { marginTop: 24 },
  sectionTitle: { marginBottom: 8, paddingHorizontal: 2, fontFamily: 'Manrope_600SemiBold', fontSize: 13, lineHeight: 18, color: tokens.semantic.color.textMuted },
  group: { overflow: 'hidden', borderWidth: 1, borderColor: tokens.semantic.color.borderDefault, borderRadius: 14, backgroundColor: tokens.semantic.color.backgroundSurface },
  emptyRow: { flexDirection: 'row', gap: 14, padding: 16, minHeight: 112 },
  signalMark: { width: 44, height: 44, borderRadius: 22, backgroundColor: tokens.semantic.color.trustSurface, alignItems: 'center', justifyContent: 'center' },
  signalDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: tokens.semantic.color.actionPrimary },
  emptyCopy: { flex: 1 },
  emptyTitle: { fontFamily: 'Manrope_600SemiBold', fontSize: 17, lineHeight: 23, color: tokens.semantic.color.textPrimary },
  emptyBody: { marginTop: 6, fontFamily: 'Manrope_400Regular', fontSize: 15, lineHeight: 21, color: tokens.semantic.color.textSecondary },
  actionRow: { padding: 12 },
  infoRow: { minHeight: 68, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  infoCopy: { flex: 1 },
  infoTitle: { fontFamily: 'Manrope_600SemiBold', fontSize: 16, lineHeight: 22, color: tokens.semantic.color.textPrimary },
  infoBody: { marginTop: 3, fontFamily: 'Manrope_400Regular', fontSize: 14, lineHeight: 20, color: tokens.semantic.color.textSecondary },
  groupDivider: { height: 1, marginLeft: 16, backgroundColor: tokens.semantic.color.borderDefault },
});
