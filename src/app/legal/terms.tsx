import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BarButton } from '@/design-system/components/button';
import { SheetShell } from '@/design-system/components/sheet';
import { fontFamily, tokens } from '@/design-system/tokens';

export default function TermsScreen() {
  return (
    <SheetShell title="terms">
      <ScrollView showsVerticalScrollIndicator={false} style={styles.flex}>
        <Section h="what nearcast is">
          Nearcast is a place to post a plan and let people you already trust, or people one trusted link away, say they&apos;re in. It is not a follower graph, a rating app, or a broadcast surface.
        </Section>

        <Section h="what you agree to">
          Only cast real plans you intend to keep. Show up when you say you will. Treat the people who show up with respect. Don&apos;t use nearcast to sell things or run promotions. Don&apos;t impersonate anyone.
        </Section>

        <Section h="what we can do">
          Remove casts that break the community guidelines. Suspend accounts that repeatedly no-show, harass, or falsify identity. Contact you about your account by email.
        </Section>

        <Section h="what we can&apos;t do">
          Sell your data. Share your identity or plans with anyone outside the plan. Change these terms silently. Updates go in-app with a clear diff.
        </Section>

        <Section h="disputes">
          If something goes wrong, tell us. Reports go to a human. Nothing is auto-actioned. If you disagree with a decision, you can ask for a review.
        </Section>

        <Text style={styles.footer}>this is the short version. the long version reads the same. we&apos;ll never hide a rule in fine print.</Text>
      </ScrollView>

      <View style={styles.actions}>
        <BarButton label="done" variant="onCream" onPress={() => router.back()} />
      </View>
    </SheetShell>
  );
}

function Section({ h, children }: { h: string; children: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.h}>{h}</Text>
      <Text style={styles.body}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  section: { marginTop: 22 },
  h: { ...tokens.typography.tagSmall, color: tokens.semantic.color.accent, marginBottom: 10 },
  body: { fontFamily: fontFamily.text, fontSize: 15, lineHeight: 22, color: tokens.semantic.color.ink },
  footer: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 28, marginBottom: 8 },
  actions: { marginTop: 12, gap: 2 },
});
