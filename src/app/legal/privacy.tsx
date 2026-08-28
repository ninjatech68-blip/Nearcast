import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BarButton } from '@/design-system/components/button';
import { SheetShell } from '@/design-system/components/sheet';
import { fontFamily, tokens } from '@/design-system/tokens';

/**
 * privacy — the honest one-page. these are product laws first,
 * legal second, and the app enforces them in code. every line here
 * should trace back to a rule in AGENTS.md or the delivery framework.
 */
export default function PrivacyScreen() {
  return (
    <SheetShell title="privacy">
      <ScrollView showsVerticalScrollIndicator={false} style={styles.flex}>
        <Section h="what we NEVER store on a cast">
          <Item>your exact location or coordinates</Item>
          <Item>your email, phone, or any contact detail</Item>
          <Item>your contacts</Item>
          <Item>who else you looked at before you cast</Item>
          <Item>what you typed before you cast</Item>
        </Section>

        <Section h="what a caster sees about you">
          <Item>your first name</Item>
          <Item>a note you wrote when you asked to join</Item>
          <Item>your public signal + receipts, on tap</Item>
          <Item>the neighborhood name — never an exact place; the app never stores one</Item>
        </Section>

        <Section h="where you meet">
          <Item>the app never holds an exact spot. you agree where to meet in chat, after you match — like any conversation.</Item>
        </Section>

        <Section h="what only YOU see">
          <Item>your circles and their members</Item>
          <Item>your blocked list</Item>
          <Item>your quiet hours</Item>
        </Section>

        <Section h="chat + notifications">
          <Item>chat lives in-app. no numbers change hands, ever.</Item>
          <Item>push and analytics never carry message text or plan details — only ids.</Item>
          <Item>chats expire by default. either side can end one, and it does not reopen.</Item>
        </Section>

        <Section h="blocks + reports">
          <Item>a block is silent to the blocked person. their casts never reach you again — even friend-of-a-friend.</Item>
          <Item>a report is read by a human. the person you reported never learns it was you.</Item>
        </Section>

        <Section h="deletion">
          <Item>signing out clears your device state. account deletion removes your profile and unpublishes your casts — chats you were in become read-only for the other side, then delete on their next open.</Item>
        </Section>

        <Text style={styles.footer}>this page is what the app does. if the app does something different, that&apos;s a bug — report it.</Text>
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
  section: { marginTop: 22 },
  h: { ...tokens.typography.tagSmall, color: tokens.semantic.color.accent, marginBottom: 10 },
  itemRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  dot: { ...tokens.typography.meta, color: tokens.semantic.color.textMutedOnCream, width: 8 },
  itemText: { fontFamily: fontFamily.text, fontSize: 15, lineHeight: 22, color: tokens.semantic.color.ink, flex: 1 },
  footer: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 28, marginBottom: 8 },
  actions: { marginTop: 12, gap: 2 },
});
