import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BarButton } from '@/design-system/components/button';
import { SheetShell } from '@/design-system/components/sheet';
import { fontFamily, tokens } from '@/design-system/tokens';

/**
 * community guidelines: what gets you removed. we keep this short so
 * every line means something. copied edits go through the same review
 * as product changes — guidelines are policy, not marketing.
 */
export default function GuidelinesScreen() {
  return (
    <SheetShell title="guidelines">
      <ScrollView showsVerticalScrollIndicator={false} style={styles.flex}>
        <Text style={styles.opener}>the point of nearcast is meeting people beyond your circle for a plan you both actually want to do. these rules protect that.</Text>

        <Section h="never">
          <Item>impersonate someone else</Item>
          <Item>harass, threaten, or contact anyone after they&apos;ve said no</Item>
          <Item>use the app to sell things or promote a business</Item>
          <Item>cast plans you have no intention of showing up to</Item>
          <Item>share where you&apos;re meeting with anyone who isn&apos;t in the plan</Item>
        </Section>

        <Section h="rarely">
          <Item>cancel after the 2h cutoff. the others count on you by then</Item>
          <Item>flake without a note. silence is the worst part</Item>
          <Item>extend a chat you don&apos;t need</Item>
        </Section>

        <Section h="always">
          <Item>show up when you say you will</Item>
          <Item>agree where to meet in chat, once you&apos;ve matched, not before</Item>
          <Item>report anything that felt off. a human reads every one</Item>
        </Section>

        <Section h="what removal looks like">
          <Item>first: an in-app note explaining what happened</Item>
          <Item>second: your casts are un-published and you can&apos;t send new ones for a set window</Item>
          <Item>third: account removed. all chats you were in become read-only for the other side, then delete on their next open.</Item>
        </Section>

        <Text style={styles.footer}>these aren&apos;t the whole picture. if you&apos;re not sure, err toward not doing it, and tell us if the rules made you second-guess something honest.</Text>
      </ScrollView>

      <View style={styles.actions}>
        <BarButton label="done" variant="onCream" onPress={() => router.back()} />
      </View>
    </SheetShell>
  );
}

function Section({ h, children }: { h: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.h}>{h}</Text>
      {children}
    </View>
  );
}

function Item({ children }: { children: string }) {
  return (
    <View style={styles.itemRow}>
      <Text style={styles.dot}>·</Text>
      <Text style={styles.itemText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  opener: { fontFamily: fontFamily.text, fontSize: 15, lineHeight: 22, color: tokens.semantic.color.ink, marginTop: 4 },
  section: { marginTop: 22 },
  h: { ...tokens.typography.tagSmall, color: tokens.semantic.color.accent, marginBottom: 10 },
  itemRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  dot: { ...tokens.typography.meta, color: tokens.semantic.color.textMutedOnCream, width: 8 },
  itemText: { fontFamily: fontFamily.text, fontSize: 15, lineHeight: 22, color: tokens.semantic.color.ink, flex: 1 },
  footer: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 28, marginBottom: 8 },
  actions: { marginTop: 12, gap: 2 },
});
