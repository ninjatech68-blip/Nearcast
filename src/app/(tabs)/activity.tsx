import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useThemedStyles } from '@/design-system/appearance';
import { type ColorScheme } from '@/design-system/tokens';
import { featuredIntent } from '@/features/native-demo/nearcast-fixtures';
import { Group, MiniIntentRow, ScreenTitle, Section, SymbolIcon } from '@/features/native-demo/native-ui';

export default function ActivityScreen() {
  const styles = useThemedStyles(createStyles);
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenTitle>Activity</ScreenTitle>

        <Section title="Requests">
          <Group>
            <View style={styles.emptyRow}>
              <View style={styles.emptyIcon}><SymbolIcon fallback="R" name="tray" /></View>
              <View style={styles.emptyCopy}>
                <Text style={styles.title}>No responses yet</Text>
                <Text style={styles.body}>When someone is interested, you will see it here.</Text>
              </View>
            </View>
          </Group>
        </Section>

        <Section title="Your broadcasts">
          <Group>
            <MiniIntentRow metadata={`${featuredIntent.metadata} · Live`} status={featuredIntent.expiry} title={featuredIntent.title} />
            <View style={styles.divider} />
            <MiniIntentRow metadata="Draft · Not visible yet" status="Only you can see this" title="Coffee this weekend" tone="muted" />
          </Group>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (color: ColorScheme) =>
  StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: color.background.app },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  emptyIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: color.background.surfaceMuted },
  emptyCopy: { flex: 1 },
  title: { fontWeight: '600', fontSize: 15, lineHeight: 21, color: color.text.primary },
  body: { marginTop: 2, fontWeight: '400', fontSize: 13, lineHeight: 19, color: color.text.secondary },
  divider: { height: 1, marginLeft: 78, backgroundColor: color.border.subtle },
});
